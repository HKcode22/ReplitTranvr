/**
 * V3.9-f.8 §16: review a NEW paid Gate05's measured sample and semantic
 * prerequisites without claiming that self-reported booleans certify data.
 * No provider I/O, no DB, no credentials, no billed request, no authorization.
 *
 * The legacy Gate05 evaluator returned only passed=true/false and conflated
 * insufficient sample with scientific failure. Its booleans can also be
 * freely asserted in a JSON file. This strictly limited review does not do so.
 */
import {
  validateGate05InputV39,
  type Gate05Measurement, type Gate05SampleCriteria
} from "./gates_v3";

const counters=[
  ["notificationsReceived","minNotifications"],
  ["uniqueFlights","minUniqueFlights"],
  ["completedFlights","minCompletedFlights"],
  ["airborneFlights","minAirborneFlights"],
  ["airbornePoints","minAirbornePoints"],
  ["pilotDurationMinutes","minPilotDurationMinutes"],
] as const;
const critical=[
  "payloadFieldInventory","providerTimestampSemantics","tConstructibility",
  "primaryTargetConstructibility","fidsMaxRange","fidsBoundaryBehavior",
  "withLegBehavior","codeshareAmbiguity","observationCadence",
  "trajectoryCompleteness","arrivalNotificationLatency","censoringGrace",
  "rateLimit","unsettledAlertCreditBurst"
] as const;
export interface Gate05NewPilotReviewV39 {
  measurements:Gate05Measurement;
  criteria:Gate05SampleCriteria;
  /** These must describe a newly selected pilot, NOT an old 10min microtest. */
  frozenAtUtc:string;
  firstPaidActionAtUtc:string;
  lastObservationAtUtc:string;
  /** Source facts not inferable from FIDS field presence or Live quality. */
  rawBefore2xxEvidencePresent:boolean;
  exactProviderSubscriptionStopEvidencePresent:boolean;
  sourceAuthenticatedMilestoneEvidencePresent:boolean;
  independentlyAuditedOperatingLegIdentityPresent:boolean;
  perObservationRunwayActualityEvidencePresent:boolean;
}
export interface Gate05NewPilotTriageV39 {
  schema:"v39.gate05.new-scientific-pilot-triage.v1";
  status:"FAIL"|"INSUFFICIENT_SAMPLE"|"READY_FOR_INDEPENDENT_SOURCE_AUDIT";
  missingSampleMinima:string[];
  failedScientificChecks:string[];
  criteriaWereFrozenBeforePaidAction:boolean;
  actualSampleMinimumsSatisfied:boolean;
  provenFullScientificGate05Pass:false;
  newPaidAuthorizationGranted:false;
  providerRequests:0;
  databaseWrites:0;
}
const instant=(s:string):number=>{
  if(typeof s!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,3})?Z$/.test(s))
    throw Error("GATE05_RETEST_INVALID_UTC");
  const d=new Date(s),ms=d.getTime();
  if(!Number.isFinite(ms)||d.toISOString().slice(0,19)!==s.slice(0,19))
    throw Error("GATE05_RETEST_INVALID_UTC");
  return ms;
};
export function triageGate05NewScientificPilotV39(
  input:Gate05NewPilotReviewV39
):Gate05NewPilotTriageV39 {
  if(!input||typeof input!=="object")throw Error("GATE05_RETEST_INVALID");
  validateGate05InputV39(input.measurements,input.criteria);
  for(const k of [
    "rawBefore2xxEvidencePresent","exactProviderSubscriptionStopEvidencePresent",
    "sourceAuthenticatedMilestoneEvidencePresent",
    "independentlyAuditedOperatingLegIdentityPresent",
    "perObservationRunwayActualityEvidencePresent"
  ] as const){
    if(typeof input[k]!=="boolean")throw Error("GATE05_RETEST_INVALID_FLAG_"+k);
  }
  const freeze=instant(input.frozenAtUtc);
  const first=instant(input.firstPaidActionAtUtc);
  const last=instant(input.lastObservationAtUtc);
  const chronology=freeze<first && first<=last;
  const missing=counters.filter(([k,c])=>input.measurements[k]<input.criteria[c])
    .map(([k])=>k);
  // A deficit in population sample is not the same as a failed semantic rule.
  const failed:string[]=[...critical.filter(k=>input.measurements[k]!==true)];
  if(!chronology)failed.push("FREEZE_MUST_PRECEDE_PAID_ACTION");
  if(!input.rawBefore2xxEvidencePresent)failed.push("RAW_BEFORE_2XX_NOT_EVIDENCED");
  if(!input.exactProviderSubscriptionStopEvidencePresent)failed.push("STOP_NOT_EVIDENCED");
  if(!input.sourceAuthenticatedMilestoneEvidencePresent)failed.push("NATIVE_T_NOT_VERIFIED");
  if(!input.independentlyAuditedOperatingLegIdentityPresent)failed.push("PHYSICAL_OPERATING_LEG_UNVERIFIED");
  if(!input.perObservationRunwayActualityEvidencePresent)failed.push("RUNWAY_ACTUALITY_UNVERIFIED");
  // This remains a REVIEW even if all booleans were supplied as true.
  // An independently corroborated reader of DB + provider source controls
  // must make the final f.8 PASS decision, not caller-provided JSON.
  return {
    schema:"v39.gate05.new-scientific-pilot-triage.v1",
    status:failed.length?"FAIL":missing.length?"INSUFFICIENT_SAMPLE":
      "READY_FOR_INDEPENDENT_SOURCE_AUDIT",
    missingSampleMinima:missing,failedScientificChecks:failed,
    criteriaWereFrozenBeforePaidAction:chronology,
    actualSampleMinimumsSatisfied:missing.length===0,
    provenFullScientificGate05Pass:false,
    newPaidAuthorizationGranted:false,providerRequests:0,databaseWrites:0
  };
}
