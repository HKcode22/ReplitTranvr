/**
 * Phase5/6 V0094: independent owner inventory OR one-use SCHEMA-ONLY
 * installation candidate. STOP by default; production action only after
 * separately reviewed exact Git main/blob + explicit human authorization.
 *
 * This never imports a provider, commissions LOGINs, reads flight contents,
 * touches V0079-V0093, enrolls a queue task, or authorizes paid Phase6.
 */
import "dotenv/config";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import pg from "pg";

const {Client}=pg;
export const V0094_MIGRATION_PATH=
 "migrations/staged/V0094__phase6_private_frozen_packet_transport_inert_v39.sql";
export const V0094_REVIEWED_SQL_BLOB_SHA=
 "42af369982e31b32055e2944492853feff1d0c51";
export const V0094_EXPLICIT_OWNER_APPROVAL=
 "INSTALL_ONCE_V0094_EMPTY_PRIVATE_SCHEMA_TWO_NOLOGIN_ROLES_NO_PAID";
const ROLES=[
 "phase6_private_frozen_reader_v39",
 "phase6_private_frozen_publisher_v39"
];
const TABLE="phase6_private.frozen_native_packet_v39";
const fail=(code)=>{throw Error("HOLD_V0094_OWNER_SCHEMA_"+code);};

