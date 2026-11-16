import test from "node:test";
import assert from "node:assert/strict";
import {P6_ROLLING_ROUTES,planP6RollingTick,dispatchP6ReviewedRollingWave,readP6RollingGithubSnapshot,createP6RollingScheduleEvidenceCache} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const sha="a".repeat(40),clock=Date.parse("2030-01-01T00:30:00.000Z"),epoch=clock-3600000;
const context={sha,clock,epoch};
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const snaps=()=>P6_ROLLING_ROUTES.map(r=>({workflow:r.workflow,complete:true,runs:[],active:[],jobs:[]}));
const row=(route,delta={})=>({id:123,path:".github/workflows/"+route.workflow,head_branch:"main",head_sha:sha,event:"workflow_dispatch",
 status:"completed",conclusion:"success",run_attempt:1,created_at:new Date(clock-60000).toISOString(),...delta});
const jobs=route=>route.jobs.map(j=>({name:j.name,status:"completed",conclusion:"success",
 steps:j.step?[{name:j.step,status:"completed",conclusion:"success"}]:j.parentOutcome?markers("NO_DUE_WORK"):[]}));
const markers=selected=>["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"].map(x=>({name:"Parent outcome "+x,status:"completed",conclusion:x===selected?"success":"skipped"}));
const result=(id)=>({workflow_run_id:id,run_url:ROOT+"/actions/runs/"+id,html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/"+id});
function setup(){
 const snapshots=snaps(),plan=planP6RollingTick(snapshots,context),events=[],calls=[];
 const options={sha,approvedSha:sha,releaseApproved:true,token:"synthetic-mock-token-123",
 deadline:clock+120000,now:()=>clock,recheckRoute:async r=>snapshots.find(s=>s.workflow===r.workflow),
 onEvidence:e=>events.push(e),fetcher:async(url,opt)=>{
  calls.push({url,method:opt.method,body:opt.body&&JSON.parse(opt.body)});
  return opt.method==="GET"?{ok:true,json:async()=>({object:{sha}})}:
   {status:200,json:async()=>result(1000+calls.length)};
 }};
 return {snapshots,plan,events,calls,options};
}
test("exact fixed grouped workflow plan: no duplicate parent, no model/provider authority",()=>{
 const p=planP6RollingTick(snaps(),context);
 assert.equal(p.due.length,8);assert.equal(new Set(P6_ROLLING_ROUTES.map(x=>x.workflow)).size,8);
 assert.equal(P6_ROLLING_ROUTES[0].inputs.confirm,"RUN_CURRENT_SIGNED_SOURCE_POST_CYCLE");
 assert.equal(P6_ROLLING_ROUTES[1].inputs.confirm,"ENROLL_DUE_CURRENT_SIGNED_PRE_CYCLE_NO_PROVIDER");
 assert.equal(p.providerCalls,0);assert.equal(p.phase6PaidGo,false);
 assert.throws(()=>planP6RollingTick(snaps().slice(1),context),/INCOMPLETE/);
 assert.throws(()=>planP6RollingTick(snaps().map((x,i)=>i===0?{...x,complete:false}:x),context),/INCOMPLETE/);
 assert.throws(()=>p.due.push("other"));
});
test("an old active run, including an older SHA, defers only that workflow",()=>{
 const x=snaps(),r=P6_ROLLING_ROUTES[0];x[0].active=[row(r,{status:"queued",conclusion:null,head_sha:"b".repeat(40),created_at:new Date(epoch-1000).toISOString()})];
 const p=planP6RollingTick(x,context);assert.equal(p.assessments[0].state,"ACTIVE_NO_OVERLAP");
 assert.equal(p.due.length,7);
});
test("history missing active row or unsuccessful prior attempt blocks entire wave",()=>{
 const x=snaps(),r=P6_ROLLING_ROUTES[0];x[0].runs=[row(r,{status:"in_progress",conclusion:null})];
 assert.equal(planP6RollingTick(x,context).status,"HOLD_ROLLING_WAVE_NO_DISPATCH");
 x[0].runs=[row(r),row(r,{id:124,created_at:new Date(clock-120000).toISOString(),conclusion:"cancelled"})];
 x[0].jobRunId=123;x[0].jobs=jobs(r);
 assert.equal(planP6RollingTick(x,context).assessments[0].state,"HOLD_UNSUCCESSFUL_OR_DRIFTED_ATTEMPT");
});
test("successful workflow without required job or execution step is not evidence",()=>{
 const x=snaps(),r=P6_ROLLING_ROUTES[0];x[0].runs=[row(r)];x[0].jobRunId=123;
 assert.equal(planP6RollingTick(x,context).assessments[0].state,"HOLD_GATED_OR_FAILED_REQUIRED_JOB");
 x[0].jobs=jobs(r);x[0].jobs[1].conclusion="skipped";
 assert.equal(planP6RollingTick(x,context).due.length,0);
 x[0].jobs=jobs(r);
 assert.equal(planP6RollingTick(x,context).assessments[0].state,"RECENT_JOB_SUCCESS_NOT_COLLECTION_PROOF");
 const i=P6_ROLLING_ROUTES.findIndex(z=>z.lane==="EARLY_DRAW"),d=P6_ROLLING_ROUTES[i];
 x[i].runs=[row(d,{id:999})];x[i].jobRunId=999;x[i].jobs=jobs(d);x[i].jobs[0].steps[0].conclusion="skipped";
 assert.equal(planP6RollingTick(x,context).assessments[i].state,"HOLD_INERT_REQUIRED_STEP");
});
test("older skipped pre-release history is not counted as actual work",()=>{
 const x=snaps();x[0].runs=[row(P6_ROLLING_ROUTES[0],{created_at:new Date(epoch-1000).toISOString(),conclusion:"skipped"})];
 assert.equal(planP6RollingTick(x,context).due.length,8);
});
test("one dispatch per allowlisted workflow, exact ACK and no replay of issued plan",async()=>{
 const f=setup();const out=await dispatchP6ReviewedRollingWave(f.plan,f.options);
 assert.equal(out.dispatchCount,8);assert.equal(out.phase6PaidGo,false);
 const posts=f.calls.filter(x=>x.method==="POST");
 assert.equal(new Set(posts.map(x=>x.url)).size,8);
 assert.equal(posts[0].body.inputs.confirm,"RUN_CURRENT_SIGNED_SOURCE_POST_CYCLE");
 assert.equal(posts[7].body.inputs.approved_main_sha,sha);
 assert.equal(f.events.length,16);assert.equal(f.events[0].status,"DISPATCH_ATTEMPT_BEFORE_ACK");
 await assert.rejects(dispatchP6ReviewedRollingWave(f.plan,f.options),/NO_EXACT/);
 await assert.rejects(dispatchP6ReviewedRollingWave({...f.plan},f.options),/NO_EXACT/);
 assert.equal(f.calls.length,16);
});
test("unapproved and stale plans refuse before network",async()=>{
 const f=setup();
 for(const delta of [{releaseApproved:false},{approvedSha:"b".repeat(40)},{now:()=>clock+61000}])
  await assert.rejects(dispatchP6ReviewedRollingWave(f.plan,{...f.options,...delta}),/NO_EXACT/);
 assert.equal(f.calls.length,0);
});
test("fresh active route defers, main drift stops before POST",async()=>{
 const f=setup();f.snapshots[0].active=[row(P6_ROLLING_ROUTES[0],{status:"queued",conclusion:null})];
 const out=await dispatchP6ReviewedRollingWave(f.plan,f.options);
 assert.deepEqual(out.deferred,["SOURCE_POST"]);assert.equal(out.dispatchCount,7);
 const g=setup();g.options.fetcher=async()=>({ok:true,json:async()=>({object:{sha:"b".repeat(40)}})});
 await assert.rejects(dispatchP6ReviewedRollingWave(g.plan,g.options),/MAIN_CHANGED/);
 assert.equal(g.events.length,0);
});
test("unknown ACK stops wave; exact prior ACK remains in sanitized evidence",async()=>{
 const f=setup(),original=f.options.fetcher;let posts=0;
 f.options.fetcher=async(u,o)=>{if(o.method==="POST"&&++posts===2)return {status:204};return original(u,o);};
 await assert.rejects(dispatchP6ReviewedRollingWave(f.plan,f.options),/UNKNOWN_DISPATCH_STOP_NO_RETRY/);
 assert.equal(posts,2);assert.equal(f.events.length,3);assert.equal(f.events[1].status,"EXACT_ACK_NOT_EXECUTION_PROOF");
 assert.equal(f.events[2].status,"DISPATCH_ATTEMPT_BEFORE_ACK");
 await assert.rejects(dispatchP6ReviewedRollingWave(f.plan,f.options),/NO_EXACT/);
});

test("real API-shaped read-only snapshot covers both events plus all old active states and exact job readback",async()=>{
 const a=P6_ROLLING_ROUTES[0],b=P6_ROLLING_ROUTES[1],calls=[];
 const active=row(b,{id:777,status:"queued",conclusion:null,created_at:new Date(epoch-7200000).toISOString()});
 const fetcher=async(url,opt)=>{
  assert.equal(opt.method,"GET");calls.push(url);
  const u=new URL(url);let items=[],key="workflow_runs";
  if(u.pathname.endsWith("/runs/123/jobs")){items=jobs(a);key="jobs";}
  else if(u.searchParams.get("status")==="queued")items=[active];
  else if(u.pathname.includes("/workflows/"+a.workflow+"/runs")&&u.searchParams.get("event")==="workflow_dispatch")items=[row(a)];
  return {ok:true,json:async()=>({total_count:items.length,[key]:items})};
 };
 const {plan,recheckRoute}=await readP6RollingGithubSnapshot({sha,epoch,token:"synthetic-mock-token-123",now:()=>clock,fetcher});
 assert.equal(plan.assessments[0].state,"RECENT_JOB_SUCCESS_NOT_COLLECTION_PROOF");
 assert.equal(plan.assessments[1].state,"ACTIVE_NO_OVERLAP");
 assert.equal(plan.due.length,6);assert.equal(calls.length,22);
 const fresh=await recheckRoute(b);assert.equal(fresh.active[0].id,777);assert.equal(calls.length,24);
});
test("bounded read fails closed on truncated API totals or history filter drift",async()=>{
 const cfg={sha,epoch,token:"synthetic-mock-token-123",now:()=>clock};
 await assert.rejects(readP6RollingGithubSnapshot({...cfg,fetcher:async()=>({ok:true,json:async()=>({total_count:101,workflow_runs:[]})})}),/GITHUB_HISTORY_UNAVAILABLE_OR_INCOMPLETE/);
 await assert.rejects(readP6RollingGithubSnapshot({...cfg,epoch:clock-7*3600000,fetcher:async()=>{throw Error("must not call")}}),/NO_BOUNDED_SESSION_HISTORY_SCOPE/);
});

test("green parent with explicit safe HOLD or missing evidence remains distinct from completed work; malformed markers block",()=>{
 const x=snaps(),r=P6_ROLLING_ROUTES[0];x[0].runs=[row(r)];x[0].jobRunId=123;x[0].jobs=jobs(r);
 x[0].jobs[0].steps=markers("SAFE_PREFLIGHT_HOLD");
 assert.equal(planP6RollingTick(x,context).assessments[0].state,"RECENT_SAFE_PREFLIGHT_HOLD");
 x[0].jobs[0].steps=markers("MISSING_EVIDENCE");
 assert.equal(planP6RollingTick(x,context).assessments[0].state,"RECENT_MISSING_EVIDENCE");
 x[0].jobs[0].steps[0].conclusion="success";
 assert.equal(planP6RollingTick(x,context).assessments[0].state,"HOLD_MISSING_PARENT_OUTCOME");
 x[0].jobs[0].steps=[];assert.equal(planP6RollingTick(x,context).due.length,0);
 x[0].jobs[0].steps=markers("SAFE_PREFLIGHT_HOLD");
 x[0].runs=[row(r,{created_at:new Date(clock-600000).toISOString()})];
 assert.equal(planP6RollingTick(x,context).assessments[0].state,"DUE_REVIEWED_ROUTE");
});

test("only independently proved all-skipped exact scheduled runs are inert; do not erase real attempt cooldown",async()=>{
 const r=P6_ROLLING_ROUTES[0],skip=row(r,{id:124,event:"schedule",conclusion:"skipped",created_at:new Date(clock-10000).toISOString()});
 const prior=row(r,{id:123,created_at:new Date(clock-120000).toISOString()});
 const cache=createP6RollingScheduleEvidenceCache();let skipReads=0,mutated=false;
 const skippedJobs=[{id:1111,run_id:124,run_attempt:1,head_sha:sha,name:"real-job",status:"completed",conclusion:"skipped",steps:[]}];
 const fetcher=async(url,opt)=>{
  const u=new URL(url);assert.equal(opt.method,"GET");
  let items=[],key="workflow_runs";
  if(u.pathname.endsWith("/runs/124/jobs")){skipReads++;items=skippedJobs;key="jobs";}
  else if(u.pathname.endsWith("/runs/123/jobs")){items=jobs(r);key="jobs";}
  else if(u.pathname.includes("/workflows/"+r.workflow+"/runs")){
   if(u.searchParams.get("event")==="schedule")items=[mutated?{...skip,run_attempt:2}:skip];
   if(u.searchParams.get("event")==="workflow_dispatch")items=[prior];
  }
  return {ok:true,json:async()=>({total_count:items.length,[key]:items})};
 };
 const cfg={sha,epoch,token:"synthetic-mock-token-123",now:()=>clock,fetcher,scheduleEvidenceCache:cache};
 const one=await readP6RollingGithubSnapshot(cfg);
 assert.equal(one.plan.assessments[0].state,"RECENT_JOB_SUCCESS_NOT_COLLECTION_PROOF");
 assert.equal(one.plan.assessments[0].runId,123);
 const fresh=await one.recheckRoute(r);
 assert.equal(fresh.inertScheduleProofs.length,1);assert.equal(fresh.jobRunId,123);
 await readP6RollingGithubSnapshot(cfg);assert.equal(skipReads,1);
 const forged=snaps();forged[0].runs=[skip];forged[0].inertScheduleProofs=[{runId:124,workflow:r.workflow}];
 assert.throws(()=>planP6RollingTick(forged,context),/INVALID_INERT_SCHEDULE_PROOF/);
 mutated=true;
 assert.equal((await readP6RollingGithubSnapshot(cfg)).plan.status,"HOLD_ROLLING_WAVE_NO_DISPATCH");
});
test("no-op scheduled attempts do not consume cadence; mixed executed jobs or manual skips still HOLD",async()=>{
 const r=P6_ROLLING_ROUTES[0];
 for(const kind of ["proven","mixed","empty","manual","old","rerun"]){
  const skip=row(r,{id:201,event:kind==="manual"?"workflow_dispatch":"schedule",conclusion:"skipped",
   head_sha:kind==="old"?"b".repeat(40):sha,run_attempt:kind==="rerun"?2:1});
  let jobReads=0;
  const fetcher=async(url,opt)=>{
   const u=new URL(url);assert.equal(opt.method,"GET");let items=[],key="workflow_runs";
   if(u.pathname.endsWith("/runs/201/jobs")){
    jobReads++;key="jobs";
    if(kind!=="empty")items=[{id:111,run_id:201,run_attempt:1,head_sha:sha,name:"one",status:"completed",
     conclusion:kind==="mixed"?"success":"skipped",steps:[]}];
   }else if(u.pathname.includes("/workflows/"+r.workflow+"/runs")&&u.searchParams.get("event")===skip.event)items=[skip];
   return {ok:true,json:async()=>({total_count:items.length,[key]:items})};
  };
  const p=(await readP6RollingGithubSnapshot({sha,epoch,token:"synthetic-mock-token-123",now:()=>clock,fetcher})).plan;
  if(kind==="proven"){assert.equal(p.assessments[0].state,"DUE_REVIEWED_ROUTE");assert.equal(p.assessments[0].inertScheduledRuns,1);}
  else assert.equal(p.status,"HOLD_ROLLING_WAVE_NO_DISPATCH");
  assert.equal(jobReads,["proven","mixed","empty"].includes(kind)?1:0);
 }
});

test("active same-head run cannot conceal earlier failed or drifted attempt",()=>{
 const x=snaps(),r=P6_ROLLING_ROUTES[0];
 const active=row(r,{id:601,status:"in_progress",conclusion:null});
 x[0].active=[active];x[0].runs=[active];
 assert.equal(planP6RollingTick(x,context).assessments[0].state,"ACTIVE_NO_OVERLAP");
 for(const delta of [{conclusion:"failure"},{conclusion:"cancelled"},{head_sha:"b".repeat(40)},{run_attempt:2}]){
  x[0].runs=[active,row(r,{id:600,created_at:new Date(clock-120000).toISOString(),...delta})];
  const p=planP6RollingTick(x,context);assert.equal(p.assessments[0].state,"HOLD_UNSUCCESSFUL_OR_DRIFTED_ATTEMPT");assert.equal(p.due.length,0);
 }
});


function retirementFixture({olderGated=false,changed=false,activeOlder=false,recentEarly=false,lateMissing=false}={}){
 const r=P6_ROLLING_ROUTES[0],early=P6_ROLLING_ROUTES.find(x=>x.lane==="EARLY_DRAW");
 const old=row(r,{id:800,created_at:new Date(clock-50*60000).toISOString()});
 const skipped=row(r,{id:801,event:"schedule",conclusion:"skipped",created_at:new Date(clock-45*60000).toISOString()});
 const newer=row(r,{id:802,created_at:new Date(clock-2*60000).toISOString()});
 const ed=row(early,{id:803,created_at:new Date(clock-55*60000).toISOString()});
 const active=row(r,{id:804,status:"queued",conclusion:null,created_at:new Date(epoch-60000).toISOString()});
 const late=row(r,{id:805,created_at:new Date(clock-42*60000).toISOString()});
 const calls=[];
 function withIdentity(xs,run){
  return xs.map((j,i)=>({...j,id:run.id*10+i+1,run_id:run.id,head_sha:sha,run_attempt:1}));
 }
 const fetcher=async(url,opt)=>{
  assert.equal(opt.method,"GET");calls.push(url);const u=new URL(url);
  let items=[],key="workflow_runs";
  const m=u.pathname.match(/\/runs\/(\d+)\/jobs$/);
  if(m){
   key="jobs";
   switch(+m[1]){
    case 800:items=withIdentity(jobs(r),old);if(olderGated)items[0].conclusion="skipped";
     if(changed)items[0].steps=markers("MISSING_EVIDENCE");break;
    case 801:items=withIdentity([{name:"inert",status:"completed",conclusion:"skipped",steps:[]}],skipped);break;
    case 802:items=withIdentity(jobs(r),newer);break;
    case 803:items=withIdentity(jobs(early),ed);break;
    case 805:items=withIdentity(jobs(r),late);break;
    default:assert.fail("unexpected job read");
   }
  }else if(u.searchParams.get("status")==="queued"&&activeOlder)items=[active];
  else if(u.pathname.includes("/workflows/"+r.workflow+"/runs")){
   if(u.searchParams.get("event")==="schedule")items=[skipped];
   if(u.searchParams.get("event")==="workflow_dispatch")items=[old,newer,...(lateMissing?[late]:[])];
  }else if(recentEarly&&u.pathname.includes("/workflows/"+early.workflow+"/runs")&&
   u.searchParams.get("event")==="workflow_dispatch")items=[ed];
  return {ok:true,json:async()=>({total_count:items.length,[key]:items})};
 };
 return {calls,fetcher};
}
const retireConfig=f=>({sha,epoch,token:"synthetic-mock-token-123",now:()=>clock,fetcher:f.fetcher});
test("bounded retirement re-reads every removed run and independently matches the exact predecessor prefix",async()=>{
 const first=retirementFixture(),before=await readP6RollingGithubSnapshot(retireConfig(first));
 const p=await before.reviewHistoryRetirement();
 assert.equal(p.status,"REVIEWED_RETIREMENT_CANDIDATE_NO_GO");
 assert.equal(p.proposedEpochUtc,new Date(clock-600000).toISOString());
 assert.equal(p.retiredRunCount,2);assert.equal(p.laneCounts[0].inertCount,1);
 assert.equal(p.phase6PaidGo,false);assert.equal(p.requiresIndependentSuccessorReadback,true);
 assert(first.calls.some(x=>x.includes("/runs/800/jobs")));
 assert.equal(first.calls.filter(x=>x.includes("/runs/801/jobs")).length,2);
 const second=retirementFixture(),after=await readP6RollingGithubSnapshot(retireConfig(second));
 const verified=await after.reviewHistoryRetirement({previousReceipt:JSON.parse(JSON.stringify(p))});
 assert.equal(verified.status,"INDEPENDENT_RETIREMENT_PREFIX_MATCH_NO_GO");
 assert.equal(verified.retiredHistorySha256,p.retiredHistorySha256);
 assert.equal(verified.requiresIndependentSuccessorReadback,false);
 await assert.rejects(after.reviewHistoryRetirement(),/RETIREMENT_ALREADY_REVIEWED/);
});
test("a green older run with a gated required job cannot be retired behind newer success",async()=>{
 const f=retirementFixture({olderGated:true}),o=await readP6RollingGithubSnapshot(retireConfig(f));
 assert.equal(o.plan.status,"REVIEWED_ROLLING_WAVE_PLAN_NO_GO");
 await assert.rejects(o.reviewHistoryRetirement(),/RETIREMENT_REQUIRED_JOB_HOLD/);
});
test("late-visible run or changed outcome blocks independent successor prefix confirmation",async()=>{
 const f=retirementFixture(),o=await readP6RollingGithubSnapshot(retireConfig(f));
 const p=await o.reviewHistoryRetirement();
 for(const opts of [{changed:true},{lateMissing:true}]){
  const n=await readP6RollingGithubSnapshot(retireConfig(retirementFixture(opts)));
  await assert.rejects(n.reviewHistoryRetirement({previousReceipt:p}),/RETIREMENT_PREFIX_CHANGED/);
 }
});
test("older active custody prevents retirement; four-hour early draw cooldown is retained",async()=>{
 const a=await readP6RollingGithubSnapshot(retireConfig(retirementFixture({activeOlder:true})));
 assert.equal((await a.reviewHistoryRetirement()).status,"RETIREMENT_NO_ADVANCE_KEEP_PRIOR_EPOCH");
 const b=await readP6RollingGithubSnapshot(retireConfig(retirementFixture({recentEarly:true})));
 const p=await b.reviewHistoryRetirement();
 assert.equal(p.proposedEpochUtc,new Date(clock-55*60000).toISOString());assert.equal(p.retiredRunCount,0);
});
