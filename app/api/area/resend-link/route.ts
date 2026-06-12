import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'
import { sendDownloadEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const allowed = await rateLimit(`resend:${ip}`, 3, 3600)
  if (!allowed) {
    return NextResponse.json({ ok: true }) // responde ok para não vazar info
  }

  const sb = getSupabaseAdmin()

  const { data: rawOrder } = await sb
    .from('orders')
    .select('paid, nome, download_token')
    .eq('email', email.toLowerCase().trim())
    .eq('paid', true)
    .order('paid_at', { ascending: false })
    .limit(1)
    .single()

  const order = rawOrder as Pick<OrderRow, 'paid' | 'nome' | 'download_token'> | null

  // Responde sempre com sucesso para não vazar quais emails estão cadastrados
  if (!order) {
    return NextResponse.json({ ok: true })
  }

  try {
    await sendDownloadEmail({
      to: email.toLowerCase().trim(),
      nome: order.nome ?? 'Torcedor(a)',
      token: order.download_token,
    })
  } catch (err) {
    console.error('[area/resend-link]', err)
  }

  return NextResponse.json({ ok: true })
}
