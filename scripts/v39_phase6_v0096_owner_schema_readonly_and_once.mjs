/**
 * Phase6 V0096 schema-only exact Git-blob-pinned ONE-TIME owner tool.
 * Default READ ONLY: inspect exact existing neondb PostgreSQL16 V0094,
 * V0095 and V0096 shape/roles without reading any flight Contents.
 * V0096 LEGACY GLOBAL CHAIN HAS A VERIFIED 31-DAY / <=7-DAY TTL
 * INCOMPATIBILITY. The CLI install mode is intentionally DISABLED, even
 * with old owner approval tokens. Keep inventory/readback for diagnostics.
 * The exact already-reviewed V0096 SQL is unchanged; the owner must not
 * commission it. Replacement day-epoch proposal is disposable CI only.
 *
 * No provider REST, secrets, new LOGIN, migrations V0079–V0095 replay,
 * original/PRE/POST row writes or automatic paid Phase6 GO.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import pg from "pg";
import {gitBlobSha1} from "./v39_phase6_v0094_owner_schema_readonly_and_once.mjs";
import {readV0095OwnerInventory}
 from "./v39_phase6_v0095_owner_schema_readonly_and_once.mjs";
const {Client}=pg;

export const V0096_MIGRATION_PATH=
 "migrations/staged/V0096__phase6_private_signed_day_shard_index_revisions_inert_v39.sql";
export const V0096_REVIEWED_SQL_BLOB_SHA=
 "e588366a306335bbc6137ac4b66d7285fb472296";
export const V0096_EXPLICIT_OWNER_APPROVAL=
 "INSTALL_ONCE_V0096_PRIVATE_INDEX_EMPTY_PG16_REUSE_OLD_ROLES_NO_PAID";
const TABLE="phase6_private.signed_day_shard_index_revision_v39";
const CODE=/^[0-9a-f]{40}$/;
const fail=x=>{throw Error("HOLD_V0096_OWNER_SCHEMA_"+x);};

export function reviewExactV0096Sql(bytes,expectedBlob){
 if(!Buffer.isBuffer(bytes)||bytes.length<9000||
    bytes.length>12000||
    expectedBlob!==V0096_REVIEWED_SQL_BLOB_SHA||
    gitBlobSha1(bytes)!==V0096_REVIEWED_SQL_BLOB_SHA)
  fail("EXACT_REVIEWED_SQL_GIT_BLOB_REQUIRED");
 const s=bytes.toString("utf8");
 if(!s.startsWith("-- V0096: STAGED ONLY")||
    (s.match(/^BEGIN;$/gm)||[]).length!==1||
    (s.match(/^COMMIT;$/gm)||[]).length!==1||
    !s.includes("P6_V0096_ALREADY_PRESENT_NEVER_REINSTALL")||
    !s.includes("P6_V0096_REQUIRES_VERIFIED_V0094_AND_V0095_FIRST")||
    !s.includes("CREATE TABLE "+TABLE+" (")||
    !s.includes("CREATE FUNCTION phase6_private.guard_signed_index_insert_v39()")||
    !s.includes("CREATE TRIGGER phase6_private_signed_index_insert_chain_hold_v39")||
    !s.includes("CREATE TRIGGER phase6_private_signed_index_update_hold_v39")||
    !s.includes("previous_index_sha256 IS NOT NULL")||
    !s.includes("content_sha256 IS DISTINCT FROM NEW.previous_index_sha256")||
    !s.includes("pg_catalog.sha256(payload_bytes)")||
    !s.includes("interval '7 days'")||
    !s.includes("GRANT SELECT,INSERT ON "+TABLE)||
    !s.includes("P6_V0096_INDEX_TABLE_ACL_NOT_PRIVATE")||
    /\b(?:CREATE ROLE|ALTER ROLE|CREATE USER|DROP TABLE|TRUNCATE|DELETE FROM|DISABLE TRIGGER)\b/i.test(s))
  fail("UNREVIEWED_MIGRATION_STRUCTURE_OR_NEW_PRIVILEGE");
 return s;
}
/** READ-ONLY and redacted. Counts never imply provider record permissions. */
export async function readV0096OwnerInventory(client){
 const prior=await readV0095OwnerInventory(client);
 if(prior.state==="V0094_MISSING_V0095_NOT_INSTALLED_NO_GO")
  return{
   status:"V0096_OWNER_READONLY_INVENTORY",
   state:"V0094_MISSING_V0096_NO_GO",
   previousState:prior.state,tableRows:null,
   providerCalls:0,databaseWrites:0,paidPhase6Go:false
  };
 if(!["V0094_READY_EMPTY_V0095_NOT_INSTALLED_NO_GO",
       "V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO"]
    .includes(prior.state))
  fail("V0094_OR_V0095_NOT_CLEAN_EMPTY_PRECOMMISSION");
 let started=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const pre=await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_catalog.pg_is_in_recovery() AS replica,"+
   "pg_catalog.to_regclass($1) IS NOT NULL AS index_present",
   [TABLE]
  );
  const d=pre?.rows?.[0];
  if(pre?.rowCount!==1||!d||
     d.db!=="neondb"||d.actor!=="neondb_owner"||
     Number(d.version)<160000||Number(d.version)>=170000||
     d.ro!=="on"||d.replica!==false)
   fail("WRONG_EXISTING_PG16_PRIMARY_OWNER");
  if(!d.index_present){
   if(prior.state!=="V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO")
    fail("V0095_NOT_YET_READY_FOR_V0096");
   await client.query("ROLLBACK");started=false;
   return{
    status:"V0096_OWNER_READONLY_INVENTORY",
    state:"V0095_READY_EMPTY_V0096_NOT_INSTALLED_NO_GO",
    previousState:prior.state,tableRows:null,
    providerCalls:0,databaseWrites:0,paidPhase6Go:false
   };
  }
  const c=await client.query(
   "SELECT conname,pg_catalog.pg_get_constraintdef(oid) AS definition"+
   " FROM pg_catalog.pg_constraint WHERE conrelid=$1::pg_catalog.regclass",
   [TABLE]
  );
  const names=new Map(c.rows.map(x=>[x.conname,x.definition]));
  if(!["p6_v0096_index_previous_sha_guard",
        "p6_v0096_index_bytes_guard",
        "p6_v0096_index_retention_guard"]
     .every(x=>names.has(x))||
     !names.get("p6_v0096_index_previous_sha_guard")
      ?.includes("previous_index_sha256 IS NOT NULL")||
     !names.get("p6_v0096_index_bytes_guard")
      ?.includes("sha256")||
     !names.get("p6_v0096_index_retention_guard")
      ?.includes("7 days"))
   fail("INSTALLED_V0096_CONSTRAINT_DRIFT");
  const t=await client.query(
   "SELECT pg_catalog.pg_get_userbyid((SELECT relowner FROM pg_catalog.pg_class"+
   " WHERE oid=$1::pg_catalog.regclass)) AS owner,"+
   "EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE"+
   " conrelid=$1::pg_catalog.regclass AND contype='p') AS pk,"+
   "(SELECT count(*)::integer FROM pg_catalog.pg_trigger WHERE"+
   " tgrelid=$1::pg_catalog.regclass AND NOT tgisinternal AND"+
   " tgenabled='O' AND tgname=ANY($2::text[])) AS triggers",
   [TABLE,["phase6_private_signed_index_insert_chain_hold_v39",
      "phase6_private_signed_index_update_hold_v39"]]
  );
  const acl=await client.query(
   "SELECT "+
   "has_table_privilege($1::text,$3::text,'SELECT') AS reader_select,"+
   "has_table_privilege($1::text,$3::text,'INSERT') AS reader_insert,"+
   "has_table_privilege($1::text,$3::text,'UPDATE') AS reader_update,"+
   "has_table_privilege($1::text,$3::text,'DELETE') AS reader_delete,"+
   "has_table_privilege($2::text,$3::text,'SELECT') AS publisher_select,"+
   "has_table_privilege($2::text,$3::text,'INSERT') AS publisher_insert,"+
   "has_table_privilege($2::text,$3::text,'UPDATE') AS publisher_update,"+
   "has_table_privilege($2::text,$3::text,'DELETE') AS publisher_delete,"+
   "EXISTS(SELECT 1 FROM pg_catalog.pg_class x,"+
   " LATERAL pg_catalog.aclexplode(COALESCE(x.relacl,"+
   " pg_catalog.acldefault('r',x.relowner))) p"+
   " WHERE x.oid=$3::pg_catalog.regclass AND p.grantee=0) AS public_acl",
   ["phase6_private_frozen_reader_v39",
    "phase6_private_frozen_publisher_v39",TABLE]
  );
  const count=await client.query("SELECT COUNT(*)::integer AS n FROM "+TABLE);
  const owner=t.rows[0],a=acl.rows[0],n=count.rows[0]?.n;
  if(t.rowCount!==1||acl.rowCount!==1||count.rowCount!==1||
     owner?.owner!=="neondb_owner"||owner?.pk!==true||
     owner?.triggers!==2||
     a?.reader_select!==true||a?.reader_insert!==false||
     a?.reader_update!==false||a?.reader_delete!==false||
     a?.publisher_select!==true||a?.publisher_insert!==true||
     a?.publisher_update!==false||a?.publisher_delete!==false||
     a?.public_acl!==false||!Number.isSafeInteger(n)||n!==0)
   fail("INSTALLED_V0096_ROLE_ACL_TRIGGERS_OR_NONEMPTY_HOLD");
  await client.query("ROLLBACK");started=false;
  return{
   status:"V0096_OWNER_READONLY_INVENTORY",
   state:"V0096_INSTALLED_EMPTY_PRIVATE_INDEX_INERT_NO_GO",
   previousState:prior.state,tableRows:0,
   immutableAndChainTriggers:2,
   restrictedExistingReaderPublisherRolesReused:true,
   additionalLoginRolesCreatedHere:0,
   providerCalls:0,databaseWrites:0,paidPhase6Go:false
  };
 }catch(e){
  if(started)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }
}
export async function installV0096OnceOwner({client,rawMigration,blobSha}){
 reviewExactV0096Sql(rawMigration,blobSha);
 const before=await readV0096OwnerInventory(client);
 if(before.state!=="V0095_READY_EMPTY_V0096_NOT_INSTALLED_NO_GO")
  fail("OUT_OF_ORDER_ALREADY_INSTALLED_OR_DRIFTED_NEVER_REPLAY");
 try{
  await client.query(rawMigration.toString("utf8"));
 }catch{
  fail("SQL_FAILED_OR_COMMIT_UNKNOWN_NEVER_RETRY_REQUIRE_INDEPENDENT_READBACK");
 }
 const after=await readV0096OwnerInventory(client);
 if(after.state!=="V0096_INSTALLED_EMPTY_PRIVATE_INDEX_INERT_NO_GO")
  fail("POST_COMMIT_SCHEMA_ACL_OR_TRIGGERS_NOT_VERIFIED");
 return{
  status:"V0096_ONE_TIME_INDEX_SCHEMA_OWNER_READBACK_PASS_INERT_NO_GO",
  reviewedMigrationGitBlobSha:blobSha,
  originalV0094V0095ObjectsPreserved:true,
  privateIndexRowCount:0,
  newLoginRoleCount:0,
  requiresSeparateIndependentPostCommitReadback:true,
  providerCalls:0,dataWrites:0,phase6PaidGo:false
 };
}
function exactOwnerApproval(env){
 if(env.GITHUB_ACTIONS==="true"||
    env.P5_V0096_OWNER_APPROVAL!==V0096_EXPLICIT_OWNER_APPROVAL||
    env.P5_V0096_REVIEWED_SQL_GIT_BLOB_SHA!==V0096_REVIEWED_SQL_BLOB_SHA||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED==="1"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    !CODE.test(env.P5_V0096_REVIEWED_MAIN_SHA??"")||
    !/^\/tmp\/p5-v0096-owner-[A-Za-z0-9]{6,16}\/V0096__phase6_private_signed_day_shard_index_revisions_inert_v39\.sql$/
      .test(env.P5_V0096_REVIEWED_SQL_FILE??""))
  fail("OWNER_APPROVAL_STOP_EXACT_MAIN_AND_SQL_REQUIRED");
 let head;
 try{head=execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim();}
 catch{fail("CHECKOUT_MAIN_SHA_NOT_AVAILABLE");}
 if(head!==env.P5_V0096_REVIEWED_MAIN_SHA)
  fail("CURRENT_CODE_NOT_EXACT_INDEPENDENTLY_REVIEWED_MAIN");
 return env.P5_V0096_REVIEWED_SQL_FILE;
}
async function main(){
 const mode=process.argv[2]??"inventory";
 let c;
 try{
  if(!["inventory","install"].includes(mode))
   fail("UNKNOWN_OWNER_MODE");
  // A genuine retention/31-day contradiction was found before production
  // V0096 install. No manual approval from older chat can waive this.
  if(mode==="install")
   fail("LEGACY_GLOBAL_CHAIN_31DAY_TTL_INCOMPATIBLE_NEVER_INSTALL");
  if(!process.env.DATABASE_URL)
   fail("EXISTING_OWNER_DATABASE_URL_MISSING");
  let bytes;
  if(mode==="install"){
   const path=exactOwnerApproval(process.env);
   bytes=readFileSync(path);
   reviewExactV0096Sql(bytes,
    process.env.P5_V0096_REVIEWED_SQL_GIT_BLOB_SHA);
  }
  c=new Client({
   connectionString:process.env.DATABASE_URL,
   connectionTimeoutMillis:8000,
   application_name:"phase6_v0096_owner_schema_no_provider_no_go"
  });
  await c.connect();
  const result=mode==="inventory"?
   await readV0096OwnerInventory(c):
   await installV0096OnceOwner({
    client:c,rawMigration:bytes,
    blobSha:process.env.P5_V0096_REVIEWED_SQL_GIT_BLOB_SHA
   });
  console.log(JSON.stringify(result));
 }catch{
  console.error("HOLD_V0096_OWNER_SCHEMA_NO_RETRY_NO_PROVIDER_NO_GO");
  process.exitCode=2;
 }finally{if(c)await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
