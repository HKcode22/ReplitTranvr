-- V0094: STAGED only. Private PostgreSQL16 bytea transport for SOURCE
-- registry, externally reviewed T6/T90 packet, and late PRE registry.
-- NO production activation, no passwords or LOGIN membership, no secrets,
-- no paid provider/Alert, no PRE/POST write, no replay of prior migrations.
--
-- This uses a NEW private schema and NOLOGIN roles. Existing Stage14/V0091
-- functions and dedicated groups are not touched. The table is insert-only
-- for the future reviewer/publisher role, read-only for the future GH
-- hydration role, and never public. The independent owner may later perform
-- audited lawful retention deletion; no worker may UPDATE or DELETE.
--
-- IMPORTANT: Encrypted-at-rest and lawful ML/Contents retention must be
-- independently established for the actual Neon account BEFORE live use.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30000ms';

DO $preflight$
BEGIN
 IF current_setting('server_version_num')::integer < 160000 THEN
  RAISE EXCEPTION 'P5_V0094_POSTGRESQL16_REQUIRED';
 END IF;
 IF pg_catalog.to_regnamespace('phase6_private') IS NOT NULL OR
    pg_catalog.to_regrole('phase6_private_frozen_reader_v39') IS NOT NULL OR
    pg_catalog.to_regrole('phase6_private_frozen_publisher_v39') IS NOT NULL THEN
  RAISE EXCEPTION 'P5_V0094_ALREADY_PRESENT_DO_NOT_REINSTALL';
 END IF;
END $preflight$;

CREATE SCHEMA phase6_private;
REVOKE ALL ON SCHEMA phase6_private FROM PUBLIC;

CREATE ROLE phase6_private_frozen_reader_v39
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS;
CREATE ROLE phase6_private_frozen_publisher_v39
  NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS;

-- PostgreSQL 16 auto-grants the CREATEROLE (non-superuser) creator an
-- administrative membership in each role it creates. A successful Neon
-- neondb_owner installation must remove even this implicit membership, not
-- quietly accept a future login as a private packet role member.
REVOKE phase6_private_frozen_reader_v39 FROM CURRENT_USER;
REVOKE phase6_private_frozen_publisher_v39 FROM CURRENT_USER;

CREATE TABLE phase6_private.frozen_native_packet_v39 (
 logical_path text PRIMARY KEY,
 run_day_index integer NOT NULL CHECK (run_day_index BETWEEN 1 AND 31),
 shard_index integer NOT NULL CHECK (shard_index BETWEEN 1 AND 100000),
 kind text NOT NULL CHECK (kind IN (
  'SOURCE_DAY_REGISTRY','LATER_PRE_PACKET','LATER_PRE_DAY_REGISTRY')),
 content_sha256 text NOT NULL,
 reviewed_code_sha text NOT NULL,
 manifest_sha256 text NOT NULL,
 rights_sha256 text NOT NULL,
 external_review_sha256 text NOT NULL,
 -- Timestamp of authentic external reviewer/rights assertion, not
 -- itself independent authorization.
 externally_reviewed_at_utc timestamptz NOT NULL,
 retention_not_after_utc timestamptz NOT NULL,
 payload_bytes bytea NOT NULL,
 committed_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT p5_v0094_logical_path_guard CHECK (
  logical_path ~ '^data-collection/phase5/frozen/[A-Za-z0-9_.-]{8,125}\.json$'),
 CONSTRAINT p5_v0094_sha_guard CHECK (
  content_sha256 ~ '^[a-f0-9]{64}$' AND
  reviewed_code_sha ~ '^[a-f0-9]{40}$' AND
  manifest_sha256 ~ '^[a-f0-9]{64}$' AND
  rights_sha256 ~ '^[a-f0-9]{64}$' AND
  external_review_sha256 ~ '^[a-f0-9]{64}$'),
 CONSTRAINT p5_v0094_bytes_guard CHECK (
  octet_length(payload_bytes) BETWEEN 100 AND 250000 AND
  pg_catalog.encode(pg_catalog.sha256(payload_bytes),'hex')=content_sha256),
 CONSTRAINT p5_v0094_retention_guard CHECK (
  retention_not_after_utc>externally_reviewed_at_utc),
 CONSTRAINT p5_v0094_kind_path_guard CHECK (
  (kind='SOURCE_DAY_REGISTRY' AND logical_path ~ '/source_[A-Za-z0-9_.-]{8,125}\.json$') OR
  (kind='LATER_PRE_PACKET' AND logical_path ~ '/[A-Za-z0-9_-]{8,100}\.json$') OR
  (kind='LATER_PRE_DAY_REGISTRY' AND logical_path ~ '/[A-Za-z0-9_-]{8,100}\.json$')
 )
);
CREATE INDEX p5_v0094_frozen_day_shard_kind
 ON phase6_private.frozen_native_packet_v39
 (run_day_index,shard_index,kind);

CREATE FUNCTION phase6_private.refuse_frozen_update_v39()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp
AS $immutable$
BEGIN
 RAISE EXCEPTION 'P5_V0094_IMMUTABLE_PACKET_NO_UPDATE';
END $immutable$;
CREATE TRIGGER phase6_private_frozen_update_hold_v39
 BEFORE UPDATE ON phase6_private.frozen_native_packet_v39
 FOR EACH ROW EXECUTE FUNCTION phase6_private.refuse_frozen_update_v39();

-- Deny all publicly and to every existing app/PRE/POST/paid worker
-- implicitly: neither new role has LOGIN nor any member at install.
REVOKE ALL ON TABLE phase6_private.frozen_native_packet_v39 FROM PUBLIC;
REVOKE ALL ON FUNCTION phase6_private.refuse_frozen_update_v39()
 FROM PUBLIC;
GRANT USAGE ON SCHEMA phase6_private
 TO phase6_private_frozen_reader_v39,
    phase6_private_frozen_publisher_v39;
GRANT SELECT ON phase6_private.frozen_native_packet_v39
 TO phase6_private_frozen_reader_v39;
GRANT SELECT,INSERT ON phase6_private.frozen_native_packet_v39
 TO phase6_private_frozen_publisher_v39;

DO $postflight$
DECLARE role_name text;
BEGIN
 FOR role_name IN SELECT unnest(ARRAY[
  'phase6_private_frozen_reader_v39',
  'phase6_private_frozen_publisher_v39'
 ]) LOOP
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=role_name
    AND (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole OR
      rolreplication OR rolbypassrls)) OR
     EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m
       JOIN pg_catalog.pg_roles g ON g.oid=m.roleid
       WHERE g.rolname=role_name) THEN
   RAISE EXCEPTION 'P5_V0094_PRIVATE_ROLE_PRIVILEGED_OR_LOGIN_MEMBER';
  END IF;
 END LOOP;
 IF EXISTS(
  SELECT 1 FROM pg_catalog.pg_class c,
   LATERAL pg_catalog.aclexplode(
    COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
  WHERE c.oid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
    AND a.grantee=0 AND a.privilege_type='SELECT'
 ) THEN
  RAISE EXCEPTION 'P5_V0094_PUBLIC_SELECT_ACL';
 END IF;
END $postflight$;
COMMIT;

-- Successful schema installation must STILL result in ZERO rows and ZERO
-- production login memberships. Separate code-reviewed owner action and
-- independent readback will commission narrow credentials only after
-- provider rights, retention, external signature and safe storage review.
