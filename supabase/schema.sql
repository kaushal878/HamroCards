create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key,
  game_type text not null check (game_type in ('callbreak', 'rummy', 'kitty')),
  players jsonb not null default '[]'::jsonb,
  status text not null check (status in ('waiting', 'bidding', 'playing', 'paused', 'ended')),
  created_at timestamptz not null default now()
);

create table if not exists public.game_states (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  state_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.game_states enable row level security;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "players can read rooms" on public.rooms for select using (true);
create policy "players can read game states" on public.game_states for select using (true);
