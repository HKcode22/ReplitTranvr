-- V0088 STAGED / DISPOSABLE PG16 ONLY: V0087 real queue -> Stage14 same-tx
-- admission, with legacy-compatible scoped BEFORE INSERT/UPDATE/DELETE.
-- NOT A TEAM NEON INSTALLER. V0087 is already installed INERT by owner.
-- DO NOT apply V0088 live: SECURITY DEFINER owner/actor, default grants,
-- snapshot multi-writer compatibility, and incident rollback must first be
-- reviewed under the actual NOLOGIN owner and authenticated GH credential.
--
-- All new objects and trigger changes are ONE PostgreSQL transaction.
-- The prior population-member trigger is NOT renamed or disabled.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15000ms';

CREATE TABLE clean.phase5_cd_pre_admission_receipt_v39 (
 task_id bigint PRIMARY KEY REFERENCES clean.phase5_cd_pre_task_v39(task_id),
 transaction_id bigint NOT NULL,
 backend_pid integer NOT NULL,
 login_role text NOT NULL,
 lease_owner text NOT NULL,
 lease_generation bigint NOT NULL CHECK(lease_generation>=1),
 packet_sha256 text NOT NULL CHECK(packet_sha256~'^[0-9a-f]{64}$'),
 manifest_sha256 text NOT NULL CHECK(manifest_sha256~'^[0-9a-f]{64}$'),
 flight_instance_id text NOT NULL,
 horizon text NOT NULL CHECK(horizon IN ('T-24h','T-6h','T-90m')),
 selected_native_t_utc timestamptz NOT NULL,
 prediction_cutoff_utc timestamptz NOT NULL,
 source_population_query_id text NOT NULL,
 source_response_sha256 text NOT NULL CHECK(source_response_sha256~'^[0-9a-f]{64}$'),
 source_rights_sha256 text NOT NULL CHECK(source_rights_sha256~'^[0-9a-f]{64}$'),
 admitted_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE (transaction_id,backend_pid)
);
REVOKE ALL ON TABLE clean.phase5_cd_pre_admission_receipt_v39 FROM PUBLIC;

