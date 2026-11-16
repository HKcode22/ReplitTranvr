import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {runP6RollingSession} from "../scripts/v39_phase6_bounded_rolling_session_v39.mjs";
import {createP6SessionAckLedger,P6_ROLLING_ACK_CAPACITY} from "../server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs";
import {P6_ROLLING_ROUTES,planP6RollingTick,restrictP6RollingWave,dispatchP6ReviewedRollingWave} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const sha="a".repeat(40),hash="b".repeat(64),start=Date.parse("2030-01-02T00:00:00.000Z"),MIN=60000,H=60*MIN;
const iso=t=>new Date(t).toISOString(),digest=b=>createHash("sha256").update(b).digest("hex");
const WF="phase6-rolling-controller-bounded-session.yml";
function setup({failAck=false,duplicate=false,hideAccepted=false,hideFinal=false,chain=false,failSuccessor=false}={}){
 let clock=start,seq=1000,snapshots=0;const plans=new Map(),runs=[],calls=[],events=[];
 const pins=Array.from({length:31},(_,i)=>{
  const service=start+(4+i*4)*24*H,templates=[];
  for(const [horizon,off] of [["T-24h",24*H],["T-6h",6*H],["T-90m",90*MIN]])for(let slot=0;slot<4;slot++)
   templates.push({queryKey:"d"+i+"."+horizon+"."+slot,runDayIndex:i+1,horizon,serviceWindowStartUtc:iso(service),
    serviceWindowEndUtc:iso(service+4*H),earliestPlannedCutoffUtc:iso(service-off),scheduledRequestUtc:iso(service-off-15*MIN)});
  const bytes=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:i+1,expectedServiceStartUtc:iso(service),templates}));
  plans.set("data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json",bytes);
  return{runDayIndex:i+1,sha256:digest(bytes)};
 });
 const b=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,
  approvedCodeSha:sha,manifestSha256:hash,calendarSha256:hash,releaseSha256:hash,rightsSha256:hash,dayPlanSha256s:pins,
  validFromUtc:iso(start-24*H),validUntilUtc:iso(start+140*24*H)}));
 const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"12345",GITHUB_SHA:sha,P6_ROLLING_REQUESTED_MAIN_SHA:sha,V39_P5_APPROVED_CODE_SHA:sha,
  P6_ROLLING_SESSION_CONFIRM:"RUN_ONE_PROTECTED_ROLLING_SESSION_AFTER_SEPARATE_PHASE6_GO",
  P6_ROLLING_CONTROLLER_ENABLED:"1",P6_ROLLING_SESSION_APPROVED:"1",V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_P5_SEVEN_REST_BUDGET_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",V39_PHASE6_OWNER_APPROVED:"1",P5_CD_GH_PRE_STOP:"0",
  ADB_AUTO_COLLECT:"0",GITHUB_TOKEN:"synthetic-test-token-no-access",P6_ROLLING_SESSION_EPOCH_UTC:iso(start),
  P6_ROLLING_SESSION_DEADLINE_UTC:iso(start+30*MIN),V39_P5_MANIFEST_SHA256:hash,V39_P5_CALENDAR_HASH:hash,
  V39_P5_RELEASE_SHA256:hash,V39_P5_RIGHTS_SHA256:hash,P6_NONPAID_DAILY_POLICY_BASE64:b.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:digest(b)};
 const root={id:12345,path:".github/workflows/"+WF,head_sha:sha,head_branch:"main",event:"workflow_dispatch",
  run_attempt:1,status:"in_progress",conclusion:null,created_at:iso(start)};
 const controllerRuns=[root];let savedReceipt;
 if(chain){
  Object.assign(env,{P6_ROLLING_SESSION_CONFIRM:"RUN_TWO_PROTECTED_ROLLING_SESSIONS_AFTER_SEPARATE_PHASE6_GO",
   P6_ROLLING_CHAIN_APPROVED:"1",P6_ROLLING_CHAIN_HOP:"0",P6_ROLLING_PARENT_RUN_ID:"0",P6_ROLLING_SENT_AT_UTC:"",
   P6_ROLLING_SESSION_DEADLINE_UTC:iso(start+60*MIN)});
  root.display_title="P6 ROLLING CHAIN 0 0";
 }
 const response=(data,status=200)=>({ok:status===200,status,json:async()=>data});
 const options={now:()=>clock,sleep:async m=>{clock+=m;},readPlan:p=>plans.get(p),emit:e=>events.push(e),
  readReceipt:async()=>savedReceipt,
  fetcher:async(url,opt)=>{
   const u=new URL(url);calls.push({url,method:opt.method});
   if(u.pathname.endsWith("/git/ref/heads/main"))return response({object:{sha}});
   if(u.pathname.endsWith("/workflows/"+WF+"/runs"))return response({total_count:duplicate?2:controllerRuns.length,workflow_runs:duplicate?[root,{...root,id:22222}]:controllerRuns});
   if(u.pathname.endsWith("/workflows/"+WF+"/dispatches")){
    assert.equal(opt.method,"POST");const input=JSON.parse(opt.body).inputs;
    assert.equal(input.chain_hop,"1");assert.equal(input.parent_run_id,"12345");
    if(failSuccessor)return response({},204);
    controllerRuns.push({...root,id:12346,status:"queued",created_at:iso(clock),display_title:"P6 ROLLING CHAIN 1 12345"});
    return response({workflow_run_id:12346,run_url:"https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/12346",
     html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/12346"});
   }
   if(u.pathname.endsWith("/actions/runs/12345"))return response(root);
   if(u.pathname.endsWith("/actions/runs/12345/jobs"))return response({total_count:1,jobs:[{name:"one-protected-bounded-session",
    status:"completed",conclusion:"success",steps:["Execute one protected rolling session and reconcile accepted workers before terminal",
     "Preserve terminal operational receipt for independently reviewed continuation"].map(name=>({name,status:"completed",conclusion:"success"}))}]});
   if(u.pathname.endsWith("/actions/runs/12345/artifacts"))return response({total_count:1,artifacts:[{id:444,name:"p6-rolling-terminal-12345",
    expired:false,size_in_bytes:512}]});
   if(opt.method==="POST"){
    if(failAck)return response({},204);
    const route=P6_ROLLING_ROUTES.find(r=>u.pathname.endsWith("/workflows/"+r.workflow+"/dispatches"));
    assert(route);const id=++seq;
    runs.push({id,path:".github/workflows/"+route.workflow,head_branch:"main",head_sha:sha,event:"workflow_dispatch",
     run_attempt:1,status:"completed",conclusion:"success",created_at:iso(clock)});
    return response({workflow_run_id:id,run_url:"https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/"+id,
     html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/"+id});
   }
   const direct=/\/actions\/runs\/(\d+)(\/jobs)?$/.exec(u.pathname);
   if(direct){
    const row=runs.find(x=>x.id===Number(direct[1]));assert(row);
    if(!direct[2])return response(row);
    const route=P6_ROLLING_ROUTES.find(x=>row.path.endsWith("/"+x.workflow));
    const jobs=route.jobs.map(j=>({name:j.name,status:"completed",conclusion:"success",steps:j.step?[{name:j.step,status:"completed",conclusion:"success"}]:[]}));
    return response({total_count:jobs.length,jobs});
   }
   if(u.pathname.endsWith("/actions/runs"))return response({total_count:0,workflow_runs:[]});
   const route=P6_ROLLING_ROUTES.find(r=>u.pathname.endsWith("/workflows/"+r.workflow+"/runs"));assert(route);
   if(route.lane==="SOURCE_POST"&&u.searchParams.get("event")==="schedule")snapshots++;
   const selected=runs.filter(x=>x.path.endsWith("/"+route.workflow)&&x.event===u.searchParams.get("event")&&!((hideAccepted||(hideFinal&&snapshots>=9))&&route.lane==="PRE_RECOVERY"));
   return response({total_count:selected.length,workflow_runs:selected});
  }};
 return {env,options,runs,calls,events,controllerRuns,root,startSuccessor(receipt){savedReceipt=receipt;clock+=30000;
  root.status="completed";root.conclusion="success";controllerRuns[1].status="in_progress";
  Object.assign(env,{GITHUB_RUN_ID:"12346",P6_ROLLING_CHAIN_HOP:"1",P6_ROLLING_PARENT_RUN_ID:"12345",
   P6_ROLLING_SENT_AT_UTC:receipt.nextDispatchAtUtc});
 }};
}
test("protected bounded session uses calendar to defer six idle lanes and reconciles every actual-shaped ACK",async()=>{
 const f=setup(),out=await runP6RollingSession(f.env,f.options);
 assert.equal(out.status,"BOUNDED_SESSION_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF");
 assert.equal(out.waves,8);
 assert.equal(out.acknowledged,out.verifiedTerminal);assert.equal(out.pending.length,0);
 assert.equal(out.capacityDeferred,0);assert.equal(out.ackCapacityExhausted,false);
 assert.equal(out.remainingDispatchCapacity,P6_ROLLING_ACK_CAPACITY-out.acknowledged);
 assert(out.acknowledged>=2);assert(out.calendarDeferred>0);
 assert(f.runs.every(x=>x.path.includes("lease-watchdog")||x.path.includes("retention-readonly")));
 assert.equal(out.providerCalls,0);assert.equal(out.databaseWrites,0);
 assert(f.calls.length<=450);
 assert.match(out.policyCommitment,/^[a-f0-9]{64}$/);
 assert.equal(out.terminalAcknowledgements.length,out.acknowledged);
 assert.deepEqual(out.terminalAcknowledgements.map(x=>x.runId),f.runs.map(x=>x.id).sort((a,b)=>a-b));
});
test("no GO, wrong SHA, unknown previous root or missing policy refuses before dispatch",async()=>{
 const f=setup();
 for(const patch of [{P6_ROLLING_CONTROLLER_ENABLED:"0"},{V39_PHASE6_PROCESS_ARMED:"0"},{V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {P6_NONPAID_DAILY_POLICY_SHA256:"c".repeat(64)},{P5_CD_GH_PRE_STOP:"1"},{AERODATABOX_API_KEY:"forbidden"}])
  await assert.rejects(runP6RollingSession({...f.env,...patch},f.options),/HOLD_P6_ROLLING/);
 assert.equal(f.calls.length,0);
 const d=setup({duplicate:true});
 await assert.rejects(runP6RollingSession(d.env,d.options),/PREVIOUS_OR_DUPLICATE_SESSION/);
 assert.equal(d.calls.filter(x=>x.method==="POST").length,0);
});
test("unknown ACK stops at the first POST, leaves explicit attempt evidence, never auto-replays",async()=>{
 const f=setup({failAck:true});
 await assert.rejects(runP6RollingSession(f.env,f.options),/UNKNOWN_DISPATCH_STOP_NO_RETRY/);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,1);
 assert.equal(f.events.at(-1).status,"DISPATCH_ATTEMPT_BEFORE_ACK");
});
test("calendar narrowing can't add a lane or erase blocked status",()=>{
 const snaps=P6_ROLLING_ROUTES.map(r=>({workflow:r.workflow,complete:true,runs:[],active:[],jobs:[]}));
 const ctx={sha,epoch:start,clock:start};
 const plan=planP6RollingTick(snaps,ctx),n=restrictP6RollingWave(plan,["T24"]);
 assert.deepEqual(n.due,["T24"]);assert.equal(n.calendarDeferred.length,7);
 assert.throws(()=>restrictP6RollingWave(plan,["SOURCE_POST"]),/UNREVIEWED/);
 assert.throws(()=>restrictP6RollingWave(n,["UNKNOWN"]),/UNREVIEWED/);
});

test("a known ACK absent from one lane's listing defers every new wave without another POST",async()=>{
 const f=setup({hideAccepted:true});
 await assert.rejects(runP6RollingSession(f.env,f.options),/ACK_HISTORY_VISIBILITY_UNRESOLVED_NO_SUCCESSOR/);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,2);
 assert(f.events.some(e=>e.status==="ROLLING_WAVE_DEFERRED_ACK_VISIBILITY_NO_DISPATCH"));
 assert.equal(f.events.filter(e=>e.status==="DISPATCH_ATTEMPT_BEFORE_ACK").length,2);
});

test("final history omission after ordinary waves prevents continuation receipt",async()=>{
 const f=setup({hideFinal:true});
 await assert.rejects(runP6RollingSession(f.env,f.options),/ACK_NOT_VISIBLE_IN_EXACT_HISTORY/);
 assert(f.calls.filter(x=>x.method==="POST").length>=2);
});

test("two protected sessions preserve original epoch and independently replay only prior ACK readback",async()=>{
 const f=setup({chain:true}),first=await runP6RollingSession(f.env,f.options);
 assert.equal(first.status,"BOUNDED_SESSION_SUCCESSOR_ACKNOWLEDGED_NOT_COLLECTION_PROOF");
 assert.equal(first.nextRunId,12346);assert.equal(first.successorDispatches,1);
 const firstIds=first.terminalAcknowledgements.map(x=>x.runId);
 f.startSuccessor(first);
 const second=await runP6RollingSession(f.env,f.options);
 assert.equal(second.status,"BOUNDED_CHAIN_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF");
 assert.equal(second.epochUtc,first.epochUtc);assert.equal(second.chainDeadlineUtc,first.chainDeadlineUtc);
 assert.equal(second.policyCommitment,first.policyCommitment);assert.equal(second.successorDispatches,0);
 assert.equal(f.calls.filter(x=>x.method==="POST"&&x.url.includes("/workflows/"+WF+"/dispatches")).length,1);
 assert(firstIds.every(id=>second.terminalAcknowledgements.some(x=>x.runId===id)));
 assert.equal(second.terminalAcknowledgements.length,f.runs.length);
 assert.equal(second.unknownAttempts+second.pending.length,0);
});
test("unapproved chain, unknown successor ACK and mismatched predecessor receipt never proceed",async()=>{
 const x=setup({chain:true});
 await assert.rejects(runP6RollingSession({...x.env,P6_ROLLING_CHAIN_APPROVED:"0"},x.options),/NO_BOUNDED_CHAIN_APPROVAL/);
 assert.equal(x.calls.length,0);
 const y=setup({chain:true,failSuccessor:true});
 await assert.rejects(runP6RollingSession(y.env,y.options),/CHAIN_UNKNOWN_SUCCESSOR_ACK_NO_REPLAY/);
 assert.equal(y.calls.filter(x=>x.method==="POST"&&x.url.includes("/workflows/"+WF+"/dispatches")).length,1);
 const z=setup({chain:true}),first=await runP6RollingSession(z.env,z.options);
 z.startSuccessor({...first,policyCommitment:"c".repeat(64)});
 const before=z.calls.filter(x=>x.method==="POST").length;
 await assert.rejects(runP6RollingSession(z.env,z.options),/CHAIN_RECEIPT_ACK_OR_POLICY_MISMATCH/);
 assert.equal(z.calls.filter(x=>x.method==="POST").length,before);
});

test("dispatch core cannot POST when ledger tracking capacity is exhausted, even if an unbounded plan was passed",async()=>{
 const prior=Array.from({length:P6_ROLLING_ACK_CAPACITY},(_,i)=>({
  lane:"LATER_PRE",runId:30000+i,sentAtUtc:iso(start-1000)}));
 const ledger=createP6SessionAckLedger({sha,epoch:start-2000,deadline:start+10*MIN,now:()=>start,priorAcknowledgements:prior});
 const snapshots=P6_ROLLING_ROUTES.map(r=>({workflow:r.workflow,complete:true,runs:[],active:[],jobs:[]}));
 const p=restrictP6RollingWave(planP6RollingTick(snapshots,{sha,epoch:start-2000,clock:start}),["PRE_RECOVERY"]);
 let posts=0;
 await assert.rejects(dispatchP6ReviewedRollingWave(p,{sha,approvedSha:sha,releaseApproved:true,
  token:"synthetic-test-token-no-access",deadline:start+2*MIN,now:()=>start,
  recheckRoute:async r=>snapshots.find(x=>x.workflow===r.workflow),onEvidence:ledger.evidence,
  fetcher:async(_u,o)=>{if(o.method==="POST")posts++;return {ok:true,json:async()=>({object:{sha}})};}
 }),/ACK_CAPACITY_EXHAUSTED_BEFORE_POST/);
 assert.equal(posts,0);assert.equal(ledger.status().unknownAttempts,0);
});
