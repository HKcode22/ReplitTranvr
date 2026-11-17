-- DISPOSABLE PG16 PROOF ONLY. NOT A PRODUCTION MIGRATION.
-- Session-local invoker function, tested inside a transaction subsequently
-- rolled back. No role, grant, SECURITY DEFINER, scheduler or installation.
-- Deliberately not sufficient for recurring production expiry approval.
CREATE FUNCTION pg_temp.p6_review_private_due_only(p_manifest text,p_limit integer)
RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $proof$
DECLARE
 v_at timestamptz;
 v_day integer;
 v_packets integer:=0;
 v_indexes integer:=0;
 v_early integer:=0;
 v_claims bigint;
 v_remaining_packets bigint;
 v_remaining_heads bigint;
BEGIN
 IF current_setting('p6_review.disposable',true) IS DISTINCT FROM '1'
    OR current_setting('server_version_num')::int NOT BETWEEN 160000 AND 169999
    OR current_user<>'neondb_owner' OR current_database()<>'neondb'
    OR p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$'
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 128
 THEN RAISE EXCEPTION 'P6_PRIVATE_PROOF_INVALID_DISPOSABLE_SCOPE'; END IF;
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
   )) THEN RAISE EXCEPTION 'P6_PRIVATE_PROOF_CHAIN_DRIFT'; END IF;
 IF EXISTS (
   WITH heads AS (
     SELECT DISTINCT ON (run_day_index) run_day_index,retention_not_after_utc
     FROM phase6_private.signed_run_day_index_revision_v39
     WHERE manifest_sha256=p_manifest ORDER BY run_day_index,revision DESC
   )
   SELECT 1 FROM heads h
   JOIN phase6_private.signed_run_day_index_revision_v39 q USING(run_day_index)
   WHERE h.retention_not_after_utc>v_at AND q.retention_not_after_utc<=v_at
 ) THEN RAISE EXCEPTION 'P6_PRIVATE_PROOF_LIVE_HEAD_WITH_EXPIRED_ANCESTOR'; END IF;

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
     RAISE EXCEPTION 'P6_PRIVATE_PROOF_INDEX_COUNT'; END IF;
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
    OR v_packets>p_limit THEN RAISE EXCEPTION 'P6_PRIVATE_PROOF_FENCE_OR_LIMIT'; END IF;
 SELECT count(*) INTO v_remaining_packets FROM phase6_private.frozen_native_packet_v39
 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at;
 SELECT count(*) INTO v_remaining_heads FROM (
   SELECT DISTINCT ON (run_day_index) retention_not_after_utc
   FROM phase6_private.signed_run_day_index_revision_v39
   WHERE manifest_sha256=p_manifest ORDER BY run_day_index,revision DESC
 ) h WHERE h.retention_not_after_utc<=v_at;
 RETURN jsonb_build_object('status','DISPOSABLE_PRIVATE_DUE_ONLY_IN_TX_NOT_COMMIT_PROOF',
   'packets',v_packets,'indexRevisions',v_indexes,
   'earlierIndexRevisionsRetired',v_early,'claimsPreserved',v_claims,
   'remainingDuePackets',v_remaining_packets,'remainingExpiredHeads',v_remaining_heads,
   'providerCalls',0,'phase6PaidGo',false);
END $proof$;
