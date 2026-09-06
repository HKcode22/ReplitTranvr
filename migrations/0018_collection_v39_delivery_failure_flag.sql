-- ============================================================
-- MIGRATION 0018: V3.9 R5 — delivery-failure audit flag +
-- reconcile-before-resume discipline
-- Schema: clean
--
-- Problem (plan §15 R5, §45.5-R5, §44-C gate 10):
--   On a delivery_failure stop the batch must be flagged so the
--   affected rows/flights are queryable and the run cannot silently
--   resume before the failure is reconciled. maxDeliveryRetries=0
--   means a failed delivery is LOST, so continuing without a
--   reconcile would silently bias the dataset.
--
-- Adds:
--   flight_data_pre_post.flagged_at         — audit timestamp when a
--                                              row is flagged (delivery-
--                                              failure stop, §45.5-R5)
--   flight_data_pre_post.flag_reason        — 'delivery_failure' etc.
--   adb_collection_batches.reconcile_acked  — a forced-stop batch must
--                                              be acknowledged reconciled
--                                              before the watchdog may
--                                              auto-resume (R5)
--
-- Idempotent (safe to re-run every boot).
-- ============================================================

BEGIN;

ALTER TABLE clean.flight_data_pre_post
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_fdp_flagged
  ON clean.flight_data_pre_post (flagged_at)
  WHERE flagged_at IS NOT NULL;

ALTER TABLE clean.adb_collection_batches
  ADD COLUMN IF NOT EXISTS reconcile_acked BOOLEAN NOT NULL DEFAULT false;

COMMIT;