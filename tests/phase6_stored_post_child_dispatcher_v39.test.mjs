import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync} from "node:crypto";
import {chooseP6PostRoutes,selectP6PostDays,proveP6NoUncertainPostParent,admitP6StoredPostParent,runP6StoredPostParent,loadP6PostWindows} from "../scripts/v39_phase6_stored_post_child_dispatcher_v39.mjs";
const clock="2026-11-22T00:00:00.000Z";
const digest=i=>i.toString(16).padStart(64,"0");
const route=i=>({lane:"POST",runDayIndex:1,shardIndex:i,signedFrozenSha256:digest(i),notBeforeUtc:clock,hardLatestUtc:"2026-11-22T00:20:00.000Z"});
const run=(i,status="completed")=>({id:i,display_title:"P5 POST "+digest(i),status,conclusion:status==="completed"?"success":null,created_at:clock});
test("skip previously submitted first four and use next due routes; preserve global cap",()=>{
 const history={total_count:6,workflow_runs:[run(1),run(2),run(3),run(4),run(10,"in_progress"),run(11,"queued")]};
 const z=chooseP6PostRoutes(Array.from({length:9},(_,i)=>route(i+1)),history,clock);
 assert.equal(z.capacity,4);assert.equal(z.active,2);assert.deepEqual(z.pending.map(r=>r.shardIndex),[5,6,7,8,9]);
 assert.throws(()=>chooseP6PostRoutes([route(1),route(1)],history,clock),/DUPLICATE/);
 assert.throws(()=>chooseP6PostRoutes([route(9)],{total_count:1,workflow_runs:[{...run(1),display_title:"P5 POST old/path"}]},clock),/LEGACY/);
});
test("bounded outcome day selection; no implicit expired tail",()=>{
 const n=Date.parse(clock);
 const windows={from:n-1000,until:n+1000,days:[{day:1,start:n-100,end:n},{day:2,start:n,end:n+100},{day:3,start:n+1,end:n+100}]};
 assert.deepEqual(selectP6PostDays(windows,clock).map(x=>x.day),[2]);
 assert.throws(()=>selectP6PostDays({...windows,days:Array.from({length:5},(_,i)=>({day:i+1,start:n-10,end:n+10}))},clock),/FOUR/);
});
test("uncertain prior POST parent step blocks another paid dispatch",async()=>{
 const history={total_count:2,workflow_runs:[run(1),run(2)]};
 const reply=conclusion=>async()=>new Response(JSON.stringify({total_count:1,jobs:[{name:"separately-authorized-current-private-post-children",status:"completed",
 conclusion:"failure",steps:[{name:"Dispatch current private POST exact children",conclusion}]}]}),{status:200});
 await assert.rejects(proveP6NoUncertainPostParent(history,2,reply("failure"),{}),/UNKNOWN_PREVIOUS/);
 await proveP6NoUncertainPostParent(history,2,reply("success"),{});
 await assert.rejects(proveP6NoUncertainPostParent(history,3,reply("success"),{}),/NOT_VISIBLE/);
});
test("missing release never accesses provider or database",()=>assert.throws(()=>admitP6StoredPostParent({}),/NO_SEPARATE/));

