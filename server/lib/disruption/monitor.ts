import { randomUUID } from "crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import {
  agencyAccounts,
  disruptionAlternatives,
  monitoredFlights,
  riskScoreHistory,
  type MonitoredFlight,
} from "@shared/schema";
import { scoreFlightRisk } from "./riskScorer";
import { findLowRiskAlternatives } from "./alternativeFinder";
import { sendTravelerAlert } from "./alertSender";
import { getHistoricalOtp, type HistoricalOtpResult } from "./historicalOtp";

const INTERVAL_MS = 30 * 60 * 1000;

let intervalHandle: NodeJS.Timeout | null = null;
let cycleRunning = false;

// Historical OTP is a Tier-3 AeroDataBox call (6 units). Cache the result in
// memory per monitored-flight so we only pay for it once over the lifetime
// of the flight. Cleared when the flight transitions out of "active".
const historicalOtpCache = new Map<number, HistoricalOtpResult>();

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function processFlight(flight: MonitoredFlight): Promise<{ alertFired: boolean }> {
  console.log(
    `[monitor] scoring flight_id=${flight.id} ${flight.flightNumber} ${flight.originIata}->${flight.destinationIata} ${flight.departureDate}`,
  );

  // Fetch historical OTP once per flight; subsequent cycles reuse the cached value.
  if (!historicalOtpCache.has(flight.id)) {
    const otp = await getHistoricalOtp(flight.flightNumber, flight.departureDate).catch(() => null);
    if (otp) historicalOtpCache.set(flight.id, otp);
  }
  const historicalOtpData = historicalOtpCache.get(flight.id) || null;

  const risk = await scoreFlightRisk({
    flightNumber: flight.flightNumber,
    carrierIata: flight.carrierIata,
    departureDate: flight.departureDate,
    departureTime: flight.departureTime,
    originIata: flight.originIata,
    destinationIata: flight.destinationIata,
    historicalOtpCache: historicalOtpData,
  });

  await db.insert(riskScoreHistory).values({
    monitoredFlightId: flight.id,
    score: risk.score,
    tier: risk.tier,
    signals: {
      signals: risk.signals,
      cancelled: risk.cancelled,
      horizon: risk.signals.horizon,
      hoursUntilDeparture: risk.signals.hoursUntilDeparture,
      nasOrigin: {
        hasGroundStop: risk.nasOrigin.hasGroundStop,
        hasGroundDelay: risk.nasOrigin.hasGroundDelay,
        avgDelayMinutes: risk.nasOrigin.avgDelayMinutes,
        programs: risk.nasOrigin.programs,
      },
      nasDestination: {
        hasGroundStop: risk.nasDestination.hasGroundStop,
        hasGroundDelay: risk.nasDestination.hasGroundDelay,
        avgDelayMinutes: risk.nasDestination.avgDelayMinutes,
        programs: risk.nasDestination.programs,
      },
      carrierHealth: {
        cancellationRate24h: risk.carrierHealth.cancellationRate24h,
        avgDelay24h: risk.carrierHealth.avgDelay24h,
        sampleSize: risk.carrierHealth.sampleSize,
        healthScore: risk.carrierHealth.healthScore,
        reliable: risk.carrierHealth.reliable,
      },
      originWeather: {
        flightCategory: risk.originWeather.flightCategory,
        hasThunderstorm: risk.originWeather.hasThunderstorm,
        hasFreezing: risk.originWeather.hasFreezing,
        windSpeedKt: risk.originWeather.windSpeedKt,
        gustSpeedKt: risk.originWeather.gustSpeedKt,
        visibilityMiles: risk.originWeather.visibilityMiles,
        ceilingFt: risk.originWeather.ceilingFt,
      },
      destinationWeather: {
        flightCategory: risk.destinationWeather.flightCategory,
        hasThunderstorm: risk.destinationWeather.hasThunderstorm,
        hasFreezing: risk.destinationWeather.hasFreezing,
      },
      flightStatus: risk.flightStatus
        ? {
            status: risk.flightStatus.status,
            delayMinutes: risk.flightStatus.delayMinutes,
            inboundDelayMinutes: risk.flightStatus.inboundDelayMinutes,
            cancelled: risk.flightStatus.cancelled,
            departureTime: risk.flightStatus.departureTime,
          }
        : null,
    },
  });

  if (flight.status !== "active") {
    historicalOtpCache.delete(flight.id);
  }

  // Pull the departure time from the live status into the row the first
  // time we see it, so future scoring cycles can apply the time-of-day
  // bonus without waiting on AeroDataBox each iteration.
  let extractedDepartureTime: string | null = null;
  if (!flight.departureTime && risk.flightStatus?.departureTime) {
    const m = risk.flightStatus.departureTime.match(/(\d{2}:\d{2})/);
    if (m) extractedDepartureTime = m[1];
  }

  await db
    .update(monitoredFlights)
    .set({
      riskScore: risk.score,
      riskTier: risk.tier,
      lastCheckedAt: new Date(),
      ...(extractedDepartureTime ? { departureTime: extractedDepartureTime } : {}),
    })
    .where(eq(monitoredFlights.id, flight.id));

  let alertFired = false;
  const shouldAlert =
    (risk.tier === "red" || risk.cancelled) && flight.alertSentAt == null;

  if (shouldAlert) {
    const [agency] = await db
      .select()
      .from(agencyAccounts)
      .where(eq(agencyAccounts.id, flight.agencyId))
      .limit(1);

    if (!agency) {
      console.warn(`[monitor] cannot send alert for flight ${flight.id}: agency missing`);
      return { alertFired: false };
    }

    let alternatives: Awaited<ReturnType<typeof findLowRiskAlternatives>> = [];
    try {
      alternatives = await findLowRiskAlternatives(flight, 3);
    } catch (err: any) {
      console.warn(`[monitor] alternative search failed for flight ${flight.id}:`, err?.message || err);
      alternatives = [];
    }

    const travelerSelectionToken = randomUUID();
    const updatedFlight: MonitoredFlight = {
      ...flight,
      travelerSelectionToken,
      riskScore: risk.score,
      riskTier: risk.tier,
    };

    if (alternatives.length > 0) {
      try {
        await db.insert(disruptionAlternatives).values(
          alternatives.map((alt) => ({
            monitoredFlightId: flight.id,
            flightNumber: alt.flightNumber,
            carrierIata: alt.carrierIata,
            carrierName: alt.carrierName,
            departureTime: alt.departureTime,
            arrivalTime: alt.arrivalTime,
            durationMinutes: alt.durationMinutes,
            stops: alt.stops,
            price: alt.price,
            riskScore: alt.riskScore,
            riskTier: alt.riskTier,
            offerData: alt.offerData,
            selectionToken: alt.selectionToken,
          })),
        );
      } catch (err: any) {
        console.error(`[monitor] failed to persist alternatives for flight ${flight.id}:`, err?.message || err);
      }
    }

    await db
      .update(monitoredFlights)
      .set({ travelerSelectionToken })
      .where(eq(monitoredFlights.id, flight.id));

    try {
      await sendTravelerAlert(updatedFlight, alternatives, agency, risk);
      await db
        .update(monitoredFlights)
        .set({ alertSentAt: new Date() })
        .where(eq(monitoredFlights.id, flight.id));
      alertFired = true;
      console.log(`[monitor] alert fired for flight_id=${flight.id} tier=${risk.tier} alts=${alternatives.length}`);
    } catch (err: any) {
      console.error(`[monitor] alert send failed for flight ${flight.id}:`, err?.message || err);
    }
  }

  return { alertFired };
}

