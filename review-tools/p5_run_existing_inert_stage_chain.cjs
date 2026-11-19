#!/usr/bin/env node
"use strict";
// Reuses the existing protected NO PROVIDER workflow twice, with one exact
// returned dispatch run ID and fresh independent DB readback between stages.
// Does not create approvals, install secrets, authorize SOURCE, or call ADB.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr",WF="phase5-exact-inert-release-stage-manual.yml",C=/^[a-f0-9]{40}$/,H=/^[a-f0-9]{64}$/;
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P5_STAGE_CHAIN_"+s)},need=(x,s)=>{if(!x)hold(s)};
function verifyRun(x,id,workflowId,main){
 const need=(x,s)=>{if(!x)throw Error("HOLD_P5_STAGE_CHAIN_"+s)};
 need(x?.id===id&&x.workflow_id===workflowId&&x.head_sha===main&&x.head_branch==="main"&&x.event==="workflow_dispatch"&&x.run_attempt===1&&x.path===".github/workflows/phase5-exact-inert-release-stage-manual.yml","RUN_IDENTITY");
 need(x.status==="completed"&&x.conclusion==="success","STAGE_RUN_NOT_SUCCESSFUL");
}
function verifyReadback(x,mode,main,review){
 const need=(x,s)=>{if(!x)throw Error("HOLD_P5_STAGE_CHAIN_"+s)};
 const names={calendar:"INDEPENDENT_EXACT_B0062_CALENDAR_ONLY_READONLY_MATCH_NO_GO",cost:"INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO"};
 need(x?.status===names[mode]&&x.codeSha===main&&x.independentOwnerReadback===true&&x.authorizationEnabled===false&&x.providerCalls===0&&x.databaseWrites===0&&x.phase6PaidGo===false&&x.phase5ScientificFreeze===false&&x.verifiedReadOnly===true&&x.database==="neondb","INDEPENDENT_READBACK_REQUIRED");
 need(review&&x.manifestSha256===review.manifestSha256&&x.calendarSha256===review.calendarSha256&&x.exactReviewedStagePacketSha256===review.stageSha256&&x.calendarRows===31&&x.pairedAirportDays===10&&x.ordinaryAirportDaysUnselected===21&&x.restPhysicalChargeDates===38&&x.sourceQueriesAndPhysicalAttemptsZero===true&&x.alertSafetyValuesExact===true,"EXACT_CALENDAR_STAGE_SCOPE");
 if(mode==="calendar")need(x.costStageCommitted===false&&x.categoryCycleCaps===0&&x.categoryUtcBudgetRows===0,"CALENDAR_ONLY_NO_COST_STAGE");
 else need(x.exactReviewedCostEnvelopeSha256===review.costEnvelopeSha256&&x.categoryCycleCaps===7&&x.categoryUtcBudgetRows===266,"EXACT_SEVEN_CATEGORY_COST_STAGE");
}
function runSequence(ops){
 const calendarId=ops.dispatch("calendar");
 ops.awaitSuccess(calendarId,"calendar");
 ops.readback("calendar",calendarId);
 const costId=ops.dispatch("cost");
 ops.awaitSuccess(costId,"cost");
 ops.readback("cost",costId);
 return {calendarId,costId};
}
const confirms={calendar:"STAGE_EXACT_31_DAY_CALENDAR_DISABLED_AUTH_NO_PROVIDER",cost:"STAGE_EXACT_SEVEN_COST_UPPER_BOUNDS_DISABLED_AUTH_NO_PROVIDER"};
function file(dir,n,max){const f=path.join(dir,n),s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");return {f,b:fs.readFileSync(f)}}
function run(){
 const [dirArg,receiptSha]=process.argv.slice(2);
 need(process.argv.length===4&&H.test(receiptSha??"")&&process.env.GITHUB_ACTIONS!=="true"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&typeof process.env.DATABASE_URL==="string","OWNER_EXPLICIT_STOP_SCOPE");
 const d=fs.realpathSync(dirArg),ds=fs.lstatSync(dirArg);
 need(ds.isDirectory()&&!ds.isSymbolicLink()&&ds.uid===process.getuid()&&(ds.mode&0o077)===0,"PRIVATE_DIRECTORY");
 const rec=file(d,"bundle-receipt.json",200000),stage=file(d,"exact-approved-stage-input.json",48000),journal=file(d,"static-install-attempt.jsonl",200000);
 const r=JSON.parse(rec.b),st=JSON.parse(stage.b);
 need(sha(rec.b)===receiptSha&&r.schema==="v39.phase5.exact-final-commissioning-bundle.v1"&&r.status==="EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH"&&r.phase6PaidGo===false&&C.test(r.main??"")&&H.test(r.stageSha256??"")&&H.test(r.costEnvelopeSha256??"")&&sha(stage.b)===r.stageSha256&&Buffer.from(JSON.stringify(st)).equals(stage.b)&&st.codeSha40===r.main&&st.manifestSha256===r.manifestSha256&&st.phase6AuthorizationId===r.authorizationId,"EXACT_APPROVED_BUNDLE");
 const entries=journal.b.toString("utf8").trim().split("\n").map(l=>JSON.parse(l)),first=entries[0],last=entries.at(-1);
 need(first.main===r.main&&first.receiptSha===receiptSha&&first.phase6PaidGo===false&&last.status==="EXACT_STATIC_SECRETS_INSTALLED_METADATA_ONLY_NO_GO"&&last.installed===r.staticSecretsPrepared&&entries.filter(x=>x.status==="METADATA_READBACK").length===r.staticSecretsPrepared,"COMPLETED_STATIC_INSTALL_JOURNAL");
 const env={...process.env,GH_PROMPT_DISABLED:"1"};
 for(const k of ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL","V39_DATABASE_RUNTIME_URL","NODE_OPTIONS"])delete env[k];
 const call=(c,a,options={})=>execFileSync(c,a,{encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024,stdio:["ignore","pipe","ignore"],env,...options}).trim();
 const gh=(a,options={})=>call("gh",a,options),api=(p)=>JSON.parse(gh(["api","repos/"+REPO+"/"+p]));
 const remote=()=>api("git/ref/heads/main").object.sha;
 const root=fs.realpathSync(call("git",["rev-parse","--show-toplevel"]));
 const checkMain=()=>need(remote()===r.main&&call("git",["rev-parse","HEAD"])===r.main&&call("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_MAIN");
 need(fs.realpathSync(process.cwd())===root&&d!==root&&!d.startsWith(root+path.sep),"PRIVATE_OUTSIDE_EXACT_CHECKOUT");
 checkMain();
 const w=api("actions/workflows/"+WF);need(Number.isSafeInteger(w.id)&&w.state==="active"&&w.path===".github/workflows/"+WF,"EXISTING_WORKFLOW");
 const secretMeta=JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"]));
 const m=new Map(secretMeta.map(x=>[x.name,x.updatedAt]));
 need(entries.filter(x=>x.status==="METADATA_READBACK").every(x=>m.get(x.name)===x.updatedAt),"INSTALLED_SECRET_METADATA_CHANGED");
 need(["V39_PHASE6_PROCESS_ARMED","P6_INERT_CALENDAR_REVIEW_APPROVED","P6_INERT_COST_REVIEW_APPROVED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL","P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL"].every(n=>m.has(n)),"ACTUAL_EXISTING_REVIEW_AND_RESTRICTED_SECRETS_REQUIRED");
 // No guessing the result of a past dispatch. Initial two-stage chain only.
 // A previous attempt at this main must be reconciled with the existing
 // independent readback before any new mutation. Never retry from this tool.
 const prior=api("actions/workflows/"+w.id+"/runs?event=workflow_dispatch&head_sha="+r.main+"&per_page=100");
 need(prior.total_count===0&&Array.isArray(prior.workflow_runs)&&prior.workflow_runs.length===0,"PRIOR_STAGE_ATTEMPT_RECONCILIATION_REQUIRED");
 const fd=fs.openSync(path.join(d,"inert-stage-chain-attempt.jsonl"),"wx",0o600);
 const emit=x=>{fs.writeSync(fd,JSON.stringify(x)+"\n");fs.fsyncSync(fd)};
 const readEnv={...env,DATABASE_URL:process.env.DATABASE_URL,V39_P5_APPROVED_CODE_SHA:r.main,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
 try{
  emit({status:"CHAIN_STARTED",main:r.main,receiptSha,providerCalls:0,phase6PaidGo:false});
  const out=runSequence({
   dispatch(mode){
    checkMain();emit({mode,status:"DISPATCH_ATTEMPTED_NO_REPLAY"});
    // GitHub REST API version 2026-03-10 returns workflow_run_id, rather
    // than the earlier ambiguous 204. No polling a guessed latest run.
    const x=JSON.parse(gh(["api","--method","POST","-H","X-GitHub-Api-Version: 2026-03-10","repos/"+REPO+"/actions/workflows/"+w.id+"/dispatches","--input","-"],{input:JSON.stringify({ref:"main",inputs:{stage:mode,confirm:confirms[mode]}}),stdio:["pipe","pipe","ignore"]}));
    const id=x.workflow_run_id;
    need(Number.isSafeInteger(id)&&id>0&&x.run_url==="https://api.github.com/repos/"+REPO+"/actions/runs/"+id&&x.html_url==="https://github.com/"+REPO+"/actions/runs/"+id,"DISPATCH_RESPONSE_UNKNOWN_NO_REPLAY");
    emit({mode,status:"DISPATCH_EXACT_RUN_ID",runId:id});return id;
   },
   awaitSuccess(id,mode){
    // Any CLI failure or timeout leaves journal for read-only recovery.
    gh(["run","watch",String(id),"-R",REPO,"--exit-status","--interval","10"],{timeout:15*60*1000,maxBuffer:12*1024*1024});
    verifyRun(api("actions/runs/"+id),id,w.id,r.main);checkMain();
    emit({mode,status:"EXACT_RUN_SUCCESS",runId:id});
   },
   readback(mode,id){
    const args=mode==="calendar"?["--readback-calendar",stage.f,r.stageSha256]:["--readback",stage.f,r.stageSha256,r.costEnvelopeSha256];
    const x=JSON.parse(call(process.execPath,["scripts/v39_phase6_inert_release_stage_manual_v39.mjs",...args],{env:readEnv,timeout:120000}));
    verifyReadback(x,mode,r.main,r);checkMain();
    emit({mode,status:"INDEPENDENT_READBACK_MATCH",runId:id,receipt:x});
   }
  });
  emit({status:"BOTH_EXISTING_INERT_STAGES_EXACT_READBACK_NO_GO",...out,authorizationEnabled:false,phase6PaidGo:false});
  console.log(JSON.stringify({status:"BOTH_EXISTING_INERT_STAGES_EXACT_READBACK_NO_GO",main:r.main,...out,authorizationEnabled:false,providerCalls:0,phase6PaidGo:false}));
 }finally{fs.closeSync(fd)}
}
module.exports={verifyRun,verifyReadback,runSequence};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_STAGE_CHAIN_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_STAGE_CHAIN_UNKNOWN_RESULT_READBACK_ONLY_NO_REPLAY");process.exitCode=2}
