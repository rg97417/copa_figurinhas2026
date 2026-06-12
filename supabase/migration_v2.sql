-- Migration v2: order bump products + bucket products
-- Rodar no Supabase SQL Editor

-- 1. Adiciona coluna para produtos do order bump
alter table orders
  add column if not exists order_bump_products jsonb default '[]'::jsonb;

-- 2. Bucket para PDFs e produtos digitais extras
-- Criar via Dashboard: Storage → New bucket → "products", Private
-- Ou via SQL (requer extensão storage habilitada):
-- insert into storage.buckets (id, name, public) values ('products', 'products', false) on conflict do nothing;
