#!/usr/bin/env node
"use strict";
// Final evidence-only main transition: reuse the deployed primary scheduler
// and external relay. Never merge a PR, stage an AUTH, change paid flags,
// access the provider, or request an APPLY. Existing review is prerequisite.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const P="HKcode22/ReplitTranvr",R="HKcode22/TravnrClockRelay";
const BASE="70580b3749544dfcbeff39da181b2aa42b1b4476",RELAY="b3a775b4ec7213af796bb8c727b69c3d0feb8bb7";
const LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const W="phase5-primary-fids-expiry-no-provider.yml",STEP="Verify exact main and execute only bounded primary FIDS expiry";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const C9=["liveOriginals","eligibleOriginals","hardDueOriginals","eligibleNextHour","hardDueNextHour","unboundLiveOriginals","markedExpiredPayloadPresent","unlinkedUnexpiredPopulation","unexpiredPopulationWithoutLiveOriginal"];
const need=(x,s)=>{if(!x)throw Error("HOLD_P5_FINAL_REPIN_"+s)},sha=b=>crypto.createHash("sha256").update(b).digest("hex"),id=n=>Number.isSafeInteger(n)&&n>0;
function classify(p,r,head,journal,now){
 need(C.test(head)&&head!==BASE&&Number.isFinite(now),"EXACT_FINAL_MAIN");
 need(p.P5_PRIMARY_FIDS_EXPIRY_ENABLED==="true"&&p.P5_PRIMARY_FIDS_EXPIRY_APPROVAL==="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER"&&p.P5_PRIMARY_FIDS_BACKSTOP_ENABLED==="true"&&p.P6_PRIVATE_EPOCH_EXPIRY_MODE==="COMMISSION_VERIFY_ONLY"&&p.P5_RETENTION_READONLY_MONITOR_ENABLED==="true"&&H.test(p.P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256??""),"EXISTING_PRIMARY_CONFIG");
 need(["P6_ROLLING_DIRECT_RECOVERY_ENABLED","P6_ROLLING_CONTROLLER_ENABLED","P6_ROLLING_SCHEDULED_ROOT_ENABLED","P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED","P6_ROLLING_WINDOW_CUSTODY_ENABLED"].every(k=>p[k]!=="1"),"COLLECTION_MUST_REMAIN_STOPPED");
 need(r.TRAVNR_RELAY_MODE==="MULTI_LANE"&&r.TRAVNR_RELAY_PRIMARY_ENABLED==="1"&&r.TRAVNR_RELAY_ROLLING_ROUTE==="DIRECT_VERIFY"&&r.TRAVNR_RELAY_DIRECT_TICK_APPROVED==="0"&&r.TRAVNR_CRON_RELAY_SHA===RELAY&&r.TRAVNR_TARGET_FORWARD_ENV_READY==="1","EXISTING_RELAY_CONFIG");
 const since=Date.parse(r.TRAVNR_RELAY_ROLLING_SINCE_UTC),primary=Date.parse(r.TRAVNR_RELAY_PRIMARY_SINCE_UTC);
 need(Number.isFinite(since)&&Number.isFinite(primary)&&since+7200000<=now&&primary<=now&&now-primary<60*86400000&&r.TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID&&/^[1-9]\d{0,14}$/.test(r.TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID),"EXPIRED_VERIFY_EPOCH_AND_EXISTING_BASELINE");
 need(Object.entries(p).every(([k,v])=>v!==BASE||k==="P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA")&&Object.entries(r).every(([k,v])=>v!==BASE||k==="TRAVNR_APPROVED_TARGET_MAIN_SHA"),"OTHER_OLD_MAIN_PIN_REVIEW");
 if(journal){
  need(journal.status==="FINAL_PRIMARY_AND_RELAY_REPIN_VERIFIED_NO_GO"&&journal.main===head&&id(journal.verifyRunId)&&p.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA===head&&r.TRAVNR_APPROVED_TARGET_MAIN_SHA===head&&r.TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID===String(journal.verifyRunId),"PARTIAL_OR_DRIFTED_JOURNAL_NO_REPLAY");
  return "ALREADY_COMPLETE";
 }
 need(p.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA===BASE&&r.TRAVNR_APPROVED_TARGET_MAIN_SHA===BASE,"NONINITIAL_PIN_STATE_INSPECT_NO_REPLAY");
 return "TRANSITION";
}
function verifyReceipt(run,jobs,log,head,runId,clock,apply=false){
 need(run?.id===runId&&run.head_sha===head&&run.path===".github/workflows/"+W&&run.head_branch==="main"&&run.event==="workflow_dispatch"&&run.run_attempt===1&&run.status==="completed"&&run.conclusion==="success"&&jobs?.total_count===1&&jobs.jobs?.length===1,"RUN_IDENTITY");
 const j=jobs.jobs[0];need(id(j.id)&&j.run_id===runId&&j.head_sha===head&&j.name==="primary-fids-expiry"&&j.run_attempt===1&&j.status==="completed"&&j.conclusion==="success"&&j.steps?.filter(s=>s.name===STEP&&s.status==="completed"&&s.conclusion==="success").length===1,"ACTUAL_STEP");
 const status=apply?"PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED":"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES";
 const rows=log.split(/\r?\n/).filter(l=>l.includes('{"status":"'+status+'"'));
 need(rows.length===1,"EXACT_RECEIPT");const q=JSON.parse(rows[0].slice(rows[0].indexOf('{"status":"')));
 const good=b=>b?.schema==="v39.phase5.primary-fids-expiry-status.v1"&&C9.every(k=>b[k]===0)&&b.deletionStopUnresolved===false&&b.providerCalls===0&&b.databaseWrites===0&&b.phase6PaidGo===false&&b.backupOrPitrVerified===false&&b.completeRetentionDeploymentVerified===false;
 const b=q.before,obs=Date.parse(b?.observedAtUtc),created=Date.parse(run.created_at),finished=Date.parse(j.completed_at);
 need(q.reviewedMainSha===head&&q.distinctDbActorsVerified===true&&q.privateCommissionState==="GRANTED"&&q.providerCalls===0&&q.objectDeletions===0&&q.phase6PaidGo===false&&q.backupOrPitrVerified===false&&q.completeRetentionDeploymentVerified===false&&good(b)&&(apply?good(q.after)&&q.databaseWritesPossible===false:q.databaseWrites===0)&&[obs,created,finished,clock].every(Number.isFinite)&&created<=obs&&obs<=finished+1000&&finished<=clock&&clock-obs<60*60000,"ZERO_WORK_RECEIPT_SCOPE");
 return {runId,jobId:j.id,observedAtUtc:b.observedAtUtc};
}
const cmd=(c,a,o={})=>execFileSync(c,a,{encoding:"utf8",timeout:30000,maxBuffer:24*1024*1024,stdio:["ignore","pipe","ignore"],...o}).trim();
const gh=(a,o={})=>cmd("gh",a,o),api=(r,p)=>JSON.parse(gh(["api","--method","GET","repos/"+r+"/"+p]));
const main=r=>api(r,"git/ref/heads/main").object.sha,git=a=>cmd("git",a);
const vars=r=>{const pages=JSON.parse(gh(["api","--paginate","--slurp","repos/"+r+"/actions/variables?per_page=100"]));need(Array.isArray(pages)&&pages.length>0&&pages.length<=10&&pages.every(x=>Array.isArray(x.variables)&&x.total_count===pages[0].total_count),"VARIABLE_PAGES");const rows=pages.flatMap(x=>x.variables);need(rows.length===pages[0].total_count&&new Set(rows.map(x=>x.name)).size===rows.length,"VARIABLE_ROWS");return Object.fromEntries(rows.map(x=>[x.name,x.value]))};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function receipt(runId,head,apply=false){
 const run=api(P,"actions/runs/"+runId),jobs=api(P,"actions/runs/"+runId+"/jobs?filter=latest&per_page=100");
 need(jobs.total_count===1&&id(jobs.jobs?.[0]?.id),"EXACT_JOB");
 return verifyReceipt(run,jobs,gh(["run","view",String(runId),"-R",P,"--job",String(jobs.jobs[0].id),"--log"]),head,runId,Date.now(),apply);
}
function safeDir(d){const s=fs.lstatSync(d);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIR");return fs.realpathSync(d)}
function read(d,n){const f=path.join(d,n),s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0&&s.nlink===1&&s.size>0&&s.size<1000000,"PRIVATE_FILE");return fs.readFileSync(f)}
function approved(dir,head){
 const raw=read(dir,"approved-auth.json"),a=JSON.parse(raw),l=JSON.parse(git(["show",head+":"+LEDGER]));
 need(l.schema==="v39.phase6.source-enable-approval-ledger.v1"&&Array.isArray(l.approvals)&&l.approvals.some(x=>x.authorizationId===a.authorizationId&&x.artifactSha256===sha(raw)&&JSON.stringify(x.predecessorEvidenceIds)===JSON.stringify(a.predecessorEvidenceIds)),"EXISTING_APPROVED_ADOPTED_AUTH");
 need(Date.parse(a.startNotBeforeUtc)<=Date.now()&&Date.now()<Date.parse(a.expiresAtUtc)&&Date.now()<Date.parse(a.releaseActivation?.accountEvidenceValidUntilUtc),"CURRENT_AUTH");
 return sha(raw);
}
async function run(){
 const [arg,head]=process.argv.slice(2);
 need(process.argv.length===4&&process.env.GITHUB_ACTIONS!=="true"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL"].every(k=>!process.env[k]),"NO_PROVIDER_OR_OWNER_DB");
 need(C.test(head)&&head!==BASE&&git(["rev-parse","HEAD"])===head&&git(["status","--porcelain","--untracked-files=no"])==="","CLEAN_FINAL_CHECKOUT");
 const stable=()=>need(main(P)===head&&main(R)===RELAY,"MAIN_DRIFT");
 stable();git(["merge-base","--is-ancestor",BASE,head]);
 const delta=git(["diff","--name-status","--no-renames",BASE,head]).split("\n").filter(Boolean);
 need(delta.length>0&&delta.length<128&&delta.every(s=>/^[AM]\t(?:data-collection\/evidence\/ledgers\/V3\.9_PHASE6_SOURCE_ENABLE_APPROVALS\.json|data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(json|md))$/.test(s)),"EVIDENCE_ONLY_FINAL_MAIN");
 const d=safeDir(path.resolve(arg));need(!d.startsWith(fs.realpathSync(process.cwd())+path.sep)&&d!==fs.realpathSync(process.cwd()),"PRIVATE_OUTSIDE_CHECKOUT");
 const authSha=approved(d,head),file="final-primary-relay-repin-"+head.slice(0,12)+".jsonl",out=path.join(d,file);
 let journal=null;if(fs.existsSync(out)){const rows=read(d,file).toString("utf8").trim().split("\n").map(JSON.parse);journal=rows.at(-1);need(journal.authSha===authSha,"JOURNAL_AUTH_DRIFT")}
 const p=vars(P),r=vars(R),mode=classify(p,r,head,journal,Date.now());
 if(mode==="ALREADY_COMPLETE"){console.log(JSON.stringify({status:"EXISTING_FINAL_SCHEDULER_REPIN_RECEIPT_MATCHES_NO_REPLAY",main:head,verifyRunId:journal.verifyRunId,phase6PaidGo:false}));return}
 // Existing previous exact primary child must have completed successfully.
 const recent=api(P,"actions/workflows/"+W+"/runs?branch=main&event=workflow_dispatch&per_page=20"),prior=recent.workflow_runs?.find(x=>x.head_sha===BASE&&x.display_title==="P5 PRIMARY BACKSTOP CHILD");
 need(id(prior?.id),"EXISTING_PRIMARY_BASELINE");receipt(prior.id,BASE,true);
 const active=()=>{for(const [repo,wfs] of [[P,[W,"phase6-direct-recovery-tick.yml","phase6-rolling-controller-bounded-session.yml"]],[R,["external-clock.yml"]]])for(const w of wfs)for(const s of ["queued","in_progress","waiting","requested","pending"]){const x=api(repo,"actions/workflows/"+w+"/runs?branch=main&status="+s+"&per_page=1");need(Number.isSafeInteger(x.total_count)&&x.total_count>=0,"ACTIVE_METADATA");if(x.total_count)return true}return false};
 const until=Date.now()+180000;
 while(active()){stable();need(Date.now()<until,"ACTIVE_WORKFLOW_REVIEW");await sleep(5000)}
 stable();need(JSON.stringify(vars(P))===JSON.stringify(p)&&JSON.stringify(vars(R))===JSON.stringify(r),"VARIABLES_CHANGED_REVIEW");
 const fd=fs.openSync(out,"wx",0o600),emit=x=>{fs.writeSync(fd,JSON.stringify({main:head,authSha,...x})+"\n");fs.fsyncSync(fd);console.log(JSON.stringify({main:head,...x,phase6PaidGo:false}))};
 try{
  emit({status:"FINAL_PIN_TRANSITION_STARTED_NO_REPLAY"});
  const set=(repo,name,value)=>{stable();emit({status:"VARIABLE_WRITE_ATTEMPT",repo,name});gh(["variable","set",name,"-R",repo,"--body",value]);need(gh(["variable","get",name,"-R",repo])===value,"VARIABLE_READBACK");emit({status:"VARIABLE_READBACK",repo,name});stable()};
  set(P,"P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA",head);
  emit({status:"EXACT_NEW_MAIN_VERIFY_DISPATCH_ATTEMPT_NO_REPLAY"});
  const a=JSON.parse(gh(["api","--method","POST","-H","X-GitHub-Api-Version: 2026-03-10","repos/"+P+"/actions/workflows/"+W+"/dispatches","--input","-"],{input:JSON.stringify({ref:"main",inputs:{confirm:"VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES",approved_main_sha:head}}),stdio:["pipe","pipe","ignore"]}));
  need(id(a.workflow_run_id)&&a.run_url==="https://api.github.com/repos/"+P+"/actions/runs/"+a.workflow_run_id&&a.html_url==="https://github.com/"+P+"/actions/runs/"+a.workflow_run_id,"UNKNOWN_DISPATCH_NO_REPLAY");
  emit({status:"EXACT_VERIFY_ACK",runId:a.workflow_run_id});
  gh(["run","watch",String(a.workflow_run_id),"-R",P,"--interval","10","--exit-status"],{timeout:720000});
  const proof=receipt(a.workflow_run_id,head);emit({status:"ACTUAL_NEW_MAIN_VERIFY_RECEIPT",...proof});
  // Update the baseline ID first: old target remains fail-closed on main
  // mismatch while the relay reads its existing settings.
  set(R,"TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID",String(proof.runId));
  set(R,"TRAVNR_APPROVED_TARGET_MAIN_SHA",head);
  const finalP=vars(P),finalR=vars(R);
  need(Object.keys(p).length===Object.keys(finalP).length&&Object.keys(r).length===Object.keys(finalR).length&&Object.entries(p).every(([k,v])=>finalP[k]===(k==="P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA"?head:v))&&Object.entries(r).every(([k,v])=>finalR[k]===(k==="TRAVNR_APPROVED_TARGET_MAIN_SHA"?head:k==="TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID"?String(proof.runId):v)),"UNEXPECTED_CONFIG_CHANGE");
  stable();emit({status:"FINAL_PRIMARY_AND_RELAY_REPIN_VERIFIED_NO_GO",verifyRunId:proof.runId,verifyJobId:proof.jobId,providerCalls:0,paidAuthorityGranted:false,actualNextBackupChildNotYetObserved:true,macReadOnlyMonitorRepinStillRequired:true});
 }finally{fs.closeSync(fd)}
}
module.exports={classify,verifyReceipt,BASE,RELAY,C9};
if(require.main===module)run().catch(e=>{console.error(/^HOLD_P5_FINAL_REPIN_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5_FINAL_REPIN_UNKNOWN_INSPECT_JOURNAL_NO_REPLAY");process.exitCode=2});
