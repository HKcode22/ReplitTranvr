import {describe,it,expect} from "vitest";
import {normalizeGate05AdsbLolOfflineV39} from
 "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";
import {
 assessP5EAdsbAirborneAsOfPrefixCandidate,
 type P5EAdsbAirbornePrefixInput
} from "../server/lib/disruption/phase5AdsbAirborneAsOfPrefixFromExisting_v39";
import {
 assessP5AdsbInboundAsOfPreV39,assessP5AdsbPostTakeoffBracketV39
} from "../server/lib/disruption/phase5AdsbLolCrossPhaseRotationEvidence_v39";

const sha=c=>c.repeat(64);
function point(received:string,ageSeconds:number,ground=false,hex="abc123"){
 const parsed=normalizeGate05AdsbLolOfflineV39({
  now:Date.parse(received),
  ac:[{hex,flight:"SIA123",lat:1.36,lon:103.99,
   seen_pos:ageSeconds,type:"adsb_icao",
   alt_baro:ground?"ground":12000,gs:ground?8:260}]
 },received);
 expect(parsed.recentValidPoints).toBe(1);
 return parsed.points[0];
}
function fixture():P5EAdsbAirbornePrefixInput{
 return{
  flightInstanceId:"SOURCE-BOUND-OPERATING-FLIGHT-101",
  predictionCutoffUtc:"2026-12-02T10:12:00.000Z",
  aeroDataBoxPhysicalOperatingLegVerified:true,
  aircraftSwapOrConflictingIdentity:false,
  linkage:"INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK",
  licenseAndRetentionReviewed:true,
  independentlyVerifiedAirborneEvidence:true,
  airborneEvidenceSha256:sha("e"),
  airborneEvidenceAvailableAtUtc:"2026-12-02T10:10:30.000Z",
  minUsablePoints:2,
  adsbPositions:[
   point("2026-12-02T10:10:00.000Z",5),
   point("2026-12-02T10:11:00.000Z",4)
  ]
 };
}
describe("Phase5 reuse existing AIRBORNE source gate and trajectory builder, no new collector",()=>{
 it("builds as-of two-point prefix diagnostics, never a persisted flight, ETA or actual label",()=>{
  const x=assessP5EAdsbAirborneAsOfPrefixCandidate(fixture());
  expect(x.status).toBe("CUTOFF_SAFE_AIRBORNE_PREFIX_CANDIDATE_NOT_PERSISTED");
  expect(x.airborneFunnelStage).toBe("POST_snapshot_eligible");
  expect(x.trajectoryCadence.obsPerFlight).toBe(2);
  expect(x.trajectoryPrefixSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(x.labelsAreAllNull).toBe(true);
  expect(x.actualWheelsOffOrGateInInferred).toBe(false);
  expect(x.actualAirborneSnapshotPersisted).toBe(false);
  expect(x.actualArrivalEtaProduced).toBe(false);
  expect(x.providerCalls).toBe(0);
  expect(x.databaseWrites).toBe(0);
  expect(x.phase6PaidGo).toBe(false);
  for(const secret of ["abc123","SIA123","103.99"])
   expect(JSON.stringify(x)).not.toContain(secret);
 });
 it("excludes later received ADSB positions even if approximate position time is before decision",()=>{
  const x=fixture();x.adsbPositions=[
   ...x.adsbPositions,point("2026-12-02T10:12:10.000Z",20)];
  const out=assessP5EAdsbAirborneAsOfPrefixCandidate(x);
  expect(out.eligiblePositionCount).toBe(2);
  expect(out.afterDecisionOrUnavailableCount).toBe(1);
  expect(out.trajectoryCadence.obsPerFlight).toBe(2);
 });
 it("airborne eligibility must independently exist by decision; two locations alone do not prove takeoff",()=>{
  const x=fixture();x.independentlyVerifiedAirborneEvidence=false;
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(x).status)
   .toBe("UNVERIFIED_AIRBORNE_OR_SOURCE_ADMISSION");
  const y=fixture();y.airborneEvidenceAvailableAtUtc="2026-12-02T10:12:01.000Z";
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(y).status)
   .toBe("UNVERIFIED_AIRBORNE_OR_SOURCE_ADMISSION");
  const z=fixture();z.adsbPositions=[
   point("2026-12-02T10:10:00.000Z",4,true)];
  const result=assessP5EAdsbAirborneAsOfPrefixCandidate(z);
  expect(result.groundReportedPointsNotPromotedToAirborne).toBe(1);
  expect(result.eligiblePositionCount).toBe(0);
  expect(result.labelsAreAllNull).toBe(true);
 });
 it("refuses callsign-only, unreviewed license, aircraft swap, multiple actual aircraft and duplicate point",()=>{
  const a=fixture();a.linkage="CALLSIGN_ONLY_CANDIDATE";
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(a).eligiblePositionCount)
   .toBe(0);
  const b=fixture();b.licenseAndRetentionReviewed=false;
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(b).eligiblePositionCount)
   .toBe(0);
  const c=fixture();c.aircraftSwapOrConflictingIdentity=true;
  expect(assessP5EAdsbAirborneAsOfPrefixCandidate(c).eligiblePositionCount)
   .toBe(0);
  const d=fixture();d.adsbPositions=[
   ...d.adsbPositions,point("2026-12-02T10:11:10.000Z",4,false,"bb4321")];
  expect(()=>assessP5EAdsbAirborneAsOfPrefixCandidate(d))
   .toThrow("MULTIPLE_AIRCRAFT_MIXED_IN_ONE_OPERATING_LEG");
  const e=fixture();e.adsbPositions=[
   e.adsbPositions[0],e.adsbPositions[0]];
  expect(()=>assessP5EAdsbAirborneAsOfPrefixCandidate(e))
   .toThrow("DUPLICATE_AIRCRAFT_POSITION_IN_PREFIX");
 });
 it("does not take over the existing PR612 PRE/POST adapter; source roles remain separate",()=>{
  expect(typeof assessP5AdsbInboundAsOfPreV39).toBe("function");
  expect(typeof assessP5AdsbPostTakeoffBracketV39).toBe("function");
  const result=assessP5EAdsbAirborneAsOfPrefixCandidate(fixture());
  expect(result.independentMovementEvidenceExternallyRequired).toBe(true);
  expect(result.productionSourceAccessAndOdbLApprovedByThisCode).toBe(false);
  expect(result.existingBuilderReused).toBe(true);
 });
});
