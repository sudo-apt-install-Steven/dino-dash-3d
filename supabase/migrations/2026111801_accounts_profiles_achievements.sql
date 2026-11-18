-- D2 + D3 + D4 + D8: Contas, Perfis Públicos/Privados, Conquistas Sincronizadas e Save na Nuvem

CREATE TABLE IF NOT EXISTS public.player_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL CHECK (char_length(trim(nickname)) BETWEEN 3 AND 16),
  nickname_lower text NOT NULL UNIQUE,
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 160),
  is_public boolean NOT NULL DEFAULT true,
  avatar_config jsonb NOT NULL DEFAULT '{"dinoId":"trex","angleY":-0.55,"angleX":0.12,"zoom":1.0,"pose":"idle","skinId":"original"}'::jsonb,
  showcase_achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 999),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  active_title text NOT NULL DEFAULT 'Iniciante',
  banner_id text NOT NULL DEFAULT 'amber_classic',
  frame_id text NOT NULL DEFAULT 'default',
  nickname_changed_at timestamptz NULL,
  is_minor_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_profiles_public ON public.player_profiles (is_public, level DESC);

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.player_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL CHECK (char_length(achievement_id) BETWEEN 1 AND 64),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'server', 'migrated')),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_player_achievements_user ON public.player_achievements (user_id, unlocked_at DESC);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.player_cloud_saves (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 4,
  save_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_cloud_saves ENABLE ROW LEVEL SECURITY;

-- Policies seguras (sem acesso anônimo a dados privados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_profiles' AND policyname = 'Perfis publicos ou proprio usuario'
  ) THEN
    CREATE POLICY "Perfis publicos ou proprio usuario"
      ON public.player_profiles FOR SELECT
      TO anon, authenticated
      USING (is_public = true OR (SELECT auth.uid()) = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_profiles' AND policyname = 'Usuario insere proprio perfil'
  ) THEN
    CREATE POLICY "Usuario insere proprio perfil"
      ON public.player_profiles FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.uid()) = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_profiles' AND policyname = 'Usuario atualiza proprio perfil'
  ) THEN
    CREATE POLICY "Usuario atualiza proprio perfil"
      ON public.player_profiles FOR UPDATE
      TO authenticated
      USING ((SELECT auth.uid()) = id)
      WITH CHECK ((SELECT auth.uid()) = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_profiles' AND policyname = 'Usuario exclui proprio perfil'
  ) THEN
    CREATE POLICY "Usuario exclui proprio perfil"
      ON public.player_profiles FOR DELETE
      TO authenticated
      USING ((SELECT auth.uid()) = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_achievements' AND policyname = 'Conquistas visiveis para dono ou perfil publico'
  ) THEN
    CREATE POLICY "Conquistas visiveis para dono ou perfil publico"
      ON public.player_achievements FOR SELECT
      TO anon, authenticated
      USING (
        (SELECT auth.uid()) = user_id
        OR EXISTS (
          SELECT 1 FROM public.player_profiles p
          WHERE p.id = player_achievements.user_id AND p.is_public = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_achievements' AND policyname = 'Usuario gerencia proprias conquistas'
  ) THEN
    CREATE POLICY "Usuario gerencia proprias conquistas"
      ON public.player_achievements FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_cloud_saves' AND policyname = 'Usuario gerencia proprio save na nuvem'
  ) THEN
    CREATE POLICY "Usuario gerencia proprio save na nuvem"
      ON public.player_cloud_saves FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.player_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.player_achievements FROM anon;
REVOKE ALL ON TABLE public.player_cloud_saves FROM anon;
