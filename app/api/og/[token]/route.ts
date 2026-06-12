import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'
import { compositeSticker } from '@/lib/pipeline/compositor'

// Endpoint público para compartilhamento social (WhatsApp, etc.)
// Token de 64 chars hex = estatisticamente impossível de adivinhar
// Serve o sticker PNG de pedidos pagos
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  let sb
  try { sb = getSupabaseAdmin() } catch {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })
  }

  const { data, error } = await sb
    .from('orders')
    .select('paid, nome, dados_figurinha, storage_path, sticker_path')
    .eq('download_token', token)
    .single()

  const order = data as Pick<OrderRow, 'paid' | 'nome' | 'dados_figurinha' | 'storage_path' | 'sticker_path'> | null
  if (error || !order || !order.paid) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  // Usa sticker em cache se disponível
  if (order.sticker_path) {
    const { data: blob } = await sb.storage.from('stickers').download(order.sticker_path)
    if (blob) {
      const buf = Buffer.from(await blob.arrayBuffer())
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }
  }

  // Gera on-demand
  if (!order.storage_path) return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })

  const { data: personBlob } = await sb.storage.from('persons').download(order.storage_path)
  if (!personBlob) return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })

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

  // Salva em cache async
  void (async () => {
    try {
      const stickerPath = `stickers/${token}.png`
      await sb.storage.from('stickers').upload(stickerPath, stickerPng, { contentType: 'image/png', upsert: true })
      await sb.from('orders').update({ sticker_path: stickerPath } as Partial<OrderRow>).eq('download_token', token)
    } catch { /* silencia erro de cache */ }
  })()

  return new NextResponse(new Uint8Array(stickerPng), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
