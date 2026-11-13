/**
 * Canonical Phase5 Amendment E — ADDITIVE AIRBORNE-only bridge.
 *
 * PR #612 already owns optional ADSB.lol PRE incoming-tail context and
 * POST ground-to-air takeoff bracket. Do NOT duplicate those modules.
 * This adapter connects the EXISTING Phase4 verified AIRBORNE admission to
 * the EXISTING Phase0 trajectory snapshot builder; it does not collect,
 * persist or forecast anything. No HTTP, SQL, license permission or GO.
 */
import {createHash} from "node:crypto";
import type {Gate05AdsbCandidateV39} from
 "./gate05ZeroCostAdsbEvidence_v39";
import {
 assessP4Gate5DualSourceAdsbV39,
 type P4AdsbLinkageV39
} from "./phase4Gate5DualSourceAdsbAdmission_v39";
import {
 buildAirborneSnapshot,
 type AirborneSnapshot
} from "./airborneSnapshotBuilder_v3";

const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const HEX=/^[0-9a-f]{6}$/;
const HOLD=(code:string):never=>{throw Error("REFUSED_P5_E_ADSB_AIRBORNE_PREFIX_"+code);};
const utc=(x:string):number=>{
 if(typeof x!=="string"||!UTC.test(x)||
    !Number.isFinite(Date.parse(x))||
    new Date(x).toISOString()!==x)HOLD("INVALID_OR_AMBIGUOUS_UTC_CLOCK");
 return Date.parse(x);
};
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const physicallyLinked=(link:P4AdsbLinkageV39,verified:boolean,swap:boolean)=>
 verified&&!swap&&link==="INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK";

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
