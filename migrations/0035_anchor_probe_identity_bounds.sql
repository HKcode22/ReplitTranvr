-- 0035_anchor_probe_identity_bounds.sql
-- V3.9-f.8 Gate-2: preserve identity-resolution ambiguity bounds used to prove
-- final-five membership/ranking invariance before Stage 2 promotion.
BEGIN;
ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS confirmed_unique_lower INTEGER;
ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS confirmed_plus_ambiguous_upper INTEGER;
ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS preprobe_artifact_sha256 TEXT;
ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS probe_budget_day_id TEXT;
ALTER TABLE clean.adb_anchor_probe
  ADD CONSTRAINT adb_anchor_probe_identity_bounds_order
  CHECK (
    confirmed_unique_lower IS NULL OR
    confirmed_plus_ambiguous_upper IS NULL OR
    confirmed_unique_lower <= confirmed_plus_ambiguous_upper
  ) NOT VALID;
COMMIT;
