-- Review-only candidate; NOT an installed production migration.
-- Additive guard, preserving the exact V0104 function and its existing triggers.
-- No DELETE, UPDATE, provider calls, role grants, new data retention or extra
-- source authority. Stop admissions when signed private custody is already due.
-- This is defence-in-depth, NOT proof of deletion before a hard deadline.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
LOCK TABLE clean.adb_phase6_authorization IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner'
  OR pg_is_in_recovery()
  OR current_setting('server_version_num')::int NOT BETWEEN 160000 AND 169999
  OR current_setting('session_replication_role')<>'origin'
  OR EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE enabled)
  OR to_regprocedure('clean.phase6_private_epoch_expiry_status_v39(text)') IS NULL
  OR to_regprocedure('clean.phase6_private_epoch_expiry_sweep_v39(text,integer)') IS NULL
  OR to_regclass('phase6_private.frozen_native_packet_v39') IS NULL
  OR to_regclass('phase6_private.signed_run_day_index_revision_v39') IS NULL
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='clean.phase5_fids_physical_attempt_v39'::regclass
    AND tgname='a00_phase5_fids_physical_rest_live_guard_v39' AND tgenabled='O'
    AND tgfoid='clean.phase5_physical_rest_live_guard_v39()'::regprocedure)
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='clean.phase5_other_rest_physical_reservation_v39'::regclass
    AND tgname='a00_phase5_other_physical_rest_live_guard_v39' AND tgenabled='O'
    AND tgfoid='clean.phase5_physical_rest_live_guard_v39()'::regprocedure)
 THEN RAISE EXCEPTION 'P6_PRIVATE_DUE_GUARD_REQUIRES_STOPPED_EXACT_BOUNDARIES'; END IF;
END $preflight$;
CREATE FUNCTION clean.phase6_private_due_physical_rest_guard_v39()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp
AS $guard$
DECLARE v_at timestamptz;
BEGIN
 IF TG_TABLE_SCHEMA<>'clean'
 OR TG_TABLE_NAME NOT IN ('phase5_fids_physical_attempt_v39','phase5_other_rest_physical_reservation_v39')
 OR TG_OP<>'INSERT' OR TG_WHEN<>'BEFORE' OR TG_LEVEL<>'ROW'
 THEN RAISE EXCEPTION 'P6_PRIVATE_DUE_GUARD_WRONG_TRIGGER'; END IF;
 -- Reuse existing deletion STOP serialization; V0104 has also obtained it.
 IF NOT pg_try_advisory_xact_lock_shared(390015,104)
 THEN RAISE EXCEPTION 'P6_PRIVATE_DUE_GUARD_STOP_LOCK_BUSY'; END IF;
 v_at:=clock_timestamp();
 -- Deliberately scan every manifest because foreign due data is also a
 -- retention obligation. Do not read payload_bytes, hashes, or flight IDs.
 IF EXISTS(SELECT 1 FROM phase6_private.frozen_native_packet_v39
   WHERE retention_not_after_utc<=v_at)
 OR EXISTS(SELECT 1 FROM phase6_private.signed_run_day_index_revision_v39
   WHERE retention_not_after_utc<=v_at)
 THEN RAISE EXCEPTION 'P6_PRIVATE_CUSTODY_DUE_PHYSICAL_REST_REFUSED'; END IF;
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION clean.phase6_private_due_physical_rest_guard_v39() FROM PUBLIC;
CREATE TRIGGER a01_phase6_fids_private_due_guard_v39
 BEFORE INSERT ON clean.phase5_fids_physical_attempt_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase6_private_due_physical_rest_guard_v39();
CREATE TRIGGER a01_phase6_other_private_due_guard_v39
 BEFORE INSERT ON clean.phase5_other_rest_physical_reservation_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase6_private_due_physical_rest_guard_v39();
COMMIT;
