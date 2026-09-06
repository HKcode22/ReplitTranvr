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
}

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

  // Identity-v2 key: NO provider flight.id, NO mutable scheduledGateOutUtc.
  const base = `${normalizedCarrier}${normalizedNumber}|${origin}|${dest}|${initialServiceDate}`;
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
  const base = canonicalFlightInstanceId(newInput, opts);
  const retimeVersion = (original.retimeVersion ?? 0) + 1;
  // Keep the ORIGINAL physical id (identity-v2): same carrier/number/origin/
  // dest/initial-service-date → same leg:hash even if the schedule time shifted.
  const physicalId = canonicalFlightInstanceId({
    ...newInput,
    initialServiceDate: original.initialServiceDate ?? newInput.serviceDate,
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
