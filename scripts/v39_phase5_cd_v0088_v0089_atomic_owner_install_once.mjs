/**
 * Phase5 V0088+V0089 ONE-TRANSACTION owner commissioner.
 *
 * REQUIRES owner to fetch ONE reviewed GitHub commit, verify exact Git blobs
 * of this script + V0088 + V0089, then run from private Replit Shell.
 *
 * This is a DDL/ACL change, NOT an autonomous PRE/source collector, paid
 * provider call, new GitHub credential, source review, or Phase6 GO.
 * Existing V0087 is already live and MUST NOT be installed again.
 *
 * V0088 and V0089 each include standalone BEGIN/COMMIT. This owner runner
 * strips their EXACT wrappers and executes both under ONE SERIALIZABLE
 * transaction, so V0088 cannot be left committed with an unsafe privileged
 * SECURITY DEFINER owner if V0089 fails.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
const {Client}=pg;
const OWNER_PERMIT="INSTALL_V0088_V0089_ATOMIC_GUARD_NO_WORKERS_NO_PAID";
const LOCAL="postgresql://phase5_cd_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const PRE_ROLE="phase5_fids_pre_writer_prod_20261107";
const GUARD_OWNER="phase5_cd_admission_guard_owner_v39";
const RECEIPT_TABLE="clean.phase5_cd_pre_admission_receipt_v39";
const ADMIT_SIG="clean.phase5_cd_admit_stage14_pre_v39(bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,text,text,text)";
const NEW_TRIGGERS=[
 "p5_cd_v0088_registered_pre_immutable_guard",
 "p5_cd_v0088_registered_pre_insert_guard"
];
const stop=(reason)=>{throw Error("HOLD_P5_CD_V0088_V0089_"+reason);};
function gitBlob(bytes){
 return createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0"))
  .update(bytes).digest("hex");
}
function source(path,sha,kind){
 if(typeof path!=="string"||
    !/^\/tmp\/p5-cd-v0088-v0089-[A-Za-z0-9]{6,16}\/(V0088|V0089)__[A-Za-z0-9_]+\.sql$/.test(path)||
    !/^[0-9a-f]{40}$/.test(sha??""))stop("PIN_OR_PRIVATE_PATH_INVALID");
 const bytes=readFileSync(path);
 const txt=bytes.toString("utf8");
 if(gitBlob(bytes)!==sha||bytes.length<2500||bytes.length>25000||
    !(txt.startsWith("-- "+kind+":")||txt.startsWith("-- "+kind+" "))||
    (txt.match(/^BEGIN;$/gm)||[]).length!==1||
    (txt.match(/^COMMIT;$/gm)||[]).length!==1||
    !txt.trimEnd().endsWith("COMMIT;"))stop("REVIEWED_SQL_GIT_BLOB_OR_TX_WRAPPER_CHANGED");
 return txt.replace(/^BEGIN;$/m,"").replace(/^COMMIT;$/m,"");
}
function admitted(env){
 if(env.P5_CD_V0088_V0089_OWNER_APPROVAL!==OWNER_PERMIT||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    !env.DATABASE_URL||
    env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.P5_V39_PRE_DATABASE_URL && env.GITHUB_ACTIONS==="true")
  stop("EXPLICIT_INERT_OWNER_AUTH_OR_NO_PAID_POLICY_MISSING");
 if(env.GITHUB_ACTIONS==="true"){
  if(env.P5_CD_V0088_V0089_DISPOSABLE_CI!=="1"||
     env.DATABASE_URL!==LOCAL)
   stop("CI_NOT_THE_DISPOSABLE_NON_SUPERUSER_PG16_OWNER");
 }else{
  if(env.P5_CD_V0088_V0089_DISPOSABLE_CI==="1")
   stop("PRODUCTION_MUST_NOT_USE_TEST_IDENTITY_OVERRIDE");
 }
}
function normTrigger(rows){
 return rows.map(x=>({name:x.tgname,enabled:x.tgenabled}))
  .sort((a,b)=>a.name.localeCompare(b.name));
}
async function before(c,env){
 const r=(await c.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('server_version_num')::integer AS ver,"+
  "pg_is_in_recovery() AS replica,"+
  "(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) AS super,"+
  "(SELECT rolcreaterole FROM pg_catalog.pg_roles WHERE rolname=current_user) AS may_roles,"+
  "(SELECT pg_catalog.pg_get_userbyid(n.nspowner) FROM pg_catalog.pg_namespace n"+
  " WHERE n.nspname='clean') AS schema_owner,"+
  "(SELECT pg_catalog.pg_get_userbyid(t.relowner) FROM pg_catalog.pg_class t"+
  " WHERE t.oid='clean.phase5_cd_pre_task_v39'::regclass) AS task_owner,"+
  "pg_catalog.has_schema_privilege(current_user,'clean','CREATE') AS may_create,"+
  "pg_catalog.has_table_privilege(current_user,'clean.flight_snapshots','TRIGGER') AS may_trigger,"+
  "to_regclass('clean.phase5_cd_pre_task_v39') IS NOT NULL AS existing_task,"+
  "to_regclass('clean.phase5_cd_pre_admission_receipt_v39') AS existing_receipt,"+
  "to_regprocedure($1) AS existing_admit"
  ,[ADMIT_SIG])).rows[0];
 if(!r||r.db!=="neondb"||r.ver<160000||r.replica!==false||
    r.actor!==(env.GITHUB_ACTIONS==="true"?
      "phase5_cd_ci_owner":"neondb_owner")||
    r.super!==false||r.may_roles!==true||
    r.schema_owner!==r.actor||r.task_owner!==r.actor||
    !r.may_create||!r.may_trigger||!r.existing_task||
    r.existing_receipt!==null||r.existing_admit!==null)
  stop("PG16_ROLE_SCHEMA_DDL_OWNERSHIP_OR_PARTIAL_V0088_NOT_SAFE");
 const group=(await c.query(
  "SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls"+
  " FROM pg_catalog.pg_roles WHERE rolname=$1",[PRE_ROLE])).rows;
 if(group.length!==1||group[0].rolcanlogin!==false||
    group[0].rolsuper||group[0].rolcreaterole||
    group[0].rolcreatedb||group[0].rolreplication||
    group[0].rolbypassrls)
  stop("EARLIER_PHASE5_NOLOGIN_PRE_ROLE_NOT_VERIFIED");
 const guard=(await c.query(
  "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=$1",[GUARD_OWNER])).rows;
 if(guard.length)stop("V0089_ROLE_ALREADY_EXISTS_NEVER_RERUN");
 const count=(await c.query(
  "SELECT count(*)::integer AS n FROM clean.phase5_cd_pre_task_v39")).rows[0];
 if(count?.n!==0)stop("V0087_QUEUE_NOT_EMPTY_NO_SCHEMA_CHANGE");
 const triggers=normTrigger((await c.query(
  "SELECT tgname,tgenabled FROM pg_catalog.pg_trigger"+
  " WHERE tgrelid='clean.flight_snapshots'::regclass AND NOT tgisinternal"
 )).rows);
 if(!triggers.some(x=>x.name==="trg_flight_snapshots_population_member"&&x.enabled==="O")||
    NEW_TRIGGERS.some(x=>triggers.some(y=>x===y.name)))
  stop("LEGACY_TRIGGER_NOT_ENABLED_OR_V0088_ALREADY_INSTALLED");
 return {actor:r.actor,triggers};
}
async function after(c,before){
 const r=(await c.query(
  "SELECT to_regclass($1) IS NOT NULL AS receipt,"+
  "(SELECT count(*)::integer FROM clean.phase5_cd_pre_task_v39) AS task_rows,"+
  "(SELECT count(*)::integer FROM clean.phase5_cd_pre_admission_receipt_v39) AS receipt_rows,"+
  "pg_catalog.pg_get_userbyid((SELECT p.proowner FROM pg_catalog.pg_proc p"+
  " WHERE p.oid=to_regprocedure($2))) AS guard_function_owner,"+
  "pg_catalog.has_function_privilege($3,$2,'EXECUTE') AS pre_guard_execute,"+
  "pg_catalog.has_table_privilege($3,'clean.phase5_cd_pre_task_v39','UPDATE') AS pre_queue_update,"+
  "pg_catalog.has_table_privilege($3,$1,'SELECT') AS pre_receipt_select,"+
  "pg_catalog.has_schema_privilege($4,'clean','CREATE') AS guard_create,"+
  "pg_catalog.pg_has_role(current_user,$4,'SET') AS creator_still_can_set_guard,"+
  "(SELECT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p"+
  " CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,"+
  "pg_catalog.acldefault('f',p.proowner))) a"+
  " WHERE p.oid=to_regprocedure($2) AND a.grantee=0"+
  " AND a.privilege_type='EXECUTE')) AS public_guard_execute"
  ,[RECEIPT_TABLE,ADMIT_SIG,PRE_ROLE,GUARD_OWNER])).rows[0];
 const owner=(await c.query(
  "SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls"+
  " FROM pg_catalog.pg_roles WHERE rolname=$1",[GUARD_OWNER])).rows[0];
 const beforeTriggers=before.triggers;
 const now=normTrigger((await c.query(
  "SELECT tgname,tgenabled FROM pg_catalog.pg_trigger"+
  " WHERE tgrelid='clean.flight_snapshots'::regclass AND NOT tgisinternal"
 )).rows);
 const expected=[
  ...beforeTriggers,...NEW_TRIGGERS.map(name=>({name,enabled:"O"}))
 ].sort((a,b)=>a.name.localeCompare(b.name));
 if(!r||!r.receipt||r.task_rows!==0||r.receipt_rows!==0||
    r.guard_function_owner!==GUARD_OWNER||!r.pre_guard_execute||
    r.pre_queue_update||r.pre_receipt_select||r.guard_create||
    r.creator_still_can_set_guard||r.public_guard_execute||
    !owner||owner.rolcanlogin||owner.rolsuper||owner.rolcreaterole||
    owner.rolcreatedb||owner.rolbypassrls||
    JSON.stringify(now)!==JSON.stringify(expected))
  stop("POST_DDL_ROLE_ACL_TRIGGERS_OR_ZERO_QUEUE_INVARIANT_FAILED");
 const runtime=(await c.query(
  "SELECT rolname,pg_catalog.has_function_privilege(rolname,$1,'EXECUTE') AS may_guard,"+
  "pg_catalog.has_table_privilege(rolname,$2,'SELECT') AS may_receipt"+
  " FROM pg_catalog.pg_roles WHERE rolname IN "+
  " ('travnr_runtime','travnr_v39_runtime_recovery1',"+
  "'phase5_p30_prepare_login_20261107','phase5_p30_witness_login_20261107')",
  [ADMIT_SIG,RECEIPT_TABLE])).rows;
 if(runtime.some(x=>x.may_guard||x.may_receipt))
  stop("LEGACY_RUNTIME_INHERITED_NEW_GUARD_OR_RECEIPT_PRIVILEGE");
 return {triggerNames:now.map(x=>x.name),
  legacyTriggerPreserved:true,guardOwner:GUARD_OWNER,
  preGuardExecute:true,preCanDirectUpdateTask:false,
  preCanSelectReceipt:false,untrustedRolesChecked:runtime.length};
}
export async function commissionP5CdV0088V0089AtomicOnce(env=process.env){
 admitted(env);
 const v8=source(env.P5_CD_V0088_FILE,env.P5_CD_V0088_SHA,"V0088");
 const v9=source(env.P5_CD_V0089_FILE,env.P5_CD_V0089_SHA,"V0089");
 if(!v8.includes("CREATE TRIGGER p5_cd_v0088_registered_pre_insert_guard")||
    !v8.includes("CREATE FUNCTION clean.phase5_cd_admit_stage14_pre_v39")||
    !v9.includes("CREATE ROLE phase5_cd_admission_guard_owner_v39")||
    !v9.includes("TEMPORARY_SET_MEMBERSHIP_NOT_REVOKED"))
  stop("REVIEWED_V0088_V0089_CONTENT_NOT_MATCHED");
 const c=new Client({
  connectionString:env.DATABASE_URL,connectionTimeoutMillis:10000,
  application_name:"phase5_cd_v0088_v0089_atomic_inert_ddl"
 });
 let connected=false,open=false,commitAttempted=false,stage='CONNECT';
 try{
  await c.connect();connected=true;
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");open=true;
  await c.query("SET LOCAL statement_timeout='30000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  const locked=(await c.query(
   "SELECT pg_catalog.pg_try_advisory_xact_lock("+
   "pg_catalog.hashtext('phase5-cd-schema-owner'),"+
   "pg_catalog.hashtext('v0088-v0089')) AS ok")).rows[0];
  if(!locked?.ok)stop("ANOTHER_CD_COMMISSION_RUNNING");
  stage="PRECHECK";
  const baseline=await before(c,env);
  stage="V0088";
  await c.query(v8);
  if(env.GITHUB_ACTIONS==="true" &&
     env.P5_CD_V0088_V0089_CI_INJECT_ROLLBACK_AFTER_V0088==="1")
    stop("CI_INJECTED_ROLLBACK_AFTER_V0088");
  stage="V0089";
  await c.query(v9);
  stage="PRECOMMIT_VERIFY";
  const verified=await after(c,baseline);
  // Changing the snapshot trigger and function ownership is one indivisible
  // COMMIT. Unknown COMMIT ACK is NEVER permission to rerun.
  stage="COMMIT";
  commitAttempted=true;
  await c.query("COMMIT");open=false;
  // Independent readback AFTER acknowledged COMMIT.
  stage="POSTCOMMIT_VERIFY";
  await after(c,baseline);
  return {
   schema:"v39.phase5.cd-v0088-v0089-inert-atomic-owner-commission.v1",
   status:"V0088_V0089_DURABLE_GUARD_INSTALLED_NO_WORKERS_NO_PROVIDER",
   database:"neondb",role:baseline.actor,
   v0088GitBlobSha:env.P5_CD_V0088_SHA,
   v0089GitBlobSha:env.P5_CD_V0089_SHA,
   queueRows:0,verified,
   actualStage14ProductionActivated:false,
   queueWorkerLoginCreated:false,
   queueWorkerSecretsCreated:false,
   providerCalls:0,paidProviderCalls:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(env.GITHUB_ACTIONS==="true"&&
     env.P5_CD_V0088_V0089_DISPOSABLE_CI==="1"&&env.DATABASE_URL===LOCAL){
    const sqlstate=typeof e?.code==="string"&&/^[0-9A-Z]{5}$/.test(e.code)?
     e.code:"UNKNOWN";
    const safe=typeof e?.message==="string"?
      e.message.replace(/[^a-zA-Z0-9_.: -]/g," ").slice(0,150):"";
    console.error("CI_ONLY_ATOMIC_INSTALL_STAGE_"+stage+
      "_SQLSTATE_"+sqlstate+" "+safe);
  }
  if(open&&!commitAttempted){
   const rollback=await c.query("ROLLBACK").then(()=>true).catch(()=>false);
   if(!rollback)
    stop("PRE_COMMIT_ROLLBACK_ACK_UNKNOWN_DO_NOT_RERUN");
  }
  if(commitAttempted)
   stop("COMMIT_OR_POSTCOMMIT_AMBIGUOUS_INDEPENDENT_REVIEW_NO_RERUN");
  throw e;
 }finally{
  if(connected)await c.end().catch(()=>{});
 }
}
async function main(){
 try{
  const result=await commissionP5CdV0088V0089AtomicOnce();
  console.log(JSON.stringify(result,null,2));
 }catch(e){
  // Never log a database URL, error details, credentials, FIDS content or
  // provider account response. Only reviewer-safe known hold codes.
  const msg=typeof e?.message==="string" &&
   /^HOLD_P5_CD_V0088_V0089_[A-Z0-9_]+$/.test(e.message)?
    e.message:"HOLD_P5_CD_V0088_V0089_DB_OR_UNEXPECTED_ERROR_NO_RERUN";
  console.error(msg);process.exitCode=2;
 }
}
if(process.argv[1]?.endsWith(
 "v39_phase5_cd_v0088_v0089_atomic_owner_install_once.mjs"))
 await main();
