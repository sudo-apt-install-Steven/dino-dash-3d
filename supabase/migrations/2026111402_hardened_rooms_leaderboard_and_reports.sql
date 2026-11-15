-- Fase 3: Blindagem de Salas, Ranking Autoritativo, Canal de Denúncias e Limpeza Segura

CREATE TABLE IF NOT EXISTS public.dino_room_secrets (
  code text PRIMARY KEY REFERENCES public.dino_rooms(code) ON DELETE CASCADE,
  host_actor_key text NOT NULL,
  host_secret_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dino_room_secrets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.abuse_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_actor_key text NOT NULL,
  reporter_auth_uid uuid NULL,
  target_player_name text NULL,
  room_code text NULL,
  category text NOT NULL CHECK (category IN ('ofensa', 'trapaca', 'bug_seguranca', 'privacidade', 'outro')),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 8 AND 1000),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'resolvido', 'arquivado')),
  ip_hash text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abuse_reports_reporter_created ON public.abuse_reports (reporter_actor_key, created_at DESC);
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

-- Revoga privilégios diretos de escrita de anon e authenticated nas tabelas públicas sensíveis
REVOKE INSERT, UPDATE, DELETE ON TABLE public.dino_rooms FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.dino_leaderboard FROM anon, authenticated;
REVOKE ALL ON TABLE public.dino_room_secrets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.abuse_reports FROM anon, authenticated;

-- Endurece policies existentes via ALTER POLICY (sem comandos destrutivos)
ALTER POLICY "Criar sala anon/auth" ON public.dino_rooms
  TO service_role
  WITH CHECK (char_length(code) = 4 AND player_count BETWEEN 1 AND 8);

ALTER POLICY "Atualizar sala ativa" ON public.dino_rooms
  TO service_role
  USING (true)
  WITH CHECK (player_count BETWEEN 0 AND 8);

ALTER POLICY "Remover sala inativa" ON public.dino_rooms
  TO service_role
  USING (true);

ALTER POLICY "Salas publicas visiveis" ON public.dino_rooms
  USING (is_public = true AND updated_at > now() - interval '20 minutes');

ALTER POLICY "Inserir pontuacao validada" ON public.dino_leaderboard
  TO service_role
  WITH CHECK (score >= 0 AND score <= 250000);

-- Policies explícitas para service_role / usuário autenticado nas tabelas de segurança e denúncias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dino_room_secrets' AND policyname = 'Service role controla segredos de sala'
  ) THEN
    CREATE POLICY "Service role controla segredos de sala"
      ON public.dino_room_secrets FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rate_limits' AND policyname = 'Service role gerencia rate limits'
  ) THEN
    CREATE POLICY "Service role gerencia rate limits"
      ON public.rate_limits FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_audit_logs' AND policyname = 'Service role gerencia auditoria'
  ) THEN
    CREATE POLICY "Service role gerencia auditoria"
      ON public.security_audit_logs FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'abuse_reports' AND policyname = 'Service role gerencia denuncias'
  ) THEN
    CREATE POLICY "Service role gerencia denuncias"
      ON public.abuse_reports FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'abuse_reports' AND policyname = 'Usuario le proprias denuncias'
  ) THEN
    CREATE POLICY "Usuario le proprias denuncias"
      ON public.abuse_reports FOR SELECT
      TO authenticated
      USING ((SELECT auth.uid()) = reporter_auth_uid);
  END IF;
END $$;

-- Função segura com search_path fixo para limpar salas expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_dino_rooms()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.dino_rooms
  WHERE updated_at < now() - interval '20 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_dino_rooms() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_dino_rooms() TO service_role;
