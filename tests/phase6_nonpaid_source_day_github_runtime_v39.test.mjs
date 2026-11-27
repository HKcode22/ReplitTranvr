import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync} from "node:crypto";
import {admitP6NonpaidSourceDayGithub,loadP6ReviewedDayPlans,selectP6NonpaidSourceDay,projectP6ConditionalPolicyCustody,conditionalPreparedRead}
 from "../scripts/v39_phase6_nonpaid_source_day_github_runtime_v39.mjs";
const h=b=>createHash("sha256").update(b).digest("hex"),sha=c=>c.repeat(64),code="f".repeat(40);
const fp=k=>h(k.export({format:"der",type:"spki"}));
const pem=k=>k.export({format:"pem",type:"spki"}).toString();
const priv=k=>Buffer.from(k.export({format:"pem",type:"pkcs8"})).toString("base64");
const now=Date.parse("2030-01-01T00:00:00.000Z"),iso=t=>new Date(t).toISOString();
function fixture(manifest=sha("a"),codeOverride=code){
 const code=codeOverride;
 const q=generateKeyPairSync("ed25519"),r=generateKeyPairSync("ed25519"),d=generateKeyPairSync("ed25519");
 const files=Array.from({length:31},(_,i)=>{
  const day=i+1,first=iso(now+(i+1)*3600000);
  return Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:day,
   expectedServiceStartUtc:iso(now+(i+25)*3600000),
   templates:Array.from({length:12},()=>({runDayIndex:day,scheduledRequestUtc:first,serviceWindowEndUtc:iso(now+(i+26)*3600000)}))}));
 });
 const stable={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:"phase6_private_reader_login_ci_runtime",
  reviewedCodeSha:code,manifestSha256:manifest,calendarSha256:sha("b"),releaseSha256:sha("c"),rightsSha256:sha("d"),
  dayReviewerFingerprintSha256:fp(r.publicKey),dayReviewerPublicKeyPem:pem(r.publicKey),
  queryReviewerFingerprintSha256:fp(q.publicKey),queryReviewerPublicKeyPem:pem(q.publicKey)};
 const pins={approvedCodeSha:code,manifestSha256:stable.manifestSha256,calendarSha256:stable.calendarSha256,
  releaseSha256:stable.releaseSha256,rightsSha256:stable.rightsSha256,configSha256:sha("1"),frameSha256:sha("2"),
  providerContractSha256:sha("3"),reviewedCategoryBudgetSha256:sha("4"),expectedPrepareRole:"phase5_fids_prepare_prod_20261107",
  budgetReleaseMode:"COST_UPPER_BOUND",reviewed31DaySourceRequestGridSha256:null,reviewedCostEnvelopeSha256:sha("5"),
  validFromUtc:iso(now-3600000),validUntilUtc:iso(now+48*3600000)};
 const daily={...pins,schema:"v39.phase6.delegated-daily-source-review-policy.v1",
  delegatedDailyPacketProductionApproved:true,dayPlanSha256s:files.map((b,i)=>({runDayIndex:i+1,sha256:h(b)}))};
 const signing={...pins,schema:"v39.phase6.delegated-source-review-policy.v1",delegatedAutomatedSourceSigningApproved:true,
  queryReviewerFingerprintSha256:fp(q.publicKey),registryReviewerFingerprintSha256:fp(r.publicKey)};
 const bytes=x=>Buffer.from(JSON.stringify(x)),dailyBytes=bytes(daily),signingBytes=bytes(signing);
 const reviewed={schema:"v39.phase6.approved-nonpaid-source-transport-trust.v1",independentTransportAndSigningScopeApproved:true,
  reviewedMainSha:code,dailyPolicySha256:h(dailyBytes),signingPolicySha256:h(signingBytes),
  expectedReaderSessionLogin:stable.expectedReaderSessionLogin,expectedPublisherSessionLogin:"phase6_private_publisher_login_ci_runtime",
  maximumDailyReviewRetentionHours:48,minimumPreparationLeadMinutes:30,maximumPreparationLookaheadMinutes:180,
  dailyReviewerFingerprintSha256:fp(d.publicKey),dailyReviewerPublicKeyPem:pem(d.publicKey)};
 const fakeUrl=login=>"postgresql://"+login+":test-only@ep-test.us-west-2.aws.neon.tech/neondb?sslmode=require";
 const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,P6_NONPAID_SOURCE_APPROVED_MAIN_SHA:code,
  P6_NONPAID_SOURCE_RUNTIME_APPROVED:"1",V39_P5_PREPARE_OWNER_APPROVED:"1",V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",
  P6_NONPAID_SOURCE_SCHEDULE_ENABLED:"true",P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",
  P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:bytes(stable).toString("base64"),
  V39_P5_MANIFEST_SHA256:stable.manifestSha256,V39_P5_CALENDAR_HASH:stable.calendarSha256,
  V39_P5_CONFIG_HASH:pins.configSha256,V39_P5_FRAME_HASH:pins.frameSha256,V39_P5_PROVIDER_CONTRACT_SHA256:pins.providerContractSha256,
  V39_P5_RELEASE_SHA256:stable.releaseSha256,V39_P5_RIGHTS_SHA256:stable.rightsSha256,
  P6_NONPAID_DAILY_POLICY_BASE64:dailyBytes.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:h(dailyBytes),
  P6_NONPAID_SIGNING_POLICY_BASE64:signingBytes.toString("base64"),P6_NONPAID_SIGNING_POLICY_SHA256:h(signingBytes),
  P6_NONPAID_TRANSPORT_TRUST_BASE64:bytes(reviewed).toString("base64"),P6_NONPAID_TRANSPORT_TRUST_SHA256:h(bytes(reviewed)),
  P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64:priv(d.privateKey),P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64:priv(q.privateKey),
  P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64:priv(r.privateKey),
  P5_V39_PREPARE_DATABASE_URL:fakeUrl("phase5_p30_prepare_login_20261107"),
  P6_PRIVATE_READER_DATABASE_URL:fakeUrl(stable.expectedReaderSessionLogin),
  P6_PRIVATE_PUBLISHER_DATABASE_URL:fakeUrl(reviewed.expectedPublisherSessionLogin)};
 const read=path=>files[Number(path.match(/day-(\d+)\.json$/)[1])-1];
 const calendar=files.map((_,i)=>({run_day_index:i+1,scheduled_start_utc:iso(now+(i+25)*3600000),
  calendar_hash:pins.calendarSha256,config_hash:pins.configSha256,frame_hash:pins.frameSha256,draw_n:4}));
 const indexes=files.map((_,i)=>({run_day_index:i+1,claim_n:0,index_n:0}));
 return{env,files,read,calendar,indexes};
}
test("real-main exact protected policy admission and no secret serialization",()=>{
 const f=fixture(),a=admitP6NonpaidSourceDayGithub(f.env);
 assert.equal(a.mode,"schedule");assert.equal(a.phase6PaidGo,false);
 assert(!JSON.stringify(a).includes("test-only"));assert(!JSON.stringify(a).includes("policyBytes"));
 assert.equal(loadP6ReviewedDayPlans(a,f.read).length,31);
 for(const change of [{P6_NONPAID_SOURCE_SCHEDULE_ENABLED:"false"},{GITHUB_REF:"refs/heads/feature"},
  {GITHUB_RUN_ATTEMPT:"2"},{V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},{AERODATABOX_API_KEY:"not-allowed"},
  {V39_P5_SOURCE_DATABASE_URL:"not-allowed"},{P6_NONPAID_DAILY_POLICY_SHA256:sha("9")},
  {P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64:f.env.P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64},
  {P6_PRIVATE_PUBLISHER_DATABASE_URL:f.env.P6_PRIVATE_PUBLISHER_DATABASE_URL.replace("ep-test.","ep-other.")}])
  assert.throws(()=>admitP6NonpaidSourceDayGithub({...f.env,...change}),/HOLD_P6_NONPAID_SOURCE_DAY_GITHUB_/);
 assert.throws(()=>loadP6ReviewedDayPlans(a,()=>Buffer.from("tampered")),/UNPINNED_APPROVAL_BYTES/);
});
test("select earliest actual eligible day, skip missing draw/indexed metadata, refuse incomplete genesis",()=>{
 const f=fixture(),ctx=admitP6NonpaidSourceDayGithub(f.env),plans=loadP6ReviewedDayPlans(ctx,f.read);
 const run=()=>selectP6NonpaidSourceDay(ctx,plans,f.calendar,f.indexes,iso(now));
 assert.equal(run().selected.runDayIndex,1);
 assert.equal(run().eligibleDayCount,3);
 f.calendar[0].draw_n=3;assert.equal(run().selected.runDayIndex,2);assert.equal(run().missingDraw,1);
 f.indexes[1].claim_n=1;f.indexes[1].index_n=1;assert.equal(run().selected.runDayIndex,3);
 assert.equal(run().alreadyIndexed,1);
 f.indexes[2].claim_n=1;assert.throws(run,/INCOMPLETE_FUTURE_INDEX_GENESIS_NO_REPLAY/);
});
test("manual day exactly bounded; does not implicitly enable recurring schedule",()=>{
 const f=fixture(),ctx=admitP6NonpaidSourceDayGithub({...f.env,GITHUB_EVENT_NAME:"workflow_dispatch",
  P6_NONPAID_SOURCE_SCHEDULE_ENABLED:"false",P6_NONPAID_SOURCE_REQUESTED_DAY:"2",
  P6_NONPAID_SOURCE_CONFIRM:"ONE_APPROVED_PROSPECTIVE_SOURCE_DAY_NONPAID_PREPARE_PUBLISH"});
 const plans=loadP6ReviewedDayPlans(ctx,f.read);
 assert.equal(selectP6NonpaidSourceDay(ctx,plans,f.calendar,f.indexes,iso(now)).selected.runDayIndex,2);
 assert.throws(()=>admitP6NonpaidSourceDayGithub({...f.env,P6_NONPAID_SOURCE_REQUESTED_DAY:"2"}),/NO_EXACT_MANUAL_OR_SCHEDULE_APPROVAL/);
});

