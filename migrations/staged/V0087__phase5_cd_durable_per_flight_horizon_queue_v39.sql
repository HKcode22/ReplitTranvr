-- Phase 5 V0087: REAL durable, additive C+D per-flight/horizon task queue.
-- This is a REVIEWED MIGRATION CANDIDATE, NOT a paid Phase6 release.
-- It is separate from disposable CI-only V0084/V0085/V0086; do not apply
-- those experimental schemas/triggers to team-managed production Neon.
--
-- Schema install is inert: NO worker credentials, NO grants to runtime,
-- NO paid HTTP, NO owner/cron, NO modification to flight_snapshots,
-- NO replacement of historical triggers. Commission separately after CI.
-- All queue control-plane functions revoke PUBLIC EXECUTE in the SAME DDL tx.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

CREATE TABLE clean.phase5_cd_pre_task_v39 (
  task_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  manifest_sha256 text NOT NULL CHECK(manifest_sha256 ~ '^[0-9a-f]{64}$'),
  flight_instance_id text NOT NULL
    CHECK(length(flight_instance_id) BETWEEN 5 AND 200
      AND flight_instance_id ~ '^[A-Za-z0-9_.:|-]+$'),
  horizon text NOT NULL CHECK(horizon IN ('T-24h','T-6h','T-90m')),
  selected_native_t_utc timestamptz NOT NULL,
  prediction_cutoff_utc timestamptz NOT NULL,
  packet_sha256 text NOT NULL CHECK(packet_sha256 ~ '^[0-9a-f]{64}$'),
  source_population_query_id text NOT NULL
    CHECK(length(source_population_query_id) BETWEEN 8 AND 128),
  source_response_sha256 text NOT NULL
    CHECK(source_response_sha256 ~ '^[0-9a-f]{64}$'),
  reviewed_source_rights_sha256 text NOT NULL
    CHECK(reviewed_source_rights_sha256 ~ '^[0-9a-f]{64}$'),
  source_expires_at_utc timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'READY'
    CHECK(state IN ('READY','CLAIMED','WRITE_STARTED_UNKNOWN',
                    'VERIFIED_ON_TIME','MISSED','QUARANTINED')),
  lease_owner text,
  lease_generation bigint NOT NULL DEFAULT 0 CHECK(lease_generation>=0),
  lease_until_utc timestamptz,
  first_write_started_at_utc timestamptz,
  verified_at_utc timestamptz,
  verified_snapshot_id bigint,
  verified_receipt_sha256 text CHECK(verified_receipt_sha256 ~ '^[0-9a-f]{64} timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT phase5_cd_one_canonical_flight_horizon_v39
     UNIQUE(flight_instance_id,horizon),
  CONSTRAINT phase5_cd_native_t_exact_horizon_v39 CHECK (
    prediction_cutoff_utc=selected_native_t_utc-(
      CASE horizon WHEN 'T-24h' THEN INTERVAL '24 hours'
                   WHEN 'T-6h' THEN INTERVAL '6 hours'
                   ELSE INTERVAL '90 minutes' END)),
  CONSTRAINT phase5_cd_lease_columns_coherent_v39 CHECK (
    (state IN ('READY','MISSED')
       AND lease_owner IS NULL AND lease_until_utc IS NULL)
    OR
    (state IN ('CLAIMED','WRITE_STARTED_UNKNOWN','VERIFIED_ON_TIME',
               'QUARANTINED')
       AND lease_owner IS NOT NULL AND lease_until_utc IS NOT NULL
       AND lease_generation>0)),
  CONSTRAINT phase5_cd_verified_proof_coherent_v39 CHECK (
    (state='VERIFIED_ON_TIME')=
       (verified_at_utc IS NOT NULL AND verified_snapshot_id IS NOT NULL
        AND verified_receipt_sha256 IS NOT NULL))
);
CREATE INDEX phase5_cd_pre_task_due_v39
  ON clean.phase5_cd_pre_task_v39(prediction_cutoff_utc,task_id)
  WHERE state='READY';
CREATE INDEX phase5_cd_pre_task_recovery_v39
  ON clean.phase5_cd_pre_task_v39(lease_until_utc,task_id)
  WHERE state IN ('CLAIMED','WRITE_STARTED_UNKNOWN');

-- 1) Immutable scientific/source identity across every lease and retime.
-- 2) Strict state transitions, with no operator ability to turn UNKNOWN into
--    READY or to erase a task. A future reviewed reconcile path is separate.
CREATE FUNCTION clean.phase5_cd_task_immutable_v39() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp
AS $immutable$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_TASK_DELETE_FORBIDDEN';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'READY' OR NEW.lease_owner IS NOT NULL
       OR NEW.lease_until_utc IS NOT NULL OR NEW.lease_generation<>0
       OR NEW.first_write_started_at_utc IS NOT NULL
       OR NEW.verified_at_utc IS NOT NULL
       OR NEW.verified_snapshot_id IS NOT NULL
       OR NEW.verified_receipt_sha256 IS NOT NULL
       OR NEW.created_at_utc IS NULL THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_INSERT_MUST_BE_FROZEN_READY';
    END IF;
    IF NEW.prediction_cutoff_utc <= clock_timestamp()+INTERVAL '2 seconds'
       OR NEW.source_expires_at_utc <= clock_timestamp() THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_NO_RETROSPECTIVE_OR_EXPIRED_SOURCE';
    END IF;
    -- Reuse the exact Stage14 flight/horizon advisory lock shape. Prevent
    -- a queue registration racing Stage14 on this same canonical identity.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('p5-one-flight-pre'),
      pg_catalog.hashtext(NEW.flight_instance_id||'|'||NEW.horizon));
    IF EXISTS(
      SELECT 1 FROM clean.flight_snapshots s
       WHERE s.flight_instance_id=NEW.flight_instance_id
         AND s.horizon=NEW.horizon
    ) THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_EXISTING_PRE_IDENTITY_REFUSED';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.task_id,NEW.manifest_sha256,NEW.flight_instance_id,
         NEW.horizon,NEW.selected_native_t_utc,NEW.prediction_cutoff_utc,
         NEW.packet_sha256,NEW.source_population_query_id,
         NEW.source_response_sha256,NEW.reviewed_source_rights_sha256,
         NEW.source_expires_at_utc,NEW.created_at_utc)
     IS DISTINCT FROM
     ROW(OLD.task_id,OLD.manifest_sha256,OLD.flight_instance_id,
         OLD.horizon,OLD.selected_native_t_utc,OLD.prediction_cutoff_utc,
         OLD.packet_sha256,OLD.source_population_query_id,
         OLD.source_response_sha256,OLD.reviewed_source_rights_sha256,
         OLD.source_expires_at_utc,OLD.created_at_utc)
     THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_FROZEN_IDENTITY_OR_SOURCE_CHANGED';
  END IF;
  IF NOT (
      (OLD.state='READY' AND NEW.state IN ('CLAIMED','MISSED')) OR
      (OLD.state='CLAIMED' AND NEW.state IN
         ('CLAIMED','READY','MISSED','WRITE_STARTED_UNKNOWN')) OR
      (OLD.state='WRITE_STARTED_UNKNOWN' AND NEW.state IN
         ('WRITE_STARTED_UNKNOWN','VERIFIED_ON_TIME','QUARANTINED'))
      ) THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_UNREVIEWED_STATE_TRANSITION';
  END IF;
  IF NEW.lease_generation<OLD.lease_generation
    OR NEW.verified_at_utc IS NOT NULL
       AND NEW.verified_at_utc<OLD.created_at_utc
    OR OLD.first_write_started_at_utc IS NOT NULL
       AND NEW.first_write_started_at_utc
           IS DISTINCT FROM OLD.first_write_started_at_utc
    OR OLD.verified_snapshot_id IS NOT NULL
       AND NEW.verified_snapshot_id
           IS DISTINCT FROM OLD.verified_snapshot_id
    OR OLD.verified_receipt_sha256 IS NOT NULL
       AND NEW.verified_receipt_sha256
           IS DISTINCT FROM OLD.verified_receipt_sha256
  THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_GENERATION_OR_PROOF_INVALID';
  END IF;
  NEW.updated_at_utc:=clock_timestamp();
  RETURN NEW;
