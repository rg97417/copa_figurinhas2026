-- Tabela de pedidos Copa 2026
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  email            text,
  phone            text,
  nome             text,
  job_id           text unique,
  dados_figurinha  jsonb,                    -- {data, altura, peso, clube}
  storage_path     text,                     -- path no bucket "persons"
  sticker_path     text,                     -- path do sticker final no bucket "stickers"
  download_token   text unique default encode(gen_random_bytes(32), 'hex'),
  paid             boolean not null default false,
  paid_at          timestamptz,
  kiwify_order_id  text unique,
  created_at       timestamptz not null default now()
);

create index if not exists orders_email_idx  on orders(email);
create index if not exists orders_token_idx  on orders(download_token);
create index if not exists orders_job_idx    on orders(job_id);

-- RLS: apenas service_role acessa
alter table orders enable row level security;