test("current SOURCE handoff uses exact prospective calendar, not a caller-selected day",()=>{
 const f=fixture(),e={...f.env,GITHUB_EVENT_NAME:"workflow_dispatch",
  P6_NONPAID_SOURCE_CONFIRM:"PREPARE_PUBLISH_NEXT_DUE_SIGNED_SOURCE_DAY_NO_PROVIDER"};
 const a=admitP6NonpaidSourceDayGithub(e),b=admitP6NonpaidSourceDayGithub(f.env);
 assert.equal(a.mode,"current_dispatch");assert.equal(a.requestedDay,null);
 assert.equal(a.phase6PaidGo,false);
 assert.deepEqual(selectP6NonpaidSourceDay(a,loadP6ReviewedDayPlans(a,f.read),f.calendar,f.indexes,iso(now)),
  selectP6NonpaidSourceDay(b,loadP6ReviewedDayPlans(b,f.read),f.calendar,f.indexes,iso(now)));
 for(const delta of [{P6_NONPAID_SOURCE_REQUESTED_DAY:"2"},{P6_NONPAID_SOURCE_SCHEDULE_ENABLED:"false"},
  {P6_NONPAID_SOURCE_CONFIRM:"invalid"},{GITHUB_EVENT_NAME:"schedule"},{V39_PHASE5_FREEZE_SIGNED:"0"},
  {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},{V39_PHASE6_PROCESS_ARMED:"1"},{AERODATABOX_API_KEY:"forbidden"}])
  assert.throws(()=>admitP6NonpaidSourceDayGithub({...e,...delta}),/HOLD_P6_NONPAID_SOURCE_DAY_GITHUB_/);
});

