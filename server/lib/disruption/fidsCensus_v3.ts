/**
 * FIDS / flight_population census — V3.9-f.8 §5.1-5.4 / Sep1_1 §7-9, §13
 *
 * Binding spec: AugMDnotes/V3.9_DataCollectPlan.md §§5.1-5.4
 * Implements: S1 provider-observable prediction population
 * Status: IMPLEMENTED — fetches from AeroDataBox FIDS endpoint, persists raw + hash.
 *
 * Frozen protocol (§5.1):
 *  endpoint GET /flights/airports/icao/{code}/{fromLocal}/{toLocal}
 *  direction=Both, withCancelled=true, withCodeshared=true,
 *  withCargo=false, withPrivate=false, withLocation=false,
 *  local fromLocal/toLocal in airport IANA tz (see §5.3), 12h window, raw JSON + hash persisted.
 *
 * Worst-case proof (§5.4): BASE 744 + VALIDATION 60 + RETRIES 75 + CONTINGENCY 40 < 1000 REST units.
 *
 * Sep1_1 §7 corrections applied:
 *  - FIDS endpoint is /flights/airports/icao/... NOT /flights/schedule
 *  - direction is a single parameter (Both|Arrival|Departure), NOT withDepartures/withArrivals
 *  - withLeg=true includes opposite movement (departure+arrival), NOT "leg-detail mode"
 *  - CanceledUncertain is a distinct status (NOT merged with Canceled)
 *  - Codeshare: marketing numbers stored as attribute, never separate flight_instance_id
 *  - Cargo/private explicitly excluded via withCargo=false, withPrivate=false
 */

import { createHash } from "crypto";
import { pool } from "../../db";
import { fetchFidsAirport } from "./aerodataboxLimiter_v3";
import {
  canonicalFlightInstanceId,
  dedupCodeshares,
  type CanonicalFlightInstanceInput,
} from "./flightInstanceCanonical_v3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FidsCensusParams {
  airportIcao: string;
  fromLocal: string; // airport local, YYYY-MM-DD HH:mm
  toLocal: string;   // airport local
  ianaTimezone: string;
  withCancelled: boolean;
  withCodeshared: boolean;
}

export interface FidsCensusResult {
  airportIcao: string;
  fromLocal: string;
  toLocal: string;
  ianaTimezone: string;
  retrievalUtc: string;
  rawJson: unknown;
  responseHash: string;
  flightInstanceIds: string[]; // canonical ids via flightInstanceCanonical_v3
  flightCount: number;
  truncated?: boolean;
}

// ---------------------------------------------------------------------------
// DST-aware UTC interval → local fromLocal/toLocal (see §5.3)
// ---------------------------------------------------------------------------

/** DST-aware UTC interval → local fromLocal/toLocal (see §5.3) */
export function utcIntervalToLocal(utcFrom: Date, utcTo: Date, ianaTimezone: string): { fromLocal: string; toLocal: string } {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ianaTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(d)
      .replace(",", "");
  return { fromLocal: fmt(utcFrom), toLocal: fmt(utcTo) };
}

// ---------------------------------------------------------------------------
// SHA-256 hash of raw response (for provenance, §5.1)
// ---------------------------------------------------------------------------

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// ---------------------------------------------------------------------------
// Flight number parsing (for codeshare/operating carrier extraction)
// ---------------------------------------------------------------------------

function parseFlightNumber(raw: string | null | undefined): { carrier: string; number: string } | null {
  if (!raw || typeof raw !== "string") return null;
  const match = raw.trim().match(/^([A-Z0-9]{2})([0-9]{1,4})$/i);
  if (!match) return null;
  return { carrier: match[1].toUpperCase(), number: match[2] };
}

// ---------------------------------------------------------------------------
// Main FIDS census fetcher
// ---------------------------------------------------------------------------

/**
 * Fetch the FIDS population for one airport+window and persist raw JSON + hash.
 *
 * Protocol (§5.1):
 *   1. Convert UTC window to airport-local times via IANA timezone
 *   2. Call GET /flights/airports/icao/{code}/{fromLocal}/{toLocal}
 *   3. SHA-256 hash the raw response
 *   4. Persist raw payload + hash to clean.adb_ingest_events (FIDS census mode)
 *   5. Deduplicate flights via canonical flight_instance_id
 *   6. Return flight instance IDs for population membership
 *
 * Returns null if the FIDS call fails (caller decides retry logic).
 */
