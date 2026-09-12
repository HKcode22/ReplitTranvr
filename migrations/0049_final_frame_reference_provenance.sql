-- MIGRATION 0049 — Phase 2 final-frame traffic/reference provenance
--
-- Adds the fields required to distinguish a genuinely frozen traffic-tier
-- reference from the old curated/provisional tiering. Additive/idempotent.

BEGIN;

ALTER TABLE clean.adb_sampling_frame
  ADD COLUMN IF NOT EXISTS tier_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS traffic_metric_name TEXT,
  ADD COLUMN IF NOT EXISTS traffic_metric_value DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS traffic_metric_units TEXT,
  ADD COLUMN IF NOT EXISTS traffic_reference_hash TEXT,
  ADD COLUMN IF NOT EXISTS country_iso2 TEXT,
  ADD COLUMN IF NOT EXISTS airport_longitude_e DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS airport_timezone TEXT,
  ADD COLUMN IF NOT EXISTS out_degree INTEGER,
  ADD COLUMN IF NOT EXISTS in_degree INTEGER,
  ADD COLUMN IF NOT EXISTS undirected_degree INTEGER,
  ADD COLUMN IF NOT EXISTS effective_carriers DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS intl_share DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='clean.adb_sampling_frame'::regclass
       AND conname='adb_sampling_frame_traffic_metric_nonnegative'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_traffic_metric_nonnegative
      CHECK (traffic_metric_value IS NULL OR traffic_metric_value >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='clean.adb_sampling_frame'::regclass
       AND conname='adb_sampling_frame_intl_share_range'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_intl_share_range
      CHECK (intl_share IS NULL OR (intl_share >= 0 AND intl_share <= 1));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='clean.adb_sampling_frame'::regclass
       AND conname='adb_sampling_frame_verified_tier_rule'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_verified_tier_rule
      CHECK (
        (tier_verified = false)
        OR (
          tier IN ('HUB','MID','REGIONAL')
          AND traffic_metric_value IS NOT NULL
          AND traffic_reference_hash IS NOT NULL
        )
      );
  END IF;
END $$;

ALTER TABLE clean.adb_sampling_frame_registry
  ADD COLUMN IF NOT EXISTS traffic_reference_hash TEXT,
  ADD COLUMN IF NOT EXISTS region_mapping_hash TEXT,
  ADD COLUMN IF NOT EXISTS tier_hash TEXT,
  ADD COLUMN IF NOT EXISTS traffic_source_name TEXT,
  ADD COLUMN IF NOT EXISTS traffic_source_version TEXT,
  ADD COLUMN IF NOT EXISTS traffic_retrieval_date DATE,
  ADD COLUMN IF NOT EXISTS reference_period_start DATE,
  ADD COLUMN IF NOT EXISTS reference_period_end DATE,
  ADD COLUMN IF NOT EXISTS traffic_metric_name TEXT,
  ADD COLUMN IF NOT EXISTS traffic_metric_units TEXT,
  ADD COLUMN IF NOT EXISTS tier_rule_json JSONB;

COMMIT;
