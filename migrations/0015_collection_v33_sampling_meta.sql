-- ============================================================
-- MIGRATION 0015: V3.3 collection metadata for batches
-- Schema: clean
--
-- Adds batch-level sampling metadata so the one-4h-rotating-window-per-day
-- and rotating-anchor-pool design (V3_CollectionStrategy2.md §9, §7, §24)
-- is auditable after the fact — the same discipline as the per-row
-- sampling stamps in migration 0012.
--
--   adb_collection_batches.window_shape     e.g. '4h' (future: '2x2h','6h')
--   adb_collection_batches.anchor_icao      the day's anchor airport (null if none)
--   adb_collection_batches.sampling_strategy 'anchor' | 'rotating'
--
-- All idempotent (safe to re-run every boot). Additive — no renames/drops.
-- ============================================================

BEGIN;

ALTER TABLE clean.adb_collection_batches
  ADD COLUMN IF NOT EXISTS window_shape TEXT,
  ADD COLUMN IF NOT EXISTS anchor_icao TEXT,
  ADD COLUMN IF NOT EXISTS sampling_strategy TEXT;

COMMIT;
