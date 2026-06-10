ALTER TABLE monitored_flights
  ADD COLUMN IF NOT EXISTS resolved_status TEXT,
  ADD COLUMN IF NOT EXISTS resolved_delay_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS monitored_flights_resolved_status_idx
  ON monitored_flights(resolved_status);
