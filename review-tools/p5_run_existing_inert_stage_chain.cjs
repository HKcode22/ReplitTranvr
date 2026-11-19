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
// Compare only exact metadata of the existing reviewed commissioning secrets.
 // Name/timestamp continuity is not a plaintext readback or independent approval.
function captureSecretMetadata(rows,names){
 need(Array.isArray(rows)&&Array.isArray(names)&&names.length>0&&new Set(names).size===names.length,"SECRET_METADATA_SCOPE");
 const wanted=new Set(names),out=new Map();
 for(const row of rows){
  if(!wanted.has(row?.name))continue;
  need(!out.has(row.name)&&typeof row.updatedAt==="string"&&Number.isFinite(Date.parse(row.updatedAt)),"SECRET_METADATA_DUPLICATE_OR_INVALID");
  out.set(row.name,row.updatedAt);
 }
 need(out.size===wanted.size,"SECRET_METADATA_MISSING");
 return out;
}
function verifySecretMetadata(rows,expected){
 const actual=captureSecretMetadata(rows,[...expected.keys()]);
 need([...expected].every(([name,updatedAt])=>actual.get(name)===updatedAt),"REVIEWED_SECRET_METADATA_DRIFT_NO_REPLAY");
}
function metadataDigest(m){return sha(JSON.stringify([...m].sort(([a],[b])=>a.localeCompare(b))))}
function acknowledgedCalendar(entries,r,receiptSha,currentMetadataSha){
 need(Array.isArray(entries)&&entries.length===5,"ACKNOWLEDGED_CALENDAR_JOURNAL_ONLY");
 const [a,b,c,d,e]=entries;
 need(a?.status==="CHAIN_STARTED"&&a.main===r.main&&a.receiptSha===receiptSha&&a.providerCalls===0&&a.phase6PaidGo===false&&H.test(currentMetadataSha??"")&&a.secretMetadataSha256===currentMetadataSha,"EXACT_INITIAL_METADATA_BINDING");
 need(b?.mode==="calendar"&&b.status==="DISPATCH_ATTEMPTED_NO_REPLAY"&&c?.mode==="calendar"&&c.status==="DISPATCH_EXACT_RUN_ID"&&Number.isSafeInteger(c.runId)&&c.runId>0&&d?.mode==="calendar"&&d.status==="EXACT_RUN_SUCCESS"&&d.runId===c.runId&&e?.mode==="calendar"&&e.status==="INDEPENDENT_READBACK_MATCH"&&e.runId===c.runId,"EXACT_ACKNOWLEDGED_CALENDAR");
 verifyReadback(e.receipt,"calendar",r.main,r);
 need(typeof e.receipt.snapshotAtUtc==="string"&&Number.isFinite(Date.parse(e.receipt.snapshotAtUtc))&&new Date(e.receipt.snapshotAtUtc).toISOString()===e.receipt.snapshotAtUtc,"EXACT_PRIOR_READBACK_CLOCK");
 return {runId:c.runId,receipt:e.receipt};
}
function runSequence(ops,acknowledgedCalendarId=null){
 const calendarId=acknowledgedCalendarId===null?ops.dispatch("calendar"):acknowledgedCalendarId;
 if(acknowledgedCalendarId===null){ops.awaitSuccess(calendarId,"calendar");ops.readback("calendar",calendarId);}
 const costId=ops.dispatch("cost");
 ops.awaitSuccess(costId,"cost");
 ops.readback("cost",costId);
 return {calendarId,costId};
}
const confirms={calendar:"STAGE_EXACT_31_DAY_CALENDAR_DISABLED_AUTH_NO_PROVIDER",cost:"STAGE_EXACT_SEVEN_COST_UPPER_BOUNDS_DISABLED_AUTH_NO_PROVIDER"};
function file(dir,n,max){const f=path.join(dir,n),s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");return {f,b:fs.readFileSync(f)}}

function validateManifestStorageReceipt(r,m){
 need(m?.status==="EXACT_APPROVED_MANIFEST_STORED_AND_FRESH_READBACK_NO_GO"&&m.manifestSha256===r.manifestSha256&&m.authSha256===r.authArtifactSha256&&[0,1].includes(m.manifestRowsWritten)&&m.databaseWrites===m.manifestRowsWritten&&m.independentReadOnlyBytesMatch===true&&m.providerCalls===0&&m.authorizationEnabled===false&&m.phase6PaidGo===false,"EXACT_MANIFEST_STORAGE_RECEIPT_REQUIRED");
}
function prepareFreezeWorkpaper(r,receiptSha,m,manifestReceiptSha,entries,journalSha){
 need(r?.schema==="v39.phase5.exact-final-commissioning-bundle.v1"&&r.status==="EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH"&&r.phase6PaidGo===false&&C.test(r.main??"")&&[receiptSha,manifestReceiptSha,journalSha,r.manifestSha256,r.configSha256,r.calendarSha256,r.authArtifactSha256,r.stageSha256,r.costEnvelopeSha256,r.approvedPrivatePolicyReviewSha256,r.policyBundleSha256].every(x=>H.test(x??""))&&/^AUTH-\d{8}-[A-Z0-9]+$/.test(r.authorizationId??"")&&r.staticSecretsPrepared===31,"EXACT_FREEZE_REVIEW_BUNDLE");
 validateManifestStorageReceipt(r,m);
 need(Array.isArray(entries)&&entries.length===10,"EXACT_COMPLETED_TWO_STAGE_JOURNAL");
 const first=entries[0],last=entries[9];
 need(first?.status==="CHAIN_STARTED"&&first.main===r.main&&first.receiptSha===receiptSha&&first.providerCalls===0&&first.phase6PaidGo===false&&last?.status==="BOTH_EXISTING_INERT_STAGES_EXACT_READBACK_NO_GO"&&last.authorizationEnabled===false&&last.phase6PaidGo===false,"EXACT_COMPLETED_STAGE_CHAIN");
 const take=(mode,start)=>{
  const [a,b,c,d]=entries.slice(start,start+4);
  need(a?.mode===mode&&a.status==="DISPATCH_ATTEMPTED_NO_REPLAY"&&b?.mode===mode&&b.status==="DISPATCH_EXACT_RUN_ID"&&Number.isSafeInteger(b.runId)&&b.runId>0&&c?.mode===mode&&c.status==="EXACT_RUN_SUCCESS"&&c.runId===b.runId&&d?.mode===mode&&d.status==="INDEPENDENT_READBACK_MATCH"&&d.runId===b.runId,"EXACT_STAGE_RUN_JOURNAL_ORDER");
  verifyReadback(d.receipt,mode,r.main,r);
  need(typeof d.receipt.snapshotAtUtc==="string"&&Number.isFinite(Date.parse(d.receipt.snapshotAtUtc))&&new Date(d.receipt.snapshotAtUtc).toISOString()===d.receipt.snapshotAtUtc,"EXACT_READBACK_CLOCK");
  return {runId:b.runId,receipt:d.receipt};
 };
 const calendar=take("calendar",1),cost=take("cost",5);
 need(calendar.runId!==cost.runId&&last.calendarId===calendar.runId&&last.costId===cost.runId&&Date.parse(calendar.receipt.snapshotAtUtc)<=Date.parse(cost.receipt.snapshotAtUtc),"EXACT_DISTINCT_ORDERED_READBACKS");
 return {schema:"v39.phase5.final-freeze-review-workpaper.v1",status:"EXACT_COMMISSIONING_EVIDENCE_WORKPAPER_NOT_FREEZE_NO_GO",reviewedMainSha:r.main,authorizationId:r.authorizationId,authArtifactSha256:r.authArtifactSha256,manifestSha256:r.manifestSha256,configSha256:r.configSha256,calendarSha256:r.calendarSha256,stageSha256:r.stageSha256,costEnvelopeSha256:r.costEnvelopeSha256,approvedPrivatePolicyReviewSha256:r.approvedPrivatePolicyReviewSha256,policyBundleSha256:r.policyBundleSha256,bundleReceiptSha256:receiptSha,manifestStorageReceiptSha256:manifestReceiptSha,stageChainJournalSha256:journalSha,manifestStorageReceipt:m,calendar,cost,evidenceScope:"EXISTING_ACKNOWLEDGED_COMMISSIONING_RECEIPTS_ONLY_NOT_FRESH_RECHECK",independentHumanFreezeDecisionAuthenticated:false,phase5FreezeApproved:false,reviewedBy:null,reviewedAtUtc:null,authorizationEnabled:false,phase6PaidGo:false,providerCalls:0,databaseWrites:0};
}
function writeFreezeWorkpaper(dir,receiptSha){
 need(H.test(receiptSha??""),"EXACT_FREEZE_BUNDLE_HASH");
 const d=fs.realpathSync(dir),ds=fs.lstatSync(dir);
 need(ds.isDirectory()&&!ds.isSymbolicLink()&&ds.uid===process.getuid()&&(ds.mode&0o077)===0,"PRIVATE_DIRECTORY");
 const rec=file(d,"bundle-receipt.json",200000),m=file(d,"manifest-storage-receipt.json",100000),j=file(d,"inert-stage-chain-attempt.jsonl",1000000);
 need(sha(rec.b)===receiptSha,"EXACT_FREEZE_BUNDLE_HASH");
 const w=prepareFreezeWorkpaper(JSON.parse(rec.b),receiptSha,JSON.parse(m.b),sha(m.b),j.b.toString("utf8").trim().split("\n").map(l=>JSON.parse(l)),sha(j.b));
 const raw=Buffer.from(JSON.stringify(w)),name="final-freeze-review-workpaper-NOT-APPROVED.json",dest=path.join(d,name);
 try{fs.writeFileSync(dest,raw,{flag:"wx",mode:0o600})}catch(e){if(e.code!=="EEXIST")throw e;need(file(d,name,1000000).b.equals(raw),"EXISTING_FREEZE_WORKPAPER_DIFFERS_NO_OVERWRITE")}
 return {status:w.status,main:w.reviewedMainSha,workpaperSha256:sha(raw),calendarRunId:w.calendar.runId,costRunId:w.cost.runId,independentFreezeApproved:false,authorizationEnabled:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}

function run(){
 const [dirArg,receiptSha,resumeMode]=process.argv.slice(2);
 const resume=resumeMode==="--resume-acknowledged-calendar";
 need((process.argv.length===4||process.argv.length===5&&resume)&&H.test(receiptSha??"")&&process.env.GITHUB_ACTIONS!=="true"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&typeof process.env.DATABASE_URL==="string","OWNER_EXPLICIT_STOP_SCOPE");
 const d=fs.realpathSync(dirArg),ds=fs.lstatSync(dirArg);
 need(ds.isDirectory()&&!ds.isSymbolicLink()&&ds.uid===process.getuid()&&(ds.mode&0o077)===0,"PRIVATE_DIRECTORY");
 const rec=file(d,"bundle-receipt.json",200000),stage=file(d,"exact-approved-stage-input.json",48000),journal=file(d,"static-install-attempt.jsonl",200000);
 const r=JSON.parse(rec.b),st=JSON.parse(stage.b);
 need(sha(rec.b)===receiptSha&&r.schema==="v39.phase5.exact-final-commissioning-bundle.v1"&&r.status==="EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH"&&r.phase6PaidGo===false&&C.test(r.main??"")&&H.test(r.stageSha256??"")&&H.test(r.costEnvelopeSha256??"")&&sha(stage.b)===r.stageSha256&&Buffer.from(JSON.stringify(st)).equals(stage.b)&&st.codeSha40===r.main&&st.manifestSha256===r.manifestSha256&&st.phase6AuthorizationId===r.authorizationId,"EXACT_APPROVED_BUNDLE");
 validateManifestStorageReceipt(r,JSON.parse(file(d,"manifest-storage-receipt.json",100000).b));
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
 const secretMeta=()=>JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"]));
 const installed=entries.filter(x=>x.status==="METADATA_READBACK");
 need(new Set(installed.map(x=>x.name)).size===r.staticSecretsPrepared,"INSTALLED_SECRET_JOURNAL_DUPLICATE");
 const stageNames=["V39_PHASE6_PROCESS_ARMED","P6_INERT_CALENDAR_REVIEW_APPROVED","P6_INERT_COST_REVIEW_APPROVED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL","P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL"];
 const initial=captureSecretMetadata(secretMeta(),[...new Set([...installed.map(x=>x.name),...stageNames])]);
 need(installed.every(x=>initial.get(x.name)===x.updatedAt),"INSTALLED_SECRET_METADATA_CHANGED");
 // If the consolidated owner runner installed the three reviewed inert flags,
 // ensure the actual completed installation receipt still matches at entry.
 const approvalsPath=path.join(d,"inert-approval-install-attempt.jsonl");
 if(fs.existsSync(approvalsPath)){
  const a=file(d,"inert-approval-install-attempt.jsonl",100000).b.toString("utf8").trim().split("\n").map(l=>JSON.parse(l));
  const flags=stageNames.slice(1,4),readbacks=a.filter(x=>x.status==="METADATA_READBACK");
  need(a[0]?.main===r.main&&a[0]?.receiptSha256===receiptSha&&a[0]?.status==="EXACT_REVIEWED_INERT_APPROVAL_INSTALL_STARTED_NO_GO"&&a.at(-1)?.status==="THREE_EXACT_REVIEWED_INERT_APPROVAL_FLAGS_INSTALLED_NO_GO"&&readbacks.length===flags.length&&new Set(readbacks.map(x=>x.name)).size===flags.length&&readbacks.every(x=>flags.includes(x.name)&&initial.get(x.name)===x.updatedAt),"INERT_APPROVAL_INSTALL_JOURNAL_DRIFT_NO_REPLAY");
 }
 const checkMetadata=()=>verifySecretMetadata(secretMeta(),initial);
 // No guessing the result of a past dispatch. Initial two-stage chain only.
 // A previous attempt at this main must be reconciled with the existing
 // independent readback before any new mutation. Never retry from this tool.
 const priorRuns=()=>api("actions/workflows/"+w.id+"/runs?event=workflow_dispatch&head_sha="+r.main+"&per_page=100");
 const noExtraStageRuns=expected=>{
  const p=priorRuns();
  need(p.total_count===(expected===null?0:1)&&Array.isArray(p.workflow_runs)&&p.workflow_runs.length===p.total_count&&(expected===null||p.workflow_runs[0].id===expected),"PRIOR_STAGE_ATTEMPT_RECONCILIATION_REQUIRED");
 };
 const currentMetadataSha=metadataDigest(initial),readEnv={...env,DATABASE_URL:process.env.DATABASE_URL,V39_P5_APPROVED_CODE_SHA:r.main,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
 const stageReadback=mode=>{
  const args=mode==="calendar"?["--readback-calendar",stage.f,r.stageSha256]:["--readback",stage.f,r.stageSha256,r.costEnvelopeSha256];
  const x=JSON.parse(call(process.execPath,["scripts/v39_phase6_inert_release_stage_manual_v39.mjs",...args],{env:readEnv,timeout:120000}));
  verifyReadback(x,mode,r.main,r);checkMain();checkMetadata();return x;
 };
 let recovered=null,originalJournal=null;
 const chainName="inert-stage-chain-attempt.jsonl",chainPath=path.join(d,chainName);
 if(resume){
  originalJournal=file(d,chainName,1000000).b;
  recovered=acknowledgedCalendar(originalJournal.toString("utf8").trim().split("\n").map(l=>JSON.parse(l)),r,receiptSha,currentMetadataSha);
  noExtraStageRuns(recovered.runId);
  verifyRun(api("actions/runs/"+recovered.runId),recovered.runId,w.id,r.main);
  // A fresh owner readback must still prove exactly the disabled calendar,
  // no cost rows and no source/paid attempt. An already committed cost is
  // not a reason to dispatch another cost action.
  const fresh=stageReadback("calendar");
  need(Date.parse(fresh.snapshotAtUtc)>=Date.parse(recovered.receipt.snapshotAtUtc),"RESUME_READBACK_CLOCK");
  checkMain();checkMetadata();noExtraStageRuns(recovered.runId);
  need(file(d,chainName,1000000).b.equals(originalJournal),"STAGE_JOURNAL_CHANGED");
  // Durable exclusive resume claim, even if the process dies before POST.
  // Never delete or automatically retry an uncertain resume claim.
  const lock=fs.openSync(path.join(d,"acknowledged-calendar-resume-once.json"),"wx",0o600);
  try{fs.writeSync(lock,JSON.stringify({status:"CALENDAR_VERIFIED_COST_ONLY_RESUME_CLAIM_NO_REPLAY",main:r.main,receiptSha,calendarRunId:recovered.runId,originalJournalSha256:sha(originalJournal),secretMetadataSha256:currentMetadataSha,freshCalendarReadback:fresh,phase6PaidGo:false}));fs.fsyncSync(lock)}finally{fs.closeSync(lock)}
 }else noExtraStageRuns(null);
 const fd=fs.openSync(chainPath,resume?"a":"wx",0o600);
 const emit=x=>{fs.writeSync(fd,JSON.stringify(x)+"\n");fs.fsyncSync(fd)};
 try{
  if(resume){
   need(file(d,chainName,1000000).b.equals(originalJournal),"STAGE_JOURNAL_CHANGED");
   console.log(JSON.stringify({status:"EXACT_ACKNOWLEDGED_CALENDAR_FRESH_READBACK_COST_ONLY_RESUME",calendarRunId:recovered.runId,phase6PaidGo:false}));
  }else emit({status:"CHAIN_STARTED",main:r.main,receiptSha,secretMetadataSha256:currentMetadataSha,providerCalls:0,phase6PaidGo:false});
  const out=runSequence({
   dispatch(mode){
    checkMain();checkMetadata();if(resume)noExtraStageRuns(recovered.runId);emit({mode,status:"DISPATCH_ATTEMPTED_NO_REPLAY"});
    // API 2026-03-10 has a documented 200 run-ID response by default.
    // Send only its documented body fields; no legacy optional parameters.
    const x=JSON.parse(gh(["api","--method","POST","-H","X-GitHub-Api-Version: 2026-03-10","repos/"+REPO+"/actions/workflows/"+w.id+"/dispatches","--input","-"],{input:JSON.stringify({ref:"main",inputs:{stage:mode,confirm:confirms[mode]}}),stdio:["pipe","pipe","ignore"]}));
    const id=x.workflow_run_id;
    need(Number.isSafeInteger(id)&&id>0&&x.run_url==="https://api.github.com/repos/"+REPO+"/actions/runs/"+id&&x.html_url==="https://github.com/"+REPO+"/actions/runs/"+id,"DISPATCH_RESPONSE_UNKNOWN_NO_REPLAY");
    emit({mode,status:"DISPATCH_EXACT_RUN_ID",runId:id});return id;
   },
   awaitSuccess(id,mode){
    // Any CLI failure or timeout leaves journal for read-only recovery.
    gh(["run","watch",String(id),"-R",REPO,"--exit-status","--interval","10"],{timeout:15*60*1000,maxBuffer:12*1024*1024});
    verifyRun(api("actions/runs/"+id),id,w.id,r.main);checkMain();checkMetadata();
    emit({mode,status:"EXACT_RUN_SUCCESS",runId:id});
   },
   readback(mode,id){
    const x=stageReadback(mode);
    emit({mode,status:"INDEPENDENT_READBACK_MATCH",runId:id,receipt:x});
   }
  },recovered?.runId??null);
  emit({status:"BOTH_EXISTING_INERT_STAGES_EXACT_READBACK_NO_GO",...out,authorizationEnabled:false,phase6PaidGo:false});
  console.log(JSON.stringify({status:"BOTH_EXISTING_INERT_STAGES_EXACT_READBACK_NO_GO",main:r.main,...out,authorizationEnabled:false,providerCalls:0,phase6PaidGo:false}));
  // Retain the acknowledged stage chain even if local workpaper export fails.
  // The explicit recovery command reads existing receipts only, never dispatches.
  console.log(JSON.stringify(writeFreezeWorkpaper(d,receiptSha)));
 }finally{fs.closeSync(fd)}
}
module.exports={verifyRun,verifyReadback,runSequence,captureSecretMetadata,verifySecretMetadata,validateManifestStorageReceipt,prepareFreezeWorkpaper,acknowledgedCalendar,metadataDigest};
if(require.main===module)try{if(process.argv[2]==="--prepare-freeze-review"){need(process.argv.length===5,"EXACT_FREEZE_REVIEW_ARGUMENTS");console.log(JSON.stringify(writeFreezeWorkpaper(process.argv[3],process.argv[4])))}else run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_STAGE_CHAIN_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_STAGE_CHAIN_UNKNOWN_RESULT_READBACK_ONLY_NO_REPLAY");process.exitCode=2}
