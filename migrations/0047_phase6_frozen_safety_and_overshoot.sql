-- 0047_phase6_frozen_safety_and_overshoot.sql
-- V3.9-f.8 §§3.2-3.4, 8.7, 11.1-11.3, 15/R2.
--
-- Phase-6 paid safety values are persistent FREEZE values, not live env
-- defaults. The daily soft-stop margin and unsettled-burst reserve are distinct.
-- The per-budget-day hard authorization is <=1900 Alert credits and the run
-- total is <=57,900. A frozen settlement evidence row is required before a
-- Phase-6 segment may claim reconciliation PASS/MISMATCH, preventing legacy
-- caller-specific settlement parameters from silently certifying production.
-- Settled overshoot is always MISMATCH; >100 also requires operator intervention.
BEGIN;

ALTER TABLE clean.adb_phase6_authorization
  ADD COLUMN IF NOT EXISTS phase6_alert_spend_ceiling INTEGER,
  ADD COLUMN IF NOT EXISTS daily_soft_stop_margin_credits INTEGER,
  ADD COLUMN IF NOT EXISTS production_reconcile_tolerance_credits INTEGER,
  ADD COLUMN IF NOT EXISTS safety_watchdog_poll_ms INTEGER,
  ADD COLUMN IF NOT EXISTS settlement_initial_wait_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS settlement_poll_interval_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS settlement_stable_read_count INTEGER,
  ADD COLUMN IF NOT EXISTS settlement_timeout_seconds INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_phase6_authorization_safety_values'
       AND conrelid='clean.adb_phase6_authorization'::regclass
  ) THEN
    ALTER TABLE clean.adb_phase6_authorization
      ADD CONSTRAINT adb_phase6_authorization_safety_values CHECK (
        (phase6_alert_spend_ceiling IS NULL OR phase6_alert_spend_ceiling BETWEEN 1 AND 57900) AND
        (daily_soft_stop_margin_credits IS NULL OR daily_soft_stop_margin_credits BETWEEN 0 AND 1899) AND
        (production_reconcile_tolerance_credits IS NULL OR production_reconcile_tolerance_credits >= 0) AND
        (safety_watchdog_poll_ms IS NULL OR safety_watchdog_poll_ms BETWEEN 250 AND 60000) AND
        (settlement_initial_wait_seconds IS NULL OR settlement_initial_wait_seconds >= 0) AND
        (settlement_poll_interval_seconds IS NULL OR settlement_poll_interval_seconds > 0) AND
        (settlement_stable_read_count IS NULL OR settlement_stable_read_count >= 3) AND
        (settlement_timeout_seconds IS NULL OR settlement_timeout_seconds > 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_phase6_authorization_base_cap_1900'
       AND conrelid='clean.adb_phase6_authorization'::regclass
  ) THEN
    ALTER TABLE clean.adb_phase6_authorization
      ADD CONSTRAINT adb_phase6_authorization_base_cap_1900
      CHECK (alert_cap_per_parent_day = 1900) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_phase6_soft_margin_covers_unsettled'
       AND conrelid='clean.adb_phase6_authorization'::regclass
  ) THEN
    ALTER TABLE clean.adb_phase6_authorization
      ADD CONSTRAINT adb_phase6_soft_margin_covers_unsettled CHECK (
        daily_soft_stop_margin_credits IS NULL OR
        daily_soft_stop_margin_credits >= unsettled_burst_margin_credits
      );
  END IF;
END $$;

-- The controller already emits this operational incident class when a later
-- frozen child segment cannot be activated. Keep it explicit instead of letting
-- a CHECK failure suppress the global incident stop exactly when it is needed.
ALTER TABLE clean.adb_incident_stop
  DROP CONSTRAINT IF EXISTS adb_incident_stop_cause_check_v2;
ALTER TABLE clean.adb_incident_stop
  DROP CONSTRAINT IF EXISTS adb_incident_stop_cause_check_v3;
ALTER TABLE clean.adb_incident_stop
  ADD CONSTRAINT adb_incident_stop_cause_check_v3
  CHECK (cause IN (
    'authentication','raw-persistence','persistence','reconciliation','deletion','segment_activation'
  ));

