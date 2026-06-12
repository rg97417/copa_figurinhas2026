import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'
import { sendDownloadEmail } from '@/lib/email'

interface KiwifyOrderBump {
  product_id?: string
  product_name?: string
  id?: string
}

interface KiwifyPayload {
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
  order_id?: string
  order_status?: string
  buyer_email?: string
  buyer_name?: string
  buyer_cellphone?: string
}

function validateSecret(req: NextRequest, bodyToken?: string): boolean {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET
  if (!secret) return true

  const queryToken = req.nextUrl.searchParams.get('token')
  if (queryToken === secret) return true
  if (bodyToken && bodyToken === secret) return true

  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader === `Bearer ${secret}` || authHeader === secret) return true

  return false
}

function extractOrderBumpProductIds(payload: KiwifyPayload): string[] {
  const order = payload.data?.order
  if (!order) return []

  const ids: string[] = []

  // Kiwify pode enviar como array "order_bumps" ou campo singular "order_bump"
  const bumps: KiwifyOrderBump[] = []
  if (Array.isArray(order.order_bumps)) bumps.push(...order.order_bumps)
  if (order.order_bump) {
    if (Array.isArray(order.order_bump)) bumps.push(...order.order_bump)
    else bumps.push(order.order_bump)
  }

  for (const bump of bumps) {
    const pid = bump.product_id ?? bump.id
    if (pid) ids.push(pid)
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

  if (!validateSecret(req, body.token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event       = body.event ?? 'order_approved'
  const orderId     = body.data?.order?.id     ?? body.order_id    ?? ''
  const orderStatus = body.data?.order?.status ?? body.order_status ?? ''
  const buyerEmail  = body.data?.buyer?.email  ?? body.buyer_email  ?? ''
  const buyerName   = body.data?.buyer?.name   ?? body.buyer_name   ?? ''
  const buyerPhone  = body.data?.buyer?.cellphone ?? body.buyer_cellphone ?? ''

  const isPaid =
    event === 'order_approved' ||
    event === 'order_paid' ||
    orderStatus === 'paid' ||
    orderStatus === 'approved'

  if (!isPaid) {
    return NextResponse.json({ received: true, skipped: true })
  }

  if (!buyerEmail) {
    console.error('[kiwify/webhook] email do comprador ausente', body)
    return NextResponse.json({ error: 'buyer email missing' }, { status: 422 })
  }

  const orderBumpProductIds = extractOrderBumpProductIds(body)

  const sb = getSupabaseAdmin()

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

  const orders = rawOrders as Pick<OrderRow, 'id' | 'nome' | 'download_token' | 'paid'>[] | null

  if (!orders || orders.length === 0) {
    console.warn('[kiwify/webhook] pedido nao encontrado para email:', buyerEmail)
    return NextResponse.json({ received: true, order_not_found: true })
  }

  const order = orders[0]

  const { error: updateErr } = await sb
    .from('orders')
    .update({
      paid: true,
      paid_at: new Date().toISOString(),
      kiwify_order_id: orderId || null,
      nome:  order.nome ?? buyerName ?? null,
      phone: buyerPhone || null,
      order_bump_products: orderBumpProductIds.length > 0 ? orderBumpProductIds : [],
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

  return NextResponse.json({ received: true, order_id: order.id })
}