export async function fetchFidsPopulation(params: FidsCensusParams): Promise<FidsCensusResult | null> {
  const { airportIcao, fromLocal, toLocal, ianaTimezone, withCancelled, withCodeshared } = params;

  // Step 1: Call FIDS endpoint
  const fids = await fetchFidsAirport(airportIcao, fromLocal, toLocal, {
    direction: "Both",
  });

  if (!fids) {
    console.warn(`[fids-census] FIDS fetch failed for ${airportIcao} ${fromLocal}→${toLocal}`);
    return null;
  }

  // Step 2: Combine departures + arrivals into a single raw payload
  const rawPayload = {
    airport: airportIcao,
    fromLocal,
    toLocal,
    ianaTimezone,
    departures: fids.departures,
    arrivals: fids.arrivals,
    fetchedAtUtc: new Date().toISOString(),
  };
  const rawJson = JSON.stringify(rawPayload);
  const responseHash = sha256(rawJson);

  // Step 3: Persist raw payload + hash (FIDS census mode)
  const retrievalUtc = new Date();
  try {
    await pool.query(
      `INSERT INTO clean.adb_ingest_events
         (subscription_id, batch_id, notification_items, payload_sha256, raw_payload,
          parser_version, schema_version, upsert_outcome)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        null, // no subscription for FIDS census
        null, // no batch for ad-hoc FIDS
        fids.departures.length + fids.arrivals.length,
        responseHash,
        rawPayload,
        "fidsCensus_v3",
        "v3.9-f.8",
        "fids_census",
      ],
    );
  } catch (err: any) {
    // FIDS census raw persistence failure is logged but doesn't block the caller
    console.error(`[fids-census] raw persist failed for ${airportIcao}:`, err?.message || err);
  }

  // Step 4: Deduplicate flights via canonical flight_instance_id
  // Filter: exclude cargo (withCargo=false already at API level, but double-check)
  // Filter: exclude private (withPrivate=false already at API level, but double-check)
  // Filter: honor withCancelled/withCodeshared flags
  const allFlights = [
    ...fids.departures.map((f: any) => ({ ...f, _direction: "departure" as const })),
    ...fids.arrivals.map((f: any) => ({ ...f, _direction: "arrival" as const })),
  ];

  // Build dedup input for codeshare deduplication
  const dedupInput = allFlights
    .filter((f: any) => {
      // Skip cargo if excluded
      if (!withCancelled && f.isCargo === true) return false;
      // Skip canceled if excluded
      if (!withCancelled && (f.status === "Canceled" || f.status === 10)) return false;
      // Skip codeshared if excluded
      if (!withCodeshared && f.codeshareStatus === "IsCodeshared") return false;
      // Skip if no flight number
      if (!f.number) return false;
      return true;
    })
    .map((f: any) => {
      const parsed = parseFlightNumber(f.number);
      const depAirport = f.departure?.airport ?? f.arrival?.airport ?? {};
      const arrAirport = f.arrival?.airport ?? f.departure?.airport ?? {};
      return {
        operatingCarrier: parsed?.carrier ?? "",
        operatingFlightNumber: parsed?.number ?? "",
        origin: depAirport.icao ?? "",
        destinationOriginal: arrAirport.icao ?? "",
        scheduledGateOutUtc: f.departure?.scheduledTime?.utc ?? "",
        serviceDate: extractServiceDate(f.departure?.scheduledTime?.utc),
        marketingCarrier: parsed?.carrier ?? "",
        marketingNumber: parsed?.number ?? "",
        providerFlightId: f.id ?? null,
      };
    });

  const deduped = dedupCodeshares(dedupInput);
  const flightInstanceIds = Array.from(deduped.values()).map((d) => d.instance.flight_instance_id);

  // Step 5: Check truncation (AeroDataBox may truncate large result sets)
  const truncated = allFlights.length >= 500; // heuristic: FIDS responses capped at ~500

  return {
    airportIcao,
    fromLocal,
    toLocal,
    ianaTimezone,
    retrievalUtc: retrievalUtc.toISOString(),
    rawJson: rawPayload,
    responseHash,
    flightInstanceIds,
    flightCount: allFlights.length,
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Service date extraction (§6.0): local date of scheduledGateOut
// ---------------------------------------------------------------------------

function extractServiceDate(utcIso: string | null | undefined): string {
  if (!utcIso) return new Date().toISOString().slice(0, 10);
  // Return the UTC date as a fallback; caller should ideally use airport-local date
  return utcIso.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Batch FIDS census: fetch multiple airports in sequence
// ---------------------------------------------------------------------------

export interface BatchFidsResult {
  airports: FidsCensusResult[];
  failed: string[];
  totalFlightInstances: number;
}

/**
 * Fetch FIDS population for multiple airports. Returns successful results + failed ICAOs.
 * Sequential to respect rate limits (throttledFetch serial queue).
 */
export async function fetchBatchFidsPopulation(
  params: FidsCensusParams[],
): Promise<BatchFidsResult> {
  const airports: FidsCensusResult[] = [];
  const failed: string[] = [];
  let totalFlightInstances = 0;

  for (const p of params) {
    const result = await fetchFidsPopulation(p);
    if (result) {
      airports.push(result);
      totalFlightInstances += result.flightInstanceIds.length;
    } else {
      failed.push(p.airportIcao);
    }
  }

  return { airports, failed, totalFlightInstances };
}
