import {createHash,generateKeyPairSync} from "node:crypto";
import {describe,it,expect} from "vitest";
import {readP6StablePostTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {admitP6PrivatePostChildTransport,bindP6PostPrivateDayRoute,deriveP6PostOriginalLocalEnv} from "../scripts/v39_phase6_private_post_existing_v0083_child_v39";
const h="a".repeat(64),code="b".repeat(40);
function key(){const k=generateKeyPairSync("ed25519").publicKey;return {
 pem:k.export({type:"spki",format:"pem"}).toString(),fp:createHash("sha256").update(k.export({type:"spki",format:"der"})).digest("hex")};}
const d=key(),q=key(),p=key(),login="phase6_private_reader_login_ci_post";
const b64=(v:any)=>Buffer.from(JSON.stringify(v)).toString("base64");
const postPins=(key=p)=>b64({independentPostReviewerPinsApproved:true,postReviewerPublicKeyPem:key.pem,postReviewerFingerprintSha256:key.fp});
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
 P6_PRIVATE_POST_CHILD_MODE:"stored",P6_PRIVATE_POST_CHILD_CONFIRM:"ONE_PRIVATE_POST_ORIGINAL_V0083_MAX_TWO_UNITS",
 P6_PRIVATE_POST_CHILD_APPROVED:"1",P6_PRIVATE_POST_LEGACY_PATH:"PRIVATE_STORED",
 P5_FUTURE_POST_CONFIRM:"ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY",
 V39_P5_POST_OWNER_APPROVED:"1",V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",V39_P5_POST_APPROVED_CODE_SHA:code,AERODATABOX_API_KEY:"offline-ci",
 V39_P5_MANIFEST_SHA256:h,V39_P5_RELEASE_SHA256:h,V39_P5_RIGHTS_SHA256:h,
 V39_P5_POST_SIGNED_PACKET_SHA256:h,
 P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",P6_PRIVATE_POST_STORED_REVIEW_APPROVED:"1",
 P6_PRIVATE_POST_REVIEWER_TRUST_BASE64:postPins(),
 P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:b64({independentStudyTrustPinsApproved:true,
 expectedReaderSessionLogin:login,reviewedCodeSha:code,manifestSha256:h,calendarSha256:h,
 releaseSha256:h,rightsSha256:h,dayReviewerFingerprintSha256:d.fp,dayReviewerPublicKeyPem:d.pem,
 queryReviewerFingerprintSha256:q.fp,queryReviewerPublicKeyPem:q.pem}),
 P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+login+":ci@ep-test.neon.tech/neondb?sslmode=require",
 V39_P5_SOURCE_DATABASE_URL:"postgresql://phase5_p5_source_login_20261108:ci@ep-test.neon.tech/neondb?sslmode=require",
 P6_PRIVATE_POST_DAY:"1",P6_PRIVATE_POST_REVISION:"2",P6_PRIVATE_POST_SHARD:"3",
 P6_PRIVATE_POST_INDEX_SHA:h,P6_PRIVATE_POST_PACKET_SHA:h,P6_PRIVATE_POST_ROUTE_SHA:h
});
describe("stored POST child original release",()=>{
 it("admits exact independent distinct POST trust and protected packet SHA",()=>{
  const e=env();expect(readP6StablePostTrust(e).postReviewerFingerprintSha256).toBe(p.fp);
  expect(admitP6PrivatePostChildTransport(e).selector.packetSha256).toBe(h);
 });
 it.each([{P6_PRIVATE_POST_REVIEWER_TRUST_BASE64:postPins(q)},
  {P6_PRIVATE_POST_REVIEWER_TRUST_BASE64:postPins(d)},
  {V39_PHASE6_PROCESS_ARMED:"0"},{P6_PRIVATE_POST_STORED_REVIEW_APPROVED:"0"},
  {P6_PRIVATE_POST_PACKET_SHA:"c".repeat(64)},{P6_PRIVATE_POST_LEGACY_PATH:"legacy.json"},
  {P6_PRIVATE_POST_CHILD_APPROVED:"0"},{P5_V39_PRE_DATABASE_URL:"forbidden"},
  {P6_PRIVATE_POST_DAY:"32"}])("rejects %j before DB/provider",delta=>{
   expect(()=>admitP6PrivatePostChildTransport({...env(),...delta})).toThrow();
 });
 it("rejects fabricated current index or route scope",()=>{
  const c=admitP6PrivatePostChildTransport(env());
  expect(()=>bindP6PostPrivateDayRoute({redactedSummary:{status:"NO"}},c)).toThrow("UNAUTHENTICATED_CURRENT_SIGNED_DAY");
  const z={status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",runDayIndex:1,
   indexRevision:2,externallySignedDayEpochIndexSha256:h,reviewedEd25519SourceWasOriginalDayBytes:true,
   providerCalls:0,databaseWrites:0,phase6PaidGo:false};
  expect(()=>bindP6PostPrivateDayRoute({redactedSummary:z,privateRoutingCandidates:[],getFrozen:()=>Buffer.alloc(0)},c)).toThrow("EXACT_DUE_POST_ROUTE_MISSING");
 });
});

