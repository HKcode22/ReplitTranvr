import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync} from "node:crypto";
import {readP6T24RegistryRoutingTrust,selectP6T24RoutingCandidates,projectP6T24CompatibilityRoster} from "../server/lib/disruption/phase6CurrentPrivateT24Routing_v39.mjs";
import {loadP6T24CalendarWindows,selectP6LaterCalendarDueDays} from "../server/lib/disruption/phase6LaterCalendarDueDays_v39.mjs";
import {admitP6PrivateT24Enrollment} from "../scripts/v39_phase6_private_t24_restartable_enrollment_v39.ts";
const hash=b=>createHash("sha256").update(b).digest("hex"),h=s=>s.repeat(64),code="a".repeat(40);
const iso=n=>new Date(n).toISOString();
const base=Date.parse("2026-11-22T00:00:00.000Z");
function fixture(){
 const keys=Array.from({length:3},()=>generateKeyPairSync("ed25519"));
 const fp=k=>hash(k.publicKey.export({format:"der",type:"spki"})),pem=k=>k.publicKey.export({format:"pem",type:"spki"}).toString();
 const t={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:"phase6_private_reader_login_ci_native",
  reviewedCodeSha:code,manifestSha256:h("a"),calendarSha256:h("b"),releaseSha256:h("c"),rightsSha256:h("d"),
  dayReviewerFingerprintSha256:fp(keys[0]),dayReviewerPublicKeyPem:pem(keys[0]),queryReviewerFingerprintSha256:fp(keys[1]),queryReviewerPublicKeyPem:pem(keys[1])};
 const days=Array.from({length:31},(_,i)=>{
  const start=base+i*86400000,runDayIndex=i+1;
  return Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex,templates:Array.from({length:12},(_,j)=>{
   const horizon=["T-24h","T-6h","T-90m"][j%3],offset={"T-24h":86400000,"T-6h":21600000,"T-90m":5400000}[horizon];
   return {runDayIndex,horizon,scheduledRequestUtc:iso(start+(horizon==="T-24h"?0:3600000)),earliestPlannedCutoffUtc:iso(start+(horizon==="T-24h"?0:3600000)+1200000),
    serviceWindowEndUtc:iso(start+(horizon==="T-24h"?0:3600000)+3600000+offset)};
  })}));
 });
 const policy={schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,
  approvedCodeSha:code,manifestSha256:t.manifestSha256,calendarSha256:t.calendarSha256,releaseSha256:t.releaseSha256,rightsSha256:t.rightsSha256,
  frameSha256:h("e"),configSha256:h("f"),validFromUtc:iso(base-86400000),validUntilUtc:iso(base+33*86400000),
  dayPlanSha256s:days.map((b,i)=>({runDayIndex:i+1,sha256:hash(b)})),
  nativeLaterReview:{approved:true,privatePublicationApproved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,
   reviewedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107",laterReviewerFingerprintSha256:fp(keys[2]),laterReviewerPublicKeyPem:pem(keys[2]),
   frameSha256:h("e"),configSha256:h("f"),selectedTConfig:{milestone:"departure.scheduledTime.utc",version:"v1",artifactHash:h("1"),verifiedProviderNativeSchedule:true},
   maximumPrivateRetentionHours:23,validFromUtc:iso(base-86400000),validUntilUtc:iso(base+33*86400000)}};
 const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
  GITHUB_SHA:code,GITHUB_RUN_ATTEMPT:"1",P5_CD_GH_PRE_APPROVED_CODE_SHA:code,P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
  P5_CD_GH_PREPARE_CONFIRM:"REGISTER_ONE_ALREADY_BOUND_SOURCE_FLIGHT_NO_PROVIDER",P5_CD_GH_PREPARE_ARMED:"1",P5_CD_GH_PREPARE_PRIVATE_DAY_APPROVED:"1",
  P5_CD_GH_PREPARE_PRIVATE_DAY_CONFIRM:"REGISTER_CURRENT_SIGNED_T24_DAY_NO_PROVIDER",P5_CD_GH_T24_PREPARE_APPROVED:"1",P5_CD_GH_T24_WITNESS_APPROVED:"1",
  P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_STOP:"0",P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",ADB_AUTO_COLLECT:"0",
  V39_P5_MANIFEST_SHA256:t.manifestSha256,V39_P5_RELEASE_SHA256:t.releaseSha256,V39_P5_RIGHTS_SHA256:t.rightsSha256,
  P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify(t)).toString("base64"),
  P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+t.expectedReaderSessionLogin+":ci@ep-test.neon.tech/neondb?sslmode=require",
  P5_V39_PREPARE_DATABASE_URL:"postgresql://phase5_p30_prepare_login_20261107:ci@ep-test-pooler.neon.tech/neondb?sslmode=require"};
 function withPolicy(p=policy){const b=Buffer.from(JSON.stringify(p));return {...env,P6_NONPAID_DAILY_POLICY_BASE64:b.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:hash(b)};}
 return {t,policy,env:withPolicy(),withPolicy,read:path=>days[Number(path.match(/(\d\d)\.json$/)[1])-1]};
}
test("T24 uses exact protected existing native reviewer public key, no private signing key or legacy schedule",()=>{
 const f=fixture(),t=readP6T24RegistryRoutingTrust(f.env);
 assert.equal(t.expectedT24ReviewerFingerprintSha256,f.policy.nativeLaterReview.laterReviewerFingerprintSha256);
 assert.ok(admitP6PrivateT24Enrollment(f.env));
 for(const delta of [{P5_CD_GH_T24_SCHEDULE_ENABLED:"1"},{P5_T24_AUTO_DISPATCH_ENABLED:"true"},{P5_CD_GH_T24_PREPARE_APPROVED:"0"},
  {P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"0"},{P6_PRIVATE_LATER_REVIEWER_KEY_BASE64:"no"},{P5_CD_GH_PRE_STOP:"1"},
  {P6_PRIVATE_READER_DATABASE_URL:f.env.P6_PRIVATE_READER_DATABASE_URL.replace("ep-test.","ep-other.")}])
  assert.throws(()=>admitP6PrivateT24Enrollment({...f.env,...delta}));
 assert.throws(()=>readP6T24RegistryRoutingTrust(f.withPolicy({...f.policy,nativeLaterReview:{...f.policy.nativeLaterReview,laterReviewerPublicKeyPem:f.t.dayReviewerPublicKeyPem}})));
});
test("T24 calendar selects departure-day study at 24-hour earlier request not later horizons; exact pins required",()=>{
 const f=fixture(),t=readP6T24RegistryRoutingTrust(f.env);
 const c=loadP6T24CalendarWindows(f.env,t,f.read);
 assert.deepEqual(selectP6LaterCalendarDueDays(c,iso(base+1000)),{dayIndices:[1],deferredDays:0});
 assert.deepEqual(selectP6LaterCalendarDueDays(c,iso(base+3600001)),{dayIndices:[],deferredDays:0});
 assert.throws(()=>loadP6T24CalendarWindows(f.env,t,()=>Buffer.from("invalid")));
});
const set=(day,minutes)=>({status:"CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO",runDayIndex:day,providerCalls:0,databaseWrites:0,phase6PaidGo:false,
 registryCount:minutes.length,privateRegistries:minutes.map((m,i)=>({review:{registrySha256:hash("shard"+day+":"+i)},reg:{runDayIndex:day,
 entries:[{flightInstanceId:"ci"+day+":"+i,cutoffUtc:iso(base+m*60000)}]}}))});
