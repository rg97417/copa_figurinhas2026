import { NextRequest, NextResponse } from 'next/server'
import { listJobs } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const jobs = await listJobs()
  return NextResponse.json(jobs)
}