test("deadline metadata distinguishes already published, missed and partial past genesis from future missing draw",()=>{
 const f=fixture(),ctx=admitP6NonpaidSourceDayGithub(f.env),plans=loadP6ReviewedDayPlans(ctx,f.read);
 const at=iso(now+2*3600000+45*60000);
 // Day 1 successfully indexed; day 2 missed with no genesis; day 3
 // passed its preparation lead with partial genesis; day 4 at risk.
 f.indexes[0].claim_n=1;f.indexes[0].index_n=1;
 f.indexes[2].claim_n=1;f.calendar[3].draw_n=0;
 const r=selectP6NonpaidSourceDay(ctx,plans,f.calendar,f.indexes,at);
 assert.deepEqual(r.missedUnpublishedDays.map(x=>x.runDayIndex),[2]);
 assert.deepEqual(r.pastIncompleteGenesisDays.map(x=>x.runDayIndex),[3]);
 assert.deepEqual(r.atRiskMissingDrawDays.map(x=>x.runDayIndex),[4]);
 assert.equal(r.selected.runDayIndex,5);
 assert.equal(r.tooLate,1);
 assert.equal(r.missedUnpublishedDays[0].preparationDeadlineUtc,iso(now+90*60000));
});
test("exact minimum remains eligible; a completed past index is not a missed day",()=>{
 const f=fixture(),ctx=admitP6NonpaidSourceDayGithub(f.env),plans=loadP6ReviewedDayPlans(ctx,f.read);
 const a=selectP6NonpaidSourceDay(ctx,plans,f.calendar,f.indexes,iso(now+30*60000));
 assert.equal(a.selected.runDayIndex,1);
 assert.equal(a.missedUnpublishedDays.length,0);
 f.indexes[0].claim_n=1;f.indexes[0].index_n=1;
 const b=selectP6NonpaidSourceDay(ctx,plans,f.calendar,f.indexes,iso(now+60*60000+1));
 assert.equal(b.missedUnpublishedDays.length,0);
 assert.equal(b.tooLate,0);
});

