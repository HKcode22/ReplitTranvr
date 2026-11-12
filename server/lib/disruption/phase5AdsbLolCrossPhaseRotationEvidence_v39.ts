/**
 * ONE canonical Phase5 Amendment E: ADSB.lol physical-position evidence may
 * complement a prospectively ORIGINAL AeroDataBox operating-leg source,
 * before departure (incoming tail context), after departure (optional
 * inferred takeoff bracket) and AIRBORNE (reuse Phase4 gate separately).
 *
 * Pure evidence admission only. NO live fetch, no database, no new observer,
 * no PRE writer, no actual gate-in/out or provider-certified runway label.
 */
import {
 gate05AdsbAsOfEligibleV39,
 type Gate05AdsbCandidateV39
} from "./gate05ZeroCostAdsbEvidence_v39";

const SHA=/^[a-f0-9]{64}$/;
const ICAO24=/^[a-f0-9]{6}$/;
const ICAO=/^[A-Z]{4}$/;
const TAIL=/^[A-Z0-9-]{2,12}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const OFFSET={
 "T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000
} as const;
const MAX_FRESH_PRE_SECONDS=15*60;
const MAX_POST_BRACKET_SECONDS=20*60;
const hold=(x:string):never=>{
 throw Error("REFUSED_P5_ADSB_LOL_CROSS_PHASE_"+x);
};
const time=(s:string):number=>{
 if(typeof s!=="string"||!UTC.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(Date.parse(s)).toISOString()!==s)hold("INVALID_UTC");
 return Date.parse(s);
};

export interface P5AdsbPhysicalLegLinkV39 {
 /** Provider-native physical leg identifier; never a marketing code alone. */
 operatingLegId:string;
 originIcao:string;destinationIcao:string;
 /** Independently matched ADB original to unique physical operation. */
 exactAeroDataBoxOperatingLegReviewed:boolean;
 originalAeroDataBoxResponseSha256:string;
 tailRegistration:string|null;
 tailAssignmentAsOfUtc:string|null;
 aircraftIcao24Hex:string|null;
 aircraftLinkIndependentlyReviewed:boolean;
 aircraftSwapOrConflict:boolean;
}
export interface P5AdsbUseReviewV39{
 adsbSourceAndODbLReviewed:boolean;
 reviewedODbLAttributionAndDerivedDataPolicySha256:string|null;
 liveAPIProductionAccessApproved:boolean;
 originalAeroDataBoxUseRightsReviewed:boolean;
}
type Reason =
 "NO_POSITION"|"UNREVIEWED_SOURCE_RIGHTS_OR_PRODUCTION_API"|
 "UNREVIEWED_OR_AMBIGUOUS_PHYSICAL_LEG"|"DIFFERENT_TAIL_AIRCRAFT_OR_AIRPORT"|
 "POSITION_RECEIVED_AFTER_PRE_ISSUE"|"POSITION_STALE_FOR_PRE"|
 "INCONSISTENT_ADSB_POSITION_PROVENANCE"|
 "NOT_A_GROUND_TO_AIR_TRANSITION"|"POST_POSITION_TIMESTAMP_ORDER_OR_GAP"|
 "POST_AIRPORT_GEOMETRY_NOT_INDEPENDENTLY_VERIFIED";

