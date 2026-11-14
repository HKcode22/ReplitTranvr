-- V0095 Phase5→6: staged ONE-USE schema-only compatibility extension for
-- SOURCE QUERY and V0083 POST packets in the EXISTING V0094 private table.
--
-- DO NOT DEPLOY UNTIL separately reviewed V0094 live install + independent
-- readback, lawful Contents/ML rights, PITR/object retention and approved
-- owner migration. No new LOGIN/role/secret, HTTP/REST/Alert, source query,
-- PRE/POST write, dispatcher, storage expiry extension, or provider call.
--
-- This is not a signed publisher or GH secret-hydration implementation.
-- The existing source and POST children require private local packet bytes;
-- they MUST be adapted to an independently reviewed restricted reader before
-- fully autonomous day rollover can be enabled. Public GH frozen/ stays empty.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30000ms';

DO $v0095_preflight$
DECLARE row_n integer;
DECLARE role_name text;
DECLARE old_checks integer;
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner' OR
    current_setting('server_version_num')::integer<160000 OR
    current_setting('server_version_num')::integer>=170000 OR
    pg_catalog.pg_is_in_recovery() THEN
  RAISE EXCEPTION 'P5_V0095_WRONG_NEON_OWNER_PG16_PRIMARY';
 END IF;
 IF pg_catalog.to_regclass('phase6_private.frozen_native_packet_v39') IS NULL THEN
  RAISE EXCEPTION 'P5_V0095_V0094_MUST_EXIST_DO_NOT_INSTALL_OUT_OF_ORDER';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_constraint
  WHERE conrelid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
    AND conname IN ('p5_v0095_kind_allowed','p5_v0095_kind_path_guard')) THEN
  RAISE EXCEPTION 'P5_V0095_ALREADY_INSTALLED_NEVER_REPLAY';
 END IF;
 SELECT COUNT(*)::integer INTO old_checks
 FROM pg_catalog.pg_constraint
 WHERE conrelid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
 AND conname IN ('frozen_native_packet_v39_kind_check',
                 'p5_v0094_kind_path_guard');
 IF old_checks<>2 THEN
  RAISE EXCEPTION 'P5_V0095_EXPECTED_V0094_OLD_CHECKS_MISSING_OR_CHANGED';
 END IF;
 SELECT COUNT(*)::integer INTO row_n
 FROM phase6_private.frozen_native_packet_v39;
 IF row_n<>0 THEN
  RAISE EXCEPTION 'P5_V0095_EXISTING_PRIVATE_ROWS_HOLD_INDEPENDENT_REVIEW';
 END IF;
 IF (SELECT pg_catalog.pg_get_userbyid(relowner)
     FROM pg_catalog.pg_class
     WHERE oid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
    )<>current_user THEN
  RAISE EXCEPTION 'P5_V0095_TABLE_OWNER_MISMATCH';
 END IF;
 FOR role_name IN SELECT unnest(ARRAY[
  'phase6_private_frozen_reader_v39',
  'phase6_private_frozen_publisher_v39'
 ]) LOOP
  IF pg_catalog.to_regrole(role_name) IS NULL OR
     EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=role_name AND
     (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole OR
      rolreplication OR rolbypassrls)) THEN
   RAISE EXCEPTION 'P5_V0095_UNEXPECTED_PRIVATE_ROLE_OR_LOGIN';
  END IF;
 END LOOP;
END $v0095_preflight$;

