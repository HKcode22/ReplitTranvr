-- Owner-reviewed candidate only. Reuse the existing immutable private transport
-- and existing SELECT/INSERT actors; no new role, table, provider, or rights.
-- These signed wires are operational custody, not permanent research data.
-- Keep V0101 guard names because the installed V0105 inventory binds them.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
 IF current_database()<>'neondb' OR current_user<>'neondb_owner'
 OR pg_is_in_recovery() OR current_setting('server_version_num')::integer NOT BETWEEN 160000 AND 169999
 OR current_setting('session_replication_role')<>'origin'
 OR to_regclass('phase6_private.frozen_native_packet_v39') IS NULL
 OR to_regclass('clean.adb_phase6_authorization') IS NULL
 THEN RAISE EXCEPTION 'P7_SIGNED_REVIEW_WRONG_OWNER_PRIMARY'; END IF;
 LOCK TABLE clean.adb_phase6_authorization IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE phase6_private.frozen_native_packet_v39 IN ACCESS EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM clean.adb_phase6_authorization WHERE enabled)
 OR EXISTS(SELECT 1 FROM phase6_private.frozen_native_packet_v39)
 OR (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid='phase6_private.frozen_native_packet_v39'::regclass)<>current_user
 OR (SELECT count(*) FROM pg_constraint WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass AND convalidated
 AND conname IN ('p6_v0101_kind_allowed','p6_v0101_kind_path_guard','p6_v0101_bytes_guard','p6_v0101_packet_wire_scope'))<>4
 OR EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='phase6_private.frozen_native_packet_v39'::regclass AND conname='p6_v0101_kind_allowed' AND pg_get_constraintdef(oid) LIKE '%PHASE7_SIGNED_REVIEW%')
 THEN RAISE EXCEPTION 'P7_SIGNED_REVIEW_REQUIRES_EMPTY_STOPPED_V0101_NEVER_REPLAY'; END IF;
END $preflight$;
ALTER TABLE phase6_private.frozen_native_packet_v39
 DROP CONSTRAINT p6_v0101_kind_allowed,
 DROP CONSTRAINT p6_v0101_kind_path_guard,
 DROP CONSTRAINT p6_v0101_bytes_guard,
 DROP CONSTRAINT p6_v0101_packet_wire_scope;
