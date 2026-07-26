-- ============================================================
-- DIAGNOSTIC: v2 Data Quality Check
-- Run: psql "$DATABASE_URL" -f scripts/diagnostic_v2.sql
-- ============================================================

-- 1. RAW NEW ROWS
SELECT '--- 1. RAW NEW ROWS (3 sample rows) ---' AS section;
SELECT id, monitored_flight_id, flight_number, carrier_iata, origin_iata, destination_iata,
  departure_date, departure_time, departure_hour, heuristic_score, heuristic_tier,
  tail_number, equipment_type, equipment_group,
  actual_delay_minutes, actual_cancelled, actual_status,
  carrier_health_score, carrier_avg_delay_24h, carrier_cancellation_rate_24h,
  signal_inbound_aircraft_delay, signal_atc_ground_stop, signal_atc_ground_delay,
  signal_origin_weather, signal_destination_weather, signal_carrier_health,
  signal_time_of_day, signal_day_of_week, signal_connection_risk,
  hours_until_departure, horizon,
  origin_wind_speed_kt, origin_gust_speed_kt, origin_visibility_miles, origin_ceiling_ft,
  destination_wind_speed_kt, destination_gust_speed_kt, destination_visibility_miles, destination_ceiling_ft,
  scored_at
FROM clean.risk_score_history_v2
WHERE scored_at > NOW() - INTERVAL '30 minutes'
ORDER BY scored_at DESC LIMIT 3;

-- 2. NULL RATES
SELECT '--- 2. NULL RATES (every column) ---' AS section;
WITH nd AS (SELECT * FROM clean.risk_score_history_v2 WHERE scored_at > NOW() - INTERVAL '30 minutes')
SELECT 'total_rows' AS col, COUNT(*)::text FROM nd
UNION ALL SELECT 'flight_number_null', COUNT(*)::text FROM nd WHERE flight_number IS NULL
UNION ALL SELECT 'carrier_iata_null', COUNT(*)::text FROM nd WHERE carrier_iata IS NULL
UNION ALL SELECT 'origin_iata_null', COUNT(*)::text FROM nd WHERE origin_iata IS NULL
UNION ALL SELECT 'destination_iata_null', COUNT(*)::text FROM nd WHERE destination_iata IS NULL
UNION ALL SELECT 'tail_number_null', COUNT(*)::text FROM nd WHERE tail_number IS NULL
UNION ALL SELECT 'equipment_type_null', COUNT(*)::text FROM nd WHERE equipment_type IS NULL
UNION ALL SELECT 'equipment_group_null', COUNT(*)::text FROM nd WHERE equipment_group IS NULL
UNION ALL SELECT 'origin_icao_null', COUNT(*)::text FROM nd WHERE origin_icao IS NULL
UNION ALL SELECT 'destination_icao_null', COUNT(*)::text FROM nd WHERE destination_icao IS NULL
UNION ALL SELECT 'actual_delay_null', COUNT(*)::text FROM nd WHERE actual_delay_minutes IS NULL
UNION ALL SELECT 'actual_delay_nonzero', COUNT(*)::text FROM nd WHERE actual_delay_minutes IS DISTINCT FROM 0 AND actual_delay_minutes IS NOT NULL
UNION ALL SELECT 'actual_cancelled_true', COUNT(*)::text FROM nd WHERE actual_cancelled = true
UNION ALL SELECT 'actual_status_null', COUNT(*)::text FROM nd WHERE actual_status IS NULL
UNION ALL SELECT 'carrier_health_score_null', COUNT(*)::text FROM nd WHERE carrier_health_score IS NULL
UNION ALL SELECT 'carrier_avg_delay_24h_null', COUNT(*)::text FROM nd WHERE carrier_avg_delay_24h IS NULL
UNION ALL SELECT 'carrier_avg_delay_24h_nonzero', COUNT(*)::text FROM nd WHERE carrier_avg_delay_24h IS DISTINCT FROM 0 AND carrier_avg_delay_24h IS NOT NULL
UNION ALL SELECT 'carrier_cancellation_rate_24h_null', COUNT(*)::text FROM nd WHERE carrier_cancellation_rate_24h IS NULL
UNION ALL SELECT 'hours_until_departure_null', COUNT(*)::text FROM nd WHERE hours_until_departure IS NULL
UNION ALL SELECT 'origin_has_ground_stop_null', COUNT(*)::text FROM nd WHERE origin_has_ground_stop IS NULL
UNION ALL SELECT 'origin_nas_avg_delay_null', COUNT(*)::text FROM nd WHERE origin_nas_avg_delay_minutes IS NULL
UNION ALL SELECT 'dest_has_ground_stop_null', COUNT(*)::text FROM nd WHERE destination_has_ground_stop IS NULL
UNION ALL SELECT 'dest_nas_avg_delay_null', COUNT(*)::text FROM nd WHERE destination_nas_avg_delay_minutes IS NULL
UNION ALL SELECT 'nas_origin_programs_null', COUNT(*)::text FROM nd WHERE nas_origin_programs IS NULL
UNION ALL SELECT 'nas_dest_programs_null', COUNT(*)::text FROM nd WHERE nas_destination_programs IS NULL
UNION ALL SELECT 'origin_wind_speed_null', COUNT(*)::text FROM nd WHERE origin_wind_speed_kt IS NULL
UNION ALL SELECT 'origin_visibility_null', COUNT(*)::text FROM nd WHERE origin_visibility_miles IS NULL
UNION ALL SELECT 'origin_ceiling_null', COUNT(*)::text FROM nd WHERE origin_ceiling_ft IS NULL
UNION ALL SELECT 'dest_wind_speed_null', COUNT(*)::text FROM nd WHERE destination_wind_speed_kt IS NULL
UNION ALL SELECT 'dest_visibility_null', COUNT(*)::text FROM nd WHERE destination_visibility_miles IS NULL
UNION ALL SELECT 'dest_ceiling_null', COUNT(*)::text FROM nd WHERE destination_ceiling_ft IS NULL
UNION ALL SELECT 'raw_api_null', COUNT(*)::text FROM nd WHERE raw_api_data IS NULL
UNION ALL SELECT 'historical_otp_null', COUNT(*)::text FROM nd WHERE historical_otp_score IS NULL
UNION ALL SELECT 'signal_inbound_delay_null', COUNT(*)::text FROM nd WHERE signal_inbound_aircraft_delay IS NULL
UNION ALL SELECT 'signal_atc_gs_null', COUNT(*)::text FROM nd WHERE signal_atc_ground_stop IS NULL
UNION ALL SELECT 'signal_origin_wx_null', COUNT(*)::text FROM nd WHERE signal_origin_weather IS NULL
UNION ALL SELECT 'signal_carrier_health_null', COUNT(*)::text FROM nd WHERE signal_carrier_health IS NULL
UNION ALL SELECT 'heuristic_score_null', COUNT(*)::text FROM nd WHERE heuristic_score IS NULL
ORDER BY col;

