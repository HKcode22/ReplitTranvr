/** Read-only recovery diagnosis of a FAILED rolling-controller journal.
 * No dispatch, no replay, no release authority, no provider/DB access.
 * A missing ACK is unknown even when a plausible GitHub run exists.
 */
import {P6_ROLLING_ROUTES} from "./phase6RollingGithubController_v39.mjs";
const hold=s=>{throw Error("HOLD_P6_ROLLING_FAILURE_READBACK_"+s);};
const id=x=>Number.isSafeInteger(x)&&x>0&&x<1e15;
const sha=x=>typeof x==="string"&&/^[a-f0-9]{40}$/.test(x);
const time=x=>{
 if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("CLOCK");
 return Date.parse(x);
};
const keys=(x,expected)=>x&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).sort().join(",")===[...expected].sort().join(",");
const routeByLane=new Map(P6_ROLLING_ROUTES.map(r=>[r.lane,r]));
export const P6_ROLLING_CONTROLLER_WORKFLOW="phase6-rolling-controller-bounded-session.yml";
export function parseP6RollingFailureCustody(bytes,{runId,mainSha}){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>65536||!id(runId)||!sha(mainSha))hold("FILE_SCOPE");
 let lines;
 try{
  const raw=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  if(!raw.endsWith("\n"))hold("FILE_SCOPE");
  lines=raw.slice(0,-1).split("\n");
  if(lines.length<1||lines.length>300||lines.some(x=>!x||Buffer.byteLength(x)>1024))hold("FILE_SCOPE");
  lines=lines.map(x=>JSON.parse(x));
 }catch{hold("FILE_SCOPE");}
 const s=lines.shift();
 if(!keys(s,["schema","status","runId","reviewedMainSha","parentRunId","sessionHop","epochUtc","chainDeadlineUtc","noReplay","providerCalls","databaseWrites","phase6PaidGo"])||
    s.schema!=="v39.phase6.rolling-failure-custody.v1"||s.status!=="SESSION_SCOPE_NOT_AUTHORIZATION"||
    s.runId!==runId||s.reviewedMainSha!==mainSha||!Number.isSafeInteger(s.sessionHop)||s.sessionHop<0||s.sessionHop>3||
    (s.sessionHop===0?s.parentRunId!==0:!id(s.parentRunId)||s.parentRunId===runId)||
    s.noReplay!==true||s.providerCalls!==0||s.databaseWrites!==0||s.phase6PaidGo!==false)hold("JOURNAL_SCOPE");
 const epoch=time(s.epochUtc),deadline=time(s.chainDeadlineUtc);
 if(epoch>=deadline||deadline-epoch>120*60000)hold("JOURNAL_CLOCK_BOUND");
 let last=epoch,successor=null;
 const attempted=new Map(),workers=new Map(),busy=new Map();
 function advance(t){const n=time(t);if(n<last||n>=deadline)hold("EVENT_CLOCK_BOUND");last=n;}
 for(const e of lines){
  if(e?.status==="CHAIN_SUCCESSOR_ATTEMPT_BEFORE_ACK"){
   if(successor||attempted.size||!keys(e,["status","runId","sentAtUtc"])||e.runId!==runId||s.sessionHop>=3)hold("SUCCESSOR_ATTEMPT_SCOPE");
   advance(e.sentAtUtc);successor={sentAtUtc:e.sentAtUtc,nextRunId:null};continue;
  }
  if(e?.status==="CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF"){
   if(!successor||successor.nextRunId!==null||!keys(e,["status","runId","nextRunId","sentAtUtc"])||
      e.runId!==runId||!id(e.nextRunId)||e.nextRunId===runId||e.nextRunId===s.parentRunId||workers.has(e.nextRunId)||
      e.sentAtUtc!==successor.sentAtUtc)hold("SUCCESSOR_ACK_SCOPE");
   successor.nextRunId=e.nextRunId;continue;
  }
  if(successor||!routeByLane.has(e?.lane))hold("FOREIGN_EVENT_OR_AFTER_SUCCESSOR");
  if(e.status==="DISPATCH_ATTEMPT_BEFORE_ACK"){
   if(!keys(e,["status","lane","atUtc"])||attempted.has(e.lane)||busy.has(e.lane))hold("WORKER_ATTEMPT_SCOPE");
   advance(e.atUtc);attempted.set(e.lane,e.atUtc);continue;
  }
  if(e.status==="EXACT_ACK_NOT_EXECUTION_PROOF"){
   if(!keys(e,["status","lane","runId","atUtc"])||!attempted.has(e.lane)||!id(e.runId)||
      workers.has(e.runId)||e.runId===runId||e.runId===s.parentRunId)hold("WORKER_ACK_SCOPE");
   advance(e.atUtc);workers.set(e.runId,{lane:e.lane,runId:e.runId,sentAtUtc:attempted.get(e.lane),
    origin:"LOCAL_EXACT_ACK",terminalMarker:false});
   attempted.delete(e.lane);busy.set(e.lane,e.runId);continue;
  }
  if(e.status==="EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF"){
   if(!keys(e,["status","lane","runId"])||!id(e.runId)||e.runId===runId||e.runId===s.parentRunId)hold("TERMINAL_SCOPE");
   let w=workers.get(e.runId);
   // A successor may independently re-read inherited terminal ACKs and
   // may emit the same terminal marker again after history retirement.
   if(!w){
    if(s.sessionHop===0||busy.has(e.lane)||attempted.has(e.lane))hold("TERMINAL_WITHOUT_KNOWN_CUSTODY");
    w={lane:e.lane,runId:e.runId,sentAtUtc:null,origin:"INHERITED_TERMINAL_MARKER",terminalMarker:false};
    workers.set(e.runId,w);
   }
   if(w.lane!==e.lane||attempted.has(e.lane)||(busy.has(e.lane)&&busy.get(e.lane)!==e.runId))hold("TERMINAL_LANE_DRIFT");
   w.terminalMarker=true;if(busy.get(e.lane)===e.runId)busy.delete(e.lane);
   continue;
  }
  hold("FOREIGN_EVENT_OR_AFTER_SUCCESSOR");
 }
 if(workers.size>160)hold("ACK_BOUND");
 return {scope:s,workers:[...workers.values()],unknownWorkerAttempts:[...attempted].map(([lane,sentAtUtc])=>({lane,sentAtUtc})),
  successor,predecessorReceiptRequired:s.sessionHop>0};
}
const active=new Set(["queued","in_progress","waiting","requested","pending"]);
const unsuccessful=new Set(["failure","cancelled","timed_out","action_required","stale","startup_failure","skipped","neutral"]);
export function assessP6FailureKnownRun(candidate,row,{mainSha,epochUtc,chainDeadlineUtc,successor=false,sessionHop,parentRunId}){
 const route=routeByLane.get(candidate.lane),workflow=successor?P6_ROLLING_CONTROLLER_WORKFLOW:route?.workflow;
 const created=Date.parse(row?.created_at),from=candidate.sentAtUtc?time(candidate.sentAtUtc):time(epochUtc);
 if(!workflow||!id(candidate.runId)||row?.id!==candidate.runId||row.path!==".github/workflows/"+workflow||
    row.head_sha!==mainSha||row.head_branch!=="main"||row.event!=="workflow_dispatch"||row.run_attempt!==1||
    !Number.isFinite(created)||created<from-1000||created>time(chainDeadlineUtc)+5000||
    (successor&&row.display_title!=="P6 ROLLING CHAIN "+(sessionHop+1)+" "+parentRunId))hold("KNOWN_RUN_IDENTITY");
 let githubState;
 if(active.has(row.status)&&row.conclusion===null)githubState="KNOWN_ACTIVE_NO_REPLAY";
 else if(row.status==="completed"&&row.conclusion==="success")githubState="KNOWN_GITHUB_SUCCESS_NOT_COLLECTION_PROOF";
 else if(row.status==="completed"&&unsuccessful.has(row.conclusion))githubState="KNOWN_UNSUCCESSFUL_NO_REPLAY";
 else hold("KNOWN_RUN_STATE");
 if(candidate.terminalMarker&&githubState!=="KNOWN_GITHUB_SUCCESS_NOT_COLLECTION_PROOF")hold("TERMINAL_MARKER_REGRESSED");
 return {runId:candidate.runId,lane:successor?"CONTROLLER_SUCCESSOR":candidate.lane,
  origin:successor?"LOCAL_SUCCESSOR_ACK":candidate.origin,githubState};
}
/** Direct GETs only. No inference from a matching title for unknown ACKs,
 * and no job-success or source evidence/paid receipt certification.
 */
