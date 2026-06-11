import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { storeImage } from '@/lib/imageCache'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// IMAGE 1: foto da pessoa (identidade)
// IMAGE 2: camiseta_exemplo.png — Neymar com a camiseta da seleção (pose + jersey)
// Resultado: retrato limpo da pessoa com a camiseta e pose do IMAGE 2
// O card/figurinha é montado depois pelo compositeSticker — NÃO deve aparecer aqui
const SWAP_PROMPT = `
You have 2 images:
- IMAGE 1: A photo of a person. Use it ONLY to extract their identity (face, skin tone, hair, age, expression).
- IMAGE 2: A clean portrait photo of Neymar wearing the Brazil national team jersey. Use it ONLY for pose, jersey design, framing, lighting and background.

TASK: Generate a clean portrait photo of the person from IMAGE 1, wearing the exact same Brazil national team jersey from IMAGE 2, in the exact same pose and framing as IMAGE 2.

IDENTITY — copy exactly from IMAGE 1:
- face structure, eyes, nose, mouth, ears
- skin tone and texture
- hair color and hairstyle
- age appearance
- expression

POSE — copy exactly from IMAGE 2:
- front facing, body centered
- shoulders squared to camera
- head centered, not tilted
- looking directly into camera
- upper body crop (same as IMAGE 2)
- same camera distance and framing
- arms relaxed at sides

JERSEY — copy exactly from IMAGE 2:
- canary yellow body
- dark green V-neck collar
- CBF crest centered on chest with five stars above it and BRASIL text below
- Nike swoosh on left chest
- same fabric texture and sheen as IMAGE 2

BACKGROUND:
- solid teal/cyan blue, clean studio background
- no text, no graphics, no card elements, no watermarks

OUTPUT:
- photorealistic, 4K, ultra sharp, HDR
- professional sports portrait photography
- NO card frame, NO sticker design, NO text overlay
`.trim()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })

    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const mimeType = (photo.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // IMAGE 1: foto da pessoa
    const personFile = await toFile(photoBuffer, 'person.png', { type: mimeType })

    // IMAGE 2: Neymar com camiseta — referência de pose e jersey
    const jerseyPath = path.join(process.cwd(), 'public', 'assets', 'jersey_reference.png')
    const jerseyFile = await toFile(fs.readFileSync(jerseyPath), 'jersey.png', { type: 'image/png' })

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: [personFile, jerseyFile],
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
