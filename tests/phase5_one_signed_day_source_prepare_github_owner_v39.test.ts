import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {admitP5SignedDayGitHubPrepare,loadP5PrivatePrepareReviewPacket,P5_PRIVATE_PREPARE_CONFIRM,P5_PRIVATE_PREARM_PREPARE_CONFIRM,
 type P5SignedOneDayPreparePacket}
 from "../scripts/v39_phase5_one_signed_day_source_prepare_github_owner_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
const sh=(x:string)=>x.repeat(64);
const CODE="f".repeat(40);
const PATH="data-collection/phase5/frozen/day01_signed_source_prepare.json";
const URL="postgresql://phase5_p30_prepare_login_20261107:ci-only@localhost/neondb";
function fixture(){
 const packet={
  schema:"v39.phase5.github-signed-one-day-source-preparation.v1",
  approvedCodeSha:CODE,manifestSha256:sh("a"),runDayIndex:1,
  independentlyReviewedExactDaySourcePacket:true,
  reviewedPrepareInput:{
   readScope:{
    runDayIndex:1,expectedManifestSha256:sh("a"),
    expectedCalendarSha256:sh("b"),expectedConfigSha256:sh("c"),
    expectedFrameSha256:sh("d"),
    expectedRestrictedReaderRole:P5_STAGE28_GROUPS.prepare
   },
   sourceReview:{
    manifestSha256:sh("a"),calendarSha256:sh("b"),
    configSha256:sh("c"),frameSha256:sh("d")
   },
   stage9Review:{
    expectedRestrictedWriterRole:P5_STAGE28_GROUPS.prepare,
    expectedManifestSha256:sh("a"),expectedCalendarSha256:sh("b"),
    expectedConfigSha256:sh("c"),expectedFrameSha256:sh("d"),
    independentFreezeApproved:true,independentRightsReviewApproved:true,
    githubOnlyProspectiveOwnerApproved:true
   }
  }
 } as unknown as P5SignedOneDayPreparePacket;
 const raw=Buffer.from(JSON.stringify(packet));
 const env={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:CODE,
  P5_DAY_PREPARE_CONFIRM:"ONE_SIGNED_FUTURE_DAY_PREPARED_NO_PROVIDER_GET",
  V39_P5_PREPARE_APPROVED_CODE_SHA:CODE,
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  V39_P5_PREPARE_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_SIGNED_PREPARE_DAY_PACKET_SHA256:
   createHash("sha256").update(raw).digest("hex"),
  V39_P5_MANIFEST_SHA256:sh("a"),V39_P5_CALENDAR_HASH:sh("b"),
  V39_P5_CONFIG_HASH:sh("c"),V39_P5_FRAME_HASH:sh("d"),
  P5_V39_PREPARE_DATABASE_URL:URL,
 } as NodeJS.ProcessEnv;
 return {packet,raw,env};
}
describe("Phase5 signed source-day owner (GitHub only, no provider)",()=>{
 it("accepts one exact signed future day under existing commissioned PREPARE role",()=>{
  const {packet,raw,env}=fixture();
  const proof=admitP5SignedDayGitHubPrepare(env,raw,packet,PATH);
  expect(proof.runDayIndex).toBe(1);
  expect(proof.manifestSha256).toBe(sh("a"));
  expect(proof.signedPacketSha256)
   .toBe(createHash("sha256").update(raw).digest("hex"));
  expect(JSON.stringify(proof)).not.toContain("ci-only");
 });
 it("refuses altered packet bytes despite same in-memory JSON representation",()=>{
  const {packet,raw,env}=fixture();
  const bad=Buffer.from(raw.toString()+" ");
  expect(()=>admitP5SignedDayGitHubPrepare(env,bad,packet,PATH))
   .toThrow("REVIEWED_PACKET_BYTES_OR_ALLOWED_FILE_MISMATCH");
 });
 it("refuses stale code, fork, PR, schedule and renewed GitHub run attempts",()=>{
  const {packet,raw,env}=fixture();
  for(const bad of [
   {GITHUB_SHA:"e".repeat(40)},
   {GITHUB_REF:"refs/pull/999/merge"},
   {GITHUB_REPOSITORY:"other/project"},
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {ADB_AUTO_COLLECT:"1"},
   {AERODATABOX_API_KEY:"should-not-exist"},
   {V39_P5_PREPARE_OWNER_APPROVED:"0"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"0"}
  ]){
   expect(()=>admitP5SignedDayGitHubPrepare({...env,...bad},raw,packet,PATH))
    .toThrow("UNSIGNED_GITHUB_MAIN_OR_SEPARATE_PHASE6_GO");
  }
 });
 it("refuses path traversal, old nonexistent historical pilots and unsigned release file",()=>{
  const {packet,raw,env}=fixture();
  for(const wrong of ["../old.json",
   "data-collection/phase5/frozen/../old.json",
   "data-collection/phase4/frozen/day01_signed_source_prepare.json",
   "data-collection/phase5/frozen/a.json"])
   expect(()=>admitP5SignedDayGitHubPrepare(env,raw,packet,wrong))
    .toThrow("REVIEWED_PACKET_BYTES_OR_ALLOWED_FILE_MISMATCH");
 });
 it("refuses substitution of a future day, wrong manifest, or role scope",()=>{
  const {packet,raw,env}=fixture();
  for(const bad of [
   {runDayIndex:2},
   {manifestSha256:sh("e")},
   {reviewedPrepareInput:{
    ...packet.reviewedPrepareInput,
    readScope:{...packet.reviewedPrepareInput.readScope,
     expectedRestrictedReaderRole:P5_STAGE28_GROUPS.source}
   }},
   {reviewedPrepareInput:{
    ...packet.reviewedPrepareInput,
    stage9Review:{...packet.reviewedPrepareInput.stage9Review,
     expectedRestrictedWriterRole:P5_STAGE28_GROUPS.source}
   }}
  ]){
   // Even a rebuilt, self-consistently SHA-pinned JSON has no authority
   // if it differs from the independent scene/role authorizations.
   const rewritten={...packet,...bad} as P5SignedOneDayPreparePacket;
   const bytes=Buffer.from(JSON.stringify(rewritten));
   const pin=createHash("sha256").update(bytes).digest("hex");
   expect(()=>admitP5SignedDayGitHubPrepare({
    ...env,V39_P5_SIGNED_PREPARE_DAY_PACKET_SHA256:pin
   },bytes,rewritten,PATH)).toThrow("DAY_SOURCE_REVIEW_SCENE_OR_ROLE_DRIFT");
  }
 });
 it("requires existing reviewed prepare login, never application or pre writer login",()=>{
  const {packet,raw,env}=fixture();
  for(const bad of [
   {P5_V39_PREPARE_DATABASE_URL:undefined},
   {P5_V39_PREPARE_DATABASE_URL:
    "postgresql://phase5_p30_pre_login_20261107:ci@localhost/neondb"},
   {P5_V39_PREPARE_DATABASE_URL:
    "postgresql://app_runtime:ci@localhost/neondb"}
  ])expect(()=>admitP5SignedDayGitHubPrepare({...env,...bad},raw,packet,PATH))
   .toThrow(/EXISTING_PREPARE_LOGIN_MISSING|NOT_ALREADY_COMMISSIONED_PREPARE_LOGIN/);
  expect(()=>admitP5SignedDayGitHubPrepare({
   ...env,DATABASE_URL:URL
  },raw,packet,PATH)).toThrow("NO_CROSS_ROLE_OR_APPLICATION_CONNECTION");
 });
});