describe("POST restricted reader endpoint continuity",()=>{
 it("accepts the original source pooler on the same endpoint only",()=>{
  const e=env();
  e.V39_P5_SOURCE_DATABASE_URL=e.V39_P5_SOURCE_DATABASE_URL!.replace("ep-test.neon.tech","ep-test-pooler.neon.tech:5432");
  expect(admitP6PrivatePostChildTransport(e).selector.packetSha256).toBe(h);
  e.V39_P5_SOURCE_DATABASE_URL=e.V39_P5_SOURCE_DATABASE_URL!.replace("ep-test-pooler","ep-other-pooler");
  expect(()=>admitP6PrivatePostChildTransport(e)).toThrow();
 });
});

describe("separate dynamic private POST authority without per-flight secrets",()=>{
 function dynamic(){
  const e=env();
  return {...e,P6_PRIVATE_POST_CHILD_MODE:"stored-current",
   P6_PRIVATE_POST_CHILD_CONFIRM:"ONE_CURRENT_PRIVATE_POST_ORIGINAL_V0083_MAX_TWO_UNITS",
   P6_PRIVATE_POST_DYNAMIC_CHILD_APPROVED:"1",V39_P5_POST_SIGNED_PACKET_SHA256:"",
   V39_P5_POST_REVIEWED_REQUEST_SHA256:"",V39_P5_POST_CONTEXT_SHA256:"",
   V39_P5_POST_CATEGORY_BUDGET_SHA256:h,V39_P5_POST_PROVIDER_CONTRACT_SHA256:h,
   V39_P5_FRAME_HASH:h,V39_P5_POST_PRICE_SHA256:h,
   P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"postgresql://phase5_p5_other_rest_review_login_20261110:ci@ep-test.neon.tech/neondb?sslmode=require",
   P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"postgresql://phase5_p5_other_rest_reserve_login_20261110:ci@ep-test.neon.tech/neondb?sslmode=require"};
 }
 it("independently gated, refuses mixed pin or other endpoint",()=>{
  const e=dynamic();expect(admitP6PrivatePostChildTransport(e).dynamic).toBe(true);
  expect(()=>admitP6PrivatePostChildTransport({...e,P6_PRIVATE_POST_DYNAMIC_CHILD_APPROVED:"0"})).toThrow();
  expect(()=>admitP6PrivatePostChildTransport({...e,V39_P5_POST_SIGNED_PACKET_SHA256:h})).toThrow();
  expect(()=>admitP6PrivatePostChildTransport({...e,P5_V39_OTHER_REST_RESERVE_DATABASE_URL:e.P5_V39_OTHER_REST_RESERVE_DATABASE_URL.replace("ep-test","ep-other")})).toThrow();
 });
 it("derives exact local per-packet pins without modifying environment; original admission still mandatory",()=>{
  const packet:any={schema:"v39.phase5.github-future-post-reviewed-release.v1",approvedCodeSha:code,
   independentSourceContentsUseAndRESTReleaseAttested:true,reviewed:{runDayIndex:1,manifestSha256:h,reviewedSourceRightsSha256:h,
    reviewedCategoryBudgetSha256:h,reviewedProviderContractSha256:h,reviewedProviderPriceSha256:h,reviewedFrameSha256:h,
    requestSha256:"c".repeat(64),reviewedRequestContextSha256:"d".repeat(64)}};
  const raw=Buffer.from(JSON.stringify(packet));
  const digest=createHash("sha256").update(raw).digest("hex");
  const e={...dynamic(),P6_PRIVATE_POST_PACKET_SHA:digest};
  const c=admitP6PrivatePostChildTransport(e);
  const local=deriveP6PostOriginalLocalEnv(e,c,raw,packet);
  expect(local.V39_P5_POST_SIGNED_PACKET_SHA256).toBe(digest);
  expect(local.V39_P5_POST_REVIEWED_REQUEST_SHA256).toBe("c".repeat(64));
  expect(local.V39_P5_POST_CONTEXT_SHA256).toBe("d".repeat(64));
  expect(e.V39_P5_POST_SIGNED_PACKET_SHA256).toBe("");
  expect(()=>deriveP6PostOriginalLocalEnv({...e,V39_P5_POST_PRICE_SHA256:"e".repeat(64)},c,raw,packet)).toThrow();
  expect(()=>deriveP6PostOriginalLocalEnv(e,c,raw,{...packet,reviewed:{...packet.reviewed,requestSha256:h}})).toThrow();
 });
});

