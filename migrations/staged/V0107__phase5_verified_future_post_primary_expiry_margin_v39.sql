-- Staged owner-only prospective upgrade, not implicit authorization.
-- Gives only exact unbound V0083 future POST originals the same one-hour
-- cleanup margin used by bound SOURCE. All operational acquisition, PRE,
-- POST and recovery access windows, 24h hard cap, source fields, and
-- historical/unrecognized original eligibility remain unchanged.
-- No new table, role, grant, source content mutation or provider call.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
LOCK TABLE clean.adb_phase6_authorization IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE clean.fids_query_response IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
 IF current_database()<>'neondb' OR pg_is_in_recovery()
 OR current_setting('server_version_num')::integer NOT BETWEEN 160000 AND 169999
 OR current_setting('session_replication_role')<>'origin'
 OR current_setting('transaction_read_only')<>'off'
 OR EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE enabled)
 OR EXISTS(SELECT 1 FROM clean.adb_collection_batches WHERE status='ACTIVE')
 OR EXISTS(SELECT 1 FROM clean.adb_collection_subs WHERE ended_at IS NULL)
 OR EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved)
 OR EXISTS(SELECT 1 FROM clean.fids_query_response WHERE raw_payload IS NOT NULL)
 OR to_regclass('clean.phase5_other_rest_physical_reservation_v39') IS NULL
 OR (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid='clean.fids_query_response'::regclass)<>current_user
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='clean.phase5_primary_fids_expiry_status_v39()'::regprocedure
   AND pg_get_userbyid(proowner)=current_user AND prosecdef AND provolatile='s'
   AND prosrc=$oldstatus$
  WITH t AS (SELECT statement_timestamp() AS at),
  live AS (
    SELECT r.raw_persisted_at_utc+interval '24 hours' AS hard_deadline,
      least(r.raw_persisted_at_utc+interval '24 hours',
            coalesce(b.source_expires_at_utc,r.raw_persisted_at_utc+interval '24 hours')) AS access_deadline,
      b.population_query_id IS NOT NULL AS bound
    FROM clean.fids_query_response r
    LEFT JOIN clean.phase5_fids_original_binding_v39 b USING(population_query_id)
    WHERE r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL
  )
  SELECT jsonb_build_object(
    'schema','v39.phase5.primary-fids-expiry-status.v1',
    'observedAtUtc',t.at,
    'liveOriginals',count(l.hard_deadline),
    'eligibleOriginals',count(*) FILTER(WHERE l.access_deadline<=t.at),
    'hardDueOriginals',count(*) FILTER(WHERE l.hard_deadline<=t.at),
    'eligibleNextHour',count(*) FILTER(WHERE l.access_deadline>t.at AND l.access_deadline<=t.at+interval '1 hour'),
    'hardDueNextHour',count(*) FILTER(WHERE l.hard_deadline>t.at AND l.hard_deadline<=t.at+interval '1 hour'),
    'unboundLiveOriginals',count(*) FILTER(WHERE NOT l.bound),
    'markedExpiredPayloadPresent',(SELECT count(*) FROM clean.fids_query_response r
      WHERE r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NOT NULL),
    'unlinkedUnexpiredPopulation',(SELECT count(*) FROM clean.flight_population p
      WHERE p.source_type='fids' AND p.provider_content_expired_at_utc IS NULL
        AND p.population_query_id IS NULL),
    'unexpiredPopulationWithoutLiveOriginal',(SELECT count(*) FROM clean.flight_population p
      JOIN clean.fids_query_response r USING(population_query_id)
      WHERE p.source_type='fids' AND p.provider_content_expired_at_utc IS NULL
        AND (r.raw_payload IS NULL OR r.raw_expired_at_utc IS NOT NULL)),
    'deletionStopUnresolved',EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved),
    'providerCalls',0,'databaseWrites',0,'objectPresenceChecked',false,
    'backupOrPitrVerified',false,'completeRetentionDeploymentVerified',false,'phase6PaidGo',false)
  FROM t LEFT JOIN live l ON true GROUP BY t.at