-- 3. CARRIER HEALTH PER CARRIER
SELECT '--- 3. CARRIER HEALTH PER CARRIER ---' AS section;
SELECT mf.carrier_iata, COUNT(*) AS flights,
  ROUND(AVG(rsh.carrier_health_score), 2) AS avg_health,
  MIN(rsh.carrier_health_score) AS min_h, MAX(rsh.carrier_health_score) AS max_h,
  ROUND(AVG(rsh.carrier_avg_delay_24h), 4) AS avg_delay,
  ROUND(AVG(rsh.carrier_cancellation_rate_24h), 4) AS avg_cancel,
  ROUND(AVG(rsh.carrier_health_sample_size), 1) AS avg_sample,
  BOOL_OR(rsh.carrier_reliable) AS any_reliable
FROM clean.risk_score_history_v2 rsh
JOIN clean.monitored_flights_v2 mf ON mf.id = rsh.monitored_flight_id
WHERE rsh.scored_at > NOW() - INTERVAL '30 minutes'
GROUP BY mf.carrier_iata ORDER BY flights DESC;

-- 4. NEW vs BACKFILL COMPARISON
SELECT '--- 4. NEW vs BACKFILL COMPARISON ---' AS section;
WITH nd AS (SELECT * FROM clean.risk_score_history_v2 WHERE scored_at > NOW() - INTERVAL '30 minutes'),
     bd AS (SELECT * FROM clean.risk_score_history_v2 WHERE scored_at < NOW() - INTERVAL '2 days')
SELECT 'new' AS src, COUNT(*) AS rows, ROUND(AVG(heuristic_score),1) AS avg_score,
  COUNT(*) FILTER (WHERE heuristic_tier='amber') AS amber,
  ROUND(AVG(signal_origin_weather),2) AS avg_ow,
  ROUND(AVG(signal_destination_weather),2) AS avg_dw,
  ROUND(AVG(signal_atc_ground_delay),2) AS avg_gd,
  ROUND(AVG(carrier_health_score),2) AS avg_carrier_h,
  ROUND(AVG(hours_until_departure),2) AS avg_hours,
  COUNT(*) FILTER (WHERE tail_number IS NOT NULL) AS has_tail,
  COUNT(*) FILTER (WHERE actual_delay_minutes IS NOT NULL AND actual_delay_minutes!=0) AS nonzero_delay
FROM nd
UNION ALL
SELECT 'old', COUNT(*), ROUND(AVG(heuristic_score),1),
  COUNT(*) FILTER (WHERE heuristic_tier='amber'),
  ROUND(AVG(signal_origin_weather),2), ROUND(AVG(signal_destination_weather),2),
  ROUND(AVG(signal_atc_ground_delay),2), ROUND(AVG(carrier_health_score),2),
  ROUND(AVG(hours_until_departure),2),
  COUNT(*) FILTER (WHERE tail_number IS NOT NULL),
  COUNT(*) FILTER (WHERE actual_delay_minutes IS NOT NULL AND actual_delay_minutes!=0)
FROM bd;

