import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const IDMVTON_VERSION = '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985'

export async function POST(req: NextRequest) {
  try {
    const { humanImageUrl } = await req.json()
    if (!humanImageUrl) return NextResponse.json({ error: 'humanImageUrl obrigatório' }, { status: 400 })

    const garmentPath = path.join(process.cwd(), 'public/assets/camiseta_exemplo.png')
    const garmentBase64 = fs.readFileSync(garmentPath).toString('base64')

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: IDMVTON_VERSION,
        input: {
          human_img:   humanImageUrl,
          garm_img:    `data:image/png;base64,${garmentBase64}`,
          garment_des: 'Yellow Brazil national team jersey, green V-neck collar. Left chest: small green Nike swoosh. Center chest: blue CBF shield badge. Right side: NO badge, NO logo, NO emblem.',
          category:    'upper_body',
          crop:        true,
          steps:       40,
          seed:        42,
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
