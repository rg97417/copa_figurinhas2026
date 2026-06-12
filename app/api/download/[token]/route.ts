import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'
import { compositeSticker } from '@/lib/pipeline/compositor'

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
    .select('id, paid, nome, dados_figurinha, storage_path, sticker_path')
    .eq('download_token', token)
    .single()

  const order = data as Pick<OrderRow, 'id' | 'paid' | 'nome' | 'dados_figurinha' | 'storage_path' | 'sticker_path'> | null

  if (error || !order) {
    return NextResponse.json({ error: 'Token não encontrado' }, { status: 404 })
  }

  if (!order.paid) {
    return NextResponse.json({ error: 'Pagamento pendente' }, { status: 402 })
  }

  if (order.sticker_path) {
    const { data: signed } = await sb.storage
      .from('stickers')
      .createSignedUrl(order.sticker_path, 300)

    if (signed?.signedUrl) {
      return NextResponse.redirect(signed.signedUrl)
    }
  }

  if (!order.storage_path) {
    return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 500 })
  }

  const { data: personBlob, error: storageErr } = await sb.storage
    .from('persons')
    .download(order.storage_path)

  if (storageErr || !personBlob) {
    return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 500 })
  }

  const personPng = Buffer.from(await personBlob.arrayBuffer())
  const d = (order.dados_figurinha ?? {}) as Record<string, string>

  const stickerPng = await compositeSticker(personPng, {
    nome:   order.nome   ?? '',
    data:   d.data       ?? '',
    altura: d.altura     ?? '',
    peso:   d.peso       ?? '',
    clube:  d.clube      ?? '',
    watermark: false,
  })

  try {
    const stickerPath = `stickers/${token}.png`
    await sb.storage
      .from('stickers')
      .upload(stickerPath, stickerPng, { contentType: 'image/png', upsert: true })
    await sb
      .from('orders')
      .update({ sticker_path: stickerPath } as Partial<OrderRow>)
      .eq('download_token', token)
  } catch (cacheErr) {
    console.warn('[download] cache error:', cacheErr)
  }

  const nome = (order.nome ?? 'figurinha').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60)
  return new NextResponse(new Uint8Array(stickerPng), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${nome}_Copa2026.png"`,
      'Cache-Control': 'no-store',
    },
  })
}
