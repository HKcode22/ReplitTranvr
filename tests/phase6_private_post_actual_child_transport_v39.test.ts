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
