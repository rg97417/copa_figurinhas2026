import { NextRequest, NextResponse } from 'next/server'
import { getJob, markPaid } from '@/lib/redis'
import { compositeSticker } from '@/lib/pipeline/compositor'

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const secret = req.headers.get('x-admin-secret')
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

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

    // Gera sem marca d'água
    const stickerPng = await compositeSticker(personPng, {
      nome:   job.nome,
      data:   job.data,
      altura: job.altura,
      peso:   job.peso,
      clube:  job.clube,
      watermark: false,
    })

    // Marca como pago
    await markPaid(jobId)

    const filename = `figurinha_${job.nome.replace(/\s+/g, '_').toLowerCase()}.png`

    return new NextResponse(new Uint8Array(stickerPng), {
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
