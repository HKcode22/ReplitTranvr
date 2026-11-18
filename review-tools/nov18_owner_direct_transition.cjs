'use strict';
// Owner-only exact NOV18 coordinated deployment. No provider keys, secret
// writes, release/paid flags, production DB credentials, Cron API mutations,
// or calendar/budget edits. A failed/doubtful mutation stops; inspect, never
// automatically retry. All approvals for paid collection remain separate.
const {execFileSync}=require("node:child_process");
const P="HKcode22/ReplitTranvr",R="HKcode22/TravnrClockRelay";
const PB="96e4e59bbdf76c5197c12158a17a4a333680c48b",PH="e0409d6d3633d1198d164663b518345eb400638e";
const RB="6f859c4b7485d0157b97c162ecf74bd7df25b657",RH="e7b480f9e25ccea2d34d98fd4456c03396f75290";
const PRIMARY="phase5-primary-fids-expiry-no-provider.yml",DIRECT="phase6-direct-recovery-tick.yml",RELAY="external-clock.yml";
const PVAR="P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA";
const CHECKS_P=["YSSY P25 Public Receiver Identity (Read-Only, No Provider)","Phase5 public GitHub forbids private frozen AeroDataBox flight packets","V3.9 Offline Safety","YSSY P25 Real PG Receiver Faults (No Paid Provider)","Phase6 direct recovery tests","Phase5 Autonomous Six-Slot Clock Canary (NO provider)","Phase6 initial bounded rolling controller session (STOP default)","Phase6 autonomous GitHub controller heartbeat (NO PROVIDER, NO GO)","YSSY P25 Focused Release — No Provider"];
const CHECKS_R=["Managed isolated Cron provisioning (manual, STOP default)","Post-repair actual external shadow pair audit (read-only)","Managed cron clock audit (read-only)","Travnr relay tests"];
const C=["liveOriginals","eligibleOriginals","hardDueOriginals","eligibleNextHour","hardDueNextHour","unboundLiveOriginals","markedExpiredPayloadPresent","unlinkedUnexpiredPopulation","unexpiredPopulationWithoutLiveOriginal"];
const S=["queued","in_progress","waiting","requested","pending"];
const id=x=>Number.isSafeInteger(x)&&x>0,sha=x=>/^[a-f0-9]{40}$/.test(x??"");
const hold=s=>{throw Error("HOLD_NOV18_DIRECT_TRANSITION_"+s);};
const iso=t=>new Date(t).toISOString();
const emit=o=>console.log(JSON.stringify(o));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const operation=(op,fn)=>{try{return fn();}catch(e){if(/^HOLD_NOV18_DIRECT_TRANSITION_/.test(e?.message??""))throw e;hold(op+"_UNKNOWN_INSPECT_NO_REPLAY");}};
function gh(args,input,timeout=30000){
 return execFileSync("gh",args,{encoding:"utf8",input,timeout,maxBuffer:24*1024*1024,
  env:{...process.env,GH_PROMPT_DISABLED:"1"},stdio:[input===undefined?"ignore":"pipe","pipe","pipe"]}).trim();
}
function api(repo,path){return JSON.parse(gh(["api","--hostname","github.com","--method","GET","repos/"+repo+"/"+path]));}
function main(repo){const x=api(repo,"git/ref/heads/main")?.object?.sha;if(!sha(x))hold("MAIN_READBACK");return x;}
function exactMain(repo,want){if(main(repo)!==want)hold("MAIN_DRIFT");}
function complete(x,key,cap=100){
 if(!Number.isSafeInteger(x?.total_count)||x.total_count<0||x.total_count>cap||!Array.isArray(x[key])||x[key].length!==x.total_count)hold("INCOMPLETE_"+key.toUpperCase());
 return x[key];
}
function vars(repo){
 const pages=JSON.parse(gh(["api","--hostname","github.com","--paginate","--slurp","repos/"+repo+"/actions/variables?per_page=100"]));
 if(!Array.isArray(pages)||pages.length<1||pages.length>10||
    pages.some(p=>!Number.isSafeInteger(p?.total_count)||p.total_count!==pages[0].total_count||!Array.isArray(p.variables)||p.variables.length>100))hold("VARIABLE_LIST_INCOMPLETE");
 const rows=pages.flatMap(p=>p.variables),m=new Map(rows.map(x=>[x.name,x.value]));
 if(rows.length!==pages[0].total_count||rows.length!==m.size||rows.some(x=>typeof x.name!=="string"||typeof x.value!=="string"))hold("VARIABLE_LIST_DRIFT");
 return m;
}
function set(repo,name,value,pin){
 exactMain(repo,pin);
 emit({status:"OWNER_VARIABLE_UPDATE_ATTEMPT",repo,name});
 operation("VARIABLE_UPDATE",()=>gh(["variable","set",name,"-R",repo,"--body",value]));
 if(gh(["variable","get",name,"-R",repo]).trim()!==value)hold("VARIABLE_READBACK");
 exactMain(repo,pin);
}
function activeCount(repo,wfs){
 const seen=new Set();
 for(const state of S)for(const wf of wfs){
  const rows=complete(api(repo,"actions/workflows/"+wf+"/runs?branch=main&status="+state+"&per_page=100"),"workflow_runs");
  for(const row of rows){if(!id(row.id))hold("ACTIVE_WORKFLOW_IDENTITY");seen.add(row.id);}
 }
 return seen.size;
}
function noActive(repo,wfs){if(activeCount(repo,wfs))hold("ACTIVE_WORKFLOW_REVIEW");}
async function awaitIdle(repo,wfs,pin){
 const until=Date.now()+180000;
 for(;;){
  exactMain(repo,pin);
  const n=activeCount(repo,wfs);
  if(!n){exactMain(repo,pin);return;}
  if(Date.now()>=until)hold("ACTIVE_WORKFLOW_TIMEOUT_INSPECT_NO_REPLAY");
  emit({status:"GET_ONLY_AWAIT_IDLE",repo,activeCount:n});
  await sleep(5000);
 }
}
function matchesPr(repo,n,base,head){
 exactMain(repo,base);
 const x=api(repo,"pulls/"+n);
 if(x.state!=="open"||x.merged===true||x.base?.ref!=="main"||x.base.sha!==base||x.head?.sha!==head||x.head.repo?.full_name!==repo||
  x.base.repo?.full_name!==repo)hold("PR_SCOPE_CHANGED");
 return x;
}
function ciRows(repo,head,names){
 const rows=complete(api(repo,"actions/runs?event=pull_request&head_sha="+head+"&per_page=100"),"workflow_runs");
 if(rows.length!==names.length||new Set(rows.map(x=>x.name)).size!==rows.length||
   rows.some(x=>x.head_sha!==head||x.event!=="pull_request"||x.run_attempt!==1||!id(x.id)||!names.includes(x.name)))hold("EXACT_CI_SET");
 return rows;
}
function requireCI(rows){if(rows.some(x=>x.status!=="completed"||x.conclusion!=="success"))hold("CI_NOT_SUCCESSFUL");}
function waitCI(repo,head,names){
 const rows=ciRows(repo,head,names);
 for(const x of rows)if(x.status!=="completed"){
  emit({status:"CHECK_EXACT_CI",repo,runId:x.id,name:x.name});
  operation("CI_WATCH",()=>gh(["run","watch",String(x.id),"-R",repo,"--interval","10","--exit-status"],undefined,900000));
 }
 requireCI(ciRows(repo,head,names));
 emit({status:"EXACT_PR_CI_GREEN",repo,head,checks:names.length});
}
function tree(repo,commit){const x=api(repo,"git/commits/"+commit)?.tree?.sha;if(!sha(x))hold("TREE_IDENTITY");return x;}
function merge(repo,n,base,head,names){
 let x=matchesPr(repo,n,base,head);requireCI(ciRows(repo,head,names));
 if(x.draft){emit({status:"MARK_EXACT_PR_READY",repo,pr:n});operation("PR_READY",()=>gh(["pr","ready",String(n),"-R",repo]));}
 x=matchesPr(repo,n,base,head);
 if(x.draft||x.mergeable!==true)hold("PR_NOT_MERGEABLE");
 const expectedTree=tree(repo,head);
 emit({status:"EXACT_PR_MERGE_ATTEMPT",repo,pr:n,head});
 const out=operation("MERGE",()=>JSON.parse(gh(["api","--hostname","github.com","--method","PUT","repos/"+repo+"/pulls/"+n+"/merge","--input","-"],JSON.stringify({sha:head,merge_method:"merge"}))));
 if(out?.merged!==true||!sha(out.sha)||main(repo)!==out.sha||tree(repo,out.sha)!==expectedTree)hold("MERGED_TREE_OR_MAIN_DRIFT");
 emit({status:"MERGED_EXACT_REVIEWED_TREE",repo,main:out.sha,pr:n});
 return out.sha;
}
function verifyNoPaidChanges(p,r){
 const pval=k=>p.get(k),rval=k=>r.get(k);
 if(pval(PVAR)!==PB||pval("P5_PRIMARY_FIDS_EXPIRY_ENABLED")!=="true"||
    pval("P5_PRIMARY_FIDS_EXPIRY_APPROVAL")!=="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER"||
    pval("P5_PRIMARY_FIDS_BACKSTOP_ENABLED")!=="true"||pval("P6_PRIVATE_EPOCH_EXPIRY_MODE")!=="COMMISSION_VERIFY_ONLY"||
    !/^[a-f0-9]{64}$/.test(pval("P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256")??"")||
    ["P6_ROLLING_DIRECT_RECOVERY_ENABLED","P6_ROLLING_SCHEDULED_ROOT_ENABLED","P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED","P6_ROLLING_WINDOW_CUSTODY_ENABLED"].some(k=>pval(k)==="1"))
  hold("PRODUCTION_EXISTING_CONFIG_MISMATCH");
 if(rval("TRAVNR_RELAY_MODE")!=="MULTI_LANE"||rval("TRAVNR_RELAY_PRIMARY_ENABLED")!=="1"||
    rval("TRAVNR_RELAY_ROLLING_ENABLED")==="1"||rval("TRAVNR_RELAY_DIRECT_TICK_APPROVED")==="1"||
    rval("TRAVNR_APPROVED_TARGET_MAIN_SHA")!==PB||rval("TRAVNR_CRON_RELAY_SHA")!==RB)hold("RELAY_EXISTING_CONFIG_MISMATCH");
 const since=Date.parse(rval("TRAVNR_RELAY_PRIMARY_SINCE_UTC"));
 if(!Number.isSafeInteger(since)||iso(since)!==rval("TRAVNR_RELAY_PRIMARY_SINCE_UTC")||since>Date.now())hold("PRIMARY_ACTIVATION_CLOCK");
 return since;
}
function verifyPrimaryReceipt(log,pin,verify){
 const status=verify?"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES":"PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED";
 const hits=log.split("\n").filter(x=>x.includes('"status":"'+status+'"'));
 if(hits.length!==1)hold("PRIMARY_RECEIPT_COUNT");
 const r=JSON.parse(hits[0].slice(hits[0].indexOf("{")).trim());
 const b=r.before,after=r.after;
 const safe=x=>x?.schema==="v39.phase5.primary-fids-expiry-status.v1"&&C.every(k=>x[k]===0)&&x.deletionStopUnresolved===false&&
  x.providerCalls===0&&x.databaseWrites===0&&x.phase6PaidGo===false&&x.backupOrPitrVerified===false&&x.completeRetentionDeploymentVerified===false&&Number.isFinite(Date.parse(x.observedAtUtc));
 if(r.status!==status||r.reviewedMainSha!==pin||r.distinctDbActorsVerified!==true||r.privateCommissionState!=="GRANTED"||
    r.providerCalls!==0||r.objectDeletions!==0||r.phase6PaidGo!==false||r.completeRetentionDeploymentVerified!==false||
    r.backupOrPitrVerified!==false||!safe(b)||(verify?r.databaseWrites!==0:!safe(after)||r.databaseWritesPossible!==false))
  hold("PRIMARY_RECEIPT_REVIEW");
 return b.observedAtUtc;
}
function primaryReceipt(run,pin,verify){
 if(!id(run?.id)||run.head_sha!==pin||run.head_branch!=="main"||run.path!==".github/workflows/"+PRIMARY||
    run.event!=="workflow_dispatch"||run.run_attempt!==1||run.status!=="completed"||run.conclusion!=="success"||
    !verify&&run.display_title!=="P5 PRIMARY BACKSTOP CHILD")hold("PRIMARY_RUN_IDENTITY");
 const js=complete(api(P,"actions/runs/"+run.id+"/jobs?filter=latest&per_page=100"),"jobs");
 const j=js[0];
 if(js.length!==1||!id(j?.id)||j.name!=="primary-fids-expiry"||j.run_id!==run.id||j.head_sha!==pin||j.run_attempt!==1||
    j.status!=="completed"||j.conclusion!=="success"||
    j.steps?.filter(s=>s.name==="Verify exact main and execute only bounded primary FIDS expiry"&&s.status==="completed"&&s.conclusion==="success").length!==1)hold("PRIMARY_JOB_IDENTITY");
 const at=verifyPrimaryReceipt(gh(["run","view",String(run.id),"-R",P,"--job",String(j.id),"--log"]),pin,verify);
 if(Date.parse(at)<Date.parse(run.created_at)||Date.parse(at)>Date.parse(j.completed_at)+1000||Date.now()-Date.parse(at)>60*60000)hold("PRIMARY_RECEIPT_CLOCK");
 return {runId:run.id,jobId:j.id,observedAtUtc:at};
}
function primaryVerify(pin){
 exactMain(P,pin);
 emit({status:"NEW_PIN_PRIMARY_VERIFY_ONLY_DISPATCH_ATTEMPT",main:pin});
 const out=operation("PRIMARY_VERIFY_DISPATCH",()=>JSON.parse(gh(["api","--hostname","github.com","--method","POST","repos/"+P+"/actions/workflows/"+PRIMARY+"/dispatches","--input","-"],JSON.stringify({ref:"main",return_run_details:true,inputs:{confirm:"VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES",approved_main_sha:pin}}))));
 if(!id(out?.workflow_run_id)||out.run_url!=="https://api.github.com/repos/"+P+"/actions/runs/"+out.workflow_run_id||
   out.html_url!=="https://github.com/"+P+"/actions/runs/"+out.workflow_run_id)hold("PRIMARY_VERIFY_ACK_UNKNOWN");
 const runId=out.workflow_run_id;
 emit({status:"PRIMARY_VERIFY_EXACT_ACK",runId});
 operation("PRIMARY_VERIFY_WATCH",()=>gh(["run","watch",String(runId),"-R",P,"--interval","10","--exit-status"],undefined,600000));
 const proof=primaryReceipt(api(P,"actions/runs/"+runId),pin,true);
 emit({status:"PRIMARY_VERIFY_ONLY_EXACT_ZERO_COUNTERS",...proof,main:pin,providerCalls:0,databaseWrites:0});
 return proof;
}
function primaryBefore(since){
 const rows=api(P,"actions/workflows/"+PRIMARY+"/runs?branch=main&event=workflow_dispatch&per_page=20");
 if(!Number.isSafeInteger(rows?.total_count)||rows.total_count<1||!Array.isArray(rows.workflow_runs)||rows.workflow_runs.length!==Math.min(20,rows.total_count))hold("PRIMARY_HISTORY");
 const last=rows.workflow_runs.find(x=>x.head_sha===PB&&x.display_title==="P5 PRIMARY BACKSTOP CHILD");
 if(!last)hold("PRIMARY_CURRENT_CHILD_NOT_OBSERVED");
 const proof=primaryReceipt(last,PB,false);
 for(const c of ["failure","cancelled","timed_out","action_required","stale","neutral"]){
  const all=complete(api(R,"actions/workflows/"+RELAY+"/runs?branch=main&event=workflow_dispatch&status="+c+"&per_page=100&created="+encodeURIComponent(">="+iso(since))),"workflow_runs");
  if(all.some(x=>x.display_title!=="TRAVNR EXTERNAL CLOCK ROLLING_ROOT"&&x.display_title!=="TRAVNR EXTERNAL CLOCK CLOCK_ONLY"))hold("PRIMARY_RELAY_PRIOR_NEGATIVE_REVIEW");
 }
 emit({status:"CURRENT_PRIMARY_BACKUP_EXACT_ZERO_COUNTERS",...proof,main:PB});
}
function preflight(){
 const user=JSON.parse(gh(["api","--hostname","github.com","user"]));
 if(user?.login!=="HKcode22")hold("OWNER_IDENTITY");
 matchesPr(P,875,PB,PH);matchesPr(R,19,RB,RH);
 const p=vars(P),r=vars(R),since=verifyNoPaidChanges(p,r);
 const ep=p.get("P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256");
 const names=JSON.parse(gh(["secret","list","-R",P,"--json","name"]));
 if(!["P5_PRIMARY_FIDS_SWEEP_DATABASE_URL","P5_RETENTION_READER_DATABASE_URL"].every(k=>names.filter(x=>x.name===k).length===1))hold("PRIMARY_SECRET_NAMES");
 const token=JSON.parse(gh(["secret","list","-R",R,"--env","travnr-target-forward","--json","name"]));
 if(token.length!==1||token[0].name!=="TRAVNR_TARGET_ACTIONS_TOKEN")hold("RELAY_SCOPED_SECRET_NAMES");
 const epol=api(R,"environments/travnr-target-forward");
 const branch=complete(api(R,"environments/travnr-target-forward/deployment-branch-policies?per_page=100"),"branch_policies");
 if(epol?.can_admins_bypass!==false||epol.deployment_branch_policy?.custom_branch_policies!==true||epol.deployment_branch_policy?.protected_branches!==false||
   branch.length!==1||branch[0].name!=="main")hold("RELAY_FORWARD_ENVIRONMENT_DRIFT");
 // Original primary, rolling route and account settings are not recreated.
 primaryBefore(since);
 noActive(P,[PRIMARY,"phase6-rolling-controller-bounded-session.yml"]);noActive(R,[RELAY]);
 exactMain(P,PB);exactMain(R,RB);
 return {since,endpoint:ep};
}
function assertProduction(pin,endpoint){
 const m=vars(P);
 if(m.get(PVAR)!==pin||m.get("P5_PRIMARY_FIDS_EXPIRY_ENABLED")!=="true"||
    m.get("P5_PRIMARY_FIDS_EXPIRY_APPROVAL")!=="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER"||
    m.get("P5_PRIMARY_FIDS_BACKSTOP_ENABLED")!=="true"||m.get("P6_PRIVATE_EPOCH_EXPIRY_MODE")!=="COMMISSION_VERIFY_ONLY"||
    m.get("P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256")!==endpoint||m.get("P6_ROLLING_DIRECT_RECOVERY_ENABLED")==="1")hold("PRODUCTION_POST_TRANSITION_DRIFT");
 exactMain(P,pin);
}
function verifyDirectResult(run,pin){
 if(!id(run?.id)||run.head_sha!==pin||run.head_branch!=="main"||run.path!==".github/workflows/"+DIRECT||
    run.event!=="workflow_dispatch"||run.run_attempt!==1||run.display_title!=="P6 DIRECT RECOVERY VERIFY"||
    run.status!=="completed"||run.conclusion!=="success")hold("DIRECT_VERIFY_RUN_IDENTITY");
 const jobs=complete(api(P,"actions/runs/"+run.id+"/jobs?filter=latest&per_page=100"),"jobs");
 if(jobs.length!==3||new Set(jobs.map(x=>x.id)).size!==3||
    jobs.some(x=>!id(x.id)||x.run_id!==run.id||x.head_sha!==pin||x.run_attempt!==1||x.status!=="completed")||
    !["offline-direct-recovery","direct-protected-recovery-tick"].every(name=>jobs.filter(x=>x.name===name&&x.conclusion==="skipped"&&(x.steps==null||Array.isArray(x.steps)&&x.steps.length===0)).length===1))hold("DIRECT_VERIFY_JOB_SCOPE");
 const j=jobs.find(x=>x.name==="direct-readonly-verify");
 if(!j||j.conclusion!=="success"||j.steps?.filter(s=>s.name==="Verify exact direct wake and existing workflow metadata NO POST"&&s.status==="completed"&&s.conclusion==="success").length!==1)hold("DIRECT_VERIFY_STEP");
 const lines=gh(["run","view",String(run.id),"-R",P,"--job",String(j.id),"--log"]).split("\n").filter(s=>s.includes('{"status":"ACTUAL_DIRECT_CLOCK_READONLY_METADATA_AND_PLAN_PROBE_NO_GO"'));
 if(lines.length!==1)hold("DIRECT_VERIFY_RECEIPT_COUNT");
 const x=JSON.parse(lines[0].slice(lines[0].indexOf('{"status":')).trim());
 if(x.runId!==run.id||x.event!=="workflow_dispatch"||x.observedMainSha!==pin||x.actualRunHeadSha!==pin||x.actualCheckoutSha!==pin||
    x.providerCalls!==0||x.databaseReads!==0||x.databaseWrites!==0||x.dispatches!==0||x.phase6PaidGo!==false||
    x.routeStates?.length!==8||x.routeStates.some(y=>y.state!=="active")||
    x.sourceTiming?.totalTemplates!==6144)hold("DIRECT_VERIFY_RECEIPT_SCOPE");
 return {targetRunId:run.id,targetJobId:j.id,previewStatus:x.previewStatus};
}
async function observeExternalVerify(prod,relay,since){
 const start=Date.now(),seen=new Set();
 while(Date.now()-start<18*60000){
  exactMain(P,prod);exactMain(R,relay);
  const hist=complete(api(R,"actions/workflows/"+RELAY+"/runs?branch=main&event=workflow_dispatch&per_page=100&created="+encodeURIComponent(">="+since)),"workflow_runs");
  const rolling=hist.filter(x=>x.display_title==="TRAVNR EXTERNAL CLOCK ROLLING_ROOT");
  for(const r of rolling){
   if(r.head_sha!==relay||r.head_branch!=="main"||r.event!=="workflow_dispatch"||r.run_attempt!==1)hold("DIRECT_RELAY_RUN_DRIFT");
   if(r.status!=="completed"||seen.has(r.id))continue;
   if(r.conclusion!=="success")hold("DIRECT_RELAY_UNSUCCESSFUL");
   const jobs=complete(api(R,"actions/runs/"+r.id+"/jobs?filter=latest&per_page=100"),"jobs");
   const f=jobs.find(x=>x.name==="target-forward");
   if(jobs.length!==3||!f||f.run_id!==r.id||f.head_sha!==relay||f.run_attempt!==1||f.conclusion!=="success"||
      f.steps?.filter(s=>s.name==="Run node cli.mjs"&&s.conclusion==="success"&&s.status==="completed").length!==1)hold("DIRECT_RELAY_STEP");
   const lines=gh(["run","view",String(r.id),"-R",R,"--job",String(f.id),"--log"]).split("\n").filter(s=>s.includes('{"status":"TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF"'));
   if(lines.length===0)continue; // safe cooldown/defer; no proof claimed
   if(lines.length!==1)hold("DIRECT_RELAY_RECEIPT_COUNT");
   const x=JSON.parse(lines[0].slice(lines[0].indexOf('{"status":')).trim());
   if(x.relayRunId!==r.id||x.mode!=="ROLLING_ROOT"||x.targetWorkflow!==DIRECT||!id(x.targetRunId)||
      x.relayDispatches!==1||x.providerCallsByRelay!==0||x.databaseReadsByRelay!==0||x.databaseWritesByRelay!==0||x.paidAuthorityGranted!==false)
     hold("DIRECT_RELAY_RECEIPT_SCOPE");
   const target=api(P,"actions/runs/"+x.targetRunId);
   if(target.status!=="completed")continue;
   const proof=verifyDirectResult(target,prod);seen.add(r.id);
   emit({status:"ACTUAL_RELAY_TO_DIRECT_VERIFY_NO_PROVIDER_NO_DB",relayRunId:r.id,relayJobId:f.id,...proof,
    providerCalls:0,databaseWrites:0,externalCronAttributionIndependentlyVerified:false,phase6PaidGo:false});
   return {relayRunId:r.id,...proof};
  }
  await sleep(15000);
 }
 hold("DIRECT_VERIFY_NOT_YET_OBSERVED_INSPECT_NO_REPLAY");
}
async function execute(mode){
 if(process.env.GITHUB_ACTIONS==="true"||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||!["--preflight","--deploy-and-verify"].includes(mode))hold("OWNER_LOCAL_MODE");
 if(mode==="--preflight"){const x=preflight();emit({status:"OWNER_TRANSITION_PREFLIGHT_OK_NO_MUTATION",productionMain:PB,relayMain:RB,
  productionCandidate:PH,relayCandidate:RH,primarySinceUtc:iso(x.since),paidAuthorityGranted:false});return;}
 waitCI(P,PH,CHECKS_P);waitCI(R,RH,CHECKS_R);
 await awaitIdle(P,[PRIMARY,"phase6-rolling-controller-bounded-session.yml"],PB);
 await awaitIdle(R,[RELAY],RB);
 const old=preflight();
 emit({status:"EXACT_TRANSITION_PREFLIGHT_PASSED_NO_PAID_CHANGE"});
 const prod=merge(P,875,PB,PH,CHECKS_P);
 // Immediately restore the current-main primary cleanup pin; no APPLY.
 set(P,PVAR,prod,prod);assertProduction(prod,old.endpoint);
 const v=primaryVerify(prod);
 exactMain(R,RB);set(R,"TRAVNR_APPROVED_TARGET_MAIN_SHA",prod,RB);
 set(R,"TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID",String(v.runId),RB);
 exactMain(P,prod);assertProduction(prod,old.endpoint);
 // Recheck no forwarding attempt is active at the relay release boundary.
 await awaitIdle(R,[RELAY],RB);
 const relay=merge(R,19,RB,RH,CHECKS_R);
 set(R,"TRAVNR_CRON_RELAY_SHA",relay,relay);
 const cfg=vars(R);
 if(cfg.get("TRAVNR_RELAY_PRIMARY_ENABLED")!=="1"||cfg.get("TRAVNR_RELAY_PRIMARY_SINCE_UTC")!==iso(old.since)||
    cfg.get("TRAVNR_RELAY_ROLLING_ENABLED")==="1"||cfg.get("TRAVNR_APPROVED_TARGET_MAIN_SHA")!==prod||
    cfg.get("TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID")!==String(v.runId))hold("RELAY_POST_MERGE_DRIFT");
 // Only read-only direct mode, bounded to two hours by relay implementation.
 set(R,"TRAVNR_RELAY_ROLLING_ROUTE","DIRECT_VERIFY",relay);
 set(R,"TRAVNR_RELAY_DIRECT_TICK_APPROVED","0",relay);
 const since=iso(Date.now());
 set(R,"TRAVNR_RELAY_ROLLING_SINCE_UTC",since,relay);
 assertProduction(prod,old.endpoint);set(R,"TRAVNR_RELAY_ROLLING_ENABLED","1",relay);
 emit({status:"DIRECT_VERIFY_ONLY_EXISTING_CLOCK_ENABLED",productionMain:prod,relayMain:relay,activationUtc:since,
  expiresByUtc:iso(Date.parse(since)+120*60000),paidTickEnabled:false,providerCalls:0,phase6PaidGo:false});
 const proof=await observeExternalVerify(prod,relay,since);
 assertProduction(prod,old.endpoint);exactMain(R,relay);
 emit({status:"EXACT_DIRECT_CLOCK_VERIFY_DELIVERED_NO_PROVIDER_NO_DB_NO_GO",productionMain:prod,relayMain:relay,primaryVerifyRunId:v.runId,...proof,
  releaseEvidenceNotInferred:true,calendarStaged:false,paidAuthorityGranted:false});
}
module.exports={verifyPrimaryReceipt,verifyNoPaidChanges,requireCI,complete};
if(require.main===module)execute(process.argv[2]).catch(e=>{console.error(/^HOLD_NOV18_DIRECT_TRANSITION_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_NOV18_DIRECT_TRANSITION_REDACTED_INSPECT_NO_REPLAY");process.exitCode=2;});
