/** STOP-default parent. Reads genuine signed POST packets and actual same-flight PRE.
 * Existing ten-minute schedule; no provider key, SQL mutation, reviewer/reserve
 * credentials, new POST signature, or approval. Existing V0083 child alone spends.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {readP6StablePostTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {sameP6NeonDatabaseEndpoint} from "../server/lib/disruption/phase6SameNeonEndpoint_v39.ts";
import {readP6DayEpochRestrictedReaderClock} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "../server/lib/disruption/phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly} from "../server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {readP6PrivateSourcePostOnce} from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
import {bindP6PostPrivateDayRoute,deriveP6PostOriginalLocalEnv} from "./v39_phase6_private_post_existing_v0083_child_v39.ts";
import {admitP5FuturePostFrozenForReadOnly,planP5FuturePostOneChild} from "../server/lib/disruption/phase5FuturePostGithubReadonlyRelease_v39.ts";
import {readActualValidPreAndClock} from "./v39_phase5_future_post_github_child_dispatcher_v39.ts";
import {readP5CompleteGithubWorkflowHistory,readP5CompleteCurrentParentHistory} from "../server/lib/disruption/phase5GithubCompleteWorkflowHistory_v39.ts";
const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const CHILD="phase5-one-signed-future-post-v0083-main-manual.yml";
const JOB="separately-authorized-current-private-post-children";
const STEP="Dispatch current private POST exact children";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const hold=x=>{throw Error("HOLD_P6_STORED_POST_PARENT_"+x);};
const H=3600000;
const utc=x=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(Date.parse(x)).toISOString()!==x)hold("NONCANONICAL_UTC");return Date.parse(x);};
const flags=["V39_P5_POST_OWNER_APPROVED","V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED",
 "V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","V39_PHASE6_PROCESS_ARMED",
 "P6_PRIVATE_POST_STORED_REVIEW_APPROVED","P6_PRIVATE_POST_CHILD_APPROVED",
 "P6_PRIVATE_POST_DYNAMIC_CHILD_APPROVED","P6_PRIVATE_POST_PARENT_APPROVED",
 "V39_P5_SEVEN_REST_BUDGET_SIGNED"];
function tls(raw,login){
 let u;try{u=new URL(raw);}catch{hold("RESTRICTED_DATABASE_URL_REQUIRED");}
 if(!sameP6NeonDatabaseEndpoint(u,u)||decodeURIComponent(u.username)!==login||!u.password||
    u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="require"||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))
  hold("RESTRICTED_TLS_ROLE_REQUIRED");
 return u;
}
export function admitP6StoredPostParent(env){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||!(env.GITHUB_EVENT_NAME==="schedule"? !env.P6_CURRENT_PARENT_DISPATCH_CONFIRM:
     env.GITHUB_EVENT_NAME==="workflow_dispatch"&&env.P6_CURRENT_PARENT_DISPATCH_CONFIRM==="RUN_CURRENT_SIGNED_POST_PARENT")||env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.V39_P5_POST_APPROVED_CODE_SHA||
    !/^[0-9]{5,20}$/.test(env.GITHUB_RUN_ID??"")||!Number.isSafeInteger(Number(env.GITHUB_RUN_ID))||
    env.P6_PRIVATE_POST_PARENT_ENABLED!=="true"||env.P5_POST_AUTO_DISPATCH_ENABLED==="true"||
    env.ADB_AUTO_COLLECT!=="0"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    env.P6_PRIVATE_POST_OUTCOME_TAIL_HOURS!=="48"||
    flags.some(k=>env[k]!=="1")||
    [env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.DATABASE_URL,
     env.V39_DATABASE_RUNTIME_URL,env.P5_V39_PRE_DATABASE_URL,env.P5_V39_PREPARE_DATABASE_URL,
     env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,
     env.P6_PRIVATE_PUBLISHER_DATABASE_URL,env.P5_V39_T24_WITNESS_DATABASE_URL,
     env.P5_POST_FROZEN_PACKET_FILE,env.V39_P5_POST_SIGNED_PACKET_SHA256,
     env.V39_P5_POST_REVIEWED_REQUEST_SHA256,env.V39_P5_POST_CONTEXT_SHA256].some(Boolean)||
    ![env.V39_P5_POST_CATEGORY_BUDGET_SHA256,env.V39_P5_POST_PROVIDER_CONTRACT_SHA256,
      env.V39_P5_POST_PRICE_SHA256,env.V39_P5_FRAME_HASH].every(x=>SHA.test(x??""))||
    typeof env.GITHUB_TOKEN!=="string"||env.GITHUB_TOKEN.length<20)
  hold("NO_SEPARATE_CURRENT_POST_RELEASE");
 const trust=readP6StablePostTrust(env);
 const reader=tls(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin);
 const source=tls(env.V39_P5_SOURCE_DATABASE_URL,"phase5_p5_source_login_20261108");
 if(!sameP6NeonDatabaseEndpoint(reader,source)||reader.username===source.username)hold("CROSS_DB_OR_SHARED_LOGIN");
 return trust;
}
/** Exact reviewed metadata-only schedule hint. The explicit 48h tail must be
 * separately approved; no implicit extension after an outcome cap expires. */
