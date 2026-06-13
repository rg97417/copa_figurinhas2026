import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

const REMBG_VERSION = 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003'

const TRUSTED_HOSTS = ['replicate.delivery', 'pbxt.replicate.delivery', 'api.replicate.com', 'supabase.co']

function isTrustedUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url)
    if (protocol !== 'https:') return false
    return TRUSTED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))
  } catch { return false }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const allowed = await rateLimit(`rembg:${ip}`, 10, 3600)
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 hora.' }, { status: 429 })
    }

    const { imageUrl } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl obrigatório' }, { status: 400 })
    if (!isTrustedUrl(imageUrl)) {
      return NextResponse.json({ error: 'URL de imagem inválida' }, { status: 400 })
    }

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REMBG_VERSION,
        input: { image: imageUrl, model: 'birefnet-general' },
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
