import { NextRequest, NextResponse } from 'next/server'
import { getJob, markPaid } from '@/lib/redis'
import { compositeSticker } from '@/lib/pipeline/compositor'
import { checkAdminAuth } from '@/lib/adminAuth'

export const maxDuration = 60

async function upscale4K(pngBuffer: Buffer): Promise<Buffer> {
  const base64 = pngBuffer.toString('base64')

  const res = await fetch('https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=55',
    },
    body: JSON.stringify({
      input: {
        image: `data:image/png;base64,${base64}`,
        scale: 4,
        face_enhance: true,
      },
    }),
  })

  if (!res.ok) throw new Error(`Upscale ${res.status}: ${await res.text()}`)
  let pred = await res.json()

  // Polling caso o Prefer: wait não conclua a tempo
  for (let i = 0; i < 20 && pred.status !== 'succeeded' && pred.status !== 'failed'; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const p = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}` },
    })
    pred = await p.json()
  }

  if (pred.status !== 'succeeded' || !pred.output) throw new Error('Upscale falhou ou expirou')

  const imgRes = await fetch(pred.output)
  if (!imgRes.ok) throw new Error('Falha ao baixar imagem upscalada')
  return Buffer.from(await imgRes.arrayBuffer())
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const authErr = await checkAdminAuth(req)
    if (authErr) return authErr

    const { jobId } = await params
    const job = await getJob(jobId)
    if (!job) return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })

    // Baixa imagem sem fundo do Replicate
    const imgRes = await fetch(job.rembgUrl)
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: 'URL da imagem expirou. Peça ao usuário para gerar novamente.' },
        { status: 410 }
      )
    }
    const personPng = Buffer.from(await imgRes.arrayBuffer())

    // Gera composite sem marca d'água
    const stickerPng = await compositeSticker(personPng, {
      nome:      job.nome,
      data:      job.data,
      altura:    job.altura,
      peso:      job.peso,
      clube:     job.clube,
      watermark: false,
    })

    // Upscale 4x para resolução 4K (~4064×5400px)
    const stickerHD = await upscale4K(stickerPng)

    // Marca como pago
    await markPaid(jobId)

    const filename = `figurinha_4K_${job.nome.replace(/\s+/g, '_').toLowerCase()}.png`

    return new NextResponse(new Uint8Array(stickerHD), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
