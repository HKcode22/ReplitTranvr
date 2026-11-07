/**
 * Stage30: owner-gated THREE NONPAID GitHub-only worker PostgreSQL logins.
 *
 * PRODUCTION SIDE EFFECTS: creates three LOGIN roles + SET-only memberships
 * in already-installed Stage27 NOLOGIN groups, stores three random dedicated
 * DB connection URLs in repository-level GitHub Actions encrypted secrets.
 * Does NOT commission/source-bind the paid FIDS source role; no source
 * provider call, PRE write, Alert, workflow dispatch, or Phase6 GO.
 *
 * One-shot, no credentials printed. If an external GitHub secret write fails
 * BEFORE database COMMIT, rolls back all DB roles and deletes only the newly
 * created GitHub secrets. On ambiguous COMMIT, quarantine; NEVER retry.
 */
import {randomBytes} from "node:crypto";
import {spawn} from "node:child_process";
import pg from "pg";
const {Pool}=pg;
const REPO="HKcode22/ReplitTranvr";
const ACK="COMMISSION_THREE_NONPAID_GITHUB_WORKER_LOGINS_NO_SOURCE";
const TEST="postgresql://phase5_stage30_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
export const P5_STAGE30_ENTRIES=[
 {key:"prepare",login:"phase5_p30_prepare_login_20261107",
  group:"phase5_fids_prepare_prod_20261107",
  secret:"P5_V39_PREPARE_DATABASE_URL"},
 {key:"pre",login:"phase5_p30_pre_login_20261107",
  group:"phase5_fids_pre_writer_prod_20261107",
  secret:"P5_V39_PRE_DATABASE_URL"},
 {key:"witness",login:"phase5_p30_witness_login_20261107",
  group:"phase5_fids_t24_witness_prod_20261107",
  secret:"P5_V39_T24_WITNESS_DATABASE_URL"}
];
const refuse=s=>{throw Error("REFUSED_P5_STAGE30_"+s);};
function validate(env){
 if(env.P5_STAGE30_NONPAID_LOGINS_ONCE!==ACK||
    !env.DATABASE_URL||!env.V39_DATABASE_RUNTIME_URL||
    env.DATABASE_URL===env.V39_DATABASE_RUNTIME_URL||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0")
  refuse("MISSING_EXPLICIT_NONPAID_AUTH_OR_SEPARATE_DB_URLS");
 const admin=new URL(env.DATABASE_URL);
 const runtime=new URL(env.V39_DATABASE_RUNTIME_URL);
 if(!["postgres:","postgresql:"].includes(admin.protocol)||
    !["postgres:","postgresql:"].includes(runtime.protocol)||
    !admin.username||!runtime.username||
    decodeURIComponent(admin.username)===decodeURIComponent(runtime.username))
  refuse("ADMIN_EQUALS_APPLICATION_RUNTIME_OR_DB_URL_INVALID");
 if(env.GITHUB_ACTIONS==="true"&&env.DATABASE_URL!==TEST)
  refuse("CI_MUST_USE_ONLY_DISPOSABLE_PG16_CREATOR");
}
async function inspect(c,shouldExist){
 const names=P5_STAGE30_ENTRIES.map(x=>x.login);
 const groups=P5_STAGE30_ENTRIES.map(x=>x.group);
 const m=await c.query(
  "SELECT current_database() AS db,current_setting('server_version_num') AS ver,"+
  "current_setting('transaction_read_only') AS ro,"+
  "(SELECT rolsuper OR rolcreaterole FROM pg_catalog.pg_roles WHERE rolname=current_user) AS can_create");
 if(m.rowCount!==1||m.rows[0].db!=="neondb"||
    Number(m.rows[0].ver)<160000||m.rows[0].ro!=="off"||
    m.rows[0].can_create!==true)
  refuse("NOT_AUTHORIZED_PRIMARY_PG16_ROLE_CREATOR");
 const g=await c.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolsuper FROM pg_catalog.pg_roles "+
  "WHERE rolname=ANY($1::text[])",[groups]);
 if(g.rows.length!==3||g.rows.some(r=>
    r.rolcanlogin!==false||r.rolinherit!==false||r.rolsuper!==false))
  refuse("STAGE27_REVIEWED_NOLOGIN_GROUPS_NOT_PRESENT");
 const u=await c.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,"+
  "rolcreatedb,rolbypassrls FROM pg_catalog.pg_roles "+
  "WHERE rolname=ANY($1::text[])",[names]);
 if(u.rows.length!==(shouldExist?3:0))
  refuse("PREEXISTING_OR_PARTIAL_STAGE30_LOGIN_ROLES");
 if(shouldExist){
  for(const v of u.rows)if(!names.includes(v.rolname)||
     v.rolcanlogin!==true||v.rolinherit!==false||
     v.rolsuper!==false||v.rolcreaterole!==false||
     v.rolcreatedb!==false||v.rolbypassrls!==false)
    refuse("NON_DEDICATED_LOGIN_ROLE_ATTRIBUTES");
  const memberships=await c.query(
   "SELECT l.rolname AS login,t.rolname AS target,"+
   "a.set_option,a.inherit_option,a.admin_option "+
   "FROM pg_catalog.pg_auth_members a "+
   "JOIN pg_catalog.pg_roles t ON t.oid=a.roleid "+
   "JOIN pg_catalog.pg_roles l ON l.oid=a.member "+
   "WHERE l.rolname=ANY($1::text[])",[names]);
  if(memberships.rows.length!==3)refuse("UNEXPECTED_RUNTIME_MEMBERSHIP_COUNT");
  for(const x of P5_STAGE30_ENTRIES){
   const matches=memberships.rows.filter(r=>r.login===x.login);
   if(matches.length!==1||matches[0].target!==x.group||
      matches[0].set_option!==true||
      matches[0].inherit_option!==false||
      matches[0].admin_option!==false)
     refuse("CROSS_GROUP_OR_ADMIN_RUNTIME_MEMBERSHIP");
  }
 }
 return true;
}
function derivedUrl(adminUrl,login,password){
 const url=new URL(adminUrl);
 url.username=login;
 url.password=password;
 return url.toString();
}
export async function provisionP5Stage30NonpaidWorkerLogins(
 pool,gh,env=process.env
){
 validate(env);
 if(!gh||typeof gh.listSecretNames!=="function"||
    typeof gh.setSecret!=="function"||typeof gh.deleteSecret!=="function")
  refuse("REVIEWED_GITHUB_SECRET_DRIVER_REQUIRED");
 // Check repo Secret API access and absence before any SQL side effect.
 const existing=await gh.listSecretNames();
 if(!Array.isArray(existing)||existing.some(x=>typeof x!=="string"))
  refuse("GITHUB_SECRET_LIST_UNVERIFIED");
 if(P5_STAGE30_ENTRIES.some(e=>existing.includes(e.secret)))
  refuse("GITHUB_SECRET_ALREADY_EXISTS_DO_NOT_OVERWRITE");

 const client=await pool.connect();
 let tx=false,commitAttempted=false;
 const newlyWritten=[];
 const credentials=[];
 try{
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await client.query("SET LOCAL statement_timeout='35000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const lock=await client.query(
   "SELECT pg_try_advisory_xact_lock(hashtext('phase5-stage30'),"+
   "hashtext('dedicated-nonpaid-logins')) AS got");
  if(lock.rows[0]?.got!==true)refuse("ANOTHER_IDENTITY_COMMISSIONER_RUNNING");
  await inspect(client,false);
  for(const entry of P5_STAGE30_ENTRIES){
   const password=randomBytes(36).toString("hex");
   // These name strings are exact whitelisted literals in this source file.
   // Password is generated hex; never interpolate any untrusted input.
   await client.query("CREATE ROLE "+entry.login+
      " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
      "NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'");
   await client.query("GRANT "+entry.group+" TO "+entry.login+
      " WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");
   credentials.push({secret:entry.secret,
    url:derivedUrl(env.DATABASE_URL,entry.login,password)});
  }
  await inspect(client,true);
  // Cross-service synchronization: write GitHub Actions secrets first,
  // while the DB login roles are still uncommitted/nonfunctional remotely.
  for(const c of credentials){
   // A remote set operation can succeed even if its response is lost.
   // Record the attempted name BEFORE making the call, so precommit
   // rollback tries to clean up that possibly-created secret too.
   newlyWritten.push(c.secret);
   await gh.setSecret(c.secret,c.url);
  }
  const names=await gh.listSecretNames();
  if(P5_STAGE30_ENTRIES.some(e=>!names.includes(e.secret)))
   refuse("GITHUB_SECRET_READBACK_MISSING_BEFORE_COMMIT");
  if(env.GITHUB_ACTIONS==="true"&&
     env.P5_STAGE30_CI_INJECT_ROLLBACK==="1")
   refuse("CI_INJECTED_PRECOMMIT_ROLLBACK");

  commitAttempted=true;
  await client.query("COMMIT");tx=false;
  await inspect(client,true);
  const final=await gh.listSecretNames();
  if(P5_STAGE30_ENTRIES.some(e=>!final.includes(e.secret)))
   refuse("POST_COMMIT_GITHUB_SECRET_ABSENT_QUARANTINE");
  return {
   status:"P5_STAGE30_THREE_NONPAID_DEDICATED_GITHUB_LOGINS_COMMITTED_INERT",
   rolesCreated:3,gitHubActionsSecretsCreated:3,
   secretNames:P5_STAGE30_ENTRIES.map(x=>x.secret),
   passwordsOrConnectionURLsPrinted:false,
   workerGroupSetOnly:true,workerInheritOrAdmin:false,
   sourcePaidWorkerLoginOrSecretCreated:false,
   providerFidsGets:0,providerAlertCreates:0,flightWrites:0,
   sourceContentsRightsCertified:false,
   phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(commitAttempted)
   refuse("AMBIGUOUS_OR_POSTCOMMIT_HOLD_NO_REPLAY_AUDIT_REQUIRED");
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  let clean=true;
  for(const name of newlyWritten.reverse()){
   try{await gh.deleteSecret(name);}
   catch{clean=false;}
  }
  if(!clean)refuse("GITHUB_SECRET_CLEANUP_UNCERTAIN_NO_RETRY");
  throw e;
 }finally{client.release();}
}
async function runGh(args,stdin){
 return await new Promise((resolve,reject)=>{
  const proc=spawn("gh",args,{stdio:["pipe","pipe","pipe"]});
  let output="";
  proc.stdout.on("data",chunk=>{output+=String(chunk).slice(0,50000);});
  proc.stderr.on("data",()=>{}); // never print arguments, tokens, URLs
  proc.on("error",()=>reject(Error("GITHUB_CLI_EXEC_FAILED")));
  proc.on("close",code=>code===0?resolve(output):
   reject(Error("GITHUB_CLI_COMMAND_FAILED")));
  if(typeof stdin==="string")proc.stdin.end(stdin);
  else proc.stdin.end();
 });
}
export function realGitHubActionsSecretDriver(){
 return {
  listSecretNames:async()=>{
   const raw=await runGh([
    "api","repos/"+REPO+"/actions/secrets","--paginate",
    "--jq",".secrets[].name"]);
   return raw.trim()?raw.trim().split("\n").filter(Boolean):[];
  },
  setSecret:async(name,value)=>{
   if(!P5_STAGE30_ENTRIES.some(e=>e.secret===name))
    refuse("UNREVIEWED_SECRET_NAME");
   // Official gh CLI uses stdin if --body omitted. No secret argv/file.
   await runGh(["secret","set",name,"--repo",REPO,"--app","actions"],value);
  },
  deleteSecret:async(name)=>{
   if(!P5_STAGE30_ENTRIES.some(e=>e.secret===name))
    refuse("UNREVIEWED_SECRET_DELETE");
   await runGh(["secret","delete",name,"--repo",REPO,"--app","actions"]);
  }
 };
}
async function main(){
 let pool;
 try{
  validate(process.env);
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
    connectionTimeoutMillis:10000,idleTimeoutMillis:2000});
  const result=await provisionP5Stage30NonpaidWorkerLogins(
    pool,realGitHubActionsSecretDriver(),process.env);
  console.log(JSON.stringify(result,null,2));
 }catch(e){
  const error=String(e?.message??"");
  const msg=/^REFUSED_P5_STAGE30_[A-Z0-9_]+$/.test(error)?error:
   "REFUSED_P5_STAGE30_DB_GITHUB_OR_UNEXPECTED_HOLD";
  console.error(msg);process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.P5_STAGE30_NONPAID_LOGINS_ONCE)await main();
