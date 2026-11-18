import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {runDirectTick,DIRECT_WF,DIRECT_TITLE,DIRECT_CONFIRM} from "../scripts/v39_phase6_direct_recovery_tick_v39.mjs";
import {P6_ROLLING_ROUTES} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const sha="a".repeat(40),hash="b".repeat(64),start=Date.parse("2030-01-02T00:00:00.000Z"),MIN=60000,H=60*MIN;
const iso=t=>new Date(t).toISOString(),digest=b=>createHash("sha256").update(b).digest("hex");
const root="https://api.github.com/repos/HKcode22/ReplitTranvr",old="phase6-rolling-controller-bounded-session.yml";
const flags=["P6_ROLLING_CONTROLLER_ENABLED","P6_ROLLING_DIRECT_RECOVERY_ENABLED","P6_ROLLING_DIRECT_RECOVERY_APPROVED","V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","V39_P5_SEVEN_REST_BUDGET_SIGNED","V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED"];
function fixture(fault=""){
 let clock=start,seq=20000,posts=0;const plans=new Map(),runs=[],events=[],calls=[];
 const pins=Array.from({length:31},(_,i)=>{
  const service=start+(i===0?25*H:(25+24*i)*H),templates=[];
  for(const [horizon,off] of [["T-24h",24*H],["T-6h",6*H],["T-90m",90*MIN]])for(let slot=0;slot<4;slot++)
   templates.push({queryKey:"d"+i+"."+horizon+"."+slot,runDayIndex:i+1,horizon,serviceWindowStartUtc:iso(service),
    serviceWindowEndUtc:iso(service+4*H),earliestPlannedCutoffUtc:iso(service-off),scheduledRequestUtc:iso(service-off-15*MIN)});
  const bytes=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:i+1,expectedServiceStartUtc:iso(service),templates}));
  plans.set("data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json",bytes);return {runDayIndex:i+1,sha256:digest(bytes)};
 });
 const policy=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,
  approvedCodeSha:sha,manifestSha256:hash,calendarSha256:hash,releaseSha256:hash,rightsSha256:hash,dayPlanSha256s:pins,
  validFromUtc:iso(start-24*H),validUntilUtc:iso(start+40*24*H)}));
 const env={...Object.fromEntries(flags.map(k=>[k,"1"])),GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"12345",GITHUB_SHA:sha,
  V39_P5_APPROVED_CODE_SHA:sha,P6_ROLLING_REQUESTED_MAIN_SHA:sha,P6_ROLLING_SESSION_CONFIRM:DIRECT_CONFIRM,
  P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC:iso(start-4*H),P5_CD_GH_PRE_STOP:"0",ADB_AUTO_COLLECT:"0",GITHUB_TOKEN:"synthetic-test-token-no-access",
  V39_P5_MANIFEST_SHA256:hash,V39_P5_CALENDAR_HASH:hash,V39_P5_RELEASE_SHA256:hash,V39_P5_RIGHTS_SHA256:hash,
  P6_NONPAID_DAILY_POLICY_BASE64:policy.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:digest(policy)};
 const self={id:12345,path:".github/workflows/"+DIRECT_WF,head_sha:sha,head_branch:"main",event:"workflow_dispatch",run_attempt:1,
  display_title:DIRECT_TITLE,status:"in_progress",conclusion:null,created_at:iso(start)};
 const response=(data,status=200)=>({ok:status===200,status,json:async()=>data});
 const wrap=xs=>response({total_count:xs.length,workflow_runs:xs});
 const options={now:()=>clock,sleep:async m=>{clock+=m;if(fault==="busy"&&clock>=start+MIN)for(const r of runs){r.status="completed";r.conclusion="success";}},
  readPlan:p=>plans.get(p),emit:e=>events.push(e),fetcher:async(url,opt)=>{
   calls.push({url,method:opt.method});const u=new URL(url),p=u.pathname,st=u.searchParams.get("status"),ev=u.searchParams.get("event");
   if(p.endsWith("/git/ref/heads/main"))return response({object:{sha:fault==="drift"?"c".repeat(40):sha}});
   if(p.endsWith("/actions/runs/"+self.id))return response(self);
   const route=P6_ROLLING_ROUTES.find(r=>p.includes("/workflows/"+r.workflow+"/"));
   if(opt.method==="POST"){
    assert(route);posts++;assert.deepEqual(JSON.parse(opt.body).inputs,{...route.inputs,...(route.lane==="RETENTION_MONITOR"?{approved_main_sha:sha}:{})});
    if(fault==="unknown")return response({},503);
    const id=++seq;
    runs.push({id,path:".github/workflows/"+route.workflow,head_branch:"main",head_sha:sha,event:"workflow_dispatch",
     run_attempt:1,status:fault==="busy"?"in_progress":"completed",conclusion:fault==="busy"?null:fault==="childFailure"?"failure":"success",created_at:iso(clock)});
    return response({workflow_run_id:id,run_url:root+"/actions/runs/"+id,html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/"+id});
   }
   const m=/\/actions\/runs\/(\d+)(\/jobs)?$/.exec(p);
   if(m){
    const r=runs.find(x=>x.id===Number(m[1]));assert(r);
    if(!m[2])return response(r);
    const jobs=P6_ROLLING_ROUTES.find(x=>r.path.endsWith("/"+x.workflow)).jobs.map((j,i)=>({id:r.id*10+i+1,run_id:r.id,head_sha:sha,run_attempt:1,
     name:j.name,status:"completed",conclusion:"success",steps:j.step?[{name:j.step,status:"completed",conclusion:"success"}]:
      j.parentOutcome?["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"].map(x=>({name:"Parent outcome "+x,status:"completed",conclusion:x==="NO_DUE_WORK"?"success":"skipped"})):[]}));
    return response({total_count:jobs.length,jobs});
   }
   if(p.endsWith("/workflows/"+DIRECT_WF+"/runs")){
    if(st==="in_progress")return wrap([self]);
    if(st==="failure"&&fault==="priorRootFailure")return wrap([{...self,id:11111,status:"completed",conclusion:"failure",created_at:iso(start-3.5*H)}]);
    if(st==="skipped"&&fault==="priorSkipped")return wrap([{...self,id:11111,status:"completed",conclusion:"skipped"}]);
    return wrap([]);
   }
   if(p.endsWith("/workflows/"+old+"/runs"))return wrap(fault==="oldActive"&&st==="in_progress"?[{...self,id:99999}]:[]);
   if(p.endsWith("/actions/runs"))return wrap([self,...runs].filter(r=>r.status===st));
   assert(route,p);
   if(st==="failure"&&route.lane==="SOURCE_POST"&&fault==="oldSourceFailure")
    return wrap([{id:11111,status:"completed",conclusion:"failure",created_at:iso(start-3.5*H)}]);
   if(st)return wrap([]);
   return wrap(runs.filter(r=>r.path.endsWith("/"+route.workflow)&&r.event===ev));
  }};
 return {env,options,events,calls,runs,posts:()=>posts};
}
test("existing signed calendar and routes prove one direct SOURCE wave without V0102/DB/provider",async()=>{
 const f=fixture();const out=await runDirectTick(f.env,f.options);
 assert.equal(out.status,"DIRECT_WAVE_TERMINAL_NOT_COLLECTION_PROOF");assert.equal(out.acknowledged,out.verifiedTerminal);
 assert(out.terminalAcknowledgements.some(r=>r.lane==="SOURCE_POST"));assert(out.terminalAcknowledgements.some(r=>r.lane==="DAILY_PREPARE"));
 assert.equal(out.providerCalls,0);assert.equal(out.databaseWrites,0);assert.equal(out.phase6PaidGo,false);
 assert.equal(new Set(f.runs.map(r=>r.path)).size,f.posts());assert(out.githubRequests<=420);
});
test("all required separate gates, dynamic root exclusion, and policy binding refuse before GET or POST",async()=>{
 for(const patch of [{V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},{P5_CD_GH_PRE_STOP:"1"},{P6_ROLLING_SESSION_APPROVED:"1"},
  {P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED:"1"},{P6_ROLLING_WINDOW_CUSTODY_ENABLED:"1"},{P6_ROLLING_SCHEDULED_ROOT_ENABLED:"1"},
  {P6_ROLLING_DIRECT_RECOVERY_APPROVED:"0"},{DATABASE_URL:"forbidden"},{P6_NONPAID_DAILY_POLICY_SHA256:"c".repeat(64)}]){
  const f=fixture();await assert.rejects(runDirectTick({...f.env,...patch},f.options),/HOLD_/);assert.equal(f.calls.length,0);
 }
});
test("prior unsuccessful root or SOURCE outside 3h preview still blocks without POST",async()=>{
 for(const fault of ["priorRootFailure","oldSourceFailure","priorSkipped","oldActive","drift"]){
  const f=fixture(fault);const r=await runDirectTick(f.env,f.options);assert.equal(r.status,"DIRECT_PREFLIGHT_HOLD_NO_POST");assert.equal(f.posts(),0);
 }
});
test("unknown target POST never retries, marks exact ambiguity and fails job",async()=>{
 const f=fixture("unknown");await assert.rejects(runDirectTick(f.env,f.options),/NO_REPLAY/);
 assert.equal(f.posts(),1);assert.equal(f.events.at(-1).status,"DISPATCH_ATTEMPT_BEFORE_ACK");
});
test("accepted failed parent cannot yield a terminal success",async()=>{
 const f=fixture("childFailure");await assert.rejects(runDirectTick(f.env,f.options),/NO_REPLAY/);assert(f.posts()>0);
});
test("known active parents settle before any successful tick receipt",async()=>{
 const f=fixture("busy");const r=await runDirectTick(f.env,f.options);
 assert.equal(r.status,"DIRECT_WAVE_TERMINAL_NOT_COLLECTION_PROOF");assert.equal(r.pending.length,0);assert.equal(r.verifiedTerminal,f.posts());
});
