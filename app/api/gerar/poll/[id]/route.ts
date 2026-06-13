import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anon'
    if (!(await rateLimit(`poll:${ip}`, 120, 3600))) {
      return NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 })
    }

    const { id } = await params

    // Imagem OpenAI salva no Supabase Storage (cross-Lambda safe)
    if (id.startsWith('mock_openai_')) {
      const tempId = id.replace('mock_openai_', '')
      const sb = getSupabaseAdmin()
      const { data: signed } = await sb.storage
        .from('persons')
        .createSignedUrl(`temp/${tempId}.png`, 300)
      if (!signed?.signedUrl) {
        return NextResponse.json({ error: 'Imagem expirada ou não encontrada' }, { status: 404 })
      }
      return NextResponse.json({ status: 'succeeded', output: signed.signedUrl, error: null })
    }

    // Mock legado: mock_vton_ (mantido por retrocompatibilidade)
    if (id.startsWith('mock_vton_')) {
      const base64Url = id.replace('mock_vton_', '')
      const decodedUrl = Buffer.from(base64Url, 'base64url').toString('utf8')
      return NextResponse.json({ status: 'succeeded', output: decodedUrl, error: null })
    }

    // Replicate polling (rembg e outros)
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY!}` },
    })
    if (!res.ok) throw new Error(`Replicate ${res.status}`)
    const p = await res.json()
    // Normaliza output: arrays retornam primeiro elemento
    const raw = p.output ?? null
    const output = Array.isArray(raw) ? (raw[0] ?? null) : raw
    return NextResponse.json({ status: p.status, output, error: p.error ?? null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