$oldstatus$)
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='clean.phase5_primary_fids_expiry_sweep_v39(integer)'::regprocedure
   AND pg_get_userbyid(proowner)=current_user AND prosecdef AND provolatile='v'
   AND prosrc=$oldsweep$
DECLARE
  v_at timestamptz := statement_timestamp();
  v_run text := 'P5-PRIMARY-FIDS-SWEEP-'||gen_random_uuid()::text;
  -- Exact existing planHash() convention: canonical Buffer numeric-key JSON,
  -- NOT raw file SHA. Verified against current f.8 bytes in disposable CI.
  v_plan constant text := 'abdb28da60e38a1c9c031bc4f931d3b8b09dd87be4ed0d686e18efe1991b4fd9';
  v_rule constant text := 'v39-phase5-access-deadline-or-max-24h/jsonb-utf8-sha256-v1';
  r record;
  v_ids bigint[];
  v_members bigint;
  v_rows bigint;
  v_clear bigint;
  v_children bigint := 0;
  v_originals integer := 0;
  v_receipts bigint;
  v_remaining bigint;
  v_hard bigint;
BEGIN
  IF current_database()<>'neondb' OR pg_is_in_recovery()
     OR current_setting('transaction_read_only')<>'off'
     OR current_setting('session_replication_role')<>'origin'
     OR current_setting('server_version_num')::integer NOT BETWEEN 160000 AND 169999
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 32 THEN
    RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_SCOPE_INVALID';
  END IF;
  IF NOT pg_try_advisory_xact_lock(390015,103) THEN
    RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_ALREADY_ACTIVE';
  END IF;
  -- An uncertain deletion incident is a shared safety stop. Never
  -- automatically resolve it or begin another mutating batch.
  IF EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved) THEN
    RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_DELETION_STOP';
  END IF;
  -- Lock oldest eligible originals. No waiting behind another row lock;
  -- skipped rows remain counted in the backlog. Later freshly arriving
  -- records cannot be accidentally admitted by a moving wall clock.
  FOR r IN
    SELECT q.population_query_id,
       encode(sha256(convert_to(q.raw_payload::text,'UTF8')),'hex') AS body_digest
    FROM clean.fids_query_response q
    LEFT JOIN clean.phase5_fids_original_binding_v39 b USING(population_query_id)
    WHERE q.raw_payload IS NOT NULL AND q.raw_expired_at_utc IS NULL
      AND least(q.raw_persisted_at_utc+interval '24 hours',
                coalesce(b.source_expires_at_utc,q.raw_persisted_at_utc+interval '24 hours'))<=v_at
    ORDER BY least(q.raw_persisted_at_utc+interval '24 hours',
                  coalesce(b.source_expires_at_utc,q.raw_persisted_at_utc+interval '24 hours')),
             q.population_query_id
    LIMIT p_limit FOR UPDATE OF q SKIP LOCKED
  LOOP
    -- A source with an unexpected dependent population shape is not
    -- partially purged. Preserve exact research membership/denominator.
    SELECT array_agg(p.id ORDER BY p.id),count(m.population_member_id)
      INTO v_ids,v_members
    FROM clean.flight_population p
    LEFT JOIN clean.population_research_membership m USING(population_member_id)
    WHERE p.population_query_id=r.population_query_id
      AND p.source_type='fids' AND p.provider_content_expired_at_utc IS NULL;
    v_ids:=coalesce(v_ids,ARRAY[]::bigint[]);
    IF cardinality(v_ids)>10000 OR cardinality(v_ids)<>v_members OR
       EXISTS(SELECT 1 FROM clean.flight_population p
          WHERE p.population_query_id=r.population_query_id
          AND (p.source_type<>'fids' OR p.provider_content_expired_at_utc IS NOT NULL)) THEN
      RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_POPULATION_SCOPE_DRIFT';
    END IF;
    -- Separate explicit hash encoding: PG JSONB UTF8 text SHA, not the
    -- original decoded HTTP body or the older JS canonical object hash.
    -- The existing B0062 child trigger copies this audit digest.
    INSERT INTO clean.retention_tombstone
      (surface,record_id,content_hash,expired_at,plan_hash,content_class,
       source_table,content_columns,retention_rule,expiry_run_id,deletion_mode)
    VALUES ('primary','fids_query_response:'||r.population_query_id::text||':raw_payload',
      r.body_digest,v_at,v_plan,'fids_population','clean.fids_query_response',
      ARRAY['raw_payload'],v_rule,v_run,'content-nullification');
    UPDATE clean.fids_query_response
      SET raw_payload=NULL,raw_expired_at_utc=v_at
      WHERE population_query_id=r.population_query_id
        AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL;
    GET DIAGNOSTICS v_rows=ROW_COUNT;
    IF v_rows<>1 OR NOT EXISTS(SELECT 1 FROM clean.fids_query_response q
      WHERE q.population_query_id=r.population_query_id AND q.raw_payload IS NULL
         AND q.response_hash IS NULL AND q.raw_expired_at_utc=v_at) THEN
      RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_PARENT_NOT_CLEARED';
    END IF;
    SELECT count(*) INTO v_clear FROM clean.flight_population p
      JOIN clean.population_research_membership m USING(population_member_id)
      WHERE p.id=ANY(v_ids) AND p.provider_content_expired_at_utc=v_at
        AND num_nonnulls(p.flight_number,p.carrier_iata,p.carrier_icao,p.call_sign,
          p.dep_airport_icao,p.dep_airport_iata,p.arr_airport_icao,p.arr_airport_iata,
          p.dep_scheduled_utc,p.arr_scheduled_utc,p.provider_record_key,p.raw_payload_sha256,
          p.coverage_state,p.population_query_id,p.from_local,p.to_local,p.airport_iana_timezone,
          p.scope_classification,p.codeshare_resolution_status,p.fids_retrieval_utc,p.available_at,
          p.response_hash,p.canonical_flight_instance_id,p.analytic_identity_id,p.provider_api_version)=0;
    IF v_clear<>cardinality(v_ids) OR EXISTS(SELECT 1 FROM clean.flight_population p
        WHERE p.population_query_id=r.population_query_id) THEN
      RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_CHILD_NOT_CLEARED';
    END IF;
    v_originals:=v_originals+1;
    v_children:=v_children+v_clear;
  END LOOP;
  SELECT count(*) INTO v_receipts FROM clean.retention_tombstone
    WHERE surface='primary' AND expiry_run_id=v_run AND plan_hash=v_plan
       AND retention_rule=v_rule AND deletion_mode='content-nullification';
  IF v_receipts<>v_originals+v_children THEN
    RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_TOMBSTONE_DRIFT';
  END IF;
  SELECT count(*) FILTER(WHERE least(q.raw_persisted_at_utc+interval '24 hours',
        coalesce(b.source_expires_at_utc,q.raw_persisted_at_utc+interval '24 hours'))<=v_at),
    count(*) FILTER(WHERE q.raw_persisted_at_utc+interval '24 hours'<=v_at)
    INTO v_remaining,v_hard
    FROM clean.fids_query_response q
    LEFT JOIN clean.phase5_fids_original_binding_v39 b USING(population_query_id)
    WHERE q.raw_payload IS NOT NULL AND q.raw_expired_at_utc IS NULL;
  RETURN jsonb_build_object('schema','v39.phase5.primary-fids-expiry-sweep.v1',
    'status','PRIMARY_FIDS_SWEEP_IN_TRANSACTION_NOT_COMMIT_PROOF','observedAtUtc',v_at,
    'runId',v_run,'originalsCleared',v_originals,'populationCleared',v_children,
    'tombstones',v_receipts,'remainingEligibleAtCutoff',v_remaining,
    'remainingHardDueAtCutoff',v_hard,'providerCalls',0,'objectDeletions',0,
    'backupOrPitrVerified',false,'completeRetentionDeploymentVerified',false,'phase6PaidGo',false);
