-- 0059_phase2g_deferred_cleanup_settling.sql
-- Phase-2G: allow a provider-safe, reconciled probe to remain in a durable
-- settling state while exact-session Replit Object Storage cleanup is pending.
--
-- This state is specifically for the no-redeploy architecture where the
-- 120-minute paid owner runs outside Replit (GitHub Actions) and the existing
-- published Travnr deployment receives callbacks. Provider deletion,
-- settlement, and reconciliation complete before status='settling'.
-- Only exact-session purpose cleanup may advance settling -> completed.
BEGIN;

ALTER TABLE clean.adb_anchor_probe
  DROP CONSTRAINT IF EXISTS adb_anchor_probe_status_check;

ALTER TABLE clean.adb_anchor_probe
  ADD CONSTRAINT adb_anchor_probe_status_check
  CHECK (status IN ('completed','failed','probing','settling','abandoned'));

COMMIT;
