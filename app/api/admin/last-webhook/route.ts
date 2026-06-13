import { NextRequest, NextResponse } from 'next/server'
import { getLastWebhook } from '@/lib/webhookLog'
import { checkAdminAuth } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const authErr = await checkAdminAuth(req)
  if (authErr) return authErr
  const data = await getLastWebhook()
  return NextResponse.json(data ?? { message: 'Nenhum webhook recebido ainda' })
}
