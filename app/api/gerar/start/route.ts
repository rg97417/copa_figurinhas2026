import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import * as path from 'path'
import * as fs from 'fs'

const FLUX_VERSION = '897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462'

const JERSEY_PROMPT = `This image shows two panels side by side separated by a thin white border.
LEFT PANEL: A reference photo showing the exact Brazil national football team jersey.
RIGHT PANEL: The person to edit.

Your task: Edit the person in the RIGHT PANEL to wear the exact same Brazil jersey visible in the LEFT PANEL.

Copy EXACTLY from the LEFT panel jersey:
- Yellow-gold fabric color and texture
- Deep green V-neck collar (double layer, same green on sleeve cuffs)
- Nike swoosh on upper-left chest (green, large)
- CBF crest on center chest: 5 stars above a blue shield, cross pattern inside, CBF text, BRASIL text below
- All proportions and placement of logos

Preserve EXACTLY from the RIGHT panel:
- The person's face, skin tone, eyes, hair — 100% identical
- Body proportions and size (keep child proportions if the person is a child, keep adult proportions if adult)
- Age appearance

Result for the RIGHT panel:
- Person wearing the Brazil jersey
- Clean white studio background
- Upright frontal pose, head straight, arms relaxed at sides
- Photorealistic 4K quality, professional sports portrait`

async function buildComposite(
  personBuffer: Buffer,
): Promise<{ composite: Buffer; personX: number; totalW: number; totalH: number }> {
  const refPath = path.join(process.cwd(), 'public/assets/jersey_ref.jpg')
  const refBuffer = fs.readFileSync(refPath)

  const personMeta = await sharp(personBuffer).metadata()
  const personW = personMeta.width!
  const personH = personMeta.height!

  const refMeta = await sharp(refBuffer).metadata()
  const refW = Math.round(refMeta.width! * (personH / refMeta.height!))

  const refResized = await sharp(refBuffer)
    .resize(refW, personH)
    .jpeg({ quality: 95 })
    .toBuffer()

  const SEP = 8
  const totalW = refW + SEP + personW
  const personX = refW + SEP

  const composite = await sharp({
    create: { width: totalW, height: personH, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: refResized, left: 0, top: 0 },
      { input: personBuffer, left: personX, top: 0 },
    ])
    .jpeg({ quality: 95 })
    .toBuffer()

  return { composite, personX, totalW, totalH: personH }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })

    const personBuffer = Buffer.from(await photo.arrayBuffer())
    const { composite, personX, totalW } = await buildComposite(personBuffer)

    const compositeBase64 = composite.toString('base64')

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: FLUX_VERSION,
        input: {
          input_image: `data:image/jpeg;base64,${compositeBase64}`,
          prompt: JERSEY_PROMPT,
          aspect_ratio: 'match_input_image',
          output_format: 'png',
          output_quality: 100,
          safety_tolerance: 3,
          prompt_upsampling: true,
        },
      }),
    })

    if (!res.ok) throw new Error(`Replicate ${res.status}: ${await res.text()}`)
    const prediction = await res.json()
    return NextResponse.json({ predictionId: prediction.id, personX, totalW })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
