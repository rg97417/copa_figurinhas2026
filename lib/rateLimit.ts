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
export async function rateLimit(
  identifier: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  if (!REDIS_URL()) return true
  try {
    const key = `rl:${identifier}`
    const count = (await redisCmd('incr', key)) as number
    if (count === 1) await redisCmd('expire', key, String(windowSeconds))
    return count <= max
  } catch {
    return true
  }
}
