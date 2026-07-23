import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { RiskScoreResult } from "./riskScorer";
import type { MonitoredFlight } from "@shared/schema";

function deriveEquipmentGroup(equipmentType: string | null | undefined): string | null {
  if (!equipmentType) return null;
  const t = equipmentType.toUpperCase().replace(/\s/g, "");
  if (/^(B?737|B?73[0-9]|A320|A32[0-9]|A21[0-9])/.test(t)) return "narrowbody";
  if (/^(B?757|B?767)/.test(t)) return "narrowbody";
  if (/^(B?777|B?787|A330|A33[0-9]|A340|A34[0-9]|A350|A35[0-9])/.test(t)) return "widebody";
  if (/^CRJ|E17[0-9]|E19[0-9]|AT[45]|DH[CD]/.test(t)) return "regional";
  return "unknown";
}

function extractHour(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d{1,2}):/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  return isNaN(h) ? null : h;
}

function extractDayOfWeek(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (isNaN(d.getTime())) return null;
  return d.getUTCDay();
}

export async function writeScoreToV2(
  flight: Pick<MonitoredFlight, "id" | "flightNumber" | "carrierIata" | "departureDate" | "departureTime" | "originIata" | "destinationIata" | "isTest" | "agencyId">,
  risk: RiskScoreResult,
  scoredAt: Date,
): Promise<void> {
  const departureHour = extractHour(risk.flightStatus?.departureTime ?? flight.departureTime);
  const departureDayOfWeek = extractDayOfWeek(flight.departureDate);
  const equipmentGroup = deriveEquipmentGroup(risk.flightStatus?.equipmentType);

  await db.execute(sql`
    INSERT INTO clean.risk_score_history_v2 (
      monitored_flight_id, scored_at,
      actual_delay_minutes, actual_cancelled, actual_status,
      flight_number, carrier_iata, departure_date, departure_time,
      origin_iata, destination_iata,
      hours_until_departure, time_of_day_risk, day_of_week_risk,
      connection_risk, horizon,
      departure_hour, departure_day_of_week,
      origin_icao,
      origin_flight_category, origin_wind_speed_kt, origin_gust_speed_kt,
      origin_visibility_miles, origin_ceiling_ft,
      origin_has_thunderstorm, origin_has_freezing,
      destination_icao,
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
    ) VALUES (
      ${flight.id}, ${scoredAt},
      ${risk.flightStatus?.delayMinutes ?? null}, ${risk.cancelled}, ${risk.flightStatus?.status ?? null},
      ${flight.flightNumber}, ${flight.carrierIata}, ${flight.departureDate}, ${flight.departureTime},
      ${flight.originIata}, ${flight.destinationIata},
      ${risk.signals.hoursUntilDeparture}, ${risk.signals.timeOfDayRisk}, ${risk.signals.dayOfWeekRisk},
      ${risk.signals.connectionRisk}, ${risk.signals.horizon},
      ${departureHour}, ${departureDayOfWeek},
      ${risk.originWeather.icaoCode ?? null}, ${risk.originWeather.flightCategory}, ${risk.originWeather.windSpeedKt}, ${risk.originWeather.gustSpeedKt},
      ${risk.originWeather.visibilityMiles}, ${risk.originWeather.ceilingFt},
      ${risk.originWeather.hasThunderstorm}, ${risk.originWeather.hasFreezing},
      ${risk.destinationWeather.icaoCode ?? null}, ${risk.destinationWeather.flightCategory}, ${risk.destinationWeather.windSpeedKt}, ${risk.destinationWeather.gustSpeedKt},
      ${risk.destinationWeather.visibilityMiles}, ${risk.destinationWeather.ceilingFt},
      ${risk.destinationWeather.hasThunderstorm}, ${risk.destinationWeather.hasFreezing},
      ${risk.nasOrigin.hasGroundStop}, ${risk.nasOrigin.hasGroundDelay}, ${risk.nasOrigin.avgDelayMinutes},
      ${risk.nasDestination.hasGroundStop}, ${risk.nasDestination.hasGroundDelay}, ${risk.nasDestination.avgDelayMinutes},
      ${sql`${JSON.stringify(risk.nasOrigin.programs)}::jsonb`}, ${sql`${JSON.stringify(risk.nasDestination.programs)}::jsonb`},
      ${risk.carrierHealth.cancellationRate24h}, ${risk.carrierHealth.avgDelay24h},
      ${risk.carrierHealth.healthScore}, ${risk.carrierHealth.reliable}, ${risk.carrierHealth.sampleSize},
      ${risk.flightStatus?.tailNumber ?? null}, ${risk.flightStatus?.equipmentType ?? null}, ${equipmentGroup},
      ${risk.signals.historicalOtp}, ${risk.signals.historicalOtpSampleSize},
      ${risk.signals.historicalOtpSource}, ${risk.signals.historicalRisk},
      ${risk.score}, ${risk.tier},
      ${risk.signals.inboundAircraftDelay}, ${risk.flightStatus?.inboundDelayMinutes ?? null},
      ${risk.signals.atcGroundStop}, ${risk.signals.atcGroundDelay},
      ${risk.signals.originWeather}, ${risk.signals.destinationWeather},
      ${risk.signals.carrierHealth}, ${risk.signals.timeOfDayRisk}, ${risk.signals.dayOfWeekRisk},
      ${risk.signals.connectionRisk},
      ${flight.isTest ?? false}, ${flight.agencyId}
    )
  `);
}

