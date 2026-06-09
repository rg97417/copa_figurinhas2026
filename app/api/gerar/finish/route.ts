import { NextRequest, NextResponse } from 'next/server'
import { compositeSticker } from '@/lib/pipeline/compositor'

export async function POST(req: NextRequest) {
  try {
    const { rembgUrl, nome, data, altura, peso, clube } = await req.json()
    if (!rembgUrl) return NextResponse.json({ error: 'rembgUrl obrigatório' }, { status: 400 })

    const imgRes = await fetch(rembgUrl)
    if (!imgRes.ok) throw new Error('Falha ao baixar imagem do rembg')
    const personPng = Buffer.from(await imgRes.arrayBuffer())

    const stickerPng = await compositeSticker(personPng, {
      nome, data, altura, peso, clube, watermark: true,
    })

    return new NextResponse(new Uint8Array(stickerPng), {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
