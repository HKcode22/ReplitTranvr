import {describe,it,expect} from "vitest";
import {
 assessP5AmendmentEGateOutDelayCandidate,
 type P5EGateOutFirstCycleInput
} from "../server/lib/disruption/phase5AmendmentEGateOutDelayLabel_v39";

const sha=(x:string)=>x.repeat(64);
const native="2035-11-25T12:00:00.000Z";
function sample():P5EGateOutFirstCycleInput{
 return{
  schema:"v39.phase5.amendment-e-gateout-first-cycle-candidate.v1",
  frozenSourceOriginalSha256:sha("a"),
  flightInstanceId:"leg:reviewed:operated:001",
  horizon:"T-6h",selectedNativeTUtc:native,
  preIssuedAtUtc:"2035-11-25T05:58:00.000Z",
  originalSourceAvailableAtUtc:"2035-11-25T05:00:00.000Z",
  operatingLegIdentityExternallyVerified:true,
  scheduled:{
   utc:native,milestone:"SCHEDULED_GATE_OUT",
   externallyVerifiedGateOutMeaning:true,evidenceSha256:sha("b")
  },
  outcome:{
   operation:"OPERATED",event:"ACTUAL_GATE_OUT",
   actualUtc:"2035-11-25T12:42:00.000Z",
   firstAvailableAtUtc:"2035-11-25T12:45:00.000Z",
   externallyVerifiedActualOnly:true,evidenceSha256:sha("c"),
   recoveryGraceElapsed:true
  }
 };
}
describe("Canonical Amendment E: same-milestone gate-out delay, no provider IO",()=>{
 it("computes continuous T6 candidate only for matching reviewed actual gate-out",()=>{
  const r=assessP5AmendmentEGateOutDelayCandidate(sample());
  expect(r.status).toBe("MATCHED_ACTUAL_GATE_OUT_CANDIDATE");
  expect(r.candidateDelayMinutes).toBe(42);
  expect(r.cutoffUtc).toBe("2035-11-25T06:00:00.000Z");
  expect(r.isLeadingT6Candidate).toBe(true);
  expect(r.metric).toBe(
   "actual_gate_out_minus_originally_scheduled_gate_out_minutes");
  expect(r.authorizedForModelTrainingOrPrimaryHeadline).toBe(false);
  expect(r.physicalMilestoneIndependentlyCertifiedByThisFunction).toBe(false);
  expect(r.originalSourceUseRightsCertifiedByThisFunction).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("allows negative departure delay for a genuinely early gate-out, never clamps",()=>{
  const x=sample();
  x.outcome.actualUtc="2035-11-25T11:45:00.000Z";
  x.outcome.firstAvailableAtUtc="2035-11-25T11:46:00.000Z";
  expect(assessP5AmendmentEGateOutDelayCandidate(x)
   .candidateDelayMinutes).toBe(-15);
 });
 it.each([
  ["runway timestamp",{event:"ACTUAL_WHEELS_OFF"}],
  ["ADSB.lol takeoff estimate",{event:"ADSBLOL_TAKEOFF_PROXY"}],
  ["revised schedule",{event:"ESTIMATED_RUNWAY_OR_REVISED_SCHEDULE"}]
 ])("never substitutes %s for actual gate-out",(_label,patch)=>{
  const x=sample();
  x.outcome={...x.outcome,...patch};
  const r=assessP5AmendmentEGateOutDelayCandidate(x);
  expect(r.status).toBe("OUTCOME_NOT_ACTUAL_GATE_OUT");
  expect(r.candidateDelayMinutes).toBeNull();
 });
 it("does not infer scheduled gate-out from general FIDS scheduled field",()=>{
  const x=sample();x.scheduled.milestone="GENERAL_SCHEDULED_DEPARTURE";
  const r=assessP5AmendmentEGateOutDelayCandidate(x);
  expect(r.status).toBe("SCHEDULED_GATE_OUT_SEMANTICS_UNVERIFIED");
  expect(r.candidateDelayMinutes).toBeNull();
  x.scheduled.milestone="SCHEDULED_GATE_OUT";
  x.scheduled.utc="2035-11-25T13:00:00.000Z";
  expect(assessP5AmendmentEGateOutDelayCandidate(x)
   .candidateDelayMinutes).toBeNull();
 });
 it("treats cancellation as separate target, missing and pending as censored",()=>{
  const x=sample();
  x.outcome={
   operation:"CONFIRMED_CANCELLED",event:"NO_EVENT",actualUtc:null,
   firstAvailableAtUtc:"2035-11-25T12:43:00.000Z",
   externallyVerifiedActualOnly:true,
   evidenceSha256:sha("d"),recoveryGraceElapsed:true
  };
  let r=assessP5AmendmentEGateOutDelayCandidate(x);
  expect(r.status).toBe("CANCELLATION_SEPARATE_OUTCOME");
  expect(r.candidateDelayMinutes).toBeNull();
  x.outcome.operation="UNKNOWN";
  x.outcome.firstAvailableAtUtc=null;
  x.outcome.recoveryGraceElapsed=false;
  r=assessP5AmendmentEGateOutDelayCandidate(x);
  expect(r.status).toBe("PENDING_GATE_OUT_EVIDENCE");
  x.outcome.recoveryGraceElapsed=true;
  r=assessP5AmendmentEGateOutDelayCandidate(x);
  expect(r.status).toBe("CENSORED_GATE_OUT_EVIDENCE_MISSING");
  expect(r.candidateDelayMinutes).toBeNull();
 });
 it("does not certify a flight or provider actual-only semantics from a hash",()=>{
  const x=sample();x.operatingLegIdentityExternallyVerified=false;
  expect(assessP5AmendmentEGateOutDelayCandidate(x).status)
   .toBe("OPERATING_LEG_IDENTITY_UNVERIFIED");
  x.operatingLegIdentityExternallyVerified=true;
  x.outcome.externallyVerifiedActualOnly=false;
  expect(assessP5AmendmentEGateOutDelayCandidate(x).status)
   .toBe("ACTUAL_GATE_OUT_SEMANTICS_UNVERIFIED");
 });
 it("T90 update and T24 comparator reuse the same original native T",()=>{
  const x=sample();
  x.horizon="T-90m";
  x.preIssuedAtUtc="2035-11-25T10:28:00.000Z";
  const t90=assessP5AmendmentEGateOutDelayCandidate(x);
  expect(t90.cutoffUtc).toBe("2035-11-25T10:30:00.000Z");
  expect(t90.candidateDelayMinutes).toBe(42);
  expect(t90.isLeadingT6Candidate).toBe(false);
  x.horizon="T-24h";
  x.preIssuedAtUtc="2035-11-24T11:58:00.000Z";
  x.originalSourceAvailableAtUtc="2035-11-24T11:00:00.000Z";
  const t24=assessP5AmendmentEGateOutDelayCandidate(x);
  expect(t24.cutoffUtc).toBe("2035-11-24T12:00:00.000Z");
  expect(t24.candidateDelayMinutes).toBe(42);
  expect(t24.isLeadingT6Candidate).toBe(false);
 });
 it("refuses leaked feature issue time and noncanonical source clocks",()=>{
  const x=sample();
  x.originalSourceAvailableAtUtc="2035-11-25T06:01:00.000Z";
  expect(()=>assessP5AmendmentEGateOutDelayCandidate(x))
   .toThrow("PRE_ISSUE_AFTER_CUTOFF_OR_SOURCE_NOT_YET_AVAILABLE");
  x.originalSourceAvailableAtUtc="2035-11-25T05:00:00.000Z";
  x.preIssuedAtUtc="2035-11-25T06:00:01.000Z";
  expect(()=>assessP5AmendmentEGateOutDelayCandidate(x))
   .toThrow("PRE_ISSUE_AFTER_CUTOFF_OR_SOURCE_NOT_YET_AVAILABLE");
  x.preIssuedAtUtc="2035-11-25T05:58:00.000Z";
  x.outcome.firstAvailableAtUtc="2035-11-25T12:41:00.000Z";
  expect(()=>assessP5AmendmentEGateOutDelayCandidate(x))
   .toThrow("CONTRADICTORY_OUTCOME_EVENT_AND_AVAILABILITY");
 });
 it("does not permit an actual event before the PRE issuance to be future forecast label",()=>{
  const x=sample();
  x.outcome.actualUtc="2035-11-25T05:55:00.000Z";
  x.outcome.firstAvailableAtUtc="2035-11-25T05:56:00.000Z";
  const r=assessP5AmendmentEGateOutDelayCandidate(x);
  expect(r.status).toBe("EARLY_ACTUAL_EVENT_BEFORE_PRE_ISSUE");
  expect(r.candidateDelayMinutes).toBeNull();
 });
 it("rejects conflicting cancellation and event timestamps, no fabricated zeros",()=>{
  const x=sample();
  x.outcome.operation="CONFIRMED_CANCELLED";
  expect(()=>assessP5AmendmentEGateOutDelayCandidate(x))
   .toThrow("CONTRADICTORY_OUTCOME_EVENT_AND_AVAILABILITY");
 });
 it("does not report confirmed cancellation without available evidence",()=>{
  const x=sample();
  x.outcome={
   operation:"CONFIRMED_CANCELLED",event:"NO_EVENT",actualUtc:null,
   firstAvailableAtUtc:null,externallyVerifiedActualOnly:false,
   evidenceSha256:null,recoveryGraceElapsed:true
  };
  expect(()=>assessP5AmendmentEGateOutDelayCandidate(x))
   .toThrow("CONTRADICTORY_OUTCOME_EVENT_AND_AVAILABILITY");
 });
});
