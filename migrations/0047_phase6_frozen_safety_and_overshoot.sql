-- 0047_phase6_frozen_safety_and_overshoot.sql
-- V3.9-f.8 §§8.7,11.1,11.3: Phase-6 safety/settlement values are frozen in
-- persistent authorization, not read from live env defaults. Settled hard-cap
-- overshoot remains a MISMATCH/protocol deviation; the next run-day cap is
-- reduced by the overshoot, and overshoot >100 opens an operator incident.
BEGIN;

ALTER TABLE clean.adb_phase6_authorization
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
END $$;

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

CREATE OR REPLACE FUNCTION clean.apply_phase6_budget_adjustment_before_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  adj RECORD;
  effective_cap INTEGER;
BEGIN
  IF NEW.run_day_index IS NULL OR NEW.phase6_authorization_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO adj
    FROM clean.adb_budget_day_adjustment
   WHERE target_run_day_index=NEW.run_day_index
     AND applied_at_utc IS NULL;
  IF FOUND THEN
    effective_cap := GREATEST(0, NEW.credit_budget::INTEGER - adj.overshoot_credits);
    IF effective_cap <= 0 THEN
      RAISE EXCEPTION 'REFUSED_COMPENSATING_CAP: prior overshoot leaves no Alert-credit authorization for run day %', NEW.run_day_index;
    END IF;
    NEW.credit_budget := effective_cap;
    UPDATE clean.adb_budget_day_adjustment
       SET applied_at_utc=now()
     WHERE source_run_day_index=adj.source_run_day_index;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_phase6_budget_adjustment ON clean.adb_collection_batches;
CREATE TRIGGER trg_apply_phase6_budget_adjustment
  BEFORE INSERT ON clean.adb_collection_batches
  FOR EACH ROW EXECUTE FUNCTION clean.apply_phase6_budget_adjustment_before_insert();

CREATE OR REPLACE FUNCTION clean.mark_phase6_hard_cap_mismatch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.run_day_index IS NOT NULL
     AND NEW.status='CLOSED'
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
     OR NEW.status<>'CLOSED'
     OR NEW.credits_consumed_actual IS NULL
     OR NEW.credits_consumed_actual <= NEW.credit_budget
     OR (OLD.status='CLOSED' AND OLD.credits_consumed_actual IS NOT DISTINCT FROM NEW.credits_consumed_actual) THEN
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

  IF overshoot > 100 THEN
    INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
    VALUES(
      'reconciliation',now(),
      jsonb_build_object(
        'kind','hard_cap_overshoot',
        'run_day_index',NEW.run_day_index,
        'credit_budget',NEW.credit_budget,
        'settled_spend',NEW.credits_consumed_actual,
        'overshoot_credits',overshoot,
        'operator_required',true
      ),
      false
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_record_phase6_hard_cap_overshoot ON clean.adb_collection_batches;
CREATE TRIGGER trg_record_phase6_hard_cap_overshoot
  AFTER UPDATE OF status,credits_consumed_actual
  ON clean.adb_collection_batches
  FOR EACH ROW EXECUTE FUNCTION clean.record_phase6_hard_cap_overshoot();

COMMIT;
