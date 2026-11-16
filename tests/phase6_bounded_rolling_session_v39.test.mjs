import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createP6RollingFailureJournal} from "../scripts/v39_phase6_rolling_failure_journal_v39.mjs";
import {parseP6RollingFailureCustody,reconcileP6FailureCustody} from "../server/lib/disruption/phase6RollingFailureCustodyReadback_v39.mjs";
import {verifyP6RollingWindowTerminalEvidence} from "../server/lib/disruption/phase6RollingWindowTerminalEvidence_v39.mjs";
import {runP6RollingSession} from "../scripts/v39_phase6_bounded_rolling_session_v39.mjs";
import {createP6SessionAckLedger,P6_ROLLING_ACK_CAPACITY} from "../server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs";
import {P6_ROLLING_ROUTES,planP6RollingTick,restrictP6RollingWave,dispatchP6ReviewedRollingWave} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const sha="a".repeat(40),hash="b".repeat(64),start=Date.parse("2030-01-02T00:00:00.000Z"),MIN=60000,H=60*MIN;
const iso=t=>new Date(t).toISOString(),digest=b=>createHash("sha256").update(b).digest("hex");
const WF="phase6-rolling-controller-bounded-session.yml";
function setup({failAck=false,duplicate=false,hideAccepted=false,hideFinal=false,hideFinalOnce=false,hideOrdinaryUntilClosing=false,chain=false,failSuccessor=false,carryActive=false,rollover=false,delayedRetention=false,busyCalendar=false,multi=false}={}){
 let clock=start,seq=1000,snapshots=0,finishAt=Infinity;const plans=new Map(),runs=[],calls=[],events=[];
 const pins=Array.from({length:31},(_,i)=>{
  const service=start+(busyCalendar?(i===0?90*MIN:(24+(i-1)*24)*H):(4+i*4)*24*H),templates=[];
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
 if(delayedRetention){
  const route=P6_ROLLING_ROUTES.find(r=>r.lane==="RETENTION_MONITOR");
  runs.push({id:900,path:".github/workflows/"+route.workflow,head_branch:"main",head_sha:sha,event:"workflow_dispatch",
   run_attempt:1,status:"in_progress",conclusion:null,created_at:iso(start-2*H)});
  finishAt=start+8*MIN;
 }
 if(chain){
  Object.assign(env,{P6_ROLLING_SESSION_CONFIRM:"RUN_TWO_PROTECTED_ROLLING_SESSIONS_AFTER_SEPARATE_PHASE6_GO",
   P6_ROLLING_CHAIN_APPROVED:"1",P6_ROLLING_CHAIN_HOP:"0",P6_ROLLING_PARENT_RUN_ID:"0",P6_ROLLING_SENT_AT_UTC:"",
   P6_ROLLING_SESSION_DEADLINE_UTC:iso(start+60*MIN)});
  root.display_title="P6 ROLLING CHAIN 0 0";
  if(rollover)Object.assign(env,{P6_ROLLING_SESSION_CONFIRM:"RUN_TWO_PROTECTED_ROLLING_SESSIONS_WITH_REVIEWED_HISTORY_RETIREMENT_AFTER_SEPARATE_PHASE6_GO",
   P6_ROLLING_HISTORY_RETIREMENT_APPROVED:"1"});
  if(multi)Object.assign(env,{P6_ROLLING_SESSION_CONFIRM:"RUN_UP_TO_FOUR_PROTECTED_ROLLING_SESSIONS_AFTER_SEPARATE_PHASE6_GO",P6_ROLLING_HISTORY_RETIREMENT_APPROVED:"1",P6_ROLLING_FOUR_SESSION_APPROVED:"1",P6_ROLLING_SESSION_DEADLINE_UTC:iso(start+120*MIN)});
 }
 const response=(data,status=200)=>({ok:status===200,status,json:async()=>data});
 const options={now:()=>clock,sleep:async m=>{
  clock+=m;
  if(clock>=finishAt)for(const row of runs.filter(x=>x.status==="in_progress")){row.status="completed";row.conclusion="success";}
 },readPlan:p=>plans.get(p),emit:e=>events.push(e),
  readReceipt:async()=>savedReceipt,
  fetcher:async(url,opt)=>{
   const u=new URL(url);calls.push({url,method:opt.method});
   if(u.pathname.endsWith("/git/ref/heads/main"))return response({object:{sha}});
   if(u.pathname.endsWith("/workflows/"+WF+"/runs"))return response({total_count:duplicate?2:controllerRuns.length,workflow_runs:duplicate?[root,{...root,id:22222}]:controllerRuns});
   if(u.pathname.endsWith("/workflows/"+WF+"/dispatches")){
    assert.equal(opt.method,"POST");const input=JSON.parse(opt.body).inputs;
    const hop=Number(env.P6_ROLLING_CHAIN_HOP)+1,parentId=Number(env.GITHUB_RUN_ID),nextId=parentId+1;
    assert.equal(input.chain_hop,String(hop));assert.equal(input.parent_run_id,String(parentId));
    assert.equal(input.confirm,env.P6_ROLLING_SESSION_CONFIRM);
    if(failSuccessor)return response({},204);
    controllerRuns.push({...root,id:nextId,status:"queued",conclusion:null,created_at:iso(clock),display_title:"P6 ROLLING CHAIN "+hop+" "+parentId});
    return response({workflow_run_id:nextId,run_url:"https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/"+nextId,
     html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/"+nextId});
   }
   const pred=Number(env.P6_ROLLING_PARENT_RUN_ID??"0");
   if(pred&&u.pathname.endsWith("/actions/runs/"+pred))return response(controllerRuns.find(x=>x.id===pred));
   if(pred&&u.pathname.endsWith("/actions/runs/"+pred+"/jobs"))return response({total_count:1,jobs:[{id:pred*10+1,run_id:pred,head_sha:sha,run_attempt:1,name:"one-protected-bounded-session",
    status:"completed",conclusion:"success",steps:["Execute one protected rolling session and reconcile accepted workers before terminal",
     "Preserve terminal operational receipt for independently reviewed continuation"].map(name=>({name,status:"completed",conclusion:"success"}))}]});
   if(pred&&u.pathname.endsWith("/actions/runs/"+pred+"/artifacts"))return response({total_count:1,artifacts:[{id:444,name:"p6-rolling-terminal-"+pred,
    expired:false,size_in_bytes:512}]});
   if(opt.method==="POST"){
    if(failAck)return response({},204);
    const route=P6_ROLLING_ROUTES.find(r=>u.pathname.endsWith("/workflows/"+r.workflow+"/dispatches"));
    assert(route);const id=++seq;
    const busy=carryActive&&route.lane==="RETENTION_MONITOR";
    runs.push({id,path:".github/workflows/"+route.workflow,head_branch:"main",head_sha:sha,event:"workflow_dispatch",
     run_attempt:1,status:busy?"in_progress":"completed",conclusion:busy?null:"success",created_at:iso(clock)});
    return response({workflow_run_id:id,run_url:"https://api.github.com/repos/HKcode22/ReplitTranvr/actions/runs/"+id,
     html_url:"https://github.com/HKcode22/ReplitTranvr/actions/runs/"+id});
   }
   const direct=/\/actions\/runs\/(\d+)(\/jobs)?$/.exec(u.pathname);
   if(direct){
    const row=runs.find(x=>x.id===Number(direct[1]));assert(row);
    if(!direct[2])return response(row);
    const route=P6_ROLLING_ROUTES.find(x=>row.path.endsWith("/"+x.workflow));
    const jobs=route.jobs.map((j,i)=>({id:row.id*10+i+1,run_id:row.id,run_attempt:1,head_sha:sha,name:j.name,status:"completed",conclusion:"success",steps:j.step?[{name:j.step,status:"completed",conclusion:"success"}]:j.parentOutcome?["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"].map(x=>({name:"Parent outcome "+x,status:"completed",conclusion:x==="NO_DUE_WORK"?"success":"skipped"})):[]}));
    return response({total_count:jobs.length,jobs});
   }
   if(u.pathname.endsWith("/actions/runs")){
    const selected=runs.filter(x=>x.status===u.searchParams.get("status"));
    return response({total_count:selected.length,workflow_runs:selected});
   }
   const route=P6_ROLLING_ROUTES.find(r=>u.pathname.endsWith("/workflows/"+r.workflow+"/runs"));assert(route);
   if(route.lane==="SOURCE_POST"&&u.searchParams.get("event")==="schedule")snapshots++;
   const boundary=u.searchParams.get("created");
   const from=boundary?.split("..")[0];
   const selected=runs.filter(x=>x.path.endsWith("/"+route.workflow)&&x.event===u.searchParams.get("event")&&
    (!from||Date.parse(x.created_at)>=Date.parse(from))&&!((hideAccepted||(hideFinal&&snapshots>=9)||(hideFinalOnce&&snapshots===9)||(hideOrdinaryUntilClosing&&snapshots>=2&&snapshots<=8))&&route.lane==="PRE_RECOVERY"));
   return response({total_count:selected.length,workflow_runs:selected});
  }};
 return {env,options,runs,calls,events,controllerRuns,root,get finishAt(){return finishAt;},startSuccessor(receipt){savedReceipt=receipt;clock+=30000;
  if(carryActive)finishAt=clock+8*MIN;
  const predecessor=controllerRuns.find(x=>x.id===Number(env.GITHUB_RUN_ID));
  const successor=controllerRuns.find(x=>x.id===receipt.nextRunId);
  predecessor.status="completed";predecessor.conclusion="success";successor.status="in_progress";
  Object.assign(env,{GITHUB_RUN_ID:String(successor.id),P6_ROLLING_CHAIN_HOP:String(Number(env.P6_ROLLING_CHAIN_HOP)+1),P6_ROLLING_PARENT_RUN_ID:String(predecessor.id),
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

test("ordinary visibility HOLD clears only after fresh complete closing history without any new worker POST",async()=>{
 const f=setup({hideOrdinaryUntilClosing:true,chain:true});
 const out=await runP6RollingSession(f.env,f.options);
 assert.equal(out.status,"BOUNDED_SESSION_SUCCESSOR_ACKNOWLEDGED_NOT_COLLECTION_PROOF");
 assert(out.visibilityDeferrals>0);
 assert(f.events.some(e=>e.status==="CLOSING_ACK_VISIBILITY_RECOVERED_NO_NEW_WORKER_POST"));
 assert.equal(out.acknowledged,2);
 assert.equal(out.acknowledged,out.verifiedTerminal);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,3);
 assert.equal(out.successorDispatches,1);
});
test("transient final terminal ACK omission recovers with GET-only closing readback",async()=>{
 const f=setup({hideFinalOnce:true});
 const out=await runP6RollingSession(f.env,f.options);
 assert.equal(out.status,"BOUNDED_SESSION_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF");
 assert.equal(out.acknowledged,out.verifiedTerminal);
 assert.equal(out.pending.length,0);
 assert.equal(out.unknownAttempts,0);
 assert(f.events.some(e=>e.status==="CLOSING_TERMINAL_ACK_READBACK_DEFERRED_NO_POST"));
 assert.equal(f.calls.filter(x=>x.method==="POST").length,out.acknowledged);
 assert(f.calls.length<=450);
});
test("transient final omission in protected chain restores exact ACK custody before successor",async()=>{
 const f=setup({hideFinalOnce:true,chain:true});
 const out=await runP6RollingSession(f.env,f.options);
 assert.equal(out.status,"BOUNDED_SESSION_SUCCESSOR_ACKNOWLEDGED_NOT_COLLECTION_PROOF");
 assert.equal(out.acknowledged,out.verifiedTerminal);
 assert(f.events.some(e=>e.status==="CLOSING_TERMINAL_ACK_READBACK_DEFERRED_NO_POST"));
 assert.equal(f.calls.filter(x=>x.method==="POST").length,out.acknowledged+1);
 assert.equal(out.successorDispatches,1);
 assert(f.calls.length<=450);
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

test("approved first chain session carries a known active worker while unrelated work continues, then final drains",async()=>{
 const f=setup({chain:true,carryActive:true}),first=await runP6RollingSession(f.env,f.options);
 assert.equal(first.status,"BOUNDED_SESSION_SUCCESSOR_ACKNOWLEDGED_NOT_COLLECTION_PROOF");
 assert.equal(first.pending.length,1);
 assert.equal(first.pendingAcknowledgements.length,1);
 assert.equal(first.pendingAcknowledgements[0].lane,"RETENTION_MONITOR");
 assert.equal(first.verifiedTerminal+1,first.acknowledged);
 const pendingId=first.pendingAcknowledgements[0].runId;
 const priorIds=new Set(f.runs.map(x=>x.id));
 f.startSuccessor(first);
 const second=await runP6RollingSession(f.env,f.options);
 assert.equal(second.status,"BOUNDED_CHAIN_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF");
 assert.equal(second.epochUtc,first.epochUtc);
 assert.equal(second.pending.length,0);
 assert.equal(second.pendingAcknowledgements.length,0);
 assert(second.terminalAcknowledgements.some(x=>x.runId===pendingId));
 assert.equal(f.runs.filter(x=>x.path.includes("retention-readonly")).length,1);
 assert(f.runs.some(x=>!priorIds.has(x.id)&&x.path.includes("lease-watchdog")&&Date.parse(x.created_at)<f.finishAt));
 assert.equal(second.acknowledged,second.verifiedTerminal);
});
test("pending receipt partition drift refuses successor before any new worker dispatch",async()=>{
 const f=setup({chain:true,carryActive:true}),first=await runP6RollingSession(f.env,f.options);
 f.startSuccessor({...first,pendingAcknowledgements:[{...first.pendingAcknowledgements[0],lane:"LATER_PRE"}]});
 const posts=f.calls.filter(x=>x.method==="POST").length;
 await assert.rejects(runP6RollingSession(f.env,f.options),/CHAIN_RECEIPT_ACK_OR_POLICY_MISMATCH/);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,posts);
});

test("protected retirement rehearsal requires separate approval and keeps original chain deadline",async()=>{
 const f=setup({chain:true,rollover:true});
 await assert.rejects(runP6RollingSession({...f.env,P6_ROLLING_HISTORY_RETIREMENT_APPROVED:"0"},f.options),/NO_PROTECTED_RETIREMENT_APPROVAL/);
 assert.equal(f.calls.length,0);
 const first=await runP6RollingSession(f.env,f.options);
 assert.equal(first.historyRetirementCandidate.status,"RETIREMENT_NO_ADVANCE_KEEP_PRIOR_EPOCH");
 f.startSuccessor(first);const second=await runP6RollingSession(f.env,f.options);
 assert.equal(second.historyEpochUtc,first.epochUtc);
 assert.equal(second.chainDeadlineUtc,first.chainDeadlineUtc);
 assert.equal(second.historyRetirementAudit.status,"RETIREMENT_NO_ADVANCE_KEEP_PRIOR_EPOCH");
 assert(first.terminalAcknowledgements.every(x=>second.terminalAcknowledgements.some(y=>y.runId===x.runId)));
});
test("protected successor actually retires independently proved old ACK and reuses working capacity without moving root or deadline",async()=>{
 const f=setup({chain:true,rollover:true,delayedRetention:true});
 const first=await runP6RollingSession(f.env,f.options),p=first.historyRetirementCandidate;
 assert.equal(p.status,"REVIEWED_RETIREMENT_CANDIDATE_NO_GO");
 assert(Date.parse(p.proposedEpochUtc)>Date.parse(first.epochUtc));
 assert(p.retiredRunCount>=1);
 f.startSuccessor(first);
 const second=await runP6RollingSession(f.env,f.options);
 assert.equal(second.epochUtc,first.epochUtc);assert.equal(second.chainDeadlineUtc,first.chainDeadlineUtc);
 assert.equal(second.historyEpochUtc,p.proposedEpochUtc);
 const part=second.historyRetirementAudit;
 assert(part.retiredAcknowledgements.length>=1);
 assert(part.retiredAcknowledgements.every(x=>first.terminalAcknowledgements.some(y=>y.runId===x.runId)));
 assert(part.retiredAcknowledgements.every(x=>!second.terminalAcknowledgements.some(y=>y.runId===x.runId)));
 assert.equal(second.unknownAttempts+second.pending.length,0);
 assert.equal(second.successorDispatches,0);
 assert(f.events.some(x=>x.status==="CHAIN_WORKING_HISTORY_RETIREMENT_INDEPENDENTLY_VERIFIED_NO_NEW_PERMISSION"));
});
test("tampered retired prefix stops protected successor before any new POST",async()=>{
 const f=setup({chain:true,rollover:true,delayedRetention:true}),first=await runP6RollingSession(f.env,f.options);
 f.startSuccessor({...first,historyRetirementCandidate:{...first.historyRetirementCandidate,retiredHistorySha256:"f".repeat(64)}});
 const posts=f.calls.filter(x=>x.method==="POST").length;
 await assert.rejects(runP6RollingSession(f.env,f.options),/RETIREMENT_PREFIX_CHANGED_NO_REPLAY/);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,posts);
});

test("retirement mode mismatch or malformed no-advance receipt refuses continuation without POST",async()=>{
 const f=setup({chain:true,rollover:true}),first=await runP6RollingSession(f.env,f.options);
 assert.equal(first.historyRetirementCandidate.status,"RETIREMENT_NO_ADVANCE_KEEP_PRIOR_EPOCH");
 f.startSuccessor({...first,historyRetirementCandidate:{...first.historyRetirementCandidate,
  proposedEpochUtc:iso(start+MIN)}});
 const posts=f.calls.filter(x=>x.method==="POST").length;
 await assert.rejects(runP6RollingSession(f.env,f.options),/CHAIN_RETIREMENT_RECEIPT_SCOPE/);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,posts);
});


test("busy eight-lane calendar preserves readback headroom and emits terminal ACKs rather than exhausting the hard cap",async()=>{
 const f=setup({busyCalendar:true}),out=await runP6RollingSession(f.env,f.options);
 assert.equal(out.status,"BOUNDED_SESSION_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF");
 assert.equal(out.requestBudgetStop,true);assert(out.waves<8);
 assert.equal(out.pending.length+out.unknownAttempts,0);
 assert.equal(out.acknowledged,out.verifiedTerminal);
 assert.equal(out.terminalAcknowledgements.length,f.runs.length);
 assert.equal(new Set(f.runs.map(x=>x.path)).size,8);
 assert(f.calls.length<=450);
});

test("request-budget admission can defer after a fresh route read without writing an attempt marker or POST",async()=>{
 const snaps=P6_ROLLING_ROUTES.map(r=>({workflow:r.workflow,complete:true,runs:[],active:[],jobs:[]}));
 const p=restrictP6RollingWave(planP6RollingTick(snaps,{sha,epoch:start,clock:start}),["PRE_RECOVERY"]);
 let calls=0,checks=0,attempts=0;
 const result=await dispatchP6ReviewedRollingWave(p,{sha,approvedSha:sha,releaseApproved:true,token:"synthetic-test-token-no-access",
  deadline:start+2*MIN,now:()=>start,recheckRoute:async r=>snaps.find(x=>x.workflow===r.workflow),
  onEvidence:()=>attempts++,mayStartAttempt:()=>++checks===1,fetcher:async(_url,opt)=>{calls++;assert.equal(opt.method,"GET");return{ok:true,json:async()=>({object:{sha}})};}});
 assert.equal(attempts,0);assert.equal(calls,1);assert.equal(result.dispatchCount,0);
 assert.deepEqual(result.requestBudgetDeferred,["PRE_RECOVERY"]);
});


test("separately approved four-session chain keeps fixed policy and root with independently checked working history",async()=>{
 const f=setup({chain:true,multi:true,delayedRetention:true});
 await assert.rejects(runP6RollingSession({...f.env,P6_ROLLING_FOUR_SESSION_APPROVED:"0"},f.options),/NO_PROTECTED_FOUR_SESSION_APPROVAL/);
 assert.equal(f.calls.length,0);
 const receipts=[];
 for(let i=0;i<4;i++){
   const out=await runP6RollingSession(f.env,f.options);receipts.push(out);
   assert.equal(out.sessionHop,i);assert.equal(out.maxSessionHops,4);assert.equal(out.epochUtc,iso(start));
   assert.equal(out.chainDeadlineUtc,iso(start+120*MIN));assert.equal(out.policyCommitment,receipts[0].policyCommitment);
   assert.equal(out.unknownAttempts,0);
   if(i<3){assert.equal(out.successorDispatches,1);f.startSuccessor(out);}
   else assert.equal(out.successorDispatches,0);
 }
 assert.equal(f.calls.filter(x=>x.method==="POST"&&x.url.includes("/workflows/"+WF+"/dispatches")).length,3);
 assert(receipts.slice(1).every((x,i)=>Date.parse(x.historyEpochUtc)>=Date.parse(receipts[i].historyEpochUtc)));
 assert(Date.parse(receipts[3].historyEpochUtc)>Date.parse(receipts[0].historyEpochUtc));
 assert.equal(receipts[3].pending.length,0);
});

test("third session rejects a broken earlier ancestor chain before new dispatch",async()=>{
 const f=setup({chain:true,multi:true});const one=await runP6RollingSession(f.env,f.options);f.startSuccessor(one);
 const two=await runP6RollingSession(f.env,f.options);f.startSuccessor(two);
 f.root.display_title="P6 ROLLING CHAIN 0 99999";
 const posts=f.calls.filter(x=>x.method==="POST").length;
 await assert.rejects(runP6RollingSession(f.env,f.options),/CHAIN_ANCESTOR_IDENTITY/);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,posts);
});


test("successor rejects predecessor job evidence from a different run before new dispatch",async()=>{
 const f=setup({chain:true,multi:true}),first=await runP6RollingSession(f.env,f.options);f.startSuccessor(first);
 const upstream=f.options.fetcher,posts=f.calls.filter(x=>x.method==="POST").length;
 f.options.fetcher=async(url,opt)=>{
  const res=await upstream(url,opt);
  if(url.includes("/actions/runs/12345/jobs?")){const body=await res.json();body.jobs[0].run_id=99999;return {...res,json:async()=>body};}
  return res;
 };
 await assert.rejects(runP6RollingSession(f.env,f.options),/CHAIN_PARENT_JOB/);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,posts);
});

test("integrated worker failure custody is written before the real-shaped POST and no unknown ACK is manufactured",async()=>{
 const f=setup({failAck:true}),dir=mkdtempSync(join(tmpdir(),"p6-rolling-integration-")),p=join(dir,"journal.jsonl");
 const j=createP6RollingFailureJournal(p,{id:12345,sha,epoch:start,chainDeadline:start+30*MIN,hop:0,parent:0});
 try{
  const original=f.options.fetcher;
  f.options.emit=e=>j.record(e);
  f.options.fetcher=async(url,opt)=>{
   if(opt.method==="POST")assert.equal(JSON.parse(readFileSync(p,"utf8").trim().split("\n").at(-1)).status,"DISPATCH_ATTEMPT_BEFORE_ACK");
   return original(url,opt);
  };
  await assert.rejects(runP6RollingSession(f.env,f.options),/UNKNOWN_DISPATCH_STOP_NO_RETRY/);
  assert.equal(f.calls.filter(x=>x.method==="POST").length,1);
  assert.equal(JSON.parse(readFileSync(p,"utf8").trim().split("\n").at(-1)).status,"DISPATCH_ATTEMPT_BEFORE_ACK");
 }finally{j.close();rmSync(dir,{recursive:true,force:true});}
});
test("integrated successful successor request preserves exact acceptance before terminal receipt is returned",async()=>{
 const f=setup({chain:true}),dir=mkdtempSync(join(tmpdir(),"p6-rolling-integration-")),p=join(dir,"journal.jsonl");
 const j=createP6RollingFailureJournal(p,{id:12345,sha,epoch:start,chainDeadline:start+60*MIN,hop:0,parent:0});
 try{
  const original=f.options.fetcher;
  f.options.emit=e=>j.record(e);
  f.options.fetcher=async(url,opt)=>{
   if(opt.method==="POST"&&url.includes("/workflows/"+WF+"/dispatches"))
    assert.equal(JSON.parse(readFileSync(p,"utf8").trim().split("\n").at(-1)).status,"CHAIN_SUCCESSOR_ATTEMPT_BEFORE_ACK");
   return original(url,opt);
  };
  const out=await runP6RollingSession(f.env,f.options);
  const last=JSON.parse(readFileSync(p,"utf8").trim().split("\n").at(-1));
  assert.equal(last.status,"CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF");assert.equal(last.nextRunId,out.nextRunId);
  assert.equal(out.successorDispatches,1);
 }finally{j.close();rmSync(dir,{recursive:true,force:true});}
});

test("combined writer/readback contract retains real-shaped unknown worker attempt without a manufactured ACK",async()=>{
 const f=setup({failAck:true}),dir=mkdtempSync(join(tmpdir(),"p6-combined-custody-")),p=join(dir,"journal.jsonl");
 const j=createP6RollingFailureJournal(p,{id:12345,sha,epoch:start,chainDeadline:start+30*MIN,hop:0,parent:0});
 try{
  f.options.emit=e=>j.record(e);
  await assert.rejects(runP6RollingSession(f.env,f.options),/UNKNOWN_DISPATCH_STOP_NO_RETRY/);
  const parsed=parseP6RollingFailureCustody(readFileSync(p),{runId:12345,mainSha:sha});
  const out=await reconcileP6FailureCustody(parsed,{readRun:async()=>assert.fail("unknown ACK must not be guessed")});
  assert.equal(out.unknownWorkerAttempts.length,1);assert.equal(out.workers.length,0);
  assert.equal(out.permitReplay,false);assert.equal(out.permitNewRoot,false);
  assert.equal(f.calls.filter(x=>x.method==="POST").length,1);
 }finally{j.close();rmSync(dir,{recursive:true,force:true});}
});
test("combined fresh closing recovery plus journal/readback keeps exact worker and unknown successor custody",async()=>{
 const f=setup({chain:true,hideFinalOnce:true,failSuccessor:true}),dir=mkdtempSync(join(tmpdir(),"p6-combined-custody-")),p=join(dir,"journal.jsonl");
 const j=createP6RollingFailureJournal(p,{id:12345,sha,epoch:start,chainDeadline:start+60*MIN,hop:0,parent:0});
 try{
  f.options.emit=e=>{f.events.push(e);j.record(e);};
  await assert.rejects(runP6RollingSession(f.env,f.options),/CHAIN_UNKNOWN_SUCCESSOR_ACK_NO_REPLAY/);
  assert(f.events.some(x=>x.status==="CLOSING_TERMINAL_ACK_READBACK_DEFERRED_NO_POST"));
  const parsed=parseP6RollingFailureCustody(readFileSync(p),{runId:12345,mainSha:sha});
  const seen=[];
  const out=await reconcileP6FailureCustody(parsed,{readRun:async id=>{seen.push(id);return f.runs.find(x=>x.id===id);}});
  assert.equal(out.unknownWorkerAttempts.length,0);assert.equal(out.workers.length,f.runs.length);
  assert.equal(seen.length,f.runs.length);assert(out.workers.every(x=>x.githubState==="KNOWN_GITHUB_SUCCESS_NOT_COLLECTION_PROOF"));
  assert.equal(out.successor.githubState,"UNKNOWN_SUCCESSOR_ACK_NO_REPLAY");
  assert.equal(out.permitNewRoot,false);assert.equal(out.permitReplay,false);
  assert.equal(f.calls.filter(x=>x.method==="POST"&&x.url.includes("/workflows/"+WF+"/dispatches")).length,1);
 }finally{j.close();rmSync(dir,{recursive:true,force:true});}
});

async function actualShapedClosedWindow({multi=true,carryActive=false}={}){
 const f=setup({chain:multi,multi,carryActive}),receipts=new Map();
 if(!multi)f.root.display_title="Phase6 initial bounded rolling controller session (STOP default)";
 for(let hop=0;hop<(multi?4:1);hop++){
  const x=await runP6RollingSession(f.env,f.options);receipts.set(x.runId,x);
  if(x.successorDispatches===1)f.startSuccessor(x);
  else {
   const row=f.controllerRuns.find(y=>y.id===x.runId);row.status="completed";row.conclusion="success";break;
  }
 }
 const first=receipts.get(12345);
 const expected={rootRunId:12345,reviewedMainSha:sha,policyCommitment:first.policyCommitment,
  mode:multi?"FOUR":"SINGLE",windowStartUtc:iso(start),windowEndUtc:iso(start+120*MIN),
  epochUtc:first.epochUtc,chainDeadlineUtc:first.chainDeadlineUtc};
 const controlJobs=id=>[{id:id*10+1,name:"one-protected-bounded-session",run_id:id,head_sha:sha,run_attempt:1,
  status:"completed",conclusion:"success",steps:["Execute one protected rolling session and reconcile accepted workers before terminal",
   "Preserve terminal operational receipt for independently reviewed continuation"].map(name=>({name,status:"completed",conclusion:"success"}))}];
 const adapter={now:f.options.now,
  readRun:async id=>structuredClone([...f.runs,...f.controllerRuns].find(y=>y.id===id)),
  readJobs:async id=>{
   if(receipts.has(id))return structuredClone(controlJobs(id));
   const row=f.runs.find(y=>y.id===id),route=P6_ROLLING_ROUTES.find(y=>row?.path?.endsWith("/"+y.workflow));assert(route);
   return route.jobs.map((j,i)=>({id:id*10+i+1,run_id:id,run_attempt:1,head_sha:sha,name:j.name,status:"completed",conclusion:"success",
    steps:j.step?[{name:j.step,status:"completed",conclusion:"success"}]:j.parentOutcome?["SAFE_PREFLIGHT_HOLD","MISSING_EVIDENCE","NO_DUE_WORK","NO_NEW_ACK","ACKNOWLEDGED_NOT_PAID_RECEIPT"].map(x=>({name:"Parent outcome "+x,status:"completed",conclusion:x==="NO_DUE_WORK"?"success":"skipped"})):[]}));
  },
  readReceipt:async id=>({artifactId:id+90000,runId:id,name:"p6-rolling-terminal-"+id,bytes:Buffer.from(JSON.stringify(receipts.get(id)))}),
  listControllers:async()=>structuredClone(f.controllerRuns)};
 return {f,expected,adapter,receipts};
}
test("complete actual-shaped four-session window independently accounts for all worker IDs including retired history",async()=>{
 const {f,expected,adapter,receipts}=await actualShapedClosedWindow();
 const posts=f.calls.filter(x=>x.method==="POST").length;
 const out=await verifyP6RollingWindowTerminalEvidence(expected,adapter);
 assert.equal(out.controllerRunIds.length,4);assert.equal(out.independentlyVerifiedWorkerJobs,f.runs.length);
 assert.equal(out.uniqueWorkerAcknowledgements,f.runs.length);assert(out.retiredWorkerAcknowledgements>0);
 assert.equal(out.terminalReceiptSha256,digest(Buffer.from(JSON.stringify([...receipts.values()].at(-1)))));
 assert.equal(out.permitClose,false);assert.equal(out.permitNewRoot,false);assert.equal(out.providerSettlementVerified,false);
 assert.equal(f.calls.filter(x=>x.method==="POST").length,posts);
});
test("standalone root verifies terminal operational evidence without granting next window",async()=>{
 const {f,expected,adapter}=await actualShapedClosedWindow({multi:false});
 const out=await verifyP6RollingWindowTerminalEvidence(expected,adapter);
 assert.equal(out.controllerRunIds.length,1);assert.equal(out.uniqueWorkerAcknowledgements,f.runs.length);
 assert.equal(out.permitClose,false);assert.equal(out.permitReplay,false);
});
test("window reconciliation refuses lost receipt, unknown attempt, foreign job, extra root and wrong release policy",async()=>{
 const {expected,adapter,receipts}=await actualShapedClosedWindow();
 await assert.rejects(verifyP6RollingWindowTerminalEvidence({...expected,policyCommitment:"0".repeat(64)},adapter),/RECEIPT_IDENTITY/);
 await assert.rejects(verifyP6RollingWindowTerminalEvidence(expected,{...adapter,readReceipt:async()=>null}),/ARTIFACT_SCOPE/);
 await assert.rejects(verifyP6RollingWindowTerminalEvidence(expected,{...adapter,readJobs:async id=>(await adapter.readJobs(id)).map(y=>({...y,run_id:99999}))}),/JOB_IDENTITY/);
 await assert.rejects(verifyP6RollingWindowTerminalEvidence(expected,{...adapter,listControllers:async()=>[...await adapter.listControllers(),{id:99999}]}),/CONTROLLER_CHAIN_HISTORY/);
 const last=[...receipts.values()].at(-1);last.unknownAttempts=1;
 await assert.rejects(verifyP6RollingWindowTerminalEvidence(expected,adapter),/RECEIPT_IDENTITY/);last.unknownAttempts=0;
 const original=last.terminalAcknowledgements;last.terminalAcknowledgements=original.slice(1);
 await assert.rejects(verifyP6RollingWindowTerminalEvidence(expected,adapter),/ACK_AGGREGATE/);last.terminalAcknowledgements=original;
});
