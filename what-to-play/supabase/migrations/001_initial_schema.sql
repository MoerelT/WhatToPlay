create extension if not exists pgcrypto;

do $$
begin
  create type public.game_source_type as enum (
    'steam',
    'steam_wishlist',
    'retroachievements'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.user_game_status as enum (
    'available',
    'in_progress',
    'story_completed',
    'achievements_completed',
    'completed',
    'abandoned'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.slot_type as enum (
    'regular',
    'free'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.validation_type as enum (
    'story',
    'achievements'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.difficulty_level as enum (
    'hard',
    'medium',
    'easy'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  steam_id text not null unique,
  display_name text,
  avatar_url text,
  profile_url text,
  is_steam_profile_public boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cover_url text,
  header_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_external_ids (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  source game_source_type not null,
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create table if not exists public.user_library_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  source game_source_type not null default 'steam',
  playtime_minutes integer not null default 0,
  last_played_at timestamptz,
  imported_at timestamptz not null default now(),
  raw_data jsonb not null default '{}'::jsonb,
  unique (profile_id, game_id, source)
);

create table if not exists public.wheels (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Ma roue',
  difficulty difficulty_level not null default 'medium',
  validation validation_type not null default 'achievements',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_games (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  wheel_id uuid references public.wheels(id) on delete set null,
  status user_game_status not null default 'in_progress',
  slot_type slot_type not null default 'regular',
  validation validation_type not null,
  started_at timestamptz not null default now(),
  story_completed_at timestamptz,
  achievements_completed_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_steam_id on public.profiles(steam_id);
create index if not exists idx_games_name on public.games(name);
create index if not exists idx_game_external_ids_lookup on public.game_external_ids(source, external_id);
create index if not exists idx_user_library_profile on public.user_library_entries(profile_id);
create index if not exists idx_user_games_profile_status on public.user_games(profile_id, status);
create index if not exists idx_wheels_profile_active on public.wheels(profile_id, is_active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at
before update on public.games
for each row execute function public.set_updated_at();

drop trigger if exists set_wheels_updated_at on public.wheels;
create trigger set_wheels_updated_at
before update on public.wheels
for each row execute function public.set_updated_at();

drop trigger if exists set_user_games_updated_at on public.user_games;
create trigger set_user_games_updated_at
before update on public.user_games
for each row execute function public.set_updated_at();
