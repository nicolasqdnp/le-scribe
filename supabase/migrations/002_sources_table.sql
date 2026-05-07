-- Table sources : vidéos YouTube, Google Docs, notes, fichiers
-- utilisée à la fois pour le profil auteur (usage='author_style')
-- et pour les projets livres (usage='book_source')
create table if not exists sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  profil_id   uuid references profils_auteurs(id) on delete cascade,
  projet_id   uuid,
  type        text not null, -- 'youtube', 'drive', 'note', 'file'
  usage       text not null, -- 'author_style', 'book_source'
  label       text,
  url         text,
  contenu_brut text,
  ordre       integer default 0,
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now()
);

alter table sources enable row level security;

create policy "Users see own sources"
  on sources for select using (auth.uid() = user_id);

create policy "Users insert own sources"
  on sources for insert with check (auth.uid() = user_id);

create policy "Users update own sources"
  on sources for update using (auth.uid() = user_id);

create policy "Users delete own sources"
  on sources for delete using (auth.uid() = user_id);

-- Colonne contexte_culturel sur profils_auteurs (ajout)
alter table profils_auteurs
  add column if not exists contexte_culturel text;
