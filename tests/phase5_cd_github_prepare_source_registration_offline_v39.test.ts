import {describe,it,expect} from "vitest";
import {
 requireP5CdGithubPrepareAdmission
} from "../server/lib/disruption/phase5CdGithubPrepareRegistrationGate_v39";
import {
 makeP5CdV0091RegisterArgs
} from "../scripts/v39_phase5_cd_github_one_source_bound_enqueue_v39";
import type {P5Stage14SingleFlightPrePermit} from
 "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
const head="a".repeat(40),hash="b".repeat(64);
const prepareUrl=
 "postgresql://phase5_p30_prepare_login_20261107:mock"+
 "@reviewed.example.com/neondb?sslmode=verify-full";
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:head,
 P5_CD_GH_PRE_APPROVED_CODE_SHA:head,
 P5_CD_GH_PREPARE_CONFIRM:
  "REGISTER_ONE_ALREADY_BOUND_SOURCE_FLIGHT_NO_PROVIDER",
 P5_CD_GH_PREPARE_ARMED:"1",
 P5_CD_GH_PRE_ARMED:"1",
 P5_CD_GH_PRE_STOP:"0",
 P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
 P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
 V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE5_FREEZE_SIGNED:"0",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",
 AERODATABOX_API_KEY:"",AERODATABOX_WEBHOOK_SECRET:"",
 DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
 V39_P5_SOURCE_DATABASE_URL:"",
 P5_V39_PRE_DATABASE_URL:"",
 P5_CD_GH_PRE_ROSTER_SHA256:hash,
 V39_P5_MANIFEST_SHA256:hash,
 V39_P5_RIGHTS_SHA256:hash,
 P5_V39_PREPARE_DATABASE_URL:prepareUrl
});
describe("Phase5 C+D one GH-only PREPARE FIDS original → V0091 queue admission",()=>{
 it("permits distinct nonpaid PREPARE-only 1-flight canary before Phase6 GO",()=>{
  const result=requireP5CdGithubPrepareAdmission(env());
  expect(result.gate.releaseMode).toBe("PHASE5_CANARY");
  expect(result.gate.providerCalls).toBe(0);
  expect(result.databaseUrl).toBe(prepareUrl);
  expect(result.sourceRightsIndependentlyCertifiedByThisFunction).toBe(false);
 });
 it.each([
  ["STOP",{P5_CD_GH_PRE_STOP:"1"}],
  ["no source/rights review",{V39_PHASE5_SOURCE_RIGHTS_APPROVED:""}],
  ["no PREPARE arm",{P5_CD_GH_PREPARE_ARMED:"0"}],
  ["no PRE arm",{P5_CD_GH_PRE_ARMED:""}],
  ["wrong code SHA",{P5_CD_GH_PRE_APPROVED_CODE_SHA:"c".repeat(40)}],
  ["PR event",{GITHUB_EVENT_NAME:"pull_request"}],
  ["schedule not manual",{GITHUB_EVENT_NAME:"schedule"}],
  ["rerun",{GITHUB_RUN_ATTEMPT:"2"}],
  ["off branch",{GITHUB_REF:"refs/heads/other"}],
  ["off repo",{GITHUB_REPOSITORY:"other/repository"}],
  ["paid API key",{AERODATABOX_API_KEY:"paid-key-present"}],
  ["app runtime credential",{DATABASE_URL:"postgresql://app:secret@host/neondb"}],
  ["raw source role present",{V39_P5_SOURCE_DATABASE_URL:"source-secret"}],
  ["PRE role present",{P5_V39_PRE_DATABASE_URL:"pre-secret"}],
  ["wrong group URL",{P5_V39_PREPARE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:secret@reviewed.example.com/neondb"}],
  ["missing source roster SHA",{P5_CD_GH_PRE_ROSTER_SHA256:""}],
  ["improper early Phase6 arm",{V39_PHASE6_PROCESS_ARMED:"1"}],
  ["missing explicit one-task ACK",{P5_CD_GH_PREPARE_CONFIRM:""}]
 ])("refuses %s before any PG16 transaction or provider call",(_label,delta)=>{
  expect(()=>requireP5CdGithubPrepareAdmission({...env(),...delta}))
   .toThrow("REFUSED_P5_CD_GH_PREPARE_");
 });
 it("also supports only separate post-freeze approved Phase6 mode",()=>{
  const valid={
   ...env(),P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",
   P5_CD_GH_PHASE5_CANARY_APPROVED:"",
   V39_PHASE5_FREEZE_SIGNED:"1",
   V39_PHASE6_PROCESS_ARMED:"1"
  };
  expect(requireP5CdGithubPrepareAdmission(valid).gate.releaseMode)
   .toBe("PHASE6_APPROVED");
  expect(()=>requireP5CdGithubPrepareAdmission({
   ...valid,P5_CD_GH_PHASE5_CANARY_APPROVED:"1"
  })).toThrow("NO_REVIEWED_MAIN_SOURCE_RIGHTS_EXPLICIT_PREPARE_ARM_OR_STOP");
 });
 it("sends exactly real V0091 signature and NEVER accepts source expiry",()=>{
  const permit={
   manifestSha256:"a".repeat(64),
   queryDigestSha256:"b".repeat(64),
   flightInstanceId:"leg:ci:enrol:01",
   horizon:"T-6h",
   selectedTNativeUtc:"2030-11-24T12:00:00.000Z",
   expectedSourcePopulationQueryId:"c23e4567-e89b-42d3-a456-426614174013",
   expectedSourceResponseSha256:"c".repeat(64),
   expectedReviewedSourceRightsSha256:"d".repeat(64),
   maxPopulationStalenessSeconds:3600
  } as P5Stage14SingleFlightPrePermit;
  const got=makeP5CdV0091RegisterArgs(permit,"f".repeat(64));
  expect(got).toHaveLength(10);
  expect(got[4]).toBe(permit.selectedTNativeUtc);
  expect(got[5]).toBe("f".repeat(64));
  expect(got[9]).toBe(3600);
  expect(got).not.toContain("source_expires_at_utc");
  expect(()=>makeP5CdV0091RegisterArgs(permit,"BAD"))
   .toThrow("UNAPPROVED_SIGNED_PACKET_SHA256");
 });
});
