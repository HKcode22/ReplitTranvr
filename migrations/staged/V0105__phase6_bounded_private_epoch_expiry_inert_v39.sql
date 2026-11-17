-- STAGED ONLY: bounded PRIVATE SQL expiry, independently reviewed candidate.
-- Not installed in production. NO role, grant, scheduler or policy change.
-- Reuse existing B0062 authorization and project-meta aggregate receipts.
-- Expected manifest must match existing singleton even if disabled/revoked:
-- retention obligations do not end on STOP. No caller-supplied cutoff.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner'
   OR pg_is_in_recovery() OR current_setting('server_version_num')::int NOT BETWEEN 160000 AND 169999
   OR EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE enabled)
   OR to_regclass('phase6_private.frozen_native_packet_v39') IS NULL
   OR to_regclass('phase6_private.signed_run_day_index_revision_v39') IS NULL
   OR to_regclass('phase6_private.signed_run_day_epoch_claim_v39') IS NULL
   OR (SELECT count(*) FROM pg_constraint WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass
       AND conname LIKE 'p6_v0101_%' AND convalidated)<>4
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_STAGE_STOPPED_PG16_V0101_REQUIRED'; END IF;
 LOCK TABLE clean.adb_phase6_authorization IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE enabled)
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_STAGE_AUTH_CHANGED'; END IF;
END $preflight$;

