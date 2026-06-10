import { getFlightStatus, type FlightStatusResult } from "./flightStatus";
import { getAirportWeather, type WeatherSignal } from "./weatherSignal";
import { getNasStatus, type NasStatusResult } from "./nasStatus";
import { getCarrierHealth, type CarrierHealthResult } from "./carrierHealth";
import type { HistoricalOtpResult } from "./historicalOtp";

export interface MonitoredFlightInput {
  flightNumber: string;
  carrierIata: string;
  departureDate: string;
  departureTime?: string | null;
  originIata: string;
  destinationIata: string;
  historicalOtpCache?: HistoricalOtpResult | null;
  forceRefreshNas?: boolean;
}

export type RiskTier = "green" | "amber" | "red";

export type Horizon = "short" | "medium" | "long";

export interface RiskScoreSignals {
  // Live operational (T-4h dominant)
  inboundAircraftDelay: number;
  atcGroundStop: number;
  atcGroundDelay: number;

  // Weather (horizon-weighted)
  originWeather: number;
  destinationWeather: number;

  // Carrier and systemic
  carrierHealth: number;

  // Historical / static (T-24h dominant)
  historicalOtp: number;
  /** @deprecated mirrors historicalOtp so legacy consumers keep compiling */
  historicalRisk: number;
  timeOfDayRisk: number;
  dayOfWeekRisk: number;
  connectionRisk: number;

  // Metadata
  horizon: Horizon;
  hoursUntilDeparture: number | null;

  // Data coverage — used by the health report to detect fallback-only scores
  historicalOtpSampleSize: number;
  historicalOtpSource: string;
}

export interface RiskScoreResult {
  score: number;
  tier: RiskTier;
  signals: RiskScoreSignals;
  flightStatus: FlightStatusResult | null;
  originWeather: WeatherSignal;
  destinationWeather: WeatherSignal;
  nasOrigin: NasStatusResult;
  nasDestination: NasStatusResult;
  carrierHealth: CarrierHealthResult;
  cancelled: boolean;
}

function defaultWeather(iataCode: string): WeatherSignal {
  return {
    iataCode: (iataCode || "").toUpperCase(),
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
}

function defaultNas(): NasStatusResult {
  return {
    hasGroundStop: false,
    hasGroundDelay: false,
    avgDelayMinutes: 0,
    programs: [],
  };
}

function defaultCarrierHealth(carrierIata: string): CarrierHealthResult {
  return {
    carrierIata,
    cancellationRate24h: 0,
    avgDelay24h: 0,
    sampleSize: 0,
    healthScore: 3,
    reliable: false,
  };
}

function computeHoursUntilDeparture(
  departureDate: string,
  departureTime: string | null,
): number | null {
  try {
    let dtStr = departureDate;
    if (departureTime) {
      if (departureTime.includes("T") || departureTime.length > 8) {
        const d = new Date(departureTime);
        if (!isNaN(d.getTime())) {
          return (d.getTime() - Date.now()) / 3_600_000;
        }
      }
      dtStr = `${departureDate}T${departureTime}:00Z`;
    } else {
      dtStr = `${departureDate}T12:00:00Z`;
    }
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return null;
    return (d.getTime() - Date.now()) / 3_600_000;
  } catch {
    return null;
  }
}

function getHorizon(hoursUntilDeparture: number | null): Horizon {
  if (hoursUntilDeparture === null) return "medium";
  if (hoursUntilDeparture <= 4) return "short";
  if (hoursUntilDeparture <= 24) return "medium";
  return "long";
}

const HORIZON_WEIGHTS: Record<Horizon, Record<string, number>> = {
  short: {
    inboundAircraftDelay: 1.0,
    atcGroundStop: 1.0,
    atcGroundDelay: 1.0,
    originWeather: 0.9,
    destinationWeather: 0.8,
    carrierHealth: 1.0,
    historicalOtp: 0.3,
    timeOfDayRisk: 1.0,
    dayOfWeekRisk: 0.5,
    connectionRisk: 0.5,
  },
  medium: {
    inboundAircraftDelay: 0.6,
    atcGroundStop: 0.9,
    atcGroundDelay: 0.9,
    originWeather: 0.7,
    destinationWeather: 0.6,
    carrierHealth: 1.0,
    historicalOtp: 0.6,
    timeOfDayRisk: 0.8,
    dayOfWeekRisk: 0.8,
    connectionRisk: 0.8,
  },
  long: {
    inboundAircraftDelay: 0.0,
    atcGroundStop: 0.3,
    atcGroundDelay: 0.4,
    originWeather: 0.4,
    destinationWeather: 0.3,
    carrierHealth: 1.0,
    historicalOtp: 1.0,
    timeOfDayRisk: 0.6,
    dayOfWeekRisk: 1.0,
    connectionRisk: 1.0,
  },
};

function inboundDelayRaw(delayMinutes: number, cancelled: boolean): number {
  if (cancelled) return 40;
  if (delayMinutes <= 0) return 0;
  if (delayMinutes <= 15) return 8;
  if (delayMinutes <= 30) return 16;
  if (delayMinutes <= 60) return 28;
  return 40;
}

function atcGroundStopRaw(nas: NasStatusResult): number {
  return nas.hasGroundStop ? 20 : 0;
}

function atcGroundDelayRaw(nas: NasStatusResult): number {
  if (!nas.hasGroundDelay) return 0;
  if (nas.avgDelayMinutes >= 60) return 15;
  if (nas.avgDelayMinutes >= 30) return 10;
  if (nas.avgDelayMinutes >= 15) return 7;
  return 5;
}

function originWeatherRaw(weather: WeatherSignal): number {
  return Math.min(20, Math.max(0, weather.riskContribution || 0));
}

function destinationWeatherRaw(weather: WeatherSignal): number {
  return Math.min(
    15,
    Math.max(0, Math.round((weather.riskContribution || 0) * 0.7)),
  );
}

function timeOfDayRaw(
  departureTime: string | null,
  flightStatusTime: string | null,
): number {
  const timeStr = departureTime || flightStatusTime || null;
  if (!timeStr) return 1;
  const m = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!m) return 1;
  const hour = parseInt(m[1], 10);
  if (isNaN(hour)) return 1;
  if (hour < 14) return 0;
  if (hour < 18) return 1;
  if (hour < 20) return 2;
  return 4;
}

