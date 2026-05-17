import { getFlightStatus, type FlightStatusResult } from "./flightStatus";
import { getAirportWeather, type WeatherSignal } from "./weatherSignal";

export interface MonitoredFlightInput {
  flightNumber: string;
  carrierIata: string;
  departureDate: string;
  departureTime?: string | null;
  originIata: string;
  destinationIata: string;
}

export type RiskTier = "green" | "amber" | "red";

export interface RiskScoreSignals {
  inboundAircraftDelay: number;
  originWeather: number;
  destinationWeather: number;
  timeOfDayRisk: number;
  historicalRisk: number;
}

export interface RiskScoreResult {
  score: number;
  tier: RiskTier;
  signals: RiskScoreSignals;
  flightStatus: FlightStatusResult | null;
  originWeather: WeatherSignal;
  destinationWeather: WeatherSignal;
  cancelled: boolean;
}

function inboundDelayPoints(minutes: number, cancelled: boolean): number {
  if (cancelled) return 40;
  if (minutes <= 0) return 0;
  if (minutes <= 15) return 8;
  if (minutes <= 30) return 16;
  if (minutes <= 60) return 28;
  return 40;
}

function parseHour(departureTime: string | null | undefined): number | null {
  if (!departureTime || typeof departureTime !== "string") return null;
  const trimmed = departureTime.trim();
  // Accept "HH:MM" or full ISO "YYYY-MM-DDTHH:MM..."
  const m = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  if (Number.isNaN(h) || h < 0 || h > 23) return null;
  return h;
}

function timeOfDayPoints(hour: number | null): number {
  if (hour == null) return 0;
  if (hour < 14) return 0;
  if (hour < 18) return 2;
  if (hour < 20) return 4;
  return 5;
}

function historicalPoints(hour: number | null): number {
  // Static heuristic: later flights of the day inherit accumulated delays.
  if (hour == null) return 3;
  if (hour >= 20) return 10;
  if (hour >= 18) return 8;
  return 3;
}

function tierFromScore(score: number): RiskTier {
  if (score >= 60) return "red";
  if (score >= 25) return "amber";
  return "green";
}

export async function scoreFlightRisk(flight: MonitoredFlightInput): Promise<RiskScoreResult> {
  const [statusResult, originWeather, destinationWeather] = await Promise.all([
    getFlightStatus(flight.flightNumber, flight.departureDate).catch(() => null),
    getAirportWeather(flight.originIata).catch(() => null),
    getAirportWeather(flight.destinationIata).catch(() => null),
  ]);

  const safeOrigin: WeatherSignal = originWeather || {
    iataCode: flight.originIata,
    icaoCode: "",
    flightCategory: "UNKNOWN",
    windSpeedKt: 0,
    gustSpeedKt: 0,
    visibilityMiles: 10,
    ceilingFt: 99999,
    hasThunderstorm: false,
    hasFreezing: false,
    rawMetar: "",
    riskContribution: 0,
  };
  const safeDest: WeatherSignal = destinationWeather || {
    iataCode: flight.destinationIata,
    icaoCode: "",
    flightCategory: "UNKNOWN",
    windSpeedKt: 0,
    gustSpeedKt: 0,
    visibilityMiles: 10,
    ceilingFt: 99999,
    hasThunderstorm: false,
    hasFreezing: false,
    rawMetar: "",
    riskContribution: 0,
  };

  const cancelled = !!statusResult?.cancelled;
  const inboundMinutes = Math.max(
    statusResult?.inboundDelayMinutes || 0,
    statusResult?.delayMinutes || 0,
  );
  const inboundAircraftDelay = inboundDelayPoints(inboundMinutes, cancelled);

  const originWeatherPts = Math.min(25, Math.max(0, safeOrigin.riskContribution || 0));
  const destinationWeatherPts = Math.min(
    20,
    Math.max(0, Math.round((safeDest.riskContribution || 0) * 0.8)),
  );

  const hour = parseHour(flight.departureTime || statusResult?.departureTime || null);
  const timeOfDayRisk = timeOfDayPoints(hour);
  const historicalRisk = historicalPoints(hour);

  let total =
    inboundAircraftDelay +
    originWeatherPts +
    destinationWeatherPts +
    timeOfDayRisk +
    historicalRisk;
  if (total > 100) total = 100;
  if (total < 0) total = 0;

  const tier = tierFromScore(total);

  return {
    score: total,
    tier,
    signals: {
      inboundAircraftDelay,
      originWeather: originWeatherPts,
      destinationWeather: destinationWeatherPts,
      timeOfDayRisk,
      historicalRisk,
    },
    flightStatus: statusResult,
    originWeather: safeOrigin,
    destinationWeather: safeDest,
    cancelled,
  };
}
