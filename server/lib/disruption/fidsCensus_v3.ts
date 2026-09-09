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

import { createHash, randomUUID } from "crypto";
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
  serviceWindowStartUtc: Date;
  serviceWindowEndUtc: Date;
  cutoffUtc: Date;
  batchId?: string | null;
  restCategory?: "fids_base" | "fids_split" | "validation" | "outcome";
  providerApiVersion: string;
  fidsProtocolVersion: string;
  openapiSha256: string;
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
  populationQueryId: string;
  persistedPopulationRows: number;
}

export interface FidsCensusDependencies {
  fetchAirport?: typeof fetchFidsAirport;
  persist?: (query: FidsQueryObservation, rows: PopulationRow[]) => Promise<number>;
  now?: () => Date;
}

export interface FidsQueryObservation {
  populationQueryId: string;
  sourceAirportIcao: string;
  queryDirection: "Departure" | "Arrival" | "Both";
  serviceWindowStartUtc: Date;
  serviceWindowEndUtc: Date;
  fromLocal: string;
  toLocal: string;
  airportIanaTimezone: string;
  fidsRetrievalUtc: Date;
  availableAtUtc: Date;
  responseHash: string;
  rawPayload: unknown;
  providerApiVersion: string;
  fidsProtocolVersion: string;
  openapiSha256: string;
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
export async function fetchFidsPopulation(params: FidsCensusParams, deps: FidsCensusDependencies = {}): Promise<FidsCensusResult | null> {
  const {
    airportIcao, fromLocal, toLocal, ianaTimezone,
    withCancelled, withCodeshared,
    withCargo = false, withPrivate = false,
    direction = "Both",
  } = params;

  // Step 1: Call FIDS endpoint (§1.5.3 contract: withLeg=true, explicit direction)
  const fids = await (deps.fetchAirport ?? fetchFidsAirport)(airportIcao, fromLocal, toLocal, {
    direction,
    withLeg: true,
    category: params.restCategory,
  });

  if (!fids) {
    console.warn(`[fids-census] FIDS fetch failed for ${airportIcao} ${fromLocal}→${toLocal}`);
    return null;
  }

  // Step 2: Combine departures + arrivals into a single raw payload
  const retrievalUtc = (deps.now ?? (() => new Date()))();
  const rawPayload = {
    airport: airportIcao,
    fromLocal,
    toLocal,
    ianaTimezone,
    departures: fids.departures,
    arrivals: fids.arrivals,
    fetchedAtUtc: retrievalUtc.toISOString(),
  };
  const rawJson = JSON.stringify(rawPayload);
  const responseHash = sha256(rawJson);

  // Step 3: Build immutable membership observations.
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
      const selectedUtc = f._direction === "departure"
        ? f.departure?.scheduledTime?.utc
        : f.arrival?.scheduledTime?.utc;
      const selectedMs = selectedUtc ? new Date(selectedUtc).getTime() : Number.NaN;
      if (!Number.isFinite(selectedMs) || selectedMs < params.serviceWindowStartUtc.getTime() || selectedMs >= params.serviceWindowEndUtc.getTime()) return false;
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
        direction === "Arrival"
          ? (f._direction === "arrival" ? "requested_airport_primary" : "opposite_movement_context")
          : (f._direction === "departure" ? "requested_airport_primary" : "opposite_movement_context");
      // §1.5.4 item 4 / ChatGPT round-3 item 7: initial_service_date is the
      // ORIGIN-LOCAL date of the first verified schedule identity — immutable
      // across later retimes. Computed here (FIDS path carries the airport IANA
      // timezone) and passed explicitly so identity-v2 never falls back to UTC.
      const localServiceDate = localDateOf(f.departure?.scheduledTime?.utc, ianaTimezone);
      return {
        operatingCarrier: parsed?.carrier ?? "",
        operatingFlightNumber: parsed?.number ?? "",
        origin: depAirport.icao ?? "",
        destinationOriginal: arrAirport.icao ?? "",
        scheduledGateOutUtc: f.departure?.scheduledTime?.utc ?? "",
        // Airport-LOCAL service date (§6.0), not UTC fallback (CRIT-007 fix)
        serviceDate: localServiceDate,
        initialServiceDate: localServiceDate,
        populationRole,
        marketingCarrier: parsed?.carrier ?? "",
        marketingNumber: parsed?.number ?? "",
        providerFlightId: f.id ?? null,
        codeshareStatus: f.codeshareStatus ?? null,
        _source: f,
      };
    });

  const deduped = dedupCodeshares(dedupInput);
  const flightInstanceIds = Array.from(deduped.values()).map((d) => d.instance.flight_instance_id);

  const populationQueryId = randomUUID();
  const availableAtUtc = (deps.now ?? (() => new Date()))();
  const rows = dedupInput.map((flight) => {
    const source = flight._source as any;
    const identity = canonicalFlightInstanceId(flight);
    const codeshareResolutionStatus = source?.codeshareStatus === "IsOperator" || source?.codeshareStatus === 1
      ? "resolved_operator"
      : source?.codeshareStatus === "IsCodeshared" || source?.codeshareStatus === 2
        ? "resolved_marketing"
        : "ambiguous_unknown";
    return buildPopulationRow({
      sourceAirportIcao: airportIcao, queryDirection: direction,
      populationRole: flight.populationRole as PopulationRole,
      serviceWindowStartUtc: params.serviceWindowStartUtc, serviceWindowEndUtc: params.serviceWindowEndUtc,
      fromLocal, toLocal, airportIanaTimezone: ianaTimezone,
      flightNumber: `${flight.operatingCarrier}${flight.operatingFlightNumber}`,
      carrierIata: flight.operatingCarrier || null, carrierIcao: null, callSign: source?.callSign ?? null,
      depAirportIcao: flight.origin || null, depAirportIata: source?.departure?.airport?.iata ?? null,
      arrAirportIcao: flight.destinationOriginal || null, arrAirportIata: source?.arrival?.airport?.iata ?? null,
      depScheduledUtc: flight.scheduledGateOutUtc ? new Date(flight.scheduledGateOutUtc) : null,
      arrScheduledUtc: source?.arrival?.scheduledTime?.utc ? new Date(source.arrival.scheduledTime.utc) : null,
      canonicalFlightInstanceId: codeshareResolutionStatus === "ambiguous_unknown" ? null : identity.flight_instance_id,
      analyticIdentityId: identity.flight_instance_id,
      providerRecordKey: flight.providerFlightId ?? null, rawPayloadSha256: responseHash,
      scopeClassification: classifyScope(source ?? {}), codeshareResolutionStatus,
      fidsRetrievalUtc: retrievalUtc, responseHash, availableAtUtc, cutoffUtc: params.cutoffUtc,
      batchId: params.batchId ?? null, populationQueryId,
      providerApiVersion: params.providerApiVersion, fidsProtocolVersion: params.fidsProtocolVersion,
      openapiSha256: params.openapiSha256,
    });
  });
  const query: FidsQueryObservation = {
    populationQueryId, sourceAirportIcao: airportIcao, queryDirection: direction,
    serviceWindowStartUtc: params.serviceWindowStartUtc, serviceWindowEndUtc: params.serviceWindowEndUtc,
    fromLocal, toLocal, airportIanaTimezone: ianaTimezone, fidsRetrievalUtc: retrievalUtc,
    availableAtUtc, responseHash, rawPayload, providerApiVersion: params.providerApiVersion,
    fidsProtocolVersion: params.fidsProtocolVersion, openapiSha256: params.openapiSha256,
  };
  // Raw and normalized persistence is one transaction. Any provenance failure rejects the fetch.
  const persistedPopulationRows = await (deps.persist ?? persistFidsObservation)(query, rows);

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
    populationQueryId,
    persistedPopulationRows,
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
  analyticIdentityId: string;
  populationQueryId: string;
  providerRecordKey: string | null;
  rawPayloadSha256: string | null;
  scopeClassification: "confirmed_core" | "unknown" | "auxiliary";
  codeshareResolutionStatus: string | null;
  fidsRetrievalUtc: Date;
  responseHash: string;
  availableAtUtc: Date;
  cutoffUtc: Date;
  batchId: string | null;
  providerApiVersion: string;
  fidsProtocolVersion: string;
  openapiSha256: string;
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
  populationQueryId: string;
  queryDirection: "Departure" | "Arrival" | "Both";
  populationRole: PopulationRole;
  fromLocal: string;
  toLocal: string;
  airportIanaTimezone: string;
  scopeClassification: "confirmed_core" | "unknown" | "auxiliary";
  codeshareResolutionStatus: string | null;
  fidsRetrievalUtc: Date;
  availableAtUtc: Date;
  responseHash: string;
  canonicalFlightInstanceId: string | null;
  analyticIdentityId: string;
  providerApiVersion: string;
  fidsProtocolVersion: string;
  openapiSha256: string;
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
    providerApiVersion: input.providerApiVersion,
    fidsProtocolVersion: input.fidsProtocolVersion,
    openapiSha256: input.openapiSha256,
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
    populationQueryId: input.populationQueryId,
    queryDirection: input.queryDirection,
    populationRole: input.populationRole,
    fromLocal: input.fromLocal,
    toLocal: input.toLocal,
    airportIanaTimezone: input.airportIanaTimezone,
    scopeClassification: input.scopeClassification,
    codeshareResolutionStatus: input.codeshareResolutionStatus,
    fidsRetrievalUtc: input.fidsRetrievalUtc,
    availableAtUtc: input.availableAtUtc,
    responseHash: input.responseHash,
    canonicalFlightInstanceId: input.canonicalFlightInstanceId,
    analyticIdentityId: input.analyticIdentityId,
    providerApiVersion: input.providerApiVersion,
    fidsProtocolVersion: input.fidsProtocolVersion,
    openapiSha256: input.openapiSha256,
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
      const res = await pool.query(
        `INSERT INTO clean.flight_population
           (batch_id, source_airport_icao, window_start_utc, window_end_utc, cutoff_utc,
            flight_number, carrier_iata, carrier_icao, call_sign,
            dep_airport_icao, dep_airport_iata, arr_airport_icao, arr_airport_iata,
            dep_scheduled_utc, arr_scheduled_utc,
             source_type, provider_record_key, raw_payload_sha256,
             population_query_id, query_direction, population_role, from_local, to_local,
             airport_iana_timezone, scope_classification, codeshare_resolution_status,
             fids_retrieval_utc, available_at, response_hash, canonical_flight_instance_id,
             analytic_identity_id, provider_api_version, fids_protocol_version, openapi_sha256)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                  $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)
          ON CONFLICT (population_query_id, analytic_identity_id, population_role)
          DO NOTHING`,
        [
          r.batchId, r.sourceAirportIcao, r.windowStartUtc, r.windowEndUtc, r.cutoffUtc,
          r.flightNumber, r.carrierIata, r.carrierIcao, r.callSign,
          r.depAirportIcao, r.depAirportIata, r.arrAirportIcao, r.arrAirportIata,
          r.depScheduledUtc, r.arrScheduledUtc,
           r.sourceType, r.providerRecordKey, r.rawPayloadSha256,
           r.populationQueryId, r.queryDirection, r.populationRole, r.fromLocal, r.toLocal,
           r.airportIanaTimezone, r.scopeClassification, r.codeshareResolutionStatus,
           r.fidsRetrievalUtc, r.availableAtUtc, r.responseHash, r.canonicalFlightInstanceId,
           r.analyticIdentityId, r.providerApiVersion, r.fidsProtocolVersion, r.openapiSha256,
         ],
       );
       inserted += res.rowCount ?? 0;
  }
  return inserted;
}

