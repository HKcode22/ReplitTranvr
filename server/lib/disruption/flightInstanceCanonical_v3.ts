/**
 * Canonical flight_instance_id — V3.9-f.8 §7.1 (Identity-v2).
 *
 * One confirmed physical operated leg is one analytic unit. Provider flight.id
 * is optional linkage evidence only; it is never canonical key material.
 * Schedule revisions are append-only versions under the same physical identity
 * when retained evidence supports that linkage. Ambiguous no-provider-ID split
 * cases fail closed instead of silently merging recurring flights.
 */
import crypto from "crypto";
import { v39Pool as pool } from "./db_v39";

export interface CanonicalFlightInstanceInput {
  operatingCarrier: string;
  operatingFlightNumber: string;
  origin: string;
  destinationOriginal: string;
  scheduledGateOutUtc: string;
  serviceDate: string;
  initialServiceDate?: string;
  firstScheduledGateOutUtc?: string;
  providerFlightId?: string | null;
  providerRecordKey?: string | null;
  callsign?: string | null;
  marketingFlightNumbers?: string[];
  providerFlightIdStable?: boolean;
}

export interface CanonicalFlightInstance {
  flight_instance_id: string;
  stableIdentity: string;
  marketingFlightNumbers: string[];
  isFallback: boolean;
  retimeParentId?: string;
  scheduleVersionId?: string;
  retimeVersion?: number;
  identityResolutionStatus?: "resolved" | "ambiguous_distinct_leg";
  initialServiceDate?: string;
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
  /** Optional retained provider-record evidence; never canonical key material. */
  providerRecordKey?: string | null;
  /** Optional operational linkage evidence. */
  callsign?: string | null;
}

export interface PersistedWebhookIdentity {
  flightInstanceId: string;
  initialServiceDate: string;
}

