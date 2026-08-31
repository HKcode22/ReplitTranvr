/**
 * Canonical flight_instance_id — V3.9-f.7 §7.1 / §43-44
 *
 * One physical operated flight leg = one prediction unit.
 * Binding spec: AugMDnotes/V3.9_DataCollectPlan.md §7.1
 *
 * Preferred: provider flightId if verified stable at Gate 0.5 (same id across withCodeshared variants).
 * Fallback: operating_carrier + operating_flight_number + origin + destination(original) + service_date + scheduled_gate_out_utc
 *
 * Codeshare: marketing numbers stored as attribute array on operating leg, never separate flight_instance_id.
 * Retime ≥2h or date shift → new id with retime_parent_id link.
 * Diversion: same id retains original_scheduled_destination; actual_destination updated + diversion_flag.
 * Collision: append provider_record_key hash suffix.
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

function sha8(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 8);
}

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
  if (input.providerRecordKey) {
    // Keep provider key for provenance link but not in primary id unless collision
  }
  return {
    flight_instance_id: id,
    stableIdentity: base,
    marketingFlightNumbers: input.marketingFlightNumbers ?? [],
    isFallback: true,
  };
}

/** Dedup marketing codeshares: input array of FIDS rows for same airport-window, returns operating-legs only */
export function dedupCodeshares(rows: Array<{ operatingCarrier: string; operatingFlightNumber: string; origin: string; destinationOriginal: string; scheduledGateOutUtc: string; serviceDate: string; marketingCarrier?: string; marketingNumber?: string; providerFlightId?: string }>): Map<string, { instance: CanonicalFlightInstance; marketing: string[] }> {
  const map = new Map<string, { instance: CanonicalFlightInstance; marketing: string[] }>();
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
    if (!map.has(key)) map.set(key, { instance: inst, marketing: [] });
    if (r.marketingCarrier && r.marketingNumber) {
      const mk = `${r.marketingCarrier}${r.marketingNumber}`;
      if (!map.get(key)!.marketing.includes(mk)) map.get(key)!.marketing.push(mk);
    }
  }
  return map;
}
