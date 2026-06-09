import { randomUUID } from "crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import {
  agencyAccounts,
  disruptionAlternatives,
  flightTravelers,
  monitoredFlights,
  riskScoreHistory,
  userMonitoredFlights,
  users,
  type FlightTraveler,
  type MonitoredFlight,
} from "@shared/schema";
import { scoreFlightRisk } from "./riskScorer";
import { findLowRiskAlternatives } from "./alternativeFinder";
import { sendTravelerAlert, sendConfirmationAlert } from "./alertSender";
import { getHistoricalOtp, type HistoricalOtpResult } from "./historicalOtp";
import sgMail from "@sendgrid/mail";

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

async function processFlight(
  flight: MonitoredFlight,
  opts?: { forceRefreshNas?: boolean },
): Promise<{ alertFired: boolean }> {
  console.log(
    `[monitor] scoring flight_id=${flight.id} ${flight.flightNumber} ${flight.originIata}->${flight.destinationIata} ${flight.departureDate}${opts?.forceRefreshNas ? " (force-refresh NAS)" : ""}`,
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
    forceRefreshNas: opts?.forceRefreshNas,
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
    tailNumber: risk.flightStatus?.tailNumber ?? null,
    equipmentType: risk.flightStatus?.equipmentType ?? null,
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
      ...(risk.flightStatus?.tailNumber ? { tailNumber: risk.flightStatus.tailNumber } : {}),
      ...(risk.flightStatus?.equipmentType ? { equipmentType: risk.flightStatus.equipmentType } : {}),
    })
    .where(eq(monitoredFlights.id, flight.id));

  let alertFired = false;

  // A flight should be re-alerted only for travelers who haven't been
  // alerted yet. If every flight_traveler row for this flight has
  // alert_sent_at set, the alert pipeline is done for this booking.
  const travelers: FlightTraveler[] = await db
    .select()
    .from(flightTravelers)
    .where(eq(flightTravelers.monitoredFlightId, flight.id));

  const pendingTravelers = travelers.filter((t) => t.alertSentAt == null);
  const shouldAlert =
    (risk.tier === "red" || risk.cancelled) &&
    travelers.length > 0 &&
    pendingTravelers.length > 0;

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

    // Issue a fresh per-traveler selection token for each pending traveler.
    // sendTravelerAlert needs the tokens already on the row so it can build
    // the CTAs.
    const tokenedPending: FlightTraveler[] = [];
    for (const t of pendingTravelers) {
      const token = t.selectionToken || randomUUID();
      if (!t.selectionToken) {
        await db
          .update(flightTravelers)
          .set({ selectionToken: token })
          .where(eq(flightTravelers.id, t.id));
      }
      tokenedPending.push({ ...t, selectionToken: token });
    }

    try {
      // sendTravelerAlert sets alertSentAt on each row it successfully emails.
      await sendTravelerAlert({ ...flight, riskScore: risk.score, riskTier: risk.tier }, tokenedPending, alternatives, agency, risk);
      alertFired = true;
      console.log(`[monitor] alert fired for flight_id=${flight.id} tier=${risk.tier} alts=${alternatives.length} travelers=${tokenedPending.length}`);
    } catch (err: any) {
      console.error(`[monitor] alert send failed for flight ${flight.id}:`, err?.message || err);
    }
  }

  // CONFIRMATION ALERT: fires when AeroDataBox confirms the disruption is
  // real, independent of the predictive risk score. One per monitored flight.
  const confirmedDelayed = (risk.flightStatus?.delayMinutes || 0) >= 30;
  const confirmedCancelled = risk.flightStatus?.cancelled === true;
  const needsConfirmationAlert =
    (confirmedDelayed || confirmedCancelled) &&
    !flight.confirmationAlertSentAt &&
    travelers.length > 0;

  if (needsConfirmationAlert) {
    const [agencyForConfirm] = await db
      .select()
      .from(agencyAccounts)
      .where(eq(agencyAccounts.id, flight.agencyId))
      .limit(1);
    if (!agencyForConfirm) {
      console.warn(`[monitor] cannot send confirmation alert for flight ${flight.id}: agency missing`);
    } else {
      try {
        await sendConfirmationAlert(
          { ...flight, riskScore: risk.score, riskTier: risk.tier },
          travelers,
          risk.flightStatus,
          agencyForConfirm,
        );
        await db
          .update(monitoredFlights)
          .set({ confirmationAlertSentAt: new Date() })
          .where(eq(monitoredFlights.id, flight.id));
        console.log(
          `[monitor] confirmation alert fired flight_id=${flight.id} cancelled=${confirmedCancelled} delay=${risk.flightStatus?.delayMinutes || 0}min`,
        );
      } catch (err: any) {
        console.error(`[monitor] confirmation alert send failed for flight ${flight.id}:`, err?.message || err);
      }
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

    await runUserFlightCycle();
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

const TIER_ORDER: Record<string, number> = { green: 0, amber: 1, red: 2 };

function tierLabel(tier: string): string {
  return tier === "red" ? "High" : tier === "amber" ? "Moderate" : "Low";
}

async function sendUserFlightAlert(
  userEmail: string,
  userName: string,
  flight: typeof userMonitoredFlights.$inferSelect,
  newTier: string,
  signals: Record<string, number>,
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "hello@travnr.com";
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);

  const topSignals = Object.entries(signals)
    .filter(([, pts]) => pts > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, pts]) => `<li>${name} (+${pts})</li>`)
    .join("");

  const tierColor = newTier === "red" ? "#dc2626" : newTier === "amber" ? "#d97706" : "#16a34a";
  const subject = `Flight alert: ${flight.flightNumber} risk is now ${tierLabel(newTier)}`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="margin-bottom:4px">Flight Risk Update</h2>
      <p style="color:#555;margin-top:0">Hi ${userName},</p>
      <p>Your monitored flight has a new risk level:</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
        <div style="font-size:20px;font-weight:600">${flight.flightNumber}</div>
        <div style="color:#555;margin-top:2px">${flight.originIata} → ${flight.destinationIata} &nbsp;·&nbsp; ${flight.departureDate}${flight.departureTime ? " at " + flight.departureTime : ""}</div>
        <div style="margin-top:12px">
          <span style="background:${tierColor};color:#fff;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600">${tierLabel(newTier)} Risk &nbsp;·&nbsp; Score ${flight.riskScore}</span>
        </div>
        ${topSignals ? `<div style="margin-top:12px;font-size:13px;color:#555"><strong>Top contributing signals:</strong><ul style="margin:4px 0;padding-left:18px">${topSignals}</ul></div>` : ""}
      </div>
      <p style="font-size:13px;color:#888">You're receiving this because you added this flight to Monitor Flight on Travnr. Log in to view details or remove the flight.</p>
    </div>`;

  try {
    await sgMail.send({ to: userEmail, from: { email: fromEmail, name: "Travnr" }, subject, html });
  } catch (err: any) {
    console.warn(`[monitor] user flight alert email failed for ${userEmail}:`, err?.message || err);
  }
}

async function runUserFlightCycle(): Promise<void> {
  const today = todayIso();
  const tomorrow = tomorrowIso();

  const flights = await db
    .select()
    .from(userMonitoredFlights)
    .where(
      and(
        eq(userMonitoredFlights.status, "active"),
        gte(userMonitoredFlights.departureDate, today),
        lte(userMonitoredFlights.departureDate, tomorrow),
      ),
    );

  for (const flight of flights) {
    try {
      const risk = await scoreFlightRisk({
        flightNumber: flight.flightNumber,
        carrierIata: flight.carrierIata,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime,
        originIata: flight.originIata,
        destinationIata: flight.destinationIata,
        historicalOtpCache: null,
      });

      const previousTier = flight.lastAlertedTier || flight.riskTier;
      const tierRose = (TIER_ORDER[risk.tier] ?? 0) > (TIER_ORDER[previousTier] ?? 0);
      const confirmedDisruption =
        (risk.flightStatus?.cancelled === true || (risk.flightStatus?.delayMinutes || 0) >= 30) &&
        previousTier !== "disrupted";

      const flightStatusSnapshot = risk.flightStatus
        ? {
            status: risk.flightStatus.status,
            delayMinutes: risk.flightStatus.delayMinutes,
            inboundDelayMinutes: risk.flightStatus.inboundDelayMinutes,
            cancelled: risk.flightStatus.cancelled,
            departureTime: risk.flightStatus.departureTime,
          }
        : null;

      await db
        .update(userMonitoredFlights)
        .set({
          riskScore: risk.score,
          riskTier: risk.tier,
          lastCheckedAt: new Date(),
          flightStatus: flightStatusSnapshot as any,
          ...(risk.flightStatus?.departureTime && !flight.departureTime
            ? { departureTime: risk.flightStatus.departureTime.match(/(\d{2}:\d{2})/)?.[1] ?? undefined }
            : {}),
        })
        .where(eq(userMonitoredFlights.id, flight.id));

      if (tierRose || confirmedDisruption) {
        const [userRow] = await db
          .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, flight.userId))
          .limit(1);

        if (userRow) {
          const alertTier = confirmedDisruption ? "disrupted" : risk.tier;
          await sendUserFlightAlert(
            userRow.email,
            userRow.firstName,
            { ...flight, riskScore: risk.score, riskTier: risk.tier },
            confirmedDisruption ? "red" : risk.tier,
            risk.signals as unknown as Record<string, number>,
          );
          await db
            .update(userMonitoredFlights)
            .set({ lastAlertedTier: alertTier })
            .where(eq(userMonitoredFlights.id, flight.id));
          console.log(`[monitor] user flight alert sent flight_id=${flight.id} user=${userRow.email} tier=${risk.tier}`);
        }
      }
    } catch (err: any) {
      console.error(`[monitor] user flight ${flight.id} scoring failed:`, err?.message || err);
    }
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

export async function scoreFlightOnce(
  flightId: number,
  opts?: { forceRefreshNas?: boolean },
): Promise<void> {
  const [flight] = await db
    .select()
    .from(monitoredFlights)
    .where(eq(monitoredFlights.id, flightId))
    .limit(1);
  if (!flight) return;
  try {
    await processFlight(flight, opts);
  } catch (err: any) {
    console.error(`[monitor] one-off scoring failed for flight ${flightId}:`, err?.message || err);
  }
}
