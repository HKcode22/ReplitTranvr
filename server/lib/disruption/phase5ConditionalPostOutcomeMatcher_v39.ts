/**
 * P0-E (F029 / F042): Separate native physical gate-out and conditional
 * schedule-revision POST outcome matching and coverage reconciliation.
 *
 * Strictly preserves Amendment E:
 *  - T-6h is the primary prediction horizon.
 *  - T-90m is the paired update horizon.
 *  - T-24h is the comparator horizon.
 *  - Actual physical gate-out is strictly distinct from schedule revisions,
 *    estimates, wheels-off proxies and arrival ETA.
 *  - Split and group consistency are checked against supplied anchors; a
 *    production authenticated readback must establish their provenance.
 *
 * Pure in-memory reconciliation: zero provider calls, zero DB writes, zero
 * synthetic labels, zero approval fabrication.
 */
import {
 assessP5AmendmentEGateOutDelayCandidate,
 type P5EGateOutFirstCycleInput
} from "./phase5AmendmentEGateOutDelayLabel_v39";
import {measureP5ConditionalSignedSchedulePair} from "./phase5ConditionalSignedSchedulePair_v39";

const SHA=/^[a-f0-9]{64}$/;
const CONDITIONAL_ID=/^leg:g5a:[a-f0-9]{64}$/;
// PostgreSQL emits UUIDs in this canonical spelling. Alternate hyphen
// positions can name the same UUID and must not evade identity comparisons.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const HORIZONS=["T-24h","T-6h","T-90m"] as const;
const HORIZON_OFFSETS_MS={"T-24h":86400000,"T-6h":21600000,"T-90m":5400000} as const;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
export type P5PostHorizon=(typeof HORIZONS)[number];
export type P5PostSlot=(typeof SLOTS)[number];
export type P5PostIdentityTier="PROVIDER_NATIVE_OPERATING_LEG"|"CONDITIONAL_QUERY_FILTERED_SERVICE";
export type P5PostSplit="train"|"validation"|"test";

const hold=(why:string):never=>{throw Error("HOLD_P5_POST_OUTCOME_MATCHER_"+why);};
const splitForDay=(day:number):P5PostSplit=>day<=20?"train":day<=25?"validation":"test";

export interface P5PreservedPreOutcomeAnchor{
 flightInstanceId:string;
 identityTier:P5PostIdentityTier;
 runDayIndex:number;
 slot:P5PostSlot;
 horizon:P5PostHorizon;
 preSnapshotId:string;
 phase7FragmentRowId:string;
 phase7GroupId:string;
 preIssuedAtUtc:string;
 predictionCutoffUtc:string;
 /** Committed PRE provenance; production readback must authenticate it.
  * Native outcome attribution requires the original response and availability.
  * Conditional attribution additionally binds the signed PRE receipt. */
 manifestSha256?:string;
 preIssueReceiptSha256?:string;
 originalSourceQueryId?:string;
 originalSourceResponseSha256?:string;
 originalSourceAvailableAtUtc?:string;
 selectedScheduledDepartureUtc?:string;
}

export interface P5NativePhysicalOutcomeEvidence{
 tier:"PROVIDER_NATIVE_OPERATING_LEG";
 flightInstanceId:string;
 runDayIndex:number;
 gateOutInput:P5EGateOutFirstCycleInput;
}

export interface P5ConditionalScheduleOutcomeEvidence{
 tier:"CONDITIONAL_QUERY_FILTERED_SERVICE";
 flightInstanceId:string;
 runDayIndex:number;
 trust:Parameters<typeof measureP5ConditionalSignedSchedulePair>[0];
 preWire:Parameters<typeof measureP5ConditionalSignedSchedulePair>[1];
 postWire:Parameters<typeof measureP5ConditionalSignedSchedulePair>[2];
 dbObservedUtc:string;
}

export type P5OutcomeEvidence=P5NativePhysicalOutcomeEvidence|P5ConditionalScheduleOutcomeEvidence;