export async function persistFidsObservation(query: FidsQueryObservation, rows: PopulationRow[]): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const rawInsert = await client.query(
      `INSERT INTO clean.fids_query_response
       (population_query_id, source_airport_icao, query_direction, service_window_start_utc,
        service_window_end_utc, from_local, to_local, airport_iana_timezone, fids_retrieval_utc,
        raw_persisted_at_utc, available_at, response_hash, raw_payload, provider_api_version,
        fids_protocol_version, openapi_sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),GREATEST($10,now()),$11,$12,$13,$14,$15)
       RETURNING available_at`,
      [query.populationQueryId, query.sourceAirportIcao, query.queryDirection,
       query.serviceWindowStartUtc, query.serviceWindowEndUtc, query.fromLocal, query.toLocal,
       query.airportIanaTimezone, query.fidsRetrievalUtc, query.availableAtUtc, query.responseHash,
       query.rawPayload, query.providerApiVersion, query.fidsProtocolVersion, query.openapiSha256],
    );
    const durableAvailableAt = rawInsert.rows[0].available_at;
    let inserted = 0;
    for (const r of rows) {
      const result = await client.query(
        `INSERT INTO clean.flight_population
         (batch_id, source_airport_icao, window_start_utc, window_end_utc, cutoff_utc,
          flight_number, carrier_iata, carrier_icao, call_sign, dep_airport_icao, dep_airport_iata,
          arr_airport_icao, arr_airport_iata, dep_scheduled_utc, arr_scheduled_utc, source_type,
          provider_record_key, raw_payload_sha256, population_query_id, query_direction,
          population_role, from_local, to_local, airport_iana_timezone, scope_classification,
          codeshare_resolution_status, fids_retrieval_utc, available_at, response_hash,
          canonical_flight_instance_id, analytic_identity_id, provider_api_version,
          fids_protocol_version, openapi_sha256)
         VALUES (${Array.from({ length: 34 }, (_, i) => `$${i + 1}`).join(",")})
         ON CONFLICT (population_query_id, analytic_identity_id, population_role) DO NOTHING`,
        [r.batchId,r.sourceAirportIcao,r.windowStartUtc,r.windowEndUtc,r.cutoffUtc,r.flightNumber,
         r.carrierIata,r.carrierIcao,r.callSign,r.depAirportIcao,r.depAirportIata,r.arrAirportIcao,
         r.arrAirportIata,r.depScheduledUtc,r.arrScheduledUtc,r.sourceType,r.providerRecordKey,
         r.rawPayloadSha256,r.populationQueryId,r.queryDirection,r.populationRole,r.fromLocal,r.toLocal,
         r.airportIanaTimezone,r.scopeClassification,r.codeshareResolutionStatus,r.fidsRetrievalUtc,
         durableAvailableAt,r.responseHash,r.canonicalFlightInstanceId,r.analyticIdentityId,
         r.providerApiVersion,r.fidsProtocolVersion,r.openapiSha256],
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query("COMMIT");
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
  deps: FidsCensusDependencies = {},
): Promise<BatchFidsResult> {
  const airports: FidsCensusResult[] = [];
  const failed: string[] = [];
  let totalFlightInstances = 0;

  for (const p of params) {
    const result = await fetchFidsPopulation(p, deps);
    if (result) {
      airports.push(result);
      totalFlightInstances += result.flightInstanceIds.length;
    } else {
      failed.push(p.airportIcao);
    }
  }

  return { airports, failed, totalFlightInstances };
}

// ---------------------------------------------------------------------------
// PRE population/capture counters (§1.5.3): persist numerator + denominator,
// never only rates. A zero denominator yields rate=NULL + reason, never zero.
// ---------------------------------------------------------------------------

export interface PreCountersInput {
  populationCount: number;
  horizonEligibleCount: number;
  snapshotCreatedCount: number;
  webhookCapturedCount: number;
  requiredFeaturesCompleteCount: number;
  optionalFeatureMissingCount: number;
  targetObservedCount: number;
  targetApplicableCount: number;
  confirmedOperatingLegCount: number;
  ambiguousCodeshareRecordCount: number;
}

export interface PreCounterRate {
  numerator: number;
  denominator: number;
  rate: number | null;
  reason: string | null;
}

export interface PreCounters {
  populationCount: number;
  horizonEligibleCount: number;
  snapshotExpectedCount: number;
  snapshotCreated: PreCounterRate;
  webhookCaptured: PreCounterRate;
  requiredFeaturesComplete: PreCounterRate;
  optionalFeatureMissing: PreCounterRate;
  targetObserved: PreCounterRate;
  confirmedOperatingLegCount: number;
  ambiguousCodeshareRecordCount: number;
}

function rateOrNull(numerator: number, denominator: number, emptyReason: string): PreCounterRate {
  if (denominator <= 0) return { numerator, denominator, rate: null, reason: emptyReason };
  return { numerator, denominator, rate: numerator / denominator, reason: null };
}

/** Build the required PRE counter set from raw counts (§1.5.3). */
export function buildPreCounters(input: PreCountersInput): PreCounters {
  return {
    populationCount: input.populationCount,
    horizonEligibleCount: input.horizonEligibleCount,
    snapshotExpectedCount: input.horizonEligibleCount,
    snapshotCreated: rateOrNull(input.snapshotCreatedCount, input.horizonEligibleCount, "no horizon-eligible flights"),
    webhookCaptured: rateOrNull(input.webhookCapturedCount, input.horizonEligibleCount, "no horizon-eligible flights"),
    requiredFeaturesComplete: rateOrNull(input.requiredFeaturesCompleteCount, input.snapshotCreatedCount, "no snapshots created"),
    optionalFeatureMissing: rateOrNull(input.optionalFeatureMissingCount, input.snapshotCreatedCount, "no snapshots created"),
    targetObserved: rateOrNull(input.targetObservedCount, input.targetApplicableCount, "no target-applicable snapshots"),
    confirmedOperatingLegCount: input.confirmedOperatingLegCount,
    ambiguousCodeshareRecordCount: input.ambiguousCodeshareRecordCount,
  };
}

// ---------------------------------------------------------------------------
// Scope classification (§1.5.3 / Plan §4.3): cargo/private excluded only when
// positively classifiable; otherwise 'unknown' (never guessed into the core).
// ---------------------------------------------------------------------------

export type ScopeClassification = "confirmed_core" | "unknown" | "auxiliary";

/** Classify one FIDS record into the population scope taxonomy. */
export function classifyScope(input: {
  isCargo?: boolean | null;
  isPrivate?: boolean | null;
  isCharter?: boolean | null;
  status?: string | number | null;
}): ScopeClassification {
  if (input.isCargo === true || input.isPrivate === true) return "auxiliary";
  if (input.isCharter === true) return "unknown"; // excluded only when positively classifiable → stays unknown
  if (input.isCharter === false) return "confirmed_core";
  // Scheduled commercial passenger is the default core ONLY when the record
  // is positively not cargo/private/charter; genuinely unknown stays unknown.
  if (input.isCargo === false && input.isPrivate === false) return "confirmed_core";
  return "unknown";
}
