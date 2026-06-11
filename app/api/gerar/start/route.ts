import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { storeImage } from '@/lib/imageCache'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// IMAGE 1: foto da pessoa (identidade)
// IMAGE 2: camiseta_exemplo.png — Neymar com a camiseta da seleção (pose + jersey)
// Resultado: retrato limpo da pessoa com a camiseta e pose do IMAGE 2
// O card/figurinha é montado depois pelo compositeSticker
const SWAP_PROMPT = `
IMAGE 1 is a photo of Neymar wearing the Brazil national team jersey.
IMAGE 2 is a photo of a person whose identity must replace Neymar.

Replace the person in IMAGE 1 with the person from IMAGE 2.
Keep everything else in IMAGE 1 exactly the same: jersey, pose, framing, lighting, background.
The face, skin tone, hair and age must match IMAGE 2 exactly — do not change anything about that person's appearance.
Output a clean photorealistic sports portrait. No card frame, no text overlay, no watermark.
`.trim()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })

    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const mimeType = (photo.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // IMAGE 1 (base a editar): Neymar com a camiseta da seleção
    const jerseyPath = path.join(process.cwd(), 'public', 'assets', 'jersey_reference.png')
    const jerseyFile = await toFile(fs.readFileSync(jerseyPath), 'jersey.png', { type: 'image/png' })

    // IMAGE 2 (referência de identidade): foto da pessoa
    const personFile = await toFile(photoBuffer, 'person.png', { type: mimeType })

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: [jerseyFile, personFile],
      prompt: SWAP_PROMPT,
      n: 1,
      size: '1024x1024',
    })

    const b64 = response.data?.[0]?.b64_json
    if (!b64) throw new Error('OpenAI não retornou imagem')

    const cacheId = storeImage(b64)
    const mockId = `mock_openai_${cacheId}`
    return NextResponse.json({ predictionId: mockId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[start/route] OpenAI error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
