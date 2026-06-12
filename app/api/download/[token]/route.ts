import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { compositeSticker } from '@/lib/pipeline/compositor'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  // Busca e valida o pedido — 100% server-side
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, paid, nome, dados_figurinha, storage_path, sticker_path')
    .eq('download_token', token)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Token não encontrado' }, { status: 404 })
  }

  if (!order.paid) {
    return NextResponse.json({ error: 'Pagamento pendente' }, { status: 402 })
  }

  // Se já existe sticker gerado, serve direto do Storage
  if (order.sticker_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from('stickers')
      .createSignedUrl(order.sticker_path, 300) // 5 min

    if (signed?.signedUrl) {
      return NextResponse.redirect(signed.signedUrl)
    }
  }

  // Gera o sticker final (sem marca d'água) a partir da imagem salva
  const { data: personBlob, error: storageErr } = await supabaseAdmin.storage
    .from('persons')
    .download(order.storage_path)

  if (storageErr || !personBlob) {
    return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 500 })
  }

  const personPng = Buffer.from(await personBlob.arrayBuffer())
  const d = (order.dados_figurinha ?? {}) as Record<string, string>

  const stickerPng = await compositeSticker(personPng, {
    nome:  order.nome ?? '',
    data:  d.data    ?? '',
    altura: d.altura ?? '',
    peso:  d.peso    ?? '',
    clube: d.clube   ?? '',
    watermark: false,
  })

  // Cache o sticker gerado no Storage para próximas visitas
  try {
    const stickerPath = `stickers/${token}.png`
    await supabaseAdmin.storage
      .from('stickers')
      .upload(stickerPath, stickerPng, { contentType: 'image/png', upsert: true })

    await supabaseAdmin.from('orders').update({ sticker_path: stickerPath }).eq('id', order.id)
  } catch (cacheErr) {
    console.warn('[download] cache error:', cacheErr)
  }

  const nome = order.nome ?? 'figurinha'
  return new NextResponse(new Uint8Array(stickerPng), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${nome.replace(/\s+/g, '_')}_Copa2026.png"`,
      'Cache-Control': 'no-store',
    },
  })
}
