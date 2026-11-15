import {createHash,generateKeyPairSync} from "node:crypto";
import {describe,it,expect,vi} from "vitest";
import {requireP5CdGithubCurrentPrivatePreScope,requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {withP6AuthenticatedCurrentPrivateRoster} from "../server/lib/disruption/phase6CurrentPrivatePreScope_v39.mjs";
const mock=vi.hoisted(()=>({read:vi.fn()}));
vi.mock("../server/lib/disruption/phase6PrivateLaterQueueRosterReadOnce_v39.mjs",()=>({readP6PrivateLaterQueueRoster:mock.read}));
const hash="a".repeat(64),code="b".repeat(40),login="phase6_private_reader_login_ci_current";
const pub=generateKeyPairSync("ed25519").publicKey;
const pem=pub.export({type:"spki",format:"pem"}).toString(),fp=createHash("sha256").update(pub.export({type:"spki",format:"der"})).digest("hex");
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
 P5_CD_GH_PRE_APPROVED_CODE_SHA:code,P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
 P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
 P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_STOP:"0",P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",
 V39_PHASE6_PROCESS_ARMED:"1",V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",V39_P5_MANIFEST_SHA256:hash,V39_P5_RIGHTS_SHA256:hash,V39_P5_RELEASE_SHA256:hash,
 P5_CD_GH_PRIVATE_LATER_MODE:"PRIVATE_CURRENT_SCHEDULE",P5_CD_GH_PRIVATE_CURRENT_APPROVED:"1",
 P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED:"1",
 P5_V39_PRE_DATABASE_URL:"postgresql://phase5_p30_pre_login_20261107:ci@ep-test.neon.tech/neondb?sslmode=require",
 P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+login+":ci@ep-test.neon.tech/neondb?sslmode=require",
 P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",
 P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify({
  independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:login,reviewedCodeSha:code,
  manifestSha256:hash,calendarSha256:hash,releaseSha256:hash,rightsSha256:hash,
  dayReviewerFingerprintSha256:fp,dayReviewerPublicKeyPem:pem,
  queryReviewerFingerprintSha256:fp,queryReviewerPublicKeyPem:pem
 })).toString("base64")
});
const sel=(i:number)=>({runDayIndex:1,indexRevision:2,shardIndex:i,indexSha256:hash,laterRegistrySha256:hash});
const policy={independentLaterQueueTransportProjectionApproved:true,existingPaidDispatchApproved:false};
function fakeRead(s:ReturnType<typeof sel>){
 const bytes=Buffer.from("offline mock projection "+s.shardIndex);
 const digest=createHash("sha256").update(bytes).digest("hex");
 return {status:"VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO",day:s.runDayIndex,
 revision:s.indexRevision,shard:s.shardIndex,signedIndexSha256:s.indexSha256,
 signedLaterRegistrySha256:s.laterRegistrySha256,privateRosterBytes:bytes,
 derivedCompatibilityRosterSha256:digest,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
describe("scheduled current-day PRE scope — no real DB or provider",()=>{
 it("stable scope alone cannot authorize an original worker claim",()=>{
  const e=env();expect(requireP5CdGithubCurrentPrivatePreScope(e)).not.toHaveProperty("rosterSha256");
  expect(()=>requireP5CdGithubPreRelease(e)).toThrow("NO_LIVE_AUTHENTICATED_ROSTER_CONTEXT");
 });
 it.each([{P5_CD_GH_PRE_ROSTER_SHA256:hash},{P5_CD_GH_PRE_STOP:"1"},
  {GITHUB_EVENT_NAME:"workflow_dispatch"},{P5_CD_GH_PRIVATE_CURRENT_APPROVED:"0"},
  {V39_PHASE5_FREEZE_SIGNED:"0"},{P5_CD_GH_PRIVATE_DAY:"1"},{RAPIDAPI_KEY:"forbidden"}])("fails closed before read: %j",delta=>{
  expect(()=>requireP5CdGithubCurrentPrivatePreScope({...env(),...delta})).toThrow();
 });
 it("mock actual reader seam: parallel scopes are isolated; callback expiry cannot grant later claims",async()=>{
  mock.read.mockImplementation(async({selector})=>fakeRead(selector));
  const e=env();
  const answer=await Promise.all([1,2,3,4].map(i=>withP6AuthenticatedCurrentPrivateRoster({
   client:{},env:e,selector:sel(i),policy
  },async p=>{
   await Promise.resolve();
   expect(requireP5CdGithubPreRelease(e).rosterSha256).toBe(p.derivedCompatibilityRosterSha256);
   expect(()=>requireP5CdGithubPreRelease({...e,P5_CD_GH_PRE_STOP:"1"})).toThrow();
   expect(()=>requireP5CdGithubPreRelease({...e,P6_PRIVATE_READER_DATABASE_URL:"drifted"})).toThrow();
   return p.derivedCompatibilityRosterSha256;
  })));
  expect(new Set(answer).size).toBe(4);
  expect(()=>requireP5CdGithubPreRelease(e)).toThrow("NO_LIVE_AUTHENTICATED_ROSTER_CONTEXT");
 });
 it("rejects mismatched readback and never invokes worker",async()=>{
  mock.read.mockResolvedValue(fakeRead(sel(2)));const work=vi.fn();
  await expect(withP6AuthenticatedCurrentPrivateRoster({client:{},env:env(),selector:sel(1),policy},work)).rejects.toThrow("CURRENT_AUTHENTICATED_PROJECTION_REQUIRED");
  expect(work).not.toHaveBeenCalled();
 });
});