export interface WebhookIdentityPersistence {
  resolveOrCreate(input: {
    providerFlightId: string | null;
    providerRecordKey?: string | null;
    callsign?: string | null;
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
  rawCode: number;
  label: "Unknown" | "IsOperator" | "IsCodeshared";
  ambiguousUnknown: boolean;
}

function sha8(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 8);
}

function normalizedRequired(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

function normalizedOptional(value: string | null | undefined): string | null {
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

class WebhookIdentityAmbiguityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookIdentityAmbiguityError";
  }
}

const NO_PROVIDER_LINK_MAX_HOURS = 12;
const NO_PROVIDER_NEARBY_AMBIGUITY_HOURS = 12;

function scheduleAwareAlias(input: {
  operatingCarrier: string;
  operatingFlightNumber: string;
  originIcao: string;
  originalDestinationIcao: string;
  initialServiceDate: string;
  scheduledGateOutUtc: string;
}): string {
  return `schedule:${input.operatingCarrier}${input.operatingFlightNumber}|${input.originIcao}|${input.originalDestinationIcao}|${input.initialServiceDate}|${new Date(input.scheduledGateOutUtc).toISOString()}`;
}

function providerAlias(carrier: string, providerFlightId: string): string {
  return `provider:${carrier}|${providerFlightId}`;
}

async function appendScheduleVersion(
  client: { query: (text: string, params?: unknown[]) => Promise<any> },
  input: {
    flightInstanceId: string;
    scheduledGateOutUtc: string;
    currentServiceDate: string;
    providerIdentityAlias: string;
    providerRecordKey?: string | null;
    callsign?: string | null;
  },
): Promise<void> {
  const existing = await client.query(
    `SELECT 1 FROM clean.webhook_flight_schedule_version
      WHERE flight_instance_id=$1 AND observed_scheduled_gate_out_utc=$2`,
    [input.flightInstanceId, input.scheduledGateOutUtc],
  );
  if (existing.rowCount) return;
  const v = await client.query(
    `SELECT COALESCE(MAX(retime_version), -1) + 1 AS next_version
       FROM clean.webhook_flight_schedule_version
      WHERE flight_instance_id=$1`,
    [input.flightInstanceId],
  );
  await client.query(
    `INSERT INTO clean.webhook_flight_schedule_version
       (flight_instance_id, retime_version, observed_scheduled_gate_out_utc,
        current_service_date, provider_identity_alias, provider_record_key, callsign)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.flightInstanceId,
      Number(v.rows[0]?.next_version ?? 0),
      input.scheduledGateOutUtc,
      input.currentServiceDate,
      input.providerIdentityAlias,
      input.providerRecordKey ?? null,
      input.callsign ?? null,
    ],
  );
}

const postgresWebhookIdentityPersistence: WebhookIdentityPersistence = {
  async resolveOrCreate(input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const providerId = input.providerFlightId?.trim() || null;
      const recordKey = input.providerRecordKey?.trim() || null;
      const callsign = normalizedOptional(input.callsign);
      const exactAlias = providerId
        ? providerAlias(input.operatingCarrier, providerId)
        : scheduleAwareAlias(input);
      const routeLock = providerId
        ? exactAlias
        : `route:${input.operatingCarrier}${input.operatingFlightNumber}|${input.originIcao}|${input.originalDestinationIcao}`;
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [routeLock]);

      const exact = await client.query(
        `SELECT flight_instance_id, initial_service_date::text
           FROM clean.webhook_flight_identity
          WHERE provider_identity_alias=$1`,
        [exactAlias],
      );
      if (exact.rows[0]) {
        await appendScheduleVersion(client, {
          flightInstanceId: exact.rows[0].flight_instance_id,
          scheduledGateOutUtc: input.scheduledGateOutUtc,
          currentServiceDate: input.initialServiceDate,
          providerIdentityAlias: exactAlias,
          providerRecordKey: recordKey,
          callsign,
        });
        await client.query("COMMIT");
        return {
          flightInstanceId: exact.rows[0].flight_instance_id,
          initialServiceDate: exact.rows[0].initial_service_date,
        };
      }

      if (!providerId) {
        const candidates = await client.query(
          `SELECT flight_instance_id, initial_service_date::text,
                  initial_scheduled_gate_out_utc, provider_record_key, callsign
             FROM clean.webhook_flight_identity
            WHERE provider_flight_id IS NULL
              AND operating_carrier=$1
              AND operating_flight_number=$2
              AND origin_icao=$3
              AND original_destination_icao=$4
              AND initial_service_date BETWEEN ($5::date - INTERVAL '1 day') AND ($5::date + INTERVAL '1 day')
            ORDER BY initial_scheduled_gate_out_utc ASC`,
          [
            input.operatingCarrier,
            input.operatingFlightNumber,
            input.originIcao,
            input.originalDestinationIcao,
            input.initialServiceDate,
          ],
        );
        const currentMs = Date.parse(input.scheduledGateOutUtc);
        const enriched = candidates.rows.map((row: any) => ({
          row,
          deltaHours: Math.abs(currentMs - new Date(row.initial_scheduled_gate_out_utc).getTime()) / 3_600_000,
          recordMatch: Boolean(recordKey && row.provider_record_key && String(row.provider_record_key) === recordKey),
          callsignMatch: Boolean(callsign && row.callsign && normalizedOptional(String(row.callsign)) === callsign),
        }));
        const strong = enriched.filter((c: any) =>
          c.recordMatch || (c.callsignMatch && c.deltaHours <= NO_PROVIDER_LINK_MAX_HOURS),
        );
        if (strong.length > 1) {
          throw new WebhookIdentityAmbiguityError("multiple retained identities match the no-provider observation");
        }
        if (strong.length === 1) {
          const linked = strong[0].row;
          await appendScheduleVersion(client, {
            flightInstanceId: linked.flight_instance_id,
            scheduledGateOutUtc: input.scheduledGateOutUtc,
            currentServiceDate: input.initialServiceDate,
            providerIdentityAlias: exactAlias,
            providerRecordKey: recordKey,
            callsign,
          });
          await client.query("COMMIT");
          return {
            flightInstanceId: linked.flight_instance_id,
            initialServiceDate: linked.initial_service_date,
          };
        }

        // Same-service-date or nearby cross-midnight schedule changes without
        // retained linkage evidence can be either a retime or a distinct leg.
        // The Plan requires such split cases to be bounded/quarantined, never
        // silently merged or duplicated.
        const ambiguousNearby = enriched.some((c: any) =>
          c.row.initial_service_date === input.initialServiceDate ||
          c.deltaHours <= NO_PROVIDER_NEARBY_AMBIGUITY_HOURS,
        );
        if (ambiguousNearby) {
          throw new WebhookIdentityAmbiguityError(
            "no-provider schedule change is ambiguous between retime and distinct leg",
          );
        }
      }

      await client.query(
        `INSERT INTO clean.webhook_flight_identity
           (provider_identity_alias, provider_flight_id, provider_record_key, callsign,
            flight_instance_id, operating_carrier, operating_flight_number,
            origin_icao, original_destination_icao, initial_service_date,
            initial_scheduled_gate_out_utc)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          exactAlias,
          providerId,
          recordKey,
          callsign,
          input.flightInstanceId,
          input.operatingCarrier,
          input.operatingFlightNumber,
          input.originIcao,
          input.originalDestinationIcao,
          input.initialServiceDate,
          input.scheduledGateOutUtc,
        ],
      );
      await appendScheduleVersion(client, {
        flightInstanceId: input.flightInstanceId,
        scheduledGateOutUtc: input.scheduledGateOutUtc,
        currentServiceDate: input.initialServiceDate,
        providerIdentityAlias: exactAlias,
        providerRecordKey: recordKey,
        callsign,
      });
      await client.query("COMMIT");
      return { flightInstanceId: input.flightInstanceId, initialServiceDate: input.initialServiceDate };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  },
};

