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
  /** Cargo/private exclusion (§1.5.3). Default false = excluded from core population. */
  withCargo?: boolean;
  withPrivate?: boolean;
  /** Requested direction; PRE population uses departure-primary role (§1.5.3). */
  direction?: "Departure" | "Arrival" | "Both";
}

export type PopulationRole = "requested_airport_primary" | "opposite_movement_context";

/** FIDS truncation signal is a heuristic until Gate-0.5 MEASURE→FREEZE pins the verified contract. */
export const FIDS_TRUNCATION_HEURISTIC_COUNT = 500;

/** FIDS transport policy (§1.5.3): max 3 total physical attempts, transient-only retry. */
export const FIDS_MAX_TOTAL_ATTEMPTS = 3;
/** Retryable classes: 429, eligible 5xx, connect timeout/reset. Never auth/validation 4xx. */
export const FIDS_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

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
  const {
    airportIcao, fromLocal, toLocal, ianaTimezone,
    withCancelled, withCodeshared,
    withCargo = false, withPrivate = false,
    direction = "Both",
  } = params;

  // Step 1: Call FIDS endpoint (§1.5.3 contract: withLeg=true, explicit direction)
  const fids = await fetchFidsAirport(airportIcao, fromLocal, toLocal, {
    direction,
    withLeg: true,
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
  // §1.5.3 scope rules: cargo/private excluded when withCargo/withPrivate are
  // false; canceled/codeshared gated by their flags; charter/non-scheduled with
  // unresolvable scope stays 'unknown' (never silently included/excluded here —
  // scope_classification is assigned by the population persistence layer).
  const dedupInput = allFlights
    .filter((f: any) => {
      // Skip cargo when excluded (CRIT-007 fix: previously checked withCancelled by mistake)
      if (!withCargo && f.isCargo === true) return false;
      // Skip private when excluded
      if (!withPrivate && (f.isPrivate === true || f.isGeneralAviation === true)) return false;
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
      // §1.5.3: PRE population uses the requested-airport departure as primary
      // membership; arrivals seen via direction=Both are opposite-movement context.
      const populationRole: PopulationRole =
        f._direction === "departure" ? "requested_airport_primary" : "opposite_movement_context";
      return {
        operatingCarrier: parsed?.carrier ?? "",
        operatingFlightNumber: parsed?.number ?? "",
        origin: depAirport.icao ?? "",
        destinationOriginal: arrAirport.icao ?? "",
        scheduledGateOutUtc: f.departure?.scheduledTime?.utc ?? "",
        // Airport-LOCAL service date (§6.0), not UTC fallback (CRIT-007 fix)
        serviceDate: localDateOf(f.departure?.scheduledTime?.utc, ianaTimezone),
        populationRole,
        marketingCarrier: parsed?.carrier ?? "",
        marketingNumber: parsed?.number ?? "",
        providerFlightId: f.id ?? null,
      };
    });

  const deduped = dedupCodeshares(dedupInput);
  const flightInstanceIds = Array.from(deduped.values()).map((d) => d.instance.flight_instance_id);

  // Step 5: Truncation signal. The verified provider contract (max range,
  // truncation behavior) is a Gate-0.5 MEASURE→FREEZE item; until then this
  // named heuristic stands in — never a silent assumption.
  const truncated = allFlights.length >= FIDS_TRUNCATION_HEURISTIC_COUNT;

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
// Service date extraction (§6.0): airport-LOCAL date of scheduledGateOut
// ---------------------------------------------------------------------------

function localDateOf(utcIso: string | null | undefined, ianaTimezone: string): string {
  if (!utcIso) return new Date().toISOString().slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: ianaTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(utcIso));
    const d: Record<string, string> = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${d.year}-${d.month}-${d.day}`;
  } catch {
    return utcIso.slice(0, 10); // UTC-date fallback only when IANA conversion fails
  }
}

function extractServiceDate(utcIso: string | null | undefined): string {
  if (!utcIso) return new Date().toISOString().slice(0, 10);
  // Legacy UTC-date fallback; callers should use localDateOf() with the airport IANA tz.
  return utcIso.slice(0, 10);
}

// ---------------------------------------------------------------------------
// FIDS transport policy (§1.5.3): max 3 total attempts, transient-only retry
// ---------------------------------------------------------------------------

export interface FidsAttemptRecord {
  attemptNumber: number;
  outcome: "success" | "retryable_failure" | "non_retryable_failure" | "transport_error";
  statusCode: number | null;
  errorMessage: string | null;
}

export interface FidsRetryResult<T> {
  value: T | null;
  attempts: FidsAttemptRecord[];
  /** True when the category budget is exhausted and the caller must DEFER/REFUSE. */
  budgetExhausted: boolean;
}

/**
 * Execute a FIDS fetch with the binding transport policy:
 * - at most FIDS_MAX_TOTAL_ATTEMPTS (3) physical attempts;
 * - retry ONLY 429 / eligible 5xx / transport errors; never auth/validation 4xx;
 * - every attempt is recorded (caller debits its REST category budget BEFORE issuing).
 *
 * The fetcher is injectable so Phase-0 tests can prove the policy without a live API.
 * Budget debiting itself lives with the caller + REST ledger (Phase 0K); this
 * wrapper records attempts so the caller can debit exactly.
 */
export async function fetchFidsWithRetry<T>(
  fetcher: (attemptNumber: number) => Promise<{ ok: boolean; statusCode: number | null; value: T | null; errorMessage?: string | null }>,
): Promise<FidsRetryResult<T>> {
  const attempts: FidsAttemptRecord[] = [];
  for (let n = 1; n <= FIDS_MAX_TOTAL_ATTEMPTS; n++) {
    let r: { ok: boolean; statusCode: number | null; value: T | null; errorMessage?: string | null };
    try {
      r = await fetcher(n);
    } catch (err: any) {
      // Transport error (connect timeout/reset) is retryable unless attempts exhausted.
      attempts.push({ attemptNumber: n, outcome: "transport_error", statusCode: null, errorMessage: String(err?.message ?? err).slice(0, 200) });
      if (n >= FIDS_MAX_TOTAL_ATTEMPTS) break;
      continue;
    }
    if (r.ok && r.value !== null) {
      attempts.push({ attemptNumber: n, outcome: "success", statusCode: r.statusCode, errorMessage: null });
      return { value: r.value, attempts, budgetExhausted: false };
    }
    const code = r.statusCode;
    const retryable = code !== null && FIDS_RETRYABLE_STATUS.has(code);
    attempts.push({
      attemptNumber: n,
      outcome: retryable ? "retryable_failure" : "non_retryable_failure",
      statusCode: code,
      errorMessage: (r.errorMessage ?? "").slice(0, 200),
    });
    if (!retryable) break; // auth/validation 4xx and friends: never retry
    if (n >= FIDS_MAX_TOTAL_ATTEMPTS) break;
    // Note: Retry-After honoring + backoff+jitter live in the caller/limiter;
    // this wrapper enforces the attempt ceiling and the retryable split.
  }
  return { value: null, attempts, budgetExhausted: attempts.length >= FIDS_MAX_TOTAL_ATTEMPTS };
}

// ---------------------------------------------------------------------------
// Population-row builder (§1.5.3): append-only flight_population observations
// ---------------------------------------------------------------------------

export interface PopulationRowInput {
  sourceAirportIcao: string;
  queryDirection: "Departure" | "Arrival" | "Both";
  populationRole: PopulationRole;
  serviceWindowStartUtc: Date;
  serviceWindowEndUtc: Date;
  fromLocal: string;
  toLocal: string;
  airportIanaTimezone: string;
  flightNumber: string;
  carrierIata: string | null;
  carrierIcao: string | null;
  callSign: string | null;
  depAirportIcao: string | null;
  depAirportIata: string | null;
  arrAirportIcao: string | null;
  arrAirportIata: string | null;
  depScheduledUtc: Date | null;
  arrScheduledUtc: Date | null;
  /** Canonical physical-leg id (identity-v2) or null when provisional/ambiguous. */
  canonicalFlightInstanceId: string | null;
  providerRecordKey: string | null;
  rawPayloadSha256: string | null;
  scopeClassification: "confirmed_core" | "unknown" | "auxiliary";
  codeshareResolutionStatus: string | null;
  fidsRetrievalUtc: Date;
  responseHash: string;
  availableAtUtc: Date;
  cutoffUtc: Date;
  batchId: string | null;
}

export interface PopulationRow {
  batchId: string | null;
  sourceAirportIcao: string;
  windowStartUtc: Date;
  windowEndUtc: Date;
  cutoffUtc: Date;
  flightNumber: string;
  carrierIata: string | null;
  carrierIcao: string | null;
  callSign: string | null;
  depAirportIcao: string | null;
  depAirportIata: string | null;
  arrAirportIcao: string | null;
  arrAirportIata: string | null;
  depScheduledUtc: Date | null;
  arrScheduledUtc: Date | null;
  sourceType: "fids";
  providerRecordKey: string | null;
  rawPayloadSha256: string | null;
  /** JSON-encoded provenance the INSERT persists alongside the row. */
  provenanceJson: string;
}

/**
 * Build one append-only flight_population observation row (§1.5.3).
 * Pure function (no DB): the caller persists with INSERT ... ON CONFLICT
 * DO NOTHING on (source_airport_icao, cutoff_utc, flight_number,
 * carrier_iata, provider_record_key). Repeated observations never overwrite.
 */
export function buildPopulationRow(input: PopulationRowInput): PopulationRow {
  const provenance = {
    queryDirection: input.queryDirection,
    populationRole: input.populationRole,
    fromLocal: input.fromLocal,
    toLocal: input.toLocal,
    airportIanaTimezone: input.airportIanaTimezone,
    scopeClassification: input.scopeClassification,
    codeshareResolutionStatus: input.codeshareResolutionStatus,
    canonicalFlightInstanceId: input.canonicalFlightInstanceId,
    fidsRetrievalUtc: input.fidsRetrievalUtc.toISOString(),
    responseHash: input.responseHash,
    availableAtUtc: input.availableAtUtc.toISOString(),
  };
  return {
    batchId: input.batchId,
    sourceAirportIcao: input.sourceAirportIcao,
    windowStartUtc: input.serviceWindowStartUtc,
    windowEndUtc: input.serviceWindowEndUtc,
    cutoffUtc: input.cutoffUtc,
    flightNumber: input.flightNumber,
    carrierIata: input.carrierIata,
    carrierIcao: input.carrierIcao,
    callSign: input.callSign,
    depAirportIcao: input.depAirportIcao,
    depAirportIata: input.depAirportIata,
    arrAirportIcao: input.arrAirportIcao,
    arrAirportIata: input.arrAirportIata,
    depScheduledUtc: input.depScheduledUtc,
    arrScheduledUtc: input.arrScheduledUtc,
    sourceType: "fids",
    providerRecordKey: input.providerRecordKey,
    rawPayloadSha256: input.rawPayloadSha256,
    provenanceJson: JSON.stringify(provenance),
  };
}

/**
 * Persist population rows (append-only). Uses ON CONFLICT DO NOTHING on the
 * table's UNIQUE key so repeated horizon/retrieval observations never
 * overwrite. Returns inserted count.
 */
export async function persistPopulationRows(rows: PopulationRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (const r of rows) {
    try {
      const res = await pool.query(
        `INSERT INTO clean.flight_population
           (batch_id, source_airport_icao, window_start_utc, window_end_utc, cutoff_utc,
            flight_number, carrier_iata, carrier_icao, call_sign,
            dep_airport_icao, dep_airport_iata, arr_airport_icao, arr_airport_iata,
            dep_scheduled_utc, arr_scheduled_utc,
            source_type, provider_record_key, raw_payload_sha256)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)
         DO NOTHING`,
        [
          r.batchId, r.sourceAirportIcao, r.windowStartUtc, r.windowEndUtc, r.cutoffUtc,
          r.flightNumber, r.carrierIata, r.carrierIcao, r.callSign,
          r.depAirportIcao, r.depAirportIata, r.arrAirportIcao, r.arrAirportIata,
          r.depScheduledUtc, r.arrScheduledUtc,
          r.sourceType, r.providerRecordKey, r.rawPayloadSha256,
        ],
      );
      inserted += res.rowCount ?? 0;
    } catch (err: any) {
      console.error(`[fids-census] population persist failed:`, err?.message || err);
    }
  }
  return inserted;
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
