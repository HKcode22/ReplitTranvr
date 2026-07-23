-- ============================================================
-- BACKFILL: Copy all tracked flights from old tables into v2
-- ============================================================
-- This script is IDEMPOTENT — safe to run multiple times.
-- Preserves old row IDs so FK references between v2 tables
-- remain consistent across backfill runs.
-- Run with: psql "$DATABASE_URL" -f scripts/backfill_v2.sql
-- ============================================================

BEGIN;

-- Allow inserting explicit id values into SERIAL columns
SET LOCAL session_replication_role TO 'replica';

-- ============================================================
-- STEP 1: Backfill monitored_flights_v2 from old tables
-- ============================================================
INSERT INTO clean.monitored_flights_v2 (
  id, flight_number, carrier_iata, departure_date, departure_time,
  origin_iata, destination_iata, origin_name, destination_name,
  status, risk_score, risk_tier, last_checked_at,
  red_tier_first_at, cancelled_at, confirmation_alert_sent_at,
  resolved_status, resolved_delay_minutes, resolved_at,
  agency_resolved_at, tail_number, equipment_type,
  is_test, agency_id, created_at
)
SELECT
  mf.id,
  mf."flightNumber" AS flight_number,
  mf."carrierIata" AS carrier_iata,
  mf."departureDate" AS departure_date,
  mf."departureTime" AS departure_time,
  mf."originIata" AS origin_iata,
  mf."destinationIata" AS destination_iata,
  mf."originName" AS origin_name,
  mf."destinationName" AS destination_name,
  COALESCE(mf.status, 'active') AS status,
  mf."riskScore" AS risk_score,
  mf."riskTier" AS risk_tier,
  mf."lastCheckedAt" AS last_checked_at,
  mf."redTierFirstAt" AS red_tier_first_at,
  mf."cancelledAt" AS cancelled_at,
  mf."confirmationAlertSentAt" AS confirmation_alert_sent_at,
  mf."resolvedStatus" AS resolved_status,
  mf."resolvedDelayMinutes" AS resolved_delay_minutes,
  mf."resolvedAt" AS resolved_at,
  mf."agencyResolvedAt" AS agency_resolved_at,
  mf."tailNumber" AS tail_number,
  mf."equipmentType" AS equipment_type,
  mf."isTest" AS is_test,
  mf."agencyId" AS agency_id,
  mf."createdAt" AS created_at