const sha=b=>createHash("sha256").update(b).digest("hex"),b64=x=>Buffer.from(JSON.stringify(x)).toString("base64");
function key(){const k=generateKeyPairSync("ed25519").publicKey;return {pem:k.export({type:"spki",format:"pem"}).toString(),fp:sha(k.export({type:"spki",format:"der"}))};}
function fixture(){
 const d=key(),q=key(),p=key(),h=digest(100),code="b".repeat(40),login="phase6_private_reader_login_ci_post";
 const plans=new Map(),dayPlanSha256s=[];
 for(let i=1;i<=31;i++){
  const start=new Date(Date.parse(clock)+(i-1)*86400000).toISOString(),end=new Date(Date.parse(start)+4*3600000).toISOString();
  const raw=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:i,expectedServiceStartUtc:start,
    templates:Array.from({length:12},(_,j)=>({runDayIndex:i,horizon:["T-24h","T-6h","T-90m"][Math.floor(j/4)],serviceWindowStartUtc:start,serviceWindowEndUtc:end}))}));
  plans.set("data-collection/phase5/planning/phase6-source-day-"+String(i).padStart(2,"0")+".json",raw);
  dayPlanSha256s.push({runDayIndex:i,sha256:sha(raw)});
 }
 const policy=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,
  approvedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h,providerContractSha256:h,
  validFromUtc:"2026-11-21T00:00:00.000Z",validUntilUtc:"2026-12-26T00:00:00.000Z",dayPlanSha256s}));
 const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",
  GITHUB_SHA:code,GITHUB_RUN_ID:"123456",V39_P5_POST_APPROVED_CODE_SHA:code,P6_PRIVATE_POST_PARENT_ENABLED:"true",P5_POST_AUTO_DISPATCH_ENABLED:"false",
  ADB_AUTO_COLLECT:"0",P6_PRIVATE_POST_OUTCOME_TAIL_HOURS:"48",V39_P5_POST_OWNER_APPROVED:"1",V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",V39_PHASE6_PROCESS_ARMED:"1",P6_PRIVATE_POST_STORED_REVIEW_APPROVED:"1",
  P6_PRIVATE_POST_CHILD_APPROVED:"1",P6_PRIVATE_POST_DYNAMIC_CHILD_APPROVED:"1",P6_PRIVATE_POST_PARENT_APPROVED:"1",V39_P5_SEVEN_REST_BUDGET_SIGNED:"1",
  P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED:"1",V39_P5_MANIFEST_SHA256:h,V39_P5_RELEASE_SHA256:h,V39_P5_RIGHTS_SHA256:h,
  V39_P5_POST_CATEGORY_BUDGET_SHA256:h,V39_P5_POST_PROVIDER_CONTRACT_SHA256:h,V39_P5_POST_PRICE_SHA256:h,V39_P5_FRAME_HASH:h,
  P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:b64({independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:login,
   reviewedCodeSha:code,manifestSha256:h,calendarSha256:h,releaseSha256:h,rightsSha256:h,dayReviewerFingerprintSha256:d.fp,
   dayReviewerPublicKeyPem:d.pem,queryReviewerFingerprintSha256:q.fp,queryReviewerPublicKeyPem:q.pem}),
  P6_PRIVATE_POST_REVIEWER_TRUST_BASE64:b64({independentPostReviewerPinsApproved:true,postReviewerFingerprintSha256:p.fp,postReviewerPublicKeyPem:p.pem}),
  P6_PRIVATE_READER_DATABASE_URL:"postgresql://"+login+":ci@ep-a.neon.tech/neondb?sslmode=require",
  V39_P5_SOURCE_DATABASE_URL:"postgresql://phase5_p5_source_login_20261108:ci@ep-a-pooler.neon.tech/neondb?sslmode=require",
  P6_NONPAID_DAILY_POLICY_BASE64:policy.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:sha(policy),GITHUB_TOKEN:"offline-only-test-no-network-token"};
 const readPlan=x=>plans.get(x);
 const routes=Array.from({length:9},(_,i)=>({...route(i+1),routingIntentSha256:digest(i+200)}));
 const observe=async()=>({clock,routes,byDay:new Map(),unavailable:0});
 const verify=async(_e,_t,r)=>r.shardIndex===5?null:{clock,inputs:{frozen_future_post_packet:"PRIVATE_STORED",private_transport:"stored-current",
  private_confirm:"ONE_CURRENT_PRIVATE_POST_ORIGINAL_V0083_MAX_TWO_UNITS",confirm:"ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY",
  run_day:"1",index_revision:"1",index_sha256:h,shard_index:String(r.shardIndex),post_packet_sha256:r.signedFrozenSha256,route_sha256:r.routingIntentSha256}};
 const posts=[];
 const fetchImpl=async(url,init)=>{
  if(init.method==="POST"){
   const b=JSON.parse(init.body);posts.push(b);
   const id=100000+posts.length;
   return new Response(JSON.stringify({workflow_run_id:id,run_url:"https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/"+id,
    html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/"+id}),{status:200});
  }
  const runs=url.includes("queue-main-scheduled")?[{...run(123456,"in_progress"),display_title:"parent"}]:[run(1),run(2),run(3),run(4)];
  return new Response(JSON.stringify({total_count:runs.length,workflow_runs:runs}),{status:200});
 };
 return {env,posts,options:{readPlan,observe,verify,fetchImpl,now:()=>Date.parse(clock)}};
}
test("full mocked parent: exact stable policy, skip submitted and missing PRE, four acknowledged opaque child inputs",async()=>{
 const {env,posts,options}=fixture();
 const trust=admitP6StoredPostParent(env);
 assert.equal(loadP6PostWindows(env,trust,options.readPlan).days.length,31);
 const r=await runP6StoredPostParent(env,options);
 assert.equal(r.acknowledgedGithubChildCount,4);assert.equal(r.unavailablePreOrLate,1);
 assert.deepEqual(posts.map(p=>p.inputs.shard_index),["6","7","8","9"]);
 assert.ok(posts.every(p=>p.inputs.frozen_future_post_packet==="PRIVATE_STORED"&&p.return_run_details===true));
 assert.equal(r.providerCallsByParent,0);
});
test("preflight failure does not issue any dispatch or create a perpetual ambiguous parent quarantine",async()=>{
 const {env,posts,options}=fixture();
 const r=await runP6StoredPostParent(env,{...options,verify:async()=>{throw Error("private SQL text");}});
 assert.equal(r.status,"HOLD_POST_PREFLIGHT_NO_DISPATCH");assert.equal(posts.length,0);
 assert.ok(!JSON.stringify(r).includes("private SQL text"));
});
test("uncertain dispatch acknowledgement fails, no second POST or automatic replay",async()=>{
 const {env,options}=fixture();let sent=0;
 await assert.rejects(runP6StoredPostParent(env,{...options,fetchImpl:async(url,init)=>{
  if(init.method==="POST"){sent++;return new Response("",{status:503});}return options.fetchImpl(url,init);
 }}),/UNKNOWN_DISPATCH_POST_NO_REPLAY/);
 assert.equal(sent,1);
});
test("preflight rejects unexpected provider role, URL drift, absent explicit tail and altered plan",()=>{
 const {env,options}=fixture();
 for(const d of [{AERODATABOX_API_KEY:"forbidden"},{P5_POST_AUTO_DISPATCH_ENABLED:"true"},
  {P6_PRIVATE_POST_OUTCOME_TAIL_HOURS:"72"},{V39_P5_SOURCE_DATABASE_URL:env.V39_P5_SOURCE_DATABASE_URL.replace("ep-a","ep-b")}])
  assert.throws(()=>admitP6StoredPostParent({...env,...d}));
 const trust=admitP6StoredPostParent(env);
 assert.throws(()=>loadP6PostWindows(env,trust,()=>Buffer.from("mutated")),/DAY_PLAN_HASH_DRIFT/);
});
