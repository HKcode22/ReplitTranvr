import {describe,it,expect} from "vitest";
import {admitP5LaterBatchEnv,planP5SignedLaterBatchChildren}
 from "../scripts/v39_phase5_later_pre_signed_day_batch_dispatcher_v39";
import type {P5LaterPrePlan,P5LaterGhHistory}
 from "../server/lib/disruption/phase5LaterPreGithubChildDecision_v39";

const h=(v:string)=>v.repeat(64);
const code="e".repeat(40);
const dir="data-collection/phase5/frozen/";
function context(){
 return {
  GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_EVENT_NAME:"schedule",GITHUB_REF:"refs/heads/main",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  V39_P5_LATER_PRE_APPROVED_CODE_SHA:code,
  P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED:"true",
  P5_LATER_PRE_AUTO_DISPATCH_ENABLED:"false",
  V39_P5_LATER_PRE_BATCH_AUTO_APPROVED:"1",
  V39_P5_LATER_PRE_OWNER_APPROVED:"1",
  V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED:"1",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  AERODATABOX_WEBHOOK_SECRET:"",DATABASE_URL:"",
  V39_DATABASE_RUNTIME_URL:"",V39_P5_SOURCE_DATABASE_URL:"",
  P5_V39_T24_WITNESS_DATABASE_URL:"",
  P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"",
  P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  P5_LATER_PRE_BATCH_REGISTRY_FILE:dir+"later_registry_day04.json",
  V39_P5_LATER_PRE_DAY_REGISTRY_SHA256:h("a"),
  V39_P5_SOURCE_BATCH_REGISTRY_SHA256:h("b"),
  V39_P5_MANIFEST_SHA256:h("c"),
  V39_P5_RELEASE_SHA256:h("d"),
  V39_P5_RIGHTS_SHA256:h("e"),
  P5_LATER_PRE_DAY_INDEX:"4",
  P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:test@localhost/neondb",
  GITHUB_TOKEN:"fake_github_token_abcdefghijklmnop"
 } as NodeJS.ProcessEnv;
}
function ready(flight:string):P5LaterPrePlan{
 return{
  schema:"v39.phase5.later-pre-real-db-github-child.v1",
  status:"LATER_PRE_READY_FOR_GITHUB_HISTORY",
  readyForHistory:true,
  frozenPacketPath:dir+flight+".json",
  reviewedPacketSha256:h("e"),
  flightInstanceId:"leg:future:"+flight,
  horizon:"T-6h",
  observedDbClockUtc:"2027-02-10T05:00:00.000Z",
  cutoffUtc:"2027-02-10T06:00:00.000Z",
  evidenceTier:"WITNESSED_T24_LATER",
  providerCalls:0,databaseWrites:0,childDispatchCount:0,
  legalRightsCertifiedHere:false,
  phase5FreezeGrantedHere:false,
  phase6GoGrantedHere:false
 };
}
const empty:P5LaterGhHistory={total_count:0,workflow_runs:[]};
describe("default-OFF signed later PRE multi-flight Github coordinator",()=>{
 it("requires exact GitHub cron, signed day-source registry and PRE-only DB",()=>{
  const v=admitP5LaterBatchEnv(context());
  expect(v.day).toBe(4);
  expect(v.path).toBe(dir+"later_registry_day04.json");
  for(const change of [
   {GITHUB_EVENT_NAME:"workflow_dispatch"},
   {GITHUB_REF:"refs/pull/5/merge"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED:"false"},
   {P5_LATER_PRE_AUTO_DISPATCH_ENABLED:"true"},
   {V39_P5_LATER_PRE_BATCH_AUTO_APPROVED:"0"},
   {V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED:"0"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {ADB_AUTO_COLLECT:"1"},
   {AERODATABOX_API_KEY:"forbidden"},
   {P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"forbidden"}
  ])
   expect(()=>admitP5LaterBatchEnv({...context(),...change}))
    .toThrow("MAIN_SOURCE_RIGHTS_DAY_REGISTRY_OR_INDEPENDENT_PAID_GO");
  expect(()=>admitP5LaterBatchEnv({...context(),
   P5_V39_PRE_DATABASE_URL:"postgresql://application:pw@localhost/neondb"}))
    .toThrow("PRE_ONLY_RESTRICTED_ROLE_NOT_AUTHENTIC");
 });
 it("allows several signed distinct flights using one GH history",()=>{
  const selected=planP5SignedLaterBatchChildren(
   [ready("flight_alpha_01"),ready("flight_beta_02")],empty);
  expect(selected.map(x=>x.frozenPacketPath)).toEqual([
   dir+"flight_alpha_01.json",dir+"flight_beta_02.json"
  ]);
 });
 it("suppresses ALL previously attempted flight packets, including failed",()=>{
  const a=ready("flight_alpha_01"),b=ready("flight_beta_02");
  const history:P5LaterGhHistory={total_count:1,workflow_runs:[{
   id:42899999999,display_title:"P5 LATER PRE "+a.frozenPacketPath,
   status:"completed",conclusion:"failure",created_at:"2027-02-10T04:59:00Z"
  }]};
  expect(planP5SignedLaterBatchChildren([a,b],history))
   .toEqual([b]);
 });
 it("holds on old unknown manual history, truncation and duplicate selection",()=>{
  const a=ready("flight_alpha_01");
  expect(()=>planP5SignedLaterBatchChildren([a,a],empty))
   .toThrow("DUPLICATE_REAL_READY_FLIGHT_PACKET");
  expect(()=>planP5SignedLaterBatchChildren([a],
   {total_count:101,workflow_runs:[]}))
   .toThrow("UNBOUNDED_GITHUB_LATER_PRE_HISTORY");
  expect(()=>planP5SignedLaterBatchChildren([a],{
   total_count:1,workflow_runs:[{
    id:5,display_title:"legacy arbitrary GH run",
    status:"completed",conclusion:"success",
    created_at:"2027-02-10T04:59:00Z"
   }]
  })).toThrow("UNIDENTIFIABLE_PRIOR_LATER_PRE_ATTEMPT_HOLD");
  expect(()=>planP5SignedLaterBatchChildren(
   Array.from({length:5},(_,i)=>ready("flight_"+i+"_test")),empty))
   .toThrow("UNBOUNDED_LATER_PRE_READY_FOR_GH_CHILD");
 });
});
