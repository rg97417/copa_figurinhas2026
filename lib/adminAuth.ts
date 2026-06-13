import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

/**
 * Verifica autenticação do admin com duas camadas de rate limiting:
 * 1. 120 req/IP/hora — bloqueia floods antes de checar o segredo
 * 2. 10 falhas/IP/hora — bloqueia brute-force do ADMIN_SECRET
 *
 * Retorna NextResponse de erro, ou null se autenticado com sucesso.
 */
export async function checkAdminAuth(req: NextRequest): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anon'

  // Camada 1 — flood/scraping geral
  if (!(await rateLimit(`admin:${ip}`, 120, 3600))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    // Camada 2 — brute-force: após 10 erros/hora o IP recebe 429 em vez de 401
    if (!(await rateLimit(`admin-fail:${ip}`, 10, 3600))) {
      return NextResponse.json({ error: 'IP bloqueado por tentativas inválidas' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  return null
}
