ALTER TABLE monitored_flights
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
