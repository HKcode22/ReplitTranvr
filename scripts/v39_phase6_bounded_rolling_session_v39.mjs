/** Initial bounded rolling runtime using the original worker workflows.
 * Direct provider calls and flight-data DB connections are forbidden.
 * Optional restricted operational window custody is separately scoped.
 * It CAN cause separately approved paid children, so global release and
 * one exact protected session or separately approved two-session chain.
 */
import {resolve,join} from "node:path";
import {writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {readP6RollingGithubSnapshot,restrictP6RollingWave,dispatchP6ReviewedRollingWave,createP6RollingScheduleEvidenceCache} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
import {loadP6RollingCalendarHints,assessP6RollingCalendarHints} from "../server/lib/disruption/phase6RollingCalendarHints_v39.mjs";
import {createP6SessionAckLedger,P6_ROLLING_ACK_CAPACITY} from "../server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs";
import {createP6RollingFailureJournal,P6_ROLLING_FAILURE_JOURNAL_FILE} from "./v39_phase6_rolling_failure_journal_v39.mjs";
import {unpackP6WindowReceiptArchive} from "./v39_phase6_rolling_window_terminal_readback_v39.mjs";
import {admitP6RuntimeWindowConfig,createP6RuntimeWindowCustody,exactP6RuntimeWindowReceipt,compareP6WindowCustody} from "../server/lib/disruption/phase6RollingRuntimeWindowCustody_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const WF="phase6-rolling-controller-bounded-session.yml";
const CONFIRM="RUN_ONE_PROTECTED_ROLLING_SESSION_AFTER_SEPARATE_PHASE6_GO";
const CHAIN_CONFIRM="RUN_TWO_PROTECTED_ROLLING_SESSIONS_AFTER_SEPARATE_PHASE6_GO";
const ROLLOVER_CONFIRM="RUN_TWO_PROTECTED_ROLLING_SESSIONS_WITH_REVIEWED_HISTORY_RETIREMENT_AFTER_SEPARATE_PHASE6_GO";
const MULTI_CONFIRM="RUN_UP_TO_FOUR_PROTECTED_ROLLING_SESSIONS_AFTER_SEPARATE_PHASE6_GO";
const RECEIPT_FILE="p6-rolling-terminal-receipt.json";
const JOB="one-protected-bounded-session",STEPS=["Execute one protected rolling session and reconcile accepted workers before terminal",
 "Preserve terminal operational receipt for independently reviewed continuation"];
const idok=x=>typeof x==="string"&&/^[1-9][0-9]{0,14}$/.test(x);
const chainTitle=(hop,parent)=>"P6 ROLLING CHAIN "+hop+" "+parent;
const MIN=60000;
// Keep the original hard ceiling. Reserve capacity for final history, up to
// eight known active ACKs, optional retirement prefix proof, root and main.
// This is a conservative soft admission boundary, not a guarantee against
// unusually large concurrent GitHub histories or prolonged pending work.
const REQUEST_CAP=450,DISPATCH_REQUEST_BOUND=300,WAVE_START_BOUND=260;
const hold=s=>{throw Error("HOLD_P6_ROLLING_RUNTIME_"+s);};
const time=x=>{
 if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("INVALID_PROTECTED_UTC");
 return Date.parse(x);
};
const sleepDefault=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function admitP6RollingSession(env,now=Date.now()){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
    !/^[1-9][0-9]{0,14}$/.test(env.GITHUB_RUN_ID??"")||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.P6_ROLLING_REQUESTED_MAIN_SHA||env.GITHUB_SHA!==env.V39_P5_APPROVED_CODE_SHA||
    ![CONFIRM,CHAIN_CONFIRM,ROLLOVER_CONFIRM,MULTI_CONFIRM].includes(env.P6_ROLLING_SESSION_CONFIRM)||env.P6_ROLLING_CONTROLLER_ENABLED!=="1"||
    env.P6_ROLLING_SESSION_APPROVED!=="1"||env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||env.V39_P5_SEVEN_REST_BUDGET_SIGNED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||env.V39_PHASE6_OWNER_APPROVED!=="1"||
    env.P5_CD_GH_PRE_STOP!=="0"||env.ADB_AUTO_COLLECT!=="0"||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<16||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    ["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
     "V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL",
     "P5_V39_T24_WITNESS_DATABASE_URL","P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL",
     "P5_V39_OTHER_REST_REVIEW_DATABASE_URL","P5_V39_OTHER_REST_RESERVE_DATABASE_URL"].some(k=>env[k]))
  hold("NO_PROTECTED_REAL_SESSION_APPROVAL");
 const epoch=time(env.P6_ROLLING_SESSION_EPOCH_UTC),chainDeadline=time(env.P6_ROLLING_SESSION_DEADLINE_UTC);
 const multi=env.P6_ROLLING_SESSION_CONFIRM===MULTI_CONFIRM;
 const rollover=multi||env.P6_ROLLING_SESSION_CONFIRM===ROLLOVER_CONFIRM;
 const maxHops=multi?4:2;
 const chain=rollover||env.P6_ROLLING_SESSION_CONFIRM===CHAIN_CONFIRM;
 if(multi&&env.P6_ROLLING_FOUR_SESSION_APPROVED!=="1")hold("NO_PROTECTED_FOUR_SESSION_APPROVAL");
 if(rollover&&env.P6_ROLLING_HISTORY_RETIREMENT_APPROVED!=="1")hold("NO_PROTECTED_RETIREMENT_APPROVAL");
 const hop=env.P6_ROLLING_CHAIN_HOP??"0",parent=env.P6_ROLLING_PARENT_RUN_ID??"0";
 const sentText=env.P6_ROLLING_SENT_AT_UTC??"";
 // Keep the original protected epoch across the entire chain. The
 // separately approved two-hop commissioning envelope cannot autoextend.
 if(epoch%1000!==0||epoch>now||chainDeadline<=now)hold("OUTSIDE_INITIAL_BOUNDED_SESSION");
 let deadline=chainDeadline,sent=null;
 if(chain){
  if(env.P6_ROLLING_CHAIN_APPROVED!=="1"||!Array.from({length:maxHops},(_,i)=>String(i)).includes(hop)||
     chainDeadline-epoch<(multi?90:45)*MIN||chainDeadline-epoch>(multi?120:60)*MIN)hold("NO_BOUNDED_CHAIN_APPROVAL");
  if(hop==="0"){
   if(parent!=="0"||sentText!=="")hold("CHAIN_ROOT_INPUT");
   deadline=epoch+30*MIN;
  }else{
   if(!idok(parent)||parent===env.GITHUB_RUN_ID)hold("CHAIN_PARENT_INPUT");
   sent=time(sentText);
   if(sent<epoch||sent>now||sent>=(multi&&hop!=="1"?chainDeadline:epoch+30*MIN)||now-sent>5*MIN)hold("CHAIN_HANDOFF_CLOCK");
   deadline=Math.min(chainDeadline,now+30*MIN);
  }
 }else if(hop!=="0"||parent!=="0"||sentText!==""||chainDeadline-epoch>30*MIN)
  hold("OUTSIDE_INITIAL_BOUNDED_SESSION");
 if(deadline-now<15*MIN)hold("OUTSIDE_INITIAL_BOUNDED_SESSION");
 const wire=env.P6_NONPAID_DAILY_POLICY_BASE64;
 if(typeof wire!=="string"||wire.length>46668||!/^[A-Za-z0-9+/]+={0,2}$/.test(wire))
  hold("MISSING_REVIEWED_CALENDAR");
 const policyBytes=Buffer.from(wire,"base64");
 if(policyBytes.toString("base64")!==wire)hold("NONCANONICAL_POLICY");
 const trust={reviewedCodeSha:env.GITHUB_SHA,manifestSha256:env.V39_P5_MANIFEST_SHA256,
  calendarSha256:env.V39_P5_CALENDAR_HASH,releaseSha256:env.V39_P5_RELEASE_SHA256,rightsSha256:env.V39_P5_RIGHTS_SHA256};
 return {sha:env.GITHUB_SHA,id:Number(env.GITHUB_RUN_ID),epoch,deadline,chainDeadline,chain,rollover,multi,maxHops,hop:Number(hop),parent:Number(parent),sent,policyBytes,
  expectedPolicySha256:env.P6_NONPAID_DAILY_POLICY_SHA256,trust};
}
// Bind the actual ZIP bytes, not merely a mutable artifact name. Reuse
// the independent terminal readback decoder (exact single file, size, SHA256).
function downloadReceipt({meta,token}){
 try{
  const archive=execFileSync("gh",["api","--hostname","github.com","--method","GET","repos/"+REPO+"/actions/artifacts/"+meta.id+"/zip"],{
   env:{PATH:process.env.PATH,HOME:process.env.HOME,GH_TOKEN:token,GH_PROMPT_DISABLED:"1"},
   timeout:30000,maxBuffer:131072,stdio:["ignore","pipe","ignore"]});
  return archive;
 }catch{hold("CHAIN_RECEIPT_UNAVAILABLE");}
}
export function decodeP6PredecessorReceipt(archive,meta){
 try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(unpackP6WindowReceiptArchive(archive,meta)));}
 catch{hold("CHAIN_RECEIPT_ARCHIVE_INVALID");}
}
export async function runP6RollingSession(env,{now=Date.now,sleep=sleepDefault,fetcher=fetch,readPlan,emit=()=>{},readReceipt,readArchive=downloadReceipt,windowCustodyCheck}={}){
 const started=now(),a=admitP6RollingSession(env,started);
 const calendar=loadP6RollingCalendarHints({...a,read:readPlan});
 if(a.epoch<calendar.from||a.chainDeadline>calendar.until)hold("SESSION_OUTSIDE_REVIEWED_POLICY");
 const policyCommitment=createHash("sha256").update(JSON.stringify({policySha256:a.expectedPolicySha256,...a.trust})).digest("hex");
 const windowConfig=admitP6RuntimeWindowConfig(env);
 if(!windowConfig&&windowCustodyCheck!==undefined)hold("UNEXPECTED_WINDOW_CHECK");
 const checkWindow=windowConfig?(windowCustodyCheck??createP6RuntimeWindowCustody(windowConfig)):null;
 let windowCustody=null,previousCustody=null,verifiedRootId=null,rootClaimWrites=0;
 async function guardWindow(kind){
  if(!checkWindow)return;
  if(!verifiedRootId)hold("WINDOW_ROOT_NOT_AUTHENTICATED");
  const fresh=exactP6RuntimeWindowReceipt(await checkWindow({scope:a,rootId:verifiedRootId,kind,readPlan}),
   {scope:a,rootId:verifiedRootId,policyCommitment,clock:now(),kind});
  if(windowCustody)compareP6WindowCustody(windowCustody,fresh);
  if(previousCustody)compareP6WindowCustody(previousCustody,fresh);
  windowCustody=fresh;
  if(kind==="CLAIM")rootClaimWrites=1;
 }
 let ledger,prior=null,priorTerminalIds=new Set(),priorRetirement=null;
 // Keep origin/chain deadline immutable for protected root admission. Only
 // the working history epoch can move after authenticated independent proof.
 let historyEpoch=a.epoch,retirementAudit=null;
 const scheduleEvidenceCache=createP6RollingScheduleEvidenceCache();
 let requests=0,waves=0,calendarDeferred=0,capacityDeferred=0,visibilityDeferrals=0,visibilityUnresolved=false;
 let requestBudgetDeferred=0,requestBudgetStop=false;
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"};
 const api=async(url,init)=>{
  const u=new URL(url);
  if(u.origin!=="https://api.github.com"||!u.pathname.startsWith("/repos/"+REPO+"/")||
     u.username||u.password||u.hash||!["GET","POST"].includes(init?.method)||
     now()>=a.deadline-12000||++requests>REQUEST_CAP)hold("API_SCOPE_OR_SESSION_REQUEST_BOUND");
  // Every write originates only in the imported fixed-route dispatch core.
  // Refuse a call if it cannot leave a separate reconciliation window.
  if(init.method==="POST"&&now()>=a.deadline-12*MIN)hold("DISPATCH_DRAIN_BOUND");
  const response=await fetcher(url,{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
  const remaining=response.headers?.get?.("x-ratelimit-remaining");
  if(remaining!==null&&remaining!==undefined&&(!/^\d+$/.test(remaining)||Number(remaining)<25))
   hold("RATE_LIMIT_RESERVE");
  return response;
 };
 const get=async(path)=>{
  const res=await api(ROOT+path,{method:"GET",headers});
  if(!res.ok)hold("GITHUB_READ_UNAVAILABLE");
  return await res.json();
 };
 const main=async()=>{if((await get("/git/ref/heads/main"))?.object?.sha!==a.sha)hold("MAIN_CHANGED");};
 async function uniqueRoot(){
  const path=".github/workflows/"+WF,created=encodeURIComponent(">="+new Date(a.epoch).toISOString());
  const h=await get("/actions/workflows/"+WF+"/runs?branch=main&event=workflow_dispatch&per_page=100&created="+created);
  const expected=a.chain?a.hop+1:1;
  if(h?.total_count!==expected||!Array.isArray(h.workflow_runs)||h.workflow_runs.length!==expected||
     new Set(h.workflow_runs.map(x=>x.id)).size!==expected)hold("PREVIOUS_OR_DUPLICATE_SESSION_NO_REPLAY");
  function exact(row,id){
   const createdAt=Date.parse(row?.created_at);
   if(row?.id!==id||row.path!==path||row.head_sha!==a.sha||row.head_branch!=="main"||
      row.event!=="workflow_dispatch"||row.run_attempt!==1||
      !Number.isFinite(createdAt)||createdAt<a.epoch||createdAt>now()+5000)
    hold("SESSION_ROOT_IDENTITY_DRIFT");
   return row;
  }
  const row=exact(h.workflow_runs.find(x=>x.id===a.id),a.id);
  if(row.status!=="in_progress"||row.conclusion!==null||
     (a.chain&&row.display_title!==chainTitle(a.hop,a.parent))||
     (a.hop>0&&Date.parse(row.created_at)<a.sent-1000))
   hold("SESSION_ROOT_IDENTITY_DRIFT");
  if(a.hop===0){verifiedRootId=a.id;return;}
  const parent=exact(h.workflow_runs.find(x=>x.id===a.parent),a.parent);
  let predecessorParent=0,foundRoot=a.parent;
  if(a.multi){
   // Earlier controller runs must form one exact linear chain.
   let previousId=0,previousClock=a.epoch;
   for(let hop=0;hop<=a.hop;hop++){
    const matches=h.workflow_runs.filter(x=>x.display_title===chainTitle(hop,previousId));
    if(matches.length!==1)hold("CHAIN_ANCESTOR_IDENTITY");
    const ancestor=exact(matches[0],matches[0].id),createdAt=Date.parse(ancestor.created_at);
    if(!idok(String(ancestor.id))||createdAt<previousClock||
       (hop<a.hop-1&&(ancestor.status!=="completed"||ancestor.conclusion!=="success"))||
       (hop===a.hop-1&&ancestor.id!==a.parent)||(hop===a.hop&&ancestor.id!==a.id))
     hold("CHAIN_ANCESTOR_IDENTITY");
    if(hop===0)foundRoot=ancestor.id;
    if(hop===a.hop-1)predecessorParent=previousId;
    previousId=ancestor.id;previousClock=createdAt;
   }
  }
  if(parent.display_title!==chainTitle(a.hop-1,predecessorParent)||Date.parse(parent.created_at)>a.sent)
   hold("CHAIN_PARENT_IDENTITY");
  if(parent.status!=="completed")hold("CHAIN_PARENT_NOT_TERMINAL");
  if(parent.conclusion!=="success")hold("CHAIN_PARENT_FAILED");
  const direct=exact(await get("/actions/runs/"+a.parent),a.parent);
  if(direct.display_title!==parent.display_title||direct.created_at!==parent.created_at||direct.status!=="completed"||direct.conclusion!=="success")
   hold("CHAIN_PARENT_READBACK");
  const jobs=await get("/actions/runs/"+a.parent+"/jobs?filter=latest&per_page=100");
  if(!Number.isSafeInteger(jobs?.total_count)||jobs.total_count<1||jobs.total_count>100||
     !Array.isArray(jobs.jobs)||jobs.jobs.length!==jobs.total_count)hold("CHAIN_PARENT_JOB_HISTORY");
  const required=jobs.jobs.filter(j=>j.name===JOB);
  if(required.length!==1||!Number.isSafeInteger(required[0].id)||required[0].id<1||
     required[0].run_id!==a.parent||required[0].head_sha!==a.sha||required[0].run_attempt!==1||
     required[0].status!=="completed"||required[0].conclusion!=="success")
   hold("CHAIN_PARENT_JOB");
  for(const step of STEPS){
   const actual=required[0].steps?.filter(s=>s.name===step)??[];
   if(actual.length!==1||actual[0].status!=="completed"||actual[0].conclusion!=="success")
    hold("CHAIN_PARENT_STEP");
  }
  if(verifiedRootId!==null&&verifiedRootId!==foundRoot)hold("WINDOW_ROOT_DRIFT");
  verifiedRootId=foundRoot;
  if(prior!==null)return;
  const name="p6-rolling-terminal-"+a.parent;
  async function receiptMetadata(){
   const art=await get("/actions/runs/"+a.parent+"/artifacts?per_page=100");
   if(art?.total_count!==1||!Array.isArray(art.artifacts)||art.artifacts.length!==1)hold("CHAIN_RECEIPT_HISTORY");
   const meta=art.artifacts[0];
   if(meta.name!==name||meta.expired!==false||!Number.isSafeInteger(meta.id)||meta.id<1||
      !Number.isSafeInteger(meta.size_in_bytes)||meta.size_in_bytes<1||meta.size_in_bytes>65536||
      (meta.workflow_run&&Number(meta.workflow_run.id)!==a.parent)||
      !/^sha256:[a-f0-9]{64}$/.test(meta.digest??""))hold("CHAIN_RECEIPT_IDENTITY");
   return {id:meta.id,name,size:meta.size_in_bytes,digest:meta.digest};
  }
  const meta=await receiptMetadata();
  // readReceipt is only a dependency-injected test seam; production always
  // downloads the immutable artifact ID and validates archive bytes.
  const receipt=readReceipt?await readReceipt({parent:a.parent,name,meta,token:env.GITHUB_TOKEN}):
   decodeP6PredecessorReceipt(await readArchive({meta,token:env.GITHUB_TOKEN}),meta);
  if(JSON.stringify(meta)!==JSON.stringify(await receiptMetadata()))hold("CHAIN_RECEIPT_METADATA_CHANGED");
  if(receipt?.schema!=="v39.phase6.bounded-rolling-session.v1"||
     receipt.status!=="BOUNDED_SESSION_SUCCESSOR_ACKNOWLEDGED_NOT_COLLECTION_PROOF"||
     receipt.sessionHop!==a.hop-1||receipt.parentRunId!==predecessorParent||receipt.runId!==a.parent||
     receipt.nextRunId!==a.id||receipt.nextDispatchAtUtc!==new Date(a.sent).toISOString()||
     receipt.reviewedMainSha!==a.sha||receipt.epochUtc!==new Date(a.epoch).toISOString()||
     ((a.hop===1)?receipt.deadlineUtc!==new Date(a.epoch+30*MIN).toISOString():
      (time(receipt.deadlineUtc)<=a.sent||time(receipt.deadlineUtc)>a.chainDeadline||
       time(receipt.deadlineUtc)>Date.parse(parent.created_at)+35*MIN))||
     receipt.chainDeadlineUtc!==new Date(a.chainDeadline).toISOString()||
     receipt.policyCommitment!==policyCommitment||receipt.successorDispatches!==1||
     receipt.unknownAttempts!==0||!Array.isArray(receipt.pending)||!Array.isArray(receipt.pendingAcknowledgements)||
     receipt.providerCalls!==0||receipt.databaseWrites!==(checkWindow&&a.hop===1?1:0)||receipt.phase6PaidGo!==false||
     !Number.isSafeInteger(receipt.acknowledged)||receipt.acknowledged<0||receipt.acknowledged>P6_ROLLING_ACK_CAPACITY||
     !Number.isSafeInteger(receipt.verifiedTerminal)||receipt.verifiedTerminal<0||!Array.isArray(receipt.terminalAcknowledgements)||
     receipt.terminalAcknowledgements.length!==receipt.verifiedTerminal||
     receipt.pendingAcknowledgements.length!==receipt.pending.length||
     receipt.verifiedTerminal+receipt.pending.length!==receipt.acknowledged||
     receipt.ackCapacityExhausted!==false||receipt.remainingDispatchCapacity!==P6_ROLLING_ACK_CAPACITY-receipt.acknowledged)
    hold("CHAIN_RECEIPT_ACK_OR_POLICY_MISMATCH");
  if(checkWindow){
   if(!receipt.windowCustody||receipt.windowCustody.rootRunId!==foundRoot||receipt.windowCustody.policyCommitment!==policyCommitment)
    hold("WINDOW_PARENT_CUSTODY_MISSING");
   previousCustody=receipt.windowCustody;
  }else if(receipt.windowCustody!==undefined)hold("UNEXPECTED_WINDOW_PARENT_CUSTODY");
  if(a.multi&&(receipt.maxSessionHops!==a.maxHops||receipt.chainMode!=="PROTECTED_FOUR_SESSION_BOUND"))hold("CHAIN_MULTI_RECEIPT_SCOPE");
  const all=[...receipt.terminalAcknowledgements,...receipt.pendingAcknowledgements];
  if(new Set(all.map(x=>x?.runId)).size!==all.length||
     new Set(receipt.pendingAcknowledgements.map(x=>x?.lane)).size!==receipt.pendingAcknowledgements.length||
     all.some(x=>!x||!Number.isFinite(Date.parse(x.sentAtUtc))||Date.parse(x.sentAtUtc)>a.sent)||
     receipt.pending.some(x=>!x||Object.keys(x).sort().join(",")!=="lane,runId"||
       !receipt.pendingAcknowledgements.some(y=>y?.lane===x.lane&&y?.runId===x.runId))||
     new Set(receipt.pending.map(x=>x.runId)).size!==receipt.pending.length)
    hold("CHAIN_RECEIPT_ACK_OR_POLICY_MISMATCH");
  if(a.rollover){
   const p=receipt.historyRetirementCandidate;
   const priorEpoch=time(receipt.historyEpochUtc);
   if(priorEpoch<a.epoch||priorEpoch>a.sent||((!a.multi||a.hop===1)&&priorEpoch!==a.epoch)||
      receipt.historyRetirementMode!==(a.multi?"PROTECTED_FOUR_SESSION_BOUND":"PROTECTED_TWO_SESSION_REHEARSAL")||
      !p||p.schema!=="v39.phase6.rolling-history-retirement.v1"||
      !["RETIREMENT_NO_ADVANCE_KEEP_PRIOR_EPOCH","REVIEWED_RETIREMENT_CANDIDATE_NO_GO"].includes(p.status)||
      p.reviewedMainSha!==a.sha||p.priorEpochUtc!==receipt.historyEpochUtc||
      p.phase6PaidGo!==false||p.providerCalls!==0||p.databaseReads!==0||p.databaseWrites!==0||p.dispatchCount!==0||
      time(p.observedAtUtc)>a.sent||time(p.observedAtUtc)<priorEpoch||
      time(p.proposedEpochUtc)<priorEpoch||time(p.proposedEpochUtc)>a.sent||
      (p.status==="RETIREMENT_NO_ADVANCE_KEEP_PRIOR_EPOCH"&&
       (p.proposedEpochUtc!==receipt.historyEpochUtc||p.retiredRunCount!==0))||
      (p.status==="REVIEWED_RETIREMENT_CANDIDATE_NO_GO"&&
       (time(p.proposedEpochUtc)<=priorEpoch||p.requiresIndependentSuccessorReadback!==true)))
    hold("CHAIN_RETIREMENT_RECEIPT_SCOPE");
   priorRetirement=p;
   historyEpoch=priorEpoch;
  }else if(receipt.historyRetirementMode!==undefined||receipt.historyRetirementCandidate!==undefined)
   hold("CHAIN_UNEXPECTED_RETIREMENT_RECEIPT");
  prior=all;priorTerminalIds=new Set(receipt.terminalAcknowledgements.map(x=>x.runId));
 }
 async function pause(ms){
  const prior=now();
  await sleep(ms);
  if(now()<prior+ms-250||now()>=a.deadline)hold("SESSION_CLOCK_OR_DEADLINE");
 }
 await main();
 for(let i=0;;i++){
  try{await uniqueRoot();break;}
  catch(e){if(e?.message!=="HOLD_P6_ROLLING_RUNTIME_CHAIN_PARENT_NOT_TERMINAL"||i>=5)throw e;await pause(5000);}
 }
 await guardWindow(a.hop===0?"CLAIM":"READ");
 ledger=createP6SessionAckLedger({...a,epoch:historyEpoch,now,emit,priorAcknowledgements:prior??[]});
 if(a.hop>0){
  const inherited=await ledger.reconcile({token:env.GITHUB_TOKEN,fetcher:api});
  // Re-read every inherited ACK, including the ones still running in the
  // predecessor. A predecessor terminal claim may never regress to active.
  if(inherited.unknownAttempts||inherited.pending.some(x=>priorTerminalIds.has(x.runId)))
   hold("CHAIN_PRIOR_TERMINAL_ACK_REGRESSED");
  if(a.rollover){
   if(priorRetirement.status==="REVIEWED_RETIREMENT_CANDIDATE_NO_GO"){
    const closing=[];
    const oldEpoch=historyEpoch;
    const old=await readP6RollingGithubSnapshot({sha:a.sha,epoch:oldEpoch,token:env.GITHUB_TOKEN,now,fetcher:api,
     verifySnapshot:(_route,snapshot)=>closing.push(snapshot),scheduleEvidenceCache});
    if(old.plan.status!=="REVIEWED_ROLLING_WAVE_PLAN_NO_GO")hold("CHAIN_RETIREMENT_OLD_HISTORY_HOLD");
    ledger.verifyContinuationHistory(closing);
    const proof=await old.reviewHistoryRetirement({previousReceipt:priorRetirement});
    const partition=ledger.reviewRolloverPartition(proof);
    // The old authenticated parent artifact still contains all ACKs.
    // Only terminal independently proved prefix records leave working
    // memory. Every carried record must be re-reconciled before any POST.
    const carry=[...partition.carriedTerminalAcknowledgements,...partition.carriedPendingAcknowledgements];
    const terminalCarry=new Set(partition.carriedTerminalAcknowledgements.map(x=>x.runId));
    historyEpoch=time(partition.proposedEpochUtc);
    await main();await uniqueRoot();
    ledger=createP6SessionAckLedger({...a,epoch:historyEpoch,now,emit,priorAcknowledgements:carry});
    const checked=await ledger.reconcile({token:env.GITHUB_TOKEN,fetcher:api});
    if(checked.unknownAttempts||checked.pending.some(x=>terminalCarry.has(x.runId)))
     hold("CHAIN_CARRIED_TERMINAL_ACK_REGRESSED");
    retirementAudit=partition;
    emit({status:"CHAIN_WORKING_HISTORY_RETIREMENT_INDEPENDENTLY_VERIFIED_NO_NEW_PERMISSION",
     oldEpochUtc:new Date(oldEpoch).toISOString(),historyEpochUtc:new Date(historyEpoch).toISOString(),
     retiredAcknowledgements:partition.retiredAcknowledgements.length,carriedAcknowledgements:carry.length,
     providerCalls:0,databaseWrites:0,phase6PaidGo:false});
   }else{
    retirementAudit={status:"RETIREMENT_NO_ADVANCE_KEEP_PRIOR_EPOCH",existingLedgerUnchanged:true};
   }
  }
 }
 // Allow a maximum of 8 waves under the first 30-minute protected window.
 // 2 minutes polling cadence is provisional; actual timing must be measured.
 while(waves<8&&now()<a.deadline-12*MIN-60000){
  if(requests>=WAVE_START_BOUND){requestBudgetStop=true;break;}
  await ledger.reconcile({token:env.GITHUB_TOKEN,fetcher:api});
  let observation;
  try{
   observation=await readP6RollingGithubSnapshot({sha:a.sha,epoch:historyEpoch,token:env.GITHUB_TOKEN,now,fetcher:api,
    verifySnapshot:ledger.assertVisible,scheduleEvidenceCache});
  }catch(e){
   // A known ACK may be temporarily absent from GitHub's list or become
   // terminal between direct readback and the list. Retry GETs only, never
   // POSTs; other identity/authorization failures remain immediate HOLDs.
   if(!["HOLD_P6_ROLLING_SESSION_ACK_NOT_VISIBLE_IN_EXACT_HISTORY","HOLD_P6_ROLLING_SESSION_ACK_TERMINAL_NOT_YET_RECONCILED"].includes(e?.message))throw e;
   visibilityUnresolved=true;visibilityDeferrals++;waves++;
   emit({status:"ROLLING_WAVE_DEFERRED_ACK_VISIBILITY_NO_DISPATCH",wave:waves,...ledger.status()});
   if(waves<8&&now()+2*MIN<a.deadline-12*MIN-60000){await pause(2*MIN);continue;}
   break;
  }
  visibilityUnresolved=false;
  const {plan,recheckRoute}=observation;
  if(plan.status!=="REVIEWED_ROLLING_WAVE_PLAN_NO_GO")hold("CURRENT_HISTORY_HOLD");
  const hint=assessP6RollingCalendarHints(calendar,now());
  if(hint.status!=="REVIEWED_CALENDAR_WAKE_HINT_ONLY_NO_GO")hold("CALENDAR_WINDOW_UNKNOWN");
  const calendarPlan=restrictP6RollingWave(plan,hint.hints.filter(x=>x.mayNeedWork).map(x=>x.lane));
  calendarDeferred+=calendarPlan.calendarDeferred.length;
  // Bound possible new ACKs before calling the dispatch core. Never
  // enlarge the reviewed wave or count a capacity deferral as collection.
  const capacity=ledger.remainingDispatchCapacity();
  const narrowed=restrictP6RollingWave(calendarPlan,calendarPlan.due.slice(0,capacity));
  const deferredByCapacity=calendarPlan.due.length-narrowed.due.length;
  capacityDeferred+=deferredByCapacity;
  if(narrowed.due.length){
   await guardWindow("READ");
   const dispatchDeadline=Math.min(a.deadline-12*MIN,now()+5*MIN);
   if(dispatchDeadline-now()<60000)break;
   const waveResult=await dispatchP6ReviewedRollingWave(narrowed,{sha:a.sha,approvedSha:a.sha,releaseApproved:true,token:env.GITHUB_TOKEN,
    deadline:dispatchDeadline,now,fetcher:api,recheckRoute:async route=>ledger.assertVisible(route,await recheckRoute(route)),
    mayStartAttempt:()=>requests<DISPATCH_REQUEST_BOUND,onEvidence:ledger.evidence});
   requestBudgetDeferred+=waveResult.requestBudgetDeferred.length;
   if(waveResult.requestBudgetDeferred.length)requestBudgetStop=true;
  }
  waves++;
  emit({status:"ROLLING_WAVE_OBSERVED_NOT_COLLECTION_PROOF",wave:waves,calendarDeferred:calendarPlan.calendarDeferred.length,
   capacityDeferred:deferredByCapacity,requestBudgetDeferred,requestBudgetStop,remainingDispatchCapacity:ledger.remainingDispatchCapacity(),...ledger.status()});
  if(ledger.remainingDispatchCapacity()===0||requestBudgetStop||requests>=WAVE_START_BOUND){
   if(requests>=WAVE_START_BOUND)requestBudgetStop=true;
   break;
  }
  if(waves<8&&now()+2*MIN<a.deadline-12*MIN-60000)await pause(2*MIN);else break;
 }
 // A first approved chain session can transfer EXACT known active ACK
 // custody; no unknown dispatch, no fresh epoch, no extra paid permission.
 // Final session (and standalone session) must still drain every ACK.
 for(let i=0;i<24;i++){
  const state=await ledger.reconcile({token:env.GITHUB_TOKEN,fetcher:api});
  const hasSuccessor=a.chain&&a.hop+1<a.maxHops&&(!a.multi||a.chainDeadline-now()>=18*MIN);
  const transferKnownActive=hasSuccessor&&ledger.remainingDispatchCapacity()>0&&state.pending.length>0;
  if(!state.pending.length||transferKnownActive){
   // The final dispatch can occur after the last ordinary visibility
   // check. Do not export terminal custody until a fresh complete snapshot
   // contains every independently reconciled ACK in normal history.
   const closing=[];
   const final=await readP6RollingGithubSnapshot({sha:a.sha,epoch:historyEpoch,token:env.GITHUB_TOKEN,now,fetcher:api,
    verifySnapshot:(route,snapshot)=>closing.push(snapshot),scheduleEvidenceCache});
   // A stale ordinary-wave visibility flag is not fresh closing evidence.
   // Reconcile once more after a transient listing omission. Never dispatch
   // new workers in this drain loop, and never retry a POST. Preserve the
   // shared request/time caps and stop on identity or terminal regression.
   try{
    if(transferKnownActive)ledger.verifyContinuationHistory(closing);
    else ledger.verifyTerminalHistory(closing);
   }catch(e){
    const transient=["HOLD_P6_ROLLING_SESSION_ACK_NOT_VISIBLE_IN_EXACT_HISTORY",
     "HOLD_P6_ROLLING_SESSION_ACK_TERMINAL_NOT_YET_RECONCILED",
     ...(transferKnownActive?["HOLD_P6_ROLLING_SESSION_ACK_CONTINUATION_ACTIVE_HISTORY_DRIFT"]:[])].includes(e?.message);
    if(!transient)throw e;
    // At most two closing GET retries, only with conservative API and time
    // headroom. Exhaustion remains HOLD rather than an incomplete receipt.
    if(i>=2||requests>=360||now()+5000>=a.deadline-30000){
     if(visibilityUnresolved)hold("ACK_HISTORY_VISIBILITY_UNRESOLVED_NO_SUCCESSOR");
     throw e;
    }
    emit({status:transferKnownActive?"CHAIN_KNOWN_ACK_HANDOFF_READBACK_DEFERRED_NO_POST":
     "CLOSING_TERMINAL_ACK_READBACK_DEFERRED_NO_POST",...state});
    await pause(5000);continue;
   }
   if(visibilityUnresolved){
    emit({status:"CLOSING_ACK_VISIBILITY_RECOVERED_NO_NEW_WORKER_POST",...state});
    visibilityUnresolved=false;
   }
   if(final.plan.status!=="REVIEWED_ROLLING_WAVE_PLAN_NO_GO")hold("FINAL_HISTORY_HOLD_NO_SUCCESSOR");
   await uniqueRoot();await main();
   const {terminalAcknowledgements,pendingAcknowledgements}=transferKnownActive?ledger.continuationAcknowledgements():
    {terminalAcknowledgements:ledger.terminalAcknowledgements(),pendingAcknowledgements:Object.freeze([])};
   const ackCapacityExhausted=ledger.remainingDispatchCapacity()===0;
   // Independent predecessor history is proposed BEFORE a successor POST.
   // No advance is a valid outcome, not a reason to force a reset.
   const retirementCandidate=a.rollover&&hasSuccessor&&!ackCapacityExhausted?
    await final.reviewHistoryRetirement():null;
   // Retirement review may take additional GETs. Do not dispatch a successor
   // against an earlier main/root observation after such a review.
   if(retirementCandidate){await uniqueRoot();await main();}
   const result={schema:"v39.phase6.bounded-rolling-session.v1",
    status:ackCapacityExhausted?"BOUNDED_ACK_CAPACITY_EXHAUSTED_NO_SUCCESSOR_NOT_COLLECTION_PROOF":
     a.chain?"BOUNDED_CHAIN_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF":"BOUNDED_SESSION_TERMINAL_NO_SUCCESSOR_NOT_COLLECTION_PROOF",
    runId:a.id,reviewedMainSha:a.sha,epochUtc:new Date(a.epoch).toISOString(),deadlineUtc:new Date(a.deadline).toISOString(),
    chainDeadlineUtc:new Date(a.chainDeadline).toISOString(),sessionHop:a.hop,parentRunId:a.parent,
    waves,calendarDeferred,capacityDeferred,requestBudgetDeferred,requestBudgetStop,ackCapacityExhausted,remainingDispatchCapacity:ledger.remainingDispatchCapacity(),visibilityDeferrals,githubRequests:requests,policyCommitment,terminalAcknowledgements,pendingAcknowledgements,
    successorDispatches:0,nextRunId:null,...state,
     ...(windowCustody?{windowCustody,databaseWrites:rootClaimWrites}:{}),
    ...(a.multi?{chainMode:"PROTECTED_FOUR_SESSION_BOUND",maxSessionHops:a.maxHops}:{}),
    ...(a.rollover?{historyRetirementMode:a.multi?"PROTECTED_FOUR_SESSION_BOUND":"PROTECTED_TWO_SESSION_REHEARSAL",historyEpochUtc:new Date(historyEpoch).toISOString(),
      ...(retirementCandidate?{historyRetirementCandidate:retirementCandidate}:{}),
      ...(retirementAudit?{historyRetirementAudit:retirementAudit}:{})}:{} )};
   if(!hasSuccessor||ackCapacityExhausted)return result;
   await guardWindow("READ");
   const sent=now();
   // This single POST is to the same controller, not a collection route.
   // The successor can only start after the root publishes its exact ACK
   // receipt and finishes; failure or unknown acceptance is never retried.
   if(sent>=a.deadline-30000||a.chainDeadline-sent<17*MIN||++requests>REQUEST_CAP)
    hold("CHAIN_SUCCESSOR_DEADLINE");
   emit({status:"CHAIN_SUCCESSOR_ATTEMPT_BEFORE_ACK",runId:a.id,sentAtUtc:new Date(sent).toISOString()});
   try{
    const res=await fetcher(ROOT+"/actions/workflows/"+WF+"/dispatches",{method:"POST",
     headers:{...headers,"Content-Type":"application/json"},redirect:"error",signal:AbortSignal.timeout(10000),
     body:JSON.stringify({ref:"main",return_run_details:true,inputs:{
      confirm:a.multi?MULTI_CONFIRM:a.rollover?ROLLOVER_CONFIRM:CHAIN_CONFIRM,approved_main_sha:a.sha,chain_hop:String(a.hop+1),parent_run_id:String(a.id),sent_at_utc:new Date(sent).toISOString()
     }})});
    if(res.status!==200)hold("CHAIN_ACK");
    const b=await res.json(),id=b?.workflow_run_id;
    if(!Number.isSafeInteger(id)||id<1||id===a.id||[...terminalAcknowledgements,...pendingAcknowledgements].some(x=>x.runId===id)||
       b.run_url!==ROOT+"/actions/runs/"+id||b.html_url!=="https://github.com/"+REPO+"/actions/runs/"+id)
     hold("CHAIN_ACK");
    emit({status:"CHAIN_SUCCESSOR_EXACT_ACK_NOT_EXECUTION_PROOF",runId:a.id,nextRunId:id,sentAtUtc:new Date(sent).toISOString()});
    return {...result,status:"BOUNDED_SESSION_SUCCESSOR_ACKNOWLEDGED_NOT_COLLECTION_PROOF",
     successorDispatches:1,nextRunId:id,nextDispatchAtUtc:new Date(sent).toISOString(),githubRequests:requests};
   }catch{hold("CHAIN_UNKNOWN_SUCCESSOR_ACK_NO_REPLAY");}
  }
  if(now()+30000>=a.deadline-12000)hold("PENDING_ACCEPTED_WORKERS_AT_DEADLINE");
  await pause(30000);
 }
 hold("BOUND_EXHAUSTED_PENDING_ACCEPTED_WORKERS");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let journal;
 try{
  // Refuse before any POST if the terminal receipt destination or local
  // custody file cannot be initialized. No new remote write path.
  if(!process.env.RUNNER_TEMP)hold("RUNNER_TEMP_REQUIRED");
  const scope=admitP6RollingSession(process.env);
  journal=createP6RollingFailureJournal(join(process.env.RUNNER_TEMP,P6_ROLLING_FAILURE_JOURNAL_FILE),scope);
  const out=await runP6RollingSession(process.env,{emit:e=>{
   journal.record(e); // Sync finite attempt/ACK evidence before returning.
   console.log(JSON.stringify(e));
  }});
  writeFileSync(join(process.env.RUNNER_TEMP,RECEIPT_FILE),JSON.stringify(out),{flag:"wx",mode:0o600});
  console.log(JSON.stringify(out));
 }catch(e){const m=e?.message??"";console.error(/^HOLD_P6_ROLLING_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_ROLLING_RUNTIME_REDACTED_NO_REPLAY");process.exitCode=2;}
 finally{if(journal)journal.close();}
}