-- 5. WEATHER/NAS POPULATED
SELECT '--- 5. WEATHER/NAS POPULATED ---' AS section;
SELECT COUNT(*) AS total,
  COUNT(*) FILTER (WHERE origin_has_ground_stop IS NOT NULL) AS origin_gs,
  COUNT(*) FILTER (WHERE destination_has_ground_stop IS NOT NULL) AS dest_gs,
  COUNT(*) FILTER (WHERE origin_nas_avg_delay_minutes > 0) AS origin_nas_pos,
  COUNT(*) FILTER (WHERE destination_nas_avg_delay_minutes > 0) AS dest_nas_pos,
  COUNT(*) FILTER (WHERE nas_origin_programs IS NOT NULL AND nas_origin_programs != '[]') AS origin_progs,
  COUNT(*) FILTER (WHERE nas_destination_programs IS NOT NULL AND nas_destination_programs != '[]') AS dest_progs,
  COUNT(*) FILTER (WHERE origin_wind_speed_kt IS NOT NULL) AS origin_wind,
  COUNT(*) FILTER (WHERE origin_visibility_miles IS NOT NULL) AS origin_vis,
  COUNT(*) FILTER (WHERE origin_ceiling_ft IS NOT NULL) AS origin_ceil,
  COUNT(*) FILTER (WHERE destination_wind_speed_kt IS NOT NULL) AS dest_wind,
  COUNT(*) FILTER (WHERE destination_visibility_miles IS NOT NULL) AS dest_vis,
  COUNT(*) FILTER (WHERE destination_ceiling_ft IS NOT NULL) AS dest_ceil
FROM clean.risk_score_history_v2 WHERE scored_at > NOW() - INTERVAL '30 minutes';

-- 6. SCORE DISTRIBUTION
SELECT '--- 6. SCORE DISTRIBUTION ---' AS section;
SELECT heuristic_score, COUNT(*) FROM clean.risk_score_history_v2
WHERE scored_at > NOW() - INTERVAL '30 minutes'
GROUP BY heuristic_score ORDER BY heuristic_score;

-- 7. HOURS UNTIL DEPARTURE
SELECT '--- 7. HOURS UNTIL DEPARTURE ---' AS section;
SELECT COUNT(*) AS total,
  COUNT(*) FILTER (WHERE hours_until_departure < 0) AS negative,
  COUNT(*) FILTER (WHERE hours_until_departure BETWEEN 0 AND 3) AS short_horizon,
  COUNT(*) FILTER (WHERE hours_until_departure BETWEEN 3 AND 24) AS medium_horizon,
  COUNT(*) FILTER (WHERE hours_until_departure > 24) AS long_horizon,
  MIN(hours_until_departure) AS min_hours, MAX(hours_until_departure) AS max_hours
FROM clean.risk_score_history_v2 WHERE scored_at > NOW() - INTERVAL '30 minutes';

-- 8. EQUIPMENT GROUP (new flights)
SELECT '--- 8. EQUIPMENT GROUP (flights id>1000) ---' AS section;
SELECT equipment_group, COUNT(*) FROM clean.monitored_flights_v2
WHERE id > 1000 GROUP BY equipment_group ORDER BY COUNT(*) DESC;

-- 9. SAMPLE WEATHER (10 rows)
SELECT '--- 9. SAMPLE WEATHER (10 rows) ---' AS section;
SELECT flight_number, carrier_iata, origin_iata, destination_iata,
  origin_wind_speed_kt, origin_gust_speed_kt, origin_visibility_miles, origin_ceiling_ft,
  origin_has_thunderstorm, origin_has_freezing,
  destination_wind_speed_kt, destination_gust_speed_kt, destination_visibility_miles, destination_ceiling_ft,
  destination_has_thunderstorm, destination_has_freezing
FROM clean.risk_score_history_v2 WHERE scored_at > NOW() - INTERVAL '30 minutes'
  AND (origin_ceiling_ft IS NOT NULL OR destination_ceiling_ft IS NOT NULL)
LIMIT 10;

-- 10. SIGNAL COLUMN AVERAGES
SELECT '--- 10. SIGNAL COLUMNS AVERAGES ---' AS section;
SELECT ROUND(AVG(signal_inbound_aircraft_delay),2) AS avg_inbound,
  ROUND(AVG(signal_atc_ground_stop),2) AS avg_gs,
  ROUND(AVG(signal_atc_ground_delay),2) AS avg_gd,
  ROUND(AVG(signal_origin_weather),2) AS avg_ow,
  ROUND(AVG(signal_destination_weather),2) AS avg_dw,
  ROUND(AVG(signal_carrier_health),2) AS avg_ch,
  ROUND(AVG(signal_time_of_day),2) AS avg_tod,
  ROUND(AVG(signal_day_of_week),2) AS avg_dow,
  ROUND(AVG(signal_connection_risk),2) AS avg_cr,
  ROUND(AVG(heuristic_score),1) AS avg_heuristic
FROM clean.risk_score_history_v2 WHERE scored_at > NOW() - INTERVAL '30 minutes';
