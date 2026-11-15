import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync} from "node:crypto";
import {runP6StoredSourceDispatcher,admitP6StoredSourceDispatcher}
 from "../scripts/v39_phase6_stored_source_child_dispatcher_v39.mjs";
const H=c=>c.repeat(64),code="f".repeat(40),clock="2026-11-15T06:00:00.000Z";
const root="https://api.github.com/repos/HKcode22/ReplitTranvr";
const {publicKey}=generateKeyPairSync("ed25519");
const pem=publicKey.export({format:"pem",type:"spki"}).toString();
const fp=createHash("sha256").update(publicKey.export({format:"der",type:"spki"})).digest("hex");
const trust={independentStudyTrustPinsApproved:true,expectedReaderSessionLogin:"phase6_private_reader_login_ci_dispatch",
 reviewedCodeSha:code,manifestSha256:H("1"),calendarSha256:H("2"),releaseSha256:H("3"),rightsSha256:H("4"),
 dayReviewerFingerprintSha256:fp,dayReviewerPublicKeyPem:pem,queryReviewerFingerprintSha256:fp,queryReviewerPublicKeyPem:pem};
function fixture(){
 const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
  GITHUB_EVENT_NAME:"schedule",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"12345",GITHUB_SHA:code,
  V39_P5_APPROVED_CODE_SHA:code,V39_P5_QUEUE_APPROVED_CODE_SHA:code,P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA:code,
  P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED:"true",P6_PRIVATE_SOURCE_REVIEW_MODE:"stored",
  P5_AUTO_SOURCE_DISPATCH_ENABLED:"false",ADB_AUTO_COLLECT:"0",V39_P5_REST_UNIT_PRICE_APPROVED:"2",
  V39_P5_MANIFEST_SHA256:H("1"),V39_P5_RELEASE_SHA256:H("3"),V39_P5_RIGHTS_SHA256:H("4"),
  V39_P5_PROVIDER_CONTRACT_SHA256:H("5"),V39_P5_SOURCE_DATABASE_URL:"CI_NO_ACTUAL_DATABASE",
  P6_PRIVATE_READER_DATABASE_URL:"CI_NO_ACTUAL_DATABASE",GITHUB_TOKEN:"SYNTHETIC_NO_REAL_TOKEN_123456789",
  P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:Buffer.from(JSON.stringify(trust)).toString("base64")};
 for(const k of ["V39_P5_SOURCE_QUEUE_OWNER_APPROVED","V39_P5_AUTO_SOURCE_DISPATCH_APPROVED",
  "V39_P5_SIGNED_DAY_REGISTRY_RELEASE","V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED",
  "V39_PHASE6_PROCESS_ARMED","V39_P5_SOURCE_DB_ROLE_REVIEWED","V39_P5_SEVEN_REST_BUDGET_SIGNED",
  "P6_PRIVATE_SOURCE_TRANSPORT_APPROVED","P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED",
  "P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED","P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED"])env[k]="1";
 const inputs=["a","b","c","d"].map(x=>({signed_registry_file:"PRIVATE_STORED",frozen_release_file:"PRIVATE_STORED",
  query_digest:H(x),run_day_index:"1",confirm:"ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET",private_transport:"stored",
  private_confirm:"ONE_PRIVATE_SOURCE_ORIGINAL_P5_CHILD_SAME_JOB_ONE_GET",routing_intent_sha256:H("e"),
  day_index_revision:"2",day_index_sha256:H("f")}));
 const planned={status:"SIGNED_PRIVATE_DAY_SOURCE_AND_ACTUAL_DB_DUE_REVIEW_ONLY_NO_DISPATCH",
  storedReviewMode:true,providerCalls:0,databaseWrites:0,githubDispatches:0,paidPhase6Go:false,
  candidateCount:4,observedSourceDatabaseClockUtc:clock};
 Object.defineProperty(planned,"privateStoredChildInputProposals",{value:inputs});
 const run=(id,status,display_title,conclusion=null)=>({id,display_title,status,conclusion,created_at:clock.replace(".000","")});
 function mock({children=[],previous=[],previousManual=[],currentEvent="schedule",jobs=[],badPost=false,missingOther=false}={}){
  const calls=[],posts=[];
  return {calls,posts,fetchImpl:async (url,opts)=>{
   calls.push([opts.method,url]);
   if(opts.method==="POST"){
    const body=JSON.parse(opts.body);posts.push(body);
    if(badPost)throw Error("UNKNOWN_PRIVATE_HTTP_ERROR");
    const id=20001+posts.length;
    return {status:200,json:async()=>({workflow_run_id:id,run_url:root+"/actions/runs/"+id,
     html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/"+id})};
   }
   if(url.includes("/jobs?"))return{ok:true,json:async()=>({total_count:jobs.length,jobs})};
   const parent=url.includes("queue-main-scheduled");
   const event=new URL(url).searchParams.get("event");
   if(parent&&missingOther&&event!==currentEvent)return {ok:false,status:503};
   const prior=event==="schedule"?previous:previousManual;
   const p=parent?[...(event===currentEvent?[run(12345,"in_progress","parent")]:[]),...prior]:children;
   return {ok:true,json:async()=>({total_count:p.length,workflow_runs:p})};
  }};
 }
 const observe=async (e,opts)=>{
  assert.equal(opts.storedCapacityProfile,true);
  assert.equal(e.V39_PHASE6_PROCESS_ARMED,"0");
  assert.equal(env.V39_PHASE6_PROCESS_ARMED,"1");
  return planned;
 };
 return {env,inputs,planned,run,mock,options:{observe,now:()=>Date.parse(clock)}};
}
test("uses actual API 200 run IDs, caps in-flight and avoids a previously submitted digest",async()=>{
 const f=fixture(),children=[f.run(11,"completed","P5 SOURCE "+H("a"),"success"),
  ...Array.from({length:22},(_,i)=>f.run(20+i,"in_progress","P5 SOURCE "+H("9")))];
 const m=f.mock({children});
 const out=await runP6StoredSourceDispatcher(f.env,{...f.options,fetchImpl:m.fetchImpl});
 assert.equal(m.posts.length,2);
 assert.equal(m.posts[0].inputs.query_digest,H("b"));
 assert.equal(m.posts[0].return_run_details,true);
 assert.equal(m.posts[0].inputs.signed_registry_file,"PRIVATE_STORED");
 assert.equal(Object.keys(m.posts[0].inputs).length,10);
 assert.deepEqual(out.acknowledgedGithubRunIds,[20002,20003]);
 assert.equal(out.paidGetsCertifiedByParent,0);
});
test("prior uncertain dispatch suppresses new requests; earlier setup failure is not a dispatch",async()=>{
 const f=fixture(),prior=f.run(12344,"completed","parent","failure");
 const job={name:"separately-authorized-stored-source-children",status:"completed",conclusion:"failure",
  steps:[{name:"Dispatch stored SOURCE exact children",conclusion:"failure"}]};
 const m=f.mock({previous:[prior],jobs:[job]});
 assert.equal((await runP6StoredSourceDispatcher(f.env,{...f.options,fetchImpl:m.fetchImpl})).status,"HOLD_PRE_DISPATCH_NO_POST");
 assert.equal(m.posts.length,0);
 const setup=f.mock({previous:[prior],jobs:[{...job,steps:[{name:"Install dependencies",conclusion:"failure"}]}]});
 assert.equal((await runP6StoredSourceDispatcher(f.env,{...f.options,fetchImpl:setup.fetchImpl})).acknowledgedGithubChildCount,4);
});
test("unknown POST never retries or moves to next query",async()=>{
 const f=fixture(),m=f.mock({badPost:true});
 await assert.rejects(runP6StoredSourceDispatcher(f.env,{...f.options,fetchImpl:m.fetchImpl}),/UNKNOWN_DISPATCH_POST_NEVER_AUTO_REPLAY/);
 assert.equal(m.posts.length,1);
});
test("separate release, no legacy dispatcher or provider credential, cap and stale clock",async()=>{
 const f=fixture();
 for(const change of [{P5_AUTO_SOURCE_DISPATCH_ENABLED:"true"},{P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED:"0"},
  {AERODATABOX_API_KEY:"NO"},{GITHUB_RUN_ATTEMPT:"2"}])
  assert.throws(()=>admitP6StoredSourceDispatcher({...f.env,...change}),/NO_EXACT_INDEPENDENT/);
 const m=f.mock({children:Array.from({length:24},(_,i)=>f.run(100+i,"queued","P5 SOURCE "+H("9")))});
 assert.equal((await runP6StoredSourceDispatcher(f.env,{...f.options,fetchImpl:m.fetchImpl})).acknowledgedGithubChildCount,0);
 assert.equal(m.posts.length,0);
 const stale=f.mock();
 assert.equal((await runP6StoredSourceDispatcher(f.env,{...f.options,now:()=>Date.parse(clock)+121000,fetchImpl:stale.fetchImpl})).status,"HOLD_PRE_DISPATCH_NO_POST");
 assert.equal(stale.posts.length,0);
});

test("successful rerun cannot hide a previous ambiguous dispatch attempt",async()=>{
 const f=fixture(),prior=f.run(12344,"completed","parent","success");
 const job={name:"separately-authorized-stored-source-children",status:"completed",conclusion:"failure",
  steps:[{name:"Dispatch stored SOURCE exact children",conclusion:"failure"}]};
 const m=f.mock({previous:[prior],jobs:[job,{...job,conclusion:"success",steps:[{name:"Dispatch stored SOURCE exact children",conclusion:"success"}]}]});
 assert.equal((await runP6StoredSourceDispatcher(f.env,{...f.options,fetchImpl:m.fetchImpl})).status,"HOLD_PRE_DISPATCH_NO_POST");
 assert.equal(m.posts.length,0);
});

test("unavailable selected days are disclosed without posting any unsigned query",async()=>{
 const f=fixture(),m=f.mock();
 const missing=await runP6StoredSourceDispatcher(f.env,{...f.options,fetchImpl:m.fetchImpl,
  observe:async()=>({status:"SELECTED_SOURCE_DAY_REVIEWS_UNAVAILABLE_NO_DISPATCH",providerCalls:0,
   databaseWrites:0,githubDispatches:0,paidPhase6Go:false,unavailableSelectedDayCount:2,
   unavailableSelectedDueQueryCount:5})});
 assert.equal(m.calls.length,0);
 assert.equal(missing.unavailableSelectedDueQueryCount,5);
 assert.equal(missing.acknowledgedGithubChildCount,0);
 f.planned.unavailableSelectedDayCount=1;
 f.planned.unavailableSelectedDueQueryCount=3;
 const out=await runP6StoredSourceDispatcher(f.env,{...f.options,fetchImpl:m.fetchImpl});
 assert.equal(out.unavailableSelectedDueQueryCount,3);
 assert.equal(out.acknowledgedGithubChildCount,4);
});

 test("bounded exact stored profile can submit eight distinct requests, but does not overfill 24 active",async()=>{
 const f=fixture(),make=n=>f.inputs.map((p,i)=>({...p,query_digest:H(String(n+i))})),input=[...f.inputs,...make(1)];
 const planned={...f.planned,candidateCount:8};Object.defineProperty(planned,"privateStoredChildInputProposals",{value:input});
 const m=f.mock(),out=await runP6StoredSourceDispatcher(f.env,{...f.options,observe:async()=>planned,fetchImpl:m.fetchImpl});
 assert.equal(out.acknowledgedGithubChildCount,8);assert.equal(out.inFlightCap,24);assert.equal(out.perTickCap,8);assert.equal(out.maxLeadMinutes,35);
 const near=f.mock({children:Array.from({length:23},(_,i)=>f.run(100+i,"in_progress","P5 SOURCE "+H("9")))});
 assert.equal((await runP6StoredSourceDispatcher(f.env,{...f.options,observe:async()=>planned,fetchImpl:near.fetchImpl})).acknowledgedGithubChildCount,1);
 });

test("exact explicit SOURCE parent route preserves both trigger histories and original release gates",async()=>{
 const f=fixture(),manual={...f.env,GITHUB_EVENT_NAME:"workflow_dispatch",P6_CURRENT_PARENT_DISPATCH_CONFIRM:"RUN_CURRENT_SIGNED_SOURCE_PARENT"};
 assert.doesNotThrow(()=>admitP6StoredSourceDispatcher(manual));
 for(const change of [{P6_CURRENT_PARENT_DISPATCH_CONFIRM:"RUN_CURRENT_SIGNED_POST_PARENT"},{P6_CURRENT_PARENT_DISPATCH_CONFIRM:""},{V39_PHASE6_PROCESS_ARMED:"0"},{V39_P5_SEVEN_REST_BUDGET_SIGNED:"0"}])
  assert.throws(()=>admitP6StoredSourceDispatcher({...manual,...change}),/NO_EXACT_INDEPENDENT/);
 const m=f.mock({currentEvent:"workflow_dispatch"});
 const out=await runP6StoredSourceDispatcher(manual,{...f.options,fetchImpl:m.fetchImpl,observe:async(e,o)=>{
  assert.equal(e.GITHUB_EVENT_NAME,"workflow_dispatch");
  assert.equal(e.P6_PRIVATE_SOURCE_PARENT_RO_CONFIRM,"READ_ONLY_AUTHENTIC_PRIVATE_DAY_SOURCE_NO_PROVIDER_NO_DISPATCH");
  assert.equal(e.V39_PHASE6_PROCESS_ARMED,"0");
  return f.options.observe(e,o);
 }});
 assert.equal(out.acknowledgedGithubChildCount,4);
 assert.equal(m.calls.filter(([method,url])=>method==="GET"&&url.includes("queue-main-scheduled")).length,2);
 const job={name:"separately-authorized-stored-source-children",status:"completed",conclusion:"failure",
  steps:[{name:"Dispatch stored SOURCE exact children",conclusion:"failure"}]};
 const prior=f.run(12344,"completed","parent","failure");
 for(const [e,opts] of [[manual,{currentEvent:"workflow_dispatch",previous:[prior],jobs:[job]}],
  [f.env,{previousManual:[prior],jobs:[job]}],[manual,{currentEvent:"workflow_dispatch",missingOther:true}]]){
  const h=f.mock(opts);
  assert.equal((await runP6StoredSourceDispatcher(e,{...f.options,fetchImpl:h.fetchImpl})).status,"HOLD_PRE_DISPATCH_NO_POST");
  assert.equal(h.posts.length,0);
 }
});
