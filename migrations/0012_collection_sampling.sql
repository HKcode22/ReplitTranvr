-- ============================================================
-- MIGRATION 0012: tier-rotating collection — sampling metadata
-- Schema: clean
--
-- Problem solved (see MDplan/V3_CollectionStrategy.md):
--   Airport subscriptions capture the WHOLE airport (they cannot
--   filter to "10 flights"), so the only sampling controls we have
--   are WHICH airports, in which tier mix, for HOW LONG, and under
--   what budget cap. To keep the dataset defensible we must record
--   WHY every flight entered it (batch, tier, selection prob.).
--
-- Adds to every captured row:
--   sampling_batch_id, airport_tier, sampling_probability,
--   sampling_weight, random_seed, collection_window_start/end.
--
-- New bookkeeping tables:
--   adb_collection_batches  — one row per rotation window
--   adb_collection_subs     — subscription_id -> batch/tier map
--                             (the webhook ingress looks this up to
--                              stamp rows; the controller maintains it)
--   adb_collection_meta     — tiny key/value rotation state
--                             (batch_seq, recent batches for rotation)
-- All idempotent (safe to re-run every boot).
-- ============================================================

BEGIN;

ALTER TABLE clean.flight_data_pre_post
  ADD COLUMN IF NOT EXISTS sampling_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS airport_tier TEXT,
  ADD COLUMN IF NOT EXISTS sampling_probability DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS sampling_weight DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS random_seed TEXT,
  ADD COLUMN IF NOT EXISTS collection_window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collection_window_end TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS clean.adb_collection_batches (
  batch_id TEXT PRIMARY KEY,
  batch_seq INTEGER NOT NULL,
  random_seed INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  credit_budget BIGINT NOT NULL,
  tier_mix JSONB NOT NULL,
  airports TEXT[] NOT NULL,
  stop_reason TEXT
);

CREATE TABLE IF NOT EXISTS clean.adb_collection_subs (
  subscription_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  icao TEXT NOT NULL,
  tier TEXT NOT NULL,
  sampling_probability DOUBLE PRECISION,
  sampling_weight DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_adb_collection_subs_batch
  ON clean.adb_collection_subs (batch_id);

CREATE TABLE IF NOT EXISTS clean.adb_collection_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fdp_batch
  ON clean.flight_data_pre_post (sampling_batch_id);

COMMIT;
