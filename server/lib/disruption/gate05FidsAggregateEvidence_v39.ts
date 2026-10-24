/**
 * Aggregate-only offline FIDS evidence diagnostic for a FUTURE, separately
 * authorized pair of provider responses. No HTTP, database, environment,
 * output files, identifiers, coordinates or raw timestamps are persisted.
 *
 * This is NOT a Gate 0.5 PASS calculator and it does not establish actual
 * runway timestamp semantics. Synthetic fixtures can only prove logic.
 */
type JsonObject = Record<string, unknown>;
const object = (x: unknown): JsonObject | null =>
  x !== null && typeof x === "object" && !Array.isArray(x)
    ? x as JsonObject : null;

const field = (x: unknown, key: string): unknown => object(x)?.[key];
const nonempty = (x: unknown): string | null =>
  typeof x === "string" && x.trim().length > 0 ? x.trim() : null;

function utcInstant(x: unknown): number | null {
  const s = nonempty(x);
  // RFC3339 UTC permits fractional seconds beyond millisecond precision and
  // an explicit +00:00 offset; both must not be counted as missingness.
  // Reject nonzero offsets here because DateTimeContract.utc denotes UTC.
  if (!s || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,9})?)?(?:Z|\+00:00)$/.test(s))
    return null;
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms).toISOString();
  // Reject dates which Date.parse silently normalizes.
  return d.slice(0,16) === s.slice(0,16) ? ms : null;
}

export interface Gate05FidsBoundsV39 {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly requestedAirportIcao: string;
}
export interface Gate05VariantAggregateV39 {
  readonly withLocation: boolean;
  readonly objectsReturned: number;
  readonly malformedRows: number;
  readonly departureMovementObjects: number;
  /** Feed-context evidence only; not proof of exact flight/airport identity. */
  readonly departurePrimaryByFidsContext: number;
  readonly scheduledTimeUtcPresent: number;
  readonly revisedTimeUtcPresent: number;
  readonly runwayTimeUtcPresent: number;
  readonly runwayActualityProven: false;
  /** AeroDataBox FIDS scheduledTime is not a proven scheduled wheels-off baseline. */
  readonly scheduledWheelsOffReferenceProven: false;
  readonly runwayTimestampActualityUnknown: number;
  readonly scheduledInsideWindow: number;
  readonly scheduledOutsideWindow: number;
  readonly scheduledWindowUnassessable: number;
  readonly locationObjectPresent: number;
  readonly departureRequestedAirportConfirmed: number;
  readonly departureAirportUnverified: number;
  readonly codeshareOperator: number;
  readonly codeshareMarketing: number;
  readonly codeshareUnknownOrOther: number;
  readonly qualityBasic: number;
  readonly qualityLive: number;
  readonly qualityApproximate: number;
  readonly provisionalMatchableRows: number;
  readonly provisionalDistinctKeys: number;
}
export interface Gate05PairAggregateV39 {
  readonly schema: "v39.gate05.aggregate-only-fids-evidence.v1";
  readonly withoutLocation: Gate05VariantAggregateV39;
  readonly withLocation: Gate05VariantAggregateV39;
  readonly provisionalComparableOverlap: number;
  readonly matchingFlightIdentitiesProven: false;
  readonly actualRunwayDelayLabelProven: false;
  readonly pilotGate05Certified: false;
  readonly fullScientificGate05Verdict: "NOT_ASSESSABLE_FROM_THIS_MICROTEST";
  readonly providerRequests: 0;
  readonly limitation: string;
}

