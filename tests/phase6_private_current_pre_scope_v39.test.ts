import {createHash,generateKeyPairSync} from "node:crypto";
import {describe,it,expect,vi} from "vitest";
import {requireP5CdGithubCurrentPrivatePreScope,requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";
import {assertP6CurrentPrivatePreMode,withP6AuthenticatedCurrentPrivateRoster,readP6UnchangedCurrentPreRoster} from "../server/lib/disruption/phase6CurrentPrivatePreScope_v39.mjs";
import {loadP6LaterCalendarWindows,loadP6CurrentPreCalendarWindows,P6_CURRENT_PRE_DISPATCH_CONFIRM}
 from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
const mock=vi.hoisted(()=>({read:vi.fn(),current:vi.fn()}));
vi.mock("../server/lib/disruption/phase6PrivateLaterQueueRosterReadOnce_v39.mjs",()=>({readP6PrivateLaterQueueRoster:mock.read}));
vi.mock("../server/lib/disruption/phase6StoredPrivateReviewReadOnce_v39.mjs",()=>({readP6StoredPrivateReviewOnce:mock.current}));
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

describe("current signed-day append-safe reauthentication",()=>{
 it("continues exact old shard under authenticated newer revision, not guessed pins",async()=>{
  const original=sel(1),digest=fakeRead(original).derivedCompatibilityRosterSha256,latest="d".repeat(64);
  mock.current.mockResolvedValue({pins:{expectedRunDayIndex:1,expectedIndexRevision:3,expectedIndexSha256:latest}});
  mock.read.mockImplementation(async({selector})=>fakeRead(selector));
  const x=await readP6UnchangedCurrentPreRoster({client:{},env:env(),selector:original,policy,expectedUnchangedRosterDigest:digest});
  expect(x.selector).toEqual({...original,indexRevision:3,indexSha256:latest});
  expect(x.projection.derivedCompatibilityRosterSha256).toBe(digest);
  const e=env();
  await withP6AuthenticatedCurrentPrivateRoster({client:{},env:e,selector:original,policy,expectedUnchangedRosterDigest:digest},async p=>{
   expect(p.revision).toBe(3);expect(requireP5CdGithubPreRelease(e).rosterSha256).toBe(digest);
  });
  expect(()=>requireP5CdGithubPreRelease(e)).toThrow("NO_LIVE_AUTHENTICATED_ROSTER_CONTEXT");
 });
 it("rejects rollback, equal-revision changed SHA and changed roster bytes",async()=>{
  const original=sel(1),digest=fakeRead(original).derivedCompatibilityRosterSha256;
  const x={client:{},env:env(),selector:original,policy,expectedUnchangedRosterDigest:digest};
  mock.current.mockResolvedValue({pins:{expectedRunDayIndex:1,expectedIndexRevision:1,expectedIndexSha256:hash}});
  await expect(readP6UnchangedCurrentPreRoster(x)).rejects.toThrow("ROLLBACK");
  mock.current.mockResolvedValue({pins:{expectedRunDayIndex:1,expectedIndexRevision:2,expectedIndexSha256:"d".repeat(64)}});
  await expect(readP6UnchangedCurrentPreRoster(x)).rejects.toThrow("ROLLBACK");
  mock.current.mockResolvedValue({pins:{expectedRunDayIndex:1,expectedIndexRevision:3,expectedIndexSha256:"d".repeat(64)}});
  mock.read.mockImplementation(async({selector})=>({...fakeRead(selector),privateRosterBytes:Buffer.from("changed")}));
  await expect(readP6UnchangedCurrentPreRoster(x)).rejects.toThrow("CHANGED_OR_CURRENT_READ");
 });
});

describe("explicit dispatch uses the same current PRE route, not a legacy or enrollment bypass",()=>{
 const dispatch=()=>({...env(),GITHUB_EVENT_NAME:"workflow_dispatch",
  P6_PRIVATE_CURRENT_PRE_DISPATCH_CONFIRM:P6_CURRENT_PRE_DISPATCH_CONFIRM});
 it("requires original release and gate flags and authenticates current shard in same scope",async()=>{
  const e=dispatch();
  expect(requireP5CdGithubCurrentPrivatePreScope(e)).not.toHaveProperty("rosterSha256");
  expect(()=>requireP5CdGithubPreRelease(e)).toThrow("NO_LIVE_AUTHENTICATED_ROSTER_CONTEXT");
  mock.read.mockImplementation(async({selector})=>fakeRead(selector));
  await withP6AuthenticatedCurrentPrivateRoster({client:{},env:e,selector:sel(1),policy},async p=>{
   expect(requireP5CdGithubPreRelease(e).rosterSha256).toBe(p.derivedCompatibilityRosterSha256);
   expect(()=>requireP5CdGithubPreRelease({...e,P5_CD_GH_PRE_STOP:"1"})).toThrow();
  });
  for(const delta of [{P6_PRIVATE_CURRENT_PRE_DISPATCH_CONFIRM:"wrong"},
   {P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED:"0"},{P5_CD_GH_PRIVATE_CURRENT_APPROVED:"0"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},{P5_CD_GH_PRIVATE_DAY:"1"},
   {GITHUB_EVENT_NAME:"schedule"},{P5_CD_GH_PRE_MODE:"PHASE5_CANARY"}])
   expect(()=>requireP5CdGithubCurrentPrivatePreScope({...e,...delta})).toThrow();
 });
 it("reads identical pinned day plans for current PRE; original enrollment and T24 calendar entry reject dispatch",()=>{
  const e=env(),trust=assertP6CurrentPrivatePreMode(e);
  const raw=new Map<string,Buffer>();
  const dayPlanSha256s=Array.from({length:31},(_,i)=>{
   const runDayIndex=i+1;
   const b=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex,
    templates:Array.from({length:12},(_,j)=>({runDayIndex,horizon:j<6?"T-6h":"T-90m",
     scheduledRequestUtc:"2030-01-01T00:00:00.000Z",earliestPlannedCutoffUtc:"2030-01-01T00:15:00.000Z",
     serviceWindowEndUtc:"2030-01-01T08:00:00.000Z"}))}));
   raw.set("data-collection/phase5/planning/phase6-source-day-"+String(runDayIndex).padStart(2,"0")+".json",b);
   return {runDayIndex,sha256:createHash("sha256").update(b).digest("hex")};
  });
  const bytes=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",
   delegatedDailyPacketProductionApproved:true,approvedCodeSha:trust.reviewedCodeSha,
   manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,releaseSha256:trust.releaseSha256,
   rightsSha256:trust.rightsSha256,dayPlanSha256s,validFromUtc:"2030-01-01T00:00:00.000Z",
   validUntilUtc:"2030-03-01T00:00:00.000Z"}));
  const calendarEnv={...e,P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED:"1",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",
   P6_NONPAID_DAILY_POLICY_BASE64:bytes.toString("base64"),
   P6_NONPAID_DAILY_POLICY_SHA256:createHash("sha256").update(bytes).digest("hex")};
  const read=(path:string)=>raw.get(path)!;
  const manual={...calendarEnv,GITHUB_EVENT_NAME:"workflow_dispatch",
   P6_PRIVATE_CURRENT_PRE_DISPATCH_CONFIRM:P6_CURRENT_PRE_DISPATCH_CONFIRM};
  expect(loadP6CurrentPreCalendarWindows(manual,trust,read)).toEqual(loadP6CurrentPreCalendarWindows(calendarEnv,trust,read));
  expect(()=>loadP6LaterCalendarWindows(manual,trust,read)).toThrow("EXPLICIT_SCHEDULE_SCOPE_REQUIRED");
  expect(()=>loadP6LaterCalendarWindows(manual,trust,read,"T24")).toThrow("EXPLICIT_SCHEDULE_SCOPE_REQUIRED");
  expect(()=>loadP6CurrentPreCalendarWindows({...manual,P6_PRIVATE_CURRENT_PRE_DISPATCH_CONFIRM:""},trust,read)).toThrow("EXPLICIT_SCHEDULE_SCOPE_REQUIRED");
 });
});
