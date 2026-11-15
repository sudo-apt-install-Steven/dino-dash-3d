-- Migration 01: Tabelas autoritativas de sessoes de corrida, carteiras, auditoria de gacha, rate limits e logs de seguranca.
-- Nenhuma tabela critica permite gravacao direta pelo navegador (somente service_role via Edge Functions).

CREATE TABLE IF NOT EXISTS public.rate_limits (
  scope TEXT NOT NULL,
  actor_key TEXT NOT NULL,
  req_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, actor_key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_key TEXT NOT NULL,
  auth_uid UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'high', 'critical')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT,
  origin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_created ON public.security_audit_logs (created_at DESC);
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.run_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_key TEXT NOT NULL,
  auth_uid UUID,
  nonce TEXT NOT NULL,
  mode_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  dino_id TEXT NOT NULL,
  seed TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours'),
  finished_at TIMESTAMPTZ,
  final_score INTEGER CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 250000)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'rejected', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_run_sessions_actor_started ON public.run_sessions (actor_key, started_at DESC);
ALTER TABLE public.run_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jogador le proprias sessoes de corrida"
  ON public.run_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = auth_uid);

CREATE TABLE IF NOT EXISTS public.player_wallets (
  actor_key TEXT PRIMARY KEY,
  auth_uid UUID,
  nickname TEXT NOT NULL DEFAULT 'Dino',
  eggs INTEGER NOT NULL DEFAULT 0 CHECK (eggs >= 0 AND eggs <= 5000000),
  fossil_crates INTEGER NOT NULL DEFAULT 2 CHECK (fossil_crates >= 0 AND fossil_crates <= 5000),
  gacha_pity INTEGER NOT NULL DEFAULT 0 CHECK (gacha_pity >= 0 AND gacha_pity <= 30),
  high_score INTEGER NOT NULL DEFAULT 0 CHECK (high_score >= 0 AND high_score <= 250000),
  total_runs INTEGER NOT NULL DEFAULT 0 CHECK (total_runs >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_wallets_auth_uid ON public.player_wallets (auth_uid);
ALTER TABLE public.player_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jogador le propria carteira"
  ON public.player_wallets FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = auth_uid);

CREATE TABLE IF NOT EXISTS public.gacha_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_key TEXT NOT NULL,
  auth_uid UUID,
  spend_type TEXT NOT NULL CHECK (spend_type IN ('crate', 'eggs')),
  tier_id TEXT NOT NULL,
  pity_before INTEGER NOT NULL DEFAULT 0,
  pity_after INTEGER NOT NULL DEFAULT 0,
  loot_real_money BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gacha_audit_actor_created ON public.gacha_audit_logs (actor_key, created_at DESC);
ALTER TABLE public.gacha_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jogador le proprio historico de gacha"
  ON public.gacha_audit_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = auth_uid);
