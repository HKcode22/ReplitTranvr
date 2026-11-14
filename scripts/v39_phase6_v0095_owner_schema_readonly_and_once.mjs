/**
 * Phase6 V0095 one-use empty-schema owner guard. The LIVE postgres owner can
 * run a READ-ONLY inventory without enabling paid operations. Installing the
 * exact reviewed SQL is a different, explicit ONE-TIME owner action after
 * V0094 has been separately installed and independently read back.
 *
 * No AeroDataBox HTTP, no raw flight Contents, no app login/secret creation,
 * no Phase6 GO, no V0079-V0093 replay, no GH scheduled activation.
 */
import "dotenv/config";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import pg from "pg";
import {
 gitBlobSha1,readV0094OwnerInventory
} from "./v39_phase6_v0094_owner_schema_readonly_and_once.mjs";

const {Client}=pg;
export const V0095_MIGRATION_PATH=
 "migrations/staged/V0095__phase6_private_source_query_post_packet_kind_scope_inert_v39.sql";
export const V0095_REVIEWED_SQL_BLOB_SHA=
 "845d8bfd84cae6262ceaa421ba2f9f5ca5df1939";
export const V0095_ONE_TIME_OWNER_APPROVAL=
 "INSTALL_ONCE_V0095_PRIVATE_SOURCE_POST_KINDS_NO_LOGIN_NO_PAID";
