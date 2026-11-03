-- V0078 — Phase4 Gate5 original FIDS re-observation uniqueness correction
--
-- STAGED ONLY. Do NOT move into migrations/current or reinstall V0077.
-- Production execution is permitted ONLY through the separately reviewed,
-- SHA-pinned, single-use V0078 installer, after both-role read-only catalog
-- verification and explicit owner release. Otherwise run ONLY on disposable
-- PostgreSQL16 with a single transaction and test-only source receipts.
-- Target: preserve all repeat original FIDS source members while continuing
-- to reject duplicate legacy non-FIDS flight records.
--
-- Old B0062 "flight_population_key" spans all source types, preventing
-- DISTINCT population_query_id FIDS observations of the same operated flight.
-- Source identity is the existing strict UNIQUE observation index
-- (population_query_id, analytic_identity_id, population_role).
-- The existing FIDS completeness CHECK requires all three non-NULL unless
-- the row has undergone provider-content expiry/nullification.
--
-- This is a NARROW REPLACEMENT of a legacy uniqueness policy, not a fully
-- additive migration. It takes an exclusive table DDL lock and requires
-- reviewed production compatibility/maintenance and privilege checks.
--
-- All historical rows and provider-expiry triggers stay untouched.
-- No paid request, subscription, DDL grant, special runtime permission
-- or automatic scientific Gate5 PASS is created by this script.

DO $v0078_preflight$
DECLARE
  legacy_def text;
  obs_ok boolean;
BEGIN
  IF to_regclass('clean.flight_population') IS NULL
     OR to_regclass('clean.flight_population_observation_key') IS NULL
  THEN
    RAISE EXCEPTION 'V0078_BASELINE_POPULATION_OR_OBSERVATION_INDEX_MISSING_HOLD';
  END IF;
  SELECT pg_get_constraintdef(c.oid)
    INTO legacy_def
    FROM pg_constraint c
   WHERE c.conrelid='clean.flight_population'::regclass
     AND c.conname='flight_population_key'
     AND c.contype='u';
  IF legacy_def IS DISTINCT FROM
     'UNIQUE (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)'
  THEN
    RAISE EXCEPTION 'V0078_UNEXPECTED_LEGACY_UNIQUENESS_POLICY_HOLD';
  END IF;
  SELECT (idx.indisunique AND idx.indisvalid AND idx.indpred IS NULL)
    INTO obs_ok
    FROM pg_index idx
    JOIN pg_class i ON i.oid=idx.indexrelid
   WHERE idx.indrelid='clean.flight_population'::regclass
     AND i.relname='flight_population_observation_key';
  IF obs_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'V0078_QUERY_SOURCE_OBSERVATION_UNIQUENESS_UNVERIFIED_HOLD';
  END IF;
  IF to_regclass('clean.flight_population_legacy_nonfids_key_v39') IS NOT NULL THEN
    RAISE EXCEPTION 'V0078_TARGET_INDEX_ALREADY_EXISTS_HOLD';
  END IF;
  IF EXISTS (
   SELECT 1 FROM clean.flight_population
    WHERE source_type='fids'
      AND provider_content_expired_at_utc IS NULL
      AND (population_query_id IS NULL OR analytic_identity_id IS NULL
           OR population_role IS NULL)
  ) THEN
    RAISE EXCEPTION 'V0078_UNSAFE_NONEXPIRED_FIDS_IDENTITY_ROWS_HOLD';
  END IF;
END
$v0078_preflight$;

-- Preserve exact old composite dedup of legacy non-FIDS source rows.
-- Make no changes to raw source/normalized member expiry or existing
-- immutable snapshot/canonical flight identity.
ALTER TABLE ONLY clean.flight_population
  DROP CONSTRAINT flight_population_key;

CREATE UNIQUE INDEX flight_population_legacy_nonfids_key_v39
 ON clean.flight_population USING btree
 (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)
 WHERE (source_type <> 'fids');

COMMENT ON INDEX clean.flight_population_legacy_nonfids_key_v39 IS
 'V0078: preserve B0062 composite uniqueness for non-FIDS only; FIDS original observations are unique by population_query_id + analytic_identity_id + population_role';

DO $v0078_after$
DECLARE
  index_ok boolean;
  source_key_ok boolean;
BEGIN
  IF EXISTS (
   SELECT 1 FROM pg_constraint
    WHERE conrelid='clean.flight_population'::regclass
      AND conname='flight_population_key'
  ) THEN RAISE EXCEPTION 'V0078_OLD_GLOBAL_CONSTRAINT_STILL_PRESENT_HOLD'; END IF;
  SELECT (idx.indisunique AND idx.indisvalid AND idx.indpred IS NOT NULL)
    INTO index_ok
    FROM pg_index idx
    JOIN pg_class i ON i.oid=idx.indexrelid
   WHERE idx.indrelid='clean.flight_population'::regclass
     AND i.relname='flight_population_legacy_nonfids_key_v39';
  SELECT (idx.indisunique AND idx.indisvalid)
    INTO source_key_ok
    FROM pg_index idx
    JOIN pg_class i ON i.oid=idx.indexrelid
   WHERE idx.indrelid='clean.flight_population'::regclass
     AND i.relname='flight_population_observation_key';
  IF index_ok IS DISTINCT FROM true OR source_key_ok IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION 'V0078_REPLACEMENT_OR_SOURCE_OBSERVATION_INDEX_HOLD';
  END IF;
END
$v0078_after$;
