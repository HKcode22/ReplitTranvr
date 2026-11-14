-- Phase5/6 P0 DESIGN CANDIDATE -- NOT A PRODUCTION MIGRATION.
-- Replaces the UNINSTALLED globally cumulative V0096 index idea. DO NOT
-- run on the owner's existing neondb; no owner install mode or paid GO exists.
-- Only used by isolated disposable PostgreSQL16 tests in a GH PR.
--
-- Principle: 31 independent prospective PARENT run-day index epochs,
-- 1..N SHA-chained revisions ONLY WITHIN each run_day_index. Old private
-- source/PRE/POST payloads and old index bytes may be deleted on their lawful
-- per-object expiration without preventing the next day's genesis.
-- Retain a content-free, immutable run-day claim (integer + DB clock only)
-- to forbid a deleted day's genesis from being replayed or reissued.
-- The claim is NOT a provider flight observation or a legal rights receipt.
-- Independent provider Contents, ML purpose, backup/PITR/replica deletion and
-- control-plane audit approval are required before any deployment.
--
-- Reuses V0094's two original NOLOGIN restricted reader/publisher groups
-- and V0095's kind/path extension. Does not install V0094/V0095/V0096.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30000ms';

DO $preflight$
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner' OR
    current_setting('server_version_num')::integer<160000 OR
    current_setting('server_version_num')::integer>=170000 OR
    pg_catalog.pg_is_in_recovery() THEN
   RAISE EXCEPTION 'P6_DAY_EPOCH_WRONG_OWNER_PG16_PRIMARY';
 END IF;
 IF pg_catalog.to_regclass('phase6_private.signed_day_shard_index_revision_v39') IS NOT NULL THEN
   RAISE EXCEPTION 'P6_DAY_EPOCH_OLD_GLOBAL_V0096_PRESENT_DO_NOT_MIGRATE';
 END IF;
 IF pg_catalog.to_regclass('phase6_private.signed_run_day_epoch_claim_v39') IS NOT NULL OR
    pg_catalog.to_regclass('phase6_private.signed_run_day_index_revision_v39') IS NOT NULL THEN
   RAISE EXCEPTION 'P6_DAY_EPOCH_ALREADY_OR_PARTIALLY_INSTALLED_NEVER_REPLAY';
 END IF;
 IF pg_catalog.to_regclass('phase6_private.frozen_native_packet_v39') IS NULL OR
    (SELECT COUNT(*) FROM pg_catalog.pg_constraint
     WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass
       AND conname IN ('p5_v0095_kind_allowed','p5_v0095_kind_path_guard'))<>2 OR
    (SELECT COUNT(*) FROM phase6_private.frozen_native_packet_v39)<>0 THEN
   RAISE EXCEPTION 'P6_DAY_EPOCH_NEEDS_EMPTY_VERIFIED_V0095';
 END IF;
 IF pg_catalog.to_regrole('phase6_private_frozen_reader_v39') IS NULL OR
    pg_catalog.to_regrole('phase6_private_frozen_publisher_v39') IS NULL OR
    EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN (
      'phase6_private_frozen_reader_v39',
      'phase6_private_frozen_publisher_v39'
     ) AND (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR
            rolcreaterole OR rolreplication OR rolbypassrls)) OR
    EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m
      JOIN pg_catalog.pg_roles g ON g.oid=m.roleid
      JOIN pg_catalog.pg_roles member ON member.oid=m.member
      JOIN pg_catalog.pg_roles grantor ON grantor.oid=m.grantor
      WHERE g.rolname IN (
       'phase6_private_frozen_reader_v39','phase6_private_frozen_publisher_v39'
      ) AND NOT (
       member.rolname=current_user AND grantor.rolsuper AND
       m.admin_option AND NOT m.inherit_option AND NOT m.set_option
      )) THEN
   RAISE EXCEPTION 'P6_DAY_EPOCH_UNEXPECTED_PRIVATE_ROLE_MEMBERSHIP';
 END IF;
