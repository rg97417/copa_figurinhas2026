import { NextRequest, NextResponse } from 'next/server'

const FLUX_VERSION = '897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462'

const JERSEY_PROMPT = `Change only the clothing of the person to a plain, solid, uniform yellow soccer jersey with a green V-neck collar and green sleeve cuffs. The jersey must be completely plain, solid yellow fabric with absolutely NO logos, NO badges, NO symbols, NO text, and NO graphics on it. Replace all existing clothing and any existing logos or badges on the chest. Keep the person's face, hair, skin tone, expression, and all physical features 100% identical. Studio photography, clean white background, soft professional studio lighting, sharp focus, photorealistic.`

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
          input_image:       `data:${mimeType};base64,${photoBase64}`,
          prompt:            JERSEY_PROMPT,
          aspect_ratio:      'match_input_image',
          output_format:     'png',
          output_quality:    100,
          safety_tolerance:  3,
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
