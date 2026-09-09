/**
 * Canonical flight_instance_id — V3.9-f.8 §7.1 / Sep1_1 §19 (Identity-v2)
 *
 * One physical operated flight leg = one prediction unit.
 *
 * Identity-v2 (CRIT-008) changes:
 *  - Provider flight.id is NEVER canonical key material (only optional attribute).
 *  - Canonical physical-leg key v2 =
 *      operating_carrier + operating_flight_number + origin ICAO
 *      + original destination ICAO + immutable initial_service_date
 *      (+ collision discriminator for distinct retained records only).
 *  - Retimes (≥2h or date shift) are APPEND-ONLY SCHEDULE VERSIONS under the
 *    SAME flight_instance_id via schedule_version_id / monotonic retime_version.
 *    They do NOT create a new physical flight ID unless positive distinct-leg
 *    evidence exists (identity_resolution_status='ambiguous_distinct_leg' otherwise).
 *  - Codeshare Unknown stays ambiguous_unknown; marketing numbers are attributes.
 */

import crypto from "crypto";
import { pool } from "../../db";

export interface CanonicalFlightInstanceInput {
  // from FIDS/webhook normalized fields
  operatingCarrier: string;        // e.g. "UA"
  operatingFlightNumber: string;   // e.g. "123"
  origin: string;                  // ICAO origin
  destinationOriginal: string;     // ICAO original scheduled destination
  scheduledGateOutUtc: string;     // ISO UTC, frozen T per §6.0
  serviceDate: string;             // YYYY-MM-DD local of scheduledGateOut per §6.0/§5.3
  /** Immutable origin-local date of the FIRST verified schedule identity. */
  initialServiceDate?: string;
  /**
   * Immutable first VERIFIED provider-native schedule identity (gptP0analyze4
   * #6, Log §7.1): the first observed scheduled gate-out UTC for this physical
   * leg. Included in key material so two distinct same-carrier same-number
   * same-route same-day legs with DIFFERENT first-verified schedules do not
   * collide. Immutable once set — retimes keep the original.
   */
  firstScheduledGateOutUtc?: string;
  providerFlightId?: string | null; // AeroDataBox flight.id — attribute only, NEVER key material (§7.1)
  providerRecordKey?: string | null;
  callsign?: string | null;
  marketingFlightNumbers?: string[]; // set after dedup
  providerFlightIdStable?: boolean; // verified at Gate 0.5 — informational only
}

export interface CanonicalFlightInstance {
  flight_instance_id: string;
  stableIdentity: string; // hash input without mutable state
  marketingFlightNumbers: string[];
  isFallback: boolean;
  retimeParentId?: string;
  /** Identity-v2 append-only schedule version. */
  scheduleVersionId?: string;
  /** Identity-v2 monotonic retime version (0 = initial). */
  retimeVersion?: number;
  /** Identity-v2: unresolved distinct-leg case. */
  identityResolutionStatus?: "resolved" | "ambiguous_distinct_leg";
  /** Immutable origin-local date of first verified schedule identity. */
  initialServiceDate?: string;
  /** Immutable first verified provider-native schedule identity (gptP0analyze4 #6). */
  firstScheduledGateOutUtc?: string;
}

export interface WebhookIdentityObservation {
  operatingCarrier: string | null | undefined;
  operatingFlightNumber: string | null | undefined;
  originIcao: string | null | undefined;
  originalDestinationIcao: string | null | undefined;
  scheduledGateOutUtc: string | null | undefined;
  originTimeZone: string | null | undefined;
  scheduleVerified: boolean;
  providerFlightId?: string | null;
}

export interface PersistedWebhookIdentity {
  flightInstanceId: string;
  initialServiceDate: string;
}

export interface WebhookIdentityPersistence {
  resolveOrCreate(input: {
    providerFlightId: string | null;
    operatingCarrier: string;
    operatingFlightNumber: string;
    originIcao: string;
    originalDestinationIcao: string;
    initialServiceDate: string;
    scheduledGateOutUtc: string;
    flightInstanceId: string;
  }): Promise<PersistedWebhookIdentity>;
}

export type WebhookIdentityResolution =
  | ({ status: "resolved" } & PersistedWebhookIdentity)
  | { status: "quarantined"; reason: string };

export interface RetimeDetectionResult {
  isRetime: boolean;
  retimeMinutes: number | null;
  dateShifted: boolean;
  reason: string | null;
}

export interface CodeshareState {
  /** 0=Unknown, 1=IsOperator, 2=IsCodeshared */
  rawCode: number;
  label: "Unknown" | "IsOperator" | "IsCodeshared";
  /** For Unknown: may be codeshare, needs operator verification */
  ambiguousUnknown: boolean;
}