describe("private bounded one-day preparation handoff",()=>{
 function privateFixture(){
  const {packet,raw,env}=fixture();
  return {packet,raw,env:{...env,
   P5_DAY_PREPARE_PRIVATE_CONFIRM:P5_PRIVATE_PREPARE_CONFIRM,
   P5_DAY_PREPARE_PRIVATE_MODE:"1",P5_DAY_PREPARE_EXPECTED_DAY:"1",
   P5_SOURCE_PREPARE_PRIVATE_PACKET_B64:raw.toString("base64")}};
 }
 it("reuses exact original admission with private bytes and no filesystem",()=>{
  const {env,raw,packet}=privateFixture();
  const p=loadP5PrivatePrepareReviewPacket(env);
  expect(p.bytes.equals(raw)).toBe(true);
  expect(p.packet).toEqual(packet);
  expect(Object.keys(p)).toEqual(["logicalPath","runDayIndex"]);
  expect(JSON.stringify(p)).not.toContain("reviewedPrepareInput");
  expect(admitP5SignedDayGitHubPrepare(env,p.bytes,p.packet,p.logicalPath).runDayIndex).toBe(1);
 });
 it("refuses altered B64, wrong day, bad hash or unapproved private mode",()=>{
  const {env}=privateFixture();
  for(const bad of [
   {P5_DAY_PREPARE_PRIVATE_MODE:"0"},
   {P5_DAY_PREPARE_PRIVATE_CONFIRM:"wrong"},
   {P5_DAY_PREPARE_EXPECTED_DAY:"2"},
   {P5_DAY_PREPARE_EXPECTED_DAY:"01"},
   {P5_DAY_PREPARE_EXPECTED_DAY:"32"},
   {P5_SOURCE_PREPARE_PRIVATE_PACKET_B64:""},
   {P5_SOURCE_PREPARE_PRIVATE_PACKET_B64:env.P5_SOURCE_PREPARE_PRIVATE_PACKET_B64+"\n"},
   {P5_SOURCE_PREPARE_PRIVATE_PACKET_B64:"A".repeat(48004)},
   {V39_P5_SIGNED_PREPARE_DAY_PACKET_SHA256:sh("e")}
  ])expect(()=>loadP5PrivatePrepareReviewPacket({...env,...bad})).toThrow(/PRIVATE_PREPARE_/);
 });
 it("rejects substituted decoded in-memory packet even with unchanged reviewed bytes",()=>{
  const {packet,env,raw}=privateFixture();
  expect(()=>admitP5SignedDayGitHubPrepare(env,raw,{...packet,runDayIndex:2},PATH))
   .toThrow("PARSED_PACKET_DIFFERS_FROM_REVIEWED_BYTES");
 });
 it("does not waive any paid arm, freeze or rights gate",()=>{
  const {env}=privateFixture();
  const p=loadP5PrivatePrepareReviewPacket(env);
  for(const bad of [
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {RAPIDAPI_KEY:"ci-forbidden"},
   {AERODATABOX_WEBHOOK_SECRET:"ci-forbidden"}
  ])expect(()=>admitP5SignedDayGitHubPrepare({...env,...bad},p.bytes,p.packet,p.logicalPath))
   .toThrow("UNSIGNED_GITHUB_MAIN_OR_SEPARATE_PHASE6_GO");
 });
});

