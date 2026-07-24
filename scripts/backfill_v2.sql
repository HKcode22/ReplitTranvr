-- ============================================================
-- BACKFILL: Copy all tracked flights from old tables into v2
-- ============================================================
-- This script is IDEMPOTENT — safe to run multiple times.
-- Preserves old row IDs so FK relationships stay intact.
-- Run with: psql "$DATABASE_URL" -f scripts/backfill_v2.sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Backfill monitored_flights_v2 from old table
-- ============================================================
-- NOTE: old `monitored_flights` columns are quoted lowercase to
-- match the actual DDL: CREATE TABLE "monitored_flights" ( "id" ... )
-- The old `departure_date` is TEXT; we cast to DATE.
-- ============================================================
INSERT INTO clean.monitored_flights_v2 (
  id, flight_number, carrier_iata, departure_date, departure_time,
  departure_time_utc,
  origin_iata, destination_iata,
  status, risk_score, risk_tier, last_checked_at,
  red_tier_first_at, cancelled_at, confirmation_alert_sent_at,
  resolved_status, resolved_delay_minutes, resolved_at,
  agency_resolved_at, tail_number, equipment_type,
  equipment_group,
  is_test, agency_id, created_at
)
SELECT
  mf."id" AS id,
  mf."flight_number" AS flight_number,
  mf."carrier_iata" AS carrier_iata,
  mf."departure_date"::date AS departure_date,
  mf."departure_time" AS departure_time,
  CASE WHEN mf."departure_date" IS NOT NULL AND mf."departure_time" IS NOT NULL
       THEN (mf."departure_date" || 'T' || mf."departure_time" || ':00Z')::TIMESTAMP
       ELSE NULL END AS departure_time_utc,
  mf."origin_iata" AS origin_iata,
  mf."destination_iata" AS destination_iata,
  mf."status" AS status,
  mf."risk_score" AS risk_score,
  mf."risk_tier" AS risk_tier,
  mf."last_checked_at" AS last_checked_at,
  mf."red_tier_first_at" AS red_tier_first_at,
  mf."cancelled_at" AS cancelled_at,
  mf."confirmation_alert_sent_at" AS confirmation_alert_sent_at,
  mf."resolved_status" AS resolved_status,
  mf."resolved_delay_minutes" AS resolved_delay_minutes,
  mf."resolved_at" AS resolved_at,
  mf."agency_resolved_at" AS agency_resolved_at,
  mf."tail_number" AS tail_number,
  mf."equipment_type" AS equipment_type,
  CASE
    WHEN mf."equipment_type" ~* '^(B?737|B?73[0-9]|A320|A32[0-9]|A21[0-9]|B?757|B?767)' THEN 'narrowbody'
    WHEN mf."equipment_type" ~* '^(B?777|B?787|A330|A33[0-9]|A340|A34[0-9]|A350|A35[0-9])' THEN 'widebody'
    WHEN mf."equipment_type" ~* '^CRJ|E17[0-9]|E19[0-9]|AT[45]|DH[CD]' THEN 'regional'
    ELSE 'unknown'
  END AS equipment_group,
  mf."is_test" AS is_test,
  mf."agency_id" AS agency_id,
  mf."created_at" AS created_at
FROM "monitored_flights" mf
ON CONFLICT (flight_number, departure_date) DO NOTHING;

