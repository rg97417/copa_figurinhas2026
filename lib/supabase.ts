import { createClient } from '@supabase/supabase-js'

export interface OrderRow {
  id: string
  email: string | null
  phone: string | null
  nome: string | null
  job_id: string | null
  dados_figurinha: Record<string, string> | null
  storage_path: string | null
  sticker_path: string | null
  download_token: string
  paid: boolean
  paid_at: string | null
  kiwify_order_id: string | null
  order_bump_products: string[] | null
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: ReturnType<typeof createClient<any, any, any>> | null = null

// Lazy init — evita erro de módulo quando env vars não existem durante build
export function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase env vars não configuradas')
    _admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _admin
}
