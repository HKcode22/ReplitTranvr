import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync} from "node:crypto";
import {admitP6PostcommitNativeAudit,redactP6PostcommitNativeAudit,reviewP6PostcommitNativeFeatures} from "../scripts/v39_phase6_stored_source_postcommit_native_audit_v39.mjs";
const hash="a".repeat(64),code="b".repeat(40),reader="phase6_private_reader_login_ci_native";
const key=generateKeyPairSync("ed25519").publicKey;
const pem=key.export({type:"spki",format:"pem"}).toString(),fp=createHash("sha256").update(key.export({type:"spki",format:"der"})).digest("hex");
const sha=b=>createHash("sha256").update(b).digest("hex");
const plan=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:1,reviewedRefreshTiming:{maxPopulationStalenessSeconds:4200}}));
const policy=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,approvedCodeSha:code,
 manifestSha256:hash,calendarSha256:hash,rightsSha256:hash,releaseSha256:hash,providerContractSha256:hash,
 dayPlanSha256s:Array.from({length:31},(_,i)=>({runDayIndex:i+1,sha256:i===0?sha(plan):sha(String(i))}))}));
const env=()=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"123456",GITHUB_SHA:code,V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA:code,
 V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED:"1",P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED:"1",
 P6_PRIVATE_SOURCE_TRANSPORT_INPUT:"stored",V39_P5_CHILD_CONFIRM:"ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET",
 V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",V39_PHASE6_PROCESS_ARMED:"0",ADB_AUTO_COLLECT:"0",
 V39_P5_MANIFEST_SHA256:hash,V39_P5_RELEASE_SHA256:hash,V39_P5_RIGHTS_SHA256:hash,V39_P5_PROVIDER_CONTRACT_SHA256:hash,
 P5_SOURCE_CHILD_EXPECTED_QUERY_DIGEST:hash,P5_SOURCE_BATCH_RUN_DAY_INDEX:"1",P6_PRIVATE_DAY_INDEX_REVISION:"1",P6_PRIVATE_DAY_INDEX_SHA256:hash,
 P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify({
 independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:reader,reviewedCodeSha:code,manifestSha256:hash,calendarSha256:hash,
 releaseSha256:hash,rightsSha256:hash,dayReviewerFingerprintSha256:fp,dayReviewerPublicKeyPem:pem,queryReviewerFingerprintSha256:fp,queryReviewerPublicKeyPem:pem})).toString("base64"),
 P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+reader+":test@ep-a.us-east-2.aws.neon.tech/neondb?sslmode=require",
 V39_P5_SOURCE_DATABASE_URL:"postgresql://phase5_p5_source_login_20261108:test@ep-a-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
 P6_NONPAID_DAILY_POLICY_BASE64:policy.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:sha(policy)
});
test("actual same-child audit requires exact protected study policy and day-plan staleness, no provider",()=>{
 const c=admitP6PostcommitNativeAudit(env(),()=>plan);
 assert.equal(c.policy.maximumPopulationStalenessSeconds,4200);
 assert.equal(c.expectedSourceRunId,"123456");
 for(const d of [{AERODATABOX_API_KEY:"forbidden"},{V39_PHASE6_PROCESS_ARMED:"1"},
  {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},{P6_PRIVATE_SOURCE_TRANSPORT_INPUT:"true"},
  {P6_NONPAID_DAILY_POLICY_SHA256:"c".repeat(64)},{P6_PRIVATE_DAY_INDEX_REVISION:"1025"}])
  assert.throws(()=>admitP6PostcommitNativeAudit({...env(),...d},()=>plan));
 assert.throws(()=>admitP6PostcommitNativeAudit(env(),()=>Buffer.from("drift")));
});
test("aggregate only and actual committed run must match original child; never print private bytes",()=>{
 const c=admitP6PostcommitNativeAudit(env(),()=>plan);
 const a={status:"ACTUAL_COMMITTED_SOURCE_CANDIDATES_AWAIT_INDEPENDENT_PRE_REVIEW",runDayIndex:1,horizon:"T-6h",
 candidateAuditSha256:hash,observedMemberCount:4,candidateCount:2,censoredCount:2,classifications:{},actualDbClockUtc:"2026-11-22T00:00:00.000Z",
 privateAuditBytes:Buffer.from("PRIVATE DO NOT PRINT"),privateSourceScope:{queryDigestSha256:hash,expectedSourceGithubRunId:"123456"},
 providerCalls:0,databaseWrites:0,signedPrePacketsIssued:0,phase6PaidGo:false};
 const out=redactP6PostcommitNativeAudit(a,c);
 assert.equal(out.candidateCount,2);assert.equal(out.providerContentsPrinted,false);
 assert.ok(!JSON.stringify(out).includes("PRIVATE DO NOT PRINT"));
 assert.throws(()=>redactP6PostcommitNativeAudit({...a,privateSourceScope:{...a.privateSourceScope,expectedSourceGithubRunId:"123457"}},c));
});

test("original feature compiler requires scoped approval within existing protected policy, disabled by default",()=>{
 const a=admitP6PostcommitNativeAudit(env(),()=>plan);
 assert.equal(a.nativePreFeatureReview,null);
 const p=JSON.parse(policy.toString("utf8"));
 const feature={approved:true,externalContentUseReviewSha256:"c".repeat(64),rightsSha256:hash};
 const withFeature=v=>{const b=Buffer.from(JSON.stringify({...p,nativePreFeatureReview:v}));return {...env(),
  P6_NONPAID_DAILY_POLICY_BASE64:b.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:sha(b)}};
 assert.deepEqual(admitP6PostcommitNativeAudit(withFeature(feature),()=>plan).nativePreFeatureReview,feature);
 for(const bad of [{...feature,approved:false},{...feature,rightsSha256:"d".repeat(64)},{...feature,externalContentUseReviewSha256:"bad"}])
  assert.throws(()=>admitP6PostcommitNativeAudit(withFeature(bad),()=>plan),/FEATURE_REVIEW_POLICY_OR_RIGHTS_DRIFT/);
});
test("feature readback is not called without approved purpose; mismatched private handoff fails before SQL",async()=>{
 const c=admitP6PostcommitNativeAudit(env(),()=>plan);let connections=0;
 const pool={connect:async()=>{connections++;throw Error("unexpected connection");}};
 assert.equal(await reviewP6PostcommitNativeFeatures(pool,{},null,c),null);
 await assert.rejects(()=>reviewP6PostcommitNativeFeatures(pool,{},null,{...c,nativePreFeatureReview:{approved:true,
  rightsSha256:hash,externalContentUseReviewSha256:"c".repeat(64)}}),/EXACT_FEATURE_REVIEW_HANDOFF_REQUIRED/);
 assert.equal(connections,0);
});
