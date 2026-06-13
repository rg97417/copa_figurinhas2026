import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

const TRUSTED_HOSTS = ['replicate.delivery', 'pbxt.replicate.delivery', 'supabase.co']

function isTrustedUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url)
    if (protocol !== 'https:') return false
    return TRUSTED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))
  } catch { return false }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anon'
    if (!(await rateLimit(`step2:${ip}`, 20, 3600))) {
      return NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 })
    }

    const { humanImageUrl } = await req.json()
    if (!humanImageUrl) return NextResponse.json({ error: 'humanImageUrl obrigatório' }, { status: 400 })
    if (!isTrustedUrl(humanImageUrl)) {
      return NextResponse.json({ error: 'URL de imagem inválida' }, { status: 400 })
    }

    // No Face Swap, a camiseta oficial já está aplicada no Passo 1.
    // Retornamos um mock ID com a URL encodada em base64url para o poll decodificar imediatamente.
    const mockId = `mock_vton_${Buffer.from(humanImageUrl).toString('base64url')}`
    return NextResponse.json({ predictionId: mockId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
