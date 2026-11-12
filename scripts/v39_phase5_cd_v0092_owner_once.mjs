/**
 * Owner-only one-shot V0092 signed-roster scoped claim on LIVE V0087.
 * Reuses V0090 NOLOGIN function owner + existing Stage30 PRE group.
 *
 * Production owner must first fetch exact reviewed GitHub main SHA, and
 * verify THIS runner and SQL blob SHA with git hash-object privately.
 * NO provider, no flight task enrollment, no new LOGIN or PRE snapshot.
 * Unknown COMMIT acknowledgment => HOLD and NEVER blindly retry.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
const {Client}=pg;
const APPROVAL="INSTALL_ONLY_V0092_SIGNED_PACKET_CLAIM_NO_WORKERS_NO_PAID";
const LOCAL="postgresql://phase5_cd_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const PRE="phase5_fids_pre_writer_prod_20261107";
const OLD="clean.phase5_cd_claim_due_v39(text,integer,integer)";
const NEW="clean.phase5_cd_claim_signed_roster_v39(text[],text[],text,integer,integer)";
const OWNER="phase5_cd_queue_function_owner_v39";
function hold(x){throw Error("HOLD_P5_CD_V0092_"+x);}
function blob(bytes){
 return createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0"))
  .update(bytes).digest("hex");
}
function reviewedSql(env){
 const path=env.P5_CD_V0092_FILE,expected=env.P5_CD_V0092_SHA;
 if(typeof path!=="string"||
    !/^\/tmp\/p5-cd-v0092-[A-Za-z0-9]{6,16}\/V0092__[A-Za-z0-9_]+\.sql$/.test(path)||
    !/^[a-f0-9]{40}$/.test(expected??""))hold("REVIEWED_PRIVATE_SQL_PIN_MISSING");
 const bytes=readFileSync(path),sql=bytes.toString("utf8");
 if(bytes.length<5000||bytes.length>18000||blob(bytes)!==expected||
    !sql.startsWith("-- V0092:")||
    (sql.match(/^BEGIN;$/gm)||[]).length!==1||
    (sql.match(/^COMMIT;$/gm)||[]).length!==1||
    !sql.trimEnd().endsWith("COMMIT;")||
    !sql.includes("CREATE FUNCTION clean.phase5_cd_claim_signed_roster_v39")||
    !sql.includes("TEMPORARY_SET_ROLE_NOT_REVOKED"))
  hold("GIT_BLOB_OR_SQL_ROLE_CONTENT_DRIFT");
 return sql.replace(/^BEGIN;$/m,"").replace(/^COMMIT;$/m,"");
}
function safety(env){
 if(env.P5_CD_V0092_OWNER_APPROVAL!==APPROVAL||
    !env.DATABASE_URL||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.ADB_AUTO_COLLECT!=="0"||env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET)
  hold("EXPLICIT_INERT_OWNER_NO_PROVIDER_APPROVAL_REQUIRED");
 if(env.GITHUB_ACTIONS==="true"){
  if(env.P5_CD_V0092_DISPOSABLE_CI!=="1"||env.DATABASE_URL!==LOCAL)
   hold("CI_MUST_BE_NON_SUPERUSER_DISPOSABLE_PG16_ONLY");
 }else if(env.P5_CD_V0092_DISPOSABLE_CI==="1")
   hold("UNTRUSTED_PRODUCTION_CI_OVERRIDE");
}
async function before(c,env){
 const a=(await c.query(
  "SELECT current_database() db,current_user role,"+
  "current_setting('server_version_num')::integer major,"+
  "pg_is_in_recovery() replica,"+
  "(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) super,"+
  "(SELECT rolcreaterole FROM pg_catalog.pg_roles WHERE rolname=current_user) can_role,"+
  "(SELECT pg_catalog.pg_get_userbyid(nspowner) FROM pg_catalog.pg_namespace WHERE nspname='clean') schema_owner,"+
  "(SELECT pg_catalog.pg_get_userbyid(relowner) FROM pg_catalog.pg_class WHERE oid='clean.phase5_cd_pre_task_v39'::regclass) task_owner,"+
  "(SELECT pg_catalog.pg_get_userbyid(proowner) FROM pg_catalog.pg_proc WHERE oid=to_regprocedure($1)) legacy_owner,"+
  "pg_catalog.has_schema_privilege(current_user,'clean','CREATE') can_create,"+
  "to_regprocedure($2) new_function,"+
  "to_regclass('clean.phase5_cd_one_signed_packet_per_horizon_v39') index_present,"+
  "(SELECT count(*)::integer FROM clean.phase5_cd_pre_task_v39) rows",
  [OLD,NEW])).rows[0];
 const actor=env.GITHUB_ACTIONS==="true"?"phase5_cd_ci_owner":"neondb_owner";
 if(!a||a.db!=="neondb"||a.role!==actor||a.major<160000||
    a.replica!==false||a.super!==false||a.can_role!==true||
    a.schema_owner!==actor||a.task_owner!==actor||
    a.legacy_owner!==OWNER||!a.can_create||
    a.new_function!==null||a.index_present!==null||a.rows!==0)
  hold("REAL_ROLE_TASKS_OR_ALREADY_INSTALLED_NOT_REVIEWED");
 const r=(await c.query(
  "SELECT rolcanlogin,rolsuper,rolcreaterole,rolbypassrls"+
  " FROM pg_catalog.pg_roles WHERE rolname=$1",[OWNER])).rows[0];
 if(!r||r.rolcanlogin||r.rolsuper||r.rolcreaterole||r.rolbypassrls||
    !(await c.query(
     "SELECT pg_catalog.has_function_privilege($1,$2,'EXECUTE') old,"+
     "pg_catalog.has_table_privilege($1,'clean.phase5_cd_pre_task_v39','UPDATE') direct",
     [PRE,OLD])).rows.some(x=>x.old&&!x.direct))
  hold("OLD_QUEUE_OWNER_OR_PRE_ACL_NOT_RESTRICTED");
 return{actor};
}
async function after(c,baseline){
 const a=(await c.query(
  "SELECT (SELECT count(*)::integer FROM clean.phase5_cd_pre_task_v39) rows,"+
  "to_regclass('clean.phase5_cd_one_signed_packet_per_horizon_v39') IS NOT NULL indexed,"+
  "(SELECT pg_catalog.pg_get_userbyid(proowner) FROM pg_catalog.pg_proc WHERE oid=to_regprocedure($1)) new_owner,"+
  "pg_catalog.has_function_privilege($2,$1,'EXECUTE') new_exec,"+
  "pg_catalog.has_function_privilege($2,$3,'EXECUTE') old_exec,"+
  "pg_catalog.has_table_privilege($2,'clean.phase5_cd_pre_task_v39','UPDATE') direct,"+
  "pg_catalog.has_schema_privilege($4,'clean','CREATE') can_create,"+
  "pg_catalog.pg_has_role(current_user,$4,'SET') can_set",
  [NEW,PRE,OLD,OWNER])).rows[0];
 if(!a||a.rows!==0||!a.indexed||a.new_owner!==OWNER||
    !a.new_exec||a.old_exec||a.direct||a.can_create||a.can_set)
  hold("V0092_POSTCOMMIT_OWNER_GRANTS_OR_EMPTY_QUEUE_NOT_SAFE");
 const pubs=(await c.query(
  "SELECT a.privilege_type FROM pg_catalog.pg_proc p"+
  " CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE("+
  "p.proacl,pg_catalog.acldefault('f',p.proowner))) a"+
  " WHERE p.oid=to_regprocedure($1) AND a.grantee=0",
  [NEW])).rows;
 if(pubs.some(x=>x.privilege_type==="EXECUTE"))
  hold("PUBLIC_OR_UNREVIEWED_SOURCE_EXECUTE_LEAK");
 return{queueRows:0,
  realDatabase:"neondb",ownerDbRole:baseline.actor,
  functionOwner:OWNER,existingPreRole:PRE,
  signedOnlyClaimExecute:true,
  oldUnscopedPreClaimRevoked:true,
  directPreQueueUpdateGranted:false,
  newLoginCreated:false,realTasksEnrolled:0};
}
export async function commissionP5CdV0092Once(env=process.env){
 safety(env);
 const sql=reviewedSql(env);
 const db=new Client({
  connectionString:env.DATABASE_URL,connectionTimeoutMillis:8000,
  application_name:"p5_cd_v0092_signed_claim_no_provider"
 });
 let connected=false,inTx=false,commitAttempted=false;
 try{
  await db.connect();connected=true;
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  inTx=true;
  await db.query("SET LOCAL lock_timeout='3000ms'");
  await db.query("SET LOCAL statement_timeout='30000ms'");
  const lock=(await db.query(
   "SELECT pg_catalog.pg_try_advisory_xact_lock("+
   "pg_catalog.hashtext('phase5-cd-schema-owner'),"+
   "pg_catalog.hashtext('v0092-signed-roster')) AS ok")).rows[0];
  if(!lock?.ok)hold("CONCURRENT_QUEUE_SCHEMA_OWNER_OPERATION");
  const b=await before(db,env);
  await db.query(sql);
  const verified=await after(db,b);
  commitAttempted=true;
  await db.query("COMMIT");inTx=false;
  await after(db,b);
  return{
   schema:"v39.phase5.cd-v0092-signed-packet-horizon-claim-owner.v1",
   status:"V0092_SIGNED_PACKET_HORIZON_CLAIM_COMMISSIONED_INERT",
   reviewedSqlGitBlob:env.P5_CD_V0092_SHA,
   verified,
   providerCalls:0,paidProviderCalls:0,
   githubWorkerScheduled:false,sourceRightsCertifiedHere:false,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(inTx&&!commitAttempted){
   const rolled=await db.query("ROLLBACK").then(()=>true).catch(()=>false);
   if(!rolled)hold("PRE_COMMIT_ROLLBACK_UNCERTAIN_NO_RETRY");
  }
  if(commitAttempted)
   hold("COMMIT_OR_POSTCOMMIT_ACK_UNKNOWN_NO_RETRY");
  throw e;
 }finally{
  if(connected)await db.end().catch(()=>{});
 }
}
if(process.argv[1]?.endsWith("v39_phase5_cd_v0092_owner_once.mjs")){
 try{console.log(JSON.stringify(await commissionP5CdV0092Once(),null,2));}
 catch(e){
  const msg=typeof e?.message==="string"&&
   /^HOLD_P5_CD_V0092_[A-Z0-9_]+$/.test(e.message)?
    e.message:"HOLD_P5_CD_V0092_DB_OR_UNEXPECTED_ERROR_NO_RETRY";
  console.error(msg);process.exitCode=2;
 }
}
