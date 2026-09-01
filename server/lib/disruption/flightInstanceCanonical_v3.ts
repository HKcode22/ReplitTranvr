/**
 * Canonical flight_instance_id — V3.9-f.8 §7.1 / §43-44 / §19 / Sep1_1 §19
 *
 * One physical operated flight leg = one prediction unit.
 * Binding spec: AugMDnotes/V3.9_DataCollectPlan.md §7.1
 *
 * Preferred: provider flightId if verified stable at Gate 0.5 (same id across withCodeshared variants).
 * Fallback: operating_carrier + operating_flight_number + origin + destination(original) + service_date + selected_t_milestone
 *
 * Codeshare: marketing numbers stored as attribute array on operating leg, never separate flight_instance_id.
 * Retime ≥2h or date shift → new id with retime_parent_id link.
 * Diversion: same id retains original_scheduled_destination; actual_destination updated + diversion_flag.
 * Collision: append provider_record_key hash suffix.
 *
 * Sep1_1 §19 corrections:
 *  - Codeshare ambiguous_unknown state: codeshareStatus=0 (Unknown) treated as "may be codeshare"
 *  - Retime detection: compare scheduled times; ≥2h difference or date shift = new instance
 *  - Same-tail sequencing: not "same calendar date" — use chronology
 *  - Cross-midnight flights: service date determined by scheduled_gate_out local date
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
  providerFlightId?: string | null; // AeroDataBox flight.id if present
  providerRecordKey?: string | null;
  callsign?: string | null;
  marketingFlightNumbers?: string[]; // set after dedup
  providerFlightIdStable?: boolean; // verified at Gate 0.5
}

export interface CanonicalFlightInstance {
  flight_instance_id: string;
  stableIdentity: string; // hash input without mutable state
  marketingFlightNumbers: string[];
  isFallback: boolean;
  retimeParentId?: string;
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
// Retime detection (Sep1_1 §19)
// ---------------------------------------------------------------------------

const RETIME_THRESHOLD_MINUTES = 120; // ≥2h = new instance

/**
 * Detect if a flight has been retimed.
 * Retime = scheduled time shifted by ≥2h OR date changed.
 * Returns the detection result with the retime magnitude.
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

  // Retime threshold
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
// Canonical ID generation
// ---------------------------------------------------------------------------

/** Returns deterministic canonical id. Collision suffix added if caller detects duplicate. */
export function canonicalFlightInstanceId(input: CanonicalFlightInstanceInput, opts?: { collisionSuffix?: string }): CanonicalFlightInstance {
  const normalizedCarrier = input.operatingCarrier.trim().toUpperCase();
  const normalizedNumber = input.operatingFlightNumber.trim().replace(/^0+/, "");
  const origin = input.origin.trim().toUpperCase();
  const dest = input.destinationOriginal.trim().toUpperCase();

  // Preferred path — only if verified stable
  if (input.providerFlightId && input.providerFlightIdStable) {
    const base = `pid:${input.providerFlightId}`;
    const suffix = opts?.collisionSuffix ? `:${opts.collisionSuffix}` : "";
    return {
      flight_instance_id: `${base}${suffix}`,
      stableIdentity: base,
      marketingFlightNumbers: input.marketingFlightNumbers ?? [],
      isFallback: false,
    };
  }

  // Fallback canonical key — frozen per §7.1
  const base = `${normalizedCarrier}${normalizedNumber}|${origin}|${dest}|${input.serviceDate}|${input.scheduledGateOutUtc}`;
  let id = `leg:${sha8(base)}`;
  if (opts?.collisionSuffix) id += `:${opts.collisionSuffix}`;
  return {
    flight_instance_id: id,
    stableIdentity: base,
    marketingFlightNumbers: input.marketingFlightNumbers ?? [],
    isFallback: true,
  };
}

/**
 * Generate a new canonical ID for a retimed flight.
 * Links to the original via retimeParentId.
 */
export function retimeFlightInstanceId(
  original: CanonicalFlightInstance,
  newInput: CanonicalFlightInstanceInput,
  opts?: { collisionSuffix?: string },
): CanonicalFlightInstance {
  const newId = canonicalFlightInstanceId(newInput, opts);
  return {
    ...newId,
    retimeParentId: original.flight_instance_id,
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
      providerFlightId: r.providerFlightId ?? null,
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
