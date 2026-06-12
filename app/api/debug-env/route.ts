import { NextResponse } from 'next/server'

// Rota de diagnóstico temporária — remover após resolver
export async function GET() {
  return NextResponse.json({
    SUPABASE_URL:      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_ROLE_KEY:  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_KEY:        !!process.env.RESEND_API_KEY,
    KIWIFY_SECRET:     !!process.env.KIWIFY_WEBHOOK_SECRET,
    NODE_ENV:          process.env.NODE_ENV,
  })
}
