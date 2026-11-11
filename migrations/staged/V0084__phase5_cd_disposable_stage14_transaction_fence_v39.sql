-- V0084 C+D proof of concept, STRICTLY DISPOSABLE PG16 CI.
-- NEVER put in migrations/current or run against team-managed Neon.
-- This is not a reviewed production schema/role migration or Phase6 GO.
-- Input: one reviewed task per canonical flight + horizon, independent
-- selected-native-T cutoff, signed packet hash and claimed lease generation.
-- The SECURITY DEFINER function is owned by temporary CI postgres only:
-- a future production version MUST use a distinct least-privilege NOLOGIN
-- function owner, audited grant/RLS/retention and unconditional admission.
CREATE SCHEMA p5_cd_stage14_ci;

CREATE TABLE p5_cd_stage14_ci.task (
 id bigserial PRIMARY KEY,
 batch_lanes integer NOT NULL CHECK(batch_lanes IN (1,2,4,8,16)),
 flight_instance_id text NOT NULL CHECK(length(flight_instance_id) BETWEEN 5 AND 200),
 horizon text NOT NULL CHECK (horizon IN ('T-24h','T-6h','T-90m')),
 selected_native_t timestamptz NOT NULL,
 own_cutoff timestamptz NOT NULL,
 packet_sha text NOT NULL CHECK(packet_sha ~ '^[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'READY'
   CHECK(status IN ('READY','CLAIMED','WRITE_STARTED_UNKNOWN','VERIFIED')),
 owner text,
 generation bigint NOT NULL DEFAULT 0 CHECK(generation>=0),
 lease_until timestamptz,
 CONSTRAINT p5_cd_stage14_one_flight_horizon UNIQUE(flight_instance_id,horizon),
 CONSTRAINT p5_cd_stage14_native_t_cutoff CHECK (
  own_cutoff=selected_native_t-(
   CASE horizon
     WHEN 'T-24h' THEN INTERVAL '24 hours'
     WHEN 'T-6h' THEN INTERVAL '6 hours'
     ELSE INTERVAL '90 minutes'
   END)
 )
);
CREATE INDEX p5_cd_stage14_due_claim_ci
 ON p5_cd_stage14_ci.task(batch_lanes,own_cutoff,id)
 WHERE status='READY';
REVOKE ALL ON SCHEMA p5_cd_stage14_ci FROM PUBLIC;
REVOKE ALL ON TABLE p5_cd_stage14_ci.task FROM PUBLIC;

-- Runs WITHIN Stage14's SERIALIZABLE transaction, directly before source
-- reads and again before COMMIT. FOR UPDATE NOWAIT holds the row lock until
-- Stage14 COMMIT or ROLLBACK; lease reclamation UPDATE cannot race a writer.
-- A stale worker with old generation or different owner cannot pass.
-- Both the server DB clock and immutable native T/cutoff are checked.
-- All names schema-qualified, no dynamic SQL; only the restricted PRE
-- writer role may receive EXECUTE in the disposable test fixture.
CREATE FUNCTION p5_cd_stage14_ci.assert_write_fence(
 expected_task_id bigint,
 expected_flight_instance_id text,
 expected_horizon text,
 expected_native_t timestamptz,
 expected_cutoff timestamptz,
 expected_packet_sha text,
 expected_owner text,
 expected_generation bigint
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $guard$
DECLARE
 current_task p5_cd_stage14_ci.task%ROWTYPE;
 observed_at timestamptz;
BEGIN
 IF expected_task_id IS NULL OR expected_generation IS NULL
    OR expected_generation < 1
    OR expected_owner IS NULL OR length(expected_owner)<5
    OR expected_packet_sha !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'P5_CD_INVALID_CLAIM_ARGUMENTS';
 END IF;
 SELECT * INTO current_task FROM p5_cd_stage14_ci.task
  WHERE id=expected_task_id
  FOR UPDATE NOWAIT;
 observed_at:=clock_timestamp();
 IF NOT FOUND
    OR current_task.flight_instance_id IS DISTINCT FROM expected_flight_instance_id
    OR current_task.horizon IS DISTINCT FROM expected_horizon
    OR current_task.selected_native_t IS DISTINCT FROM expected_native_t
    OR current_task.own_cutoff IS DISTINCT FROM expected_cutoff
    OR current_task.packet_sha IS DISTINCT FROM expected_packet_sha
    OR current_task.owner IS DISTINCT FROM expected_owner
    OR current_task.generation IS DISTINCT FROM expected_generation
    OR current_task.status <> 'WRITE_STARTED_UNKNOWN'
    OR current_task.lease_until IS NULL
    OR current_task.lease_until <= observed_at+INTERVAL '2 seconds'
    OR current_task.own_cutoff <= observed_at+INTERVAL '2 seconds'
 THEN
  RAISE EXCEPTION 'P5_CD_CLAIM_FENCE_STALE_OR_UNQUALIFIED';
 END IF;
 RETURN true;
END $guard$;
REVOKE ALL ON FUNCTION p5_cd_stage14_ci.assert_write_fence(
 bigint,text,text,timestamptz,timestamptz,text,text,bigint) FROM PUBLIC;

-- No auto-created worker secrets, production task roles, webhook, owner
-- dispatch, paid source, or scientific use license is included here.
