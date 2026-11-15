/**
 * V0098 empty-schema owner inventory / separately approved exact install.
 * Never installs V0095 or V0097, creates roles, reads payloads, or arms paid.
 */
import pg from "pg";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {gitBlobSha1} from "./v39_phase6_v0094_owner_schema_readonly_and_once.mjs";
import {readV0097OwnerInventory} from "./v39_phase6_v0097_day_epoch_owner_schema_readonly_and_once.mjs";

export const V0098_PATH="migrations/staged/V0098__phase6_atomic_private_review_wire_transport_inert_v39.sql";
export const V0098_BLOB="dcbe7a1647b45e216b18493b1697add61fdaff75";
export const V0098_APPROVAL="INSTALL_ONCE_V0098_EMPTY_PRIVATE_REVIEW_WIRES_NO_LOGIN_NO_PAID";
const INDEX="phase6_private.signed_run_day_index_revision_v39";
const PACKET="phase6_private.frozen_native_packet_v39";
const READY="V0097_INSTALLED_EMPTY_PER_DAY_INDEX_INERT_NO_GO";
const ABSENT="V0097_READY_EMPTY_V0098_NOT_INSTALLED_NO_GO";
const INSTALLED="V0098_INSTALLED_EMPTY_PRIVATE_WIRE_EXTENSION_INERT_NO_GO";
const fail=x=>{throw Error("HOLD_V0098_"+x)};
export function reviewV0098Sql(bytes){
 if(!Buffer.isBuffer(bytes)||gitBlobSha1(bytes)!==V0098_BLOB||
    !bytes.toString("utf8").startsWith("-- STAGED ONLY: atomically retain detached signed review")||
    !bytes.toString("utf8").trimEnd().endsWith("COMMIT;"))
  fail("PINNED_STAGED_SQL_REQUIRED");
 return bytes.toString("utf8");
}
export function admitV0098OwnerInstall(env,localSha,remoteSha){
 if(env.GITHUB_ACTIONS==="true"||!env.DATABASE_URL||
    env.P5_V0098_OWNER_APPROVAL!==V0098_APPROVAL||
    !/^[a-f0-9]{40}$/.test(localSha)||localSha!==remoteSha||
    env.P5_V0098_REVIEWED_MAIN_SHA!==localSha||
    env.P5_V0098_REVIEWED_SQL_BLOB!==V0098_BLOB||
    !/^[a-f0-9]{64}$/.test(env.P5_V0098_INDEPENDENT_RELEASE_REVIEW_SHA256??"")||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||env.AERODATABOX_API_KEY||
    env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    (env.V39_DATABASE_RUNTIME_URL&&env.V39_DATABASE_RUNTIME_URL!==env.DATABASE_URL))
  fail("EXACT_OWNER_RELEASE_REVIEWS_AND_STOP_REQUIRED");
 return true;
}
export function classifyV0098WireCatalog(columns,constraints){
 if(!Array.isArray(columns)||!Array.isArray(constraints))
  fail("UNAVAILABLE_COLUMN_CONSTRAINT_CATALOG");
 if(columns.length===0&&constraints.length===0)return ABSENT;
 if(columns.length!==2||constraints.length!==2||
    new Set(columns.map(x=>x.table_name)).size!==2||
    new Set(constraints.map(x=>x.table_name)).size!==2||
    columns.some(x=>![INDEX,PACKET].includes(x.table_name)||
     x.column_type!=="bytea"||x.not_null!==false||x.has_default!==false)||
    constraints.some(x=>![INDEX,PACKET].includes(x.table_name)||x.validated!==true||
     x.name!==(x.table_name===INDEX?"p6_v0098_index_wire_size":"p6_v0098_packet_wire_scope")||
     typeof x.definition!=="string"||
     !x.definition.includes("review_wire_bytes IS NULL")||
     !x.definition.includes("octet_length(review_wire_bytes)")||
     !x.definition.includes("100")||!x.definition.includes("4096")||
     (x.table_name===PACKET&&(!x.definition.includes("SOURCE_QUERY_PACKET")||!x.definition.includes("POST_PACKET")))))
  fail("PARTIAL_OR_DRIFTED_V0098_NO_REPLAY");
 return INSTALLED;
}
export async function readV0098OwnerInventory(client){
 const prior=await readV0097OwnerInventory(client);
 const report={status:"V0098_OWNER_READONLY_INVENTORY",previousState:prior.state,
  db:prior.db,actor:prior.actor,version:prior.version,providerCalls:0,
  databaseWrites:0,paidPhase6Go:false,additionalLoginRolesCreated:0};
 if(prior.state!==READY)return {...report,state:"V0097_PREREQUISITE_NOT_READY_NO_GO"};
 let active=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");active=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const columns=(await client.query(
   "SELECT n.nspname||'.'||c.relname AS table_name,format_type(a.atttypid,a.atttypmod) AS column_type,"+
   " a.attnotnull AS not_null,a.atthasdef AS has_default FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid"+
   " JOIN pg_namespace n ON n.oid=c.relnamespace"+
   " WHERE c.oid=ANY(ARRAY[$1::regclass,$2::regclass]) AND a.attname='review_wire_bytes' AND NOT a.attisdropped AND a.attnum>0",
   [INDEX,PACKET])).rows;
  const constraints=(await client.query(
   "SELECT n.nspname||'.'||c.relname AS table_name,k.conname AS name,k.convalidated AS validated,"+
   " pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid"+
   " JOIN pg_namespace n ON n.oid=c.relnamespace"+
   " WHERE c.oid=ANY(ARRAY[$1::regclass,$2::regclass]) AND k.conname IN ('p6_v0098_index_wire_size','p6_v0098_packet_wire_scope')",
   [INDEX,PACKET])).rows;
  const state=classifyV0098WireCatalog(columns,constraints);
  await client.query("ROLLBACK");active=false;
  return {...report,state,privatePacketRows:prior.privatePacketRows,indexRows:prior.indexRows,
   wireColumnCount:columns.length,wireConstraintCount:constraints.length};
 }finally{if(active)await client.query("ROLLBACK").catch(()=>{});}
}
export async function installV0098OnceOwner({client,bytes}){
 const sql=reviewV0098Sql(bytes);
 const before=await readV0098OwnerInventory(client);
 if(before.state!==ABSENT)fail("PREREQUISITE_OR_ALREADY_PRESENT_NEVER_REPLAY");
 try{await client.query(sql)}catch{fail("DDL_OR_COMMIT_UNKNOWN_NO_RETRY_INDEPENDENT_READBACK");}
 const after=await readV0098OwnerInventory(client);
 if(after.state!==INSTALLED)fail("POSTCOMMIT_STATE_NOT_VERIFIED");
 return {status:"V0098_EMPTY_SCHEMA_OWNER_READBACK_NO_GO",sqlBlob:V0098_BLOB,
  existingRolesReused:true,indexRows:after.indexRows,privatePacketRows:after.privatePacketRows,
  wireColumnCount:after.wireColumnCount,additionalLoginRolesCreated:0,providerCalls:0,
  flightWrites:0,independentFreshReadbackRequired:true,paidPhase6Go:false};
}
async function main(){
 let c;
 try{
  const mode=process.argv[2]??"inventory";
  if(!["inventory","install"].includes(mode)||!process.env.DATABASE_URL||
     process.env.GITHUB_ACTIONS==="true"||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
     (process.env.V39_DATABASE_RUNTIME_URL&&process.env.V39_DATABASE_RUNTIME_URL!==process.env.DATABASE_URL))
   fail("EXISTING_OWNER_DB_AND_EXACT_MODE_REQUIRED");
  let bytes;
  if(mode==="install"){
   const cmd=(s,args)=>execFileSync(s,args,{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
   admitV0098OwnerInstall(process.env,cmd("git",["rev-parse","HEAD"]),
    cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]));
   bytes=readFileSync(V0098_PATH);reviewV0098Sql(bytes);
  }
  c=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,
   query_timeout:40000,options:mode==="inventory"?"-c default_transaction_read_only=on":undefined,
   application_name:"p6_v0098_owner_inert_schema"});
  await c.connect();console.log(JSON.stringify(mode==="inventory"?await readV0098OwnerInventory(c):
   await installV0098OnceOwner({client:c,bytes})));
 }catch(e){
  console.error(/^HOLD_V009[4578]_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_V0098_UNKNOWN_NO_RETRY");
  process.exitCode=2;
 }finally{if(c)await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