export function gitBlobSha1(buf){
 if(!Buffer.isBuffer(buf))fail("INVALID_MIGRATION_BYTES");
 return createHash("sha1")
  .update(Buffer.from("blob "+buf.length+"\0"))
  .update(buf).digest("hex");
}
export function reviewExactV0094Sql(buf,expectedBlob){
 if(!Buffer.isBuffer(buf)||buf.length<2500||buf.length>16000||
    expectedBlob!==V0094_REVIEWED_SQL_BLOB_SHA||
    gitBlobSha1(buf)!==V0094_REVIEWED_SQL_BLOB_SHA)
  fail("EXACT_REVIEWED_MIGRATION_BLOB_REQUIRED");
 const sql=buf.toString("utf8");
 if(!sql.startsWith("-- V0094: STAGED only.")||
    (sql.match(/^BEGIN;$/gm)||[]).length!==1||
    (sql.match(/^COMMIT;$/gm)||[]).length!==1||
    !sql.includes("CREATE SCHEMA phase6_private;")||
    !sql.includes("CREATE TABLE phase6_private.frozen_native_packet_v39 (")||
    !sql.includes("CREATE ROLE phase6_private_frozen_reader_v39")||
    !sql.includes("CREATE ROLE phase6_private_frozen_publisher_v39")||
    !sql.includes("GRANT SELECT,INSERT ON phase6_private.frozen_native_packet_v39")||
    !sql.includes("pg_catalog.sha256(payload_bytes)")||
    !sql.includes("P5_V0094_ALREADY_PRESENT_DO_NOT_REINSTALL"))
  fail("UNREVIEWED_SQL_STRUCTURE");
 return sql;
}
function assertOwnStatus(d){
 if(!d||d.db!=="neondb"||d.actor!=="neondb_owner"||
    d.version<160000||d.version>=170000||d.ro!=="on"||
    d.replica!==false||d.superuser!==false)
  fail("WRONG_PRIMARY_DB_PG16_OR_OWNER");
}
function validateRoleShape(role){
 return role.rolcanlogin===false&&role.rolinherit===false&&
  role.rolsuper===false&&role.rolcreatedb===false&&
  role.rolcreaterole===false&&role.rolreplication===false&&
  role.rolbypassrls===false;
}
export function classifyV0094Inventory(s){
 if(!s||s.roles.some(r=>!ROLES.includes(r.rolname))||
    new Set(s.roles.map(r=>r.rolname)).size!==s.roles.length)
  fail("UNRECOGNIZED_ROLE_CATALOG");
 if(!s.schemaPresent&&!s.tablePresent&&s.roles.length===0)
  return "COLD_V0094_NOT_INSTALLED";
 if(!s.schemaPresent||!s.tablePresent||s.roles.length!==2||
    !ROLES.every(r=>s.roles.some(x=>x.rolname===r&&validateRoleShape(x)))||
    s.tableOwner!=="neondb_owner"||
    s.tableRows!==0||s.roleMembers!==0||
    s.publicTablePrivileges!==false||
    !s.privateAcl||
    s.privateAcl.readerSelect!==true||
    s.privateAcl.readerInsert!==false||
    s.privateAcl.readerUpdate!==false||
    s.privateAcl.readerDelete!==false||
    s.privateAcl.publisherSelect!==true||
    s.privateAcl.publisherInsert!==true||
    s.privateAcl.publisherUpdate!==false||
    s.privateAcl.publisherDelete!==false||
    s.privateAcl.readerUsage!==true||
    s.privateAcl.publisherUsage!==true||
    s.privateAcl.readerCreate!==false||
    s.privateAcl.publisherCreate!==false||
    s.immutabilityTrigger!==true||
    s.primaryKey!==true)
  fail("EXISTING_OR_PARTIAL_V0094_NEEDS_INDEPENDENT_REVIEW");
 return "INSTALLED_EMPTY_INERT_V0094_NOLOGIN_NO_GO";
}
/** Read-only, role/ACL/row-count only. No Contents or secrets returned. */
export async function readV0094OwnerInventory(client){
 if(!client||typeof client.query!=="function")fail("NO_CLIENT");
 let started=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const d=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,"+
   "(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) AS superuser,"+
   "pg_database_size(current_database())::text AS db_bytes"
  )).rows[0];
  assertOwnStatus(d);
  const objects=(await client.query(
   "SELECT to_regnamespace('phase6_private') IS NOT NULL AS schema_present,"+
   "to_regclass('"+TABLE+"') IS NOT NULL AS table_present,"+
   "to_regclass('clean.adb_phase6_authorization') IS NOT NULL AS legacy_auth_present,"+
   "to_regclass('clean.flight_population') IS NOT NULL AS legacy_population_present"
  )).rows[0];
  const roles=(await client.query(
   "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreatedb,"+
   "rolcreaterole,rolreplication,rolbypassrls FROM pg_catalog.pg_roles"+
   " WHERE rolname=ANY($1::text[]) ORDER BY rolname",[ROLES]
  )).rows;
  const m=(await client.query(
   "SELECT COUNT(*)::integer AS n FROM pg_catalog.pg_auth_members m"+
   " JOIN pg_catalog.pg_roles g ON g.oid=m.roleid"+
   " WHERE g.rolname=ANY($1::text[])",[ROLES]
  )).rows[0]?.n;
  if(!Number.isSafeInteger(m)||m<0)fail("UNREADABLE_MEMBERSHIP");
  let extras={tableRows:null,tableOwner:null,privateAcl:null,
   publicTablePrivileges:null,immutabilityTrigger:null,primaryKey:null};
  if(objects.table_present){
   const info=(await client.query(
    "SELECT pg_catalog.pg_get_userbyid(c.relowner) AS table_owner,"+
    "EXISTS(SELECT 1 FROM pg_catalog.pg_constraint co"+
    " WHERE co.conrelid=c.oid AND co.contype='p') AS primary_key,"+
    "EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t"+
    " WHERE t.tgrelid=c.oid AND t.tgname='phase6_private_frozen_update_hold_v39'"+
    " AND t.tgenabled='O') AS immutability_trigger,"+
    "EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(c.relacl,"+
    "pg_catalog.acldefault('r',c.relowner))) a"+
    " WHERE a.grantee=0) AS public_privileges"+
    " FROM pg_catalog.pg_class c WHERE c.oid=$1::pg_catalog.regclass",
    [TABLE]
   )).rows[0];
   const rowCount=(await client.query(
    "SELECT COUNT(*)::integer AS n FROM "+TABLE
   )).rows[0]?.n;
   if(!info||!Number.isSafeInteger(rowCount)||rowCount<0)
    fail("TABLE_CATALOG_UNREADABLE");
   extras={tableOwner:info.table_owner,tableRows:rowCount,
    publicTablePrivileges:info.public_privileges,
    immutabilityTrigger:info.immutability_trigger,
    primaryKey:info.primary_key,privateAcl:null};
   if(roles.length===2&&objects.schema_present){
    extras.privateAcl=(await client.query(
     "SELECT "+
     "has_table_privilege($1::text,$3::text,'SELECT') AS reader_select,"+
     "has_table_privilege($1::text,$3::text,'INSERT') AS reader_insert,"+
     "has_table_privilege($1::text,$3::text,'UPDATE') AS reader_update,"+
     "has_table_privilege($1::text,$3::text,'DELETE') AS reader_delete,"+
     "has_table_privilege($2::text,$3::text,'SELECT') AS publisher_select,"+
     "has_table_privilege($2::text,$3::text,'INSERT') AS publisher_insert,"+
     "has_table_privilege($2::text,$3::text,'UPDATE') AS publisher_update,"+
     "has_table_privilege($2::text,$3::text,'DELETE') AS publisher_delete,"+
     "has_schema_privilege($1::text,'phase6_private','USAGE') AS reader_usage,"+
     "has_schema_privilege($2::text,'phase6_private','USAGE') AS publisher_usage,"+
     "has_schema_privilege($1::text,'phase6_private','CREATE') AS reader_create,"+
     "has_schema_privilege($2::text,'phase6_private','CREATE') AS publisher_create",
     [ROLES[0],ROLES[1],TABLE]
    )).rows[0];
    // PostgreSQL aliases are snake_case, normalized below.
    const a=extras.privateAcl;
    extras.privateAcl={
     readerSelect:a.reader_select,readerInsert:a.reader_insert,
     readerUpdate:a.reader_update,readerDelete:a.reader_delete,
     publisherSelect:a.publisher_select,publisherInsert:a.publisher_insert,
     publisherUpdate:a.publisher_update,publisherDelete:a.publisher_delete,
     readerUsage:a.reader_usage,publisherUsage:a.publisher_usage,
     readerCreate:a.reader_create,publisherCreate:a.publisher_create
    };
   }
  }
  await client.query("ROLLBACK");started=false;
  const output={db:d.db,actor:d.actor,version:d.version,
   databaseBytes:d.db_bytes,
   schemaPresent:objects.schema_present,
   tablePresent:objects.table_present,
   legacyObjects:{
    phase6Authorization:objects.legacy_auth_present,
    flightPopulation:objects.legacy_population_present
   },
   roles,roleMembers:m,...extras,
   providerCalls:0,databaseWrites:0,paidPhase6Go:false};
  return {...output,state:classifyV0094Inventory(output)};
 }catch(e){
  if(started)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }
}
export async function installV0094OnceOwner({client,rawMigration,blobSha}){
 reviewExactV0094Sql(rawMigration,blobSha);
 const before=await readV0094OwnerInventory(client);
 if(before.state!=="COLD_V0094_NOT_INSTALLED")
  fail("ALREADY_INSTALLED_OR_PARTIAL_NEVER_REPLAY");
 if(before.legacyObjects.phase6Authorization!==true||
    before.legacyObjects.flightPopulation!==true)
  fail("EXISTING_PHASE5_BASELINE_MISSING_NO_DDL");
 try{
  // Exactly ONE simple-protocol request: the reviewed SQL has its own
  // BEGIN/COMMIT. No request retransmission after ambiguous COMMIT.
  await client.query(rawMigration.toString("utf8"));
 }catch{
  fail("DDL_FAILED_OR_COMMIT_UNKNOWN_NO_RETRY_GET_INDEPENDENT_READBACK");
 }
 const after=await readV0094OwnerInventory(client);
 if(after.state!=="INSTALLED_EMPTY_INERT_V0094_NOLOGIN_NO_GO"||
    JSON.stringify(before.legacyObjects)!==JSON.stringify(after.legacyObjects))
  fail("AFTER_DDL_INDEPENDENT_OWNER_AUDIT_REQUIRED");
 return {status:"V0094_SCHEMA_ONCE_OWNER_READBACK_PASS_INERT",
  migrationBlobSha:blobSha,rolesCreatedNoLogin:2,tableRows:0,
  baselineObjectsPreserved:true,providerCalls:0,
  databaseFlightWrites:0,paidPhase6Go:false,
  separateIndependentReadbackStillRequired:true};
}
function exactApprovalEnvelope(env){
 if(env.GITHUB_ACTIONS==="true"||
    env.P5_V0094_OWNER_SCHEMA_APPROVAL!==V0094_EXPLICIT_OWNER_APPROVAL||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED==="1"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
    env.AERODATABOX_WEBHOOK_SECRET)
  fail("OWNER_APPROVAL_AND_STOP_ENVELOPE_REQUIRED");
 const pin=env.P5_V0094_REVIEWED_MAIN_SHA;
 if(!/^[a-f0-9]{40}$/.test(pin??""))
  fail("EXACT_REVIEWED_MAIN_SHA_REQUIRED");
 let live;
 try{live=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",
  stdio:["ignore","pipe","ignore"]}).trim();}
 catch{fail("CHECKOUT_SHA_UNAVAILABLE");}
 if(live!==pin)fail("CHECKOUT_SHA_DIFFERS_FROM_REVIEWED_MAIN");
 const p=env.P5_V0094_REVIEWED_SQL_FILE;
 if(!/^\/tmp\/p5-v0094-owner-[A-Za-z0-9]{6,16}\/V0094__phase6_private_frozen_packet_transport_inert_v39\.sql$/.test(p??""))
  fail("EXACT_PRIVATE_TEMP_REVIEWED_SQL_REQUIRED");
 if(env.P5_V0094_REVIEWED_SQL_BLOB_SHA!==V0094_REVIEWED_SQL_BLOB_SHA)
  fail("EXACT_REVIEWED_SQL_SHA_REQUIRED");
 return p;
}
async function main(){
 const mode=process.argv[2]??"inventory";
 let client;
 try{
  if(!["inventory","install"].includes(mode))fail("UNKNOWN_MODE");
  if(!process.env.DATABASE_URL)fail("DATABASE_URL_MISSING");
  // This tool is owner-only. It does not use or replace the Replit secret.
  client=new Client({connectionString:process.env.DATABASE_URL,
   connectionTimeoutMillis:8000,
   application_name:"phase6_v0094_owner_schema_only_no_provider"});
  if(mode==="install"){
   // Validate independent static bytes and actor approval BEFORE connecting.
   const p=exactApprovalEnvelope(process.env);
   const raw=readFileSync(p);
   reviewExactV0094Sql(raw,process.env.P5_V0094_REVIEWED_SQL_BLOB_SHA);
   await client.connect();
   console.log(JSON.stringify(await installV0094OnceOwner({
    client,rawMigration:raw,
    blobSha:process.env.P5_V0094_REVIEWED_SQL_BLOB_SHA
   })));
  }else{
   await client.connect();
   const s=await readV0094OwnerInventory(client);
   // No database URLs or payloads are emitted.
   console.log(JSON.stringify({status:"V0094_OWNER_READONLY_INVENTORY",
    database:s.db,postgresVersion:s.version,actor:s.actor,
    databaseBytes:s.databaseBytes,state:s.state,
    schemaPresent:s.schemaPresent,tablePresent:s.tablePresent,
    tableRows:s.tableRows,roleMembers:s.roleMembers,
    roles:s.roles.map(r=>({name:r.rolname,canLogin:r.rolcanlogin})),
    providerCalls:0,databaseWrites:0,paidPhase6Go:false}));
  }
 }catch{
  console.error("HOLD_V0094_OWNER_SCHEMA_NO_AUTO_RETRY_NO_PAID");
  process.exitCode=2;
 }finally{if(client)await client.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
