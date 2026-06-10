import { NextRequest, NextResponse } from 'next/server'

const FLUX_VERSION = '897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462'

const JERSEY_PROMPT = `Transform this photo into an official Brazil national football team Panini sticker card portrait.

POSE: Person faces directly at the camera, body centered and upright, head straight forward, arms relaxed along the sides — standard official squad photo pose. Preserve the person's age, body size, and proportions exactly as they are (if a child, keep child body proportions).

JERSEY — Brazil CBF 2026 official home kit, exact details:
- Body fabric: saturated canary yellow hex #D9B42F with subtle fine vertical micro-stripe ribbed texture
- Collar: narrow V-neck in brazil green hex #1B8A4A with thin yellow border
- Sleeve cuffs: brazil green hex #1B8A4A
- Upper LEFT chest (viewer left, wearer right): Nike swoosh in solid green #1B8A4A, about 12% of chest width
- CENTER chest: CBF Brazil crest — blue oval shield #0057A4 with green cross inside, five gold five-pointed stars #F2D13D arranged above the shield, letters "CBF" inside the shield, text "BRASIL" in green #1B8A4A below the crest. Crest about 18% of chest width. This is the most important element — replicate it accurately.
- Overall: matte finish, modern Brazil home kit look

FACE & IDENTITY: Keep the person's face, skin tone, eyes, hair, expression, and ALL facial features completely identical. Do not change the face in any way.

BACKGROUND: Neutral dark studio background, professional sports photography lighting.

FRAMING: Portrait from head to mid-chest, Panini football sticker card style.`

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
          output_format: 'jpg',
          safety_tolerance: 3,
          prompt_upsampling: false,
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