-- Existing V0094 byte SHA/retention/PK/immutable-update constraints remain
-- unchanged. A new migration (not editing V0094's pinned bytes) is required.
ALTER TABLE phase6_private.frozen_native_packet_v39
 DROP CONSTRAINT frozen_native_packet_v39_kind_check,
 DROP CONSTRAINT p5_v0094_kind_path_guard;

ALTER TABLE phase6_private.frozen_native_packet_v39
 ADD CONSTRAINT p5_v0095_kind_allowed CHECK (kind IN (
  'SOURCE_DAY_REGISTRY',
  'SOURCE_QUERY_PACKET',
  'LATER_PRE_PACKET',
  'LATER_PRE_DAY_REGISTRY',
  'POST_PACKET'
 ));

ALTER TABLE phase6_private.frozen_native_packet_v39
 ADD CONSTRAINT p5_v0095_kind_path_guard CHECK (
  (kind='SOURCE_DAY_REGISTRY' AND
    logical_path ~ '^data-collection/phase5/frozen/source_[A-Za-z0-9_.-]{8,125}\.json$') OR
  (kind='SOURCE_QUERY_PACKET' AND
    logical_path ~ '^data-collection/phase5/frozen/sourceq_[A-Za-z0-9_.-]{8,110}\.json$') OR
  (kind='LATER_PRE_PACKET' AND
    logical_path ~ '^data-collection/phase5/frozen/[A-Za-z0-9_-]{8,100}\.json$') OR
  (kind='LATER_PRE_DAY_REGISTRY' AND
    logical_path ~ '^data-collection/phase5/frozen/[A-Za-z0-9_-]{8,100}\.json$') OR
  (kind='POST_PACKET' AND
    logical_path ~ '^data-collection/phase5/frozen/post_[A-Za-z0-9_-]{8,110}\.json$')
 );

DO $v0095_postflight$
DECLARE role_name text;
DECLARE n integer;
BEGIN
 SELECT COUNT(*)::integer INTO n FROM phase6_private.frozen_native_packet_v39;
 IF n<>0 THEN
  RAISE EXCEPTION 'P5_V0095_SCHEMA_ONLY_NO_PRIVATE_DATA_ALLOWED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint
   WHERE conrelid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
     AND conname='p5_v0095_kind_allowed') OR
    NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint
   WHERE conrelid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
     AND conname='p5_v0095_kind_path_guard') THEN
  RAISE EXCEPTION 'P5_V0095_NEW_CONSTRAINTS_NOT_PRESENT';
 END IF;
 FOR role_name IN SELECT unnest(ARRAY[
   'phase6_private_frozen_reader_v39',
   'phase6_private_frozen_publisher_v39'
 ]) LOOP
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m
       JOIN pg_catalog.pg_roles g ON g.oid=m.roleid
       JOIN pg_catalog.pg_roles member ON member.oid=m.member
       JOIN pg_catalog.pg_roles grantor ON grantor.oid=m.grantor
       WHERE g.rolname=role_name AND NOT (
        member.rolname=current_user AND grantor.rolsuper AND
        m.admin_option AND NOT m.inherit_option AND NOT m.set_option
       )) THEN
   RAISE EXCEPTION 'P5_V0095_EXTRA_PRIVATE_WORKER_OR_LOGIN_MEMBERS';
  END IF;
 END LOOP;
 IF has_table_privilege('phase6_private_frozen_reader_v39',
     'phase6_private.frozen_native_packet_v39','INSERT') OR
    has_table_privilege('phase6_private_frozen_reader_v39',
     'phase6_private.frozen_native_packet_v39','UPDATE') OR
    NOT has_table_privilege('phase6_private_frozen_reader_v39',
     'phase6_private.frozen_native_packet_v39','SELECT') OR
    NOT has_table_privilege('phase6_private_frozen_publisher_v39',
     'phase6_private.frozen_native_packet_v39','INSERT') OR
    has_table_privilege('phase6_private_frozen_publisher_v39',
     'phase6_private.frozen_native_packet_v39','UPDATE') OR
    has_table_privilege('phase6_private_frozen_publisher_v39',
     'phase6_private.frozen_native_packet_v39','DELETE') OR
    EXISTS(SELECT 1 FROM pg_catalog.pg_class c,
     LATERAL pg_catalog.aclexplode(COALESCE(
       c.relacl,pg_catalog.acldefault('r',c.relowner))) a
     WHERE c.oid='phase6_private.frozen_native_packet_v39'::pg_catalog.regclass
       AND a.grantee=0 AND a.privilege_type='SELECT') THEN
  RAISE EXCEPTION 'P5_V0095_PRIVATE_ACL_WEAKENED';
 END IF;
END $v0095_postflight$;
COMMIT;

-- NOTE: Actual 31-day retained Contents permission is NOT conferred.
-- No reviewer signature, private GH source or POST packet has been published.
-- Physical expiry/backup/PITR deletion and all automation remain separate GO.