test("Day1 recovery is explicit manual Day1 only, with the existing isolated draw role and exact live manifest",()=>{
 const f=fixture("a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e");
 const e={...f.env,GITHUB_EVENT_NAME:"workflow_dispatch",P6_NONPAID_SOURCE_REQUESTED_DAY:"1",
  P6_NONPAID_SOURCE_CONFIRM:"RECOVER_EXACT_DAY1_T6_T90_NO_PROVIDER",V39_P5_EARLY_DRAW_EFFECTIVE_ROLE:"phase5_early_draw_prod20261115",
  V39_P5_EARLY_DRAW_DATABASE_URL:"postgresql://phase5_early_draw_prod20261115:test-only@ep-test.us-west-2.aws.neon.tech/neondb?sslmode=require"};
 const x=admitP6NonpaidSourceDayGithub(e);
 assert.equal(x.mode,"day1_recovery");assert.equal(x.requestedDay,1);assert.equal(x.phase6PaidGo,false);
 assert(!JSON.stringify(x).includes("test-only"));
 for(const delta of [{GITHUB_EVENT_NAME:"schedule"},{P6_NONPAID_SOURCE_REQUESTED_DAY:"2"},
  {V39_P5_EARLY_DRAW_EFFECTIVE_ROLE:"phase5_early_draw_other20261115"},{V39_P5_EARLY_DRAW_DATABASE_URL:""},
  {AERODATABOX_API_KEY:"no"},{V39_PHASE6_PROCESS_ARMED:"1"}])
  assert.throws(()=>admitP6NonpaidSourceDayGithub({...e,...delta}),/HOLD_P6_NONPAID_SOURCE_DAY_GITHUB_/);
 const other=fixture();
 assert.throws(()=>admitP6NonpaidSourceDayGithub({...other.env,GITHUB_EVENT_NAME:"workflow_dispatch",
  P6_NONPAID_SOURCE_REQUESTED_DAY:"1",P6_NONPAID_SOURCE_CONFIRM:e.P6_NONPAID_SOURCE_CONFIRM,
  V39_P5_EARLY_DRAW_EFFECTIVE_ROLE:e.V39_P5_EARLY_DRAW_EFFECTIVE_ROLE,V39_P5_EARLY_DRAW_DATABASE_URL:e.V39_P5_EARLY_DRAW_DATABASE_URL}),/EXACT_EXISTING_DAY1_RECOVERY_ROLE_AND_MANIFEST/);
});

