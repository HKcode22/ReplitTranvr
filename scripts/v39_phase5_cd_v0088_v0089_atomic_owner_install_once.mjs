/**
 * Phase5 C+D reviewed V0088+V0089 ONE-TRANSACTION commissioning installer.
 *
 * LIVE side effects: creates ONLY C+D admission receipt/function/triggers and
 * one NOLOGIN definer role; grants EXECUTE only to the EXISTING restricted
 * Phase5 PRE NOLOGIN group. Does NOT create queue tasks, logins, source
 * originals, PRE, provider calls, GH schedules, user secrets, or paid GO.
 *
 * Must be loaded from an exact SHA-pinned GitHub blob, with both SQL scripts
 * independently SHA-pinned; never edit the review SQL in Replit. Existing
 * V0087 queue MUST have zero rows. Never call again after any post-commit
 * error until independent read-only catalog reconciliation.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
const {Client}=pg;
const GO="COMMISSION_V0088_V0089_INERT_SQL_WITH_NO_PAID_NO_WORKERS";
const LIVE_ACTOR="neondb_owner";
const CI_URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const SRC=[
 ["P5_CD_V0088_SQL_FILE","P5_CD_V0088_SQL_SHA","V0088__phase5_cd_real_v0087_queue_stage14_scoped_admission_v39.sql"],
 ["P5_CD_V0089_SQL_FILE","P5_CD_V0089_SQL_SHA","V0089__phase5_cd_v0088_no_login_function_owner_commission_v39.sql"]
];
const GUARD_SIG="clean.phase5_cd_admit_stage14_pre_v39(bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,text,text,text)";
const hold=()=>{throw Error("HOLD_P5_CD_V0088_V0089_INERT_SQL_INSTALL");};
function blobHash(buf){
 const h=createHash("sha1");
 h.update(Buffer.from("blob "+buf.length+"\0"));
 h.update(buf);
 return h.digest("hex");
}
export function unwrapReviewedPgMigration(sql){
 if(typeof sql!=="string"||sql.length<1500||sql.length>40000)hold();
 const starts=[...sql.matchAll(/^BEGIN;$/gm)];
 const ends=[...sql.matchAll(/^COMMIT;$/gm)];
 if(starts.length!==1||ends.length!==1)hold();
 const begin=starts[0].index,end=ends[0].index;
 if(begin<0||end<0||begin>=end||
    sql.slice(end+"COMMIT;".length).trim()!=="")hold();
 const pre=sql.slice(0,begin);
 // The wrapper cannot be used to hide executable SQL before BEGIN.
 if(pre.split("\n").some(s=>s.trim()!==""&&!s.trim().startsWith("--")))hold();
 return sql.slice(begin+"BEGIN;".length,end);
}
function loadReviewed(){
 return SRC.map(([pathKey,shaKey,name])=>{
  const path=process.env[pathKey],sha=process.env[shaKey];
  if(!path||typeof sha!=="string"||!/^[0-9a-f]{40}$/.test(sha)||
     !path.endsWith(name))hold();
  const bytes=readFileSync(path);
  if(blobHash(bytes)!==sha)hold();
  const sql=bytes.toString("utf8");
  if(!sql.startsWith("-- V008")||
     !sql.includes("SECURITY DEFINER")||
     !sql.includes("REVOKE ALL ON FUNCTION"))hold();
  return{sha,body:unwrapReviewedPgMigration(sql)};
 });
}
function assertEnvironment(){
 const url=process.env.DATABASE_URL;
 const isCI=process.env.GITHUB_ACTIONS==="true";
 const ciAllowed=isCI&&
  process.env.P5_CD_GUARD_ATOMIC_INSTALL_DISPOSABLE_CI==="1"&&
  url===CI_URL;
 if(process.env.P5_CD_V0088_V0089_COMMISSION_APPROVAL!==GO||
   !url||url.length>2000||(!ciAllowed&&isCI)||
   process.env.ADB_AUTO_COLLECT==="1"||
   process.env.V39_PHASE6_PROCESS_ARMED==="1"||
   process.env.AERODATABOX_API_KEY||
   process.env.AERODATABOX_WEBHOOK_SECRET)hold();
 let parsed;
 try{parsed=new URL(url);}catch{hold();}
 if(!["postgres:","postgresql:"].includes(parsed.protocol)||
    parsed.pathname!=="/neondb"||
    decodeURIComponent(parsed.username)!==(ciAllowed?"postgres":LIVE_ACTOR))
  hold();
 return{url,ciAllowed};
}
async function queryPreflight(c,ciAllowed){
 const row=(await c.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('server_version_num')::integer AS ver,"+
  "pg_is_in_recovery() AS replica,"+
  "(SELECT rolcreaterole OR rolsuper FROM pg_catalog.pg_roles"+
  " WHERE rolname=current_user) AS can_create_role,"+
  "pg_catalog.has_schema_privilege(current_user,'clean','CREATE') AS can_create_schema,"+
  "to_regclass('clean.phase5_cd_pre_task_v39') AS task,"+
  "to_regclass('clean.phase5_cd_pre_admission_receipt_v39') AS receipt,"+
  "to_regprocedure($1) AS guard",
  [GUARD_SIG]
 )).rows[0];
 if(!row||row.db!=="neondb"||row.actor!==(ciAllowed?"postgres":LIVE_ACTOR)||
    row.ver<160000||row.replica!==false||
    row.can_create_role!==true||row.can_create_schema!==true||
    !row.task||row.receipt!==null||row.guard!==null)hold();
 const tasks=(await c.query(
  "SELECT count(*)::integer AS n FROM clean.phase5_cd_pre_task_v39"
 )).rows[0]?.n;
 const group=(await c.query(
  "SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,"+
  "rolreplication,rolbypassrls FROM pg_catalog.pg_roles"+
  " WHERE rolname='phase5_fids_pre_writer_prod_20261107'"
 )).rows[0];
 const existing=(await c.query(
  "SELECT count(*)::integer AS n FROM pg_catalog.pg_roles"+
  " WHERE rolname='phase5_cd_admission_guard_owner_v39'"
 )).rows[0]?.n;
 const triggers=(await c.query(
  "SELECT tgname,tgenabled FROM pg_catalog.pg_trigger"+
  " WHERE tgrelid='clean.flight_snapshots'::regclass"+
  " AND NOT tgisinternal ORDER BY tgname"
 )).rows;
 if(tasks!==0||existing!==0||!group||
    group.rolcanlogin!==false||group.rolsuper!==false||
    group.rolcreaterole!==false||group.rolcreatedb!==false||
    group.rolreplication!==false||group.rolbypassrls!==false||
    triggers.length!==1||
    triggers[0].tgname!=="trg_flight_snapshots_population_member"||
    triggers[0].tgenabled!=="O")hold();
 return triggers;
}
async function queryPostflight(c,triggersBefore){
 const t=(await c.query(
  "SELECT to_regclass('clean.phase5_cd_pre_task_v39') AS task,"+
  "to_regclass('clean.phase5_cd_pre_admission_receipt_v39') AS receipt,"+
  "(SELECT count(*)::integer FROM clean.phase5_cd_pre_task_v39) AS tasks,"+
  "(SELECT count(*)::integer FROM clean.phase5_cd_pre_admission_receipt_v39) AS receipts"
 )).rows[0];
 const owner=(await c.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,"+
  "rolreplication,rolbypassrls FROM pg_catalog.pg_roles"+
  " WHERE rolname='phase5_cd_admission_guard_owner_v39'"
 )).rows[0];
 const funcs=(await c.query(
  "SELECT p.proname,r.rolname AS function_owner"+
  " FROM pg_catalog.pg_proc p"+
  " JOIN pg_catalog.pg_roles r ON r.oid=p.proowner"+
  " JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace"+
  " WHERE n.nspname='clean' AND p.proname=ANY($1::text[])",
  [[
    "phase5_cd_admit_stage14_pre_v39",
    "phase5_cd_scope_snapshot_insert_v39",
    "phase5_cd_scope_snapshot_immutable_v39"
  ]]
 )).rows;
 const acl=(await c.query(
  "SELECT pg_catalog.has_function_privilege("+
  "'phase5_fids_pre_writer_prod_20261107',$1,'EXECUTE') AS pre_can_admit,"+
  "pg_catalog.has_table_privilege("+
  "'phase5_fids_pre_writer_prod_20261107','clean.phase5_cd_pre_task_v39','UPDATE') AS pre_can_update,"+
  "pg_catalog.has_table_privilege("+
  "'phase5_fids_pre_writer_prod_20261107',"+
  "'clean.phase5_cd_pre_admission_receipt_v39','SELECT') AS pre_can_read_receipt,"+
  "pg_catalog.has_function_privilege('travnr_runtime',$1,'EXECUTE') AS runtime_can_admit",
  [GUARD_SIG]
 )).rows[0];
 const triggersAfter=(await c.query(
  "SELECT tgname,tgenabled FROM pg_catalog.pg_trigger"+
  " WHERE tgrelid='clean.flight_snapshots'::regclass"+
  " AND NOT tgisinternal ORDER BY tgname"
 )).rows;
 const names=triggersAfter.map(x=>x.tgname);
 const expected=[
  ...triggersBefore.map(x=>x.tgname),
  "p5_cd_v0088_registered_pre_insert_guard",
  "p5_cd_v0088_registered_pre_immutable_guard"
 ].sort();
 if(!t?.task||!t.receipt||t.tasks!==0||t.receipts!==0||
    !owner||owner.rolcanlogin||owner.rolsuper||owner.rolcreaterole||
    owner.rolcreatedb||owner.rolreplication||owner.rolbypassrls||
    funcs.length!==3||funcs.some(x=>
      x.function_owner!=="phase5_cd_admission_guard_owner_v39")||
    !acl||acl.pre_can_admit!==true||acl.pre_can_update!==false||
    acl.pre_can_read_receipt!==false||acl.runtime_can_admit!==false||
    JSON.stringify(names)!==JSON.stringify(expected)||
    triggersAfter.some(x=>x.tgenabled!=="O"))hold();
 return{owner:owner.rolname,triggersBefore:triggersBefore.length,
  triggersAfter:triggersAfter.length};
}
async function main(){
 const {url,ciAllowed}=assertEnvironment();
 const reviewed=loadReviewed();
 const client=new Client({
  connectionString:url,connectionTimeoutMillis:8000,
  application_name:"phase5_cd_v0088_v0089_no_paid_atomic_owner_commission"
 });
 let connected=false,tx=false,commitAttempted=false,committed=false;
 try{
  await client.connect();connected=true;
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='8000ms'");
  const before=await queryPreflight(client,ciAllowed);
  await client.query("ROLLBACK");tx=false;
  console.log("V0087_LIVE_EMPTY_AND_OLD_TRIGGER_PRE_NOLOGIN_VERIFIED");

  await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await client.query("SET LOCAL lock_timeout='3000ms'");
  await client.query("SET LOCAL statement_timeout='15000ms'");
  // One outer BEGIN/COMMIT covers BOTH unchanged reviewed SQL bodies.
  // Neither temporary postgres-owned definer nor a leaked PUBLIC EXECUTE
  // can become visible to other sessions before V0089 succeeds.
  await client.query(reviewed[0].body);
  await client.query(reviewed[1].body);
  commitAttempted=true;
  await client.query("COMMIT");tx=false;committed=true;
  const after=await queryPostflight(client,before);
  console.log(JSON.stringify({
   schema:"v39.phase5.v0088-v0089-atomic-no-paid-commission.v1",
   status:"STAGED_GUARD_INSTALLED_INERT_NO_GITHUB_WORKERS",
   database:"neondb",postgresMajorVersion:16,
   migration88GitBlobSha:reviewed[0].sha,
   migration89GitBlobSha:reviewed[1].sha,
   queueRows:0,receiptRows:0,
   existingSnapshotTriggerPreserved:true,
   preRoleMayExecuteGuard:true,
   preRoleDirectQueueUpdate:false,
   preRoleDirectReceiptRead:false,
   runtimeMayExecuteGuard:false,
   guardOwnerIsNonLogin:true,
   ...after,
   providerRequests:0,paidCalls:0,phase5FreezePassed:false,phase6PaidGo:false
  },null,2));
 }catch{
  if(tx&&!commitAttempted)await client.query("ROLLBACK").catch(()=>{});
  console.error(commitAttempted||committed?
    "HOLD_V0088_V0089_COMMIT_MAY_HAVE_APPLIED_DO_NOT_RETRY":
    "HOLD_V0088_V0089_PRECOMMIT_ROLLBACK_REQUIRES_REVIEW");
  process.exitCode=2;
 }finally{
  if(connected)await client.end().catch(()=>{});
 }
}
if(process.argv[1]?.endsWith("v39_phase5_cd_v0088_v0089_atomic_owner_install_once.mjs"))
 await main();
