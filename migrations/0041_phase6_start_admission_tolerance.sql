-- 0041_phase6_start_admission_tolerance.sql
-- Phase-6 must not silently shorten/shift a frozen window because a manual or
-- watchdog start happened hours late. The allowed scheduler/start jitter is an
-- explicit final-FREEZE execution value, not a source-code default.
BEGIN;

ALTER TABLE clean.adb_phase6_authorization
  ADD COLUMN IF NOT EXISTS start_admission_tolerance_seconds INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_phase6_start_tolerance_nonnegative'
       AND conrelid='clean.adb_phase6_authorization'::regclass
  ) THEN
    ALTER TABLE clean.adb_phase6_authorization
      ADD CONSTRAINT adb_phase6_start_tolerance_nonnegative
      CHECK (start_admission_tolerance_seconds IS NULL OR start_admission_tolerance_seconds >= 0);
  END IF;
END $$;

-- NULL is intentionally allowed before final FREEZE. The controller refuses
-- paid admission until the value is frozen.
COMMIT;
