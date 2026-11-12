import {describe,it,expect} from "vitest";
import {
 normalizeGate05AdsbLolOfflineV39,type Gate05AdsbCandidateV39
} from "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";
import {
 assessP5EAdsbPriorTailAsOfContext,
 assessP5EAdsbAirborneAsOfPrefixCandidate,
 type P5EAdsbPriorAsOfInput,
 type P5EAdsbAirbornePrefixInput
} from "../server/lib/disruption/phase5AmendmentEAdsbThreePhaseAsOfBridge_v39";

const h=x=>x.repeat(64);
function point(received:string,seen:number,ground=false,hex="abc123"){
 const raw={now:Date.parse(received),ac:[{
  hex,flight:"SIA123",lat:1.36,lon:103.99,seen_pos:seen,
  type:"adsb_icao",alt_baro:ground?"ground":12000,gs:ground?7:260
 }]};
 const parsed=normalizeGate05AdsbLolOfflineV39(raw,received);
 expect(parsed.recentValidPoints).toBe(1);
 return parsed.points[0];
}
function airborne():P5EAdsbAirbornePrefixInput{
 return {
  flightInstanceId:"SOURCE-BOUND-OPERATING-FLIGHT-101",
  predictionCutoffUtc:"2026-12-02T10:12:00.000Z",
  aeroDataBoxPhysicalOperatingLegVerified:true,
  aircraftSwapOrConflictingIdentity:false,
  linkage:"INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK",
  licenseAndRetentionReviewed:true,
  independentlyVerifiedAirborneEvidence:true,
  airborneEvidenceSha256:h("e"),
  airborneEvidenceAvailableAtUtc:"2026-12-02T10:10:30.000Z",
  minUsablePoints:2,
  adsbPositions:[
   point("2026-12-02T10:10:00.000Z",5),
   point("2026-12-02T10:11:00.000Z",4)
  ]
 };
}
function prior():P5EAdsbPriorAsOfInput{
 return {
  tailRequest:{
   flightInstanceId:"SOURCE-BOUND-OPERATING-FLIGHT-102",
   horizon:"T-6h",
   selectedNativeTUtc:"2026-12-02T14:00:00.000Z",
   cutoffUtc:"2026-12-02T08:00:00.000Z",
   issuedAtUtc:"2026-12-02T07:50:00.000Z",
   current:{
    legId:"CURRENT-PHYSICAL-OPERATING-LEG",
    physicallyOperatingLegIndependentlyReviewed:true,
    tailRegistration:"N123AA",
    tailAssignmentAvailableAtUtc:"2026-12-02T06:00:00.000Z",
    tailIdentityIndependentlyVerified:true,
    originIcao:"KSFO",destinationIcao:"KDEN",
    scheduledGateOutUtc:"2026-12-02T14:00:00.000Z",
    scheduledGateOutAvailableAtUtc:"2026-12-01T08:00:00.000Z",
    sourceRecordSha256:h("a"),
    sourceUseRightsIndependentlyReviewed:true
   },
   preceding:{
    legId:"PRIOR-PHYSICAL-OPERATING-LEG",
    physicallyOperatingLegIndependentlyReviewed:true,
    tailRegistration:"N123AA",
    tailAssignmentAvailableAtUtc:"2026-12-01T12:00:00.000Z",
    tailIdentityIndependentlyVerified:true,
    originIcao:"KLAX",destinationIcao:"KSFO",
    actualGateInUtc:"2026-12-02T07:00:00.000Z",
    actualGateInAvailableAtUtc:"2026-12-02T07:05:00.000Z",
    sourceRecordSha256:h("b"),
    sourceUseRightsIndependentlyReviewed:true
   }
  },
  priorAdsbPosition:point("2026-12-02T07:40:00.000Z",3,true),
  priorAdsbLinkage:"INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK",
  aeroDataBoxPriorPhysicalOperatingLegVerified:true,
  aircraftSwapOrConflictingIdentity:false,
  licenseAndRetentionReviewed:true
 };
}
describe("Phase5 canonical E free ADSB.lol role in PRE tail and AIRBORNE",()=>{
 it("uses the existing P4 AIRBORNE admission and Phase0 prefix builder; no actual wheels-off or ETA fabricated",()=>{
  const input=airborne();
  const x=assessP5EAdsbAirborneAsOfPrefixCandidate(input);
  expect(x.status).toBe("CUTOFF_SAFE_AIRBORNE_PREFIX_CANDIDATE_NOT_PERSISTED");
  expect(x.eligiblePositionCount).toBe(2);
  expect(x.airborneFunnelStage).toBe("POST_snapshot_eligible");
  expect(x.trajectoryPrefixSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(x.trajectoryCadence.obsPerFlight).toBe(2);
  expect(x.labelsAreAllNull).toBe(true);
  expect(x.actualAirborneSnapshotPersisted).toBe(false);
  expect(x.actualArrivalEtaProduced).toBe(false);
  expect(x.providerCalls).toBe(0);expect(x.databaseWrites).toBe(0);
  expect(x.phase6PaidGo).toBe(false);
  expect(JSON.stringify(x)).not.toContain("abc123");
  expect(JSON.stringify(x)).not.toContain("103.99");
 });
 it("refuses post-decision ADSB position even if the provider position timestamp is earlier",()=>{
  const input=airborne();
  input.adsbPositions=[...input.adsbPositions,
   point("2026-12-02T10:12:10.000Z",20)];
  const x=assessP5EAdsbAirborneAsOfPrefixCandidate(input);
  expect(x.afterDecisionOrUnavailableCount).toBe(1);
  expect(x.eligiblePositionCount).toBe(2);
  expect(x.airborneFunnelStage).toBe("POST_snapshot_eligible");
 });
 it("needs a separately verified actual airborne observation, not just two ADSB locations",()=>{
  const a=airborne();a.independentlyVerifiedAirborneEvidence=false;
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(a).status)
   .toBe("UNVERIFIED_AIRBORNE_OR_SOURCE_ADMISSION");
  const b=airborne();b.airborneEvidenceAvailableAtUtc="2026-12-02T10:12:01.000Z";
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(b).status)
   .toBe("UNVERIFIED_AIRBORNE_OR_SOURCE_ADMISSION");
  const c=airborne();c.adsbPositions=[point("2026-12-02T10:11:00.000Z",2,true)];
  const y=assessP5EAdsbAirborneAsOfPrefixCandidate(c);
  expect(y.groundReportedPointsNotPromotedToAirborne).toBe(1);
  expect(y.eligiblePositionCount).toBe(0);
  expect(y.status).toBe("INSUFFICIENT_CUTOFF_SAFE_POSITION_POINTS");
 });
 it("rejects callsign/aircraft-only, source rights hold and aircraft swap",()=>{
  const a=airborne();a.linkage="CALLSIGN_ONLY_CANDIDATE";
  const x=assessP5EAdsbAirborneAsOfPrefixCandidate(a);
  expect(x.status).toBe("UNVERIFIED_AIRBORNE_OR_SOURCE_ADMISSION");
  expect(x.unreviewedIdentityOrRightsPositionCount).toBe(2);
  const b=airborne();b.licenseAndRetentionReviewed=false;
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(b).eligiblePositionCount)
   .toBe(0);
  const c=airborne();c.aircraftSwapOrConflictingIdentity=true;
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(c).eligiblePositionCount)
   .toBe(0);
  const d=airborne();d.adsbPositions=[
   ...d.adsbPositions,point("2026-12-02T10:11:10.000Z",4,false,"bbb321")];
  expect(()=>assessP5EAdsbAirborneAsOfPrefixCandidate(d))
   .toThrow("MULTIPLE_AIRCRAFT_MIXED_IN_ONE_OPERATING_LEG");
  const e=airborne();e.adsbPositions=[
   e.adsbPositions[0],e.adsbPositions[0]];
  expect(()=>assessP5EAdsbAirborneAsOfPrefixCandidate(e))
   .toThrow("DUPLICATE_AIRCRAFT_POSITION_IN_PREFIX");
 });
 it("ADSB prior-tail ground position can be as-of contextual evidence, not inferred actual gate-in",()=>{
  const x=assessP5EAdsbPriorTailAsOfContext(prior());
  expect(x.contextDisposition).toBe(
   "CANDIDATE_PREVIOUS_AIRCRAFT_TRACK_CONTEXT_NOT_GATE_IN");
  expect(x.previousPhysicalOperatingLegCandidateLinked).toBe(true);
  expect(x.realGateInIndependentlyRequired).toBe(true);
  expect(x.inferredAdsbLandedMeansActualGateIn).toBe(false);
  expect(x.tailFeatureObservation?.value).toBe(420);
  expect(x.tailFeatureState).toBe(
   "PROSPECTIVE_PRIOR_GATE_IN_TO_SCHEDULED_GATE_OUT_BUFFER_CANDIDATE");
  expect(x.existingStage14PREMaterialized).toBe(false);
 });
 it("late ADSB prior position cannot create PRE context; true independent gate-in remains distinct",()=>{
  const p=prior();
  p.priorAdsbPosition=point("2026-12-02T07:50:01.000Z",30,true);
  const x=assessP5EAdsbPriorTailAsOfContext(p);
  expect(x.contextDisposition).toBe("POST_ISSUE_OR_POST_CUTOFF_TRACK");
  expect(x.tailFeatureObservation?.value).toBe(420);
  p.priorAdsbPosition=point("2026-12-02T07:40:00.000Z",4,true);
  p.tailRequest.preceding!.actualGateInUtc=null;
  const y=assessP5EAdsbPriorTailAsOfContext(p);
  expect(y.previousPhysicalOperatingLegCandidateLinked).toBe(true);
  expect(y.tailFeatureObservation).toBeNull();
  expect(y.tailFeatureState).toBe("PRIOR_GATE_IN_NOT_KNOWN_AT_ISSUE");
 });
 it("absent optional ADSB context never invalidates a real gate-in feature; weak links never qualify",()=>{
  const a=prior();a.priorAdsbPosition=null;
  const x=assessP5EAdsbPriorTailAsOfContext(a);
  expect(x.contextDisposition).toBe("NO_TRACK_OR_MATCH");
  expect(x.tailFeatureObservation?.value).toBe(420);
  const b=prior();b.priorAdsbLinkage="CALLSIGN_ONLY_CANDIDATE";
  const y=assessP5EAdsbPriorTailAsOfContext(b);
  expect(y.contextDisposition).toBe("NO_TRACK_OR_MATCH");
  const c=prior();c.licenseAndRetentionReviewed=false;
  expect(assessP5EAdsbPriorTailAsOfContext(c).contextDisposition)
   .toBe("HOLD_UNVERIFIED_SOURCE_RIGHTS");
  const d=prior();d.tailRequest.preceding!.sourceUseRightsIndependentlyReviewed=false;
  expect(assessP5EAdsbPriorTailAsOfContext(d).tailFeatureObservation).toBeNull();
 });
});
