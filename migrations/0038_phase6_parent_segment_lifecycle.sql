-- 0038_phase6_parent_segment_lifecycle.sql
-- V3.9-f.8 §8.7: parent batch-day + child segment lifecycle. A 2x2h
-- treatment is two active 2h segments with an explicit 1h no-subscription gap.
BEGIN;

ALTER TABLE clean.adb_collection_batches
  ADD COLUMN IF NOT EXISTS run_day_index INTEGER,
  ADD COLUMN IF NOT EXISTS budget_day_id TEXT,
  ADD COLUMN IF NOT EXISTS calendar_hash TEXT,
  ADD COLUMN IF NOT EXISTS config_hash TEXT,
  ADD COLUMN IF NOT EXISTS experiment_day_id TEXT,
  ADD COLUMN IF NOT EXISTS crossover_group_id TEXT,
  ADD COLUMN IF NOT EXISTS crossover_period INTEGER,
  ADD COLUMN IF NOT EXISTS pair_role TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_partition TEXT;

ALTER TABLE clean.adb_collection_subs
  ADD COLUMN IF NOT EXISTS segment_id TEXT;

CREATE TABLE IF NOT EXISTS clean.adb_collection_segments (
  segment_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES clean.adb_collection_batches(batch_id),
  run_day_index INTEGER NOT NULL,
  segment_index INTEGER NOT NULL CHECK (segment_index >= 1),
  segment_kind TEXT NOT NULL CHECK (segment_kind IN ('ACTIVE','GAP')),
  status TEXT NOT NULL CHECK (status IN ('PLANNED','ACTIVE','CLOSED','FAILED')),
  segment_start_utc TIMESTAMPTZ NOT NULL,
  segment_end_utc TIMESTAMPTZ NOT NULL,
  balance_before BIGINT,
  balance_stable_after BIGINT,
  settled_alert_spend BIGINT,
  notification_items_internal BIGINT,
  reconciliation_status TEXT,
  stop_reason TEXT,
  started_at_utc TIMESTAMPTZ,
  ended_at_utc TIMESTAMPTZ,
  CHECK (segment_end_utc > segment_start_utc),
  UNIQUE (batch_id, segment_index)
);

CREATE INDEX IF NOT EXISTS idx_collection_segments_batch_status
  ON clean.adb_collection_segments(batch_id, status, segment_index);
CREATE INDEX IF NOT EXISTS idx_collection_subs_segment_open
  ON clean.adb_collection_subs(segment_id, ended_at)
  WHERE ended_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_collection_batches_run_day_unique'
       AND conrelid='clean.adb_collection_batches'::regclass
  ) THEN
    ALTER TABLE clean.adb_collection_batches
      ADD CONSTRAINT adb_collection_batches_run_day_unique UNIQUE (run_day_index);
  END IF;
END $$;

COMMIT;
