// @ts-nocheck
// ============================================================================
// PRESERVED FROM server2 (v2 risk/monitor/polling pipeline) - NOT ACTIVE.
// DISABLED 2026-08-06: v2 monitoring + polling are SHUT DOWN; we are moving to
// AeroDataBox webhooks. Reference copy only - do NOT wire this file in.
// Diff against server/lib/disruption/monitor.ts (original) to see the changes.
// ============================================================================
import { randomUUID } from "crypto";
import { and, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  agencyAccounts,
  disruptionAlternatives,
  flightTravelers,
  monitoredFlights,
  userMonitoredFlights,
  users,
  type FlightTraveler,
  type MonitoredFlight,
} from "@shared/schema";
import { scoreFlightRisk } from "./riskScorer";
import { writeScoreToV2, updateFlightInV2 } from "./v2Writer";
import { findLowRiskAlternatives } from "./alternativeFinder";
import { sendTravelerAlert, sendConfirmationAlert } from "./alertSender";
import { getHistoricalOtp, type HistoricalOtpResult } from "./historicalOtp";
import { getFlightStatus } from "./flightStatus";
import sgMail from "@sendgrid/mail";

function v2RowToMonitoredFlight(row: any): MonitoredFlight {
  return {
    id: row.id,
    agencyId: row.agency_id,
    flightNumber: row.flight_number,
    carrierIata: row.carrier_iata,
    departureDate: row.departure_date,
    departureTime: row.departure_time,
    originIata: row.origin_iata,
    destinationIata: row.destination_iata,
    status: row.status,
    redTierFirstAt: row.red_tier_first_at,
    cancelledAt: row.cancelled_at,
    confirmationAlertSentAt: row.confirmation_alert_sent_at,
    tailNumber: row.tail_number,
    equipmentType: row.equipment_type,
    isTest: row.is_test,
    riskScore: row.risk_score,
    riskTier: row.risk_tier,
    lastCheckedAt: row.last_checked_at,
    agencyResolvedAt: row.agency_resolved_at,
    resolvedStatus: row.resolved_status,
    resolvedDelayMinutes: row.resolved_delay_minutes,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  } as MonitoredFlight;
}

const INTERVAL_MS = 60 * 60 * 1000;

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

  // [disabled 2026-08-06] v2 risk-score write SHUT DOWN (moving to webhooks).
  // writeScoreToV2(flight, risk, new Date()).catch((err: any) => {
  //   console.error(`[monitor] v2 write failed for flight ${flight.id}:`, err?.message || err);
  // });

  console.log(
    `[monitor] stored flight_id=${flight.id} score=${risk.score} tier=${risk.tier} cancelled=${risk.cancelled} delay_min=${risk.flightStatus?.delayMinutes ?? "null"} inbound_delay=${risk.flightStatus?.inboundDelayMinutes ?? "null"}`,
  );

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

  const now = new Date();
  const agencyStamp: Partial<typeof monitoredFlights.$inferInsert> = {};

  if (risk.tier === "red" && !flight.redTierFirstAt) {
    agencyStamp.redTierFirstAt = now;
    console.log(`[monitor] flight_id=${flight.id} ${flight.flightNumber} first red tier stamped at ${now.toISOString()}`);
  }
  if (risk.cancelled && !flight.cancelledAt) {
    agencyStamp.cancelledAt = now;
    const redFirst = agencyStamp.redTierFirstAt ?? flight.redTierFirstAt;
    if (redFirst) {
      const diffMin = Math.round((now.getTime() - new Date(redFirst).getTime()) / 60_000);
      console.log(
        diffMin >= 0
          ? `[monitor] flight_id=${flight.id} ${flight.flightNumber} cancellation confirmed ${diffMin}min after first red tier`
          : `[monitor] flight_id=${flight.id} ${flight.flightNumber} cancellation confirmed ${Math.abs(diffMin)}min BEFORE first red tier`,
      );
    } else {
      console.log(`[monitor] flight_id=${flight.id} ${flight.flightNumber} cancellation confirmed with no prior red tier`);
    }
  }

  // [disabled 2026-08-06] v2 flight update SHUT DOWN (moving to webhooks).
  // updateFlightInV2(flight, {
  //   riskScore: risk.score,
  //   riskTier: risk.tier,
  //   lastCheckedAt: now,
  //   ...(extractedDepartureTime ? { departureTime: extractedDepartureTime } : {}),
  //   ...(risk.flightStatus?.tailNumber ? { tailNumber: risk.flightStatus.tailNumber } : {}),
  //   ...(risk.flightStatus?.equipmentType ? { equipmentType: risk.flightStatus.equipmentType } : {}),
  //   ...(agencyStamp.redTierFirstAt ? { redTierFirstAt: agencyStamp.redTierFirstAt } : {}),
  //   ...(agencyStamp.cancelledAt ? { cancelledAt: agencyStamp.cancelledAt } : {}),
  // }).catch((err: any) => {
  //   console.error(`[monitor] v2 flight update failed for ${flight.id}:`, err?.message || err);
  // });

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
    const result = await db.execute(sql`
      SELECT * FROM clean.monitored_flights_v2
      WHERE status = 'active'
        AND departure_date >= ${today}::date
        AND departure_date <= ${tomorrow}::date
      LIMIT 41
    `);
    const flights = result.rows.map(v2RowToMonitoredFlight);

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

      const userStamp: Partial<typeof userMonitoredFlights.$inferInsert> = {};
      if (risk.tier === "red" && !flight.redTierFirstAt) {
        userStamp.redTierFirstAt = new Date();
        console.log(`[monitor] user flight_id=${flight.id} ${flight.flightNumber} first red tier stamped`);
      }
      if (risk.cancelled && !flight.cancelledAt) {
        userStamp.cancelledAt = new Date();
        const redFirst = userStamp.redTierFirstAt ?? flight.redTierFirstAt;
        if (redFirst) {
          const diffMin = Math.round((userStamp.cancelledAt.getTime() - new Date(redFirst).getTime()) / 60_000);
          console.log(
            diffMin >= 0
              ? `[monitor] user flight_id=${flight.id} ${flight.flightNumber} cancellation confirmed ${diffMin}min after first red tier`
              : `[monitor] user flight_id=${flight.id} ${flight.flightNumber} cancellation confirmed ${Math.abs(diffMin)}min BEFORE first red tier`,
          );
        } else {
          console.log(`[monitor] user flight_id=${flight.id} ${flight.flightNumber} cancellation confirmed with no prior red tier`);
        }
      }

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
          ...userStamp,
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