export type P5MatchedOutcomeClassification=
 |"NATIVE_PHYSICAL_GATE_OUT_CANDIDATE_UNCERTIFIED"
 |"SIGNED_CONDITIONAL_REVISION_CANDIDATE_UNVERIFIED_ANCHOR"
 |"CANCELLED_SEPARATE_OUTCOME"
 |"PENDING_OUTCOME_EVIDENCE"
 |"CENSORED_PHYSICAL_GATE_OUT_MISSING"
 |"CENSORED_CONDITIONAL_REVISION_UNOBSERVED"
 |"UNMATCHED_NO_POST_EVIDENCE";

export interface P5MatchedLegOutcomeSummary{
 flightInstanceId:string;
 identityTier:P5PostIdentityTier;
 runDayIndex:number;
 split:P5PostSplit;
 slot:P5PostSlot;
 phase7GroupId:string;
 horizonsPresent:P5PostHorizon[];
 hasT6Primary:boolean;
 hasPairedT6T90:boolean;
 hasFullT24T6T90Triple:boolean;
 classification:P5MatchedOutcomeClassification;
 physicalGateOutCertified:boolean;
 conditionalScheduleRevisionOnly:boolean;
 candidatePhysicalDelayMinutes:number|null;
 conditionalRevisionStatus:string|null;
}