test("approved executable successor preserves all 31 old linked policy digests and signer identities",()=>{
 const old="9c9cddb1aaeb04934d94af2937ee158e6d991f6c",head="7".repeat(40),f=fixture(sha("a"),old);
 const prior=admitP6NonpaidSourceDayGithub(f.env);
 const next=admitP6NonpaidSourceDayGithub({...f.env,GITHUB_SHA:head,P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:head});
 assert.equal(next.mainSha,head);assert.equal(next.trust.reviewedCodeSha,old);
 assert.deepEqual(next.policyBytes,prior.policyBytes);assert.deepEqual(next.signingPolicyBytes,prior.signingPolicyBytes);
 assert.deepEqual(loadP6ReviewedDayPlans(next,f.read),loadP6ReviewedDayPlans(prior,f.read));
 assert.throws(()=>admitP6NonpaidSourceDayGithub({...f.env,GITHUB_SHA:head}),/HOLD_P6_NONPAID_SOURCE_DAY_GITHUB_/);
});

test("T055 reports nearest future preparation opening/deadline and exact draw/genesis state without changing eligibility",()=>{
 const f=fixture(),ctx=admitP6NonpaidSourceDayGithub(f.env),plans=loadP6ReviewedDayPlans(ctx,f.read);
 const at=iso(now);
 f.indexes[0].claim_n=1;f.indexes[0].index_n=1;
 const p=plans.filter(x=>Date.parse(x.firstRequestUtc)>now+ctx.reviewed.maximumPreparationLookaheadMinutes*60000)[0];
 assert(p);
 f.indexes[p.runDayIndex-1].claim_n=1;
 const a=selectP6NonpaidSourceDay(ctx,plans,f.calendar,f.indexes,at);
 assert.equal(a.nextFuturePreparation.runDayIndex,p.runDayIndex);
 assert.equal(a.nextFuturePreparation.genesisState,"PARTIAL_REQUIRES_REVIEW");
 assert.equal(a.nextFuturePreparation.drawCount,f.calendar[p.runDayIndex-1].draw_n);
 assert.equal(a.nextFuturePreparation.preparationOpensUtc,iso(Date.parse(p.firstRequestUtc)-ctx.reviewed.maximumPreparationLookaheadMinutes*60000));
 assert.equal(a.nextFuturePreparation.preparationDeadlineUtc,iso(Date.parse(p.firstRequestUtc)-ctx.reviewed.minimumPreparationLeadMinutes*60000));
 assert(a.futureOutsideLookaheadCount>0);
 assert.equal(a.missedUnpublishedDays.length,0);
 assert.equal(a.selected.runDayIndex,2);
});

test("T102 protected future conditional custody is explicit owner-only, no publication or secret serialization",()=>{
 const f=fixture(),e={...f.env,GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_ACTOR:"HKcode22",
  P6_NONPAID_SOURCE_CONFIRM:"VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER",P6_NONPAID_SOURCE_REQUESTED_DAY:"5"};
 const ctx=admitP6NonpaidSourceDayGithub(e),plans=loadP6ReviewedDayPlans(ctx,f.read);
 assert.equal(ctx.mode,"conditional_custody");assert.equal(ctx.requestedDay,5);
 const r=projectP6ConditionalPolicyCustody(ctx,plans,f.calendar,f.indexes,iso(now),0,e);
 assert.equal(r.status,"P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY");
 assert.equal(r.prospective.runDayIndex,5);assert.equal(r.prospective.preparedQueryCount,0);
 assert.equal(r.exactThreePolicyDigestsValidated,true);assert.equal(r.exact31PlanPinsValidated,true);
 assert.equal(r.conditionalPolicyFieldState,"ABSENT");assert.equal(r.nativePolicyPresent,false);
 assert.equal(r.publicActorsVerified,false);assert.equal(r.providerCalls,0);assert.equal(r.databaseWrites,0);assert.equal(r.signaturesIssued,0);
 assert(!JSON.stringify(r).includes("test-only"));assert(!JSON.stringify(r).includes(f.env.P6_NONPAID_DAILY_POLICY_SHA256));
 for(const delta of [{GITHUB_ACTOR:"other"},{P6_NONPAID_SOURCE_REQUESTED_DAY:"4"},{GITHUB_EVENT_NAME:"schedule"},
  {GITHUB_RUN_ATTEMPT:"2"},{AERODATABOX_API_KEY:"forbidden"}])
  assert.throws(()=>admitP6NonpaidSourceDayGithub({...e,...delta}),/HOLD_P6_NONPAID_SOURCE_DAY_GITHUB_/);
 assert.throws(()=>projectP6ConditionalPolicyCustody(ctx,plans,f.calendar,f.indexes,iso(now),1,e),/CONDITIONAL_CUSTODY_NOT_UNSIGNED/);
 assert.throws(()=>projectP6ConditionalPolicyCustody(ctx,plans,f.calendar,f.indexes,iso(now+2*3600000),0,e),/CONDITIONAL_CUSTODY_NOT_UNSIGNED/);
 f.indexes[4].claim_n=1;
 assert.throws(()=>projectP6ConditionalPolicyCustody(ctx,plans,f.calendar,f.indexes,iso(now),0,e),/CONDITIONAL_CUSTODY_NOT_UNSIGNED/);
});

