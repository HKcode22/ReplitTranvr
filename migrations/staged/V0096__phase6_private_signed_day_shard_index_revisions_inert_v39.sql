-- V0096: STAGED ONLY private signed 31-parent-day SOURCE/LATER_PRE/POST
-- append-only shard INDEX REVISION transport. REUSE V0094/V0095 roles.
--
-- An index is metadata containing private provider-derived identifiers/paths;
-- never put its bytes under a tracked public GitHub frozen/ directory.
-- This table does not create signing authority or 31-day Contents rights.
-- Conservative index bytes must expire by separately approved lawful rights
-- and no later than 7 days after external review; it does NOT extend raw
-- provider Contents rights, PITR, back-ups or research/ML license.
-- App/paid/PRE/POST logins get no access. No new LOGIN or passwords.
--
-- Requires empty correctly installed V0095 (after separately verified V0094)
-- and two original NOLOGIN roles with only unavoidable PG16 owner-bootstrap
-- grants; STOP if commissioned worker LOGINs already exist.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30000ms';

DO $v0096_preflight$
DECLARE n integer;
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner' OR
    current_setting('server_version_num')::integer<160000 OR
    current_setting('server_version_num')::integer>=170000 OR
    pg_catalog.pg_is_in_recovery() THEN
  RAISE EXCEPTION 'P6_V0096_WRONG_NEON_PG16_OWNER_OR_REPLICA';
 END IF;
 IF pg_catalog.to_regclass('phase6_private.signed_day_shard_index_revision_v39') IS NOT NULL THEN
  RAISE EXCEPTION 'P6_V0096_ALREADY_PRESENT_NEVER_REINSTALL';
 END IF;
 IF pg_catalog.to_regclass('phase6_private.frozen_native_packet_v39') IS NULL OR
    pg_catalog.to_regrole('phase6_private_frozen_reader_v39') IS NULL OR
    pg_catalog.to_regrole('phase6_private_frozen_publisher_v39') IS NULL THEN
  RAISE EXCEPTION 'P6_V0096_REQUIRES_VERIFIED_V0094_AND_V0095_FIRST';
 END IF;
 SELECT count(*)::integer INTO n FROM pg_catalog.pg_constraint
  WHERE conrelid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
    AND conname IN ('p5_v0095_kind_allowed','p5_v0095_kind_path_guard');
 IF n<>2 OR
    EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
      WHERE conrelid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
        AND conname IN ('frozen_native_packet_v39_kind_check',
                        'p5_v0094_kind_path_guard')) THEN
  RAISE EXCEPTION 'P6_V0096_V0095_CONSTRAINTS_NOT_CLEANLY_INSTALLED';
 END IF;
 IF (SELECT count(*) FROM phase6_private.frozen_native_packet_v39)<>0 THEN
  RAISE EXCEPTION 'P6_V0096_REQUIRES_EMPTY_PRIVATE_PACKET_TABLE_PRECOMMISSION';
 END IF;
 IF (SELECT pg_catalog.pg_get_userbyid(relowner)
      FROM pg_catalog.pg_class
      WHERE oid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
    )<>current_user THEN
  RAISE EXCEPTION 'P6_V0096_EXISTING_PRIVATE_OWNER_DRIFT';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m
      JOIN pg_catalog.pg_roles g ON g.oid=m.roleid
      JOIN pg_catalog.pg_roles member ON member.oid=m.member
      JOIN pg_catalog.pg_roles grantor ON grantor.oid=m.grantor
      WHERE g.rolname IN (
       'phase6_private_frozen_reader_v39',
       'phase6_private_frozen_publisher_v39'
      ) AND NOT (
       member.rolname=current_user AND grantor.rolsuper AND
       m.admin_option AND NOT m.inherit_option AND NOT m.set_option
      )) OR
    EXISTS (SELECT 1 FROM pg_catalog.pg_roles
     WHERE rolname IN (
       'phase6_private_frozen_reader_v39',
       'phase6_private_frozen_publisher_v39'
     ) AND (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR
            rolcreaterole OR rolreplication OR rolbypassrls)) THEN
  RAISE EXCEPTION 'P6_V0096_PRIVATE_WORKER_MEMBERS_OR_PRIVILEGE_DRIFT';
 END IF;
END $v0096_preflight$;

