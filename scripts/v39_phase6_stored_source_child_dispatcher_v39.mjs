/**
 * Stored-mode SOURCE dispatcher, reusing the 10min parent and existing
 * one-GET child. Never a provider client or DB writer. Original paid
 * admission, atomic V0079/V0080/V0082 reservation and STOP remain in child.
 */
import {writeP6ParentOutcome,preserveP6ParentChildCustody} from "../server/lib/disruption/phase6RollingParentOutcome_v39.mjs";
import {runP6RealPrivateSourceParentReadOnly}
 from "./v39_phase6_private_source_parent_readonly_v39.mjs";
import {readP5CompleteGithubWorkflowHistory,readP5CompleteCurrentParentHistory}
 from "../server/lib/disruption/phase5GithubCompleteWorkflowHistory_v39.ts";
import {readP6StableSourceTrust,P6_STORED_PRIVATE_PATH_PLACEHOLDER}
 from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {P6_STORED_SOURCE_CAPACITY as CAP} from "../server/lib/disruption/phase6PrivateSourceDayEpochDueParentReview_v39.ts";
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const CHILD="phase5-one-signed-day-source-child-dispatch.yml";
const JOB="separately-authorized-stored-source-children";
const STEP="Dispatch stored SOURCE exact children";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const fail=s=>{throw Error("HOLD_P6_STORED_SOURCE_DISPATCH_"+s);};
const flags=["V39_P5_SOURCE_QUEUE_OWNER_APPROVED","V39_P5_AUTO_SOURCE_DISPATCH_APPROVED",
 "V39_P5_SIGNED_DAY_REGISTRY_RELEASE","V39_PHASE5_FREEZE_SIGNED",
 "V39_PHASE5_SOURCE_RIGHTS_APPROVED","V39_PHASE6_PROCESS_ARMED",
 "V39_P5_SOURCE_DB_ROLE_REVIEWED","V39_P5_SEVEN_REST_BUDGET_SIGNED",
 "P6_PRIVATE_SOURCE_TRANSPORT_APPROVED","P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED",
 "P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED","P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED"];
