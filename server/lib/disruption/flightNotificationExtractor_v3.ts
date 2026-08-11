// ============================================================
// v3 — THE careful field-by-field extractor (plan §5).
// Converts ONE AeroDataBox FlightNotificationContract flight item
// into one flat clean.flight_data_pre_post row.
//
// Non-negotiable rules (plan §5a):
//   1. Every missing field → null. NEVER 0 (zeros poison the GNN).
//   2. `utc` is the canonical timestamp (timestamptz); `local` kept
//      only as optional text.
//   3. Nested objects flattened into dep_/arr_/loc_/... columns.
//   4. quality[] preserved as-is (Basic/Live/Approximate).
//   5. payload_json = the WHOLE raw flight item (audit/recovery).
//   6. data_stage = PRE / POST (evidence-based, plan §5c).
//
// See MDplan/V3_WebhookExtractionPlan.md §8 Phase 3.
// ============================================================

import { createHash } from "crypto";
import type { InsertFlightDataPrePost } from "@shared/schema";
import { POST_STATUSES, STATUS_CODE } from "./flightStatus_v3";
import { flattenPayload } from "./flattenPayload_v3";

// ---------------------------------------------------------------------------
// AeroDataBox real-payload quirks (verified from live deliveries 2026-08-10):
//   - `status` is a NUMERIC enum code (0-12), NOT the string name.
//   - `codeshareStatus` is a NUMERIC enum code (0-2), NOT the string name.
//   - `greatCircleDistance` keys are CAPITALIZED {Km, Nm, Feet, Mile, Meter}.
//   - `quality[]` holds NUMERIC codes, NOT "Basic"/"Live"/"Approximate".
// The validator + extractor handle BOTH forms so we never drop fields again.
// ---------------------------------------------------------------------------

/** numeric status code -> string name (reverse of STATUS_CODE). */
export const STATUS_CODE_BY_NUMBER: Record<number, string> = Object.fromEntries(
  Object.entries(STATUS_CODE).map(([name, code]) => [code, name]),
);

/** numeric codeshare code -> string name (PrePosFeat.md §codeshareStatus). */
export const CODESHARE_CODE: Record<number, string> = {
  0: "Unknown",
  1: "IsOperator",
  2: "IsCodeshared",
};

/** numeric quality code -> string name (PrePosFeat.md §quality). */
export const QUALITY_CODE: Record<number, string> = {
  0: "Basic",
  1: "Live",
  2: "Approximate",
};

export interface SamplingMeta {
  batchId: string | null;
  tier: string | null;
  samplingProbability: number | null;
  samplingWeight: number | null;
  randomSeed: string | null;
  windowStart: Date | null;
  windowEnd: Date | null;
}

export interface ExtractionContext {
  /** The subscription block from the notification (may be null). */
  subscription?: Record<string, any> | null;
  /** The balance block from the notification (may be null). */
  balance?: Record<string, any> | null;
  /** Server receive time — the ONLY time we trust as "now". */
  receivedAt: Date;
  /** Index of this flight within the notification (dedup fallback only). */
  index?: number;
  /** Sampling metadata stamped by the tier-rotating collector (may be null). */
  sampling?: SamplingMeta | null;
}

// ---------------------------------------------------------------------------
// Primitive readers (all null-safe, never fabricate a value)
// ---------------------------------------------------------------------------

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * String, OR a numeric enum code (AeroDataBox sends subscription.billingType
 * and subject/subscriber.type as numbers). Preserve the code as a string so we
 * never drop it; unknown codes stay as their number so nothing is fabricated.
 */