CREATE FUNCTION clean.phase6_private_epoch_expiry_status_v39(p_manifest text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $status$
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
END $status$;
REVOKE ALL ON FUNCTION clean.phase6_private_epoch_expiry_status_v39(text) FROM PUBLIC;

CREATE FUNCTION clean.phase6_private_epoch_expiry_sweep_v39(p_manifest text,p_limit integer)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='3s' AS $sweep$
DECLARE
 v_at timestamptz;
 v_run text:='P6-PRIVATE-SWEEP-'||gen_random_uuid()::text;
 v_result jsonb;
 v_day integer;
 v_packets integer:=0;
 v_indexes integer:=0;
 v_early integer:=0;
 v_claims bigint;
 v_remaining_packets bigint;
 v_remaining_heads bigint;
BEGIN
 IF pg_is_in_recovery() OR current_setting('transaction_read_only')<>'off'
    OR current_setting('session_replication_role')<>'origin'
    OR current_setting('server_version_num')::int NOT BETWEEN 160000 AND 169999
    OR current_database()<>'neondb'
    OR p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$'
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 128
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_INVALID_SCOPE'; END IF;
 -- Shared with existing V0103 deletion STOP and V0104 REST reservation fence.
 -- Never wait on a STOP writer. Private/primary sweeps stay independently bounded.
 IF NOT pg_try_advisory_xact_lock_shared(390015,104)
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_STOP_LOCK_BUSY'; END IF;
 IF NOT pg_try_advisory_xact_lock(390015,106)
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_ALREADY_ACTIVE'; END IF;
 PERFORM 1 FROM clean.adb_phase6_authorization
 WHERE singleton_key AND manifest_sha256=p_manifest FOR SHARE NOWAIT;
 IF NOT FOUND THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_MANIFEST_MISMATCH'; END IF;
 IF EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved)
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_DELETION_STOP'; END IF;
 -- Same table order as existing owner cleanup; conflict refuses rather
 -- than waits. Readers may continue; new publication is fenced in this tx.
 LOCK TABLE phase6_private.frozen_native_packet_v39,
   phase6_private.signed_run_day_index_revision_v39,
   phase6_private.signed_run_day_epoch_claim_v39
 IN SHARE ROW EXCLUSIVE MODE NOWAIT;
 v_at:=clock_timestamp();
 SELECT count(*) INTO v_claims
 FROM phase6_private.signed_run_day_epoch_claim_v39;

 -- No target epoch with a missing replay fence, noncontiguous sequence,
 -- wrong prior digest or mixed manifest. Never close an earlier revision
 -- independently of its newer head.
 IF EXISTS (
   SELECT 1 FROM phase6_private.signed_run_day_index_revision_v39 q
   LEFT JOIN phase6_private.signed_run_day_epoch_claim_v39 c USING(run_day_index)
   WHERE q.manifest_sha256=p_manifest AND (
     c.run_day_index IS NULL OR
     EXISTS(SELECT 1 FROM phase6_private.signed_run_day_index_revision_v39 x
       WHERE x.run_day_index=q.run_day_index AND x.manifest_sha256<>p_manifest) OR
     (q.revision>1 AND NOT EXISTS(
       SELECT 1 FROM phase6_private.signed_run_day_index_revision_v39 x
       WHERE x.run_day_index=q.run_day_index AND x.revision=q.revision-1
          AND x.content_sha256=q.previous_index_sha256))
   )) THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_CHAIN_DRIFT'; END IF;
 IF EXISTS (
   WITH heads AS (
     SELECT DISTINCT ON (run_day_index) run_day_index,retention_not_after_utc
     FROM phase6_private.signed_run_day_index_revision_v39
     WHERE manifest_sha256=p_manifest ORDER BY run_day_index,revision DESC
   )
   SELECT 1 FROM heads h
   JOIN phase6_private.signed_run_day_index_revision_v39 q USING(run_day_index)
   WHERE h.retention_not_after_utc>v_at AND q.retention_not_after_utc<=v_at
 ) THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_LIVE_HEAD_WITH_EXPIRED_ANCESTOR'; END IF;

 -- At most ONE complete expired-head epoch per invocation. Older index
 -- bytes with later signed deadlines retire only with that expired head,
 -- following the existing separately reviewed owner operation's semantics.
 SELECT h.run_day_index INTO v_day FROM (
   SELECT DISTINCT ON (run_day_index) run_day_index,retention_not_after_utc
   FROM phase6_private.signed_run_day_index_revision_v39
   WHERE manifest_sha256=p_manifest ORDER BY run_day_index,revision DESC
 ) h WHERE h.retention_not_after_utc<=v_at
 ORDER BY h.retention_not_after_utc,h.run_day_index LIMIT 1;
 IF v_day IS NOT NULL THEN
   SELECT count(*)::int INTO v_early FROM phase6_private.signed_run_day_index_revision_v39
   WHERE run_day_index=v_day AND manifest_sha256=p_manifest AND retention_not_after_utc>v_at;
   DELETE FROM phase6_private.signed_run_day_index_revision_v39
   WHERE run_day_index=v_day AND manifest_sha256=p_manifest;
   GET DIAGNOSTICS v_indexes=ROW_COUNT;
   IF v_indexes NOT BETWEEN 1 AND 1024 THEN
     RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_INDEX_COUNT'; END IF;
 END IF;
 -- Only due packets, in deterministic deadline order, with bounded count.
 -- No live packet, foreign manifest, claim, raw FIDS, or PRE row deletion.
 WITH due AS (
   SELECT logical_path FROM phase6_private.frozen_native_packet_v39
   WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at
   ORDER BY retention_not_after_utc,logical_path LIMIT p_limit
 )
 DELETE FROM phase6_private.frozen_native_packet_v39 p
 USING due d WHERE p.logical_path=d.logical_path AND p.manifest_sha256=p_manifest
   AND p.retention_not_after_utc<=v_at;
 GET DIAGNOSTICS v_packets=ROW_COUNT;
 IF (SELECT count(*) FROM phase6_private.signed_run_day_epoch_claim_v39)<>v_claims
    OR v_packets>p_limit THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_FENCE_OR_LIMIT'; END IF;
 SELECT count(*) INTO v_remaining_packets FROM phase6_private.frozen_native_packet_v39
 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at;
 SELECT count(*) INTO v_remaining_heads FROM (
   SELECT DISTINCT ON (run_day_index) retention_not_after_utc
   FROM phase6_private.signed_run_day_index_revision_v39
   WHERE manifest_sha256=p_manifest ORDER BY run_day_index,revision DESC
 ) h WHERE h.retention_not_after_utc<=v_at;
 v_result:=jsonb_build_object('schema','v39.phase6.private-epoch-expiry-sweep.v1',
   'status','PRIVATE_DUE_ONLY_IN_TX_NOT_COMMIT_PROOF','runId',v_run,'observedAtUtc',v_at,
   'packets',v_packets,'indexRevisions',v_indexes,
   'earlierIndexRevisionsRetired',v_early,'claimsPreserved',v_claims,
   'remainingDuePackets',v_remaining_packets,'remainingExpiredHeads',v_remaining_heads,
   'providerCalls',0,'backupOrPitrVerified',false,'phase6PaidGo',false);
 -- Aggregate project-generated receipt is atomic with DELETE; never retain
 -- payload, source hashes, packet paths, flight IDs, or provider content here.
 -- A zero-work response is intentionally not a commit receipt.
 IF v_packets+v_indexes>0 THEN
   INSERT INTO clean.adb_collection_meta(key,value)
   VALUES ('phase6_private_expiry:'||v_run,(v_result||jsonb_build_object('manifestSha256',p_manifest))::text);
 END IF;
 RETURN v_result;