CREATE TABLE phase6_private.signed_day_shard_index_revision_v39 (
 revision integer PRIMARY KEY CHECK (revision BETWEEN 1 AND 1024),
 previous_index_sha256 text,
 content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
 reviewed_code_sha text NOT NULL CHECK (reviewed_code_sha ~ '^[a-f0-9]{40}$'),
 manifest_sha256 text NOT NULL CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
 calendar_sha256 text NOT NULL CHECK (calendar_sha256 ~ '^[a-f0-9]{64}$'),
 release_sha256 text NOT NULL CHECK (release_sha256 ~ '^[a-f0-9]{64}$'),
 rights_sha256 text NOT NULL CHECK (rights_sha256 ~ '^[a-f0-9]{64}$'),
 external_review_sha256 text NOT NULL CHECK (external_review_sha256 ~ '^[a-f0-9]{64}$'),
 externally_reviewed_at_utc timestamptz NOT NULL,
 retention_not_after_utc timestamptz NOT NULL,
 payload_bytes bytea NOT NULL,
 committed_at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT p6_v0096_index_previous_sha_guard CHECK (
    (revision=1 AND previous_index_sha256 IS NULL) OR
    (revision>1 AND previous_index_sha256 ~ '^[a-f0-9]{64}$')
 ),
 CONSTRAINT p6_v0096_index_bytes_guard CHECK (
    octet_length(payload_bytes) BETWEEN 100 AND 1048576 AND
    pg_catalog.encode(pg_catalog.sha256(payload_bytes),'hex')=content_sha256
 ),
 CONSTRAINT p6_v0096_index_retention_guard CHECK (
    retention_not_after_utc>externally_reviewed_at_utc AND
    retention_not_after_utc<=externally_reviewed_at_utc+interval '7 days'
 )
);

CREATE TRIGGER phase6_private_signed_index_update_hold_v39
 BEFORE UPDATE ON phase6_private.signed_day_shard_index_revision_v39
 FOR EACH ROW EXECUTE FUNCTION phase6_private.refuse_frozen_update_v39();

REVOKE ALL ON TABLE phase6_private.signed_day_shard_index_revision_v39
 FROM PUBLIC;
GRANT SELECT ON phase6_private.signed_day_shard_index_revision_v39
 TO phase6_private_frozen_reader_v39;
GRANT SELECT,INSERT ON phase6_private.signed_day_shard_index_revision_v39
 TO phase6_private_frozen_publisher_v39;

DO $v0096_postflight$
DECLARE n integer;
BEGIN
 SELECT count(*)::integer INTO n
  FROM phase6_private.signed_day_shard_index_revision_v39;
 IF n<>0 OR (SELECT count(*) FROM phase6_private.frozen_native_packet_v39)<>0 THEN
  RAISE EXCEPTION 'P6_V0096_SCHEMA_ONLY_BOTH_PRIVATE_TABLES_MUST_BE_EMPTY';
 END IF;
 IF NOT has_table_privilege('phase6_private_frozen_reader_v39',
       'phase6_private.signed_day_shard_index_revision_v39','SELECT') OR
    has_table_privilege('phase6_private_frozen_reader_v39',
       'phase6_private.signed_day_shard_index_revision_v39','INSERT') OR
    has_table_privilege('phase6_private_frozen_reader_v39',
       'phase6_private.signed_day_shard_index_revision_v39','UPDATE') OR
    has_table_privilege('phase6_private_frozen_reader_v39',
       'phase6_private.signed_day_shard_index_revision_v39','DELETE') OR
    NOT has_table_privilege('phase6_private_frozen_publisher_v39',
       'phase6_private.signed_day_shard_index_revision_v39','SELECT') OR
    NOT has_table_privilege('phase6_private_frozen_publisher_v39',
       'phase6_private.signed_day_shard_index_revision_v39','INSERT') OR
    has_table_privilege('phase6_private_frozen_publisher_v39',
       'phase6_private.signed_day_shard_index_revision_v39','UPDATE') OR
    has_table_privilege('phase6_private_frozen_publisher_v39',
       'phase6_private.signed_day_shard_index_revision_v39','DELETE') OR
    EXISTS (SELECT 1 FROM pg_catalog.pg_class c,
      LATERAL pg_catalog.aclexplode(COALESCE(
        c.relacl,pg_catalog.acldefault('r',c.relowner))) a
      WHERE c.oid='phase6_private.signed_day_shard_index_revision_v39'::pg_catalog.regclass
        AND a.grantee=0 AND a.privilege_type IN (
         'SELECT','INSERT','UPDATE','DELETE'
        )) THEN
  RAISE EXCEPTION 'P6_V0096_INDEX_TABLE_ACL_NOT_PRIVATE';
 END IF;
 IF (SELECT count(*) FROM pg_catalog.pg_trigger
      WHERE tgrelid='phase6_private.signed_day_shard_index_revision_v39'::pg_catalog.regclass
        AND tgname='phase6_private_signed_index_update_hold_v39'
        AND NOT tgisinternal)<>1 THEN
  RAISE EXCEPTION 'P6_V0096_INDEX_IMMUTABLE_UPDATE_TRIGGER_MISSING';
 END IF;
END $v0096_postflight$;
COMMIT;

-- This is an inert PRIVATE index byte transport only. No index reviewer key,
-- actual future flight, index revision, provider Contents, DELETE worker,
-- GH private reader, paid rights/credit release or Phase6 GO is created.
