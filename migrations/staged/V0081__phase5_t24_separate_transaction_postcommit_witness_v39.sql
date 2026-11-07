-- V0081 STAGED / DISPOSABLE-PG16 ONLY. Never install in production on
-- the presence of code or user spending permission alone.
-- Phase5: independently durable post-COMMIT T24 PRE witness when the LIVE
-- PostgreSQL instance has track_commit_timestamp=off.
--
-- Requires authentic B0062 + staged V0079. One already committed PRE row
-- is read from a SEPARATE restricted transaction. The witness transaction
-- stamps PostgreSQL clock_timestamp() after the PRE becomes visible, and
-- its caller must read back the witness AFTER this transaction COMMIT while
-- the DB clock is still before the original T24 flight cutoff.
-- Not provider-native selected T, operating-leg or legal rights clearance.
CREATE TABLE clean.phase5_t24_postcommit_witness_v39 (
 snapshot_id bigint PRIMARY KEY
   REFERENCES clean.flight_snapshots(id) ON DELETE RESTRICT,
 flight_instance_id text NOT NULL UNIQUE,
 population_query_id text NOT NULL,
 fids_response_hash text NOT NULL CHECK(fids_response_hash ~ '^[a-f0-9]{64}$'),
 source_query_digest text NOT NULL CHECK(source_query_digest ~ '^[a-f0-9]{64}$'),
 rights_review_sha256 text NOT NULL CHECK(rights_review_sha256 ~ '^[a-f0-9]{64}$'),
 selected_t_native_utc timestamptz NOT NULL,
 selected_t_version text NOT NULL,
 t24_cutoff_utc timestamptz NOT NULL,
 frame_hash text NOT NULL CHECK(frame_hash ~ '^[a-f0-9]{64}$'),
 config_hash text NOT NULL CHECK(config_hash ~ '^[a-f0-9]{64}$'),
 post_pre_commit_db_observed_at_utc timestamptz NOT NULL,
 CONSTRAINT p5_t24_witness_selected_t_24h CHECK (
   selected_t_native_utc=t24_cutoff_utc+interval '24 hours')
);

CREATE FUNCTION clean.phase5_t24_witness_before_insert_v39()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,clean
AS $p5witness$
DECLARE
 s clean.flight_snapshots%ROWTYPE;
 q record;
 v_now timestamptz;