CREATE TABLE IF NOT EXISTS clean.adb_phase6_safety_heartbeat (
  singleton_key BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton_key),
  authorization_id TEXT NOT NULL,
  code_sha TEXT NOT NULL CHECK (code_sha ~ '^[0-9a-f]{40}$'),
  config_hash TEXT NOT NULL CHECK (config_hash ~ '^[0-9a-f]{64}$'),
  watchdog_poll_ms INTEGER NOT NULL CHECK (watchdog_poll_ms BETWEEN 250 AND 60000),
  process_id INTEGER NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clean.adb_phase6_settlement_evidence (
  segment_id TEXT PRIMARY KEY REFERENCES clean.adb_collection_segments(segment_id),
  batch_id TEXT NOT NULL REFERENCES clean.adb_collection_batches(batch_id),
  authorization_id TEXT NOT NULL,
  config_hash TEXT NOT NULL CHECK (config_hash ~ '^[0-9a-f]{64}$'),
  evidence_status TEXT NOT NULL CHECK (evidence_status IN ('SETTLED_PASS','SETTLED_MISMATCH','UNRESOLVED')),
  balance_before BIGINT,
  balance_stable_after BIGINT,
  external_spend BIGINT,
  internal_spend BIGINT NOT NULL CHECK (internal_spend >= 0),
  discrepancy BIGINT,
  reconcile_tolerance INTEGER NOT NULL CHECK (reconcile_tolerance >= 0),
  settlement_reads INTEGER NOT NULL CHECK (settlement_reads >= 0),
  settlement_initial_wait_seconds INTEGER NOT NULL CHECK (settlement_initial_wait_seconds >= 0),
  settlement_poll_interval_seconds INTEGER NOT NULL CHECK (settlement_poll_interval_seconds > 0),
  settlement_stable_read_count INTEGER NOT NULL CHECK (settlement_stable_read_count >= 3),
  settlement_timeout_seconds INTEGER NOT NULL CHECK (settlement_timeout_seconds > 0),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (evidence_status='UNRESOLVED' AND balance_stable_after IS NULL AND external_spend IS NULL)
    OR
    (evidence_status IN ('SETTLED_PASS','SETTLED_MISMATCH') AND
      balance_before IS NOT NULL AND balance_stable_after IS NOT NULL AND
      external_spend IS NOT NULL AND discrepancy IS NOT NULL)
  )
);

CREATE OR REPLACE FUNCTION clean.reject_phase6_settlement_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Phase-6 settlement evidence is append-only';
END $$;
DROP TRIGGER IF EXISTS trg_phase6_settlement_evidence_immutable ON clean.adb_phase6_settlement_evidence;
CREATE TRIGGER trg_phase6_settlement_evidence_immutable
  BEFORE UPDATE OR DELETE ON clean.adb_phase6_settlement_evidence
  FOR EACH ROW EXECUTE FUNCTION clean.reject_phase6_settlement_evidence_mutation();

CREATE OR REPLACE FUNCTION clean.require_phase6_settlement_evidence()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ev clean.adb_phase6_settlement_evidence%ROWTYPE;
BEGIN
  IF NEW.reconciliation_status IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.reconciliation_status IS NOT DISTINCT FROM OLD.reconciliation_status
     AND NEW.settled_alert_spend IS NOT DISTINCT FROM OLD.settled_alert_spend
     AND NEW.balance_stable_after IS NOT DISTINCT FROM OLD.balance_stable_after THEN
    RETURN NEW;
  END IF;

  SELECT * INTO ev FROM clean.adb_phase6_settlement_evidence WHERE segment_id=NEW.segment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUSED_UNEVIDENCED_SETTLEMENT: segment % has no frozen settlement evidence', NEW.segment_id;
  END IF;
  IF ev.batch_id IS DISTINCT FROM NEW.batch_id THEN
    RAISE EXCEPTION 'REFUSED_SETTLEMENT_BATCH_MISMATCH: segment %', NEW.segment_id;
  END IF;

  IF NEW.reconciliation_status='PASS' THEN
    IF ev.evidence_status <> 'SETTLED_PASS'
       OR NEW.balance_stable_after IS DISTINCT FROM ev.balance_stable_after
       OR NEW.settled_alert_spend IS DISTINCT FROM ev.external_spend
       OR NEW.notification_items_internal IS DISTINCT FROM ev.internal_spend THEN
      RAISE EXCEPTION 'REFUSED_SETTLEMENT_EVIDENCE_MISMATCH: PASS segment %', NEW.segment_id;
    END IF;
  ELSIF NEW.reconciliation_status='MISMATCH' THEN
    IF ev.evidence_status NOT IN ('SETTLED_MISMATCH','UNRESOLVED') THEN
      RAISE EXCEPTION 'REFUSED_SETTLEMENT_EVIDENCE_MISMATCH: MISMATCH segment %', NEW.segment_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'REFUSED_PHASE6_RECONCILIATION_STATUS: %', NEW.reconciliation_status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_require_phase6_settlement_evidence ON clean.adb_collection_segments;
