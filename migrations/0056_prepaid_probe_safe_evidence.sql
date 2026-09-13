-- V3.9 Phase-2 Gate-2: persist only research aggregates after the isolated
-- prepaid runtime has reconciled and deleted provider-content blobs.
--
-- `provider_content_safe_mode=true` identifies the new PITR-safe execution
-- path. In that mode direct provider identifiers/account values MUST remain
-- NULL in the logged adb_anchor_probe row. Identity ambiguity is preserved as
-- per-credit aggregate bounds so Stage-2 ranking invariance does not require
-- retaining the external balance delta itself.
BEGIN;

ALTER TABLE clean.adb_anchor_probe
  ADD COLUMN IF NOT EXISTS provider_content_safe_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_unique_lower_per_credit DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS confirmed_plus_ambiguous_upper_per_credit DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_anchor_probe_safe_provider_fields_null'
       AND conrelid='clean.adb_anchor_probe'::regclass
  ) THEN
    ALTER TABLE clean.adb_anchor_probe
      ADD CONSTRAINT adb_anchor_probe_safe_provider_fields_null
      CHECK (
        NOT provider_content_safe_mode OR (
          subscription_id IS NULL AND
          balance_before IS NULL AND
          balance_after IS NULL AND
          credits_spent IS NULL AND
          settlement_stable_balance IS NULL AND
          internal_send_credits IS NULL
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_anchor_probe_safe_bound_rates'
       AND conrelid='clean.adb_anchor_probe'::regclass
  ) THEN
    ALTER TABLE clean.adb_anchor_probe
      ADD CONSTRAINT adb_anchor_probe_safe_bound_rates
      CHECK (
        confirmed_unique_lower_per_credit IS NULL OR
        confirmed_plus_ambiguous_upper_per_credit IS NULL OR (
          confirmed_unique_lower_per_credit >= 0 AND
          confirmed_plus_ambiguous_upper_per_credit >= confirmed_unique_lower_per_credit
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='adb_anchor_probe_safe_completed_shape'
       AND conrelid='clean.adb_anchor_probe'::regclass
  ) THEN
    ALTER TABLE clean.adb_anchor_probe
      ADD CONSTRAINT adb_anchor_probe_safe_completed_shape
      CHECK (
        NOT provider_content_safe_mode OR status <> 'completed' OR (
          runtime_session_id IS NOT NULL AND
          runtime_cleanup_verified_at_utc IS NOT NULL AND
          reconciliation_status = 'MATCH' AND
          confirmed_unique_lower_per_credit IS NOT NULL AND
          confirmed_plus_ambiguous_upper_per_credit IS NOT NULL
        )
      ) NOT VALID;
  END IF;
END $$;

COMMIT;
