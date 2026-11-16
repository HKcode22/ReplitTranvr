/** Independent historical window receipt verifier — operational evidence only.
 * Reuses the current rolling route/job contract. No dispatch, DB mutation,
 * source contents, provider settlement proof, grant, or new root permission.
 * I/O adapters must authenticate the exact run/receipt artifact from GitHub.
 */
import {createHash} from "node:crypto";
import {verifyP6ParentChildCustody} from "./phase6RollingChildCustody_v39.mjs";
import {P6_ROLLING_ROUTES,assessP6RollingRoute} from "./phase6RollingGithubController_v39.mjs";
const WF=".github/workflows/phase6-rolling-controller-bounded-session.yml";
const JOB="one-protected-bounded-session";
const STEPS=["Execute one protected rolling session and reconcile accepted workers before terminal","Preserve terminal operational receipt for independently reviewed continuation"];
const ROUTES=new Map(P6_ROLLING_ROUTES.map(x=>[x.lane,x]));
const H=/^[a-f0-9]{64}$/, C=/^[a-f0-9]{40}$/;
const ID=x=>Number.isSafeInteger(x)&&x>0&&x<1e15;
const HOLD=s=>{throw Error("HOLD_P6_WINDOW_TERMINAL_"+s);};
const utc=s=>{
 if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(Date.parse(s)).toISOString()!==s)HOLD("CLOCK");
 return Date.parse(s);
};
const digest=b=>createHash("sha256").update(b).digest("hex");
const same=(a,b)=>a?.runId===b?.runId&&a?.lane===b?.lane&&a?.sentAtUtc===b?.sentAtUtc;
function jobsExact(jobs,run,required){
 if(!Array.isArray(jobs)||!jobs.length||jobs.length>100||
  new Set(jobs.map(j=>j?.id)).size!==jobs.length||jobs.some(j=>!ID(j?.id)||j.run_id!==run.id||j.head_sha!==run.head_sha||
   j.run_attempt!==1||j.status!=="completed"))HOLD("JOB_IDENTITY");
 for(const spec of required){
  const matches=jobs.filter(j=>j.name===spec.name);
  if(matches.length!==1||matches[0].conclusion!=="success")HOLD("REQUIRED_JOB");
  for(const name of spec.steps??[]){
   const s=matches[0].steps?.filter(x=>x.name===name)??[];
   if(s.length!==1||s[0].status!=="completed"||s[0].conclusion!=="success")HOLD("REQUIRED_STEP");
  }
 }
}
function exactRun(row,id,path,sha,from,to,clock,event="workflow_dispatch"){
 const created=Date.parse(row?.created_at);
 if(row?.id!==id||row.path!==path||row.head_sha!==sha||row.head_branch!=="main"||
    row.event!==event||row.run_attempt!==1||row.status!=="completed"||row.conclusion!=="success"||
    !Number.isFinite(created)||created<from-1000||created>=to||created>clock+5000)HOLD("RUN_IDENTITY_OR_NOT_SUCCESS");
 return created;
}
function entries(xs){
 if(!Array.isArray(xs)||xs.length>96)HOLD("ACK_SET");
 const m=new Map();
 for(const x of xs){
  if(!x||Object.keys(x).sort().join(",")!=="lane,runId,sentAtUtc"||!ID(x.runId)||!ROUTES.has(x.lane)||m.has(x.runId))
   HOLD("ACK_IDENTITY");
  utc(x.sentAtUtc);m.set(x.runId,x);
 }
 return m;
}
export async function verifyP6RollingWindowTerminalEvidence(expected,{readRun,readJobs,readReceipt,listControllers,readParentArtifact,now=Date.now}={}){
 if(!expected||!ID(expected.rootRunId)||!C.test(expected.reviewedMainSha??"")||!H.test(expected.policyCommitment??"")||
    !["SINGLE","FOUR"].includes(expected.mode)||[readRun,readJobs,readReceipt,listControllers].some(x=>typeof x!=="function"))
  HOLD("EXPECTED_SCOPE");
 const sha=expected.reviewedMainSha,ws=utc(expected.windowStartUtc),we=utc(expected.windowEndUtc),
  epoch=utc(expected.epochUtc),deadline=utc(expected.chainDeadlineUtc),clock=now(),max=expected.mode==="FOUR"?4:1;
 if(!Number.isSafeInteger(clock)||ws>=we||we-ws>120*60000||epoch<ws||epoch>=deadline||deadline>we||
    (max===1?deadline-epoch>30*60000:deadline-epoch<90*60000||deadline-epoch>120*60000)||clock<epoch)
  HOLD("EXPECTED_CLOCK");
 const runIds=[],controllerRows=new Map(),receipts=[],all=new Map(),retired=new Set();
 let scheduledRoot=null;
 let parent=0,id=expected.rootRunId,prior=null,priorTerminal=new Map(),priorPending=new Map(),priorHistoryEpoch=epoch,recordedWindowCustody=null;
 for(let hop=0;hop<max;hop++){
  if(runIds.includes(id)||all.has(id))HOLD("DUPLICATE_CONTROLLER");
  const run=await readRun(id);
  if(hop===0&&run?.event==="schedule")scheduledRoot=id;
  const created=exactRun(run,id,WF,sha,epoch,deadline,clock,id===scheduledRoot?"schedule":"workflow_dispatch");
  if(id===scheduledRoot?(run.display_title!=="P6 ROLLING SCHEDULED ROOT"||created!==epoch):
     max===4?run.display_title!=="P6 ROLLING CHAIN "+hop+" "+parent:
     run.display_title!=="Phase6 initial bounded rolling controller session (STOP default)")HOLD("CHAIN_TITLE");
  if(created<epoch||(prior&&created<utc(prior.nextDispatchAtUtc)-1000))HOLD("SUCCESSOR_CLOCK");
  controllerRows.set(id,{createdAt:run.created_at,title:run.display_title,event:run.event});
  jobsExact(await readJobs(id),run,[{name:JOB,steps:STEPS}]);
  const artifact=await readReceipt(id);
  if(!artifact||!ID(artifact.artifactId)||artifact.name!=="p6-rolling-terminal-"+id||
    artifact.runId!==id||!Buffer.isBuffer(artifact.bytes)||artifact.bytes.length<100||artifact.bytes.length>32768)
   HOLD("ARTIFACT_SCOPE");
  let x;try{x=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(artifact.bytes));}catch{HOLD("RECEIPT_PARSE");}
  const d=utc(x.deadlineUtc);
  if(x.schema!=="v39.phase6.bounded-rolling-session.v1"||x.runId!==id||x.parentRunId!==parent||x.sessionHop!==hop||
    x.reviewedMainSha!==sha||x.policyCommitment!==expected.policyCommitment||x.epochUtc!==expected.epochUtc||
    (x.scheduledRootRunId??null)!==scheduledRoot||(scheduledRoot&&!x.windowCustody)||
    x.chainDeadlineUtc!==expected.chainDeadlineUtc||d>deadline||d<=created||d-created>35*60000||
    (hop===0&&d!==Math.min(deadline,epoch+30*60000))||
    x.unknownAttempts!==0||x.providerCalls!==0||x.databaseWrites!==(hop===0&&x.windowCustody!==undefined?1:0)||x.phase6PaidGo!==false||
    (max===4&&(x.maxSessionHops!==4||x.chainMode!=="PROTECTED_FOUR_SESSION_BOUND"||x.historyRetirementMode!=="PROTECTED_FOUR_SESSION_BOUND"))||
    (max===1&&(x.chainMode!==undefined||x.historyEpochUtc!==undefined)))HOLD("RECEIPT_IDENTITY");
  if(x.windowCustody!==undefined){
   const w=x.windowCustody;
   if(!w||Object.keys(w).sort().join(",")!=="claimedAtUtc,policyCommitment,rootRunId,windowEndUtc,windowIndex,windowStartUtc"||
    w.rootRunId!==expected.rootRunId||w.policyCommitment!==expected.policyCommitment||
    w.windowStartUtc!==expected.windowStartUtc||w.windowEndUtc!==expected.windowEndUtc||
    !Number.isSafeInteger(w.windowIndex)||w.windowIndex<0||w.windowIndex>719||
    utc(w.claimedAtUtc)<epoch||utc(w.claimedAtUtc)>=deadline||utc(w.claimedAtUtc)>d||
    (hop>0&&(!recordedWindowCustody||Object.keys(w).some(k=>w[k]!==recordedWindowCustody[k]))))
    HOLD("DURABLE_CUSTODY_RECEIPT_DRIFT");
   if(hop===0)recordedWindowCustody=w;
  }else if(recordedWindowCustody)HOLD("DURABLE_CUSTODY_RECEIPT_MISSING");
  const term=entries(x.terminalAcknowledgements),pending=entries(x.pendingAcknowledgements);
  const current=new Map([...term,...pending]);
  if(current.size!==term.size+pending.size||x.acknowledged!==current.size||x.verifiedTerminal!==term.size||
    x.remainingDispatchCapacity!==96-current.size||x.ackCapacityExhausted!==(current.size===96)||
    !Array.isArray(x.pending)||x.pending.length!==pending.size||
    new Set(x.pending.map(q=>q?.runId)).size!==pending.size||
    x.pending.some(q=>Object.keys(q??{}).sort().join(",")!=="lane,runId"||pending.get(q.runId)?.lane!==q.lane)||
    new Set([...pending.values()].map(q=>q.lane)).size!==pending.size)HOLD("ACK_AGGREGATE");
  const history=max===4?utc(x.historyEpochUtc):epoch;
  if(history<priorHistoryEpoch||history>=d)HOLD("HISTORY_EPOCH");
  const before=new Map([...priorTerminal,...priorPending]);
  if(history>priorHistoryEpoch){
   if(!prior||prior.historyRetirementCandidate?.status!=="REVIEWED_RETIREMENT_CANDIDATE_NO_GO"||
     prior.historyRetirementCandidate.proposedEpochUtc!==x.historyEpochUtc)HOLD("RETIREMENT_PREDECESSOR");
   const a=x.historyRetirementAudit;
   if(a?.status!=="REVIEWED_ACK_ROLLOVER_PARTITION_NO_GO"||a.reviewedMainSha!==sha||
     utc(a.priorEpochUtc)!==priorHistoryEpoch||utc(a.proposedEpochUtc)!==history||
     !H.test(a.retiredHistorySha256??"")||a.unknownAttempts!==0||a.phase6PaidGo!==false)HOLD("RETIREMENT_SCOPE");
   const drop=entries(a.retiredAcknowledgements),ct=entries(a.carriedTerminalAcknowledgements),cp=entries(a.carriedPendingAcknowledgements);
   if(drop.size+ct.size+cp.size!==before.size||new Set([...drop.keys(),...ct.keys(),...cp.keys()]).size!==before.size)
    HOLD("RETIREMENT_PARTITION");
   for(const [key,item] of drop){
    // Terminal-only retirement; independent direct worker readback below.
    if(!same(priorTerminal.get(key),item)||current.has(key)||utc(item.sentAtUtc)>=history)HOLD("RETIRED_ACK_DRIFT");
    retired.add(key);
   }
   for(const [key,item] of [...ct,...cp])if(!same(before.get(key),item)||!same(current.get(key),item)||utc(item.sentAtUtc)<history)
    HOLD("CARRIED_ACK_DRIFT");
  }else if(hop===0&&x.historyRetirementAudit!==undefined)HOLD("UNEXPECTED_ROOT_RETIREMENT");
  for(const [key,item] of before){
   if(retired.has(key))continue;
   if(!same(current.get(key),item)||(priorTerminal.has(key)&&!term.has(key)))HOLD("LOST_OR_REGRESSED_ACK");
  }
  for(const [key,item] of current){
   const sent=utc(item.sentAtUtc);
   if(retired.has(key)||runIds.includes(key)||key===id||sent<history||sent>=d||
     (all.has(key)&&!same(all.get(key),item))||(!before.has(key)&&all.has(key))||
     (!before.has(key)&&sent<created-1000))HOLD("NEW_ACK_SCOPE");
   all.set(key,item);
  }
  // Per actual controller hard maximum is 8 waves × 8 lanes. Account
  // for inherited IDs without silently dropping prior actual attempts.
  if([...current.keys()].filter(k=>!before.has(k)).length>64||all.size>256)HOLD("ACK_BOUND");
  runIds.push(id);receipts.push({runId:id,artifactId:artifact.artifactId,receiptSha256:digest(artifact.bytes)});
  if(x.status==="BOUNDED_SESSION_SUCCESSOR_ACKNOWLEDGED_NOT_COLLECTION_PROOF"){
   if(max===1||hop+1>=max||x.successorDispatches!==1||!ID(x.nextRunId)||x.nextRunId===id||all.has(x.nextRunId)||
     utc(x.nextDispatchAtUtc)<created||utc(x.nextDispatchAtUtc)>=d||x.ackCapacityExhausted)HOLD("SUCCESSOR_SCOPE");
   prior=x;priorTerminal=term;priorPending=pending;priorHistoryEpoch=history;parent=id;id=x.nextRunId;
   continue;
  }
  const final=x.ackCapacityExhausted?"BOUNDED_ACK_CAPACITY_EXHAUSTED_NO_SUCCESSOR_NOT_COLLECTION_PROOF":
   max===4?"BOUNDED_CHAIN_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF":"BOUNDED_SESSION_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF";
  if(x.status!==final||x.successorDispatches!==0||x.nextRunId!==null||x.nextDispatchAtUtc!==undefined||pending.size!==0)
   HOLD("FINAL_NOT_DRAINED");
  // No extra controller root/successor may disappear outside this chain.
  const listed=await listControllers({fromUtc:expected.epochUtc,untilUtc:expected.chainDeadlineUtc,scheduledRootRunId:scheduledRoot});
  if(!Array.isArray(listed)||listed.length!==runIds.length||new Set(listed.map(y=>y?.id)).size!==runIds.length||
     listed.some(y=>!runIds.includes(y.id)||y.path!==WF||y.head_sha!==sha||y.event!==controllerRows.get(y.id)?.event||
       y.head_branch!=="main"||y.run_attempt!==1||y.status!=="completed"||y.conclusion!=="success"||
       y.created_at!==controllerRows.get(y.id)?.createdAt||y.display_title!==controllerRows.get(y.id)?.title))HOLD("CONTROLLER_CHAIN_HISTORY");
  const childRuns=[],parentChildReceipts=[],childIds=new Set();
  for(const item of all.values()){
   if(runIds.includes(item.runId))HOLD("WORKER_CONTROLLER_ID_COLLISION");
   const route=ROUTES.get(item.lane),worker=await readRun(item.runId),sent=utc(item.sentAtUtc);
   const createdAt=exactRun(worker,item.runId,".github/workflows/"+route.workflow,sha,sent,deadline,clock);
   const jobs=await readJobs(item.runId);
   jobsExact(jobs,worker,route.jobs);
   const outcome=assessP6RollingRoute(route,{complete:true,workflow:route.workflow,runs:[worker],active:[],jobRunId:item.runId,jobs},
    {sha,epoch:Math.min(createdAt,sent),clock});
   if(outcome.state.startsWith("HOLD_")||outcome.state==="ACTIVE_NO_OVERLAP")HOLD("WORKER_JOB_EVIDENCE");
   if(item.lane==="SOURCE_POST"){
    if(typeof readParentArtifact!=="function")HOLD("MISSING_PARENT_CHILD_READER");
    const expanded=await verifyP6ParentChildCustody({parent:worker,parentJobs:jobs,sha,clock,readArtifact:readParentArtifact,readRun,readJobs});
    parentChildReceipts.push(...expanded.receipts);
    for(const c of expanded.children){if(all.has(c.runId)||runIds.includes(c.runId)||childIds.has(c.runId))HOLD("DUPLICATE_OR_FOREIGN_CHILD");childIds.add(c.runId);childRuns.push(c);}
   }
  }
  return {status:"INDEPENDENT_WINDOW_OPERATIONAL_CHAIN_VERIFIED_NOT_SETTLEMENT_NOT_GO",
   rootRunId:expected.rootRunId,terminalRunId:id,reviewedMainSha:sha,policyCommitment:expected.policyCommitment,
   windowStartUtc:expected.windowStartUtc,windowEndUtc:expected.windowEndUtc,epochUtc:expected.epochUtc,chainDeadlineUtc:expected.chainDeadlineUtc,
   controllerRunIds:runIds,uniqueWorkerAcknowledgements:all.size,independentlyVerifiedWorkerJobs:all.size,
   retiredWorkerAcknowledgements:retired.size,receiptArtifacts:receipts,terminalReceiptSha256:receipts.at(-1).receiptSha256,
   completeOperationalChainVerified:true,controllerOwnedChildJobsVerified:true,paidCapableChildRuns:childRuns,parentChildReceipts,
   independentlyVerifiedPaidCapableChildJobs:childRuns.length,independentScheduledOrManualChildrenCovered:false,providerSettlementVerified:false,permitClose:false,permitNewRoot:false,permitReplay:false,
   ...(recordedWindowCustody?{recordedWindowCustody,actualDbOwnershipVerified:false}:{}),
   providerCalls:0,databaseWrites:0,dispatchCount:0,phase6PaidGo:false};
 }
 HOLD("MISSING_FINAL_RECEIPT");
}
