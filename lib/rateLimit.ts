const REDIS_URL   = () => process.env.UPSTASH_REDIS_REST_URL   ?? ''
const REDIS_TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN ?? ''

async function redisCmd(...parts: string[]): Promise<unknown> {
  if (!REDIS_URL()) return null
  const url = `${REDIS_URL()}/${parts.map(encodeURIComponent).join('/')}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN()}` },
    cache: 'no-store',
  })
  return (await res.json()).result
}

// Returns true = allowed, false = rate limited.
// Falls through (returns true) if Redis is unavailable.
// Uses pipeline (INCR + EXPIRE in one round-trip) to avoid the race where
// INCR succeeds but EXPIRE never runs (key stuck without TTL forever).
export async function rateLimit(
  identifier: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  if (!REDIS_URL()) return true
  try {
    const key = `rl:${identifier}`
    // Upstash pipeline: POST /pipeline with array of commands — atomic round-trip
    const url = `${REDIS_URL()}/pipeline`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSeconds, 'NX'], // NX = só seta TTL se ainda não tem
      ]),
      cache: 'no-store',
    })
    const results = await res.json() as Array<{ result: unknown }>
    const count = results[0]?.result as number
    return count <= max
  } catch {
    return true
  }
}