END
$oldsweep$)
 THEN RAISE EXCEPTION 'P5_V0107_REQUIRES_EMPTY_STOPPED_EXACT_V0103_OWNER_NO_REPLAY'; END IF;
END $preflight$;
CREATE OR REPLACE FUNCTION clean.phase5_primary_fids_expiry_status_v39()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $status$
  WITH t AS (SELECT statement_timestamp() AS at),
  live AS (
    SELECT r.raw_persisted_at_utc+interval '24 hours' AS hard_deadline,
      least(r.raw_persisted_at_utc+interval '24 hours',
            coalesce(b.source_expires_at_utc,CASE WHEN (r.raw_payload->>'phase5PostPurpose'='FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL'
        AND r.raw_payload->>'phase5PostReservationSha256' ~ '^[0-9a-f]{64}$'
        AND r.raw_payload->'fidsRequestContract'->>'phase5PostReservationSha256'=r.raw_payload->>'phase5PostReservationSha256'
        AND r.raw_payload->>'originalDecodedEntityBodyPreserved'='true'
        AND r.query_direction='Departure'
        AND EXISTS(SELECT 1 FROM clean.phase5_other_rest_physical_reservation_v39 v
          WHERE v.reservation_sha256=r.raw_payload->>'phase5PostReservationSha256'
            AND v.rest_category='OUTCOME_REST_UNIT_BUDGET' AND v.approved_api_units=2
            AND v.reserved_at_utc<=r.fids_retrieval_utc)
        AND NOT EXISTS(SELECT 1 FROM clean.fids_query_response x
          WHERE x.population_query_id<>r.population_query_id AND x.raw_payload IS NOT NULL
            AND x.raw_payload->>'phase5PostReservationSha256'=r.raw_payload->>'phase5PostReservationSha256')
        AND NOT EXISTS(SELECT 1 FROM clean.flight_population fp
          WHERE fp.population_query_id=r.population_query_id
            AND fp.batch_id IS DISTINCT FROM r.raw_payload->>'phase5PostReservationSha256')) THEN r.raw_persisted_at_utc+interval '23 hours'
          ELSE r.raw_persisted_at_utc+interval '24 hours' END)) AS access_deadline,
      b.population_query_id IS NOT NULL AS bound
    FROM clean.fids_query_response r
    LEFT JOIN clean.phase5_fids_original_binding_v39 b USING(population_query_id)
    WHERE r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL
  )
  SELECT jsonb_build_object(
    'schema','v39.phase5.primary-fids-expiry-status.v1',
    'observedAtUtc',t.at,
    'liveOriginals',count(l.hard_deadline),
    'eligibleOriginals',count(*) FILTER(WHERE l.access_deadline<=t.at),
    'hardDueOriginals',count(*) FILTER(WHERE l.hard_deadline<=t.at),
    'eligibleNextHour',count(*) FILTER(WHERE l.access_deadline>t.at AND l.access_deadline<=t.at+interval '1 hour'),
    'hardDueNextHour',count(*) FILTER(WHERE l.hard_deadline>t.at AND l.hard_deadline<=t.at+interval '1 hour'),
    'unboundLiveOriginals',count(*) FILTER(WHERE NOT l.bound),
    'markedExpiredPayloadPresent',(SELECT count(*) FROM clean.fids_query_response r
      WHERE r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NOT NULL),
    'unlinkedUnexpiredPopulation',(SELECT count(*) FROM clean.flight_population p
      WHERE p.source_type='fids' AND p.provider_content_expired_at_utc IS NULL
        AND p.population_query_id IS NULL),
    'unexpiredPopulationWithoutLiveOriginal',(SELECT count(*) FROM clean.flight_population p
      JOIN clean.fids_query_response r USING(population_query_id)
      WHERE p.source_type='fids' AND p.provider_content_expired_at_utc IS NULL
        AND (r.raw_payload IS NULL OR r.raw_expired_at_utc IS NOT NULL)),
    'deletionStopUnresolved',EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved),
    'providerCalls',0,'databaseWrites',0,'objectPresenceChecked',false,
    'backupOrPitrVerified',false,'completeRetentionDeploymentVerified',false,'phase6PaidGo',false)
  FROM t LEFT JOIN live l ON true GROUP BY t.at