describe("signed due POST backlog",()=>{
 it("preserves all authenticated due POST routes privately while preview stays at four",async()=>{
  const {planP6ThirtyOneDaySignedShardHandoffs}=await import("../server/lib/disruption/phase6SignedThirtyOneDayShardHandoff_v39");
  const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
  const bytes=new Map<string,Buffer>();
  const add=(path:string,p:object)=>{const raw=Buffer.from(JSON.stringify(p));bytes.set(path,raw);return sha(raw);};
  const source="data-collection/phase5/frozen/source-test.json";
  const sourceHash=add(source,{schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",manifestSha256:h,runDayIndex:1,
   entries:[{filePath:"data-collection/phase5/frozen/source-query-test.json",expectedPacketSha256:h,expectedQueryDigestSha256:h}]});
  const at="2026-11-22T00:00:00.000Z",end="2026-11-22T00:30:00.000Z";
  const common={runDayIndex:1,publishedAtUtc:"2026-11-21T23:59:00.000Z",notBeforeUtc:at,hardLatestUtc:end,reviewEvidenceSha256:h};
  const entries:any[]=[{...common,lane:"SOURCE",shardIndex:1,filePath:source,fileSha256:sourceHash,
   sourceRegistryFilePath:null,sourceRegistrySha256:null}];
  for(let i=1;i<=6;i++){
   const path="data-collection/phase5/frozen/post_dispatch_"+i+".json";
   const digest=add(path,{schema:"v39.phase5.github-future-post-reviewed-release.v1",approvedCodeSha:code,
    independentSourceContentsUseAndRESTReleaseAttested:true,reviewed:{manifestSha256:h,runDayIndex:1,
     requestSha256:i.toString(16).padStart(64,"0"),independentFuturePostRequestAndRightsReview:true}});
   entries.push({...common,lane:"POST",shardIndex:i,filePath:path,fileSha256:digest,
    sourceRegistryFilePath:source,sourceRegistrySha256:sourceHash});
  }
  const index:any={schema:"v39.phase5.phase6-append-only-day-shard-index.v1",manifestSha256:h,calendarSha256:h,
   reviewedCodeSha:code,reviewedReleaseSha256:h,reviewedRightsSha256:h,revision:1,previousIndexSha256:null,entries};
  const raw=Buffer.from(JSON.stringify(index)),digest=sha(raw);
  const result=planP6ThirtyOneDaySignedShardHandoffs(raw,index,{expectedIndexSha256:digest,
   exactExternallyReviewedIndexSha256:digest,expectedManifestSha256:h,expectedCalendarSha256:h,expectedCodeSha:code,
   expectedReleaseSha256:h,expectedRightsSha256:h,observedDbClockUtc:at},path=>bytes.get(path)!);
  expect(result.privateRoutingCandidates.filter(r=>r.lane==="POST")).toHaveLength(4);
  expect(result.privateAllDuePostRoutingCandidates.map(r=>r.shardIndex)).toEqual([1,2,3,4,5,6]);
  expect(Object.keys(result)).not.toContain("privateAllDuePostRoutingCandidates");
  const last=result.privateAllDuePostRoutingCandidates[5];
  const ctx={...admitP6PrivatePostChildTransport(env()),dynamic:true,
   selector:{runDayIndex:1,indexRevision:1,indexSha256:digest,shardIndex:6,packetSha256:last.signedFrozenSha256,
    routingIntentSha256:last.routingIntentSha256}};
  const handoff={redactedSummary:{status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",
   runDayIndex:1,indexRevision:1,externallySignedDayEpochIndexSha256:digest,
   reviewedEd25519SourceWasOriginalDayBytes:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false},
   privateRoutingCandidates:result.privateRoutingCandidates,getFrozen:(path:string)=>bytes.get(path)!};
  Object.defineProperty(handoff,"privateAllDuePostRoutingCandidates",{value:result.privateAllDuePostRoutingCandidates,enumerable:false});
  expect(bindP6PostPrivateDayRoute(handoff,ctx).route.shardIndex).toBe(6);
  const atClock=(clock:string)=>planP6ThirtyOneDaySignedShardHandoffs(raw,index,{expectedIndexSha256:digest,
   exactExternallyReviewedIndexSha256:digest,expectedManifestSha256:h,expectedCalendarSha256:h,expectedCodeSha:code,
   expectedReleaseSha256:h,expectedRightsSha256:h,observedDbClockUtc:clock},path=>bytes.get(path)!);
  const after=atClock("2026-11-22T00:30:01.000Z");
  expect(after.privateAllDuePostRoutingCandidates).toHaveLength(0);
  expect(after.privateRoutingCandidates.filter(r=>r.lane==="POST")).toHaveLength(0);
  expect(after.privateRecoverablePostRoutingCandidates).toHaveLength(6);
  expect(after.privateRecoverablePostRoutingCandidates[5]).toEqual(last);
  expect(JSON.stringify(after)).not.toContain("privateRecoverablePostRoutingCandidates");
  expect(atClock("2026-11-22T00:40:00.000Z").privateRecoverablePostRoutingCandidates).toHaveLength(0);
  expect(atClock("2026-11-21T23:59:59.000Z").privateRecoverablePostRoutingCandidates).toHaveLength(0);
  const closed={...handoff,privateRoutingCandidates:after.privateRoutingCandidates};
  Object.defineProperty(closed,"privateAllDuePostRoutingCandidates",{value:after.privateAllDuePostRoutingCandidates,enumerable:false});
  Object.defineProperty(closed,"privateRecoverablePostRoutingCandidates",{value:after.privateRecoverablePostRoutingCandidates,enumerable:false});
  expect(()=>bindP6PostPrivateDayRoute(closed,ctx)).toThrow("EXACT_DUE_POST_ROUTE_MISSING");
 });
});


