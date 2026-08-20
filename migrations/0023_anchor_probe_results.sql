-- ============================================================
-- MIGRATION 0023: Two-stage anchor probe results (V3.9 §9, §17 step 12)
-- Schema: clean
-- Table: adb_anchor_probe
--
-- The anchor pool (KLAX·EGLL·WSSS·SBGR·OMDB) is PROVISIONAL until the
-- standardized two-stage probe proves it (§8, §9). This table records every
-- probe observation so the frozen score formula can be filled in with real
-- measured numbers and so re-probing (quarterly, §9 step 6) has an audit
-- trail. Written ONLY by scripts/anchor_probe.ts.
--
-- Columns:
--   probe_id              PK
--   stage                 1 (shortlist, 2h) | 2 (finalist confirmation)
--   icao                  airport probed
--   region                macro-region (for the cross-region shortlist)
--   window_start/_end     the live probe window (UTC)
--   window_hours          actual measured window length (hours)
--   subscription_id       AeroDataBox subscription used for the probe
--   balance_before/_after credit balance at window edges
--   credits_spent         = balance_before - balance_after (C_external, authoritative)
--   rows_delivered        flight_data_pre_post rows attributed to this subscription
--   unique_flights        distinct flight_number within the window
--   tail_chain_links      aircraft-rotation chain links observed in the window
--   rows_per_hour         station capacity (feasibility GATE, NOT a yield component)
--   unique_flights_per_credit    yield component 1 (standardized later vs WSSS)
--   tail_chain_links_per_credit  yield component 2
--   stability             probe consistency within the window (1/(1+CV) of
--                         15-min bucket counts; probe-to-probe SE added once
--                         2+ probes exist, per §9 yield definition)
--   status                'probing' (window live, sub active) |
--                         'completed' | 'failed' | 'abandoned' (interrupted,
--                         subscription deleted by --cleanup)
--   UNIQUE(icao, stage, window_start)  idempotent re-runs
--
-- Idempotent, additive — safe to re-run every boot.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS clean.adb_anchor_probe (
  probe_id                SERIAL PRIMARY KEY,
  stage                   SMALLINT NOT NULL CHECK (stage IN (1, 2)),
  icao                    TEXT NOT NULL,
  region                  TEXT NOT NULL,
  window_start            TIMESTAMPTZ NOT NULL,
  window_end              TIMESTAMPTZ NOT NULL,
  window_hours            DOUBLE PRECISION NOT NULL,
  subscription_id         TEXT,
  balance_before          BIGINT,
  balance_after           BIGINT,
  credits_spent           BIGINT,
  rows_delivered          INTEGER,
  unique_flights          INTEGER,
  tail_chain_links        INTEGER,
  rows_per_hour           DOUBLE PRECISION,
  unique_flights_per_credit DOUBLE PRECISION,
  tail_chain_links_per_credit DOUBLE PRECISION,
  stability               DOUBLE PRECISION,
  status                  TEXT NOT NULL DEFAULT 'completed'
    CONSTRAINT adb_anchor_probe_status_check
    CHECK (status IN ('completed', 'failed', 'probing', 'abandoned')),
  recorded_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT adb_anchor_probe_unique_run UNIQUE (icao, stage, window_start)
);

-- Re-runs against an existing (older) table keep the OLD inline check that only
-- allowed 'completed' | 'failed' — widen it so 'probing'/'abandoned' are legal.
ALTER TABLE clean.adb_anchor_probe
  DROP CONSTRAINT IF EXISTS adb_anchor_probe_status_check;
ALTER TABLE clean.adb_anchor_probe
  ADD CONSTRAINT adb_anchor_probe_status_check
  CHECK (status IN ('completed', 'failed', 'probing', 'abandoned'));

CREATE INDEX IF NOT EXISTS idx_adb_anchor_probe_icao
  ON clean.adb_anchor_probe (icao, stage);

COMMIT;