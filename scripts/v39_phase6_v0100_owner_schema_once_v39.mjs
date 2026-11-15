/** Exact V0100 owner commissioning. Never enroll a task here. No new role,
 * login, provider data or prior migration replay. Reuse existing V0091
 * owner and original queue; only install while the real queue is empty. */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
export const PATH="migrations/staged/V0100__phase6_restartable_exact_v0091_enrollment_v39.sql";
export const BLOB="5cec59751f99ac452eb96efcb9bcc34718e07f38";
export const APPROVAL="INSTALL_ONLY_V0100_RESTARTABLE_EXISTING_EMPTY_QUEUE_NO_PROVIDER";
const OLD="clean.phase5_cd_register_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)";
const NEW="clean.phase5_cd_ensure_exact_source_flight_v39(text,text,text,text,timestamptz,text,text,text,text,integer)";
const ROLE="phase5_cd_source_registration_owner_v39",PREP="phase5_fids_prepare_prod_20261107";
const fail=s=>{throw Error("HOLD_P6_V0100_OWNER_"+s);};
function bytesReview(bytes){
 if(!Buffer.isBuffer(bytes)||createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex")!==BLOB)
  fail("PINNED_SQL_BYTES_REQUIRED");
 const sql=bytes.toString("utf8");
 if(!sql.startsWith("-- V0100:")||!sql.trimEnd().endsWith("COMMIT;")||
    (sql.match(/^BEGIN;$/gm)||[]).length!==1||(sql.match(/^COMMIT;$/gm)||[]).length!==1)
  fail("EXACT_SQL_WRAPPER_REQUIRED");
 const body=sql.match(/AS \$ensure\$([\s\S]*?)\$ensure\$;/)?.[1];
 if(!body)fail("FUNCTION_BODY_MISSING");
 return {sql,body};
}
export async function inspectV0100(c,bytes,{ci=false}={}){
 const {body}=bytesReview(bytes),owner=ci?"phase5_cd_ci_owner":"neondb_owner";
 let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  await c.query("SET LOCAL lock_timeout='1500ms'");
  const d=(await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,"+
    "current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,rolsuper,rolcreaterole,"+
    "(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='clean') schema_owner,"+
    "(SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid=to_regclass('clean.phase5_cd_pre_task_v39')) queue_owner "+
    "FROM pg_roles WHERE rolname=current_user")).rows[0];
  if(!d||d.db!=="neondb"||d.actor!==owner||d.login!==owner||d.ver<160000||d.ver>=170000||
     d.ro!=="on"||d.replica!==false||d.rolsuper!==false||d.rolcreaterole!==true||d.schema_owner!==owner||d.queue_owner!==owner)
    fail("EXISTING_PG16_OWNER_QUEUE_REQUIRED");
  const rr=(await c.query("SELECT rolcanlogin,rolinherit,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls,"+
    "pg_has_role(current_user,rolname,'SET') owner_can_set,has_schema_privilege(rolname,'clean','CREATE') owner_can_create FROM pg_roles WHERE rolname=$1",[ROLE])).rows[0];
  if(!rr||Object.values(rr).some(v=>v!==false))fail("EXISTING_V0091_ROLE_DRIFT");
  const rows=(await c.query("SELECT p.oid::regprocedure::text sig,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig,p.prosrc,"+
    "has_function_privilege($3,p.oid,'EXECUTE') prep,"+
    "has_function_privilege('phase5_fids_pre_writer_prod_20261107',p.oid,'EXECUTE') pre,"+
    "has_function_privilege('phase5_fids_source_prod_20261107',p.oid,'EXECUTE') source,"+
    "EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') pub,"+
    "p.oid=to_regprocedure($2) AS is_new FROM pg_proc p WHERE p.oid=ANY(ARRAY[to_regprocedure($1),to_regprocedure($2)])",[OLD,NEW,PREP])).rows;
  if(rows.length<1||rows.length>2||rows.filter(x=>!x.is_new).length!==1||
     rows.some(x=>x.owner!==ROLE||!x.prosecdef||!Array.isArray(x.proconfig)||
      x.proconfig.length!==1||!/^search_path=pg_catalog,\s*pg_temp$/.test(x.proconfig[0])||x.prep!==true||x.pre!==false||x.source!==false||x.pub!==false))
    fail("ORIGINAL_OR_WRAPPER_FUNCTION_ACL_DRIFT");
  const acl=(await c.query("SELECT has_table_privilege($1,'clean.phase5_cd_pre_task_v39','INSERT,UPDATE,DELETE,TRUNCATE') direct_write,"+
    "pg_has_role('phase5_p30_prepare_login_20261107',$1,'SET') prepare_set",[PREP])).rows[0];
  if(acl?.direct_write!==false||acl.prepare_set!==true)fail("PREPARE_DIRECT_WRITE_OR_LOGIN_DRIFT");
  const n=(await c.query("SELECT count(*)::int n FROM clean.phase5_cd_pre_task_v39")).rows[0]?.n;
  const found=rows.find(x=>x.is_new);
  if(n!==0||found&&found.prosrc!==body)fail("NONEMPTY_QUEUE_OR_WRAPPER_BODY_DRIFT_NO_REPLAY");
  await c.query("ROLLBACK");tx=false;
  return {status:found?"V0100_INSTALLED_EXACT_EMPTY_RESTART_WRAPPER_NO_GO":"V0091_READY_V0100_ABSENT_EMPTY_QUEUE_NO_GO",queueRows:0,actor:owner,db:"neondb",version:d.ver,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});}
}
export async function installV0100Once({open,bytes,assertPinned=()=>{},ci=false}){
 const {sql}=bytesReview(bytes);
 async function session(fn){const c=await open();try{return await fn(c);}finally{await c.end();}}
 const before=await session(c=>inspectV0100(c,bytes,{ci}));
 if(before.status==="V0100_INSTALLED_EXACT_EMPTY_RESTART_WRAPPER_NO_GO")
  return {...before,alreadyInstalledNoReplay:true};
 assertPinned();
 try{await session(c=>c.query(sql));}catch{fail("DDL_OR_COMMIT_UNKNOWN_NO_RETRY");}
 const after=await session(c=>inspectV0100(c,bytes,{ci}));
 if(after.status!=="V0100_INSTALLED_EXACT_EMPTY_RESTART_WRAPPER_NO_GO")fail("FRESH_READBACK_NOT_VERIFIED");
 return {...after,sqlBlob:BLOB,alreadyInstalledNoReplay:false,queueEnrollments:0,newLoginRoles:0};
}
async function main(){
 const e=process.env,mode=process.argv[2]??"inventory";
 if(!["inventory","install"].includes(mode)||e.GITHUB_ACTIONS==="true"||e.P6_V0100_OWNER_APPROVAL!==APPROVAL||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
    e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET||!e.DATABASE_URL||e.NODE_TLS_REJECT_UNAUTHORIZED==="0")
  fail("EXACT_EMPTY_OWNER_APPROVAL_REQUIRED");
 const u=new URL(e.DATABASE_URL);
 if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||u.pathname!=="/neondb"||
    !u.password||!u.hostname.endsWith(".neon.tech")||u.hash||!["require","verify-full"].includes(u.searchParams.get("sslmode")??""))
  fail("REAL_EXISTING_NEON_OWNER_REQUIRED");
 const cmd=(s,a)=>execFileSync(s,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
 const pin=()=>{const local=cmd("git",["rev-parse","HEAD"]);if(!/^[a-f0-9]{40}$/.test(local)||local!==e.P6_V0100_REVIEWED_MAIN||
  local!==cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]))fail("EXACT_MAIN_PIN");};
 pin();const bytes=readFileSync(PATH);bytesReview(bytes);
 const open=async()=>{const c=new pg.Client({connectionString:e.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:40000,application_name:"p6_v0100_empty_queue_owner"});await c.connect();return c;};
 if(mode==="install")console.log(JSON.stringify(await installV0100Once({open,bytes,assertPinned:pin})));
 else{const c=await open();try{console.log(JSON.stringify(await inspectV0100(c,bytes)));}finally{await c.end();}}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(JSON.stringify({status:/^HOLD_P6_V0100_OWNER_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P6_V0100_OWNER_UNEXPECTED_NO_REPLAY",sqlstate:/^[A-Z0-9]{5}$/.test(e?.code??"")?e.code:null}));process.exitCode=2;});