async function runCycle(): Promise<void> {
  if (cycleRunning) {
    console.log("[monitor] previous cycle still running — skipping this tick");
    return;
  }
  cycleRunning = true;
  const startedAt = Date.now();
  let checked = 0;
  let alerts = 0;
  console.log("[monitor] cycle start");

  try {
    const today = todayIso();
    const tomorrow = tomorrowIso();
    const flights = await db
      .select()
      .from(monitoredFlights)
      .where(
        and(
          eq(monitoredFlights.status, "active"),
          gte(monitoredFlights.departureDate, today),
          lte(monitoredFlights.departureDate, tomorrow),
        ),
      );

    for (const flight of flights) {
      try {
        const { alertFired } = await processFlight(flight);
        checked += 1;
        if (alertFired) alerts += 1;
      } catch (err: any) {
        console.error(`[monitor] flight ${flight.id} processing failed:`, err?.message || err);
      }
    }
  } catch (err: any) {
    console.error("[monitor] cycle failed:", err?.message || err);
  } finally {
    cycleRunning = false;
    const elapsed = Date.now() - startedAt;
    console.log(
      `[monitor] cycle end checked=${checked} alerts=${alerts} elapsed_ms=${elapsed}`,
    );
  }
}

export function startMonitoringEngine(): void {
  if (intervalHandle) {
    console.log("[monitor] already running — skipping start");
    return;
  }
  console.log(`[monitor] starting engine interval=${INTERVAL_MS}ms`);
  intervalHandle = setInterval(() => {
    runCycle().catch((err) => {
      console.error("[monitor] unhandled cycle error:", err?.message || err);
    });
  }, INTERVAL_MS);
  // Fire one cycle shortly after boot so freshly-added flights get a
  // first risk score without waiting 30 minutes. Slight delay lets the
  // HTTP server settle in before we start blasting outbound API calls.
  setTimeout(() => {
    runCycle().catch((err) => {
      console.error("[monitor] initial cycle error:", err?.message || err);
    });
  }, 15_000);
}

export async function scoreFlightOnce(flightId: number): Promise<void> {
  const [flight] = await db
    .select()
    .from(monitoredFlights)
    .where(eq(monitoredFlights.id, flightId))
    .limit(1);
  if (!flight) return;
  try {
    await processFlight(flight);
  } catch (err: any) {
    console.error(`[monitor] one-off scoring failed for flight ${flightId}:`, err?.message || err);
  }
}