export function matchP5PreservedPreToSeparatedPostOutcomes(
 anchors:readonly P5PreservedPreOutcomeAnchor[],
 outcomes:readonly P5OutcomeEvidence[]
){
 if(!Array.isArray(anchors)||anchors.length>10000||!Array.isArray(outcomes)||outcomes.length>10000)
  hold("BOUNDED_INPUT_REQUIRED");
 const seenAnchor=new Set<string>();
 const usedSnapshots=new Set<string>(),usedFragments=new Set<string>();
 const groupOwners=new Map<string,string>();
 const legs=new Map<string,{
  flightInstanceId:string;identityTier:P5PostIdentityTier;runDayIndex:number;
  split:P5PostSplit;slot:P5PostSlot;phase7GroupId:string;frozenTMs:number;
  horizons:Map<P5PostHorizon,P5PreservedPreOutcomeAnchor>;
 }>();
 for(const a of anchors){
  if(!a||typeof a.flightInstanceId!=="string"||a.flightInstanceId.length<5||a.flightInstanceId.length>200||
     !Number.isInteger(a.runDayIndex)||a.runDayIndex<1||a.runDayIndex>31||
     !SLOTS.includes(a.slot)||!HORIZONS.includes(a.horizon)||
     !["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"].includes(a.identityTier)||
     typeof a.preSnapshotId!=="string"||!/^[1-9][0-9]{0,17}$/.test(a.preSnapshotId)||
     typeof a.phase7FragmentRowId!=="string"||!UUID.test(a.phase7FragmentRowId)||
     typeof a.phase7GroupId!=="string"||!UUID.test(a.phase7GroupId))
   hold("INVALID_PRE_ANCHOR_SCOPE");
  const isCondId=CONDITIONAL_ID.test(a.flightInstanceId);
  if((a.identityTier==="CONDITIONAL_QUERY_FILTERED_SERVICE")!==isCondId)
   hold("IDENTITY_TIER_NAMESPACE_MISMATCH");
  // Date.parse also coerces arrays/numbers; require actual clock strings
  // while preserving the existing accepted timestamp serialization.
  if(typeof a.preIssuedAtUtc!=="string"||typeof a.predictionCutoffUtc!=="string")
   hold("PRE_CUTOFF_INVARIANT_VIOLATED");
  const preMs=Date.parse(a.preIssuedAtUtc),cutMs=Date.parse(a.predictionCutoffUtc);
  if(!Number.isFinite(preMs)||!Number.isFinite(cutMs)||preMs>cutMs)
   hold("PRE_CUTOFF_INVARIANT_VIOLATED");
  // Optional provenance remains unverified supplied-anchor metadata. When
  // present, however, it cannot contradict PRE chronology at any horizon.
  if(a.originalSourceResponseSha256!==undefined&&!isValidOutcomeEvidenceSha256(a.originalSourceResponseSha256))
   hold("PRE_ANCHOR_SOURCE_DIGEST_INVALID");
  if(a.originalSourceAvailableAtUtc!==undefined){
   if(typeof a.originalSourceAvailableAtUtc!=="string")hold("PRE_ANCHOR_SOURCE_AVAILABLE_CLOCK_INVALID");
   const availableMs=Date.parse(a.originalSourceAvailableAtUtc);
   if(!Number.isFinite(availableMs)||availableMs>preMs||availableMs>cutMs)
    hold("PRE_ANCHOR_SOURCE_AVAILABLE_CLOCK_INVALID");
  }
  // Every horizon refers to the same frozen event time. Group or flight IDs
  // alone cannot turn PRE rows at different event times into a paired cohort.
  const frozenTMs=cutMs+HORIZON_OFFSETS_MS[a.horizon];
  if(!Number.isFinite(new Date(frozenTMs).getTime())||
     (a.selectedScheduledDepartureUtc!==undefined&&
      (typeof a.selectedScheduledDepartureUtc!=="string"||Date.parse(a.selectedScheduledDepartureUtc)!==frozenTMs)))
   hold("PRE_ANCHOR_FROZEN_T_CUTOFF_DRIFT");
  const anchorKey=a.flightInstanceId+"|"+a.horizon;
  if(seenAnchor.has(anchorKey))hold("DUPLICATE_FLIGHT_HORIZON_ANCHOR");
  seenAnchor.add(anchorKey);
  if(usedSnapshots.has(a.preSnapshotId)||usedFragments.has(a.phase7FragmentRowId))
   hold("REUSED_PRE_OR_FRAGMENT_IDENTIFIER");
  usedSnapshots.add(a.preSnapshotId);usedFragments.add(a.phase7FragmentRowId);
  const groupOwner=groupOwners.get(a.phase7GroupId);
  if(groupOwner&&groupOwner!==a.flightInstanceId)hold("GROUP_REUSED_ACROSS_FLIGHTS");
  groupOwners.set(a.phase7GroupId,a.flightInstanceId);
  const split=splitForDay(a.runDayIndex);
  const existing=legs.get(a.flightInstanceId);
  if(existing){
   if(existing.runDayIndex!==a.runDayIndex||existing.split!==split||existing.slot!==a.slot||
      existing.identityTier!==a.identityTier||existing.phase7GroupId!==a.phase7GroupId)
    hold("CROSS_DAY_SPLIT_TIER_OR_GROUP_LEAKAGE");
   if(existing.frozenTMs!==frozenTMs)hold("CROSS_HORIZON_FROZEN_T_DRIFT");
   existing.horizons.set(a.horizon,a);
  }else{
   legs.set(a.flightInstanceId,{
    flightInstanceId:a.flightInstanceId,identityTier:a.identityTier,runDayIndex:a.runDayIndex,
    split,slot:a.slot,phase7GroupId:a.phase7GroupId,frozenTMs,horizons:new Map([[a.horizon,a]])
   });
  }
 }
 const outcomeByFlight=new Map<string,P5OutcomeEvidence>();
 for(const o of outcomes){
  if(!o||typeof o.flightInstanceId!=="string"||!Number.isInteger(o.runDayIndex)||o.runDayIndex<1||o.runDayIndex>31||
     !["PROVIDER_NATIVE_OPERATING_LEG","CONDITIONAL_QUERY_FILTERED_SERVICE"].includes(o.tier))
   hold("INVALID_OUTCOME_EVIDENCE");
  if(outcomeByFlight.has(o.flightInstanceId))hold("DUPLICATE_OUTCOME_FOR_FLIGHT");
  const isCondId=CONDITIONAL_ID.test(o.flightInstanceId);
  if((o.tier==="CONDITIONAL_QUERY_FILTERED_SERVICE")!==isCondId)
   hold("OUTCOME_TIER_NAMESPACE_MISMATCH");
  outcomeByFlight.set(o.flightInstanceId,o);
 }
 const matched:P5MatchedLegOutcomeSummary[]=[];
 const coverage={
  totalDistinctLegs:0,
  nativeLegs:0,
  conditionalLegs:0,
  withT6Primary:0,
  pairedT6T90:0,
  fullT24T6T90Triple:0,
  observedNativePhysicalGateOut:0,
  nativePhysicalCandidatesUncertified:0,
  signedConditionalRevisionCandidatesUnverifiedAnchor:0,
  cancelledSeparateOutcome:0,
  pendingOutcomeEvidence:0,
  censoredPhysicalGateOutMissing:0,
  censoredConditionalRevisionUnobserved:0,
  unmatchedNoPostEvidence:0
 };
 for(const leg of legs.values()){
  const out=outcomeByFlight.get(leg.flightInstanceId);
  const horizonsPresent=HORIZONS.filter(h=>leg.horizons.has(h));
  const hasT6Primary=leg.horizons.has("T-6h");
  const hasPairedT6T90=hasT6Primary&&leg.horizons.has("T-90m");
  const hasFullT24T6T90Triple=hasPairedT6T90&&leg.horizons.has("T-24h");
  let classification:P5MatchedOutcomeClassification="UNMATCHED_NO_POST_EVIDENCE";
  let physicalGateOutCertified=false;
  let conditionalScheduleRevisionOnly=false;
  let candidatePhysicalDelayMinutes:number|null=null;
  let conditionalRevisionStatus:string|null=null;
  if(out){
   if(out.tier!==leg.identityTier||out.runDayIndex!==leg.runDayIndex)
    hold("CROSS_TIER_OR_CROSS_DAY_OUTCOME_MISMATCH");
   if(out.tier==="PROVIDER_NATIVE_OPERATING_LEG"){
    if(out.gateOutInput.flightInstanceId!==leg.flightInstanceId||out.gateOutInput.horizon!=="T-6h"||!hasT6Primary)
     hold("NATIVE_PHYSICAL_OUTCOME_REQUIRES_SAME_LEG_T6_PRIMARY");
    const t6=leg.horizons.get("T-6h")!;
    if(out.gateOutInput.preIssuedAtUtc!==t6.preIssuedAtUtc)
     hold("NATIVE_OUTCOME_PRE_ISSUED_CLOCK_DRIFT");
    if(typeof out.gateOutInput.selectedNativeTUtc!=="string"||
       Date.parse(out.gateOutInput.selectedNativeTUtc)!==leg.frozenTMs)
     hold("NATIVE_OUTCOME_FROZEN_T_CUTOFF_DRIFT");
    if(!isValidOutcomeEvidenceSha256(t6.originalSourceResponseSha256)||
       out.gateOutInput.frozenSourceOriginalSha256!==t6.originalSourceResponseSha256)
     hold("NATIVE_OUTCOME_PRE_SOURCE_DRIFT");
    if(typeof t6.originalSourceAvailableAtUtc!=="string"||
       !Number.isFinite(Date.parse(t6.originalSourceAvailableAtUtc))||
       out.gateOutInput.originalSourceAvailableAtUtc!==t6.originalSourceAvailableAtUtc)
     hold("NATIVE_OUTCOME_PRE_SOURCE_AVAILABLE_CLOCK_DRIFT");
    const assessed=assessP5AmendmentEGateOutDelayCandidate(out.gateOutInput);
    if(assessed.status==="MATCHED_ACTUAL_GATE_OUT_CANDIDATE"&&assessed.hasNumericalCandidate){
     // The candidate evaluator does not authenticate physical truth or rights.
     classification="NATIVE_PHYSICAL_GATE_OUT_CANDIDATE_UNCERTIFIED";
     candidatePhysicalDelayMinutes=assessed.candidateDelayMinutes;
    }else if(assessed.status==="CANCELLATION_SEPARATE_OUTCOME"){
     classification="CANCELLED_SEPARATE_OUTCOME";
    }else if(assessed.status==="PENDING_GATE_OUT_EVIDENCE"){
     classification="PENDING_OUTCOME_EVIDENCE";
    }else{
     classification="CENSORED_PHYSICAL_GATE_OUT_MISSING";
    }
   }else{
    if(!hasT6Primary)hold("CONDITIONAL_OUTCOME_REQUIRES_SAME_LEG_T6_PRIMARY");
    const t6=leg.horizons.get("T-6h")!;
    // The signed pair is internally consistent, but must also identify this
    // committed PRE. The anchor fields must come from authenticated storage.
    let signedPre:Record<string,unknown>;
    try{signedPre=JSON.parse(Buffer.from(out.preWire.bodyBase64,"base64").toString("utf8"));}
    catch{hold("CONDITIONAL_PRE_WIRE_INVALID");}
    if(!SHA.test(t6.manifestSha256??"")||!SHA.test(t6.preIssueReceiptSha256??"")||
       !/^[0-9a-f-]{36}$/.test(t6.originalSourceQueryId??"")||
       !SHA.test(t6.originalSourceResponseSha256??"")||
       !t6.selectedScheduledDepartureUtc||
       signedPre!.serviceKey!==t6.flightInstanceId||signedPre!.runDayIndex!==t6.runDayIndex||
       signedPre!.horizon!==t6.horizon||signedPre!.manifestSha256!==t6.manifestSha256||
       signedPre!.preIssueReceiptSha256!==t6.preIssueReceiptSha256||
       signedPre!.sourceQueryId!==t6.originalSourceQueryId||
       signedPre!.sourceResponseSha256!==t6.originalSourceResponseSha256||
       signedPre!.firstScheduledDepartureUtc!==t6.selectedScheduledDepartureUtc||
       signedPre!.preIssuedUtc!==t6.preIssuedAtUtc||
       Date.parse(t6.predictionCutoffUtc)!==Date.parse(t6.selectedScheduledDepartureUtc)-21600000)
      hold("CONDITIONAL_PAIR_NOT_BOUND_TO_COMMITTED_PRE");
    const measured=measureP5ConditionalSignedSchedulePair(out.trust,out.preWire,out.postWire,out.dbObservedUtc);
    if(measured.conditionalTierOnly!==true||measured.physicalGateOutCertified!==false)
     hold("CONDITIONAL_PAIR_CANNOT_CERTIFY_PHYSICAL_GATE_OUT");
    conditionalScheduleRevisionOnly=true;
    conditionalRevisionStatus=measured.status;
    if(measured.status==="OBSERVED_REVISION_GE_15_MIN"||measured.status==="OBSERVED_REVISION_LT_15_MIN")
     classification="SIGNED_CONDITIONAL_REVISION_CANDIDATE_UNVERIFIED_ANCHOR";
    else
     classification="CENSORED_CONDITIONAL_REVISION_UNOBSERVED";
   }
  }
  coverage.totalDistinctLegs++;
  if(leg.identityTier==="PROVIDER_NATIVE_OPERATING_LEG")coverage.nativeLegs++;
  else coverage.conditionalLegs++;
  if(hasT6Primary)coverage.withT6Primary++;
  if(hasPairedT6T90)coverage.pairedT6T90++;
  if(hasFullT24T6T90Triple)coverage.fullT24T6T90Triple++;
  if(classification==="SIGNED_CONDITIONAL_REVISION_CANDIDATE_UNVERIFIED_ANCHOR")coverage.signedConditionalRevisionCandidatesUnverifiedAnchor++;
  else if(classification==="NATIVE_PHYSICAL_GATE_OUT_CANDIDATE_UNCERTIFIED")coverage.nativePhysicalCandidatesUncertified++;
  else if(classification==="CANCELLED_SEPARATE_OUTCOME")coverage.cancelledSeparateOutcome++;
  else if(classification==="PENDING_OUTCOME_EVIDENCE")coverage.pendingOutcomeEvidence++;
  else if(classification==="CENSORED_PHYSICAL_GATE_OUT_MISSING")coverage.censoredPhysicalGateOutMissing++;
  else if(classification==="CENSORED_CONDITIONAL_REVISION_UNOBSERVED")coverage.censoredConditionalRevisionUnobserved++;
  else coverage.unmatchedNoPostEvidence++;
  matched.push(Object.freeze({
   flightInstanceId:leg.flightInstanceId,identityTier:leg.identityTier,runDayIndex:leg.runDayIndex,
   split:leg.split,slot:leg.slot,phase7GroupId:leg.phase7GroupId,horizonsPresent,
   hasT6Primary,hasPairedT6T90,hasFullT24T6T90Triple,classification,
   physicalGateOutCertified,conditionalScheduleRevisionOnly,
   candidatePhysicalDelayMinutes,conditionalRevisionStatus
  }));
 }
 return Object.freeze({
  schema:"v39.phase5.post-separated-outcome-coverage.v1",
  coverage:Object.freeze(coverage),
  matchedLegs:Object.freeze(matched),
  nativeAndConditionalOutcomesStrictlySeparated:true,
  scheduleRevisionNeverSubstitutedForPhysicalGateOut:true,
  productionAnchorReadbackVerified:false,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false
 });
}

export function isValidOutcomeEvidenceSha256(value:unknown):value is string{
 return typeof value==="string"&&SHA.test(value);
}

