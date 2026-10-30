/**
 * FIDS / flight_population census — V3.9-f.8 §§5.1-5.4, 6, 7.
 *
 * Binding authority: data-collection/plans/V3.9_DataCollectPlan_f.8.md §§0–21.
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

/**
 * Exact application-intended FIDS query frame for NEW observations.
 * Frozen inside the reconstructed FIDS JSON and its existing response hash.
 * This is NOT a network byte-for-byte receipt or operator-flight proof.
 */
export function buildFidsRequestContractV39(params:FidsCensusParams){
 const direction=params.direction??"Both";
 if(!["Departure","Arrival","Both"].includes(direction)||
    typeof params.withCancelled!=="boolean"||
    typeof params.withCodeshared!=="boolean"||
    (params.withCargo!==undefined&&typeof params.withCargo!=="boolean")||
    (params.withPrivate!==undefined&&typeof params.withPrivate!=="boolean"))
  throw new Error("FIDS_REQUEST_FRAME_INVALID");
 if(!/^[A-Z]{4}$/.test(params.airportIcao)||
    !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(params.fromLocal)||
    !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(params.toLocal))
  throw new Error("FIDS_REQUEST_AIRPORT_OR_LOCAL_RANGE_INVALID");
 return {
  schema:"v39.fids-request-frame.application-intent.v1" as const,
  originalHttpBytesPreserved:false as const,
  sourceTransportRequestReceiptVerified:false as const,
  endpointKind:"airport_local_fids" as const,
  airportIcao:params.airportIcao,
  fromLocal:params.fromLocal,toLocal:params.toLocal,
  direction,withLeg:true as const,
  withCancelled:params.withCancelled,
  withCodeshared:params.withCodeshared,
  withCargo:params.withCargo??false,
  withPrivate:params.withPrivate??false,
  withLocation:false as const,
  providerApiVersion:params.providerApiVersion,
  fidsProtocolVersion:params.fidsProtocolVersion,
  openapiSha256:params.openapiSha256
 };
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
  // AeroDataBox WSSS FIDS used spaced two-character flight numbers in
  // all 15 original Gate05e records. Accept an optional space or tab
  // only before 1–4 digits; reject malformed / three-character formats.
  // Codeshare role and origin-evidence checks remain independently strict.
  const m = raw.trim().match(/^([A-Z0-9]{2})[ \t]*([0-9]{1,4})$/i);
  return m ? { carrier: m[1].toUpperCase(), number: m[2].replace(/^0+/, "") || "0" } : null;
}

export type ScopeClassification = "confirmed_core" | "unknown" | "auxiliary";
/**
 * Scope is a positive-evidence classification, not a negative inference.
 * A provider query with withCargo=false/withPrivate=false does NOT establish
 * that charter/unscheduled status is explicitly known on each returned row.
 * An absent field is unknown, never the Boolean false.
 */
