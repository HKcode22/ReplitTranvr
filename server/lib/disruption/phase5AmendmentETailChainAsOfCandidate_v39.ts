/**
 * Phase5 Amendment E supplemental as-of tail/previous-leg feature candidate.
 *
 * Reuses the existing P5E as-of selector's exact field
 * "prior_aircraft_turnaround_minutes"; does NOT implement a second
 * PRE writer, an AeroDataBox source fetch or a physical-leg identity join.
 *
 * Actual prior-arrival gate-in -> originally available scheduled next
 * gate-out is a PLANNED TURN BUFFER, not the eventually realized
 * actual gate-to-gate turnaround and not a wheel-on/wheel-off measurement.
 */
import type {P5EAsOfObservation} from
 "./phase5AmendmentEAsOfFeatureSelectionOffline_v39";

const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const ICAO=/^[A-Z]{4}$/;
const TAIL=/^[A-Z0-9-]{2,12}$/;
const SHA=/^[a-f0-9]{64}$/;
const HORIZON={"T-24h":24*3600_000,"T-6h":6*3600_000,
 "T-90m":90*60_000} as const;
const hold=(x:string):never=>{throw Error("REFUSED_P5_E_TAIL_ASOF_"+x);};
const millis=(s:string)=>{
 if(typeof s!=="string"||!UTC.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)hold("INVALID_TIMESTAMP");
 return Date.parse(s);
};
export interface P5ETailAsOfLegEvidence{
 legId:string;
 /** Unique physical operating leg; a marketing code/shared tail is NOT proof. */
 physicallyOperatingLegIndependentlyReviewed:boolean;
 tailRegistration:string|null;
 tailAssignmentAvailableAtUtc:string|null;
 tailIdentityIndependentlyVerified:boolean;
 originIcao:string;
 destinationIcao:string;
 /** The original planned scheduled gate OUT on CURRENT flight only. */
 scheduledGateOutUtc?:string|null;
 scheduledGateOutAvailableAtUtc?:string|null;
 /** The prior physical leg's actual gate IN, never wheels-on proxy. */
 actualGateInUtc?:string|null;
 actualGateInAvailableAtUtc?:string|null;
 sourceRecordSha256:string;
 sourceUseRightsIndependentlyReviewed:boolean;
}
export interface P5ETailAsOfInput{
 flightInstanceId:string;
 horizon:keyof typeof HORIZON;
 selectedNativeTUtc:string;
 cutoffUtc:string;
 issuedAtUtc:string;
 current:P5ETailAsOfLegEvidence;
 preceding:P5ETailAsOfLegEvidence|null;
}
export type P5ETailAsOfState=
 "PROSPECTIVE_PRIOR_GATE_IN_TO_SCHEDULED_GATE_OUT_BUFFER_CANDIDATE"|
 "MISSING_PRIOR_OPERATING_LEG"|"UNVERIFIED_OPERATING_OR_TAIL_IDENTITY"|
 "TAIL_OR_CONNECTING_AIRPORT_DIFFERENT"|"PRIOR_GATE_IN_NOT_KNOWN_AT_ISSUE"|
 "CURRENT_SCHEDULE_NOT_KNOWN_AT_ISSUE"|
 "GATE_MILESTONE_NOT_AVAILABLE_OR_IMPLAUSIBLE"|
 "SOURCE_RIGHTS_OR_ORIGINAL_UNVERIFIED";
