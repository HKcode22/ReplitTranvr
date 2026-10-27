/**
 * Gate 0.5: source-semantics ADMISSION for designing a small FIDS retest.
 * Pure no-I/O review helper. Never infers "actual" from time-field presence,
 * "Live" quality, departure.scheduledTime, or synthetic fixture success.
 * Caller-provided evidence references are NOT independently verified here.
 * Even READY_FOR_HUMAN_SOURCE_REVIEW grants no paid request or scientific PASS.
 */
import type {Gate05PairAggregateV39}
  from "./gate05FidsAggregateEvidence_v39";

export type Gate05CandidateSourceEvidenceV39 = Readonly<{
  actualWheelsOff:
    "EXTERNALLY_VERIFIED_ACTUAL_RUNWAY_EVENT" |
    "FIDS_ACTUAL_OR_ESTIMATED" | "NOT_ESTABLISHED";
  scheduledWheelsOff:
    "INDEPENDENT_SCHEDULED_RUNWAY_REFERENCE" |
    "GENERAL_SCHEDULED_DEPARTURE" | "NOT_ESTABLISHED";
  forecastCutoffAsOf:
    "SOURCE_TIMESTAMPED_BEFORE_T" | "NO_SOURCE_AS_OF_PROOF";
  operatingFlightIdentity:
    "INDEPENDENT_OPERATING_LEG" | "PROVISIONAL_FIDS_CODESHARE";
  /** References for subsequent human/source audit; no automatic trust. */
  evidenceReferenceIds: readonly string[];
}>;

export type Gate05ProspectiveReviewV39 = Readonly<{
  schema: "v39.gate05.prospective-label-source-review.v1";
  status: "NEEDS_SEMANTIC_OR_ASOF_EVIDENCE" |
    "NEEDS_REAL_RESPONSE_FIELD_COVERAGE" |
    "READY_FOR_HUMAN_SOURCE_REVIEW";
  blockers: readonly string[];
  fidsDepartureObjectsObserved: number;
  runwayTimestampPresentAcrossVariants: number;
  scheduledTimestampPresentAcrossVariants: number;
  /** Human must authenticate source refs before any paid study design. */
  referencesIndependentlyVerified: false;
  previousPaidGate05Reclassified: false;
  actualRunwayDelayLabelProven: false;
  newPaidPilotAuthorized: false;
  providerRequests: 0;
  databaseWrites: 0;
}>;

export function reviewGate05ProspectiveLabelSourceV39(
  aggregates: Gate05PairAggregateV39,
  sources: Gate05CandidateSourceEvidenceV39,
): Gate05ProspectiveReviewV39 {
  if (aggregates?.schema !== "v39.gate05.aggregate-only-fids-evidence.v1" ||
      !sources || !Array.isArray(sources.evidenceReferenceIds) ||
      sources.evidenceReferenceIds.length > 20 ||
      sources.evidenceReferenceIds.some(r =>
        typeof r !== "string" || r.trim().length < 4 || r.length > 512))
    throw Error("GATE05_SOURCE_REVIEW_INVALID_INPUT");
  const n = aggregates.withoutLocation.objectsReturned +
    aggregates.withLocation.objectsReturned;
  const runway = aggregates.withoutLocation.runwayTimeUtcPresent +
    aggregates.withLocation.runwayTimeUtcPresent;
  const scheduled = aggregates.withoutLocation.scheduledTimeUtcPresent +
    aggregates.withLocation.scheduledTimeUtcPresent;
  const blockers: string[] = [];
  if (sources.actualWheelsOff !== "EXTERNALLY_VERIFIED_ACTUAL_RUNWAY_EVENT")
    blockers.push("ACTUAL_WHEELS_OFF_NOT_SOURCE_VERIFIED");
  if (sources.scheduledWheelsOff !==
      "INDEPENDENT_SCHEDULED_RUNWAY_REFERENCE")
    blockers.push("SCHEDULED_WHEELS_OFF_BASELINE_UNVERIFIED");
  if (sources.forecastCutoffAsOf !== "SOURCE_TIMESTAMPED_BEFORE_T")
    blockers.push("FEATURE_AS_OF_CUTOFF_T_UNKNOWN");
  if (sources.operatingFlightIdentity !== "INDEPENDENT_OPERATING_LEG")
    blockers.push("CANONICAL_FLIGHT_IDENTITY_UNKNOWN");
  if (sources.evidenceReferenceIds.length < 2)
    blockers.push("INSUFFICIENT_SOURCE_REFERENCES_FOR_HUMAN_AUDIT");
  const status: Gate05ProspectiveReviewV39["status"] =
    blockers.length ? "NEEDS_SEMANTIC_OR_ASOF_EVIDENCE" :
      runway === 0 || scheduled === 0 || n === 0 ?
        "NEEDS_REAL_RESPONSE_FIELD_COVERAGE" :
        "READY_FOR_HUMAN_SOURCE_REVIEW";
  return {
    schema: "v39.gate05.prospective-label-source-review.v1",
    status, blockers,
    fidsDepartureObjectsObserved: n,
    runwayTimestampPresentAcrossVariants: runway,
    scheduledTimestampPresentAcrossVariants: scheduled,
    referencesIndependentlyVerified: false,
    previousPaidGate05Reclassified: false,
    actualRunwayDelayLabelProven: false,
    newPaidPilotAuthorized: false,
    providerRequests: 0, databaseWrites: 0,
  };
}


/**
 * Future, separately authorized FIDS operator use only:
 * summarize nested time-field PRESENCE immediately while the parsed response
 * is in memory. Output contains no flight IDs, coordinate, raw date/time,
 * airline or provider source payload, and never asserts runway actuality.
 */
export function summarizeGate05NestedTimePresenceV39(rows: unknown): Readonly<{
  schema: "v39.gate05.nested-fids-time-presence.v1";
  responseObjects: number;
  malformedObjects: number;
  scheduledTimeUtcFieldsPresent: number;
  revisedTimeUtcFieldsPresent: number;
  runwayTimeUtcFieldsPresent: number;
  actualWheelsOffProven: false;
  scheduledWheelsOffProven: false;
  flightIdentityProven: false;
  eventAsOfTProven: false;
  rawProviderRecordsPersisted: false;
  providerRequests: 0;
}> {
  if (!Array.isArray(rows) || rows.length > 2000)
    throw Error("GATE05_NESTED_FIELDS_INVALID_RESPONSE");
  const object = (v: unknown): Record<string,unknown> | null =>
    v !== null && typeof v === "object" && !Array.isArray(v) ?
      v as Record<string,unknown> : null;
  const timestampPresent = (v: unknown): boolean => {
    const str=object(v)?.utc;
    return typeof str === "string" && str.trim().length > 0;
  };
  let malformed=0,scheduled=0,revised=0,runway=0;
  for(const row of rows){
    const flight=object(row);
    if(!flight){malformed++;continue;}
    const departure=object(flight.departure);
    if(timestampPresent(departure?.scheduledTime))scheduled++;
    if(timestampPresent(departure?.revisedTime))revised++;
    if(timestampPresent(departure?.runwayTime))runway++;
  }
  return {
    schema:"v39.gate05.nested-fids-time-presence.v1",
    responseObjects:rows.length,malformedObjects:malformed,
    scheduledTimeUtcFieldsPresent:scheduled,
    revisedTimeUtcFieldsPresent:revised,
    runwayTimeUtcFieldsPresent:runway,
    actualWheelsOffProven:false,
    scheduledWheelsOffProven:false,
    flightIdentityProven:false,
    eventAsOfTProven:false,
    rawProviderRecordsPersisted:false,providerRequests:0,
  };
}