export interface P5AdsbPreInboundContextInputV39{
 flightInstanceId:string;
 horizon:keyof typeof OFFSET;
 selectedNativeTUtc:string;
 issuedAtUtc:string;
 cutoffUtc:string;
 current:P5AdsbPhysicalLegLinkV39;
 inbound:P5AdsbPhysicalLegLinkV39|null;
 inboundPosition:Gate05AdsbCandidateV39|null;
 source:P5AdsbUseReviewV39;
 /** Separate permission to process the captured position as offline input. */
 offlineResearchSourceProvenanceIndependentlyReviewed:boolean;
}
export interface P5AdsbPostBracketInputV39{
 departing:P5AdsbPhysicalLegLinkV39;
 lastGround:Gate05AdsbCandidateV39|null;
 firstAirborne:Gate05AdsbCandidateV39|null;
 reviewedAtUtc:string;
 source:P5AdsbUseReviewV39;
 /** Independently assessed true near-departure-airport track geometry. */
 departureAirportTrackGeometryIndependentlyReviewed:boolean;
}
export type P5AdsbResult = {
 schema:"v39.phase5.adsblol-fids-cross-phase-evidence.v1";
 eligible:boolean;reason:Reason|null;
 source:"ADSB_LOL";
 evidenceMode:"PRE_INBOUND_AIRCRAFT_CONTEXT"|"POST_TAKEOFF_PROXY_BRACKET";
 evidenceTier:"SUPPLEMENTAL_UNCERTAIN_POSITION_ONLY";
 adsbDataOdblLicense:string;
 actualBtsHistoricalBackfill:false;
 sameTailCertifiedByFunction:false;
 trueGateArrivalCertified:false;
 actualGateOutCertified:false;
 certifiedActualWheelsOff:false;
 actualAirborneArrivalEtaGenerated:false;
 sourceUseRightsCertifiedByFunction:false;
 productionAdsblolAccessAuthorizedByFunction:false;
 originalAeroDataBoxPreReplaced:false;
 actualStage14PreFeatureWritten:false;
 actualPostSourceRowWritten:false;
 originalFlightDenominatorChanged:false;
 providerHttpRequests:0;databaseWrites:0;phase5ScientificFreeze:false;
 phase6PaidGo:false;
};
const base=(mode:P5AdsbResult["evidenceMode"],reason:Reason|null):
 P5AdsbResult=>({
 schema:"v39.phase5.adsblol-fids-cross-phase-evidence.v1",
 eligible:reason===null,reason,source:"ADSB_LOL",evidenceMode:mode,
 evidenceTier:"SUPPLEMENTAL_UNCERTAIN_POSITION_ONLY",
 adsbDataOdblLicense:"ODbL-1.0",actualBtsHistoricalBackfill:false,
 sameTailCertifiedByFunction:false,trueGateArrivalCertified:false,
 actualGateOutCertified:false,certifiedActualWheelsOff:false,
 actualAirborneArrivalEtaGenerated:false,sourceUseRightsCertifiedByFunction:false,
 productionAdsblolAccessAuthorizedByFunction:false,
 originalAeroDataBoxPreReplaced:false,actualStage14PreFeatureWritten:false,
 actualPostSourceRowWritten:false,originalFlightDenominatorChanged:false,
 providerHttpRequests:0,databaseWrites:0,phase5ScientificFreeze:false,
 phase6PaidGo:false
 });
function validLeg(p:P5AdsbPhysicalLegLinkV39):boolean{
 if(!p||typeof p.operatingLegId!=="string"||
    p.operatingLegId.length<5||p.operatingLegId.length>200||
    !ICAO.test(p.originIcao)||!ICAO.test(p.destinationIcao)||
    !SHA.test(p.originalAeroDataBoxResponseSha256??""))
  hold("MALFORMED_PHYSICAL_LEG_BOUNDARY");
 if(p.tailAssignmentAsOfUtc!==null)time(p.tailAssignmentAsOfUtc);
 return p.exactAeroDataBoxOperatingLegReviewed===true&&
   p.aircraftLinkIndependentlyReviewed===true&&
   p.aircraftSwapOrConflict===false&&
   typeof p.tailRegistration==="string"&&TAIL.test(p.tailRegistration)&&
   typeof p.aircraftIcao24Hex==="string"&&
    ICAO24.test(p.aircraftIcao24Hex)&&
   p.tailAssignmentAsOfUtc!==null;
}
function reviewValid(s:P5AdsbUseReviewV39){
 if(!s||typeof s.adsbSourceAndODbLReviewed!=="boolean"||
    typeof s.originalAeroDataBoxUseRightsReviewed!=="boolean"||
    typeof s.liveAPIProductionAccessApproved!=="boolean"||
    !(s.reviewedODbLAttributionAndDerivedDataPolicySha256===null||
       SHA.test(s.reviewedODbLAttributionAndDerivedDataPolicySha256)))
  hold("INVALID_INDEPENDENT_SOURCE_REVIEW_SHAPE");
 return s.adsbSourceAndODbLReviewed&&
   s.originalAeroDataBoxUseRightsReviewed&&
   s.reviewedODbLAttributionAndDerivedDataPolicySha256!==null;
}
function validPoint(p:Gate05AdsbCandidateV39):boolean{
 if(!p||typeof p!=="object"||
   !ICAO24.test(p.icao24Hex??"")||
   p.identity!=="UNLINKED_AIRCRAFT_CANDIDATE"||
   p.originalAeroDataBoxFlightMatched!==false||
   p.runwayEventActualVerified!==false||
   p.timing!=="PROVIDER_NOW_MINUS_SEEN_POS_APPROXIMATE"||
   !["GROUND_REPORTED","NOT_GROUND_REPORTED","UNKNOWN"].includes(p.groundState)||
   typeof p.lat!=="number"||!Number.isFinite(p.lat)||
   typeof p.lon!=="number"||!Number.isFinite(p.lon)||
   p.lat< -90||p.lat>90||p.lon< -180||p.lon>180||
   typeof p.seenPosSeconds!=="number"||!Number.isFinite(p.seenPosSeconds)||
   p.seenPosSeconds<0||p.seenPosSeconds>120)
  hold("MALFORMED_OR_FABRICATED_ADSB_ACTUALITY");
 const obs=time(p.approximatePositionUtc),receipt=time(p.receivedAtUtc);
 return obs<=receipt&&receipt-obs<=120_000;
}
function sampleRefMatches(p:Gate05AdsbCandidateV39,leg:P5AdsbPhysicalLegLinkV39){
 return p.icao24Hex===leg.aircraftIcao24Hex;
}

