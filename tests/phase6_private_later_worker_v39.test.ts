import {createHash,generateKeyPairSync} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitP5PrivateLaterWorker,bindP5PrivateProjectionToWorker,readP5CdCheckoutRosterPath} from "../scripts/v39_phase5_cd_github_one_bounded_pre_tick_v39";
const H="a".repeat(64),code="b".repeat(40);
const pub=generateKeyPairSync("ed25519").publicKey;
const pem=pub.export({type:"spki",format:"pem"}).toString();
const fingerprint=createHash("sha256").update(pub.export({type:"spki",format:"der"})).digest("hex");
const login="phase6_private_reader_login_ci_worker";
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
 P5_CD_GH_PRE_APPROVED_CODE_SHA:code,P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
 P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
 P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_STOP:"0",P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
 P5_CD_GH_PHASE5_CANARY_APPROVED:"1",V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE5_FREEZE_SIGNED:"0",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",P5_CD_GH_PRE_ROSTER_SHA256:H,
 V39_P5_MANIFEST_SHA256:H,V39_P5_RIGHTS_SHA256:H,V39_P5_RELEASE_SHA256:H,
 P5_V39_PRE_DATABASE_URL:"postgresql://phase5_p30_pre_login_20261107:ci@ep-test.neon.tech/neondb?sslmode=require",
 P5_CD_GH_PRIVATE_LATER_MODE:"PRIVATE_EXACT_SHARD",P5_CD_GH_PRIVATE_LATER_APPROVED:"1",
 P5_CD_GH_PRIVATE_DAY:"1",P5_CD_GH_PRIVATE_REVISION:"2",P5_CD_GH_PRIVATE_SHARD:"3",
 P5_CD_GH_PRIVATE_INDEX_SHA:H,P5_CD_GH_PRIVATE_REGISTRY_SHA:H,
 P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+login+":ci@ep-test.neon.tech/neondb?sslmode=require",
 P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",
 P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify({
  independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:login,
  reviewedCodeSha:code,manifestSha256:H,calendarSha256:H,releaseSha256:H,rightsSha256:H,
  dayReviewerFingerprintSha256:fingerprint,dayReviewerPublicKeyPem:pem,
  queryReviewerFingerprintSha256:fingerprint,queryReviewerPublicKeyPem:pem
 })).toString("base64")
});
describe("actual private exact later PRE worker transport gate",()=>{
 it("retains original PRE release and independently pinned roster digest",()=>{
  const x=admitP5PrivateLaterWorker(env());
  expect(x.selector).toEqual({runDayIndex:1,indexRevision:2,shardIndex:3,indexSha256:H,laterRegistrySha256:H});
  expect(x.gate.rosterSha256).toBe(H);
 });
 it.each([
  {P5_CD_GH_PRIVATE_LATER_APPROVED:"0"},{P5_CD_GH_PRE_STOP:"1"},
  {P5_CD_GH_PRIVATE_DAY:"32"},{P5_CD_GH_PRIVATE_REVISION:"01"},
  {P5_CD_GH_PRIVATE_REGISTRY_SHA:"wrong"},{GITHUB_EVENT_NAME:"schedule"},
  {P5_CD_GH_BURST_TICKS:"2"},{P5_CD_GH_PRE_ROSTER_PATH:"private.json"},
  {P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+login+":ci@other.neon.tech/neondb?sslmode=require"},
  {P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+login+":ci@ep-test.neon.tech/neondb?sslmode=disable"},
  {RAPIDAPI_KEY:"unexpected"}
 ])("fails closed before opening a session: %j",delta=>{
  expect(()=>admitP5PrivateLaterWorker({...env(),...delta})).toThrow();
 });
 it("does not replace independently protected roster digest with a derived hash",()=>{
  const ctx=admitP5PrivateLaterWorker(env());
  expect(()=>bindP5PrivateProjectionToWorker({
   status:"VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO",
   day:1,revision:2,shard:3,signedIndexSha256:H,signedLaterRegistrySha256:H,
   derivedCompatibilityRosterSha256:"c".repeat(64),
   providerCalls:0,databaseWrites:0,phase6PaidGo:false
  } as any,ctx)).toThrow("PRIVATE_PROJECTION_NOT_MATCHED_TO_PROTECTED_ROSTER_PIN");
 });
});

describe("existing checkout workflow canonical roster path",()=>{
 const path="data-collection/phase5/frozen/ci_reviewed_roster.json";
 it("uses the exact actual workflow variable rather than an unexported alias",()=>{
  expect(readP5CdCheckoutRosterPath({P5_CD_GH_PRE_ROSTER_PATH:path})).toBe(path);
  expect(readP5CdCheckoutRosterPath({P5_CD_GH_ROSTER_PATH:path})).toBe(path);
  expect(readP5CdCheckoutRosterPath({P5_CD_GH_PRE_ROSTER_PATH:path,P5_CD_GH_ROSTER_PATH:path})).toBe(path);
 });
 it("refuses conflict or non-frozen paths",()=>{
  expect(()=>readP5CdCheckoutRosterPath({P5_CD_GH_PRE_ROSTER_PATH:path,P5_CD_GH_ROSTER_PATH:"different.json"})).toThrow("CONFLICTING_LEGACY_ROSTER_PATH");
  expect(()=>readP5CdCheckoutRosterPath({P5_CD_GH_PRE_ROSTER_PATH:"/tmp/roster.json"})).toThrow();
  expect(()=>admitP5PrivateLaterWorker({...env(),P5_CD_GH_ROSTER_PATH:path})).toThrow();
 });
});