END $preflight$;

-- A durable, *content-free* replay fence. Future owner TTL cleanup removes
-- expired index/registry bytes, but never removes or resets this calendar-day
-- claim. No flight ID, path, SHA digest or other provider-derived text here.
CREATE TABLE phase6_private.signed_run_day_epoch_claim_v39 (
 run_day_index integer PRIMARY KEY CHECK (run_day_index BETWEEN 1 AND 31),
 first_committed_at_utc timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON TABLE phase6_private.signed_run_day_epoch_claim_v39
 FROM PUBLIC;
GRANT SELECT ON phase6_private.signed_run_day_epoch_claim_v39
 TO phase6_private_frozen_reader_v39,
    phase6_private_frozen_publisher_v39;
CREATE TRIGGER phase6_private_day_epoch_claim_mutation_hold_v39
 BEFORE UPDATE OR DELETE ON phase6_private.signed_run_day_epoch_claim_v39
 FOR EACH ROW EXECUTE FUNCTION phase6_private.refuse_frozen_update_v39();

CREATE TABLE phase6_private.signed_run_day_index_revision_v39 (
 run_day_index integer NOT NULL CHECK (run_day_index BETWEEN 1 AND 31),
 revision integer NOT NULL CHECK (revision BETWEEN 1 AND 1024),
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
 CONSTRAINT p6_epoch_day_revision_pk PRIMARY KEY (run_day_index,revision),
 CONSTRAINT p6_epoch_previous_sha_guard CHECK (
  (revision=1 AND previous_index_sha256 IS NULL) OR
  (revision>1 AND previous_index_sha256 ~ '^[a-f0-9]{64}$')
 ),
 CONSTRAINT p6_epoch_index_bytes_sha_guard CHECK (
  octet_length(payload_bytes) BETWEEN 100 AND 1048576 AND
  pg_catalog.encode(pg_catalog.sha256(payload_bytes),'hex')=content_sha256
 ),
 CONSTRAINT p6_epoch_index_retention_guard CHECK (
  retention_not_after_utc>externally_reviewed_at_utc AND
  retention_not_after_utc<=externally_reviewed_at_utc+interval '7 days'
 )
);
CREATE INDEX p6_epoch_expiry_owner_cleanup_v39
 ON phase6_private.signed_run_day_index_revision_v39
 (retention_not_after_utc,run_day_index,revision);

-- Private original SHA and independent external signature/semantic day
-- validation are still REQUIRED in the future publisher+reader. The database
-- trigger enforces only the physical per-run-day append-only SHA chain.
CREATE FUNCTION phase6_private.guard_run_day_epoch_index_insert_v39()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $chain$
DECLARE p RECORD;
DECLARE now_utc timestamptz;
BEGIN
 now_utc:=clock_timestamp();
 IF NEW.externally_reviewed_at_utc>now_utc OR
    NEW.retention_not_after_utc<=now_utc THEN
   RAISE EXCEPTION 'P6_DAY_EPOCH_FUTURE_REVIEW_OR_EXPIRED_INDEX';
 END IF;
 IF NEW.revision=1 THEN
   -- Content-free claim persists AFTER lawful deletion of index bytes.
   -- Duplicate or re-genesis attempts in the same study day ALWAYS refuse.
   INSERT INTO phase6_private.signed_run_day_epoch_claim_v39(run_day_index)
   VALUES (NEW.run_day_index);
 ELSE
   SELECT content_sha256,reviewed_code_sha,manifest_sha256,calendar_sha256,
       release_sha256,rights_sha256,externally_reviewed_at_utc,
       retention_not_after_utc INTO p
    FROM phase6_private.signed_run_day_index_revision_v39
    WHERE run_day_index=NEW.run_day_index AND revision=NEW.revision-1;
   IF NOT FOUND OR p.content_sha256 IS DISTINCT FROM NEW.previous_index_sha256
      OR p.reviewed_code_sha<>NEW.reviewed_code_sha
      OR p.manifest_sha256<>NEW.manifest_sha256
      OR p.calendar_sha256<>NEW.calendar_sha256
      OR p.release_sha256<>NEW.release_sha256
      OR p.rights_sha256<>NEW.rights_sha256
      OR p.externally_reviewed_at_utc>NEW.externally_reviewed_at_utc
      OR p.retention_not_after_utc<=now_utc THEN
     RAISE EXCEPTION 'P6_DAY_EPOCH_NO_LIVE_SAME_DAY_SHA_PREDECESSOR';
   END IF;
 END IF;
 RETURN NEW;
END $chain$;
REVOKE ALL ON FUNCTION phase6_private.guard_run_day_epoch_index_insert_v39()
 FROM PUBLIC;
CREATE TRIGGER phase6_private_run_day_epoch_insert_guard_v39
 BEFORE INSERT ON phase6_private.signed_run_day_index_revision_v39
 FOR EACH ROW EXECUTE FUNCTION phase6_private.guard_run_day_epoch_index_insert_v39();
CREATE TRIGGER phase6_private_run_day_epoch_update_hold_v39
 BEFORE UPDATE ON phase6_private.signed_run_day_index_revision_v39
 FOR EACH ROW EXECUTE FUNCTION phase6_private.refuse_frozen_update_v39();

REVOKE ALL ON TABLE phase6_private.signed_run_day_index_revision_v39
 FROM PUBLIC;
GRANT SELECT ON phase6_private.signed_run_day_index_revision_v39
 TO phase6_private_frozen_reader_v39;
GRANT SELECT,INSERT ON phase6_private.signed_run_day_index_revision_v39
 TO phase6_private_frozen_publisher_v39;

DO $postflight$
BEGIN
 IF (SELECT COUNT(*) FROM phase6_private.signed_run_day_epoch_claim_v39)<>0 OR
    (SELECT COUNT(*) FROM phase6_private.signed_run_day_index_revision_v39)<>0 OR
    (SELECT COUNT(*) FROM phase6_private.frozen_native_packet_v39)<>0 OR
    has_table_privilege('phase6_private_frozen_reader_v39',
      'phase6_private.signed_run_day_index_revision_v39','INSERT') OR
    has_table_privilege('phase6_private_frozen_publisher_v39',
      'phase6_private.signed_run_day_index_revision_v39','UPDATE') OR
    has_table_privilege('phase6_private_frozen_publisher_v39',
      'phase6_private.signed_run_day_index_revision_v39','DELETE') OR
    has_table_privilege('phase6_private_frozen_publisher_v39',
      'phase6_private.signed_run_day_epoch_claim_v39','INSERT') OR
    has_table_privilege('phase6_private_frozen_reader_v39',
      'phase6_private.signed_run_day_epoch_claim_v39','DELETE') OR
    EXISTS(SELECT 1 FROM pg_catalog.pg_class c,
      LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,
      pg_catalog.acldefault('r',c.relowner))) a
      WHERE c.oid IN (
       'phase6_private.signed_run_day_index_revision_v39'::regclass,
       'phase6_private.signed_run_day_epoch_claim_v39'::regclass
      ) AND a.grantee=0) THEN
   RAISE EXCEPTION 'P6_DAY_EPOCH_PRIVATE_ACL_OR_EMPTY_POSTFLIGHT_FAILURE';
 END IF;
END $postflight$;
COMMIT;

-- End of DISPOSABLE-TEST-ONLY schema. No owner installer or production GO.
-- Before deployment: external source/ML rights, physical backup/PITR proof,
-- epoch-scoped signed reviewer, updated restricted publisher/reader, live
-- cleanup+hold incident path, independent cold-start readback and explicit GO.
