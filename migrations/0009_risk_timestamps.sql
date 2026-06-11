-- Record when a flight first crossed into red tier and when cancellation was first confirmed.
-- These two timestamps together show whether the risk scorer predicted the problem in advance.
ALTER TABLE monitored_flights
  ADD COLUMN IF NOT EXISTS red_tier_first_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Same timestamps for user-monitored flights, plus outcome columns so the monitoring
-- page can show what actually happened to each tracked flight after it departed.
ALTER TABLE user_monitored_flights
  ADD COLUMN IF NOT EXISTS red_tier_first_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS resolved_status TEXT,
  ADD COLUMN IF NOT EXISTS resolved_delay_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