END $sweep$;
REVOKE ALL ON FUNCTION clean.phase6_private_epoch_expiry_sweep_v39(text,integer) FROM PUBLIC;

-- Read back aggregate same-transaction commit marker on separate reader.
-- This attests function transaction commit and counts, not row-level
-- physical media eradication or a substitute for current backlog status.
CREATE FUNCTION clean.phase6_private_epoch_expiry_receipt_v39(p_manifest text,p_run text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $receipt$
DECLARE v jsonb;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$'
   OR p_run IS NULL OR p_run !~ '^P6-PRIVATE-SWEEP-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_INVALID_RECEIPT'; END IF;
 SELECT value::jsonb INTO v FROM clean.adb_collection_meta WHERE key='phase6_private_expiry:'||p_run;
 IF NOT FOUND THEN RETURN jsonb_build_object('schema','v39.phase6.private-epoch-expiry-receipt.v1','runId',p_run,
   'committedAggregateReceiptFound',false,'providerCalls',0,'databaseWrites',0,'phase6PaidGo',false); END IF;
 IF v->>'manifestSha256' IS DISTINCT FROM p_manifest OR v->>'runId' IS DISTINCT FROM p_run
    OR v->>'schema' IS DISTINCT FROM 'v39.phase6.private-epoch-expiry-sweep.v1'
    OR v->>'status' IS DISTINCT FROM 'PRIVATE_DUE_ONLY_IN_TX_NOT_COMMIT_PROOF'
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_RECEIPT_SCOPE_DRIFT'; END IF;
 RETURN (v-'manifestSha256'-'status'-'schema')||jsonb_build_object(
  'schema','v39.phase6.private-epoch-expiry-receipt.v1','committedAggregateReceiptFound',true,'databaseWrites',0);
END $receipt$;
REVOKE ALL ON FUNCTION clean.phase6_private_epoch_expiry_receipt_v39(text,text) FROM PUBLIC;

CREATE FUNCTION clean.phase6_private_epoch_expiry_stop_v39(p_run text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='3s' AS $stop$
BEGIN
 IF p_run IS NULL OR p_run !~ '^P6-PRIVATE-SWEEP-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_INVALID_RECEIPT'; END IF;
 PERFORM pg_advisory_xact_lock(390015,104);
 IF NOT EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved) THEN
  INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
  VALUES('deletion',clock_timestamp(),jsonb_build_object('kind','private_epoch_expiry_commit_or_readback_uncertain','sweepRunId',p_run),false);
 END IF;
 RETURN EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved);
END $stop$;
REVOKE ALL ON FUNCTION clean.phase6_private_epoch_expiry_stop_v39(text) FROM PUBLIC;
COMMIT;
