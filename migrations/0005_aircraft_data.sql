ALTER TABLE monitored_flights
  ADD COLUMN IF NOT EXISTS tail_number text,
  ADD COLUMN IF NOT EXISTS equipment_type text;

ALTER TABLE risk_score_history
  ADD COLUMN IF NOT EXISTS tail_number text,
  ADD COLUMN IF NOT EXISTS equipment_type text;