END $immutable$;
CREATE TRIGGER phase5_cd_task_immutable_v39
  BEFORE INSERT OR UPDATE OR DELETE ON clean.phase5_cd_pre_task_v39
  FOR EACH ROW EXECUTE FUNCTION clean.phase5_cd_task_immutable_v39();

-- Claim small batches, ONLY within the original Stage14 3-minute due
-- window. No claim for already missed cutoff. DB time is the authority.
-- The signed packet and real source rights are externally reviewed, not
-- authenticated by a SHA field or by this claim function.
CREATE FUNCTION clean.phase5_cd_claim_due_v39(
 p_owner text,p_limit integer DEFAULT 4,p_lease_seconds integer DEFAULT 60
) RETURNS SETOF clean.phase5_cd_pre_task_v39
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $claim$
BEGIN
 IF p_owner IS NULL OR p_owner !~ '^[A-Za-z0-9_.:-]{5,96}$'
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 16
    OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 15 AND 120
 THEN RAISE EXCEPTION 'P5_CD_QUEUE_CLAIM_ARGUMENTS_INVALID'; END IF;
 RETURN QUERY
  WITH chosen AS (
    SELECT t.task_id FROM clean.phase5_cd_pre_task_v39 t
    WHERE t.state='READY'
      AND t.prediction_cutoff_utc-INTERVAL '180 seconds'<=clock_timestamp()
      AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
      AND t.source_expires_at_utc>clock_timestamp()
    ORDER BY t.prediction_cutoff_utc,t.task_id
    FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE clean.phase5_cd_pre_task_v39 t
     SET state='CLAIMED',lease_owner=p_owner,
         lease_generation=t.lease_generation+1,
         lease_until_utc=clock_timestamp()
           +make_interval(secs=>p_lease_seconds)
    FROM chosen c
   WHERE t.task_id=c.task_id
   RETURNING t.*;
END $claim$;

-- Flip to UNKNOWN BEFORE entering the existing Stage14 SQL writer.
-- Once marked, reaper must never silently requeue even if lease expires.
CREATE FUNCTION clean.phase5_cd_mark_write_started_v39(
 p_task_id bigint,p_owner text,p_generation bigint
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $start$
DECLARE moved bigint;
BEGIN
 UPDATE clean.phase5_cd_pre_task_v39 t
    SET state='WRITE_STARTED_UNKNOWN',
        first_write_started_at_utc=clock_timestamp()
  WHERE t.task_id=p_task_id AND t.state='CLAIMED'
    AND t.lease_owner=p_owner AND t.lease_generation=p_generation
    AND t.lease_until_utc>clock_timestamp()+INTERVAL '2 seconds'
    AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
  RETURNING t.task_id INTO moved;
 RETURN moved IS NOT NULL;
END $start$;

-- Finish only after a REAL already-COMMITTED Stage14 row exists, with
-- same selected native T/cutoff and before-cutoff creation clock. This is
-- a DB identity/time proof, NOT independent scientific-source validation.
-- If Stage14's post-COMMIT ACK is uncertain, do not call this without a
-- separately reviewed read-only snapshot-reconciliation receipt.
CREATE FUNCTION clean.phase5_cd_ack_verified_v39(
 p_task_id bigint,p_owner text,p_generation bigint,p_snapshot_id bigint,
 p_postcommit_receipt_sha256 text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $verify$
DECLARE moved bigint;
BEGIN
 IF p_postcommit_receipt_sha256 IS NULL
    OR p_postcommit_receipt_sha256 !~ '^[0-9a-f]{64}
  FROM clean.flight_snapshots s
 WHERE t.task_id=p_task_id
   AND t.state='WRITE_STARTED_UNKNOWN'
   AND t.lease_owner=p_owner AND t.lease_generation=p_generation
   AND t.lease_until_utc>clock_timestamp()
   -- Post-COMMIT readback may finish after cutoff; the Stage14
   -- original commit-before-cutoff review is not this function's proof.
   AND s.id=p_snapshot_id AND s.prediction_state='PRE_DEPARTURE'
   AND s.flight_instance_id=t.flight_instance_id
   AND s.horizon=t.horizon
   AND s.selected_t_milestone_utc=t.selected_native_t_utc
   AND s.prediction_cutoff_utc=t.prediction_cutoff_utc
   AND s.created_at<=t.prediction_cutoff_utc
   AND s.population_query_id::text=t.source_population_query_id
   AND s.fids_response_hash=t.source_response_sha256
   AND NOT EXISTS (
     SELECT 1 FROM clean.flight_snapshots duplicate
       WHERE duplicate.flight_instance_id=t.flight_instance_id
         AND duplicate.horizon=t.horizon
         AND duplicate.id<>s.id)
 RETURNING t.task_id INTO moved;
 RETURN moved IS NOT NULL;
END $verify$;

-- Bounded watchdog: reclaim ONLY lease-expired CLAIMED that has NOT entered
-- Stage14. Once WRITE_STARTED_UNKNOWN, quarantine and retain evidence.
-- READY after cutoff becomes MISSED (never retrospectively PRE).
CREATE FUNCTION clean.phase5_cd_reap_once_v39(p_limit integer DEFAULT 64)
RETURNS TABLE(task_id bigint,new_state text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $reap$
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 256 THEN
  RAISE EXCEPTION 'P5_CD_QUEUE_REAPER_BOUND_INVALID';
 END IF;
 RETURN QUERY
  WITH chosen AS (
    SELECT t.task_id FROM clean.phase5_cd_pre_task_v39 t
    WHERE (t.state IN ('CLAIMED','WRITE_STARTED_UNKNOWN')
           AND t.lease_until_utc<=clock_timestamp())
       OR (t.state='READY'
           AND (t.prediction_cutoff_utc<=clock_timestamp()+INTERVAL '2 seconds'
             OR t.source_expires_at_utc<=clock_timestamp()))
    ORDER BY t.prediction_cutoff_utc,t.task_id
    FOR UPDATE SKIP LOCKED LIMIT p_limit
  ), reaped AS (
   UPDATE clean.phase5_cd_pre_task_v39 t
      SET state=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN 'QUARANTINED'
          WHEN t.prediction_cutoff_utc<=clock_timestamp()+INTERVAL '2 seconds'
            OR t.source_expires_at_utc<=clock_timestamp() THEN 'MISSED'
          ELSE 'READY' END,
       lease_owner=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN t.lease_owner
          ELSE NULL END,
       lease_until_utc=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN t.lease_until_utc
          ELSE NULL END,
       lease_generation=t.lease_generation+CASE
          WHEN t.state='CLAIMED' THEN 1 ELSE 0 END
   FROM chosen c WHERE t.task_id=c.task_id
   RETURNING t.task_id,t.state
  )
  SELECT r.task_id,r.state FROM reaped r;
END $reap$;

-- Strongly hold in production until explicitly reviewed, dedicated
-- NOLOGIN function-owner adoption and service EXECUTE grants. The migration
-- creates real tables and functions but activates ZERO live workers.
REVOKE ALL ON TABLE clean.phase5_cd_pre_task_v39 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_task_immutable_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_reap_once_v39(integer) FROM PUBLIC;
COMMIT;
),
  created_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT phase5_cd_one_canonical_flight_horizon_v39
     UNIQUE(flight_instance_id,horizon),
  CONSTRAINT phase5_cd_native_t_exact_horizon_v39 CHECK (
    prediction_cutoff_utc=selected_native_t_utc-(
      CASE horizon WHEN 'T-24h' THEN INTERVAL '24 hours'
                   WHEN 'T-6h' THEN INTERVAL '6 hours'
                   ELSE INTERVAL '90 minutes' END)),
  CONSTRAINT phase5_cd_lease_columns_coherent_v39 CHECK (
    (state IN ('READY','MISSED')
       AND lease_owner IS NULL AND lease_until_utc IS NULL)
    OR
    (state IN ('CLAIMED','WRITE_STARTED_UNKNOWN','VERIFIED_ON_TIME',
               'QUARANTINED')
       AND lease_owner IS NOT NULL AND lease_until_utc IS NOT NULL
       AND lease_generation>0)),
  CONSTRAINT phase5_cd_verified_proof_coherent_v39 CHECK (
    (state='VERIFIED_ON_TIME')=
       (verified_at_utc IS NOT NULL AND verified_snapshot_id IS NOT NULL))
);
CREATE INDEX phase5_cd_pre_task_due_v39
  ON clean.phase5_cd_pre_task_v39(prediction_cutoff_utc,task_id)
  WHERE state='READY';
CREATE INDEX phase5_cd_pre_task_recovery_v39
  ON clean.phase5_cd_pre_task_v39(lease_until_utc,task_id)
  WHERE state IN ('CLAIMED','WRITE_STARTED_UNKNOWN');

-- 1) Immutable scientific/source identity across every lease and retime.
-- 2) Strict state transitions, with no operator ability to turn UNKNOWN into
--    READY or to erase a task. A future reviewed reconcile path is separate.
CREATE FUNCTION clean.phase5_cd_task_immutable_v39() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp
AS $immutable$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_TASK_DELETE_FORBIDDEN';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'READY' OR NEW.lease_owner IS NOT NULL
       OR NEW.lease_until_utc IS NOT NULL OR NEW.lease_generation<>0
       OR NEW.first_write_started_at_utc IS NOT NULL
       OR NEW.verified_at_utc IS NOT NULL
       OR NEW.verified_snapshot_id IS NOT NULL
       OR NEW.created_at_utc IS NULL THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_INSERT_MUST_BE_FROZEN_READY';
    END IF;
    IF NEW.prediction_cutoff_utc <= clock_timestamp()+INTERVAL '2 seconds'
       OR NEW.source_expires_at_utc <= clock_timestamp() THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_NO_RETROSPECTIVE_OR_EXPIRED_SOURCE';
    END IF;
    -- Reuse the exact Stage14 flight/horizon advisory lock shape. Prevent
    -- a queue registration racing Stage14 on this same canonical identity.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('p5-one-flight-pre'),
      pg_catalog.hashtext(NEW.flight_instance_id||'|'||NEW.horizon));
    IF EXISTS(
      SELECT 1 FROM clean.flight_snapshots s
       WHERE s.flight_instance_id=NEW.flight_instance_id
         AND s.horizon=NEW.horizon
    ) THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_EXISTING_PRE_IDENTITY_REFUSED';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.task_id,NEW.manifest_sha256,NEW.flight_instance_id,
         NEW.horizon,NEW.selected_native_t_utc,NEW.prediction_cutoff_utc,
         NEW.packet_sha256,NEW.source_population_query_id,
         NEW.source_response_sha256,NEW.reviewed_source_rights_sha256,
         NEW.source_expires_at_utc,NEW.created_at_utc)
     IS DISTINCT FROM
     ROW(OLD.task_id,OLD.manifest_sha256,OLD.flight_instance_id,
         OLD.horizon,OLD.selected_native_t_utc,OLD.prediction_cutoff_utc,
         OLD.packet_sha256,OLD.source_population_query_id,
         OLD.source_response_sha256,OLD.reviewed_source_rights_sha256,
         OLD.source_expires_at_utc,OLD.created_at_utc)
     THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_FROZEN_IDENTITY_OR_SOURCE_CHANGED';
  END IF;
  IF NOT (
      (OLD.state='READY' AND NEW.state IN ('CLAIMED','MISSED')) OR
      (OLD.state='CLAIMED' AND NEW.state IN
         ('CLAIMED','READY','MISSED','WRITE_STARTED_UNKNOWN')) OR
      (OLD.state='WRITE_STARTED_UNKNOWN' AND NEW.state IN
         ('WRITE_STARTED_UNKNOWN','VERIFIED_ON_TIME','QUARANTINED'))
      ) THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_UNREVIEWED_STATE_TRANSITION';
  END IF;
  IF NEW.lease_generation<OLD.lease_generation
    OR NEW.verified_at_utc IS NOT NULL
       AND (NEW.verified_at_utc>NEW.prediction_cutoff_utc
           OR NEW.verified_at_utc<OLD.created_at_utc)
    OR OLD.first_write_started_at_utc IS NOT NULL
       AND NEW.first_write_started_at_utc
           IS DISTINCT FROM OLD.first_write_started_at_utc
    OR OLD.verified_snapshot_id IS NOT NULL
       AND NEW.verified_snapshot_id
           IS DISTINCT FROM OLD.verified_snapshot_id
  THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_GENERATION_OR_PROOF_INVALID';
  END IF;
  NEW.updated_at_utc:=clock_timestamp();
  RETURN NEW;