const TABLE="phase6_private.frozen_native_packet_v39";
const CODE=/^[0-9a-f]{40}$/;
const fail=s=>{throw Error("HOLD_V0095_OWNER_SCHEMA_"+s);};
export function reviewExactV0095Sql(bytes,blob){
 if(!Buffer.isBuffer(bytes)||
    bytes.length<4000||bytes.length>16000||
    blob!==V0095_REVIEWED_SQL_BLOB_SHA||
    gitBlobSha1(bytes)!==V0095_REVIEWED_SQL_BLOB_SHA)
  fail("EXACT_PINNED_REVIEWED_SQL_BLOB_REQUIRED");
 const s=bytes.toString("utf8");
 if(!s.startsWith("-- V0095 Phase5→6: staged ONE-USE")||
    (s.match(/^BEGIN;$/gm)||[]).length!==1||
    (s.match(/^COMMIT;$/gm)||[]).length!==1||
    !s.includes("P5_V0095_V0094_MUST_EXIST_DO_NOT_INSTALL_OUT_OF_ORDER")||
    !s.includes("P5_V0095_ALREADY_INSTALLED_NEVER_REPLAY")||
    !s.includes("P5_V0095_EXISTING_PRIVATE_ROWS_HOLD_INDEPENDENT_REVIEW")||
    !s.includes("DROP CONSTRAINT frozen_native_packet_v39_kind_check")||
    !s.includes("DROP CONSTRAINT p5_v0094_kind_path_guard")||
    !s.includes("ADD CONSTRAINT p5_v0095_kind_allowed")||
    !s.includes("ADD CONSTRAINT p5_v0095_kind_path_guard")||
    !s.includes("P5_V0095_PRIVATE_ACL_WEAKENED")||
    /\b(?:CREATE ROLE|ALTER ROLE|CREATE USER|DROP TABLE|TRUNCATE|DELETE FROM)\b/i.test(s))
  fail("UNREVIEWED_MIGRATION_CONTENTS_OR_NEW_PRIVILEGE");
 return s;
}
export function classifyV0095ConstraintState(names,definitions,v0094State){
 if(v0094State==="COLD_V0094_NOT_INSTALLED"){
  if(names.length!==0)fail("IMPOSSIBLE_COLD_V0094_WITH_V0095_CONSTRAINT");
  return "V0094_MISSING_V0095_NOT_INSTALLED_NO_GO";
 }
 if(v0094State!=="INSTALLED_EMPTY_INERT_V0094_NOLOGIN_NO_GO"||
    !Array.isArray(names)||new Set(names).size!==names.length)
  fail("V0094_NOT_INDEPENDENTLY_READY_OR_PARTIAL");
 const old=[
  "frozen_native_packet_v39_kind_check",
  "p5_v0094_kind_path_guard"
 ],newer=[
  "p5_v0095_kind_allowed","p5_v0095_kind_path_guard"
 ];
 if(names.length===2&&old.every(x=>names.includes(x)))
  return "V0094_READY_EMPTY_V0095_NOT_INSTALLED_NO_GO";
 if(names.length===2&&newer.every(x=>names.includes(x))){
  const kinds=definitions.p5_v0095_kind_allowed??"";
  const pathGuard=definitions.p5_v0095_kind_path_guard??"";
  if(!["SOURCE_DAY_REGISTRY","SOURCE_QUERY_PACKET",
        "LATER_PRE_PACKET","LATER_PRE_DAY_REGISTRY","POST_PACKET"]
      .every(x=>kinds.includes("'"+x+"'"))||
     !["source_","sourceq_","post_","frozen/"]
      .every(x=>pathGuard.includes(x)))
   fail("V0095_INSTALLED_BUT_CONSTRAINT_DEFINITION_UNREVIEWED");
  return "V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO";
 }
 fail("PARTIAL_OR_DRIFTED_V0095_CONSTRAINTS_INDEPENDENT_REVIEW");
}
/** No Contents/flight data or provider keys read. */
export async function readV0095OwnerInventory(client){
 const v0094=await readV0094OwnerInventory(client);
 if(v0094.state==="COLD_V0094_NOT_INSTALLED")
  return{status:"V0095_OWNER_READONLY_INVENTORY",
   state:classifyV0095ConstraintState([],{},v0094.state),
   previousV0094State:v0094.state,
   db:v0094.db,actor:v0094.actor,
   version:v0094.version,tableRows:null,
   constraints:[],noPublicFlightsRead:true,
   providerCalls:0,databaseWrites:0,paidPhase6Go:false};
 if(v0094.state!=="INSTALLED_EMPTY_INERT_V0094_NOLOGIN_NO_GO"||
    v0094.tableRows!==0)
  fail("V0094_INCOMPLETE_OR_NOT_EMPTY_NO_OWNER_DDL");
 let started=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  started=true;
  await client.query("SET LOCAL statement_timeout='8000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const r=await client.query(
   "SELECT conname,pg_catalog.pg_get_constraintdef(oid) AS definition"+
   " FROM pg_catalog.pg_constraint WHERE conrelid=$1::regclass"+
   " AND conname=ANY($2::text[]) ORDER BY conname",
   [TABLE,[
    "frozen_native_packet_v39_kind_check",
    "p5_v0094_kind_path_guard",
    "p5_v0095_kind_allowed",
    "p5_v0095_kind_path_guard"
   ]]
  );
  if(!Array.isArray(r?.rows)||r.rows.length>4||
     r.rows.some(x=>typeof x.conname!=="string"||
        typeof x.definition!=="string"))
   fail("PG16_CONSTRAINT_CATALOG_UNAVAILABLE");
  const names=r.rows.map(x=>x.conname),defs=Object.fromEntries(
   r.rows.map(x=>[x.conname,x.definition]));
  const state=classifyV0095ConstraintState(names,defs,v0094.state);
  await client.query("ROLLBACK");started=false;
  return{
   status:"V0095_OWNER_READONLY_INVENTORY",
   state,previousV0094State:v0094.state,
   db:v0094.db,actor:v0094.actor,version:v0094.version,
   tableRows:0,constraints:names,
   noPublicFlightsRead:true,
   providerCalls:0,databaseWrites:0,paidPhase6Go:false
  };
 }catch(e){
  if(started)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }
}
/** No retry on DDL/COMMIT error: independent readback decides any outcome. */
export async function installV0095OnceOwner({
 client,rawMigration,blobSha
}){
 reviewExactV0095Sql(rawMigration,blobSha);
 const before=await readV0095OwnerInventory(client);
 if(before.state!=="V0094_READY_EMPTY_V0095_NOT_INSTALLED_NO_GO")
  fail("OUT_OF_ORDER_ALREADY_INSTALLED_OR_NOT_EMPTY_NEVER_REPLAY");
 try{
  await client.query(rawMigration.toString("utf8"));
 }catch{fail("SQL_FAILED_OR_COMMIT_UNKNOWN_NO_RETRY_INDEPENDENT_READBACK");}
 const after=await readV0095OwnerInventory(client);
 if(after.state!=="V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO"||
    after.tableRows!==0)
  fail("V0095_POST_INSTALL_OWNER_STATE_UNVERIFIED_HOLD");
 return{
  status:"V0095_ONE_USE_EMPTY_PRIVATE_KIND_EXTENSION_OWNER_READBACK_NO_GO",
  reviewedSqlGitBlobSha:blobSha,
  preexistingV0094SchemaAndRolesReused:true,
  additionalLoginRolesCreated:0,
  originalPrivatePacketRows:0,
  additionalKinds:["SOURCE_QUERY_PACKET","POST_PACKET"],
  requiresSecondIndependentReadback:true,
  signedRealSourceRegistryPresent:false,
  providerCalls:0,flightWrites:0,paidPhase6Go:false
 };
}
function requireOwnerOneTimeApproval(env){
 if(env.GITHUB_ACTIONS==="true"||
    env.P5_V0095_OWNER_APPROVAL!==V0095_ONE_TIME_OWNER_APPROVAL||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED==="1"||
    env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.RAPIDAPI_KEY||
    !CODE.test(env.P5_V0095_REVIEWED_MAIN_SHA??"")||
    env.P5_V0095_REVIEWED_SQL_BLOB_SHA!==V0095_REVIEWED_SQL_BLOB_SHA||
    !/^\/tmp\/p5-v0095-owner-[A-Za-z0-9]{6,16}\/V0095__phase6_private_source_query_post_packet_kind_scope_inert_v39\.sql$/
      .test(env.P5_V0095_REVIEWED_SQL_FILE??""))
  fail("EXACT_OWNER_PIN_AND_STOP_APPROVAL_REQUIRED");
 let live;
 try{live=execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"]
 }).trim();}
 catch{fail("LOCAL_CODE_SHA_UNAVAILABLE");}
 if(live!==env.P5_V0095_REVIEWED_MAIN_SHA)
  fail("REVIEWED_MAIN_AND_LOCAL_CHECKOUT_MISMATCH");
 return env.P5_V0095_REVIEWED_SQL_FILE;
}
async function main(){
 const mode=process.argv[2]??"inventory";
 let client;
 try{
  if(!["inventory","install"].includes(mode))
   fail("UNRECOGNIZED_OWNER_MODE");
  if(!process.env.DATABASE_URL)
   fail("OWNER_DATABASE_URL_MISSING");
  let raw;
  if(mode==="install"){
   const file=requireOwnerOneTimeApproval(process.env);
   raw=readFileSync(file);
   reviewExactV0095Sql(raw,process.env.P5_V0095_REVIEWED_SQL_BLOB_SHA);
  }
  client=new Client({
   connectionString:process.env.DATABASE_URL,
   connectionTimeoutMillis:8000,
   application_name:"phase6_v0095_owner_only_no_provider"
  });
  await client.connect();
  const result=mode==="inventory"?
   await readV0095OwnerInventory(client):
   await installV0095OnceOwner({
    client,rawMigration:raw,
    blobSha:process.env.P5_V0095_REVIEWED_SQL_BLOB_SHA
   });
  console.log(JSON.stringify(result));
 }catch{
  console.error("HOLD_V0095_OWNER_SCHEMA_NO_RETRY_NO_PROVIDER_NO_GO");
  process.exitCode=2;
 }finally{if(client)await client.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
