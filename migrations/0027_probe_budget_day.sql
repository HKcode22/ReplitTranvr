-- MIGRATION 0027 — probe budget-day + censoring/stability columns (Phase 0J / ChatGPT round-3 item 1)
-- Idempotent (IF NOT EXISTS / guarded). Extends clean.adb_anchor_probe with the
-- immutable probe budget-day identity, cap-censoring record, and stability
-- evidence required before any paid Stage-1/2 probe.

ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS probe_budget_day_id TEXT,
  ADD COLUMN IF NOT EXISTS duration_censored BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stop_reason TEXT,
  ADD COLUMN IF NOT EXISTS complete_buckets INTEGER,
  ADD COLUMN IF NOT EXISTS min_stability_buckets INTEGER,
  ADD COLUMN IF NOT EXISTS confirmed_unique_lower INTEGER,
  ADD COLUMN IF NOT EXISTS confirmed_plus_ambiguous_upper INTEGER,
  ADD COLUMN IF NOT EXISTS settlement_reads INTEGER,
  ADD COLUMN IF NOT EXISTS settlement_stable_balance BIGINT,
  ADD COLUMN IF NOT EXISTS reserved_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_send_credits INTEGER,
  ADD COLUMN IF NOT EXISTS stability_status TEXT,
  ADD COLUMN IF NOT EXISTS preprobe_artifact_sha256 TEXT;

CREATE TABLE IF NOT EXISTS clean.adb_probe_budget_day (
  probe_budget_day_id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('OPEN', 'CLOSED', 'MISMATCH')),
  cap_credits INTEGER NOT NULL CHECK (cap_credits = 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  CHECK ((state = 'OPEN' AND closed_at IS NULL) OR state <> 'OPEN')
);

-- A day is an explicit run ledger, not a UTC date. It survives periods with no
-- active subscription and a new one cannot appear until this row is closed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_adb_probe_one_open_day
  ON clean.adb_probe_budget_day ((state)) WHERE state = 'OPEN';

INSERT INTO clean.adb_probe_budget_day (probe_budget_day_id,state,cap_credits,closed_at)
SELECT DISTINCT probe_budget_day_id,'CLOSED',500,now()
  FROM clean.adb_anchor_probe
 WHERE probe_budget_day_id IS NOT NULL
ON CONFLICT (probe_budget_day_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_adb_anchor_probe_budget_day
  ON clean.adb_anchor_probe (probe_budget_day_id);

ALTER TABLE clean.adb_anchor_probe
  DROP CONSTRAINT IF EXISTS adb_anchor_probe_budget_day_fk;
ALTER TABLE clean.adb_anchor_probe
  ADD CONSTRAINT adb_anchor_probe_budget_day_fk
  FOREIGN KEY (probe_budget_day_id)
  REFERENCES clean.adb_probe_budget_day (probe_budget_day_id);
