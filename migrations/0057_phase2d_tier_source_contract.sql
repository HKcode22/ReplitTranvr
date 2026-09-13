-- MIGRATION 0057 — Phase 2D final-frame tier_source contract repair
--
-- Migration 0021 created adb_sampling_frame_tier_source_check with only the
-- legacy values ('curated','unclassified'). Migration 0028 intended to retire
-- the old tier-source rule but targeted a different constraint name, so the
-- original CHECK survived. The binding f.8 final-frame owner writes
-- 'traffic_reference' for rows backed by the frozen exogenous reference and
-- 'missing_reference' for measured-universe rows without that reference.
--
-- Preserve legacy values so historical frame versions remain valid; permit the
-- two current values for all new f.8 frame versions. No data is rewritten.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'clean.adb_sampling_frame'::regclass
       AND conname = 'adb_sampling_frame_tier_source_check'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      DROP CONSTRAINT adb_sampling_frame_tier_source_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'clean.adb_sampling_frame'::regclass
       AND conname = 'adb_sampling_frame_tier_source_check_v2'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_tier_source_check_v2
      CHECK (tier_source IN ('curated','unclassified','traffic_reference','missing_reference'));
  END IF;
END $$;

COMMIT;
