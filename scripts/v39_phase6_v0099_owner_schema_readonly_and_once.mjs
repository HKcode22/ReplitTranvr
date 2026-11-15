/** V0099 owner-only empty schema inventory / separately approved one-use install.
 * No prior migration replay, no new logins, no flight data, no provider.
 * V0099 supersedes V0095/V0098 packet guards; their old empty-state
 * inspectors cannot be used to classify a successful V0099 installation. */
import pg from "pg";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {gitBlobSha1,readV0094OwnerInventory} from "./v39_phase6_v0094_owner_schema_readonly_and_once.mjs";
import {readV0098OwnerInventory} from "./v39_phase6_v0098_owner_schema_readonly_and_once.mjs";
export const V0099_PATH="migrations/staged/V0099__phase6_private_daily_prepare_review_packet_inert_v39.sql";
export const V0099_BLOB="0731fdb0f96fe5c1416fae8dd64327900c91c287";
export const V0099_APPROVAL="INSTALL_ONCE_V0099_EMPTY_DAILY_PREPARE_REVIEW_NO_LOGIN_NO_PAID";
const PACKET="phase6_private.frozen_native_packet_v39",INDEX="phase6_private.signed_run_day_index_revision_v39",CLAIM="phase6_private.signed_run_day_epoch_claim_v39";
const ABSENT="V0098_READY_EMPTY_V0099_NOT_INSTALLED_NO_GO",READY="V0099_INSTALLED_EMPTY_DAILY_REVIEW_INERT_NO_GO";
const fail=s=>{throw Error("HOLD_V0099_"+s);};
export function reviewV0099Sql(bytes){
 if(!Buffer.isBuffer(bytes)||gitBlobSha1(bytes)!==V0099_BLOB||
  !bytes.toString("utf8").startsWith("-- STAGED ONLY. Extend existing private packet transport")||
  !bytes.toString("utf8").trimEnd().endsWith("COMMIT;"))fail("EXACT_PINNED_SQL_REQUIRED");
 return bytes.toString("utf8");
}
export function admitV0099OwnerInstall(env,local,remote){
 if(env.GITHUB_ACTIONS==="true"||!env.DATABASE_URL||env.P5_V0099_OWNER_APPROVAL!==V0099_APPROVAL||
  !/^[a-f0-9]{40}$/.test(local)||local!==remote||env.P5_V0099_REVIEWED_MAIN_SHA!==local||
  env.P5_V0099_REVIEWED_SQL_BLOB!==V0099_BLOB||
  !/^[a-f0-9]{64}$/.test(env.P5_V0099_INDEPENDENT_RELEASE_REVIEW_SHA256??"")||
  env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
  env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
  env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
  (env.V39_DATABASE_RUNTIME_URL&&env.V39_DATABASE_RUNTIME_URL!==env.DATABASE_URL))
  fail("EXACT_OWNER_SCOPE_AND_STOP_REQUIRED");
 return true;
}
export async function readV0099OwnerInventory(client){
 const base=await readV0094OwnerInventory(client);
 const report={db:base.db,actor:base.actor,version:base.version,status:"V0099_OWNER_READONLY_INVENTORY",
  providerCalls:0,databaseWrites:0,paidPhase6Go:false,additionalLoginRolesCreated:0};
 if(!base.tablePresent)return {...report,state:"V0094_PREREQUISITE_ABSENT_NO_GO"};
 let tx=false,installed=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const defs=(await client.query("SELECT conname,convalidated,pg_get_constraintdef(oid) AS def "+
   "FROM pg_constraint WHERE conrelid=$1::regclass AND conname LIKE 'p6_v0099_%'",[PACKET])).rows;
  installed=defs.length>0;
  if(installed){
   if(base.state!=="INSTALLED_EMPTY_INERT_V0094_NOLOGIN_NO_GO"||base.tableRows!==0)fail("NONEMPTY_OR_ROLE_DRIFT_NO_REPLAY");
   const by=Object.fromEntries(defs.map(d=>[d.conname,d.def]));
   if(defs.length!==4||defs.some(d=>d.convalidated!==true)||
    !["SOURCE_DAY_PREPARE_REVIEW","SOURCE_DAY_REGISTRY","SOURCE_QUERY_PACKET","POST_PACKET","LATER_PRE_PACKET","LATER_PRE_DAY_REGISTRY"].every(k=>by.p6_v0099_kind_allowed?.includes(k))||
    !["prepare_d","manifest_sha256","shard_index","sourceq_","post_"].every(k=>by.p6_v0099_kind_path_guard?.includes(k))||
    !["sha256","500000","250000","content_sha256"].every(k=>by.p6_v0099_bytes_guard?.includes(k))||
    !["review_wire_bytes IS NOT NULL","4096","7 days","SOURCE_DAY_PREPARE_REVIEW"].every(k=>by.p6_v0099_packet_wire_scope?.includes(k)))
    fail("PARTIAL_OR_DRIFTED_V0099_CONSTRAINTS");
   const state=(await client.query("SELECT to_regclass($1) IS NOT NULL AS idx,to_regclass($2) IS NOT NULL AS claim,"+
    "to_regclass('phase6_private.signed_day_shard_index_revision_v39') IS NULL AS no_old,"+
    "(SELECT count(*)::int FROM pg_constraint WHERE conrelid=$3::regclass AND conname IN ('p5_v0095_kind_allowed','p5_v0095_kind_path_guard','p5_v0094_bytes_guard','p6_v0098_packet_wire_scope')) AS superseded",
    [INDEX,CLAIM,PACKET])).rows[0];
   if(!state?.idx||!state.claim||!state.no_old||state.superseded!==0)fail("INDEX_OR_SUPERSEDED_GUARD_DRIFT");
   const c=(await client.query("SELECT count(*)::int AS n FROM pg_attribute WHERE attrelid=ANY(ARRAY[$1::regclass,$2::regclass]) "+
    "AND attname='review_wire_bytes' AND NOT attisdropped AND atttypid='bytea'::regtype AND NOT attnotnull AND NOT atthasdef",[INDEX,PACKET])).rows[0];
   const i=(await client.query("SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid=$1::regclass AND convalidated "+
    "AND conname IN ('p6_v0098_index_wire_size','p6_epoch_day_revision_pk','p6_epoch_previous_sha_guard','p6_epoch_index_bytes_sha_guard','p6_epoch_index_retention_guard')",[INDEX])).rows[0];
   const acl=(await client.query("SELECT n.nspname||'.'||c.relname AS name,pg_get_userbyid(c.relowner) AS owner,"+
    "EXISTS(SELECT 1 FROM aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee=0) AS pub,"+
    "has_table_privilege('phase6_private_frozen_reader_v39',c.oid,'SELECT') AS rs,"+
    "has_table_privilege('phase6_private_frozen_reader_v39',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS rw,"+
    "has_table_privilege('phase6_private_frozen_publisher_v39',c.oid,'SELECT') AS ps,"+
    "has_table_privilege('phase6_private_frozen_publisher_v39',c.oid,'INSERT') AS pi,"+
    "has_table_privilege('phase6_private_frozen_publisher_v39',c.oid,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS pw,"+
    "(SELECT count(*)::int FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND t.tgenabled='O') AS triggers "+
    "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=ANY(ARRAY[$1::regclass,$2::regclass,$3::regclass])",[INDEX,CLAIM,PACKET])).rows;
   if(c?.n!==2||i?.n!==5||acl.length!==3||acl.some(x=>x.owner!=="neondb_owner"||x.pub!==false||x.rs!==true||x.rw!==false||x.ps!==true||x.pw!==false||x.pi!==(x.name!==CLAIM)||x.triggers!==(x.name===INDEX?2:1)))fail("WIRE_INDEX_OR_ACL_DRIFT");
   const counts=(await client.query("SELECT (SELECT count(*)::int FROM "+INDEX+") AS revisions,(SELECT count(*)::int FROM "+CLAIM+") AS claims,(SELECT count(*)::int FROM "+PACKET+") AS packets")).rows[0];
   if(!counts||counts.revisions!==0||counts.claims!==0||counts.packets!==0)fail("NONEMPTY_TRANSPORT_NO_REPLAY");
   await client.query("ROLLBACK");tx=false;
   return {...report,state:READY,counts,wireColumns:c.n,guardCount:defs.length};
  }
  await client.query("ROLLBACK");tx=false;
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});}
 const prior=await readV0098OwnerInventory(client);
 return {...report,previousState:prior.state,state:prior.state==="V0098_INSTALLED_EMPTY_PRIVATE_WIRE_EXTENSION_INERT_NO_GO"?ABSENT:"V0098_PREREQUISITE_NOT_READY_NO_GO"};
}
export async function installV0099OnceOwner({client,bytes}){
 const sql=reviewV0099Sql(bytes),before=await readV0099OwnerInventory(client);
 if(before.state!==ABSENT)fail("PREREQUISITE_OR_ALREADY_PRESENT_NEVER_REPLAY");
 try{await client.query(sql);}catch{fail("DDL_OR_COMMIT_UNKNOWN_NO_RETRY_INDEPENDENT_READBACK");}
 const after=await readV0099OwnerInventory(client);
 if(after.state!==READY)fail("POSTCOMMIT_STATE_NOT_VERIFIED");
 return {...after,status:"V0099_EMPTY_SCHEMA_OWNER_READBACK_NO_GO",sqlBlob:V0099_BLOB,
  existingRolesReused:true,independentFreshReadbackRequired:true,flightWrites:0};
}
async function main(){
 let c;
 try{
  const mode=process.argv[2]??"inventory",env=process.env;
  if(!["inventory","install"].includes(mode)||!env.DATABASE_URL||env.GITHUB_ACTIONS==="true"||
   env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||(env.V39_DATABASE_RUNTIME_URL&&env.V39_DATABASE_RUNTIME_URL!==env.DATABASE_URL))
   fail("EXISTING_OWNER_DB_AND_EXACT_MODE_REQUIRED");
  let bytes;
  if(mode==="install"){
   const cmd=(s,args)=>execFileSync(s,args,{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
   admitV0099OwnerInstall(env,cmd("git",["rev-parse","HEAD"]),cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]));
   bytes=readFileSync(V0099_PATH);reviewV0099Sql(bytes);
  }
  c=new pg.Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:40000,
   options:mode==="inventory"?"-c default_transaction_read_only=on":undefined,application_name:"p6_v0099_owner_inert_schema"});
  await c.connect();
  console.log(JSON.stringify(mode==="inventory"?await readV0099OwnerInventory(c):await installV0099OnceOwner({client:c,bytes})));
 }catch(e){console.error(/^HOLD_V009[45789]_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_V0099_UNKNOWN_NO_RETRY");process.exitCode=2;}
 finally{if(c)await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