export async function reconcileP6FailureCustody(parsed,{readRun}){
 if(typeof readRun!=="function")hold("READER");
 const scope=parsed.scope,ctx={mainSha:scope.reviewedMainSha,epochUtc:scope.epochUtc,chainDeadlineUtc:scope.chainDeadlineUtc};
 const workers=[];
 for(const c of parsed.workers)workers.push(assessP6FailureKnownRun(c,await readRun(c.runId),ctx));
 let successor=null;
 if(parsed.successor){
  const x=parsed.successor;
  successor=x.nextRunId===null?{githubState:"UNKNOWN_SUCCESSOR_ACK_NO_REPLAY",sentAtUtc:x.sentAtUtc}:
   assessP6FailureKnownRun({runId:x.nextRunId,sentAtUtc:x.sentAtUtc},await readRun(x.nextRunId),
    {...ctx,successor:true,sessionHop:scope.sessionHop,parentRunId:scope.runId});
 }
 return {schema:"v39.phase6.rolling-failure-readback.v1",
  status:"FAILED_SESSION_CUSTODY_DIAGNOSIS_NO_REPLAY_NO_GO",runId:scope.runId,reviewedFailedMainSha:scope.reviewedMainSha,
  parentRunId:scope.parentRunId,sessionHop:scope.sessionHop,epochUtc:scope.epochUtc,chainDeadlineUtc:scope.chainDeadlineUtc,
  workers,unknownWorkerAttempts:parsed.unknownWorkerAttempts,successor,
  predecessorReceiptRequired:parsed.predecessorReceiptRequired,allPriorCustodyReconciled:false,
  permitNewRoot:false,permitReplay:false,workerJobsVerified:false,providerSettlementVerified:false,
  providerCalls:0,databaseReads:0,databaseWrites:0,dispatchCount:0,phase6PaidGo:false};
}
