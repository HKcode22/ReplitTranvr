-- V0114 STAGED: explicit witnessed conditional frozen-T registration.
-- I144/T140 completes the database boundary exposed by I143/T139's real
-- PG16 retiming regression. No production installation follows from CI.
-- Original ten-argument V0091/V0100 functions, native/standalone equality,
-- existing task identity, Stage14/Packet B and V0081/V0111 are unchanged.
-- Add two receipt-explicit overloads; no queue, table, role or paid action.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $p5_v0114_preflight$
DECLARE actor name:=current_user;
DECLARE owner_role constant text:='phase5_cd_source_registration_owner_v39';
BEGIN
 IF current_user<>session_user OR current_database()<>'neondb'
 OR current_setting('server_version_num')::int/10000<>16 OR pg_is_in_recovery()
 OR pg_get_userbyid((SELECT nspowner FROM pg_namespace WHERE nspname='clean')) IS DISTINCT FROM actor
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=owner_role AND NOT rolcanlogin AND NOT rolsuper
   AND NOT rolinherit AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls)
 OR has_schema_privilege(owner_role,'clean','CREATE')
 OR (NOT (SELECT rolsuper FROM pg_roles WHERE rolname=actor) AND pg_has_role(actor,owner_role,'SET'))
 OR to_regprocedure('clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb)') IS NOT NULL OR to_regprocedure('clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb)') IS NOT NULL
 THEN RAISE EXCEPTION 'P5B_V0114_OWNER_OR_ALREADY_INSTALLED_HOLD'; END IF;
 -- Full exact prosrc pins, not a permissive substring replacement.
 IF (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid=to_regprocedure('clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)'))
      IS DISTINCT FROM '70ad33929da9a97d30a4f88fa0283328c15bd03160bc560ffd3c4937f3de5cd7'
 OR (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid=to_regprocedure('clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)'))
      IS DISTINCT FROM '6779aba6f887a9137b6e0f1dce048048f98c1454b7f3badf4e1331b94a5e3057'
 OR (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid=to_regprocedure('clean.phase5_t24_witness_before_insert_v39()'))
      IS DISTINCT FROM '6ca4b9c0939dbbff56ff1a57a1a4a246dd7532dd75323d4c5955f8f0b13dee6c'
 OR (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid=to_regprocedure('clean.phase5_t24_witness_immutable_v39()'))
      IS DISTINCT FROM 'b085f669a28eff6b35f003c020a5453dc5aa8bde38d9565cbf126bb65de5ef02'
 OR (SELECT count(*) FROM pg_proc p WHERE p.oid IN (to_regprocedure('clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)'),to_regprocedure('clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)'))
     AND p.prosecdef AND pg_get_userbyid(p.proowner)=owner_role
     AND array_length(p.proconfig,1)=1 AND replace(p.proconfig[1],' ','')='search_path=pg_catalog,pg_temp')<>2
 OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='clean.phase5_t24_postcommit_witness_v39'::regclass
   AND NOT tgisinternal AND tgenabled='O' AND ((tgname='p5_t24_witness_before_insert_v39' AND tgfoid='clean.phase5_t24_witness_before_insert_v39()'::regprocedure)
    OR (tgname='p5_t24_witness_no_rewrite_v39' AND tgfoid='clean.phase5_t24_witness_immutable_v39()'::regprocedure)))<>2
 OR has_any_column_privilege(owner_role,'clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,REFERENCES')
 OR has_table_privilege(owner_role,'clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
 THEN RAISE EXCEPTION 'P5B_V0114_EXACT_PREDECESSOR_OR_WITNESS_ACL_HOLD'; END IF;
END $p5_v0114_preflight$;
-- The existing NOLOGIN SECURITY DEFINER owner alone gains these immutable
-- provenance columns. PREPARE and login callers gain no witness read/write.
GRANT SELECT(snapshot_id,flight_instance_id,population_query_id,fids_response_hash,source_query_digest,rights_review_sha256,selected_t_native_utc,selected_t_version,t24_cutoff_utc,frame_hash,config_hash,post_pre_commit_db_observed_at_utc) ON clean.phase5_t24_postcommit_witness_v39 TO phase5_cd_source_registration_owner_v39;
GRANT CREATE ON SCHEMA clean TO phase5_cd_source_registration_owner_v39;
DO $p5_v0114_temporary$
DECLARE actor name:=current_user;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname=actor) THEN
  EXECUTE format('GRANT phase5_cd_source_registration_owner_v39 TO %I WITH ADMIN FALSE, INHERIT FALSE, SET TRUE',actor);
  IF NOT pg_has_role(actor,'phase5_cd_source_registration_owner_v39','SET')
  THEN RAISE EXCEPTION 'P5B_V0114_TEMPORARY_SET_MISSING'; END IF;
 END IF;