BEGIN
 IF NEW.snapshot_id IS NULL THEN
  RAISE EXCEPTION 'P5_T24_WITNESS_MISSING_SNAPSHOT_ID'; END IF;
 SELECT * INTO s FROM clean.flight_snapshots WHERE id=NEW.snapshot_id;
 IF NOT FOUND OR s.prediction_state<>'PRE_DEPARTURE' OR s.horizon<>'T-24h'
   OR s.population_member_id IS NULL
   OR s.selected_t_milestone_utc IS NULL OR s.selected_t_version IS NULL
   OR s.population_query_id IS NULL OR
      s.population_query_id !~ '^[a-f0-9-]{36}$'
   OR s.fids_response_hash IS NULL OR
      s.fids_response_hash !~ '^[a-f0-9]{64}$'
   OR s.frame_hash IS NULL OR s.frame_hash !~ '^[a-f0-9]{64}$'
   OR s.config_hash IS NULL OR s.config_hash !~ '^[a-f0-9]{64}$'
   OR s.selected_t_milestone_utc <>
      s.prediction_cutoff_utc+interval '24 hours'
   OR s.created_at>s.prediction_cutoff_utc
 THEN RAISE EXCEPTION 'P5_T24_WITNESS_SNAPSHOT_PROVENANCE_HOLD'; END IF;
 IF (SELECT count(*) FROM clean.flight_snapshots
     WHERE flight_instance_id=s.flight_instance_id AND horizon='T-24h'
       AND prediction_state='PRE_DEPARTURE')<>1
 THEN RAISE EXCEPTION 'P5_T24_WITNESS_AMBIGUOUS_FROZEN_NATIVE_T'; END IF;

 -- Positive V0079 physical attempt/original and canonical normalized member
 -- still exist and were available before the flight's original cutoff.
 SELECT b.query_digest,b.rights_review_sha256
 INTO q FROM clean.phase5_fids_original_binding_v39 b
 JOIN clean.phase5_fids_physical_attempt_v39 a
   ON a.reservation_sha256=b.reservation_sha256
   AND a.query_digest=b.query_digest
 JOIN clean.phase5_fids_allowed_query_v39 approved
   ON approved.query_digest=b.query_digest
   AND approved.manifest_sha256=b.manifest_sha256
 JOIN clean.fids_query_response r
   ON r.population_query_id=b.population_query_id
   AND r.response_hash=b.response_hash
 JOIN clean.flight_population p
   ON p.population_query_id=b.population_query_id
   AND p.population_member_id=s.population_member_id
   AND p.analytic_identity_id=s.flight_instance_id
   AND p.canonical_flight_instance_id=s.flight_instance_id
 WHERE b.population_query_id::text=s.population_query_id
   AND b.response_hash=s.fids_response_hash
   AND approved.horizon='T-24h'
   AND approved.airport_icao=r.source_airport_icao
   AND p.source_airport_icao=approved.airport_icao
   AND p.population_role='requested_airport_primary'
   AND p.scope_classification='confirmed_core'
   AND p.codeshare_resolution_status='confirmed_operating_leg'
   AND p.source_type='fids'
   AND p.available_at<=s.prediction_cutoff_utc
   AND r.available_at<=s.prediction_cutoff_utc
   AND p.provider_content_expired_at_utc IS NULL
   AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL
   AND b.source_expires_at_utc>clock_timestamp()
 LIMIT 2;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'P5_T24_WITNESS_V0079_BOUND_OPERATING_SOURCE_HOLD'; END IF;

 v_now:=clock_timestamp();
 IF v_now<s.prediction_cutoff_utc-interval '3 minutes'
    OR v_now>=s.prediction_cutoff_utc-interval '2 seconds'
 THEN RAISE EXCEPTION 'P5_T24_WITNESS_LATE_OR_NOT_DUE_DB_CLOCK'; END IF;
 -- Every relevant column is derived from the previously visible COMMITTED
 -- source-bound PRE, never accepted from caller input.
 NEW.flight_instance_id:=s.flight_instance_id;
 NEW.population_query_id:=s.population_query_id;
 NEW.fids_response_hash:=s.fids_response_hash;
 NEW.source_query_digest:=q.query_digest;
 NEW.rights_review_sha256:=q.rights_review_sha256;
 NEW.selected_t_native_utc:=s.selected_t_milestone_utc;
 NEW.selected_t_version:=s.selected_t_version;
 NEW.t24_cutoff_utc:=s.prediction_cutoff_utc;
 NEW.frame_hash:=s.frame_hash;
 NEW.config_hash:=s.config_hash;
 NEW.post_pre_commit_db_observed_at_utc:=v_now;
 RETURN NEW;
END $p5witness$;
CREATE TRIGGER p5_t24_witness_before_insert_v39
BEFORE INSERT ON clean.phase5_t24_postcommit_witness_v39
FOR EACH ROW EXECUTE FUNCTION clean.phase5_t24_witness_before_insert_v39();

CREATE FUNCTION clean.phase5_t24_witness_immutable_v39()
RETURNS trigger LANGUAGE plpgsql
AS $p5immutable$
BEGIN
 RAISE EXCEPTION 'P5_T24_WITNESS_IMMUTABLE_NEVER_UPDATE_OR_DELETE';
END $p5immutable$;
CREATE TRIGGER p5_t24_witness_no_rewrite_v39
BEFORE UPDATE OR DELETE ON clean.phase5_t24_postcommit_witness_v39
FOR EACH ROW EXECUTE FUNCTION clean.phase5_t24_witness_immutable_v39();

REVOKE ALL ON clean.phase5_t24_postcommit_witness_v39 FROM PUBLIC;
-- NO production role GRANT or permission activation here. An independent
-- reviewed installer must choose a unique short-lived witness-only DB user:
-- SELECT on exact V0079/flight snapshot/response/member source tables and
-- SELECT+INSERT only on this witness table; NO snapshot INSERT/UPDATE/DELETE,
-- NO source/attempt mutations and NO public schema write privileges.
