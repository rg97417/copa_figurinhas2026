import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendDownloadEmail } from '@/lib/email'

// Payload que a Kiwify envia
interface KiwifyPayload {
  event?: string
  token?: string          // Token do campo "Token" da Kiwify (enviado no body)
  data?: {
    order?: {
      id?: string
      status?: string
    }
    buyer?: {
      email?: string
      name?: string
      cellphone?: string
    }
  }
  order_id?: string
  order_status?: string
  buyer_email?: string
  buyer_name?: string
}

function validateSecret(req: NextRequest, bodyToken?: string): boolean {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET
  if (!secret) return true

  // 1. Query param ?token= (nossa URL)
  const queryToken = req.nextUrl.searchParams.get('token')
  if (queryToken === secret) return true

  // 2. Token no corpo do JSON (campo "Token" do painel Kiwify)
  if (bodyToken && bodyToken === secret) return true

  // 3. Authorization header
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader === `Bearer ${secret}` || authHeader === secret) return true

  return false
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

  // Normaliza campos (Kiwify tem variações no payload)
  const event       = body.event ?? 'order_approved'
  const orderId     = body.data?.order?.id    ?? body.order_id    ?? ''
  const orderStatus = body.data?.order?.status ?? body.order_status ?? ''
  const buyerEmail  = body.data?.buyer?.email  ?? body.buyer_email  ?? ''
  const buyerName   = body.data?.buyer?.name   ?? body.buyer_name   ?? ''

  // Só processa pedidos pagos/aprovados
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

  // Busca pedido pelo email (mais recente não pago)
  const { data: orders, error: findErr } = await supabaseAdmin
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

  if (!orders || orders.length === 0) {
    // Pode ser que o pedido ainda não foi gerado (race condition)
    // Retorna 200 para a Kiwify não reenviar
    console.warn('[kiwify/webhook] pedido nao encontrado para email:', buyerEmail)
    return NextResponse.json({ received: true, order_not_found: true })
  }

  const order = orders[0]

  // Marca como pago
  const { error: updateErr } = await supabaseAdmin
    .from('orders')
    .update({
      paid: true,
      paid_at: new Date().toISOString(),
      kiwify_order_id: orderId || null,
      nome: order.nome ?? buyerName ?? null,
    })
    .eq('id', order.id)

  if (updateErr) {
    console.error('[kiwify/webhook] update error:', updateErr)
    return NextResponse.json({ error: 'DB update error' }, { status: 500 })
  }

  // Envia email com link de download
  try {
    await sendDownloadEmail({
      to: buyerEmail,
      nome: order.nome ?? buyerName ?? 'Torcedor(a)',
      token: order.download_token,
    })
  } catch (emailErr) {
    console.error('[kiwify/webhook] email error:', emailErr)
    // Não falha o webhook por erro de email
  }

  return NextResponse.json({ received: true, order_id: order.id })
}
