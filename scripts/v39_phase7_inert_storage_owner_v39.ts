/** Existing owner-only production inert storage step. No login passwords,
 * policy rows, PRE grants, provider credentials or activation. Use the final
 * reviewed main only; unknown commit -> readback, never rerun install. */
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {Pool,type PoolClient} from "pg";
import {installP7InertStorage,inspectP7InertStorage} from "../server/lib/disruption/phase7InertStorageCommission_v39";
import {assertP7MondayDisabledAuthorization} from "./v39_phase7_monday_owner_stage_binding_v39.mjs";
const hold=(s:string):never=>{throw Error("HOLD_P7_OWNER_STORAGE_"+s);};
const run=(c:string,a:string[])=>execFileSync(c,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:20000}).trim();
const code=/^[a-f0-9]{40}$/;
async function assertDisabled(c:PoolClient){
 const who=(await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid='clean.adb_phase6_authorization'::regclass)) auth_owner")).rows[0];
 if(who?.db!=="neondb"||who.actor!==who.login||who.actor!==who.auth_owner||who.ver<160000||who.ver>=170000||who.ro!=="off"||who.replica!==false)hold("EXISTING_OWNER_PG16_REQUIRED");
 const lock=(await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok")).rows[0];
 if(lock?.ok!==true)hold("PROVIDER_MUTATION_LOCK");
 await c.query("LOCK TABLE clean.adb_phase6_authorization,clean.adb_collection_subs,clean.adb_collection_batches IN SHARE ROW EXCLUSIVE MODE");
 const a=(await c.query("SELECT code_sha,manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc FROM clean.adb_phase6_authorization WHERE singleton_key=true")).rows;
 const b=(await c.query("SELECT (SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subs,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') batches")).rows[0];
 if(a.length!==1||Object.values(b).some(n=>n!==0))hold("EXACT_DISABLED_STAGE_REQUIRED");
 assertP7MondayDisabledAuthorization(a[0]);
}
async function main(){
 const [mode,pin]=process.argv.slice(2);
 if(process.argv.length!==4||!["--inspect","--install-inert"].includes(mode)||!code.test(pin??"")||
  process.env.GITHUB_ACTIONS==="true"||process.env.ADB_AUTO_COLLECT!=="0"||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
  process.env.V39_PHASE6_OWNER_APPROVED!=="0"||["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","V39_DATABASE_RUNTIME_URL"].some(k=>process.env[k])||!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("EXPLICIT_OWNER_NO_PROVIDER_SCOPE");
 if(run("git",["rev-parse","HEAD"])!==pin||run("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"])!==pin||run("git",["status","--porcelain","--untracked-files=no"])!=="")hold("FINAL_CLEAN_EXACT_MAIN");
 const u=new URL(process.env.DATABASE_URL),ssl=u.searchParams.getAll("sslmode");
 if(!["postgres:","postgresql:"].includes(u.protocol)||!u.hostname.endsWith(".neon.tech")||u.pathname!=="/neondb"||!u.password||ssl.length!==1||!["verify-full","require"].includes(ssl[0])||(u.port!==""&&u.port!=="5432"))hold("EXISTING_NEON_OWNER_URL_REQUIRED");
 if(mode==="--install-inert"&&process.env.P7_OWNER_INERT_SCHEMA_APPROVAL!=="INSTALL_EXACT_INERT_SCHEMA_AND_NOLOGIN_ROLES_NO_PAID")hold("EXPLICIT_INERT_DDL_REVIEW_REQUIRED");
 const pool=new Pool({connectionString:u.toString(),max:2,query_timeout:35000,connectionTimeoutMillis:8000,application_name:"p7_inert_owner_commission"});
 try{
  if(mode==="--install-inert")await installP7InertStorage(pool,assertDisabled);
  console.log(JSON.stringify(await inspectP7InertStorage(pool)));
 }finally{await pool.end()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_[A-Z0-9_]+$/.test(m)?m:"HOLD_P7_OWNER_STORAGE_REDACTED_INSPECT_NO_REPLAY");process.exitCode=2;});
