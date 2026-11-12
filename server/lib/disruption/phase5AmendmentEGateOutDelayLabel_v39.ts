/**
 * ONE canonical Amendment E: prospective T6 departure-delay-minutes label
 * meaning, with T90 update and T24 comparator. Pure in-memory evaluation.
 *
 * A verified gate departure (off-block) is NOT wheels-off, revised
 * schedule, ADSB.lol first-airborne proxy, or disappearance of a flight.
 * All source, independent identity, terms and evidence attestations are
 * external to this function. It NEVER calls ADB, writes provider contents,
 * authorizes collection or promotes an unverified flight to primary truth.
 *
 * Reuse existing gate05RunwayDelayLabelAudit_v39.ts for the completely
 * separate scheduled-runway vs actual-wheels-off endpoint.
 */
const SHA=/^[0-9a-f]{64}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const HORIZONS={"T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000} as const;
type Horizon=keyof typeof HORIZONS;

export type P5EGateOutMilestone=
 "ACTUAL_GATE_OUT"|"ACTUAL_WHEELS_OFF"|"ADSBLOL_TAKEOFF_PROXY"|
 "ESTIMATED_RUNWAY_OR_REVISED_SCHEDULE"|"NO_EVENT";
export interface P5EGateOutFirstCycleInput{
 schema:"v39.phase5.amendment-e-gateout-first-cycle-candidate.v1";
 frozenSourceOriginalSha256:string;
 flightInstanceId:string;
 horizon:Horizon;
 /** The immutable original FIDS scheduled T; not automatically a gate-out. */
 selectedNativeTUtc:string;
 preIssuedAtUtc:string;
 originalSourceAvailableAtUtc:string;
 operatingLegIdentityExternallyVerified:boolean;
 scheduled:{
  utc:string|null;
  milestone:"SCHEDULED_GATE_OUT"|"GENERAL_SCHEDULED_DEPARTURE"|
   "SCHEDULED_WHEELS_OFF"|"UNKNOWN";
  externallyVerifiedGateOutMeaning:boolean;
  evidenceSha256:string|null;
 };
 outcome:{
  operation:"OPERATED"|"CONFIRMED_CANCELLED"|"UNKNOWN";
  event:P5EGateOutMilestone;
  actualUtc:string|null;
  firstAvailableAtUtc:string|null;
  externallyVerifiedActualOnly:boolean;
  evidenceSha256:string|null;
  recoveryGraceElapsed:boolean;
 };
}
export type P5EGateOutLabelStatus=
 "MATCHED_ACTUAL_GATE_OUT_CANDIDATE"|
 "PENDING_GATE_OUT_EVIDENCE"|
 "CENSORED_GATE_OUT_EVIDENCE_MISSING"|
 "CANCELLATION_SEPARATE_OUTCOME"|
 "OPERATING_LEG_IDENTITY_UNVERIFIED"|
 "SCHEDULED_GATE_OUT_SEMANTICS_UNVERIFIED"|
 "OUTCOME_NOT_ACTUAL_GATE_OUT"|
 "ACTUAL_GATE_OUT_SEMANTICS_UNVERIFIED"|
 "EARLY_ACTUAL_EVENT_BEFORE_PRE_ISSUE";
function refuse(x:string):never{
 throw Error("REFUSED_P5_AMENDMENT_E_GATEOUT_"+x);
}
function clock(value:unknown):number{
 if(typeof value!=="string"||!ISO.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(Date.parse(value)).toISOString()!==value)
  refuse("NONCANONICAL_UTC");
 return Date.parse(value);
}
export function assessP5AmendmentEGateOutDelayCandidate(
 input:P5EGateOutFirstCycleInput
){
 if(!input||input.schema!==
      "v39.phase5.amendment-e-gateout-first-cycle-candidate.v1"||
    !SHA.test(input.frozenSourceOriginalSha256??"")||
    typeof input.flightInstanceId!=="string"||
    !/^[A-Za-z0-9_.:|-]{5,200}$/.test(input.flightInstanceId)||
    !Object.hasOwn(HORIZONS,input.horizon)||
    !input.scheduled||!input.outcome||
    typeof input.operatingLegIdentityExternallyVerified!=="boolean"||
    typeof input.scheduled.externallyVerifiedGateOutMeaning!=="boolean"||
    typeof input.outcome.externallyVerifiedActualOnly!=="boolean"||
    typeof input.outcome.recoveryGraceElapsed!=="boolean"||
    !["SCHEDULED_GATE_OUT","GENERAL_SCHEDULED_DEPARTURE",
      "SCHEDULED_WHEELS_OFF","UNKNOWN"].includes(input.scheduled.milestone)||
    !["OPERATED","CONFIRMED_CANCELLED","UNKNOWN"].includes(input.outcome.operation)||
    !["ACTUAL_GATE_OUT","ACTUAL_WHEELS_OFF","ADSBLOL_TAKEOFF_PROXY",
      "ESTIMATED_RUNWAY_OR_REVISED_SCHEDULE","NO_EVENT"]
      .includes(input.outcome.event)||
    (input.scheduled.evidenceSha256!==null&&
      !SHA.test(input.scheduled.evidenceSha256??""))||
    (input.outcome.evidenceSha256!==null&&
      !SHA.test(input.outcome.evidenceSha256??"")))
  refuse("INVALID_SOURCE_OR_LABEL_EVIDENCE_CONTRACT");
 const native=clock(input.selectedNativeTUtc),
  issued=clock(input.preIssuedAtUtc),
  sourceAvailable=clock(input.originalSourceAvailableAtUtc);
 const cutoff=native-HORIZONS[input.horizon];
 if(issued>cutoff||sourceAvailable>issued)
  refuse("PRE_ISSUE_AFTER_CUTOFF_OR_SOURCE_NOT_YET_AVAILABLE");
 const scheduled=input.scheduled.utc===null?null:
  clock(input.scheduled.utc);
 const actual=input.outcome.actualUtc===null?null:
  clock(input.outcome.actualUtc);
 const actualAvailable=input.outcome.firstAvailableAtUtc===null?null:
  clock(input.outcome.firstAvailableAtUtc);
 if((actual===null)!==(actualAvailable===null)||
    (actual!==null&&actualAvailable!==null&&actualAvailable<actual)||
    (input.outcome.operation==="CONFIRMED_CANCELLED"&&
     (actual!==null||input.outcome.event!=="NO_EVENT"))||
    (input.outcome.event==="NO_EVENT"&&actual!==null)||
    (input.outcome.event!=="NO_EVENT"&&actual===null))
  refuse("CONTRADICTORY_OUTCOME_EVENT_AND_AVAILABILITY");
 // The outcome may be observed after the PRE issue; never inject it
 // into the earlier PRE features or change the frozen original native T.
 let status:P5EGateOutLabelStatus;
 let delay:number|null=null;
 if(!input.operatingLegIdentityExternallyVerified)
  status="OPERATING_LEG_IDENTITY_UNVERIFIED";
 else if(input.outcome.operation==="CONFIRMED_CANCELLED")
  status="CANCELLATION_SEPARATE_OUTCOME";
 else if(scheduled===null||scheduled!==native||
    input.scheduled.milestone!=="SCHEDULED_GATE_OUT"||
    input.scheduled.externallyVerifiedGateOutMeaning!==true||
    !input.scheduled.evidenceSha256)
  status="SCHEDULED_GATE_OUT_SEMANTICS_UNVERIFIED";
 else if(input.outcome.event==="NO_EVENT"||actual===null)
  status=input.outcome.recoveryGraceElapsed?
    "CENSORED_GATE_OUT_EVIDENCE_MISSING":"PENDING_GATE_OUT_EVIDENCE";
 else if(input.outcome.event!=="ACTUAL_GATE_OUT")
  status="OUTCOME_NOT_ACTUAL_GATE_OUT";
 else if(!input.outcome.externallyVerifiedActualOnly||
    !input.outcome.evidenceSha256||
    input.outcome.operation!=="OPERATED")
  status="ACTUAL_GATE_OUT_SEMANTICS_UNVERIFIED";
 else if(actual<=issued)
  status="EARLY_ACTUAL_EVENT_BEFORE_PRE_ISSUE";
 else{
  delay=(actual-scheduled)/60_000; // signed: early departure is negative
  status="MATCHED_ACTUAL_GATE_OUT_CANDIDATE";
 }
 return{
  schema:"v39.phase5.amendment-e-gateout-review-result.v1" as const,
  status,
  sourceOriginalSha256:input.frozenSourceOriginalSha256,
  flightInstanceId:input.flightInstanceId,
  horizon:input.horizon,
  cutoffUtc:new Date(cutoff).toISOString(),
  metric:"actual_gate_out_minus_originally_scheduled_gate_out_minutes" as const,
  isLeadingT6Candidate:input.horizon==="T-6h",
  conditionalOnActualOperation:true as const,
  candidateDelayMinutes:delay,
  hasNumericalCandidate:delay!==null,
  // No self-asserted JSON, boolean or SHA proves genuine external truth.
  physicalMilestoneIndependentlyCertifiedByThisFunction:false as const,
  originalSourceUseRightsCertifiedByThisFunction:false as const,
  authorizedForModelTrainingOrPrimaryHeadline:false as const,
  previousPreFeatureMutationPermitted:false as const,
  airborneArrivalEtaOrRunwayTargetSubstituted:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  phase5ScientificFreezePassed:false as const,phase6PaidGo:false as const
 };
}
