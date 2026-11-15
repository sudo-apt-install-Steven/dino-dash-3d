-- Schema consolidado e endurecido para DINO DASH 3D
-- Salas públicas (leitura somente is_public=true; escrita apenas via Edge Function room-sync)
-- Ranking global (leitura pública; escrita exclusiva via Edge Function finish-run com validação HMAC + plausibilidade)

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

create policy "Salas publicas visiveis"
  on public.dino_rooms for select
  using (is_public = true and updated_at > now() - interval '20 minutes');

create policy "Criar sala anon/auth"
  on public.dino_rooms for insert
  to service_role
  with check (char_length(code) = 4 and player_count between 1 and 8);

create policy "Atualizar sala ativa"
  on public.dino_rooms for update
  to service_role
  using (true)
  with check (player_count between 0 and 8);

create policy "Remover sala inativa"
  on public.dino_rooms for delete
  to service_role
  using (true);

create table if not exists public.dino_leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(trim(player_name)) between 1 and 24),
  dino_id text not null default 'trex',
  mode_id text not null default 'solo',
  score integer not null check (score >= 0 and score <= 250000),
  distance integer not null default 0 check (distance >= 0 and distance <= 250000),
  eggs integer not null default 0 check (eggs >= 0 and eggs <= 25000),
  user_id uuid null default (select auth.uid()),
  created_at timestamptz not null default now()
);

create index if not exists dino_leaderboard_score_idx on public.dino_leaderboard (score desc);
alter table public.dino_leaderboard enable row level security;

create policy "Leitura publica do ranking"
  on public.dino_leaderboard for select
  using (true);

create policy "Inserir pontuacao validada"
  on public.dino_leaderboard for insert
  to service_role
  with check (score >= 0 and score <= 250000);
