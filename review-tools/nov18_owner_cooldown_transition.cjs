'use strict';
// Owner-only exact NOV18 coordinated deployment. No provider keys, secret
// writes, release/paid flags, production DB credentials, Cron API mutations,
// or calendar/budget edits. A failed/doubtful mutation stops; inspect, never
// automatically retry. All approvals for paid collection remain separate.
const {execFileSync}=require("node:child_process");
const P="HKcode22/ReplitTranvr",R="HKcode22/TravnrClockRelay";
const PB="ea89308f468494d848f549539200f73f848a4fa7",PH="255c029f721d6eec8de199df183ba8e909b31ec8";
const RB="b3a775b4ec7213af796bb8c727b69c3d0feb8bb7";
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const PT="d4d976f2bd67f01137ac46a2d09c74a2c8113780",HT="e84f9e599187bd76792661799fa4ca881314ae4d";
const MANIFEST="e5315b35fb8978d1de823bb1953191d976ccf093594a656890fb16d91f88a3e0",INV="af8122be433b471ef09091f194a9a3d275514fa8240e337ccfec505288ceaa17";
const CONFIG="4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb",DRAFT="db1645f302e7840455938e88738c3b895bea808ea2b3132eaff959551214a46e";
const CAT="4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534",INDEX="6b626c5f34a0891d1322eb150d97456a7ed95d02";
const OLD_SINCE="2026-11-18T16:17:17.321Z",OLD_UNTIL="2026-11-18T18:17:17.321Z";
const DELTA=[["scripts/v39_phase6_direct_recovery_tick_v39.mjs","53e0b5e7b3a1b67c8b3c30c56dd702bad132f4fd","d3d97a81a1f541ca47d29fae84085460b8c000c2"],["server/lib/disruption/phase6RollingGithubController_v39.mjs","9e0577b68b471134dcfa64302334491806233cc9","8454fb6ec18df8de3bcf83db0669d3b8505ae932"],["tests/phase6_direct_recovery_tick_v39.test.mjs","1b4b7571ee37498a012c4d4914769de839b47c0b","2e89fe532934b371c766dc6982feed2df7c8a277"]];
const PAIRS=[[44345668673,44345719185],[44347607546,44347663362],[44349532338,44349592278],[44351448881,44351500056],[44353334107,44353385273],[44355231694,44355295118],[44357163854,44357227711],[44359034848,44359087291],[44360880022,44360937199],[44362711097,44362806284],[44364523099,44364573021],[44366379835,44366429363]];
const h=b=>crypto.createHash("sha256").update(b).digest("hex"),wire=x=>Buffer.from(JSON.stringify(x));
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
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
    rval("TRAVNR_RELAY_ROLLING_ENABLED")!=="1"||rval("TRAVNR_RELAY_DIRECT_TICK_APPROVED")==="1"||
    rval("TRAVNR_RELAY_ROLLING_ROUTE")!=="DIRECT_VERIFY"||rval("TRAVNR_RELAY_ROLLING_SINCE_UTC")!==OLD_SINCE||
    Date.now()<Date.parse(OLD_UNTIL)||
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
 matchesPr(P,876,PB,PH);exactMain(R,RB);
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
 noActive(P,[PRIMARY,DIRECT,"phase6-rolling-controller-bounded-session.yml"]);noActive(R,[RELAY]);
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

