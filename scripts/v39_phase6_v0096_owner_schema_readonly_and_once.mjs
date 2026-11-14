/**
 * Phase6 V0096: exact staged owner one-use signed INDEX revision table
 * installation. Default=READ ONLY inventory; real install requires a
 * separately reviewed owner consent, exact SHA40 main and Git blob,
 * V0094→V0095 already empty/inert and NO provider/Phase6 arm.
 *
 * NO paid API call, no new role/login, flight packet, REST/Alert, callback,
 * Stage14, public GitHub bytes, TTL entitlement or automatic GH dispatch.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import pg from "pg";
import {gitBlobSha1}
 from "./v39_phase6_v0094_owner_schema_readonly_and_once.mjs";
import {readV0095OwnerInventory}
 from "./v39_phase6_v0095_owner_schema_readonly_and_once.mjs";

const {Client}=pg;
export const V0096_MIGRATION_PATH=
 "migrations/staged/V0096__phase6_private_signed_day_shard_index_revisions_inert_v39.sql";
export const V0096_REVIEWED_SQL_BLOB_SHA=
 "e588366a306335bbc6137ac4b66d7285fb472296";
export const V0096_ONE_TIME_OWNER_APPROVAL=
 "INSTALL_ONCE_V0096_SIGNED_INDEX_REVISION_EMPTY_NO_LOGIN_NO_PAID";
const CODE=/^[0-9a-f]{40}$/;
const TABLE="phase6_private.signed_day_shard_index_revision_v39";
const fail=s=>{throw Error("HOLD_V0096_OWNER_ONCE_"+s);};
export function reviewExactV0096Sql(bytes,blob){
 if(!Buffer.isBuffer(bytes)||bytes.length<9500||bytes.length>11500||
    blob!==V0096_REVIEWED_SQL_BLOB_SHA||
    gitBlobSha1(bytes)!==V0096_REVIEWED_SQL_BLOB_SHA)
  fail("PINNED_MIGRATION_BLOB_NOT_EXACT");
 const sql=bytes.toString("utf8");
 if(!sql.startsWith("-- V0096: STAGED ONLY")||
    (sql.match(/^BEGIN;$/gm)||[]).length!==1||
    (sql.match(/^COMMIT;$/gm)||[]).length!==1||
    !sql.includes("P6_V0096_REQUIRES_VERIFIED_V0094_AND_V0095_FIRST")||
    !sql.includes("P6_V0096_ALREADY_PRESENT_NEVER_REINSTALL")||
    !sql.includes("previous_index_sha256 IS NOT NULL")||
    !sql.includes("IS DISTINCT FROM NEW.previous_index_sha256")||
    !sql.includes("phase6_private.guard_signed_index_insert_v39")||
    !sql.includes("P6_V0096_INDEX_CHAIN_INSERT_TRIGGER_MISSING")||
    !sql.includes("interval '7 days'")||
    !sql.includes("REVOKE ALL ON TABLE phase6_private.signed_day_shard_index_revision_v39")||
    /\b(?:CREATE ROLE|ALTER ROLE|CREATE USER|DROP TABLE|TRUNCATE|DELETE FROM|DISABLE TRIGGER)\b/i.test(sql))
  fail("MIGRATION_TEXT_SHAPE_PRIVILEGE_OR_ATOMIC_BOUNDARY_DRIFT");
 return sql;
}
export function classifyV0096OwnerState(v0095,table){
 if(!v0095||v0095.state!==
    "V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO"||
    v0095.tableRows!==0)
  return "V0095_NOT_READY_V0096_CANNOT_INSTALL_NO_GO";
 if(table===null)
  return "V0095_READY_EMPTY_V0096_NOT_INSTALLED_NO_GO";
 if(!table||table.rows!==0||
    table.owner!=="neondb_owner"||
    !Array.isArray(table.constraints)||
    !["p6_v0096_index_previous_sha_guard",
      "p6_v0096_index_bytes_guard",
      "p6_v0096_index_retention_guard"].every(x=>
       table.constraints.includes(x))||
    !Array.isArray(table.triggers)||
    !["phase6_private_signed_index_insert_chain_hold_v39",
      "phase6_private_signed_index_update_hold_v39"].every(x=>
       table.triggers.includes(x))||
    table.readerSelect!==true||table.readerInsert!==false||
    table.readerUpdate!==false||table.readerDelete!==false||
    table.publisherSelect!==true||table.publisherInsert!==true||
    table.publisherUpdate!==false||table.publisherDelete!==false||
    table.publicSelect!==false||
    table.previousShaNonNullCheck!==true||
    table.actualBytesShaGuard!==true||
    table.conservativeExpiryCheck!==true)
  fail("INSTALLED_INDEX_TABLE_ACL_TRIGGERS_OR_SHA_DRIFT");
 return "V0096_INSTALLED_EMPTY_INERT_SIGNED_INDEX_NO_GO";
}
export async function readV0096OwnerInventory(client){
 if(!client||typeof client.query!=="function")
  fail("MISSING_NEON_PG16_CLIENT");
 const prior=await readV0095OwnerInventory(client);
 if(prior.state!==
    "V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO"||
    prior.tableRows!==0)
  return{
   status:"V0096_OWNER_READONLY_INVENTORY",
   state:classifyV0096OwnerState(prior,null),
   previousV0095State:prior.state,
   actualDb:prior.db,actor:prior.actor,serverVersion:prior.version,
   tableRows:null,providerCalls:0,databaseWrites:0,phase6PaidGo:false
  };
 let started=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started=true;
  await client.query("SET LOCAL statement_timeout='9000ms'");
  await client.query("SET LOCAL lock_timeout='1400ms'");
  const ref=await client.query(
   "SELECT pg_catalog.to_regclass($1)::text AS index_table",
   [TABLE]
  );
  if(ref?.rowCount!==1)
   fail("UNAVAILABLE_PRIVATE_INDEX_CATALOG");
  if(ref.rows[0]?.index_table===null){
   await client.query("ROLLBACK");started=false;
   return{
    status:"V0096_OWNER_READONLY_INVENTORY",
    state:classifyV0096OwnerState(prior,null),
    previousV0095State:prior.state,
    actualDb:prior.db,actor:prior.actor,
    serverVersion:prior.version,tableRows:null,
    providerCalls:0,databaseWrites:0,phase6PaidGo:false
   };
  }
  if(ref.rows[0]?.index_table!==TABLE)
   fail("UNEXPECTED_INDEX_TABLE_CATALOG_NAME");
  const info=await client.query(
   "SELECT pg_catalog.pg_get_userbyid(relowner) AS owner"+
   " FROM pg_catalog.pg_class WHERE oid=$1::regclass",[TABLE]
  );
  const count=await client.query(
   "SELECT COUNT(*)::integer AS n FROM "+TABLE);
  const cons=await client.query(
   "SELECT conname,pg_catalog.pg_get_constraintdef(oid) AS definition"+
   " FROM pg_catalog.pg_constraint WHERE conrelid=$1::regclass"+
   " AND conname=ANY($2::text[]) ORDER BY conname",
   [TABLE,[
    "p6_v0096_index_previous_sha_guard",
    "p6_v0096_index_bytes_guard",
    "p6_v0096_index_retention_guard"
   ]]
  );
  const tr=await client.query(
   "SELECT tgname FROM pg_catalog.pg_trigger"+
   " WHERE tgrelid=$1::regclass AND NOT tgisinternal ORDER BY tgname",
   [TABLE]
  );
  const acl=await client.query(
   "SELECT"+
   " has_table_privilege('phase6_private_frozen_reader_v39',$1,'SELECT') AS rs,"+
   " has_table_privilege('phase6_private_frozen_reader_v39',$1,'INSERT') AS ri,"+
   " has_table_privilege('phase6_private_frozen_reader_v39',$1,'UPDATE') AS ru,"+
   " has_table_privilege('phase6_private_frozen_reader_v39',$1,'DELETE') AS rd,"+
   " has_table_privilege('phase6_private_frozen_publisher_v39',$1,'SELECT') AS ps,"+
   " has_table_privilege('phase6_private_frozen_publisher_v39',$1,'INSERT') AS pi,"+
   " has_table_privilege('phase6_private_frozen_publisher_v39',$1,'UPDATE') AS pu,"+
   " has_table_privilege('phase6_private_frozen_publisher_v39',$1,'DELETE') AS pd,"+
   " EXISTS(SELECT 1 FROM pg_catalog.pg_class c,"+
   " LATERAL pg_catalog.aclexplode(COALESCE("+
   " c.relacl,pg_catalog.acldefault('r',c.relowner))) x"+
   " WHERE c.oid=$1::regclass AND x.grantee=0"+
   " AND x.privilege_type='SELECT') AS public_select",
   [TABLE]
  );
  if(info?.rowCount!==1||count?.rowCount!==1||
     !Array.isArray(cons?.rows)||tr?.rowCount<2||acl?.rowCount!==1)
   fail("INCOMPLETE_POSTGRESQL16_OWNER_READBACK");
  const d=Object.fromEntries(cons.rows.map(r=>[r.conname,r.definition]));
  const a=acl.rows[0];
  const table={
   owner:info.rows[0]?.owner,rows:count.rows[0]?.n,
   constraints:cons.rows.map(r=>r.conname),
   triggers:tr.rows.map(r=>r.tgname),
   readerSelect:a.rs,readerInsert:a.ri,
   readerUpdate:a.ru,readerDelete:a.rd,
   publisherSelect:a.ps,publisherInsert:a.pi,
   publisherUpdate:a.pu,publisherDelete:a.pd,
   publicSelect:a.public_select,
   previousShaNonNullCheck:
    (d.p6_v0096_index_previous_sha_guard??"").includes("IS NOT NULL"),
   actualBytesShaGuard:
    (d.p6_v0096_index_bytes_guard??"").includes("sha256(payload_bytes)"),
   conservativeExpiryCheck:
    (d.p6_v0096_index_retention_guard??"").includes("7 days")
  };
  const state=classifyV0096OwnerState(prior,table);
  await client.query("ROLLBACK");started=false;
  return{
   status:"V0096_OWNER_READONLY_INVENTORY",state,
   previousV0095State:prior.state,actualDb:prior.db,
   actor:prior.actor,serverVersion:prior.version,
   tableRows:table.rows,privateIndexConstraints:table.constraints,
   triggers:table.triggers,
   providerCalls:0,databaseWrites:0,phase6PaidGo:false
  };
 }catch(e){
  if(started)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }
}
export async function installV0096OnceOwner({
 client,rawMigration,blobSha
}){
 reviewExactV0096Sql(rawMigration,blobSha);
 const before=await readV0096OwnerInventory(client);
 if(before.state!=="V0095_READY_EMPTY_V0096_NOT_INSTALLED_NO_GO")
  fail("NOT_EXACT_EMPTY_V0095_OR_ALREADY_INSTALLED_NEVER_REPLAY");
 try{
  await client.query(rawMigration.toString("utf8"));
 }catch{
  fail("DDL_FAILED_OR_COMMIT_UNKNOWN_INDEPENDENT_READBACK_NO_RETRY");
 }
 const after=await readV0096OwnerInventory(client);
 if(after.state!=="V0096_INSTALLED_EMPTY_INERT_SIGNED_INDEX_NO_GO"||
    after.tableRows!==0)
  fail("POST_INSTALL_OWNER_READBACK_HOLD_NOT_RELEASE");
 return{
  status:"V0096_OWNER_EMPTY_SIGNED_INDEX_SCHEMA_ONCE_READBACK_NO_GO",
  reviewedSqlGitBlobSha:blobSha,
  existingV0094AndV0095Reused:true,
  additionalLoginsOrRolesCreated:0,
  indexRevisionsCommitted:0,
  privateSourcePacketsWritten:0,
  separatelySignedExternalIndexMissing:true,
  independentSecondReadbackRequired:true,
  realProviderCalls:0,phase6PaidGo:false
 };
}
function admitExplicitOwnerInstall(env){
 if(env.GITHUB_ACTIONS==="true"||
    env.P5_V0096_OWNER_APPROVAL!==V0096_ONE_TIME_OWNER_APPROVAL||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED==="1"||
    env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.RAPIDAPI_KEY||
    !CODE.test(env.P5_V0096_REVIEWED_MAIN_SHA??"")||
    env.P5_V0096_REVIEWED_SQL_BLOB_SHA!==V0096_REVIEWED_SQL_BLOB_SHA||
    !/^\/tmp\/p5-v0096-owner-[A-Za-z0-9]{6,16}\/V0096__phase6_private_signed_day_shard_index_revisions_inert_v39\.sql$/
      .test(env.P5_V0096_REVIEWED_SQL_FILE??""))
  fail("EXACT_OWNER_STOP_APPROVAL_AND_SQL_PATH_REQUIRED");
 let checked;
 try{checked=execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim();}catch{fail("LOCAL_MAIN_SHA_MISSING");}
 if(checked!==env.P5_V0096_REVIEWED_MAIN_SHA)
  fail("REVIEWED_MAIN_SHA_AND_LOCAL_CHECKOUT_CHANGED");
 return env.P5_V0096_REVIEWED_SQL_FILE;
}
async function main(){
 const mode=process.argv[2]??"inventory";
 let client;
 try{
  if(!["inventory","install"].includes(mode))fail("UNRECOGNIZED_MODE");
  if(!process.env.DATABASE_URL)fail("NEON_OWNER_DATABASE_URL_MISSING");
  let bytes;
  if(mode==="install"){
   const file=admitExplicitOwnerInstall(process.env);
   bytes=readFileSync(file);
   reviewExactV0096Sql(bytes,process.env.P5_V0096_REVIEWED_SQL_BLOB_SHA);
  }
  client=new Client({
   connectionString:process.env.DATABASE_URL,
   connectionTimeoutMillis:8000,
   application_name:"phase6_v0096_owner_only_no_provider"
  });
  await client.connect();
  const out=mode==="inventory"?
    await readV0096OwnerInventory(client):
    await installV0096OnceOwner({
     client,rawMigration:bytes,
     blobSha:process.env.P5_V0096_REVIEWED_SQL_BLOB_SHA
    });
  console.log(JSON.stringify(out));
 }catch{
  console.error("HOLD_V0096_OWNER_ONCE_NO_RETRY_NO_PROVIDER_NO_GO");
  process.exitCode=2;
 }finally{if(client)await client.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
