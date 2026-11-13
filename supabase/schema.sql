-- Schema Supabase para DINO DASH 3D (Salas Públicas & Ranking Global com RLS anti-trapaça básica)

create table if not exists public.dino_rooms (
  code text primary key check (char_length(code) = 4),
  host_name text not null check (char_length(host_name) between 1 and 24),
  mode_id text not null default 'lan_party',
  is_public boolean not null default true,
  player_count integer not null default 1 check (player_count between 1 and 8),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  updated_at timestamptz not null default now()
);

alter table public.dino_rooms enable row level security;

drop policy if exists "Salas publicas visiveis" on public.dino_rooms;
create policy "Salas publicas visiveis"
  on public.dino_rooms for select
  using (is_public = true or updated_at > now() - interval '20 minutes');

drop policy if exists "Criar sala anon/auth" on public.dino_rooms;
create policy "Criar sala anon/auth"
  on public.dino_rooms for insert
  with check (char_length(code) = 4 and player_count between 1 and 8);

drop policy if exists "Atualizar sala ativa" on public.dino_rooms;
create policy "Atualizar sala ativa"
  on public.dino_rooms for update
  using (updated_at > now() - interval '30 minutes')
  with check (player_count between 0 and 8);

drop policy if exists "Remover sala inativa" on public.dino_rooms;
create policy "Remover sala inativa"
  on public.dino_rooms for delete
  using (true);

create table if not exists public.dino_leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(trim(player_name)) between 1 and 24),
  dino_id text not null default 'trex',
  mode_id text not null default 'solo',
  score integer not null check (score >= 0 and score <= 250000),
  distance integer not null default 0 check (distance >= 0 and distance <= 250000),
  eggs integer not null default 0 check (eggs >= 0 and eggs <= 10000),
  user_id uuid null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists dino_leaderboard_score_idx on public.dino_leaderboard (score desc);

alter table public.dino_leaderboard enable row level security;

drop policy if exists "Leitura publica do ranking" on public.dino_leaderboard;
create policy "Leitura publica do ranking"
  on public.dino_leaderboard for select
  using (true);

drop policy if exists "Inserir pontuacao validada" on public.dino_leaderboard;
create policy "Inserir pontuacao validada"
  on public.dino_leaderboard for insert
  with check (
    score >= 0
    and score <= 250000
    and char_length(trim(player_name)) between 1 and 24
    and (user_id is null or user_id = auth.uid())
  );
