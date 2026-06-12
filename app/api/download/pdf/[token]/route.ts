import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'

// Caminho do PDF no bucket "products" (fazer upload manual no Supabase Storage)
const PDF_STORAGE_PATH = 'guia_impressao.pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  const { data, error } = await sb
    .from('orders')
    .select('paid, order_bump_products')
    .eq('download_token', token)
    .single()

  const order = data as Pick<OrderRow, 'paid' | 'order_bump_products'> | null

  if (error || !order) {
    return NextResponse.json({ error: 'Token não encontrado' }, { status: 404 })
  }

  if (!order.paid) {
    return NextResponse.json({ error: 'Pagamento pendente' }, { status: 402 })
  }

  const bumpProducts = (order.order_bump_products as string[] | null) ?? []

  if (bumpProducts.length === 0) {
    return NextResponse.json({ error: 'Produto PDF não adquirido' }, { status: 403 })
  }

  // Valida product ID se configurado
  const pdfProductId = process.env.KIWIFY_PDF_PRODUCT_ID
  if (pdfProductId && !bumpProducts.includes(pdfProductId)) {
    return NextResponse.json({ error: 'Produto PDF não adquirido' }, { status: 403 })
  }

  const { data: signed, error: signErr } = await sb.storage
    .from('products')
    .createSignedUrl(PDF_STORAGE_PATH, 300)

  if (signErr || !signed?.signedUrl) {
    console.error('[download/pdf] storage error:', signErr)
    return NextResponse.json({ error: 'PDF não disponível' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
