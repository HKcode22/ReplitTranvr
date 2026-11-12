/**
 * Phase5 V0091 one-shot owner commissioner:
 * Only source-bound registration-function DDL / ACL. No API, source GET,
 * original record, PRE task enrollment, new LOGIN, GH workflow or paid call.
 *
 * Caller must pin exact main SHA and Git object blob of this script+V0091
 * using a private temporary Replit Shell directory BEFORE invocation.
 * The pre-existing LIVE V0087/V0088/V0089/V0090 are NOT reinstalled.
 */
import "dotenv/config";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";
const {Client}=pg;
const APPROVAL="INSTALL_ONLY_V0091_SOURCE_BOUND_PREPARE_FUNCTION_NO_PROVIDER";
const CI_URL="postgresql://phase5_cd_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const F="clean.phase5_cd_register_source_flight_v39("+
 "text,text,text,text,timestamptz,text,text,text,text,integer)";
const ROLE="phase5_cd_source_registration_owner_v39";
const PREP="phase5_fids_prepare_prod_20261107";
const stop=(x)=>{throw Error("HOLD_P5_CD_V0091_"+x);};
function gitBlob(bytes){
 return createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0")).update(bytes)
  .digest("hex");
}
function allowed(e){
 if(e.P5_CD_V0091_OWNER_APPROVAL!==APPROVAL||
    !e.DATABASE_URL||e.ADB_AUTO_COLLECT!=="0"||
    e.V39_PHASE6_PROCESS_ARMED!=="0"||
    e.AERODATABOX_API_KEY||e.AERODATABOX_WEBHOOK_SECRET)
  stop("INERT_EXPLICIT_OWNER_APPROVAL_OR_NO_PAID_POLICY_MISSING");
 if(e.GITHUB_ACTIONS==="true"){
  if(e.P5_CD_V0091_DISPOSABLE_CI!=="1"||
     e.DATABASE_URL!==CI_URL)
   stop("DISPOSABLE_CI_DATABASE_OR_ROLE_MISMATCH");
 }else if(e.P5_CD_V0091_DISPOSABLE_CI==="1")
  stop("LIVE_MUST_NOT_USE_DISPOSABLE_CI_OVERRIDE");
}
function checkedSQL(e){
 const file=e.P5_CD_V0091_FILE,sha=e.P5_CD_V0091_SHA;
 if(typeof file!=="string"||
    !/^\/tmp\/p5-cd-v0091-[A-Za-z0-9]{6,16}\/V0091__[A-Za-z0-9_]+\.sql$/.test(file)||
    typeof sha!=="string"||!/^[0-9a-f]{40}$/.test(sha))
  stop("PINNED_PRIVATE_SQL_FILE_OR_SHA_INVALID");
 const bytes=readFileSync(file),sql=bytes.toString("utf8");
 if(bytes.length<7500||bytes.length>26000||
    gitBlob(bytes)!==sha||!sql.startsWith("-- V0091:")||
    (sql.match(/^BEGIN;$/gm)||[]).length!==1||
    (sql.match(/^COMMIT;$/gm)||[]).length!==1||
    !sql.trimEnd().endsWith("COMMIT;")||
    !sql.includes("CREATE FUNCTION clean.phase5_cd_register_source_flight_v39(")||
    !sql.includes("NOLOGIN NOINHERIT")||
    !sql.includes("P5_CD_V0091_TEMPORARY_ROLE_SET_NOT_REVOKED"))
  stop("REVIEWED_SQL_GIT_BLOB_OR_TRANSACTION_WRAPPER_MISMATCH");
 return sql.replace(/^BEGIN;$/m,"").replace(/^COMMIT;$/m,"");
}
async function before(c,e){
 const row=(await c.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('server_version_num')::int AS ver,"+
  "pg_is_in_recovery() AS replica,"+
  "(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) AS super,"+
  "(SELECT rolcreaterole FROM pg_catalog.pg_roles WHERE rolname=current_user) AS can_roles,"+
  "(SELECT pg_catalog.pg_get_userbyid(n.nspowner) FROM pg_catalog.pg_namespace n WHERE n.nspname='clean') AS schema_owner,"+
  "(SELECT pg_catalog.pg_get_userbyid(t.relowner) FROM pg_catalog.pg_class t WHERE t.oid='clean.phase5_cd_pre_task_v39'::regclass) AS task_owner,"+
  "pg_catalog.has_schema_privilege(current_user,'clean','CREATE') AS schema_create,"+
  "to_regclass('clean.phase5_cd_pre_task_v39') IS NOT NULL AS queue,"+
  "to_regclass('clean.phase5_fids_original_binding_v39') IS NOT NULL AS originals,"+
  "to_regprocedure($1) IS NOT NULL AS already_installed",
  [F])).rows[0];
 const who=e.GITHUB_ACTIONS==="true"?"phase5_cd_ci_owner":"neondb_owner";
 if(!row||row.db!=="neondb"||row.actor!==who||row.ver<160000||
    row.replica!==false||row.super!==false||row.can_roles!==true||
    row.schema_owner!==who||row.task_owner!==who||
    !row.schema_create||!row.queue||!row.originals||row.already_installed)
  stop("REAL_PG16_OWNER_OLD_QUEUE_OR_NEW_FUNCTION_ALREADY_INSTALLED");
 const q=(await c.query(
  "SELECT count(*)::integer AS n FROM clean.phase5_cd_pre_task_v39")).rows[0];
 if(q.n!==0)stop("REAL_QUEUE_NOT_EMPTY_NO_ROLE_CHANGE");
 const roles=(await c.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolcreaterole "+
  "FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",
  [[ROLE,PREP,"phase5_p30_prepare_login_20261107"]])).rows;
 if(roles.length!==2||
    !roles.some(x=>x.rolname===PREP&&!x.rolcanlogin&&!x.rolsuper&&!x.rolcreaterole)||
    !roles.some(x=>x.rolname==="phase5_p30_prepare_login_20261107"&&x.rolcanlogin&&!x.rolsuper&&!x.rolcreaterole)||
    !((await c.query(
     "SELECT pg_catalog.pg_has_role($1,$2,'SET') AS yes",
     ["phase5_p30_prepare_login_20261107",PREP])).rows[0]?.yes))
   stop("RESTRICTED_EXISTING_STAGE30_PREPARE_ROLES_NOT_VERIFIED");
 return {database:row.db,actor:row.actor,queueRows:0};
}
async function after(c,b){
 const row=(await c.query(
  "SELECT pg_catalog.pg_get_userbyid((SELECT p.proowner "+
  " FROM pg_catalog.pg_proc p WHERE p.oid=to_regprocedure($1))) AS actual_owner,"+
  "pg_catalog.has_function_privilege($2,$1,'EXECUTE') AS prepare_exec,"+
  "pg_catalog.has_function_privilege('phase5_fids_pre_writer_prod_20261107',$1,'EXECUTE') AS pre_exec,"+
  "pg_catalog.has_function_privilege('phase5_fids_source_prod_20261107',$1,'EXECUTE') AS source_exec,"+
  "pg_catalog.has_table_privilege($2,'clean.phase5_cd_pre_task_v39','INSERT') AS direct_insert,"+
  "pg_catalog.has_table_privilege($2,'clean.phase5_cd_pre_task_v39','UPDATE') AS direct_update,"+
  "pg_catalog.pg_has_role(current_user,$3,'SET') AS owner_can_set,"+
  "pg_catalog.has_schema_privilege($3,'clean','CREATE') AS owner_can_create,"+
  "(SELECT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL"+
  " pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) acl"+
  " WHERE p.oid=to_regprocedure($1) AND acl.grantee=0 AND acl.privilege_type='EXECUTE')) AS public_exec",
  [F,PREP,ROLE])).rows[0];
 const meta=(await c.query(
  "SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls"+
  " FROM pg_catalog.pg_roles WHERE rolname=$1",[ROLE])).rows[0];
 const count=(await c.query(
  "SELECT count(*)::integer n FROM clean.phase5_cd_pre_task_v39")).rows[0];
 if(!row||row.actual_owner!==ROLE||!row.prepare_exec||
    row.pre_exec||row.source_exec||row.direct_insert||row.direct_update||
    row.owner_can_set||row.owner_can_create||row.public_exec||
    !meta||Object.values(meta).some(x=>x===true)||count?.n!==0)
   stop("POST_SQL_OWNER_PRIVILEGE_OR_ZERO_QUEUE_VERIFICATION_FAILED");
 return {queueRows:0,role:b.actor,functionOwner:ROLE,
  existingPrepareGroup:PREP,prepareCanCallReviewedRegister:true,
  prepareCanDirectInsert:false,sourcePaidLoginNewlyCreated:false,
  existingSnapshotAndV0087QueuePreserved:true};
}
export async function commissionP5CdV0091Once(e=process.env){
 allowed(e);
 const sql=checkedSQL(e);
 const c=new Client({connectionString:e.DATABASE_URL,
  connectionTimeoutMillis:9000,
  application_name:"p5_cd_v0091_source_register_inert_ddl"});
 let connected=false,inTx=false,commitAttempted=false;
 try{
  await c.connect();connected=true;
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");inTx=true;
  await c.query("SET LOCAL lock_timeout='3000ms'");
  await c.query("SET LOCAL statement_timeout='35000ms'");
  const lock=(await c.query(
   "SELECT pg_catalog.pg_try_advisory_xact_lock("+
   "pg_catalog.hashtext('phase5-cd-schema-owner'),"+
   "pg_catalog.hashtext('v0091-enrollment')) AS ok")).rows[0];
  if(!lock?.ok)stop("CONCURRENT_REGISTRATION_SCHEMA_INSTALLER");
  const baseline=await before(c,e);
  await c.query(sql);
  const verified=await after(c,baseline);
  commitAttempted=true;
  await c.query("COMMIT");inTx=false;
  await after(c,baseline);
  return {
   schema:"v39.phase5.cd-v0091-source-registration-no-provider-owner.v1",
   status:"V0091_SOURCE_BOUND_PREPARE_ONLY_FUNCTION_COMMISSIONED_INERT",
   reviewedMigrationGitBlob:e.P5_CD_V0091_SHA,verified,
   queueRows:0,taskEnrollments:0,flightSnapshotsWritten:0,
   newGithubActionsSecrets:0,providerCalls:0,paidProviderCalls:0,
   githubWorkerScheduled:false,sourceContentRightsIndependentlyCertified:false,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }catch(err){
  if(inTx&&!commitAttempted){
   const rolled=await c.query("ROLLBACK").then(()=>true).catch(()=>false);
   if(!rolled)stop("PRECOMMIT_ROLLBACK_AMBIGUOUS_NO_REPEAT");
  }
  if(commitAttempted)stop("COMMIT_OR_READBACK_AMBIGUOUS_NO_REPEAT");
  throw err;
 }finally{
  if(connected)await c.end().catch(()=>{});
 }
}
if(process.argv[1]?.endsWith("v39_phase5_cd_v0091_owner_once.mjs")){
 try{console.log(JSON.stringify(await commissionP5CdV0091Once(),null,2));}
 catch(err){
  const s=err?.message;
  const safe=typeof s==="string"&&/^HOLD_P5_CD_V0091_[A-Z0-9_]+$/.test(s)
   ?s:"HOLD_P5_CD_V0091_UNEXPECTED_DB_OR_CREDENTIAL_ERROR_NO_REPEAT";
  console.error(safe);process.exitCode=2;
 }
}