export function assessP5ETailAsOfTurnCandidate(p:P5ETailAsOfInput):{
 state:P5ETailAsOfState;observation:P5EAsOfObservation|null;
 measuredHistoricalTurnaround:false;
 btsHistoricalPublicationBackfillsPre:false;
 actualStage14PREMaterialized:false;
 paidSourceCalls:0;databaseWrites:0;phase6PaidGo:false;
}{
 if(!p||!p.current||typeof p.flightInstanceId!=="string"||
    p.flightInstanceId.length<5||!Object.hasOwn(HORIZON,p.horizon))
  hold("INVALID_REQUEST");
 const issue=millis(p.issuedAtUtc),cutoff=millis(p.cutoffUtc);
 if(millis(p.selectedNativeTUtc)-cutoff!==HORIZON[p.horizon]||
    issue>cutoff)hold("ISSUED_AFTER_FROZEN_PRE_CUTOFF");
 const no=(state:P5ETailAsOfState)=>({
  state,observation:null,measuredHistoricalTurnaround:false as const,
  btsHistoricalPublicationBackfillsPre:false as const,
  actualStage14PREMaterialized:false as const,
  paidSourceCalls:0 as const,databaseWrites:0 as const,phase6PaidGo:false as const
 });
 const prev=p.preceding;
 if(prev===null)return no("MISSING_PRIOR_OPERATING_LEG");
 const fields=[p.current,prev];
 if(fields.some(x=>typeof x.legId!=="string"||x.legId.length<5||
     !ICAO.test(x.originIcao)||!ICAO.test(x.destinationIcao)||
     !SHA.test(x.sourceRecordSha256)))hold("MALFORMED_UNBOUND_SOURCE_PROVENANCE");
 if(p.current.legId===prev.legId)hold("SELF_REFERENTIAL_TAIL_CHAIN");
 if(fields.some(x=>!x.sourceUseRightsIndependentlyReviewed))
  return no("SOURCE_RIGHTS_OR_ORIGINAL_UNVERIFIED");
 if(fields.some(x=>!x.physicallyOperatingLegIndependentlyReviewed||
    !x.tailIdentityIndependentlyVerified||
    x.tailRegistration===null||
    !TAIL.test(x.tailRegistration)||
    x.tailAssignmentAvailableAtUtc===null))
  return no("UNVERIFIED_OPERATING_OR_TAIL_IDENTITY");
 if(p.current.tailRegistration!==prev.tailRegistration||
    prev.destinationIcao!==p.current.originIcao)
  return no("TAIL_OR_CONNECTING_AIRPORT_DIFFERENT");
 for(const x of fields)
  if(millis(x.tailAssignmentAvailableAtUtc!)>issue)
   return no("UNVERIFIED_OPERATING_OR_TAIL_IDENTITY");
 if(prev.actualGateInUtc===null||
    prev.actualGateInUtc===undefined||
    prev.actualGateInAvailableAtUtc===null||
    prev.actualGateInAvailableAtUtc===undefined)
  return no("PRIOR_GATE_IN_NOT_KNOWN_AT_ISSUE");
 if(p.current.scheduledGateOutUtc===null||
    p.current.scheduledGateOutUtc===undefined||
    p.current.scheduledGateOutAvailableAtUtc===null||
    p.current.scheduledGateOutAvailableAtUtc===undefined)
  return no("CURRENT_SCHEDULE_NOT_KNOWN_AT_ISSUE");
 const arrived=millis(prev.actualGateInUtc);
 const arrivalAvailable=millis(prev.actualGateInAvailableAtUtc);
 const schedule=millis(p.current.scheduledGateOutUtc);
 const scheduleAvailable=millis(p.current.scheduledGateOutAvailableAtUtc);
 if(arrivalAvailable>issue||arrived>issue||
    arrivalAvailable<arrived)return no("PRIOR_GATE_IN_NOT_KNOWN_AT_ISSUE");
 if(scheduleAvailable>issue)return no("CURRENT_SCHEDULE_NOT_KNOWN_AT_ISSUE");
 // Do not interpret an impossible or more-than-72-hour gap as turnaround.
 const gap=(schedule-arrived)/60_000;
 if(gap<0||gap>72*60||!Number.isFinite(gap))
  return no("GATE_MILESTONE_NOT_AVAILABLE_OR_IMPLAUSIBLE");
 // User-facing feature family predates this adapter in Amendment E. The
 // value is a scheduled departure buffer, not an observed completed turn.
 const observation:P5EAsOfObservation={
  flightInstanceId:p.flightInstanceId,
  field:"prior_aircraft_turnaround_minutes",
  value:gap,source:"REVIEWED_HISTORIC_CONTEXT",
  sourceRecordId:"tail-link-"+p.current.legId+"-"+prev.legId,
  observedAtUtc:prev.actualGateInUtc,
  availableAtUtc:new Date(Math.max(arrivalAvailable,
    scheduleAvailable,millis(p.current.tailAssignmentAvailableAtUtc!),
    millis(prev.tailAssignmentAvailableAtUtc!))).toISOString(),
  rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW"
 };
 return {
  state:"PROSPECTIVE_PRIOR_GATE_IN_TO_SCHEDULED_GATE_OUT_BUFFER_CANDIDATE",
  observation,measuredHistoricalTurnaround:false,
  btsHistoricalPublicationBackfillsPre:false,
  actualStage14PREMaterialized:false,
  paidSourceCalls:0,databaseWrites:0,phase6PaidGo:false
 };
}
