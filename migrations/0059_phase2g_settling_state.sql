-- 0059_phase2g_settling_state.sql
-- Phase-2G no-redeploy hardening.
--
-- A full-duration exact-MATCH probe may be provider-safe before Replit-local
-- raw-content cleanup is finished. Preserve that state explicitly as
-- status='settling'. No new paid probe may start while any settling row exists.

BEGIN;

ALTER TABLE clean.adb_anchor_probe
  DROP CONSTRAINT IF EXISTS adb_anchor_probe_status_check;

ALTER TABLE clean.adb_anchor_probe
  ADD CONSTRAINT adb_anchor_probe_status_check
  CHECK (status IN ('completed','settling','failed','probing','abandoned'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_anchor_probe_safe_settling_shape'
       AND conrelid='clean.adb_anchor_probe'::regclass
  ) THEN
    ALTER TABLE clean.adb_anchor_probe
      ADD CONSTRAINT adb_anchor_probe_safe_settling_shape
      CHECK (
        NOT provider_content_safe_mode OR status <> 'settling' OR (
          runtime_session_id IS NOT NULL AND
          runtime_cleanup_verified_at_utc IS NULL AND
          reconciliation_status = 'MATCH' AND
          duration_censored = false AND
          stop_reason IS NULL AND
          confirmed_unique_lower_per_credit IS NOT NULL AND
          confirmed_plus_ambiguous_upper_per_credit IS NOT NULL
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_adb_anchor_probe_settling
  ON clean.adb_anchor_probe (status, probe_budget_day_id)
  WHERE status='settling';

COMMIT;
