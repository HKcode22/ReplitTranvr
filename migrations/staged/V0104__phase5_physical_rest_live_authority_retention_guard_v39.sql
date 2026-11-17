-- Staged ONLY: enforce live AUTH and primary retention at BOTH existing
-- physical REST reservation INSERT boundaries. No new tables, roles,
-- grants, scheduler, provider calls, cleanup policy, or historic replay.
-- The preceding budgets/prearm/immutable query checks remain in place.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE clean.adb_phase6_authorization IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
 IF pg_is_in_recovery() OR
    current_setting('server_version_num')::integer NOT BETWEEN 160000 AND 169999 OR
    current_setting('session_replication_role')<>'origin' OR
    EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE enabled) OR
    to_regprocedure('clean.phase5_primary_fids_expiry_stop_v39(text)') IS NULL OR
    to_regprocedure('clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text)') IS NULL OR
    to_regprocedure('clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)') IS NULL
 THEN RAISE EXCEPTION 'P5_PHYSICAL_REST_GUARD_INSTALL_REQUIRES_STOPPED_PG16_AND_EXISTING_FUNCTIONS'; END IF;
END $preflight$;

CREATE FUNCTION clean.phase5_physical_rest_live_guard_v39()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp
AS $guard$
DECLARE
 v_auth record;
 v_at timestamptz;
BEGIN
 IF TG_TABLE_SCHEMA<>'clean' OR
    TG_TABLE_NAME NOT IN ('phase5_fids_physical_attempt_v39','phase5_other_rest_physical_reservation_v39') OR
    TG_OP<>'INSERT' OR TG_WHEN<>'BEFORE' OR TG_LEVEL<>'ROW'
 THEN RAISE EXCEPTION 'P5_PHYSICAL_REST_GUARD_WRONG_TRIGGER'; END IF;
 -- Serialize this transaction with the existing V0103 deletion STOP
 -- writer (104, NOT the separate sweep lock 103). Shared lets independent
 -- reservations coexist. Never wait behind a STOP writer or owner revoke.
 IF NOT pg_try_advisory_xact_lock_shared(390015,104)
 THEN RAISE EXCEPTION 'P5_PHYSICAL_REST_DELETION_STOP_LOCK_BUSY'; END IF;
 SELECT enabled,revoked_at_utc,manifest_sha256 INTO v_auth
 FROM clean.adb_phase6_authorization WHERE singleton_key
 FOR SHARE NOWAIT;
 IF NOT FOUND OR v_auth.enabled IS DISTINCT FROM true OR
    v_auth.revoked_at_utc IS NOT NULL OR
    v_auth.manifest_sha256 IS DISTINCT FROM NEW.manifest_sha256
 THEN RAISE EXCEPTION 'P5_PHYSICAL_REST_LIVE_AUTH_NOT_ENABLED_OR_MISMATCHED'; END IF;
 IF EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved)
 THEN RAISE EXCEPTION 'P5_PHYSICAL_REST_DELETION_STOP_UNRESOLVED'; END IF;
 v_at:=clock_timestamp();
 -- This is the EXISTING hard 24h primary-original cap, not a new source
 -- access TTL. Also reject an invalid cleared marker with live payload.
 -- Do not export any body or identity; do not clear anything here.
 IF EXISTS(SELECT 1 FROM clean.fids_query_response r
    WHERE r.raw_payload IS NOT NULL
      AND (r.raw_expired_at_utc IS NOT NULL OR
           r.raw_persisted_at_utc<=v_at-interval '24 hours'))
 THEN RAISE EXCEPTION 'P5_PHYSICAL_REST_PRIMARY_FIDS_HARD_DUE_OR_INVALID'; END IF;
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION clean.phase5_physical_rest_live_guard_v39() FROM PUBLIC;
-- Alphabetical BEFORE trigger order places this before existing V0080 /
-- V0082/V0093 ledger increment guards. Any failure rolls back the WHOLE
-- reservation transaction; no refunds/retries or mutation of old rows.
CREATE TRIGGER a00_phase5_fids_physical_rest_live_guard_v39
 BEFORE INSERT ON clean.phase5_fids_physical_attempt_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_physical_rest_live_guard_v39();
CREATE TRIGGER a00_phase5_other_physical_rest_live_guard_v39
 BEFORE INSERT ON clean.phase5_other_rest_physical_reservation_v39
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_physical_rest_live_guard_v39();
COMMIT;
