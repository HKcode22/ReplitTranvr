-- Review candidate only. Existing physical DELETE rules, hard deadlines, roles and grants unchanged.
-- V0106 validation enforces two narrowly shaped operational metadata kinds.
-- Strictly shape-validated digest-only PRE and all-null POST wires also count as operational metadata.
-- All source-bearing, unknown, malformed, index and foreign-manifest rows remain hard-deadline evidence.
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
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='clean' AND p.proname='phase6_private_epoch_expiry_sweep_v39'
 AND oidvectortypes(p.proargtypes)='text, integer' AND p.prosecdef AND p.prosrc=$old_sweep$
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
END $old_sweep$)
 THEN RAISE EXCEPTION 'P6_V0108_EXACT_V0105_SWEEP_REQUIRED_NO_REPLAY'; END IF;
END $preflight$;
CREATE OR REPLACE FUNCTION clean.phase6_private_epoch_expiry_status_v39(p_manifest text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $status$
DECLARE v_at timestamptz:=clock_timestamp();
 v_metadata bigint; v_row record; v_wire jsonb; v_payload jsonb; v_scope jsonb; v_assembly jsonb; v_approval jsonb;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$' OR
    NOT EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE singleton_key AND manifest_sha256=p_manifest)
 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_MANIFEST_MISMATCH'; END IF;
 -- Only due, current-manifest, structurally bounded metadata is eligible.
 -- Existing generic storage kind is deliberately NOT enough. Parse failure,
 -- extra keys, an observed/non-null value or unknown shape remains hard due.
 SELECT count(*) INTO v_metadata FROM phase6_private.frozen_native_packet_v39
 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at
 AND kind IN ('PHASE7_RECOVERY_RECEIPT','PHASE7_RECOVERY_FENCE');
 FOR v_row IN SELECT payload_bytes,rights_sha256,externally_reviewed_at_utc,retention_not_after_utc
 FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256=p_manifest
 AND retention_not_after_utc<=v_at AND kind='PHASE7_SIGNED_REVIEW'
 LOOP
  BEGIN
   v_wire:=convert_from(v_row.payload_bytes,'UTF8')::jsonb;
   IF NOT coalesce(jsonb_typeof(v_wire)='object' AND v_wire ?& ARRAY['payloadBase64','signatureBase64'] AND (v_wire - ARRAY['payloadBase64','signatureBase64'])='{}'::jsonb
     AND jsonb_typeof(v_wire->'payloadBase64')='string' AND (v_wire->>'payloadBase64') ~ '^[A-Za-z0-9+/]+={0,2}$'
     AND jsonb_typeof(v_wire->'signatureBase64')='string' AND (v_wire->>'signatureBase64') ~ '^[A-Za-z0-9+/]{86}==$' ,false) THEN CONTINUE; END IF;
   v_payload:=convert_from(decode(v_wire->>'payloadBase64','base64'),'UTF8')::jsonb;
   IF NOT coalesce(jsonb_typeof(v_payload->'manifestSha256')='string' AND (v_payload->>'manifestSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_payload->'rightsSha256')='string' AND (v_payload->>'rightsSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_payload->'policySha256')='string' AND (v_payload->>'policySha256') ~ '^[a-f0-9]{64}$'
      AND v_payload->>'manifestSha256'=p_manifest AND v_payload->>'rightsSha256'=v_row.rights_sha256
      AND jsonb_typeof(v_payload->'validUntilUtc')='string' AND (v_payload->>'validUntilUtc') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
      AND (v_payload->>'validUntilUtc')::timestamptz=v_row.retention_not_after_utc,false) THEN CONTINUE; END IF;
   IF v_payload->>'schema' IN ('v39.phase7.separate-pre-field-proof.v1','v39.phase7.independent-pre-lane-readback.v1') THEN
    IF NOT coalesce(jsonb_typeof(v_payload->'permitSha256')='string' AND (v_payload->>'permitSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_payload->'fields')='array' AND jsonb_array_length(v_payload->'fields')<=16,false) THEN CONTINUE; END IF;
    IF v_payload->>'schema'='v39.phase7.separate-pre-field-proof.v1' THEN
     IF NOT coalesce(jsonb_typeof(v_payload)='object' AND v_payload ?& ARRAY['schema','manifestSha256','rightsSha256','policySha256','permitSha256','issuedAtUtc','validUntilUtc','fields'] AND (v_payload - ARRAY['schema','manifestSha256','rightsSha256','policySha256','permitSha256','issuedAtUtc','validUntilUtc','fields'])='{}'::jsonb
      AND jsonb_typeof(v_payload->'issuedAtUtc')='string' AND (v_payload->>'issuedAtUtc') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
      AND (v_payload->>'issuedAtUtc')::timestamptz=v_row.externally_reviewed_at_utc
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_payload->'fields') f WHERE NOT coalesce(
       jsonb_typeof(f)='object' AND f ?& ARRAY['field','selectedFeatureSha256','independentEvidenceSha256'] AND (f - ARRAY['field','selectedFeatureSha256','independentEvidenceSha256'])='{}'::jsonb AND jsonb_typeof(f->'selectedFeatureSha256')='string' AND (f->>'selectedFeatureSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(f->'independentEvidenceSha256')='string' AND (f->>'independentEvidenceSha256') ~ '^[a-f0-9]{64}$',false)),false) THEN CONTINUE; END IF;
    ELSE
     IF NOT coalesce(jsonb_typeof(v_payload)='object' AND v_payload ?& ARRAY['schema','manifestSha256','rightsSha256','policySha256','permitSha256','sourceExpiresAtUtc','reviewedAtUtc','validUntilUtc','fields'] AND (v_payload - ARRAY['schema','manifestSha256','rightsSha256','policySha256','permitSha256','sourceExpiresAtUtc','reviewedAtUtc','validUntilUtc','fields'])='{}'::jsonb
      AND jsonb_typeof(v_payload->'reviewedAtUtc')='string' AND (v_payload->>'reviewedAtUtc') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$' AND jsonb_typeof(v_payload->'sourceExpiresAtUtc')='string' AND (v_payload->>'sourceExpiresAtUtc') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
      AND (v_payload->>'reviewedAtUtc')::timestamptz=v_row.externally_reviewed_at_utc
      AND v_row.retention_not_after_utc<=(v_payload->>'sourceExpiresAtUtc')::timestamptz
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_payload->'fields') f WHERE NOT coalesce(
       jsonb_typeof(f)='object' AND f ?& ARRAY['field','disposition','purpose','fieldReviewSha256','selectedFeatureSha256','durableEvidenceSha256','durableReadAtUtc'] AND (f - ARRAY['field','disposition','purpose','fieldReviewSha256','selectedFeatureSha256','durableEvidenceSha256','durableReadAtUtc'])='{}'::jsonb AND jsonb_typeof(f->'fieldReviewSha256')='string' AND (f->>'fieldReviewSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(f->'selectedFeatureSha256')='string' AND (f->>'selectedFeatureSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(f->'durableEvidenceSha256')='string' AND (f->>'durableEvidenceSha256') ~ '^[a-f0-9]{64}$'
       AND jsonb_typeof(f->'durableReadAtUtc')='string' AND (f->>'durableReadAtUtc') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$' AND (f->>'durableReadAtUtc')::timestamptz<=v_row.externally_reviewed_at_utc
       AND ((f->>'disposition'='INDEPENDENT_SOURCE_EXACT_LANE' AND f->>'purpose'='independent_research') OR
            (f->>'disposition'='PURPOSE_BOUND_REFERENCE_LANE' AND f->>'purpose' IN ('identify','link','retrieve'))),false)),false) THEN CONTINUE; END IF;
    END IF;
    IF v_row.retention_not_after_utc<=v_row.externally_reviewed_at_utc OR v_row.retention_not_after_utc>v_row.externally_reviewed_at_utc+interval '24 hours'
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(v_payload->'fields') f WHERE NOT coalesce(jsonb_typeof(f->'field')='string' AND f->>'field' IN ('origin_icao','destination_icao','operating_carrier','scheduled_arrival_utc','provider_revised_departure_utc','reported_pre_departure_status','origin_metar_visibility_m','origin_metar_wind_kt','origin_taf_flight_category','destination_taf_flight_category','prior_aircraft_turnaround_minutes','prior_aircraft_adsb_not_ground_reported','prior_aircraft_adsb_position_age_seconds','prior_route_departure_delay_median_minutes','prior_airport_departure_delay_median_minutes','airport_congestion_1h'),false))
     OR (SELECT count(DISTINCT f->>'field') FROM jsonb_array_elements(v_payload->'fields') f)<>jsonb_array_length(v_payload->'fields')
    THEN CONTINUE; END IF;
    v_metadata:=v_metadata+1;
   ELSIF v_payload->>'schema'='v39.phase7.exact-post-group-settlement.v1' THEN
    v_scope:=v_payload->'scope'; v_assembly:=v_payload->'assemblyIds'; v_approval:=v_payload->'approval';
    IF coalesce(jsonb_typeof(v_payload)='object' AND v_payload ?& ARRAY['schema','policySha256','manifestSha256','rightsSha256','anchorSha256','committedPostSha256','fragmentsSha256','reviewedAtUtc','validUntilUtc','releasedAtUtc','scope','assemblyIds','approval'] AND (v_payload - ARRAY['schema','policySha256','manifestSha256','rightsSha256','anchorSha256','committedPostSha256','fragmentsSha256','reviewedAtUtc','validUntilUtc','releasedAtUtc','scope','assemblyIds','approval'])='{}'::jsonb
      AND jsonb_typeof(v_payload->'anchorSha256')='string' AND (v_payload->>'anchorSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_payload->'committedPostSha256')='string' AND (v_payload->>'committedPostSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_payload->'fragmentsSha256')='string' AND (v_payload->>'fragmentsSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_payload->'reviewedAtUtc')='string' AND (v_payload->>'reviewedAtUtc') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$' AND jsonb_typeof(v_payload->'releasedAtUtc')='string' AND (v_payload->>'releasedAtUtc') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
      AND (v_payload->>'reviewedAtUtc')::timestamptz=v_row.externally_reviewed_at_utc
      AND (v_payload->>'releasedAtUtc')::timestamptz<=v_row.externally_reviewed_at_utc
      AND v_row.retention_not_after_utc>v_row.externally_reviewed_at_utc AND v_row.retention_not_after_utc<=v_row.externally_reviewed_at_utc+interval '6 hours'
      AND jsonb_typeof(v_scope)='object' AND v_scope ?& ARRAY['groupId','associationReviewSha256','outcomeReviewSha256','groupSettlementDue','evidence'] AND (v_scope - ARRAY['groupId','associationReviewSha256','outcomeReviewSha256','groupSettlementDue','evidence'])='{}'::jsonb
      AND jsonb_typeof(v_scope->'groupId')='string' AND (v_scope->>'groupId') ~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' AND jsonb_typeof(v_scope->'associationReviewSha256')='string' AND (v_scope->>'associationReviewSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_scope->'outcomeReviewSha256')='string' AND (v_scope->>'outcomeReviewSha256') ~ '^[a-f0-9]{64}$'
      AND v_scope->'groupSettlementDue'='true'::jsonb
      AND jsonb_typeof(v_scope->'evidence')='object'
      AND NOT EXISTS(SELECT 1 FROM jsonb_each(v_scope->'evidence') q WHERE q.key NOT IN ('T-24h','T-6h','T-90m') OR q.value<>'null'::jsonb)
      AND jsonb_typeof(v_assembly)='object' AND v_assembly ?& ARRAY['continuousPacketId','missingPreRows'] AND (v_assembly - ARRAY['continuousPacketId','missingPreRows'])='{}'::jsonb AND jsonb_typeof(v_assembly->'continuousPacketId')='string' AND (v_assembly->>'continuousPacketId') ~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      AND jsonb_typeof(v_assembly->'missingPreRows')='object'
      AND NOT EXISTS(SELECT 1 FROM jsonb_each(v_assembly->'missingPreRows') q WHERE q.key NOT IN ('T-24h','T-6h','T-90m') OR jsonb_typeof(q.value)<>'string' OR (q.value#>>'{}') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$')
      AND jsonb_typeof(v_approval)='object' AND v_approval ?& ARRAY['schema','contractSha256','bundleSha256','sourceParityReviewSha256','reconstructionReviewSha256','fieldReviewSha256','associationReviewSha256','continuousTargetReviewSha256','approvedForDurableStorage','sourceMappingPersisted','minTargetMinutes','maxTargetMinutes'] AND (v_approval - ARRAY['schema','contractSha256','bundleSha256','sourceParityReviewSha256','reconstructionReviewSha256','fieldReviewSha256','associationReviewSha256','continuousTargetReviewSha256','approvedForDurableStorage','sourceMappingPersisted','minTargetMinutes','maxTargetMinutes'])='{}'::jsonb
      AND v_approval->>'schema'='v39.phase7.durable-derived-bundle-independent-review.v1'
      AND jsonb_typeof(v_approval->'contractSha256')='string' AND (v_approval->>'contractSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_approval->'bundleSha256')='string' AND (v_approval->>'bundleSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_approval->'sourceParityReviewSha256')='string' AND (v_approval->>'sourceParityReviewSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_approval->'reconstructionReviewSha256')='string' AND (v_approval->>'reconstructionReviewSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_approval->'fieldReviewSha256')='string' AND (v_approval->>'fieldReviewSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_approval->'associationReviewSha256')='string' AND (v_approval->>'associationReviewSha256') ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof(v_approval->'continuousTargetReviewSha256')='string' AND (v_approval->>'continuousTargetReviewSha256') ~ '^[a-f0-9]{64}$'
      AND v_approval->>'associationReviewSha256'=v_scope->>'associationReviewSha256'
      AND v_approval->'approvedForDurableStorage'='true'::jsonb AND v_approval->'sourceMappingPersisted'='false'::jsonb
      AND jsonb_typeof(v_approval->'minTargetMinutes')='number' AND jsonb_typeof(v_approval->'maxTargetMinutes')='number'
      AND (v_approval->>'minTargetMinutes')::numeric<(v_approval->>'maxTargetMinutes')::numeric,false)
    THEN v_metadata:=v_metadata+1; END IF;
   END IF;
  EXCEPTION WHEN data_exception THEN
   -- Unparseable/invalid metadata is a hard-deadline candidate, not an exemption.
   NULL;
  END;
 END LOOP;
 RETURN jsonb_build_object('schema','v39.phase6.private-epoch-expiry-status.v2','observedAtUtc',v_at,
  'duePackets',(SELECT count(*) FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at),
  'dueOperationalMetadataPackets',v_metadata,
  'dueIndexes',(SELECT count(*) FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256=p_manifest AND retention_not_after_utc<=v_at),
  'expiredHeads',(SELECT count(*) FROM (SELECT DISTINCT ON (run_day_index) retention_not_after_utc
      FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256=p_manifest ORDER BY run_day_index,revision DESC) h WHERE h.retention_not_after_utc<=v_at),
  'foreignDuePackets',(SELECT count(*) FROM phase6_private.frozen_native_packet_v39 WHERE manifest_sha256<>p_manifest AND retention_not_after_utc<=v_at),
  'foreignDueIndexes',(SELECT count(*) FROM phase6_private.signed_run_day_index_revision_v39 WHERE manifest_sha256<>p_manifest AND retention_not_after_utc<=v_at),
  'claims',(SELECT count(*) FROM phase6_private.signed_run_day_epoch_claim_v39),
  'deletionStopUnresolved',EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved),
  'providerCalls',0,'databaseWrites',0,'backupOrPitrVerified',false,'phase6PaidGo',false);
END $status$;
CREATE OR REPLACE FUNCTION clean.phase6_private_epoch_expiry_sweep_v39(p_manifest text,p_limit integer)
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
 v_status jsonb;
 v_hard_due bigint;
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
 -- Sample actual hard and operational expiry at the SAME locked cutoff
 -- used for deletion. An advancing clock between initial read and sweep
 -- must not hide newly hard-due rows that the sweep removes.
 v_status:=clean.phase6_private_epoch_expiry_status_v39(p_manifest);
 v_at:=(v_status->>'observedAtUtc')::timestamptz;
 v_hard_due:=(v_status->>'duePackets')::bigint-(v_status->>'dueOperationalMetadataPackets')::bigint
  +(v_status->>'dueIndexes')::bigint+(v_status->>'foreignDuePackets')::bigint+(v_status->>'foreignDueIndexes')::bigint;
 IF v_hard_due IS NULL OR v_hard_due<0 THEN RAISE EXCEPTION 'P6_PRIVATE_EXPIRY_HARD_COUNT'; END IF;
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
   'hardDueAtSweep',v_hard_due,
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
-- CREATE OR REPLACE retains existing ownership and ACL. Never grant new authority.
COMMIT;