-- ============================================================
-- STEP 2: Backfill risk_score_history_v2 from old table
-- ============================================================
-- The old `risk_score_history` stores all signal data in a JSONB
-- column called "signals". We extract every field into flat columns.
-- The old `score` and `tier` columns become `heuristic_score` and
-- `heuristic_tier`. We JOIN with monitored_flights to get
-- is_test and agency_id.
-- ============================================================
INSERT INTO clean.risk_score_history_v2 (
  id, monitored_flight_id, scored_at,
  actual_delay_minutes, actual_cancelled, actual_status,
  flight_number, carrier_iata, departure_date, departure_time,
  origin_iata, destination_iata,
  hours_until_departure, time_of_day_risk, day_of_week_risk,
  connection_risk, horizon,
  departure_hour, departure_day_of_week,
  origin_flight_category, origin_wind_speed_kt, origin_gust_speed_kt,
  origin_visibility_miles, origin_ceiling_ft,
  origin_has_thunderstorm, origin_has_freezing,
  destination_flight_category, destination_wind_speed_kt, destination_gust_speed_kt,
  destination_visibility_miles, destination_ceiling_ft,
  destination_has_thunderstorm, destination_has_freezing,
  origin_has_ground_stop, origin_has_ground_delay, origin_nas_avg_delay_minutes,
  destination_has_ground_stop, destination_has_ground_delay, destination_nas_avg_delay_minutes,
  nas_origin_programs, nas_destination_programs,
  carrier_cancellation_rate_24h, carrier_avg_delay_24h,
  carrier_health_score, carrier_reliable, carrier_health_sample_size,
  tail_number, equipment_type, equipment_group,
  historical_otp_score, historical_otp_sample_size,
  historical_otp_source, historical_risk,
  heuristic_score, heuristic_tier,
  signal_inbound_aircraft_delay, signal_inbound_delay_raw_minutes,
  signal_atc_ground_stop, signal_atc_ground_delay,
  signal_origin_weather, signal_destination_weather,
  signal_carrier_health, signal_time_of_day, signal_day_of_week,
  signal_connection_risk,
  is_test_flight, agency_id
)
SELECT
  rsh."id" AS id,
  rsh."monitored_flight_id" AS monitored_flight_id,
  rsh."scored_at" AS scored_at,

  -- Target variables (extracted from JSONB "signals")
  (rsh."signals"#>>'{flightStatus,delayMinutes}')::INTEGER AS actual_delay_minutes,
  (rsh."signals"#>>'{flightStatus,cancelled}')::BOOLEAN AS actual_cancelled,
  rsh."signals"#>>'{flightStatus,status}' AS actual_status,

  -- Flight info (from joined monitored_flights — NOT stored in JSONB)
  mf."flight_number" AS flight_number,
  mf."carrier_iata" AS carrier_iata,
  mf."departure_date"::DATE AS departure_date,
  mf."departure_time" AS departure_time,
  mf."origin_iata" AS origin_iata,
  mf."destination_iata" AS destination_iata,

  -- Timing features (from nested signals.signals)
  (rsh."signals"#>>'{signals,hoursUntilDeparture}')::NUMERIC(6,1) AS hours_until_departure,
  (rsh."signals"#>>'{signals,timeOfDayRisk}')::INTEGER AS time_of_day_risk,
  (rsh."signals"#>>'{signals,dayOfWeekRisk}')::INTEGER AS day_of_week_risk,
  (rsh."signals"#>>'{signals,connectionRisk}')::INTEGER AS connection_risk,
  rsh."signals"#>>'{signals,horizon}' AS horizon,

  -- Derived timing (computed from monitored_flights columns)
  EXTRACT(HOUR FROM (mf."departure_date" || 'T' || COALESCE(mf."departure_time", '12:00') || ':00Z')::TIMESTAMP)::INTEGER AS departure_hour,
  EXTRACT(DOW FROM mf."departure_date"::DATE)::INTEGER AS departure_day_of_week,

  -- Origin weather (from signals.originWeather)
  rsh."signals"#>>'{originWeather,flightCategory}' AS origin_flight_category,
  (rsh."signals"#>>'{originWeather,windSpeedKt}')::NUMERIC(5,1) AS origin_wind_speed_kt,
  (rsh."signals"#>>'{originWeather,gustSpeedKt}')::NUMERIC(5,1) AS origin_gust_speed_kt,
  (rsh."signals"#>>'{originWeather,visibilityMiles}')::NUMERIC(5,1) AS origin_visibility_miles,
  (rsh."signals"#>>'{originWeather,ceilingFt}')::INTEGER AS origin_ceiling_ft,
  (rsh."signals"#>>'{originWeather,hasThunderstorm}')::BOOLEAN AS origin_has_thunderstorm,
  (rsh."signals"#>>'{originWeather,hasFreezing}')::BOOLEAN AS origin_has_freezing,

  -- Destination weather (from signals.destinationWeather)
  rsh."signals"#>>'{destinationWeather,flightCategory}' AS destination_flight_category,
  (rsh."signals"#>>'{destinationWeather,windSpeedKt}')::NUMERIC(5,1) AS destination_wind_speed_kt,
  (rsh."signals"#>>'{destinationWeather,gustSpeedKt}')::NUMERIC(5,1) AS destination_gust_speed_kt,
  (rsh."signals"#>>'{destinationWeather,visibilityMiles}')::NUMERIC(5,1) AS destination_visibility_miles,
  (rsh."signals"#>>'{destinationWeather,ceilingFt}')::INTEGER AS destination_ceiling_ft,
  (rsh."signals"#>>'{destinationWeather,hasThunderstorm}')::BOOLEAN AS destination_has_thunderstorm,
  (rsh."signals"#>>'{destinationWeather,hasFreezing}')::BOOLEAN AS destination_has_freezing,

  -- NAS features (from signals.nasOrigin / nasDestination)
  (rsh."signals"#>>'{nasOrigin,hasGroundStop}')::BOOLEAN AS origin_has_ground_stop,
  (rsh."signals"#>>'{nasOrigin,hasGroundDelay}')::BOOLEAN AS origin_has_ground_delay,
  (rsh."signals"#>>'{nasOrigin,avgDelayMinutes}')::INTEGER AS origin_nas_avg_delay_minutes,
  (rsh."signals"#>>'{nasDestination,hasGroundStop}')::BOOLEAN AS destination_has_ground_stop,
  (rsh."signals"#>>'{nasDestination,hasGroundDelay}')::BOOLEAN AS destination_has_ground_delay,
  (rsh."signals"#>>'{nasDestination,avgDelayMinutes}')::INTEGER AS destination_nas_avg_delay_minutes,
  (rsh."signals"#>'{nasOrigin,programs}')::JSONB AS nas_origin_programs,
  (rsh."signals"#>'{nasDestination,programs}')::JSONB AS nas_destination_programs,

  -- Carrier health (from signals.carrierHealth)
  (rsh."signals"#>>'{carrierHealth,cancellationRate24h}')::NUMERIC(5,4) AS carrier_cancellation_rate_24h,
  (rsh."signals"#>>'{carrierHealth,avgDelay24h}')::NUMERIC(6,1) AS carrier_avg_delay_24h,
  (rsh."signals"#>>'{carrierHealth,healthScore}')::INTEGER AS carrier_health_score,
  (rsh."signals"#>>'{carrierHealth,reliable}')::BOOLEAN AS carrier_reliable,
  (rsh."signals"#>>'{carrierHealth,sampleSize}')::INTEGER AS carrier_health_sample_size,

  -- Aircraft (from top-level columns)
  rsh."tail_number" AS tail_number,
  rsh."equipment_type" AS equipment_type,
  CASE
    WHEN rsh."equipment_type" ~* '^(B?737|B?73[0-9]|A320|A32[0-9]|A21[0-9]|B?757|B?767)' THEN 'narrowbody'
    WHEN rsh."equipment_type" ~* '^(B?777|B?787|A330|A33[0-9]|A340|A34[0-9]|A350|A35[0-9])' THEN 'widebody'
    WHEN rsh."equipment_type" ~* '^CRJ|E17[0-9]|E19[0-9]|AT[45]|DH[CD]' THEN 'regional'
    ELSE 'unknown'
  END AS equipment_group,

  -- Historical OTP (from signals.signals)
  (rsh."signals"#>>'{signals,historicalOtp}')::INTEGER AS historical_otp_score,
  (rsh."signals"#>>'{signals,historicalOtpSampleSize}')::INTEGER AS historical_otp_sample_size,
  rsh."signals"#>>'{signals,historicalOtpSource}' AS historical_otp_source,
  (rsh."signals"#>>'{signals,historicalRisk}')::INTEGER AS historical_risk,

  -- Heuristic score (from top-level columns)
  rsh."score" AS heuristic_score,
  rsh."tier" AS heuristic_tier,

  -- Signal sub-scores (from signals.signals)
  (rsh."signals"#>>'{signals,inboundAircraftDelay}')::INTEGER AS signal_inbound_aircraft_delay,
  (rsh."signals"#>>'{flightStatus,inboundDelayMinutes}')::INTEGER AS signal_inbound_delay_raw_minutes,
  (rsh."signals"#>>'{signals,atcGroundStop}')::INTEGER AS signal_atc_ground_stop,
  (rsh."signals"#>>'{signals,atcGroundDelay}')::INTEGER AS signal_atc_ground_delay,
  (rsh."signals"#>>'{signals,originWeather}')::INTEGER AS signal_origin_weather,
  (rsh."signals"#>>'{signals,destinationWeather}')::INTEGER AS signal_destination_weather,
  (rsh."signals"#>>'{signals,carrierHealth}')::INTEGER AS signal_carrier_health,
  (rsh."signals"#>>'{signals,timeOfDayRisk}')::INTEGER AS signal_time_of_day,
  (rsh."signals"#>>'{signals,dayOfWeekRisk}')::INTEGER AS signal_day_of_week,
  (rsh."signals"#>>'{signals,connectionRisk}')::INTEGER AS signal_connection_risk,

  -- Metadata (from joined monitored_flights)
  mf."is_test" AS is_test_flight,
  mf."agency_id" AS agency_id
FROM "risk_score_history" rsh
JOIN "monitored_flights" mf ON mf."id" = rsh."monitored_flight_id"
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: Reset SERIAL sequences to max id + 1
-- ============================================================
-- Since we inserted with explicit ids, the SERIAL counter is
-- still at whatever value it had before the backfill. Future
-- inserts will conflict unless we advance the sequence.
-- ============================================================
SELECT setval('clean.monitored_flights_v2_id_seq', COALESCE((SELECT MAX(id) FROM clean.monitored_flights_v2), 0) + 1, false);
SELECT setval('clean.risk_score_history_v2_id_seq', COALESCE((SELECT MAX(id) FROM clean.risk_score_history_v2), 0) + 1, false);

-- ============================================================
-- STEP 4: Report progress
-- ============================================================
SELECT 'Backfill complete' AS status,
       (SELECT COUNT(*) FROM clean.monitored_flights_v2) AS flights_in_v2,
       (SELECT COUNT(*) FROM clean.risk_score_history_v2) AS scores_in_v2;

COMMIT;
