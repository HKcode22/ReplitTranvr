-- ============================================================
-- MIGRATION 0017: V3.9 credit accounting (three-quantity ledger)
-- Schema: clean
--
-- Closes the CGTAnalaysis8 gap: the controller counted ROWS as
-- credits, but with ON CONFLICT DO UPDATE a repeated delivery
-- of the same flight (dedup_key) consumes 1 credit while creating
-- 0 new rows. From V3.9 every batch records THREE quantities:
--   notification_items_received   = flight items delivered (each = 1 credit)
--   credits_consumed_actual       = Flight Alert balance delta (external truth)
--   unique_flight_rows_@          = rows stored / inserted / updated
-- and reconciles |C_external - C_internal| ~ 0 (CGTAnalaysis8 §3/§4,
-- V3_CollectionStrategy2.md §13, §44-A/B).
--
--   adb_collection_batches gains the balance-ledger + upsert counters
--   adb_ingest_events            = one row per webhook delivery (single-writer:
--                                 routes_v3.ts webhook ingress) so the per-batch
--                                 item/row/failure numbers survive restarts.
-- All idempotent (safe to re-run every boot). Additive — no renames/drops.
-- ============================================================

BEGIN;

ALTER TABLE clean.adb_collection_batches
  ADD COLUMN IF NOT EXISTS balance_before BIGINT,
  ADD COLUMN IF NOT EXISTS balance_after BIGINT,
  ADD COLUMN IF NOT EXISTS credits_consumed_actual BIGINT,
  ADD COLUMN IF NOT EXISTS credits_consumed_internal BIGINT,
  ADD COLUMN IF NOT EXISTS notification_items_received BIGINT,
  ADD COLUMN IF NOT EXISTS rows_stored BIGINT,
  ADD COLUMN IF NOT EXISTS rows_inserted BIGINT,
  ADD COLUMN IF NOT EXISTS rows_updated BIGINT,
  ADD COLUMN IF NOT EXISTS delivery_failures BIGINT,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT;

CREATE TABLE IF NOT EXISTS clean.adb_ingest_events (
  id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_id TEXT,
  batch_id TEXT,
  notification_items INTEGER NOT NULL DEFAULT 0,
  rows_stored INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  delivery_failure BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  credits_remaining INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ingest_events_batch
  ON clean.adb_ingest_events (batch_id, received_at);
CREATE INDEX IF NOT EXISTS idx_ingest_events_received_at
  ON clean.adb_ingest_events (received_at);
CREATE INDEX IF NOT EXISTS idx_ingest_events_subscription
  ON clean.adb_ingest_events (subscription_id);

COMMIT;