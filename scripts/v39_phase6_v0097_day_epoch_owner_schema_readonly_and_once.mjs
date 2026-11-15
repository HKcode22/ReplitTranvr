/**
 * V0097: one-use EMPTY private run-day epoch schema candidate.
 * Reuses authentic V0094/V0095 groups; old global V0096 is prohibited.
 * CLI defaults to read-only inventory. No provider, login, private bytes,
 * flight writes or paid GO. Only after external release review may an
 * owner explicitly install the exact reviewed staged SQL.
 */
import pg from "pg";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {gitBlobSha1} from "./v39_phase6_v0094_owner_schema_readonly_and_once.mjs";
import {readV0095OwnerInventory} from "./v39_phase6_v0095_owner_schema_readonly_and_once.mjs";

export const V0097_PATH="migrations/staged/V0097__phase6_private_run_day_epoch_index_inert_v39.sql";
export const V0097_BLOB="70033952e734e389a0be02205d7cbb6eefbc0462";
export const V0097_APPROVAL="INSTALL_ONCE_V0097_EMPTY_PER_DAY_INDEX_NO_LOGIN_NO_PAID";
const CLAIM="phase6_private.signed_run_day_epoch_claim_v39";
const INDEX="phase6_private.signed_run_day_index_revision_v39";
const LEGACY="phase6_private.signed_day_shard_index_revision_v39";
const READER="phase6_private_frozen_reader_v39";
const PUBLISHER="phase6_private_frozen_publisher_v39";
const sha=/^[a-f0-9]{40}$/;
const hash=/^[a-f0-9]{64}$/;
const fail=x=>{throw Error("HOLD_V0097_"+x)};
export function reviewV0097Sql(bytes){
 if(!Buffer.isBuffer(bytes)||gitBlobSha1(bytes)!==V0097_BLOB||
    !bytes.toString("utf8").startsWith("-- V0097 STAGED ONLY:")||
    !bytes.toString("utf8").trimEnd().endsWith("COMMIT;"))
  fail("PINNED_STAGED_SQL_REQUIRED");
 return bytes.toString("utf8");
}
export function admitV0097OwnerInstall(env,localSha,remoteSha){
 if(env.GITHUB_ACTIONS==="true"||!env.DATABASE_URL||
    env.P5_V0097_OWNER_APPROVAL!==V0097_APPROVAL||
    !sha.test(localSha)||localSha!==remoteSha||
    env.P5_V0097_REVIEWED_MAIN_SHA!==localSha||
    env.P5_V0097_REVIEWED_SQL_BLOB!==V0097_BLOB||
    !hash.test(env.P5_V0097_INDEPENDENT_RELEASE_REVIEW_SHA256??"")||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    (env.V39_DATABASE_RUNTIME_URL&&env.V39_DATABASE_RUNTIME_URL!==env.DATABASE_URL))
  fail("EXACT_OWNER_RELEASE_REVIEWS_AND_STOP_REQUIRED");
 return true;
}
export async function readV0097OwnerInventory(client){
 const prior=await readV0095OwnerInventory(client);
 const result={status:"V0097_OWNER_READONLY_INVENTORY",
  previousState:prior.state,db:prior.db,actor:prior.actor,
  version:prior.version,providerCalls:0,databaseWrites:0,paidPhase6Go:false};
 let active=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");active=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const r=(await client.query(
   "SELECT to_regclass($1) IS NOT NULL AS claim_present,"+
   " to_regclass($2) IS NOT NULL AS index_present,"+
   " to_regclass($3) IS NOT NULL AS old_global_present,"+
   " to_regprocedure('phase6_private.guard_run_day_epoch_index_insert_v39()') IS NOT NULL AS function_present",
   [CLAIM,INDEX,LEGACY])).rows[0];
  if(!r||r.old_global_present)fail("OLD_GLOBAL_V0096_PRESENT_NEVER_MIGRATE");
  let state,rows=null;
  if(!r.claim_present&&!r.index_present&&!r.function_present){
   state=prior.state==="V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO"?
    "V0095_READY_EMPTY_V0097_NOT_INSTALLED_NO_GO":
    "V0095_PREREQUISITE_NOT_READY_V0097_ABSENT_NO_GO";
  }else{
   if(!r.claim_present||!r.index_present||!r.function_present||
      prior.state!=="V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO")
    fail("PARTIAL_OR_OUT_OF_ORDER_SCHEMA_NO_REPLAY");
   const catalog=(await client.query(
    "SELECT n.nspname||'.'||c.relname AS table_name,"+
    " pg_get_userbyid(c.relowner) AS owner,"+
    " (SELECT count(*)::int FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='p') AS pks,"+
    " (SELECT count(*)::int FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND t.tgenabled='O') AS triggers,"+
    " EXISTS(SELECT 1 FROM aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee=0) AS public_acl,"+
    " has_table_privilege($1::text,c.oid,'SELECT') AS reader_select,"+
    " has_table_privilege($1::text,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS reader_write,"+
    " has_table_privilege($2::text,c.oid,'SELECT') AS publisher_select,"+
    " has_table_privilege($2::text,c.oid,'INSERT') AS publisher_insert,"+
    " has_table_privilege($2::text,c.oid,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS publisher_other_write"+
    " FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace"+
    " WHERE c.oid=ANY(ARRAY[$3::regclass,$4::regclass])",
    [READER,PUBLISHER,CLAIM,INDEX])).rows;
   if(catalog.length!==2||catalog.some(x=>
    ![CLAIM,INDEX].includes(x.table_name)||x.owner!=="neondb_owner"||
    x.pks!==1||x.triggers!==(x.table_name===CLAIM?1:2)||
    x.public_acl!==false||x.reader_select!==true||x.reader_write!==false||
    x.publisher_select!==true||x.publisher_other_write!==false||
    x.publisher_insert!==(x.table_name===INDEX)))
    fail("POSTCOMMIT_OWNER_PK_TRIGGER_OR_ACL_HOLD");
   const constraints=(await client.query(
    "SELECT conname,pg_get_constraintdef(oid) AS def FROM pg_constraint"+
    " WHERE conrelid=$1::regclass",
    [INDEX])).rows;
   const defs=Object.fromEntries(constraints.map(x=>[x.conname,x.def]));
   if(!defs.p6_epoch_day_revision_pk?.includes("run_day_index, revision")||
      !defs.p6_epoch_previous_sha_guard||
      !defs.p6_epoch_index_bytes_sha_guard?.includes("sha256")||
      !defs.p6_epoch_index_retention_guard?.includes("7 days"))
    fail("POSTCOMMIT_CONSTRAINT_DRIFT");
   const n=(await client.query(
    "SELECT (SELECT count(*)::int FROM "+CLAIM+") AS claims,"+
    " (SELECT count(*)::int FROM "+INDEX+") AS revisions"
   )).rows[0];
   if(!n||n.claims!==0||n.revisions!==0)
    fail("NONEMPTY_EPOCH_SCHEMA_NEVER_REPLAY");
   rows=n;
   state="V0097_INSTALLED_EMPTY_PER_DAY_INDEX_INERT_NO_GO";
  }
  await client.query("ROLLBACK");active=false;
  return {...result,state,...r,indexRows:rows,privatePacketRows:prior.tableRows,
   additionalLoginRolesCreated:0};
 }finally{if(active)await client.query("ROLLBACK").catch(()=>{});}
}
export async function installV0097OnceOwner({client,bytes}){
 const sql=reviewV0097Sql(bytes);
 const before=await readV0097OwnerInventory(client);
 if(before.state!=="V0095_READY_EMPTY_V0097_NOT_INSTALLED_NO_GO")
  fail("PREREQUISITE_OR_ALREADY_PRESENT_NEVER_REPLAY");
 try{await client.query(sql)}catch{
  fail("DDL_OR_COMMIT_UNKNOWN_NO_RETRY_INDEPENDENT_READBACK");
 }
 const after=await readV0097OwnerInventory(client);
 if(after.state!=="V0097_INSTALLED_EMPTY_PER_DAY_INDEX_INERT_NO_GO")
  fail("POSTCOMMIT_STATE_NOT_VERIFIED");
 return {status:"V0097_EMPTY_SCHEMA_OWNER_READBACK_NO_GO",
  sqlBlob:V0097_BLOB,existingV0094V0095RolesReused:true,
  indexRows:after.indexRows,privatePacketRows:0,
  additionalLoginRolesCreated:0,providerCalls:0,flightWrites:0,
  independentFreshReadbackRequired:true,paidPhase6Go:false};
}
async function main(){
 let c;
 try{
  const mode=process.argv[2]??"inventory";
  if(!["inventory","install"].includes(mode)||!process.env.DATABASE_URL)
   fail("MODE_OR_EXISTING_OWNER_DB_MISSING");
  let bytes;
  if(mode==="install"){
   const cmd=(s,args)=>execFileSync(s,args,{encoding:"utf8",
    stdio:["ignore","pipe","ignore"]}).trim();
   const local=cmd("git",["rev-parse","HEAD"]);
   const remote=cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]);
   admitV0097OwnerInstall(process.env,local,remote);
   bytes=readFileSync(V0097_PATH);reviewV0097Sql(bytes);
  }
  c=new pg.Client({connectionString:process.env.DATABASE_URL,
   connectionTimeoutMillis:8000,query_timeout:40000,
   options:mode==="inventory"?"-c default_transaction_read_only=on":undefined,
   application_name:"p6_v0097_owner_inert_schema"});
  await c.connect();
  console.log(JSON.stringify(mode==="inventory"?await readV0097OwnerInventory(c):
   await installV0097OnceOwner({client:c,bytes})));
 }catch(e){
  const code=/^HOLD_V009[457]_[A-Z0-9_]+$/.test(e?.message??"")?
   e.message:"HOLD_V0097_UNKNOWN_NO_RETRY";
  console.error(code);process.exitCode=2;
 }finally{if(c)await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
