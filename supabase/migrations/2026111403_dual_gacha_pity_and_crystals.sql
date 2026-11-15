-- Dual independent Gacha pity counters (/9 Epica+ and /15 Lendaria+ Shiny) + Crystal Catalyst economy
ALTER TABLE IF EXISTS public.player_wallets
  ADD COLUMN IF NOT EXISTS crystals integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gacha_pity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gacha_pity_epic integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gacha_pity_shiny integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'player_wallets' AND column_name = 'gacha_pity'
  ) THEN
    EXECUTE '
      UPDATE public.player_wallets
      SET
        gacha_pity_epic = CASE WHEN gacha_pity_epic = 0 AND COALESCE(gacha_pity, 0) > 0 THEN LEAST(8, GREATEST(0, gacha_pity)) ELSE gacha_pity_epic END,
        gacha_pity_shiny = CASE WHEN gacha_pity_shiny = 0 AND COALESCE(gacha_pity, 0) > 0 THEN LEAST(14, GREATEST(0, gacha_pity)) ELSE gacha_pity_shiny END
    ';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.gacha_audit_logs
  ADD COLUMN IF NOT EXISTS pity_epic_before integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pity_epic_after integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pity_shiny_before integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pity_shiny_after integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_catalyst boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crystals_spent integer NOT NULL DEFAULT 0;
