-- ============================================================================
-- WK Pool — databaseschema
-- Twee pools (takken): "fun" (lage inleg) en "win" (hoge inleg).
-- Deelname op uitnodiging. Login via e-mail + wachtwoord (Supabase Auth).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type pool_tier as enum ('fun', 'win');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('scheduled', 'live', 'finished');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profielen (1-op-1 met auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pools — er zijn precies twee takken
-- ---------------------------------------------------------------------------
create table if not exists public.pools (
  id              uuid primary key default gen_random_uuid(),
  tier            pool_tier not null unique,
  name            text not null,
  description     text not null default '',
  entry_fee_cents integer not null,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Puntenschema per pool (instelbaar door beheerder)
-- ---------------------------------------------------------------------------
create table if not exists public.scoring_rules (
  pool_id          uuid primary key references public.pools (id) on delete cascade,
  points_toto      integer not null default 1,   -- juiste uitslag (win/gelijk/verlies)
  points_exact     integer not null default 3,   -- exacte score (extra bovenop toto)
  points_goal_diff integer not null default 1,   -- juist doelsaldo (extra)
  points_scorer    integer not null default 1,   -- juiste "wie scoort eerst" per wedstrijd
  points_champion  integer not null default 10,  -- juiste wereldkampioen (bonusvraag)
  points_top_scorer integer not null default 5   -- juiste topscorer (bonusvraag)
);

-- ---------------------------------------------------------------------------
-- Uitnodigingen (deelname is alleen op uitnodiging)
-- ---------------------------------------------------------------------------
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token       text not null unique default encode(gen_random_bytes(16), 'hex'),
  pool_tier   pool_tier,                  -- null = uitgenodigd voor beide takken
  invited_by  uuid references auth.users (id),
  accepted_by uuid references auth.users (id),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists invitations_email_idx on public.invitations (lower(email));

-- ---------------------------------------------------------------------------
-- Lidmaatschap van een pool
-- ---------------------------------------------------------------------------
create table if not exists public.pool_members (
  id         uuid primary key default gen_random_uuid(),
  pool_id    uuid not null references public.pools (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  paid       boolean not null default false,
  joined_at  timestamptz not null default now(),
  unique (pool_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text,
  flag_emoji  text,
  external_id text unique
);

-- ---------------------------------------------------------------------------
-- Wedstrijden
-- deadline om in te leggen = kickoff + lock_minutes (standaard 5 minuten)
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  external_id   text unique,
  stage         text not null default 'Groepsfase',
  home_team_id  uuid references public.teams (id),
  away_team_id  uuid references public.teams (id),
  kickoff       timestamptz not null,
  lock_minutes  integer not null default 5,
  home_score    integer,
  away_score    integer,
  status        match_status not null default 'scheduled',
  created_at    timestamptz not null default now()
);
create index if not exists matches_kickoff_idx on public.matches (kickoff);

-- ---------------------------------------------------------------------------
-- Voorspellingen per wedstrijd (per pool, per gebruiker)
-- ---------------------------------------------------------------------------
create table if not exists public.predictions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  pool_id         uuid not null references public.pools (id) on delete cascade,
  match_id        uuid not null references public.matches (id) on delete cascade,
  home_score      integer not null,
  away_score      integer not null,
  scorer_team_id  uuid references public.teams (id),  -- "wie scoort als eerste"
  points          integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, pool_id, match_id)
);

-- ---------------------------------------------------------------------------
-- Bonusvoorspellingen voor het hele toernooi (kampioen + topscorer)
-- ---------------------------------------------------------------------------
create table if not exists public.bonus_predictions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  pool_id          uuid not null references public.pools (id) on delete cascade,
  champion_team_id uuid references public.teams (id),
  top_scorer       text,
  points           integer not null default 0,
  unique (user_id, pool_id)
);

-- ---------------------------------------------------------------------------
-- Toernooi-instellingen (de werkelijke kampioen + topscorer)
-- ---------------------------------------------------------------------------
create table if not exists public.tournament (
  id                integer primary key default 1,
  name              text not null default 'WK',
  champion_team_id  uuid references public.teams (id),
  top_scorer        text,
  bonus_locked_at   timestamptz,  -- na dit moment kun je kampioen/topscorer niet meer wijzigen
  constraint tournament_singleton check (id = 1)
);
insert into public.tournament (id) values (1) on conflict (id) do nothing;