$status$;
CREATE OR REPLACE FUNCTION clean.phase5_primary_fids_expiry_sweep_v39(p_limit integer)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='3s' AS $sweep$
DECLARE
  v_at timestamptz := statement_timestamp();
  v_run text := 'P5-PRIMARY-FIDS-SWEEP-'||gen_random_uuid()::text;
  -- Exact existing planHash() convention: canonical Buffer numeric-key JSON,
  -- NOT raw file SHA. Verified against current f.8 bytes in disposable CI.
  v_plan constant text := 'abdb28da60e38a1c9c031bc4f931d3b8b09dd87be4ed0d686e18efe1991b4fd9';
  v_rule constant text := 'v39-phase5-access-deadline-or-max-24h/jsonb-utf8-sha256-v1';
  r record;
  v_ids bigint[];
  v_members bigint;
  v_rows bigint;
  v_clear bigint;
  v_children bigint := 0;
  v_originals integer := 0;
  v_receipts bigint;
  v_remaining bigint;
  v_hard bigint;
BEGIN
  IF current_database()<>'neondb' OR pg_is_in_recovery()
     OR current_setting('transaction_read_only')<>'off'
     OR current_setting('session_replication_role')<>'origin'
     OR current_setting('server_version_num')::integer NOT BETWEEN 160000 AND 169999
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 32 THEN
    RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_SCOPE_INVALID';
  END IF;
  IF NOT pg_try_advisory_xact_lock(390015,103) THEN
    RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_ALREADY_ACTIVE';
  END IF;
  -- An uncertain deletion incident is a shared safety stop. Never
  -- automatically resolve it or begin another mutating batch.
  IF EXISTS(SELECT 1 FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved) THEN
    RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_DELETION_STOP';
  END IF;
  -- Lock oldest eligible originals. No waiting behind another row lock;
  -- skipped rows remain counted in the backlog. Later freshly arriving
  -- records cannot be accidentally admitted by a moving wall clock.
  FOR r IN
    SELECT q.population_query_id,
       encode(sha256(convert_to(q.raw_payload::text,'UTF8')),'hex') AS body_digest
    FROM clean.fids_query_response q
    LEFT JOIN clean.phase5_fids_original_binding_v39 b USING(population_query_id)
    WHERE q.raw_payload IS NOT NULL AND q.raw_expired_at_utc IS NULL
      AND least(q.raw_persisted_at_utc+interval '24 hours',
                coalesce(b.source_expires_at_utc,CASE WHEN (q.raw_payload->>'phase5PostPurpose'='FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL'
        AND q.raw_payload->>'phase5PostReservationSha256' ~ '^[0-9a-f]{64}$'
        AND q.raw_payload->'fidsRequestContract'->>'phase5PostReservationSha256'=q.raw_payload->>'phase5PostReservationSha256'
        AND q.raw_payload->>'originalDecodedEntityBodyPreserved'='true'
        AND q.query_direction='Departure'
        AND EXISTS(SELECT 1 FROM clean.phase5_other_rest_physical_reservation_v39 v
          WHERE v.reservation_sha256=q.raw_payload->>'phase5PostReservationSha256'
            AND v.rest_category='OUTCOME_REST_UNIT_BUDGET' AND v.approved_api_units=2
            AND v.reserved_at_utc<=q.fids_retrieval_utc)
        AND NOT EXISTS(SELECT 1 FROM clean.fids_query_response x
          WHERE x.population_query_id<>q.population_query_id AND x.raw_payload IS NOT NULL
            AND x.raw_payload->>'phase5PostReservationSha256'=q.raw_payload->>'phase5PostReservationSha256')
        AND NOT EXISTS(SELECT 1 FROM clean.flight_population fp
          WHERE fp.population_query_id=q.population_query_id
            AND fp.batch_id IS DISTINCT FROM q.raw_payload->>'phase5PostReservationSha256')) THEN q.raw_persisted_at_utc+interval '23 hours'
          ELSE q.raw_persisted_at_utc+interval '24 hours' END))<=v_at
    ORDER BY least(q.raw_persisted_at_utc+interval '24 hours',
                  coalesce(b.source_expires_at_utc,CASE WHEN (q.raw_payload->>'phase5PostPurpose'='FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL'
        AND q.raw_payload->>'phase5PostReservationSha256' ~ '^[0-9a-f]{64}$'
        AND q.raw_payload->'fidsRequestContract'->>'phase5PostReservationSha256'=q.raw_payload->>'phase5PostReservationSha256'
        AND q.raw_payload->>'originalDecodedEntityBodyPreserved'='true'
        AND q.query_direction='Departure'
        AND EXISTS(SELECT 1 FROM clean.phase5_other_rest_physical_reservation_v39 v
          WHERE v.reservation_sha256=q.raw_payload->>'phase5PostReservationSha256'
            AND v.rest_category='OUTCOME_REST_UNIT_BUDGET' AND v.approved_api_units=2
            AND v.reserved_at_utc<=q.fids_retrieval_utc)
        AND NOT EXISTS(SELECT 1 FROM clean.fids_query_response x
          WHERE x.population_query_id<>q.population_query_id AND x.raw_payload IS NOT NULL
            AND x.raw_payload->>'phase5PostReservationSha256'=q.raw_payload->>'phase5PostReservationSha256')
        AND NOT EXISTS(SELECT 1 FROM clean.flight_population fp
          WHERE fp.population_query_id=q.population_query_id
            AND fp.batch_id IS DISTINCT FROM q.raw_payload->>'phase5PostReservationSha256')) THEN q.raw_persisted_at_utc+interval '23 hours'
          ELSE q.raw_persisted_at_utc+interval '24 hours' END)),
             q.population_query_id
    LIMIT p_limit FOR UPDATE OF q SKIP LOCKED
  LOOP
    -- A source with an unexpected dependent population shape is not
    -- partially purged. Preserve exact research membership/denominator.
    SELECT array_agg(p.id ORDER BY p.id),count(m.population_member_id)
      INTO v_ids,v_members
    FROM clean.flight_population p
    LEFT JOIN clean.population_research_membership m USING(population_member_id)
    WHERE p.population_query_id=r.population_query_id
      AND p.source_type='fids' AND p.provider_content_expired_at_utc IS NULL;
    v_ids:=coalesce(v_ids,ARRAY[]::bigint[]);
    IF cardinality(v_ids)>10000 OR cardinality(v_ids)<>v_members OR
       EXISTS(SELECT 1 FROM clean.flight_population p
          WHERE p.population_query_id=r.population_query_id
          AND (p.source_type<>'fids' OR p.provider_content_expired_at_utc IS NOT NULL)) THEN
      RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_POPULATION_SCOPE_DRIFT';
    END IF;
    -- Separate explicit hash encoding: PG JSONB UTF8 text SHA, not the
    -- original decoded HTTP body or the older JS canonical object hash.
    -- The existing B0062 child trigger copies this audit digest.
    INSERT INTO clean.retention_tombstone
      (surface,record_id,content_hash,expired_at,plan_hash,content_class,
       source_table,content_columns,retention_rule,expiry_run_id,deletion_mode)
    VALUES ('primary','fids_query_response:'||r.population_query_id::text||':raw_payload',
      r.body_digest,v_at,v_plan,'fids_population','clean.fids_query_response',
      ARRAY['raw_payload'],v_rule,v_run,'content-nullification');
    UPDATE clean.fids_query_response
      SET raw_payload=NULL,raw_expired_at_utc=v_at
      WHERE population_query_id=r.population_query_id
        AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL;
    GET DIAGNOSTICS v_rows=ROW_COUNT;
    IF v_rows<>1 OR NOT EXISTS(SELECT 1 FROM clean.fids_query_response q
      WHERE q.population_query_id=r.population_query_id AND q.raw_payload IS NULL
         AND q.response_hash IS NULL AND q.raw_expired_at_utc=v_at) THEN
      RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_PARENT_NOT_CLEARED';
    END IF;
    SELECT count(*) INTO v_clear FROM clean.flight_population p
      JOIN clean.population_research_membership m USING(population_member_id)
      WHERE p.id=ANY(v_ids) AND p.provider_content_expired_at_utc=v_at
        AND num_nonnulls(p.flight_number,p.carrier_iata,p.carrier_icao,p.call_sign,
          p.dep_airport_icao,p.dep_airport_iata,p.arr_airport_icao,p.arr_airport_iata,
          p.dep_scheduled_utc,p.arr_scheduled_utc,p.provider_record_key,p.raw_payload_sha256,
          p.coverage_state,p.population_query_id,p.from_local,p.to_local,p.airport_iana_timezone,
          p.scope_classification,p.codeshare_resolution_status,p.fids_retrieval_utc,p.available_at,
          p.response_hash,p.canonical_flight_instance_id,p.analytic_identity_id,p.provider_api_version)=0;
    IF v_clear<>cardinality(v_ids) OR EXISTS(SELECT 1 FROM clean.flight_population p
        WHERE p.population_query_id=r.population_query_id) THEN
      RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_CHILD_NOT_CLEARED';
    END IF;
    v_originals:=v_originals+1;
    v_children:=v_children+v_clear;
  END LOOP;
  SELECT count(*) INTO v_receipts FROM clean.retention_tombstone
    WHERE surface='primary' AND expiry_run_id=v_run AND plan_hash=v_plan
       AND retention_rule=v_rule AND deletion_mode='content-nullification';
  IF v_receipts<>v_originals+v_children THEN
    RAISE EXCEPTION 'P5_PRIMARY_FIDS_SWEEP_TOMBSTONE_DRIFT';
  END IF;
  SELECT count(*) FILTER(WHERE least(q.raw_persisted_at_utc+interval '24 hours',
        coalesce(b.source_expires_at_utc,CASE WHEN (q.raw_payload->>'phase5PostPurpose'='FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL'
        AND q.raw_payload->>'phase5PostReservationSha256' ~ '^[0-9a-f]{64}$'
        AND q.raw_payload->'fidsRequestContract'->>'phase5PostReservationSha256'=q.raw_payload->>'phase5PostReservationSha256'
        AND q.raw_payload->>'originalDecodedEntityBodyPreserved'='true'
        AND q.query_direction='Departure'
        AND EXISTS(SELECT 1 FROM clean.phase5_other_rest_physical_reservation_v39 v
          WHERE v.reservation_sha256=q.raw_payload->>'phase5PostReservationSha256'
            AND v.rest_category='OUTCOME_REST_UNIT_BUDGET' AND v.approved_api_units=2
            AND v.reserved_at_utc<=q.fids_retrieval_utc)
        AND NOT EXISTS(SELECT 1 FROM clean.fids_query_response x
          WHERE x.population_query_id<>q.population_query_id AND x.raw_payload IS NOT NULL
            AND x.raw_payload->>'phase5PostReservationSha256'=q.raw_payload->>'phase5PostReservationSha256')
        AND NOT EXISTS(SELECT 1 FROM clean.flight_population fp
          WHERE fp.population_query_id=q.population_query_id
            AND fp.batch_id IS DISTINCT FROM q.raw_payload->>'phase5PostReservationSha256')) THEN q.raw_persisted_at_utc+interval '23 hours'
          ELSE q.raw_persisted_at_utc+interval '24 hours' END))<=v_at),
    count(*) FILTER(WHERE q.raw_persisted_at_utc+interval '24 hours'<=v_at)
    INTO v_remaining,v_hard
    FROM clean.fids_query_response q
    LEFT JOIN clean.phase5_fids_original_binding_v39 b USING(population_query_id)
    WHERE q.raw_payload IS NOT NULL AND q.raw_expired_at_utc IS NULL;
  RETURN jsonb_build_object('schema','v39.phase5.primary-fids-expiry-sweep.v1',
    'status','PRIMARY_FIDS_SWEEP_IN_TRANSACTION_NOT_COMMIT_PROOF','observedAtUtc',v_at,
    'runId',v_run,'originalsCleared',v_originals,'populationCleared',v_children,
    'tombstones',v_receipts,'remainingEligibleAtCutoff',v_remaining,
    'remainingHardDueAtCutoff',v_hard,'providerCalls',0,'objectDeletions',0,
    'backupOrPitrVerified',false,'completeRetentionDeploymentVerified',false,'phase6PaidGo',false);
END
$sweep$;
REVOKE ALL ON FUNCTION clean.phase5_primary_fids_expiry_status_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_primary_fids_expiry_sweep_v39(integer) FROM PUBLIC;
COMMIT;
