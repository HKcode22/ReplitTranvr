// Owner-local metadata-only audit, never dispatches, mutates variables, calls providers,
// or changes DB state. No workflow logs, provider rows, secret values, or URL printed.
// Deliberately reports blockers instead of treating a successful/skipped Actions run as GO.
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";
const P="HKcode22/ReplitTranvr",R="HKcode22/TravnrClockRelay";
const BASE="0a7b1a28f243de76d4c83026d15f585265ef6f7b",RELAY="b3a775b4ec7213af796bb8c727b69c3d0feb8bb7";
const MANIFEST="3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7";
const hold=s=>{throw Error("HOLD_P6_UNATTENDED_READONLY_"+s)};
const need=(v,s)=>{if(!v)hold(s)};
const sha=x=>typeof x==="string"&&/^[a-f0-9]{40}$/.test(x);
const stamp=x=>Date.parse(x);
const id=x=>Number.isSafeInteger(x)&&x>0;
export const ROUTES=[
 [P,"phase5-primary-fids-expiry-no-provider.yml","primary-fids-expiry","Verify exact main and execute only bounded primary FIDS expiry",45],
 [P,"phase5-private-blob-retention-readonly-sentinel-no-provider.yml","private-main-restricted-metadata-sentinel","Count ONLY expired/near-due PG metadata; fail on overdue",120],
 [P,"phase6-autonomous-gh-controller-heartbeat-no-provider.yml","actual-main-nonpaid-controller-heartbeat","Read only GH workflow history and primary expiry execution metadata",90],
 [R,"external-clock.yml",null,null,45]
];
const VARS=["P5_PRIMARY_FIDS_EXPIRY_ENABLED","P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA","P5_PRIMARY_FIDS_EXPIRY_APPROVAL","P5_PRIMARY_FIDS_BACKSTOP_ENABLED","P6_PRIVATE_EPOCH_EXPIRY_MODE","P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256","P5_RETENTION_READONLY_MONITOR_ENABLED","P6_ROLLING_CONTROLLER_ENABLED","P6_ROLLING_DIRECT_RECOVERY_ENABLED","P6_ROLLING_SCHEDULED_ROOT_ENABLED","P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED","P6_ROLLING_WINDOW_CUSTODY_ENABLED"];
const RVAR=["TRAVNR_RELAY_MODE","TRAVNR_RELAY_PRIMARY_ENABLED","TRAVNR_RELAY_ROLLING_ROUTE","TRAVNR_RELAY_DIRECT_TICK_APPROVED","TRAVNR_APPROVED_TARGET_MAIN_SHA","TRAVNR_CRON_RELAY_SHA"];
export function classifyRun(run,jobs,route,head,now){
 const [repo,file,job,step,maxAge]=route;
 if(!run)return {status:"NO_RECENT_RUN",currentMainExecution:false};
 need(id(run.id)&&["schedule","workflow_dispatch"].includes(run.event)&&run.head_branch==="main"&&run.path===".github/workflows/"+file,"RUN_SCOPE");
 const result={runId:run.id,head:run.head_sha,event:run.event,conclusion:run.conclusion??null,createdAtUtc:run.created_at,currentMainExecution:false};
 if(run.head_sha!==head)return {...result,status:"OLD_MAIN"};
 if(run.status!=="completed")return {...result,status:"NOT_COMPLETED"};
 if(run.conclusion!=="success"||run.run_attempt!==1)return {...result,status:"NOT_FIRST_ATTEMPT_SUCCESS"};
 if(!job)return {...result,status:"RELAY_METADATA_ONLY_FORWARDING_NOT_PROVEN"};
 const matching=jobs.filter(j=>j.name===job);
 if(matching.length!==1||matching[0].run_id!==run.id||matching[0].head_sha!==head||matching[0].run_attempt!==1||
    matching[0].conclusion!=="success"||matching[0].status!=="completed"||
    matching[0].steps?.filter(s=>s.name===step&&s.status==="completed"&&s.conclusion==="success").length!==1)
   return {...result,status:"ACTUAL_STEP_NOT_PROVEN"};
 const end=stamp(matching[0].completed_at);
 if(!Number.isFinite(end)||end>now||now-end>maxAge*60000)return {...result,status:"STALE_OR_INVALID_CLOCK"};
 return {...result,status:"FRESH_EXECUTED_STEP_METADATA_ONLY",jobId:matching[0].id,currentMainExecution:true};
}
export function classifyModes(p,r,head){
 const blockers=[];
 if(p.P5_PRIMARY_FIDS_EXPIRY_ENABLED!=="true"||p.P5_PRIMARY_FIDS_EXPIRY_APPROVAL!=="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER")blockers.push("PRIMARY_EXPIRY_NOT_ENABLED");
 if(p.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA!==head)blockers.push("PRIMARY_EXPIRY_MAIN_DRIFT");
 if(r.TRAVNR_APPROVED_TARGET_MAIN_SHA!==head||r.TRAVNR_CRON_RELAY_SHA!==RELAY)blockers.push("RELAY_PIN_DRIFT");
 if(r.TRAVNR_RELAY_PRIMARY_ENABLED!=="1"||p.P5_PRIMARY_FIDS_BACKSTOP_ENABLED!=="true")blockers.push("PRIMARY_BACKSTOP_NOT_ENABLED");
 if(p.P5_RETENTION_READONLY_MONITOR_ENABLED!=="true")blockers.push("SENTINEL_OFF");
 if(p.P6_PRIVATE_EPOCH_EXPIRY_MODE!=="APPLY_DUE_ONLY"||p.P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256!==MANIFEST)blockers.push("PRIVATE_EXPIRY_NOT_ACTIVELY_COMMISSIONED_FOR_CURRENT_MANIFEST");
 // Current main's primary backstop insists on COMMISSION_VERIFY_ONLY.
 // APPLY_DUE_ONLY must not be called backed up by that incompatible route.
 if(p.P6_PRIVATE_EPOCH_EXPIRY_MODE==="APPLY_DUE_ONLY")blockers.push("PRIMARY_BACKSTOP_PRIVATE_APPLY_MODE_COLLISION");
 return blockers;
}
const ghEnv=()=>Object.fromEntries(["PATH","HOME","GH_TOKEN","GITHUB_TOKEN","GH_CONFIG_DIR","XDG_CONFIG_HOME","LANG","LC_ALL","SSL_CERT_FILE","SSL_CERT_DIR"].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
const get=(repo,p)=>JSON.parse(execFileSync("gh",["api","--method","GET","repos/"+repo+"/"+p],{encoding:"utf8",env:{...ghEnv(),GH_PROMPT_DISABLED:"1",GIT_TERMINAL_PROMPT:"0"},stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:8*1024*1024}));
function readVars(repo,names){
 const rows={};
 for(const name of names){
  try{const r=get(repo,"actions/variables/"+name);need(r.name===name&&typeof r.value==="string","VAR_SCOPE");rows[name]=r.value;}
  catch{rows[name]=null;}
 }
 return rows;
}
const counts=async()=>{
 const {default:pg}=await import("pg");
 need(process.env.DATABASE_URL,"EXISTING_DB_REQUIRED");
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:8000,query_timeout:20000,options:"-c default_transaction_read_only=on"});
 let c;
 try{
  c=await pool.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='15000ms'");
  const q=(await c.query("SELECT current_database() db,current_setting('transaction_read_only') ro,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,clock_timestamp() t")).rows[0];
  need(q.db==="neondb"&&q.ro==="on"&&q.ver>=160000&&q.ver<170000&&q.replica===false,"DB_SCOPE");
  const row=(await c.query(`SELECT
  (SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE enabled) enabled_auth,
  (SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE manifest_sha256=$1 AND revoked_at_utc IS NULL) exact_auth,
  (SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) unresolved_incidents,
  (SELECT count(*)::int FROM clean.fids_query_response WHERE raw_payload IS NOT NULL AND (raw_expired_at_utc IS NOT NULL OR raw_persisted_at_utc<=clock_timestamp()-interval '24 hours')) hard_due_fids,
  (SELECT count(*)::int FROM clean.provider_content_blob_ref WHERE deletion_verified_at_utc IS NULL AND expires_at_utc<=clock_timestamp()) overdue_blob_refs,
  (SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39 WHERE retention_not_after_utc<=clock_timestamp()) due_private_packets,
  (SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE retention_not_after_utc<=clock_timestamp()) due_private_indexes,
  (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgenabled='O' AND tgname IN ('a00_phase5_fids_physical_rest_live_guard_v39','a00_phase5_other_physical_rest_live_guard_v39')) live_rest_guard_count,
  to_regprocedure('clean.phase6_private_epoch_expiry_status_v39(text)') IS NOT NULL private_expiry_status_function_present`,[MANIFEST])).rows[0];
  await c.query("ROLLBACK");return {observedAtUtc:new Date(q.t).toISOString(),...row};
 }finally{if(c){await c.query("ROLLBACK").catch(()=>{});c.release();}await pool.end();}
};
async function main(){
 need(process.argv.length===3&&process.argv[2]==="--read-only"&&process.env.GITHUB_ACTIONS!=="true","ARGS");
 const head=get(P,"git/ref/heads/main").object.sha,relay=get(R,"git/ref/heads/main").object.sha;
 need(sha(head)&&relay===RELAY,"MAIN_IDENTITY");
 const cmp=get(P,"compare/"+BASE+"..."+head);
 need(["identical","ahead"].includes(cmp.status)&&cmp.merge_base_commit?.sha===BASE&&Array.isArray(cmp.files)&&cmp.files.length<128&&cmp.files.every(f=>["added","modified"].includes(f.status)&&(f.filename==="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json"||/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(json|md)$/.test(f.filename))),"EXECUTABLE_MAIN_DRIFT");
 const p=readVars(P,VARS),r=readVars(R,RVAR);
 const history=[];
 for(const route of ROUTES){
  const [repo,file]=route;
  try{
   const target=repo===P?head:relay;
   const w=get(repo,"actions/workflows/"+file);
   const runs=get(repo,"actions/workflows/"+file+"/runs?branch=main&per_page=20").workflow_runs;
   need(Array.isArray(runs),"RUN_LIST");
   const run=runs.find(x=>["schedule","workflow_dispatch"].includes(x.event));
   const jobs=run?get(repo,"actions/runs/"+run.id+"/jobs?filter=latest&per_page=100"):null;
   need(!jobs||jobs.total_count===jobs.jobs.length,"JOB_LIST");
   history.push({file,workflowState:w.state,...classifyRun(run,jobs?.jobs??[],route,target,Date.now())});
  }catch{history.push({file,status:"HISTORY_UNVERIFIED",currentMainExecution:false});}
 }
 const db=await counts();
 need(get(P,"git/ref/heads/main").object.sha===head&&get(R,"git/ref/heads/main").object.sha===relay,"MAIN_CHANGED");
 console.log(JSON.stringify({status:"P6_UNATTENDED_READINESS_METADATA_ONLY_NO_GO",head,relay,db,
  modeBlockers:classifyModes(p,r,head),privateExpiryMode:["OFF","COMMISSION_VERIFY_ONLY","VERIFY_ONLY","APPLY_DUE_ONLY"].includes(p.P6_PRIVATE_EPOCH_EXPIRY_MODE)?p.P6_PRIVATE_EPOCH_EXPIRY_MODE:"UNKNOWN",
  history,limitations:["job step metadata is not a machine receipt","PITR settings/actual backup recovery are not fetched by SQL","private APPLY/backstop collision is based on current reviewed workflow","no claim of durable Packet B"],providerCalls:0,databaseWrites:0,githubWrites:0,phase6PaidGo:false},null,2));
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)main().catch(e=>{console.error(/^HOLD_P6_UNATTENDED_READONLY_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P6_UNATTENDED_READONLY_REDACTED");process.exitCode=2});
