-- Confirmation-alert tracking. Fires AFTER AeroDataBox confirms an actual
-- delay/cancellation, in addition to the predictive risk-score alert.
ALTER TABLE monitored_flights
  ADD COLUMN IF NOT EXISTS confirmation_alert_sent_at TIMESTAMP;

ALTER TABLE flight_travelers
  ADD COLUMN IF NOT EXISTS confirmation_alert_sent_at TIMESTAMP;