CREATE TRIGGER trg_require_phase6_settlement_evidence
  BEFORE UPDATE OF reconciliation_status,settled_alert_spend,balance_stable_after
  ON clean.adb_collection_segments
  FOR EACH ROW EXECUTE FUNCTION clean.require_phase6_settlement_evidence();

CREATE TABLE IF NOT EXISTS clean.adb_budget_day_adjustment (
  source_run_day_index INTEGER PRIMARY KEY CHECK (source_run_day_index BETWEEN 1 AND 31),
  target_run_day_index INTEGER CHECK (target_run_day_index BETWEEN 1 AND 31),
  overshoot_credits INTEGER NOT NULL CHECK (overshoot_credits > 0),
  operator_required BOOLEAN NOT NULL,
  source_credit_budget INTEGER NOT NULL CHECK (source_credit_budget > 0),
  source_settled_spend INTEGER NOT NULL CHECK (source_settled_spend > source_credit_budget),
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at_utc TIMESTAMPTZ,
  CHECK (
    (source_run_day_index = 31 AND target_run_day_index IS NULL) OR
    (source_run_day_index < 31 AND target_run_day_index = source_run_day_index + 1)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_adjustment_target
  ON clean.adb_budget_day_adjustment(target_run_day_index)
  WHERE target_run_day_index IS NOT NULL;

-- Apply a prior-day compensating reduction and the remaining run-total ceiling
-- before the Phase-6 parent exists. This trigger is additional protection;
-- runtime safety still stops based on live SEND-aware exposure.
CREATE OR REPLACE FUNCTION clean.apply_phase6_budget_limits_before_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  adj RECORD;
  auth_row clean.adb_phase6_authorization%ROWTYPE;
  prior_settled BIGINT;
  run_remaining BIGINT;
  effective_cap INTEGER;
BEGIN
  IF NEW.run_day_index IS NULL OR NEW.phase6_authorization_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO auth_row
    FROM clean.adb_phase6_authorization
   WHERE singleton_key=true
     AND enabled=true
     AND revoked_at_utc IS NULL
     AND authorization_id=NEW.phase6_authorization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUSED_PHASE6_AUTH: budget limits have no matching enabled authorization';
  END IF;
  IF auth_row.phase6_alert_spend_ceiling IS NULL
     OR auth_row.daily_soft_stop_margin_credits IS NULL
     OR auth_row.production_reconcile_tolerance_credits IS NULL
     OR auth_row.safety_watchdog_poll_ms IS NULL
     OR auth_row.settlement_initial_wait_seconds IS NULL
     OR auth_row.settlement_poll_interval_seconds IS NULL
     OR auth_row.settlement_stable_read_count IS NULL
     OR auth_row.settlement_timeout_seconds IS NULL THEN
    RAISE EXCEPTION 'REFUSED_PHASE6_SAFETY_UNFROZEN';
  END IF;

  IF EXISTS (
    SELECT 1 FROM clean.adb_collection_batches b
     WHERE b.run_day_index IS NOT NULL
       AND b.run_day_index < NEW.run_day_index
       AND (b.status <> 'CLOSED' OR b.reconciliation_status <> 'PASS' OR b.credits_consumed_actual IS NULL)
  ) THEN
    RAISE EXCEPTION 'REFUSED_PRIOR_PHASE6_UNSETTLED_OR_MISMATCH';
  END IF;

  SELECT COALESCE(sum(credits_consumed_actual),0)::BIGINT INTO prior_settled
    FROM clean.adb_collection_batches
   WHERE run_day_index IS NOT NULL
     AND run_day_index < NEW.run_day_index
     AND status='CLOSED'
     AND reconciliation_status='PASS';
  run_remaining := auth_row.phase6_alert_spend_ceiling - prior_settled;
  IF run_remaining <= 0 THEN
    RAISE EXCEPTION 'REFUSED_PHASE6_RUN_CAP_EXHAUSTED';
  END IF;

  effective_cap := LEAST(NEW.credit_budget::INTEGER, 1900, run_remaining::INTEGER);
  SELECT * INTO adj
    FROM clean.adb_budget_day_adjustment
   WHERE target_run_day_index=NEW.run_day_index
     AND applied_at_utc IS NULL;
  IF FOUND THEN
    effective_cap := LEAST(effective_cap, GREATEST(0, 1900 - adj.overshoot_credits));
  END IF;
  IF effective_cap <= auth_row.daily_soft_stop_margin_credits THEN
    RAISE EXCEPTION 'REFUSED_PHASE6_EFFECTIVE_CAP_TOO_SMALL: cap %, soft margin %',
      effective_cap, auth_row.daily_soft_stop_margin_credits;
  END IF;

  NEW.credit_budget := effective_cap;
  IF FOUND THEN
    UPDATE clean.adb_budget_day_adjustment
       SET applied_at_utc=now()
     WHERE source_run_day_index=adj.source_run_day_index;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_phase6_budget_adjustment ON clean.adb_collection_batches;
DROP TRIGGER IF EXISTS trg_apply_phase6_budget_limits ON clean.adb_collection_batches;
CREATE TRIGGER trg_apply_phase6_budget_limits
  BEFORE INSERT ON clean.adb_collection_batches
  FOR EACH ROW EXECUTE FUNCTION clean.apply_phase6_budget_limits_before_insert();

-- Any settled/progress value over the effective budget-day authorization is a
-- protocol mismatch immediately; it is not hidden until normal parent close.
CREATE OR REPLACE FUNCTION clean.mark_phase6_hard_cap_mismatch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.run_day_index IS NOT NULL
     AND NEW.credits_consumed_actual IS NOT NULL
     AND NEW.credits_consumed_actual > NEW.credit_budget THEN
    NEW.reconciliation_status := 'MISMATCH';
    NEW.stop_reason := CASE
      WHEN NEW.stop_reason IS NULL OR NEW.stop_reason='' THEN 'hard_cap_overshoot'
      WHEN NEW.stop_reason LIKE '%hard_cap_overshoot%' THEN NEW.stop_reason
      ELSE NEW.stop_reason || ';hard_cap_overshoot'
    END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mark_phase6_hard_cap_mismatch ON clean.adb_collection_batches;
CREATE TRIGGER trg_mark_phase6_hard_cap_mismatch
  BEFORE UPDATE OF status,credits_consumed_actual,reconciliation_status
  ON clean.adb_collection_batches
  FOR EACH ROW EXECUTE FUNCTION clean.mark_phase6_hard_cap_mismatch();

CREATE OR REPLACE FUNCTION clean.record_phase6_hard_cap_overshoot()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  overshoot INTEGER;
BEGIN
  IF NEW.run_day_index IS NULL
     OR NEW.credits_consumed_actual IS NULL
     OR NEW.credits_consumed_actual <= NEW.credit_budget
     OR (OLD.credits_consumed_actual IS NOT DISTINCT FROM NEW.credits_consumed_actual) THEN
    RETURN NEW;
  END IF;

  overshoot := (NEW.credits_consumed_actual - NEW.credit_budget)::INTEGER;
  INSERT INTO clean.adb_budget_day_adjustment(
    source_run_day_index,target_run_day_index,overshoot_credits,operator_required,
    source_credit_budget,source_settled_spend
  ) VALUES(
    NEW.run_day_index,
    CASE WHEN NEW.run_day_index < 31 THEN NEW.run_day_index + 1 ELSE NULL END,
    overshoot,
    overshoot > 100,
    NEW.credit_budget::INTEGER,
    NEW.credits_consumed_actual::INTEGER
  )
  ON CONFLICT(source_run_day_index) DO UPDATE SET
    overshoot_credits=EXCLUDED.overshoot_credits,
    operator_required=EXCLUDED.operator_required,
    source_credit_budget=EXCLUDED.source_credit_budget,
    source_settled_spend=EXCLUDED.source_settled_spend;

  INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
  VALUES(
    'reconciliation',now(),
    jsonb_build_object(
      'kind','hard_cap_overshoot',
      'run_day_index',NEW.run_day_index,
      'credit_budget',NEW.credit_budget,
      'settled_spend',NEW.credits_consumed_actual,
      'overshoot_credits',overshoot,
      'operator_required',(overshoot > 100)
    ),
    false
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_record_phase6_hard_cap_overshoot ON clean.adb_collection_batches;
CREATE TRIGGER trg_record_phase6_hard_cap_overshoot
  AFTER UPDATE OF credits_consumed_actual
  ON clean.adb_collection_batches
  FOR EACH ROW EXECUTE FUNCTION clean.record_phase6_hard_cap_overshoot();

COMMIT;
