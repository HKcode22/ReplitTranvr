-- 0043_phase6_start_time_guard.sql
-- V3.9-f.8 Phase 0O/Phase 6 admission: a parent batch may not be inserted
-- before its frozen scheduled start or after the frozen start-admission
-- tolerance. This database boundary is reached before subscription creation,
-- so even a buggy/manual controller call cannot silently shift the experiment.
BEGIN;

CREATE OR REPLACE FUNCTION clean.guard_phase6_parent_start_time()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  auth_row clean.adb_phase6_authorization%ROWTYPE;
  cal_start TIMESTAMPTZ;
  cal_hash TEXT;
  cfg_hash TEXT;
BEGIN
  -- Non-Phase6/legacy rows are outside this guard. Current V3.9 Phase6 parents
  -- always carry both run_day_index and phase6_authorization_id.
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
    RAISE EXCEPTION 'REFUSED_PHASE6_AUTH: no matching enabled persistent authorization';
  END IF;
  IF auth_row.start_admission_tolerance_seconds IS NULL THEN
    RAISE EXCEPTION 'REFUSED_START_TOLERANCE_UNFROZEN';
  END IF;

  SELECT scheduled_start_utc, calendar_hash, config_hash
    INTO cal_start, cal_hash, cfg_hash
    FROM clean.adb_phase6_calendar_day
   WHERE run_day_index=NEW.run_day_index;
  IF cal_start IS NULL THEN
    RAISE EXCEPTION 'REFUSED_CALENDAR_START_UNFROZEN: run_day %', NEW.run_day_index;
  END IF;
  IF cal_hash IS DISTINCT FROM auth_row.calendar_hash
     OR cfg_hash IS DISTINCT FROM auth_row.config_hash
     OR NEW.calendar_hash IS DISTINCT FROM auth_row.calendar_hash
     OR NEW.config_hash IS DISTINCT FROM auth_row.config_hash THEN
    RAISE EXCEPTION 'REFUSED_PHASE6_HASH_MISMATCH: run_day %', NEW.run_day_index;
  END IF;
  IF NEW.window_start IS DISTINCT FROM cal_start THEN
    RAISE EXCEPTION 'REFUSED_WINDOW_START_MISMATCH: parent window_start must equal frozen scheduled_start_utc';
  END IF;

  -- Never start early. A late start is allowed only inside the explicitly
  -- frozen execution tolerance; outside it the day is a refusal, not a shifted
  -- or shortened experiment.
  IF clock_timestamp() < cal_start THEN
    RAISE EXCEPTION 'REFUSED_START_EARLY: frozen start is %', cal_start;
  END IF;
  IF clock_timestamp() > cal_start + make_interval(secs => auth_row.start_admission_tolerance_seconds) THEN
    RAISE EXCEPTION 'REFUSED_START_LATE: outside frozen tolerance for start %', cal_start;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_phase6_parent_start_time ON clean.adb_collection_batches;
CREATE TRIGGER trg_guard_phase6_parent_start_time
  BEFORE INSERT ON clean.adb_collection_batches
  FOR EACH ROW EXECUTE FUNCTION clean.guard_phase6_parent_start_time();

COMMIT;