function connectionRiskRaw(
  _hoursUntilDeparture: number | null,
  departureTime: string | null,
): number {
  if (!departureTime) return 2;
  const m = departureTime.match(/(\d{1,2}):(\d{2})/);
  if (!m) return 2;
  const hour = parseInt(m[1], 10);
  if (isNaN(hour)) return 2;
  if (hour < 10) return 0;
  if (hour < 14) return 1;
  if (hour < 18) return 3;
  return 5;
}

function dayOfWeekRaw(departureDate: string): number {
  // getUTCDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const dow = new Date(`${departureDate}T12:00:00Z`).getUTCDay();
  const pts: Record<number, number> = { 1: 4, 5: 4, 0: 3, 4: 2, 3: 1, 2: 0, 6: 1 };
  return pts[dow] ?? 0;
}

export async function scoreFlightRisk(flight: MonitoredFlightInput): Promise<RiskScoreResult> {
  const hoursUntilDeparture = computeHoursUntilDeparture(
    flight.departureDate,
    flight.departureTime || null,
  );
  const horizon = getHorizon(hoursUntilDeparture);
  const weights = HORIZON_WEIGHTS[horizon];

  const [
    statusResult,
    originWeather,
    destinationWeather,
    nasOrigin,
    nasDestination,
    carrierHealth,
  ] = await Promise.all([
    getFlightStatus(
      flight.flightNumber,
      flight.departureDate,
      flight.originIata,
      flight.destinationIata,
    ).catch(() => null),
    getAirportWeather(flight.originIata).catch(() => defaultWeather(flight.originIata)),
    getAirportWeather(flight.destinationIata).catch(() => defaultWeather(flight.destinationIata)),
    getNasStatus(flight.originIata, { forceRefresh: flight.forceRefreshNas }).catch(() => defaultNas()),
    getNasStatus(flight.destinationIata, { forceRefresh: flight.forceRefreshNas }).catch(() => defaultNas()),
    getCarrierHealth(flight.carrierIata).catch(() => defaultCarrierHealth(flight.carrierIata)),
  ]);

  const safeOriginWeather = originWeather || defaultWeather(flight.originIata);
  const safeDestWeather = destinationWeather || defaultWeather(flight.destinationIata);

  // A ground stop or GDP at the destination is just as disruptive to this
  // flight as one at the origin, so collapse the two into a single
  // "worst case" view for ATC scoring.
  const nasWorst: NasStatusResult = {
    hasGroundStop: nasOrigin.hasGroundStop || nasDestination.hasGroundStop,
    hasGroundDelay: nasOrigin.hasGroundDelay || nasDestination.hasGroundDelay,
    avgDelayMinutes: Math.max(nasOrigin.avgDelayMinutes, nasDestination.avgDelayMinutes),
    programs: [...nasOrigin.programs, ...nasDestination.programs],
  };

  const cancelled = !!statusResult?.cancelled;
  const inboundMinutes = Math.max(
    statusResult?.inboundDelayMinutes || 0,
    statusResult?.delayMinutes || 0,
  );

  const historicalOtp: HistoricalOtpResult = flight.historicalOtpCache || {
    flightNumber: flight.flightNumber,
    onTimeRate: 0.75,
    avgDelayMinutes: 10,
    sampleSize: 0,
    riskPoints: 5,
    source: "fallback",
  };

  const rawSignals = {
    inboundAircraftDelay: inboundDelayRaw(inboundMinutes, cancelled),
    atcGroundStop: atcGroundStopRaw(nasWorst),
    atcGroundDelay: atcGroundDelayRaw(nasWorst),
    originWeather: originWeatherRaw(safeOriginWeather),
    destinationWeather: destinationWeatherRaw(safeDestWeather),
    carrierHealth: carrierHealth.healthScore,
    historicalOtp: historicalOtp.riskPoints,
    timeOfDayRisk: timeOfDayRaw(
      flight.departureTime || null,
      statusResult?.departureTime || null,
    ),
    dayOfWeekRisk: dayOfWeekRaw(flight.departureDate),
    connectionRisk: connectionRiskRaw(hoursUntilDeparture, flight.departureTime || null),
  };

  const weightedSignals = {
    inboundAircraftDelay: Math.round(rawSignals.inboundAircraftDelay * weights.inboundAircraftDelay),
    atcGroundStop: Math.round(rawSignals.atcGroundStop * weights.atcGroundStop),
    atcGroundDelay: Math.round(rawSignals.atcGroundDelay * weights.atcGroundDelay),
    originWeather: Math.round(rawSignals.originWeather * weights.originWeather),
    destinationWeather: Math.round(rawSignals.destinationWeather * weights.destinationWeather),
    carrierHealth: Math.round(rawSignals.carrierHealth * weights.carrierHealth),
    historicalOtp: Math.round(rawSignals.historicalOtp * weights.historicalOtp),
    timeOfDayRisk: Math.round(rawSignals.timeOfDayRisk * weights.timeOfDayRisk),
    dayOfWeekRisk: Math.round(rawSignals.dayOfWeekRisk * weights.dayOfWeekRisk),
    connectionRisk: Math.round(rawSignals.connectionRisk * weights.connectionRisk),
  };

  let total = Object.values(weightedSignals).reduce((a, b) => a + b, 0);
  total = Math.min(100, Math.max(0, total));

  const tierThresholds = {
    short: { amber: 25, red: 60 },
    medium: { amber: 22, red: 50 },
    long: { amber: 18, red: 40 },
  }[horizon];

  const baseTier: RiskTier =
    total >= tierThresholds.red
      ? "red"
      : total >= tierThresholds.amber
        ? "amber"
        : "green";

  const finalTier: RiskTier = cancelled ? "red" : baseTier;
  const finalScore = cancelled ? Math.max(total, 75) : total;

  console.log(
    `[riskScorer] ${flight.flightNumber} ${flight.departureDate} horizon=${horizon} ` +
      `hours_out=${hoursUntilDeparture?.toFixed(1)} raw_total=${total} ` +
      `tier=${finalTier} cancelled=${cancelled} ` +
      `signals=${JSON.stringify(weightedSignals)}`,
  );

  return {
    score: finalScore,
    tier: finalTier,
    signals: {
      ...weightedSignals,
      historicalRisk: weightedSignals.historicalOtp,
      horizon,
      hoursUntilDeparture,
      historicalOtpSampleSize: historicalOtp.sampleSize,
      historicalOtpSource: historicalOtp.source,
    },
    flightStatus: statusResult,
    originWeather: safeOriginWeather,
    destinationWeather: safeDestWeather,
    nasOrigin,
    nasDestination,
    carrierHealth,
    cancelled,
  };
}
