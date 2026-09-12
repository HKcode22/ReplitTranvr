/**
 * FIDS / flight_population census — V3.9-f.8 §§5.1-5.4, 6, 7.
 *
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§0–21.
 * The FIDS population is provider-observable and append-only. Canonical
 * physical-flight identity is never fabricated: missing/invalid provider-native
 * departure schedule or airport IANA timezone yields an unresolved/provisional
 * analytic record with canonical_flight_instance_id=NULL.
 */
import { createHash, randomUUID } from "crypto";
import { v39Pool as pool } from "./db_v39";
import { fetchFidsAirport } from "./aerodataboxLimiter_v3";
import {
  canonicalFlightInstanceId,
  type CanonicalFlightInstanceInput,
} from "./flightInstanceCanonical_v3";

export interface FidsCensusParams {
  airportIcao: string;
  fromLocal: string;
  toLocal: string;
  ianaTimezone: string;
  withCancelled: boolean;
  withCodeshared: boolean;
  withCargo?: boolean;
  withPrivate?: boolean;
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
export const FIDS_TRUNCATION_HEURISTIC_COUNT = 500;
export const FIDS_MAX_TOTAL_ATTEMPTS = 3;
export const FIDS_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export interface FidsCensusResult {
  airportIcao: string;
  fromLocal: string;
  toLocal: string;
  ianaTimezone: string;
  retrievalUtc: string;
  rawJson: unknown;
  responseHash: string;
  flightInstanceIds: string[];
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

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function normalizeIcao(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(v) ? v : null;
}

/** Validate an IANA timezone without substituting UTC. */
export function isValidIanaTimezone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

/**
 * Origin-local date of the verified provider-native schedule identity.
 * Missing/invalid schedule OR timezone => null. There is deliberately no
 * today's-date or UTC-date fallback.
 */
export function localServiceDateOrNull(
  utcIso: string | null | undefined,
  ianaTimezone: string | null | undefined,
): string | null {
  if (!utcIso || !ianaTimezone || !isValidIanaTimezone(ianaTimezone)) return null;
  const instant = new Date(utcIso);
  if (!Number.isFinite(instant.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: ianaTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return p.year && p.month && p.day ? `${p.year}-${p.month}-${p.day}` : null;
  } catch {
    return null;
  }
}

/** DST-aware UTC interval -> local provider request interval. Invalid timezone throws. */
export function utcIntervalToLocal(
  utcFrom: Date,
  utcTo: Date,
  ianaTimezone: string,
): { fromLocal: string; toLocal: string } {
  if (!Number.isFinite(utcFrom.getTime()) || !Number.isFinite(utcTo.getTime()) || utcTo <= utcFrom) {
    throw new Error("invalid FIDS UTC interval");
  }
  if (!isValidIanaTimezone(ianaTimezone)) throw new Error(`invalid airport IANA timezone: ${ianaTimezone}`);
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d).replace(",", "");
  return { fromLocal: fmt(utcFrom), toLocal: fmt(utcTo) };
}

function parseFlightNumber(raw: string | null | undefined): { carrier: string; number: string } | null {
  if (!raw || typeof raw !== "string") return null;
  const m = raw.trim().match(/^([A-Z0-9]{2})([0-9]{1,4})$/i);
  return m ? { carrier: m[1].toUpperCase(), number: m[2].replace(/^0+/, "") || "0" } : null;
}

export type ScopeClassification = "confirmed_core" | "unknown" | "auxiliary";
export function classifyScope(input: {
  isCargo?: boolean | null;
  isPrivate?: boolean | null;
  isCharter?: boolean | null;
  status?: string | number | null;
}): ScopeClassification {
  if (input.isCargo === true || input.isPrivate === true) return "auxiliary";
  if (input.isCharter === true) return "unknown";
  if (input.isCharter === false) return "confirmed_core";
  if (input.isCargo === false && input.isPrivate === false) return "confirmed_core";
  return "unknown";
}

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
  canonicalFlightInstanceId: string | null;
  analyticIdentityId: string;
  populationQueryId: string;
  providerRecordKey: string | null;
  rawPayloadSha256: string | null;
  scopeClassification: ScopeClassification;
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
  provenanceJson: string;
  populationQueryId: string;
  queryDirection: "Departure" | "Arrival" | "Both";
  populationRole: PopulationRole;
  fromLocal: string;
  toLocal: string;
  airportIanaTimezone: string;
  scopeClassification: ScopeClassification;
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

export function buildPopulationRow(input: PopulationRowInput): PopulationRow {
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
    provenanceJson: JSON.stringify({
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
    }),
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

interface NormalizedFidsRecord {
  row: PopulationRow;
  resolvedCanonical: string | null;
}

function provisionalRecordKey(source: any, direction: string, index: number): string {
  if (typeof source?.id === "string" && source.id.trim()) return source.id.trim();
  return `fidsrec:${sha256(JSON.stringify({ direction, index, number: source?.number ?? null, departure: source?.departure ?? null, arrival: source?.arrival ?? null })).slice(0, 24)}`;
}

function normalizeFidsRecord(input: {
  source: any;
  sourceIndex: number;
  movement: "departure" | "arrival";
  params: FidsCensusParams;
  populationQueryId: string;
  retrievalUtc: Date;
  availableAtUtc: Date;
  responseHash: string;
}): NormalizedFidsRecord | null {
  const { source: f, movement, params } = input;
  const selectedUtc = movement === "departure"
    ? isoOrNull(f?.departure?.scheduledTime?.utc)
    : isoOrNull(f?.arrival?.scheduledTime?.utc);
  if (!selectedUtc) return null;
  const selectedMs = new Date(selectedUtc).getTime();
  if (selectedMs < params.serviceWindowStartUtc.getTime() || selectedMs >= params.serviceWindowEndUtc.getTime()) return null;
  if (!params.withCargo && f?.isCargo === true) return null;
  if (!params.withPrivate && (f?.isPrivate === true || f?.isGeneralAviation === true)) return null;
  if (!params.withCancelled && (f?.status === "Canceled" || f?.status === 10)) return null;
  if (!params.withCodeshared && (f?.codeshareStatus === "IsCodeshared" || f?.codeshareStatus === 2)) return null;

  const parsed = parseFlightNumber(f?.number);
  const depIcao = normalizeIcao(f?.departure?.airport?.icao);
  const arrIcao = normalizeIcao(f?.arrival?.airport?.icao);
  const depSchedule = isoOrNull(f?.departure?.scheduledTime?.utc);
  const serviceDate = localServiceDateOrNull(depSchedule, params.ianaTimezone);
  const providerRecordKey = provisionalRecordKey(f, movement, input.sourceIndex);
  const populationRole: PopulationRole = params.direction === "Arrival"
    ? (movement === "arrival" ? "requested_airport_primary" : "opposite_movement_context")
    : (movement === "departure" ? "requested_airport_primary" : "opposite_movement_context");

  let canonical: string | null = null;
  let analyticIdentityId: string;
  let identityStatus: string;
  if (parsed && depIcao && arrIcao && depSchedule && serviceDate) {
    const identityInput: CanonicalFlightInstanceInput = {
      operatingCarrier: parsed.carrier,
      operatingFlightNumber: parsed.number,
      origin: depIcao,
      destinationOriginal: arrIcao,
      scheduledGateOutUtc: depSchedule,
      serviceDate,
      initialServiceDate: serviceDate,
      firstScheduledGateOutUtc: depSchedule,
      providerFlightId: typeof f?.id === "string" ? f.id : null,
      providerRecordKey,
      callsign: f?.callSign ?? null,
    };
    canonical = canonicalFlightInstanceId(identityInput).flight_instance_id;
    analyticIdentityId = canonical;
    identityStatus = (f?.codeshareStatus === "Unknown" || f?.codeshareStatus === 0 || f?.codeshareStatus == null)
      ? "ambiguous_codeshare"
      : "confirmed_operating_leg";
  } else {
    analyticIdentityId = `provisional:${sha256(JSON.stringify({ providerRecordKey, number: f?.number ?? null, depIcao, arrIcao, depSchedule, serviceDate })).slice(0, 24)}`;
    identityStatus = "ambiguous_distinct_leg";
  }

  // Unknown codeshare never becomes a confirmed canonical operating leg.
  const canonicalForPopulation = identityStatus === "confirmed_operating_leg" ? canonical : null;
  const flightNumber = parsed ? `${parsed.carrier}${parsed.number}` : String(f?.number ?? "UNKNOWN");
  const row = buildPopulationRow({
    sourceAirportIcao: params.airportIcao,
    queryDirection: params.direction ?? "Both",
    populationRole,
    serviceWindowStartUtc: params.serviceWindowStartUtc,
    serviceWindowEndUtc: params.serviceWindowEndUtc,
    fromLocal: params.fromLocal,
    toLocal: params.toLocal,
    airportIanaTimezone: params.ianaTimezone,
    flightNumber,
    carrierIata: parsed?.carrier ?? null,
    carrierIcao: f?.airline?.icao ?? null,
    callSign: f?.callSign ?? null,
    depAirportIcao: depIcao,
    depAirportIata: f?.departure?.airport?.iata ?? null,
    arrAirportIcao: arrIcao,
    arrAirportIata: f?.arrival?.airport?.iata ?? null,
    depScheduledUtc: depSchedule ? new Date(depSchedule) : null,
    arrScheduledUtc: isoOrNull(f?.arrival?.scheduledTime?.utc) ? new Date(f.arrival.scheduledTime.utc) : null,
    canonicalFlightInstanceId: canonicalForPopulation,
    analyticIdentityId,
    populationQueryId: input.populationQueryId,
    providerRecordKey,
    rawPayloadSha256: input.responseHash,
    scopeClassification: classifyScope(f ?? {}),
    codeshareResolutionStatus: identityStatus,
    fidsRetrievalUtc: input.retrievalUtc,
    responseHash: input.responseHash,
    availableAtUtc: input.availableAtUtc,
    cutoffUtc: params.cutoffUtc,
    batchId: params.batchId ?? null,
    providerApiVersion: params.providerApiVersion,
    fidsProtocolVersion: params.fidsProtocolVersion,
    openapiSha256: params.openapiSha256,
  });
  return { row, resolvedCanonical: canonicalForPopulation };
}

export async function fetchFidsPopulation(
  params: FidsCensusParams,
  deps: FidsCensusDependencies = {},
): Promise<FidsCensusResult | null> {
  if (!isValidIanaTimezone(params.ianaTimezone)) {
    throw new Error(`FIDS population refused: invalid airport IANA timezone ${params.ianaTimezone}`);
  }
  if (!Number.isFinite(params.serviceWindowStartUtc.getTime()) ||
      !Number.isFinite(params.serviceWindowEndUtc.getTime()) ||
      params.serviceWindowEndUtc <= params.serviceWindowStartUtc) {
    throw new Error("FIDS population refused: invalid service window");
  }

  const direction = params.direction ?? "Both";
  const fids = await (deps.fetchAirport ?? fetchFidsAirport)(
    params.airportIcao,
    params.fromLocal,
    params.toLocal,
    { direction, withLeg: true, category: params.restCategory },
  );
  if (!fids) return null;

  const retrievalUtc = (deps.now ?? (() => new Date()))();
  const rawPayload = {
    airport: params.airportIcao,
    fromLocal: params.fromLocal,
    toLocal: params.toLocal,
    ianaTimezone: params.ianaTimezone,
    departures: fids.departures,
    arrivals: fids.arrivals,
    fetchedAtUtc: retrievalUtc.toISOString(),
  };
  const responseHash = sha256(JSON.stringify(rawPayload));
  const populationQueryId = randomUUID();
  // Pre-persistence timestamp is only a lower bound. persistFidsObservation
  // replaces row availability with its durable transaction timestamp.
  const availableAtUtc = (deps.now ?? (() => new Date()))();

  const sourceRecords = [
    ...fids.departures.map((source: any, index: number) => ({ source, sourceIndex: index, movement: "departure" as const })),
    ...fids.arrivals.map((source: any, index: number) => ({ source, sourceIndex: index, movement: "arrival" as const })),
  ];
  const normalized = sourceRecords
    .map((r) => normalizeFidsRecord({ ...r, params, populationQueryId, retrievalUtc, availableAtUtc, responseHash }))
    .filter((r): r is NormalizedFidsRecord => r !== null);

  const rows = normalized.map((r) => r.row);
  const flightInstanceIds = Array.from(new Set(normalized.map((r) => r.resolvedCanonical).filter((x): x is string => !!x)));
  const query: FidsQueryObservation = {
    populationQueryId,
    sourceAirportIcao: params.airportIcao,
    queryDirection: direction,
    serviceWindowStartUtc: params.serviceWindowStartUtc,
    serviceWindowEndUtc: params.serviceWindowEndUtc,
    fromLocal: params.fromLocal,
    toLocal: params.toLocal,
    airportIanaTimezone: params.ianaTimezone,
    fidsRetrievalUtc: retrievalUtc,
    availableAtUtc,
    responseHash,
    rawPayload,
    providerApiVersion: params.providerApiVersion,
    fidsProtocolVersion: params.fidsProtocolVersion,
    openapiSha256: params.openapiSha256,
  };
  const persistedPopulationRows = await (deps.persist ?? persistFidsObservation)(query, rows);
  return {
    airportIcao: params.airportIcao,
    fromLocal: params.fromLocal,
    toLocal: params.toLocal,
    ianaTimezone: params.ianaTimezone,
    retrievalUtc: retrievalUtc.toISOString(),
    rawJson: rawPayload,
    responseHash,
    flightInstanceIds,
    flightCount: rows.length,
    truncated: sourceRecords.length >= FIDS_TRUNCATION_HEURISTIC_COUNT,
    populationQueryId,
    persistedPopulationRows,
  };
}

export interface FidsAttemptRecord {
  attemptNumber: number;
  outcome: "success" | "retryable_failure" | "non_retryable_failure" | "transport_error";
  statusCode: number | null;
  errorMessage: string | null;
}
export interface FidsRetryResult<T> {
  value: T | null;
  attempts: FidsAttemptRecord[];
  budgetExhausted: boolean;
}

export async function fetchFidsWithRetry<T>(
  fetcher: (attemptNumber: number) => Promise<{ ok: boolean; statusCode: number | null; value: T | null; errorMessage?: string | null }>,
): Promise<FidsRetryResult<T>> {
  const attempts: FidsAttemptRecord[] = [];
  for (let n = 1; n <= FIDS_MAX_TOTAL_ATTEMPTS; n++) {
    try {
      const r = await fetcher(n);
      if (r.ok && r.value !== null) {
        attempts.push({ attemptNumber: n, outcome: "success", statusCode: r.statusCode, errorMessage: null });
        return { value: r.value, attempts, budgetExhausted: false };
      }
      const retryable = r.statusCode !== null && FIDS_RETRYABLE_STATUS.has(r.statusCode);
      attempts.push({ attemptNumber: n, outcome: retryable ? "retryable_failure" : "non_retryable_failure", statusCode: r.statusCode, errorMessage: (r.errorMessage ?? "").slice(0, 200) });
      if (!retryable) break;
    } catch (error: any) {
      attempts.push({ attemptNumber: n, outcome: "transport_error", statusCode: null, errorMessage: String(error?.message ?? error).slice(0, 200) });
    }
  }
  return { value: null, attempts, budgetExhausted: attempts.length >= FIDS_MAX_TOTAL_ATTEMPTS };
}

export async function persistPopulationRows(rows: PopulationRow[]): Promise<number> {
  if (!rows.length) return 0;
  let inserted = 0;
  for (const r of rows) {
    const res = await pool.query(
      `INSERT INTO clean.flight_population
       (batch_id, source_airport_icao, window_start_utc, window_end_utc, cutoff_utc,
        flight_number, carrier_iata, carrier_icao, call_sign, dep_airport_icao,
        dep_airport_iata, arr_airport_icao, arr_airport_iata, dep_scheduled_utc,
        arr_scheduled_utc, source_type, provider_record_key, raw_payload_sha256,
        population_query_id, query_direction, population_role, from_local, to_local,
        airport_iana_timezone, scope_classification, codeshare_resolution_status,
        fids_retrieval_utc, available_at, response_hash, canonical_flight_instance_id,
        analytic_identity_id, provider_api_version, fids_protocol_version, openapi_sha256)
       VALUES (${Array.from({ length: 34 }, (_, i) => `$${i + 1}`).join(",")})
       ON CONFLICT (population_query_id, analytic_identity_id, population_role) DO NOTHING`,
      [r.batchId,r.sourceAirportIcao,r.windowStartUtc,r.windowEndUtc,r.cutoffUtc,r.flightNumber,
       r.carrierIata,r.carrierIcao,r.callSign,r.depAirportIcao,r.depAirportIata,r.arrAirportIcao,
       r.arrAirportIata,r.depScheduledUtc,r.arrScheduledUtc,r.sourceType,r.providerRecordKey,
       r.rawPayloadSha256,r.populationQueryId,r.queryDirection,r.populationRole,r.fromLocal,r.toLocal,
       r.airportIanaTimezone,r.scopeClassification,r.codeshareResolutionStatus,r.fidsRetrievalUtc,
       r.availableAtUtc,r.responseHash,r.canonicalFlightInstanceId,r.analyticIdentityId,
       r.providerApiVersion,r.fidsProtocolVersion,r.openapiSha256],
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}

/** Raw FIDS response and normalized membership persist atomically. */
export async function persistFidsObservation(
  query: FidsQueryObservation,
  rows: PopulationRow[],
): Promise<number> {
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

export interface BatchFidsResult {
  airports: FidsCensusResult[];
  failed: string[];
  totalFlightInstances: number;
}
export async function fetchBatchFidsPopulation(
  params: FidsCensusParams[],
  deps: FidsCensusDependencies = {},
): Promise<BatchFidsResult> {
  const airports: FidsCensusResult[] = [];
  const failed: string[] = [];
  let totalFlightInstances = 0;
  for (const p of params) {
    const result = await fetchFidsPopulation(p, deps);
    if (!result) failed.push(p.airportIcao);
    else {
      airports.push(result);
      totalFlightInstances += result.flightInstanceIds.length;
    }
  }
  return { airports, failed, totalFlightInstances };
}

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
function rateOrNull(numerator: number, denominator: number, reason: string): PreCounterRate {
  return denominator <= 0
    ? { numerator, denominator, rate: null, reason }
    : { numerator, denominator, rate: numerator / denominator, reason: null };
}
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
