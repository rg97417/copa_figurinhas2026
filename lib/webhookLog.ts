// Temporário: salva último webhook recebido no Redis para diagnóstico
const BASE  = () => process.env.UPSTASH_REDIS_REST_URL   ?? ''
const TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN ?? ''

export async function saveLastWebhook(payload: unknown): Promise<void> {
  if (!BASE()) return
  try {
    const url = `${BASE()}/set/${encodeURIComponent('last_webhook')}/${encodeURIComponent(JSON.stringify({ payload, receivedAt: new Date().toISOString() }))}/ex/3600`
    await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` }, cache: 'no-store' })
  } catch { /* silencia */ }
}

export async function getLastWebhook(): Promise<unknown> {
  if (!BASE()) return null
  try {
    const url = `${BASE()}/get/${encodeURIComponent('last_webhook')}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN()}` }, cache: 'no-store' })
    const raw = (await res.json()).result as string | null
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