ALTER TABLE phase6_private.frozen_native_packet_v39
 ADD CONSTRAINT p6_v0101_kind_allowed CHECK (kind IN (
  'SOURCE_DAY_REGISTRY','SOURCE_QUERY_PACKET','LATER_PRE_PACKET',
  'LATER_PRE_DAY_REGISTRY','POST_PACKET','SOURCE_DAY_PREPARE_REVIEW',
  'T24_PRE_PACKET','T24_PRE_DAY_REGISTRY','T24_WITNESS_RECEIPT_CANDIDATE','PHASE7_SIGNED_REVIEW')),
 ADD CONSTRAINT p6_v0101_kind_path_guard CHECK (
  (kind='SOURCE_DAY_REGISTRY' AND logical_path ~ '^data-collection/phase5/frozen/source_[A-Za-z0-9_.-]{8,125}\.json$') OR
  (kind='SOURCE_QUERY_PACKET' AND logical_path ~ '^data-collection/phase5/frozen/sourceq_[A-Za-z0-9_.-]{8,110}\.json$') OR
  (kind IN ('LATER_PRE_PACKET','LATER_PRE_DAY_REGISTRY') AND logical_path ~ '^data-collection/phase5/frozen/[A-Za-z0-9_-]{8,100}\.json$' AND logical_path !~ '/t24[prw]_' AND logical_path !~ '/p7review_') OR
  (kind='POST_PACKET' AND logical_path ~ '^data-collection/phase5/frozen/post_[A-Za-z0-9_-]{8,110}\.json$') OR
  (kind='T24_PRE_PACKET' AND logical_path ~ '^data-collection/phase5/frozen/t24p_[A-Za-z0-9_-]{8,100}\.json$') OR
  (kind='T24_PRE_DAY_REGISTRY' AND logical_path ~ '^data-collection/phase5/frozen/t24r_[A-Za-z0-9_-]{8,100}\.json$') OR
  (kind='T24_WITNESS_RECEIPT_CANDIDATE' AND shard_index=1 AND logical_path ~ '^data-collection/phase5/frozen/t24w_[a-f0-9]{64}\.json$') OR
  (kind='PHASE7_SIGNED_REVIEW' AND shard_index=1 AND logical_path ~ '^data-collection/phase5/frozen/p7review_[a-f0-9]{64}\.json AND logical_path=
    'data-collection/phase5/frozen/prepare_d'||run_day_index::text||'_'||manifest_sha256||'.json')),
 ADD CONSTRAINT p6_v0101_bytes_guard CHECK (
  octet_length(payload_bytes) BETWEEN 100 AND
   (CASE WHEN kind='SOURCE_DAY_PREPARE_REVIEW' THEN 500000 WHEN kind='T24_WITNESS_RECEIPT_CANDIDATE' THEN 20000 ELSE 250000 END)
  AND pg_catalog.encode(pg_catalog.sha256(payload_bytes),'hex')=content_sha256),
 ADD CONSTRAINT p6_v0101_packet_wire_scope CHECK (
  (kind IN ('SOURCE_DAY_PREPARE_REVIEW','T24_PRE_DAY_REGISTRY','T24_WITNESS_RECEIPT_CANDIDATE') AND review_wire_bytes IS NOT NULL
    AND octet_length(review_wire_bytes) BETWEEN 100 AND 4096
    AND retention_not_after_utc<=externally_reviewed_at_utc+interval '7 days') OR
  (kind='T24_PRE_PACKET' AND review_wire_bytes IS NULL AND retention_not_after_utc<=externally_reviewed_at_utc+interval '7 days') OR
  (kind='PHASE7_SIGNED_REVIEW' AND review_wire_bytes IS NULL AND retention_not_after_utc<=externally_reviewed_at_utc+interval '24 hours') OR
  (kind NOT IN ('SOURCE_DAY_PREPARE_REVIEW','T24_PRE_DAY_REGISTRY','T24_WITNESS_RECEIPT_CANDIDATE','T24_PRE_PACKET','PHASE7_SIGNED_REVIEW') AND
   (review_wire_bytes IS NULL OR
    (kind IN ('SOURCE_QUERY_PACKET','POST_PACKET') AND octet_length(review_wire_bytes) BETWEEN 100 AND 4096))));
) OR
  (kind='SOURCE_DAY_PREPARE_REVIEW' AND shard_index=1 AND logical_path=
    'data-collection/phase5/frozen/prepare_d'||run_day_index::text||'_'||manifest_sha256||'.json')),
 ADD CONSTRAINT p6_v0101_bytes_guard CHECK (
  octet_length(payload_bytes) BETWEEN 100 AND
   (CASE WHEN kind='SOURCE_DAY_PREPARE_REVIEW' THEN 500000 WHEN kind='T24_WITNESS_RECEIPT_CANDIDATE' THEN 20000 ELSE 250000 END)
  AND pg_catalog.encode(pg_catalog.sha256(payload_bytes),'hex')=content_sha256),
 ADD CONSTRAINT p6_v0101_packet_wire_scope CHECK (
  (kind IN ('SOURCE_DAY_PREPARE_REVIEW','T24_PRE_DAY_REGISTRY','T24_WITNESS_RECEIPT_CANDIDATE') AND review_wire_bytes IS NOT NULL
    AND octet_length(review_wire_bytes) BETWEEN 100 AND 4096
    AND retention_not_after_utc<=externally_reviewed_at_utc+interval '7 days') OR
  (kind='T24_PRE_PACKET' AND review_wire_bytes IS NULL AND retention_not_after_utc<=externally_reviewed_at_utc+interval '7 days') OR
  (kind NOT IN ('SOURCE_DAY_PREPARE_REVIEW','T24_PRE_DAY_REGISTRY','T24_WITNESS_RECEIPT_CANDIDATE','T24_PRE_PACKET') AND
   (review_wire_bytes IS NULL OR
    (kind IN ('SOURCE_QUERY_PACKET','POST_PACKET') AND octet_length(review_wire_bytes) BETWEEN 100 AND 4096))));

DO $postflight$
BEGIN
 IF NOT has_table_privilege('phase6_private_frozen_reader_v39',
  'phase6_private.frozen_native_packet_v39','SELECT') OR
  has_table_privilege('phase6_private_frozen_reader_v39',
  'phase6_private.frozen_native_packet_v39','INSERT,UPDATE,DELETE,TRUNCATE') OR
  NOT has_table_privilege('phase6_private_frozen_publisher_v39',
  'phase6_private.frozen_native_packet_v39','SELECT') OR
  NOT has_table_privilege('phase6_private_frozen_publisher_v39',
  'phase6_private.frozen_native_packet_v39','INSERT') OR
  has_table_privilege('phase6_private_frozen_publisher_v39',
  'phase6_private.frozen_native_packet_v39','UPDATE,DELETE,TRUNCATE') OR
  EXISTS(SELECT 1 FROM pg_catalog.pg_class c,LATERAL pg_catalog.aclexplode(
   coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
   WHERE c.oid='phase6_private.frozen_native_packet_v39'::regclass AND a.grantee=0)
 THEN RAISE EXCEPTION 'P6_V0101_ACL_DRIFT'; END IF;
END $postflight$;
COMMIT;
