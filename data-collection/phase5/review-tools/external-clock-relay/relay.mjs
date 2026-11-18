/** Isolated external clock: no provider keys, DB URLs or data. Only fixed existing
 * target workflows and exact owner-reviewed mode. CLOCK_ONLY is the default pilot.
 * Do not treat accepted GitHub run as successful execution or collection. */
export const RELAY="HKcode22/TravnrClockRelay",TARGET="HKcode22/ReplitTranvr";
export const PILOT="phase5-autonomous-clock-canary-no-provider.yml";
export const PRIMARY="phase5-primary-fids-expiry-no-provider.yml";
export const ROLLING="phase6-rolling-controller-bounded-session.yml";
const ROOT="https://api.github.com/repos/",SELF="external-clock.yml",MIN=60000;
const HOLD=s=>{throw Error("HOLD_EXTERNAL_CLOCK_"+s);}, id=x=>Number.isSafeInteger(x)&&x>0;
const sha=x=>typeof x==="string"&&/^[a-f0-9]{40}$/.test(x);
const stamp=s=>{let n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s)HOLD("UTC");return n;};
const iso=n=>new Date(n).toISOString();
const active=["queued","in_progress","waiting","requested","pending"];
const result=(status,fields={})=>({status,...fields,providerCallsByRelay:0,databaseReadsByRelay:0,databaseWritesByRelay:0,paidAuthorityGranted:false});
export function rootInputs(now,from,until,main,four){
 // This is only a prospective scheduling hint. The target's existing V0102
 // claim/actual DB clock, signed policy, SHA, STOP and all release gates remain.
 const a=stamp(from),z=stamp(until),epoch=Math.floor(now/1000)*1000;
 if(a%1000||z%1000||z<=a||z-a>60*24*3600000||!sha(main)||!Number.isSafeInteger(now))HOLD("POLICY_SCOPE");
 if(now<a||now>=z)return null;
 const start=a+Math.floor((now-a)/(120*MIN))*120*MIN,end=Math.min(start+120*MIN,z);
 if(end-now<20*MIN)return null;
 const multi=four===true&&end-epoch>=95*MIN;
 return {windowStart:iso(start),windowEnd:iso(end),inputs:{
  confirm:multi?"RUN_UP_TO_FOUR_PROTECTED_ROLLING_SESSIONS_AFTER_SEPARATE_PHASE6_GO":"RUN_ONE_PROTECTED_ROLLING_SESSION_AFTER_SEPARATE_PHASE6_GO",
  approved_main_sha:main,chain_hop:"0",parent_run_id:"0",sent_at_utc:"",
  window_epoch_utc:iso(epoch),window_deadline_utc:iso(multi?end:Math.min(end,epoch+30*MIN)),scheduled_root_run_id:""}};
}
export function cronJobSpec(relayToken,now=Date.now()){
 if(typeof relayToken!=="string"||!relayToken.startsWith("github_pat_")||relayToken.length<30||!Number.isSafeInteger(now))HOLD("RELAY_TOKEN_REQUIRED");
 const expiry=Number(iso(now+90*MIN).slice(0,19).replace(/[-:T]/g,""));
 return {title:"Travnr isolated 90-minute external clock pilot",url:ROOT+RELAY+"/actions/workflows/"+SELF+"/dispatches",
  enabled:false,saveResponses:true,requestMethod:1,requestTimeout:30,redirectSuccess:false,
  schedule:{timezone:"UTC",expiresAt:expiry,hours:[-1],mdays:[-1],minutes:[2,12,22,32,42,52],months:[-1],wdays:[-1]},
  notification:{onFailure:true,onFailureCount:1,onDisable:true,onSuccess:true},
  extendedData:{headers:{Authorization:"Bearer "+relayToken,Accept:"application/vnd.github+json","Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"},
   body:JSON.stringify({ref:"main",return_run_details:true})}};
}
export async function runPulse(env,{fetcher=fetch,now=Date.now,emit=()=>{},sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const mode=env.TRAVNR_RELAY_MODE||"CLOCK_ONLY", start=now(),runId=Number(env.GITHUB_RUN_ID);
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==RELAY||env.GITHUB_REF!=="refs/heads/main"||
   env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||!id(runId)||!sha(env.GITHUB_SHA)||
   !["CLOCK_ONLY","PILOT","PRIMARY_BACKSTOP","ROLLING_ROOT"].includes(mode)||typeof env.GITHUB_TOKEN!=="string"||
   env.GITHUB_TOKEN.length<16||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
   ["DATABASE_URL","AERODATABOX_API_KEY","RAPIDAPI_KEY","V39_DATABASE_RUNTIME_URL","AERODATABOX_WEBHOOK_SECRET"].some(k=>env[k]))HOLD("SCOPE");
 let reads=0,attempted=false;
 const auth=token=>({Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"});
 const get=async(repo,path)=>{
  if(++reads>40||now()-start>180000||!path.startsWith("/")||path.startsWith("//"))HOLD("READ_BOUND");
  const token=repo===RELAY?env.GITHUB_TOKEN:env.TRAVNR_TARGET_ACTIONS_TOKEN;
  const res=await fetcher(ROOT+repo+path,{method:"GET",headers:auth(token),redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!res.ok)HOLD("GET_HTTP_"+res.status);
  return res.json();
 };
 const complete=(x,key)=>{if(!Number.isSafeInteger(x?.total_count)||x.total_count<0||x.total_count>100||!Array.isArray(x[key])||x[key].length!==x.total_count)HOLD("HISTORY_INCOMPLETE");return x[key];};
 const exact=(r,wf,repo)=>{if(!id(r?.id)||r.path!==".github/workflows/"+wf||r.head_branch!=="main"||!sha(r.head_sha)||
  !["schedule","workflow_dispatch"].includes(r.event)||!Number.isFinite(Date.parse(r.created_at))||r.run_attempt!==1||
  ![...active,"completed"].includes(r.status))HOLD("RUN_IDENTITY");return r;};
 const main=async()=>{const x=await get(TARGET,"/git/ref/heads/main");if(x?.object?.sha!==env.TRAVNR_APPROVED_TARGET_MAIN_SHA)HOLD("TARGET_MAIN_DRIFT");};
 try{
  const self=exact(await get(RELAY,"/actions/runs/"+runId),SELF,RELAY);
  if(self.id!==runId||self.head_sha!==env.GITHUB_SHA||self.event!=="workflow_dispatch"||self.status!=="in_progress")HOLD("SELF_IDENTITY");
  const elapsed=now()-Date.parse(self.created_at);
  if(elapsed<0||elapsed>24*3600000)HOLD("SELF_CLOCK");
  const clock={relayRunId:runId,mode,actualCreatedUtc:self.created_at,runnerObservedUtc:iso(now()),creationToObservedMs:elapsed};
  if(mode==="CLOCK_ONLY")return result("EXTERNAL_CLOCK_OBSERVED_NO_TARGET_DISPATCH",clock);
  if(!sha(env.TRAVNR_APPROVED_TARGET_MAIN_SHA)||typeof env.TRAVNR_TARGET_ACTIONS_TOKEN!=="string"||env.TRAVNR_TARGET_ACTIONS_TOKEN.length<16)HOLD("TARGET_CONFIGURATION");
  const since=stamp(env.TRAVNR_RELAY_MODE_SINCE_UTC);
  if(since>start||start-since>60*24*3600000)HOLD("MODE_CLOCK");
  // Any prior failed relay attempt in this owner-reviewed mode quarantines
  // uncertain POSTs indefinitely until mode is independently reconciled.
  // The date-filtered total_count is sufficient even if results paginate.
  for(const conclusion of ["failure","cancelled","timed_out","action_required","stale"]){
   const p=await get(RELAY,"/actions/workflows/"+SELF+"/runs?branch=main&event=workflow_dispatch&status="+conclusion+"&per_page=1&created="+encodeURIComponent(">="+iso(since)));
   if(!Number.isSafeInteger(p?.total_count)||p.total_count<0||!Array.isArray(p.workflow_runs)||p.workflow_runs.length!==Math.min(1,p.total_count))HOLD("PRIOR_RELAY_HISTORY");
   if(p.total_count>0)return result("QUARANTINED_PRIOR_RELAY_RUN_REVIEW",clock);
  }
  await main();
  const wf=mode==="PILOT"?PILOT:mode==="PRIMARY_BACKSTOP"?PRIMARY:ROLLING;
  const q="/actions/workflows/"+wf+"/runs?branch=main&per_page=100";
  for(const state of active){
   const xs=complete(await get(TARGET,q+"&status="+state),"workflow_runs").map(r=>exact(r,wf,TARGET));
   if(xs.some(x=>x.status!==state))HOLD("ACTIVE_HISTORY_CHANGED");
   if(xs.length)return result("DEFER_TARGET_ALREADY_ACTIVE",clock);
  }
  let inputs,rootScope=null;
  if(mode==="PILOT"){
   // Exactly one existing nonpaid canary, only if not already running.
   inputs={mode:"OBSERVE"};
  }else if(mode==="PRIMARY_BACKSTOP"){
   // A successful manual VERIFY shares the same job and step name as APPLY.
   // Do not count it as proof the scheduled expiry actually ran.
   const p=await get(TARGET,"/actions/workflows/"+wf+"/runs?branch=main&per_page=20");
   if(!Number.isSafeInteger(p?.total_count)||p.total_count<0||!Array.isArray(p.workflow_runs)||
      p.workflow_runs.length!==Math.min(20,p.total_count))HOLD("PRIMARY_HISTORY");
   const eligible=p.workflow_runs.map(r=>exact(r,wf,TARGET)).filter(r=>r.head_sha===env.TRAVNR_APPROVED_TARGET_MAIN_SHA&&
     (r.event==="schedule"||r.event==="workflow_dispatch"&&r.display_title==="P5 PRIMARY BACKSTOP CHILD"))
     .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id);
   if(!eligible.length)return result("DEFER_NO_CURRENT_MAIN_APPLY_BASELINE_REVIEW",clock);
   const last=eligible[0];
   if(last.head_sha!==env.TRAVNR_APPROVED_TARGET_MAIN_SHA||last.status!=="completed"||last.conclusion!=="success")HOLD("PREVIOUS_PRIMARY_REVIEW");
   const js=complete(await get(TARGET,"/actions/runs/"+last.id+"/jobs?filter=latest&per_page=100"),"jobs");
   const good=js.filter(j=>j.name==="primary-fids-expiry"&&j.run_id===last.id&&j.head_sha===last.head_sha&&j.run_attempt===1&&j.status==="completed"&&j.conclusion==="success"&&
     j.steps?.filter(s=>s.name==="Verify exact main and execute only bounded primary FIDS expiry"&&s.status==="completed"&&s.conclusion==="success").length===1);
   if(good.length!==1||!Number.isFinite(Date.parse(good[0].completed_at))||Date.parse(good[0].completed_at)>now())HOLD("PRIMARY_STEP");
   if(now()-Date.parse(good[0].completed_at)<20*MIN)return result("DEFER_RECENT_PRIMARY_STEP_NOT_DELETION_PROOF",clock);
   inputs={confirm:"APPLY_REVIEWED_PRIMARY_FIDS_BACKSTOP_NO_PRIVATE_MUTATION",approved_main_sha:env.TRAVNR_APPROVED_TARGET_MAIN_SHA};
  }else{
   // Reuse existing manual dynamic root admission; do not simulate schedule
   // event or bypass the actual signed DB-clock authorization/custody.
   rootScope=rootInputs(now(),env.TRAVNR_ROLLING_POLICY_FROM_UTC,env.TRAVNR_ROLLING_POLICY_UNTIL_UTC,env.TRAVNR_APPROVED_TARGET_MAIN_SHA,env.TRAVNR_ROLLING_FOUR_APPROVED==="1");
   if(!rootScope)return result("DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW",clock);
   const startUtc=encodeURIComponent(">="+rootScope.windowStart);
   const current=complete(await get(TARGET,q+"&created="+startUtc),"workflow_runs").map(x=>exact(x,wf,TARGET));
   // A workflow record is not equivalent to a controller that executed.
   // Re-admit only when every existing record is exact-current-main, terminal,
   // and all jobs (including the protected session) independently prove SKIP.
   // Unknown/failed/partially executed roots still require custody reconciliation.
   if(current.length){
    for(const r of current){
     if(r.head_sha!==env.TRAVNR_APPROVED_TARGET_MAIN_SHA||r.status!=="completed"||
        !["success","skipped"].includes(r.conclusion))
       return result("DEFER_CURRENT_WINDOW_CUSTODY_REVIEW_NO_REPLAY",{...clock,existingRunId:r.id});
     const jobs=complete(await get(TARGET,"/actions/runs/"+r.id+"/jobs?filter=latest&per_page=100"),"jobs");
     const protectedJobs=jobs.filter(j=>j.name==="one-protected-bounded-session");
     if(protectedJobs.length!==1||!jobs.every(j=>id(j.id)&&j.run_id===r.id&&j.head_sha===r.head_sha&&
       j.run_attempt===1&&j.status==="completed"&&j.conclusion==="skipped"&&
       (j.steps==null||Array.isArray(j.steps)&&j.steps.length===0)))
       return result("DEFER_CURRENT_WINDOW_CUSTODY_REVIEW_NO_REPLAY",{...clock,existingRunId:r.id});
    }
    // This proves no protected session step ran, NOT that the DB window is free.
    // The existing target's exact policy/atomic claim/previous closure gate is final.
    emit({status:"EXTERNAL_WAKE_ONLY_SKIPPED_CONTROLLER_HISTORY_NO_DB_AUTHORITY",relayRunId:runId,skippedRuns:current.length});
   }
   // The target validates its immutable policy and prior closure with its
   // scoped live DB claim, not the relay's advisory wall clock.
   inputs=rootScope.inputs;
  }
  await main();
  if(now()-start>120000)HOLD("STALE_PREFLIGHT");
  if(rootScope&&now()+15*MIN>=Date.parse(inputs.window_deadline_utc))HOLD("ROOT_TOO_LATE");
  emit({status:"EXTERNAL_WAKE_TARGET_ATTEMPT_NO_REPLAY",mode,workflow:wf,relayRunId:runId,attemptUtc:iso(now())});
  attempted=true;
  const a=await fetcher(ROOT+TARGET+"/actions/workflows/"+wf+"/dispatches",{method:"POST",headers:{...auth(env.TRAVNR_TARGET_ACTIONS_TOKEN),"Content-Type":"application/json"},redirect:"error",signal:AbortSignal.timeout(10000),body:JSON.stringify({ref:"main",return_run_details:true,inputs})});
  if(a.status!==200)HOLD("ACK_HTTP_"+a.status);
  const b=await a.json(),rid=b?.workflow_run_id;
  if(!id(rid)||b.run_url!==ROOT+TARGET+"/actions/runs/"+rid||b.html_url!=="https://github.com/"+TARGET+"/actions/runs/"+rid)HOLD("UNKNOWN_ACK");
  emit({status:"EXTERNAL_WAKE_TARGET_ACK_NOT_EXECUTION_PROOF",mode,runId:rid,relayRunId:runId});
  // Only GET retries after acknowledged run ID. No second POST.
  let live;
  for(let i=0;i<4;i++){try{live=await get(TARGET,"/actions/runs/"+rid);break;}catch(e){if(i===3)throw e;await sleep(3000);}}
  exact(live,wf,TARGET);
  if(live.id!==rid||live.head_sha!==env.TRAVNR_APPROVED_TARGET_MAIN_SHA||live.event!=="workflow_dispatch")HOLD("ACK_READBACK_DRIFT");
  if(live.status==="completed"&&live.conclusion!=="success")HOLD("ACK_TARGET_TERMINAL_FAILURE_REVIEW");
  return result("TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF",{...clock,targetRunId:rid,targetStatus:live.status,targetWorkflow:wf,relayDispatches:1});
 }catch(e){
  const m=/^HOLD_EXTERNAL_CLOCK_[A-Z0-9_]{1,80}$/.test(e?.message??"")?e.message:"HOLD_EXTERNAL_CLOCK_REDACTED";
  if(attempted)throw Error(m+"_NO_BLIND_REPLAY");
  // A known pre-POST read failure is safe to re-observe at the next pulse.
  return result("EXTERNAL_WAKE_PREFLIGHT_DEFERRED_NO_POST",{mode,relayRunId:runId,reason:m,relayDispatches:0});
 }
}
