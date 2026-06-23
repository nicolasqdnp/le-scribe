create table if not exists crowdfunding_contributions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tier_id text not null,
  amount integer not null,
  shipping_amount integer not null default 0,
  total_amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  stripe_session_id text unique,
  shipping_name text,
  shipping_address jsonb,
  epub_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists crowdfunding_stripe_idx on crowdfunding_contributions(stripe_session_id);
create index if not exists crowdfunding_status_idx on crowdfunding_contributions(status);
alter table crowdfunding_contributions enable row level security;
