import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'
import { compositeSticker } from '@/lib/pipeline/compositor'
import { PDFDocument, rgb } from 'pdf-lib'

// A4 em pontos (72 dpi): 595.28 × 841.89
const A4_W = 595.28
const A4_H = 841.89

const COLS = 4
const ROWS = 3
const MARGIN = 20
const GAP    = 4

// Tamanho de cada célula
const CELL_W = (A4_W - MARGIN * 2 - GAP * (COLS - 1)) / COLS   // ~133pt
const CELL_H = CELL_W * (1024 / 768)                            // ~177pt  (ratio 768×1024)

async function getStickerBuffer(token: string): Promise<Buffer | null> {
  const sb = getSupabaseAdmin()

  const { data, error } = await sb
    .from('orders')
    .select('paid, nome, dados_figurinha, storage_path, sticker_path')
    .eq('download_token', token)
    .single()

  const order = data as Pick<
    OrderRow,
    'paid' | 'nome' | 'dados_figurinha' | 'storage_path' | 'sticker_path'
  > | null

  if (error || !order || !order.paid) return null

  // Usa sticker em cache se disponível
  if (order.sticker_path) {
    const { data: blob } = await sb.storage.from('stickers').download(order.sticker_path)
    if (blob) return Buffer.from(await blob.arrayBuffer())
  }

  // Gera o sticker
  if (!order.storage_path) return null
  const { data: personBlob } = await sb.storage.from('persons').download(order.storage_path)
  if (!personBlob) return null

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

  // Salva em cache
  try {
    const stickerPath = `stickers/${token}.png`
    await sb.storage.from('stickers').upload(stickerPath, stickerPng, { contentType: 'image/png', upsert: true })
    await sb.from('orders').update({ sticker_path: stickerPath } as Partial<OrderRow>).eq('download_token', token)
  } catch { /* silencia erro de cache */ }

  return stickerPng
}

async function buildPdf(stickerPng: Buffer, nome: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage([A4_W, A4_H])

  // Fundo branco
  page.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: rgb(1, 1, 1) })

  // Embute a imagem PNG
  const pngImage = await pdfDoc.embedPng(stickerPng)

  // Calcula offset vertical para centralizar o grid
  const gridH  = ROWS * CELL_H + (ROWS - 1) * GAP
  const startY = (A4_H - gridH) / 2  // pontos do fundo (pdf-lib: Y=0 é base)
  const startX = MARGIN

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = startX + col * (CELL_W + GAP)
      // pdf-lib: Y cresce para cima, então row 0 = topo → subtrai
      const y = startY + (ROWS - 1 - row) * (CELL_H + GAP)

      // Linha de corte (tracejada cinza clara)
      const dashLen = 4
      const dashGap = 3
      const lineColor = rgb(0.8, 0.8, 0.8)
      const lineWidth = 0.4

      // Topo da célula
      let dx = x
      while (dx < x + CELL_W) {
        page.drawLine({ start: { x: dx, y: y + CELL_H }, end: { x: Math.min(dx + dashLen, x + CELL_W), y: y + CELL_H }, thickness: lineWidth, color: lineColor })
        dx += dashLen + dashGap
      }
      // Base
      dx = x
      while (dx < x + CELL_W) {
        page.drawLine({ start: { x: dx, y }, end: { x: Math.min(dx + dashLen, x + CELL_W), y }, thickness: lineWidth, color: lineColor })
        dx += dashLen + dashGap
      }
      // Esquerda
      let dy = y
      while (dy < y + CELL_H) {
        page.drawLine({ start: { x, y: dy }, end: { x, y: Math.min(dy + dashLen, y + CELL_H) }, thickness: lineWidth, color: lineColor })
        dy += dashLen + dashGap
      }
      // Direita
      dy = y
      while (dy < y + CELL_H) {
        page.drawLine({ start: { x: x + CELL_W, y: dy }, end: { x: x + CELL_W, y: Math.min(dy + dashLen, y + CELL_H) }, thickness: lineWidth, color: lineColor })
        dy += dashLen + dashGap
      }

      page.drawImage(pngImage, { x, y, width: CELL_W, height: CELL_H })
    }
  }

  // Rodapé
  page.drawText(`Figurinha Copa 2026 · ${nome} · Recorte nas linhas tracejadas`, {
    x: MARGIN,
    y: 10,
    size: 7,
    color: rgb(0.6, 0.6, 0.6),
  })

  return pdfDoc.save()
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  // Valida pagamento + busca nome
  const { data, error } = await sb
    .from('orders')
    .select('paid, nome')
    .eq('download_token', token)
    .single()

  const order = data as Pick<OrderRow, 'paid' | 'nome'> | null

  if (error || !order) {
    return NextResponse.json({ error: 'Token não encontrado' }, { status: 404 })
  }

  if (!order.paid) {
    return NextResponse.json({ error: 'Pagamento pendente' }, { status: 402 })
  }

  const stickerPng = await getStickerBuffer(token)
  if (!stickerPng) {
    return NextResponse.json({ error: 'Figurinha não encontrada' }, { status: 500 })
  }

  const nome = order.nome ?? 'Figurinha'
  const pdfBytes = await buildPdf(stickerPng, nome)

  const safeNome = nome.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60)
  const filename = `${safeNome}_Copa2026.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
