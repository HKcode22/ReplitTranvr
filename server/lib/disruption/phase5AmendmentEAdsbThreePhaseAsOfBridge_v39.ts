/**
 * Phase5 canonical Amendment E: retain ADSB.lol as an OPTIONAL third-source
 * aircraft-movement branch, not an AeroDataBox FIDS or BTS replacement.
 *
 * Pure bridge over EXISTING Phase4 ADSB source clock + physical operating-leg
 * admission, existing Phase0 AIRBORNE trajectory snapshot builder, and
 * existing Phase5 independently evidenced prior-tail gate-in feature.
 *
 * NO HTTP, live feed, source registration, SQL, PRE write, true runway/gate
 * label, model ETA, license approval or Phase6 activation occurs here.
 */
import {createHash} from "node:crypto";
import {
 gate05AdsbAsOfEligibleV39,
 type Gate05AdsbCandidateV39
} from "./gate05ZeroCostAdsbEvidence_v39";
import {
 assessP4Gate5DualSourceAdsbV39,
 type P4AdsbLinkageV39
} from "./phase4Gate5DualSourceAdsbAdmission_v39";
import {
 buildAirborneSnapshot,
 type AirborneSnapshot
} from "./airborneSnapshotBuilder_v3";
import {
 assessP5ETailAsOfTurnCandidate,
 type P5ETailAsOfInput
} from "./phase5AmendmentETailChainAsOfCandidate_v39";

const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const HEX=/^[0-9a-f]{6}$/;
const HOLD=(code:string):never=>{throw Error("REFUSED_P5_E_ADSB_THREE_SOURCE_BRIDGE_"+code);};
const utc=(x:string):number=>{
 if(typeof x!=="string"||!UTC.test(x)||
    !Number.isFinite(Date.parse(x))||
    new Date(x).toISOString()!==x)HOLD("INVALID_OR_AMBIGUOUS_UTC_CLOCK");
 return Date.parse(x);
};
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const physicallyLinked=(link:P4AdsbLinkageV39,verified:boolean,swap:boolean)=>
 verified&&!swap&&link==="INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK";
export type P5EAdsbSourceDisposition=
 "HOLD_UNVERIFIED_SOURCE_RIGHTS"|"NO_TRACK_OR_MATCH"|
 "POST_ISSUE_OR_POST_CUTOFF_TRACK"|
 "CANDIDATE_PREVIOUS_AIRCRAFT_TRACK_CONTEXT_NOT_GATE_IN";

export interface P5EAdsbPriorAsOfInput {
 tailRequest:P5ETailAsOfInput;
 /** ADSB.lol is only supplemental movement, not true gate-in. */
 priorAdsbPosition:Gate05AdsbCandidateV39|null;
 priorAdsbLinkage:P4AdsbLinkageV39;
 aeroDataBoxPriorPhysicalOperatingLegVerified:boolean;
 aircraftSwapOrConflictingIdentity:boolean;
 licenseAndRetentionReviewed:boolean;
}
/**
 * A PRE may contain an as-of previous-leg track hint even though ADSB alone
 * cannot say when the inbound aircraft was actually on its gate.
 *
 * The existing independently reviewed TRUE gate-in tail feature is decided
 * separately and is NOT invalidated by absent optional ADSB coverage.
 */