describe("native POST binding is carried into original actual PRE check",()=>{
 it("narrows the bound registry to the original anchor query and rejects another registry/digest",()=>{
  const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
  const sourcePath="data-collection/phase5/frozen/source_synthetic_bound_registry.json",
   request="c".repeat(64),query="d".repeat(64),other="e".repeat(64);
  const source=Buffer.from(JSON.stringify({manifestSha256:h,runDayIndex:1,entries:[{expectedQueryDigestSha256:query},{expectedQueryDigestSha256:other}]}));
  const sourceSha=hash(source),postPath="data-collection/phase5/frozen/post_"+request+".json";
  function bind(delta:Record<string,unknown>={}){
   const post=Buffer.from(JSON.stringify({reviewed:{requestSha256:request},nativePostSourceBinding:{
    schema:"v39.phase6.native-post-source-binding.v1",sourceRegistryPath:sourcePath,sourceRegistrySha256:sourceSha,
    queryDigestSha256:query,policySha256:h,anchorBoundPreRetentionNotAfterUtc:"2027-02-10T14:00:00.000Z",...delta}}));
   const route={lane:"POST",runDayIndex:1,shardIndex:3,routingIntentSha256:h,signedFrozenSha256:hash(post),signedFrozenPath:postPath,
    boundSourceRegistryPath:sourcePath,boundSourceRegistrySha256:sourceSha,hardLatestUtc:"2027-02-10T13:00:00.000Z",
    privateBytesOnlyFromRestrictedReader:true,newPaidDispatchAuthorizedHere:false};
   const handoff={redactedSummary:{status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",runDayIndex:1,
    indexRevision:2,externallySignedDayEpochIndexSha256:h,reviewedEd25519SourceWasOriginalDayBytes:true,providerCalls:0,databaseWrites:0,
    phase6PaidGo:false,observedRealPgClockUtc:"2027-02-10T12:40:00.000Z"},privateRoutingCandidates:[route],
    getFrozen:(p:string)=>p===sourcePath?source:post};
   const ctx={...admitP6PrivatePostChildTransport(env()),selector:{runDayIndex:1,indexRevision:2,indexSha256:h,shardIndex:3,
    packetSha256:hash(post),routingIntentSha256:h}};
   return bindP6PostPrivateDayRoute(handoff,ctx);
  }
  expect(bind().sourceDigests).toEqual([query]);
  expect(()=>bind({queryDigestSha256:"f".repeat(64)})).toThrow("DELEGATED_NATIVE_POST_SOURCE_BINDING_DRIFT");
  expect(()=>bind({sourceRegistrySha256:h})).toThrow("DELEGATED_NATIVE_POST_SOURCE_BINDING_DRIFT");
  expect(()=>bind({anchorBoundPreRetentionNotAfterUtc:"2027-02-10T12:59:00.000Z"})).toThrow("DELEGATED_NATIVE_POST_SOURCE_BINDING_DRIFT");
 });
});

