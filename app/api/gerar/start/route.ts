import { NextRequest, NextResponse } from 'next/server'

const FLUX_VERSION = '897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462'

const JERSEY_PROMPT = `Replace the clothing in this photo with the exact Brazil national football team 2023-2024 home jersey worn by Neymar in official CBF squad photos. This is the Nike Brazil home kit with the following precise details:

JERSEY BODY: Golden-yellow performance polyester fabric, hex color #D7BC1F (RGB 215,188,31). Very subtle vertical micro-grain texture with low sheen. No patterns, no stripes — just the fine vertical fabric grain.

COLLAR: Deep V-neck collar in two-tone green — outer edge #119C4A, inner edge #0D7E3B — double-layer construction. The V opens wide and deep. Same green color #119C4A on both sleeve cuffs.

NIKE SWOOSH: Upper-left area of chest (from viewer's perspective). Solid flat green #119C4A. The swoosh is tilted approximately -12 degrees. Proportionally large — about 12% of chest width. This is a standard Nike swoosh shape.

CBF CREST (center of chest, below swoosh): This must be reproduced accurately.
- 5 small five-pointed stars in a single horizontal row above the main shield, in dark green #119C4A
- Main shield: rounded rectangular shield shape, dominant blue #0058A8
- Inside the shield: a white southern cross / diamond lozenge pattern with green #119C4A lines forming an X or cross
- Small text "CBF" in white centered inside the shield
- Below the shield: text "BRASIL" in bold uppercase, dark green #119C4A

POSE: Person faces directly at the camera, body centered and upright, head straight, arms relaxed at sides — standard official CBF squad photo pose. Preserve exact age, body size, and proportions (keep child proportions if the person is a child).

FACE: Preserve the person's face, skin tone, eyes, hair, and all facial features 100% identically. Do not alter the face.

BACKGROUND: Clean white background, bright even studio lighting, identical to official CBF national team portrait photos.

FRAMING: Head and upper body to mid-chest, portrait orientation, Panini football sticker style.

QUALITY: Photorealistic 4K, sharp focus, professional sports photography, hyperrealistic fabric and skin texture, DSLR quality.`

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
