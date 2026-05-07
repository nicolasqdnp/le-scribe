-- Table pour stocker l'analyse IA du profil auteur
create table if not exists author_profile_analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  portrait    jsonb not null,
  resume      text,
  status      text not null default 'done',
  transcripts_count integer default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- Sécurité : chaque utilisateur ne voit que son analyse
alter table author_profile_analyses enable row level security;

create policy "Users see own analysis"
  on author_profile_analyses for select
  using (auth.uid() = user_id);

create policy "Users insert own analysis"
  on author_profile_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users update own analysis"
  on author_profile_analyses for update
  using (auth.uid() = user_id);