function privateFile(f,digest){
 const q=fs.lstatSync(f);
 if(!q.isFile()||q.isSymbolicLink()||q.uid!==process.getuid()||(q.mode&0o777)!==0o600||q.nlink!==1||q.size<1||q.size>2*1024*1024)hold("PRIVATE_FILE_SCOPE");
 const raw=fs.readFileSync(f);
 if(digest&&h(raw)!==digest)hold("PRIVATE_FILE_DIGEST");
 return raw;
}
function scopedDir(d){
 const q=fs.lstatSync(d);
 if(!q.isDirectory()||q.isSymbolicLink()||q.uid!==process.getuid()||(q.mode&0o777)!==0o700)hold("PRIVATE_DIRECTORY_SCOPE");
}
function reviewedTree(treeSha){
 const t=api(P,"git/trees/"+treeSha+"?recursive=1");
 if(t.sha!==treeSha||t.truncated!==false||!Array.isArray(t.tree)||new Set(t.tree.map(x=>x.path)).size!==t.tree.length)hold("TREE_COMPLETENESS");
 return new Map(t.tree.filter(x=>x.type==="blob").map(x=>[x.path,x]));
}
function exactBlob(repo,id){
 const x=api(repo,"git/blobs/"+id);
 if(x.sha!==id||x.encoding!=="base64")hold("BLOB_IDENTITY");
 const b=Buffer.from(x.content.replace(/\s+/g,""),"base64");
 if(b.length!==x.size||gitBlob(b)!==id)hold("BLOB_HASH");
 return b;
}
function scope(p){return /^(?:server|scripts|migrations|tests|shared|client|patches|\.github\/(?:workflows|actions))\//.test(p)||/^(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|tsconfig(?:\.[\w-]+)?\.json|[\w-]+\.config\.[cm]?[jt]s|\.npmrc|\.nvmrc|\.node-version)$/.test(p)}
function prepareDelta(dir){
 const home=fs.realpathSync(os.homedir()),d=path.resolve(dir);
 if(path.dirname(path.dirname(d))!==home||!/^\.phase5-final-review-[A-Za-z0-9]+$/.test(path.basename(path.dirname(d)))||
    path.basename(d)!=="nov18-"+PB.slice(0,12)||fs.realpathSync(d)!==d)hold("CURRENT_PRIVATE_REVIEW_DIR");
 scopedDir(path.dirname(d));scopedDir(d);
 const manifest=JSON.parse(privateFile(path.join(d,"manifest-candidate.json"),MANIFEST)),inventory=JSON.parse(privateFile(path.join(d,"source-inventory.json"),INV));
 const config=privateFile(path.join(d,"config-candidate.json"),CONFIG),draft=JSON.parse(privateFile(path.join(d,"external-input-offline-review-NOT-STAGE.json"),DRAFT));
 const receipt=JSON.parse(privateFile(path.join(d,"receipt.json")));
 if(receipt.status!=="P5_NOV18_EXACT_MAIN_UNSIGNED_MANIFEST_DELTA_REBOUND_NO_GO"||receipt.main!==PB||receipt.tree!==PT||receipt.manifestCandidateSha256!==MANIFEST||
    manifest.sourceInventorySha256!==INV||manifest.configCandidateSha256!==CONFIG||manifest.scientificFreezeApproved!==false||
    manifest.finalPredecessorsApproved!==false||manifest.phase6PaidGo!==false||
    draft.phase6AuthorizationId!==null||draft.predecessorEvidenceIds!==null||draft.manifestSha256!==MANIFEST||draft.codeSha40!==PB||
    !Array.isArray(inventory)||inventory.length!==2188||new Set(inventory.map(x=>x.path)).size!==2188)hold("PREVIOUS_UNSIGNED_SCOPE");
 const timezone=privateFile(path.join(d,"airport-timezone-catalog-CANDIDATE.json"),CAT);
 if(timezone.length!==14722)hold("EXACT_TIMEZONE_BYTES");
 const timing=privateFile(path.join(d,"timing-input-offline-review.json"));
 const ti=JSON.parse(timing);
 if(ti.timingEvidenceSha256!==manifest.timingEvidenceCandidateSha256)hold("TIMING_SOURCE_IDENTITY");
 if(tree(P,PB)!==PT||tree(P,PH)!==HT)hold("EXACT_CANDIDATE_TREE");
 const old=reviewedTree(PT),next=reviewedTree(HT);
 const changed=[...new Set([...old.keys(),...next.keys()])].sort().filter(p=>old.get(p)?.sha!==next.get(p)?.sha||old.get(p)?.mode!==next.get(p)?.mode)
  .map(p=>[p,old.get(p)?.sha??null,next.get(p)?.sha??null]);
 if(JSON.stringify(changed)!==JSON.stringify(DELTA))hold("EXACT_THREE_PATHS_ONLY");
 const oldScope=[...old.keys()].filter(scope).sort(),newScope=[...next.keys()].filter(scope).sort();
 if(oldScope.length!==2188||JSON.stringify(oldScope)!==JSON.stringify(newScope)||
    inventory.some((x,i)=>x.path!==oldScope[i]||x.mode!==old.get(x.path).mode||!["100644","100755"].includes(x.mode)||!/^[a-f0-9]{64}$/.test(x.sha256??"")))hold("EXACT_INVENTORY_SCOPE");
 const index=JSON.parse(exactBlob(P,INDEX));
 if(index.dayPlanSha256s?.length!==31||!index.dayPlanSha256s.every((x,i)=>{
  const k="data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json";
  return x.runDayIndex===i+1&&old.get(k)?.sha===x.gitBlob&&next.get(k)?.sha===x.gitBlob&&next.get(k)?.size===x.byteCount;
 }))hold("UNCHANGED_31_PLANS");
 const newHashes=new Map(DELTA.map(([p,,b])=>[p,h(exactBlob(P,b))]));
 const nextInventory=inventory.map(x=>newHashes.has(x.path)?{...x,sha256:newHashes.get(x.path)}:x),invSha=h(wire(nextInventory));
 const nextManifest={...manifest,sourceInventorySha256:invSha,executableFileCount:2188},manifestSha=h(wire(nextManifest));
 if(invSha===INV||manifestSha===MANIFEST)hold("DELTA_NO_CHANGE");
 emit({status:"NEXT_UNSIGNED_MANIFEST_EXACT_THREE_FILE_DELTA_PREPARED_NO_GO",manifestCandidateSha256:manifestSha,sourceInventorySha256:invSha,modified:3,verifiedUnchangedDayPlans:31,priorTimezoneReused:true,phase6PaidGo:false});
 return {d,config,draft,timing,timezone,receipt,nextInventory,invSha,nextManifest,manifestSha};
}
function persistDelta(x,pin){
 const out=path.join(path.dirname(x.d),"nov18-cooldown-"+pin.slice(0,12));
 const draft={...x.draft,codeSha40:pin,manifestSha256:x.manifestSha};
 const receipt={...x.receipt,status:"P5_NOV18_COOLDOWN_EXACT_MAIN_UNSIGNED_MANIFEST_REBOUND_NO_GO",oldMain:PB,main:pin,tree:HT,
 previousManifestSha256:MANIFEST,manifestCandidateSha256:x.manifestSha,sourceInventorySha256:x.invSha,changedExistingFiles:3,addedFiles:0,
 externalReviewDraftSha256:h(wire(draft)),verifiedUnchangedDayPlans:31,timezoneSha256:CAT,phase6PaidGo:false};
 if(fs.existsSync(out))scopedDir(out);else fs.mkdirSync(out,{mode:0o700});
 const files={"manifest-candidate.json":wire(x.nextManifest),"source-inventory.json":wire(x.nextInventory),"config-candidate.json":x.config,
 "external-input-offline-review-NOT-STAGE.json":wire(draft),"timing-input-offline-review.json":x.timing,
 "airport-timezone-catalog-CANDIDATE.json":x.timezone,"receipt.json":wire(receipt)};
 for(const [n,b] of Object.entries(files)){
  const f=path.join(out,n);
  if(fs.existsSync(f)){if(!privateFile(f).equals(b))hold("PRIVATE_OUTPUT_CONFLICT");}
  else fs.writeFileSync(f,b,{flag:"wx",mode:0o600});
 }
 emit({...receipt,reviewDirectory:out});
}
function verifyOldRollingEpoch(){
 const range=encodeURIComponent(OLD_SINCE+".."+OLD_UNTIL);
 const relays=complete(api(R,"actions/workflows/"+RELAY+"/runs?branch=main&event=workflow_dispatch&per_page=100&created="+range),"workflow_runs").filter(r=>r.display_title==="TRAVNR EXTERNAL CLOCK ROLLING_ROOT");
 const targets=complete(api(P,"actions/workflows/"+DIRECT+"/runs?branch=main&event=workflow_dispatch&per_page=100&created="+encodeURIComponent(">="+OLD_SINCE)),"workflow_runs");
 if(relays.length!==12||targets.length!==12||PAIRS.some(([r,t])=>!relays.some(x=>x.id===r&&x.head_sha===RB&&x.status==="completed"&&x.conclusion==="success"&&x.run_attempt===1&&x.event==="workflow_dispatch")||
 !targets.some(x=>x.id===t&&x.head_sha===PB&&x.status==="completed"&&x.conclusion==="success"&&x.run_attempt===1&&x.display_title==="P6 DIRECT RECOVERY VERIFY")))hold("OLD_EPOCH_EXACT_MATCH");
 // Check all unsuccessful attempts since the old epoch, even after expiry.
 for(const c of ["failure","cancelled","timed_out","action_required","stale","neutral","skipped"]){
  const rows=complete(api(R,"actions/workflows/"+RELAY+"/runs?branch=main&event=workflow_dispatch&status="+c+"&per_page=100&created="+encodeURIComponent(">="+OLD_SINCE)),"workflow_runs");
  if(rows.some(x=>x.display_title==="TRAVNR EXTERNAL CLOCK ROLLING_ROOT"))hold("OLD_ROLLING_NEGATIVE_REVIEW");
 }
 emit({status:"EXACT_EXPIRED_VERIFY_EPOCH_RECONCILED",relayRuns:12,readOnlyTargets:12,noLaterTarget:true,priorAckIncidentPreserved:44343687014,paidAuthorityGranted:false});
}
async function execute(mode,dir){
 if(process.env.GITHUB_ACTIONS==="true"||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||mode!=="--deploy-exact-876"||!dir||process.argv.length!==4)hold("OWNER_LOCAL_MODE");
 waitCI(P,PH,CHECKS_P);exactMain(R,RB);
 const prepared=prepareDelta(dir);
 await awaitIdle(P,[PRIMARY,DIRECT,"phase6-rolling-controller-bounded-session.yml"],PB);
 await awaitIdle(R,[RELAY],RB);
 const old=preflight();verifyOldRollingEpoch();
 exactMain(P,PB);exactMain(R,RB);
 emit({status:"EXACT_TRANSITION_PREFLIGHT_PASSED_NO_PAID_CHANGE"});
 // Only the expired read-only rolling mode is disabled during the pin swap.
 // Native primary and external primary remain commissioned.
 set(R,"TRAVNR_RELAY_ROLLING_ENABLED","0",RB);
 await awaitIdle(R,[RELAY],RB);
 const prod=merge(P,876,PB,PH,CHECKS_P);
 set(P,PVAR,prod,prod);assertProduction(prod,old.endpoint);
 const v=primaryVerify(prod);
 exactMain(R,RB);
 set(R,"TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID",String(v.runId),RB);
 set(R,"TRAVNR_APPROVED_TARGET_MAIN_SHA",prod,RB);
 assertProduction(prod,old.endpoint);
 persistDelta(prepared,prod);
 const cfg=vars(R);
 if(cfg.get("TRAVNR_RELAY_MODE")!=="MULTI_LANE"||cfg.get("TRAVNR_RELAY_PRIMARY_ENABLED")!=="1"||
 cfg.get("TRAVNR_RELAY_PRIMARY_SINCE_UTC")!==iso(old.since)||cfg.get("TRAVNR_RELAY_ROLLING_ENABLED")!=="0"||
 cfg.get("TRAVNR_RELAY_DIRECT_TICK_APPROVED")==="1"||cfg.get("TRAVNR_RELAY_ROLLING_ROUTE")!=="DIRECT_VERIFY"||
 cfg.get("TRAVNR_CRON_RELAY_SHA")!==RB||cfg.get("TRAVNR_APPROVED_TARGET_MAIN_SHA")!==prod||
 cfg.get("TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID")!==String(v.runId))hold("RELAY_POST_TRANSITION_DRIFT");
 const since=iso(Date.now());
 set(R,"TRAVNR_RELAY_ROLLING_SINCE_UTC",since,RB);
 set(R,"TRAVNR_RELAY_ROLLING_ENABLED","1",RB);
 emit({status:"DIRECT_VERIFY_ONLY_NEW_EXACT_MAIN_EPOCH",productionMain:prod,relayMain:RB,activationUtc:since,
 expiresByUtc:iso(Date.parse(since)+120*60000),paidTickEnabled:false,providerCalls:0,phase6PaidGo:false});
 const proof=await observeExternalVerify(prod,RB,since);
 assertProduction(prod,old.endpoint);exactMain(R,RB);
 emit({status:"P5_COOLDOWN_DEPLOYED_PRIMARY_AND_EXTERNAL_VERIFY_EXACT_NO_GO",productionMain:prod,relayMain:RB,primaryVerifyRunId:v.runId,...proof,
 manifestCandidateSha256:prepared.manifestSha,releaseEvidenceNotInferred:true,calendarStaged:false,paidAuthorityGranted:false});
}
module.exports={verifyPrimaryReceipt,verifyNoPaidChanges,requireCI,complete,scope};
if(require.main===module)execute(process.argv[2],process.argv[3]).catch(e=>{console.error(/^HOLD_NOV18_DIRECT_TRANSITION_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_NOV18_DIRECT_TRANSITION_REDACTED_INSPECT_NO_REPLAY");process.exitCode=2;});