import {admitPhase7ProtectedPostResolver,openPhase7ProtectedPostConsumer,P7_POST_ACTORS} from "../server/lib/disruption/phase7ProtectedPostResolver_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
describe("exact protected research storage POST resolver",()=>{
 const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
 function protectedEnv(){
  const e=env(),outcome=key(),pre=key(),manifest=sha("manifest"),rights=sha("rights");
  e.V39_P5_MANIFEST_SHA256=manifest;e.V39_P5_RIGHTS_SHA256=rights;
  const stable=JSON.parse(Buffer.from(e.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64!,"base64").toString());
  e.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64=b64({...stable,manifestSha256:manifest,rightsSha256:rights});
  const contract={sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:"2027-12-31T00:00:00.000Z"},profile={mappingExpiryHours:24},dispositions=[];
  const review={schema:"v39.phase7.prospective-pre-preservation-review.v1",manifestSha256:manifest,rightsSha256:rights,contractSha256:hashPhase7DurableCandidate(contract),profileSha256:hashPhase7DurableCandidate(profile),dispositionsSha256:hashPhase7DurableCandidate(dispositions),mappingHours:24,researchExpiryUtc:contract.researchExpiryUtc,approvedForPreDurableStorage:true,boundedSameLegLinkApproved:true};
  const reviewSha256=hashPhase7DurableCandidate(review);
  return {...e,P6_PHASE7_POST_STORAGE_APPROVED:"1",P6_PHASE7_PRE_POLICY_BASE64:b64({contract,profile,dispositions,review,reviewSha256}),P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:reviewSha256,P6_PHASE7_POST_CONTRACT_SHA256:review.contractSha256,P6_PHASE7_POST_PROFILE_SHA256:review.profileSha256,P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:sha("post policy"),P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:pre.fp,P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256:outcome.fp,P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(outcome.pem).toString("base64"),...Object.fromEntries(Object.values(P7_POST_ACTORS).map(a=>[a.secret,"postgresql://"+a.role+":fixture@ep-test.neon.tech/neondb?sslmode=verify-full"]))};
 }
 it("matches existing exact role credentials and reuses the PRE dictionary without exposing URL or policy bytes",async()=>{
  const e=protectedEnv(),r=admitPhase7ProtectedPostResolver(e);
  expect(r.providerCalls).toBe(0);expect(JSON.stringify(r)).not.toMatch(/postgresql|fixture|contract/);
  const transport={preflight:async()=>({providerCalls:0 as const,writeAuthority:false as const,independentReviewerAvailable:true as const}),readExactReview:async()=>{throw Error("fixture transport never called")}};
  const x=openPhase7ProtectedPostConsumer(e,transport);expect(x.consumer.policySha256).toBe(e.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256);await x.close();
 });
 it("rejects missing authority, wrong endpoint, broader role, native key alias and an uncommissioned port",()=>{
  const e=protectedEnv();
  for(const delta of [{P6_PHASE7_POST_STORAGE_APPROVED:"0"},{P6_PHASE7_POST_CONTRACT_SHA256:sha("different")},{P6_PHASE7_POST_SCOPED_DATABASE_URL:e.P6_PHASE7_POST_SCOPED_DATABASE_URL.replace("ep-test","ep-other")},{P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL:e.P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL},{P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256:p.fp},{P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64:"forbidden"}])expect(()=>admitPhase7ProtectedPostResolver({...e,...delta})).toThrow();
  expect(()=>openPhase7ProtectedPostConsumer(e,undefined as any)).toThrow("INDEPENDENT_TRANSPORT_UNCOMMISSIONED");
 });
});

