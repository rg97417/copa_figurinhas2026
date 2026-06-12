import { randomBytes } from 'crypto'

interface CacheEntry {
  b64: string
  expiresAt: number
}

// Singleton global para persistir entre hot-reloads do Next.js em dev
declare global {
  // eslint-disable-next-line no-var
  var __imageCache: Map<string, CacheEntry> | undefined
}

function getCache(): Map<string, CacheEntry> {
  if (!global.__imageCache) {
    global.__imageCache = new Map()
  }
  return global.__imageCache
}

function purgeExpired(cache: Map<string, CacheEntry>) {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) cache.delete(key)
  }
}

const MAX_ENTRIES = 100

export function storeImage(b64: string): string {
  const cache = getCache()
  purgeExpired(cache)
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  const id = randomBytes(16).toString('hex')
  cache.set(id, { b64, expiresAt: Date.now() + 30 * 60 * 1000 }) // 30 min
  return id
}

export function retrieveImage(id: string): string | null {
  const cache = getCache()
  const entry = cache.get(id)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(id)
    return null
  }
  return entry.b64
}
