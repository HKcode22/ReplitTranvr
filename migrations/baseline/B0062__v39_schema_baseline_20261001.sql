--
-- PostgreSQL database dump
--

\restrict Sf7GZf11mNAJEMKDmC5uZ2JnJP0vqg5hfjXbwlba0RfJwPLarH7SXoeDeOD4NJZ

-- Dumped from database version 16.15 (eb11870)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: clean; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA clean;


--
-- Name: SCHEMA clean; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA clean IS 'Clean v2/v3 data pipeline — flat tables, no JSONB blobs';


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: bland_call_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bland_call_status AS ENUM (
    'queued',
    'ringing',
    'in_progress',
    'completed',
    'failed',
    'no_answer'
);


--
-- Name: call_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.call_status AS ENUM (
    'requested',
    'scheduled',
    'completed',
    'cancelled'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'processing',
    'paid',
    'failed',
    'pending_manual'
);


--
-- Name: proposal_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proposal_item_type AS ENUM (
    'flight',
    'hotel',
    'other'
);


--
-- Name: proposal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proposal_status AS ENUM (
    'draft',
    'sent',
    'approved',
    'rejected'
);


--
-- Name: trip_request_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trip_request_source AS ENUM (
    'account',
    'guest'
);


--
-- Name: trip_request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trip_request_type AS ENUM (
    'refund',
    'cancel',
    'change'
);


--
-- Name: trip_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trip_type AS ENUM (
    'flight',
    'hotel',
    'both'
);


