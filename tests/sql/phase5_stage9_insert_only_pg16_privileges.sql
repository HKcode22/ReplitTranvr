-- Real disposable PostgreSQL 16 regression for Phase5 Stage9.
-- No source Content, provider key, production database or migrations.
\set ON_ERROR_STOP on
CREATE ROLE phase5_stage9_ci_writer NOLOGIN;
CREATE SCHEMA phase5_stage9_ci;
CREATE TABLE phase5_stage9_ci.allowed_query (
  query_digest text PRIMARY KEY,
  state text NOT NULL DEFAULT 'PREPARED'
);
REVOKE ALL ON SCHEMA phase5_stage9_ci FROM PUBLIC;
REVOKE ALL ON phase5_stage9_ci.allowed_query FROM PUBLIC;
GRANT USAGE ON SCHEMA phase5_stage9_ci TO phase5_stage9_ci_writer;
GRANT SELECT, INSERT ON phase5_stage9_ci.allowed_query TO phase5_stage9_ci_writer;
SET ROLE phase5_stage9_ci_writer;
DO $$
BEGIN
  IF current_user <> 'phase5_stage9_ci_writer'
    OR NOT has_table_privilege(current_user,'phase5_stage9_ci.allowed_query','SELECT')
    OR NOT has_table_privilege(current_user,'phase5_stage9_ci.allowed_query','INSERT')
    OR has_table_privilege(current_user,'phase5_stage9_ci.allowed_query','UPDATE')
    OR has_table_privilege(current_user,'phase5_stage9_ci.allowed_query','DELETE')
  THEN RAISE EXCEPTION 'STAGE9_TEST_WRITER_NOT_INSERT_ONLY'; END IF;
END $$;
-- PostgreSQL 16 explicitly forbids row-locking SELECT for this role.
DO $$
BEGIN
  BEGIN
    EXECUTE 'SELECT query_digest FROM phase5_stage9_ci.allowed_query FOR SHARE';
    RAISE EXCEPTION 'STAGE9_FOR_SHARE_UNEXPECTEDLY_PERMITTED';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'EXPECTED_PG16_ROW_LOCK_PRIVILEGE_REJECTION';
  END;
END $$;
-- The repaired Stage9 SELECT + INSERT + RETURNING contract is permitted
-- in one SERIALIZABLE transaction with an immutable unique digest.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT query_digest FROM phase5_stage9_ci.allowed_query
  WHERE query_digest='prepared_1';
INSERT INTO phase5_stage9_ci.allowed_query(query_digest,state)
  VALUES('prepared_1','PREPARED') RETURNING query_digest;
COMMIT;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM phase5_stage9_ci.allowed_query
      WHERE query_digest='prepared_1' AND state='PREPARED') <> 1
  THEN RAISE EXCEPTION 'STAGE9_REAL_PG16_QUERY_NOT_INSERTED'; END IF;
END $$;
SELECT 'STAGE9_PG16_INSERT_ONLY_PRIVILEGE_REGRESSION_PASS' AS result;