describe("separate pre-arm preparation of exact authorized future day",()=>{
 function prearm(){
  const {env,packet,raw}=fixture();
  return {packet,raw,env:{...env,P5_DAY_PREPARE_PRIVATE_MODE:"1",
   P5_DAY_PREPARE_PRIVATE_CONFIRM:P5_PRIVATE_PREARM_PREPARE_CONFIRM,
   P5_DAY_PREPARE_EXPECTED_DAY:"1",P5_SOURCE_PREPARE_PRIVATE_PACKET_B64:raw.toString("base64"),
   V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",
   V39_P5_PREPARE_PREARM_APPROVED:"1"}};
 }
 it("permits metadata/ledger preparation while paid process is stopped, without manufacturing freeze or rights",()=>{
  const f=prearm(),p=loadP5PrivatePrepareReviewPacket(f.env);
  expect(admitP5SignedDayGitHubPrepare(f.env,p.bytes,p.packet,p.logicalPath).preparationMode)
   .toBe("PREARM_NONPAID");
 });
 it("never treats pre-arm confirmation as paid approval or bypasses any existing SHA/rights/role checks",()=>{
  const f=prearm(),p=loadP5PrivatePrepareReviewPacket(f.env);
  for(const bad of [
   {V39_P5_PREPARE_PREARM_APPROVED:"0"},{V39_PHASE6_PROCESS_ARMED:"1"},
   {V39_PHASE6_OWNER_APPROVED:"1"},{P5_DAY_PREPARE_PRIVATE_MODE:"0"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},{V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {GITHUB_SHA:"e".repeat(40)},{AERODATABOX_API_KEY:"NOT_ALLOWED"},
   {P5_DAY_PREPARE_PRIVATE_CONFIRM:P5_PRIVATE_PREPARE_CONFIRM}
  ])expect(()=>admitP5SignedDayGitHubPrepare({...f.env,...bad},p.bytes,p.packet,p.logicalPath))
   .toThrow(/REFUSED_P5_SIGNED_DAY_PREPARE_/);
 });
});