export function loadP6PostWindows(env,trust,read=readFileSync){
 const raw=env.P6_NONPAID_DAILY_POLICY_BASE64;
 if(typeof raw!=="string"||raw.length<100||raw.length>46668||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))
  hold("NO_EXACT_DAILY_POLICY");
 const b=Buffer.from(raw,"base64");
 if(b.length>35000||b.toString("base64")!==raw||hash(b)!==env.P6_NONPAID_DAILY_POLICY_SHA256)
  hold("DAILY_POLICY_HASH_DRIFT");
 const p=JSON.parse(b.toString("utf8"));
 if(p?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||
    p.delegatedDailyPacketProductionApproved!==true||p.approvedCodeSha!==trust.reviewedCodeSha||
    !["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===trust[k])||
    p.providerContractSha256!==env.V39_P5_POST_PROVIDER_CONTRACT_SHA256||
    !Array.isArray(p.dayPlanSha256s)||p.dayPlanSha256s.length!==31||
    p.dayPlanSha256s.some((x,i)=>x?.runDayIndex!==i+1||!SHA.test(x.sha256??""))||
    new Set(p.dayPlanSha256s.map(x=>x.sha256)).size!==31)
   hold("DAILY_POLICY_STUDY_DRIFT");
 const from=utc(p.validFromUtc),until=utc(p.validUntilUtc);
 if(from>=until)hold("POLICY_TIME_DRIFT");
 const days=p.dayPlanSha256s.map(x=>{
  const bytes=read("data-collection/phase5/planning/phase6-source-day-"+String(x.runDayIndex).padStart(2,"0")+".json");
  if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>500000||hash(bytes)!==x.sha256)hold("DAY_PLAN_HASH_DRIFT");
  const plan=JSON.parse(bytes.toString("utf8"));
  if(plan?.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||plan.runDayIndex!==x.runDayIndex||
     !Array.isArray(plan.templates)||plan.templates.length<12||plan.templates.length>384||
     plan.templates.some(t=>t.runDayIndex!==x.runDayIndex||!["T-24h","T-6h","T-90m"].includes(t.horizon)))
   hold("DAY_PLAN_SCOPE_DRIFT");
  const start=utc(plan.expectedServiceStartUtc),pairs=plan.templates.map(t=>[utc(t.serviceWindowStartUtc),utc(t.serviceWindowEndUtc)]);
  if(pairs.some(([a,z])=>a<start||z<=a||z>start+6*H)||Math.min(...pairs.map(x=>x[0]))!==start)
   hold("EXPOSURE_WINDOW_DRIFT");
  return {day:x.runDayIndex,start,end:Math.max(...pairs.map(x=>x[1]))+48*H};
 });
 if(days.some((x,i)=>i>0&&x.start<=days[i-1].start)||days.some(x=>x.start<from||x.end>until))
  hold("STUDY_POLICY_MUST_COVER_ALL_OUTCOME_WINDOWS");
 return {from,until,days};
}
export function selectP6PostDays(w,clock){
 const now=utc(clock);
 if(now<w.from||now>=w.until)hold("NOT_LIVE_POLICY_CLOCK");
 const days=w.days.filter(x=>x.start<=now&&now<x.end);
 if(days.length>4)hold("MORE_THAN_FOUR_OVERLAPPING_OUTCOME_DAYS");
 return days;
}
function historyUrl(w,event,clock){return ROOT+"/actions/workflows/"+w+"/runs?event="+event+
 "&per_page=100&created="+encodeURIComponent(new Date(clock-3*H).toISOString()+".."+new Date(clock+60000).toISOString());}
