-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP COMPLETO DO BANCO DE DADOS
-- Execute este script no Supabase: SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. TABELA PRINCIPAL ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text,
  phone               text,
  nome                text,
  job_id              text          UNIQUE,
  dados_figurinha     jsonb,
  storage_path        text,
  sticker_path        text,
  download_token      text          UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  paid                boolean       NOT NULL DEFAULT false,
  paid_at             timestamptz,
  kiwify_order_id     text          UNIQUE,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  order_bump_products jsonb         DEFAULT '[]'::jsonb,
  utm_params          jsonb,
  followup_sent_at    timestamptz
);

-- ── 2. ÍNDICES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS orders_email_idx          ON public.orders (email);
CREATE INDEX IF NOT EXISTS orders_token_idx          ON public.orders (download_token);
CREATE INDEX IF NOT EXISTS orders_job_idx            ON public.orders (job_id);

-- ── 3. ROW LEVEL SECURITY ─────────────────────────────────────────────────────
-- RLS ativado mas sem policies públicas — acesso apenas via service_role key
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ── 4. STORAGE BUCKETS ────────────────────────────────────────────────────────
-- Execute cada insert separadamente se der erro de duplicata

-- Bucket para fotos originais das pessoas
INSERT INTO storage.buckets (id, name, public)
VALUES ('persons', 'persons', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket para stickers finais gerados
INSERT INTO storage.buckets (id, name, public)
VALUES ('stickers', 'stickers', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket para produtos (PDFs, guias etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', false)
ON CONFLICT (id) DO NOTHING;

-- ── 5. POLICIES DE STORAGE ───────────────────────────────────────────────────
-- Apenas service_role tem acesso — usuários públicos não lêem/escrevem direto

-- persons: somente service_role (sem policy pública)
-- stickers: somente service_role (sem policy pública)
-- products: somente service_role (sem policy pública)

-- ─────────────────────────────────────────────────────────────────────────────
-- PRONTO! Após rodar este script:
-- 1. Configure as variáveis de ambiente conforme .env.example
-- 2. Faça o deploy no Vercel
-- 3. Configure o webhook da Kiwify apontando para:
--    https://seudominio.com/api/kiwify/webhook?token=KIWIFY_WEBHOOK_SECRET
-- ─────────────────────────────────────────────────────────────────────────────
