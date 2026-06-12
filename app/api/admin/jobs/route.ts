import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Custos estimados por geração (OpenAI gpt-image-2 + Replicate rembg em BRL)
const COST_PER_GEN_BRL  = 0.25
const PRICE_PER_SALE_BRL = 12.90

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const sb = getSupabaseAdmin()

  const { data: orders, error } = await sb
    .from('orders')
    .select('id, email, nome, paid, paid_at, created_at, sticker_path, dados_figurinha, order_bump_products, download_token, job_id, utm_params')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = (orders ?? []) as Record<string, unknown>[]

  const total      = list.length
  const paid       = list.filter(o => o.paid).length
  const unpaid     = total - paid
  const downloaded = list.filter(o => o.paid && o.sticker_path).length
  const withPdf    = list.filter(o => Array.isArray(o.order_bump_products) && (o.order_bump_products as unknown[]).length > 0).length

  const revenue    = paid * PRICE_PER_SALE_BRL
  const totalCost  = total * COST_PER_GEN_BRL
  const wasteCost  = unpaid * COST_PER_GEN_BRL
  const profit     = revenue - totalCost
  const conversion = total > 0 ? (paid / total) * 100 : 0
  const dlRate     = paid > 0 ? (downloaded / paid) * 100 : 0

  // UTM breakdown por source/medium
  const utmMap: Record<string, { source: string; medium: string; campaign: string; total: number; paid: number; revenue: number }> = {}
  for (const o of list) {
    const params = o.utm_params as Record<string, string> | null
    const source   = params?.utm_source   ?? 'orgânico'
    const medium   = params?.utm_medium   ?? ''
    const campaign = params?.utm_campaign ?? ''
    const key = `${source}|${medium}|${campaign}`
    if (!utmMap[key]) utmMap[key] = { source, medium, campaign, total: 0, paid: 0, revenue: 0 }
    utmMap[key].total++
    if (o.paid) { utmMap[key].paid++; utmMap[key].revenue += PRICE_PER_SALE_BRL }
  }
  const utmStats = Object.values(utmMap).sort((a, b) => b.total - a.total)

  return NextResponse.json({
    orders: list,
    metrics: {
      total, paid, unpaid, downloaded, withPdf,
      revenue, totalCost, wasteCost, profit,
      conversion, dlRate,
      costPerGen: COST_PER_GEN_BRL,
      pricePerSale: PRICE_PER_SALE_BRL,
    },
    utmStats,
  })
}