END $immutable$;
CREATE TRIGGER phase5_cd_task_immutable_v39
  BEFORE INSERT OR UPDATE OR DELETE ON clean.phase5_cd_pre_task_v39
  FOR EACH ROW EXECUTE FUNCTION clean.phase5_cd_task_immutable_v39();

-- Claim small batches, ONLY within the original Stage14 3-minute due
-- window. No claim for already missed cutoff. DB time is the authority.
-- The signed packet and real source rights are externally reviewed, not
-- authenticated by a SHA field or by this claim function.
CREATE FUNCTION clean.phase5_cd_claim_due_v39(
 p_owner text,p_limit integer DEFAULT 4,p_lease_seconds integer DEFAULT 60
) RETURNS SETOF clean.phase5_cd_pre_task_v39
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $claim$
BEGIN
 IF p_owner IS NULL OR p_owner !~ '^[A-Za-z0-9_.:-]{5,96}$'
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 16
    OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 15 AND 120
 THEN RAISE EXCEPTION 'P5_CD_QUEUE_CLAIM_ARGUMENTS_INVALID'; END IF;
 RETURN QUERY
  WITH chosen AS (
    SELECT t.task_id FROM clean.phase5_cd_pre_task_v39 t
    WHERE t.state='READY'
      AND t.prediction_cutoff_utc-INTERVAL '180 seconds'<=clock_timestamp()
      AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
      AND t.source_expires_at_utc>clock_timestamp()
    ORDER BY t.prediction_cutoff_utc,t.task_id
    FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE clean.phase5_cd_pre_task_v39 t
     SET state='CLAIMED',lease_owner=p_owner,
         lease_generation=t.lease_generation+1,
         lease_until_utc=clock_timestamp()
           +make_interval(secs=>p_lease_seconds)
    FROM chosen c
   WHERE t.task_id=c.task_id
   RETURNING t.*;
END $claim$;

-- Flip to UNKNOWN BEFORE entering the existing Stage14 SQL writer.
-- Once marked, reaper must never silently requeue even if lease expires.
CREATE FUNCTION clean.phase5_cd_mark_write_started_v39(
 p_task_id bigint,p_owner text,p_generation bigint
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $start$
DECLARE moved bigint;
BEGIN
 UPDATE clean.phase5_cd_pre_task_v39 t
    SET state='WRITE_STARTED_UNKNOWN',
        first_write_started_at_utc=clock_timestamp()
  WHERE t.task_id=p_task_id AND t.state='CLAIMED'
    AND t.lease_owner=p_owner AND t.lease_generation=p_generation
    AND t.lease_until_utc>clock_timestamp()+INTERVAL '2 seconds'
    AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
  RETURNING t.task_id INTO moved;
 RETURN moved IS NOT NULL;
END $start$;

-- Finish only after a REAL already-COMMITTED Stage14 row exists, with
-- same selected native T/cutoff and before-cutoff creation clock. This is
-- a DB identity/time proof, NOT independent scientific-source validation.
-- If Stage14's post-COMMIT ACK is uncertain, do not call this without a
-- separately reviewed read-only snapshot-reconciliation receipt.
CREATE FUNCTION clean.phase5_cd_ack_verified_v39(
 p_task_id bigint,p_owner text,p_generation bigint,p_snapshot_id bigint
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $verify$
DECLARE moved bigint;
BEGIN
 UPDATE clean.phase5_cd_pre_task_v39 t
   SET state='VERIFIED_ON_TIME',
       verified_at_utc=clock_timestamp(),
       verified_snapshot_id=p_snapshot_id
  FROM clean.flight_snapshots s
 WHERE t.task_id=p_task_id
   AND t.state='WRITE_STARTED_UNKNOWN'
   AND t.lease_owner=p_owner AND t.lease_generation=p_generation
   AND t.lease_until_utc>clock_timestamp()
   AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
   AND s.id=p_snapshot_id AND s.prediction_state='PRE_DEPARTURE'
   AND s.flight_instance_id=t.flight_instance_id
   AND s.horizon=t.horizon
   AND s.selected_t_milestone_utc=t.selected_native_t_utc
   AND s.prediction_cutoff_utc=t.prediction_cutoff_utc
   AND s.created_at<=t.prediction_cutoff_utc
   AND s.population_query_id::text=t.source_population_query_id
   AND s.fids_response_hash=t.source_response_sha256
   AND NOT EXISTS (
     SELECT 1 FROM clean.flight_snapshots duplicate
       WHERE duplicate.flight_instance_id=t.flight_instance_id
         AND duplicate.horizon=t.horizon
         AND duplicate.id<>s.id)
 RETURNING t.task_id INTO moved;
 RETURN moved IS NOT NULL;
END $verify$;

-- Bounded watchdog: reclaim ONLY lease-expired CLAIMED that has NOT entered
-- Stage14. Once WRITE_STARTED_UNKNOWN, quarantine and retain evidence.
-- READY after cutoff becomes MISSED (never retrospectively PRE).
CREATE FUNCTION clean.phase5_cd_reap_once_v39(p_limit integer DEFAULT 64)
RETURNS TABLE(task_id bigint,new_state text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $reap$
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 256 THEN
  RAISE EXCEPTION 'P5_CD_QUEUE_REAPER_BOUND_INVALID';
 END IF;
 RETURN QUERY
  WITH chosen AS (
    SELECT t.task_id FROM clean.phase5_cd_pre_task_v39 t
    WHERE (t.state IN ('CLAIMED','WRITE_STARTED_UNKNOWN')
           AND t.lease_until_utc<=clock_timestamp())
       OR (t.state='READY'
           AND (t.prediction_cutoff_utc<=clock_timestamp()+INTERVAL '2 seconds'
             OR t.source_expires_at_utc<=clock_timestamp()))
    ORDER BY t.prediction_cutoff_utc,t.task_id
    FOR UPDATE SKIP LOCKED LIMIT p_limit
  ), reaped AS (
   UPDATE clean.phase5_cd_pre_task_v39 t
      SET state=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN 'QUARANTINED'
          WHEN t.prediction_cutoff_utc<=clock_timestamp()+INTERVAL '2 seconds'
            OR t.source_expires_at_utc<=clock_timestamp() THEN 'MISSED'
          ELSE 'READY' END,
       lease_owner=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN t.lease_owner
          ELSE NULL END,
       lease_until_utc=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN t.lease_until_utc
          ELSE NULL END,
       lease_generation=t.lease_generation+CASE
          WHEN t.state='CLAIMED' THEN 1 ELSE 0 END
   FROM chosen c WHERE t.task_id=c.task_id
   RETURNING t.task_id,t.state
  )
  SELECT r.task_id,r.state FROM reaped r;
END $reap$;

-- Strongly hold in production until explicitly reviewed, dedicated
-- NOLOGIN function-owner adoption and service EXECUTE grants. The migration
-- creates real tables and functions but activates ZERO live workers.
REVOKE ALL ON TABLE clean.phase5_cd_pre_task_v39 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_task_immutable_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_reap_once_v39(integer) FROM PUBLIC;
COMMIT;
 THEN
   RAISE EXCEPTION 'P5_CD_QUEUE_SIGNED_POSTCOMMIT_RECEIPT_REQUIRED';
 END IF;
 UPDATE clean.phase5_cd_pre_task_v39 t
   SET state='VERIFIED_ON_TIME',
       verified_at_utc=clock_timestamp(),
       verified_snapshot_id=p_snapshot_id,
       verified_receipt_sha256=p_postcommit_receipt_sha256
  FROM clean.flight_snapshots s
 WHERE t.task_id=p_task_id
   AND t.state='WRITE_STARTED_UNKNOWN'
   AND t.lease_owner=p_owner AND t.lease_generation=p_generation
   AND t.lease_until_utc>clock_timestamp()
   AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
   AND s.id=p_snapshot_id AND s.prediction_state='PRE_DEPARTURE'
   AND s.flight_instance_id=t.flight_instance_id
   AND s.horizon=t.horizon
   AND s.selected_t_milestone_utc=t.selected_native_t_utc
   AND s.prediction_cutoff_utc=t.prediction_cutoff_utc
   AND s.created_at<=t.prediction_cutoff_utc
   AND s.population_query_id::text=t.source_population_query_id
   AND s.fids_response_hash=t.source_response_sha256
   AND NOT EXISTS (
     SELECT 1 FROM clean.flight_snapshots duplicate
       WHERE duplicate.flight_instance_id=t.flight_instance_id
         AND duplicate.horizon=t.horizon
         AND duplicate.id<>s.id)
 RETURNING t.task_id INTO moved;
 RETURN moved IS NOT NULL;
END $verify$;

-- Bounded watchdog: reclaim ONLY lease-expired CLAIMED that has NOT entered
-- Stage14. Once WRITE_STARTED_UNKNOWN, quarantine and retain evidence.
-- READY after cutoff becomes MISSED (never retrospectively PRE).
CREATE FUNCTION clean.phase5_cd_reap_once_v39(p_limit integer DEFAULT 64)
RETURNS TABLE(task_id bigint,new_state text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $reap$
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 256 THEN
  RAISE EXCEPTION 'P5_CD_QUEUE_REAPER_BOUND_INVALID';
 END IF;
 RETURN QUERY
  WITH chosen AS (
    SELECT t.task_id FROM clean.phase5_cd_pre_task_v39 t
    WHERE (t.state IN ('CLAIMED','WRITE_STARTED_UNKNOWN')
           AND t.lease_until_utc<=clock_timestamp())
       OR (t.state='READY'
           AND (t.prediction_cutoff_utc<=clock_timestamp()+INTERVAL '2 seconds'
             OR t.source_expires_at_utc<=clock_timestamp()))
    ORDER BY t.prediction_cutoff_utc,t.task_id
    FOR UPDATE SKIP LOCKED LIMIT p_limit
  ), reaped AS (
   UPDATE clean.phase5_cd_pre_task_v39 t
      SET state=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN 'QUARANTINED'
          WHEN t.prediction_cutoff_utc<=clock_timestamp()+INTERVAL '2 seconds'
            OR t.source_expires_at_utc<=clock_timestamp() THEN 'MISSED'
          ELSE 'READY' END,
       lease_owner=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN t.lease_owner
          ELSE NULL END,
       lease_until_utc=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN t.lease_until_utc
          ELSE NULL END,
       lease_generation=t.lease_generation+CASE
          WHEN t.state='CLAIMED' THEN 1 ELSE 0 END
   FROM chosen c WHERE t.task_id=c.task_id
   RETURNING t.task_id,t.state
  )
  SELECT r.task_id,r.state FROM reaped r;
END $reap$;

-- Strongly hold in production until explicitly reviewed, dedicated
-- NOLOGIN function-owner adoption and service EXECUTE grants. The migration
-- creates real tables and functions but activates ZERO live workers.
REVOKE ALL ON TABLE clean.phase5_cd_pre_task_v39 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_task_immutable_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_reap_once_v39(integer) FROM PUBLIC;
COMMIT;
),
  created_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT phase5_cd_one_canonical_flight_horizon_v39
     UNIQUE(flight_instance_id,horizon),
  CONSTRAINT phase5_cd_native_t_exact_horizon_v39 CHECK (
    prediction_cutoff_utc=selected_native_t_utc-(
      CASE horizon WHEN 'T-24h' THEN INTERVAL '24 hours'
                   WHEN 'T-6h' THEN INTERVAL '6 hours'
                   ELSE INTERVAL '90 minutes' END)),
  CONSTRAINT phase5_cd_lease_columns_coherent_v39 CHECK (
    (state IN ('READY','MISSED')
       AND lease_owner IS NULL AND lease_until_utc IS NULL)
    OR
    (state IN ('CLAIMED','WRITE_STARTED_UNKNOWN','VERIFIED_ON_TIME',
               'QUARANTINED')
       AND lease_owner IS NOT NULL AND lease_until_utc IS NOT NULL
       AND lease_generation>0)),
  CONSTRAINT phase5_cd_verified_proof_coherent_v39 CHECK (
    (state='VERIFIED_ON_TIME')=
       (verified_at_utc IS NOT NULL AND verified_snapshot_id IS NOT NULL))
);
CREATE INDEX phase5_cd_pre_task_due_v39
  ON clean.phase5_cd_pre_task_v39(prediction_cutoff_utc,task_id)
  WHERE state='READY';
CREATE INDEX phase5_cd_pre_task_recovery_v39
  ON clean.phase5_cd_pre_task_v39(lease_until_utc,task_id)
  WHERE state IN ('CLAIMED','WRITE_STARTED_UNKNOWN');

-- 1) Immutable scientific/source identity across every lease and retime.
-- 2) Strict state transitions, with no operator ability to turn UNKNOWN into
--    READY or to erase a task. A future reviewed reconcile path is separate.
CREATE FUNCTION clean.phase5_cd_task_immutable_v39() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp
AS $immutable$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_TASK_DELETE_FORBIDDEN';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'READY' OR NEW.lease_owner IS NOT NULL
       OR NEW.lease_until_utc IS NOT NULL OR NEW.lease_generation<>0
       OR NEW.first_write_started_at_utc IS NOT NULL
       OR NEW.verified_at_utc IS NOT NULL
       OR NEW.verified_snapshot_id IS NOT NULL
       OR NEW.created_at_utc IS NULL THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_INSERT_MUST_BE_FROZEN_READY';
    END IF;
    IF NEW.prediction_cutoff_utc <= clock_timestamp()+INTERVAL '2 seconds'
       OR NEW.source_expires_at_utc <= clock_timestamp() THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_NO_RETROSPECTIVE_OR_EXPIRED_SOURCE';
    END IF;
    -- Reuse the exact Stage14 flight/horizon advisory lock shape. Prevent
    -- a queue registration racing Stage14 on this same canonical identity.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('p5-one-flight-pre'),
      pg_catalog.hashtext(NEW.flight_instance_id||'|'||NEW.horizon));
    IF EXISTS(
      SELECT 1 FROM clean.flight_snapshots s
       WHERE s.flight_instance_id=NEW.flight_instance_id
         AND s.horizon=NEW.horizon
    ) THEN
      RAISE EXCEPTION 'P5_CD_QUEUE_EXISTING_PRE_IDENTITY_REFUSED';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.task_id,NEW.manifest_sha256,NEW.flight_instance_id,
         NEW.horizon,NEW.selected_native_t_utc,NEW.prediction_cutoff_utc,
         NEW.packet_sha256,NEW.source_population_query_id,
         NEW.source_response_sha256,NEW.reviewed_source_rights_sha256,
         NEW.source_expires_at_utc,NEW.created_at_utc)
     IS DISTINCT FROM
     ROW(OLD.task_id,OLD.manifest_sha256,OLD.flight_instance_id,
         OLD.horizon,OLD.selected_native_t_utc,OLD.prediction_cutoff_utc,
         OLD.packet_sha256,OLD.source_population_query_id,
         OLD.source_response_sha256,OLD.reviewed_source_rights_sha256,
         OLD.source_expires_at_utc,OLD.created_at_utc)
     THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_FROZEN_IDENTITY_OR_SOURCE_CHANGED';
  END IF;
  IF NOT (
      (OLD.state='READY' AND NEW.state IN ('CLAIMED','MISSED')) OR
      (OLD.state='CLAIMED' AND NEW.state IN
         ('CLAIMED','READY','MISSED','WRITE_STARTED_UNKNOWN')) OR
      (OLD.state='WRITE_STARTED_UNKNOWN' AND NEW.state IN
         ('WRITE_STARTED_UNKNOWN','VERIFIED_ON_TIME','QUARANTINED'))
      ) THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_UNREVIEWED_STATE_TRANSITION';
  END IF;
  IF NEW.lease_generation<OLD.lease_generation
    OR NEW.verified_at_utc IS NOT NULL
       AND (NEW.verified_at_utc>NEW.prediction_cutoff_utc
           OR NEW.verified_at_utc<OLD.created_at_utc)
    OR OLD.first_write_started_at_utc IS NOT NULL
       AND NEW.first_write_started_at_utc
           IS DISTINCT FROM OLD.first_write_started_at_utc
    OR OLD.verified_snapshot_id IS NOT NULL
       AND NEW.verified_snapshot_id
           IS DISTINCT FROM OLD.verified_snapshot_id
  THEN
    RAISE EXCEPTION 'P5_CD_QUEUE_GENERATION_OR_PROOF_INVALID';
  END IF;
  NEW.updated_at_utc:=clock_timestamp();
  RETURN NEW;
