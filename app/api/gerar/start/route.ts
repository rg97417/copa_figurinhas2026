import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// codeplugtech/face-swap no Replicate
// target_image = imagem base (Neymar com jersey) — onde o rosto será colocado
// swap_image   = foto da pessoa — rosto a extrair
const FACESWAP_VERSION = '278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: 'Foto obrigatória' }, { status: 400 })

    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const mimeType    = photo.type || 'image/jpeg'

    // Neymar com camiseta → target (onde o rosto vai ser colocado)
    const jerseyPath   = path.join(process.cwd(), 'public', 'assets', 'jersey_reference.png')
    const jerseyBase64 = fs.readFileSync(jerseyPath).toString('base64')
    const targetImage  = `data:image/png;base64,${jerseyBase64}`

    // Foto da criança → swap (rosto a extrair)
    const swapImage = `data:${mimeType};base64,${photoBuffer.toString('base64')}`

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: FACESWAP_VERSION,
        input: {
          input_image: targetImage,
          swap_image:  swapImage,
        },
      }),
    })

    if (!res.ok) throw new Error(`Replicate ${res.status}: ${await res.text()}`)
    const prediction = await res.json()
    return NextResponse.json({ predictionId: prediction.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[start/route] face-swap error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