// Statuses that AeroDataBox considers a terminal resolved state — we stop
// retrying once we see one of these for a past flight.
const RESOLVED_STATUSES = new Set(["Arrived", "Cancelled", "Delayed", "Diverted"]);

// Statuses that mean the flight departed but we haven't seen the final
// Arrived state yet — treat as "in progress, will retry".
const IN_PROGRESS_STATUSES = new Set(["EnRoute", "Departed"]);

async function runResolutionCycle(): Promise<void> {
  const todayStr = todayIso();
  // Cutoff: if departure_date is earlier than this, we've waited 24h+ for a
  // resolution and should give up.
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Target: past flights whose resolved_status is NULL, Unknown, or Scheduled.
  // In-progress statuses (EnRoute/Departed) are left alone — they left the
  // gate, which is enough to know they weren't cancelled at departure.
  const targetResult = await db.execute(sql`
    SELECT * FROM clean.monitored_flights_v2
    WHERE departure_date < ${todayStr}::date
      AND status IN ('active', 'resolved', 'archived')
      AND (resolved_status IS NULL OR resolved_status IN ('Unknown', 'Scheduled'))
    ORDER BY departure_date
    LIMIT 200
  `);
  const targets = targetResult.rows.map(v2RowToMonitoredFlight);

  if (targets.length === 0) return;

  console.log(`[resolution] cycle start targets=${targets.length} date=${todayStr}`);

  let resolved = 0;
  let unresolvable = 0;
  let stillPending = 0;

  for (const flight of targets) {
    try {
      const result = await getFlightStatus(
        flight.flightNumber,
        flight.departureDate,
        flight.originIata,
        flight.destinationIata,
      ).catch(() => null);

      const rawStatus = result?.status ?? "Unknown";

      if (RESOLVED_STATUSES.has(rawStatus)) {
        await db
          .update(monitoredFlights)
          .set({
            resolvedStatus: rawStatus,
            resolvedDelayMinutes: result?.delayMinutes ?? null,
            resolvedAt: new Date(),
          })
          .where(eq(monitoredFlights.id, flight.id));
        await db.execute(sql`
          UPDATE clean.monitored_flights_v2 SET
            resolved_status = ${rawStatus},
            resolved_delay_minutes = ${result?.delayMinutes ?? null},
            resolved_at = ${new Date()}
          WHERE id = ${flight.id}
        `);
        resolved++;
      } else if (IN_PROGRESS_STATUSES.has(rawStatus)) {
        // Flight departed — not disrupted at departure. Store it so the
        // health report doesn't keep re-fetching, and don't mark unresolvable.
        await db
          .update(monitoredFlights)
          .set({
            resolvedStatus: rawStatus,
            resolvedDelayMinutes: result?.delayMinutes ?? null,
            resolvedAt: new Date(),
          })
          .where(eq(monitoredFlights.id, flight.id));
        await db.execute(sql`
          UPDATE clean.monitored_flights_v2 SET
            resolved_status = ${rawStatus},
            resolved_delay_minutes = ${result?.delayMinutes ?? null},
            resolved_at = ${new Date()}
          WHERE id = ${flight.id}
        `);
        resolved++;
      } else if (flight.departureDate <= cutoff24h) {
        // 24h+ have passed and we still have no useful status — give up.
        await db
          .update(monitoredFlights)
          .set({ resolvedStatus: "status_unresolvable", resolvedAt: new Date() })
          .where(eq(monitoredFlights.id, flight.id));
        await db.execute(sql`
          UPDATE clean.monitored_flights_v2 SET
            resolved_status = 'status_unresolvable',
            resolved_at = ${new Date()}
          WHERE id = ${flight.id}
        `);
        unresolvable++;
      } else {
        // Departure was < 24h ago and status is still Unknown/Scheduled.
        // AeroDataBox data lag is normal here — retry next cycle.
        stillPending++;
      }
    } catch (err: any) {
      console.warn(
        `[resolution] flight ${flight.id} ${flight.flightNumber} ${flight.departureDate} failed:`,
        err?.message || err,
      );
    }
  }

  console.log(
    `[resolution] cycle end resolved=${resolved} unresolvable=${unresolvable} pending=${stillPending} date=${todayStr}`,
  );
}