export function classifyScope(input: {
  isCargo?: boolean | null;
  isPrivate?: boolean | null;
  isGeneralAviation?: boolean | null;
  isCharter?: boolean | null;
  status?: string | number | null;
}): ScopeClassification {
  if (input.isCargo === true || input.isPrivate === true ||
      input.isGeneralAviation === true) return "auxiliary";
  // Positive charter evidence remains outside confirmed core; charter flag
  // semantics/availability must be verified before claiming exact exclusion.
  if (input.isCharter === true) return "unknown";
  if (input.isCargo === false && input.isPrivate === false &&
      input.isCharter === false) return "confirmed_core";
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
  const explicitDepIcao = normalizeIcao(f?.departure?.airport?.icao);
  // Official FIDS may omit the requested airport in a departure's movement.
  // Preserve provider-query context without promoting an unverified physical
  // leg to a confirmed source identity.
  const departureAirportFromContext = movement === "departure" &&
    !explicitDepIcao && normalizeIcao(params.airportIcao) !== null;
  const depIcao = explicitDepIcao ??
    (departureAirportFromContext ? normalizeIcao(params.airportIcao) : null);
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
    // f.8 §7: marketing codeshares are attributes / contextual records, NOT
    // independently confirmed physical operating legs. Provider sometimes
    // encodes the status as integer 1/2 rather than a string.
    const isOperator = f?.codeshareStatus === "IsOperator" || f?.codeshareStatus === 1;
    const isMarketing = f?.codeshareStatus === "IsCodeshared" || f?.codeshareStatus === 2;
    if (isOperator && !departureAirportFromContext &&
        !(movement === "departure" && explicitDepIcao !== normalizeIcao(params.airportIcao))) {
      canonical = canonicalFlightInstanceId(identityInput).flight_instance_id;
      analyticIdentityId = canonical;
      identityStatus = "confirmed_operating_leg";
    } else {
      analyticIdentityId = `provisional:${sha256(JSON.stringify({
        providerRecordKey, number: f?.number ?? null,
        depIcao, arrIcao, depSchedule, serviceDate,
      })).slice(0, 24)}`;
      identityStatus = isMarketing ? "resolved_marketing" :
        !isOperator ? "ambiguous_codeshare" :
        departureAirportFromContext ? "context_departure_origin_unverified" :
        "foreign_departure_origin_unverified";
    }
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

  const frame=buildFidsRequestContractV39(params);
  const direction = frame.direction;
  const fids = await (deps.fetchAirport ?? fetchFidsAirport)(
    params.airportIcao,
    params.fromLocal,
    params.toLocal,
    { direction, withLeg: frame.withLeg,
      withCancelled: frame.withCancelled,withCodeshared: frame.withCodeshared,
      withCargo: frame.withCargo,withPrivate: frame.withPrivate,
      withLocation: frame.withLocation,category: params.restCategory },
  );
  if (!fids) return null;

  // Verify that the bytes actually parsed at the fetch boundary agree with
  // the normalized lists. Missing evidence (e.g. injected legacy fetchers)
  // stays explicitly NOT VERIFIED. Never fabricate body custody from JSON.
  const original = fids.originalDecodedBody;
  let originalBodyEvidence: {
    schema: string; representation: string; bodySha256: string;
    bodyLengthBytes: number; bodyBase64: string;
  } | null = null;
  if (original !== undefined) {
    if (original.representation !== "FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE" ||
        !Number.isSafeInteger(original.byteLength) || original.byteLength < 1 ||
        original.byteLength > 4 * 1024 * 1024 ||
        !/^[a-f0-9]{64}$/.test(original.sha256) ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(original.base64))
      throw new Error("FIDS_ORIGINAL_DECODED_BODY_INVALID_HOLD");
    const bytes = Buffer.from(original.base64, "base64");
    if (bytes.length !== original.byteLength ||
        bytes.toString("base64") !== original.base64)
      throw new Error("FIDS_ORIGINAL_DECODED_BODY_INVALID_HOLD");
    if (createHash("sha256").update(bytes).digest("hex") !== original.sha256)
      throw new Error("FIDS_ORIGINAL_DECODED_BODY_SHA_MISMATCH_HOLD");
    let decoded: any;
    try { decoded = JSON.parse(bytes.toString("utf8")); }
    catch { throw new Error("FIDS_ORIGINAL_DECODED_BODY_JSON_INVALID_HOLD"); }
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded) ||
        JSON.stringify(Array.isArray(decoded.departures) ? decoded.departures : []) !== JSON.stringify(fids.departures) ||
        JSON.stringify(Array.isArray(decoded.arrivals) ? decoded.arrivals : []) !== JSON.stringify(fids.arrivals))
      throw new Error("FIDS_ORIGINAL_DECODED_BODY_NORMALIZATION_MISMATCH_HOLD");
    originalBodyEvidence = {
      schema: "v39.fids-fetch-decoded-source-body.v1",
      representation: original.representation,
      bodySha256: original.sha256,
      bodyLengthBytes: original.byteLength,
      bodyBase64: original.base64,
    };
  }
  const retrievalUtc = (deps.now ?? (() => new Date()))();
  const rawPayload = {
    airport: params.airportIcao,
    fromLocal: params.fromLocal,
    toLocal: params.toLocal,
    ianaTimezone: params.ianaTimezone,
    // Hash-bound application request intent, NOT original provider HTTP bytes.
    fidsRequestContract:frame,
    payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",
    originalDecodedEntityBodyPreserved: originalBodyEvidence !== null,
    originalHttpWireBytesPreserved: false,
    originalDecodedEntityBodyEvidence: originalBodyEvidence,
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

/**
 * Node/Postgres timestamp-precision guard for NEW FIDS writes only.
 * PostgreSQL can persist microseconds whereas a JS Date returned by pg
 * roundtrips at millisecond precision. Select the immutable raw receipt's
 * server-side available_at, never an earlier rounded JS timestamp, for the
 * population member in the SAME transaction. Historical rows are untouched.
 */
export const FIDS_ATOMIC_POPULATION_VALUES_V39 = Array.from(
  {length:34},(_,i)=>i===27
    ? "(SELECT GREATEST($28::timestamptz, q.available_at) FROM clean.fids_query_response q WHERE q.population_query_id=$19::uuid)"
    : `$${i+1}`
).join(",");

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
         VALUES (${FIDS_ATOMIC_POPULATION_VALUES_V39})
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
