-- 0040_phase6_calendar_execution_fields.sql
-- V3.9-f.8 Phase 0L/0O: execution cannot infer MEASURE→FREEZE duration for
-- an 'up-to-6h' treatment. The final frozen calendar must carry the actual
-- active duration and exact scheduled start used by the controller.
BEGIN;

ALTER TABLE clean.adb_phase6_calendar_day
  ADD COLUMN IF NOT EXISTS scheduled_start_utc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS frame_hash TEXT;

-- Existing pre-freeze rows may remain NULL. The Phase-6 controller refuses
-- them until the final FREEZE populates these fields.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_phase6_calendar_duration_positive'
       AND conrelid='clean.adb_phase6_calendar_day'::regclass
  ) THEN
    ALTER TABLE clean.adb_phase6_calendar_day
      ADD CONSTRAINT adb_phase6_calendar_duration_positive
      CHECK (active_duration_minutes IS NULL OR active_duration_minutes > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_phase6_calendar_start
  ON clean.adb_phase6_calendar_day(scheduled_start_utc, run_day_index);

COMMIT;