test("bounded EDF picks no expired T24 and selects only due lookahead for PRE, defers excess",()=>{
 const sets=[set(1,[10,-1,5,30,2,20]),set(2,[3,8])];
 const p=selectP6T24RoutingCandidates(sets,iso(base),"ENROLLMENT");
 assert.deepEqual(p.selectors.map(x=>(x.firstCutoff-base)/60000),[2,3,5,8]);assert.equal(p.deferredShards,3);
 const p2=selectP6T24RoutingCandidates(sets,iso(base),"PRE_EXECUTION");assert.equal(p2.deferredShards,1);
 assert.throws(()=>selectP6T24RoutingCandidates([...sets,sets[0]],iso(base),"ENROLLMENT"));
});
test("singleton compatibility projection detects altered bytes without treating derived hash as independent release",()=>{
 const f=fixture(),t=readP6T24RegistryRoutingTrust(f.env),bytes=Buffer.from("synthetic bytes"),packetSha256=hash(bytes);
 const p={status:"EXACT_PRIVATE_NATIVE_T24_PACKETS_READONLY_NO_GO",providerCalls:0,databaseWrites:0,phase6PaidGo:false,packetCount:1,
 privateFiles:[{filePath:"data-collection/phase5/frozen/t24p_ci_synthetic.json",packetSha256,bytes}]};
 const x=projectP6T24CompatibilityRoster(p,t,packetSha256);
 assert.equal(x.digest,hash(x.raw));assert.equal(x.roster.entries.length,1);
 bytes[0]=0;assert.throws(()=>projectP6T24CompatibilityRoster(p,t,packetSha256));
});
