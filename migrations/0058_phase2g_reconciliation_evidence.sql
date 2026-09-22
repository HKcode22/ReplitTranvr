-- 0058_phase2g_reconciliation_evidence.sql
-- Phase-2G prospective reconciliation hardening after P2G06.
--
-- Goals:
--   1) preserve provider-content-safe aggregate reconciliation evidence BEFORE
--      transient runtime cleanup;
--   2) preserve aggregate callback request/success/failure counters in the
--      UNLOGGED runtime session so they can be copied into durable evidence;
--   3) keep raw payloads and provider subscription IDs out of the durable
--      reconciliation table.
--
-- This migration is additive and idempotent.

BEGIN;

ALTER TABLE clean.prepaid_probe_session_runtime
  ADD COLUMN IF NOT EXISTS callback_requests_seen INTEGER NOT NULL DEFAULT 0 CHECK (callback_requests_seen >= 0),
  ADD COLUMN IF NOT EXISTS callback_success_2xx INTEGER NOT NULL DEFAULT 0 CHECK (callback_success_2xx >= 0),
  ADD COLUMN IF NOT EXISTS callback_failures INTEGER NOT NULL DEFAULT 0 CHECK (callback_failures >= 0);

CREATE TABLE IF NOT EXISTS clean.adb_probe_reconciliation_evidence (
  probe_id BIGINT PRIMARY KEY REFERENCES clean.adb_anchor_probe(probe_id),
  runtime_session_id UUID NOT NULL,
  stage SMALLINT NOT NULL CHECK (stage IN (1,2)),
  icao TEXT NOT NULL CHECK (icao ~ '^[A-Z0-9]{4}$'),

  evidence_status TEXT NOT NULL
    CHECK (evidence_status IN ('MATCH','DELIVERY_GAP','MISMATCH','UNRESOLVED')),

  -- External provider spend is the authoritative accounting denominator
  -- according to V3.9 §3.2. Internal received credits diagnose delivery gaps.
  external_spend_credits INTEGER,
  internal_received_credits INTEGER NOT NULL CHECK (internal_received_credits >= 0),
  delivery_gap_credits INTEGER,
  delivery_completeness DOUBLE PRECISION,

  delivery_count INTEGER NOT NULL CHECK (delivery_count >= 0),
  notification_items_received INTEGER NOT NULL CHECK (notification_items_received >= 0),
  explicit_cost_delivery_count INTEGER NOT NULL CHECK (explicit_cost_delivery_count >= 0),
  fallback_delivery_count INTEGER NOT NULL CHECK (fallback_delivery_count >= 0),
  cost_item_disagreement_count INTEGER NOT NULL CHECK (cost_item_disagreement_count >= 0),

  callback_requests_seen INTEGER NOT NULL CHECK (callback_requests_seen >= 0),
  callback_success_2xx INTEGER NOT NULL CHECK (callback_success_2xx >= 0),
  callback_failures INTEGER NOT NULL CHECK (callback_failures >= 0),

  settlement_reads INTEGER NOT NULL CHECK (settlement_reads >= 0),
  max_observed_unsettled_credit_gap INTEGER NOT NULL CHECK (max_observed_unsettled_credit_gap >= 0),
  delivery_completeness_floor DOUBLE PRECISION NOT NULL CHECK (delivery_completeness_floor > 0 AND delivery_completeness_floor <= 1),

  window_start_utc TIMESTAMPTZ NOT NULL,
  window_end_utc TIMESTAMPTZ NOT NULL,
  duration_censored BOOLEAN NOT NULL,
  stop_reason TEXT,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (evidence_status='UNRESOLVED'
      AND external_spend_credits IS NULL
      AND delivery_gap_credits IS NULL
      AND delivery_completeness IS NULL)
    OR
    (evidence_status<>'UNRESOLVED'
      AND external_spend_credits IS NOT NULL
      AND external_spend_credits >= 0
      AND delivery_gap_credits = external_spend_credits - internal_received_credits
      AND delivery_completeness IS NOT NULL
      AND delivery_completeness >= 0)
  )
);

ALTER TABLE clean.adb_anchor_probe
  DROP CONSTRAINT IF EXISTS adb_anchor_probe_safe_completed_shape;

ALTER TABLE clean.adb_anchor_probe
  ADD CONSTRAINT adb_anchor_probe_safe_completed_shape
  CHECK (
    NOT provider_content_safe_mode OR status <> 'completed' OR (
      runtime_session_id IS NOT NULL AND
      runtime_cleanup_verified_at_utc IS NOT NULL AND
      reconciliation_status IN ('MATCH','DELIVERY_GAP') AND
      confirmed_unique_lower_per_credit IS NOT NULL AND
      confirmed_plus_ambiguous_upper_per_credit IS NOT NULL
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION clean.reject_phase2g_reconciliation_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Phase-2G reconciliation evidence is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_phase2g_reconciliation_evidence_immutable
  ON clean.adb_probe_reconciliation_evidence;
CREATE TRIGGER trg_phase2g_reconciliation_evidence_immutable
  BEFORE UPDATE OR DELETE ON clean.adb_probe_reconciliation_evidence
  FOR EACH ROW EXECUTE FUNCTION clean.reject_phase2g_reconciliation_evidence_mutation();

COMMIT;
