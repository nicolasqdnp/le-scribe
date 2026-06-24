-- Listes de contacts
create table if not exists contact_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- Contacts
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references contact_lists(id) on delete cascade not null,
  email text not null,
  first_name text,
  last_name text,
  subscribed boolean default true,
  unsubscribed_at timestamptz,
  created_at timestamptz default now(),
  unique(list_id, email)
);

-- Campagnes
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  list_id uuid references contact_lists(id),
  name text not null,
  subject text not null,
  from_name text not null,
  from_email text not null,
  html_content text,
  design_json jsonb,
  status text default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Envois individuels (pour tracking)
create table if not exists campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  email text not null,
  status text default 'pending' check (status in ('pending', 'sent', 'failed', 'bounced')),
  opened_at timestamptz,
  clicked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table contact_lists enable row level security;
alter table contacts enable row level security;
alter table campaigns enable row level security;
alter table campaign_sends enable row level security;

create policy "owner" on contact_lists using (user_id = auth.uid());
create policy "owner_contacts" on contacts using (
  list_id in (select id from contact_lists where user_id = auth.uid())
);
create policy "owner_campaigns" on campaigns using (user_id = auth.uid());
create policy "owner_sends" on campaign_sends using (
  campaign_id in (select id from campaigns where user_id = auth.uid())
);
