-- STAGED ONLY: atomically retain detached signed review with its existing
-- immutable packet/index row. No new role, table, login, provider call or GO.
-- V0095 and V0097 must have been reviewed, installed and independently read
-- back EMPTY before this exact one-use owner migration. Do not replay.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30000ms';
DO $preflight$
DECLARE t text;
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner' OR
    current_setting('server_version_num')::integer NOT BETWEEN 160000 AND 169999
    OR pg_catalog.pg_is_in_recovery() THEN
  RAISE EXCEPTION 'P6_V0098_WRONG_PG16_OWNER_PRIMARY';
 END IF;
 IF pg_catalog.to_regclass('phase6_private.signed_day_shard_index_revision_v39') IS NOT NULL OR
    pg_catalog.to_regclass('phase6_private.signed_run_day_epoch_claim_v39') IS NULL OR
    pg_catalog.to_regclass('phase6_private.signed_run_day_index_revision_v39') IS NULL OR
    pg_catalog.to_regclass('phase6_private.frozen_native_packet_v39') IS NULL THEN
  RAISE EXCEPTION 'P6_V0098_V0097_PREREQUISITE_OR_OLD_GLOBAL_SCHEMA';
 END IF;
 IF (SELECT count(*) FROM pg_catalog.pg_constraint
     WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass
       AND conname IN ('p5_v0095_kind_allowed','p5_v0095_kind_path_guard'))<>2 OR
    (SELECT count(*) FROM phase6_private.frozen_native_packet_v39)<>0 OR
    (SELECT count(*) FROM phase6_private.signed_run_day_index_revision_v39)<>0 OR
    (SELECT count(*) FROM phase6_private.signed_run_day_epoch_claim_v39)<>0 THEN
  RAISE EXCEPTION 'P6_V0098_NEEDS_EMPTY_V0095_V0097';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m
   JOIN pg_catalog.pg_roles g ON g.oid=m.roleid
   JOIN pg_catalog.pg_roles member ON member.oid=m.member
   JOIN pg_catalog.pg_roles grantor ON grantor.oid=m.grantor
   WHERE g.rolname IN ('phase6_private_frozen_reader_v39','phase6_private_frozen_publisher_v39')
   AND NOT (member.rolname=current_user AND grantor.rolsuper
   AND m.admin_option AND NOT m.inherit_option AND NOT m.set_option)) THEN
  RAISE EXCEPTION 'P6_V0098_COMMISSIONED_MEMBERSHIP_HOLD';
 END IF;
 FOREACH t IN ARRAY ARRAY['frozen_native_packet_v39','signed_run_day_index_revision_v39'] LOOP
  IF EXISTS(SELECT 1 FROM information_schema.columns
     WHERE table_schema='phase6_private' AND table_name=t
       AND column_name='review_wire_bytes') OR
     (SELECT pg_catalog.pg_get_userbyid(relowner) FROM pg_catalog.pg_class
      WHERE oid=pg_catalog.to_regclass('phase6_private.'||t))<>current_user THEN
   RAISE EXCEPTION 'P6_V0098_ALREADY_PRESENT_OR_OWNER_DRIFT_NEVER_REPLAY';
  END IF;
 END LOOP;
END $preflight$;
-- bytea instead of jsonb: signature preimage preserves JSON property order.
-- Null permits the legacy manually supplied review path, NOT dynamic use.
ALTER TABLE phase6_private.signed_run_day_index_revision_v39
 ADD COLUMN review_wire_bytes bytea,
 ADD CONSTRAINT p6_v0098_index_wire_size CHECK (
  review_wire_bytes IS NULL OR octet_length(review_wire_bytes) BETWEEN 100 AND 4096);
ALTER TABLE phase6_private.frozen_native_packet_v39
 ADD COLUMN review_wire_bytes bytea,
 ADD CONSTRAINT p6_v0098_packet_wire_scope CHECK (
  review_wire_bytes IS NULL OR
  (kind IN ('SOURCE_QUERY_PACKET','POST_PACKET') AND octet_length(review_wire_bytes) BETWEEN 100 AND 4096));
-- Existing immutable-update trigger and same-row DELETE/retention boundary
-- remain authoritative; no separate extended review-wire lifecycle exists.
DO $postflight$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['frozen_native_packet_v39','signed_run_day_index_revision_v39'] LOOP
  IF NOT has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.'||t,'SELECT') OR
    has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.'||t,'INSERT') OR
    has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.'||t,'UPDATE') OR
    has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.'||t,'DELETE') OR
    NOT has_table_privilege('phase6_private_frozen_publisher_v39','phase6_private.'||t,'SELECT') OR
    NOT has_table_privilege('phase6_private_frozen_publisher_v39','phase6_private.'||t,'INSERT') OR
    has_table_privilege('phase6_private_frozen_publisher_v39','phase6_private.'||t,'UPDATE') OR
    has_table_privilege('phase6_private_frozen_publisher_v39','phase6_private.'||t,'DELETE') OR
    EXISTS(SELECT 1 FROM pg_catalog.pg_class c,LATERAL pg_catalog.aclexplode(
       coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
       WHERE c.oid=pg_catalog.to_regclass('phase6_private.'||t) AND a.grantee=0) THEN
   RAISE EXCEPTION 'P6_V0098_PRIVATE_ACL_DRIFT';
  END IF;
 END LOOP;
END $postflight$;
COMMIT;
