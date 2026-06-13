import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'
import { sendDownloadEmail } from '@/lib/email'
import { saveLastWebhook } from '@/lib/webhookLog'
import { sendServerPurchase } from '@/lib/metaConversions'

interface KiwifyOrderBump {
  product_id?: string
  product_name?: string
  id?: string
}

interface KiwifyOrderData {
  order_id?: string
  order_status?: string
  webhook_event_type?: string
  Customer?: { email?: string; full_name?: string; first_name?: string; mobile?: string }
  Product?: { product_id?: string; product_name?: string }
  TrackingParameters?: Record<string, string>
  // Kiwify usa PascalCase para objetos aninhados
  OrderBumps?: KiwifyOrderBump[]
  // Alternativas snake_case (outros formatos)
  order_bumps?: KiwifyOrderBump[]
  order_bump?: KiwifyOrderBump | KiwifyOrderBump[]
}

interface KiwifyPayload {
  // Formato real Kiwify: tudo aninhado sob "order"
  order?: KiwifyOrderData
  url?: string
  signature?: string
  // Formato flat (legado / testes)
  order_id?: string
  order_status?: string
  webhook_event_type?: string
  Customer?: { email?: string; full_name?: string; first_name?: string; mobile?: string }
  TrackingParameters?: Record<string, string>
  // Formato muito antigo
  event?: string
  token?: string
  data?: {
    order?: {
      id?: string
      status?: string
      order_bumps?: KiwifyOrderBump[]
      order_bump?: KiwifyOrderBump | KiwifyOrderBump[]
    }
    buyer?: { email?: string; name?: string; cellphone?: string }
    product?: { id?: string; name?: string }
  }
  buyer_email?: string
  buyer_name?: string
  buyer_cellphone?: string
}

function validateSecret(req: NextRequest, bodyToken?: string): boolean {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[kiwify/webhook] KIWIFY_WEBHOOK_SECRET não configurado — qualquer request passa!')
    return true
  }

  const queryToken = req.nextUrl.searchParams.get('token')
  if (queryToken === secret) return true
  if (bodyToken && bodyToken === secret) return true

  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader === `Bearer ${secret}` || authHeader === secret) return true

  return false
}

function extractOrderBumpProductIds(payload: KiwifyPayload): string[] {
  const orderData = payload.order ?? payload.data?.order
  if (!orderData) return []

  const ids: string[] = []
  const bumps: KiwifyOrderBump[] = []

  // PascalCase (formato Kiwify real)
  if (Array.isArray(orderData.OrderBumps)) bumps.push(...orderData.OrderBumps)
  // snake_case (alternativas)
  if (Array.isArray(orderData.order_bumps)) bumps.push(...orderData.order_bumps)
  if (orderData.order_bump) {
    if (Array.isArray(orderData.order_bump)) bumps.push(...orderData.order_bump)
    else bumps.push(orderData.order_bump)
  }

  for (const bump of bumps) {
    const pid = bump.product_id ?? bump.id
    if (pid && !ids.includes(pid)) ids.push(pid)
  }

  return ids
}

