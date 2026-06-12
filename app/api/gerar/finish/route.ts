import { NextRequest, NextResponse } from 'next/server'
import { compositeSticker } from '@/lib/pipeline/compositor'
import { saveJob } from '@/lib/redis'
import { supabaseAdmin } from '@/lib/supabase'

async function ensureBuckets() {
  const buckets = ['persons', 'stickers']
  for (const name of buckets) {
    const { error } = await supabaseAdmin.storage.createBucket(name, {
      public: false,
      fileSizeLimit: 10_000_000,
    })
    // Ignora erro "already exists"
    if (error && !error.message.includes('already exists')) {
      console.warn('[finish] bucket create warn:', error.message)
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { rembgUrl, nome, email, data, altura, peso, clube } = await req.json()
    if (!rembgUrl) return NextResponse.json({ error: 'rembgUrl obrigatório' }, { status: 400 })

    const imgRes = await fetch(rembgUrl)
    if (!imgRes.ok) throw new Error('Falha ao baixar imagem processada')
    const personPng = Buffer.from(await imgRes.arrayBuffer())

    const stickerPng = await compositeSticker(personPng, {
      nome, data, altura, peso, clube, watermark: true,
    })

    // Salva no Redis (legacy admin panel)
    const jobId = await saveJob({
      nome, email: email ?? '', clube, data, altura, peso, rembgUrl, paid: false,
    })

    // Salva no Supabase
    try {
      await ensureBuckets()

      const storagePath = `persons/${jobId}.png`
      await supabaseAdmin.storage
        .from('persons')
        .upload(storagePath, personPng, { contentType: 'image/png', upsert: true })

      await supabaseAdmin.from('orders').insert({
        job_id: jobId,
        email: email ?? null,
        nome: nome ?? null,
        dados_figurinha: { data, altura, peso, clube },
        storage_path: storagePath,
        paid: false,
      })
    } catch (dbErr) {
      // Não bloqueia a resposta — log apenas
      console.error('[finish] supabase error:', dbErr)
    }

    return new NextResponse(new Uint8Array(stickerPng), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'X-Job-Id': jobId,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