test("T103 conditional custody refuses uncertain transaction cleanup and discards the client",async()=>{
 const ctx={trust:{manifestSha256:sha("a")},requestedDay:5};
 function fake(failAt=[]){
  const statements=[],releases=[];
  const client={async query(sql,args){
   const step=sql.startsWith("BEGIN")?"begin":sql.startsWith("SET LOCAL")?"timeout":sql.startsWith("SELECT")?"read":sql==="ROLLBACK"?"rollback":"unexpected";
   statements.push(step);
   if(failAt.includes(step))throw Error("injected "+step);
   if(step==="read"){
    assert.deepEqual(args,[ctx.trust.manifestSha256,ctx.requestedDay]);
    return {rowCount:1,rows:[{prepared:0,observed:iso(now),ro:"on"}]};
   }
  },release(destroy){releases.push(destroy===true?"discard":"reuse");}};
  return {pool:{async connect(){return client;}},statements,releases};
 }
 let x=fake();
 assert.deepEqual(await conditionalPreparedRead(x.pool,ctx),{count:0,clock:iso(now)});
 assert.deepEqual(x.statements,["begin","timeout","read","rollback"]);assert.deepEqual(x.releases,["reuse"]);
 x=fake(["rollback"]);
 await assert.rejects(conditionalPreparedRead(x.pool,ctx),/CONDITIONAL_CUSTODY_ROLLBACK_UNVERIFIED/);
 assert.deepEqual(x.statements,["begin","timeout","read","rollback"]);assert.deepEqual(x.releases,["discard"]);
 x=fake(["begin"]);
 await assert.rejects(conditionalPreparedRead(x.pool,ctx),/injected begin/);
 assert.deepEqual(x.statements,["begin"]);assert.deepEqual(x.releases,["discard"]);
 for(const step of ["timeout","read"]){
  x=fake([step]);
  await assert.rejects(conditionalPreparedRead(x.pool,ctx),new RegExp("injected "+step));
  assert.equal(x.statements.at(-1),"rollback");assert.deepEqual(x.releases,["reuse"]);
  x=fake([step,"rollback"]);
  await assert.rejects(conditionalPreparedRead(x.pool,ctx),/CONDITIONAL_CUSTODY_ROLLBACK_UNVERIFIED/);
  assert.equal(x.statements.at(-1),"rollback");assert.deepEqual(x.releases,["discard"]);
 }
});