/**
 * For a future flight's ORIGINAL PRE, a previously observed position of its
 * independently linked incoming aircraft can add context without pretending
 * that the aircraft is at gate or that the scheduled tail cannot change.
 */
export function assessP5AdsbInboundAsOfPreV39(input:P5AdsbPreInboundContextInputV39){
 if(!input||typeof input.flightInstanceId!=="string"||
    input.flightInstanceId.length<5||!Object.hasOwn(OFFSET,input.horizon)||
    typeof input.offlineResearchSourceProvenanceIndependentlyReviewed!=="boolean")
  hold("INVALID_PRE_RESEARCH_INPUT");
 const issued=time(input.issuedAtUtc),cutoff=time(input.cutoffUtc);
 if(time(input.selectedNativeTUtc)-cutoff!==OFFSET[input.horizon]||
    issued>cutoff)hold("PRE_NOT_ISSUED_WITHIN_ORIGINAL_FROZEN_HORIZON");
 const mode="PRE_INBOUND_AIRCRAFT_CONTEXT" as const;
 const no=(reason:Reason)=>({
  ...base(mode,reason),positionReceivedBeforePreIssue:false,
  incomingGroundState:null as Gate05AdsbCandidateV39["groundState"]|null,
  availablePositionAgeAtIssueSeconds:null as number|null,
  priorActualGateInUtc:null,
  priorAirborneEtaUtc:null,
  eligibleForAutomaticExistingTurnaroundMinutesFeature:false
 });
 if(!input.inbound||!input.inboundPosition)return no("NO_POSITION");
 const reviewed=reviewValid(input.source);
 const a=validLeg(input.current),b=validLeg(input.inbound);
 const p=input.inboundPosition;
 const goodPoint=validPoint(p);
 if(!reviewed||!input.offlineResearchSourceProvenanceIndependentlyReviewed)
  return no("UNREVIEWED_SOURCE_RIGHTS_OR_PRODUCTION_API");
 if(!a||!b||input.current.operatingLegId===input.inbound.operatingLegId)
  return no("UNREVIEWED_OR_AMBIGUOUS_PHYSICAL_LEG");
 if(input.current.tailRegistration!==input.inbound.tailRegistration||
    input.current.aircraftIcao24Hex!==input.inbound.aircraftIcao24Hex||
    input.inbound.destinationIcao!==input.current.originIcao||
    !sampleRefMatches(p,input.inbound))
  return no("DIFFERENT_TAIL_AIRCRAFT_OR_AIRPORT");
 if(time(input.current.tailAssignmentAsOfUtc!)>issued||
    time(input.inbound.tailAssignmentAsOfUtc!)>issued)
  return no("UNREVIEWED_OR_AMBIGUOUS_PHYSICAL_LEG");
 const received=time(p.receivedAtUtc);
 if(!goodPoint)return no("INCONSISTENT_ADSB_POSITION_PROVENANCE");
 if(!gate05AdsbAsOfEligibleV39(p,input.issuedAtUtc)||
    received>issued)return no("POSITION_RECEIVED_AFTER_PRE_ISSUE");
 const age=(issued-time(p.approximatePositionUtc))/1000;
 if(age>MAX_FRESH_PRE_SECONDS)
  return no("POSITION_STALE_FOR_PRE");
 return {
  ...base(mode,null),
  positionReceivedBeforePreIssue:true,
  incomingGroundState:p.groundState,
  availablePositionAgeAtIssueSeconds:age,
  priorActualGateInUtc:null,priorAirborneEtaUtc:null,
  eligibleForAutomaticExistingTurnaroundMinutesFeature:false,
  // The boolean condition is research contract validation, not a verified
  // external data-source license or authorized live ADB/PRE operation.
  productionAdsblolAccessAuthorizedByFunction:false
 };
}
/**
 * For a completed flight, consecutive independently matched, reviewed
 * near-departure-airport ground/air positions provide an UNCERTAIN bracket.
 * Even a short interval does not certify exact takeoff or actual gate-out.
 */
