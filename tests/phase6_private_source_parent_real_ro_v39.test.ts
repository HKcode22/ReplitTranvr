import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitP6RealPrivateSourceParentReadOnly,
 runP6RealPrivateSourceParentReadOnly}
 from "../scripts/v39_phase6_private_source_parent_readonly_v39.mjs";
const H=(s:string)=>createHash("sha256").update(s).digest("hex");
const hex=(c:string)=>c.repeat(64),main="f".repeat(40),
 manifest=hex("a"),release=hex("b"),rights=hex("c"),contract=hex("d");
const path="data-collection/phase5/frozen/source_12345678.json";
const packet="data-collection/phase5/frozen/sourceq_12345678.json";
const dbNow="2026-11-14T06:00:00.000Z";
const plan="2026-11-14T06:30:00.000Z",latest="2026-11-14T06:45:00.000Z";
const digest=H("due source one");
const b64=(x:unknown)=>Buffer.from(JSON.stringify(x)).toString("base64");
function fixture(){
 const login="phase6_private_reader_login_ci_checks";
 const pins={
  independentExternalReviewerSignaturePinsApproved:true,
  privateDayIndexReadOnlyApproved:true,
  existingPaidGithubDispatchApproved:false,
  expectedReaderSessionLogin:login,expectedRunDayIndex:1,
  expectedIndexRevision:1,expectedIndexSha256:H("signed index"),
  expectedPreviousIndexSha256:null,expectedReviewedCodeSha:main,
  expectedManifestSha256:manifest,expectedCalendarSha256:H("calendar"),
  expectedReleaseSha256:release,expectedRightsSha256:rights,
  expectedExternalReviewEvidenceSha256:H("review evidence"),
  expectedReviewerPublicKeyFingerprintSha256:H("fingerprint")
 };
 const wire={review:{
  runDayIndex:1,indexRevision:1,
  reviewedAtUtc:"2026-11-14T05:50:00.000Z",
  validUntilUtc:"2026-11-14T06:50:00.000Z",
  retentionNotAfterUtc:"2026-11-15T06:00:00.000Z"
 },signatureBase64:"SYNTHETIC_ONLY_NEVER_A_REAL_ED25519_SIGNATURE"};
 const reviews=[{pins,wire,
  publicKeyPem:"-----BEGIN PUBLIC KEY-----\nSYNTHETIC_NOT_VALID\n-----END PUBLIC KEY-----"}];
 const env:Record<string,string>={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:main,
  P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA:main,
  P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED:"1",
  P6_PRIVATE_SOURCE_PARENT_RO_ENABLED:"true",
  ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",
  V39_PHASE6_OWNER_APPROVED:"0",
  AERODATABOX_API_KEY:"",AERODATABOX_WEBHOOK_SECRET:"",
  RAPIDAPI_KEY:"",DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
  P5_V39_PRE_DATABASE_URL:"",P5_V39_PREPARE_DATABASE_URL:"",
  P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"",
  P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"",
  GITHUB_TOKEN:"OFFLINE_GITHUB_HISTORY_READ_TOKEN_ONLY",
  V39_P5_MANIFEST_SHA256:manifest,V39_P5_RELEASE_SHA256:release,
  V39_P5_RIGHTS_SHA256:rights,V39_P5_PROVIDER_CONTRACT_SHA256:contract,
  V39_P5_SOURCE_DATABASE_URL:
   "postgresql://phase5_p5_source_login_20261108:ci@" +
   "ep-no-live-source.us-east-1.aws.neon.tech/neondb?sslmode=require",
  P6_PRIVATE_READER_DATABASE_URL:
   "postgresql://"+login+":ci@ep-no-live-reader.us-east-1.aws.neon.tech" +
   "/neondb?sslmode=require",
  P6_PRIVATE_SOURCE_PARENT_RO_DAY_REVIEWS_BASE64:b64(reviews)
 };
 const registry=Buffer.from(JSON.stringify({
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:manifest,runDayIndex:1,
  entries:[{filePath:packet,expectedPacketSha256:H("packet"),
   expectedQueryDigestSha256:digest}]
 }));
 const route={
  lane:"SOURCE",runDayIndex:1,shardIndex:1,
  signedFrozenPath:path,signedFrozenSha256:H(registry),
  routingIntentSha256:H("intent"),
  notBeforeUtc:"2026-11-14T05:30:00.000Z",
  hardLatestUtc:"2026-11-14T06:40:00.000Z",
  boundSourceRegistryPath:null,boundSourceRegistrySha256:null,
  privateBytesOnlyFromRestrictedReader:true,
  independentlyAuthenticatedGHHistoryRequired:true,
  newPaidDispatchAuthorizedHere:false
 };
 const day:any={redactedSummary:{
  schema:"v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1",
  status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",
  runDayIndex:1,externallySignedDayEpochIndexSha256:H("signed index"),
  observedRealPgClockUtc:dbNow,
  reviewedEd25519SourceWasOriginalDayBytes:true,
  originalV0096GlobalChainNotUsed:true,
  derivedProjectionIsNotAnAdditionalReviewerSignature:true,
  phase6PaidGo:false,providerCalls:0,
  databaseWrites:0,githubChildDispatches:0
 }};
 Object.defineProperty(day,"privateRoutingCandidates",{
  enumerable:false,writable:false,value:[route]
 });
 Object.defineProperty(day,"getFrozen",{
  enumerable:false,writable:false,value:()=>Buffer.from(registry)
 });
 const scan={
  schema:"v39.phase5.github-upcoming-source-queue-observer.v1",
  checkedAtDatabaseUtc:dbNow,
  manifestSha256:manifest,observedQueries:1,
  providerCalls:0,databaseWrites:0,externalGithubDispatches:0,
  signedDaySourceBatch:null,signedPacketHandoff:null,
  candidates:[{queryDigestSha256:digest,runDayIndex:1,
   status:"DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH",
   plannedDispatchUtc:plan,latestDispatchUtc:latest}]
 };
 const history={total_count:0,workflow_runs:[]};
 return{env,day,scan,history,reviews,pins,wire};
}
describe("original 10-minute SOURCE parent real private NO-GO gate",()=>{
 it("admits only GH main, distinct scoped SOURCE+private reader, bounded independent review",()=>{
  const f=fixture(),out=admitP6RealPrivateSourceParentReadOnly(f.env);
  expect(out.reviews).toHaveLength(1);
  expect(out.scope.expectedSourceRole).toBe("phase5_source_readonly_v39");
  expect(out.scope.expectedManifestSha256).toBe(manifest);
  expect(out.mainSha).toBe(main);
 });
 it("accepts manual read-only request independently of old paid/legacy job",()=>{
  const f=fixture();f.env.GITHUB_EVENT_NAME="workflow_dispatch";
  f.env.P6_PRIVATE_SOURCE_PARENT_RO_ENABLED="false";
  f.env.P6_PRIVATE_SOURCE_PARENT_RO_CONFIRM=
   "READ_ONLY_AUTHENTIC_PRIVATE_DAY_SOURCE_NO_PROVIDER_NO_DISPATCH";
  expect(admitP6RealPrivateSourceParentReadOnly(f.env).reviews).toHaveLength(1);
 });
 it("refuses paid mode, provider credentials, GitHub wrong main and unapproved study day before SQL",()=>{
  for(const change of [
   {ADB_AUTO_COLLECT:"1"},{V39_PHASE6_PROCESS_ARMED:"1"},
   {AERODATABOX_API_KEY:"SEPARATE_PROVIDER_KEY_MUST_NOT_ENTER_RO"},
   {GITHUB_REF:"refs/heads/feature"},
   {GITHUB_EVENT_NAME:"pull_request"},
   {GITHUB_RUN_ATTEMPT:"2"},
   {P6_PRIVATE_SOURCE_PARENT_RO_ENABLED:"false"},
   {P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA:"a".repeat(40)},
   {DATABASE_URL:"postgres://APP_OWNER_FORBIDDEN"}
  ]){
   const f=fixture();
   expect(()=>admitP6RealPrivateSourceParentReadOnly({...f.env,...change})).
    toThrow(/HOLD_P6_PRIVATE_SOURCE_PARENT_RO_/);
  }
 });
 it("refuses wrong SOURCE/PRIVATE DB or fake cross-role SSL override",()=>{
  for(const which of [
   {V39_P5_SOURCE_DATABASE_URL:
    "postgresql://neondb_owner:ci@ep-x.neon.tech/neondb?sslmode=require"},
   {P6_PRIVATE_READER_DATABASE_URL:
    "postgresql://neondb_owner:ci@ep-x.neon.tech/neondb?sslmode=require"},
   {P6_PRIVATE_READER_DATABASE_URL:
    "postgresql://phase6_private_reader_login_ci_checks:ci@evil.invalid/neondb?sslmode=require"},
   {P6_PRIVATE_READER_DATABASE_URL:
    "postgresql://phase6_private_reader_login_ci_checks:ci@ep-x.neon.tech/neondb?sslmode=disable"}
  ]){
   const f=fixture();
   expect(()=>admitP6RealPrivateSourceParentReadOnly({...f.env,...which})).
    toThrow(/HOLD_P6_PRIVATE_SOURCE_PARENT_RO_/);
  }
 });
 it("requires unique day, index code/rights and no claim of paid admission",()=>{
  for(const tweak of [
   {expectedReviewedCodeSha:"e".repeat(40)},
   {expectedRightsSha256:hex("e")},
   {privateDayIndexReadOnlyApproved:false},
   {existingPaidGithubDispatchApproved:true},
   {expectedRunDayIndex:32}
  ]){
   const f=fixture(),changed=[
    {...f.reviews[0],pins:{...f.pins,...tweak}}
   ];
   f.env.P6_PRIVATE_SOURCE_PARENT_RO_DAY_REVIEWS_BASE64=b64(changed);
   expect(()=>admitP6RealPrivateSourceParentReadOnly(f.env)).
    toThrow(/HOLD_P6_PRIVATE_SOURCE_PARENT_RO_/);
  }
 });
 it("connects existing original SOURCE queue+authenticated day+complete GH history, NO dispatch",async()=>{
  const f=fixture(),calls:string[]=[];
  const out=await runP6RealPrivateSourceParentReadOnly(f.env,{
   readSource:async (ctx:any)=>{
    expect(ctx.scope.expectedManifestSha256).toBe(manifest);
    calls.push("SOURCE_RO");
    return f.scan;
   },
   readDays:async (ctx:any)=>{
    expect(ctx.reviews[0].pins.expectedRunDayIndex).toBe(1);
    calls.push("PRIVATE_DAY_ED25519_READER");
    return[f.day];
   },
   readHistory:async (_scan:any)=>{
    calls.push("COMPLETE_GITHUB_HISTORY_READ");
    return f.history;
   }
  });
  expect(calls).toEqual(["SOURCE_RO","PRIVATE_DAY_ED25519_READER",
   "COMPLETE_GITHUB_HISTORY_READ"]);
  expect(out.candidateCount).toBe(1);
  expect(out.githubDispatches).toBe(0);
  expect(out.providerCalls).toBe(0);
  expect(out.databaseWrites).toBe(0);
  expect(out.phase6PaidGo).toBe(false);
  expect(out.completeGHChildRunHistoryConsulted).toBe(true);
  expect(JSON.stringify(out)).not.toContain(path);
  expect(JSON.stringify(out)).not.toContain(digest);
 });
 it("redacts failures and never silently dispatches when GH history missing",async()=>{
  const f=fixture();
  await expect(runP6RealPrivateSourceParentReadOnly(f.env,{
   readSource:async()=>f.scan,
   readDays:async()=>[f.day],
   readHistory:async()=>{throw Error("PRIVATE_SOURCE_SQL_OR_GH_TOKEN_SECRET");}
  })).rejects.toThrow(
   "AUTHENTICATED_PRIVATE_SOURCE_QUEUE_OR_HISTORY_HOLD_REDACTED");
 });
});
