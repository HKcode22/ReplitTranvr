/**
 * Phase5 paid-capable SOURCE credential commissioner — credentials ONLY.
 * One-shot, no provider network, no scheduled workflow and no flight rows.
 * Requires the four Stage27 NOLOGIN groups already installed. This creates
 * ONE dedicated SOURCE login with SET-only, NOINHERIT/NOADMIN membership
 * and stores its connection URL as ONE encrypted GitHub Actions secret.
 * It is deliberately NOT the Phase6 activation or a source-rights permit.
 *
 * If secret write is uncertain BEFORE COMMIT, transaction rolls back and
 * cleanup is attempted. If COMMIT was attempted, refuse blind retry.
 */
import {randomBytes} from "node:crypto";
import {spawn} from "node:child_process";
import pg from "pg";
const {Pool}=pg;
const REPO="HKcode22/ReplitTranvr";
const ACK="COMMISSION_SOURCE_LOGIN_AND_SECRET_NO_PROVIDER_CALLS";
const CI_URL="postgresql://phase5_source_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
export const SOURCE={
 login:"phase5_p5_source_login_20261108",
 group:"phase5_fids_source_prod_20261107",
 secret:"V39_P5_SOURCE_DATABASE_URL"
};
const ALL_GROUPS=[
 "phase5_fids_prepare_prod_20261107",
 "phase5_fids_source_prod_20261107",
 "phase5_fids_pre_writer_prod_20261107",
 "phase5_fids_t24_witness_prod_20261107"
];
const reject=(s)=>{throw Error("REFUSED_P5_SOURCE_CREDENTIAL_"+s);};
function checkEnv(env){
 if(env.P5_SOURCE_CREDENTIAL_ONCE!==ACK||
   !env.DATABASE_URL||!env.V39_DATABASE_RUNTIME_URL||
   env.DATABASE_URL===env.V39_DATABASE_RUNTIME_URL||
   env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0")
  reject("MISSING_OWNER_APPROVAL_OR_DISTINCT_PRIMARY_DB");
 let admin,runtime;
 try{admin=new URL(env.DATABASE_URL);runtime=new URL(env.V39_DATABASE_RUNTIME_URL);}
 catch{reject("INVALID_DB_URL");}
 if(!["postgres:","postgresql:"].includes(admin.protocol)||
    !["postgres:","postgresql:"].includes(runtime.protocol)||
    !admin.username||!runtime.username||!admin.password||!runtime.password||
    decodeURIComponent(admin.username)===decodeURIComponent(runtime.username)||
    admin.pathname!=="/neondb"||runtime.pathname!=="/neondb")
  reject("OWNER_EQUALS_RUNTIME_OR_INVALID_DB");
 if(env.GITHUB_ACTIONS==="true"&&env.DATABASE_URL!==CI_URL)
  reject("CI_ONLY_DISPOSABLE_CREATOR");
}
async function assertRoles(c,installed){
 const meta=await c.query(
  "SELECT current_database() AS db,current_setting('server_version_num') AS ver,"+
  "current_setting('transaction_read_only') AS ro,"+
  "(SELECT rolsuper OR rolcreaterole FROM pg_catalog.pg_roles "+
  "WHERE rolname=current_user) AS creator");
 if(meta.rowCount!==1||meta.rows[0].db!=="neondb"||
    Number(meta.rows[0].ver)<160000||meta.rows[0].ro!=="off"||
    meta.rows[0].creator!==true)
  reject("NOT_APPROVED_PRIMARY_PG16_CREATOR");
 const group=await c.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolsuper "+
  "FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",[ALL_GROUPS]);
 if(group.rows.length!==4||group.rows.some(x=>!ALL_GROUPS.includes(x.rolname)||
    x.rolcanlogin!==false||x.rolinherit!==false||x.rolsuper!==false))
  reject("STAGE27_FOUR_GROUPS_NOT_CERTIFIED");
 const role=await c.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,"+
  "rolcreatedb,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=$1",
  [SOURCE.login]);
 if(role.rows.length!==(installed?1:0))
  reject("PREEXISTING_OR_MISSING_DEDICATED_SOURCE_LOGIN");
 if(installed){
  const x=role.rows[0];
  if(x.rolcanlogin!==true||x.rolinherit!==false||x.rolsuper!==false||
     x.rolcreaterole!==false||x.rolcreatedb!==false||x.rolbypassrls!==false)
   reject("DEDICATED_SOURCE_LOGIN_ATTRIBUTES");
  const m=await c.query(
   "SELECT g.rolname AS target,a.set_option,a.inherit_option,a.admin_option "+
   "FROM pg_catalog.pg_auth_members a "+
   "JOIN pg_catalog.pg_roles g ON g.oid=a.roleid "+
   "JOIN pg_catalog.pg_roles l ON l.oid=a.member "+
   "WHERE l.rolname=$1",[SOURCE.login]);
  if(m.rows.length!==1||m.rows[0].target!==SOURCE.group||
     m.rows[0].set_option!==true||m.rows[0].inherit_option!==false||
     m.rows[0].admin_option!==false)
   reject("SOURCE_CROSS_GROUP_OR_ADMIN_MEMBERSHIP");
  const privilege=await c.query(
   "SELECT has_table_privilege($1,'clean.phase5_fids_allowed_query_v39','INSERT') AS can_prepare,"+
   "has_table_privilege($1,'clean.phase5_fids_original_binding_v39','INSERT') AS can_original,"+
   "has_table_privilege($1,'clean.flight_snapshots','INSERT') AS can_pre,"+
   "has_table_privilege($1,'clean.phase5_t24_postcommit_witness_v39','INSERT') AS can_witness",
   [SOURCE.group]);
  if(privilege.rowCount!==1||privilege.rows[0].can_original!==true||
     privilege.rows[0].can_prepare!==false||privilege.rows[0].can_pre!==false||
     privilege.rows[0].can_witness!==false)
   reject("SOURCE_GROUP_PRIVILEGE_MATRIX_CHANGED");
 }
}
function sourceConnection(adminUrl,password){
 const u=new URL(adminUrl);
 u.username=SOURCE.login;
 u.password=password;
 return u.toString();
}
export async function commissionPhase5SourceCredential(pool,gh,env=process.env){
 checkEnv(env);
 if(!gh||typeof gh.listSecretNames!=="function"||
   typeof gh.setSecret!=="function"||typeof gh.deleteSecret!=="function")
  reject("EXPLICIT_GITHUB_SECRET_DRIVER_REQUIRED");
 const known=await gh.listSecretNames();
 if(!Array.isArray(known)||known.some(x=>typeof x!=="string"))
  reject("GITHUB_SECRET_LIST_UNTRUSTED");
 if(known.includes(SOURCE.secret))
  reject("SOURCE_SECRET_ALREADY_EXISTS_NO_OVERWRITE");
 const c=await pool.connect();
 let tx=false,commitAttempted=false,secretAttempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await c.query("SET LOCAL statement_timeout='35000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const lock=await c.query(
   "SELECT pg_try_advisory_xact_lock(hashtext('p5-source-credential'),"+
   "hashtext('dedicated-source-login')) AS got");
  if(lock.rows[0]?.got!==true)reject("OTHER_SOURCE_COMMISSIONER_ACTIVE");
  await assertRoles(c,false);
  const password=randomBytes(36).toString("hex");
  // Whitelisted role identifier; cryptographically random ASCII hex password.
  await c.query("CREATE ROLE "+SOURCE.login+
   " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
   "NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'");
  await c.query("GRANT "+SOURCE.group+" TO "+SOURCE.login+
   " WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");
  await assertRoles(c,true);
  // Secrets are written while role still uncommitted/nonfunctional to others.
  // Treat a lost API response as possibly-created and clean it up.
  secretAttempted=true;
  await gh.setSecret(SOURCE.secret,sourceConnection(env.DATABASE_URL,password));
  const names=await gh.listSecretNames();
  if(!names.includes(SOURCE.secret))reject("SECRET_READBACK_MISSING_BEFORE_COMMIT");
  if(env.GITHUB_ACTIONS==="true"&&env.P5_SOURCE_CI_FORCE_ROLLBACK==="1")
   reject("CI_INJECTED_ROLLBACK");
  commitAttempted=true;
  await c.query("COMMIT");tx=false;
  await assertRoles(c,true);
  if(!(await gh.listSecretNames()).includes(SOURCE.secret))
   reject("POSTCOMMIT_SECRET_MISSING_QUARANTINE");
  return {
   status:"P5_DEDICATED_SOURCE_LOGIN_AND_ENCRYPTED_SECRET_COMMISSIONED_INERT",
   loginRoleCreated:1,githubActionsSecretsCreated:1,
   secretNames:[SOURCE.secret],
   sourceGroupSetOnly:true,sourceGroupInherit:false,sourceGroupAdmin:false,
   secretValuesLogged:false,providerFidsGets:0,alertCreates:0,
   flightRowsWritten:0,sourceContentsRightsCertified:false,
   paidSourceWorkerActivated:false,phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(err){
  if(commitAttempted)reject("AMBIGUOUS_COMMIT_QUARANTINE_NO_REPLAY");
  if(tx)await c.query("ROLLBACK").catch(()=>{});
  if(secretAttempted){
   try{await gh.deleteSecret(SOURCE.secret);}
   catch{reject("PRECOMMIT_SECRET_CLEANUP_UNCERTAIN_NO_REPLAY");}
  }
  throw err;
 }finally{c.release();}
}
async function ghCall(args,stdin){
 return await new Promise((resolve,reject)=>{
  const child=spawn("gh",args,{stdio:["pipe","pipe","pipe"]});
  let out="";
  child.stdout.on("data",buf=>{out+=String(buf).slice(0,20000);});
  child.stderr.on("data",()=>{}); // never expose credential-bearing failures
  child.on("error",()=>reject(Error("GITHUB_CLI_INACCESSIBLE")));
  child.on("close",code=>code===0?resolve(out):
    reject(Error("GITHUB_CLI_ACTION_FAILED")));
  child.stdin.end(typeof stdin==="string"?stdin:"");
 });
}
export function sourceGitHubSecretDriver(){
 return {
  listSecretNames:async()=>{
   const raw=await ghCall(["api","repos/"+REPO+"/actions/secrets",
       "--paginate","--jq",".secrets[].name"]);
   return raw.trim()?raw.trim().split("\n").filter(Boolean):[];
  },
  setSecret:async(name,value)=>{
   if(name!==SOURCE.secret)reject("NONWHITELIST_SECRET_WRITE");
   await ghCall(["secret","set",name,"--repo",REPO,"--app","actions"],value);
  },
  deleteSecret:async(name)=>{
   if(name!==SOURCE.secret)reject("NONWHITELIST_SECRET_DELETE");
   await ghCall(["secret","delete",name,"--repo",REPO,"--app","actions"]);
  }
 };
}
async function main(){
 let pool;
 try{
  checkEnv(process.env);
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:10000,idleTimeoutMillis:2000});
  console.log(JSON.stringify(await commissionPhase5SourceCredential(
   pool,sourceGitHubSecretDriver(),process.env),null,2));
 }catch(e){
  const message=String(e?.message??"");
  console.error(/^REFUSED_P5_SOURCE_CREDENTIAL_[A-Z0-9_]+$/.test(message)?
    message:"REFUSED_P5_SOURCE_CREDENTIAL_DB_GITHUB_UNKNOWN_HOLD");
  process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.P5_SOURCE_CREDENTIAL_ONCE)await main();