--
-- Name: apply_phase6_budget_limits_before_insert(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.apply_phase6_budget_limits_before_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE adj RECORD; auth_row clean.adb_phase6_authorization%ROWTYPE; prior_settled BIGINT; run_remaining BIGINT; effective_cap INTEGER;
BEGIN
  IF NEW.run_day_index IS NULL OR NEW.phase6_authorization_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO auth_row FROM clean.adb_phase6_authorization WHERE singleton_key=true AND enabled=true AND revoked_at_utc IS NULL AND authorization_id=NEW.phase6_authorization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REFUSED_PHASE6_AUTH: budget limits have no matching enabled authorization'; END IF;
  IF auth_row.phase6_alert_spend_ceiling IS NULL OR auth_row.daily_soft_stop_margin_credits IS NULL OR auth_row.production_reconcile_tolerance_credits IS NULL OR auth_row.safety_watchdog_poll_ms IS NULL OR auth_row.settlement_initial_wait_seconds IS NULL OR auth_row.settlement_poll_interval_seconds IS NULL OR auth_row.settlement_stable_read_count IS NULL OR auth_row.settlement_timeout_seconds IS NULL THEN RAISE EXCEPTION 'REFUSED_PHASE6_SAFETY_UNFROZEN'; END IF;
  IF EXISTS (SELECT 1 FROM clean.adb_collection_batches b WHERE b.run_day_index IS NOT NULL AND b.run_day_index<NEW.run_day_index AND (b.status<>'CLOSED' OR b.reconciliation_status<>'PASS' OR b.credits_consumed_actual IS NULL)) THEN RAISE EXCEPTION 'REFUSED_PRIOR_PHASE6_UNSETTLED_OR_MISMATCH'; END IF;
  SELECT COALESCE(sum(credits_consumed_actual),0)::BIGINT INTO prior_settled FROM clean.adb_collection_batches WHERE run_day_index IS NOT NULL AND run_day_index<NEW.run_day_index AND status='CLOSED' AND reconciliation_status='PASS';
  run_remaining:=auth_row.phase6_alert_spend_ceiling-prior_settled; IF run_remaining<=0 THEN RAISE EXCEPTION 'REFUSED_PHASE6_RUN_CAP_EXHAUSTED'; END IF;
  effective_cap:=LEAST(NEW.credit_budget::INTEGER,1900,run_remaining::INTEGER);
  SELECT * INTO adj FROM clean.adb_budget_day_adjustment WHERE target_run_day_index=NEW.run_day_index AND applied_at_utc IS NULL;
  IF FOUND THEN effective_cap:=LEAST(effective_cap,GREATEST(0,1900-adj.overshoot_credits)); END IF;
  IF effective_cap<=auth_row.daily_soft_stop_margin_credits THEN RAISE EXCEPTION 'REFUSED_PHASE6_EFFECTIVE_CAP_TOO_SMALL: cap %, soft margin %',effective_cap,auth_row.daily_soft_stop_margin_credits; END IF;
  NEW.credit_budget:=effective_cap;
  IF FOUND THEN UPDATE clean.adb_budget_day_adjustment SET applied_at_utc=now() WHERE source_run_day_index=adj.source_run_day_index; END IF;
  RETURN NEW;
END $$;


--
-- Name: attach_population_member_to_snapshot(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.attach_population_member_to_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.population_member_id IS NULL AND NEW.population_query_id IS NOT NULL THEN
    SELECT p.population_member_id
      INTO NEW.population_member_id
      FROM clean.flight_population p
     WHERE p.population_query_id::text = NEW.population_query_id
       AND p.analytic_identity_id = NEW.flight_instance_id
       AND p.population_role = 'requested_airport_primary'
       AND p.provider_content_expired_at_utc IS NULL
     ORDER BY p.id
     LIMIT 1;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: ensure_population_research_membership(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.ensure_population_research_membership() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.source_type = 'fids' THEN
    INSERT INTO clean.population_research_membership
      (population_member_id,batch_id,source_airport_icao,source_airport_tier,
       window_start_utc,window_end_utc,cutoff_utc,query_direction,population_role,
       source_type,observed_via_webhook,created_at_utc)
    VALUES
      (NEW.population_member_id,NEW.batch_id,NEW.source_airport_icao,NEW.source_airport_tier,
       NEW.window_start_utc,NEW.window_end_utc,NEW.cutoff_utc,NEW.query_direction,NEW.population_role,
       'fids',NEW.observed_via_webhook,NEW.created_at)
    ON CONFLICT (population_member_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: expire_fids_population_from_response(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.expire_fids_population_from_response() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO clean.retention_tombstone
    (surface,record_id,content_hash,expired_at,plan_hash,content_class,source_table,
     content_columns,retention_rule,expiry_run_id,deletion_mode)
  SELECT 'primary',
         'flight_population:' || p.id::text || ':fids_provider_scope_v1',
         parent.content_hash,
         parent.expired_at,
         parent.plan_hash,
         'fids_population_normalized',
         'clean.flight_population',
         ARRAY[
           'flight_number','carrier_iata','carrier_icao','call_sign','dep_airport_icao','dep_airport_iata',
           'arr_airport_icao','arr_airport_iata','dep_scheduled_utc','arr_scheduled_utc','provider_record_key',
           'raw_payload_sha256','coverage_state','population_query_id','from_local','to_local','airport_iana_timezone',
           'scope_classification','codeshare_resolution_status','fids_retrieval_utc','available_at','response_hash',
           'canonical_flight_instance_id','analytic_identity_id','provider_api_version'
         ]::text[],
         parent.retention_rule,
         parent.expiry_run_id,
         'content-nullification'
    FROM clean.flight_population p
    JOIN clean.retention_tombstone parent
      ON parent.surface='primary'
     AND parent.record_id='fids_query_response:' || OLD.population_query_id::text || ':raw_payload'
   WHERE p.population_query_id = OLD.population_query_id
     AND p.source_type='fids'
     AND p.provider_content_expired_at_utc IS NULL
  ON CONFLICT (surface,record_id) DO NOTHING;

  UPDATE clean.flight_population
     SET flight_number=NULL,
         carrier_iata=NULL,
         carrier_icao=NULL,
         call_sign=NULL,
         dep_airport_icao=NULL,
         dep_airport_iata=NULL,
         arr_airport_icao=NULL,
         arr_airport_iata=NULL,
         dep_scheduled_utc=NULL,
         arr_scheduled_utc=NULL,
         provider_record_key=NULL,
         raw_payload_sha256=NULL,
         coverage_state=NULL,
         population_query_id=NULL,
         from_local=NULL,
         to_local=NULL,
         airport_iana_timezone=NULL,
         scope_classification=NULL,
         codeshare_resolution_status=NULL,
         fids_retrieval_utc=NULL,
         available_at=NULL,
         response_hash=NULL,
         canonical_flight_instance_id=NULL,
         analytic_identity_id=NULL,
         provider_api_version=NULL,
         provider_content_expired_at_utc=NEW.raw_expired_at_utc
   WHERE population_query_id = OLD.population_query_id
     AND source_type='fids'
     AND provider_content_expired_at_utc IS NULL;

  RETURN NEW;
END $$;


--
-- Name: guard_phase6_parent_start_time(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.guard_phase6_parent_start_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  auth_row clean.adb_phase6_authorization%ROWTYPE;
  cal_start TIMESTAMPTZ;
  cal_hash TEXT;
  cfg_hash TEXT;
BEGIN
  -- Non-Phase6/legacy rows are outside this guard. Current V3.9 Phase6 parents
  -- always carry both run_day_index and phase6_authorization_id.
  IF NEW.run_day_index IS NULL OR NEW.phase6_authorization_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO auth_row
    FROM clean.adb_phase6_authorization
   WHERE singleton_key=true
     AND enabled=true
     AND revoked_at_utc IS NULL
     AND authorization_id=NEW.phase6_authorization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUSED_PHASE6_AUTH: no matching enabled persistent authorization';
  END IF;
  IF auth_row.start_admission_tolerance_seconds IS NULL THEN
    RAISE EXCEPTION 'REFUSED_START_TOLERANCE_UNFROZEN';
  END IF;

  SELECT scheduled_start_utc, calendar_hash, config_hash
    INTO cal_start, cal_hash, cfg_hash
    FROM clean.adb_phase6_calendar_day
   WHERE run_day_index=NEW.run_day_index;
  IF cal_start IS NULL THEN
    RAISE EXCEPTION 'REFUSED_CALENDAR_START_UNFROZEN: run_day %', NEW.run_day_index;
  END IF;
  IF cal_hash IS DISTINCT FROM auth_row.calendar_hash
     OR cfg_hash IS DISTINCT FROM auth_row.config_hash
     OR NEW.calendar_hash IS DISTINCT FROM auth_row.calendar_hash
     OR NEW.config_hash IS DISTINCT FROM auth_row.config_hash THEN
    RAISE EXCEPTION 'REFUSED_PHASE6_HASH_MISMATCH: run_day %', NEW.run_day_index;
  END IF;
  IF NEW.window_start IS DISTINCT FROM cal_start THEN
    RAISE EXCEPTION 'REFUSED_WINDOW_START_MISMATCH: parent window_start must equal frozen scheduled_start_utc';
  END IF;

  -- Never start early. A late start is allowed only inside the explicitly
  -- frozen execution tolerance; outside it the day is a refusal, not a shifted
  -- or shortened experiment.
  IF clock_timestamp() < cal_start THEN
    RAISE EXCEPTION 'REFUSED_START_EARLY: frozen start is %', cal_start;
  END IF;
  IF clock_timestamp() > cal_start + make_interval(secs => auth_row.start_admission_tolerance_seconds) THEN
    RAISE EXCEPTION 'REFUSED_START_LATE: outside frozen tolerance for start %', cal_start;
  END IF;

  RETURN NEW;
END $$;


--
-- Name: guard_provider_content_blob_ref(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.guard_provider_content_blob_ref() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'provider content blob metadata is append-only';
  END IF;

  IF OLD.deletion_verified_at_utc IS NOT NULL THEN
    RAISE EXCEPTION 'verified provider content blob tombstone is immutable';
  END IF;

  -- Exactly one state transition is allowed: pending object -> externally
  -- deleted and verified absent. Every identity/hash/TTL field stays exact.
  IF OLD.deleted_at_utc IS NULL
     AND OLD.deletion_verified_at_utc IS NULL
     AND OLD.deletion_run_id IS NULL
     AND NEW.deleted_at_utc IS NOT NULL
     AND NEW.deletion_verified_at_utc IS NOT NULL
     AND NEW.deletion_run_id IS NOT NULL
     AND NEW.blob_ref_id IS NOT DISTINCT FROM OLD.blob_ref_id
     AND NEW.storage_kind IS NOT DISTINCT FROM OLD.storage_kind
     AND NEW.contract_version IS NOT DISTINCT FROM OLD.contract_version
     AND NEW.object_name IS NOT DISTINCT FROM OLD.object_name
     AND NEW.content_class IS NOT DISTINCT FROM OLD.content_class
     AND NEW.content_sha256 IS NOT DISTINCT FROM OLD.content_sha256
     AND NEW.content_bytes IS NOT DISTINCT FROM OLD.content_bytes
     AND NEW.source_kind IS NOT DISTINCT FROM OLD.source_kind
     AND NEW.source_record_id IS NOT DISTINCT FROM OLD.source_record_id
     AND NEW.persisted_at_utc IS NOT DISTINCT FROM OLD.persisted_at_utc
     AND NEW.retention_hours IS NOT DISTINCT FROM OLD.retention_hours
     AND NEW.expires_at_utc IS NOT DISTINCT FROM OLD.expires_at_utc
     AND NEW.created_at_utc IS NOT DISTINCT FROM OLD.created_at_utc
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'provider content blob metadata is immutable except one-way verified deletion';
END $$;


--
-- Name: guard_v39_provider_account_expiry(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.guard_v39_provider_account_expiry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  content_present BOOLEAN := false;
BEGIN
  IF TG_TABLE_NAME = 'adb_collection_batches' THEN
    content_present :=
      NEW.balance_before IS NOT NULL OR
      NEW.balance_after IS NOT NULL OR
      NEW.credits_consumed_actual IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'adb_anchor_probe' THEN
    content_present :=
      NEW.subscription_id IS NOT NULL OR
      NEW.balance_before IS NOT NULL OR
      NEW.balance_after IS NOT NULL OR
      NEW.credits_spent IS NOT NULL;
  ELSE
    RETURN NEW;
  END IF;

  IF OLD.provider_account_expired_at_utc IS NOT NULL THEN
    IF NEW.provider_account_expired_at_utc IS DISTINCT FROM OLD.provider_account_expired_at_utc
       OR content_present THEN
      RAISE EXCEPTION 'expired V3.9 provider account scope cannot be restored or expiry timestamp changed';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.provider_account_expired_at_utc IS NOT NULL AND content_present THEN
    RAISE EXCEPTION 'provider_account_expired_at_utc requires protected provider account fields to be cleared';
  END IF;

  RETURN NEW;
END $$;


--
-- Name: guard_v39_provider_scope_expiry(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.guard_v39_provider_scope_expiry() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  content_present boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'raw_delivery' THEN
    content_present :=
      NEW.raw_body IS NOT NULL OR
      NEW.http_request_headers IS NOT NULL OR
      NEW.http_response_body IS NOT NULL OR
      NEW.http_path IS NOT NULL OR
      NEW.error_message IS NOT NULL OR
      NEW.subscription_id IS NOT NULL OR
      NEW.provider_published_utc IS NOT NULL OR
      NEW.adb_delivery_id IS NOT NULL OR
      NEW.adb_cost_credits IS NOT NULL OR
      NEW.notification_id IS NOT NULL OR
      NEW.provider_notification_generated_utc IS NOT NULL OR
      NEW.delivery_attempt_seq_no IS NOT NULL OR
      NEW.delivery_attempt_utc IS NOT NULL OR
      NEW.delivery_attempt_cost_credits IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'raw_delivery_item' THEN
    content_present :=
      NEW.raw_item IS NOT NULL OR
      NEW.flight_number IS NOT NULL OR
      NEW.carrier_iata IS NOT NULL OR
      NEW.carrier_icao IS NOT NULL OR
      NEW.status IS NOT NULL OR
      NEW.status_code IS NOT NULL OR
      NEW.last_updated_utc IS NOT NULL OR
      NEW.departure_scheduled_utc IS NOT NULL OR
      NEW.arrival_scheduled_utc IS NOT NULL OR
      NEW.canonical_flight_instance_id IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'processing_attempt' THEN
    content_present :=
      NEW.validation_errors IS NOT NULL OR
      NEW.parse_errors IS NOT NULL OR
      NEW.storage_errors IS NOT NULL OR
      NEW.error_message IS NOT NULL;
  ELSIF TG_TABLE_NAME = 'adb_ingest_events' THEN
    content_present :=
      NEW.raw_payload IS NOT NULL OR
      NEW.http_metadata IS NOT NULL OR
      NEW.error IS NOT NULL OR
      NEW.provider_published_utc IS NOT NULL OR
      NEW.subscription_id IS NOT NULL OR
      NEW.credits_remaining IS NOT NULL;
  ELSE
    RETURN NEW;
  END IF;

  IF OLD.provider_content_expired_at_utc IS NOT NULL THEN
    IF NEW.provider_content_expired_at_utc IS DISTINCT FROM OLD.provider_content_expired_at_utc
       OR content_present THEN
      RAISE EXCEPTION 'expired V3.9 provider scope cannot be restored or expiry timestamp changed';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.provider_content_expired_at_utc IS NOT NULL AND content_present THEN
    RAISE EXCEPTION 'provider_content_expired_at_utc requires all protected provider fields to be cleared';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: guard_v39_raw_expiry_transition(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.guard_v39_raw_expiry_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  old_content jsonb;
  new_content jsonb;
BEGIN
  IF TG_TABLE_NAME = 'raw_delivery' THEN
    old_content := OLD.raw_body;
    new_content := NEW.raw_body;
  ELSIF TG_TABLE_NAME = 'raw_delivery_item' THEN
    old_content := OLD.raw_item;
    new_content := NEW.raw_item;
  ELSIF TG_TABLE_NAME = 'flight_data_pre_post' THEN
    old_content := OLD.payload_json;
    new_content := NEW.payload_json;
  ELSIF TG_TABLE_NAME = 'adb_ingest_events' THEN
    old_content := OLD.raw_payload;
    new_content := NEW.raw_payload;
  ELSE
    RETURN NEW;
  END IF;

  IF OLD.raw_expired_at_utc IS NOT NULL THEN
    IF NEW.raw_expired_at_utc IS DISTINCT FROM OLD.raw_expired_at_utc OR new_content IS NOT NULL THEN
      RAISE EXCEPTION 'expired V3.9 provider content cannot be restored or expiry timestamp changed';
    END IF;
    RETURN NEW;
  END IF;

  IF old_content IS NOT NULL AND new_content IS NULL AND NEW.raw_expired_at_utc IS NULL THEN
    RAISE EXCEPTION 'provider content may be cleared only with raw_expired_at_utc';
  END IF;
  IF NEW.raw_expired_at_utc IS NOT NULL AND old_content IS NOT NULL AND new_content IS NOT NULL THEN
    RAISE EXCEPTION 'raw_expired_at_utc requires provider content to be cleared';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: guard_webhook_identity_resolution_retention(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.guard_webhook_identity_resolution_retention() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'webhook identity resolution ledger is append-only';
  END IF;

  -- Already-expired rows are fully immutable.
  IF OLD.provider_identity_expired_at_utc IS NOT NULL THEN
    RAISE EXCEPTION 'expired webhook identity resolution row is immutable';
  END IF;

  -- The only permitted UPDATE is the one-way retention transition on a
  -- previously-resolved row. Every audit/provenance field must remain exact.
  IF OLD.resolution_status='resolved'
     AND OLD.flight_instance_id IS NOT NULL
     AND OLD.initial_service_date IS NOT NULL
     AND NEW.flight_instance_id IS NULL
     AND NEW.initial_service_date IS NULL
     AND NEW.provider_identity_expired_at_utc IS NOT NULL
     AND NEW.resolution_id IS NOT DISTINCT FROM OLD.resolution_id
     AND NEW.delivery_id IS NOT DISTINCT FROM OLD.delivery_id
     AND NEW.item_index IS NOT DISTINCT FROM OLD.item_index
     AND NEW.raw_item_sha256 IS NOT DISTINCT FROM OLD.raw_item_sha256
     AND NEW.resolution_status IS NOT DISTINCT FROM OLD.resolution_status
     AND NEW.reason IS NOT DISTINCT FROM OLD.reason
     AND NEW.resolved_at_utc IS NOT DISTINCT FROM OLD.resolved_at_utc
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'webhook identity resolution ledger is append-only except one-way provider identity expiry';
END $$;


--
-- Name: mark_phase6_hard_cap_mismatch(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.mark_phase6_hard_cap_mismatch() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.run_day_index IS NOT NULL AND NEW.credits_consumed_actual IS NOT NULL AND NEW.credits_consumed_actual>NEW.credit_budget THEN
    NEW.reconciliation_status:='MISMATCH'; NEW.stop_reason:=CASE WHEN NEW.stop_reason IS NULL OR NEW.stop_reason='' THEN 'hard_cap_overshoot' WHEN NEW.stop_reason LIKE '%hard_cap_overshoot%' THEN NEW.stop_reason ELSE NEW.stop_reason||';hard_cap_overshoot' END;
  END IF; RETURN NEW;
END $$;


--
-- Name: mark_population_research_membership_captured(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.mark_population_research_membership_captured() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.flight_instance_id IS NULL THEN RETURN NEW; END IF;
  UPDATE clean.population_research_membership m
     SET observed_via_webhook = true,
         first_webhook_captured_at_utc = COALESCE(m.first_webhook_captured_at_utc, NEW.available_at, NEW.received_timestamp_utc)
    FROM clean.flight_population p
   WHERE p.population_member_id = m.population_member_id
     AND p.source_type = 'fids'
     AND p.provider_content_expired_at_utc IS NULL
     AND p.population_role = 'requested_airport_primary'
     AND (p.canonical_flight_instance_id = NEW.flight_instance_id OR p.analytic_identity_id = NEW.flight_instance_id)
     AND p.batch_id IS NOT DISTINCT FROM NEW.batch_id;
  RETURN NEW;
END $$;


--
-- Name: propagate_incident_to_phase6_failure(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.propagate_incident_to_phase6_failure() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE active_batch TEXT;
BEGIN
  SELECT batch_id INTO active_batch FROM clean.adb_collection_batches
   WHERE run_day_index IS NOT NULL AND status IN ('STARTING','ACTIVE')
   ORDER BY run_day_index DESC LIMIT 1;
  IF active_batch IS NOT NULL THEN
    INSERT INTO clean.adb_ingest_events(batch_id,notification_items,delivery_failure,error)
    VALUES(active_batch,0,true,'incident-stop:'||NEW.cause);
  END IF;
  RETURN NEW;
END $$;


--
-- Name: record_phase6_hard_cap_overshoot(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.record_phase6_hard_cap_overshoot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE overshoot INTEGER;
BEGIN
  IF NEW.run_day_index IS NULL OR NEW.credits_consumed_actual IS NULL OR NEW.credits_consumed_actual<=NEW.credit_budget OR OLD.credits_consumed_actual IS NOT DISTINCT FROM NEW.credits_consumed_actual THEN RETURN NEW; END IF;
  overshoot:=(NEW.credits_consumed_actual-NEW.credit_budget)::INTEGER;
  INSERT INTO clean.adb_budget_day_adjustment(source_run_day_index,target_run_day_index,overshoot_credits,operator_required,source_credit_budget,source_settled_spend)
  VALUES(NEW.run_day_index,CASE WHEN NEW.run_day_index<31 THEN NEW.run_day_index+1 ELSE NULL END,overshoot,overshoot>100,NEW.credit_budget::INTEGER,NEW.credits_consumed_actual::INTEGER)
  ON CONFLICT(source_run_day_index) DO UPDATE SET overshoot_credits=EXCLUDED.overshoot_credits,operator_required=EXCLUDED.operator_required,source_credit_budget=EXCLUDED.source_credit_budget,source_settled_spend=EXCLUDED.source_settled_spend;
  INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved) VALUES('reconciliation',now(),jsonb_build_object('kind','hard_cap_overshoot','run_day_index',NEW.run_day_index,'credit_budget',NEW.credit_budget,'settled_spend',NEW.credits_consumed_actual,'overshoot_credits',overshoot,'operator_required',(overshoot>100)),false);
  RETURN NEW;
END $$;


--
-- Name: reject_fids_observation_mutation(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.reject_fids_observation_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'fids_query_response' AND TG_OP = 'UPDATE' THEN
    IF OLD.raw_payload IS NOT NULL
       AND NEW.raw_payload IS NULL
       AND OLD.raw_expired_at_utc IS NULL
       AND NEW.raw_expired_at_utc IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM clean.retention_tombstone t
          WHERE t.surface='primary'
            AND t.record_id='fids_query_response:' || OLD.population_query_id::text || ':raw_payload'
       )
    THEN
      NEW.response_hash := NULL;
      IF (to_jsonb(NEW) - ARRAY['raw_payload','raw_expired_at_utc','response_hash'])
         = (to_jsonb(OLD) - ARRAY['raw_payload','raw_expired_at_utc','response_hash'])
      THEN RETURN NEW; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'flight_population' AND TG_OP = 'UPDATE' THEN
    IF OLD.source_type = 'fids'
       AND OLD.provider_content_expired_at_utc IS NULL
       AND NEW.provider_content_expired_at_utc IS NOT NULL
       AND NEW.flight_number IS NULL AND NEW.carrier_iata IS NULL AND NEW.carrier_icao IS NULL AND NEW.call_sign IS NULL
       AND NEW.dep_airport_icao IS NULL AND NEW.dep_airport_iata IS NULL
       AND NEW.arr_airport_icao IS NULL AND NEW.arr_airport_iata IS NULL
       AND NEW.dep_scheduled_utc IS NULL AND NEW.arr_scheduled_utc IS NULL
       AND NEW.provider_record_key IS NULL AND NEW.raw_payload_sha256 IS NULL AND NEW.coverage_state IS NULL
       AND NEW.population_query_id IS NULL AND NEW.from_local IS NULL AND NEW.to_local IS NULL
       AND NEW.airport_iana_timezone IS NULL AND NEW.scope_classification IS NULL
       AND NEW.codeshare_resolution_status IS NULL AND NEW.fids_retrieval_utc IS NULL
       AND NEW.available_at IS NULL AND NEW.response_hash IS NULL
       AND NEW.canonical_flight_instance_id IS NULL AND NEW.analytic_identity_id IS NULL
       AND NEW.provider_api_version IS NULL
       AND (to_jsonb(NEW) - ARRAY[
         'flight_number','carrier_iata','carrier_icao','call_sign','dep_airport_icao','dep_airport_iata',
         'arr_airport_icao','arr_airport_iata','dep_scheduled_utc','arr_scheduled_utc','provider_record_key',
         'raw_payload_sha256','coverage_state','population_query_id','from_local','to_local','airport_iana_timezone',
         'scope_classification','codeshare_resolution_status','fids_retrieval_utc','available_at','response_hash',
         'canonical_flight_instance_id','analytic_identity_id','provider_api_version','provider_content_expired_at_utc'
       ]) = (to_jsonb(OLD) - ARRAY[
         'flight_number','carrier_iata','carrier_icao','call_sign','dep_airport_icao','dep_airport_iata',
         'arr_airport_icao','arr_airport_iata','dep_scheduled_utc','arr_scheduled_utc','provider_record_key',
         'raw_payload_sha256','coverage_state','population_query_id','from_local','to_local','airport_iana_timezone',
         'scope_classification','codeshare_resolution_status','fids_retrieval_utc','available_at','response_hash',
         'canonical_flight_instance_id','analytic_identity_id','provider_api_version','provider_content_expired_at_utc'
       ])
       AND EXISTS (
         SELECT 1 FROM clean.retention_tombstone t
          WHERE t.surface='primary'
            AND t.record_id='flight_population:' || OLD.id::text || ':fids_provider_scope_v1'
       )
    THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'FIDS observations are append-only except audited provider-content expiry';
END $$;


--
-- Name: reject_phase2g_reconciliation_evidence_mutation(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.reject_phase2g_reconciliation_evidence_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Phase-2G reconciliation evidence is append-only';
END $$;


--
-- Name: reject_phase6_settlement_evidence_mutation(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.reject_phase6_settlement_evidence_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'Phase-6 settlement evidence is append-only'; END $$;


--
-- Name: reject_retention_tombstone_mutation(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.reject_retention_tombstone_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'retention tombstones are append-only';
END $$;


--
-- Name: reject_webhook_identity_resolution_mutation(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.reject_webhook_identity_resolution_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'webhook identity resolution ledger is append-only';
END $$;


--
-- Name: require_phase6_settlement_evidence(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.require_phase6_settlement_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE ev clean.adb_phase6_settlement_evidence%ROWTYPE;
BEGIN
  IF NEW.reconciliation_status IS NULL THEN RETURN NEW; END IF;
  IF NEW.reconciliation_status IS NOT DISTINCT FROM OLD.reconciliation_status
     AND NEW.settled_alert_spend IS NOT DISTINCT FROM OLD.settled_alert_spend
     AND NEW.balance_stable_after IS NOT DISTINCT FROM OLD.balance_stable_after
     AND NEW.notification_items_internal IS NOT DISTINCT FROM OLD.notification_items_internal THEN RETURN NEW; END IF;
  SELECT * INTO ev FROM clean.adb_phase6_settlement_evidence WHERE segment_id=NEW.segment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REFUSED_UNEVIDENCED_SETTLEMENT: segment % has no frozen settlement evidence', NEW.segment_id; END IF;
  IF ev.batch_id IS DISTINCT FROM NEW.batch_id THEN RAISE EXCEPTION 'REFUSED_SETTLEMENT_BATCH_MISMATCH: segment %', NEW.segment_id; END IF;

  IF NEW.reconciliation_status='PASS' THEN
    IF ev.evidence_status <> 'SETTLED_PASS'
       OR NEW.balance_stable_after IS DISTINCT FROM ev.balance_stable_after
       OR NEW.settled_alert_spend IS DISTINCT FROM ev.external_spend
       OR NEW.notification_items_internal IS DISTINCT FROM ev.internal_spend THEN
      RAISE EXCEPTION 'REFUSED_SETTLEMENT_EVIDENCE_MISMATCH: PASS segment %', NEW.segment_id;
    END IF;
  ELSIF NEW.reconciliation_status='MISMATCH' THEN
    IF ev.evidence_status='SETTLED_MISMATCH' THEN
      IF NEW.balance_stable_after IS DISTINCT FROM ev.balance_stable_after
         OR NEW.settled_alert_spend IS DISTINCT FROM ev.external_spend
         OR NEW.notification_items_internal IS DISTINCT FROM ev.internal_spend THEN
        RAISE EXCEPTION 'REFUSED_SETTLEMENT_EVIDENCE_MISMATCH: SETTLED_MISMATCH segment %', NEW.segment_id;
      END IF;
    ELSIF ev.evidence_status='UNRESOLVED' THEN
      IF NEW.balance_stable_after IS NOT NULL
         OR NEW.settled_alert_spend IS NOT NULL
         OR (NEW.notification_items_internal IS NOT NULL AND NEW.notification_items_internal IS DISTINCT FROM ev.internal_spend) THEN
        RAISE EXCEPTION 'REFUSED_SETTLEMENT_EVIDENCE_MISMATCH: UNRESOLVED segment %', NEW.segment_id;
      END IF;
    ELSE
      RAISE EXCEPTION 'REFUSED_SETTLEMENT_EVIDENCE_MISMATCH: MISMATCH segment %', NEW.segment_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'REFUSED_PHASE6_RECONCILIATION_STATUS: %', NEW.reconciliation_status;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: stop_on_phase6_create_uncertainty(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.stop_on_phase6_create_uncertainty() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  parent_id TEXT;
BEGIN
  IF NEW.outcome='REFUSED' AND NEW.reason LIKE 'CREATE_FAILED:%' THEN
    SELECT batch_id INTO parent_id
      FROM clean.adb_collection_batches
     WHERE run_day_index=NEW.run_day_index
       AND status IN ('STARTING','ACTIVE','BLOCKED')
     ORDER BY started_at DESC
     LIMIT 1;

    IF parent_id IS NOT NULL THEN
      UPDATE clean.adb_collection_batches
         SET status='BLOCKED', stop_reason='subscription-create-outcome-unknown'
       WHERE batch_id=parent_id
         AND status IN ('STARTING','ACTIVE');
    END IF;

    INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
    VALUES(
      'reconciliation',now(),
      jsonb_build_object(
        'kind','subscription_create_outcome_unknown',
        'owner','phase6_collection',
        'run_day_index',NEW.run_day_index,
        'batch_id',parent_id,
        'authorization_id',NEW.authorization_id,
        'reason',NEW.reason
      ),
      false
    );
  END IF;
  RETURN NEW;
END $$;


--
-- Name: stop_on_probe_create_uncertainty(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.stop_on_probe_create_uncertainty() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status='probing'
     AND NEW.status='failed'
     AND NEW.stop_reason='subscription_create_failed' THEN
    UPDATE clean.adb_probe_budget_day
       SET state='MISMATCH', closed_at=COALESCE(closed_at,now())
     WHERE probe_budget_day_id=NEW.probe_budget_day_id
       AND state='OPEN';

    INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
    VALUES(
      'reconciliation',now(),
      jsonb_build_object(
        'kind','subscription_create_outcome_unknown',
        'owner','anchor_probe',
        'probe_id',NEW.probe_id,
        'probe_budget_day_id',NEW.probe_budget_day_id,
        'icao',NEW.icao,
        'stage',NEW.stage
      ),
      false
    );
  END IF;
  RETURN NEW;
END $$;


--
-- Name: sync_population_research_outcome_link(); Type: FUNCTION; Schema: clean; Owner: -
--

CREATE FUNCTION clean.sync_population_research_outcome_link() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO clean.population_research_outcome_link(population_member_id,target,label_status,updated_at_utc)
  SELECT DISTINCT s.population_member_id,NEW.target,NEW.label_status,NEW.updated_at
    FROM clean.flight_snapshots s
   WHERE s.flight_instance_id = NEW.flight_instance_id
     AND s.population_member_id IS NOT NULL
  ON CONFLICT (population_member_id,target) DO UPDATE
    SET label_status = EXCLUDED.label_status,
        updated_at_utc = EXCLUDED.updated_at_utc;
  RETURN NEW;
END $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new._updated_at = now();
  return NEW;
end;
$$;


--
-- Name: set_updated_at_metadata(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_metadata() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return NEW;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adb_adaptive_state_history; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_adaptive_state_history (
    history_id bigint NOT NULL,
    icao text NOT NULL,
    state_version integer NOT NULL,
    observation_class text NOT NULL,
    observation_date date,
    yield_score double precision,
    ema_before double precision,
    ema_after double precision,
    m_i_before double precision NOT NULL,
    m_i_after double precision NOT NULL,
    zero_state_before text NOT NULL,
    zero_state_after text NOT NULL,
    state_hash text NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adb_adaptive_state_history_state_hash_check CHECK ((state_hash ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: adb_adaptive_state_history_history_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.adb_adaptive_state_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adb_adaptive_state_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.adb_adaptive_state_history_history_id_seq OWNED BY clean.adb_adaptive_state_history.history_id;


--
-- Name: adb_airport_sampling_state; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_airport_sampling_state (
    icao text NOT NULL,
    ema_yield double precision,
    m_i double precision DEFAULT 1.0 NOT NULL,
    zero_yield_state text DEFAULT 'normal'::text NOT NULL,
    consecutive_zero_yield integer DEFAULT 0 NOT NULL,
    first_zero_yield_date date,
    last_successful_phase6_observation_at timestamp with time zone,
    last_direct_observation_at timestamp with time zone,
    last_selected_at timestamp with time zone,
    last_selected_run_day integer,
    provider_failure boolean DEFAULT false NOT NULL,
    coverage_failed boolean DEFAULT false NOT NULL,
    state_version integer DEFAULT 0 NOT NULL,
    updated_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adb_airport_sampling_state_consecutive_zero_yield_check CHECK ((consecutive_zero_yield >= 0)),
    CONSTRAINT adb_airport_sampling_state_m_i_check CHECK (((m_i >= (0.25)::double precision) AND (m_i <= (1.5)::double precision))),
    CONSTRAINT adb_airport_sampling_state_state_version_check CHECK ((state_version >= 0)),
    CONSTRAINT adb_airport_sampling_state_zero_yield_state_check CHECK ((zero_yield_state = ANY (ARRAY['normal'::text, 'zero_yield_once'::text, 'zero_yield_repeated'::text, 'zero_yield_persistent'::text])))
);


--
-- Name: adb_anchor_probe; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_anchor_probe (
    probe_id integer NOT NULL,
    stage smallint NOT NULL,
    icao text NOT NULL,
    region text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    window_hours double precision NOT NULL,
    subscription_id text,
    balance_before bigint,
    balance_after bigint,
    credits_spent bigint,
    rows_delivered integer,
    unique_flights integer,
    tail_chain_links integer,
    rows_per_hour double precision,
    unique_flights_per_credit double precision,
    tail_chain_links_per_credit double precision,
    stability double precision,
    status text DEFAULT 'completed'::text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    probe_budget_day_id text,
    duration_censored boolean DEFAULT false NOT NULL,
    stop_reason text,
    complete_buckets integer,
    min_stability_buckets integer,
    confirmed_unique_lower integer,
    confirmed_plus_ambiguous_upper integer,
    settlement_reads integer,
    settlement_stable_balance bigint,
    reserved_credits integer DEFAULT 0 NOT NULL,
    internal_send_credits integer,
    stability_status text,
    preprobe_artifact_sha256 text,
    provider_account_expired_at_utc timestamp with time zone,
    runtime_session_id uuid,
    runtime_cleanup_verified_at_utc timestamp with time zone,
    reconciliation_status text,
    provider_content_safe_mode boolean DEFAULT false NOT NULL,
    confirmed_unique_lower_per_credit double precision,
    confirmed_plus_ambiguous_upper_per_credit double precision,
    metric_contract_version text,
    CONSTRAINT adb_anchor_probe_stage_check CHECK ((stage = ANY (ARRAY[1, 2]))),
    CONSTRAINT adb_anchor_probe_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'settling'::text, 'failed'::text, 'probing'::text, 'abandoned'::text])))
);


--
-- Name: adb_anchor_probe_probe_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.adb_anchor_probe_probe_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adb_anchor_probe_probe_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.adb_anchor_probe_probe_id_seq OWNED BY clean.adb_anchor_probe.probe_id;


--
-- Name: adb_budget_day_adjustment; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_budget_day_adjustment (
    source_run_day_index integer NOT NULL,
    target_run_day_index integer,
    overshoot_credits integer NOT NULL,
    operator_required boolean NOT NULL,
    source_credit_budget integer NOT NULL,
    source_settled_spend integer NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    applied_at_utc timestamp with time zone,
    CONSTRAINT adb_budget_day_adjustment_check CHECK ((source_settled_spend > source_credit_budget)),
    CONSTRAINT adb_budget_day_adjustment_check1 CHECK ((((source_run_day_index = 31) AND (target_run_day_index IS NULL)) OR ((source_run_day_index < 31) AND (target_run_day_index = (source_run_day_index + 1))))),
    CONSTRAINT adb_budget_day_adjustment_overshoot_credits_check CHECK ((overshoot_credits > 0)),
    CONSTRAINT adb_budget_day_adjustment_source_credit_budget_check CHECK ((source_credit_budget > 0)),
    CONSTRAINT adb_budget_day_adjustment_source_run_day_index_check CHECK (((source_run_day_index >= 1) AND (source_run_day_index <= 31))),
    CONSTRAINT adb_budget_day_adjustment_target_run_day_index_check CHECK (((target_run_day_index >= 1) AND (target_run_day_index <= 31)))
);


--
-- Name: adb_collection_batches; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_collection_batches (
    batch_id text NOT NULL,
    batch_seq integer NOT NULL,
    random_seed integer NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    credit_budget bigint NOT NULL,
    tier_mix jsonb NOT NULL,
    airports text[] NOT NULL,
    stop_reason text,
    window_shape text,
    anchor_icao text,
    sampling_strategy text,
    balance_before bigint,
    balance_after bigint,
    credits_consumed_actual bigint,
    credits_consumed_internal bigint,
    notification_items_received bigint,
    rows_stored bigint,
    rows_inserted bigint,
    rows_updated bigint,
    delivery_failures bigint,
    reconciliation_status text,
    reconcile_acked boolean DEFAULT false NOT NULL,
    run_day_index integer,
    budget_day_id text,
    calendar_hash text,
    config_hash text,
    experiment_day_id text,
    crossover_group_id text,
    crossover_period integer,
    pair_role text,
    evaluation_partition text,
    phase6_authorization_id text,
    sampling_state_hash text,
    provider_account_expired_at_utc timestamp with time zone
);


--
-- Name: adb_collection_meta; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_collection_meta (
    key text NOT NULL,
    value text NOT NULL
);


--
-- Name: adb_collection_segments; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_collection_segments (
    segment_id text NOT NULL,
    batch_id text NOT NULL,
    run_day_index integer NOT NULL,
    segment_index integer NOT NULL,
    segment_kind text NOT NULL,
    status text NOT NULL,
    segment_start_utc timestamp with time zone NOT NULL,
    segment_end_utc timestamp with time zone NOT NULL,
    balance_before bigint,
    balance_stable_after bigint,
    settled_alert_spend bigint,
    notification_items_internal bigint,
    reconciliation_status text,
    stop_reason text,
    started_at_utc timestamp with time zone,
    ended_at_utc timestamp with time zone,
    CONSTRAINT adb_collection_segments_check CHECK ((segment_end_utc > segment_start_utc)),
    CONSTRAINT adb_collection_segments_segment_index_check CHECK ((segment_index >= 1)),
    CONSTRAINT adb_collection_segments_segment_kind_check CHECK ((segment_kind = ANY (ARRAY['ACTIVE'::text, 'GAP'::text]))),
    CONSTRAINT adb_collection_segments_status_check CHECK ((status = ANY (ARRAY['PLANNED'::text, 'ACTIVE'::text, 'CLOSED'::text, 'FAILED'::text])))
);


--
-- Name: adb_collection_subs; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_collection_subs (
    subscription_id text NOT NULL,
    batch_id text NOT NULL,
    icao text NOT NULL,
    tier text NOT NULL,
    airport_layer_design_probability double precision,
    sampling_weight double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    is_randomized boolean DEFAULT false NOT NULL,
    planned_share double precision,
    segment_id text,
    CONSTRAINT adb_collection_subs_design_probability_rule CHECK ((((is_randomized = true) AND (airport_layer_design_probability IS NOT NULL)) OR ((is_randomized = false) AND (airport_layer_design_probability IS NULL))))
);


--
-- Name: adb_incident_stop; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_incident_stop (
    id bigint NOT NULL,
    cause text NOT NULL,
    occurred_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    detail jsonb,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at_utc timestamp with time zone,
    CONSTRAINT adb_incident_stop_cause_check_v3 CHECK ((cause = ANY (ARRAY['authentication'::text, 'raw-persistence'::text, 'persistence'::text, 'reconciliation'::text, 'deletion'::text, 'segment_activation'::text])))
);


--
-- Name: adb_incident_stop_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.adb_incident_stop_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adb_incident_stop_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.adb_incident_stop_id_seq OWNED BY clean.adb_incident_stop.id;


--
-- Name: adb_ingest_events; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_ingest_events (
    id bigint NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_id text,
    batch_id text,
    notification_items integer DEFAULT 0 NOT NULL,
    rows_stored integer DEFAULT 0 NOT NULL,
    rows_inserted integer DEFAULT 0 NOT NULL,
    rows_updated integer DEFAULT 0 NOT NULL,
    rows_skipped integer DEFAULT 0 NOT NULL,
    delivery_failure boolean DEFAULT false NOT NULL,
    error text,
    credits_remaining integer,
    payload_sha256 text,
    raw_payload jsonb,
    parser_version text,
    schema_version text,
    provider_published_utc timestamp with time zone,
    http_metadata jsonb,
    upsert_outcome text,
    raw_expired_at_utc timestamp with time zone,
    provider_content_expired_at_utc timestamp with time zone
);


--
-- Name: adb_ingest_events_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.adb_ingest_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adb_ingest_events_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.adb_ingest_events_id_seq OWNED BY clean.adb_ingest_events.id;


--
-- Name: adb_phase6_admission_attempt; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_phase6_admission_attempt (
    admission_id bigint NOT NULL,
    attempted_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    run_day_index integer,
    authorization_id text,
    manifest_sha256 text,
    calendar_hash text,
    config_hash text,
    outcome text NOT NULL,
    reason text NOT NULL,
    state_hash text,
    provider_mutations_started boolean DEFAULT false NOT NULL,
    CONSTRAINT adb_phase6_admission_attempt_outcome_check CHECK ((outcome = ANY (ARRAY['ADMITTED'::text, 'REFUSED'::text])))
);


--
-- Name: adb_phase6_admission_attempt_admission_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.adb_phase6_admission_attempt_admission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adb_phase6_admission_attempt_admission_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.adb_phase6_admission_attempt_admission_id_seq OWNED BY clean.adb_phase6_admission_attempt.admission_id;


--
-- Name: adb_phase6_authorization; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_phase6_authorization (
    singleton_key boolean DEFAULT true NOT NULL,
    authorization_id text NOT NULL,
    manifest_sha256 text NOT NULL,
    calendar_hash text NOT NULL,
    config_hash text NOT NULL,
    code_sha text NOT NULL,
    schema_version text NOT NULL,
    phase6_start_date date NOT NULL,
    alert_cap_per_parent_day integer NOT NULL,
    unsettled_burst_margin_credits integer NOT NULL,
    protected_alert_floor integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    predecessor_evidence_ids jsonb NOT NULL,
    authorized_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at_utc timestamp with time zone,
    start_admission_tolerance_seconds integer,
    phase6_alert_spend_ceiling integer,
    daily_soft_stop_margin_credits integer,
    production_reconcile_tolerance_credits integer,
    safety_watchdog_poll_ms integer,
    settlement_initial_wait_seconds integer,
    settlement_poll_interval_seconds integer,
    settlement_stable_read_count integer,
    settlement_timeout_seconds integer,
    CONSTRAINT adb_phase6_authorization_alert_cap_per_parent_day_check CHECK ((alert_cap_per_parent_day > 0)),
    CONSTRAINT adb_phase6_authorization_calendar_hash_check CHECK ((calendar_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT adb_phase6_authorization_check CHECK (((NOT enabled) OR (revoked_at_utc IS NULL))),
    CONSTRAINT adb_phase6_authorization_config_hash_check CHECK ((config_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT adb_phase6_authorization_manifest_sha256_check CHECK ((manifest_sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT adb_phase6_authorization_predecessor_evidence_ids_check CHECK ((jsonb_typeof(predecessor_evidence_ids) = 'array'::text)),
    CONSTRAINT adb_phase6_authorization_predecessor_evidence_ids_check1 CHECK ((jsonb_array_length(predecessor_evidence_ids) > 0)),
    CONSTRAINT adb_phase6_authorization_protected_alert_floor_check CHECK ((protected_alert_floor >= 1000)),
    CONSTRAINT adb_phase6_authorization_safety_values CHECK ((((phase6_alert_spend_ceiling IS NULL) OR ((phase6_alert_spend_ceiling >= 1) AND (phase6_alert_spend_ceiling <= 57900))) AND ((daily_soft_stop_margin_credits IS NULL) OR ((daily_soft_stop_margin_credits >= 0) AND (daily_soft_stop_margin_credits <= 1899))) AND ((production_reconcile_tolerance_credits IS NULL) OR (production_reconcile_tolerance_credits >= 0)) AND ((safety_watchdog_poll_ms IS NULL) OR ((safety_watchdog_poll_ms >= 250) AND (safety_watchdog_poll_ms <= 60000))) AND ((settlement_initial_wait_seconds IS NULL) OR (settlement_initial_wait_seconds >= 0)) AND ((settlement_poll_interval_seconds IS NULL) OR (settlement_poll_interval_seconds > 0)) AND ((settlement_stable_read_count IS NULL) OR (settlement_stable_read_count >= 3)) AND ((settlement_timeout_seconds IS NULL) OR (settlement_timeout_seconds > 0)))),
    CONSTRAINT adb_phase6_authorization_singleton_key_check CHECK (singleton_key),
    CONSTRAINT adb_phase6_authorization_unsettled_burst_margin_credits_check CHECK ((unsettled_burst_margin_credits >= 0)),
    CONSTRAINT adb_phase6_soft_margin_covers_unsettled CHECK (((daily_soft_stop_margin_credits IS NULL) OR (daily_soft_stop_margin_credits >= unsettled_burst_margin_credits))),
    CONSTRAINT adb_phase6_start_tolerance_nonnegative CHECK (((start_admission_tolerance_seconds IS NULL) OR (start_admission_tolerance_seconds >= 0)))
);


--
-- Name: adb_phase6_calendar_day; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_phase6_calendar_day (
    run_day_index integer NOT NULL,
    budget_day_id text NOT NULL,
    calendar_hash text NOT NULL,
    config_hash text NOT NULL,
    date_utc date NOT NULL,
    utc_slot text NOT NULL,
    time_class text NOT NULL,
    window_shape text NOT NULL,
    evaluation_partition text NOT NULL,
    crossover_group_id text,
    crossover_period integer,
    pair_role text,
    draw_type text NOT NULL,
    slot_regions jsonb NOT NULL,
    anchor_icao text NOT NULL,
    pair_airport_set jsonb,
    frozen_draw_seed text NOT NULL,
    frozen_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_start_utc timestamp with time zone,
    active_duration_minutes integer,
    frame_hash text,
    CONSTRAINT adb_phase6_calendar_day_calendar_hash_check CHECK ((calendar_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT adb_phase6_calendar_day_check CHECK ((((crossover_group_id IS NULL) AND (pair_airport_set IS NULL)) OR ((crossover_group_id IS NOT NULL) AND (pair_airport_set IS NOT NULL)))),
    CONSTRAINT adb_phase6_calendar_day_check1 CHECK (((draw_type = 'PAIR_REPLAY'::text) = (crossover_period = 2))),
    CONSTRAINT adb_phase6_calendar_day_config_hash_check CHECK ((config_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT adb_phase6_calendar_day_crossover_period_check CHECK ((crossover_period = ANY (ARRAY[1, 2]))),
    CONSTRAINT adb_phase6_calendar_day_draw_type_check CHECK ((draw_type = ANY (ARRAY['NEW_TEMPLATE'::text, 'PAIR_REPLAY'::text]))),
    CONSTRAINT adb_phase6_calendar_day_pair_role_check CHECK ((pair_role = ANY (ARRAY['control'::text, 'alternative'::text]))),
    CONSTRAINT adb_phase6_calendar_day_run_day_index_check CHECK (((run_day_index >= 1) AND (run_day_index <= 31))),
    CONSTRAINT adb_phase6_calendar_day_slot_regions_check CHECK ((slot_regions ?& ARRAY['HUB'::text, 'MID_A'::text, 'MID_B'::text, 'REGIONAL'::text])),
    CONSTRAINT adb_phase6_calendar_day_window_shape_check CHECK ((window_shape = ANY (ARRAY['4h'::text, '2x2h'::text, 'up-to-6h'::text]))),
    CONSTRAINT adb_phase6_calendar_duration_positive CHECK (((active_duration_minutes IS NULL) OR (active_duration_minutes > 0)))
);


--
-- Name: adb_phase6_safety_heartbeat; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_phase6_safety_heartbeat (
    singleton_key boolean DEFAULT true NOT NULL,
    authorization_id text NOT NULL,
    code_sha text NOT NULL,
    config_hash text NOT NULL,
    watchdog_poll_ms integer NOT NULL,
    process_id integer NOT NULL,
    updated_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adb_phase6_safety_heartbeat_code_sha_check CHECK ((code_sha ~ '^[0-9a-f]{40}$'::text)),
    CONSTRAINT adb_phase6_safety_heartbeat_config_hash_check CHECK ((config_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT adb_phase6_safety_heartbeat_singleton_key_check CHECK (singleton_key),
    CONSTRAINT adb_phase6_safety_heartbeat_watchdog_poll_ms_check CHECK (((watchdog_poll_ms >= 250) AND (watchdog_poll_ms <= 60000)))
);


--
-- Name: adb_phase6_settlement_evidence; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_phase6_settlement_evidence (
    segment_id text NOT NULL,
    batch_id text NOT NULL,
    authorization_id text NOT NULL,
    config_hash text NOT NULL,
    evidence_status text NOT NULL,
    balance_before bigint,
    balance_stable_after bigint,
    external_spend bigint,
    internal_spend bigint NOT NULL,
    discrepancy bigint,
    reconcile_tolerance integer NOT NULL,
    settlement_reads integer NOT NULL,
    settlement_initial_wait_seconds integer NOT NULL,
    settlement_poll_interval_seconds integer NOT NULL,
    settlement_stable_read_count integer NOT NULL,
    settlement_timeout_seconds integer NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adb_phase6_settlement_eviden_settlement_initial_wait_seco_check CHECK ((settlement_initial_wait_seconds >= 0)),
    CONSTRAINT adb_phase6_settlement_eviden_settlement_poll_interval_sec_check CHECK ((settlement_poll_interval_seconds > 0)),
    CONSTRAINT adb_phase6_settlement_eviden_settlement_stable_read_count_check CHECK ((settlement_stable_read_count >= 3)),
    CONSTRAINT adb_phase6_settlement_evidence_check CHECK ((((evidence_status = 'UNRESOLVED'::text) AND (balance_stable_after IS NULL) AND (external_spend IS NULL) AND (discrepancy IS NULL)) OR ((evidence_status = ANY (ARRAY['SETTLED_PASS'::text, 'SETTLED_MISMATCH'::text])) AND (balance_before IS NOT NULL) AND (balance_stable_after IS NOT NULL) AND (external_spend IS NOT NULL) AND (discrepancy IS NOT NULL)))),
    CONSTRAINT adb_phase6_settlement_evidence_config_hash_check CHECK ((config_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT adb_phase6_settlement_evidence_evidence_status_check CHECK ((evidence_status = ANY (ARRAY['SETTLED_PASS'::text, 'SETTLED_MISMATCH'::text, 'UNRESOLVED'::text]))),
    CONSTRAINT adb_phase6_settlement_evidence_internal_spend_check CHECK ((internal_spend >= 0)),
    CONSTRAINT adb_phase6_settlement_evidence_reconcile_tolerance_check CHECK ((reconcile_tolerance >= 0)),
    CONSTRAINT adb_phase6_settlement_evidence_settlement_reads_check CHECK ((settlement_reads >= 0)),
    CONSTRAINT adb_phase6_settlement_evidence_settlement_timeout_seconds_check CHECK ((settlement_timeout_seconds > 0))
);


--
-- Name: adb_probe_budget_day; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_probe_budget_day (
    probe_budget_day_id text NOT NULL,
    state text NOT NULL,
    cap_credits integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    CONSTRAINT adb_probe_budget_day_cap_credits_check CHECK ((cap_credits = 500)),
    CONSTRAINT adb_probe_budget_day_check CHECK ((((state = 'OPEN'::text) AND (closed_at IS NULL)) OR (state <> 'OPEN'::text))),
    CONSTRAINT adb_probe_budget_day_state_check CHECK ((state = ANY (ARRAY['OPEN'::text, 'CLOSED'::text, 'MISMATCH'::text])))
);


--
-- Name: adb_probe_reconciliation_evidence; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_probe_reconciliation_evidence (
    probe_id bigint NOT NULL,
    runtime_session_id uuid NOT NULL,
    stage smallint NOT NULL,
    icao text NOT NULL,
    evidence_status text NOT NULL,
    external_spend_credits integer,
    internal_received_credits integer NOT NULL,
    delivery_gap_credits integer,
    delivery_completeness double precision,
    delivery_count integer NOT NULL,
    notification_items_received integer NOT NULL,
    explicit_cost_delivery_count integer NOT NULL,
    fallback_delivery_count integer NOT NULL,
    cost_item_disagreement_count integer NOT NULL,
    callback_requests_seen integer NOT NULL,
    callback_success_2xx integer NOT NULL,
    callback_failures integer NOT NULL,
    settlement_reads integer NOT NULL,
    max_observed_unsettled_credit_gap integer NOT NULL,
    delivery_completeness_floor double precision NOT NULL,
    window_start_utc timestamp with time zone NOT NULL,
    window_end_utc timestamp with time zone NOT NULL,
    duration_censored boolean NOT NULL,
    stop_reason text,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adb_probe_reconciliation_evi_cost_item_disagreement_count_check CHECK ((cost_item_disagreement_count >= 0)),
    CONSTRAINT adb_probe_reconciliation_evi_explicit_cost_delivery_count_check CHECK ((explicit_cost_delivery_count >= 0)),
    CONSTRAINT adb_probe_reconciliation_evi_max_observed_unsettled_credi_check CHECK ((max_observed_unsettled_credit_gap >= 0)),
    CONSTRAINT adb_probe_reconciliation_evid_delivery_completeness_floor_check CHECK (((delivery_completeness_floor > (0)::double precision) AND (delivery_completeness_floor <= (1)::double precision))),
    CONSTRAINT adb_probe_reconciliation_evid_notification_items_received_check CHECK ((notification_items_received >= 0)),
    CONSTRAINT adb_probe_reconciliation_eviden_internal_received_credits_check CHECK ((internal_received_credits >= 0)),
    CONSTRAINT adb_probe_reconciliation_evidence_callback_failures_check CHECK ((callback_failures >= 0)),
    CONSTRAINT adb_probe_reconciliation_evidence_callback_requests_seen_check CHECK ((callback_requests_seen >= 0)),
    CONSTRAINT adb_probe_reconciliation_evidence_callback_success_2xx_check CHECK ((callback_success_2xx >= 0)),
    CONSTRAINT adb_probe_reconciliation_evidence_check CHECK ((((evidence_status = 'UNRESOLVED'::text) AND (external_spend_credits IS NULL) AND (delivery_gap_credits IS NULL) AND (delivery_completeness IS NULL)) OR ((evidence_status <> 'UNRESOLVED'::text) AND (external_spend_credits IS NOT NULL) AND (external_spend_credits >= 0) AND (delivery_gap_credits = (external_spend_credits - internal_received_credits)) AND (delivery_completeness IS NOT NULL) AND (delivery_completeness >= (0)::double precision)))),
    CONSTRAINT adb_probe_reconciliation_evidence_delivery_count_check CHECK ((delivery_count >= 0)),
    CONSTRAINT adb_probe_reconciliation_evidence_evidence_status_check CHECK ((evidence_status = ANY (ARRAY['MATCH'::text, 'DELIVERY_GAP'::text, 'MISMATCH'::text, 'UNRESOLVED'::text]))),
    CONSTRAINT adb_probe_reconciliation_evidence_fallback_delivery_count_check CHECK ((fallback_delivery_count >= 0)),
    CONSTRAINT adb_probe_reconciliation_evidence_icao_check CHECK ((icao ~ '^[A-Z0-9]{4}$'::text)),
    CONSTRAINT adb_probe_reconciliation_evidence_settlement_reads_check CHECK ((settlement_reads >= 0)),
    CONSTRAINT adb_probe_reconciliation_evidence_stage_check CHECK ((stage = ANY (ARRAY[1, 2])))
);


--
-- Name: adb_rest_attempt_ledger; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_rest_attempt_ledger (
    reservation_id uuid NOT NULL,
    cycle_id text NOT NULL,
    category text NOT NULL,
    units integer NOT NULL,
    attempt_number integer NOT NULL,
    reserved_at timestamp with time zone NOT NULL,
    CONSTRAINT adb_rest_attempt_ledger_attempt_number_check CHECK (((attempt_number >= 1) AND (attempt_number <= 3))),
    CONSTRAINT adb_rest_attempt_ledger_units_check CHECK ((units > 0))
);


--
-- Name: adb_rest_budget_control; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_rest_budget_control (
    category text NOT NULL,
    cycle_id text NOT NULL,
    cap_units integer NOT NULL,
    used_units integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adb_rest_budget_control_cap_units_check CHECK ((cap_units >= 0)),
    CONSTRAINT adb_rest_budget_control_check CHECK ((used_units <= cap_units)),
    CONSTRAINT adb_rest_budget_control_used_units_check CHECK ((used_units >= 0))
);


--
-- Name: adb_sampling_draw; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_sampling_draw (
    draw_id bigint NOT NULL,
    run_day_index integer NOT NULL,
    slot_id text NOT NULL,
    target_region text NOT NULL,
    draw_type text NOT NULL,
    selected_icao text NOT NULL,
    frozen_draw_seed text NOT NULL,
    adaptive_state_hash text,
    probability_vector jsonb,
    airport_layer_design_probability double precision,
    selected_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adb_sampling_draw_airport_layer_design_probability_check CHECK (((airport_layer_design_probability IS NULL) OR ((airport_layer_design_probability > (0)::double precision) AND (airport_layer_design_probability <= (1)::double precision)))),
    CONSTRAINT adb_sampling_draw_check CHECK ((((slot_id = 'REGIONAL'::text) AND (airport_layer_design_probability IS NOT NULL)) OR ((slot_id <> 'REGIONAL'::text) AND (airport_layer_design_probability IS NULL)))),
    CONSTRAINT adb_sampling_draw_draw_type_check CHECK ((draw_type = ANY (ARRAY['NEW_TEMPLATE'::text, 'PAIR_REPLAY'::text]))),
    CONSTRAINT adb_sampling_draw_slot_id_check CHECK ((slot_id = ANY (ARRAY['HUB'::text, 'MID_A'::text, 'MID_B'::text, 'REGIONAL'::text])))
);


--
-- Name: adb_sampling_draw_draw_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.adb_sampling_draw_draw_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adb_sampling_draw_draw_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.adb_sampling_draw_draw_id_seq OWNED BY clean.adb_sampling_draw.draw_id;


--
-- Name: adb_sampling_frame; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_sampling_frame (
    icao text NOT NULL,
    tier text NOT NULL,
    tier_source text NOT NULL,
    traffic_prior double precision DEFAULT 1.0 NOT NULL,
    region text,
    feed_schedule boolean DEFAULT false NOT NULL,
    feed_live boolean DEFAULT false NOT NULL,
    feed_adsb boolean DEFAULT false NOT NULL,
    pre_eligible boolean DEFAULT false NOT NULL,
    post_eligible boolean DEFAULT false NOT NULL,
    in_frame boolean DEFAULT true NOT NULL,
    built_at timestamp with time zone DEFAULT now() NOT NULL,
    region_source text,
    exclusion_reason text,
    frame_version text DEFAULT 'pre-v1'::text NOT NULL,
    frame_hash text,
    frame_row_id bigint NOT NULL,
    last_successful_phase6_observation_at timestamp with time zone,
    tier_verified boolean DEFAULT false NOT NULL,
    traffic_metric_name text,
    traffic_metric_value double precision,
    traffic_metric_units text,
    traffic_reference_hash text,
    country_iso2 text,
    airport_longitude_e double precision,
    airport_timezone text,
    out_degree integer,
    in_degree integer,
    undirected_degree integer,
    effective_carriers double precision,
    intl_share double precision,
    CONSTRAINT adb_sampling_frame_intl_share_range CHECK (((intl_share IS NULL) OR ((intl_share >= (0)::double precision) AND (intl_share <= (1)::double precision)))),
    CONSTRAINT adb_sampling_frame_post_eligible_rule CHECK ((post_eligible = (feed_live OR feed_adsb))),
    CONSTRAINT adb_sampling_frame_pre_eligible_rule CHECK ((pre_eligible = feed_schedule)),
    CONSTRAINT adb_sampling_frame_tier_check_v2 CHECK ((tier = ANY (ARRAY['HUB'::text, 'MID'::text, 'REGIONAL'::text, 'UNCLASSIFIED'::text]))),
    CONSTRAINT adb_sampling_frame_tier_source_check_v2 CHECK ((tier_source = ANY (ARRAY['curated'::text, 'unclassified'::text, 'traffic_reference'::text, 'missing_reference'::text]))),
    CONSTRAINT adb_sampling_frame_traffic_metric_nonnegative CHECK (((traffic_metric_value IS NULL) OR (traffic_metric_value >= (0)::double precision))),
    CONSTRAINT adb_sampling_frame_verified_tier_rule CHECK (((tier_verified = false) OR ((tier = ANY (ARRAY['HUB'::text, 'MID'::text, 'REGIONAL'::text])) AND (traffic_metric_value IS NOT NULL) AND (traffic_reference_hash IS NOT NULL))))
);


--
-- Name: adb_sampling_frame_frame_row_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.adb_sampling_frame_frame_row_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adb_sampling_frame_frame_row_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.adb_sampling_frame_frame_row_id_seq OWNED BY clean.adb_sampling_frame.frame_row_id;


--
-- Name: adb_sampling_frame_registry; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.adb_sampling_frame_registry (
    registry_key text NOT NULL,
    active_frame_version text NOT NULL,
    frame_hash text,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    traffic_reference_hash text,
    region_mapping_hash text,
    tier_hash text,
    traffic_source_name text,
    traffic_source_version text,
    traffic_retrieval_date date,
    reference_period_start date,
    reference_period_end date,
    traffic_metric_name text,
    traffic_metric_units text,
    tier_rule_json jsonb,
    CONSTRAINT adb_sampling_frame_registry_registry_key_check CHECK ((registry_key = 'ACTIVE'::text))
);


--
-- Name: airborne_eligibility_evidence; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.airborne_eligibility_evidence (
    flight_instance_id text NOT NULL,
    population_query_id uuid NOT NULL,
    evidence_source text NOT NULL,
    movement_milestone text NOT NULL,
    evidence_observed_utc timestamp with time zone NOT NULL,
    evidence_available_at timestamp with time zone NOT NULL,
    provider_api_version text,
    evidence_hash text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT airborne_eligibility_clock_order CHECK ((evidence_observed_utc <= evidence_available_at)),
    CONSTRAINT airborne_eligibility_evidence_hash_len CHECK ((length(evidence_hash) = 64))
);


--
-- Name: airborne_quarantine; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.airborne_quarantine (
    quarantine_id bigint NOT NULL,
    raw_event_id bigint NOT NULL,
    flight_instance_id text,
    reason text NOT NULL,
    evidence_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    quarantined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: airborne_quarantine_quarantine_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.airborne_quarantine_quarantine_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: airborne_quarantine_quarantine_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.airborne_quarantine_quarantine_id_seq OWNED BY clean.airborne_quarantine.quarantine_id;


--
-- Name: clean_airborne_points; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.clean_airborne_points (
    id bigint NOT NULL,
    raw_event_id bigint,
    flight_key text NOT NULL,
    event_timestamp timestamp with time zone NOT NULL,
    provider_published_utc timestamp with time zone,
    available_at timestamp with time zone,
    received_timestamp_utc timestamp with time zone,
    latitude double precision,
    longitude double precision,
    altitude_ft double precision,
    ground_speed_kt double precision,
    true_track_deg double precision,
    vsi_fpm double precision,
    on_ground boolean,
    flight_phase text,
    distance_to_destination_km double precision,
    distance_flown_km double precision,
    fraction_of_route_completed double precision,
    qc_flag text DEFAULT 'OK'::text NOT NULL,
    trajectory_gap_seconds integer,
    source_latency_seconds double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    flight_instance_id text
);


--
-- Name: clean_airborne_points_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.clean_airborne_points_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clean_airborne_points_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.clean_airborne_points_id_seq OWNED BY clean.clean_airborne_points.id;


--
-- Name: fids_query_response; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.fids_query_response (
    population_query_id uuid NOT NULL,
    source_airport_icao text NOT NULL,
    query_direction text NOT NULL,
    service_window_start_utc timestamp with time zone NOT NULL,
    service_window_end_utc timestamp with time zone NOT NULL,
    from_local text NOT NULL,
    to_local text NOT NULL,
    airport_iana_timezone text NOT NULL,
    fids_retrieval_utc timestamp with time zone NOT NULL,
    raw_persisted_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    available_at timestamp with time zone NOT NULL,
    response_hash text,
    raw_payload jsonb,
    provider_api_version text NOT NULL,
    fids_protocol_version text NOT NULL,
    openapi_sha256 text NOT NULL,
    raw_expired_at_utc timestamp with time zone,
    provider_blob_ref_id uuid,
    CONSTRAINT fids_query_response_clock_order CHECK (((fids_retrieval_utc <= raw_persisted_at_utc) AND (raw_persisted_at_utc <= available_at))),
    CONSTRAINT fids_query_response_hash_len CHECK ((length(response_hash) = 64)),
    CONSTRAINT fids_query_response_query_direction_check CHECK ((query_direction = ANY (ARRAY['Departure'::text, 'Arrival'::text, 'Both'::text])))
);


--
-- Name: flight_airborne_snapshots; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.flight_airborne_snapshots (
    airborne_snapshot_id bigint NOT NULL,
    flight_id text,
    flight_number text NOT NULL,
    carrier_iata text,
    airline text,
    aircraft_type text,
    callsign text,
    icao24 text,
    registration text,
    prediction_state text DEFAULT 'AIRBORNE'::text NOT NULL,
    event_timestamp timestamp with time zone NOT NULL,
    provider_published_utc timestamp with time zone,
    available_at timestamp with time zone,
    received_timestamp_utc timestamp with time zone,
    origin text,
    destination text,
    current_operational_destination text,
    scheduled_departure timestamp with time zone,
    scheduled_arrival timestamp with time zone,
    scheduled_gate_out timestamp with time zone,
    actual_gate_out timestamp with time zone,
    scheduled_wheels_off timestamp with time zone,
    actual_wheels_off timestamp with time zone,
    scheduled_wheels_on timestamp with time zone,
    actual_wheels_on timestamp with time zone,
    scheduled_gate_in timestamp with time zone,
    actual_gate_in timestamp with time zone,
    milestone_unverified boolean DEFAULT true NOT NULL,
    latitude double precision,
    longitude double precision,
    altitude double precision,
    ground_speed double precision,
    heading double precision,
    vertical_rate double precision,
    on_ground boolean,
    flight_phase text,
    weather_snapshot_id text,
    weather_timestamp_utc timestamp with time zone,
    distance_to_destination double precision,
    distance_flown double precision,
    fraction_of_route_completed double precision,
    eta_provider text,
    eta_model_reference text,
    data_quality_flag text,
    trajectory_gap_seconds integer,
    source_latency_seconds double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    flight_instance_id text,
    prediction_cutoff_utc timestamp with time zone,
    trajectory_prefix_hash text,
    builder_version text
);


--
-- Name: flight_airborne_snapshots_airborne_snapshot_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.flight_airborne_snapshots_airborne_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flight_airborne_snapshots_airborne_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.flight_airborne_snapshots_airborne_snapshot_id_seq OWNED BY clean.flight_airborne_snapshots.airborne_snapshot_id;


--
-- Name: flight_data_pre_post; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.flight_data_pre_post (
    id integer NOT NULL,
    flight_number text NOT NULL,
    carrier_iata text,
    carrier_icao text,
    carrier_name text,
    call_sign text,
    is_cargo boolean,
    status text,
    status_code smallint,
    codeshare_status text,
    last_updated_utc timestamp with time zone,
    gcd_km double precision,
    dep_airport_icao text,
    dep_airport_iata text,
    dep_airport_name text,
    dep_airport_short_name text,
    dep_airport_municipality text,
    dep_airport_country_code text,
    dep_airport_lat double precision,
    dep_airport_lon double precision,
    dep_airport_timezone text,
    dep_scheduled_utc timestamp with time zone,
    dep_scheduled_local text,
    dep_revised_utc timestamp with time zone,
    dep_runway_utc timestamp with time zone,
    dep_terminal text,
    dep_checkin_desk text,
    dep_gate text,
    dep_runway text,
    dep_quality jsonb,
    arr_airport_icao text,
    arr_airport_iata text,
    arr_airport_name text,
    arr_airport_short_name text,
    arr_airport_municipality text,
    arr_airport_country_code text,
    arr_airport_lat double precision,
    arr_airport_lon double precision,
    arr_airport_timezone text,
    arr_scheduled_utc timestamp with time zone,
    arr_scheduled_local text,
    arr_revised_utc timestamp with time zone,
    arr_runway_utc timestamp with time zone,
    arr_terminal text,
    arr_gate text,
    arr_baggage_belt text,
    arr_runway text,
    arr_quality jsonb,
    aircraft_reg text,
    aircraft_mode_s text,
    aircraft_model text,
    loc_lat double precision,
    loc_lon double precision,
    loc_altitude_ft double precision,
    loc_pressure_altitude_ft double precision,
    loc_pressure_hpa double precision,
    loc_ground_speed_kt double precision,
    loc_true_track_deg double precision,
    loc_vsi_fpm integer,
    loc_reported_utc timestamp with time zone,
    data_stage text NOT NULL,
    has_live_location boolean DEFAULT false NOT NULL,
    subscription_id uuid,
    subscription_is_active boolean,
    subscription_billing_type text,
    subscription_activate_before_utc timestamp with time zone,
    subscription_expires_on_utc timestamp with time zone,
    subscription_created_on_utc timestamp with time zone,
    subject_type text,
    subject_id text,
    subscriber_type text,
    subscriber_id text,
    subscription_notices jsonb,
    credits_remaining bigint,
    balance_last_refilled_utc timestamp with time zone,
    balance_last_deducted_utc timestamp with time zone,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    payload_json jsonb,
    dedup_key text NOT NULL,
    sampling_batch_id text,
    airport_tier text,
    airport_layer_design_probability double precision,
    sampling_weight double precision,
    random_seed text,
    collection_window_start timestamp with time zone,
    collection_window_end timestamp with time zone,
    flagged_at timestamp with time zone,
    flag_reason text,
    is_randomized boolean DEFAULT false NOT NULL,
    planned_share double precision,
    payload_sha256 text,
    raw_expired_at_utc timestamp with time zone,
    CONSTRAINT flight_data_pre_post_design_probability_rule CHECK ((((is_randomized = true) AND (airport_layer_design_probability IS NOT NULL)) OR ((is_randomized = false) AND (airport_layer_design_probability IS NULL))))
);


--
-- Name: flight_data_pre_post_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.flight_data_pre_post_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flight_data_pre_post_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.flight_data_pre_post_id_seq OWNED BY clean.flight_data_pre_post.id;


--
-- Name: flight_events; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.flight_events (
    id bigint NOT NULL,
    ingest_event_id bigint,
    batch_id text,
    subscription_id text,
    event_key text NOT NULL,
    flight_number text NOT NULL,
    carrier_iata text,
    carrier_icao text,
    call_sign text,
    aircraft_reg text,
    aircraft_mode_s text,
    aircraft_model text,
    event_timestamp timestamp with time zone,
    provider_published_utc timestamp with time zone,
    available_at timestamp with time zone,
    received_timestamp_utc timestamp with time zone DEFAULT now() NOT NULL,
    data_stage text NOT NULL,
    event_phase text,
    status text,
    scheduled_gate_out timestamp with time zone,
    actual_gate_out timestamp with time zone,
    scheduled_wheels_off timestamp with time zone,
    actual_wheels_off timestamp with time zone,
    scheduled_wheels_on timestamp with time zone,
    actual_wheels_on timestamp with time zone,
    scheduled_gate_in timestamp with time zone,
    actual_gate_in timestamp with time zone,
    milestone_unverified boolean DEFAULT true NOT NULL,
    has_live_location boolean DEFAULT false NOT NULL,
    loc_lat double precision,
    loc_lon double precision,
    loc_altitude_ft double precision,
    loc_pressure_altitude_ft double precision,
    loc_pressure_hpa double precision,
    loc_ground_speed_kt double precision,
    loc_true_track_deg double precision,
    loc_vsi_fpm double precision,
    loc_reported_utc timestamp with time zone,
    distance_to_destination_km double precision,
    distance_flown_km double precision,
    fraction_of_route_completed double precision,
    eta_provider text,
    eta_model_reference text,
    source_latency_seconds double precision,
    trajectory_gap_seconds integer,
    data_quality_flag text,
    payload_sha256 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    flight_instance_id text
);


--
-- Name: flight_events_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.flight_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flight_events_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.flight_events_id_seq OWNED BY clean.flight_events.id;


--
-- Name: flight_outcomes; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.flight_outcomes (
    id bigint NOT NULL,
    flight_instance_id text NOT NULL,
    flight_operational_state text NOT NULL,
    target text NOT NULL,
    label_status text NOT NULL,
    reference_arrival_utc timestamp with time zone,
    recovery_deadline_utc timestamp with time zone,
    opportunities_used integer DEFAULT 0 NOT NULL,
    evidence_json jsonb,
    terminalizer_version text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT flight_outcomes_label_status_check CHECK ((label_status = ANY (ARRAY['pending'::text, 'observed'::text, 'censored'::text, 'missing'::text, 'not_applicable'::text]))),
    CONSTRAINT flight_outcomes_target_check CHECK ((target = ANY (ARRAY['gate_out'::text, 'wheels_off'::text, 'wheels_on'::text, 'gate_in'::text])))
);


--
-- Name: flight_outcomes_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.flight_outcomes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flight_outcomes_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.flight_outcomes_id_seq OWNED BY clean.flight_outcomes.id;


--
-- Name: flight_population; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.flight_population (
    id bigint NOT NULL,
    batch_id text,
    source_airport_icao text NOT NULL,
    source_airport_tier text,
    window_start_utc timestamp with time zone NOT NULL,
    window_end_utc timestamp with time zone NOT NULL,
    cutoff_utc timestamp with time zone NOT NULL,
    flight_number text,
    carrier_iata text,
    carrier_icao text,
    call_sign text,
    dep_airport_icao text,
    dep_airport_iata text,
    arr_airport_icao text,
    arr_airport_iata text,
    dep_scheduled_utc timestamp with time zone,
    arr_scheduled_utc timestamp with time zone,
    source_type text NOT NULL,
    provider_record_key text,
    raw_payload_sha256 text,
    coverage_state text,
    observed_via_webhook boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    population_query_id uuid,
    query_direction text,
    population_role text,
    from_local text,
    to_local text,
    airport_iana_timezone text,
    scope_classification text,
    codeshare_resolution_status text,
    fids_retrieval_utc timestamp with time zone,
    available_at timestamp with time zone,
    response_hash text,
    canonical_flight_instance_id text,
    analytic_identity_id text,
    provider_api_version text,
    fids_protocol_version text,
    openapi_sha256 text,
    population_member_id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_content_expired_at_utc timestamp with time zone
);


--
-- Name: flight_population_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.flight_population_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flight_population_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.flight_population_id_seq OWNED BY clean.flight_population.id;


--
-- Name: flight_snapshots; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.flight_snapshots (
    id bigint NOT NULL,
    flight_instance_id text NOT NULL,
    prediction_state text DEFAULT 'PRE_DEPARTURE'::text NOT NULL,
    horizon text NOT NULL,
    prediction_cutoff_utc timestamp with time zone NOT NULL,
    selected_t_milestone_utc timestamp with time zone,
    selected_t_version text,
    population_query_id text,
    fids_response_hash text,
    schedule_version text,
    frame_hash text,
    config_hash text,
    features_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    missingness_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    builder_version text NOT NULL,
    provenance_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    population_member_id uuid,
    CONSTRAINT flight_snapshots_horizon_check CHECK ((horizon = ANY (ARRAY['T-24h'::text, 'T-6h'::text, 'T-90m'::text])))
);


--
-- Name: flight_snapshots_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.flight_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flight_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.flight_snapshots_id_seq OWNED BY clean.flight_snapshots.id;


--
-- Name: flight_trajectory; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.flight_trajectory (
    id bigint NOT NULL,
    flight_key text NOT NULL,
    flight_number text NOT NULL,
    carrier_iata text,
    first_point_utc timestamp with time zone,
    last_point_utc timestamp with time zone,
    point_count integer DEFAULT 0 NOT NULL,
    trajectory_duration_seconds integer,
    max_gap_seconds integer,
    median_gap_seconds double precision,
    completeness_pct double precision,
    actual_wheels_off timestamp with time zone,
    actual_wheels_on timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    flight_instance_id text
);


--
-- Name: flight_trajectory_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.flight_trajectory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flight_trajectory_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.flight_trajectory_id_seq OWNED BY clean.flight_trajectory.id;


--
-- Name: historical_feature_store; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.historical_feature_store (
    id bigint NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    feature_name text NOT NULL,
    feature_value double precision,
    feature_text text,
    source text NOT NULL,
    source_version text,
    source_timestamp timestamp with time zone,
    information_available_at timestamp with time zone NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone,
    batch_id text,
    payload_sha256 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hfs_availability_check CHECK (((information_available_at <= valid_from) OR (information_available_at IS NOT NULL))),
    CONSTRAINT hfs_entity_check CHECK ((entity_type = ANY (ARRAY['airport'::text, 'route'::text, 'carrier_airport'::text, 'tail'::text, 'od'::text, 'weather'::text]))),
    CONSTRAINT hfs_valid_time_check CHECK (((valid_to IS NULL) OR (valid_to > valid_from)))
);


--
-- Name: historical_feature_store_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.historical_feature_store_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historical_feature_store_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.historical_feature_store_id_seq OWNED BY clean.historical_feature_store.id;


--
-- Name: historical_readiness; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.historical_readiness (
    id bigint NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    history_ready_at timestamp with time zone NOT NULL,
    bootstrap_end timestamp with time zone,
    earliest_snapshot_cutoff timestamp with time zone,
    lookback_days integer DEFAULT 7,
    verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: historical_readiness_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.historical_readiness_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historical_readiness_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.historical_readiness_id_seq OWNED BY clean.historical_readiness.id;


--
-- Name: monitored_flights_v2; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.monitored_flights_v2 (
    id integer NOT NULL,
    flight_number text NOT NULL,
    carrier_iata text NOT NULL,
    departure_date date NOT NULL,
    departure_time text,
    departure_time_utc timestamp without time zone,
    origin_iata text NOT NULL,
    destination_iata text NOT NULL,
    origin_name text,
    destination_name text,
    status text DEFAULT 'active'::text,
    risk_score integer,
    risk_tier text,
    last_checked_at timestamp without time zone,
    red_tier_first_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    confirmation_alert_sent_at timestamp without time zone,
    resolved_status text,
    resolved_delay_minutes integer,
    resolved_at timestamp without time zone,
    agency_resolved_at timestamp without time zone,
    tail_number text,
    equipment_type text,
    equipment_group text,
    is_test boolean DEFAULT false,
    agency_id integer,
    created_at timestamp without time zone DEFAULT now(),
    raw_api_data jsonb,
    raw_api_sha256 text,
    raw_expired_at_utc timestamp with time zone,
    CONSTRAINT monitored_flights_v2_risk_tier_check CHECK ((risk_tier = ANY (ARRAY['green'::text, 'amber'::text, 'red'::text]))),
    CONSTRAINT monitored_flights_v2_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text, 'archived'::text])))
);


--
-- Name: TABLE monitored_flights_v2; Type: COMMENT; Schema: clean; Owner: -
--

COMMENT ON TABLE clean.monitored_flights_v2 IS 'Clean v2 flight table — one row per flight, no JSONB for core fields';


--
-- Name: monitored_flights_v2_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.monitored_flights_v2_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monitored_flights_v2_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.monitored_flights_v2_id_seq OWNED BY clean.monitored_flights_v2.id;


--
-- Name: population_research_membership; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.population_research_membership (
    population_member_id uuid NOT NULL,
    batch_id text,
    source_airport_icao text NOT NULL,
    source_airport_tier text,
    window_start_utc timestamp with time zone NOT NULL,
    window_end_utc timestamp with time zone NOT NULL,
    cutoff_utc timestamp with time zone NOT NULL,
    query_direction text,
    population_role text,
    source_type text NOT NULL,
    observed_via_webhook boolean DEFAULT false NOT NULL,
    first_webhook_captured_at_utc timestamp with time zone,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT population_research_membership_source_type_check CHECK ((source_type = 'fids'::text))
);


--
-- Name: population_research_outcome_link; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.population_research_outcome_link (
    population_member_id uuid NOT NULL,
    target text NOT NULL,
    label_status text NOT NULL,
    updated_at_utc timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prepaid_probe_delivery_runtime; Type: TABLE; Schema: clean; Owner: -
--

CREATE UNLOGGED TABLE clean.prepaid_probe_delivery_runtime (
    session_id uuid NOT NULL,
    delivery_id text NOT NULL,
    blob_ref_id uuid NOT NULL,
    raw_body_sha256 text NOT NULL,
    provider_subscription_id text,
    received_at_utc timestamp with time zone NOT NULL,
    provider_notification_generated_utc timestamp with time zone,
    delivery_attempt_seq_no integer,
    delivery_attempt_utc timestamp with time zone,
    delivery_attempt_cost_credits numeric,
    notification_items integer NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prepaid_probe_delivery_runtime_notification_items_check CHECK ((notification_items >= 0)),
    CONSTRAINT prepaid_probe_delivery_runtime_raw_body_sha256_check CHECK ((raw_body_sha256 ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: prepaid_probe_item_runtime; Type: TABLE; Schema: clean; Owner: -
--

CREATE UNLOGGED TABLE clean.prepaid_probe_item_runtime (
    session_id uuid NOT NULL,
    delivery_id text NOT NULL,
    item_index integer NOT NULL,
    raw_item_sha256 text NOT NULL,
    flight_number text,
    aircraft_reg text,
    codeshare_status text,
    runtime_flight_key text,
    received_at_utc timestamp with time zone NOT NULL,
    provider_flight_id text,
    callsign text,
    operating_carrier text,
    operating_flight_number text,
    origin_icao text,
    destination_icao text,
    origin_time_zone text,
    scheduled_gate_out_utc timestamp with time zone,
    scheduled_gate_in_utc timestamp with time zone,
    flight_instance_id text,
    initial_service_date date,
    provisional_identity_key text,
    codeshare_resolution_status text,
    identity_resolution_status text,
    CONSTRAINT prepaid_probe_item_runtime_item_index_check CHECK ((item_index >= 0)),
    CONSTRAINT prepaid_probe_item_runtime_raw_item_sha256_check CHECK ((raw_item_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT prepaid_probe_item_runtime_runtime_flight_key_check CHECK (((runtime_flight_key IS NULL) OR (runtime_flight_key ~ '^[a-f0-9]{64}$'::text)))
);


--
-- Name: prepaid_probe_session_runtime; Type: TABLE; Schema: clean; Owner: -
--

CREATE UNLOGGED TABLE clean.prepaid_probe_session_runtime (
    session_id uuid NOT NULL,
    owner_kind text NOT NULL,
    owner_probe_id integer,
    stage smallint,
    icao text,
    provider_subscription_id text,
    state text DEFAULT 'armed'::text NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    expires_at_utc timestamp with time zone NOT NULL,
    last_delivery_at_utc timestamp with time zone,
    callback_requests_seen integer DEFAULT 0 NOT NULL,
    callback_success_2xx integer DEFAULT 0 NOT NULL,
    callback_failures integer DEFAULT 0 NOT NULL,
    CONSTRAINT prepaid_probe_session_runtime_callback_failures_check CHECK ((callback_failures >= 0)),
    CONSTRAINT prepaid_probe_session_runtime_callback_requests_seen_check CHECK ((callback_requests_seen >= 0)),
    CONSTRAINT prepaid_probe_session_runtime_callback_success_2xx_check CHECK ((callback_success_2xx >= 0)),
    CONSTRAINT prepaid_probe_session_runtime_check CHECK ((expires_at_utc > created_at_utc)),
    CONSTRAINT prepaid_probe_session_runtime_check1 CHECK ((expires_at_utc <= (created_at_utc + '24:00:00'::interval))),
    CONSTRAINT prepaid_probe_session_runtime_check2 CHECK ((((owner_kind = 'anchor_probe'::text) AND (owner_probe_id IS NOT NULL) AND (stage = ANY (ARRAY[1, 2])) AND (icao IS NOT NULL)) OR ((owner_kind = 'phase2_safety_smoke'::text) AND (stage IS NULL)))),
    CONSTRAINT prepaid_probe_session_runtime_owner_kind_check CHECK ((owner_kind = ANY (ARRAY['phase2_safety_smoke'::text, 'anchor_probe'::text]))),
    CONSTRAINT prepaid_probe_session_runtime_stage_check CHECK (((stage IS NULL) OR (stage = ANY (ARRAY[1, 2])))),
    CONSTRAINT prepaid_probe_session_runtime_state_check CHECK ((state = ANY (ARRAY['armed'::text, 'active'::text, 'settling'::text, 'completed'::text, 'failed'::text, 'abandoned'::text])))
);


--
-- Name: processing_attempt; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.processing_attempt (
    id bigint NOT NULL,
    delivery_id text NOT NULL,
    attempt_index integer DEFAULT 1 NOT NULL,
    parser_version text NOT NULL,
    schema_version text,
    outcome text NOT NULL,
    items_received integer DEFAULT 0,
    items_parsed integer DEFAULT 0,
    items_stored integer DEFAULT 0,
    items_skipped integer DEFAULT 0,
    items_failed integer DEFAULT 0,
    validation_errors jsonb,
    parse_errors jsonb,
    storage_errors jsonb,
    error_message text,
    started_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    completed_at_utc timestamp with time zone,
    duration_ms integer,
    upsert_result jsonb,
    research_events_appended boolean DEFAULT false,
    ingest_event_written boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_content_expired_at_utc timestamp with time zone
);


--
-- Name: processing_attempt_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.processing_attempt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processing_attempt_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.processing_attempt_id_seq OWNED BY clean.processing_attempt.id;


--
-- Name: provider_content_blob_ref; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.provider_content_blob_ref (
    blob_ref_id uuid NOT NULL,
    storage_kind text DEFAULT 'replit_app_storage'::text NOT NULL,
    contract_version text DEFAULT 'provider-blob-contract-v39@1.0.0'::text NOT NULL,
    object_name text NOT NULL,
    content_class text NOT NULL,
    content_sha256 text NOT NULL,
    content_bytes bigint NOT NULL,
    source_kind text NOT NULL,
    source_record_id text NOT NULL,
    persisted_at_utc timestamp with time zone NOT NULL,
    retention_hours integer NOT NULL,
    expires_at_utc timestamp with time zone NOT NULL,
    deleted_at_utc timestamp with time zone,
    deletion_verified_at_utc timestamp with time zone,
    deletion_run_id text,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT provider_blob_delete_shape CHECK ((((deleted_at_utc IS NULL) AND (deletion_verified_at_utc IS NULL) AND (deletion_run_id IS NULL)) OR ((deleted_at_utc IS NOT NULL) AND (deletion_verified_at_utc IS NOT NULL) AND (deletion_run_id IS NOT NULL)))),
    CONSTRAINT provider_blob_expiry_exact CHECK ((expires_at_utc = (persisted_at_utc + ((retention_hours)::double precision * '01:00:00'::interval)))),
    CONSTRAINT provider_content_blob_ref_check CHECK ((((content_class = 'raw_provider_content'::text) AND ((retention_hours >= 1) AND (retention_hours <= 168))) OR ((content_class = 'live_fids_cache'::text) AND ((retention_hours >= 1) AND (retention_hours <= 24))))),
    CONSTRAINT provider_content_blob_ref_content_bytes_check CHECK ((content_bytes >= 0)),
    CONSTRAINT provider_content_blob_ref_content_class_check CHECK ((content_class = ANY (ARRAY['raw_provider_content'::text, 'live_fids_cache'::text]))),
    CONSTRAINT provider_content_blob_ref_content_sha256_check CHECK ((content_sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT provider_content_blob_ref_contract_version_check CHECK ((contract_version = 'provider-blob-contract-v39@1.0.0'::text)),
    CONSTRAINT provider_content_blob_ref_object_name_check CHECK ((object_name ~ '^v39/provider/(raw_provider_content|live_fids_cache)/[0-9a-f]{2}/[0-9a-f-]{36}\.blob$'::text)),
    CONSTRAINT provider_content_blob_ref_source_kind_check CHECK ((source_kind = ANY (ARRAY['webhook'::text, 'fids'::text]))),
    CONSTRAINT provider_content_blob_ref_storage_kind_check CHECK ((storage_kind = 'replit_app_storage'::text))
);


--
-- Name: raw_airborne_events; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.raw_airborne_events (
    id bigint NOT NULL,
    ingest_event_id bigint,
    batch_id text,
    subscription_id text,
    flight_number text NOT NULL,
    carrier_iata text,
    carrier_icao text,
    call_sign text,
    aircraft_reg text,
    aircraft_mode_s text,
    aircraft_model text,
    icao24 text,
    event_key text NOT NULL,
    event_timestamp timestamp with time zone,
    loc_reported_utc timestamp with time zone,
    provider_published_utc timestamp with time zone,
    available_at timestamp with time zone,
    received_timestamp_utc timestamp with time zone DEFAULT now() NOT NULL,
    source_latency_seconds double precision,
    scheduled_gate_out timestamp with time zone,
    actual_gate_out timestamp with time zone,
    scheduled_wheels_off timestamp with time zone,
    actual_wheels_off timestamp with time zone,
    scheduled_wheels_on timestamp with time zone,
    actual_wheels_on timestamp with time zone,
    scheduled_gate_in timestamp with time zone,
    actual_gate_in timestamp with time zone,
    milestone_unverified boolean DEFAULT true NOT NULL,
    latitude double precision,
    longitude double precision,
    altitude_ft double precision,
    pressure_altitude_ft double precision,
    pressure_hpa double precision,
    ground_speed_kt double precision,
    true_track_deg double precision,
    vsi_fpm double precision,
    on_ground boolean,
    flight_phase text,
    distance_to_destination_km double precision,
    distance_flown_km double precision,
    fraction_of_route_completed double precision,
    weather_snapshot_id text,
    eta_provider text,
    eta_model_reference text,
    data_quality_flag text,
    trajectory_gap_seconds integer,
    payload_sha256 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    flight_instance_id text
);


--
-- Name: raw_airborne_events_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.raw_airborne_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: raw_airborne_events_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.raw_airborne_events_id_seq OWNED BY clean.raw_airborne_events.id;


--
-- Name: raw_delivery; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.raw_delivery (
    id bigint NOT NULL,
    delivery_id text NOT NULL,
    subscription_id text,
    batch_id text,
    http_method text DEFAULT 'POST'::text NOT NULL,
    http_path text,
    http_status_code integer,
    http_request_headers jsonb,
    http_response_body jsonb,
    raw_body jsonb,
    raw_body_sha256 text NOT NULL,
    content_length integer,
    content_type text,
    provider_published_utc timestamp with time zone,
    received_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    processed_at_utc timestamp with time zone,
    processing_outcome text,
    notification_items integer DEFAULT 0,
    error_message text,
    adb_delivery_id text,
    adb_cost_credits numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notification_id text,
    provider_notification_generated_utc timestamp with time zone,
    delivery_attempt_seq_no integer,
    delivery_attempt_utc timestamp with time zone,
    delivery_attempt_cost_credits numeric,
    raw_expired_at_utc timestamp with time zone,
    provider_content_expired_at_utc timestamp with time zone,
    provider_blob_ref_id uuid,
    CONSTRAINT raw_delivery_attempt_cost_nonnegative CHECK (((delivery_attempt_cost_credits IS NULL) OR (delivery_attempt_cost_credits >= (0)::numeric))),
    CONSTRAINT raw_delivery_attempt_seq_nonnegative CHECK (((delivery_attempt_seq_no IS NULL) OR (delivery_attempt_seq_no >= 0)))
);


--
-- Name: raw_delivery_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.raw_delivery_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: raw_delivery_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.raw_delivery_id_seq OWNED BY clean.raw_delivery.id;


--
-- Name: raw_delivery_item; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.raw_delivery_item (
    id bigint NOT NULL,
    delivery_id text NOT NULL,
    item_index integer NOT NULL,
    flight_number text,
    carrier_iata text,
    carrier_icao text,
    status text,
    status_code integer,
    raw_item jsonb,
    raw_item_sha256 text NOT NULL,
    last_updated_utc timestamp with time zone,
    departure_scheduled_utc timestamp with time zone,
    arrival_scheduled_utc timestamp with time zone,
    parsing_outcome text,
    canonical_flight_instance_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_expired_at_utc timestamp with time zone,
    provider_content_expired_at_utc timestamp with time zone
);


--
-- Name: raw_delivery_item_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.raw_delivery_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: raw_delivery_item_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.raw_delivery_item_id_seq OWNED BY clean.raw_delivery_item.id;


--
-- Name: retention_tombstone; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.retention_tombstone (
    id bigint NOT NULL,
    surface text NOT NULL,
    record_id text NOT NULL,
    content_hash text NOT NULL,
    expired_at timestamp with time zone NOT NULL,
    tombstoned_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    plan_hash text NOT NULL,
    content_class text,
    source_table text,
    content_columns text[],
    retention_rule text,
    expiry_run_id text,
    deletion_mode text,
    CONSTRAINT retention_tombstone_content_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT retention_tombstone_surface_check CHECK ((surface = ANY (ARRAY['primary'::text, 'replica'::text, 'backup'::text, 'object'::text, 'log'::text])))
);


--
-- Name: retention_tombstone_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.retention_tombstone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: retention_tombstone_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.retention_tombstone_id_seq OWNED BY clean.retention_tombstone.id;


--
-- Name: risk_score_history_v2; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.risk_score_history_v2 (
    id integer NOT NULL,
    monitored_flight_id integer NOT NULL,
    scored_at timestamp without time zone DEFAULT now(),
    actual_delay_minutes integer,
    actual_cancelled boolean,
    actual_status text,
    flight_number text,
    carrier_iata text,
    departure_date date,
    departure_time text,
    origin_iata text,
    destination_iata text,
    hours_until_departure numeric(6,1),
    time_of_day_risk integer,
    day_of_week_risk integer,
    connection_risk integer,
    horizon text,
    departure_hour integer,
    departure_day_of_week integer,
    origin_icao text,
    origin_flight_category text,
    origin_wind_speed_kt numeric(5,1),
    origin_gust_speed_kt numeric(5,1),
    origin_visibility_miles numeric(5,1),
    origin_ceiling_ft integer,
    origin_has_thunderstorm boolean DEFAULT false,
    origin_has_freezing boolean DEFAULT false,
    destination_icao text,
    destination_flight_category text,
    destination_wind_speed_kt numeric(5,1),
    destination_gust_speed_kt numeric(5,1),
    destination_visibility_miles numeric(5,1),
    destination_ceiling_ft integer,
    destination_has_thunderstorm boolean DEFAULT false,
    destination_has_freezing boolean DEFAULT false,
    origin_has_ground_stop boolean DEFAULT false,
    origin_has_ground_delay boolean DEFAULT false,
    origin_nas_avg_delay_minutes integer DEFAULT 0,
    destination_has_ground_stop boolean DEFAULT false,
    destination_has_ground_delay boolean DEFAULT false,
    destination_nas_avg_delay_minutes integer DEFAULT 0,
    nas_origin_programs jsonb,
    nas_destination_programs jsonb,
    carrier_cancellation_rate_24h numeric(5,4),
    carrier_avg_delay_24h numeric(6,1),
    carrier_health_score integer,
    carrier_reliable boolean,
    carrier_health_sample_size integer,
    tail_number text,
    equipment_type text,
    equipment_group text,
    historical_otp_score integer,
    historical_otp_sample_size integer,
    historical_otp_source text,
    historical_risk integer,
    heuristic_score integer NOT NULL,
    heuristic_tier text NOT NULL,
    signal_inbound_aircraft_delay integer DEFAULT 0,
    signal_inbound_delay_raw_minutes integer,
    signal_atc_ground_stop integer DEFAULT 0,
    signal_atc_ground_delay integer DEFAULT 0,
    signal_origin_weather integer DEFAULT 0,
    signal_destination_weather integer DEFAULT 0,
    signal_carrier_health integer DEFAULT 0,
    signal_time_of_day integer DEFAULT 0,
    signal_day_of_week integer DEFAULT 0,
    signal_connection_risk integer DEFAULT 0,
    is_test_flight boolean DEFAULT false,
    agency_id integer,
    CONSTRAINT risk_score_history_v2_carrier_health_score_check CHECK ((carrier_health_score = ANY (ARRAY[1, 3, 4, 7, 10]))),
    CONSTRAINT risk_score_history_v2_connection_risk_check CHECK (((connection_risk >= 0) AND (connection_risk <= 4))),
    CONSTRAINT risk_score_history_v2_day_of_week_risk_check CHECK (((day_of_week_risk >= 0) AND (day_of_week_risk <= 4))),
    CONSTRAINT risk_score_history_v2_departure_day_of_week_check CHECK (((departure_day_of_week >= 0) AND (departure_day_of_week <= 6))),
    CONSTRAINT risk_score_history_v2_departure_hour_check CHECK (((departure_hour >= 0) AND (departure_hour <= 23))),
    CONSTRAINT risk_score_history_v2_destination_flight_category_check CHECK ((destination_flight_category = ANY (ARRAY['VFR'::text, 'MVFR'::text, 'IFR'::text, 'LIFR'::text, 'UNKNOWN'::text]))),
    CONSTRAINT risk_score_history_v2_heuristic_tier_check CHECK ((heuristic_tier = ANY (ARRAY['green'::text, 'amber'::text, 'red'::text]))),
    CONSTRAINT risk_score_history_v2_horizon_check CHECK ((horizon = ANY (ARRAY['short'::text, 'medium'::text, 'long'::text]))),
    CONSTRAINT risk_score_history_v2_origin_flight_category_check CHECK ((origin_flight_category = ANY (ARRAY['VFR'::text, 'MVFR'::text, 'IFR'::text, 'LIFR'::text, 'UNKNOWN'::text]))),
    CONSTRAINT risk_score_history_v2_time_of_day_risk_check CHECK (((time_of_day_risk >= 0) AND (time_of_day_risk <= 5)))
);


--
-- Name: TABLE risk_score_history_v2; Type: COMMENT; Schema: clean; Owner: -
--

COMMENT ON TABLE clean.risk_score_history_v2 IS 'Clean v2 risk score table — flat typed columns extracted from old JSONB';


--
-- Name: risk_score_history_v2_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.risk_score_history_v2_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_score_history_v2_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.risk_score_history_v2_id_seq OWNED BY clean.risk_score_history_v2.id;


--
-- Name: webhook_flight_identity; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.webhook_flight_identity (
    id bigint NOT NULL,
    provider_identity_alias text NOT NULL,
    provider_flight_id text,
    flight_instance_id text NOT NULL,
    operating_carrier text NOT NULL,
    operating_flight_number text NOT NULL,
    origin_icao text NOT NULL,
    original_destination_icao text NOT NULL,
    initial_service_date date NOT NULL,
    initial_scheduled_gate_out_utc timestamp with time zone NOT NULL,
    created_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    provider_record_key text,
    callsign text
);


--
-- Name: webhook_flight_identity_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.webhook_flight_identity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_flight_identity_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.webhook_flight_identity_id_seq OWNED BY clean.webhook_flight_identity.id;


--
-- Name: webhook_flight_schedule_version; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.webhook_flight_schedule_version (
    schedule_version_pk bigint NOT NULL,
    flight_instance_id text NOT NULL,
    retime_version integer NOT NULL,
    observed_scheduled_gate_out_utc timestamp with time zone NOT NULL,
    current_service_date date NOT NULL,
    provider_identity_alias text NOT NULL,
    provider_record_key text,
    callsign text,
    observed_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_flight_schedule_version_retime_version_check CHECK ((retime_version >= 0))
);


--
-- Name: webhook_flight_schedule_version_schedule_version_pk_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.webhook_flight_schedule_version_schedule_version_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_flight_schedule_version_schedule_version_pk_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.webhook_flight_schedule_version_schedule_version_pk_seq OWNED BY clean.webhook_flight_schedule_version.schedule_version_pk;


--
-- Name: webhook_identity_resolution; Type: TABLE; Schema: clean; Owner: -
--

CREATE TABLE clean.webhook_identity_resolution (
    resolution_id bigint NOT NULL,
    delivery_id text NOT NULL,
    item_index integer NOT NULL,
    raw_item_sha256 text NOT NULL,
    resolution_status text NOT NULL,
    flight_instance_id text,
    initial_service_date date,
    reason text,
    resolved_at_utc timestamp with time zone DEFAULT now() NOT NULL,
    provider_identity_expired_at_utc timestamp with time zone,
    CONSTRAINT webhook_identity_resolution_item_index_check CHECK ((item_index >= 0)),
    CONSTRAINT webhook_identity_resolution_raw_item_sha256_check CHECK ((raw_item_sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT webhook_identity_resolution_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['resolved'::text, 'quarantined'::text]))),
    CONSTRAINT webhook_identity_resolution_retention_shape CHECK ((((resolution_status = 'resolved'::text) AND (reason IS NULL) AND (((provider_identity_expired_at_utc IS NULL) AND (flight_instance_id IS NOT NULL) AND (initial_service_date IS NOT NULL)) OR ((provider_identity_expired_at_utc IS NOT NULL) AND (flight_instance_id IS NULL) AND (initial_service_date IS NULL)))) OR ((resolution_status = 'quarantined'::text) AND (flight_instance_id IS NULL) AND (initial_service_date IS NULL) AND (reason IS NOT NULL) AND (provider_identity_expired_at_utc IS NULL))))
);


--
-- Name: webhook_identity_resolution_resolution_id_seq; Type: SEQUENCE; Schema: clean; Owner: -
--

CREATE SEQUENCE clean.webhook_identity_resolution_resolution_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_identity_resolution_resolution_id_seq; Type: SEQUENCE OWNED BY; Schema: clean; Owner: -
--

ALTER SEQUENCE clean.webhook_identity_resolution_resolution_id_seq OWNED BY clean.webhook_identity_resolution.resolution_id;


--
-- Name: agency_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency_accounts (
    id integer NOT NULL,
    name text NOT NULL,
    contact_email text NOT NULL,
    contact_name text NOT NULL,
    password text NOT NULL,
    plan text DEFAULT 'trial'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: agency_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agency_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agency_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agency_accounts_id_seq OWNED BY public.agency_accounts.id;


--
-- Name: bland_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bland_calls (
    id integer NOT NULL,
    call_request_id integer,
    user_id character varying(36) NOT NULL,
    bland_call_id text,
    phone_number text NOT NULL,
    status public.bland_call_status DEFAULT 'queued'::public.bland_call_status NOT NULL,
    duration integer,
    transcript text,
    transcript_json jsonb,
    recording_url text,
    summary text,
    variables jsonb,
    error_message text,
    started_at timestamp without time zone,
    ended_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bland_calls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bland_calls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bland_calls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bland_calls_id_seq OWNED BY public.bland_calls.id;


--
-- Name: calendar_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_entries (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    payment_id integer,
    proposal_id integer,
    entry_type text NOT NULL,
    date text NOT NULL,
    label text NOT NULL,
    details jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: calendar_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calendar_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calendar_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calendar_entries_id_seq OWNED BY public.calendar_entries.id;


--
-- Name: call_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_requests (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    trip_type public.trip_type NOT NULL,
    destination text DEFAULT ''::text,
    phone text DEFAULT ''::text NOT NULL,
    date_from text,
    date_to text,
    flexibility text,
    time_window text,
    status public.call_status DEFAULT 'requested'::public.call_status NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: call_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.call_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_requests_id_seq OWNED BY public.call_requests.id;


--
-- Name: callback_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.callback_requests (
    id integer NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    status text DEFAULT 'pending'::text,
    bland_call_id text,
    transcript text,
    summary text,
    recording_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: callback_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.callback_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: callback_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.callback_requests_id_seq OWNED BY public.callback_requests.id;


--
-- Name: disruption_alternatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disruption_alternatives (
    id integer NOT NULL,
    monitored_flight_id integer NOT NULL,
    flight_number text NOT NULL,
    carrier_iata text NOT NULL,
    carrier_name text,
    departure_time text NOT NULL,
    arrival_time text NOT NULL,
    duration_minutes integer,
    stops integer DEFAULT 0 NOT NULL,
    price text,
    risk_score integer NOT NULL,
    risk_tier text NOT NULL,
    offer_data jsonb,
    selection_token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: disruption_alternatives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.disruption_alternatives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: disruption_alternatives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.disruption_alternatives_id_seq OWNED BY public.disruption_alternatives.id;


--
-- Name: flight_travelers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flight_travelers (
    id integer NOT NULL,
    monitored_flight_id integer NOT NULL,
    agency_id integer NOT NULL,
    traveler_name text NOT NULL,
    traveler_email text NOT NULL,
    traveler_phone text,
    selection_token text,
    selected_option_id text,
    selected_at timestamp without time zone,
    alert_sent_at timestamp without time zone,
    agency_notified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    confirmation_alert_sent_at timestamp without time zone
);


--
-- Name: flight_travelers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flight_travelers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flight_travelers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flight_travelers_id_seq OWNED BY public.flight_travelers.id;


--
-- Name: guest_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guest_proposals (
    id integer NOT NULL,
    token character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    origin_iata text NOT NULL,
    destination_iata text NOT NULL,
    departure_date text NOT NULL,
    return_date text,
    passengers integer DEFAULT 1 NOT NULL,
    cabin_class text DEFAULT 'economy'::text NOT NULL,
    proposal_data jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: guest_proposals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guest_proposals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guest_proposals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guest_proposals_id_seq OWNED BY public.guest_proposals.id;


--
-- Name: health_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_reports (
    id integer NOT NULL,
    generated_at timestamp without time zone DEFAULT now(),
    flights_analyzed integer,
    flights_flagged integer,
    true_positives integer,
    false_positives integer,
    false_negatives integer,
    true_negatives integer,
    "precision" real,
    recall real,
    avg_score_disrupted real,
    avg_score_on_time real,
    claude_summary text,
    raw_data jsonb,
    requested_by_agency_id integer
);


--
-- Name: health_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_reports_id_seq OWNED BY public.health_reports.id;


--
-- Name: hotel_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_bookings (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    hotel_option_id integer NOT NULL,
    payment_id integer,
    provider text NOT NULL,
    provider_booking_id text,
    confirmation_number text,
    status text DEFAULT 'pending'::text NOT NULL,
    traveler_details jsonb NOT NULL,
    total_charged numeric(10,2),
    currency character varying(3),
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: hotel_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hotel_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hotel_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hotel_bookings_id_seq OWNED BY public.hotel_bookings.id;


--
-- Name: hotel_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_options (
    id integer NOT NULL,
    search_id integer NOT NULL,
    provider text NOT NULL,
    provider_hotel_id text NOT NULL,
    provider_rate_id text,
    name text NOT NULL,
    address text,
    neighborhood text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    star_rating numeric(2,1),
    guest_rating numeric(3,2),
    images jsonb,
    description text,
    amenities jsonb,
    room_name text,
    bed_type text,
    board_type text,
    cancellation_policy text,
    refundable boolean,
    free_cancellation_until timestamp without time zone,
    nightly_price numeric(10,2),
    taxes_and_fees numeric(10,2),
    total_price numeric(10,2),
    currency character varying(3),
    pay_now_or_later text,
    check_in_instructions text,
    special_instructions text,
    source_raw_payload jsonb,
    rank_score numeric(5,2),
    rank_reasons jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: hotel_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hotel_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hotel_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hotel_options_id_seq OWNED BY public.hotel_options.id;


--
-- Name: hotel_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_searches (
    id integer NOT NULL,
    user_id character varying(36),
    call_request_id integer,
    proposal_id integer,
    provider text NOT NULL,
    request jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    raw_provider_payload_truncated text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


--
-- Name: hotel_searches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hotel_searches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hotel_searches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hotel_searches_id_seq OWNED BY public.hotel_searches.id;


--
-- Name: itinerary_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itinerary_proposals (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    call_request_id integer NOT NULL,
    title text NOT NULL,
    summary text,
    total_estimate numeric(10,2) NOT NULL,
    status public.proposal_status DEFAULT 'sent'::public.proposal_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: itinerary_proposals_call_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.itinerary_proposals_call_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_proposals_call_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.itinerary_proposals_call_request_id_seq OWNED BY public.itinerary_proposals.call_request_id;


--
-- Name: itinerary_proposals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.itinerary_proposals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_proposals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.itinerary_proposals_id_seq OWNED BY public.itinerary_proposals.id;


--
-- Name: monitored_flights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitored_flights (
    id integer NOT NULL,
    agency_id integer NOT NULL,
    flight_number text NOT NULL,
    carrier_iata text NOT NULL,
    departure_date text NOT NULL,
    departure_time text,
    origin_iata text NOT NULL,
    destination_iata text NOT NULL,
    risk_score integer DEFAULT 0 NOT NULL,
    risk_tier text DEFAULT 'green'::text NOT NULL,
    last_checked_at timestamp without time zone,
    status text DEFAULT 'active'::text NOT NULL,
    agency_resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    confirmation_alert_sent_at timestamp without time zone,
    tail_number text,
    equipment_type text,
    is_test boolean DEFAULT false NOT NULL,
    resolved_status text,
    resolved_delay_minutes integer,
    resolved_at timestamp without time zone,
    red_tier_first_at timestamp without time zone,
    cancelled_at timestamp without time zone
);


--
-- Name: monitored_flights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monitored_flights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monitored_flights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monitored_flights_id_seq OWNED BY public.monitored_flights.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link_url text,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    proposal_id integer,
    stripe_checkout_session_id text,
    stripe_payment_intent_id text,
    duffel_order_id text,
    duffel_booking_ref text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    refund_status text,
    refund_requested_at timestamp without time zone,
    refund_reason text,
    manual_booking_details jsonb,
    manual_booking_resolved_at timestamp without time zone,
    manual_booking_resolved_by character varying(36),
    manual_booking_notes text,
    applied_promo_code text
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: phone_email_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_email_map (
    id integer NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: phone_email_map_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.phone_email_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: phone_email_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.phone_email_map_id_seq OWNED BY public.phone_email_map.id;


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_codes (
    id integer NOT NULL,
    code text NOT NULL,
    description text,
    override_amount_cents integer NOT NULL,
    force_manual boolean DEFAULT false NOT NULL,
    admin_only boolean DEFAULT true NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp without time zone,
    active boolean DEFAULT true NOT NULL,
    created_by character varying(36),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: promo_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promo_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promo_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promo_codes_id_seq OWNED BY public.promo_codes.id;


--
-- Name: proposal_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal_items (
    id integer NOT NULL,
    proposal_id integer NOT NULL,
    type public.proposal_item_type NOT NULL,
    description text NOT NULL,
    price_estimate numeric(10,2) NOT NULL,
    duffel_offer_id text,
    duffel_offer_data jsonb
);


--
-- Name: proposal_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proposal_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proposal_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proposal_items_id_seq OWNED BY public.proposal_items.id;


--
-- Name: public_flight_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_flight_subscribers (
    id integer NOT NULL,
    email text NOT NULL,
    flight_number text NOT NULL,
    carrier_iata text NOT NULL,
    departure_date text NOT NULL,
    departure_time text,
    origin_iata text NOT NULL,
    destination_iata text NOT NULL,
    risk_score integer DEFAULT 0 NOT NULL,
    risk_tier text DEFAULT 'green'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: public_flight_subscribers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.public_flight_subscribers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: public_flight_subscribers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.public_flight_subscribers_id_seq OWNED BY public.public_flight_subscribers.id;


--
-- Name: risk_score_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_score_history (
    id integer NOT NULL,
    monitored_flight_id integer NOT NULL,
    score integer NOT NULL,
    tier text NOT NULL,
    signals jsonb NOT NULL,
    scored_at timestamp without time zone DEFAULT now() NOT NULL,
    tail_number text,
    equipment_type text
);


--
-- Name: risk_score_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risk_score_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_score_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risk_score_history_id_seq OWNED BY public.risk_score_history.id;


--
-- Name: saved_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_cards (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    card_brand text NOT NULL,
    last_four text NOT NULL,
    expiry_month text NOT NULL,
    expiry_year text NOT NULL,
    cardholder_name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_cards_id_seq OWNED BY public.saved_cards.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: traveler_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.traveler_profiles (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    name text,
    phone text,
    home_airport text,
    passport_country text,
    date_of_birth text,
    gender text,
    title text,
    passport_number text,
    nationality text,
    seat_preference text,
    hotel_preference text,
    dietary_notes text,
    budget_range text,
    loyalty_programs text,
    notes text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: traveler_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.traveler_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: traveler_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.traveler_profiles_id_seq OWNED BY public.traveler_profiles.id;


--
-- Name: trip_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trip_requests (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    user_id character varying(36),
    type public.trip_request_type NOT NULL,
    source public.trip_request_source NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: trip_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trip_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trip_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trip_requests_id_seq OWNED BY public.trip_requests.id;


--
-- Name: user_monitored_flights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_monitored_flights (
    id integer NOT NULL,
    user_id character varying(36) NOT NULL,
    flight_number text NOT NULL,
    carrier_iata text NOT NULL,
    departure_date text NOT NULL,
    departure_time text,
    origin_iata text NOT NULL,
    destination_iata text NOT NULL,
    risk_score integer DEFAULT 0 NOT NULL,
    risk_tier text DEFAULT 'green'::text NOT NULL,
    last_checked_at timestamp without time zone,
    last_alerted_tier text,
    flight_status jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    red_tier_first_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    resolved_status text,
    resolved_delay_minutes integer,
    resolved_at timestamp without time zone
);


--
-- Name: user_monitored_flights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_monitored_flights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_monitored_flights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_monitored_flights_id_seq OWNED BY public.user_monitored_flights.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(36) DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    profile_image_url text,
    email_verified boolean DEFAULT false NOT NULL,
    verification_token text,
    password_reset_token text,
    password_reset_expires timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: adb_adaptive_state_history history_id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_adaptive_state_history ALTER COLUMN history_id SET DEFAULT nextval('clean.adb_adaptive_state_history_history_id_seq'::regclass);


--
-- Name: adb_anchor_probe probe_id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_anchor_probe ALTER COLUMN probe_id SET DEFAULT nextval('clean.adb_anchor_probe_probe_id_seq'::regclass);


--
-- Name: adb_incident_stop id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_incident_stop ALTER COLUMN id SET DEFAULT nextval('clean.adb_incident_stop_id_seq'::regclass);


--
-- Name: adb_ingest_events id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_ingest_events ALTER COLUMN id SET DEFAULT nextval('clean.adb_ingest_events_id_seq'::regclass);


--
-- Name: adb_phase6_admission_attempt admission_id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_admission_attempt ALTER COLUMN admission_id SET DEFAULT nextval('clean.adb_phase6_admission_attempt_admission_id_seq'::regclass);


--
-- Name: adb_sampling_draw draw_id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_sampling_draw ALTER COLUMN draw_id SET DEFAULT nextval('clean.adb_sampling_draw_draw_id_seq'::regclass);


--
-- Name: adb_sampling_frame frame_row_id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_sampling_frame ALTER COLUMN frame_row_id SET DEFAULT nextval('clean.adb_sampling_frame_frame_row_id_seq'::regclass);


--
-- Name: airborne_quarantine quarantine_id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.airborne_quarantine ALTER COLUMN quarantine_id SET DEFAULT nextval('clean.airborne_quarantine_quarantine_id_seq'::regclass);


--
-- Name: clean_airborne_points id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.clean_airborne_points ALTER COLUMN id SET DEFAULT nextval('clean.clean_airborne_points_id_seq'::regclass);


--
-- Name: flight_airborne_snapshots airborne_snapshot_id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_airborne_snapshots ALTER COLUMN airborne_snapshot_id SET DEFAULT nextval('clean.flight_airborne_snapshots_airborne_snapshot_id_seq'::regclass);


--
-- Name: flight_data_pre_post id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_data_pre_post ALTER COLUMN id SET DEFAULT nextval('clean.flight_data_pre_post_id_seq'::regclass);


--
-- Name: flight_events id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_events ALTER COLUMN id SET DEFAULT nextval('clean.flight_events_id_seq'::regclass);


--
-- Name: flight_outcomes id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_outcomes ALTER COLUMN id SET DEFAULT nextval('clean.flight_outcomes_id_seq'::regclass);


--
-- Name: flight_population id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_population ALTER COLUMN id SET DEFAULT nextval('clean.flight_population_id_seq'::regclass);


--
-- Name: flight_snapshots id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_snapshots ALTER COLUMN id SET DEFAULT nextval('clean.flight_snapshots_id_seq'::regclass);


--
-- Name: flight_trajectory id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_trajectory ALTER COLUMN id SET DEFAULT nextval('clean.flight_trajectory_id_seq'::regclass);


--
-- Name: historical_feature_store id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.historical_feature_store ALTER COLUMN id SET DEFAULT nextval('clean.historical_feature_store_id_seq'::regclass);


--
-- Name: historical_readiness id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.historical_readiness ALTER COLUMN id SET DEFAULT nextval('clean.historical_readiness_id_seq'::regclass);


--
-- Name: monitored_flights_v2 id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.monitored_flights_v2 ALTER COLUMN id SET DEFAULT nextval('clean.monitored_flights_v2_id_seq'::regclass);


--
-- Name: processing_attempt id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.processing_attempt ALTER COLUMN id SET DEFAULT nextval('clean.processing_attempt_id_seq'::regclass);


--
-- Name: raw_airborne_events id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_airborne_events ALTER COLUMN id SET DEFAULT nextval('clean.raw_airborne_events_id_seq'::regclass);


--
-- Name: raw_delivery id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_delivery ALTER COLUMN id SET DEFAULT nextval('clean.raw_delivery_id_seq'::regclass);


--
-- Name: raw_delivery_item id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_delivery_item ALTER COLUMN id SET DEFAULT nextval('clean.raw_delivery_item_id_seq'::regclass);


--
-- Name: retention_tombstone id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.retention_tombstone ALTER COLUMN id SET DEFAULT nextval('clean.retention_tombstone_id_seq'::regclass);


--
-- Name: risk_score_history_v2 id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.risk_score_history_v2 ALTER COLUMN id SET DEFAULT nextval('clean.risk_score_history_v2_id_seq'::regclass);


--
-- Name: webhook_flight_identity id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_flight_identity ALTER COLUMN id SET DEFAULT nextval('clean.webhook_flight_identity_id_seq'::regclass);


--
-- Name: webhook_flight_schedule_version schedule_version_pk; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_flight_schedule_version ALTER COLUMN schedule_version_pk SET DEFAULT nextval('clean.webhook_flight_schedule_version_schedule_version_pk_seq'::regclass);


--
-- Name: webhook_identity_resolution resolution_id; Type: DEFAULT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_identity_resolution ALTER COLUMN resolution_id SET DEFAULT nextval('clean.webhook_identity_resolution_resolution_id_seq'::regclass);


--
-- Name: agency_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_accounts ALTER COLUMN id SET DEFAULT nextval('public.agency_accounts_id_seq'::regclass);


--
-- Name: bland_calls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bland_calls ALTER COLUMN id SET DEFAULT nextval('public.bland_calls_id_seq'::regclass);


--
-- Name: calendar_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_entries ALTER COLUMN id SET DEFAULT nextval('public.calendar_entries_id_seq'::regclass);


--
-- Name: call_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_requests ALTER COLUMN id SET DEFAULT nextval('public.call_requests_id_seq'::regclass);


--
-- Name: callback_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callback_requests ALTER COLUMN id SET DEFAULT nextval('public.callback_requests_id_seq'::regclass);


--
-- Name: disruption_alternatives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruption_alternatives ALTER COLUMN id SET DEFAULT nextval('public.disruption_alternatives_id_seq'::regclass);


--
-- Name: flight_travelers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_travelers ALTER COLUMN id SET DEFAULT nextval('public.flight_travelers_id_seq'::regclass);


--
-- Name: guest_proposals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_proposals ALTER COLUMN id SET DEFAULT nextval('public.guest_proposals_id_seq'::regclass);


--
-- Name: health_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_reports ALTER COLUMN id SET DEFAULT nextval('public.health_reports_id_seq'::regclass);


--
-- Name: hotel_bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings ALTER COLUMN id SET DEFAULT nextval('public.hotel_bookings_id_seq'::regclass);


--
-- Name: hotel_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_options ALTER COLUMN id SET DEFAULT nextval('public.hotel_options_id_seq'::regclass);


--
-- Name: hotel_searches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_searches ALTER COLUMN id SET DEFAULT nextval('public.hotel_searches_id_seq'::regclass);


--
-- Name: itinerary_proposals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_proposals ALTER COLUMN id SET DEFAULT nextval('public.itinerary_proposals_id_seq'::regclass);


--
-- Name: itinerary_proposals call_request_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_proposals ALTER COLUMN call_request_id SET DEFAULT nextval('public.itinerary_proposals_call_request_id_seq'::regclass);


--
-- Name: monitored_flights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitored_flights ALTER COLUMN id SET DEFAULT nextval('public.monitored_flights_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: phone_email_map id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_email_map ALTER COLUMN id SET DEFAULT nextval('public.phone_email_map_id_seq'::regclass);


--
-- Name: promo_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes ALTER COLUMN id SET DEFAULT nextval('public.promo_codes_id_seq'::regclass);


--
-- Name: proposal_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_items ALTER COLUMN id SET DEFAULT nextval('public.proposal_items_id_seq'::regclass);


--
-- Name: public_flight_subscribers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_flight_subscribers ALTER COLUMN id SET DEFAULT nextval('public.public_flight_subscribers_id_seq'::regclass);


--
-- Name: risk_score_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_score_history ALTER COLUMN id SET DEFAULT nextval('public.risk_score_history_id_seq'::regclass);


--
-- Name: saved_cards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_cards ALTER COLUMN id SET DEFAULT nextval('public.saved_cards_id_seq'::regclass);


--
-- Name: traveler_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_profiles ALTER COLUMN id SET DEFAULT nextval('public.traveler_profiles_id_seq'::regclass);


--
-- Name: trip_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_requests ALTER COLUMN id SET DEFAULT nextval('public.trip_requests_id_seq'::regclass);


--
-- Name: user_monitored_flights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_monitored_flights ALTER COLUMN id SET DEFAULT nextval('public.user_monitored_flights_id_seq'::regclass);


--
-- Name: adb_adaptive_state_history adb_adaptive_state_history_icao_state_version_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_adaptive_state_history
    ADD CONSTRAINT adb_adaptive_state_history_icao_state_version_key UNIQUE (icao, state_version);


--
-- Name: adb_adaptive_state_history adb_adaptive_state_history_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_adaptive_state_history
    ADD CONSTRAINT adb_adaptive_state_history_pkey PRIMARY KEY (history_id);


--
-- Name: adb_airport_sampling_state adb_airport_sampling_state_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_airport_sampling_state
    ADD CONSTRAINT adb_airport_sampling_state_pkey PRIMARY KEY (icao);


--
-- Name: adb_anchor_probe adb_anchor_probe_identity_bounds_order; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_identity_bounds_order CHECK (((confirmed_unique_lower IS NULL) OR (confirmed_plus_ambiguous_upper IS NULL) OR (confirmed_unique_lower <= confirmed_plus_ambiguous_upper))) NOT VALID;


--
-- Name: adb_anchor_probe adb_anchor_probe_metric_contract_check; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_metric_contract_check CHECK (((metric_contract_version IS NULL) OR (metric_contract_version = ANY (ARRAY['v39-physical-flight-instance-v1'::text, 'v39-physical-flight-instance-v2'::text])))) NOT VALID;


--
-- Name: adb_anchor_probe adb_anchor_probe_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_pkey PRIMARY KEY (probe_id);


--
-- Name: adb_anchor_probe adb_anchor_probe_reconciliation_status_check; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_reconciliation_status_check CHECK (((reconciliation_status IS NULL) OR (reconciliation_status = ANY (ARRAY['MATCH'::text, 'DELIVERY_GAP'::text, 'MISMATCH'::text, 'UNRESOLVED'::text])))) NOT VALID;


--
-- Name: adb_anchor_probe adb_anchor_probe_safe_bound_rates; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_safe_bound_rates CHECK (((confirmed_unique_lower_per_credit IS NULL) OR (confirmed_plus_ambiguous_upper_per_credit IS NULL) OR ((confirmed_unique_lower_per_credit >= (0)::double precision) AND (confirmed_plus_ambiguous_upper_per_credit >= confirmed_unique_lower_per_credit)))) NOT VALID;


--
-- Name: adb_anchor_probe adb_anchor_probe_safe_completed_shape; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_safe_completed_shape CHECK (((NOT provider_content_safe_mode) OR (status <> 'completed'::text) OR ((runtime_session_id IS NOT NULL) AND (runtime_cleanup_verified_at_utc IS NOT NULL) AND (reconciliation_status = 'MATCH'::text) AND (confirmed_unique_lower_per_credit IS NOT NULL) AND (confirmed_plus_ambiguous_upper_per_credit IS NOT NULL)))) NOT VALID;


--
-- Name: adb_anchor_probe adb_anchor_probe_safe_provider_fields_null; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_safe_provider_fields_null CHECK (((NOT provider_content_safe_mode) OR ((subscription_id IS NULL) AND (balance_before IS NULL) AND (balance_after IS NULL) AND (credits_spent IS NULL) AND (settlement_stable_balance IS NULL) AND (internal_send_credits IS NULL)))) NOT VALID;


--
-- Name: adb_anchor_probe adb_anchor_probe_safe_settling_shape; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_safe_settling_shape CHECK (((NOT provider_content_safe_mode) OR (status <> 'settling'::text) OR ((runtime_session_id IS NOT NULL) AND (runtime_cleanup_verified_at_utc IS NULL) AND (reconciliation_status = 'MATCH'::text) AND (duration_censored = false) AND (stop_reason IS NULL) AND (confirmed_unique_lower_per_credit IS NOT NULL) AND (confirmed_plus_ambiguous_upper_per_credit IS NOT NULL)))) NOT VALID;


--
-- Name: adb_anchor_probe adb_anchor_probe_unique_run; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_unique_run UNIQUE (icao, stage, window_start);


--
-- Name: adb_budget_day_adjustment adb_budget_day_adjustment_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_budget_day_adjustment
    ADD CONSTRAINT adb_budget_day_adjustment_pkey PRIMARY KEY (source_run_day_index);


--
-- Name: adb_collection_batches adb_collection_batches_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_collection_batches
    ADD CONSTRAINT adb_collection_batches_pkey PRIMARY KEY (batch_id);


--
-- Name: adb_collection_batches adb_collection_batches_run_day_unique; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_collection_batches
    ADD CONSTRAINT adb_collection_batches_run_day_unique UNIQUE (run_day_index);


--
-- Name: adb_collection_meta adb_collection_meta_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_collection_meta
    ADD CONSTRAINT adb_collection_meta_pkey PRIMARY KEY (key);


--
-- Name: adb_collection_segments adb_collection_segments_batch_id_segment_index_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_collection_segments
    ADD CONSTRAINT adb_collection_segments_batch_id_segment_index_key UNIQUE (batch_id, segment_index);


--
-- Name: adb_collection_segments adb_collection_segments_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_collection_segments
    ADD CONSTRAINT adb_collection_segments_pkey PRIMARY KEY (segment_id);


--
-- Name: adb_collection_subs adb_collection_subs_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_collection_subs
    ADD CONSTRAINT adb_collection_subs_pkey PRIMARY KEY (subscription_id);


--
-- Name: adb_incident_stop adb_incident_stop_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_incident_stop
    ADD CONSTRAINT adb_incident_stop_pkey PRIMARY KEY (id);


--
-- Name: adb_ingest_events adb_ingest_events_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_ingest_events
    ADD CONSTRAINT adb_ingest_events_pkey PRIMARY KEY (id);


--
-- Name: adb_phase6_admission_attempt adb_phase6_admission_attempt_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_admission_attempt
    ADD CONSTRAINT adb_phase6_admission_attempt_pkey PRIMARY KEY (admission_id);


--
-- Name: adb_phase6_authorization adb_phase6_authorization_authorization_id_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_authorization
    ADD CONSTRAINT adb_phase6_authorization_authorization_id_key UNIQUE (authorization_id);


--
-- Name: adb_phase6_authorization adb_phase6_authorization_base_cap_1900; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.adb_phase6_authorization
    ADD CONSTRAINT adb_phase6_authorization_base_cap_1900 CHECK ((alert_cap_per_parent_day = 1900)) NOT VALID;


--
-- Name: adb_phase6_authorization adb_phase6_authorization_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_authorization
    ADD CONSTRAINT adb_phase6_authorization_pkey PRIMARY KEY (singleton_key);


--
-- Name: adb_phase6_calendar_day adb_phase6_calendar_day_budget_day_id_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_calendar_day
    ADD CONSTRAINT adb_phase6_calendar_day_budget_day_id_key UNIQUE (budget_day_id);


--
-- Name: adb_phase6_calendar_day adb_phase6_calendar_day_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_calendar_day
    ADD CONSTRAINT adb_phase6_calendar_day_pkey PRIMARY KEY (run_day_index);


--
-- Name: adb_phase6_safety_heartbeat adb_phase6_safety_heartbeat_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_safety_heartbeat
    ADD CONSTRAINT adb_phase6_safety_heartbeat_pkey PRIMARY KEY (singleton_key);


--
-- Name: adb_phase6_settlement_evidence adb_phase6_settlement_evidence_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_settlement_evidence
    ADD CONSTRAINT adb_phase6_settlement_evidence_pkey PRIMARY KEY (segment_id);


--
-- Name: adb_probe_budget_day adb_probe_budget_day_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_probe_budget_day
    ADD CONSTRAINT adb_probe_budget_day_pkey PRIMARY KEY (probe_budget_day_id);


--
-- Name: adb_probe_reconciliation_evidence adb_probe_reconciliation_evidence_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_probe_reconciliation_evidence
    ADD CONSTRAINT adb_probe_reconciliation_evidence_pkey PRIMARY KEY (probe_id);


--
-- Name: adb_rest_attempt_ledger adb_rest_attempt_ledger_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_rest_attempt_ledger
    ADD CONSTRAINT adb_rest_attempt_ledger_pkey PRIMARY KEY (reservation_id);


--
-- Name: adb_rest_budget_control adb_rest_budget_control_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_rest_budget_control
    ADD CONSTRAINT adb_rest_budget_control_pkey PRIMARY KEY (category);


--
-- Name: adb_sampling_draw adb_sampling_draw_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_sampling_draw
    ADD CONSTRAINT adb_sampling_draw_pkey PRIMARY KEY (draw_id);


--
-- Name: adb_sampling_draw adb_sampling_draw_run_day_index_slot_id_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_sampling_draw
    ADD CONSTRAINT adb_sampling_draw_run_day_index_slot_id_key UNIQUE (run_day_index, slot_id);


--
-- Name: adb_sampling_frame adb_sampling_frame_frame_row_id_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_sampling_frame
    ADD CONSTRAINT adb_sampling_frame_frame_row_id_key UNIQUE (frame_row_id);


--
-- Name: adb_sampling_frame adb_sampling_frame_icao_version_uniq; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_sampling_frame
    ADD CONSTRAINT adb_sampling_frame_icao_version_uniq UNIQUE (icao, frame_version);


--
-- Name: adb_sampling_frame_registry adb_sampling_frame_registry_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_sampling_frame_registry
    ADD CONSTRAINT adb_sampling_frame_registry_pkey PRIMARY KEY (registry_key);


--
-- Name: airborne_eligibility_evidence airborne_eligibility_evidence_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.airborne_eligibility_evidence
    ADD CONSTRAINT airborne_eligibility_evidence_pkey PRIMARY KEY (flight_instance_id);


--
-- Name: airborne_quarantine airborne_quarantine_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.airborne_quarantine
    ADD CONSTRAINT airborne_quarantine_pkey PRIMARY KEY (quarantine_id);


--
-- Name: airborne_quarantine airborne_quarantine_raw_event_id_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.airborne_quarantine
    ADD CONSTRAINT airborne_quarantine_raw_event_id_key UNIQUE (raw_event_id);


--
-- Name: clean_airborne_points clean_airborne_points_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.clean_airborne_points
    ADD CONSTRAINT clean_airborne_points_key UNIQUE (raw_event_id, event_timestamp);


--
-- Name: clean_airborne_points clean_airborne_points_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.clean_airborne_points
    ADD CONSTRAINT clean_airborne_points_pkey PRIMARY KEY (id);


--
-- Name: fids_query_response fids_query_response_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.fids_query_response
    ADD CONSTRAINT fids_query_response_pkey PRIMARY KEY (population_query_id);


--
-- Name: flight_airborne_snapshots flight_airborne_snapshots_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_airborne_snapshots
    ADD CONSTRAINT flight_airborne_snapshots_pkey PRIMARY KEY (airborne_snapshot_id);


--
-- Name: flight_data_pre_post flight_data_pre_post_dedup_key_unique; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_data_pre_post
    ADD CONSTRAINT flight_data_pre_post_dedup_key_unique UNIQUE (dedup_key);


--
-- Name: flight_data_pre_post flight_data_pre_post_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_data_pre_post
    ADD CONSTRAINT flight_data_pre_post_pkey PRIMARY KEY (id);


--
-- Name: flight_events flight_events_event_key_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_events
    ADD CONSTRAINT flight_events_event_key_key UNIQUE (event_key);


--
-- Name: flight_events flight_events_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_events
    ADD CONSTRAINT flight_events_pkey PRIMARY KEY (id);


--
-- Name: flight_outcomes flight_outcomes_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_outcomes
    ADD CONSTRAINT flight_outcomes_pkey PRIMARY KEY (id);


--
-- Name: flight_outcomes flight_outcomes_uniq; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_outcomes
    ADD CONSTRAINT flight_outcomes_uniq UNIQUE (flight_instance_id, target);


--
-- Name: flight_population flight_population_fids_complete; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.flight_population
    ADD CONSTRAINT flight_population_fids_complete CHECK (((source_type <> 'fids'::text) OR (provider_content_expired_at_utc IS NOT NULL) OR ((population_query_id IS NOT NULL) AND (query_direction IS NOT NULL) AND (population_role IS NOT NULL) AND (from_local IS NOT NULL) AND (to_local IS NOT NULL) AND (airport_iana_timezone IS NOT NULL) AND (scope_classification IS NOT NULL) AND (codeshare_resolution_status IS NOT NULL) AND (fids_retrieval_utc IS NOT NULL) AND (available_at IS NOT NULL) AND (response_hash IS NOT NULL) AND (analytic_identity_id IS NOT NULL) AND (provider_api_version IS NOT NULL) AND (fids_protocol_version IS NOT NULL) AND (openapi_sha256 IS NOT NULL)))) NOT VALID;


--
-- Name: flight_population flight_population_fids_expired_cleared; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.flight_population
    ADD CONSTRAINT flight_population_fids_expired_cleared CHECK (((provider_content_expired_at_utc IS NULL) OR ((flight_number IS NULL) AND (carrier_iata IS NULL) AND (carrier_icao IS NULL) AND (call_sign IS NULL) AND (dep_airport_icao IS NULL) AND (dep_airport_iata IS NULL) AND (arr_airport_icao IS NULL) AND (arr_airport_iata IS NULL) AND (dep_scheduled_utc IS NULL) AND (arr_scheduled_utc IS NULL) AND (provider_record_key IS NULL) AND (raw_payload_sha256 IS NULL) AND (coverage_state IS NULL) AND (population_query_id IS NULL) AND (from_local IS NULL) AND (to_local IS NULL) AND (airport_iana_timezone IS NULL) AND (scope_classification IS NULL) AND (codeshare_resolution_status IS NULL) AND (fids_retrieval_utc IS NULL) AND (available_at IS NULL) AND (response_hash IS NULL) AND (canonical_flight_instance_id IS NULL) AND (analytic_identity_id IS NULL) AND (provider_api_version IS NULL)))) NOT VALID;


--
-- Name: flight_population flight_population_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_population
    ADD CONSTRAINT flight_population_key UNIQUE (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key);


--
-- Name: flight_population flight_population_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_population
    ADD CONSTRAINT flight_population_pkey PRIMARY KEY (id);


--
-- Name: flight_snapshots flight_snapshots_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_snapshots
    ADD CONSTRAINT flight_snapshots_pkey PRIMARY KEY (id);


--
-- Name: flight_snapshots flight_snapshots_uniq; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_snapshots
    ADD CONSTRAINT flight_snapshots_uniq UNIQUE (flight_instance_id, horizon, prediction_cutoff_utc);


--
-- Name: flight_trajectory flight_trajectory_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_trajectory
    ADD CONSTRAINT flight_trajectory_pkey PRIMARY KEY (id);


--
-- Name: historical_feature_store historical_feature_store_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.historical_feature_store
    ADD CONSTRAINT historical_feature_store_pkey PRIMARY KEY (id);


--
-- Name: historical_readiness historical_readiness_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.historical_readiness
    ADD CONSTRAINT historical_readiness_pkey PRIMARY KEY (id);


--
-- Name: historical_readiness hr_entity_unique; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.historical_readiness
    ADD CONSTRAINT hr_entity_unique UNIQUE (entity_type, entity_id);


--
-- Name: monitored_flights_v2 monitored_flights_v2_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.monitored_flights_v2
    ADD CONSTRAINT monitored_flights_v2_pkey PRIMARY KEY (id);


--
-- Name: population_research_membership population_research_membership_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.population_research_membership
    ADD CONSTRAINT population_research_membership_pkey PRIMARY KEY (population_member_id);


--
-- Name: population_research_outcome_link population_research_outcome_link_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.population_research_outcome_link
    ADD CONSTRAINT population_research_outcome_link_pkey PRIMARY KEY (population_member_id, target);


--
-- Name: prepaid_probe_delivery_runtime prepaid_probe_delivery_runtime_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.prepaid_probe_delivery_runtime
    ADD CONSTRAINT prepaid_probe_delivery_runtime_pkey PRIMARY KEY (session_id, delivery_id);


--
-- Name: prepaid_probe_item_runtime prepaid_probe_item_codeshare_resolution_status_check; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.prepaid_probe_item_runtime
    ADD CONSTRAINT prepaid_probe_item_codeshare_resolution_status_check CHECK (((codeshare_resolution_status IS NULL) OR (codeshare_resolution_status = ANY (ARRAY['resolved_operator'::text, 'resolved_marketing'::text, 'ambiguous_unknown'::text])))) NOT VALID;


--
-- Name: prepaid_probe_item_runtime prepaid_probe_item_identity_resolution_status_check; Type: CHECK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE clean.prepaid_probe_item_runtime
    ADD CONSTRAINT prepaid_probe_item_identity_resolution_status_check CHECK (((identity_resolution_status IS NULL) OR (identity_resolution_status = ANY (ARRAY['resolved'::text, 'quarantined'::text])))) NOT VALID;


--
-- Name: prepaid_probe_item_runtime prepaid_probe_item_runtime_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.prepaid_probe_item_runtime
    ADD CONSTRAINT prepaid_probe_item_runtime_pkey PRIMARY KEY (session_id, delivery_id, item_index);


--
-- Name: prepaid_probe_session_runtime prepaid_probe_session_runtime_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.prepaid_probe_session_runtime
    ADD CONSTRAINT prepaid_probe_session_runtime_pkey PRIMARY KEY (session_id);


--
-- Name: prepaid_probe_session_runtime prepaid_probe_session_runtime_provider_subscription_id_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.prepaid_probe_session_runtime
    ADD CONSTRAINT prepaid_probe_session_runtime_provider_subscription_id_key UNIQUE (provider_subscription_id);


--
-- Name: processing_attempt processing_attempt_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.processing_attempt
    ADD CONSTRAINT processing_attempt_pkey PRIMARY KEY (id);


--
-- Name: provider_content_blob_ref provider_content_blob_ref_object_name_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.provider_content_blob_ref
    ADD CONSTRAINT provider_content_blob_ref_object_name_key UNIQUE (object_name);


--
-- Name: provider_content_blob_ref provider_content_blob_ref_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.provider_content_blob_ref
    ADD CONSTRAINT provider_content_blob_ref_pkey PRIMARY KEY (blob_ref_id);


--
-- Name: raw_airborne_events raw_airborne_events_event_key_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_airborne_events
    ADD CONSTRAINT raw_airborne_events_event_key_key UNIQUE (event_key);


--
-- Name: raw_airborne_events raw_airborne_events_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_airborne_events
    ADD CONSTRAINT raw_airborne_events_pkey PRIMARY KEY (id);


--
-- Name: raw_delivery raw_delivery_delivery_id_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_delivery
    ADD CONSTRAINT raw_delivery_delivery_id_key UNIQUE (delivery_id);


--
-- Name: raw_delivery_item raw_delivery_item_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_delivery_item
    ADD CONSTRAINT raw_delivery_item_pkey PRIMARY KEY (id);


--
-- Name: raw_delivery raw_delivery_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_delivery
    ADD CONSTRAINT raw_delivery_pkey PRIMARY KEY (id);


--
-- Name: raw_delivery_item rdi_delivery_item_unique; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_delivery_item
    ADD CONSTRAINT rdi_delivery_item_unique UNIQUE (delivery_id, item_index);


--
-- Name: retention_tombstone retention_tombstone_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.retention_tombstone
    ADD CONSTRAINT retention_tombstone_pkey PRIMARY KEY (id);


--
-- Name: retention_tombstone retention_tombstone_unique; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.retention_tombstone
    ADD CONSTRAINT retention_tombstone_unique UNIQUE (surface, record_id);


--
-- Name: risk_score_history_v2 risk_score_history_v2_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.risk_score_history_v2
    ADD CONSTRAINT risk_score_history_v2_pkey PRIMARY KEY (id);


--
-- Name: webhook_flight_identity webhook_flight_identity_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_flight_identity
    ADD CONSTRAINT webhook_flight_identity_pkey PRIMARY KEY (id);


--
-- Name: webhook_flight_identity webhook_flight_identity_provider_identity_alias_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_flight_identity
    ADD CONSTRAINT webhook_flight_identity_provider_identity_alias_key UNIQUE (provider_identity_alias);


--
-- Name: webhook_flight_schedule_version webhook_flight_schedule_versi_flight_instance_id_observed_s_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_flight_schedule_version
    ADD CONSTRAINT webhook_flight_schedule_versi_flight_instance_id_observed_s_key UNIQUE (flight_instance_id, observed_scheduled_gate_out_utc);


--
-- Name: webhook_flight_schedule_version webhook_flight_schedule_versi_flight_instance_id_retime_ver_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_flight_schedule_version
    ADD CONSTRAINT webhook_flight_schedule_versi_flight_instance_id_retime_ver_key UNIQUE (flight_instance_id, retime_version);


--
-- Name: webhook_flight_schedule_version webhook_flight_schedule_version_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_flight_schedule_version
    ADD CONSTRAINT webhook_flight_schedule_version_pkey PRIMARY KEY (schedule_version_pk);


--
-- Name: webhook_identity_resolution webhook_identity_resolution_delivery_id_item_index_key; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_identity_resolution
    ADD CONSTRAINT webhook_identity_resolution_delivery_id_item_index_key UNIQUE (delivery_id, item_index);


--
-- Name: webhook_identity_resolution webhook_identity_resolution_pkey; Type: CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_identity_resolution
    ADD CONSTRAINT webhook_identity_resolution_pkey PRIMARY KEY (resolution_id);


--
-- Name: agency_accounts agency_accounts_contact_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_accounts
    ADD CONSTRAINT agency_accounts_contact_email_unique UNIQUE (contact_email);


--
-- Name: agency_accounts agency_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_accounts
    ADD CONSTRAINT agency_accounts_pkey PRIMARY KEY (id);


--
-- Name: bland_calls bland_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bland_calls
    ADD CONSTRAINT bland_calls_pkey PRIMARY KEY (id);


--
-- Name: calendar_entries calendar_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_entries
    ADD CONSTRAINT calendar_entries_pkey PRIMARY KEY (id);


--
-- Name: call_requests call_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_requests
    ADD CONSTRAINT call_requests_pkey PRIMARY KEY (id);


--
-- Name: callback_requests callback_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callback_requests
    ADD CONSTRAINT callback_requests_pkey PRIMARY KEY (id);


--
-- Name: disruption_alternatives disruption_alternatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruption_alternatives
    ADD CONSTRAINT disruption_alternatives_pkey PRIMARY KEY (id);


--
-- Name: disruption_alternatives disruption_alternatives_selection_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruption_alternatives
    ADD CONSTRAINT disruption_alternatives_selection_token_unique UNIQUE (selection_token);


--
-- Name: flight_travelers flight_travelers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_travelers
    ADD CONSTRAINT flight_travelers_pkey PRIMARY KEY (id);


--
-- Name: flight_travelers flight_travelers_selection_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_travelers
    ADD CONSTRAINT flight_travelers_selection_token_unique UNIQUE (selection_token);


--
-- Name: guest_proposals guest_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_proposals
    ADD CONSTRAINT guest_proposals_pkey PRIMARY KEY (id);


--
-- Name: guest_proposals guest_proposals_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_proposals
    ADD CONSTRAINT guest_proposals_token_unique UNIQUE (token);


--
-- Name: health_reports health_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_reports
    ADD CONSTRAINT health_reports_pkey PRIMARY KEY (id);


--
-- Name: hotel_bookings hotel_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_pkey PRIMARY KEY (id);


--
-- Name: hotel_options hotel_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_options
    ADD CONSTRAINT hotel_options_pkey PRIMARY KEY (id);


--
-- Name: hotel_searches hotel_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_searches
    ADD CONSTRAINT hotel_searches_pkey PRIMARY KEY (id);


--
-- Name: itinerary_proposals itinerary_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_proposals
    ADD CONSTRAINT itinerary_proposals_pkey PRIMARY KEY (id);


--
-- Name: monitored_flights monitored_flights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitored_flights
    ADD CONSTRAINT monitored_flights_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: phone_email_map phone_email_map_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_email_map
    ADD CONSTRAINT phone_email_map_phone_unique UNIQUE (phone);


--
-- Name: phone_email_map phone_email_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_email_map
    ADD CONSTRAINT phone_email_map_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_unique UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: proposal_items proposal_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_items
    ADD CONSTRAINT proposal_items_pkey PRIMARY KEY (id);


--
-- Name: public_flight_subscribers public_flight_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_flight_subscribers
    ADD CONSTRAINT public_flight_subscribers_pkey PRIMARY KEY (id);


--
-- Name: risk_score_history risk_score_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_score_history
    ADD CONSTRAINT risk_score_history_pkey PRIMARY KEY (id);


--
-- Name: saved_cards saved_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_cards
    ADD CONSTRAINT saved_cards_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: traveler_profiles traveler_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_profiles
    ADD CONSTRAINT traveler_profiles_pkey PRIMARY KEY (id);


--
-- Name: trip_requests trip_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_requests
    ADD CONSTRAINT trip_requests_pkey PRIMARY KEY (id);


--
-- Name: user_monitored_flights user_monitored_flights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_monitored_flights
    ADD CONSTRAINT user_monitored_flights_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: flight_population_observation_key; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX flight_population_observation_key ON clean.flight_population USING btree (population_query_id, analytic_identity_id, population_role);


--
-- Name: idx_adaptive_history_icao_version; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adaptive_history_icao_version ON clean.adb_adaptive_state_history USING btree (icao, state_version);


--
-- Name: idx_adb_anchor_probe_budget_day; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_anchor_probe_budget_day ON clean.adb_anchor_probe USING btree (probe_budget_day_id);


--
-- Name: idx_adb_anchor_probe_icao; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_anchor_probe_icao ON clean.adb_anchor_probe USING btree (icao, stage);


--
-- Name: idx_adb_anchor_probe_settling; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_anchor_probe_settling ON clean.adb_anchor_probe USING btree (status, probe_budget_day_id) WHERE (status = 'settling'::text);


--
-- Name: idx_adb_collection_subs_batch; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_collection_subs_batch ON clean.adb_collection_subs USING btree (batch_id);


--
-- Name: idx_adb_incident_stop_open; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_incident_stop_open ON clean.adb_incident_stop USING btree (resolved, occurred_at_utc DESC);


--
-- Name: idx_adb_probe_one_open_day; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX idx_adb_probe_one_open_day ON clean.adb_probe_budget_day USING btree (state) WHERE (state = 'OPEN'::text);


--
-- Name: idx_adb_sampling_frame_last_phase6_obs; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_sampling_frame_last_phase6_obs ON clean.adb_sampling_frame USING btree (last_successful_phase6_observation_at);


--
-- Name: idx_adb_sampling_frame_region; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_sampling_frame_region ON clean.adb_sampling_frame USING btree (region, in_frame);


--
-- Name: idx_adb_sampling_frame_tier; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_sampling_frame_tier ON clean.adb_sampling_frame USING btree (tier, in_frame);


--
-- Name: idx_adb_sampling_frame_version; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_adb_sampling_frame_version ON clean.adb_sampling_frame USING btree (frame_version, tier, region);


--
-- Name: idx_airborne_eligibility_verified; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_airborne_eligibility_verified ON clean.airborne_eligibility_evidence USING btree (verified, evidence_available_at);


--
-- Name: idx_airborne_snapshot_canonical; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_airborne_snapshot_canonical ON clean.flight_airborne_snapshots USING btree (flight_instance_id, event_timestamp);


--
-- Name: idx_airborne_snapshot_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_airborne_snapshot_flight ON clean.flight_airborne_snapshots USING btree (flight_number, carrier_iata, event_timestamp);


--
-- Name: idx_airborne_snapshot_state; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_airborne_snapshot_state ON clean.flight_airborne_snapshots USING btree (prediction_state);


--
-- Name: idx_anchor_probe_runtime_session; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX idx_anchor_probe_runtime_session ON clean.adb_anchor_probe USING btree (runtime_session_id) WHERE (runtime_session_id IS NOT NULL);


--
-- Name: idx_clean_airborne_canonical; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_clean_airborne_canonical ON clean.clean_airborne_points USING btree (flight_instance_id, event_timestamp);


--
-- Name: idx_clean_airborne_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_clean_airborne_flight ON clean.clean_airborne_points USING btree (flight_key, event_timestamp);


--
-- Name: idx_collection_segments_batch_status; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_collection_segments_batch_status ON clean.adb_collection_segments USING btree (batch_id, status, segment_index);


--
-- Name: idx_collection_subs_segment_open; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_collection_subs_segment_open ON clean.adb_collection_subs USING btree (segment_id, ended_at) WHERE (ended_at IS NULL);


--
-- Name: idx_fdp_aircraft_reg; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_fdp_aircraft_reg ON clean.flight_data_pre_post USING btree (aircraft_reg);


--
-- Name: idx_fdp_batch; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_fdp_batch ON clean.flight_data_pre_post USING btree (sampling_batch_id);


--
-- Name: idx_fdp_flagged; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_fdp_flagged ON clean.flight_data_pre_post USING btree (flagged_at) WHERE (flagged_at IS NOT NULL);


--
-- Name: idx_fdp_flight_date; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_fdp_flight_date ON clean.flight_data_pre_post USING btree (flight_number, dep_scheduled_utc);


--
-- Name: idx_fdp_status; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_fdp_status ON clean.flight_data_pre_post USING btree (status);


--
-- Name: idx_fids_query_provider_blob_ref; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_fids_query_provider_blob_ref ON clean.fids_query_response USING btree (provider_blob_ref_id) WHERE (provider_blob_ref_id IS NOT NULL);


--
-- Name: idx_flight_events_batch; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_events_batch ON clean.flight_events USING btree (batch_id, received_timestamp_utc);


--
-- Name: idx_flight_events_canonical_instance; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_events_canonical_instance ON clean.flight_events USING btree (flight_instance_id);


--
-- Name: idx_flight_events_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_events_flight ON clean.flight_events USING btree (flight_number, carrier_iata, loc_reported_utc);


--
-- Name: idx_flight_events_ingest; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_events_ingest ON clean.flight_events USING btree (ingest_event_id);


--
-- Name: idx_flight_outcomes_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_outcomes_flight ON clean.flight_outcomes USING btree (flight_instance_id, target);


--
-- Name: idx_flight_population_airport; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_population_airport ON clean.flight_population USING btree (source_airport_icao, cutoff_utc);


--
-- Name: idx_flight_population_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_population_flight ON clean.flight_population USING btree (flight_number, carrier_iata, cutoff_utc);


--
-- Name: idx_flight_population_provider_expiry; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_population_provider_expiry ON clean.flight_population USING btree (provider_content_expired_at_utc, population_query_id) WHERE (source_type = 'fids'::text);


--
-- Name: idx_flight_population_window; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_population_window ON clean.flight_population USING btree (batch_id, cutoff_utc);


--
-- Name: idx_flight_snapshots_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_snapshots_flight ON clean.flight_snapshots USING btree (flight_instance_id, prediction_cutoff_utc);


--
-- Name: idx_flight_snapshots_horizon; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_snapshots_horizon ON clean.flight_snapshots USING btree (horizon, prediction_cutoff_utc);


--
-- Name: idx_flight_snapshots_population_member; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_snapshots_population_member ON clean.flight_snapshots USING btree (population_member_id) WHERE (population_member_id IS NOT NULL);


--
-- Name: idx_flight_trajectory_canonical; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_trajectory_canonical ON clean.flight_trajectory USING btree (flight_instance_id);


--
-- Name: idx_flight_trajectory_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_flight_trajectory_flight ON clean.flight_trajectory USING btree (flight_number, carrier_iata);


--
-- Name: idx_hfs_lookup; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_hfs_lookup ON clean.historical_feature_store USING btree (entity_type, entity_id, feature_name, information_available_at, valid_from DESC);


--
-- Name: idx_hfs_source; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_hfs_source ON clean.historical_feature_store USING btree (source, created_at);


--
-- Name: idx_hfs_unique_entity_feature; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX idx_hfs_unique_entity_feature ON clean.historical_feature_store USING btree (entity_type, entity_id, feature_name, valid_from);


--
-- Name: idx_hfs_validity; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_hfs_validity ON clean.historical_feature_store USING btree (entity_type, entity_id, valid_from, valid_to);


--
-- Name: idx_hr_readiness; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_hr_readiness ON clean.historical_readiness USING btree (entity_type, entity_id, history_ready_at);


--
-- Name: idx_ingest_events_batch; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_ingest_events_batch ON clean.adb_ingest_events USING btree (batch_id, received_at);


--
-- Name: idx_ingest_events_received_at; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_ingest_events_received_at ON clean.adb_ingest_events USING btree (received_at);


--
-- Name: idx_ingest_events_subscription; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_ingest_events_subscription ON clean.adb_ingest_events USING btree (subscription_id);


--
-- Name: idx_mf_v2_carrier; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_mf_v2_carrier ON clean.monitored_flights_v2 USING btree (carrier_iata);


--
-- Name: idx_mf_v2_date; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_mf_v2_date ON clean.monitored_flights_v2 USING btree (departure_date);


--
-- Name: idx_mf_v2_flight_date; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX idx_mf_v2_flight_date ON clean.monitored_flights_v2 USING btree (flight_number, departure_date);


--
-- Name: idx_mf_v2_status; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_mf_v2_status ON clean.monitored_flights_v2 USING btree (status);


--
-- Name: idx_mf_v2_test; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_mf_v2_test ON clean.monitored_flights_v2 USING btree (is_test);


--
-- Name: idx_pa_delivery; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_pa_delivery ON clean.processing_attempt USING btree (delivery_id, attempt_index);


--
-- Name: idx_pa_outcome; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_pa_outcome ON clean.processing_attempt USING btree (outcome, started_at_utc DESC);


--
-- Name: idx_phase6_admission_time; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_phase6_admission_time ON clean.adb_phase6_admission_attempt USING btree (attempted_at_utc DESC);


--
-- Name: idx_phase6_calendar_start; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_phase6_calendar_start ON clean.adb_phase6_calendar_day USING btree (scheduled_start_utc, run_day_index);


--
-- Name: idx_population_research_membership_airport_cutoff; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_population_research_membership_airport_cutoff ON clean.population_research_membership USING btree (source_airport_icao, cutoff_utc);


--
-- Name: idx_population_research_membership_batch_cutoff; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_population_research_membership_batch_cutoff ON clean.population_research_membership USING btree (batch_id, cutoff_utc);


--
-- Name: idx_prepaid_probe_delivery_received; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_delivery_received ON clean.prepaid_probe_delivery_runtime USING btree (session_id, received_at_utc);


--
-- Name: idx_prepaid_probe_item_aircraft; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_item_aircraft ON clean.prepaid_probe_item_runtime USING btree (session_id, aircraft_reg, received_at_utc) WHERE (aircraft_reg IS NOT NULL);


--
-- Name: idx_prepaid_probe_item_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_item_flight ON clean.prepaid_probe_item_runtime USING btree (session_id, flight_number, received_at_utc);


--
-- Name: idx_prepaid_probe_item_physical_identity; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_item_physical_identity ON clean.prepaid_probe_item_runtime USING btree (session_id, flight_instance_id, received_at_utc) WHERE (flight_instance_id IS NOT NULL);


--
-- Name: idx_prepaid_probe_item_provider_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_item_provider_flight ON clean.prepaid_probe_item_runtime USING btree (session_id, provider_flight_id) WHERE (provider_flight_id IS NOT NULL);


--
-- Name: idx_prepaid_probe_item_provisional_identity; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_item_provisional_identity ON clean.prepaid_probe_item_runtime USING btree (session_id, provisional_identity_key, received_at_utc) WHERE (provisional_identity_key IS NOT NULL);


--
-- Name: idx_prepaid_probe_item_runtime_key; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_item_runtime_key ON clean.prepaid_probe_item_runtime USING btree (session_id, runtime_flight_key, received_at_utc) WHERE (runtime_flight_key IS NOT NULL);


--
-- Name: idx_prepaid_probe_session_expiry; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_session_expiry ON clean.prepaid_probe_session_runtime USING btree (expires_at_utc);


--
-- Name: idx_prepaid_probe_session_subscription; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_prepaid_probe_session_subscription ON clean.prepaid_probe_session_runtime USING btree (provider_subscription_id) WHERE (provider_subscription_id IS NOT NULL);


--
-- Name: idx_provider_blob_expiry_pending; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_provider_blob_expiry_pending ON clean.provider_content_blob_ref USING btree (expires_at_utc, blob_ref_id) WHERE (deletion_verified_at_utc IS NULL);


--
-- Name: idx_provider_blob_source_record; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_provider_blob_source_record ON clean.provider_content_blob_ref USING btree (source_kind, source_record_id);


--
-- Name: idx_raw_airborne_batch; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_raw_airborne_batch ON clean.raw_airborne_events USING btree (batch_id, received_timestamp_utc);


--
-- Name: idx_raw_airborne_canonical_instance; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_raw_airborne_canonical_instance ON clean.raw_airborne_events USING btree (flight_instance_id);


--
-- Name: idx_raw_airborne_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_raw_airborne_flight ON clean.raw_airborne_events USING btree (flight_number, carrier_iata, loc_reported_utc);


--
-- Name: idx_raw_airborne_time; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_raw_airborne_time ON clean.raw_airborne_events USING btree (event_timestamp);


--
-- Name: idx_raw_delivery_attempt_clock; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_raw_delivery_attempt_clock ON clean.raw_delivery USING btree (delivery_attempt_utc, received_at_utc);


--
-- Name: idx_raw_delivery_provider_blob_ref; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_raw_delivery_provider_blob_ref ON clean.raw_delivery USING btree (provider_blob_ref_id) WHERE (provider_blob_ref_id IS NOT NULL);


--
-- Name: idx_rd_batch; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rd_batch ON clean.raw_delivery USING btree (batch_id, received_at_utc DESC);


--
-- Name: idx_rd_received; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rd_received ON clean.raw_delivery USING btree (received_at_utc DESC);


--
-- Name: idx_rd_sha256; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rd_sha256 ON clean.raw_delivery USING btree (raw_body_sha256);


--
-- Name: idx_rd_subscription; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rd_subscription ON clean.raw_delivery USING btree (subscription_id, received_at_utc DESC);


--
-- Name: idx_rdi_canonical; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rdi_canonical ON clean.raw_delivery_item USING btree (canonical_flight_instance_id);


--
-- Name: idx_rdi_delivery; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rdi_delivery ON clean.raw_delivery_item USING btree (delivery_id);


--
-- Name: idx_rdi_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rdi_flight ON clean.raw_delivery_item USING btree (flight_number, carrier_iata, last_updated_utc);


--
-- Name: idx_rs_v2_carrier; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rs_v2_carrier ON clean.risk_score_history_v2 USING btree (carrier_iata);


--
-- Name: idx_rs_v2_delay; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rs_v2_delay ON clean.risk_score_history_v2 USING btree (actual_delay_minutes);


--
-- Name: idx_rs_v2_flight_id; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rs_v2_flight_id ON clean.risk_score_history_v2 USING btree (monitored_flight_id);


--
-- Name: idx_rs_v2_scored_at; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rs_v2_scored_at ON clean.risk_score_history_v2 USING btree (scored_at);


--
-- Name: idx_rs_v2_tier; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_rs_v2_tier ON clean.risk_score_history_v2 USING btree (heuristic_tier);


--
-- Name: idx_sampling_draw_selected; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_sampling_draw_selected ON clean.adb_sampling_draw USING btree (selected_icao, run_day_index);


--
-- Name: idx_sampling_state_last_direct; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_sampling_state_last_direct ON clean.adb_airport_sampling_state USING btree (last_direct_observation_at);


--
-- Name: idx_webhook_flight_identity_instance; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_webhook_flight_identity_instance ON clean.webhook_flight_identity USING btree (flight_instance_id);


--
-- Name: idx_webhook_identity_resolution_flight; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_webhook_identity_resolution_flight ON clean.webhook_identity_resolution USING btree (flight_instance_id) WHERE (flight_instance_id IS NOT NULL);


--
-- Name: idx_webhook_identity_resolution_status; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_webhook_identity_resolution_status ON clean.webhook_identity_resolution USING btree (resolution_status, resolved_at_utc);


--
-- Name: idx_webhook_identity_route_first_schedule; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_webhook_identity_route_first_schedule ON clean.webhook_flight_identity USING btree (operating_carrier, operating_flight_number, origin_icao, original_destination_icao, initial_service_date, initial_scheduled_gate_out_utc) WHERE (provider_flight_id IS NULL);


--
-- Name: idx_webhook_schedule_version_instance_time; Type: INDEX; Schema: clean; Owner: -
--

CREATE INDEX idx_webhook_schedule_version_instance_time ON clean.webhook_flight_schedule_version USING btree (flight_instance_id, observed_scheduled_gate_out_utc);


--
-- Name: uq_airborne_snapshot_canonical_observation; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX uq_airborne_snapshot_canonical_observation ON clean.flight_airborne_snapshots USING btree (flight_instance_id, event_timestamp) WHERE (flight_instance_id IS NOT NULL);


--
-- Name: uq_budget_adjustment_target; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX uq_budget_adjustment_target ON clean.adb_budget_day_adjustment USING btree (target_run_day_index) WHERE (target_run_day_index IS NOT NULL);


--
-- Name: uq_clean_airborne_canonical_observation; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX uq_clean_airborne_canonical_observation ON clean.clean_airborne_points USING btree (flight_instance_id, event_timestamp) WHERE (flight_instance_id IS NOT NULL);


--
-- Name: uq_flight_population_member_id; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX uq_flight_population_member_id ON clean.flight_population USING btree (population_member_id);


--
-- Name: uq_flight_trajectory_canonical; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX uq_flight_trajectory_canonical ON clean.flight_trajectory USING btree (flight_instance_id) WHERE (flight_instance_id IS NOT NULL);


--
-- Name: uq_raw_delivery_notification_attempt; Type: INDEX; Schema: clean; Owner: -
--

CREATE UNIQUE INDEX uq_raw_delivery_notification_attempt ON clean.raw_delivery USING btree (notification_id, delivery_attempt_seq_no) WHERE ((notification_id IS NOT NULL) AND (delivery_attempt_seq_no IS NOT NULL));


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: disruption_alternatives_flight_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX disruption_alternatives_flight_id_idx ON public.disruption_alternatives USING btree (monitored_flight_id);


--
-- Name: flight_travelers_agency_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flight_travelers_agency_id_idx ON public.flight_travelers USING btree (agency_id);


--
-- Name: flight_travelers_flight_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flight_travelers_flight_id_idx ON public.flight_travelers USING btree (monitored_flight_id);


--
-- Name: hotel_bookings_hotel_option_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hotel_bookings_hotel_option_id_idx ON public.hotel_bookings USING btree (hotel_option_id);


--
-- Name: hotel_bookings_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hotel_bookings_user_id_idx ON public.hotel_bookings USING btree (user_id);


--
-- Name: hotel_options_search_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hotel_options_search_id_idx ON public.hotel_options USING btree (search_id);


--
-- Name: monitored_flights_agency_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX monitored_flights_agency_id_idx ON public.monitored_flights USING btree (agency_id);


--
-- Name: monitored_flights_resolved_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX monitored_flights_resolved_status_idx ON public.monitored_flights USING btree (resolved_status);


--
-- Name: monitored_flights_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX monitored_flights_status_idx ON public.monitored_flights USING btree (status);


--
-- Name: public_flight_subscribers_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX public_flight_subscribers_email_idx ON public.public_flight_subscribers USING btree (email);


--
-- Name: public_flight_subscribers_flight_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX public_flight_subscribers_flight_idx ON public.public_flight_subscribers USING btree (flight_number, departure_date);


--
-- Name: risk_score_history_flight_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_score_history_flight_id_idx ON public.risk_score_history USING btree (monitored_flight_id);


--
-- Name: trip_requests_payment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trip_requests_payment_id_idx ON public.trip_requests USING btree (payment_id);


--
-- Name: user_monitored_flights_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_monitored_flights_status_idx ON public.user_monitored_flights USING btree (status);


--
-- Name: user_monitored_flights_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_monitored_flights_user_id_idx ON public.user_monitored_flights USING btree (user_id);


--
-- Name: adb_anchor_probe trg_adb_anchor_probe_provider_account_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_adb_anchor_probe_provider_account_guard BEFORE UPDATE ON clean.adb_anchor_probe FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_account_expiry();


--
-- Name: adb_collection_batches trg_adb_collection_batches_provider_account_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_adb_collection_batches_provider_account_guard BEFORE UPDATE ON clean.adb_collection_batches FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_account_expiry();


--
-- Name: adb_ingest_events trg_adb_ingest_events_provider_scope_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_adb_ingest_events_provider_scope_guard BEFORE UPDATE ON clean.adb_ingest_events FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_scope_expiry();


--
-- Name: adb_ingest_events trg_adb_ingest_events_retention_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_adb_ingest_events_retention_guard BEFORE UPDATE ON clean.adb_ingest_events FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_raw_expiry_transition();


--
-- Name: adb_collection_batches trg_apply_phase6_budget_limits; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_apply_phase6_budget_limits BEFORE INSERT ON clean.adb_collection_batches FOR EACH ROW EXECUTE FUNCTION clean.apply_phase6_budget_limits_before_insert();


--
-- Name: fids_query_response trg_fids_query_response_immutable; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_fids_query_response_immutable BEFORE DELETE OR UPDATE ON clean.fids_query_response FOR EACH ROW EXECUTE FUNCTION clean.reject_fids_observation_mutation();


--
-- Name: fids_query_response trg_fids_response_expire_population; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_fids_response_expire_population AFTER UPDATE OF raw_expired_at_utc ON clean.fids_query_response FOR EACH ROW WHEN (((old.raw_expired_at_utc IS NULL) AND (new.raw_expired_at_utc IS NOT NULL))) EXECUTE FUNCTION clean.expire_fids_population_from_response();


--
-- Name: flight_data_pre_post trg_flight_data_pre_post_retention_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_flight_data_pre_post_retention_guard BEFORE UPDATE ON clean.flight_data_pre_post FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_raw_expiry_transition();


--
-- Name: flight_events trg_flight_events_mark_population_captured; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_flight_events_mark_population_captured AFTER INSERT ON clean.flight_events FOR EACH ROW EXECUTE FUNCTION clean.mark_population_research_membership_captured();


--
-- Name: flight_outcomes trg_flight_outcomes_population_link; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_flight_outcomes_population_link AFTER INSERT OR UPDATE OF label_status ON clean.flight_outcomes FOR EACH ROW EXECUTE FUNCTION clean.sync_population_research_outcome_link();


--
-- Name: flight_population trg_flight_population_fids_immutable; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_flight_population_fids_immutable BEFORE DELETE OR UPDATE ON clean.flight_population FOR EACH ROW WHEN ((old.source_type = 'fids'::text)) EXECUTE FUNCTION clean.reject_fids_observation_mutation();


--
-- Name: flight_population trg_flight_population_research_membership; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_flight_population_research_membership AFTER INSERT ON clean.flight_population FOR EACH ROW EXECUTE FUNCTION clean.ensure_population_research_membership();


--
-- Name: flight_snapshots trg_flight_snapshots_population_member; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_flight_snapshots_population_member BEFORE INSERT OR UPDATE OF population_query_id, flight_instance_id ON clean.flight_snapshots FOR EACH ROW EXECUTE FUNCTION clean.attach_population_member_to_snapshot();


--
-- Name: adb_collection_batches trg_guard_phase6_parent_start_time; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_guard_phase6_parent_start_time BEFORE INSERT ON clean.adb_collection_batches FOR EACH ROW EXECUTE FUNCTION clean.guard_phase6_parent_start_time();


--
-- Name: adb_collection_batches trg_mark_phase6_hard_cap_mismatch; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_mark_phase6_hard_cap_mismatch BEFORE UPDATE OF status, credits_consumed_actual, reconciliation_status ON clean.adb_collection_batches FOR EACH ROW EXECUTE FUNCTION clean.mark_phase6_hard_cap_mismatch();


--
-- Name: adb_probe_reconciliation_evidence trg_phase2g_reconciliation_evidence_immutable; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_phase2g_reconciliation_evidence_immutable BEFORE DELETE OR UPDATE ON clean.adb_probe_reconciliation_evidence FOR EACH ROW EXECUTE FUNCTION clean.reject_phase2g_reconciliation_evidence_mutation();


--
-- Name: adb_phase6_admission_attempt trg_phase6_create_uncertainty_stop; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_phase6_create_uncertainty_stop AFTER INSERT ON clean.adb_phase6_admission_attempt FOR EACH ROW EXECUTE FUNCTION clean.stop_on_phase6_create_uncertainty();


--
-- Name: adb_phase6_settlement_evidence trg_phase6_settlement_evidence_immutable; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_phase6_settlement_evidence_immutable BEFORE DELETE OR UPDATE ON clean.adb_phase6_settlement_evidence FOR EACH ROW EXECUTE FUNCTION clean.reject_phase6_settlement_evidence_mutation();


--
-- Name: adb_anchor_probe trg_probe_create_uncertainty_stop; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_probe_create_uncertainty_stop AFTER UPDATE OF status, stop_reason ON clean.adb_anchor_probe FOR EACH ROW EXECUTE FUNCTION clean.stop_on_probe_create_uncertainty();


--
-- Name: processing_attempt trg_processing_attempt_provider_scope_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_processing_attempt_provider_scope_guard BEFORE UPDATE ON clean.processing_attempt FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_scope_expiry();


--
-- Name: adb_incident_stop trg_propagate_incident_to_phase6_failure; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_propagate_incident_to_phase6_failure AFTER INSERT ON clean.adb_incident_stop FOR EACH ROW EXECUTE FUNCTION clean.propagate_incident_to_phase6_failure();


--
-- Name: provider_content_blob_ref trg_provider_content_blob_ref_immutable; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_provider_content_blob_ref_immutable BEFORE DELETE OR UPDATE ON clean.provider_content_blob_ref FOR EACH ROW EXECUTE FUNCTION clean.guard_provider_content_blob_ref();


--
-- Name: raw_delivery_item trg_raw_delivery_item_provider_scope_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_raw_delivery_item_provider_scope_guard BEFORE UPDATE ON clean.raw_delivery_item FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_scope_expiry();


--
-- Name: raw_delivery_item trg_raw_delivery_item_retention_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_raw_delivery_item_retention_guard BEFORE UPDATE ON clean.raw_delivery_item FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_raw_expiry_transition();


--
-- Name: raw_delivery trg_raw_delivery_provider_scope_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_raw_delivery_provider_scope_guard BEFORE UPDATE ON clean.raw_delivery FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_provider_scope_expiry();


--
-- Name: raw_delivery trg_raw_delivery_retention_guard; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_raw_delivery_retention_guard BEFORE UPDATE ON clean.raw_delivery FOR EACH ROW EXECUTE FUNCTION clean.guard_v39_raw_expiry_transition();


--
-- Name: adb_collection_batches trg_record_phase6_hard_cap_overshoot; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_record_phase6_hard_cap_overshoot AFTER UPDATE OF credits_consumed_actual ON clean.adb_collection_batches FOR EACH ROW EXECUTE FUNCTION clean.record_phase6_hard_cap_overshoot();


--
-- Name: adb_collection_segments trg_require_phase6_settlement_evidence; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_require_phase6_settlement_evidence BEFORE UPDATE OF reconciliation_status, settled_alert_spend, balance_stable_after, notification_items_internal ON clean.adb_collection_segments FOR EACH ROW EXECUTE FUNCTION clean.require_phase6_settlement_evidence();


--
-- Name: retention_tombstone trg_retention_tombstone_immutable; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_retention_tombstone_immutable BEFORE DELETE OR UPDATE ON clean.retention_tombstone FOR EACH ROW EXECUTE FUNCTION clean.reject_retention_tombstone_mutation();


--
-- Name: webhook_identity_resolution trg_webhook_identity_resolution_immutable; Type: TRIGGER; Schema: clean; Owner: -
--

CREATE TRIGGER trg_webhook_identity_resolution_immutable BEFORE DELETE OR UPDATE ON clean.webhook_identity_resolution FOR EACH ROW EXECUTE FUNCTION clean.guard_webhook_identity_resolution_retention();


--
-- Name: adb_anchor_probe adb_anchor_probe_budget_day_fk; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_anchor_probe
    ADD CONSTRAINT adb_anchor_probe_budget_day_fk FOREIGN KEY (probe_budget_day_id) REFERENCES clean.adb_probe_budget_day(probe_budget_day_id);


--
-- Name: adb_collection_segments adb_collection_segments_batch_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_collection_segments
    ADD CONSTRAINT adb_collection_segments_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES clean.adb_collection_batches(batch_id);


--
-- Name: adb_phase6_settlement_evidence adb_phase6_settlement_evidence_batch_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_settlement_evidence
    ADD CONSTRAINT adb_phase6_settlement_evidence_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES clean.adb_collection_batches(batch_id);


--
-- Name: adb_phase6_settlement_evidence adb_phase6_settlement_evidence_segment_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_phase6_settlement_evidence
    ADD CONSTRAINT adb_phase6_settlement_evidence_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES clean.adb_collection_segments(segment_id);


--
-- Name: adb_probe_reconciliation_evidence adb_probe_reconciliation_evidence_probe_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_probe_reconciliation_evidence
    ADD CONSTRAINT adb_probe_reconciliation_evidence_probe_id_fkey FOREIGN KEY (probe_id) REFERENCES clean.adb_anchor_probe(probe_id);


--
-- Name: adb_sampling_draw adb_sampling_draw_run_day_index_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.adb_sampling_draw
    ADD CONSTRAINT adb_sampling_draw_run_day_index_fkey FOREIGN KEY (run_day_index) REFERENCES clean.adb_phase6_calendar_day(run_day_index);


--
-- Name: airborne_eligibility_evidence airborne_eligibility_evidence_population_query_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.airborne_eligibility_evidence
    ADD CONSTRAINT airborne_eligibility_evidence_population_query_id_fkey FOREIGN KEY (population_query_id) REFERENCES clean.fids_query_response(population_query_id);


--
-- Name: fids_query_response fids_query_response_provider_blob_ref_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.fids_query_response
    ADD CONSTRAINT fids_query_response_provider_blob_ref_id_fkey FOREIGN KEY (provider_blob_ref_id) REFERENCES clean.provider_content_blob_ref(blob_ref_id);


--
-- Name: flight_population flight_population_population_query_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_population
    ADD CONSTRAINT flight_population_population_query_id_fkey FOREIGN KEY (population_query_id) REFERENCES clean.fids_query_response(population_query_id);


--
-- Name: flight_snapshots flight_snapshots_population_member_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.flight_snapshots
    ADD CONSTRAINT flight_snapshots_population_member_id_fkey FOREIGN KEY (population_member_id) REFERENCES clean.population_research_membership(population_member_id);


--
-- Name: population_research_outcome_link population_research_outcome_link_population_member_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.population_research_outcome_link
    ADD CONSTRAINT population_research_outcome_link_population_member_id_fkey FOREIGN KEY (population_member_id) REFERENCES clean.population_research_membership(population_member_id);


--
-- Name: raw_delivery raw_delivery_provider_blob_ref_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.raw_delivery
    ADD CONSTRAINT raw_delivery_provider_blob_ref_id_fkey FOREIGN KEY (provider_blob_ref_id) REFERENCES clean.provider_content_blob_ref(blob_ref_id);


--
-- Name: risk_score_history_v2 risk_score_history_v2_monitored_flight_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.risk_score_history_v2
    ADD CONSTRAINT risk_score_history_v2_monitored_flight_id_fkey FOREIGN KEY (monitored_flight_id) REFERENCES clean.monitored_flights_v2(id);


--
-- Name: webhook_identity_resolution webhook_identity_resolution_delivery_id_fkey; Type: FK CONSTRAINT; Schema: clean; Owner: -
--

ALTER TABLE ONLY clean.webhook_identity_resolution
    ADD CONSTRAINT webhook_identity_resolution_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES clean.raw_delivery(delivery_id);


--
-- Name: bland_calls bland_calls_call_request_id_call_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bland_calls
    ADD CONSTRAINT bland_calls_call_request_id_call_requests_id_fk FOREIGN KEY (call_request_id) REFERENCES public.call_requests(id);


--
-- Name: bland_calls bland_calls_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bland_calls
    ADD CONSTRAINT bland_calls_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: calendar_entries calendar_entries_payment_id_payments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_entries
    ADD CONSTRAINT calendar_entries_payment_id_payments_id_fk FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: calendar_entries calendar_entries_proposal_id_itinerary_proposals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_entries
    ADD CONSTRAINT calendar_entries_proposal_id_itinerary_proposals_id_fk FOREIGN KEY (proposal_id) REFERENCES public.itinerary_proposals(id);


--
-- Name: calendar_entries calendar_entries_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_entries
    ADD CONSTRAINT calendar_entries_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: call_requests call_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_requests
    ADD CONSTRAINT call_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: disruption_alternatives disruption_alternatives_monitored_flight_id_monitored_flights_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disruption_alternatives
    ADD CONSTRAINT disruption_alternatives_monitored_flight_id_monitored_flights_i FOREIGN KEY (monitored_flight_id) REFERENCES public.monitored_flights(id);


--
-- Name: flight_travelers flight_travelers_agency_id_agency_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_travelers
    ADD CONSTRAINT flight_travelers_agency_id_agency_accounts_id_fk FOREIGN KEY (agency_id) REFERENCES public.agency_accounts(id);


--
-- Name: flight_travelers flight_travelers_monitored_flight_id_monitored_flights_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_travelers
    ADD CONSTRAINT flight_travelers_monitored_flight_id_monitored_flights_id_fk FOREIGN KEY (monitored_flight_id) REFERENCES public.monitored_flights(id) ON DELETE CASCADE;


--
-- Name: health_reports health_reports_requested_by_agency_id_agency_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_reports
    ADD CONSTRAINT health_reports_requested_by_agency_id_agency_accounts_id_fk FOREIGN KEY (requested_by_agency_id) REFERENCES public.agency_accounts(id);


--
-- Name: hotel_bookings hotel_bookings_hotel_option_id_hotel_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_hotel_option_id_hotel_options_id_fk FOREIGN KEY (hotel_option_id) REFERENCES public.hotel_options(id);


--
-- Name: hotel_bookings hotel_bookings_payment_id_payments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_payment_id_payments_id_fk FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: hotel_bookings hotel_bookings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: hotel_options hotel_options_search_id_hotel_searches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_options
    ADD CONSTRAINT hotel_options_search_id_hotel_searches_id_fk FOREIGN KEY (search_id) REFERENCES public.hotel_searches(id);


--
-- Name: hotel_searches hotel_searches_call_request_id_call_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_searches
    ADD CONSTRAINT hotel_searches_call_request_id_call_requests_id_fk FOREIGN KEY (call_request_id) REFERENCES public.call_requests(id);


--
-- Name: hotel_searches hotel_searches_proposal_id_itinerary_proposals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_searches
    ADD CONSTRAINT hotel_searches_proposal_id_itinerary_proposals_id_fk FOREIGN KEY (proposal_id) REFERENCES public.itinerary_proposals(id);


--
-- Name: hotel_searches hotel_searches_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_searches
    ADD CONSTRAINT hotel_searches_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: itinerary_proposals itinerary_proposals_call_request_id_call_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_proposals
    ADD CONSTRAINT itinerary_proposals_call_request_id_call_requests_id_fk FOREIGN KEY (call_request_id) REFERENCES public.call_requests(id);


--
-- Name: itinerary_proposals itinerary_proposals_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itinerary_proposals
    ADD CONSTRAINT itinerary_proposals_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: monitored_flights monitored_flights_agency_id_agency_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitored_flights
    ADD CONSTRAINT monitored_flights_agency_id_agency_accounts_id_fk FOREIGN KEY (agency_id) REFERENCES public.agency_accounts(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payments payments_manual_booking_resolved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_manual_booking_resolved_by_users_id_fk FOREIGN KEY (manual_booking_resolved_by) REFERENCES public.users(id);


--
-- Name: payments payments_proposal_id_itinerary_proposals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_proposal_id_itinerary_proposals_id_fk FOREIGN KEY (proposal_id) REFERENCES public.itinerary_proposals(id);


--
-- Name: payments payments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: promo_codes promo_codes_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: proposal_items proposal_items_proposal_id_itinerary_proposals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_items
    ADD CONSTRAINT proposal_items_proposal_id_itinerary_proposals_id_fk FOREIGN KEY (proposal_id) REFERENCES public.itinerary_proposals(id);


--
-- Name: risk_score_history risk_score_history_monitored_flight_id_monitored_flights_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_score_history
    ADD CONSTRAINT risk_score_history_monitored_flight_id_monitored_flights_id_fk FOREIGN KEY (monitored_flight_id) REFERENCES public.monitored_flights(id);


--
-- Name: saved_cards saved_cards_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_cards
    ADD CONSTRAINT saved_cards_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: traveler_profiles traveler_profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_profiles
    ADD CONSTRAINT traveler_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: trip_requests trip_requests_payment_id_payments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_requests
    ADD CONSTRAINT trip_requests_payment_id_payments_id_fk FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: trip_requests trip_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_requests
    ADD CONSTRAINT trip_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_monitored_flights user_monitored_flights_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_monitored_flights
    ADD CONSTRAINT user_monitored_flights_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Sf7GZf11mNAJEMKDmC5uZ2JnJP0vqg5hfjXbwlba0RfJwPLarH7SXoeDeOD4NJZ