/** Production webhook identity boundary. No date/timezone fallback is allowed. */
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
    providerRecordKey: observation.providerRecordKey,
    callsign: observation.callsign,
  });
  try {
    const persisted = await persistence.resolveOrCreate({
      providerFlightId: observation.providerFlightId?.trim() || null,
      providerRecordKey: observation.providerRecordKey?.trim() || null,
      callsign: observation.callsign?.trim() || null,
      operatingCarrier: carrier,
      operatingFlightNumber: number,
      originIcao: origin,
      originalDestinationIcao: destination,
      initialServiceDate,
      scheduledGateOutUtc: observation.scheduledGateOutUtc,
      flightInstanceId: canonical.flight_instance_id,
    });
    return { status: "resolved", ...persisted };
  } catch (error: any) {
    if (error?.name === "WebhookIdentityAmbiguityError") {
      return { status: "quarantined", reason: error.message };
    }
    throw error;
  }
}

export function classifyCodeshare(rawCode: number | null | undefined): CodeshareState {
  const code = typeof rawCode === "number" && Number.isFinite(rawCode) ? rawCode : 0;
  const labels: Record<number, CodeshareState["label"]> = { 0: "Unknown", 1: "IsOperator", 2: "IsCodeshared" };
  return { rawCode: code, label: labels[code] ?? "Unknown", ambiguousUnknown: code === 0 };
}

const RETIME_THRESHOLD_MINUTES = 120;
export function detectRetime(previousScheduledUtc: Date | null, currentScheduledUtc: Date | null): RetimeDetectionResult {
  if (!previousScheduledUtc || !currentScheduledUtc) {
    return { isRetime: false, retimeMinutes: null, dateShifted: false, reason: null };
  }
  const diffMinutes = Math.abs(currentScheduledUtc.getTime() - previousScheduledUtc.getTime()) / 60_000;
  const prevDate = previousScheduledUtc.toISOString().slice(0, 10);
  const curDate = currentScheduledUtc.toISOString().slice(0, 10);
  const dateShifted = prevDate !== curDate;
  const isRetime = diffMinutes >= RETIME_THRESHOLD_MINUTES || dateShifted;
  return {
    isRetime,
    retimeMinutes: diffMinutes,
    dateShifted,
    reason: !isRetime ? null : dateShifted ? `date shift: ${prevDate} → ${curDate}` : `time shift: ${diffMinutes.toFixed(0)} minutes`,
  };
}

function scheduleVersionId(flightInstanceId: string, retimeVersion: number, scheduledGateOutUtc: string): string {
  return `ver:${sha8(`${flightInstanceId}|${retimeVersion}|${scheduledGateOutUtc}`)}`;
}

