/**
 * One-time OWNER-run CREATE-ONLY V0087 installer (NO provider calls).
 * Fetch this exact script and the reviewed V0087 migration at one pinned
 * GitHub main commit, hash-verify BOTH as Git blobs, and run in PRIVATE
 * Replit Shell. Do not use Replit Agent or another Neon project.
 *
 * This creates INERT queue objects in the team neondb; it does not grant
 * queue EXECUTE to any live role, create a login, change historical PRE,
 * dispatch a worker, call AeroDataBox, or authorize paid Phase6.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
const {Client}=pg;
const PASS="CREATE_ONLY_INERT_V0087_NO_WORKERS_NO_PAID";
const NO="HOLD_P5_CD_V0087_INERT_INSTALL_NO_PARTIAL_MIGRATION";
function hold(){throw Error(NO);}
function gitBlobSha(bytes){
 const h=createHash("sha1");
 h.update(Buffer.from("blob "+bytes.length+"\0"));
 h.update(bytes);
 return h.digest("hex");
}
async function run(){
 if(process.env.P5_CD_V0087_INSTALL_APPROVAL!==PASS||
    process.env.GITHUB_ACTIONS==="true"||
    process.env.V39_PHASE6_PROCESS_ARMED==="1"||
    process.env.ADB_AUTO_COLLECT==="1")hold();
 const p=process.env.P5_CD_V0087_MIGRATION_FILE;
 const expected=process.env.P5_CD_V0087_MIGRATION_SHA;
 const uri=process.env.DATABASE_URL;
 if(!p||typeof expected!=="string"||
    !/^[0-9a-f]{40}$/.test(expected)||
    !uri||!uri.startsWith("postgres")||uri.length>2000)hold();
 const bytes=readFileSync(p);
 const sql=bytes.toString("utf8");
 if(bytes.length<11000||bytes.length>30000||
    gitBlobSha(bytes)!==expected||
    (sql.match(/^COMMIT;$/gm)||[]).length!==1||
    (sql.match(/CREATE TABLE clean\.phase5_cd_pre_task_v39/g)||[]).length!==1||
    !sql.includes("REVOKE ALL ON FUNCTION clean.phase5_cd_claim_due_v39")||
    !sql.startsWith("-- Phase 5 V0087:"))hold();
 const c=new Client({
  connectionString:uri,connectionTimeoutMillis:8000,
  application_name:"phase5_cd_v0087_create_inert_schema_only"
 });
 let connected=false;let ro=false;
 try{
  await c.connect();connected=true;
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  ro=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  const r=(await c.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('server_version_num')::integer AS ver,"+
   "pg_is_in_recovery() AS replica,"+
   "to_regclass('clean.phase5_cd_pre_task_v39') AS existing,"+
   "to_regclass('clean.flight_snapshots') AS snaps,"+
   "pg_catalog.has_schema_privilege(current_user,'clean','CREATE') AS can_create"
  )).rows[0];
  const triggersBefore=(await c.query(
   "SELECT tgname,tgenabled FROM pg_catalog.pg_trigger"+
   " WHERE tgrelid='clean.flight_snapshots'::regclass"+
   " AND NOT tgisinternal ORDER BY tgname"
  )).rows;
  await c.query("ROLLBACK");ro=false;
  // Explicitly refuse runtime, an unrelated DB, a replica or a second
  // attempt. The source account was catalogued under neondb_owner.
  if(!r||r.db!=="neondb"||r.actor!=="neondb_owner"||
     r.ver<160000||r.replica!==false||r.existing!==null||
     !r.snaps||r.can_create!==true||
     !triggersBefore.some(x=>
       x.tgname==="trg_flight_snapshots_population_member"&&
       x.tgenabled==="O"))hold();
  console.log("V0087_TEAM_NEONDB_OWNER_ROLE_AND_PRIOR_TRIGGER_VERIFIED");
  // The SQL itself is ONE BEGIN..COMMIT transaction. Node pg runs the
  // SIMPLE query protocol (no query parameters) for multi-statements.
  // Any SQL failure before COMMIT leaves the new objects uninstalled.
  await c.query(sql);
  const after=(await c.query(
   "SELECT to_regclass('clean.phase5_cd_pre_task_v39') IS NOT NULL AS installed,"+
   "(SELECT count(*)::integer FROM clean.phase5_cd_pre_task_v39) AS rows,"+
   "pg_catalog.has_table_privilege('travnr_runtime',"+
   "'clean.phase5_cd_pre_task_v39','INSERT') AS runtime_insert,"+
   "pg_catalog.has_table_privilege('travnr_runtime',"+
   "'clean.phase5_cd_pre_task_v39','UPDATE') AS runtime_update,"+
   "pg_catalog.has_function_privilege('travnr_runtime',"+
   "'clean.phase5_cd_claim_due_v39(text,integer,integer)',"+
   "'EXECUTE') AS runtime_claim"
  )).rows[0];
  const triggersAfter=(await c.query(
   "SELECT tgname,tgenabled FROM pg_catalog.pg_trigger"+
   " WHERE tgrelid='clean.flight_snapshots'::regclass"+
   " AND NOT tgisinternal ORDER BY tgname"
  )).rows;
  if(!after||after.installed!==true||after.rows!==0||
     after.runtime_insert!==false||after.runtime_update!==false||
     after.runtime_claim!==false||
     JSON.stringify(triggersBefore)!==JSON.stringify(triggersAfter))
    hold(); // STOP, never issue worker grants or provider calls.
  console.log(JSON.stringify({
   schema:"v39.phase5.cd-v0087-inert-real-schema-install.v1",
   status:"INERT_REAL_QUEUE_SCHEMA_INSTALLED_NO_WORKERS",
   observedDatabase:"neondb",postgresMajorVersion:Math.floor(r.ver/10000),
   migrationGitBlobSha:expected,queueTable:"clean.phase5_cd_pre_task_v39",
   queueRows:0,legacySnapshotTriggersPreserved:true,
   runtimeQueueInsertGranted:false,runtimeQueueUpdateGranted:false,
   runtimeQueueClaimExecuteGranted:false,
   providerRequests:0,paidProviderCalls:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  },null,2));
 }catch{
  if(ro)await c.query("ROLLBACK").catch(()=>{});
  console.error(NO);
  process.exitCode=2;
 }finally{
  if(connected)await c.end().catch(()=>{});
 }
}
if(process.argv[1]?.endsWith("v39_phase5_cd_v0087_inert_owner_install_once.mjs"))
 await run();