function variant(raw: unknown, enabled: boolean, bounds: Gate05FidsBoundsV39) {
  if (!Array.isArray(raw) || raw.length > 2000)
    throw Error("GATE05_AGGREGATE_INVALID_ROWS");
  const start = utcInstant(bounds.startUtc)!;
  const end = utcInstant(bounds.endUtc)!;
  const n = {
    withLocation: enabled, objectsReturned: raw.length, malformedRows: 0,
    departureMovementObjects: 0, departurePrimaryByFidsContext: 0,
    scheduledTimeUtcPresent: 0, revisedTimeUtcPresent: 0,
    runwayTimeUtcPresent: 0, runwayActualityProven: false as const,
    scheduledWheelsOffReferenceProven: false as const,
    runwayTimestampActualityUnknown: 0,
    scheduledInsideWindow: 0, scheduledOutsideWindow: 0,
    scheduledWindowUnassessable: 0, locationObjectPresent: 0,
    departureRequestedAirportConfirmed: 0, departureAirportUnverified: 0,
    codeshareOperator: 0, codeshareMarketing: 0,
    codeshareUnknownOrOther: 0,
    qualityBasic: 0, qualityLive: 0, qualityApproximate: 0,
    provisionalMatchableRows: 0, provisionalDistinctKeys: 0
  };
  // Keys are EPHEMERAL and never returned, logged or written.
  const provisional = new Set<string>();
  for (const item of raw) {
    const f = object(item);
    if (!f) { n.malformedRows++; n.scheduledWindowUnassessable++; continue; }
    const d = object(f.departure);
    const a = object(f.arrival);
    if (d) {
      n.departureMovementObjects++;
      // Provider AirportFlightContract omits departure.airport when it equals
      // the requested airport. The request's departures-array context is
      // therefore evidence of a primary departure movement, but it is NOT
      // independent confirmation of the leg identity, code share or airport.
      n.departurePrimaryByFidsContext++;
    }
    const scheduledUtc = field(d?.scheduledTime, "utc");
    const scheduled = utcInstant(scheduledUtc);
    if (scheduled !== null) {
      n.scheduledTimeUtcPresent++;
      if (scheduled >= start && scheduled < end) n.scheduledInsideWindow++;
      else n.scheduledOutsideWindow++;
    } else n.scheduledWindowUnassessable++;

    if (utcInstant(field(d?.revisedTime, "utc")) !== null)
      n.revisedTimeUtcPresent++;
    if (utcInstant(field(d?.runwayTime, "utc")) !== null) {
      n.runwayTimeUtcPresent++;
      n.runwayTimestampActualityUnknown++;
    }
    if (object(f.location) || object(d?.location))
      n.locationObjectPresent++;
    const from = nonempty(field(d?.airport, "icao"));
    const to = nonempty(field(a?.airport, "icao"));
    if (from?.toUpperCase() === bounds.requestedAirportIcao)
      n.departureRequestedAirportConfirmed++;
    else n.departureAirportUnverified++;

    const cs = nonempty(f.codeshareStatus);
    if (cs === "IsOperator") n.codeshareOperator++;
    else if (cs === "IsCodeshared") n.codeshareMarketing++;
    else n.codeshareUnknownOrOther++;

    const quality = Array.isArray(f.quality) ? f.quality :
      Array.isArray(d?.quality) ? d.quality : [];
    if (quality.includes("Basic")) n.qualityBasic++;
    if (quality.includes("Live")) n.qualityLive++;
    if (quality.includes("Approximate")) n.qualityApproximate++;

    // Provisional matching is NEVER an independently verified canonical leg.
    const flightNumber = nonempty(f.number);
    // In a FIDS *departures* response the current requested airport can be
    // omitted from departure.airport. Use the declared array/request context
    // ONLY for provisional inter-variant matching; do NOT count the fallback
    // as independent airport or canonical operating-leg verification.
    // Explicit foreign origins are kept out of this requested-airport cohort.
    const primaryFrom =
      from === null && d ? bounds.requestedAirportIcao : from;
    if (flightNumber && primaryFrom && to && scheduled !== null &&
        primaryFrom.toUpperCase() === bounds.requestedAirportIcao &&
        to.toUpperCase() !== bounds.requestedAirportIcao &&
        cs === "IsOperator") {
      n.provisionalMatchableRows++;
      provisional.add(JSON.stringify([
        flightNumber.toUpperCase(), primaryFrom.toUpperCase(),
        to.toUpperCase(), new Date(scheduled).toISOString()
      ]));
    }
  }
  n.provisionalDistinctKeys = provisional.size;
  return {counts: n as Gate05VariantAggregateV39, provisional};
}

/**
 * Pass in-memory departure arrays; caller controls lifetime of the input.
 * Output is only aggregate counts and explicit UNKNOWN semantic judgments.
 */
export function aggregateGate05FidsPairV39(
  withoutLocationRows: unknown,
  withLocationRows: unknown,
  bounds: Gate05FidsBoundsV39
): Gate05PairAggregateV39 {
  if (!bounds || !/^[A-Z]{4}$/.test(bounds.requestedAirportIcao ?? ""))
    throw Error("GATE05_AGGREGATE_AIRPORT");
  const start = utcInstant(bounds.startUtc);
  const end = utcInstant(bounds.endUtc);
  if (start === null || end === null || end <= start || end-start > 86_400_000)
    throw Error("GATE05_AGGREGATE_WINDOW");
  const off = variant(withoutLocationRows, false, bounds);
  const on = variant(withLocationRows, true, bounds);
  let overlap = 0;
  for (const k of off.provisional) if (on.provisional.has(k)) overlap++;
  return {
    schema: "v39.gate05.aggregate-only-fids-evidence.v1",
    withoutLocation: off.counts, withLocation: on.counts,
    provisionalComparableOverlap: overlap,
    matchingFlightIdentitiesProven: false,
    actualRunwayDelayLabelProven: false,
    pilotGate05Certified: false,
    fullScientificGate05Verdict: "NOT_ASSESSABLE_FROM_THIS_MICROTEST",
    providerRequests: 0,
    limitation:
      "Provisional overlap excludes ambiguous codeshares; actual vs estimated " +
      "runway timestamps, a scheduled wheels-off reference, full T milestone, " +
      "sample adequacy, and canonical " +
      "population completeness are NOT established."
  };
}
