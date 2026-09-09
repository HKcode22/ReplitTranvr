-- 0039_phase6_authorization_and_admission.sql
-- V3.9-f.8 Phase 0A/0O: a manually-set PHASE6_READY environment variable is
-- never sufficient authority for paid collection. The later authorized FREEZE
-- transition must write one exact, hash-bound persistent authorization record.
BEGIN;

CREATE TABLE IF NOT EXISTS clean.adb_phase6_authorization (
  singleton_key BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton_key),
  authorization_id TEXT NOT NULL UNIQUE,
  manifest_sha256 TEXT NOT NULL CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  calendar_hash TEXT NOT NULL CHECK (calendar_hash ~ '^[0-9a-f]{64}$'),
  config_hash TEXT NOT NULL CHECK (config_hash ~ '^[0-9a-f]{64}$'),
  code_sha TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  phase6_start_date DATE NOT NULL,
  alert_cap_per_parent_day INTEGER NOT NULL CHECK (alert_cap_per_parent_day > 0),
  unsettled_burst_margin_credits INTEGER NOT NULL CHECK (unsettled_burst_margin_credits >= 0),
  protected_alert_floor INTEGER NOT NULL CHECK (protected_alert_floor >= 1000),
  enabled BOOLEAN NOT NULL DEFAULT false,
  predecessor_evidence_ids JSONB NOT NULL,
  authorized_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at_utc TIMESTAMPTZ,
  CHECK (jsonb_typeof(predecessor_evidence_ids) = 'array'),
  CHECK (jsonb_array_length(predecessor_evidence_ids) > 0),
  CHECK (NOT enabled OR revoked_at_utc IS NULL)
);

CREATE TABLE IF NOT EXISTS clean.adb_phase6_admission_attempt (
  admission_id BIGSERIAL PRIMARY KEY,
  attempted_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_day_index INTEGER,
  authorization_id TEXT,
  manifest_sha256 TEXT,
  calendar_hash TEXT,
  config_hash TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('ADMITTED','REFUSED')),
  reason TEXT NOT NULL,
  state_hash TEXT,
  provider_mutations_started BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_phase6_admission_time
  ON clean.adb_phase6_admission_attempt(attempted_at_utc DESC);

-- Every collection row for a Phase-6 parent day must be traceable to the exact
-- persistent authorization that admitted it.
ALTER TABLE clean.adb_collection_batches
  ADD COLUMN IF NOT EXISTS phase6_authorization_id TEXT,
  ADD COLUMN IF NOT EXISTS sampling_state_hash TEXT;

COMMIT;
