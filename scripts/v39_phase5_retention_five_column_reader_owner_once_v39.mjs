/**
 * Phase5 one-use exact private five-column retention monitor login.
 *
 * OWNER Replit only; no broad schema migration; no reinstallation of any
 * prior V0079–V0095 roles, migrations or lifecycle object cleanup.
 * --dry-run = zero writes. --install must be a separately approved exact
 * Git main SHA, with the existing Replit neondb owner DATABASE_URL.
 * The new credential is never printed; GitHub secret receives it by stdin.
 * Production hourly monitoring remains disabled after commissioning.
 */
import pg from "pg";
import {randomBytes} from "node:crypto";
import {spawnSync,execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {readP5RetentionMetadataReadOnly,RETENTION_READER_REQUIRED_COLUMNS,RETENTION_READER_DENIED_COLUMNS}
 from "./v39_phase5_retention_metadata_private_readonly_sentinel_v39.mjs";

const {Client}=pg;
const REPO="HKcode22/ReplitTranvr";
export const ROLE="phase5_retention_reader_prod20261114";
export const SECRET="P5_RETENTION_READER_DATABASE_URL";
export const EXPECTED_ROLE_VAR="P5_RETENTION_EXPECTED_READER_ROLE";
export const ENABLE_VAR="P5_RETENTION_READONLY_MONITOR_ENABLED";
export const CONFIRM="INSTALL_ONLY_FIVE_COLUMN_RETENTION_READER_NO_PROVIDER_NO_MONITOR_ENABLE";
const TABLE="clean.provider_content_blob_ref";
const sha=/^[a-f0-9]{40}$/;
const fail=x=>{throw Error("HOLD_P5_FIVE_COLUMN_READER_"+x)};
const clean=(x)=>Boolean(x)&&typeof x==="string";
const sqlColumns=RETENTION_READER_REQUIRED_COLUMNS.map(x=>{
 if(!/^[a-z_]+$/.test(x))fail("UNSAFE_SQL_COLUMN");
 return x;
}).join(",");
export function admitP5RetentionReaderInstall(env,localSha,remoteMainSha){
 if(env.P5_RETENTION_READER_OWNER_APPROVAL!==CONFIRM||
    !clean(env.DATABASE_URL)||
    !sha.test(localSha)||localSha!==remoteMainSha||
    env.P5_RETENTION_READER_APPROVED_MAIN_SHA!==localSha||
    env.GITHUB_ACTIONS==="true"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    (env.V39_DATABASE_RUNTIME_URL&&env.V39_DATABASE_RUNTIME_URL!==env.DATABASE_URL))
  fail("NO_EXACT_MAIN_OWNER_APPROVAL_OR_ZERO_PAID_GATE");
 return true;
}
export function reviewP5ReaderOwnerCatalog(identity,shape,roleRows){
 if(!identity||identity.db!=="neondb"||
    identity.actor!=="neondb_owner"||
    identity.session_actor!=="neondb_owner"||
    identity.readonly!=="on"||identity.replica!==false||
    Number(identity.pg_version)<160000||Number(identity.pg_version)>=170000||
    identity.rolsuper!==false||
    identity.rolcreaterole!==true||
    identity.can_grant_five_select!==true||
    !Array.isArray(shape)||shape.length!==
       RETENTION_READER_REQUIRED_COLUMNS.length+
       RETENTION_READER_DENIED_COLUMNS.length||
    shape.some(x=>!RETENTION_READER_REQUIRED_COLUMNS.includes(x.attname)&&
                  !RETENTION_READER_DENIED_COLUMNS.includes(x.attname))||
    new Set(shape.map(x=>x.attname)).size!==shape.length||
    !Array.isArray(roleRows)||roleRows.length>0)
  fail("OWNER_SCHEMA_ROLE_ALREADY_EXISTS_OR_PRIVILEGE_MISMATCH");
 return true;
}
function gh(args,input){
 const p=spawnSync("gh",args,{
  encoding:"utf8",input,stdio:["pipe","pipe","pipe"],
  timeout:30000,maxBuffer:500000
 });
 if(p.status!==0||p.error)fail("GH_SCOPED_WRITE_OR_AUTH_FAILED_REVIEW_PARTIAL_STATE");
 return p.stdout.trim();
}
function selectedP5DbUrl(base,password){
 let u;
 try{u=new URL(base)}catch{fail("INVALID_EXISTING_OWNER_DATABASE_URL")}
 if(!["postgresql:","postgres:"].includes(u.protocol)||
    u.pathname!=="/neondb"||!u.hostname||!u.password||
    decodeURIComponent(u.username)!=="neondb_owner")
  fail("NOT_EXISTING_NEONDB_OWNER_URL");
 u.username=ROLE;
 u.password=password;
 return u.toString();
}
async function preflight(client){
 let active=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  active=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  const who=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   " session_user AS session_actor,"+
   " current_setting('transaction_read_only') AS readonly,"+
   " current_setting('server_version_num')::int AS pg_version,"+
   " pg_is_in_recovery() AS replica, r.rolsuper,r.rolcreaterole,"+
   " has_table_privilege(current_user,'"+TABLE+"','SELECT WITH GRANT OPTION') AS can_grant_five_select"+
   " FROM pg_roles r WHERE r.rolname=current_user"
  )).rows[0];
  const shape=(await client.query(
   "SELECT attname FROM pg_attribute WHERE attrelid=$1::regclass"+
   " AND attnum>0 AND NOT attisdropped ORDER BY attname",[TABLE]
  )).rows;
  const existing=(await client.query(
   "SELECT rolname FROM pg_roles WHERE rolname=$1",[ROLE]
  )).rows;
  reviewP5ReaderOwnerCatalog(who,shape,existing);
  await client.query("ROLLBACK");active=false;
  return {schemaVerified:true,roleAbsent:true,actorVerified:true};
 }finally{
  if(active)await client.query("ROLLBACK").catch(()=>{});
 }
}
export async function commitRole(client,password){
 let active=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  active=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='1500ms'");
  // Transaction-level race safety: there must be zero matching existing
  // roles at the moment CREATE ROLE starts. A concurrent CREATE fails.
  const n=(await client.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname=$1",[ROLE])).rows[0]?.n;
  if(n!==0)fail("ROLE_ALREADY_EXISTS_DO_NOT_REINSTALL");
  const lit=(await client.query("SELECT quote_literal($1) AS s",[password])).rows[0]?.s;
  if(!/^'[A-Za-z0-9+/_=\-]+'$/.test(lit??""))fail("INVALID_PG_QUOTED_RANDOM_SECRET");
  await client.query("CREATE ROLE "+ROLE+
   " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE"+
   " NOREPLICATION NOBYPASSRLS PASSWORD "+lit);
  await client.query("GRANT CONNECT ON DATABASE neondb TO "+ROLE);
  await client.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  await client.query("GRANT SELECT("+sqlColumns+") ON "+TABLE+" TO "+ROLE);
  await client.query("COMMIT");active=false;
  return true;
 }finally{
  if(active)await client.query("ROLLBACK").catch(()=>{});
 }
}
export async function runP5RetentionRoleOwner(argv=process.argv.slice(2),env=process.env){
 const mode=argv.length===1?argv[0]:null;
 if(!["--dry-run","--install"].includes(mode))
  fail("EXACTLY_ONE_DRY_RUN_OR_INSTALL_ARG_REQUIRED");
 if(!env.DATABASE_URL)fail("EXISTING_OWNER_DATABASE_URL_MISSING");
 let local="",remote="";
 try{
  local=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",
   stdio:["ignore","pipe","ignore"]}).trim();
  remote=gh(["api","repos/"+REPO+"/git/ref/heads/main",
    "--jq",".object.sha"]);
 }catch{fail("EXACT_GITHUB_MAIN_CANNOT_BE_READ")}
 if(!sha.test(local)||remote!==local)
  fail("GIT_MAIN_DRIFT_NO_DB_WRITES");
 if(mode==="--install")admitP5RetentionReaderInstall(env,local,remote);
 // Confirm the existing production owner URL shape without exposing it.
 selectedP5DbUrl(env.DATABASE_URL,"validation-only");
 const client=new Client({
  connectionString:env.DATABASE_URL,
  options:mode==="--dry-run"?"-c default_transaction_read_only=on":undefined,
  connectionTimeoutMillis:8000,query_timeout:15000,
  application_name:"p5_retention_five_column_owner_once"
 });
 try{
  await client.connect();
  const state=await preflight(client);
  if(mode==="--dry-run")return {
   status:"P5_FIVE_COLUMN_READER_OWNER_DRY_RUN_ROLE_ABSENT",
   ...state,sourceColumns:RETENTION_READER_REQUIRED_COLUMNS.length,
   databaseWrites:0,paidProviderCalls:0,monitorEnabled:false,
   phase6PaidGo:false
  };
  // Keep production monitoring disabled before creating a credential.
  gh(["variable","set",ENABLE_VAR,"-R",REPO,"--body","false"]);
  const password=randomBytes(48).toString("base64url");
  await commitRole(client,password);
  const url=selectedP5DbUrl(env.DATABASE_URL,password);
  // Independent, new LOGIN self-observation; may not be the db OWNER.
  const readback=await readP5RetentionMetadataReadOnly({
   url,expectedRole:ROLE
  });
  if(readback.restrictedReaderVerified!==true)
   fail("NEW_READER_ROLE_READBACK_MISSING");
  // Never leak the generated secret to logs, process argv or GitHub.
  gh(["secret","set",SECRET,"-R",REPO],url+"\n");
  gh(["variable","set",EXPECTED_ROLE_VAR,"-R",REPO,"--body",ROLE]);
  gh(["variable","set",ENABLE_VAR,"-R",REPO,"--body","false"]);
  return {
   status:"P5_FIVE_COLUMN_READER_INSTALLED_ACL_VERIFIED_MONITOR_DISABLED",
   dedicatedRole:ROLE,visibleOnlyMetadataColumns:5,
   restrictedReaderVerified:true,
   sentinelSnapshotStatus:readback.status,
   expiredUnverified:readback.expired_unverified,
   paidProviderCalls:0,monitorEnabled:false,
   phase6PaidGo:false
  };
 }finally{
  await client.end().catch(()=>{});
 }
}
async function main(){
 try{console.log(JSON.stringify(await runP5RetentionRoleOwner()))}
 catch{console.error(
  "HOLD_P5_FIVE_COLUMN_READER_UNKNOWN_OR_PARTIAL_INSTALL_NO_BLIND_RETRY"
 );process.exitCode=2}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
