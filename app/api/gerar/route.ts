import { NextRequest, NextResponse } from 'next/server'
import { generateJerseyPhoto } from '@/lib/pipeline/gemini'
import { removeBackground } from '@/lib/pipeline/removeBackground'
import { compositeSticker } from '@/lib/pipeline/compositor'

export const maxDuration = 60  // Vercel Pro: até 60s

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const photo = formData.get('photo') as File | null
    const nome   = (formData.get('nome')   as string | null)?.trim() || ''
    const data   = (formData.get('data')   as string | null)?.trim() || ''
    const altura = (formData.get('altura') as string | null)?.trim() || ''
    const peso   = (formData.get('peso')   as string | null)?.trim() || ''
    const clube  = (formData.get('clube')  as string | null)?.trim() || ''
    const watermark = formData.get('watermark') !== 'false'

    if (!photo || !nome || !data || !altura || !peso || !clube) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const mimeType = (photo.type || 'image/jpeg') as string

    // 1. Gemini: colocar camiseta do Brasil
    const jerseyBuffer = await generateJerseyPhoto(
      photoBuffer.toString('base64'),
      mimeType
    )

    // 2. Remover fundo (rembg local em dev, remove.bg em prod)
    const personPng = await removeBackground(jerseyBuffer)

    // 3. Compositar no template + texto + watermark
    const stickerPng = await compositeSticker(personPng, {
      nome, data, altura, peso, clube, watermark,
    })

    return new NextResponse(new Uint8Array(stickerPng), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[/api/gerar]', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