FROM
  "MonitoredFlight" mf
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 2: Backfill risk_score_history_v2 from old tables
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
  rsh.id,
  rsh."monitoredFlightId" AS monitored_flight_id,
  rsh."scoredAt" AS scored_at,

  -- Target variables
  (rsh.data->>'actualDelayMinutes')::INTEGER AS actual_delay_minutes,
  (rsh.data->>'actualCancelled')::BOOLEAN AS actual_cancelled,
  rsh.data->>'actualStatus' AS actual_status,

  -- Flight info
  rsh.data->>'flightNumber' AS flight_number,
  rsh.data->>'carrierIata' AS carrier_iata,
  (rsh.data->>'departureDate')::DATE AS departure_date,
  rsh.data->>'departureTime' AS departure_time,
  rsh.data->>'originIata' AS origin_iata,
  rsh.data->>'destinationIata' AS destination_iata,

  -- Timing features
  (rsh.data->>'hoursUntilDeparture')::NUMERIC(6,1) AS hours_until_departure,
  (rsh.data->>'timeOfDayRisk')::INTEGER AS time_of_day_risk,
  (rsh.data->>'dayOfWeekRisk')::INTEGER AS day_of_week_risk,
  (rsh.data->>'connectionRisk')::INTEGER AS connection_risk,
  rsh.data->>'horizon' AS horizon,

  -- Derived timing
  (rsh.data->>'departureHour')::INTEGER AS departure_hour,
  (rsh.data->>'departureDayOfWeek')::INTEGER AS departure_day_of_week,

  -- Origin weather
  rsh.data->>'originFlightCategory' AS origin_flight_category,
  (rsh.data->>'originWindSpeedKt')::NUMERIC(5,1) AS origin_wind_speed_kt,
  (rsh.data->>'originGustSpeedKt')::NUMERIC(5,1) AS origin_gust_speed_kt,
  (rsh.data->>'originVisibilityMiles')::NUMERIC(5,1) AS origin_visibility_miles,
  (rsh.data->>'originCeilingFt')::INTEGER AS origin_ceiling_ft,
  (rsh.data->>'originHasThunderstorm')::BOOLEAN AS origin_has_thunderstorm,
  (rsh.data->>'originHasFreezing')::BOOLEAN AS origin_has_freezing,

  -- Destination weather
  rsh.data->>'destinationFlightCategory' AS destination_flight_category,
  (rsh.data->>'destinationWindSpeedKt')::NUMERIC(5,1) AS destination_wind_speed_kt,
  (rsh.data->>'destinationGustSpeedKt')::NUMERIC(5,1) AS destination_gust_speed_kt,
  (rsh.data->>'destinationVisibilityMiles')::NUMERIC(5,1) AS destination_visibility_miles,
  (rsh.data->>'destinationCeilingFt')::INTEGER AS destination_ceiling_ft,
  (rsh.data->>'destinationHasThunderstorm')::BOOLEAN AS destination_has_thunderstorm,
  (rsh.data->>'destinationHasFreezing')::BOOLEAN AS destination_has_freezing,

  -- NAS features
  (rsh.data->>'originHasGroundStop')::BOOLEAN AS origin_has_ground_stop,
  (rsh.data->>'originHasGroundDelay')::BOOLEAN AS origin_has_ground_delay,
  (rsh.data->>'originNasAvgDelayMinutes')::INTEGER AS origin_nas_avg_delay_minutes,
  (rsh.data->>'destinationHasGroundStop')::BOOLEAN AS destination_has_ground_stop,
  (rsh.data->>'destinationHasGroundDelay')::BOOLEAN AS destination_has_ground_delay,
  (rsh.data->>'destinationNasAvgDelayMinutes')::INTEGER AS destination_nas_avg_delay_minutes,
  (rsh.data->>'nasOriginPrograms')::JSONB AS nas_origin_programs,
  (rsh.data->>'nasDestinationPrograms')::JSONB AS nas_destination_programs,

  -- Carrier health
  (rsh.data->>'carrierCancellationRate24h')::NUMERIC(5,4) AS carrier_cancellation_rate_24h,
  (rsh.data->>'carrierAvgDelay24h')::NUMERIC(6,1) AS carrier_avg_delay_24h,
  (rsh.data->>'carrierHealthScore')::INTEGER AS carrier_health_score,
  (rsh.data->>'carrierReliable')::BOOLEAN AS carrier_reliable,
  (rsh.data->>'carrierHealthSampleSize')::INTEGER AS carrier_health_sample_size,

  -- Aircraft
  rsh.data->>'tailNumber' AS tail_number,
  rsh.data->>'equipmentType' AS equipment_type,
  rsh.data->>'equipmentGroup' AS equipment_group,

  -- Historical OTP
  (rsh.data->>'historicalOtpScore')::INTEGER AS historical_otp_score,
  (rsh.data->>'historicalOtpSampleSize')::INTEGER AS historical_otp_sample_size,
  rsh.data->>'historicalOtpSource' AS historical_otp_source,
  (rsh.data->>'historicalRisk')::INTEGER AS historical_risk,

  -- Heuristic score
  rsh."riskScore" AS heuristic_score,
  rsh."riskTier" AS heuristic_tier,

  -- Signal sub-scores
  (rsh.data->>'signalInboundAircraftDelay')::INTEGER AS signal_inbound_aircraft_delay,
  (rsh.data->>'signalInboundDelayRawMinutes')::INTEGER AS signal_inbound_delay_raw_minutes,
  (rsh.data->>'signalAtcGroundStop')::INTEGER AS signal_atc_ground_stop,
  (rsh.data->>'signalAtcGroundDelay')::INTEGER AS signal_atc_ground_delay,
  (rsh.data->>'signalOriginWeather')::INTEGER AS signal_origin_weather,
  (rsh.data->>'signalDestinationWeather')::INTEGER AS signal_destination_weather,
  (rsh.data->>'signalCarrierHealth')::INTEGER AS signal_carrier_health,
  (rsh.data->>'signalTimeOfDay')::INTEGER AS signal_time_of_day,
  (rsh.data->>'signalDayOfWeek')::INTEGER AS signal_day_of_week,
  (rsh.data->>'signalConnectionRisk')::INTEGER AS signal_connection_risk,

  -- Metadata
  rsh."isTestFlight" AS is_test_flight,
  rsh."agencyId" AS agency_id
FROM
  "RiskScoreHistory" rsh
WHERE
  EXISTS (SELECT 1 FROM "MonitoredFlight" mf WHERE mf.id = rsh."monitoredFlightId")
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: Reset SERIAL sequences to continue after imported IDs
-- ============================================================
SELECT setval(
  pg_get_serial_sequence('clean.monitored_flights_v2', 'id'),
  COALESCE((SELECT MAX(id) FROM clean.monitored_flights_v2), 0) + 1,
  false
);

SELECT setval(
  pg_get_serial_sequence('clean.risk_score_history_v2', 'id'),
  COALESCE((SELECT MAX(id) FROM clean.risk_score_history_v2), 0) + 1,
  false
);

-- ============================================================
-- STEP 4: Report progress
-- ============================================================
SELECT 'Backfill complete' AS status,
       (SELECT COUNT(*) FROM clean.monitored_flights_v2) AS flights_in_v2,
       (SELECT COUNT(*) FROM clean.risk_score_history_v2) AS scores_in_v2;

COMMIT;