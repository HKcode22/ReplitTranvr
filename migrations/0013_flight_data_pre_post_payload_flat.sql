-- ============================================================
-- MIGRATION 0013: readable flattened payload mirror
-- Schema: clean
-- Table: flight_data_pre_post
--
-- Adds payload_json_flat JSONB: a SINGLE-LEVEL dot-notation mirror
-- of payload_json (e.g. {"arrival.airport.iata": "GYE"}). Numeric
-- enums are decoded to names (status -> "EnRoute", codeshareStatus ->
-- "IsOperator", quality -> ["Basic","Live"]). Filled by the extractor
-- (new rows) and the backfill script (existing rows).
--
-- payload_json stays the untouched raw source of truth.
-- Idempotent: safe to re-run every boot (a no-op when column exists).
-- ============================================================

BEGIN;

ALTER TABLE clean.flight_data_pre_post
  ADD COLUMN IF NOT EXISTS payload_json_flat JSONB;

COMMIT;
