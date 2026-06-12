import { NextRequest, NextResponse } from 'next/server'
import { getLastWebhook } from '@/lib/webhookLog'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const data = await getLastWebhook()
  return NextResponse.json(data ?? { message: 'Nenhum webhook recebido ainda' })
}
