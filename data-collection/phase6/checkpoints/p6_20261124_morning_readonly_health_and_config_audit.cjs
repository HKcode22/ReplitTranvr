"use strict";
// Repeatable owner metadata audit. No GitHub POST, workflow dispatch, secret
// write, provider request, production DDL/DML, or automatic epoch recovery.
const {execFileSync,spawnSync}=require("node:child_process");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createHash}=require("node:crypto"),{createRequire}=require("node:module");
const R="HKcode22/ReplitTranvr",L="HKcode22/TravnrClockRelay";
const S="9c9cddb1aaeb04934d94af2937ee158e6d991f6c",LS="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed";
const M="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e",C="cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9";
const mode=process.argv[2],check=["FULL_AUDIT","MORNING_CHECK"].includes(mode);
if(!check||process.argv.length!==3){console.error("Use FULL_AUDIT or MORNING_CHECK");process.exit(2);}
const now=Date.now(),out=(status,x={})=>console.log(JSON.stringify({status,...x})),issues=[],notes=[];
const issue=(code,x={})=>{issues.push(code);out("REVIEW_REQUIRED",{code,...x});};
const note=(code,x={})=>{notes.push(code);out("OBSERVATION",{code,...x});};
const gh=(...args)=>execFileSync("gh",args,{encoding:"utf8",timeout:30000,maxBuffer:32*1024*1024,stdio:["ignore","pipe","pipe"]});
const get=p=>JSON.parse(gh("api","--method","GET",p));
const getAll=(endpoint,key)=>{
 const rows=[];let total=null;for(let page=1;page<=40;page++){
  const d=get(endpoint+(endpoint.includes("?")?"&":"?")+"per_page=100&page="+page);
  if(!Number.isSafeInteger(d.total_count)||!Array.isArray(d[key])||(total!==null&&d.total_count!==total))throw Error("PAGINATION_"+key);
  total=d.total_count;
  if(d[key].length!==Math.min(100,Math.max(0,total-rows.length)))throw Error("PAGE_LENGTH_"+key);
  rows.push(...d[key]);if(rows.length===total)return rows;
 }throw Error("PAGE_LIMIT_"+key);
};
const robust=(f)=>{for(let i=0;i<3;i++){try{return f();}catch(e){if(i===2)throw e;}}};
const cfg={};
const info=async(repo,env)=>{
 const base="repos/"+repo;
 const scope=env?base+"/environments/"+encodeURIComponent(env):base+"/actions";
 return {vars:robust(()=>getAll(scope+"/variables","variables")),secrets:robust(()=>getAll(scope+"/secrets","secrets"))};
};
const vmap=a=>new Map(a.vars.map(v=>[v.name,v.value]));
const names=a=>a.map(x=>x.name).sort();
const actual=(a,k)=>vmap(a).get(k);
const report={schema:"travnr.phase6.owner-audit.v1",observedAtUtc:new Date(now).toISOString(),mode,production:{target:S,relay:LS},configuration:{},history:{},database:null,staticInventory:null};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"travnr-audit-"));
function exact(a,b,k,expected){
 const repo=actual(a,k),shadow=actual(b,k),eff=shadow===undefined?repo:shadow;
 const pass=repo===expected&&eff===expected;
 if(!pass)issue("CRITICAL_VARIABLE_MISMATCH",{name:k,repositoryPresent:repo!==undefined,environmentPresent:shadow!==undefined,expected});
 if(shadow!==undefined&&repo!==undefined&&repo!==shadow)issue("CRITICAL_VARIABLE_SCOPE_CONFLICT",{name:k});
 return pass;
}
function absentOr(a,b,k,allowed){
 const repo=actual(a,k),shadow=actual(b,k),eff=shadow===undefined?repo:shadow;
 if(!allowed.includes(repo??"")||!allowed.includes(eff??""))issue("CONFLICTING_CONTROL",{name:k,repositoryPresent:repo!==undefined,environmentPresent:shadow!==undefined});
 if(shadow!==undefined&&repo!==undefined&&repo!==shadow)issue("CRITICAL_VARIABLE_SCOPE_CONFLICT",{name:k});
}
function present(a,b,keys){
 const n=new Set([...names(a.secrets),...names(b.secrets)]);
 const missing=keys.filter(k=>!n.has(k));
 if(missing.length)issue("REQUIRED_SECRET_NAMES_MISSING",{names:missing});
 return {required:keys.length,missing};
}
function publicMeta(a){return {variableNames:names(a.vars),secretNames:names(a.secrets)};}
function workflowRuns(repo,epoch){
 const query="repos/"+repo+"/actions/runs?branch=main&created="+encodeURIComponent(">="+epoch.replace(".000Z","Z"));
 const rows=robust(()=>getAll(query,"workflow_runs"));
 if(new Set(rows.map(x=>x.id)).size!==rows.length||rows.some(x=>x.head_branch!=="main"||Date.parse(x.created_at)<Date.parse(epoch)))throw Error("HISTORY_SCOPE");
 return rows.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id-a.id);
}
const jobs=(repo,id)=>robust(()=>getAll("repos/"+repo+"/actions/runs/"+id+"/jobs?filter=latest","jobs"));
const runShort=x=>({id:x.id,path:x.path,event:x.event,status:x.status,conclusion:x.conclusion,createdAtUtc:x.created_at,attempt:x.run_attempt});
const directPath=".github/workflows/phase6-direct-recovery-tick.yml";
const retentionPath=".github/workflows/phase5-primary-fids-expiry-no-provider.yml";
const routes=[
 "phase5-source-upcoming-queue-main-scheduled-readonly",
 "phase6-private-later-enrollment","phase5-cd-github-one-queued-t24-witness-main-manual",
 "phase5-cd-github-bounded-pre-tick","phase6-nonpaid-source-day-prepare-publish",
 "phase5-cd-github-existing-queue-lease-watchdog","phase5-six-slot-approved-early-four-airport-draw",
 "phase5-private-blob-retention-readonly-sentinel-no-provider"
].map(x=>".github/workflows/"+x+".yml");
const childPaths=["phase5-one-signed-day-source-child-dispatch","phase5-one-signed-future-post-v0083-main-manual"].map(x=>".github/workflows/"+x+".yml");
function directReceipt(row,epoch){
 const j=jobs(R,row.id).filter(x=>x.name==="direct-protected-recovery-tick"&&x.conclusion==="success");
 if(j.length!==1||!j[0].steps?.some(x=>x.name==="Preserve direct terminal operational receipt"&&x.conclusion==="success"))throw Error("DIRECT_JOB");
 const marker=j[0].steps.filter(x=>x.name.startsWith("Direct outcome ")&&x.conclusion==="success");
 if(marker.length!==1)throw Error("DIRECT_MARKER");
 const meta=get("repos/"+R+"/actions/runs/"+row.id+"/artifacts?per_page=100");
 if(meta.total_count!==1||meta.artifacts?.length!==1)throw Error("DIRECT_ARTIFACT_COUNT");
 const a=meta.artifacts[0];
 if(a.name!=="p6-direct-terminal-"+row.id||a.expired!==false||!Number.isSafeInteger(a.size_in_bytes)||a.size_in_bytes<1||a.size_in_bytes>65536||!/^sha256:[a-f0-9]{64}$/.test(a.digest))throw Error("DIRECT_ARTIFACT_META");
 const bytes=robust(()=>execFileSync("gh",["api","--method","GET","repos/"+R+"/actions/artifacts/"+a.id+"/zip"],{timeout:15000,maxBuffer:131072,stdio:["ignore","pipe","pipe"]}));
 if(bytes.length!==a.size_in_bytes||"sha256:"+createHash("sha256").update(bytes).digest("hex")!==a.digest)throw Error("DIRECT_ARTIFACT_DIGEST");
 const zip=path.join(tmp,"direct.zip");fs.writeFileSync(zip,bytes,{mode:0o600});
 if(execFileSync("unzip",["-Z1",zip],{encoding:"utf8",timeout:5000}).trim()!=="p6-direct-terminal.json")throw Error("DIRECT_ARCHIVE_ENTRY");
 const p=JSON.parse(execFileSync("unzip",["-p",zip,"p6-direct-terminal.json"],{encoding:"utf8",timeout:5000,maxBuffer:65536}));
 if(p.schema!=="v39.phase6.direct-recovery-tick.v2"||p.runId!==row.id||p.reviewedMainSha!==S||p.activationUtc!==epoch||p.unknownAttempts!==0||p.providerCalls!==0||!Array.isArray(p.pending)||!Array.isArray(p.terminalAcknowledgements)||!Array.isArray(p.pendingAcknowledgements))throw Error("DIRECT_RECEIPT_SCOPE");
 if(marker[0].name==="Direct outcome PREFLIGHT_HOLD_NO_POST")issue("CONTROLLER_PREFLIGHT_HOLD",{run:row.id,reason:/^HOLD_[A-Z0-9_]+$/.test(p.reason??"")?p.reason:"REDACTED"});
 else if(marker[0].name==="Direct outcome TERMINAL_PARENT_ACKS_RECONCILED"?(p.status!=="DIRECT_WAVE_TERMINAL_NOT_COLLECTION_PROOF"||p.pending.length!==0):(marker[0].name!=="Direct outcome KNOWN_ACTIVE_PARENT_ACKS_CARRIED"||p.status!=="DIRECT_WAVE_KNOWN_ACTIVE_ACKS_CARRIED_NOT_COLLECTION_PROOF"||p.pending.length===0))throw Error("DIRECT_STATUS");
 if(p.pending.length!==p.pendingAcknowledgements.length||p.verifiedTerminal!==p.terminalAcknowledgements.length||p.acknowledged!==p.terminalAcknowledgements.length+p.pendingAcknowledgements.length)throw Error("DIRECT_RECEIPT_COUNTS");
 out("DIRECT_RECEIPT_BYTE_VERIFIED",{run:row.id,marker:marker[0].name,acknowledged:p.acknowledged,verifiedTerminal:p.verifiedTerminal,pending:p.pending.length,unknownAttempts:p.unknownAttempts,providerCallsByController:p.providerCalls});
 return {run:row.id,marker:marker[0].name,pending:p.pending.length};
}
async function metadata(){
 if(gh("api","--method","GET","user","--jq",".login").trim()!=="HKcode22")throw Error("OWNER_IDENTITY");
 const cur=get("repos/"+R+"/git/ref/heads/main").object.sha,relay=get("repos/"+L+"/git/ref/heads/main").object.sha;
 out("LIVE_MAIN_READBACK",{target:cur,relay,expected:cur===S&&relay===LS});
 if(cur!==S||relay!==LS){issue("REVIEWED_MAIN_CHANGED");return;}
 for(const repo of [R,L]){
  const base=await info(repo),envs=robust(()=>getAll("repos/"+repo+"/environments","environments"));
  cfg[repo]={base,environments:{}};
  for(const e of envs)if(mode==="FULL_AUDIT"||e.name===(repo===R?"phase6-protected-runtime":"travnr-target-forward"))cfg[repo].environments[e.name]=await info(repo,e.name);
  const es=cfg[repo].environments;
  report.configuration[repo]={repository:publicMeta(base),environments:Object.fromEntries(Object.entries(es).map(([k,v])=>[k,{...publicMeta(v),variableScopeDuplicates:names(v.vars).filter(n=>vmap(base).has(n)),variableScopeConflicts:names(v.vars).filter(n=>vmap(base).has(n)&&actual(base,n)!==actual(v,n)),secretScopeDuplicates:names(v.secrets).filter(n=>names(base.secrets).includes(n))}]))};
  out("CONFIGURATION_METADATA_CENSUS",{repo,repositoryVariables:base.vars.length,repositorySecretNames:base.secrets.length,environments:Object.entries(es).map(([name,v])=>({name,variables:v.vars.length,secretNames:v.secrets.length})),secretValuesReadable:false});
 }
 const rb=cfg[R].base,eb=cfg[R].environments["phase6-protected-runtime"],lb=cfg[L].base,le=cfg[L].environments["travnr-target-forward"];
 if(!eb||!le)throw Error("PROTECTED_ENV_MISSING");
 const required={
 P6_ROLLING_CONTROLLER_ENABLED:"1",P6_ROLLING_DIRECT_RECOVERY_ENABLED:"1",
 P6_NONPAID_SOURCE_SCHEDULE_ENABLED:"true",P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED:"true",
 P6_PRIVATE_SOURCE_REVIEW_MODE:"stored",P6_PRIVATE_POST_PARENT_ENABLED:"true",P6_NATIVE_POST_PRODUCER_ENABLED:"1",
 P6_PRIVATE_LATER_ENROLL_ENABLED:"1",P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED:"1",
 P6_PRIVATE_T24_ENROLL_ENABLED:"1",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",
 P6_PRIVATE_T24_EXECUTION_ENABLED:"1",P5_CD_GH_T24_SCHEDULE_ENABLED:"1",
 P5_CD_GH_PRE_SCHEDULE_ENABLED:"1",P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED:"1",P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",
 P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true",P5_PRIMARY_FIDS_BACKSTOP_ENABLED:"true",P6_FULL_RETENTION_BACKSTOP_ENABLED:"true",
 P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:S,P7_EXPIRY_APPROVED_MAIN_SHA:S,P7_EXPIRY_ENABLED:"true"
 };
 for(const [k,v] of Object.entries(required))exact(rb,eb,k,v);
 for(const k of ["P5_AUTO_SOURCE_DISPATCH_ENABLED","P5_POST_AUTO_DISPATCH_ENABLED","P5_T24_AUTO_DISPATCH_ENABLED"])absentOr(rb,eb,k,["","0","false"]);
 for(const k of ["P6_ROLLING_SCHEDULED_ROOT_ENABLED","P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED","P6_ROLLING_WINDOW_CUSTODY_ENABLED"])absentOr(rb,eb,k,["","0"]);
 const relayRequired={TRAVNR_RELAY_MODE:"MULTI_LANE",TRAVNR_RELAY_PRIMARY_ENABLED:"1",TRAVNR_RELAY_ROLLING_ENABLED:"1",TRAVNR_RELAY_DIRECT_TICK_APPROVED:"1",TRAVNR_RELAY_FULL_RETENTION_APPROVED:"1",TRAVNR_RELAY_ROLLING_ROUTE:"DIRECT_TICK",TRAVNR_APPROVED_TARGET_MAIN_SHA:S,TRAVNR_TARGET_FORWARD_ENV_READY:"1"};
 for(const [k,v] of Object.entries(relayRequired))exact(lb,le,k,v);
 const epoch=actual(rb,"P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC"),relayEpoch=actual(lb,"TRAVNR_RELAY_ROLLING_SINCE_UTC");
 if(typeof epoch!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/.test(epoch)||!Number.isFinite(Date.parse(epoch))||Date.parse(epoch)>Date.now()||epoch!==relayEpoch){issue("EPOCH_MISMATCH");return;}
 exact(rb,eb,"P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC",epoch);exact(lb,le,"TRAVNR_RELAY_ROLLING_SINCE_UTC",epoch);
 const flags=["P6_ROLLING_DIRECT_RECOVERY_APPROVED","V39_P5_APPROVED_CODE_SHA","V39_P5_QUEUE_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA","V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","V39_P5_SEVEN_REST_BUDGET_SIGNED","V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED","P5_CD_GH_PRE_STOP","V39_P5_MANIFEST_SHA256","V39_P5_CALENDAR_HASH","V39_P5_RELEASE_SHA256","V39_P5_RIGHTS_SHA256","V39_P5_PROVIDER_CONTRACT_SHA256","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_PRIVATE_SOURCE_STORED_REVIEW_APPROVED","P6_PRIVATE_SOURCE_STORED_DISPATCH_APPROVED","P6_PRIVATE_SOURCE_TRANSPORT_APPROVED","P6_PRIVATE_SOURCE_PARENT_RO_OWNER_APPROVED","V39_P5_SOURCE_QUEUE_OWNER_APPROVED","V39_P5_AUTO_SOURCE_DISPATCH_APPROVED","V39_P5_SIGNED_DAY_REGISTRY_RELEASE","V39_P5_SOURCE_DB_ROLE_REVIEWED","V39_P5_REST_UNIT_PRICE_APPROVED","V39_P5_SOURCE_DATABASE_URL","P6_PRIVATE_READER_DATABASE_URL"];
 out("CRITICAL_SECRET_NAME_CHECK",{...present(rb,eb,flags),secretValueEqualityVerified:false});
 out("RELAY_SECRET_NAME_CHECK",{...present(lb,le,["TRAVNR_TARGET_ACTIONS_TOKEN"]),secretValueEqualityVerified:false});
 note("SECRET_VALUES_REQUIRE_ACTUAL_EFFECTIVE_RUNTIME_EVIDENCE",{notASecretValueExport:true});
 const t=workflowRuns(R,epoch),l=workflowRuns(L,epoch);report.history={epoch,target:t.map(runShort),relay:l.map(runShort)};
 const directs=t.filter(x=>x.path===directPath),rolling=l.filter(x=>x.display_title==="TRAVNR EXTERNAL CLOCK ROLLING_ROOT");
 const bad=t.filter(x=>[directPath,...routes,...childPaths].includes(x.path)&&(x.head_sha!==S||x.run_attempt!==1||(x.status==="completed"&&!["success","skipped"].includes(x.conclusion))));
 if(bad.length)issue("UNRESOLVED_WORKFLOW_HISTORY",{runs:bad.map(runShort)});
 if(directs.some(x=>x.conclusion==="skipped"))issue("DIRECT_SKIPPED_REQUIRES_REVIEW",{ids:directs.filter(x=>x.conclusion==="skipped").map(x=>x.id)});
 const last=directs[0],good=directs.find(x=>x.status==="completed"&&x.conclusion==="success");
 const mins=x=>Math.round((Date.now()-Date.parse(x.created_at))/60000);
 out("CONTROLLER_HISTORY",{activationUtc:epoch,runCount:directs.length,completedSuccess:directs.filter(x=>x.conclusion==="success").length,latest:last?runShort(last):null,latestAgeMinutes:last?mins(last):null,rollingRelayLatest:rolling[0]?runShort(rolling[0]):null});
 if(!last||mins(last)>25)issue("CONTROLLER_STALE",{ageMinutes:last?mins(last):null});
 if(!rolling[0]||mins(rolling[0])>25)issue("RELAY_STALE",{ageMinutes:rolling[0]?mins(rolling[0]):null});
 if(last&&last.status!=="completed")note("CONTROLLER_CURRENTLY_ACTIVE",{run:last.id});
 if(!good||mins(good)>25)issue("NO_RECENT_SUCCESSFUL_DIRECT_RECEIPT");
 else{try{report.history.latestDirectReceipt=directReceipt(good,epoch);}catch(e){issue("DIRECT_RECEIPT_READBACK_UNAVAILABLE",{code:/^[A-Z_]+$/.test(e.message)?e.message:"READ_FAILED",run:good.id});}}
 const retention=t.find(x=>x.path===retentionPath&&x.status==="completed"&&x.conclusion==="success");
 if(!retention||mins(retention)>35)issue("RETENTION_STALE",{ageMinutes:retention?mins(retention):null});
 else{const jj=jobs(R,retention.id);const ok=["phase7-expiry","primary-fids-expiry"].every(n=>jj.some(j=>j.name===n&&j.conclusion==="success"));if(!ok)issue("RETENTION_ACTUAL_JOBS_MISSING",{run:retention.id});out("RETENTION_ACTUAL_JOB_CHECK",{run:retention.id,passed:ok});}
 const parent=t.find(x=>x.path===routes[0]&&x.status==="completed"&&x.conclusion==="success");
 if(parent){
  const jj=jobs(R,parent.id),requiredJobs=["separately-authorized-stored-source-children","separately-authorized-current-private-post-children","separately-authorized-native-post-producer"];
  const result=requiredJobs.map(n=>({name:n,conclusion:jj.find(j=>j.name===n)?.conclusion??"not_seen",outcome:jj.find(j=>j.name===n)?.steps?.find(s=>s.name.startsWith("Parent outcome ")&&s.conclusion==="success")?.name??null}));
  out("LATEST_SOURCE_POST_PARENT_JOB_EVIDENCE",{run:parent.id,jobs:result});
  if(!result.every(x=>x.conclusion==="success"))note("SOURCE_POST_REQUIRED_JOB_NOT_ALL_EXECUTED",{run:parent.id});
 }else note("NO_COMPLETED_SOURCE_POST_PARENT_IN_CURRENT_EPOCH");
 const d=t.find(x=>x.path===routes[4]&&x.status==="completed"&&x.conclusion==="success");
 if(!d||mins(d)>25)issue("DAILY_PREPARE_STALE",{ageMinutes:d?mins(d):null});
 else {const j=jobs(R,d.id).find(x=>x.name==="protected-main-one-day-nonpaid"&&x.conclusion==="success");if(!j)issue("DAILY_PREPARE_ACTUAL_JOB_MISSING",{run:d.id});else out("DAILY_PREPARE_ACTUAL_JOB_CHECK",{run:d.id,job:j.id,passed:true});}
}
async function db(){
 const {Client}=createRequire(path.join(process.cwd(),"package.json"))("pg");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='15s'");
  const x=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,clock_timestamp() at,(SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL AND manifest_sha256=$1) auth,(SELECT count(*)::int FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1 AND budget_release_mode='COST_UPPER_BOUND' AND reviewed_cost_envelope_sha256=$2 AND reviewed_source_request_grid_sha256 IS NULL) cost,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) d2,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=1 AND daily_api_ceiling=256) b1,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=2 AND daily_api_ceiling=384) b2,(SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND run_day_index=1) q1,(SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND run_day_index=2) q2,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39 WHERE run_day_index=1) c1,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39 WHERE run_day_index=2) c2,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=1 AND retention_not_after_utc>statement_timestamp()) i1,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=2 AND retention_not_after_utc>statement_timestamp()) i2,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=1 AND reviewed_code_sha=$3 AND retention_not_after_utc>statement_timestamp()) i1_current_code,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=2 AND reviewed_code_sha=$3 AND retention_not_after_utc>statement_timestamp()) i2_current_code,(SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39 WHERE retention_not_after_utc<=statement_timestamp()) due_packets,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE retention_not_after_utc<=statement_timestamp()) due_indexes",[M,C,S])).rows[0];
  await c.query("ROLLBACK");report.database=x;
  out("DAY1_DAY2_READONLY_DATABASE_CENSUS",{...x,providerCalls:0});
  if(!x.db||!x.owner||!x.primary||!x.ro||x.auth!==1||x.cost!==1||x.stops!==0||x.d1!==4||x.d2!==4||x.b1!==1||x.b2!==1||x.q1!==128||x.c1!==1||x.i1<1||x.i1_current_code!==x.i1)issue("DAY1_OR_SHARED_AUTH_READBACK_MISMATCH");
  if(x.due_packets!==0||x.due_indexes!==0)issue("DUE_RETENTION_ROWS",{duePackets:x.due_packets,dueIndexes:x.due_indexes});
  const at=Date.parse(x.at),open=Date.parse("2026-11-24T15:45:00Z"),deadline=Date.parse("2026-11-25T03:25:00Z");
  const ready=x.q2===192&&x.c2===1&&x.i2>=1&&x.i2_current_code===x.i2;
  if(ready)out("DAY2_SIGNED_PREPARATION_PRESENT",{queries:x.q2,claim:x.c2,liveIndexes:x.i2});
  else if(at<open)out("DAY2_NOT_YET_DUE",{opensUtc:new Date(open).toISOString()});
  else if(at>=deadline)issue("DAY2_PREPARATION_DEADLINE_REACHED");
  else if(at>=Date.parse("2026-11-24T17:15:00Z"))issue("DAY2_PREPARATION_NOT_YET_VERIFIED_EARLY_WARNING");
  else note("DAY2_PREPARATION_OPEN_NOT_YET_VERIFIED",{deadlineUtc:new Date(deadline).toISOString()});
  if(at<Date.parse("2026-11-24T17:45:00Z")&&(x.source!==0||x.rest!==0))note("PHYSICAL_ATTEMPTS_EXIST_BEFORE_FIRST_EXPECTED_D1_SOURCE",{source:x.source,rest:x.rest,reviewExactTimes:true});
  if(at>=Date.parse("2026-11-24T17:45:00Z"))note("DUE_COLLECTION_REQUIRES_REAL_PAID_RECEIPTS",{sourcePhysicalAttempts:x.source,restReservations:x.rest});
 }finally{await c.end().catch(()=>{});}
}
function sourceAudit(repo,sha){
 const file=path.join(tmp,repo.split("/")[1]+".tar.gz");
 const fd=fs.openSync(file,"wx",0o600);
 try{
  let local=false;
  if(repo===R){try{execFileSync("git",["cat-file","-e",sha+"^{commit}"],{stdio:"ignore",timeout:5000});local=true;}catch{}}
  const cmd=local?["git",["archive","--format=tar.gz",sha,".github/workflows","scripts","server"]]:["gh",["api","--method","GET","repos/"+repo+"/tarball/"+sha]];
  const res=spawnSync(cmd[0],cmd[1],{stdio:["ignore",fd,"ignore"],timeout:180000});
  if(res.status!==0||res.error)throw Error("SOURCE_ARCHIVE_UNAVAILABLE");
 }finally{fs.closeSync(fd);}
 const script=[
 "import sys,tarfile,re,json",
 "p=sys.argv[1]; refs={}; runtime={}; w=0; code=0; dynamic=[]",
 "with tarfile.open(p,'r:gz') as f:",
 " for m in f:",
 "  if not m.isfile(): continue",
 "  n=m.name; parts=n.split('/',1)",
 "  if not (n.startswith('.github/') or n.startswith('scripts/') or n.startswith('server/') or n in ('relay.mjs','cli.mjs')) and len(parts)>1: n=parts[1]",
 "  wf=n.startswith('.github/workflows/') and n.endswith(('.yml','.yaml'))",
 "  src=(n.startswith(('scripts/','server/')) or n in ('relay.mjs','cli.mjs')) and n.endswith(('.js','.ts','.mjs','.cjs','.mts','.cts'))",
 "  if not (wf or src): continue",
 "  if m.size>10000000: dynamic.append(n+':oversize');continue",
 "  w+=int(wf);code+=int(src)",
 "  for i,line in enumerate(f.extractfile(m).read().decode('utf-8','replace').splitlines(),1):",
 "   if wf:",
 "    for k,v in re.findall(r'\\b(vars|secrets)\\.([A-Z][A-Z0-9_]+)',line): refs.setdefault(k+'.'+v,[]).append(n+':'+str(i))",
 "    if re.search(r'\\b(vars|secrets)\\[',line): dynamic.append(n+':'+str(i))",
 "   if src:",
 "    for v in re.findall(r'\\b(?:process\\.env|env)\\.?\\.([A-Z][A-Z0-9_]+)',line): runtime.setdefault(v,[]).append(n+':'+str(i))",
 "    if re.search(r'\\b(?:process\\.env|env)\\[',line): dynamic.append(n+':'+str(i))",
 "print(json.dumps(dict(workflows=w,sourceFiles=code,workflowReferences=refs,runtimeDirectReferences=runtime,dynamicOrOversizeLocations=dynamic)))"
 ].join("\n");
 const data=JSON.parse(execFileSync("python3",["-c",script,file],{encoding:"utf8",timeout:120000,maxBuffer:64*1024*1024,stdio:["ignore","pipe","pipe"]}));
 if(!data.workflows)throw Error("SOURCE_SCAN_EMPTY");
 const scopes=cfg[repo],installed= scopes?{vars:new Set([...(names(scopes.base.vars)),...Object.values(scopes.environments).flatMap(v=>names(v.vars))]),secrets:new Set([...(names(scopes.base.secrets)),...Object.values(scopes.environments).flatMap(v=>names(v.secrets))])}:null;
 data.uninstalledLiteralReferences=installed?Object.keys(data.workflowReferences).filter(k=>{const [kind,n]=k.split(".");return !installed[kind].has(n)&&n!=="GITHUB_TOKEN";}):null;
 data.warning="Literal references across historical and active workflows; optional and retired paths included. Not a deletion list; dynamic keys and consumer semantics require review. Effective secret values not accessible.";
 out("FULL_STATIC_SOURCE_SCAN",{repo,workflows:data.workflows,sourceFiles:data.sourceFiles,workflowReferenceNames:Object.keys(data.workflowReferences).length,directRuntimeReferenceNames:Object.keys(data.runtimeDirectReferences).length,dynamicOrOversizeLocations:data.dynamicOrOversizeLocations.length,uninstalledLiteralReferenceNames:data.uninstalledLiteralReferences?.length??null});
 return data;
}
(async()=>{
 try{await metadata();}catch(e){issue("GITHUB_METADATA_READ_FAILED",{code:/^[A-Z_]+$/.test(e.message)?e.message:"API_OR_SCHEMA"});}
 try{await db();}catch(e){issue("DB_READONLY_CENSUS_FAILED",{code:/^[A-Z0-9_]+$/.test(e.code??"")?e.code:"READ_FAILED"});}
 if(mode==="FULL_AUDIT"){
  report.staticInventory={};for(const [repo,sha] of [[R,S],[L,LS]]){try{report.staticInventory[repo]=sourceAudit(repo,sha);}catch(e){issue("STATIC_INVENTORY_INCOMPLETE",{repo,code:/^[A-Z_]+$/.test(e.message)?e.message:"READ_FAILED"});}}
 }
 report.issues=issues;report.notes=notes;
 const dir=path.join(os.homedir(),".travnr-phase6-audit");fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const dest=path.join(dir,"audit-"+new Date().toISOString().replace(/[:.]/g,"-")+"-"+process.pid+".json");
 fs.writeFileSync(dest,JSON.stringify(report,null,2),{mode:0o600,flag:"wx"});
 out(issues.length?"P6_READONLY_AUDIT_REVIEW_REQUIRED":"P6_READONLY_OBSERVED_CHECKS_PASS",{mode,issues,notes,localMetadataReport:dest,providerCalls:0,workflowDispatches:0,productionWrites:0,allSecretValuesVerified:false,paidCollectionProven:false});
 if(issues.length)process.exitCode=2;
})().catch(e=>{out("P6_READONLY_AUDIT_INCOMPLETE",{code:e.code||e.name});process.exitCode=2;}).finally(()=>fs.rmSync(tmp,{recursive:true,force:true}));
