/** Session-local dispatch receipt reconciliation.
 * Before another wave, independently check exact accepted run IDs against
 * the actual workflow history and job metadata. No retry of a POST here.
 * A terminal receipt is a GitHub worker outcome, NEVER a paid/flight receipt.
 */
import {P6_ROLLING_ROUTES,assessP6RollingRoute} from "./phase6RollingGithubController_v39.mjs";
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const active=new Set(["queued","in_progress","waiting","requested","pending"]);
const fail=s=>{throw Error("HOLD_P6_ROLLING_SESSION_"+s);};
const idOk=x=>Number.isSafeInteger(x)&&x>0;
export function createP6SessionAckLedger({sha,epoch,deadline,now=Date.now,emit=()=>{}}){
 if(!/^[a-f0-9]{40}$/.test(sha??"")||!Number.isSafeInteger(epoch)||!Number.isSafeInteger(deadline)||
    epoch>now()||deadline<=now()||deadline-epoch>6*3600000||typeof emit!=="function")fail("BAD_SESSION_SCOPE");
 const rows=new Map(),seen=new Set(),attempts=new Map();
 const routeByLane=lane=>P6_ROLLING_ROUTES.find(x=>x.lane===lane);
 function evidence(e){
  const route=routeByLane(e?.lane);
  if(!route||now()>=deadline)fail("OUTSIDE_SESSION_EVIDENCE");
  if(e.status==="DISPATCH_ATTEMPT_BEFORE_ACK"){
   if(attempts.has(e.lane)||[...rows.values()].some(x=>x.lane===e.lane&&!x.terminal))fail("DUPLICATE_OR_UNRESOLVED_ATTEMPT");
   attempts.set(e.lane,now());
   emit(Object.freeze({lane:e.lane,status:e.status,atUtc:new Date(now()).toISOString()}));return;
  }
  if(e.status!=="EXACT_ACK_NOT_EXECUTION_PROOF"||!attempts.has(e.lane)||!idOk(e.runId)||
     seen.has(e.runId)||seen.size>=96)fail("BAD_OR_DUPLICATE_ACK");
  const sent=attempts.get(e.lane);attempts.delete(e.lane);
  seen.add(e.runId);rows.set(e.runId,{lane:e.lane,runId:e.runId,sent,terminal:false});
  emit(Object.freeze({lane:e.lane,status:e.status,runId:e.runId,atUtc:new Date(now()).toISOString()}));
 }
 function assertVisible(route,snapshot){
  if(!P6_ROLLING_ROUTES.includes(route)||snapshot?.complete!==true||snapshot.workflow!==route.workflow||
     !Array.isArray(snapshot.runs)||!Array.isArray(snapshot.active))fail("INCOMPLETE_RECHECK");
  const list=[...snapshot.runs,...snapshot.active];
  // Required even after a terminal ack: a delayed/filtered listing must
  // never authorize a replay. Epoch is fixed for entire session.
  for(const item of rows.values()){
   if(item.lane!==route.lane)continue;
   const same=list.filter(x=>x.id===item.runId);
   if(!same.length||same.some(x=>x.head_sha!==sha||x.path!==".github/workflows/"+route.workflow||
     x.head_branch!=="main"||x.event!=="workflow_dispatch"||x.run_attempt!==1))fail("ACK_NOT_VISIBLE_IN_EXACT_HISTORY");
   if(!item.terminal&&same.every(x=>!active.has(x.status)))fail("ACK_TERMINAL_NOT_YET_RECONCILED");
  }
  return snapshot;
 }
 async function reconcile({token,fetcher=fetch}){
  if(attempts.size)fail("UNKNOWN_ACK_NO_REPLAY");
  if(typeof token!=="string"||token.length<16||now()>=deadline)fail("READBACK_NOT_ADMITTED");
  const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"};
  async function read(path){
   if(now()>=deadline-12000)fail("READBACK_DEADLINE");
   const res=await fetcher(ROOT+path,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(10000)});
   if(!res.ok)fail("ACK_READBACK_UNAVAILABLE");
   return await res.json();
  }
  for(const item of rows.values()){
   if(item.terminal)continue;
   const route=routeByLane(item.lane),run=await read("/actions/runs/"+item.runId);
   const created=Date.parse(run?.created_at);
   if(run?.id!==item.runId||run.path!==".github/workflows/"+route.workflow||run.head_branch!=="main"||
      run.head_sha!==sha||run.event!=="workflow_dispatch"||run.run_attempt!==1||
      !Number.isFinite(created)||created<item.sent-1000||created>now()+5000||created<epoch-1000||
      (run.status!=="completed"&&!active.has(run.status)))fail("ACK_RUN_IDENTITY_DRIFT");
   if(active.has(run.status)){if(run.conclusion!==null)fail("ACK_ACTIVE_CONCLUSION_DRIFT");continue;}
   if(run.conclusion!=="success")fail("ACK_WORKER_UNSUCCESSFUL_NO_REPLAY");
   const result=await read("/actions/runs/"+item.runId+"/jobs?filter=latest&per_page=100");
   if(!Number.isSafeInteger(result?.total_count)||result.total_count<1||result.total_count>100||
      !Array.isArray(result.jobs)||result.jobs.length!==result.total_count)fail("ACK_JOB_HISTORY_INCOMPLETE");
   const assessment=assessP6RollingRoute(route,{workflow:route.workflow,complete:true,runs:[run],active:[],
     jobRunId:item.runId,jobs:result.jobs},{sha,epoch:Math.min(epoch,created),clock:now()});
   if(assessment.state.startsWith("HOLD_")||assessment.state==="ACTIVE_NO_OVERLAP")fail("ACK_WORKER_EVIDENCE_HOLD");
   item.terminal=true;
   emit(Object.freeze({lane:item.lane,runId:item.runId,status:"EXACT_WORKER_TERMINAL_NOT_COLLECTION_PROOF",outcome:assessment.state}));
  }
  return status();
 }
 function status(){
  return {acknowledged:rows.size,verifiedTerminal:[...rows.values()].filter(x=>x.terminal).length,
   pending:[...rows.values()].filter(x=>!x.terminal).map(x=>({lane:x.lane,runId:x.runId})),
   unknownAttempts:attempts.size,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }
 return Object.freeze({evidence,assertVisible,reconcile,status});
}
