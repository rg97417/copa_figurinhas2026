import { NextRequest, NextResponse } from 'next/server'

const FLUX_VERSION = '897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462'

const JERSEY_PROMPT = `Transform this photo into an official Brazil national football team Panini sticker card portrait.

POSE: Person faces directly at the camera, body centered and upright, head straight forward, arms relaxed along the sides — standard official squad photo pose. Preserve the person's age, body size, and proportions exactly as they are (if a child, keep child body proportions).

JERSEY — Brazil CBF 2026 official home kit, exact replica of the real jersey:
- Body: muted golden-yellow fabric (#D4A832) with subtle fine vertical ribbed texture running top to bottom
- Collar: V-neck in vivid green (#1B8A4A), relatively wide V opening, same green on sleeve cuffs
- Nike swoosh: positioned on the upper-LEFT area of the chest (viewer's left = wearer's right), solid dark green (#1B8A4A), large and clearly visible, roughly 11cm wide on a real jersey
- CBF badge centered on chest, slightly below the Nike swoosh level — this badge must be accurate:
  * Five small five-pointed stars in a horizontal row, colored DARK GREEN (#1B5E20), positioned directly above the shield
  * Blue oval/shield shape (#0047AB) as the main badge body
  * Inside the shield: a green and yellow diamond/lozenge cross shape
  * Text "CBF" in white inside the shield
  * Text "BRASIL" in dark green (#1B5E20) below the badge, in a bold sans-serif font
- No other logos or text on the jersey

FACE & IDENTITY: Keep the person's face, skin tone, eyes, hair, expression, and ALL facial features completely identical. Do not change the face in any way.

BACKGROUND: Clean white or very light neutral background, professional sports photography lighting, similar to an official CBF squad photo.

FRAMING: Portrait from head to mid-chest, Panini football sticker card style.

QUALITY: Ultra-high resolution, 4K photorealistic, hyperrealistic skin and fabric detail, sharp focus, professional DSLR quality, RAW photo look, ultra-detailed textures.`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })

    const photoBase64 = Buffer.from(await photo.arrayBuffer()).toString('base64')
    const mimeType = photo.type || 'image/jpeg'

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: FLUX_VERSION,
        input: {
          input_image: `data:${mimeType};base64,${photoBase64}`,
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
    return NextResponse.json({ predictionId: prediction.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
