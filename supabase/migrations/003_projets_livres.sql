-- Table principale des projets livres
create table if not exists projets_livres (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  titre             text,
  sujet             text,
  objectif          text,
  lectorat          text,
  transformation    text,
  nb_chapitres      integer default 7,
  longueur          text,
  structure_interne text,
  plan_existant     text,
  ton               text,
  a_inclure         text,
  a_eviter          text,
  message_cle       text,

  -- Résultats de l'analyse IA
  plan_ia           jsonb,          -- plan structuré généré par Claude
  statut            text not null default 'nouveau',
  -- 'nouveau' | 'analyse_en_cours' | 'plan_propose' | 'redaction' | 'termine'

  chapitre_courant  integer default 0,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Table des chapitres
create table if not exists chapitres (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  projet_id       uuid not null references projets_livres(id) on delete cascade,
  numero          integer not null,
  titre           text,
  contenu_ia      text,   -- version générée par Claude
  contenu_final   text,   -- version validée/modifiée par l'auteur
  statut          text not null default 'vide',
  -- 'vide' | 'en_cours' | 'genere' | 'valide'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Table des messages du chat par projet
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  projet_id   uuid not null references projets_livres(id) on delete cascade,
  chapitre_id uuid references chapitres(id) on delete set null,
  role        text not null, -- 'user' | 'assistant'
  contenu     text not null,
  created_at  timestamptz not null default now()
);

-- RLS
alter table projets_livres enable row level security;
alter table chapitres enable row level security;
alter table chat_messages enable row level security;

create policy "Users manage own projets" on projets_livres for all using (auth.uid() = user_id);
create policy "Users manage own chapitres" on chapitres for all using (auth.uid() = user_id);
create policy "Users manage own chat" on chat_messages for all using (auth.uid() = user_id);
