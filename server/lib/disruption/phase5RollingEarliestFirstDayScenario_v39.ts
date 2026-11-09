/**
 * Phase 5 — earliest possible prospective Phase6 first 00Z batch-day
 * given a HYPOTHETICAL all-gates-ready source time and explicit worst-case
 * latency/clock guards.
 *
 * No real independent freeze, authenticated ready timestamp, provider
 * entitlement, valid source, signed calendar or paid GO is inferred.
 * This rolls the Nov24 SAMPLE start forward/backward on new evidence; it
 * never deliberately waits for a fixed arbitrary calendar date.
 */
import {
 proposeP5RealCorrectedPairDateGeometry,
 type P5DateOnlyCandidateResult
} from "./phase5CorrectedPairDateGeometryProposal_v39";

const MS=1000, HOUR=3_600_000, DAY=86_400_000;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const refusal=(s:string):never=>{
 throw new Error("REFUSED_P5_ROLLING_FIRST_DAY_"+s);
};
const timestamp=(v:unknown,label:string):number=>{
 if(typeof v!=="string"||!ISO.test(v)||
    !Number.isFinite(Date.parse(v))||
    new Date(Date.parse(v)).toISOString()!==v)
  refusal(label+"_NOT_EXACT_UTC");
 return Date.parse(v);
};
const bound=(n:unknown,lo:number,hi:number,label:string):number=>{
 if(!Number.isSafeInteger(n)||typeof n!=="number"||n<lo||n>hi)
  refusal(label+"_NOT_VALID_BOUND");
 return n;
};
const date=(n:number)=>new Date(n).toISOString().slice(0,10);
const iso=(n:number)=>new Date(n).toISOString();

export interface P5RollingFirstDayScenarioInput {
 ownerCorrectedReadback:unknown;
 /**
  * HYPOTHETICAL: every independent Phase5 freeze/source/rights/budget/receiver
  * prerequisite has ALREADY passed by this exact UTC instant. This pure
  * function cannot authenticate that claim or call a real readiness checker.
  */
 assumedAllGatesReadyAtUtc:string;
 /** Nonzero conservative upper bound on GitHub scheduler slip, in seconds. */
 schedulerSlipBoundSeconds:number;
 /** Nonzero conservative upper bound on provider response+PG commit seconds. */
 responseAndPersistBoundSeconds:number;
 /** Extra strict pre-PRE deadline margin, in seconds. */
 preCommitMarginSeconds:number;
 /** Optional additional prospective buffer, never subtracts from T24. */
 additionalReserveSeconds?:number;
 /** Bounds date search, cannot circumvent a failed 31-day calendar. */
 maxCalendarSpanDays?:number;
}
export interface P5RollingFirstDayScenarioResult {
 schema:"v39.phase5.rolling-first-day-solely-provisional.v1";
 status:"SCENARIO_EARLIEST_DATE_ONLY_NOT_RELEASE"|
        "HOLD_SCENARIO_CANNOT_FIT_THIRTY_ONE_DATES";
 assumedAllGatesReadyAtUtc:string;
 conservativeReadyForFirstT24Utc:string;
 earliestFirstBatchDayUtcDate:string;
 earliestFirstBatchStartUtc:string;
 hypotheticalFirstWindowStartT24Utc:string;
 totalExtraPreT24SafetySeconds:number;
 dateCandidate:P5DateOnlyCandidateResult;
 proposedEndDateUtc:string|null;
 proposedCalendarSpanDays:number|null;
 doesNotForceNov24OrJan05:true;
 actualReadinessEvidenceAuthenticated:false;
 actualEarliestPhysicalOperatingFlightTVerified:false;
 providerFidsReachabilityAndLatencyVerified:false;
 all31DaysFrozenAndIndependentlyAudited:false;
 providerRetentionRightsVerified:false;
 realSourcePREPOSTReceiverVerified:false;
 scientificPhase5FreezePassed:false;
 phase6PaidGo:false;
 providerCalls:0;databaseWrites:0;paidAlertCreates:0;
}
/**
 * Prospective lower bound:
 *   ready + worst scheduler slip + provider persist + guard + extra
 *   must be <= (first possible flight-window start - 24 hours).
 *
 * First slot is exactly 00:00 UTC in the existing six-slot rotation. This
 * never asserts a genuine flight actually begins then. The actual
 * flight-level T and T24 writer remain separate physical evidence gates.
 */
export function proposeP5RollingEarliestFirstDayScenario(
 input:P5RollingFirstDayScenarioInput
):P5RollingFirstDayScenarioResult {
 if(!input||typeof input!=="object")
  refusal("INPUT_MISSING");
 const ready=timestamp(input.assumedAllGatesReadyAtUtc,"READY");
 const slip=bound(input.schedulerSlipBoundSeconds,1,3600,"SCHEDULER_SLIP");
 const persist=bound(input.responseAndPersistBoundSeconds,1,3600,"RESPONSE_AND_PERSIST");
 const margin=bound(input.preCommitMarginSeconds,1,900,"CUTOFF_MARGIN");
 const extra=bound(input.additionalReserveSeconds??0,0,86400,"EXTRA_BUFFER");
 const total=slip+persist+margin+extra;
 const earliestCutoffSafeSourceTime=ready+total*MS;
 const earliestPossibleWindowStart=earliestCutoffSafeSourceTime+24*HOUR;
 if(!Number.isFinite(earliestPossibleWindowStart)||
    earliestPossibleWindowStart>8.64e15-DAY)
  refusal("OVERFLOWED_SAFETY_WINDOW");
 const firstMidnight=Math.ceil(earliestPossibleWindowStart/DAY)*DAY;
 const firstT24=firstMidnight-DAY;
 if(firstT24<earliestCutoffSafeSourceTime)
  refusal("PROSPECTIVE_FIRST_T24_LEAD_UNSAFE");
 const firstDate=date(firstMidnight);
 const candidate=proposeP5RealCorrectedPairDateGeometry({
  ownerCorrectedReadback:input.ownerCorrectedReadback,
  firstRunDateUtc:firstDate,
  maxCalendarSpanDays:input.maxCalendarSpanDays
 });
 return {
  schema:"v39.phase5.rolling-first-day-solely-provisional.v1",
  status:candidate.status==="DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE"?
   "SCENARIO_EARLIEST_DATE_ONLY_NOT_RELEASE":
   "HOLD_SCENARIO_CANNOT_FIT_THIRTY_ONE_DATES",
  assumedAllGatesReadyAtUtc:input.assumedAllGatesReadyAtUtc,
  conservativeReadyForFirstT24Utc:iso(earliestCutoffSafeSourceTime),
  earliestFirstBatchDayUtcDate:firstDate,
  earliestFirstBatchStartUtc:iso(firstMidnight),
  hypotheticalFirstWindowStartT24Utc:iso(firstT24),
  totalExtraPreT24SafetySeconds:total,
  dateCandidate:candidate,
  proposedEndDateUtc:candidate.lastRunDateUtc,
  proposedCalendarSpanDays:candidate.elapsedCalendarDays,
  doesNotForceNov24OrJan05:true,
  actualReadinessEvidenceAuthenticated:false,
  actualEarliestPhysicalOperatingFlightTVerified:false,
  providerFidsReachabilityAndLatencyVerified:false,
  all31DaysFrozenAndIndependentlyAudited:false,
  providerRetentionRightsVerified:false,
  realSourcePREPOSTReceiverVerified:false,
  scientificPhase5FreezePassed:false,
  phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,paidAlertCreates:0
 };
}
