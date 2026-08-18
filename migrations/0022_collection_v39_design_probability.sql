-- ============================================================
-- MIGRATION 0022: plan §30 V3.6/V3.8 — design-probability naming + DB rule
-- Schema: clean
--
-- The binding plan (V3.9 §30, "the most important correction of the third
-- review") requires:
--   1. The per-row stamp is named `airport_layer_design_probability`
--      EVERYWHERE — the `_layer_` makes it impossible to misread as a
--      flight-level probability months from now (V3.6).
--   2. Developers must NOT be able to populate it for HUB/MID (V3.8):
--        is_randomized = true  → airport_layer_design_probability NOT NULL
--        is_randomized = false → airport_layer_design_probability NULL
--                               (planned_share may be populated)
--   3. HUB/MID slot-fill records `planned_share` (an allocation share,
--      labeled planned, never a realized inclusion probability);
--      REGIONAL records the realized conditional design probability p_i.
--
-- Also adds frame-table invariants (auditability):
--   - unclassified airports are always REGIONAL (tier_source/tier rule)
--   - pre_eligible == feed_schedule (PRE layer = FlightSchedules)
--   - post_eligible == (feed_live OR feed_adsb) (POST layer = live/ADS-B)
--
-- Idempotent, additive, safe to re-run every boot.
-- ============================================================

BEGIN;

-- --- 1. rename sampling_probability → airport_layer_design_probability ---
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clean' AND table_name = 'adb_collection_subs'
      AND column_name = 'sampling_probability'
  ) THEN
    ALTER TABLE clean.adb_collection_subs
      RENAME COLUMN sampling_probability TO airport_layer_design_probability;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clean' AND table_name = 'flight_data_pre_post'
      AND column_name = 'sampling_probability'
  ) THEN
    ALTER TABLE clean.flight_data_pre_post
      RENAME COLUMN sampling_probability TO airport_layer_design_probability;
  END IF;
END $$;

-- --- 2. is_randomized + planned_share on both tables ---
ALTER TABLE clean.adb_collection_subs
  ADD COLUMN IF NOT EXISTS is_randomized BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS planned_share DOUBLE PRECISION;

ALTER TABLE clean.flight_data_pre_post
  ADD COLUMN IF NOT EXISTS is_randomized BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS planned_share DOUBLE PRECISION;

-- --- 3. purge legacy values: pre-0022 rows stored planned shares under the
-- old `sampling_probability` name — those are NOT genuine randomized draws, so
-- they must NOT survive in airport_layer_design_probability (is_randomized
-- stays false ⇒ design probability must be NULL per the V3.8 rule below).
UPDATE clean.adb_collection_subs
  SET airport_layer_design_probability = NULL
  WHERE airport_layer_design_probability IS NOT NULL AND is_randomized = false;
UPDATE clean.flight_data_pre_post
  SET airport_layer_design_probability = NULL
  WHERE airport_layer_design_probability IS NOT NULL AND is_randomized = false;

-- --- 4. the V3.8 rule, enforced in the database (not just the docs) ---
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'adb_collection_subs_design_probability_rule'
  ) THEN
    ALTER TABLE clean.adb_collection_subs
      ADD CONSTRAINT adb_collection_subs_design_probability_rule
      CHECK (
        (is_randomized = true  AND airport_layer_design_probability IS NOT NULL) OR
        (is_randomized = false AND airport_layer_design_probability IS NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flight_data_pre_post_design_probability_rule'
  ) THEN
    ALTER TABLE clean.flight_data_pre_post
      ADD CONSTRAINT flight_data_pre_post_design_probability_rule
      CHECK (
        (is_randomized = true  AND airport_layer_design_probability IS NOT NULL) OR
        (is_randomized = false AND airport_layer_design_probability IS NULL)
      );
  END IF;
END $$;

-- --- 4. frame-table invariants (sampling frame, migration 0021) ---
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'adb_sampling_frame_tier_source_rule'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_tier_source_rule
      CHECK (
        (tier_source = 'curated'     AND tier IN ('HUB', 'MID', 'REGIONAL')) OR
        (tier_source = 'unclassified' AND tier = 'REGIONAL')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'adb_sampling_frame_pre_eligible_rule'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_pre_eligible_rule
      CHECK (pre_eligible = feed_schedule);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'adb_sampling_frame_post_eligible_rule'
  ) THEN
    ALTER TABLE clean.adb_sampling_frame
      ADD CONSTRAINT adb_sampling_frame_post_eligible_rule
      CHECK (post_eligible = (feed_live OR feed_adsb));
  END IF;
END $$;

COMMIT;