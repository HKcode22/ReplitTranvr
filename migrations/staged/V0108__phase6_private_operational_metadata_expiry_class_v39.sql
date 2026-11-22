-- Review candidate only. Existing physical DELETE rules, hard deadlines, roles and grants unchanged.
-- V0106 validation enforces two narrowly shaped operational metadata kinds.
-- All other packet kinds, all indexes, and all foreign-manifest rows remain hard-deadline evidence.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner'
 OR pg_is_in_recovery() OR current_setting('server_version_num')::int NOT BETWEEN 160000 AND 169999
 OR current_setting('session_replication_role')<>'origin'
 THEN RAISE EXCEPTION 'P6_V0108_WRONG_OWNER_PRIMARY_PG16'; END IF;
 LOCK TABLE clean.adb_phase6_authorization,phase6_private.frozen_native_packet_v39,
 phase6_private.signed_run_day_index_revision_v39 IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM phase6_private.frozen_native_packet_v39)
 OR EXISTS(SELECT 1 FROM phase6_private.signed_run_day_index_revision_v39)
 OR EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved)
 THEN RAISE EXCEPTION 'P6_V0108_REQUIRES_EMPTY_PRIVATE_CUSTODY_AND_NO_DELETION_STOP'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='clean' AND p.proname='phase6_private_epoch_expiry_status_v39'
 AND oidvectortypes(p.proargtypes)='text' AND p.prosecdef
 AND p.prosrc=$old$
DECLARE v_at timestamptz:=statement_timestamp();
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$' OR
    NOT EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE singleton_key AND manifest_sha256=p_manifest)
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_MANIFEST_MISMATCH'; END IF;
 RETURN jsonb_build_object('schema','v39.phase6.private-epoch-expiry-status.v1','observedAtUtc',v_at,
  'duePackets',(SELECT count(*) FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at),
  'dueIndexes',(SELECT count(*) FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at),
  'expiredHeads',(SELECT count(*) FROM (SELECT DISTINCT ON (run_day_index) retention_not_after_utc
      FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256=p_manifest ORDER BY run_day_index,revision DESC) h WHERE h.retention_not_after_utc<=v_at),
  'foreignDuePackets',(SELECT count(*) FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256<>p_manifest AND retention_not_after_utc<=v_at),
  'foreignDueIndexes',(SELECT count(*) FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256<>p_manifest AND retention_not_after_utc<=v_at),
  'claims',(SELECT count(*) FROM phase6_private.signed_run_day_epoch_claim_v39),
  'deletionStopUnresolved',EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved),
  'providerCalls',0,'databaseWrites',0,'backupOrPitrVerified',false,'phase6PaidGo',false);
END $old$)
 THEN RAISE EXCEPTION 'P6_V0108_EXACT_V0105_STATUS_REQUIRED_NO_REPLAY'; END IF;
 IF (SELECT count(*) FROM pg_constraint
 WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass AND convalidated
 AND conname IN ('p6_v0101_kind_allowed','p6_v0101_kind_path_guard','p6_v0101_bytes_guard','p6_v0101_packet_wire_scope'))<>4
 OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass
 AND conname='p6_v0101_packet_wire_scope' AND convalidated
 AND pg_get_constraintdef(oid) LIKE '%PHASE7_RECOVERY_RECEIPT%'
 AND pg_get_constraintdef(oid) LIKE '%PHASE7_RECOVERY_FENCE%'
 AND pg_get_constraintdef(oid) LIKE '%originalAvailableAtUtc%'
 AND pg_get_constraintdef(oid) LIKE '%receiptPathSha256%')
 THEN RAISE EXCEPTION 'P6_V0108_V0106_METADATA_CONSTRAINT_REQUIRED'; END IF;
END $preflight$;
CREATE OR REPLACE FUNCTION clean.phase6_private_epoch_expiry_status_v39(p_manifest text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $status$
DECLARE v_at timestamptz:=statement_timestamp();
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$' OR
    NOT EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE singleton_key AND manifest_sha256=p_manifest)
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_MANIFEST_MISMATCH'; END IF;
 RETURN jsonb_build_object('schema','v39.phase6.private-epoch-expiry-status.v2','observedAtUtc',v_at,
  'duePackets',(SELECT count(*) FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at),
  'dueOperationalMetadataPackets',(SELECT count(*) FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at AND kind IN ('PHASE7_RECOVERY_RECEIPT','PHASE7_RECOVERY_FENCE')),
  'dueIndexes',(SELECT count(*) FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at),
  'expiredHeads',(SELECT count(*) FROM (SELECT DISTINCT ON (run_day_index) retention_not_after_utc
      FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256=p_manifest ORDER BY run_day_index,revision DESC) h WHERE h.retention_not_after_utc<=v_at),
  'foreignDuePackets',(SELECT count(*) FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256<>p_manifest AND retention_not_after_utc<=v_at),
  'foreignDueIndexes',(SELECT count(*) FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256<>p_manifest AND retention_not_after_utc<=v_at),
  'claims',(SELECT count(*) FROM phase6_private.signed_run_day_epoch_claim_v39),
  'deletionStopUnresolved',EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved),
  'providerCalls',0,'databaseWrites',0,'backupOrPitrVerified',false,'phase6PaidGo',false);
END $status$;
-- CREATE OR REPLACE retains existing ownership and ACL. Never grant new authority.
COMMIT;