export function admitP6StoredSourceDispatcher(env){
 if(env?.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||!(env.GITHUB_EVENT_NAME==="schedule"? !env.P6_CURRENT_PARENT_DISPATCH_CONFIRM:
     env.GITHUB_EVENT_NAME==="workflow_dispatch"&&env.P6_CURRENT_PARENT_DISPATCH_CONFIRM==="RUN_CURRENT_SIGNED_SOURCE_PARENT")||
    env.GITHUB_RUN_ATTEMPT!=="1"||!/^\d{5,20}$/.test(env.GITHUB_RUN_ID??"")||
    !Number.isSafeInteger(Number(env.GITHUB_RUN_ID))||
    !CODE.test(env.GITHUB_SHA??"")||
    [env.V39_P5_APPROVED_CODE_SHA,env.V39_P5_QUEUE_APPROVED_CODE_SHA,
     env.P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA].some(x=>x!==env.GITHUB_SHA)||
    env.P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED!=="true"||
    env.P6_PRIVATE_SOURCE_REVIEW_MODE!=="stored"||
    env.P5_AUTO_SOURCE_DISPATCH_ENABLED==="true"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_P5_REST_UNIT_PRICE_APPROVED!=="2"||
    flags.some(k=>env[k]!=="1")||
    [env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,env.AERODATABOX_API_KEY,
     env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.P5_V39_PRE_DATABASE_URL,
     env.P5_V39_PREPARE_DATABASE_URL,env.P6_PRIVATE_SOURCE_PARENT_RO_DAY_REVIEWS_BASE64,
     env.V39_P5_SOURCE_BATCH_REGISTRY_SHA256].some(Boolean)||
    !env.V39_P5_SOURCE_DATABASE_URL||!env.P6_PRIVATE_READER_DATABASE_URL||
    !SHA.test(env.V39_P5_PROVIDER_CONTRACT_SHA256??"")||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<20)
  fail("NO_EXACT_INDEPENDENT_STORED_DISPATCH_RELEASE");
 readP6StableSourceTrust(env);
}
function historyUrl(workflow,event,clock){
 return ROOT+"/actions/workflows/"+workflow+"/runs?event="+event+
  "&per_page=100&created="+encodeURIComponent(new Date(clock-3*3600000).toISOString()+
    ".."+new Date(clock+60000).toISOString());
}
function validateInputs(p){
 const keys=["signed_registry_file","frozen_release_file","query_digest","run_day_index",
  "confirm","private_transport","private_confirm","routing_intent_sha256",
  "day_index_revision","day_index_sha256"];
 if(!p||Object.keys(p).sort().join("|")!==keys.sort().join("|")||
    p.signed_registry_file!==P6_STORED_PRIVATE_PATH_PLACEHOLDER||
    p.frozen_release_file!==P6_STORED_PRIVATE_PATH_PLACEHOLDER||
    p.private_transport!=="stored"||
    p.private_confirm!=="ONE_PRIVATE_SOURCE_ORIGINAL_P5_CHILD_SAME_JOB_ONE_GET"||
    p.confirm!=="ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET"||
    !/^(?:[1-9]|[12][0-9]|3[01])$/.test(p.run_day_index??"")||
    !/^[1-9][0-9]{0,3}$/.test(p.day_index_revision??"")||
    Number(p.day_index_revision)>1024||
    ![p.query_digest,p.routing_intent_sha256,p.day_index_sha256].every(x=>typeof x==="string"&&SHA.test(x)))
  fail("UNVERIFIED_OPAQUE_CHILD_INPUTS");
}
export async function proveNoPriorUncertainStoredDispatch({history,currentRunId,fetcher,headers}){
 if(!history.workflow_runs.some(x=>x.id===currentRunId))
  fail("CURRENT_SCHEDULE_NOT_VISIBLE_IN_COMPLETE_HISTORY");
 for(const run of history.workflow_runs){
  // A successful latest workflow attempt can hide an earlier uncertain
  // dispatch step after a manual rerun. Inspect all attempts even on success.
  if(run.id===currentRunId)continue;
  const rr=await fetcher(ROOT+"/actions/runs/"+run.id+"/jobs?per_page=100&filter=all",{method:"GET",headers});
  if(!rr.ok)fail("PRIOR_PARENT_JOBS_UNAVAILABLE");
  const data=await rr.json();
  if(!Number.isSafeInteger(data?.total_count)||data.total_count<0||
     data.total_count>100||!Array.isArray(data.jobs)||data.jobs.length!==data.total_count)
   fail("PRIOR_PARENT_JOB_HISTORY_INCOMPLETE");
  for(const job of data.jobs){
   if(typeof job?.name!=="string")fail("MALFORMED_PARENT_JOB_HISTORY");
   if(job.name!==JOB)continue;
   if(job.conclusion==="skipped"||["queued","waiting","pending","requested"].includes(job.status))continue;
   if(!Array.isArray(job.steps))fail("PRIOR_DISPATCH_STEP_UNAVAILABLE");
   const steps=job.steps.filter(x=>x?.name===STEP);
   if(steps.length>1)fail("PRIOR_DISPATCH_STEP_AMBIGUOUS");
   const s=steps[0];
   if(!s){
    if(job.status!=="completed")fail("PRIOR_PARENT_IN_PROGRESS");
    continue; // setup-only failure, no dispatch step ran
   }
   if(s.conclusion==="skipped"||s.conclusion==="success")continue;
   // Prior ambiguity in a still-due overlap; max source lead 105m, 3h fence.
   fail("PREVIOUS_DISPATCH_UNCERTAIN_NO_REPLAY");
  }
 }
}
const summary=(status,more={})=>Object.freeze({schema:"v39.phase6.stored-source-dispatch-controller.v1",
 status,...more,providerCallsByParent:0,databaseWritesByParent:0,
 paidGetsCertifiedByParent:0,independentPaidChildAdmissionStillRequired:true});
