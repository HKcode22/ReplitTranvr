import {describe,it,expect} from "vitest";
import {assessP5ETailAsOfTurnCandidate} from
 "../server/lib/disruption/phase5AmendmentETailChainAsOfCandidate_v39";
import {selectP5AmendmentEAsOfFeaturesOffline} from
 "../server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39";

const sha=c=>c.repeat(64);
function fixture(){
 const previous={
  legId:"UNIQUE-OPERATING-INBOUND-LEG",
  physicallyOperatingLegIndependentlyReviewed:true,
  tailRegistration:"N123AA",tailAssignmentAvailableAtUtc:"2026-12-01T12:00:00.000Z",
  tailIdentityIndependentlyVerified:true,
  originIcao:"KLAX",destinationIcao:"KSFO",
  actualGateInUtc:"2026-12-02T07:00:00.000Z",
  actualGateInAvailableAtUtc:"2026-12-02T07:05:00.000Z",
  sourceRecordSha256:sha("b"),sourceUseRightsIndependentlyReviewed:true
 };
 const current={
  legId:"UNIQUE-OPERATING-OUTBOUND-LEG",
  physicallyOperatingLegIndependentlyReviewed:true,
  tailRegistration:"N123AA",tailAssignmentAvailableAtUtc:"2026-12-02T06:00:00.000Z",
  tailIdentityIndependentlyVerified:true,
  originIcao:"KSFO",destinationIcao:"KDEN",
  scheduledGateOutUtc:"2026-12-02T14:00:00.000Z",
  scheduledGateOutAvailableAtUtc:"2026-12-01T08:00:00.000Z",
  sourceRecordSha256:sha("a"),sourceUseRightsIndependentlyReviewed:true
 };
 return {
  flightInstanceId:"NATIVE-OPERATING-PROSPECTIVE-0001",
  horizon:"T-6h" as const,
  selectedNativeTUtc:"2026-12-02T14:00:00.000Z",
  cutoffUtc:"2026-12-02T08:00:00.000Z",
  issuedAtUtc:"2026-12-02T07:50:00.000Z",
  preceding:previous,current
 };
}
describe("Amendment E actual preceding tail-asof conditional feature",()=>{
 it("emits exactly the existing as-of feature slot from same tail, physical gate-in and original scheduled gate-out",()=>{
  const f=fixture(),x=assessP5ETailAsOfTurnCandidate(f);
  expect(x.state).toBe("PROSPECTIVE_PRIOR_GATE_IN_TO_SCHEDULED_GATE_OUT_BUFFER_CANDIDATE");
  expect(x.observation?.value).toBe(420);
  expect(x.observation?.field).toBe("prior_aircraft_turnaround_minutes");
  expect(x.measuredHistoricalTurnaround).toBe(false);
  expect(x.actualStage14PREMaterialized).toBe(false);
  expect(x.btsHistoricalPublicationBackfillsPre).toBe(false);
  const selected=selectP5AmendmentEAsOfFeaturesOffline({
   flightInstanceId:f.flightInstanceId,horizon:f.horizon,
   selectedNativeTUtc:f.selectedNativeTUtc,
   cutoffUtc:f.cutoffUtc,issuedAtUtc:f.issuedAtUtc,
   fields:["prior_aircraft_turnaround_minutes"],
   observations:[x.observation!]
  });
  expect(selected.fields[0]).toMatchObject({value:420,missingReason:null});
  expect(selected.phase6PaidGo).toBe(false);
 });
 it("does not invent inbound leg, codeshare authority, a tail or airport connection",()=>{
  const f=fixture();
  expect(assessP5ETailAsOfTurnCandidate({...f,preceding:null}).state)
   .toBe("MISSING_PRIOR_OPERATING_LEG");
  f.preceding!.physicallyOperatingLegIndependentlyReviewed=false;
  expect(assessP5ETailAsOfTurnCandidate(f).observation).toBeNull();
  f.preceding!.physicallyOperatingLegIndependentlyReviewed=true;
  f.preceding!.destinationIcao="KLAX";
  expect(assessP5ETailAsOfTurnCandidate(f).state)
   .toBe("TAIL_OR_CONNECTING_AIRPORT_DIFFERENT");
  f.preceding!.destinationIcao="KSFO";
  f.current.tailRegistration="NWRONG";
  expect(assessP5ETailAsOfTurnCandidate(f).observation).toBeNull();
 });
 it("rejects gate-in observed after forecast issuance, or not yet available at issue",()=>{
  const a=fixture();a.preceding!.actualGateInUtc="2026-12-02T08:20:00.000Z";
  a.preceding!.actualGateInAvailableAtUtc="2026-12-02T08:21:00.000Z";
  expect(assessP5ETailAsOfTurnCandidate(a).state)
   .toBe("PRIOR_GATE_IN_NOT_KNOWN_AT_ISSUE");
  const b=fixture();b.preceding!.actualGateInAvailableAtUtc="2026-12-02T07:51:00.000Z";
  expect(assessP5ETailAsOfTurnCandidate(b).observation).toBeNull();
  const c=fixture();c.current.scheduledGateOutAvailableAtUtc="2026-12-02T07:55:00.000Z";
  expect(assessP5ETailAsOfTurnCandidate(c).state)
   .toBe("CURRENT_SCHEDULE_NOT_KNOWN_AT_ISSUE");
 });
 it("never calls historical BTS published in October an August as-of live flight tail chain",()=>{
  const a=fixture();
  a.selectedNativeTUtc="2026-08-01T14:00:00.000Z";
  a.cutoffUtc="2026-08-01T08:00:00.000Z";
  a.issuedAtUtc="2026-08-01T07:50:00.000Z";
  a.preceding!.actualGateInUtc="2026-08-01T07:00:00.000Z";
  a.preceding!.actualGateInAvailableAtUtc="2026-10-20T00:00:00.000Z";
  a.preceding!.tailAssignmentAvailableAtUtc="2026-10-20T00:00:00.000Z";
  a.current.tailAssignmentAvailableAtUtc="2026-10-20T00:00:00.000Z";
  expect(assessP5ETailAsOfTurnCandidate(a).observation).toBeNull();
 });
 it("does not map runway wheels-on or scheduled arrival to real previous gate-in",()=>{
  const a=fixture();a.preceding!.actualGateInUtc=null;
  expect(assessP5ETailAsOfTurnCandidate(a).state)
   .toBe("PRIOR_GATE_IN_NOT_KNOWN_AT_ISSUE");
  const b=fixture();b.current.scheduledGateOutUtc="2026-12-02T06:00:00.000Z";
  expect(assessP5ETailAsOfTurnCandidate(b).state)
   .toBe("GATE_MILESTONE_NOT_AVAILABLE_OR_IMPLAUSIBLE");
  const c=fixture();c.preceding!.sourceUseRightsIndependentlyReviewed=false;
  expect(assessP5ETailAsOfTurnCandidate(c).state)
   .toBe("SOURCE_RIGHTS_OR_ORIGINAL_UNVERIFIED");
 });
 it("enforces the PRE issued cutoff and physical operating-leg non-self-reference",()=>{
  const a=fixture();a.issuedAtUtc="2026-12-02T08:01:00.000Z";
  expect(()=>assessP5ETailAsOfTurnCandidate(a)).toThrow("ISSUED_AFTER_FROZEN_PRE_CUTOFF");
  const b=fixture();b.preceding!.legId=b.current.legId;
  expect(()=>assessP5ETailAsOfTurnCandidate(b)).toThrow("SELF_REFERENTIAL_TAIL_CHAIN");
 });
});
