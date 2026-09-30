-- V3.9 Phase-2G reconciliation-status schema repair.
--
-- Migration 0055 introduced clean.adb_anchor_probe.reconciliation_status
-- with MATCH/MISMATCH/UNRESOLVED.
--
-- Migration 0058 subsequently introduced DELIVERY_GAP as a durable,
-- terminal/non-scoreable reconciliation classification, but the older
-- adb_anchor_probe CHECK constraint was not widened accordingly.
--
-- This migration repairs only that schema compatibility defect.
--
-- It does NOT:
--   * make DELIVERY_GAP promotion-valid;
--   * weaken exact-MATCH scientific acceptance;
--   * change historical probe evidence;
--   * change provider behavior;
--   * authorize another paid attempt.
--
-- Safe-mode completed/settling probes continue to require MATCH through
-- the existing Phase-2G shape constraints.

BEGIN;

DO $$
DECLARE
  existing_definition TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
    INTO existing_definition
    FROM pg_constraint c
   WHERE c.conrelid = 'clean.adb_anchor_probe'::regclass
     AND c.conname = 'adb_anchor_probe_reconciliation_status_check';

  IF existing_definition IS NULL
     OR position('DELIVERY_GAP' IN existing_definition) = 0
  THEN
    ALTER TABLE clean.adb_anchor_probe
      DROP CONSTRAINT IF EXISTS adb_anchor_probe_reconciliation_status_check;

    ALTER TABLE clean.adb_anchor_probe
      ADD CONSTRAINT adb_anchor_probe_reconciliation_status_check
      CHECK (
        reconciliation_status IS NULL
        OR reconciliation_status IN (
          'MATCH',
          'DELIVERY_GAP',
          'MISMATCH',
          'UNRESOLVED'
        )
      ) NOT VALID;
  END IF;
END
$$;

COMMIT;