export async function runP6StoredSourceDispatcher(env,options={}){
 admitP6StoredSourceDispatcher(env);
 const underlying=options.fetchImpl??fetch;
 const fetcher=(url,init)=>underlying(url,{...init,signal:AbortSignal.timeout(12000),redirect:"error"});
 const observe=options.observe??runP6RealPrivateSourceParentReadOnly,now=options.now??Date.now;
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,
  "X-GitHub-Api-Version":"2022-11-28"};
 let proposals,previousIds,active,historyClock,unavailableDays=0,unavailableQueries=0;
 try{
  // Local read-only arguments only. No mutation of repository global arm.
  const pl=await observe({...env,V39_PHASE6_PROCESS_ARMED:"0",
   V39_PHASE6_OWNER_APPROVED:"0",P6_PRIVATE_SOURCE_PARENT_RO_ENABLED:"true",
   // The admitted paid-routing parent may invoke ONLY the read-only observer
   // here. Do not synthesize the event or propagate a paid arm to that helper.
   P6_PRIVATE_SOURCE_PARENT_RO_CONFIRM:env.GITHUB_EVENT_NAME==="workflow_dispatch"?
    "READ_ONLY_AUTHENTIC_PRIVATE_DAY_SOURCE_NO_PROVIDER_NO_DISPATCH":""},{storedCapacityProfile:true});
  if(pl?.providerCalls!==0||pl.databaseWrites!==0||pl.githubDispatches!==0||pl.paidPhase6Go!==false)
   fail("OBSERVATION_NOT_READ_ONLY");
  if(pl.status==="NO_DUE_SOURCE_DAYS_NO_PRIVATE_READ_OR_DISPATCH")
   return summary("NO_DUE_SOURCE_NO_DISPATCH",{acknowledgedGithubChildCount:0});
  if(pl.status==="SELECTED_SOURCE_DAY_REVIEWS_UNAVAILABLE_NO_DISPATCH")
   return summary("SELECTED_SOURCE_DAY_REVIEWS_UNAVAILABLE_NO_DISPATCH",{
    acknowledgedGithubChildCount:0,unavailableSelectedDayCount:pl.unavailableSelectedDayCount,
    unavailableSelectedDueQueryCount:pl.unavailableSelectedDueQueryCount});
  const desc=Object.getOwnPropertyDescriptor(pl,"privateStoredChildInputProposals");
  if(pl.status!=="SIGNED_PRIVATE_DAY_SOURCE_AND_ACTUAL_DB_DUE_REVIEW_ONLY_NO_DISPATCH"||
     pl.storedReviewMode!==true||!desc||desc.enumerable||desc.writable||
     !Array.isArray(desc.value)||desc.value.length!==pl.candidateCount||desc.value.length>CAP.perTickCap)
   fail("NOT_EXACT_STORED_DUE_OBSERVATION");
  proposals=desc.value;
  unavailableDays=pl.unavailableSelectedDayCount??0;
  unavailableQueries=pl.unavailableSelectedDueQueryCount??0;
  if(!Number.isSafeInteger(unavailableDays)||unavailableDays<0||unavailableDays>2||
     !Number.isSafeInteger(unavailableQueries)||unavailableQueries<0||unavailableQueries>700||
     (unavailableDays===0&&unavailableQueries!==0))fail("INVALID_UNAVAILABLE_DAY_DENOMINATOR");
  const digests=new Set();
  for(const p of proposals){
   validateInputs(p);
   if(digests.has(p.query_digest))fail("DUPLICATE_PROPOSAL");
   digests.add(p.query_digest);
  }
  historyClock=Date.parse(pl.observedSourceDatabaseClockUtc);
  if(!Number.isFinite(historyClock)||Math.abs(now()-historyClock)>120000)fail("OBSERVED_DB_CLOCK_STALE");
  if(!proposals.length)return summary("NO_SIGNED_DUE_CHILD_NO_DISPATCH",{
   acknowledgedGithubChildCount:0,unavailableSelectedDayCount:unavailableDays,
   unavailableSelectedDueQueryCount:unavailableQueries});
  const prior=await readP5CompleteCurrentParentHistory(historyClock,fetcher,headers);
  await proveNoPriorUncertainStoredDispatch({history:prior,currentRunId:Number(env.GITHUB_RUN_ID),fetcher,headers});
  const child=await readP5CompleteGithubWorkflowHistory(historyUrl(CHILD,"workflow_dispatch",historyClock),fetcher,headers);
  previousIds=new Set(child.workflow_runs.map(x=>x.id));
  const submitted=new Set();active=0;
  for(const x of child.workflow_runs){
   if(!/^P5 SOURCE [a-f0-9]{64}$/.test(x.display_title))fail("UNKNOWN_SOURCE_CHILD_TITLE");
   submitted.add(x.display_title.slice("P5 SOURCE ".length));
   if(x.status!=="completed")active++;
  }
  proposals=proposals.filter(x=>!submitted.has(x.query_digest)).slice(0,Math.max(0,Math.min(CAP.perTickCap,CAP.inFlightCap-active)));
  if(Math.abs(now()-historyClock)>120000)fail("PRE_DISPATCH_CLOCK_STALE");
 }catch{
  // No POST occurred; ordinary preflight failure should not quarantine
  // unrelated work for hours. Explicit redacted HOLD, not success evidence.
  return summary("HOLD_PRE_DISPATCH_NO_POST",{acknowledgedGithubChildCount:0});
 }
 const acknowledged=[];
 for(const p of proposals){
  if(Math.abs(now()-historyClock)>120000)
   return summary("STALE_REMAINING_PLAN_DEFERRED_NO_REPLAY",{acknowledgedGithubChildCount:acknowledged.length,acknowledgedGithubRunIds:acknowledged});
  try{
   const res=await fetcher(ROOT+"/actions/workflows/"+CHILD+"/dispatches",{
    method:"POST",headers:{...headers,"Content-Type":"application/json"},
    body:JSON.stringify({ref:"main",inputs:p,return_run_details:true})});
   if(res.status!==200)fail("DISPATCH_ACK_NOT_200");
   const body=await res.json(),id=body?.workflow_run_id;
   if(!Number.isSafeInteger(id)||id<1||previousIds.has(id)||acknowledged.includes(id)||
      body.run_url!==ROOT+"/actions/runs/"+id||
      body.html_url!=="https://github.com/HKcode22/ReplitTranvr/actions/runs/"+id)
    fail("DISPATCH_RUN_ID_OR_URL_UNVERIFIED");
   acknowledged.push(id);
  }catch{fail("UNKNOWN_DISPATCH_POST_NEVER_AUTO_REPLAY");}
 }
 return summary("BOUNDED_STORED_SOURCE_CHILD_DISPATCH_ACKS_NOT_PAID_RECEIPTS",{
  activeSourceChildCountBefore:active,acknowledgedGithubChildCount:acknowledged.length,
  acknowledgedGithubRunIds:acknowledged,inFlightCap:CAP.inFlightCap,perTickCap:CAP.perTickCap,maxLeadMinutes:CAP.maxLeadMinutes,
  unavailableSelectedDayCount:unavailableDays,unavailableSelectedDueQueryCount:unavailableQueries});
}
if(process.env.P6_PRIVATE_STORED_SOURCE_DISPATCH_ENTRYPOINT==="1")
 runP6StoredSourceDispatcher(process.env).then(out=>{preserveP6ParentChildCustody("SOURCE",out);writeP6ParentOutcome("SOURCE",out);console.log(JSON.stringify(out));})
 .catch(()=>{console.error("HOLD_P6_STORED_SOURCE_DISPATCH_UNKNOWN_OR_RELEASE_NO_REPLAY");process.exitCode=2;});
