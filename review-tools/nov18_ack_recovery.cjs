'use strict';
// One narrowly scoped owner recovery, not a production merge or paid release.
const {execFileSync}=require("node:child_process");
const P="HKcode22/ReplitTranvr",R="HKcode22/TravnrClockRelay";
const PM="ea89308f468494d848f549539200f73f848a4fa7",RB="9ecfd0ecea5814fc7214e84a8a61814c97b32f5b",RH="1fb9150bf35527aaea6c0084eb64afb014a8c1df";
const E="external-clock.yml",D="phase6-direct-recovery-tick.yml";
const OLD="2026-11-18T16:02:25.896Z",F=44343687014,T=44343750626,J=134940226435,TJ=134940453473,C=44344535662;
const HOLD=s=>{throw Error("HOLD_NOV18_ACK_RECOVERY_"+s);};
const emit=x=>console.log(JSON.stringify(x)),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const id=x=>Number.isSafeInteger(x)&&x>0,sha=x=>/^[a-f0-9]{40}$/.test(x??"");
const run=(args,input)=>execFileSync("gh",args,{encoding:"utf8",input,timeout:30000,maxBuffer:16*1024*1024,stdio:[input===undefined?"ignore":"pipe","pipe","pipe"],env:{...process.env,GH_PROMPT_DISABLED:"1"}}).trim();
const get=(repo,path)=>JSON.parse(run(["api","--hostname","github.com","--method","GET","repos/"+repo+"/"+path]));
const main=repo=>get(repo,"git/ref/heads/main").object.sha;
const eq=(repo,expected)=>{if(main(repo)!==expected)HOLD("MAIN_DRIFT");};
const tree=(repo,commit)=>get(repo,"git/commits/"+commit).tree.sha;
const v=(repo,k)=>run(["variable","get",k,"-R",repo]);
const all=(body,k)=>{if(!Number.isSafeInteger(body?.total_count)||body.total_count<0||body.total_count>100||!Array.isArray(body[k])||body[k].length!==body.total_count)HOLD("INCOMPLETE_HISTORY");return body[k];};
const hist=(repo,wf,since)=>all(get(repo,"actions/workflows/"+wf+"/runs?branch=main&event=workflow_dispatch&per_page=100&created="+encodeURIComponent(">="+since)),"workflow_runs");
const jobs=(repo,r)=>all(get(repo,"actions/runs/"+r+"/jobs?filter=latest&per_page=100"),"jobs");
const logs=(repo,r,j)=>run(["run","view",String(r),"-R",repo,"--job",String(j),"--log"]);
const marker=(log,status)=>{const lines=log.split(/\r?\n/).filter(l=>l.includes('{"status":"'+status+'"'));if(lines.length!==1)HOLD("RECEIPT_"+status);return JSON.parse(lines[0].slice(lines[0].indexOf('{"status":')).trim());};
const errors=(log,code)=>log.split(/\r?\n/).filter(l=>l.includes(code)).length;
function exact(r,wf,pin,title){
 if(!id(r?.id)||r.path!==".github/workflows/"+wf||r.head_sha!==pin||r.head_branch!=="main"||r.event!=="workflow_dispatch"||r.run_attempt!==1||r.display_title!==title||!Number.isFinite(Date.parse(r.created_at)))HOLD("RUN_IDENTITY");
}
function exactJobs(a,r,names,required){
 if(a.length!==names.length||new Set(a.map(x=>x.id)).size!==a.length||a.some(j=>!id(j.id)||j.run_id!==r.id||j.head_sha!==r.head_sha||j.run_attempt!==1||j.status!=="completed")||names.some(n=>a.filter(j=>j.name===n).length!==1))HOLD("JOB_IDENTITY");
 const j=a.find(x=>x.name===required);
 if(a.filter(x=>x.name!==required).some(x=>x.conclusion!=="skipped"||!(x.steps==null||Array.isArray(x.steps)&&x.steps.length===0)))HOLD("UNEXPECTED_OTHER_JOB");
 return j;
}
const step=(j,name,conclusion)=>Array.isArray(j.steps)&&j.steps.filter(s=>s.name===name&&s.status==="completed"&&s.conclusion===conclusion).length===1;
function verifiedTarget(r){
 exact(r,D,PM,"P6 DIRECT RECOVERY VERIFY");
 if(r.status!=="completed"||r.conclusion!=="success")HOLD("TARGET_NOT_SUCCESSFUL");
 const j=exactJobs(jobs(P,r.id),r,["offline-direct-recovery","direct-readonly-verify","direct-protected-recovery-tick"],"direct-readonly-verify");
 if(j.conclusion!=="success"||!step(j,"Verify exact direct wake and existing workflow metadata NO POST","success"))HOLD("TARGET_STEP");
 const b=marker(logs(P,r.id,j.id),"ACTUAL_DIRECT_CLOCK_READONLY_METADATA_AND_PLAN_PROBE_NO_GO");
 if(b.runId!==r.id||b.event!=="workflow_dispatch"||b.actualRunHeadSha!==PM||b.actualCheckoutSha!==PM||b.observedMainSha!==PM||
    b.providerCalls!==0||b.databaseReads!==0||b.databaseWrites!==0||b.dispatches!==0||b.phase6PaidGo!==false||
    b.routeStates?.length!==8||b.routeStates.some(x=>x.state!=="active")||b.sourceTiming?.totalTemplates!==6144)HOLD("TARGET_RECEIPT");
 return {runId:r.id,jobId:j.id,previewStatus:b.previewStatus,githubReads:b.githubReads};
}
function config(pin,rolling,since){
 eq(P,PM);eq(R,pin);
 const values=[
 [P,"P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA",PM],[P,"P5_PRIMARY_FIDS_EXPIRY_ENABLED","true"],[P,"P5_PRIMARY_FIDS_BACKSTOP_ENABLED","true"],
 [P,"P5_PRIMARY_FIDS_EXPIRY_APPROVAL","APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER"],[P,"P6_PRIVATE_EPOCH_EXPIRY_MODE","COMMISSION_VERIFY_ONLY"],
 [R,"TRAVNR_APPROVED_TARGET_MAIN_SHA",PM],[R,"TRAVNR_CRON_RELAY_SHA",pin],[R,"TRAVNR_RELAY_MODE","MULTI_LANE"],
 [R,"TRAVNR_RELAY_PRIMARY_ENABLED","1"],[R,"TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID","44342314685"],
 [R,"TRAVNR_RELAY_ROLLING_ROUTE","DIRECT_VERIFY"],[R,"TRAVNR_RELAY_DIRECT_TICK_APPROVED","0"],
 [R,"TRAVNR_RELAY_ROLLING_ENABLED",rolling],[R,"TRAVNR_RELAY_ROLLING_SINCE_UTC",since]];
 for(const [repo,k,w] of values)if(v(repo,k)!==w)HOLD("CONFIG_"+k);
 const pages=JSON.parse(run(["api","--hostname","github.com","--paginate","--slurp","repos/"+P+"/actions/variables?per_page=100"]));
 if(!Array.isArray(pages)||!pages.length||pages.length>10||pages.some(x=>!Number.isSafeInteger(x.total_count)||x.total_count!==pages[0].total_count||!Array.isArray(x.variables)))HOLD("PRODUCTION_VARIABLE_HISTORY");
 const vv=pages.flatMap(x=>x.variables);
 if(vv.length!==pages[0].total_count||new Set(vv.map(x=>x.name)).size!==vv.length)HOLD("PRODUCTION_VARIABLE_HISTORY");
 const direct=vv.find(x=>x.name==="P6_ROLLING_DIRECT_RECOVERY_ENABLED");
 if(direct?.value==="1")HOLD("PAID_DIRECT_ALREADY_ENABLED");
 eq(P,PM);eq(R,pin);
}
function set(pin,k,value){
 eq(P,PM);eq(R,pin);emit({status:"OWNER_RELAY_VARIABLE_UPDATE_ATTEMPT",name:k});
 try{run(["variable","set",k,"-R",R,"--body",value]);}catch{HOLD("UNKNOWN_VARIABLE_UPDATE_INSPECT_NO_REPLAY");}
 if(v(R,k)!==value)HOLD("VARIABLE_READBACK");eq(R,pin);
}
function verifyIncident(){
 const r=get(R,"actions/runs/"+F),t=get(P,"actions/runs/"+T);
 exact(r,E,RB,"TRAVNR EXTERNAL CLOCK ROLLING_ROOT");
 if(r.status!=="completed"||r.conclusion!=="failure")HOLD("INCIDENT_NOT_EXACT");
 const j=exactJobs(jobs(R,F),r,["offline-tests","independent-pulse","target-forward"],"target-forward");
 if(j.id!==J||j.conclusion!=="failure"||!step(j,"Run node cli.mjs","failure"))HOLD("INCIDENT_JOB");
 const l=logs(R,F,J),a=marker(l,"EXTERNAL_WAKE_TARGET_ATTEMPT_NO_REPLAY"),b=marker(l,"EXTERNAL_WAKE_TARGET_ACK_NOT_EXECUTION_PROOF");
 if(a.relayRunId!==F||a.mode!=="ROLLING_ROOT"||a.workflow!==D||b.relayRunId!==F||b.mode!=="ROLLING_ROOT"||b.runId!==T||
    errors(l,"HOLD_EXTERNAL_CLOCK_ACK_READBACK_DRIFT_NO_BLIND_REPLAY")!==1||Date.parse(t.created_at)<Date.parse(a.attemptUtc)-1000)HOLD("INCIDENT_LOG_SCOPE");
 const proof=verifiedTarget(t);if(proof.jobId!==TJ)HOLD("INCIDENT_TARGET_JOB_DRIFT");
 emit({status:"OLD_FAILED_RELAY_EXACT_ACK_RECONCILED_READONLY_TARGET_SUCCESS",relayRunId:F,targetRunId:T,...proof,providerCalls:0,databaseWrites:0,paidAuthority:false});
 return t;
}
async function idle(pin){
 const end=Date.now()+180000;
 for(;;){
  eq(R,pin);let n=0;
  for(const status of ["queued","in_progress","waiting","requested","pending"])n+=all(get(R,"actions/workflows/"+E+"/runs?branch=main&event=workflow_dispatch&status="+status+"&per_page=100"),"workflow_runs").length;
  if(!n)return;if(Date.now()>=end)HOLD("ACTIVE_RELAY_REVIEW");await sleep(5000);
 }
}
function historyReconciled(){
 const rows=hist(R,E,OLD);
 if(rows.some(x=>!["TRAVNR EXTERNAL CLOCK ROLLING_ROOT","TRAVNR EXTERNAL CLOCK PRIMARY_BACKSTOP","TRAVNR EXTERNAL CLOCK CLOCK_ONLY"].includes(x.display_title)))HOLD("UNKNOWN_RELAY_LANE");
 const r=rows.filter(x=>x.display_title==="TRAVNR EXTERNAL CLOCK ROLLING_ROOT");
 if(r.filter(x=>x.id===F).length!==1)HOLD("INCIDENT_MISSING");
 for(const x of r){
  exact(x,E,RB,"TRAVNR EXTERNAL CLOCK ROLLING_ROOT");
  if(x.id===F)continue;
  if(x.status!=="completed")HOLD("ROLLING_ACTIVE");
  const js=jobs(R,x.id);
  if(x.conclusion==="skipped"){
   if(js.length!==3||js.some(j=>j.run_id!==x.id||j.head_sha!==RB||j.run_attempt!==1||j.status!=="completed"||j.conclusion!=="skipped"||!(j.steps==null||Array.isArray(j.steps)&&j.steps.length===0)))HOLD("ROLLING_SKIP_EVIDENCE");
   continue;
  }
  if(x.conclusion!=="success")HOLD("ADDITIONAL_ROLLING_FAILURE");
  const j=exactJobs(js,x,["offline-tests","independent-pulse","target-forward"],"target-forward");
  if(j.conclusion!=="success"||!step(j,"Run node cli.mjs","success"))HOLD("ROLLING_RECENT_JOB");
  const l=logs(R,x.id,j.id);
  if(errors(l,"EXTERNAL_WAKE_TARGET_ATTEMPT_NO_REPLAY")||errors(l,"EXTERNAL_WAKE_TARGET_ACK_NOT_EXECUTION_PROOF"))HOLD("ADDITIONAL_POST_REVIEW");
  const z=marker(l,"QUARANTINED_PRIOR_RELAY_RUN_REVIEW");
  if(z.relayRunId!==x.id||z.mode!=="ROLLING_ROOT"||z.paidAuthorityGranted!==false)HOLD("QUARANTINE_RECEIPT");
 }
 const target=hist(P,D,OLD);
 if(target.length!==1||target[0].id!==T)HOLD("ADDITIONAL_DIRECT_TARGET_REVIEW");
 emit({status:"ALL_PRIOR_ROLLING_RECONCILED_NO_UNRESOLVED_POST",rollingRuns:r.length,onlyTargetRunId:T});
}
async function observe(pin,since){
 const end=Date.now()+18*60000;
 for(;;){
  eq(P,PM);eq(R,pin);
  for(const r of hist(R,E,since).filter(x=>x.display_title==="TRAVNR EXTERNAL CLOCK ROLLING_ROOT")){
   exact(r,E,pin,"TRAVNR EXTERNAL CLOCK ROLLING_ROOT");
   if(r.status!=="completed")continue;
   if(r.conclusion==="skipped"){
    const js=jobs(R,r.id);
    if(js.length!==3||new Set(js.map(x=>x.id)).size!==3||
       !["offline-tests","independent-pulse","target-forward"].every(name=>js.filter(j=>id(j.id)&&j.name===name&&j.run_id===r.id&&j.head_sha===pin&&j.run_attempt===1&&j.status==="completed"&&j.conclusion==="skipped"&&(j.steps==null||Array.isArray(j.steps)&&j.steps.length===0)).length===1))HOLD("NEW_ROLLING_SKIP_SCOPE");
    continue;
   }
   if(r.conclusion!=="success")HOLD("NEW_ROLLING_RUN_UNSUCCESSFUL_INSPECT_NO_REPLAY");
   const j=exactJobs(jobs(R,r.id),r,["offline-tests","independent-pulse","target-forward"],"target-forward");
   if(j.conclusion!=="success"||!step(j,"Run node cli.mjs","success"))HOLD("NEW_RELAY_STEP");
   const l=logs(R,r.id,j.id);
   if(!errors(l,'{"status":"TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF"'))continue;
   const b=marker(l,"TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF");
   if(b.mode!=="ROLLING_ROOT"||b.relayRunId!==r.id||!id(b.targetRunId)||b.targetWorkflow!==D||b.relayDispatches!==1||b.providerCallsByRelay!==0||b.databaseReadsByRelay!==0||b.databaseWritesByRelay!==0||b.paidAuthorityGranted!==false)HOLD("NEW_RELAY_ACK_SCOPE");
   const t=get(P,"actions/runs/"+b.targetRunId);if(t.status!=="completed")continue;
   const proof=verifiedTarget(t);
   emit({status:"EXTERNAL_DIRECT_VERIFY_COMPLETE_RELAY_AND_TARGET_READBACK",relayRunId:r.id,relayJobId:j.id,...proof,providerCalls:0,databaseWrites:0,paidAuthority:false});
   return;
  }
  if(Date.now()>=end)HOLD("NEW_EXTERNAL_VERIFY_NOT_OBSERVED_INSPECT_NO_REPLAY");
  await sleep(15000);
 }
}
async function execute(){
 if(process.env.GITHUB_ACTIONS==="true"||process.argv.length!==2)HOLD("OWNER_LOCAL_ONLY");
 if(JSON.parse(run(["api","user"])).login!=="HKcode22")HOLD("OWNER_IDENTITY");
 config(RB,"1",OLD);
 const pr=get(R,"pulls/20"),ci=get(R,"actions/runs/"+C);
 if(pr.state!=="open"||pr.draft||pr.base.sha!==RB||pr.head.sha!==RH||pr.head.repo.full_name!==R||pr.mergeable!==true||
    ci.head_sha!==RH||ci.event!=="pull_request"||ci.run_attempt!==1||ci.conclusion!=="success"||ci.status!=="completed")HOLD("EXACT_FIX_PR_CI");
 const check=jobs(R,C).find(j=>j.name==="offline-tests");
 if(check?.id!==134943248017||check.conclusion!=="success")HOLD("EXACT_FIX_TEST_JOB");
 const t=verifyIncident();
 // Stop only the read-only rolling lane; primary remains enabled at all times.
 set(RB,"TRAVNR_RELAY_ROLLING_ENABLED","0");
 await idle(RB);historyReconciled();config(RB,"0",OLD);
 const expected=tree(R,RH);
 emit({status:"EXACT_RELAY_ONLY_MERGE_ATTEMPT",pr:20,head:RH});
 let m;try{m=JSON.parse(run(["api","--hostname","github.com","--method","PUT","repos/"+R+"/pulls/20/merge","--input","-"],JSON.stringify({sha:RH,merge_method:"merge"})));}catch{HOLD("MERGE_UNKNOWN_INSPECT_NO_REPLAY");}
 if(m?.merged!==true||!sha(m.sha)||main(R)!==m.sha||tree(R,m.sha)!==expected)HOLD("EXACT_RELAY_TREE_MERGE");
 emit({status:"EXACT_RELAY_ONLY_MERGED",relayMain:m.sha,productionMain:PM});
 set(m.sha,"TRAVNR_CRON_RELAY_SHA",m.sha);
 // Reconciliation of the exact known old receipt, no unknown or paid POST.
 // Respect the old target cooldown before the new read-only observation epoch.
 const delay=Date.parse(t.created_at)+8*60000-Date.now();
 if(delay>0){if(delay>480000)HOLD("COOLDOWN_CLOCK");await sleep(delay+1000);}
 const since=new Date().toISOString();
 set(m.sha,"TRAVNR_RELAY_ROLLING_SINCE_UTC",since);
 config(m.sha,"0",since);
 set(m.sha,"TRAVNR_RELAY_ROLLING_ENABLED","1");
 config(m.sha,"1",since);
 emit({status:"RECONCILED_NEW_READONLY_ROLLING_EPOCH",activationUtc:since,expiresByUtc:new Date(Date.parse(since)+7200000).toISOString(),oldIncidentPreserved:F,paidTickEnabled:false});
 await observe(m.sha,since);
 config(m.sha,"1",since);
}
if(require.main===module)execute().catch(e=>{console.error(/^HOLD_NOV18_ACK_RECOVERY_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_NOV18_ACK_RECOVERY_REDACTED_INSPECT_NO_REPLAY");process.exitCode=2;});
