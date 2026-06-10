import { NextRequest, NextResponse } from 'next/server'

const FLUX_VERSION = '897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462'

const JERSEY_PROMPT = `Edit this photo: change ONLY the clothing to the Nike Brazil 2024 home football jersey. Change nothing else.

JERSEY: Golden-yellow performance polyester (#D7BC1F). Very subtle fine vertical ribbed texture. Deep V-neck collar in green (#119C4A), double-layer. Green sleeve cuffs (#119C4A). Nike swoosh on upper-left chest (viewer left), solid green, slightly tilted. A blue shield crest on center chest with "CBF" and "BRASIL" text.

BODY — CRITICAL: Do NOT change the person's body shape, size, muscle mass, or proportions in ANY way. If the person is thin, keep them thin. If the person is a child with a child's body, keep exactly the child's body. If the person is large, keep them large. Only apply jersey fabric texture and color — do not remodel the body to look more athletic or muscular. The body silhouette must remain identical.

POSE: Person faces directly at the camera, upright, arms relaxed at sides. If the original pose already matches, keep it exactly as is.

FACE: Keep the person's face, skin, eyes, hair, and all facial features 100% unchanged. Do not alter the face.

BACKGROUND: Clean white studio background, bright even lighting like official CBF squad photos.

FRAMING: Portrait from head to mid-chest.

QUALITY: 4K photorealistic, sharp, professional DSLR, hyperrealistic fabric texture.`

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