export async function updateFlightInV2(
  flight: Pick<MonitoredFlight, "id" | "flightNumber">,
  updates: {
    riskScore: number;
    riskTier: string;
    lastCheckedAt: Date;
    departureTime?: string | null;
    tailNumber?: string | null;
    equipmentType?: string | null;
    redTierFirstAt?: Date | null;
    cancelledAt?: Date | null;
  },
): Promise<void> {
  await db.execute(sql`
    UPDATE clean.monitored_flights_v2 SET
      risk_score = ${updates.riskScore},
      risk_tier = ${updates.riskTier},
      last_checked_at = ${updates.lastCheckedAt},
      departure_time = COALESCE(${updates.departureTime ?? null}, departure_time),
      tail_number = COALESCE(${updates.tailNumber ?? null}, tail_number),
      equipment_type = COALESCE(${updates.equipmentType ?? null}, equipment_type),
      equipment_group = CASE
        WHEN ${updates.equipmentType ?? null} IS NOT NULL
        THEN ${deriveEquipmentGroup(updates.equipmentType ?? null)}
        ELSE equipment_group END,
      red_tier_first_at = COALESCE(${updates.redTierFirstAt ?? null}, red_tier_first_at),
      cancelled_at = COALESCE(${updates.cancelledAt ?? null}, cancelled_at)
    WHERE id = ${flight.id}
  `);
}

export async function insertFlightToV2(
  values: {
    flightNumber: string;
    carrierIata: string;
    departureDate: string;
    departureTime: string | null;
    originIata: string;
    destinationIata: string;
    originName?: string | null;
    destinationName?: string | null;
    isTest: boolean;
    agencyId: number;
    equipmentType?: string | null;
  },
): Promise<void> {
  const departureTimeUtc = values.departureDate && values.departureTime
    ? new Date(`${values.departureDate}T${values.departureTime}:00Z`)
    : null;
  const equipmentGroup = deriveEquipmentGroup(values.equipmentType ?? null);

  await db.execute(sql`
    INSERT INTO clean.monitored_flights_v2 (
      flight_number, carrier_iata, departure_date, departure_time,
      departure_time_utc,
      origin_iata, origin_name, destination_iata, destination_name,
      is_test, agency_id,
      equipment_type, equipment_group
    ) VALUES (
      ${values.flightNumber}, ${values.carrierIata}, ${values.departureDate},
      ${values.departureTime}, ${departureTimeUtc},
      ${values.originIata}, ${values.originName ?? null},
      ${values.destinationIata}, ${values.destinationName ?? null},
      ${values.isTest}, ${values.agencyId},
      ${values.equipmentType ?? null}, ${equipmentGroup}
    )
    ON CONFLICT (flight_number, departure_date) DO NOTHING
  `);
}