export function assessP5EAdsbPriorTailAsOfContext(
 x:P5EAdsbPriorAsOfInput
){
 if(!x||!x.tailRequest||
    typeof x.aeroDataBoxPriorPhysicalOperatingLegVerified!=="boolean"||
    typeof x.aircraftSwapOrConflictingIdentity!=="boolean"||
    typeof x.licenseAndRetentionReviewed!=="boolean"||
    !["INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK",
      "CALLSIGN_ONLY_CANDIDATE","AIRCRAFT_ONLY_CANDIDATE",
      "CONFLICT","UNMATCHED"].includes(x.priorAdsbLinkage))
  HOLD("INVALID_PREVIOUS_TAIL_SOURCE_BOUNDARY");
 const req=x.tailRequest;
 const issued=utc(req.issuedAtUtc),cutoff=utc(req.cutoffUtc);
 if(issued>cutoff)HOLD("PRE_ALREADY_AFTER_CUTOFF");
 // Check real native-T horizon, separate genuine previous gate-in feature.
 const tail=assessP5ETailAsOfTurnCandidate(req);
 const position=x.priorAdsbPosition;
 let disposition:P5EAdsbSourceDisposition;
 if(!position){
  disposition="NO_TRACK_OR_MATCH";
 }else if(!x.licenseAndRetentionReviewed){
  disposition="HOLD_UNVERIFIED_SOURCE_RIGHTS";
 }else if(!physicallyLinked(x.priorAdsbLinkage,
            x.aeroDataBoxPriorPhysicalOperatingLegVerified,
            x.aircraftSwapOrConflictingIdentity)){
  disposition="NO_TRACK_OR_MATCH";
 }else if(position.identity!=="UNLINKED_AIRCRAFT_CANDIDATE"||
          position.runwayEventActualVerified!==false||
          position.originalAeroDataBoxFlightMatched!==false)
  HOLD("FAKE_ADSB_PHYSICAL_OR_ACTUAL_CERTIFICATION");
 else if(!gate05AdsbAsOfEligibleV39(position,req.issuedAtUtc)){
  disposition="POST_ISSUE_OR_POST_CUTOFF_TRACK";
 }else{
  disposition="CANDIDATE_PREVIOUS_AIRCRAFT_TRACK_CONTEXT_NOT_GATE_IN";
 }
 return {
  schema:"v39.phase5.e-adsblol-prior-asof-context.v1" as const,
  ...{
   contextDisposition:disposition,
   previousPhysicalOperatingLegCandidateLinked:
    disposition==="CANDIDATE_PREVIOUS_AIRCRAFT_TRACK_CONTEXT_NOT_GATE_IN",
   previousTrackPointReceiptBeforeIssue:
    disposition==="CANDIDATE_PREVIOUS_AIRCRAFT_TRACK_CONTEXT_NOT_GATE_IN",
   realGateInIndependentlyRequired:true as const,
   inferredAdsbLandedMeansActualGateIn:false as const,
   tailFeatureState:tail.state,
   tailFeatureObservation:tail.observation,
   tailFeatureRequiresIndependentActualGateIn:true as const,
   independentlyCertifiedTailLinkByBridge:false as const,
   existingStage14PREMaterialized:false as const,
   adsbLiveCollectorCommissioned:false as const,
   btsHistoricalPostflightMayBackfillPRE:false as const,
   providerCalls:0 as const,databaseWrites:0 as const,
   phase5ScientificFreeze:false as const,phase6PaidGo:false as const
  }
 };
}

export interface P5EAdsbAirbornePrefixInput {
 flightInstanceId:string;
 predictionCutoffUtc:string;
 aeroDataBoxPhysicalOperatingLegVerified:boolean;
 aircraftSwapOrConflictingIdentity:boolean;
 linkage:P4AdsbLinkageV39;
 licenseAndRetentionReviewed:boolean;
 /**
  * A real independently verified airborne eligibility observation must
  * already have been durably available by this prediction decision.
  * An ADSB position alone is not equivalent to an actual wheels-off event.
  */
 independentlyVerifiedAirborneEvidence:boolean;
 airborneEvidenceSha256:string|null;
 airborneEvidenceAvailableAtUtc:string|null;
 minUsablePoints:number;
 /** Existing parsed/clock-bounded Gate05 ADSB.lol observed positions only. */
 adsbPositions:readonly Gate05AdsbCandidateV39[];
}
/**
 * Reuses canonical Phase4 AIRBORNE admission and Phase0 builder. Creates a
 * deterministic anonymous prefix hash and counts, NEVER a real flight row.
 */
