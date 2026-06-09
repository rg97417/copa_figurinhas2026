// Cliente Upstash Redis via REST — sem dependências extras

export interface FigurinhaJob {
  id: string
  nome: string
  email: string
  clube: string
  data: string
  altura: string
  peso: string
  rembgUrl: string
  paid: boolean
  createdAt: string
}

const BASE  = () => process.env.UPSTASH_REDIS_REST_URL!
const TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN!

async function cmd(...args: (string | number)[]): Promise<unknown> {
  const url = `${BASE()}/${args.map((a) => encodeURIComponent(String(a))).join('/')}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
    cache: 'no-store',
  })
  const json = await res.json()
  return json.result
}

export async function saveJob(job: Omit<FigurinhaJob, 'id' | 'createdAt'>): Promise<string> {
  if (!BASE()) return 'no-redis'
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const record: FigurinhaJob = { ...job, id, createdAt: new Date().toISOString() }
  await cmd('set', `job:${id}`, JSON.stringify(record))
  await cmd('lpush', 'jobids', id)
  return id
}

export async function listJobs(): Promise<FigurinhaJob[]> {
  if (!BASE()) return []
  const ids = (await cmd('lrange', 'jobids', 0, 199)) as string[] | null
  if (!ids?.length) return []
  const jobs = await Promise.all(
    ids.map(async (id) => {
      const raw = (await cmd('get', `job:${id}`)) as string | null
      return raw ? (JSON.parse(raw) as FigurinhaJob) : null
    })
  )
  return jobs.filter(Boolean) as FigurinhaJob[]
}

export async function getJob(id: string): Promise<FigurinhaJob | null> {
  if (!BASE()) return null
  const raw = (await cmd('get', `job:${id}`)) as string | null
  return raw ? (JSON.parse(raw) as FigurinhaJob) : null
}

export async function markPaid(id: string): Promise<void> {
  if (!BASE()) return
  const job = await getJob(id)
  if (!job) return
  await cmd('set', `job:${id}`, JSON.stringify({ ...job, paid: true }))
}