function strOrCode(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function int(value: unknown): number | null {
  const n = num(value);
  return n === null ? null : Math.trunc(n);
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function date(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Optional block → its fields (empty object when the block is absent). */
function block(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

/** .time.utc / .time.local from a { utc, local } object. */
function timeUtc(timeObj: unknown): Date | null {
  return date(block(timeObj).utc);
}
function timeLocal(timeObj: unknown): string | null {
  return str(block(timeObj).local);
}

function strArr(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value
    .map((v): string | null => {
      if (typeof v === "string" && v.length > 0) return v;
      if (typeof v === "number" && Number.isFinite(v)) {
        const mapped = QUALITY_CODE[v];
        return mapped ?? String(v);
      }
      return null;
    })
    .filter((v): v is string => v !== null && v.length > 0);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * AeroDataBox sends enums sometimes as the numeric code and sometimes as the
 * string name. Accept both: number -> name lookup, string -> as-is.
 */
function enumName(value: unknown, codeMap: Record<number, string>): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return codeMap[value] ?? null;
  }
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

/** Read a key from an object case-insensitively (gcd uses `Km`/`meter`). */
function pickKey(obj: Record<string, any>, key: string): unknown {
  if (obj == null) return undefined;
  if (key in obj) return obj[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) return obj[k];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

/** data_stage (plan §5c): strongest available signal. */
function determineStage(flight: Record<string, any>): { stage: "PRE" | "POST"; hasLiveLocation: boolean } {
  const loc = flight.location;
  const hasLiveLocation = !!loc && typeof loc === "object" && !Array.isArray(loc);
  if (hasLiveLocation) return { stage: "POST", hasLiveLocation: true };
  const status = enumName(flight.status, STATUS_CODE_BY_NUMBER);
  if (status && POST_STATUSES.has(status)) return { stage: "POST", hasLiveLocation: false };
  return { stage: "PRE", hasLiveLocation: false };
}

function dedupKey(input: {
  flightNumber: string;
  carrierIata: string | null;
  lastUpdatedUtc: Date | null;
  receivedAt: Date;
  index: number;
}): string {
  const flight = input.flightNumber.toLowerCase();
  const carrier = (input.carrierIata ?? "").toLowerCase();
  // lastUpdatedUtc is REQUIRED by the contract; the receivedAt|index fallback is
  // only a safety net so a malformed payload can never collide across flights.
  const stamp = input.lastUpdatedUtc
    ? input.lastUpdatedUtc.toISOString()
    : `${input.receivedAt.toISOString()}|${input.index}`;
  return createHash("sha256").update(`${flight}|${carrier}|${stamp}`).digest("hex");
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

/**
 * Flatten one flight item into a row. Returns null when the flight has no
 * number (the table's identity column is NOT NULL and a number is the only
 * reliable key) — callers skip it and count it in `skipped`.
 */
export function extractFlightNotification(
  raw: any,
  ctx: ExtractionContext,
): InsertFlightDataPrePost | null {
  const flight = block(raw);
  const flightNumber = str(flight.number);
  if (!flightNumber) return null;

  const statusStr = enumName(flight.status, STATUS_CODE_BY_NUMBER);

  const dep = block(flight.departure);
  const depAirport = block(dep.airport);
  const depAirportLoc = block(depAirport.location);

  const arr = block(flight.arrival);
  const arrAirport = block(arr.airport);
  const arrAirportLoc = block(arrAirport.location);

  const fp = block(flight.flightPlan);
  const fpAlt = block(fp.altitude);
  const fpSpeed = block(fp.airspeed);

  const ac = block(flight.aircraft);
  const acImage = block(ac.image);

  const loc = block(flight.location);
  const locPressureAlt = block(loc.pressureAltitude);
  const locAlt = block(loc.altitude);
  const locGround = block(loc.groundSpeed);
  const locTrack = block(loc.trueTrack);

  const airline = block(flight.airline);
  const subscription = block(ctx.subscription);
  const subj = block(subscription.subject);
  const subs = block(subscription.subscriber);
  const balance = block(ctx.balance);

  const gcd = block(flight.greatCircleDistance);
  const lastUpdatedUtc = date(flight.lastUpdatedUtc);
  const { stage, hasLiveLocation } = determineStage(flight);

  const carrierIata = str(airline.iata);

  return {
    flightNumber,
    carrierIata,
    carrierIcao: str(airline.icao),
    carrierName: str(airline.name),
    callSign: str(flight.callSign),
    isCargo: bool(flight.isCargo),
    status: statusStr,
    statusCode:
      typeof flight.status === "number" && Number.isFinite(flight.status)
        ? Math.trunc(flight.status)
        : statusStr
          ? (STATUS_CODE[statusStr] ?? null)
          : null,
    codeshareStatus: enumName(flight.codeshareStatus, CODESHARE_CODE),
    notificationSummary: str(flight.notificationSummary),
    notificationRemark: str(flight.notificationRemark),
    lastUpdatedUtc,

    gcdM: num(pickKey(gcd, "meter")),
    gcdKm: num(pickKey(gcd, "km")),
    gcdMile: num(pickKey(gcd, "mile")),
    gcdNm: num(pickKey(gcd, "nm")),
    gcdFt: num(pickKey(gcd, "feet")),

    depAirportIcao: str(depAirport.icao),
    depAirportIata: str(depAirport.iata),
    depAirportLocalCode: str(depAirport.localCode),
    depAirportName: str(depAirport.name),
    depAirportShortName: str(depAirport.shortName),
    depAirportMunicipality: str(depAirport.municipalityName),
    depAirportCountryCode: str(depAirport.countryCode),
    depAirportLat: num(depAirportLoc.lat),
    depAirportLon: num(depAirportLoc.lon),
    depAirportTimezone: str(depAirport.timeZone),
    depScheduledUtc: timeUtc(dep.scheduledTime),
    depScheduledLocal: timeLocal(dep.scheduledTime),
    depRevisedUtc: timeUtc(dep.revisedTime),
    depPredictedUtc: timeUtc(dep.predictedTime),
    depRunwayUtc: timeUtc(dep.runwayTime),
    depTerminal: str(dep.terminal),
    depCheckinDesk: str(dep.checkInDesk),
    depGate: str(dep.gate),
    depBaggageBelt: str(dep.baggageBelt),
    depRunway: str(dep.runway),
    depQuality: strArr(dep.quality),

    arrAirportIcao: str(arrAirport.icao),
    arrAirportIata: str(arrAirport.iata),
    arrAirportLocalCode: str(arrAirport.localCode),
    arrAirportName: str(arrAirport.name),
    arrAirportShortName: str(arrAirport.shortName),
    arrAirportMunicipality: str(arrAirport.municipalityName),
    arrAirportCountryCode: str(arrAirport.countryCode),
    arrAirportLat: num(arrAirportLoc.lat),
    arrAirportLon: num(arrAirportLoc.lon),
    arrAirportTimezone: str(arrAirport.timeZone),
    arrScheduledUtc: timeUtc(arr.scheduledTime),
    arrScheduledLocal: timeLocal(arr.scheduledTime),
    arrRevisedUtc: timeUtc(arr.revisedTime),
    arrPredictedUtc: timeUtc(arr.predictedTime),
    arrRunwayUtc: timeUtc(arr.runwayTime),
    arrTerminal: str(arr.terminal),
    arrGate: str(arr.gate),
    arrBaggageBelt: str(arr.baggageBelt),
    arrRunway: str(arr.runway),
    arrQuality: strArr(arr.quality),

    flightPlanFlightRules: str(fp.flightRules),
    flightPlanFlightType: str(fp.flightType),
    flightPlanRevisionNo: int(fp.revisionNo),
    flightPlanStatus: str(fp.status),
    flightPlanRoute: str(fp.route),
    fpAltRequestedFt: num(block(fpAlt.requested).feet),
    fpAltAssignedFt: num(block(fpAlt.assigned).feet),
    fpAirspeedRequestedKt: num(block(fpSpeed.requested).kt),
    fpAirspeedAssignedKt: num(block(fpSpeed.assigned).kt),
    flightPlanLastUpdatedUtc: date(fp.lastUpdatedUtc),

    aircraftReg: str(ac.reg),
    aircraftModeS: str(ac.modeS),
    aircraftModel: str(ac.model),
    aircraftImageUrl: str(acImage.url),
    aircraftImageWebUrl: str(acImage.webUrl),
    aircraftImageAuthor: str(acImage.author),
    aircraftImageTitle: str(acImage.title),
    aircraftImageDescription: str(acImage.description),
    aircraftImageLicense: str(acImage.license),

    locLat: num(loc.lat),
    locLon: num(loc.lon),
    locAltitudeFt: num(locAlt.feet),
    locPressureAltitudeFt: num(locPressureAlt.feet),
    locPressureHpa: num(loc.pressure ? block(loc.pressure).hPa : undefined),
    locGroundSpeedKt: num(locGround.kt),
    locTrueTrackDeg: num(locTrack.deg),
    locVsiFpm: int(loc.vsiFpm),
    locReportedUtc: date(loc.reportedAtUtc),

    dataStage: stage,
    hasLiveLocation,
    subscriptionId: str(subscription.id) ?? null,
    subscriptionIsActive: bool(subscription.isActive),
    subscriptionBillingType: strOrCode(subscription.billingType),
    subscriptionActivateBeforeUtc: date(subscription.activateBeforeUtc),
    subscriptionExpiresOnUtc: date(subscription.expiresOnUtc),
    subscriptionCreatedOnUtc: date(subscription.createdOnUtc),
    subjectType: strOrCode(subj.type),
    subjectId: str(subj.id),
    subscriberType: strOrCode(subs.type),
    subscriberId: str(subs.id),
    subscriptionNotices: Array.isArray(subscription.notices)
      ? (subscription.notices as string[])
      : null,
    creditsRemaining: num(balance.creditsRemaining) ?? null,
    balanceLastRefilledUtc: date(balance.lastRefilledUtc),
    balanceLastDeductedUtc: date(balance.lastDeductedUtc),

    samplingBatchId: ctx.sampling?.batchId ?? null,
    airportTier: ctx.sampling?.tier ?? null,
    samplingProbability: ctx.sampling?.samplingProbability ?? null,
    samplingWeight: ctx.sampling?.samplingWeight ?? null,
    randomSeed: ctx.sampling?.randomSeed ?? null,
    collectionWindowStart: ctx.sampling?.windowStart ?? null,
    collectionWindowEnd: ctx.sampling?.windowEnd ?? null,

    receivedAt: ctx.receivedAt,
    payloadJson: raw,
    payloadJsonFlat: flattenPayload(raw),
    dedupKey: dedupKey({
      flightNumber,
      carrierIata,
      lastUpdatedUtc,
      receivedAt: ctx.receivedAt,
      index: ctx.index ?? 0,
    }),
  };
}
