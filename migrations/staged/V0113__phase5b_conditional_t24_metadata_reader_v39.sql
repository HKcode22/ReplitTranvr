-- STAGED ONLY: existing private reader may inspect conditional T24
-- operational custody metadata, never raw SOURCE, features or PRE writes.
-- No new login, secret, table, provider, scheduler or retention extension.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $p6_preflight$
BEGIN
 IF current_database()<>'neondb' OR current_setting('server_version_num')::int/10000<>16 OR pg_is_in_recovery()
 OR to_regrole('phase6_private_frozen_reader_v39') IS NULL
 OR to_regclass('phase6_private.frozen_native_packet_v39') IS NULL
 OR to_regclass('clean.phase5_t24_postcommit_witness_v39') IS NULL
 OR to_regclass('clean.flight_snapshots') IS NULL
 OR to_regclass('phase6_private.conditional_t24_snapshot_meta_v39') IS NOT NULL
 OR to_regclass('phase6_private.conditional_t24_witness_meta_v39') IS NOT NULL
 THEN RAISE EXCEPTION 'P6_V0113_PREDECESSOR_OR_DATABASE_DRIFT'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='phase6_private_frozen_reader_v39'
  AND (rolcanlogin OR rolsuper OR rolcreaterole OR rolbypassrls))
 OR has_any_column_privilege('phase6_private_frozen_reader_v39','clean.flight_snapshots','SELECT,INSERT,UPDATE,REFERENCES')
 OR has_any_column_privilege('phase6_private_frozen_reader_v39','clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT,UPDATE,REFERENCES')
 OR has_table_privilege('phase6_private_frozen_reader_v39','clean.flight_snapshots','DELETE,TRUNCATE,TRIGGER')
 OR has_table_privilege('phase6_private_frozen_reader_v39','clean.phase5_t24_postcommit_witness_v39','DELETE,TRUNCATE,TRIGGER')
 THEN RAISE EXCEPTION 'P6_V0113_BASE_ROLE_NOT_ISOLATED'; END IF;
END $p6_preflight$;
-- Do not filter missing/expired witness custody here. The independent
-- signed custody reader must distinguish invalid/unavailable from absence.
CREATE VIEW phase6_private.conditional_t24_snapshot_meta_v39
 WITH (security_barrier=true) AS
 SELECT flight_instance_id,id::text AS snapshot_id FROM clean.flight_snapshots
 WHERE horizon='T-24h' AND flight_instance_id ~ '^leg:g5a:[a-f0-9]{64}$';
CREATE VIEW phase6_private.conditional_t24_witness_meta_v39
 WITH (security_barrier=true) AS
 SELECT w.snapshot_id::text AS snapshot_id,s.id::text AS joined_snapshot_id,w.flight_instance_id,
 w.selected_t_version,w.fids_response_hash,w.source_query_digest,w.frame_hash,w.config_hash,
 w.selected_t_native_utc,w.t24_cutoff_utc,w.post_pre_commit_db_observed_at_utc,
 s.population_query_id AS source_t24_population_query_id,s.prediction_state AS snapshot_prediction_state,
 s.horizon AS snapshot_horizon
 FROM clean.phase5_t24_postcommit_witness_v39 w JOIN clean.flight_snapshots s ON s.id=w.snapshot_id
 WHERE w.flight_instance_id ~ '^leg:g5a:[a-f0-9]{64}$';
REVOKE ALL ON phase6_private.conditional_t24_snapshot_meta_v39,phase6_private.conditional_t24_witness_meta_v39 FROM PUBLIC;
GRANT SELECT ON phase6_private.conditional_t24_snapshot_meta_v39,phase6_private.conditional_t24_witness_meta_v39 TO phase6_private_frozen_reader_v39;
DO $p6_postflight$
BEGIN
 IF NOT has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.conditional_t24_snapshot_meta_v39','SELECT')
 OR NOT has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.conditional_t24_witness_meta_v39','SELECT')
 OR has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.conditional_t24_snapshot_meta_v39','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
 OR has_table_privilege('phase6_private_frozen_reader_v39','phase6_private.conditional_t24_witness_meta_v39','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
 OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
  WHERE c.oid IN ('phase6_private.conditional_t24_snapshot_meta_v39'::regclass,'phase6_private.conditional_t24_witness_meta_v39'::regclass)
    AND a.grantee=0)
 THEN RAISE EXCEPTION 'P6_V0113_READER_ACL_DRIFT'; END IF;
END $p6_postflight$;
COMMIT;