test("T104 custody cannot skip an earlier unsigned prospective conditional day",()=>{
 const f=fixture(),e={...f.env,GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_ACTOR:"HKcode22",
  P6_NONPAID_SOURCE_CONFIRM:"VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER",P6_NONPAID_SOURCE_REQUESTED_DAY:"6"};
 const ctx=admitP6NonpaidSourceDayGithub(e),plans=loadP6ReviewedDayPlans(ctx,f.read);
 const run=()=>projectP6ConditionalPolicyCustody(ctx,plans,f.calendar,f.indexes,iso(now),0,e);
 assert.throws(run,/CONDITIONAL_CUSTODY_EARLIER_UNSIGNED_PROSPECTIVE_DAY/);
 f.indexes[4].claim_n=1;
 assert.throws(run,/CONDITIONAL_CUSTODY_EARLIER_UNSIGNED_PROSPECTIVE_DAY/);
 f.indexes[4].index_n=1;
 assert.equal(run().prospective.runDayIndex,6);
 // Published earlier day is allowed; actual earlier calendar drift is not.
 f.calendar[4].config_hash=sha("9");
 assert.throws(run,/ACTUAL_DAY_PLAN_OR_INDEX_STATE_DRIFT/);
 f.calendar[4].config_hash=ctx.p.configSha256;
 assert.equal(run().prospective.runDayIndex,6);
});
test("T105 custody accounts for the nested day-append conditional scope",()=>{
 const f=fixture(),e={...f.env,GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_ACTOR:"HKcode22",
  P6_NONPAID_SOURCE_CONFIRM:"VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER",P6_NONPAID_SOURCE_REQUESTED_DAY:"5"};
 const ctx=admitP6NonpaidSourceDayGithub(e),plans=loadP6ReviewedDayPlans(ctx,f.read);
 const marker={};
 const p={...ctx.p,nativeLaterReview:{dayAppendPolicy:{conditionalLaterPreScope:marker}}};
 const custom={mode:ctx.mode,requestedDay:ctx.requestedDay,p,q:ctx.q,reviewed:ctx.reviewed,trust:ctx.trust,policyBytes:ctx.policyBytes};
 const run=()=>projectP6ConditionalPolicyCustody(custom,plans,f.calendar,f.indexes,iso(now),0,e);
 assert.equal(run().conditionalPolicyFieldState,"PARTIAL_HOLD");
 delete p.nativeLaterReview.dayAppendPolicy.conditionalLaterPreScope;
 assert.equal(run().conditionalPolicyFieldState,"ABSENT");
 Object.assign(p,{conditionalPreFeatureReview:marker,conditionalT24PermitReview:marker,conditionalLaterPermitReview:marker});
 Object.assign(custom.q={...ctx.q},{conditionalServicePolicy:marker});
 Object.assign(p.nativeLaterReview,{conditionalT24Scope:marker,conditionalLaterDayAppendPolicy:marker,nativeT24PolicyTransition:marker});
 assert.equal(run().conditionalPolicyFieldState,"PARTIAL_HOLD");
 p.nativeLaterReview.conditionalLaterDayAppendPolicy={conditionalLaterPreScope:marker};
 const all=run();assert.equal(all.conditionalPolicyFieldState,"ALL_FIELDS_PRESENT_NOT_COMMISSIONED_PROOF");
 assert.equal(all.actualConditionalPolicyInstalledVerified,false);
 p.nativeLaterReview.dayAppendPolicy.conditionalLaterPreScope=marker;
 assert.equal(run().conditionalPolicyFieldState,"PARTIAL_HOLD");
});

test("T109 custody native readiness requires rights-bound actual feature review, not approved flag alone",()=>{
 const f=fixture(),e={...f.env,GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_ACTOR:"HKcode22",
  P6_NONPAID_SOURCE_CONFIRM:"VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER",P6_NONPAID_SOURCE_REQUESTED_DAY:"5"};
 const ctx=admitP6NonpaidSourceDayGithub(e),plans=loadP6ReviewedDayPlans(ctx,f.read);
 const v={approved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,
  validFromUtc:ctx.p.validFromUtc,validUntilUtc:ctx.p.validUntilUtc,
  dayAppendPolicy:{delegatedAutomatedLaterDayAppendApproved:true,validFromUtc:ctx.p.validFromUtc,validUntilUtc:ctx.p.validUntilUtc}};
 const run=feature=>projectP6ConditionalPolicyCustody({mode:ctx.mode,requestedDay:5,p:{...ctx.p,nativeLaterReview:v,nativePreFeatureReview:feature},
  q:ctx.q,reviewed:ctx.reviewed,trust:ctx.trust,policyBytes:ctx.policyBytes},plans,f.calendar,f.indexes,iso(now),0,e);
 for(const feature of [undefined,{approved:true},{approved:true,rightsSha256:sha("0"),externalContentUseReviewSha256:sha("e")},
  {approved:true,rightsSha256:ctx.trust.rightsSha256,externalContentUseReviewSha256:"bad"}]){
  assert.equal(run(feature).nativePolicyPresent,false);assert.equal(run(feature).baseIntervalCoversRemainingStudy,false);
 }
 const good=run({approved:true,rightsSha256:ctx.trust.rightsSha256,externalContentUseReviewSha256:sha("e")});
 assert.equal(good.nativePolicyPresent,true);
 assert.equal(good.actualConditionalPolicyInstalledVerified,false);
});