export async function proveP6NoUncertainPostParent(history,current,fetcher,headers){
 if(!history.workflow_runs.some(x=>x.id===current))hold("CURRENT_PARENT_NOT_VISIBLE");
 for(const r of history.workflow_runs){
  if(r.id===current)continue;
  const res=await fetcher(ROOT+"/actions/runs/"+r.id+"/jobs?per_page=100&filter=all",{method:"GET",headers});
  if(!res.ok)hold("PRIOR_PARENT_JOBS_MISSING");
  const j=await res.json();
  if(!Number.isSafeInteger(j?.total_count)||j.total_count<0||j.total_count>100||
     !Array.isArray(j.jobs)||j.jobs.length!==j.total_count)hold("PRIOR_PARENT_JOBS_TRUNCATED");
  for(const job of j.jobs){
   if(typeof job?.name!=="string")hold("BAD_PRIOR_JOB");
   if(job.name!==JOB)continue;
   if(job.conclusion==="skipped"||["queued","waiting","pending","requested"].includes(job.status))continue;
   if(!Array.isArray(job.steps))hold("PRIOR_STEP_HISTORY_MISSING");
   const s=job.steps.filter(x=>x?.name===STEP);
   if(s.length>1||(!s.length&&job.status!=="completed")||
      (s.length===1&&!["success","skipped"].includes(s[0].conclusion)))hold("UNKNOWN_PREVIOUS_DISPATCH_NO_REPLAY");
  }
 }
}
export function chooseP6PostRoutes(routes,history,clock){
 const at=utc(clock),seen=new Set(),sub=new Set();let active=0;
 if(!Array.isArray(routes)||routes.length>4096||!history||history.total_count!==history.workflow_runs?.length||history.total_count>500)
  hold("INCOMPLETE_BOUNDED_HISTORY_OR_DUE_SET");
 for(const x of history.workflow_runs){
  const m=/^P5 POST ([a-f0-9]{64})$/.exec(x.display_title);
  // No mixing with legacy checkout child history in the overlap interval.
  if(!m)hold("UNIDENTIFIABLE_OR_LEGACY_POST_HISTORY");
  sub.add(m[1]);if(x.status!=="completed")active++;
 }
 for(const r of routes){
  if(!r||r.lane!=="POST"||!SHA.test(r.signedFrozenSha256??"")||
     seen.has(r.signedFrozenSha256)||utc(r.notBeforeUtc)>at||utc(r.hardLatestUtc)<=at)
   hold("DUPLICATE_OR_DRIFTED_DUE_ROUTE");
  seen.add(r.signedFrozenSha256);
 }
 const pending=routes.filter(r=>!sub.has(r.signedFrozenSha256)&&utc(r.hardLatestUtc)>at+120000)
  .sort((a,b)=>a.hardLatestUtc.localeCompare(b.hardLatestUtc)||a.runDayIndex-b.runDayIndex||a.shardIndex-b.shardIndex);
 return {active,capacity:Math.max(0,Math.min(4,8-active)),pending:pending.slice(0,12),pendingCount:pending.length};
}
const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
const summary=(status,more={})=>({schema:"v39.phase6.stored-post-dispatch-parent.v1",status,...more,
 providerCallsByParent:0,databaseWritesByParent:0,paidGetsCertifiedByParent:0,independentPaidChildAdmissionStillRequired:true});
