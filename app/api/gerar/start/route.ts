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
You have 2 images:
- IMAGE 1: A photo of a person. Extract ONLY their identity: face, skin tone, hair, age, expression.
- IMAGE 2: A portrait photo of Neymar wearing the Brazil national team jersey. Copy ONLY: pose, body framing, jersey design, lighting, background color.

TASK: Generate a photorealistic portrait of the person from IMAGE 1, placed in the exact same pose, framing and jersey as IMAGE 2.

─── FRAMING (match IMAGE 2 exactly) ───
- Upper body shot: head fully visible at top, jersey visible down to the lower chest/stomach area
- Same zoom level as IMAGE 2 — do NOT zoom into the face only
- Head occupies roughly the top 40% of the frame
- Full jersey chest visible with both Nike swoosh and CBF badge clearly shown
- Shoulders fully visible and squared

─── IDENTITY (from IMAGE 1 only) ───
- Keep face 100% identical: structure, eyes, nose, mouth, skin tone, hair, age
- Do NOT alter the person's appearance in any way

─── JERSEY (replicate IMAGE 2 exactly) ───
The jersey has TWO separate elements at different positions — do NOT confuse them:

ELEMENT A — Nike swoosh:
- Small dark green checkmark
- Positioned on the UPPER chest, on the person's RIGHT pectoral (which is the viewer's LEFT side)
- It is small and sits alone in the upper-left zone

ELEMENT B — CBF badge:
- Large circular/shield badge with CBF logo
- Positioned in the HORIZONTAL CENTER of the chest, lower than the Nike swoosh
- It is NOT on the left, NOT on the right — it is perfectly CENTERED on the chest
- Stars arc ABOVE the badge, "BRASIL" text BELOW the badge
- If you place the badge anywhere other than the horizontal center, the image is WRONG

JERSEY DETAILS:
- Canary yellow body
- Dark green V-neck collar
- Dark green sleeve cuffs
- Same fabric texture as IMAGE 2

─── BACKGROUND ───
- Solid dark gray/charcoal background (same as IMAGE 2)
- Clean, no gradients, no text, no graphics

─── OUTPUT ───
- Photorealistic, sharp, professional sports portrait
- NO card frame, NO sticker design, NO text overlay, NO watermark
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
