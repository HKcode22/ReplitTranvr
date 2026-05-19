-- Travelers + health reports.
--
-- This file is in the BOOT_MIGRATIONS list (server/db.ts) and re-runs on every
-- startup, so the destructive TRUNCATE is guarded: it only fires while the
-- legacy `traveler_name` column still exists on monitored_flights. Once the
-- DROP COLUMNs below have run, the guard is false and the TRUNCATE no-ops.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'monitored_flights'
      AND column_name = 'traveler_name'
  ) THEN
    EXECUTE 'TRUNCATE monitored_flights CASCADE';
  END IF;
END $$;

ALTER TABLE monitored_flights
  DROP COLUMN IF EXISTS traveler_name,
  DROP COLUMN IF EXISTS traveler_email,
  DROP COLUMN IF EXISTS traveler_phone,
  DROP COLUMN IF EXISTS traveler_selection_token,
  DROP COLUMN IF EXISTS traveler_selected_option_id,
  DROP COLUMN IF EXISTS traveler_selected_at,
  DROP COLUMN IF EXISTS agency_notified_at,
  DROP COLUMN IF EXISTS alert_sent_at;

CREATE TABLE IF NOT EXISTS flight_travelers (
  id SERIAL PRIMARY KEY,
  monitored_flight_id INTEGER NOT NULL REFERENCES monitored_flights(id) ON DELETE CASCADE,
  agency_id INTEGER NOT NULL REFERENCES agency_accounts(id),
  traveler_name TEXT NOT NULL,
  traveler_email TEXT NOT NULL,
  traveler_phone TEXT,
  selection_token TEXT UNIQUE,
  selected_option_id TEXT,
  selected_at TIMESTAMP,
  alert_sent_at TIMESTAMP,
  agency_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flight_travelers_flight_id_idx
  ON flight_travelers (monitored_flight_id);
CREATE INDEX IF NOT EXISTS flight_travelers_agency_id_idx
  ON flight_travelers (agency_id);

CREATE TABLE IF NOT EXISTS health_reports (
  id SERIAL PRIMARY KEY,
  generated_at TIMESTAMP DEFAULT NOW(),
  flights_analyzed INTEGER,
  flights_flagged INTEGER,
  true_positives INTEGER,
  false_positives INTEGER,
  false_negatives INTEGER,
  true_negatives INTEGER,
  precision REAL,
  recall REAL,
  avg_score_disrupted REAL,
  avg_score_on_time REAL,
  claude_summary TEXT,
  raw_data JSONB,
  requested_by_agency_id INTEGER REFERENCES agency_accounts(id)
);