async function readClock(c,trust){
 await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{return await readP6DayEpochRestrictedReaderClock(c,trust.expectedReaderSessionLogin);}
 finally{await c.query("ROLLBACK");}
}
async function observe(env,trust,windows){
 const c=new pg.Client({connectionString:env.P6_PRIVATE_READER_DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:25000});
 await c.connect();
 try{
  await c.query("SET ROLE phase6_private_frozen_reader_v39");
  const clock=await readClock(c,trust),days=selectP6PostDays(windows,clock),routes=[],byDay=new Map();let unavailable=0;
  for(const d of days){
   let signed;try{signed=await readP6StoredPrivateReviewOnce({client:c,trust,scope,selector:{kind:"CURRENT_DAY",runDayIndex:d.day}});}
   catch(e){if(e?.message==="HOLD_P6_STORED_REVIEW_CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED"){unavailable++;continue;}throw e;}
   const handoff=await hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly({client:c,pins:signed.pins,wire:signed.wire,publicKeyPem:signed.publicKeyPem,
    scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
   const z=handoff.redactedSummary,all=handoff.privateAllDuePostRoutingCandidates;
   if(z?.runDayIndex!==d.day||!Array.isArray(all)||all.length>1024||
      Object.getOwnPropertyDescriptor(handoff,"privateAllDuePostRoutingCandidates")?.enumerable!==false||
      all.length!==z.lanes.find(x=>x.lane==="POST")?.due)hold("INCOMPLETE_AUTHENTICATED_DUE_ROUTES");
   byDay.set(d.day,{signed,handoff});
   for(const r of all){if(utc(r.notBeforeUtc)<d.start||utc(r.hardLatestUtc)>d.end)hold("OUTSIDE_APPROVED_OUTCOME_TAIL");routes.push(r);}
  }
  // At a newer actual DB clock discard expired candidates. Those which became
  // due while reading other days are handled at the next tick, not fabricated.
  const finalClock=await readClock(c,trust);
  if(utc(finalClock)<utc(clock)||utc(finalClock)-utc(clock)>120000)hold("DAY_SCAN_CLOCK_STALE");
  const filtered=routes.filter(r=>utc(r.hardLatestUtc)>utc(finalClock));
  return {clock:finalClock,routes:filtered,unavailable,byDay};
 }finally{await c.end();}
}
async function verifyCandidate(env,trust,route,day){
 const c=new pg.Client({connectionString:env.P6_PRIVATE_READER_DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:25000});
 const z=day.handoff.redactedSummary;
 const selector={runDayIndex:route.runDayIndex,indexRevision:z.indexRevision,indexSha256:z.externallySignedDayEpochIndexSha256,
  shardIndex:route.shardIndex,packetSha256:route.signedFrozenSha256,routingIntentSha256:route.routingIntentSha256};
 const ctx={selector,trust,dynamic:true};
 const bound=bindP6PostPrivateDayRoute(day.handoff,ctx);
 let raw,packet;
 await c.connect();
 try{
  await c.query("SET ROLE phase6_private_frozen_reader_v39");
  const review=await readP6StoredPrivateReviewOnce({client:c,trust,scope,selector:{kind:"POST",runDayIndex:route.runDayIndex,
    shardIndex:route.shardIndex,logicalPath:route.signedFrozenPath,contentSha256:route.signedFrozenSha256}});
  const receipt=await readP6PrivateSourcePostOnce(c,review.pins,review.wire,review.publicKeyPem);
  const s=receipt.redactedSummary,now=utc(s.observedDatabaseClockUtc);
  if(s.kind!=="POST_PACKET"||s.verifiedEd25519Review!==true||s.contentSha256!==selector.packetSha256||
     s.runDayIndex!==selector.runDayIndex||s.shardIndex!==selector.shardIndex||s.providerCalls!==0||s.databaseWrites!==0||
     !Buffer.isBuffer(receipt.privateBytes)||!receipt.privateBytes.equals(bound.post)||receipt.privateLogicalPath!==route.signedFrozenPath||
     now<utc(bound.observedDbClockUtc)||now>=utc(route.hardLatestUtc)||
     now>=utc(day.signed.wire.review.validUntilUtc)||now>=utc(day.signed.wire.review.retentionNotAfterUtc))
   hold("POST_REVIEW_OR_SIGNED_WINDOW_DRIFT");
  raw=receipt.privateBytes;packet=JSON.parse(raw.toString("utf8"));
 }finally{await c.end();}
 const local=deriveP6PostOriginalLocalEnv(env,ctx,raw,packet);
 const p=admitP5FuturePostFrozenForReadOnly(raw,packet,{frozenPacketPath:route.signedFrozenPath,expectedPacketSha256:selector.packetSha256,
  approvedCodeSha:env.GITHUB_SHA,currentGithubRunId:env.GITHUB_RUN_ID,manifestSha256:trust.manifestSha256,sourceRightsSha256:trust.rightsSha256,
  categoryBudgetSha256:env.V39_P5_POST_CATEGORY_BUDGET_SHA256,providerContractSha256:env.V39_P5_POST_PROVIDER_CONTRACT_SHA256,
  requestSha256:local.V39_P5_POST_REVIEWED_REQUEST_SHA256,requestContextSha256:local.V39_P5_POST_CONTEXT_SHA256,
  frameSha256:env.V39_P5_FRAME_HASH,providerPriceSha256:env.V39_P5_POST_PRICE_SHA256});
 let actual;
 try{actual=await readActualValidPreAndClock(env.V39_P5_SOURCE_DATABASE_URL,p,bound.sourceDigests);}
 catch(e){if(["REFUSED_P5_FUTURE_POST_V0083_NO_VALID_NATIVE_T_SOURCE_PRE_FOR_THIS_POST",
  "REFUSED_P5_FUTURE_POST_V0083_NO_VALID_PRE_FROM_EXACT_SIGNED_SOURCE_REGISTRY"].includes(e?.message))return null;throw e;}
 if((actual.pre.boundSourceRegistryValidHorizonCount??0)<1)return null;
 const decision=planP5FuturePostOneChild(p,actual.pre,actual.dbClockUtc,null,route.signedFrozenPath);
 if(decision.status!=="POST_DUE_REQUIRES_GITHUB_HISTORY_CHECK"||utc(actual.dbClockUtc)>=utc(route.hardLatestUtc)-120000)return null;
 return {clock:actual.dbClockUtc,inputs:{frozen_future_post_packet:"PRIVATE_STORED",private_transport:"stored-current",
  private_confirm:"ONE_CURRENT_PRIVATE_POST_ORIGINAL_V0083_MAX_TWO_UNITS",confirm:"ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY",
  run_day:String(selector.runDayIndex),index_revision:String(selector.indexRevision),index_sha256:selector.indexSha256,
  shard_index:String(selector.shardIndex),post_packet_sha256:selector.packetSha256,route_sha256:selector.routingIntentSha256}};
}
export async function runP6StoredPostParent(env,options={}){
 const trust=admitP6StoredPostParent(env),windows=loadP6PostWindows(env,trust,options.readPlan??readFileSync);
 const fetcher=(url,init)=>(options.fetchImpl??fetch)(url,{...init,signal:AbortSignal.timeout(12000),redirect:"error"});
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"};
 const now=options.now??Date.now,accepted=[],prepared=[];
 let scan,at,choice,oldIds,examined=0,unavailablePreOrLate=0;
 try{
 scan=await (options.observe??observe)(env,trust,windows);
 at=utc(scan.clock);
 if(Math.abs(now()-at)>120000)hold("STALE_REAL_DB_CLOCK");
 if(!scan.routes.length)return summary("NO_SIGNED_DUE_POST",{acknowledgedGithubChildCount:0,unavailableDays:scan.unavailable});
 const prior=await readP5CompleteCurrentParentHistory(at,fetcher,headers);
 await proveP6NoUncertainPostParent(prior,Number(env.GITHUB_RUN_ID),fetcher,headers);
 const history=await readP5CompleteGithubWorkflowHistory(historyUrl(CHILD,"workflow_dispatch",at),fetcher,headers);
 choice=chooseP6PostRoutes(scan.routes,history,scan.clock);
 oldIds=new Set(history.workflow_runs.map(x=>x.id));
 // All candidate verification before first dispatch. No parent ambiguity for
 // ordinary failed preflight. A later dispatch ambiguity remains a hard HOLD.
 for(const r of choice.pending){
  if(prepared.length>=choice.capacity||Math.abs(now()-at)>120000)break;
  examined++;
  const p=await (options.verify??verifyCandidate)(env,trust,r,scan.byDay.get(r.runDayIndex));
  if(p===null){unavailablePreOrLate++;continue;}
  if(p.inputs.post_packet_sha256!==r.signedFrozenSha256||Math.abs(now()-utc(p.clock))>120000||
     p.inputs.frozen_future_post_packet!=="PRIVATE_STORED"||p.inputs.private_transport!=="stored-current"||
     p.inputs.private_confirm!=="ONE_CURRENT_PRIVATE_POST_ORIGINAL_V0083_MAX_TWO_UNITS"||
     p.inputs.confirm!=="ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY"||
     p.inputs.run_day!==String(r.runDayIndex)||p.inputs.shard_index!==String(r.shardIndex)||
     p.inputs.route_sha256!==r.routingIntentSha256||
     !SHA.test(p.inputs.index_sha256??"")||!/^[1-9][0-9]{0,3}$/.test(p.inputs.index_revision??"")||
     Number(p.inputs.index_revision)>1024||
     Object.keys(p.inputs).sort().join("|")!==["frozen_future_post_packet","private_transport","private_confirm","confirm",
      "run_day","index_revision","index_sha256","shard_index","post_packet_sha256","route_sha256"].sort().join("|"))
   hold("CANDIDATE_CLOCK_OR_ID_DRIFT");
  prepared.push(p);
 }

 }catch(e){
  // No dispatch HTTP POST has been attempted. Mark this as a preflight
  // HOLD rather than an ambiguous dispatch failure; otherwise each
  // subsequent tick would extend the previous three-hour quarantine.
  const m=String(e?.message??"");
  return summary("HOLD_POST_PREFLIGHT_NO_DISPATCH",{
   acknowledgedGithubChildCount:0,reason:/^HOLD_P6_STORED_POST_PARENT_[A-Z0-9_]+$/.test(m)?m:"REDACTED_PREFLIGHT_FAILURE"});
 }
 for(const p of prepared){
  if(Math.abs(now()-at)>120000)break;
  const res=await fetcher(ROOT+"/actions/workflows/"+CHILD+"/dispatches",{method:"POST",
   headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({ref:"main",inputs:p.inputs,return_run_details:true})});
  if(res.status!==200)hold("UNKNOWN_DISPATCH_POST_NO_REPLAY");
  const out=await res.json(),id=out?.workflow_run_id;
  if(!Number.isSafeInteger(id)||id<1||oldIds.has(id)||accepted.includes(id)||
     out.run_url!==ROOT+"/actions/runs/"+id||out.html_url!=="https://github.com/HKcode22/ReplitTranvr/actions/runs/"+id)
   hold("UNKNOWN_DISPATCH_ACK_NO_REPLAY");
  accepted.push(id);
 }
 return summary("BOUNDED_POST_CHILD_ACKS_NOT_REST_RECEIPTS",{acknowledgedGithubChildCount:accepted.length,
  acknowledgedGithubRunIds:accepted,activeChildrenBefore:choice.active,examined,unavailablePreOrLate,
  unsubmittedDueCount:choice.pendingCount,unavailableDays:scan.unavailable,perTickCap:4,inFlightCap:8});
}
if(process.env.P6_PRIVATE_POST_PARENT_ENTRYPOINT==="1")
 runP6StoredPostParent(process.env).then(x=>console.log(JSON.stringify(x)))
 .catch(()=>{console.error("HOLD_P6_STORED_POST_PARENT_REDACTED_NO_REPLAY");process.exitCode=2;});