export function assessP5EAdsbAirborneAsOfPrefixCandidate(
 input:P5EAdsbAirbornePrefixInput
){
 if(!input||typeof input.flightInstanceId!=="string"||
    input.flightInstanceId.length<5||input.flightInstanceId.length>200||
    typeof input.aeroDataBoxPhysicalOperatingLegVerified!=="boolean"||
    typeof input.aircraftSwapOrConflictingIdentity!=="boolean"||
    typeof input.licenseAndRetentionReviewed!=="boolean"||
    typeof input.independentlyVerifiedAirborneEvidence!=="boolean"||
    !Array.isArray(input.adsbPositions)||input.adsbPositions.length>60||
    !Number.isSafeInteger(input.minUsablePoints)||
    input.minUsablePoints<2||input.minUsablePoints>30||
    (input.airborneEvidenceSha256!==null&&
     !SHA.test(input.airborneEvidenceSha256))||
    (input.airborneEvidenceAvailableAtUtc!==null&&
     typeof input.airborneEvidenceAvailableAtUtc!=="string"))
  HOLD("INVALID_BOUNDED_AIRBORNE_PROVENANCE");
 const cutoff=utc(input.predictionCutoffUtc);
 const evidenceAvailable=input.airborneEvidenceAvailableAtUtc===null?null:
  utc(input.airborneEvidenceAvailableAtUtc);
 const qualified=physicallyLinked(input.linkage,
  input.aeroDataBoxPhysicalOperatingLegVerified,
  input.aircraftSwapOrConflictingIdentity)&&
  input.licenseAndRetentionReviewed&&
  input.independentlyVerifiedAirborneEvidence&&
  input.airborneEvidenceSha256!==null&&
  evidenceAvailable!==null&&evidenceAvailable<=cutoff;
 const positions:Gate05AdsbCandidateV39[]=[];
 let postDecision=0,linkageHold=0,ground=0;
 const seen=new Set<string>();
 let soleHex:string|null=null;
 for(const point of input.adsbPositions){
  // Existing Phase4 gate checks BOTH approximate observation and receipt
  // availability. Do not soften it by only sorting event timestamps.
  const review=assessP4Gate5DualSourceAdsbV39({
   phase:"AIRBORNE",
   predictionCutoffUtc:input.predictionCutoffUtc,
   aeroDataBoxPhysicalOperatingLegVerified:
    input.aeroDataBoxPhysicalOperatingLegVerified,
   aircraftSwapOrConflictingIdentity:input.aircraftSwapOrConflictingIdentity,
   linkage:input.linkage,adsbPosition:point,
   licenseAndRetentionReviewed:input.licenseAndRetentionReviewed
  });
  if(!review.availableAtDecision){postDecision++;continue;}
  if(!review.airborneCandidateEligible){linkageHold++;continue;}
  if(point.groundState==="GROUND_REPORTED"){ground++;continue;}
  if(!HEX.test(point.icao24Hex))HOLD("UNVERIFIED_ICAO24_AIRCRAFT_IDENTITY");
  if(soleHex!==null&&soleHex!==point.icao24Hex)
   HOLD("MULTIPLE_AIRCRAFT_MIXED_IN_ONE_OPERATING_LEG");
  soleHex=point.icao24Hex;
  const key=point.icao24Hex+"|"+point.approximatePositionUtc;
  if(seen.has(key))HOLD("DUPLICATE_AIRCRAFT_POSITION_IN_PREFIX");
  seen.add(key);
  positions.push(point);
 }
 positions.sort((a,b)=>
  utc(a.approximatePositionUtc)-utc(b.approximatePositionUtc));
 const prefix=positions.map(p=>({
  observedAtUtc:new Date(p.approximatePositionUtc),
  availableAtUtc:new Date(p.receivedAtUtc),
  lat:p.lat,lon:p.lon,altitudeFt:p.altitudeBarometricFt,
  phase:null as null
 }));
 const snapshot:AirborneSnapshot=buildAirborneSnapshot({
  flightInstanceId:input.flightInstanceId,
  airborneEligible:qualified&&positions.length>0,
  points:prefix,
  predictionCutoffUtc:new Date(cutoff),
  stateObservationTimeUtc:prefix.length?
    prefix[prefix.length-1].observedAtUtc:null,
  minUsablePoints:input.minUsablePoints,
  completenessThresholdPct:null,
  actualWheelsOnUtc:null,scheduledWheelsOnUtc:null,
  actualGateInUtc:null,scheduledGateInUtc:null,
  actualGateOutUtc:null,scheduledGateOutUtc:null,
  actualWheelsOffUtc:null,scheduledWheelsOffUtc:null
 });
 return {
  schema:"v39.phase5.e-adsblol-airborne-prefix-candidate.v1" as const,
  status:!qualified?"UNVERIFIED_AIRBORNE_OR_SOURCE_ADMISSION":
   snapshot.funnelStage==="POST_snapshot_eligible"?
    "CUTOFF_SAFE_AIRBORNE_PREFIX_CANDIDATE_NOT_PERSISTED":
    "INSUFFICIENT_CUTOFF_SAFE_POSITION_POINTS",
  trajectoryPrefixSha256:prefix.length?digest(prefix.map(p=>({
   observedAtUtc:p.observedAtUtc.toISOString(),
   availableAtUtc:p.availableAtUtc?.toISOString(),lat:p.lat,
   lon:p.lon,altitudeFt:p.altitudeFt
  }))):null,
  eligiblePositionCount:prefix.length,
  afterDecisionOrUnavailableCount:postDecision,
  unreviewedIdentityOrRightsPositionCount:linkageHold,
  groundReportedPointsNotPromotedToAirborne:ground,
  trajectoryCadence:snapshot.cadence,
  airborneFunnelStage:snapshot.funnelStage,
  labelsAreAllNull:Object.values(snapshot.targets).every(x=>x===null),
  existingBuilderReused:true as const,
  independentMovementEvidenceExternallyRequired:true as const,
  independentlyCertifiedOperatingLegByBridge:false as const,
  actualWheelsOffOrGateInInferred:false as const,
  outputContainsAircraftTrackOrIdentifiers:false as const,
  actualAirborneSnapshotPersisted:false as const,
  actualArrivalEtaProduced:false as const,
  productionSourceAccessAndOdbLApprovedByThisCode:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  phase5ScientificFreeze:false as const,phase6PaidGo:false as const
 };
}
