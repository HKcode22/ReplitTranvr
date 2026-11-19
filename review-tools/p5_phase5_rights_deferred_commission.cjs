#!/usr/bin/env node
"use strict";
/**
 * One owner-local Phase5 rights-deferred production commissioner.
 * Consumes only p5_phase5_rights_deferred_prepare.cjs outputs after PR879 is
 * exact current main. Stores final frozen manifest, installs only inert-stage
 * secrets, runs B0062 then V0093, independently reads both back, and emits a
 * Phase5 freeze receipt. Never sets source-rights, process-armed, owner-GO,
 * provider credentials, or enables the DB authorization.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process"),{pathToFileURL}=require("node:url");
const REPO="HKcode22/ReplitTranvr",PR=879;
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const TARGETS=["V39_P5_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","P6_INERT_STAGE_INPUT_JSON","P6_INERT_STAGE_INPUT_SHA256","P6_INERT_CALENDAR_REVIEW_APPROVED","P6_INERT_COST_REVIEW_APPROVED","P6_INERT_COST_ENVELOPE_SHA256"];
const EXISTING=["V39_PHASE6_PROCESS_ARMED","P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL","P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL"];
const need=(x,s)=>{if(!x)throw Error("HOLD_P5_DEFERRED_COMMISSION_"+s)},sha=b=>crypto.createHash("sha256").update(b).digest("hex"),json=x=>JSON.stringify(x);
const call=(c,a,o={})=>execFileSync(c,a,{cwd:process.cwd(),encoding:"utf8",timeout:60000,maxBuffer:32*1024*1024,stdio:["ignore","pipe","ignore"],...o}).trim(),gh=(a,o={})=>call("gh",a,o);
function secureDir(p){const q=fs.realpathSync(p),s=fs.lstatSync(q);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIR");return q}
function read(p,max=4_000_000){const b=fs.readFileSync(p);need(b.length>1&&b.length<=max,"FILE_SIZE");return b}
function readJ(p,max){const b=read(p,max),x=JSON.parse(b);need(Buffer.from(json(x)).equals(b),"NONCANONICAL_JSON");return {b,x,sha256:sha(b)}}
function writeOnce(dir,n,b){const raw=Buffer.isBuffer(b)?b:Buffer.from(b),p=path.join(dir,n);try{fs.writeFileSync(p,raw,{flag:"wx",mode:0o600})}catch(e){if(e.code!=="EEXIST")throw e;need(fs.readFileSync(p).equals(raw),"EXISTING_OUTPUT_DIFFERS")}return p}
function identity(){
 const root=fs.realpathSync(call("git",["rev-parse","--show-toplevel"])),head=call("git",["rev-parse","HEAD"]),remote=gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
 need(root===fs.realpathSync(process.cwd())&&C.test(head)&&head===remote&&call("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_CLEAN_MAIN");
 const p=JSON.parse(gh(["api","repos/"+REPO+"/pulls/"+PR]));need(p.merged===true&&p.merge_commit_sha===head,"PR879_NOT_CURRENT_MAIN");return {root,head};
}
function secretMeta(){return JSON.parse(gh(["secret","list","-R",REPO,"--json","name,updatedAt"]))}
function stageRuns(wid,head){return JSON.parse(gh(["api","repos/"+REPO+"/actions/workflows/"+wid+"/runs?event=workflow_dispatch&head_sha="+head+"&per_page=100"]))}
function sleep2(){execFileSync("sleep",["2"],{stdio:"ignore"})}
async function loadPrepared(){
 const {root,head}=identity(),dir=secureDir(process.env.P5_PHASE5_PREPARED_DIRECTORY||"");
 const rec=readJ(path.join(dir,"preparation-receipt.json"),200000),manifest=readJ(path.join(dir,"approved-manifest.json"),2_000_000),config=readJ(path.join(dir,"approved-config.json"),500000),stage=readJ(path.join(dir,"exact-stage-input.json"),48000),review=readJ(path.join(dir,"phase5-commissioning-review.json"),200000),inv=readJ(path.join(dir,"source-inventory.json"),4_000_000);
 const r=rec.x,m=manifest.x,c=config.x,st=stage.x,rv=review.x;
 need(r.status==="PHASE5_RIGHTS_DEFERRED_FINAL_INPUTS_PREPARED_NO_GO"&&r.main===head&&r.manifestSha256===manifest.sha256&&r.configSha256===config.sha256&&r.sourceInventorySha256===inv.sha256&&r.stageSha256===stage.sha256&&H.test(r.costEnvelopeSha256)&&r.sourceRightsApproved===false&&r.sourceUseDeferredToPhase6Activation===true&&r.providerCalls===0&&r.databaseWrites===0&&r.phase6PaidGo===false,"PREPARATION_RECEIPT");
 need(m.scientificFreezeApproved===true&&m.phase5CommissioningApproved===true&&m.sourceRightsApproved===false&&m.sourceUseDeferredToPhase6Activation===true&&m.phase6PaidGo===false&&m.configSha256===config.sha256&&m.sourceInventorySha256===inv.sha256,"FROZEN_MANIFEST");
 need(c.reviewApproved===true&&c.phase5CommissioningApproved===true&&c.sourceRightsApproved===false&&c.sourceUseDeferredToPhase6Activation===true&&c.phase6PaidGo===false,"FROZEN_CONFIG");
 need(st.codeSha40===head&&st.manifestSha256===manifest.sha256&&st.configSha256===config.sha256&&st.phase6AuthorizationId===r.authorizationId&&json(st.predecessorEvidenceIds)===json(rv.predecessorEvidenceIds),"STAGE_BINDING");
 need(rv.status==="PHASE5_COMMISSIONING_TECHNICAL_REVIEW_AND_OWNER_DIRECTIVE_APPROVED_NO_SOURCE_GO"&&rv.phase5ScientificFreezeApproved===true&&rv.calendarTreatmentReviewApproved===true&&rv.providerAccountAndRestBudgetReviewApproved===true&&rv.costOnlyFreezeReviewApproved===true&&rv.sourceRightsApproved===false&&rv.sourceUseDeferredToPhase6Activation===true&&rv.phase6PaidGo===false,"COMMISSION_REVIEW");
 const b0062=await import(pathToFileURL(path.join(root,"server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs")).href),v0093=await import(pathToFileURL(path.join(root,"server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs")).href),cost=await import(pathToFileURL(path.join(root,"server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs")).href);
 const calendarReview={expectedSignedStagePacketSha256:stage.sha256,expectedExactWriterRole:"phase5_b0062_prelaunch_stage_prod20261113",independentCalendarTreatmentReviewApproved:true,independentProviderAccountAndRestBudgetReviewApproved:true,narrowPrelaunchOwnerApproved:true};
 const cp=b0062.compileP5InertB0062UtcStagePacket(st,calendarReview),cd=cost.buildP5V0082UnknownAirportSevenCostOnlyDraft({schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",slotBudgetInput:st.slotBudgetInput,expectedReviewerSlotEnvelopeSha256:st.expectedSignedSlotEnvelopeSha256});
 need(cd.costOnlyCategoryDraftSha256===r.costEnvelopeSha256,"COST_DIGEST");
 const costReview={expectedStagedB0062PacketSha256:cp.stagePacketSha256,expectedSignedSevenCategoryCostSha256:r.costEnvelopeSha256,expectedExactBudgetWriterRole:"phase5_fids_budget_freeze_prod20261113",independentProspectiveCalendarAndTreatmentApproved:true,independentRealProviderRangeAndRestBudgetApproved:true,independentSourceContentsRightsForIntendedUseApproved:false,sourceUseDeferredToPhase6Activation:true,exactRestrictedNoProviderBudgetFreezeApproved:true};
 const vp=v0093.compileP5V0093CostOnlySevenRestReview(st,calendarReview,costReview);
 need(vp.sourceUseDeferredToPhase6Activation===true&&vp.independentSourceContentsRightsForIntendedUseApproved===false&&vp.phase6PaidGo===false,"COST_DEFERRED_SCOPE");
 return {root,head,dir,rec:r,manifest,config,stage,review:rv,calendarReview,costReview,cost:cd};
}
async function storeManifest(ctx,emit){
 const {Pool}=require("pg");
 const u=process.env.DATABASE_URL;need(typeof u==="string"&&u.length>20,"OWNER_DATABASE_URL");
 const pool=new Pool({connectionString:u,max:2,connectionTimeoutMillis:8000,query_timeout:20000,application_name:"p5_rights_deferred_manifest_store"}),key="phase5_frozen_manifest:"+ctx.manifest.sha256;
 let inserted=0,attempted=false;
 try{
  const c=await pool.connect();let began=false;
  try{
   await c.query("BEGIN");began=true;await c.query("SET LOCAL statement_timeout='20000ms'");await c.query("SET LOCAL lock_timeout='2000ms'");
   const who=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica")).rows[0];
   need(who?.db==="neondb"&&who.actor==="neondb_owner"&&who.session_actor==="neondb_owner"&&who.ver>=160000&&who.ver<170000&&who.ro==="off"&&who.replica===false,"OWNER_DB_SCOPE");
   const lock=(await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase5-final-manifest')::bigint) ok")).rows[0];need(lock?.ok===true,"MANIFEST_LOCK_BUSY");
   await c.query("LOCK TABLE clean.adb_collection_meta,clean.adb_phase6_authorization,clean.adb_incident_stop,clean.adb_probe_budget_day,clean.adb_collection_batches,clean.adb_collection_subs IN SHARE ROW EXCLUSIVE MODE");
   const blockers=(await c.query("SELECT (SELECT count(*)::int FROM clean.adb_phase6_authorization) auth,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') open_budget,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE' OR run_day_index IS NOT NULL) batches,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions,(SELECT count(*)::int FROM clean.adb_collection_meta WHERE key LIKE 'phase6_source_authorization_enabled:%') prior_enable")).rows[0];
   need(blockers&&Object.values(blockers).every(n=>n===0),"NONEMPTY_AUTHORITY_OR_EXPOSURE");
   const rows=(await c.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",[key])).rows;
   need(rows.length<=1,"MANIFEST_DUPLICATE");
   const raw=ctx.manifest.b.toString("utf8");
   if(rows.length===1)need(rows[0].value===raw,"EXISTING_MANIFEST_DIFFERENT");
   else{emit({status:"MANIFEST_INSERT_ATTEMPTED_NO_REPLAY",manifestSha256:ctx.manifest.sha256});const q=await c.query("INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)",[key,raw]);need(q.rowCount===1,"MANIFEST_INSERT_COUNT");inserted=1}
   attempted=true;await c.query("COMMIT");began=false;
  }catch(e){if(began)await c.query("ROLLBACK").catch(()=>{});if(attempted)throw Error("HOLD_P5_DEFERRED_COMMISSION_UNKNOWN_MANIFEST_COMMIT");throw e}finally{c.release()}
  const r=await pool.connect();try{await r.query("BEGIN READ ONLY");const who=(await r.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('transaction_read_only') ro")).rows[0];need(who?.db==="neondb"&&who.actor==="neondb_owner"&&who.session_actor==="neondb_owner"&&who.ro==="on","MANIFEST_READBACK_SCOPE");const rows=(await r.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",[key])).rows,auth=(await r.query("SELECT count(*)::int n FROM clean.adb_phase6_authorization")).rows;need(rows.length===1&&rows[0].value===ctx.manifest.b.toString("utf8")&&auth.length===1&&auth[0].n===0,"MANIFEST_FRESH_READBACK");await r.query("ROLLBACK")}finally{r.release()}
  emit({status:"MANIFEST_STORED_AND_FRESH_READBACK_NO_GO",manifestSha256:ctx.manifest.sha256,databaseWrites:inserted,authorizationEnabled:false,phase6PaidGo:false});
  return inserted;
 }finally{await pool.end()}
}
function setSecrets(ctx,emit){
 const rows=secretMeta(),names=new Set(rows.map(x=>x.name));
 for(const n of EXISTING)need(names.has(n),"EXISTING_SECRET_MISSING_"+n);
 need(!names.has("V39_PHASE5_SOURCE_RIGHTS_APPROVED"),"SOURCE_RIGHTS_SECRET_MUST_REMAIN_ABSENT");
 for(const n of TARGETS)need(!names.has(n),"TARGET_SECRET_ALREADY_PRESENT_RECONCILE_"+n);
 const values={V39_P5_APPROVED_CODE_SHA:ctx.head,V39_P5_MANIFEST_SHA256:ctx.manifest.sha256,P6_INERT_STAGE_INPUT_JSON:ctx.stage.b.toString("utf8"),P6_INERT_STAGE_INPUT_SHA256:ctx.stage.sha256,P6_INERT_CALENDAR_REVIEW_APPROVED:"1",P6_INERT_COST_REVIEW_APPROVED:"1",P6_INERT_COST_ENVELOPE_SHA256:ctx.rec.costEnvelopeSha256};
 for(const n of TARGETS){emit({status:"SECRET_WRITE_ATTEMPTED_NO_REPLAY",name:n});call("gh",["secret","set",n,"-R",REPO],{input:values[n],stdio:["pipe","pipe","ignore"]});const x=secretMeta().find(r=>r.name===n);need(x&&Number.isFinite(Date.parse(x.updatedAt)),"SECRET_METADATA_READBACK_"+n);emit({status:"SECRET_METADATA_READBACK",name:n,updatedAt:x.updatedAt})}
}
async function ownerReadback(ctx,mode){
 const env={...process.env,ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",V39_P5_APPROVED_CODE_SHA:ctx.head};
 for(const k of ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","V39_DATABASE_RUNTIME_URL","NODE_OPTIONS"])delete env[k];
 const args=mode==="calendar"?["scripts/v39_phase6_inert_release_stage_manual_v39.mjs","--readback-calendar",path.join(ctx.dir,"exact-stage-input.json"),ctx.stage.sha256]:["scripts/v39_phase6_inert_release_stage_manual_v39.mjs","--readback",path.join(ctx.dir,"exact-stage-input.json"),ctx.stage.sha256,ctx.rec.costEnvelopeSha256];
 return JSON.parse(call(process.execPath,args,{env,timeout:180000}));
}
async function dispatch(ctx,wf,mode,emit,priorId=null){
 const confirm=mode==="calendar"?"STAGE_EXACT_31_DAY_CALENDAR_DISABLED_AUTH_NO_PROVIDER":"STAGE_EXACT_SEVEN_COST_UPPER_BOUNDS_DISABLED_AUTH_NO_PROVIDER";
 const before=stageRuns(wf.id,ctx.head);
 if(priorId===null)need(before.total_count===0,"PRIOR_STAGE_ATTEMPT_"+mode.toUpperCase());
 else need(before.total_count===1&&before.workflow_runs?.[0]?.id===priorId,"PRIOR_STAGE_IDENTITY_"+mode.toUpperCase());
 emit({status:"DISPATCH_ATTEMPTED_NO_REPLAY",mode});
 try{gh(["workflow","run","phase5-exact-inert-release-stage-manual.yml","-R",REPO,"--ref","main","-f","stage="+mode,"-f","confirm="+confirm])}catch{need(false,"DISPATCH_ACK_UNKNOWN_"+mode.toUpperCase())}
 let run=null;
 for(let i=0;i<90;i++){const q=stageRuns(wf.id,ctx.head),expected=priorId===null?1:2;if(q.total_count===expected&&q.workflow_runs.length===expected){run=q.workflow_runs.find(x=>x.id!==priorId)||q.workflow_runs[0];break}if(q.total_count>expected)need(false,"MULTIPLE_STAGE_RUNS");sleep2()}
 need(run&&Number.isSafeInteger(run.id),"RUN_ID_NOT_OBSERVED_"+mode.toUpperCase());emit({status:"DISPATCH_EXACT_RUN_ID",mode,runId:run.id});
 try{call("gh",["run","watch",String(run.id),"-R",REPO,"--exit-status"],{timeout:720000,stdio:["ignore","pipe","pipe"]})}catch{need(false,"STAGE_RUN_FAILED_OR_UNKNOWN_"+mode.toUpperCase())}
 const d=JSON.parse(gh(["api","repos/"+REPO+"/actions/runs/"+run.id]));need(d.workflow_id===wf.id&&d.head_sha===ctx.head&&d.head_branch==="main"&&d.event==="workflow_dispatch"&&d.run_attempt===1&&d.status==="completed"&&d.conclusion==="success","STAGE_RUN_IDENTITY_"+mode.toUpperCase());
 emit({status:"STAGE_RUN_SUCCESS",mode,runId:run.id});
 const ro=await ownerReadback(ctx,mode);
 const want=mode==="calendar"?"INDEPENDENT_EXACT_B0062_CALENDAR_ONLY_READONLY_MATCH_NO_GO":"INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO";
 need(ro.status===want&&ro.codeSha===ctx.head&&ro.independentOwnerReadback===true&&ro.authorizationEnabled===false&&ro.calendarRows===31&&ro.sourceQueriesAndPhysicalAttemptsZero===true&&ro.providerCalls===0&&ro.databaseWrites===0&&ro.phase5ScientificFreeze===false&&ro.phase6PaidGo===false,"INDEPENDENT_READBACK_"+mode.toUpperCase());
 if(mode==="calendar")need(ro.costStageCommitted===false&&ro.categoryCycleCaps===0&&ro.categoryUtcBudgetRows===0,"CALENDAR_ONLY_SCOPE");
 else need(ro.exactReviewedCostEnvelopeSha256===ctx.rec.costEnvelopeSha256&&ro.categoryCycleCaps===7&&ro.categoryUtcBudgetRows===266,"COST_SCOPE");
 emit({status:"INDEPENDENT_READBACK_MATCH",mode,runId:run.id,receipt:ro});return {runId:run.id,readback:ro};
}
async function commission(){
 need(process.argv.length===3&&process.argv[2]==="COMMISSION_PHASE5_RIGHTS_DEFERRED_NO_GO"&&process.env.P5_PHASE5_COMMISSION_OWNER_APPROVED==="1"&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&!["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","V39_DATABASE_RUNTIME_URL","NODE_OPTIONS"].some(k=>process.env[k]),"EXPLICIT_OWNER_STOP_SCOPE");
 const ctx=await loadPrepared();need(Date.now()<Date.parse("2026-11-19T23:10:00.000Z"),"STRICT_DAY1_COMMISSION_DEADLINE_PASSED");
 const journal=path.join(ctx.dir,"commission-attempt.jsonl");need(!fs.existsSync(journal),"EXISTING_ATTEMPT_RECONCILIATION_REQUIRED");
 const fd=fs.openSync(journal,"wx",0o600),emit=x=>{fs.writeSync(fd,json(x)+"\n");fs.fsyncSync(fd)};
 try{
  emit({status:"PHASE5_RIGHTS_DEFERRED_COMMISSION_STARTED_NO_GO",main:ctx.head,authorizationId:ctx.rec.authorizationId,manifestSha256:ctx.manifest.sha256,stageSha256:ctx.stage.sha256,costEnvelopeSha256:ctx.rec.costEnvelopeSha256,sourceRightsApproved:false,phase6PaidGo:false});
  await storeManifest(ctx,emit);setSecrets(ctx,emit);
  const wf=JSON.parse(gh(["api","repos/"+REPO+"/actions/workflows/phase5-exact-inert-release-stage-manual.yml"]));need(wf.state==="active"&&Number.isSafeInteger(wf.id),"STAGE_WORKFLOW");
  const cal=await dispatch(ctx,wf,"calendar",emit),cost=await dispatch(ctx,wf,"cost",emit,cal.runId);
  const freeze={schema:"v39.phase5.rights-deferred-production-freeze.v1",status:"PHASE5_PRODUCTION_FREEZE_COMPLETE_SOURCE_USE_DEFERRED_NO_GO",main:ctx.head,authorizationId:ctx.rec.authorizationId,manifestSha256:ctx.manifest.sha256,configSha256:ctx.config.sha256,stageSha256:ctx.stage.sha256,costEnvelopeSha256:ctx.rec.costEnvelopeSha256,calendarRunId:cal.runId,costRunId:cost.runId,calendarRows:31,categoryCycleCaps:7,categoryUtcBudgetRows:266,phase5ScientificFreezeApproved:true,phase5CommissioningApproved:true,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,authorizationEnabled:false,providerCalls:0,phase6PaidGo:false,frozenAtUtc:new Date().toISOString()};
  writeOnce(ctx.dir,"phase5-final-freeze.json",Buffer.from(json(freeze)));emit(freeze);console.log(json(freeze));
 }finally{fs.closeSync(fd)}
}
module.exports={TARGETS,EXISTING};
if(require.main===module)commission().catch(e=>{const s=String(e?.message??"");console.error(/^HOLD_P5_DEFERRED_COMMISSION_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_DEFERRED_COMMISSION_UNKNOWN_NO_REPLAY");process.exitCode=2});
