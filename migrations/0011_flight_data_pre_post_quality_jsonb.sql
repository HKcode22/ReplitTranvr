-- ============================================================
-- MIGRATION 0011: align dep_quality / arr_quality to JSONB
-- Schema: clean
-- Table: flight_data_pre_post
--
-- 0010 declared these as TEXT[] but the drizzle schema
-- (shared/schema.ts) declares them jsonb, and drizzle-kit push
-- syncs the DB to the schema on deploy. Align the table to jsonb
-- so webhook inserts (which serialize quality[] as JSON) always
-- match, no matter which order push/boot-migrations ran.
-- Idempotent: safe to re-run every boot (a no-op when already jsonb).
-- ============================================================

BEGIN;

ALTER TABLE clean.flight_data_pre_post
  ALTER COLUMN dep_quality TYPE JSONB USING to_jsonb(dep_quality),
  ALTER COLUMN arr_quality TYPE JSONB USING to_jsonb(arr_quality);

COMMIT;
