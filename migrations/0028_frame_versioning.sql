-- MIGRATION 0028 — sampling frame versioning + UNCLASSIFIED tier (Phase 0J / ChatGPT round-3 item 3)
-- Idempotent (IF NOT EXISTS / guarded DO blocks).
--
-- 1. tier CHECK gains UNCLASSIFIED: missing-reference airports stay visible,
--    never blanket-mapped to REGIONAL (§1.5.10 / Plan §4.1).
-- 2. region_source records HOW each row's region was assigned (explicit
--    override vs provisional prefix table + version); UNMAPPED stays excluded.
-- 3. frame_version + frame_hash version every rebuild: new builds INSERT a new
--    version, never DELETE prior rows (prior frame artifacts preserved).

DO $$
BEGIN
  -- Drop the old tier CHECK (HUB/MID/REGIONAL only) so UNCLASSIFIED is legal.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'clean.adb_sampling_frame'::regclass
      AND conname = 'adb_sampling_frame_tier_check'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame DROP CONSTRAINT adb_sampling_frame_tier_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'clean.adb_sampling_frame'::regclass
      AND conname = 'adb_sampling_frame_tier_check_v2'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_tier_check_v2
      CHECK (tier IN ('HUB', 'MID', 'REGIONAL', 'UNCLASSIFIED'));
  END IF;
  -- Drop the old tier_source rule that forced UNCLASSIFIED-adjacent rows into REGIONAL.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'clean.adb_sampling_frame'::regclass
      AND conname = 'adb_sampling_frame_tier_source_rule'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame DROP CONSTRAINT adb_sampling_frame_tier_source_rule;
  END IF;
END $$;

ALTER TABLE clean.adb_sampling_frame
  ALTER COLUMN region DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS region_source TEXT,
  ADD COLUMN IF NOT EXISTS exclusion_reason TEXT,
  ADD COLUMN IF NOT EXISTS frame_version TEXT NOT NULL DEFAULT 'pre-v1',
  ADD COLUMN IF NOT EXISTS frame_hash TEXT;

-- Versioned history: replace the icao-only PRIMARY KEY with a surrogate key +
-- UNIQUE(icao, frame_version), so rebuilds INSERT new versions (never DELETE).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'clean.adb_sampling_frame'::regclass
      AND conname = 'adb_sampling_frame_pkey'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame DROP CONSTRAINT adb_sampling_frame_pkey;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS clean.adb_sampling_frame_registry (
  registry_key TEXT PRIMARY KEY CHECK (registry_key = 'ACTIVE'),
  active_frame_version TEXT NOT NULL,
  frame_hash TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clean.adb_sampling_frame_registry
  ADD COLUMN IF NOT EXISTS frame_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_adb_sampling_frame_version
  ON clean.adb_sampling_frame (frame_version, tier, region);

ALTER TABLE clean.adb_sampling_frame
  ADD COLUMN IF NOT EXISTS frame_row_id BIGSERIAL UNIQUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'clean.adb_sampling_frame'::regclass
      AND conname = 'adb_sampling_frame_icao_version_uniq'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_icao_version_uniq UNIQUE (icao, frame_version);
  END IF;
END $$;
