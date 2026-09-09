-- 0044_webhook_attempt_provenance.sql
-- V3.9-f.8 §6.4: notification identity/generation and delivery-attempt
-- sequence/time/cost are independent provider-native clocks/fields. Preserve
-- them separately on the immutable raw-delivery envelope.
BEGIN;

ALTER TABLE clean.raw_delivery
  ADD COLUMN IF NOT EXISTS notification_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_notification_generated_utc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_attempt_seq_no INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_attempt_utc TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_attempt_cost_credits NUMERIC;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='raw_delivery_attempt_seq_nonnegative'
       AND conrelid='clean.raw_delivery'::regclass
  ) THEN
    ALTER TABLE clean.raw_delivery
      ADD CONSTRAINT raw_delivery_attempt_seq_nonnegative
      CHECK (delivery_attempt_seq_no IS NULL OR delivery_attempt_seq_no >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='raw_delivery_attempt_cost_nonnegative'
       AND conrelid='clean.raw_delivery'::regclass
  ) THEN
    ALTER TABLE clean.raw_delivery
      ADD CONSTRAINT raw_delivery_attempt_cost_nonnegative
      CHECK (delivery_attempt_cost_credits IS NULL OR delivery_attempt_cost_credits >= 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_delivery_notification_attempt
  ON clean.raw_delivery(notification_id, delivery_attempt_seq_no)
  WHERE notification_id IS NOT NULL AND delivery_attempt_seq_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_delivery_attempt_clock
  ON clean.raw_delivery(delivery_attempt_utc, received_at_utc);

COMMIT;
