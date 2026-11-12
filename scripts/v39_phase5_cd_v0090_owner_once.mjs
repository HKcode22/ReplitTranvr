/**
 * V0090 one-shot owner commission of EXISTING V0087 queue functions only.
 * LIVE V0087/V0088/V0089 must already exist; never rerun those installers.
 * No provider/API, new LOGIN, secret, task enrollment, PRE row or worker.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
const {Client}=pg;
const SIGS=[
 "clean.phase5_cd_claim_due_v39(text,integer,integer)",
 "clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)",
 "clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text)",
 "clean.phase5_cd_reap_once_v39(integer)"
];
const GUARD="phase5_cd_admission_guard_owner_v39";
const QUEUE_OWNER="phase5_cd_queue_function_owner_v39";
const PRE="phase5_fids_pre_writer_prod_20261107";
const ACTIVATE="INSTALL_ONLY_V0090_QUEUE_FUNCTION_OWNER_NO_WORKERS_NO_PAID";
const LOCAL="postgresql://phase5_cd_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const hold=s=>{throw Error("HOLD_P5_CD_V0090_"+s)};
function gitBlob(b){
 return createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
}
function envGuard(e){
 if(e.P5_CD_V0090_OWNER_APPROVAL!==ACTIVATE||!e.DATABASE_URL||
    e.V39_PHASE6_PROCESS_ARMED!=="0"||e.ADB_AUTO_COLLECT!=="0"||
    e.AERODATABOX_API_KEY||e.AERODATABOX_WEBHOOK_SECRET)
  hold("EXPLICIT_OWNER_INERT_NO_PAID_APPROVAL_REQUIRED");
 if(e.GITHUB_ACTIONS==="true"){
   if(e.P5_CD_V0090_DISPOSABLE_CI!=="1"||e.DATABASE_URL!==LOCAL)
    hold("CI_MUST_BE_DISPOSABLE_NON_SUPERUSER_PG16_ONLY");
 }else if(e.P5_CD_V0090_DISPOSABLE_CI==="1")
    hold("UNTRUSTED_PRODUCTION_DISPOSABLE_OVERRIDE");
}
function readSql(e){
 const file=e.P5_CD_V0090_FILE,sha=e.P5_CD_V0090_SHA;
 if(typeof file!=="string"||
    !/^\/tmp\/p5-cd-v0090-[A-Za-z0-9]{6,16}\/V0090__[A-Za-z0-9_]+\.sql$/.test(file)||
    typeof sha!=="string"||!/^[0-9a-f]{40}$/.test(sha))
  hold("PINNED_PRIVATE_SQL_PATH_REQUIRED");
 const bytes=readFileSync(file),sql=bytes.toString("utf8");
 if(bytes.length<5000||bytes.length>18000||
    gitBlob(bytes)!==sha||
    !sql.startsWith("-- V0090:")||
    (sql.match(/^BEGIN;$/gm)||[]).length!==1||
    (sql.match(/^COMMIT;$/gm)||[]).length!==1||
    !sql.trimEnd().endsWith("COMMIT;")||
    !sql.includes("CREATE ROLE phase5_cd_queue_function_owner_v39")||
    !sql.includes("TEMPORARY_SET_ROLE_NOT_REVOKED"))
  hold("REVIEWED_SQL_GIT_BLOB_OR_ROLE_GUARD_DRIFT");
 return sql.replace(/^BEGIN;$/m,"").replace(/^COMMIT;$/m,"");
}
async function preflight(c,e){
 const m=(await c.query(
  "SELECT current_database() AS db,current_user AS role,"+
  "current_setting('server_version_num')::integer AS ver,"+
  "pg_is_in_recovery() AS replica,"+
  "(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) AS super,"+
  "(SELECT rolcreaterole FROM pg_catalog.pg_roles WHERE rolname=current_user) AS may_roles,"+
  "(SELECT pg_catalog.pg_get_userbyid(n.nspowner) FROM pg_catalog.pg_namespace n"+
  " WHERE n.nspname='clean') AS schema_owner,"+
  "(SELECT pg_catalog.pg_get_userbyid(t.relowner) FROM pg_catalog.pg_class t"+
  " WHERE t.oid='clean.phase5_cd_pre_task_v39'::regclass) AS task_owner,"+
  "pg_catalog.has_schema_privilege(current_user,'clean','CREATE') AS can_create,"+
  "pg_catalog.has_table_privilege(current_user,'clean.flight_snapshots',"+
  "'SELECT WITH GRANT OPTION') AS can_grant_snapshot_select,"+
  "to_regclass('clean.phase5_cd_pre_admission_receipt_v39') IS NOT NULL AS receipt"
 )).rows[0];
 const actor=e.GITHUB_ACTIONS==="true"?"phase5_cd_ci_owner":"neondb_owner";
 if(!m||m.db!=="neondb"||m.role!==actor||m.ver<160000||
    m.replica!==false||m.super!==false||m.may_roles!==true||
    m.schema_owner!==actor||m.task_owner!==actor||
    !m.can_create||!m.can_grant_snapshot_select||!m.receipt)
  hold("TEAM_PG16_ROLE_OR_GRANT_AUTHORITY_NOT_VERIFIED");
 const q=(await c.query(
  "SELECT count(*)::integer n FROM clean.phase5_cd_pre_task_v39")).rows[0];
 if(q?.n!==0)hold("QUEUE_ALREADY_HAS_TASKS_NO_RECOMMISSION");
 const prev=(await c.query(
  "SELECT pg_catalog.pg_get_userbyid(proowner) AS owner,"+
  "pg_catalog.pg_get_function_identity_arguments(oid) AS args"+
  " FROM pg_catalog.pg_proc WHERE oid=ANY($1::regprocedure[])",
  [SIGS])).rows;
 if(prev.length!==4||prev.some(x=>x.owner!==actor))
   hold("EXISTING_QUEUE_FUNCTION_OWNERSHIP_DRIFT");
 const r=(await c.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolcreaterole"+
  " FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",
  [[GUARD,QUEUE_OWNER,PRE,"phase5_p30_pre_login_20261107"]])).rows;
 if(r.some(x=>x.rolname===QUEUE_OWNER)||
    !r.some(x=>x.rolname===GUARD&&!x.rolcanlogin)||
    !r.some(x=>x.rolname===PRE&&!x.rolcanlogin)||
    !r.some(x=>x.rolname==="phase5_p30_pre_login_20261107"&&x.rolcanlogin)||
    !m.can_grant_snapshot_select)
   hold("STAGE30_PRE_OR_V0089_GUARD_NOT_PRESENT_OR_DUPLICATE");
 const trigger=(await c.query(
  "SELECT tgname,tgenabled FROM pg_catalog.pg_trigger"+
  " WHERE tgrelid='clean.flight_snapshots'::regclass AND NOT tgisinternal")).rows;
 const names=["p5_cd_v0088_registered_pre_insert_guard",
 "p5_cd_v0088_registered_pre_immutable_guard",
 "trg_flight_snapshots_population_member"];
 if(trigger.length!==3||names.some(x=>
   !trigger.some(t=>t.tgname===x&&t.tgenabled==="O")))
  hold("EXPECTED_THREE_ACTIVE_SNAPSHOT_TRIGGERS_NOT_VERIFIED");
 return {db:m.db,actor,triggerCount:3};
}
async function postflight(c,b){
 const p=(await c.query(
  "SELECT pg_catalog.pg_get_userbyid(proowner) AS owner FROM pg_catalog.pg_proc"+
  " WHERE oid=ANY($1::regprocedure[])",[SIGS])).rows;
 if(p.length!==4||p.some(x=>x.owner!==QUEUE_OWNER))
  hold("QUEUE_CONTROL_FUNCTION_OWNER_NOT_NOLOGIN");
 const r=(await c.query(
  "SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls"+
  " FROM pg_catalog.pg_roles WHERE rolname=$1",[QUEUE_OWNER])).rows[0];
 if(!r||r.rolcanlogin||r.rolsuper||r.rolcreaterole||
    r.rolcreatedb||r.rolbypassrls)
  hold("QUEUE_FUNCTION_OWNER_NOT_RESTRICTED");
 const checks=(await c.query(
  "SELECT pg_catalog.pg_has_role(current_user,$1,'SET') AS owner_can_set,"+
  "pg_catalog.has_table_privilege($2,'clean.phase5_cd_pre_task_v39','UPDATE') AS pre_direct_update,"+
  "pg_catalog.has_table_privilege($2,'clean.flight_snapshots','DELETE') AS pre_can_delete,"+
  "pg_catalog.has_table_privilege($1,'clean.flight_snapshots','INSERT') AS owner_can_insert_pre,"+
  "pg_catalog.has_schema_privilege($1,'clean','CREATE') AS owner_can_create",
  [QUEUE_OWNER,PRE])).rows[0];
 if(!checks||checks.owner_can_set||checks.pre_direct_update||
    checks.pre_can_delete||checks.owner_can_insert_pre||checks.owner_can_create)
  hold("QUEUE_FUNCTION_PRIVILEGE_ESCALATION");
 for(const sig of SIGS){
  const g=(await c.query(
   "SELECT pg_catalog.has_function_privilege($1,$2,'EXECUTE') AS pre_exec,"+
   "COALESCE((SELECT pg_catalog.has_function_privilege(r.rolname,$2,'EXECUTE')"+
   " FROM pg_catalog.pg_roles r WHERE r.rolname='travnr_runtime'),false)"+
   " AS runtime_exec",
   [PRE,sig])).rows[0];
  if(!g||!g.pre_exec||g.runtime_exec)
   hold("PRE_FUNCTION_EXECUTE_NOT_EXCLUSIVE");
 }
 const q=(await c.query(
  "SELECT count(*)::integer n FROM clean.phase5_cd_pre_task_v39")).rows[0];
 if(q?.n!==0)hold("QUEUE_TASK_ROWS_CHANGED");
 return {queueRows:0,role:b.actor,functionOwner:QUEUE_OWNER,
  existingPreRole:PRE,controlFunctionsCommissioned:4,
  directQueueUpdateGrantedToPre:false,originalTriggersPreserved:true};
}
export async function commissionP5CdV0090Once(e=process.env){
 envGuard(e);
 const sql=readSql(e);
 const c=new Client({connectionString:e.DATABASE_URL,connectionTimeoutMillis:8000,
    application_name:"phase5_cd_v0090_no_paid_queue_functions"});
 let connected=false,inTx=false,commitAttempted=false;
 try{
  await c.connect();connected=true;
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");inTx=true;
  await c.query("SET LOCAL statement_timeout='30000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  const locked=(await c.query(
   "SELECT pg_catalog.pg_try_advisory_xact_lock("+
   "pg_catalog.hashtext('phase5-cd-schema-owner'),"+
   "pg_catalog.hashtext('v0090-queue')) AS ok")).rows[0];
  if(!locked?.ok)hold("OWNER_COMMISSION_CONCURRENT");
  const b=await preflight(c,e);
  await c.query(sql);
  const verified=await postflight(c,b);
  commitAttempted=true;
  await c.query("COMMIT");inTx=false;
  await postflight(c,b);
  return {schema:"v39.phase5.cd-v0090-queue-control-no-login-once.v1",
   status:"V0090_EXISTING_PRE_ONLY_QUEUE_FUNCTIONS_COMMISSIONED_NO_PAID",
   reviewedMigrationGitBlob:e.P5_CD_V0090_SHA,verified,
   queueRows:0,preWriterProductionInvoked:false,
   githubWorkerScheduled:false,sourceOriginalRightsCertified:false,
   databaseWritesToFlightRows:0,providerCalls:0,paidProviderCalls:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false};
 }catch(err){
  if(inTx&&!commitAttempted){
   const ok=await c.query("ROLLBACK").then(()=>true).catch(()=>false);
   if(!ok)hold("PRE_COMMIT_ROLLBACK_UNCERTAIN_DO_NOT_RETRY");
  }
  if(commitAttempted)hold("COMMIT_OR_READBACK_UNCERTAIN_DO_NOT_RETRY");
  throw err;
 }finally{if(connected)await c.end().catch(()=>{});}
}
if(process.argv[1]?.endsWith("v39_phase5_cd_v0090_owner_once.mjs")){
 try{console.log(JSON.stringify(await commissionP5CdV0090Once(),null,2))}
 catch(e){
  const safe=typeof e?.message==="string"&&
    /^HOLD_P5_CD_V0090_[A-Z0-9_]+$/.test(e.message)?
    e.message:"HOLD_P5_CD_V0090_DB_OR_UNEXPECTED_ERROR_NO_RETRY";
  console.error(safe);process.exitCode=2;
 }
}
