import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const REMBG_VERSION = 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003'

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, personX, totalW } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl obrigatório' }, { status: 400 })

    let rembgInput: string = imageUrl

    // If composite mode: download FLUX output and crop the person panel
    if (personX != null && totalW != null) {
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) throw new Error(`Falha ao baixar output FLUX: ${imgRes.status}`)
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

      const meta = await sharp(imgBuffer).metadata()
      const outW = meta.width!
      // Scale personX proportionally (FLUX may output different pixel dims)
      const cropLeft = Math.round(outW * (personX / totalW))
      const cropWidth = outW - cropLeft

      const cropped = await sharp(imgBuffer)
        .extract({ left: cropLeft, top: 0, width: cropWidth, height: meta.height! })
        .png()
        .toBuffer()

      rembgInput = `data:image/png;base64,${cropped.toString('base64')}`
    }

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REMBG_VERSION,
        input: { image: rembgInput, model: 'birefnet-general' },
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
