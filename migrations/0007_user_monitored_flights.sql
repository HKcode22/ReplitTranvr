CREATE TABLE IF NOT EXISTS user_monitored_flights (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flight_number TEXT NOT NULL,
  carrier_iata TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  departure_time TEXT,
  origin_iata TEXT NOT NULL,
  destination_iata TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_tier TEXT NOT NULL DEFAULT 'green',
  last_checked_at TIMESTAMP,
  last_alerted_tier TEXT,
  flight_status JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_monitored_flights_user_id_idx ON user_monitored_flights(user_id);
CREATE INDEX IF NOT EXISTS user_monitored_flights_status_idx ON user_monitored_flights(status);
