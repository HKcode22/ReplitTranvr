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
export const P6_ROLLING_ACK_CAPACITY=96;
export function createP6SessionAckLedger({sha,epoch,deadline,now=Date.now,emit=()=>{},priorAcknowledgements=[]}){
 if(!/^[a-f0-9]{40}$/.test(sha??"")||!Number.isSafeInteger(epoch)||!Number.isSafeInteger(deadline)||
    epoch>now()||deadline<=now()||deadline-epoch>6*3600000||typeof emit!=="function")fail("BAD_SESSION_SCOPE");
 const rows=new Map(),seen=new Set(),attempts=new Map(),observed=new Map();
 const routeByLane=lane=>P6_ROLLING_ROUTES.find(x=>x.lane===lane);
 // Imported operational receipts are NOT treated as already verified.
 // A trusted predecessor admission must bind the receipt to this release
 // and epoch. Reconcile every exact ID afresh before any new dispatch.
 if(!Array.isArray(priorAcknowledgements)||priorAcknowledgements.length>P6_ROLLING_ACK_CAPACITY)fail("INVALID_PRIOR_ACK_SET");
 for(const item of priorAcknowledgements){
  const sent=Date.parse(item?.sentAtUtc);
  if(!item||Object.keys(item).sort().join(",")!=="lane,runId,sentAtUtc"||
     !routeByLane(item.lane)||!idOk(item.runId)||seen.has(item.runId)||
     !Number.isSafeInteger(sent)||new Date(sent).toISOString()!==item.sentAtUtc||
     sent<epoch||sent>now()||sent>=deadline)fail("INVALID_PRIOR_ACK_SET");
  seen.add(item.runId);rows.set(item.runId,{lane:item.lane,runId:item.runId,sent,terminal:false});
 }
 let finalHistoryChecked=false,continuationHistoryChecked=false;
 // Reserve tracking space BEFORE the POST. A rejected new attempt must
 // not become an accepted but untrackable external worker.
 const remainingDispatchCapacity=()=>P6_ROLLING_ACK_CAPACITY-seen.size-attempts.size;
 function evidence(e){
  const route=routeByLane(e?.lane);
  if(!route||now()>=deadline)fail("OUTSIDE_SESSION_EVIDENCE");
  if(e.status==="DISPATCH_ATTEMPT_BEFORE_ACK"){
   if(remainingDispatchCapacity()<=0)fail("ACK_CAPACITY_EXHAUSTED_BEFORE_POST");
   if(attempts.has(e.lane)||[...rows.values()].some(x=>x.lane===e.lane&&!x.terminal))fail("DUPLICATE_OR_UNRESOLVED_ATTEMPT");
   finalHistoryChecked=false;continuationHistoryChecked=false;attempts.set(e.lane,now());
   emit(Object.freeze({lane:e.lane,status:e.status,atUtc:new Date(now()).toISOString()}));return;
  }
  if(e.status!=="EXACT_ACK_NOT_EXECUTION_PROOF"||!attempts.has(e.lane)||!idOk(e.runId)||
     seen.has(e.runId)||observed.get(e.lane)?.has(e.runId)||seen.size>=P6_ROLLING_ACK_CAPACITY)fail("BAD_OR_DUPLICATE_ACK");
  const sent=attempts.get(e.lane);attempts.delete(e.lane);
  seen.add(e.runId);rows.set(e.runId,{lane:e.lane,runId:e.runId,sent,terminal:false});
  emit(Object.freeze({lane:e.lane,status:e.status,runId:e.runId,atUtc:new Date(now()).toISOString()}));
 }
 function assertVisible(route,snapshot){
  if(!P6_ROLLING_ROUTES.includes(route)||snapshot?.complete!==true||snapshot.workflow!==route.workflow||
     !Array.isArray(snapshot.runs)||!Array.isArray(snapshot.active))fail("INCOMPLETE_RECHECK");
  const list=[...snapshot.runs,...snapshot.active];
  observed.set(route.lane,new Set([...(observed.get(route.lane)??[]),...list.map(x=>x.id)]));
  // Required even after a terminal ack: a delayed/filtered listing must
  // never authorize a replay. Epoch is fixed for entire session.
  for(const item of rows.values()){
   if(item.lane!==route.lane)continue;
   const same=list.filter(x=>x.id===item.runId);
   if(!snapshot.runs.some(x=>x.id===item.runId)||!same.length||same.some(x=>x.head_sha!==sha||x.path!==".github/workflows/"+route.workflow||
     x.head_branch!=="main"||x.event!=="workflow_dispatch"||x.run_attempt!==1))fail("ACK_NOT_VISIBLE_IN_EXACT_HISTORY");
   if(!item.terminal&&(!snapshot.runs.some(x=>x.id===item.runId&&active.has(x.status))||
     !snapshot.active.some(x=>x.id===item.runId&&active.has(x.status))))fail("ACK_TERMINAL_NOT_YET_RECONCILED");
  }
  return snapshot;
 }
 async function reconcile({token,fetcher=fetch}){
  finalHistoryChecked=false;continuationHistoryChecked=false;
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
 // Closing verification deliberately requires each ACK in the normal
 // session history, not only in the independently queried active list.
 // Validate all lanes together; a partial check cannot mint a receipt.
 function verifyClosingHistory(snapshots,allowKnownActive){
  finalHistoryChecked=false;continuationHistoryChecked=false;
  if(attempts.size||(!allowKnownActive&&[...rows.values()].some(x=>!x.terminal))||
     !Array.isArray(snapshots)||snapshots.length!==P6_ROLLING_ROUTES.length)
   fail("TERMINAL_HISTORY_NOT_READY");
  for(const route of P6_ROLLING_ROUTES){
   const found=snapshots.filter(s=>s?.workflow===route.workflow);
   if(found.length!==1)fail("TERMINAL_HISTORY_NOT_READY");
   const snapshot=assertVisible(route,found[0]);
   for(const item of rows.values()){
    if(item.lane!==route.lane)continue;
    const matching=snapshot.runs.filter(x=>x.id===item.runId);
    if(item.terminal){
     if(matching.length!==1||matching[0].status!=="completed"||matching[0].conclusion!=="success"||
        snapshot.active.some(x=>x.id===item.runId))fail("ACK_TERMINAL_HISTORY_DRIFT");
    }else{
     // A known active ACK is custody, not a terminal receipt. Require
     // exact identity in BOTH ordinary history and independent active sweep.
     const busy=snapshot.active.filter(x=>x.id===item.runId);
     if(!allowKnownActive||matching.length!==1||busy.length!==1||
        !active.has(matching[0].status)||!active.has(busy[0].status)||
        matching[0].conclusion!==null||busy[0].conclusion!==null)
      fail("ACK_CONTINUATION_ACTIVE_HISTORY_DRIFT");
    }
   }
  }
  if(now()>=deadline-12000)fail("READBACK_DEADLINE");
  if(allowKnownActive)continuationHistoryChecked=true;else finalHistoryChecked=true;
 }
 const verifyTerminalHistory=snapshots=>verifyClosingHistory(snapshots,false);
 const verifyContinuationHistory=snapshots=>verifyClosingHistory(snapshots,true);
 const project=terminal=>Object.freeze([...rows.values()].filter(x=>x.terminal===terminal)
  .sort((a,b)=>a.runId-b.runId).map(x=>Object.freeze({lane:x.lane,runId:x.runId,sentAtUtc:new Date(x.sent).toISOString()})));
 function continuationAcknowledgements(){
  if(!continuationHistoryChecked||attempts.size||now()>=deadline-12000)fail("CONTINUATION_RECEIPT_NOT_ADMITTED");
  return Object.freeze({terminalAcknowledgements:project(true),pendingAcknowledgements:project(false)});
 }
 function terminalAcknowledgements(){
  if(!finalHistoryChecked||attempts.size||[...rows.values()].some(x=>!x.terminal)||now()>=deadline-12000)
   fail("TERMINAL_RECEIPT_NOT_ADMITTED");
  return project(true);
 }
 function status(){
  return {acknowledged:rows.size,verifiedTerminal:[...rows.values()].filter(x=>x.terminal).length,
   pending:[...rows.values()].filter(x=>!x.terminal).map(x=>({lane:x.lane,runId:x.runId})),
   unknownAttempts:attempts.size,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }
 return Object.freeze({evidence,assertVisible,reconcile,status,verifyTerminalHistory,terminalAcknowledgements,
  verifyContinuationHistory,continuationAcknowledgements,remainingDispatchCapacity});
}