END $p5_v0114_temporary$;
SET LOCAL ROLE phase5_cd_source_registration_owner_v39;
CREATE FUNCTION clean.phase5_cd_register_source_flight_v39(
 p_manifest text,p_query text,p_flight text,p_horizon text,
 p_native_t timestamptz,p_packet text,p_population_id text,
 p_response text,p_rights text,p_max_staleness integer,p_t24_receipt jsonb
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $register_witnessed$
DECLARE
 now_utc timestamptz:=clock_timestamp();
 offset_utc interval;
 cutoff_utc timestamptz;
 source_row record;
 v record;
 member record;
 found_count integer;
 inserted_task bigint;
 receipt_key text;
 receipt_clock timestamptz;
 receipt_native timestamptz;
 receipt_cutoff timestamptz;
 receipt_witness timestamptz;
 receipt_readback timestamptz;
 witnessed record;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$' OR
    p_query IS NULL OR p_query !~ '^[0-9a-f]{64}$' OR
    p_packet IS NULL OR p_packet !~ '^[0-9a-f]{64}$' OR
    p_response IS NULL OR p_response !~ '^[0-9a-f]{64}$' OR
    p_rights IS NULL OR p_rights !~ '^[0-9a-f]{64}$' OR
    p_flight IS NULL OR length(p_flight) NOT BETWEEN 5 AND 200 OR
    p_flight !~ '^[A-Za-z0-9_.:|-]+$' OR
    p_population_id IS NULL OR
    p_population_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR
    p_horizon IS NULL OR p_horizon NOT IN ('T-24h','T-6h','T-90m') OR
    p_native_t IS NULL OR
    p_max_staleness IS NULL OR p_max_staleness NOT BETWEEN 1 AND 86400
 THEN RAISE EXCEPTION 'P5_CD_V0091_INVALID_FROZEN_SOURCE_PACKET_INPUT'; END IF;
 -- Explicit reviewed conditional witness input; the ten-argument native
 -- and standalone functions do not receive or infer this admission mode.
 IF p_flight IS NULL OR p_flight !~ '^leg:g5a:[a-f0-9]{64}$'
    OR p_horizon IS NULL OR p_horizon NOT IN ('T-6h','T-90m')
    OR p_native_t IS NULL OR NOT isfinite(p_native_t)
    OR p_t24_receipt IS NULL OR jsonb_typeof(p_t24_receipt)<>'object'
    OR octet_length(p_t24_receipt::text)>8192
 THEN RAISE EXCEPTION 'P5B_V0114_EXPLICIT_CONDITIONAL_WITNESS_REQUIRED'; END IF;
 IF (SELECT array_agg(k ORDER BY k COLLATE "C") FROM jsonb_object_keys(p_t24_receipt) k)
      IS DISTINCT FROM ARRAY['expectedSelectedTVersion','flightInstanceId','frozenT24CutoffUtc','receiptSha256','schema','selectedTNativeUtc','snapshotId','stage17PostCommitReadbackAtUtc','t24ConfigSha256','t24FrameSha256','t24OriginalFidsSha256','t24SourceQueryDigestSha256','witnessDbObservedAtUtc']::text[]
    OR EXISTS(SELECT 1 FROM jsonb_each(p_t24_receipt) e WHERE jsonb_typeof(e.value)<>'string')
    OR p_t24_receipt->>'schema'<>'v39.phase5.stage24.externally-reviewed-stage17-receipt.v1'
    OR p_t24_receipt->>'snapshotId' !~ '^[1-9][0-9]{0,17}$'
    OR p_t24_receipt->>'flightInstanceId' IS DISTINCT FROM p_flight
    OR p_t24_receipt->>'expectedSelectedTVersion'=''
    OR EXISTS(SELECT 1 FROM unnest(ARRAY['t24OriginalFidsSha256','t24SourceQueryDigestSha256','t24FrameSha256','t24ConfigSha256','receiptSha256']) k
      WHERE p_t24_receipt->>k !~ '^[a-f0-9]{64}$')
 THEN RAISE EXCEPTION 'P5B_V0114_REVIEWED_RECEIPT_SHAPE'; END IF;
 -- Match Stage24's primitive canonical strings and exact 12-field pipe
 -- preimage. JSONB serialization is deliberately never hashed.
 FOREACH receipt_key IN ARRAY ARRAY['selectedTNativeUtc','frozenT24CutoffUtc','witnessDbObservedAtUtc','stage17PostCommitReadbackAtUtc'] LOOP
  IF p_t24_receipt->>receipt_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
  THEN RAISE EXCEPTION 'P5B_V0114_REVIEWED_RECEIPT_CLOCK'; END IF;
  receipt_clock:=(p_t24_receipt->>receipt_key)::timestamptz;
  IF NOT isfinite(receipt_clock) OR to_char(receipt_clock AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM p_t24_receipt->>receipt_key
  THEN RAISE EXCEPTION 'P5B_V0114_REVIEWED_RECEIPT_CLOCK'; END IF;
 END LOOP;
 IF encode(sha256(convert_to(concat_ws('|',
    p_t24_receipt->>'schema',
    p_t24_receipt->>'snapshotId',
    p_t24_receipt->>'flightInstanceId',
    p_t24_receipt->>'selectedTNativeUtc',
    p_t24_receipt->>'frozenT24CutoffUtc',
    p_t24_receipt->>'expectedSelectedTVersion',
    p_t24_receipt->>'t24OriginalFidsSha256',
    p_t24_receipt->>'t24SourceQueryDigestSha256',
    p_t24_receipt->>'t24FrameSha256',
    p_t24_receipt->>'t24ConfigSha256',
    p_t24_receipt->>'witnessDbObservedAtUtc',
    p_t24_receipt->>'stage17PostCommitReadbackAtUtc'), 'UTF8')),'hex') IS DISTINCT FROM p_t24_receipt->>'receiptSha256'
 THEN RAISE EXCEPTION 'P5B_V0114_REVIEWED_RECEIPT_DIGEST'; END IF;
 receipt_native:=(p_t24_receipt->>'selectedTNativeUtc')::timestamptz;
 receipt_cutoff:=(p_t24_receipt->>'frozenT24CutoffUtc')::timestamptz;
 receipt_witness:=(p_t24_receipt->>'witnessDbObservedAtUtc')::timestamptz;
 receipt_readback:=(p_t24_receipt->>'stage17PostCommitReadbackAtUtc')::timestamptz;
 IF receipt_native IS DISTINCT FROM p_native_t OR receipt_cutoff IS DISTINCT FROM p_native_t-interval '24 hours'
    OR receipt_witness<receipt_cutoff-interval '3 minutes' OR receipt_witness>=receipt_cutoff-interval '2 seconds'
    OR receipt_readback<receipt_witness OR receipt_readback>=receipt_cutoff
    OR receipt_readback>=p_native_t-(CASE p_horizon WHEN 'T-6h' THEN interval '6 hours' ELSE interval '90 minutes' END)
    OR receipt_readback>clock_timestamp()
 THEN RAISE EXCEPTION 'P5B_V0114_FROZEN_T_OR_READBACK_CLOCK'; END IF;
 -- Only durable witness/PRE provenance is needed here. Historical raw T24
 -- Contents may have lawfully expired; no raw replay or retention extension.
 SELECT w.snapshot_id,w.flight_instance_id,w.population_query_id,w.fids_response_hash,
   w.source_query_digest,w.rights_review_sha256,w.selected_t_native_utc,w.selected_t_version,
   w.t24_cutoff_utc,w.frame_hash,w.config_hash,w.post_pre_commit_db_observed_at_utc,
   s.id AS joined_snapshot_id,s.flight_instance_id AS snapshot_flight,s.population_query_id AS snapshot_population,
   s.population_member_id,s.fids_response_hash AS snapshot_response,s.selected_t_milestone_utc AS snapshot_t,
   s.selected_t_version AS snapshot_version,s.prediction_cutoff_utc AS snapshot_cutoff,
   s.frame_hash AS snapshot_frame,s.config_hash AS snapshot_config,s.created_at AS snapshot_created,
   s.prediction_state,s.horizon,
   (SELECT count(*) FROM clean.flight_snapshots z WHERE z.flight_instance_id=p_flight AND z.horizon='T-24h') AS snapshot_count,
   (SELECT count(*) FROM clean.phase5_t24_postcommit_witness_v39 z WHERE z.flight_instance_id=p_flight) AS witness_count
 INTO witnessed FROM clean.phase5_t24_postcommit_witness_v39 w
 JOIN clean.flight_snapshots s ON s.id=w.snapshot_id
 WHERE w.flight_instance_id=p_flight AND w.snapshot_id=(p_t24_receipt->>'snapshotId')::bigint;
 IF NOT FOUND OR witnessed.snapshot_count<>1 OR witnessed.witness_count<>1
    OR witnessed.snapshot_id IS DISTINCT FROM witnessed.joined_snapshot_id
    OR witnessed.snapshot_flight IS DISTINCT FROM p_flight
    OR witnessed.prediction_state IS DISTINCT FROM 'PRE_DEPARTURE' OR witnessed.horizon IS DISTINCT FROM 'T-24h'
    OR witnessed.population_member_id IS NULL OR witnessed.population_query_id IS NULL
    OR witnessed.snapshot_population IS DISTINCT FROM witnessed.population_query_id
    OR witnessed.fids_response_hash IS DISTINCT FROM p_t24_receipt->>'t24OriginalFidsSha256'
    OR witnessed.snapshot_response IS DISTINCT FROM witnessed.fids_response_hash
    OR witnessed.source_query_digest IS DISTINCT FROM p_t24_receipt->>'t24SourceQueryDigestSha256'
    OR witnessed.rights_review_sha256 IS DISTINCT FROM p_rights
    OR witnessed.selected_t_native_utc IS DISTINCT FROM p_native_t OR witnessed.snapshot_t IS DISTINCT FROM p_native_t
    OR witnessed.selected_t_version IS DISTINCT FROM p_t24_receipt->>'expectedSelectedTVersion'
    OR witnessed.snapshot_version IS DISTINCT FROM witnessed.selected_t_version
    OR witnessed.t24_cutoff_utc IS DISTINCT FROM receipt_cutoff OR witnessed.snapshot_cutoff IS DISTINCT FROM receipt_cutoff
    OR witnessed.frame_hash IS DISTINCT FROM p_t24_receipt->>'t24FrameSha256' OR witnessed.snapshot_frame IS DISTINCT FROM witnessed.frame_hash
    OR witnessed.config_hash IS DISTINCT FROM p_t24_receipt->>'t24ConfigSha256' OR witnessed.snapshot_config IS DISTINCT FROM witnessed.config_hash
    -- pg/JS Date transports milliseconds. Compare that established
    -- representation without relaxing the stored microsecond-safe window.
    OR date_trunc('milliseconds',witnessed.post_pre_commit_db_observed_at_utc) IS DISTINCT FROM receipt_witness
    OR witnessed.post_pre_commit_db_observed_at_utc<receipt_cutoff-interval '3 minutes'
    OR witnessed.post_pre_commit_db_observed_at_utc>=receipt_cutoff-interval '2 seconds'
    OR witnessed.snapshot_created IS NULL OR witnessed.snapshot_created>witnessed.post_pre_commit_db_observed_at_utc
 THEN RAISE EXCEPTION 'P5B_V0114_PERSISTED_T24_WITNESS_MISMATCH'; END IF;
 offset_utc:=CASE p_horizon WHEN 'T-24h' THEN INTERVAL '24 hours'
  WHEN 'T-6h' THEN INTERVAL '6 hours' ELSE INTERVAL '90 minutes' END;
 cutoff_utc:=p_native_t-offset_utc;
 IF cutoff_utc<=now_utc+INTERVAL '2 seconds' THEN
  RAISE EXCEPTION 'P5_CD_V0091_RETROSPECTIVE_CUTOFF'; END IF;

 SELECT q.manifest_sha256,q.query_digest,q.state,
    q.run_day_index,q.slot_id,q.horizon,q.airport_icao,
    q.github_run_id,q.early_draw_sha256,q.reviewed_release_sha256,
    q.rights_review_sha256,q.provider_contract_sha256,
    q.hard_latest_dispatch_utc,
    q.service_window_start_utc,q.service_window_end_utc,
    a.github_run_id AS actual_attempt_run,
    a.committed_at_utc AS reserved_at,
    b.population_query_id::text AS original_population_id,
    b.response_hash AS original_hash,
    b.rights_review_sha256 AS bound_rights,
    b.source_expires_at_utc AS original_expires,
    b.normalized_members_count,
    b.bound_at_utc,
    r.available_at AS original_available,
    r.fids_retrieval_utc,r.raw_persisted_at_utc,
    r.response_hash AS response_hash,
    r.source_airport_icao,r.query_direction,
    r.raw_payload->>'phase5PopulationIdentityVersion' AS identity_version,
    r.raw_payload->'fidsRequestContract' AS request_contract,
    r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL
      AS original_unexpired
 INTO source_row FROM clean.phase5_fids_allowed_query_v39 q
 JOIN clean.phase5_fids_physical_attempt_v39 a
   ON a.query_digest=q.query_digest
  AND a.manifest_sha256=q.manifest_sha256
 JOIN clean.phase5_fids_original_binding_v39 b
   ON b.query_digest=q.query_digest
  AND b.reservation_sha256=a.reservation_sha256
  AND b.manifest_sha256=q.manifest_sha256
 JOIN clean.fids_query_response r
   ON r.population_query_id=b.population_query_id
 WHERE q.manifest_sha256=p_manifest AND q.query_digest=p_query;
 IF NOT FOUND OR source_row.state IS DISTINCT FROM 'ACTIVE' OR source_row.horizon IS DISTINCT FROM p_horizon OR
    source_row.original_population_id IS DISTINCT FROM p_population_id OR
    source_row.original_hash IS DISTINCT FROM p_response OR source_row.response_hash IS DISTINCT FROM p_response OR
    source_row.rights_review_sha256 IS DISTINCT FROM p_rights OR source_row.bound_rights IS DISTINCT FROM p_rights OR
    source_row.original_expires IS NULL OR source_row.original_available IS NULL OR
    source_row.fids_retrieval_utc IS NULL OR source_row.raw_persisted_at_utc IS NULL OR
    source_row.bound_at_utc IS NULL OR source_row.reserved_at IS NULL OR
    source_row.normalized_members_count IS NULL OR
    source_row.original_expires<=cutoff_utc OR
    source_row.original_expires<=now_utc OR
    source_row.original_unexpired IS DISTINCT FROM TRUE OR
    source_row.source_airport_icao IS DISTINCT FROM source_row.airport_icao OR
    source_row.query_direction IS DISTINCT FROM 'Departure' OR
    source_row.actual_attempt_run IS DISTINCT FROM source_row.github_run_id OR
    source_row.normalized_members_count<1 OR
    p_native_t<source_row.service_window_start_utc OR
    p_native_t>=source_row.service_window_end_utc OR
    source_row.hard_latest_dispatch_utc>cutoff_utc-INTERVAL '2 seconds' OR
    source_row.reserved_at>source_row.fids_retrieval_utc OR
    source_row.fids_retrieval_utc>source_row.raw_persisted_at_utc OR
    source_row.raw_persisted_at_utc>source_row.original_available OR
    source_row.original_available>source_row.bound_at_utc OR
    source_row.bound_at_utc>now_utc OR
    source_row.original_available>cutoff_utc OR
    cutoff_utc-source_row.original_available>
      make_interval(secs=>p_max_staleness)
 THEN
  RAISE EXCEPTION 'P5_CD_V0091_REAL_SOURCE_OR_FRAME_TIME_NOT_QUALIFIED'; END IF;

 -- One exact confirmed operating leg: no aggregate conditional services
 -- silently relabeled as a physical aircraft, no codeshare duplicates.
 SELECT count(*)::integer INTO found_count
 FROM clean.flight_population m WHERE
   m.population_query_id=p_population_id::uuid AND
   m.analytic_identity_id=p_flight;
 IF found_count<>1 THEN
  RAISE EXCEPTION 'P5_CD_V0091_SOURCE_MEMBER_MISSING_OR_DUPLICATED'; END IF;
 SELECT m.population_query_id::text AS population_id,
   m.canonical_flight_instance_id,m.source_airport_icao,
   m.dep_airport_icao,m.population_role,m.source_type,
   m.scope_classification,m.codeshare_resolution_status,
   m.response_hash,m.provider_content_expired_at_utc,
   m.available_at,m.dep_scheduled_utc,m.population_member_id,
   m.arr_airport_icao,m.flight_number,m.query_direction
 INTO member FROM clean.flight_population m WHERE
   m.population_query_id=p_population_id::uuid AND
   m.analytic_identity_id=p_flight;
 IF NOT FOUND OR
   member.population_id IS DISTINCT FROM p_population_id OR
   member.canonical_flight_instance_id IS DISTINCT FROM p_flight OR
   member.source_airport_icao IS DISTINCT FROM source_row.airport_icao OR
   member.dep_airport_icao IS DISTINCT FROM source_row.airport_icao OR
   member.population_role IS DISTINCT FROM 'requested_airport_primary' OR
   member.source_type IS DISTINCT FROM 'fids' OR
   NOT COALESCE((
     (member.scope_classification='confirmed_core' AND member.codeshare_resolution_status='confirmed_operating_leg'
       AND p_flight !~ '^leg:g5a:')
     OR (
       member.scope_classification='unknown'
       AND member.codeshare_resolution_status='g5a_conditional_operator_composite_no_native_id'
       AND p_flight ~ '^leg:g5a:[a-f0-9]{64}$'
       AND member.arr_airport_icao ~ '^[A-Z]{4}$'
       AND member.arr_airport_icao<>source_row.airport_icao
       AND member.flight_number ~ '^[A-Z0-9]{2}[0-9]{1,4}$'
       AND member.query_direction='Departure'
       AND source_row.identity_version='P5_CANONICAL_SHA256_V1'
       AND source_row.request_contract @> '{"schema":"v39.fids-request-frame.application-intent.v1","endpointKind":"airport_local_fids","direction":"Departure","withLeg":true,"withCargo":false,"withPrivate":false,"withCancelled":true,"withCodeshared":true,"withLocation":false}'::jsonb
       AND source_row.request_contract->>'airportIcao'=source_row.airport_icao
       AND source_row.request_contract->>'openapiSha256'=source_row.provider_contract_sha256
       AND source_row.request_contract#>>'{phase5ConditionalService,protocolSha256}' ~ '^[a-f0-9]{64}$'
       AND CASE WHEN source_row.request_contract#>>'{phase5ConditionalService,cohortStartUtc}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:00[.]000Z$'
         THEN (source_row.request_contract#>>'{phase5ConditionalService,cohortStartUtc}')::timestamptz<=source_row.service_window_start_utc
           AND source_row.service_window_end_utc<=(source_row.request_contract#>>'{phase5ConditionalService,cohortStartUtc}')::timestamptz+interval '6 hours'
         ELSE false END
     )),false) OR
   member.response_hash IS DISTINCT FROM p_response OR
   member.provider_content_expired_at_utc IS NOT NULL OR
   member.available_at IS NULL OR
   member.available_at<source_row.original_available OR
   member.available_at>cutoff_utc OR
   member.dep_scheduled_utc IS NULL OR
   member.dep_scheduled_utc<source_row.service_window_start_utc OR
   member.dep_scheduled_utc>=source_row.service_window_end_utc OR
   member.population_member_id IS NULL THEN
  RAISE EXCEPTION 'P5_CD_V0091_SOURCE_MEMBER_NOT_NATIVE_OPERATING_LEG'; END IF;

 -- V0087's immutable INSERT trigger repeats prospective DB-clock,
 -- existing snapshot and frozen-identity checks under the same transaction.
 INSERT INTO clean.phase5_cd_pre_task_v39(
   manifest_sha256,flight_instance_id,horizon,selected_native_t_utc,
   prediction_cutoff_utc,packet_sha256,source_population_query_id,
   source_response_sha256,reviewed_source_rights_sha256,
   source_expires_at_utc)
 VALUES(p_manifest,p_flight,p_horizon,p_native_t,cutoff_utc,p_packet,
   p_population_id,p_response,p_rights,source_row.original_expires)
 RETURNING task_id INTO inserted_task;
 RETURN inserted_task;
END $register_witnessed$;

CREATE FUNCTION clean.phase5_cd_ensure_exact_source_flight_v39(
 p_manifest text,p_query text,p_flight text,p_horizon text,
 p_native_t timestamptz,p_packet text,p_population_id text,
 p_response text,p_rights text,p_max_staleness integer,p_t24_receipt jsonb
) RETURNS TABLE(task_id bigint,newly_registered boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $ensure_witnessed$
DECLARE existing clean.phase5_cd_pre_task_v39%ROWTYPE;
DECLARE new_id bigint;
 receipt_key text;
 receipt_clock timestamptz;
 receipt_native timestamptz;
 receipt_cutoff timestamptz;
 receipt_witness timestamptz;
 receipt_readback timestamptz;
 witnessed record;
BEGIN
 IF p_manifest IS NULL OR p_manifest !~ '^[0-9a-f]{64}$' OR
 p_query IS NULL OR p_query !~ '^[0-9a-f]{64}$' OR
 p_packet IS NULL OR p_packet !~ '^[0-9a-f]{64}$' OR
 p_response IS NULL OR p_response !~ '^[0-9a-f]{64}$' OR
 p_rights IS NULL OR p_rights !~ '^[0-9a-f]{64}$' OR
 p_flight IS NULL OR length(p_flight) NOT BETWEEN 5 AND 200 OR
 p_flight !~ '^[A-Za-z0-9_.:|-]+$' OR
 p_population_id IS NULL OR p_population_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR
 p_horizon IS NULL OR p_horizon NOT IN ('T-24h','T-6h','T-90m') OR
 p_native_t IS NULL OR NOT isfinite(p_native_t) OR
 p_max_staleness IS NULL OR p_max_staleness NOT BETWEEN 1 AND 86400
 THEN RAISE EXCEPTION 'P6_V0100_INVALID_EXACT_PACKET_INPUT'; END IF;
 -- SAME transaction lock as the immutable V0087 insert trigger.
 -- Concurrent calls under READ COMMITTED see the preceding commit.
 PERFORM pg_advisory_xact_lock(hashtext(p_flight||'|'||p_horizon));
 SELECT t.* INTO existing FROM clean.phase5_cd_pre_task_v39 t
 WHERE t.flight_instance_id=p_flight AND t.horizon=p_horizon;
 IF FOUND THEN
  IF existing.manifest_sha256 IS DISTINCT FROM p_manifest OR
  existing.selected_native_t_utc IS DISTINCT FROM p_native_t OR
  existing.packet_sha256 IS DISTINCT FROM p_packet OR
  existing.source_population_query_id IS DISTINCT FROM p_population_id OR
  existing.source_response_sha256 IS DISTINCT FROM p_response OR
  existing.reviewed_source_rights_sha256 IS DISTINCT FROM p_rights
  THEN RAISE EXCEPTION 'P6_V0100_EXISTING_TASK_IDENTITY_OR_PACKET_CONFLICT'; END IF;
 -- Explicit reviewed conditional witness input; the ten-argument native
 -- and standalone functions do not receive or infer this admission mode.
 IF p_flight IS NULL OR p_flight !~ '^leg:g5a:[a-f0-9]{64}$'
    OR p_horizon IS NULL OR p_horizon NOT IN ('T-6h','T-90m')
    OR p_native_t IS NULL OR NOT isfinite(p_native_t)
    OR p_t24_receipt IS NULL OR jsonb_typeof(p_t24_receipt)<>'object'
    OR octet_length(p_t24_receipt::text)>8192
 THEN RAISE EXCEPTION 'P5B_V0114_EXPLICIT_CONDITIONAL_WITNESS_REQUIRED'; END IF;
 IF (SELECT array_agg(k ORDER BY k COLLATE "C") FROM jsonb_object_keys(p_t24_receipt) k)
      IS DISTINCT FROM ARRAY['expectedSelectedTVersion','flightInstanceId','frozenT24CutoffUtc','receiptSha256','schema','selectedTNativeUtc','snapshotId','stage17PostCommitReadbackAtUtc','t24ConfigSha256','t24FrameSha256','t24OriginalFidsSha256','t24SourceQueryDigestSha256','witnessDbObservedAtUtc']::text[]
    OR EXISTS(SELECT 1 FROM jsonb_each(p_t24_receipt) e WHERE jsonb_typeof(e.value)<>'string')
    OR p_t24_receipt->>'schema'<>'v39.phase5.stage24.externally-reviewed-stage17-receipt.v1'
    OR p_t24_receipt->>'snapshotId' !~ '^[1-9][0-9]{0,17}$'
    OR p_t24_receipt->>'flightInstanceId' IS DISTINCT FROM p_flight
    OR p_t24_receipt->>'expectedSelectedTVersion'=''
    OR EXISTS(SELECT 1 FROM unnest(ARRAY['t24OriginalFidsSha256','t24SourceQueryDigestSha256','t24FrameSha256','t24ConfigSha256','receiptSha256']) k
      WHERE p_t24_receipt->>k !~ '^[a-f0-9]{64}$')
 THEN RAISE EXCEPTION 'P5B_V0114_REVIEWED_RECEIPT_SHAPE'; END IF;
 -- Match Stage24's primitive canonical strings and exact 12-field pipe
 -- preimage. JSONB serialization is deliberately never hashed.
 FOREACH receipt_key IN ARRAY ARRAY['selectedTNativeUtc','frozenT24CutoffUtc','witnessDbObservedAtUtc','stage17PostCommitReadbackAtUtc'] LOOP
  IF p_t24_receipt->>receipt_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
  THEN RAISE EXCEPTION 'P5B_V0114_REVIEWED_RECEIPT_CLOCK'; END IF;
  receipt_clock:=(p_t24_receipt->>receipt_key)::timestamptz;
  IF NOT isfinite(receipt_clock) OR to_char(receipt_clock AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') IS DISTINCT FROM p_t24_receipt->>receipt_key
  THEN RAISE EXCEPTION 'P5B_V0114_REVIEWED_RECEIPT_CLOCK'; END IF;
 END LOOP;
 IF encode(sha256(convert_to(concat_ws('|',
    p_t24_receipt->>'schema',
    p_t24_receipt->>'snapshotId',
    p_t24_receipt->>'flightInstanceId',
    p_t24_receipt->>'selectedTNativeUtc',
    p_t24_receipt->>'frozenT24CutoffUtc',
    p_t24_receipt->>'expectedSelectedTVersion',
    p_t24_receipt->>'t24OriginalFidsSha256',
    p_t24_receipt->>'t24SourceQueryDigestSha256',
    p_t24_receipt->>'t24FrameSha256',
    p_t24_receipt->>'t24ConfigSha256',
    p_t24_receipt->>'witnessDbObservedAtUtc',
    p_t24_receipt->>'stage17PostCommitReadbackAtUtc'), 'UTF8')),'hex') IS DISTINCT FROM p_t24_receipt->>'receiptSha256'
 THEN RAISE EXCEPTION 'P5B_V0114_REVIEWED_RECEIPT_DIGEST'; END IF;
 receipt_native:=(p_t24_receipt->>'selectedTNativeUtc')::timestamptz;
 receipt_cutoff:=(p_t24_receipt->>'frozenT24CutoffUtc')::timestamptz;
 receipt_witness:=(p_t24_receipt->>'witnessDbObservedAtUtc')::timestamptz;
 receipt_readback:=(p_t24_receipt->>'stage17PostCommitReadbackAtUtc')::timestamptz;
 IF receipt_native IS DISTINCT FROM p_native_t OR receipt_cutoff IS DISTINCT FROM p_native_t-interval '24 hours'
    OR receipt_witness<receipt_cutoff-interval '3 minutes' OR receipt_witness>=receipt_cutoff-interval '2 seconds'
    OR receipt_readback<receipt_witness OR receipt_readback>=receipt_cutoff
    OR receipt_readback>=p_native_t-(CASE p_horizon WHEN 'T-6h' THEN interval '6 hours' ELSE interval '90 minutes' END)
    OR receipt_readback>clock_timestamp()
 THEN RAISE EXCEPTION 'P5B_V0114_FROZEN_T_OR_READBACK_CLOCK'; END IF;
 -- Only durable witness/PRE provenance is needed here. Historical raw T24
 -- Contents may have lawfully expired; no raw replay or retention extension.
 SELECT w.snapshot_id,w.flight_instance_id,w.population_query_id,w.fids_response_hash,
   w.source_query_digest,w.rights_review_sha256,w.selected_t_native_utc,w.selected_t_version,
   w.t24_cutoff_utc,w.frame_hash,w.config_hash,w.post_pre_commit_db_observed_at_utc,
   s.id AS joined_snapshot_id,s.flight_instance_id AS snapshot_flight,s.population_query_id AS snapshot_population,
   s.population_member_id,s.fids_response_hash AS snapshot_response,s.selected_t_milestone_utc AS snapshot_t,
   s.selected_t_version AS snapshot_version,s.prediction_cutoff_utc AS snapshot_cutoff,
   s.frame_hash AS snapshot_frame,s.config_hash AS snapshot_config,s.created_at AS snapshot_created,
   s.prediction_state,s.horizon,
   (SELECT count(*) FROM clean.flight_snapshots z WHERE z.flight_instance_id=p_flight AND z.horizon='T-24h') AS snapshot_count,
   (SELECT count(*) FROM clean.phase5_t24_postcommit_witness_v39 z WHERE z.flight_instance_id=p_flight) AS witness_count
 INTO witnessed FROM clean.phase5_t24_postcommit_witness_v39 w
 JOIN clean.flight_snapshots s ON s.id=w.snapshot_id
 WHERE w.flight_instance_id=p_flight AND w.snapshot_id=(p_t24_receipt->>'snapshotId')::bigint;
 IF NOT FOUND OR witnessed.snapshot_count<>1 OR witnessed.witness_count<>1
    OR witnessed.snapshot_id IS DISTINCT FROM witnessed.joined_snapshot_id
    OR witnessed.snapshot_flight IS DISTINCT FROM p_flight
    OR witnessed.prediction_state IS DISTINCT FROM 'PRE_DEPARTURE' OR witnessed.horizon IS DISTINCT FROM 'T-24h'
    OR witnessed.population_member_id IS NULL OR witnessed.population_query_id IS NULL
    OR witnessed.snapshot_population IS DISTINCT FROM witnessed.population_query_id
    OR witnessed.fids_response_hash IS DISTINCT FROM p_t24_receipt->>'t24OriginalFidsSha256'
    OR witnessed.snapshot_response IS DISTINCT FROM witnessed.fids_response_hash
    OR witnessed.source_query_digest IS DISTINCT FROM p_t24_receipt->>'t24SourceQueryDigestSha256'
    OR witnessed.rights_review_sha256 IS DISTINCT FROM p_rights
    OR witnessed.selected_t_native_utc IS DISTINCT FROM p_native_t OR witnessed.snapshot_t IS DISTINCT FROM p_native_t
    OR witnessed.selected_t_version IS DISTINCT FROM p_t24_receipt->>'expectedSelectedTVersion'
    OR witnessed.snapshot_version IS DISTINCT FROM witnessed.selected_t_version
    OR witnessed.t24_cutoff_utc IS DISTINCT FROM receipt_cutoff OR witnessed.snapshot_cutoff IS DISTINCT FROM receipt_cutoff
    OR witnessed.frame_hash IS DISTINCT FROM p_t24_receipt->>'t24FrameSha256' OR witnessed.snapshot_frame IS DISTINCT FROM witnessed.frame_hash
    OR witnessed.config_hash IS DISTINCT FROM p_t24_receipt->>'t24ConfigSha256' OR witnessed.snapshot_config IS DISTINCT FROM witnessed.config_hash
    -- pg/JS Date transports milliseconds. Compare that established
    -- representation without relaxing the stored microsecond-safe window.
    OR date_trunc('milliseconds',witnessed.post_pre_commit_db_observed_at_utc) IS DISTINCT FROM receipt_witness
    OR witnessed.post_pre_commit_db_observed_at_utc<receipt_cutoff-interval '3 minutes'
    OR witnessed.post_pre_commit_db_observed_at_utc>=receipt_cutoff-interval '2 seconds'
    OR witnessed.snapshot_created IS NULL OR witnessed.snapshot_created>witnessed.post_pre_commit_db_observed_at_utc
 THEN RAISE EXCEPTION 'P5B_V0114_PERSISTED_T24_WITNESS_MISMATCH'; END IF;
  -- The byte hash commits the reviewed query, native T, and staleness;
  -- do not re-validate expired source for an already registered task,
  -- and never return a new PRE/claim entitlement from this ACK.
  RETURN QUERY SELECT existing.task_id,false;
  RETURN;
 END IF;
 -- All new-task source and cutoff checks remain in original V0091.
 new_id:=clean.phase5_cd_register_source_flight_v39(
 p_manifest,p_query,p_flight,p_horizon,p_native_t,p_packet,
 p_population_id,p_response,p_rights,p_max_staleness,p_t24_receipt);
 RETURN QUERY SELECT new_id,true;
END $ensure_witnessed$;

REVOKE ALL ON FUNCTION clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb),clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb),clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb) TO phase5_fids_prepare_prod_20261107;
RESET ROLE;
REVOKE CREATE ON SCHEMA clean FROM phase5_cd_source_registration_owner_v39;
DO $p5_v0114_postflight$
DECLARE actor name:=current_user;
DECLARE owner_role constant text:='phase5_cd_source_registration_owner_v39';
DECLARE col text;
DECLARE sig text;
BEGIN
 IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname=actor) THEN
  EXECUTE format('REVOKE phase5_cd_source_registration_owner_v39 FROM %I GRANTED BY %I',actor,actor);
  IF pg_has_role(actor,owner_role,'SET') THEN RAISE EXCEPTION 'P5B_V0114_TEMPORARY_SET_NOT_REVOKED'; END IF;
 END IF;
 IF current_user<>session_user OR has_schema_privilege(owner_role,'clean','CREATE')
 OR has_table_privilege(owner_role,'clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
 OR has_any_column_privilege(owner_role,'clean.phase5_t24_postcommit_witness_v39','INSERT,UPDATE,REFERENCES')
 OR has_any_column_privilege('phase5_fids_prepare_prod_20261107','clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,REFERENCES')
 OR has_any_column_privilege('phase5_p30_prepare_login_20261107','clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,REFERENCES')
 THEN RAISE EXCEPTION 'P5B_V0114_FINAL_ROLE_OR_WITNESS_ACL_HOLD'; END IF;
 FOREACH col IN ARRAY ARRAY['snapshot_id','flight_instance_id','population_query_id','fids_response_hash','source_query_digest','rights_review_sha256','selected_t_native_utc','selected_t_version','t24_cutoff_utc','frame_hash','config_hash','post_pre_commit_db_observed_at_utc'] LOOP
  IF NOT has_column_privilege(owner_role,'clean.phase5_t24_postcommit_witness_v39',col,'SELECT')
     OR has_column_privilege(owner_role,'clean.phase5_t24_postcommit_witness_v39',col,'SELECT WITH GRANT OPTION')
  THEN RAISE EXCEPTION 'P5B_V0114_EXACT_WITNESS_COLUMN_READ_HOLD'; END IF;
 END LOOP;
 FOREACH sig IN ARRAY ARRAY['clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb)','clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb)'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(sig) AND p.prosecdef
    AND pg_get_userbyid(p.proowner)=owner_role AND array_length(p.proconfig,1)=1
    AND replace(p.proconfig[1],' ','')='search_path=pg_catalog,pg_temp')
  OR NOT has_function_privilege('phase5_fids_prepare_prod_20261107',sig,'EXECUTE')
  OR has_function_privilege('phase5_fids_pre_writer_prod_20261107',sig,'EXECUTE')
  OR has_function_privilege('phase5_fids_source_prod_20261107',sig,'EXECUTE')
  OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.oid=to_regprocedure(sig) AND (a.grantee NOT IN (p.proowner,'phase5_fids_prepare_prod_20261107'::regrole) OR a.privilege_type<>'EXECUTE'
      OR (a.grantee<>p.proowner AND a.is_grantable)))
  THEN RAISE EXCEPTION 'P5B_V0114_FUNCTION_OWNER_OR_ACL_HOLD'; END IF;
 END LOOP;
 IF (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid=to_regprocedure('clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)')) IS DISTINCT FROM '70ad33929da9a97d30a4f88fa0283328c15bd03160bc560ffd3c4937f3de5cd7'
 OR (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid=to_regprocedure('clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)')) IS DISTINCT FROM '6779aba6f887a9137b6e0f1dce048048f98c1454b7f3badf4e1331b94a5e3057'
 OR (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid=to_regprocedure('clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb)')) IS DISTINCT FROM 'c8482af9b8b6203ac164f91bbf3a8ca4204204544415c3d8aa01d126a0be905c'
 OR (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid=to_regprocedure('clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer,jsonb)')) IS DISTINCT FROM 'feabd721857bed95a51960ebe4ac1ce058d0e1cd999f8f0e55cb8695242d68f4'
 THEN RAISE EXCEPTION 'P5B_V0114_FUNCTION_BODY_READBACK_HOLD'; END IF;
END $p5_v0114_postflight$;
COMMIT;
