import {describe,it,expect} from "vitest";
import {
 requireP5CdGithubPreRelease,requireP5CdGithubEFeatures
} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {persistP5V0079SingleBoundFlightPre,
 type P5Stage14SingleFlightPrePermit}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";

const sha="a".repeat(40);
const hash="b".repeat(64);
function approved():NodeJS.ProcessEnv{
 return{
  GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"schedule",
  GITHUB_RUN_ATTEMPT:"1",
  GITHUB_SHA:sha,
  P5_CD_GH_PRE_APPROVED_CODE_SHA:sha,
  P5_CD_GH_CODE_LINEAGE_VERIFIED:sha+":"+sha,
  P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
  P5_CD_GH_PRE_ARMED:"1",
  P5_CD_GH_PRE_STOP:"0",
  P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",
  P5_CD_GH_PHASE5_CANARY_APPROVED:"",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  ADB_AUTO_COLLECT:"0",
  AERODATABOX_API_KEY:"",
  AERODATABOX_WEBHOOK_SECRET:"",
  DATABASE_URL:"",
  V39_DATABASE_RUNTIME_URL:"",
  V39_P5_SOURCE_DATABASE_URL:"",
  P5_CD_GH_PRE_ROSTER_SHA256:hash,
  V39_P5_RIGHTS_SHA256:hash,
  V39_P5_MANIFEST_SHA256:hash,
  P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:ci-placeholder@reviewed.example.com/neondb?sslmode=verify-full"
 };
}
describe("Phase5 C+D real GH Stage14 and STOP/release admission",()=>{
 it("permits only separately signed non-provider Phase5 canary before Phase6 GO",()=>{
  const e={
   ...approved(),P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
   P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
   V39_PHASE5_FREEZE_SIGNED:"0",V39_PHASE6_PROCESS_ARMED:"0"
  };
  const out=requireP5CdGithubPreRelease(e);
  expect(out.releaseMode).toBe("PHASE5_CANARY");
  expect(out.providerCalls).toBe(0);
  expect(out.scientificFreezeEstablishedByThisFunction).toBe(false);
  expect(()=>requireP5CdGithubPreRelease({
   ...e,P5_CD_GH_PHASE5_CANARY_APPROVED:""
  })).toThrow("NO_REVIEWED_MAIN_SOURCE_RIGHTS_FROZEN_GO_OR_STOP_ACTIVE");
  expect(()=>requireP5CdGithubPreRelease({
   ...e,V39_PHASE6_PROCESS_ARMED:"1"
  })).toThrow("NO_REVIEWED_MAIN_SOURCE_RIGHTS_FROZEN_GO_OR_STOP_ACTIVE");
 });
 it("requires specific main SHA and existing dedicated Stage30 PRE secret",()=>{
  const g=requireP5CdGithubPreRelease(approved());
  expect(g.schema).toBe("v39.phase5.cd-gh-pre-explicit-release.v1");
  expect(g.stop).toBe(false);
  expect(g.scientificFreezeEstablishedByThisFunction).toBe(false);
 });
 it.each([
  ["stopped",{P5_CD_GH_PRE_STOP:"1"}],
  ["no arm",{P5_CD_GH_PRE_ARMED:""}],
  ["no scientific freeze",{V39_PHASE5_FREEZE_SIGNED:""}],
  ["no source rights",{V39_PHASE5_SOURCE_RIGHTS_APPROVED:""}],
  ["no Phase6 approved arm",{V39_PHASE6_PROCESS_ARMED:"0"}],
  ["different code",{P5_CD_GH_PRE_APPROVED_CODE_SHA:"c".repeat(40)}],
  ["PR run",{GITHUB_REF:"refs/pull/100/merge"}],
  ["PR event",{GITHUB_EVENT_NAME:"pull_request"}],
  ["retry",{GITHUB_RUN_ATTEMPT:"2"}],
  ["wrong repository",{GITHUB_REPOSITORY:"example/other"}],
  ["provider credential",{AERODATABOX_API_KEY:"present"}],
  ["ordinary runtime DB",{DATABASE_URL:"a-database"}],
  ["source credential",{V39_P5_SOURCE_DATABASE_URL:"source"}],
  ["wrong PRE user",{P5_V39_PRE_DATABASE_URL:
   "postgresql://travnr_runtime:secret@reviewed.example.com/neondb"}],
  ["local DB",{P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:secret@localhost:5432/neondb"}],
  ["roster SHA invalid",{P5_CD_GH_PRE_ROSTER_SHA256:"bad"}],
  ["missing manifest",{V39_P5_MANIFEST_SHA256:""}]
 ])("refuses %s before any database or provider call",(_name,delta)=>{
  expect(()=>requireP5CdGithubPreRelease({...approved(),...delta}))
   .toThrow("REFUSED_P5_CD_GITHUB_PRE_");
 });
 it("allows first Amendment E route fields only after separate E release",()=>{
  const e=approved();
  expect(()=>requireP5CdGithubEFeatures(e))
   .toThrow("AMENDMENT_E_SOURCE_FEATURE_RELEASE_NOT_APPROVED");
  expect(requireP5CdGithubEFeatures({
   ...e,P5_CD_GH_E_ROUTE_FEATURES_APPROVED:"1"
  }).providerCalls).toBe(0);
 });
 it("original Stage14 refuses GH queue fence when STOP/unreleased before any SQL",async()=>{
  let connected=0;
  const fake={connect:async()=>{connected++;throw Error("MUST_NOT_CONNECT");}};
  const task={taskId:"1",owner:"cd-github-worker01",
   generation:"1",packetSha256:hash};
  await expect(persistP5V0079SingleBoundFlightPre(
   fake as any,{} as P5Stage14SingleFlightPrePermit,{
    realV0088QueueFenceGh:task
   })).rejects.toThrow("REFUSED_P5_CD_GITHUB_PRE_");
  expect(connected).toBe(0);
 });
 it("cannot enable GH Amendment E without real queue claim",async()=>{
  let connected=0;
  const fake={connect:async()=>{connected++;throw Error("MUST_NOT_CONNECT");}};
  await expect(persistP5V0079SingleBoundFlightPre(
   fake as any,{} as P5Stage14SingleFlightPrePermit,{
    amendmentENativeRouteBoundGh:true
   })).rejects.toThrow("GH_E_ROUTE_REQUIRES_EXPLICIT_REAL_CD_LEASE");
  expect(connected).toBe(0);
 });
});
