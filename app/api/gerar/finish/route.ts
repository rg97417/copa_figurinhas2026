import { NextRequest, NextResponse } from 'next/server'
import { compositeSticker } from '@/lib/pipeline/compositor'
import { saveJob } from '@/lib/redis'
import { getSupabaseAdmin, OrderRow } from '@/lib/supabase'

export const maxDuration = 60

const TRUSTED_HOSTS = [
  'replicate.delivery',
  'pbxt.replicate.delivery',
  'api.replicate.com',
  'supabase.co',       // signed URLs do Supabase Storage
]

function isTrustedImageUrl(url: string): boolean {
  if (url.startsWith('data:image/')) return true
  try {
    const { hostname, protocol } = new URL(url)
    if (protocol !== 'https:') return false
    return TRUSTED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))
  } catch { return false }
}

async function ensureBuckets() {
  const sb = getSupabaseAdmin()
  const buckets = ['persons', 'stickers']
  for (const name of buckets) {
    const { error } = await sb.storage.createBucket(name, {
      public: false,
      fileSizeLimit: 10_000_000,
    })
    if (error && !error.message.includes('already exists')) {
      console.warn('[finish] bucket create warn:', error.message)
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { rembgUrl, nome, email, data, altura, peso, clube } = await req.json()
    if (!rembgUrl) return NextResponse.json({ error: 'rembgUrl obrigatório' }, { status: 400 })
    if (!isTrustedImageUrl(rembgUrl)) {
      return NextResponse.json({ error: 'URL de imagem inválida' }, { status: 400 })
    }

    const imgRes = await fetch(rembgUrl)
    if (!imgRes.ok) throw new Error('Falha ao baixar imagem processada')
    const personPng = Buffer.from(await imgRes.arrayBuffer())

    const stickerPng = await compositeSticker(personPng, {
      nome, data, altura, peso, clube, watermark: true,
    })

    const jobId = await saveJob({
      nome, email: email ?? '', clube, data, altura, peso, rembgUrl, paid: false,
    })

    try {
      const sb = getSupabaseAdmin()
      await ensureBuckets()

      const storagePath = `persons/${jobId}.png`
      await sb.storage
        .from('persons')
        .upload(storagePath, personPng, { contentType: 'image/png', upsert: true })

      await sb.from('orders').insert({
        job_id: jobId,
        email: email ?? null,
        nome: nome ?? null,
        dados_figurinha: { data, altura, peso, clube },
        storage_path: storagePath,
        paid: false,
      } as Partial<OrderRow>)
    } catch (dbErr) {
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