CREATE FUNCTION clean.phase5_cd_admit_stage14_pre_v39(
 p_task_id bigint,p_owner text,p_generation bigint,p_packet text,
 p_manifest text,p_flight text,p_horizon text,p_native_t timestamptz,
 p_cutoff timestamptz,p_population_query_id text,
 p_response_sha text,p_rights_sha text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $admit$
DECLARE
 current_task clean.phase5_cd_pre_task_v39%ROWTYPE;
 receipt clean.phase5_cd_pre_admission_receipt_v39%ROWTYPE;
 observed_at timestamptz;
BEGIN
 IF p_task_id IS NULL OR p_task_id<1 OR p_generation IS NULL
    OR p_generation<1 OR p_owner IS NULL OR length(p_owner)<5
    OR p_packet IS NULL OR p_packet !~ '^[0-9a-f]{64}$' THEN
   RAISE EXCEPTION 'P5_CD_V0088_CLAIM_ARGUMENTS_INVALID';
 END IF;
 SELECT * INTO current_task FROM clean.phase5_cd_pre_task_v39
 WHERE task_id=p_task_id FOR UPDATE NOWAIT;
 observed_at:=clock_timestamp();
 IF NOT FOUND
    OR current_task.state<>'WRITE_STARTED_UNKNOWN'
    OR current_task.flight_instance_id IS DISTINCT FROM p_flight
    OR current_task.horizon IS DISTINCT FROM p_horizon
    OR current_task.manifest_sha256 IS DISTINCT FROM p_manifest
    OR current_task.selected_native_t_utc IS DISTINCT FROM p_native_t
    OR current_task.prediction_cutoff_utc IS DISTINCT FROM p_cutoff
    OR current_task.packet_sha256 IS DISTINCT FROM p_packet
    OR current_task.source_population_query_id IS DISTINCT FROM p_population_query_id
    OR current_task.source_response_sha256 IS DISTINCT FROM p_response_sha
    OR current_task.reviewed_source_rights_sha256 IS DISTINCT FROM p_rights_sha
    OR current_task.lease_owner IS DISTINCT FROM p_owner
    OR current_task.lease_generation IS DISTINCT FROM p_generation
    OR current_task.lease_until_utc<=observed_at+INTERVAL '2 seconds'
    OR current_task.prediction_cutoff_utc<=observed_at+INTERVAL '2 seconds'
    OR current_task.source_expires_at_utc<=observed_at THEN
   RAISE EXCEPTION 'P5_CD_V0088_LEASE_SOURCE_OR_CUTOFF_FENCE_FAILED';
 END IF;
 INSERT INTO clean.phase5_cd_pre_admission_receipt_v39(
  task_id,transaction_id,backend_pid,login_role,lease_owner,
  lease_generation,packet_sha256,manifest_sha256,flight_instance_id,
  horizon,selected_native_t_utc,prediction_cutoff_utc,
  source_population_query_id,source_response_sha256,source_rights_sha256
 ) VALUES(
  p_task_id,txid_current(),pg_backend_pid(),session_user,p_owner,
  p_generation,p_packet,p_manifest,p_flight,p_horizon,p_native_t,p_cutoff,
  p_population_query_id,p_response_sha,p_rights_sha
 ) ON CONFLICT(task_id) DO NOTHING;
 SELECT * INTO receipt FROM clean.phase5_cd_pre_admission_receipt_v39
 WHERE task_id=p_task_id;
 IF NOT FOUND OR receipt.transaction_id IS DISTINCT FROM txid_current()
    OR receipt.backend_pid IS DISTINCT FROM pg_backend_pid()
    OR receipt.login_role IS DISTINCT FROM session_user
    OR receipt.lease_owner IS DISTINCT FROM p_owner
    OR receipt.lease_generation IS DISTINCT FROM p_generation
    OR receipt.packet_sha256 IS DISTINCT FROM p_packet
    OR receipt.manifest_sha256 IS DISTINCT FROM p_manifest
    OR receipt.flight_instance_id IS DISTINCT FROM p_flight
    OR receipt.horizon IS DISTINCT FROM p_horizon
    OR receipt.selected_native_t_utc IS DISTINCT FROM p_native_t
    OR receipt.prediction_cutoff_utc IS DISTINCT FROM p_cutoff
    OR receipt.source_population_query_id IS DISTINCT FROM p_population_query_id
    OR receipt.source_response_sha256 IS DISTINCT FROM p_response_sha
    OR receipt.source_rights_sha256 IS DISTINCT FROM p_rights_sha
 THEN
   RAISE EXCEPTION 'P5_CD_V0088_RECEIPT_REPLAY_OR_CHANGED_ARGS';
 END IF;
 RETURN true;
END $admit$;

CREATE FUNCTION clean.phase5_cd_scope_snapshot_insert_v39()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $trigger$
DECLARE
 enrolled_id bigint;
 receipt clean.phase5_cd_pre_admission_receipt_v39%ROWTYPE;
 owner_task clean.phase5_cd_pre_task_v39%ROWTYPE;
BEGIN
 -- Queue admission applies to PRE_DEPARTURE only. Do not block future
 -- POST/AIRBORNE observations written through the shared snapshots table.
 -- UPDATE trigger below prevents a non-PRE row being promoted into PRE
 -- for an enrolled flight without authorization.
 IF NEW.prediction_state IS DISTINCT FROM 'PRE_DEPARTURE' THEN
   -- Non-PRE facts stay writable, but may not occupy the EXACT reserved
   -- PRE unique key and thereby deny the enrolled PRE its one legal slot.
   IF EXISTS(SELECT 1 FROM clean.phase5_cd_pre_task_v39 t
     WHERE t.flight_instance_id=NEW.flight_instance_id
       AND t.horizon=NEW.horizon
       AND t.prediction_cutoff_utc=NEW.prediction_cutoff_utc) THEN
     RAISE EXCEPTION 'P5_CD_V0088_RESERVED_PRE_KEY_COLLISION';
   END IF;
   RETURN NEW;
 END IF;
 SELECT task_id INTO enrolled_id
 FROM clean.phase5_cd_pre_task_v39
 WHERE flight_instance_id=NEW.flight_instance_id AND horizon=NEW.horizon;
 IF NOT FOUND THEN
   -- An enrolled flight cannot escape admission by selecting a horizon
   -- that has not yet been registered in the C+D queue.
   IF EXISTS(
    SELECT 1 FROM clean.phase5_cd_pre_task_v39
     WHERE flight_instance_id=NEW.flight_instance_id) THEN
    RAISE EXCEPTION 'P5_CD_V0088_ENROLLED_FLIGHT_HORIZON_NOT_REGISTERED';
   END IF;
   RETURN NEW; -- Preserve unrelated legacy PRE behavior.
 END IF;
 IF NEW.prediction_state IS DISTINCT FROM 'PRE_DEPARTURE'
    OR NEW.selected_t_milestone_utc IS NULL
    OR NEW.prediction_cutoff_utc IS NULL THEN
   RAISE EXCEPTION 'P5_CD_V0088_ENROLLED_PRE_INVALID';
 END IF;
 SELECT * INTO receipt FROM clean.phase5_cd_pre_admission_receipt_v39
 WHERE task_id=enrolled_id AND transaction_id=txid_current()
   AND backend_pid=pg_backend_pid() AND login_role=session_user
   AND flight_instance_id=NEW.flight_instance_id
   AND horizon=NEW.horizon
   AND selected_native_t_utc=NEW.selected_t_milestone_utc
   AND prediction_cutoff_utc=NEW.prediction_cutoff_utc
   AND source_population_query_id=NEW.population_query_id::text
   AND source_response_sha256=NEW.fids_response_hash;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'P5_CD_V0088_INSERT_REQUIRES_SAME_TX_RECEIPT';
 END IF;
 SELECT * INTO owner_task FROM clean.phase5_cd_pre_task_v39
 WHERE task_id=enrolled_id AND state='WRITE_STARTED_UNKNOWN'
   AND lease_owner=receipt.lease_owner
   AND lease_generation=receipt.lease_generation
   AND packet_sha256=receipt.packet_sha256
   AND reviewed_source_rights_sha256=receipt.source_rights_sha256
   AND lease_until_utc>clock_timestamp()+INTERVAL '2 seconds'
   AND prediction_cutoff_utc>clock_timestamp()+INTERVAL '2 seconds';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'P5_CD_V0088_TRIGGER_LEASE_EXPIRED_OR_CHANGED';
 END IF;
 RETURN NEW;
END $trigger$;
CREATE TRIGGER p5_cd_v0088_registered_pre_insert_guard
 BEFORE INSERT ON clean.flight_snapshots
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_cd_scope_snapshot_insert_v39();

CREATE FUNCTION clean.phase5_cd_scope_snapshot_immutable_v39()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $immutable$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.prediction_state IS DISTINCT FROM 'PRE_DEPARTURE' THEN
    RETURN OLD;
  END IF;
  IF EXISTS(SELECT 1 FROM clean.phase5_cd_pre_task_v39
    WHERE flight_instance_id=OLD.flight_instance_id) THEN
    RAISE EXCEPTION 'P5_CD_V0088_ENROLLED_SNAPSHOT_IMMUTABLE';
  END IF;
  RETURN OLD;
 END IF;
 -- Neither editing a real enrolled PRE nor relabeling a non-PRE row into
 -- an enrolled PRE may bypass the registered flight's immutable identity.
 -- A POST-to-POST UPDATE also cannot reserve the C+D flight's
 -- exact PRE unique identity before the real protected PRE is written.
 IF NEW.prediction_state IS DISTINCT FROM 'PRE_DEPARTURE'
   AND EXISTS(SELECT 1 FROM clean.phase5_cd_pre_task_v39 t
     WHERE t.flight_instance_id=NEW.flight_instance_id
       AND t.horizon=NEW.horizon
       AND t.prediction_cutoff_utc=NEW.prediction_cutoff_utc) THEN
   RAISE EXCEPTION 'P5_CD_V0088_RESERVED_PRE_KEY_COLLISION';
 END IF;
 IF (OLD.prediction_state='PRE_DEPARTURE'
     OR NEW.prediction_state='PRE_DEPARTURE')
   AND EXISTS(SELECT 1 FROM clean.phase5_cd_pre_task_v39
     WHERE flight_instance_id IN
       (OLD.flight_instance_id,NEW.flight_instance_id)) THEN
   RAISE EXCEPTION 'P5_CD_V0088_ENROLLED_SNAPSHOT_IMMUTABLE';
 END IF;
 RETURN NEW;
END $immutable$;
CREATE TRIGGER p5_cd_v0088_registered_pre_immutable_guard
 BEFORE UPDATE OR DELETE ON clean.flight_snapshots
 FOR EACH ROW EXECUTE FUNCTION clean.phase5_cd_scope_snapshot_immutable_v39();

-- Atomic NO-ACCESS state until a distinct least-privilege owner/grant
-- commissioner is independently audited. The table/function creator is
-- a temporary privileged owner in disposable CI only, not a production
-- entitlement. A real deployment must use a dedicated reviewed NOLOGIN
-- function owner and role authentication.
REVOKE ALL ON TABLE clean.phase5_cd_pre_admission_receipt_v39 FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_admit_stage14_pre_v39(
 bigint,text,bigint,text,text,text,text,timestamptz,
 timestamptz,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_scope_snapshot_insert_v39() FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.phase5_cd_scope_snapshot_immutable_v39() FROM PUBLIC;
COMMIT;