END $immutable$;
CREATE TRIGGER phase5_cd_task_immutable_v39
  BEFORE INSERT OR UPDATE OR DELETE ON clean.phase5_cd_pre_task_v39
  FOR EACH ROW EXECUTE FUNCTION clean.phase5_cd_task_immutable_v39();

-- Claim small batches, ONLY within the original Stage14 3-minute due
-- window. No claim for already missed cutoff. DB time is the authority.
-- The signed packet and real source rights are externally reviewed, not
-- authenticated by a SHA field or by this claim function.
CREATE FUNCTION clean.phase5_cd_claim_due_v39(
 p_owner text,p_limit integer DEFAULT 4,p_lease_seconds integer DEFAULT 60
) RETURNS SETOF clean.phase5_cd_pre_task_v39
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $claim$
BEGIN
 IF p_owner IS NULL OR p_owner !~ '^[A-Za-z0-9_.:-]{5,96}$'
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 16
    OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 15 AND 120
 THEN RAISE EXCEPTION 'P5_CD_QUEUE_CLAIM_ARGUMENTS_INVALID'; END IF;
 RETURN QUERY
  WITH chosen AS (
    SELECT t.task_id FROM clean.phase5_cd_pre_task_v39 t
    WHERE t.state='READY'
      AND t.prediction_cutoff_utc-INTERVAL '180 seconds'<=clock_timestamp()
      AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
      AND t.source_expires_at_utc>clock_timestamp()
    ORDER BY t.prediction_cutoff_utc,t.task_id
    FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE clean.phase5_cd_pre_task_v39 t
     SET state='CLAIMED',lease_owner=p_owner,
         lease_generation=t.lease_generation+1,
         lease_until_utc=clock_timestamp()
           +make_interval(secs=>p_lease_seconds)
    FROM chosen c
   WHERE t.task_id=c.task_id
   RETURNING t.*;
END $claim$;

-- Flip to UNKNOWN BEFORE entering the existing Stage14 SQL writer.
-- Once marked, reaper must never silently requeue even if lease expires.
CREATE FUNCTION clean.phase5_cd_mark_write_started_v39(
 p_task_id bigint,p_owner text,p_generation bigint
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $start$
DECLARE moved bigint;
BEGIN
 UPDATE clean.phase5_cd_pre_task_v39 t
    SET state='WRITE_STARTED_UNKNOWN',
        first_write_started_at_utc=clock_timestamp()
  WHERE t.task_id=p_task_id AND t.state='CLAIMED'
    AND t.lease_owner=p_owner AND t.lease_generation=p_generation
    AND t.lease_until_utc>clock_timestamp()+INTERVAL '2 seconds'
    AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
  RETURNING t.task_id INTO moved;
 RETURN moved IS NOT NULL;
END $start$;

-- Finish only after a REAL already-COMMITTED Stage14 row exists, with
-- same selected native T/cutoff and before-cutoff creation clock. This is
-- a DB identity/time proof, NOT independent scientific-source validation.
-- If Stage14's post-COMMIT ACK is uncertain, do not call this without a
-- separately reviewed read-only snapshot-reconciliation receipt.
CREATE FUNCTION clean.phase5_cd_ack_verified_v39(
 p_task_id bigint,p_owner text,p_generation bigint,p_snapshot_id bigint
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $verify$
DECLARE moved bigint;
BEGIN
 UPDATE clean.phase5_cd_pre_task_v39 t
   SET state='VERIFIED_ON_TIME',
       verified_at_utc=clock_timestamp(),
       verified_snapshot_id=p_snapshot_id
  FROM clean.flight_snapshots s
 WHERE t.task_id=p_task_id
   AND t.state='WRITE_STARTED_UNKNOWN'
   AND t.lease_owner=p_owner AND t.lease_generation=p_generation
   AND t.lease_until_utc>clock_timestamp()
   AND t.prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds'
   AND s.id=p_snapshot_id AND s.prediction_state='PRE_DEPARTURE'
   AND s.flight_instance_id=t.flight_instance_id
   AND s.horizon=t.horizon
   AND s.selected_t_milestone_utc=t.selected_native_t_utc
   AND s.prediction_cutoff_utc=t.prediction_cutoff_utc
   AND s.created_at<=t.prediction_cutoff_utc
   AND s.population_query_id::text=t.source_population_query_id
   AND s.fids_response_hash=t.source_response_sha256
   AND NOT EXISTS (
     SELECT 1 FROM clean.flight_snapshots duplicate
       WHERE duplicate.flight_instance_id=t.flight_instance_id
         AND duplicate.horizon=t.horizon
         AND duplicate.id<>s.id)
 RETURNING t.task_id INTO moved;
 RETURN moved IS NOT NULL;
END $verify$;

-- Bounded watchdog: reclaim ONLY lease-expired CLAIMED that has NOT entered
-- Stage14. Once WRITE_STARTED_UNKNOWN, quarantine and retain evidence.
-- READY after cutoff becomes MISSED (never retrospectively PRE).
CREATE FUNCTION clean.phase5_cd_reap_once_v39(p_limit integer DEFAULT 64)
RETURNS TABLE(task_id bigint,new_state text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $reap$
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 256 THEN
  RAISE EXCEPTION 'P5_CD_QUEUE_REAPER_BOUND_INVALID';
 END IF;
 RETURN QUERY
  WITH chosen AS (
    SELECT t.task_id FROM clean.phase5_cd_pre_task_v39 t
    WHERE (t.state IN ('CLAIMED','WRITE_STARTED_UNKNOWN')
           AND t.lease_until_utc<=clock_timestamp())
       OR (t.state='READY'
           AND (t.prediction_cutoff_utc<=clock_timestamp()+INTERVAL '2 seconds'
             OR t.source_expires_at_utc<=clock_timestamp()))
    ORDER BY t.prediction_cutoff_utc,t.task_id
    FOR UPDATE SKIP LOCKED LIMIT p_limit
  ), reaped AS (
   UPDATE clean.phase5_cd_pre_task_v39 t
      SET state=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN 'QUARANTINED'
          WHEN t.prediction_cutoff_utc<=clock_timestamp()+INTERVAL '2 seconds'
            OR t.source_expires_at_utc<=clock_timestamp() THEN 'MISSED'
          ELSE 'READY' END,
       lease_owner=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN t.lease_owner
          ELSE NULL END,
       lease_until_utc=CASE
          WHEN t.state='WRITE_STARTED_UNKNOWN' THEN t.lease_until_utc
          ELSE NULL END,
       lease_generation=t.lease_generation+CASE
          WHEN t.state='CLAIMED' THEN 1 ELSE 0 END
   FROM chosen c WHERE t.task_id=c.task_id
   RETURNING t.task_id,t.state
  )
  SELECT r.task_id,r.state FROM reaped r;
END $reap$;

-- Strongly hold in production until explicitly reviewed, dedicated
-- NOLOGIN function-owner adoption and service EXECUTE grants. The migration
-- creates real tables and functions but activates ZERO live workers.
REVOKE ALL ON TABLE clean.phase5_cd_pre_task_v39 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_task_immutable_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_reap_once_v39(integer) FROM PUBLIC;
COMMIT;