async function runUserFlightResolutionCycle(): Promise<void> {
  const todayStr = todayIso();
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const targets = await db
    .select()
    .from(userMonitoredFlights)
    .where(
      and(
        lt(userMonitoredFlights.departureDate, todayStr),
        eq(userMonitoredFlights.status, "active"),
        or(
          isNull(userMonitoredFlights.resolvedStatus),
          inArray(userMonitoredFlights.resolvedStatus, ["Unknown", "Scheduled"]),
        ),
      ),
    )
    .limit(100);

  if (targets.length === 0) return;

  console.log(`[resolution] user cycle start targets=${targets.length}`);
  let resolved = 0;

  for (const flight of targets) {
    try {
      const result = await getFlightStatus(
        flight.flightNumber,
        flight.departureDate,
        flight.originIata,
        flight.destinationIata,
      ).catch(() => null);

      const rawStatus = result?.status ?? "Unknown";

      if (RESOLVED_STATUSES.has(rawStatus) || IN_PROGRESS_STATUSES.has(rawStatus)) {
        await db
          .update(userMonitoredFlights)
          .set({
            resolvedStatus: rawStatus,
            resolvedDelayMinutes: result?.delayMinutes ?? null,
            resolvedAt: new Date(),
            status: "completed",
          })
          .where(eq(userMonitoredFlights.id, flight.id));
        resolved++;
      } else if (flight.departureDate <= cutoff24h) {
        await db
          .update(userMonitoredFlights)
          .set({
            resolvedStatus: "status_unresolvable",
            resolvedAt: new Date(),
            status: "completed",
          })
          .where(eq(userMonitoredFlights.id, flight.id));
        resolved++;
      }
    } catch (err: any) {
      console.warn(
        `[resolution] user flight ${flight.id} ${flight.flightNumber} ${flight.departureDate} failed:`,
        err?.message || err,
      );
    }
  }

  console.log(`[resolution] user cycle end resolved=${resolved}`);
}

const RESOLUTION_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

  // Resolution job: every 6 hours, resolve past flights still showing
  // Unknown/Scheduled and mark those that can't be resolved after 24h.
  setInterval(() => {
    runResolutionCycle().catch((err) => {
      console.error("[resolution] unhandled error:", err?.message || err);
    });
    runUserFlightResolutionCycle().catch((err) => {
      console.error("[resolution] user cycle unhandled error:", err?.message || err);
    });
  }, RESOLUTION_INTERVAL_MS);
  // Also run shortly after boot to pick up any backlog from a restart.
  setTimeout(() => {
    runResolutionCycle().catch((err) => {
      console.error("[resolution] initial run error:", err?.message || err);
    });
    runUserFlightResolutionCycle().catch((err) => {
      console.error("[resolution] user initial run error:", err?.message || err);
    });
  }, 60_000);
}

export async function scoreFlightOnce(
  flightId: number,
  opts?: { forceRefreshNas?: boolean },
): Promise<void> {
  const result = await db.execute(sql`
    SELECT * FROM clean.monitored_flights_v2 WHERE id = ${flightId} LIMIT 1
  `);
  if (!result.rows || result.rows.length === 0) return;
  const flight = v2RowToMonitoredFlight(result.rows[0]);
  try {
    await processFlight(flight, opts);
  } catch (err: any) {
    console.error(`[monitor] one-off scoring failed for flight ${flightId}:`, err?.message || err);
  }
}