export async function POST(req: NextRequest) {
  let body: KiwifyPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Salva payload para inspeção (TTL 1h) — remover após validação
  void saveLastWebhook(body)

  if (!validateSecret(req, body.token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Kiwify real envia tudo sob body.order; formatos legados são flat
  const od = body.order ?? body

  const event       = od.webhook_event_type ?? body.event ?? 'order_approved'
  const orderId     = od.order_id    ?? body.data?.order?.id     ?? ''
  const orderStatus = od.order_status ?? body.data?.order?.status ?? ''
  const buyerEmail  = od.Customer?.email      ?? body.data?.buyer?.email  ?? body.buyer_email  ?? ''
  const buyerName   = od.Customer?.full_name  ?? body.data?.buyer?.name   ?? body.buyer_name   ?? ''
  const buyerPhone  = od.Customer?.mobile     ?? body.data?.buyer?.cellphone ?? body.buyer_cellphone ?? ''

  console.log('[kiwify/webhook] event:', event, 'status:', orderStatus, 'email:', buyerEmail)

  const isPaid =
    event === 'order_approved' ||
    event === 'order_paid' ||
    orderStatus === 'paid' ||
    orderStatus === 'approved'

  if (!isPaid) {
    return NextResponse.json({ received: true, skipped: true })
  }

  if (!buyerEmail) {
    console.error('[kiwify/webhook] email do comprador ausente', JSON.stringify(body).slice(0, 500))
    return NextResponse.json({ error: 'buyer email missing' }, { status: 422 })
  }

  const orderBumpProductIds = extractOrderBumpProductIds(body)
  const tracking = od.TrackingParameters && Object.keys(od.TrackingParameters).length > 0
    ? od.TrackingParameters
    : null
  const utmParams = tracking
  // job_id passado pelo checkout para matching exato — evita que email errado vincule pedido errado
  const trackingJobId = tracking?.job_id ?? null

  const sb = getSupabaseAdmin()

  let order: Pick<OrderRow, 'id' | 'nome' | 'download_token' | 'paid'> | null = null

  // Matching primário: job_id exato (garante que comprador recebe SEMPRE sua figurinha)
  if (trackingJobId) {
    const { data, error } = await sb
      .from('orders')
      .select('id, nome, download_token, paid')
      .eq('job_id', trackingJobId)
      .eq('paid', false)
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('[kiwify/webhook] find by job_id error:', error)
    }
    order = data as Pick<OrderRow, 'id' | 'nome' | 'download_token' | 'paid'> | null
    if (order) console.log('[kiwify/webhook] matched by job_id:', trackingJobId)
  }

  // Fallback: email + mais recente não pago (compra sem job_id, ex: link direto)
  if (!order) {
    const { data: rawOrders, error: findErr } = await sb
      .from('orders')
      .select('id, nome, download_token, paid')
      .eq('email', buyerEmail.toLowerCase().trim())
      .eq('paid', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (findErr) {
      console.error('[kiwify/webhook] find error:', findErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const list = rawOrders as Pick<OrderRow, 'id' | 'nome' | 'download_token' | 'paid'>[] | null
    order = list?.[0] ?? null
    if (order) console.log('[kiwify/webhook] matched by email fallback:', buyerEmail)
  }

  if (!order) {
    // Nenhum pedido unpaid — pode ser segundo webhook separado do order bump
    // Kiwify envia um webhook por produto: 1 para o main, 1 para o bump
    const bumpProductId = od.Product?.product_id ?? null
    if (bumpProductId) {
      const { data: paidList } = await sb
        .from('orders')
        .select('id, nome, download_token, order_bump_products')
        .eq('email', buyerEmail.toLowerCase().trim())
        .eq('paid', true)
        .order('paid_at', { ascending: false })
        .limit(1)

      const paidOrder = (paidList as (Pick<OrderRow, 'id' | 'nome' | 'download_token'> & { order_bump_products: string[] })[] | null)?.[0] ?? null
      if (paidOrder) {
        const existing: string[] = paidOrder.order_bump_products ?? []
        if (!existing.includes(bumpProductId)) {
          await sb.from('orders')
            .update({ order_bump_products: [...existing, bumpProductId] } as Partial<OrderRow>)
            .eq('id', paidOrder.id)
          console.log('[kiwify/webhook] order bump adicionado:', bumpProductId, '→ order', paidOrder.id)
          try {
            await sendDownloadEmail({
              to: buyerEmail,
              nome: paidOrder.nome ?? buyerName ?? 'Torcedor(a)',
              token: paidOrder.download_token,
              hasPdf: true,
            })
          } catch (emailErr) {
            console.error('[kiwify/webhook] email bump error:', emailErr)
          }
          return NextResponse.json({ received: true, order_bump_added: true, order_id: paidOrder.id })
        }
        return NextResponse.json({ received: true, order_bump_already_set: true })
      }
    }

    console.warn('[kiwify/webhook] pedido nao encontrado. email:', buyerEmail, 'job_id:', trackingJobId)
    return NextResponse.json({ received: true, order_not_found: true })
  }

  const { error: updateErr } = await sb
    .from('orders')
    .update({
      paid: true,
      paid_at: new Date().toISOString(),
      kiwify_order_id: orderId || null,
      nome:  order.nome ?? buyerName ?? null,
      phone: buyerPhone || null,
      order_bump_products: orderBumpProductIds.length > 0 ? orderBumpProductIds : [],
      utm_params: utmParams,
    } as Partial<OrderRow>)
    .eq('id', order.id)

  if (updateErr) {
    console.error('[kiwify/webhook] update error:', updateErr)
    return NextResponse.json({ error: 'DB update error' }, { status: 500 })
  }

  try {
    await sendDownloadEmail({
      to: buyerEmail,
      nome: order.nome ?? buyerName ?? 'Torcedor(a)',
      token: order.download_token,
      hasPdf: orderBumpProductIds.length > 0,
    })
  } catch (emailErr) {
    console.error('[kiwify/webhook] email error:', emailErr)
  }

  // Meta Conversions API — Purchase server-side (não afeta fluxo principal)
  void sendServerPurchase({
    orderId:         orderId || order.id,
    email:           buyerEmail,
    name:            order.nome ?? buyerName ?? null,
    phone:           buyerPhone || null,
    value:           19.90,
    currency:        'BRL',
    clientIp:        req.headers.get('x-forwarded-for'),
    clientUserAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ received: true, order_id: order.id })
}