export function assessP5AdsbPostTakeoffBracketV39(input:P5AdsbPostBracketInputV39){
 if(!input)hold("MISSING_POST_SOURCE");
 const mode="POST_TAKEOFF_PROXY_BRACKET" as const;
 const no=(reason:Reason)=>({
  ...base(mode,reason),takeoffProxyIntervalUtc:null as
   {lastObservedGroundUtc:string;firstObservedAirborneUtc:string;
    observedGapSeconds:number}|null,
  sourceObservationAtReviewAvailable:false,
  eligibleForHeadlineActualGateOutLabel:false
 });
 const reviewedAt=time(input.reviewedAtUtc);
 if(!input.lastGround||!input.firstAirborne)return no("NO_POSITION");
 const reviewed=reviewValid(input.source);
 const leg=validLeg(input.departing);
 const g=input.lastGround,a=input.firstAirborne;
 const groundProvenance=validPoint(g),airProvenance=validPoint(a);
 if(!reviewed)return no("UNREVIEWED_SOURCE_RIGHTS_OR_PRODUCTION_API");
 if(!leg)return no("UNREVIEWED_OR_AMBIGUOUS_PHYSICAL_LEG");
 if(!sampleRefMatches(g,input.departing)||!sampleRefMatches(a,input.departing)||
    g.icao24Hex!==a.icao24Hex)
  return no("DIFFERENT_TAIL_AIRCRAFT_OR_AIRPORT");
 if(!groundProvenance||!airProvenance)
  return no("INCONSISTENT_ADSB_POSITION_PROVENANCE");
 if(g.groundState!=="GROUND_REPORTED"||
    a.groundState!=="NOT_GROUND_REPORTED")
  return no("NOT_A_GROUND_TO_AIR_TRANSITION");
 const start=time(g.approximatePositionUtc);
 const end=time(a.approximatePositionUtc);
 if(end<=start||end-start>MAX_POST_BRACKET_SECONDS*1000||
    time(g.receivedAtUtc)>reviewedAt||time(a.receivedAtUtc)>reviewedAt||
    time(input.departing.tailAssignmentAsOfUtc!)>reviewedAt)
  return no("POST_POSITION_TIMESTAMP_ORDER_OR_GAP");
 if(!input.departureAirportTrackGeometryIndependentlyReviewed)
  return no("POST_AIRPORT_GEOMETRY_NOT_INDEPENDENTLY_VERIFIED");
 return {
  ...base(mode,null),
  takeoffProxyIntervalUtc:{
   lastObservedGroundUtc:g.approximatePositionUtc,
   firstObservedAirborneUtc:a.approximatePositionUtc,
   observedGapSeconds:(end-start)/1000
  },
  sourceObservationAtReviewAvailable:true,
  eligibleForHeadlineActualGateOutLabel:false
 };
}
