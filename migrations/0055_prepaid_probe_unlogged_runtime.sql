-- V3.9 prerequisite-P / Phase-2 prepaid smoke+probe runtime surface.
--
-- Provider plaintext needed temporarily for live probe accounting MUST NOT be
-- recoverable through the production PostgreSQL PITR/WAL history. These tables
-- are therefore UNLOGGED: PostgreSQL does not WAL-log their data, does not
-- replicate their contents to standbys, and resets them after crash recovery.
-- Durable raw-before-2xx evidence lives separately in Replit App Storage; the
-- logged clean.provider_content_blob_ref table keeps only opaque refs/hashes.
--
-- These tables are runtime scratch state only. They are not scientific source
-- of truth and must be deleted after the owning smoke/probe is settled/scored.

BEGIN;

CREATE UNLOGGED TABLE IF NOT EXISTS clean.prepaid_probe_session_runtime (
  session_id UUID PRIMARY KEY,
  owner_kind TEXT NOT NULL CHECK (owner_kind IN ('phase2_safety_smoke','anchor_probe')),
  owner_probe_id INTEGER,
  stage SMALLINT CHECK (stage IS NULL OR stage IN (1,2)),
  icao TEXT,
  provider_subscription_id TEXT UNIQUE,
  state TEXT NOT NULL DEFAULT 'armed'
    CHECK (state IN ('armed','active','settling','completed','failed','abandoned')),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at_utc TIMESTAMPTZ NOT NULL,
  last_delivery_at_utc TIMESTAMPTZ,
  CHECK (expires_at_utc > created_at_utc),
  CHECK (expires_at_utc <= created_at_utc + interval '24 hours'),
  CHECK ((owner_kind='anchor_probe' AND owner_probe_id IS NOT NULL AND stage IN (1,2) AND icao IS NOT NULL)
      OR (owner_kind='phase2_safety_smoke' AND stage IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_prepaid_probe_session_subscription
  ON clean.prepaid_probe_session_runtime(provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prepaid_probe_session_expiry
  ON clean.prepaid_probe_session_runtime(expires_at_utc);

CREATE UNLOGGED TABLE IF NOT EXISTS clean.prepaid_probe_delivery_runtime (
  session_id UUID NOT NULL,
  delivery_id TEXT NOT NULL,
  blob_ref_id UUID NOT NULL,
  raw_body_sha256 TEXT NOT NULL CHECK (raw_body_sha256 ~ '^[a-f0-9]{64}$'),
  provider_subscription_id TEXT,
  received_at_utc TIMESTAMPTZ NOT NULL,
  provider_notification_generated_utc TIMESTAMPTZ,
  delivery_attempt_seq_no INTEGER,
  delivery_attempt_utc TIMESTAMPTZ,
  delivery_attempt_cost_credits NUMERIC,
  notification_items INTEGER NOT NULL CHECK (notification_items >= 0),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id,delivery_id)
);
CREATE INDEX IF NOT EXISTS idx_prepaid_probe_delivery_received
  ON clean.prepaid_probe_delivery_runtime(session_id,received_at_utc);

CREATE UNLOGGED TABLE IF NOT EXISTS clean.prepaid_probe_item_runtime (
  session_id UUID NOT NULL,
  delivery_id TEXT NOT NULL,
  item_index INTEGER NOT NULL CHECK (item_index >= 0),
  raw_item_sha256 TEXT NOT NULL CHECK (raw_item_sha256 ~ '^[a-f0-9]{64}$'),
  flight_number TEXT,
  aircraft_reg TEXT,
  codeshare_status TEXT,
  runtime_flight_key TEXT CHECK (runtime_flight_key IS NULL OR runtime_flight_key ~ '^[a-f0-9]{64}$'),
  received_at_utc TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(session_id,delivery_id,item_index)
);
CREATE INDEX IF NOT EXISTS idx_prepaid_probe_item_flight
  ON clean.prepaid_probe_item_runtime(session_id,flight_number,received_at_utc);
CREATE INDEX IF NOT EXISTS idx_prepaid_probe_item_aircraft
  ON clean.prepaid_probe_item_runtime(session_id,aircraft_reg,received_at_utc)
  WHERE aircraft_reg IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prepaid_probe_item_runtime_key
  ON clean.prepaid_probe_item_runtime(session_id,runtime_flight_key,received_at_utc)
  WHERE runtime_flight_key IS NOT NULL;

-- Keep logged probe evidence project-owned. Provider subscription IDs and edge
-- account balances remain NULL in the safe prepaid path; these two columns bind
-- the aggregate result to the transient session without retaining provider IDs.
ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS runtime_session_id UUID,
  ADD COLUMN IF NOT EXISTS runtime_cleanup_verified_at_utc TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_anchor_probe_runtime_session
  ON clean.adb_anchor_probe(runtime_session_id)
  WHERE runtime_session_id IS NOT NULL;

COMMIT;