function sha8(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 8);
}

function normalizedRequired(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

/** Derive YYYY-MM-DD at the origin. Invalid/non-IANA zones are refused. */
export function originLocalServiceDate(scheduledUtc: string, timeZone: string): string | null {
  const instant = new Date(scheduledUtc);
  if (!Number.isFinite(instant.getTime()) || !timeZone.includes("/")) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = Object.fromEntries(formatter.formatToParts(instant).map((part) => [part.type, part.value]));
    return parts.year && parts.month && parts.day ? `${parts.year}-${parts.month}-${parts.day}` : null;
  } catch {
    return null;
  }
}

const postgresWebhookIdentityPersistence: WebhookIdentityPersistence = {
  async resolveOrCreate(input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // gptP0analyze4 #7: no-provider-ID alias is SCHEDULE-STABLE
      // (carrier+number|origin|dest) so a retime that shifts origin-local
      // midnight (23:xx → 00:xx next local date) still finds the SAME
      // physical flight. initialServiceDate is NOT part of the alias because
      // it would change on a date-shifting retime and miss the original row.
      const alias = input.providerFlightId
        ? `${input.operatingCarrier}|${input.providerFlightId}`
        : `${input.operatingCarrier}${input.operatingFlightNumber}|${input.originIcao}|${input.originalDestinationIcao}`;
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [alias]);
      const existing = await client.query(
        `SELECT flight_instance_id, initial_service_date::text
           FROM clean.webhook_flight_identity
          WHERE provider_identity_alias = $1`,
        [alias],
      );
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return {
          flightInstanceId: existing.rows[0].flight_instance_id,
          initialServiceDate: existing.rows[0].initial_service_date,
        };
      }
      await client.query(
        `INSERT INTO clean.webhook_flight_identity
           (provider_identity_alias, provider_flight_id, flight_instance_id,
            operating_carrier, operating_flight_number, origin_icao,
            original_destination_icao, initial_service_date, initial_scheduled_gate_out_utc)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [alias, input.providerFlightId, input.flightInstanceId, input.operatingCarrier,
          input.operatingFlightNumber, input.originIcao, input.originalDestinationIcao,
          input.initialServiceDate, input.scheduledGateOutUtc],
      );
      await client.query("COMMIT");
      return { flightInstanceId: input.flightInstanceId, initialServiceDate: input.initialServiceDate };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};

/** Production webhook identity boundary. No date or timezone fallback is allowed. */
export async function resolveWebhookFlightIdentity(
  observation: WebhookIdentityObservation,
  persistence: WebhookIdentityPersistence = postgresWebhookIdentityPersistence,
): Promise<WebhookIdentityResolution> {
  if (!observation.scheduleVerified || !observation.scheduledGateOutUtc) {
    return { status: "quarantined", reason: "verified scheduled gate-out is unavailable" };
  }
  if (!observation.originTimeZone) {
    return { status: "quarantined", reason: "origin IANA timezone is unavailable" };
  }
  const initialServiceDate = originLocalServiceDate(observation.scheduledGateOutUtc, observation.originTimeZone);
  if (!initialServiceDate) {
    return { status: "quarantined", reason: "origin timezone or scheduled gate-out is invalid" };
  }
  const carrier = normalizedRequired(observation.operatingCarrier);
  const number = normalizedRequired(observation.operatingFlightNumber)?.replace(/^0+/, "") || null;
  const origin = normalizedRequired(observation.originIcao);
  const destination = normalizedRequired(observation.originalDestinationIcao);
  if (!carrier || !number || !origin || !destination) {
    return { status: "quarantined", reason: "required operating-leg identity fields are unavailable" };
  }
  const canonical = canonicalFlightInstanceId({
    operatingCarrier: carrier,
    operatingFlightNumber: number,
    origin,
    destinationOriginal: destination,
    scheduledGateOutUtc: observation.scheduledGateOutUtc,
    serviceDate: initialServiceDate,
    initialServiceDate,
    firstScheduledGateOutUtc: observation.scheduledGateOutUtc,
    providerFlightId: observation.providerFlightId,
  });
  const persisted = await persistence.resolveOrCreate({
    providerFlightId: observation.providerFlightId?.trim() || null,
    operatingCarrier: carrier,
    operatingFlightNumber: number,
    originIcao: origin,
    originalDestinationIcao: destination,
    initialServiceDate,
    scheduledGateOutUtc: observation.scheduledGateOutUtc,
    flightInstanceId: canonical.flight_instance_id,
  });
  return { status: "resolved", ...persisted };
}

// ---------------------------------------------------------------------------
// Codeshare state classification (Sep1_1 §19)
// ---------------------------------------------------------------------------

/**
 * Classify codeshare status. codeshareStatus=0 (Unknown) is the
 * ambiguous_unknown state: the provider doesn't know if this is a
 * codeshare or not. This must be tracked separately from IsOperator/IsCodeshared.
 */
export function classifyCodeshare(rawCode: number | null | undefined): CodeshareState {
  const code = typeof rawCode === "number" && Number.isFinite(rawCode) ? rawCode : 0;
  const labels: Record<number, CodeshareState["label"]> = {
    0: "Unknown",
    1: "IsOperator",
    2: "IsCodeshared",
  };
  return {
    rawCode: code,
    label: labels[code] ?? "Unknown",
    ambiguousUnknown: code === 0,
  };
}

// ---------------------------------------------------------------------------
// Retime detection (used for schedule-versioning, NOT for a new physical ID)
// ---------------------------------------------------------------------------

const RETIME_THRESHOLD_MINUTES = 120; // ≥2h

/**
 * Detect if a scheduled time has been retimed (≥2h or date shift).
 * In identity-v2 this signals a NEW SCHEDULE VERSION of the SAME physical
 * flight — it never creates a new flight_instance_id by itself.
 */
export function detectRetime(
  previousScheduledUtc: Date | null,
  currentScheduledUtc: Date | null,
): RetimeDetectionResult {
  if (!previousScheduledUtc || !currentScheduledUtc) {
    return { isRetime: false, retimeMinutes: null, dateShifted: false, reason: null };
  }

  const diffMs = currentScheduledUtc.getTime() - previousScheduledUtc.getTime();
  const diffMinutes = Math.abs(diffMs) / (1000 * 60);

  // Date shift check
  const prevDate = previousScheduledUtc.toISOString().slice(0, 10);
  const curDate = currentScheduledUtc.toISOString().slice(0, 10);
  const dateShifted = prevDate !== curDate;

  const isRetime = diffMinutes >= RETIME_THRESHOLD_MINUTES || dateShifted;

  let reason: string | null = null;
  if (isRetime) {
    if (dateShifted) {
      reason = `date shift: ${prevDate} → ${curDate}`;
    } else {
      reason = `time shift: ${diffMinutes.toFixed(0)} minutes`;
    }
  }

  return {
    isRetime,
    retimeMinutes: diffMinutes,
    dateShifted,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Identity-v2 canonical ID generation (§7.1)
// ---------------------------------------------------------------------------

/**
 * Schedule-version id: append-only per retime. Same physical flight gets a NEW
 * schedule_version_id (capturing the mutable schedule time) without changing
 * flight_instance_id.
 */
function scheduleVersionId(flightInstanceId: string, retimeVersion: number, scheduledGateOutUtc: string): string {
  return `ver:${sha8(`${flightInstanceId}|${retimeVersion}|${scheduledGateOutUtc}`)}`;
}

/**
 * Canonical physical-leg ID v2 — stable across retimes/date shifts.
 * Key = carrier + number + origin + original destination + immutable
 * initial_service_date (+ collision suffix for distinct retained records only).
 * Provider flight.id is never key material.
 */
export function canonicalFlightInstanceId(input: CanonicalFlightInstanceInput, opts?: { collisionSuffix?: string }): CanonicalFlightInstance {
  const normalizedCarrier = input.operatingCarrier.trim().toUpperCase();
  const normalizedNumber = input.operatingFlightNumber.trim().replace(/^0+/, "");
  const origin = input.origin.trim().toUpperCase();
  const dest = input.destinationOriginal.trim().toUpperCase();
  const initialServiceDate = input.initialServiceDate ?? input.serviceDate;
  // First verified provider-native schedule identity (gptP0analyze4 #6): a
  // stable part of key material that disambiguates distinct same-day legs.
  // Immutable once fixed — retimes keep the ORIGINAL first-verified value.
  const firstScheduledGateOutUtc = input.firstScheduledGateOutUtc ?? input.scheduledGateOutUtc;

  // Identity-v2 key: NO provider flight.id, NO mutable scheduledGateOutUtc.
  const base = `${normalizedCarrier}${normalizedNumber}|${origin}|${dest}|${initialServiceDate}|${firstScheduledGateOutUtc}`;
  let id = `leg:${sha8(base)}`;
  if (opts?.collisionSuffix) id += `:${opts.collisionSuffix}`;

  return {
    flight_instance_id: id,
    stableIdentity: base,
    marketingFlightNumbers: input.marketingFlightNumbers ?? [],
    isFallback: true,
    scheduleVersionId: scheduleVersionId(id, 0, input.scheduledGateOutUtc),
    retimeVersion: 0,
    identityResolutionStatus: "resolved",
    initialServiceDate,
    firstScheduledGateOutUtc,
  };
}

/**
 * Identity-v2 retime: the SAME physical flight_instance_id is retained; a NEW
 * schedule_version_id is appended and retime_version is incremented. No new
 * physical ID unless positive distinct-leg evidence exists.
 */
export function retimeFlightInstanceId(
  original: CanonicalFlightInstance,
  newInput: CanonicalFlightInstanceInput,
  opts?: { collisionSuffix?: string },
): CanonicalFlightInstance {
  const retimeVersion = (original.retimeVersion ?? 0) + 1;
  // Keep the ORIGINAL physical id (identity-v2): same carrier/number/origin/
  // dest/initial-service-date AND the ORIGINAL immutable first-verified
  // schedule identity → same leg:hash even if the schedule time shifted.
  // gptP0analyze4 #6: the first-verified schedule is key material and NEVER
  // updates on retime, so a ≥2h or date-shift retime cannot change the id.
  const physicalId = canonicalFlightInstanceId({
    ...newInput,
    initialServiceDate: original.initialServiceDate ?? newInput.serviceDate,
    firstScheduledGateOutUtc: original.firstScheduledGateOutUtc ?? newInput.scheduledGateOutUtc,
    operatingCarrier: newInput.operatingCarrier,
    operatingFlightNumber: newInput.operatingFlightNumber,
    origin: newInput.origin,
    destinationOriginal: newInput.destinationOriginal,
  }, opts);

  return {
    ...physicalId,
    marketingFlightNumbers: newInput.marketingFlightNumbers ?? original.marketingFlightNumbers ?? [],
    scheduleVersionId: scheduleVersionId(physicalId.flight_instance_id, retimeVersion, newInput.scheduledGateOutUtc),
    retimeVersion,
    identityResolutionStatus: "resolved",
  };
}

// ---------------------------------------------------------------------------
// Codeshare dedup (Sep1_1 §19)
// ---------------------------------------------------------------------------

/** Dedup marketing codeshares: input array of FIDS rows for same airport-window, returns operating-legs only */
export function dedupCodeshares(rows: Array<{
  operatingCarrier: string;
  operatingFlightNumber: string;
  origin: string;
  destinationOriginal: string;
  scheduledGateOutUtc: string;
  serviceDate: string;
  initialServiceDate?: string;
  marketingCarrier?: string;
  marketingNumber?: string;
  providerFlightId?: string;
  codeshareStatus?: number | null;
}>): Map<string, { instance: CanonicalFlightInstance; marketing: string[]; codeshareState: CodeshareState }> {
  const map = new Map<string, { instance: CanonicalFlightInstance; marketing: string[]; codeshareState: CodeshareState }>();
  for (const r of rows) {
    const inst = canonicalFlightInstanceId({
      operatingCarrier: r.operatingCarrier,
      operatingFlightNumber: r.operatingFlightNumber,
      origin: r.origin,
      destinationOriginal: r.destinationOriginal,
      scheduledGateOutUtc: r.scheduledGateOutUtc,
      serviceDate: r.serviceDate,
      initialServiceDate: r.initialServiceDate,
    });
    const key = inst.stableIdentity;
    const codeshareState = classifyCodeshare(r.codeshareStatus);

    if (!map.has(key)) {
      map.set(key, { instance: inst, marketing: [], codeshareState });
    }
    const entry = map.get(key)!;

    // Track codeshare state: prefer IsOperator over Unknown if seen
    if (codeshareState.label === "IsOperator" && entry.codeshareState.ambiguousUnknown) {
      entry.codeshareState = codeshareState;
    }

    if (r.marketingCarrier && r.marketingNumber) {
      const mk = `${r.marketingCarrier}${r.marketingNumber}`;
      if (!entry.marketing.includes(mk)) entry.marketing.push(mk);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Cross-airport duplicate detection (Sep1_1 §19)
// ---------------------------------------------------------------------------

/**
 * Detect if two flight instances from different airports are the same physical flight.
 * Used for cross-airport dedup when the same flight appears at origin and destination airports.
 */
export function isCrossAirportDuplicate(
  a: CanonicalFlightInstanceInput,
  b: CanonicalFlightInstanceInput,
): boolean {
  const carrierA = a.operatingCarrier.trim().toUpperCase();
  const carrierB = b.operatingCarrier.trim().toUpperCase();
  const numA = a.operatingFlightNumber.trim().replace(/^0+/, "");
  const numB = b.operatingFlightNumber.trim().replace(/^0+/, "");

  if (carrierA !== carrierB || numA !== numB) return false;

  // Same flight number — check if airports are swapped (origin/destination)
  const aSwapped = a.origin.trim().toUpperCase() === b.destinationOriginal.trim().toUpperCase() &&
    a.destinationOriginal.trim().toUpperCase() === b.origin.trim().toUpperCase();
  const aSame = a.origin.trim().toUpperCase() === b.origin.trim().toUpperCase() &&
    a.destinationOriginal.trim().toUpperCase() === b.destinationOriginal.trim().toUpperCase();

  return aSwapped || aSame;
}

// ---------------------------------------------------------------------------
// Route / tail identity contract (§1.5.4 items 13–15).
// Directed OD = (origin ICAO, original_scheduled_destination ICAO), never
// silently undirected. Diversion = actual destination differs from original.
// Tail fallback: verified aircraft_reg > mode-S > ICAO24 > verified provider
// aircraft ID — but tail_known=true ONLY for a verified non-null registration.
// midnight_crossing records UTC/local date straddles without rewriting the
// immutable initial_service_date.
// ---------------------------------------------------------------------------

export interface TailIdentityInput {
  aircraftReg?: string | null;
  aircraftModeS?: string | null;
  icao24?: string | null;
  providerAircraftId?: string | null;
  providerAircraftIdVerified?: boolean;
}

export interface TailIdentity {
  tailKey: string | null;
  tailKnown: boolean;
  tailSource: "aircraft_reg" | "mode_s" | "icao24" | "provider_aircraft_id" | "unknown";
}

/** Resolve tail identity by the frozen fallback chain (§1.5.4 item 14). */
export function resolveTailIdentity(input: TailIdentityInput): TailIdentity {
  const reg = typeof input.aircraftReg === "string" && input.aircraftReg.trim() ? input.aircraftReg.trim().toUpperCase() : null;
  if (reg) return { tailKey: reg, tailKnown: true, tailSource: "aircraft_reg" };
  const modeS = typeof input.aircraftModeS === "string" && input.aircraftModeS.trim() ? input.aircraftModeS.trim().toUpperCase() : null;
  if (modeS) return { tailKey: modeS, tailKnown: false, tailSource: "mode_s" };
  const icao24 = typeof input.icao24 === "string" && input.icao24.trim() ? input.icao24.trim().toUpperCase() : null;
  if (icao24) return { tailKey: icao24, tailKnown: false, tailSource: "icao24" };
  if (input.providerAircraftIdVerified && typeof input.providerAircraftId === "string" && input.providerAircraftId.trim()) {
    return { tailKey: input.providerAircraftId.trim(), tailKnown: false, tailSource: "provider_aircraft_id" };
  }
  return { tailKey: null, tailKnown: false, tailSource: "unknown" };
}

export interface RouteIdentity {
  originIcao: string;
  originalScheduledDestinationIcao: string;
  currentOperationalDestinationIcao: string | null;
  actualDestinationIcao: string | null;
  diversionFlag: boolean;
  midnightCrossing: boolean;
}

/**
 * Build the directed route identity (§1.5.4 item 13): original scheduled,
 * operational, and actual destinations kept separately; diversion iff actual
 * differs from original; midnight_crossing recorded from UTC dates.
 */
export function resolveRouteIdentity(input: {
  originIcao: string;
  originalScheduledDestinationIcao: string;
  currentOperationalDestinationIcao?: string | null;
  actualDestinationIcao?: string | null;
  scheduledGateOutUtc?: string | null;
  actualWheelsOnUtc?: string | null;
}): RouteIdentity {
  const origin = input.originIcao.trim().toUpperCase();
  const original = input.originalScheduledDestinationIcao.trim().toUpperCase();
  const operational = input.currentOperationalDestinationIcao?.trim().toUpperCase() || null;
  const actual = input.actualDestinationIcao?.trim().toUpperCase() || null;
  const midnightCrossing = (() => {
    if (!input.scheduledGateOutUtc || !input.actualWheelsOnUtc) return false;
    try {
      return new Date(input.scheduledGateOutUtc).toISOString().slice(0, 10) !==
        new Date(input.actualWheelsOnUtc).toISOString().slice(0, 10);
    } catch {
      return false;
    }
  })();
  return {
    originIcao: origin,
    originalScheduledDestinationIcao: original,
    currentOperationalDestinationIcao: operational,
    actualDestinationIcao: actual,
    diversionFlag: actual !== null && actual !== original,
    midnightCrossing,
  };
}