import {admitP7StoredPostRecovery,selectP7RecoverablePostRoute,verifyP7OriginalPostRun,readP7OriginalPostRun} from "../server/lib/disruption/phase7StoredPostRecoveryAdmission_v39";
describe("nonpaid recovery of the original signed POST route",()=>{
 const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
 const raw=Buffer.from("{\"synthetic\":\"post packet\"}"),source=Buffer.from("{\"synthetic\":\"source registry\"}");
 const selector={runDayIndex:1,indexRevision:2,indexSha256:h,shardIndex:3,packetSha256:sha(raw),routingIntentSha256:h,originalGithubRunId:"1234567890"};
 const route={lane:"POST" as const,runDayIndex:1,shardIndex:3,signedFrozenPath:"data-collection/phase5/frozen/post_synthetic_scope.json",
  signedFrozenSha256:sha(raw),boundSourceRegistryPath:"data-collection/phase5/frozen/source_synthetic_scope.json",
  boundSourceRegistrySha256:sha(source),notBeforeUtc:"2026-11-22T00:00:00.000Z",hardLatestUtc:"2026-11-22T00:30:00.000Z",
  routingIntentSha256:h,mustUseExistingChildAdmission:"EXISTING_V0083_POST_EXTERNAL_RIGHTS_ORIGINAL_CALLBACK_NO_RETRY",
  independentlyAuthenticatedGHHistoryRequired:true as const,privateBytesOnlyFromRestrictedReader:true as const,newPaidDispatchAuthorizedHere:false as const};
 const clock="2026-11-22T00:31:00.000Z";
 const receipt={status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",runDayIndex:1,indexRevision:2,
  externallySignedDayEpochIndexSha256:h,reviewedEd25519SourceWasOriginalDayBytes:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false,
  observedRealPgClockUtc:clock};
 const originalRun={id:1234567890,repository:{full_name:"HKcode22/ReplitTranvr"},head_repository:{full_name:"HKcode22/ReplitTranvr"},
  path:".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml",head_branch:"main",head_sha:code,
  event:"workflow_dispatch",run_attempt:1,status:"completed",conclusion:"failure",display_title:"P5 POST "+selector.packetSha256,
  created_at:"2026-11-22T00:25:00Z",run_started_at:"2026-11-22T00:26:00Z",updated_at:"2026-11-22T00:30:30Z"};
 function recoveryEnv(){
  return {...env(),AERODATABOX_API_KEY:"",P6_PHASE7_POST_RECOVERY_APPROVED:"1",
   GITHUB_RUN_ID:"1234567891",GITHUB_TOKEN:"synthetic-no-real-token",
   V39_P5_POST_CATEGORY_BUDGET_SHA256:h,V39_P5_POST_PROVIDER_CONTRACT_SHA256:h,V39_P5_FRAME_HASH:h,V39_P5_POST_PRICE_SHA256:h};
 }
 const handoff=(r=receipt,items=[route])=>{
  const x={redactedSummary:r,privateRoutingCandidates:[],getFrozen:(p:string)=>p===route.signedFrozenPath?raw:source};
  return Object.defineProperty(x,"privateRecoverablePostRoutingCandidates",{value:items,enumerable:false});
 };
 it("admits exact no-provider recovery and original role/endpoint, refuses paid capability",()=>{
  const e=recoveryEnv(),a=admitP7StoredPostRecovery(e,selector);
  expect(a.privateSourceUrl).toContain("sslmode=verify-full");
  expect(JSON.stringify(a)).not.toContain("postgresql");
  for(const delta of [{AERODATABOX_API_KEY:"forbidden"},{RAPIDAPI_KEY:"forbidden"},{P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"forbidden"},
   {GITHUB_RUN_ID:selector.originalGithubRunId},{P6_PHASE7_POST_RECOVERY_APPROVED:"0"},{P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64:"forbidden"},
   {V39_P5_SOURCE_DATABASE_URL:e.V39_P5_SOURCE_DATABASE_URL!.replace("ep-test","ep-other")}])
   expect(()=>admitP7StoredPostRecovery({...e,...delta},selector)).toThrow();
 });
 it("selects already closed retained original separately from paid dispatch and refuses future/expired/tampered scope",()=>{
  expect(selectP7RecoverablePostRoute(handoff(),selector)).toEqual(route);
  expect(()=>selectP7RecoverablePostRoute(handoff({...receipt,observedRealPgClockUtc:"2026-11-22T00:40:00.000Z"}),selector)).toThrow("RECOVERY_ROUTE_WINDOW");
  expect(()=>selectP7RecoverablePostRoute(handoff({...receipt,observedRealPgClockUtc:"2026-11-21T23:59:00.000Z"}),selector)).toThrow("RECOVERY_ROUTE_WINDOW");
  expect(()=>selectP7RecoverablePostRoute(handoff(receipt,[route,route]),selector)).toThrow("EXACT_RECOVERY_ROUTE");
  expect(()=>selectP7RecoverablePostRoute(handoff(receipt,[{...route,boundSourceRegistrySha256:h}]),selector)).toThrow("RECOVERY_EXACT_BYTES");
  expect(()=>selectP7RecoverablePostRoute({...handoff(),privateRecoverablePostRoutingCandidates:[route]},selector)).toThrow("AUTHENTICATED_RECOVERY_INDEX");
 });
 it("requires actual terminal first-attempt original run, exact signed packet title and window; GET only",async()=>{
  const e=recoveryEnv();
  expect(verifyP7OriginalPostRun(originalRun,selector,route,code,clock)).toBe(selector.originalGithubRunId);
  for(const delta of [{run_attempt:2},{status:"in_progress"},{display_title:"P5 POST "+h},{head_sha:"c".repeat(40)},
   {created_at:"2026-11-22T00:31:00Z"},{run_started_at:"2026-11-22T00:31:00Z"},{conclusion:"skipped"},{id:1234567891}])
   expect(()=>verifyP7OriginalPostRun({...originalRun,...delta},selector,route,code,clock)).toThrow();
  let calls=0;
  const fetcher=async(u:any,i:any)=>{calls++;expect(u).toBe("https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/"+selector.originalGithubRunId);expect(i.method).toBe("GET");expect(i.redirect).toBe("error");return new Response(JSON.stringify(originalRun),{status:200});};
  expect(await readP7OriginalPostRun(e,selector,route,clock,fetcher as typeof fetch)).toBe(selector.originalGithubRunId);
  expect(calls).toBe(1);
 });
});
