-- Commandes boutique (livre physique + EPUB)
create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  product            text not null check (product in ('epub', 'physique')),
  amount             integer not null,          -- en centimes
  stripe_session_id  text unique,
  status             text not null default 'pending' check (status in ('pending', 'paid', 'shipped')),
  shipping_name      text,
  shipping_address   jsonb,                     -- adresse complète pour physique
  epub_sent_at       timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Index pour lookup par session Stripe (webhook)
create index if not exists orders_stripe_session_idx on orders(stripe_session_id);
create index if not exists orders_email_idx on orders(email);

-- RLS désactivé : les commandes sont gérées côté serveur uniquement
alter table orders enable row level security;
-- Aucune politique publique : accès uniquement via service_role