export function canonicalFlightInstanceId(
  input: CanonicalFlightInstanceInput,
  opts?: { collisionSuffix?: string },
): CanonicalFlightInstance {
  const normalizedCarrier = input.operatingCarrier.trim().toUpperCase();
  const normalizedNumber = input.operatingFlightNumber.trim().replace(/^0+/, "");
  const origin = input.origin.trim().toUpperCase();
  const dest = input.destinationOriginal.trim().toUpperCase();
  const initialServiceDate = input.initialServiceDate ?? input.serviceDate;
  const firstScheduledGateOutUtc = input.firstScheduledGateOutUtc ?? input.scheduledGateOutUtc;
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

export function retimeFlightInstanceId(
  original: CanonicalFlightInstance,
  newInput: CanonicalFlightInstanceInput,
  opts?: { collisionSuffix?: string },
): CanonicalFlightInstance {
  const retimeVersion = (original.retimeVersion ?? 0) + 1;
  const physicalId = canonicalFlightInstanceId({
    ...newInput,
    initialServiceDate: original.initialServiceDate ?? newInput.serviceDate,
    firstScheduledGateOutUtc: original.firstScheduledGateOutUtc ?? newInput.scheduledGateOutUtc,
  }, opts);
  return {
    ...physicalId,
    marketingFlightNumbers: newInput.marketingFlightNumbers ?? original.marketingFlightNumbers ?? [],
    scheduleVersionId: scheduleVersionId(physicalId.flight_instance_id, retimeVersion, newInput.scheduledGateOutUtc),
    retimeVersion,
    identityResolutionStatus: "resolved",
  };
}

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
    if (!map.has(key)) map.set(key, { instance: inst, marketing: [], codeshareState });
    const entry = map.get(key)!;
    if (codeshareState.label === "IsOperator" && entry.codeshareState.ambiguousUnknown) entry.codeshareState = codeshareState;
    if (r.marketingCarrier && r.marketingNumber) {
      const mk = `${r.marketingCarrier}${r.marketingNumber}`;
      if (!entry.marketing.includes(mk)) entry.marketing.push(mk);
    }
  }
  return map;
}

export function isCrossAirportDuplicate(a: CanonicalFlightInstanceInput, b: CanonicalFlightInstanceInput): boolean {
  const carrierA = a.operatingCarrier.trim().toUpperCase();
  const carrierB = b.operatingCarrier.trim().toUpperCase();
  const numA = a.operatingFlightNumber.trim().replace(/^0+/, "");
  const numB = b.operatingFlightNumber.trim().replace(/^0+/, "");
  if (carrierA !== carrierB || numA !== numB) return false;
  const aSwapped = a.origin.trim().toUpperCase() === b.destinationOriginal.trim().toUpperCase() &&
    a.destinationOriginal.trim().toUpperCase() === b.origin.trim().toUpperCase();
  const aSame = a.origin.trim().toUpperCase() === b.origin.trim().toUpperCase() &&
    a.destinationOriginal.trim().toUpperCase() === b.destinationOriginal.trim().toUpperCase();
  return aSwapped || aSame;
}

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
export function resolveTailIdentity(input: TailIdentityInput): TailIdentity {
  const reg = normalizedOptional(input.aircraftReg);
  if (reg) return { tailKey: reg, tailKnown: true, tailSource: "aircraft_reg" };
  const modeS = normalizedOptional(input.aircraftModeS);
  if (modeS) return { tailKey: modeS, tailKnown: false, tailSource: "mode_s" };
  const icao24 = normalizedOptional(input.icao24);
  if (icao24) return { tailKey: icao24, tailKnown: false, tailSource: "icao24" };
  if (input.providerAircraftIdVerified && input.providerAircraftId?.trim()) {
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
    const dep = new Date(input.scheduledGateOutUtc);
    const arr = new Date(input.actualWheelsOnUtc);
    if (!Number.isFinite(dep.getTime()) || !Number.isFinite(arr.getTime())) return false;
    return dep.toISOString().slice(0, 10) !== arr.toISOString().slice(0, 10);
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
