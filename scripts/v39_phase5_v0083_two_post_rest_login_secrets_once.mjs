/**
 * Phase5 V0083 ONLY: provision exactly two absent dedicated REST LOGINs and
 * the two missing GitHub Actions encrypted connection-URL secrets.
 *
 * Reuses Stage30's atomic PostgreSQL -> GitHub secret choreography.
 * This intentionally never runs the V0083 schema installer, reserves a REST
 * call, accesses provider Contents or sets scientific/paid GO.
 *
 * Review this exact main SHA and run ONCE from an authorized owner's Replit
 * Shell. An ambiguous COMMIT or GitHub cleanup means QUARANTINE/NO RETRY.
 */
import {randomBytes} from "node:crypto";
import {spawn} from "node:child_process";
import pg from "pg";
const {Pool}=pg;

const REPO="HKcode22/ReplitTranvr";
const ACK="COMMISSION_ONLY_TWO_V0083_REST_LOGIN_SECRETS_NO_PROVIDER";
const CI="postgresql://v0083_ci_owner:ci-only@localhost:5432/neondb?sslmode=disable";
const SHA=/^[0-9a-f]{40}$/;
export const P5_V0083_REST_LOGIN_ENTRIES=[
 {group:"review",login:"phase5_p5_other_rest_review_login_20261110",
  noLogin:"phase5_other_rest_review_prod_20261108",
  secret:"P5_V39_OTHER_REST_REVIEW_DATABASE_URL"},
 {group:"reserve",login:"phase5_p5_other_rest_reserve_login_20261110",
  noLogin:"phase5_other_rest_reserve_prod_20261108",
  secret:"P5_V39_OTHER_REST_RESERVE_DATABASE_URL"}
];
const fail=(reason)=>{throw Error("REFUSED_P5_V0083_REST_LOGIN_"+reason);};

function admission(e){
 if(e.P5_V0083_TWO_LOGIN_ONCE!==ACK||
    !e.DATABASE_URL||
    e.ADB_AUTO_COLLECT!=="0"||
    e.V39_PHASE6_PROCESS_ARMED!=="0"||
    e.V39_PHASE6_OWNER_APPROVED!=="0"||
    e.AERODATABOX_API_KEY||
    e.AERODATABOX_WEBHOOK_SECRET||
    !SHA.test(e.P5_V0083_APPROVED_MAIN_SHA??""))
  fail("OWNER_APPROVAL_NONPAID_AND_EXACT_MAIN_REQUIRED");
 let url;
 try{url=new URL(e.DATABASE_URL);}
 catch{return fail("INVALID_ADMIN_DATABASE_URL");}
 const username=decodeURIComponent(url.username);
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    !url.hostname||!url.password||url.pathname!=="/neondb"||
    !username||username.startsWith("phase5_")||url.hash)
  fail("REVIEWED_ADMIN_CREATOR_DB_ONLY_NO_WORKER_REUSE");
 if(e.GITHUB_ACTIONS==="true"&&
    (e.DATABASE_URL!==CI||
     e.P5_V0083_CI_MOCK_ONLY!=="1"))
  fail("CI_ALLOWED_ONLY_ON_DISPOSABLE_PG16_AND_MOCK_GITHUB");
 return url;
}
const names=P5_V0083_REST_LOGIN_ENTRIES.map(x=>x.login);
const groups=P5_V0083_REST_LOGIN_ENTRIES.map(x=>x.noLogin);
async function inspect(c,expectCreated){
 const q=await c.query(
  "SELECT current_database() db,"+
  "current_setting('server_version_num')::int pgver,"+
  "current_setting('transaction_read_only') ro,"+
  "current_user owner, (SELECT rolsuper OR rolcreaterole"+
  " FROM pg_catalog.pg_roles WHERE rolname=current_user) cancreate"
 );
 const meta=q.rows[0];
 if(q.rowCount!==1||meta.db!=="neondb"||
    Number(meta.pgver)<160000||meta.ro!=="off"||
    meta.cancreate!==true)
  fail("RESTRICTED_DB_CREATOR_PG16_REQUIRED");
 const roles=await c.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,"+
  " rolcreatedb,rolreplication,rolbypassrls"+
  " FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",
  [groups]);
 if(roles.rows.length!==2||roles.rows.some(r=>
     r.rolcanlogin!==false||r.rolinherit!==false||
     r.rolsuper!==false||r.rolcreaterole!==false||
     r.rolcreatedb!==false||r.rolreplication!==false||
     r.rolbypassrls!==false))
  fail("EXACT_V0083_NOLOGIN_GROUPS_NOT_VERIFIED");
 const permissions=await c.query(
  "SELECT $1::text AS reviewer,$2::text AS reserver,"+
  "has_schema_privilege($1,'clean','USAGE') AS rg_schema,"+
  "has_schema_privilege($2,'clean','USAGE') AS rs_schema,"+
  "has_table_privilege($1,"+
  "'clean.phase5_other_rest_reviewed_call_v39','INSERT') AS rg_insert,"+
  "has_table_privilege($1,"+
  "'clean.phase5_other_rest_reviewed_call_v39','SELECT') AS rg_select,"+
  "has_table_privilege($1,"+
  "'clean.phase5_other_rest_reviewed_call_v39','UPDATE') AS rg_update,"+
  "has_table_privilege($1,"+
  "'clean.phase5_other_rest_reviewed_call_v39','DELETE') AS rg_delete,"+
  "has_table_privilege($2,"+
  "'clean.phase5_other_rest_reviewed_call_v39','INSERT') AS rs_insert,"+
  "has_table_privilege($2,"+
  "'clean.phase5_other_rest_physical_reservation_v39','INSERT') AS rs_physical_insert,"+
  "has_function_privilege($1,"+
  "'clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)',"+
  "'EXECUTE') AS rg_reserve,"+
  "has_function_privilege($2,"+
  "'clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)',"+
  "'EXECUTE') AS rs_reserve,"+
  "has_table_privilege($1,'clean.flight_snapshots','INSERT') AS rg_pre,"+
  "has_table_privilege($2,'clean.flight_snapshots','INSERT') AS rs_pre,"+
  "has_table_privilege($1,"+
  "'clean.phase5_fids_physical_attempt_v39','INSERT') AS rg_source,"+
  "has_table_privilege($2,"+
  "'clean.phase5_fids_physical_attempt_v39','INSERT') AS rs_source",
  [groups[0],groups[1]]);
 const p=permissions.rows[0];
 if(permissions.rowCount!==1||
    p.rg_schema!==true||p.rs_schema!==true||
    p.rg_insert!==true||p.rs_reserve!==true||
    [p.rg_select,p.rg_update,p.rg_delete,p.rs_insert,
     p.rs_physical_insert,p.rg_reserve,p.rg_pre,p.rs_pre,
     p.rg_source,p.rs_source].some(x=>x!==false))
  fail("EXISTING_V0083_GROUP_ACL_NOT_NARROW_NO_AUTO_GRANTS");
 const existing=await c.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,"+
  "rolcreatedb,rolreplication,rolbypassrls"+
  " FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",
  [names]);
 if(existing.rows.length!==(expectCreated?2:0))
  fail("LOGIN_ALREADY_EXISTS_OR_PARTIAL_ROLE_STATE_HOLD");
 if(expectCreated){
  if(existing.rows.some(r=>
     r.rolcanlogin!==true||r.rolinherit!==false||
     r.rolsuper!==false||r.rolcreaterole!==false||
     r.rolcreatedb!==false||r.rolreplication!==false||
     r.rolbypassrls!==false))
   fail("NONDEDICATED_OR_OVERPRIVILEGED_LOGIN");
  const memberships=await c.query(
   "SELECT u.rolname login,g.rolname target,"+
   "m.set_option,m.inherit_option,m.admin_option"+
   " FROM pg_catalog.pg_auth_members m"+
   " JOIN pg_catalog.pg_roles u ON u.oid=m.member"+
   " JOIN pg_catalog.pg_roles g ON g.oid=m.roleid"+
   " WHERE u.rolname=ANY($1::text[])",
   [names]);
  if(memberships.rows.length!==2)
   fail("LOGIN_EXTRA_GROUP_MEMBERSHIPS");
  for(const e of P5_V0083_REST_LOGIN_ENTRIES){
   const x=memberships.rows.filter(m=>m.login===e.login);
   if(x.length!==1||x[0].target!==e.noLogin||
      x[0].set_option!==true||x[0].inherit_option!==false||
      x[0].admin_option!==false)
    fail("LOGIN_INHERIT_ADMIN_OR_CROSS_GROUP");
  }
 }
}
function deriveConnectionURL(base,login,password){
 const url=new URL(base);
 url.username=login;
 url.password=password;
 return url.toString();
}
export async function commissionP5V0083TwoRestLoginsOnce(pool,gh,env=process.env){
 admission(env);
 if(!gh||!["listSecretNames","setSecret","deleteSecret","getMainSha"]
  .every(key=>typeof gh[key]==="function"))
  fail("REVIEWED_GITHUB_SECRET_DRIVER_REQUIRED");
 // Validate current GH main BEFORE touching either DB or repository secrets.
 const live=await gh.getMainSha();
 if(live!==env.P5_V0083_APPROVED_MAIN_SHA)
  fail("MAIN_CHANGED_FROM_REVIEWED_PIN_NO_MUTATION");
 const present=await gh.listSecretNames();
 if(!Array.isArray(present)||present.some(x=>typeof x!=="string"))
  fail("GITHUB_SECRET_LIST_UNVERIFIED");
 if(P5_V0083_REST_LOGIN_ENTRIES.some(x=>present.includes(x.secret)))
  fail("GITHUB_SECRET_PREEXISTS_DO_NOT_OVERWRITE");
 const client=await pool.connect();
 let started=false,commitAttempted=false;
 const attempted=[];
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  started=true;
  await client.query("SET LOCAL statement_timeout='35000ms'");
  await client.query("SET LOCAL lock_timeout='2500ms'");
  const lk=await client.query(
   "SELECT pg_try_advisory_xact_lock(hashtext('phase5-v0083'),"+
   "hashtext('two-post-rest-logins-gh-once')) got");
  if(lk.rows[0]?.got!==true)
   fail("OTHER_V0083_REST_COMMISSION_RUNNING");
  await inspect(client,false);
  const secrets=[];
  for(const e of P5_V0083_REST_LOGIN_ENTRIES){
   const password=randomBytes(48).toString("hex");
   await client.query(
    "CREATE ROLE "+e.login+
    " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE"+
    " NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'");
   await client.query(
    "GRANT "+e.noLogin+" TO "+e.login+
    " WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");
   secrets.push({name:e.secret,
    value:deriveConnectionURL(env.DATABASE_URL,e.login,password)});
  }
  await inspect(client,true);
  // Secret transport BEFORE DB COMMIT; no secret URL in argv/log/file.
  for(const x of secrets){
   attempted.push(x.name);
   await gh.setSecret(x.name,x.value);
  }
  const after=await gh.listSecretNames();
  if(!P5_V0083_REST_LOGIN_ENTRIES.every(e=>after.includes(e.secret)))
   fail("GITHUB_SECRET_READBACK_UNVERIFIED_BEFORE_DB_COMMIT");
  if(env.GITHUB_ACTIONS==="true"&&
     env.P5_V0083_CI_INJECT_PRECOMMIT_ROLLBACK==="1")
   fail("CI_INJECTED_V0083_GITHUB_SECRET_ROLLBACK");
  if(await gh.getMainSha()!==env.P5_V0083_APPROVED_MAIN_SHA)
   fail("MAIN_MOVED_BETWEEN_SECRET_WRITE_AND_DB_COMMIT");
  commitAttempted=true;
  await client.query("COMMIT");
  started=false;
  await inspect(client,true);
  const final=await gh.listSecretNames();
  if(!P5_V0083_REST_LOGIN_ENTRIES.every(e=>final.includes(e.secret)))
   fail("POSTCOMMIT_GITHUB_SECRET_ABSENT");
  return{
   status:"P5_V0083_TWO_DEDICATED_POST_REST_LOGINS_AND_ENCRYPTED_SECRETS_COMMITTED",
   rolesCreated:2,encryptedGithubSecretsCreated:2,
   secretNames:P5_V0083_REST_LOGIN_ENTRIES.map(e=>e.secret),
   onlySetRoleWithoutInheritance:true,adminMembership:false,
   connectionURLsPrinted:false,
   providerCalls:0,providerAlerts:0,flightRowsRead:0,
   newRESTReviewOrPhysicalReservations:0,sourceRowsWritten:0,
   sourceContentsRightsCertified:false,
   phase5ScientificFreezePassed:false,phase6PaidGo:false,
   nextStep:"EXACT_NEW_MANUAL_V0083_TWO_REST_ROLES_READONLY_GITHUB_RUN"
  };
 }catch(e){
  if(commitAttempted)
   fail("POSTCOMMIT_OR_UNKNOWN_OUTCOME_QUARANTINE_NEVER_RETRY");
  let rollbackVerified=!started;
  if(started){
   try{await client.query("ROLLBACK");rollbackVerified=true;}
   catch{rollbackVerified=false;}
  }
  let cleaned=true;
  for(const name of attempted.reverse()){
   try{await gh.deleteSecret(name);}catch{cleaned=false;}
  }
  if(!cleaned)fail("GITHUB_SECRET_CLEANUP_UNCERTAIN_NO_RETRY");
  if(!rollbackVerified)fail("DB_ROLLBACK_UNVERIFIED_NEVER_RETRY");
  throw e;
 }finally{client.release();}
}
function runGH(args,stdin){
 return new Promise((resolve,reject)=>{
  const child=spawn("gh",args,{stdio:["pipe","pipe","pipe"]});
  let output="";
  child.stdout.on("data",b=>{output+=String(b).slice(0,50000);});
  child.stderr.on("data",()=>{}); // never log credentials
  child.on("error",()=>reject(Error("GITHUB_CLI_UNAVAILABLE")));
  child.on("close",status=>status===0?resolve(output):
   reject(Error("GITHUB_CLI_FAILURE")));
  child.stdin.end(typeof stdin==="string"?stdin:undefined);
 });
}
export function realP5V0083GitHubSecretDriver(){
 return{
  getMainSha:async()=>{
   const raw=await runGH(["api","repos/"+REPO+"/git/ref/heads/main",
    "--jq",".object.sha"]);
   return String(raw).trim();
  },
  listSecretNames:async()=>{
   const raw=await runGH(["api","repos/"+REPO+"/actions/secrets",
    "--paginate","--jq",".secrets[].name"]);
   return String(raw).trim().split("\n").filter(Boolean);
  },
  setSecret:async(name,value)=>{
   if(!P5_V0083_REST_LOGIN_ENTRIES.some(e=>e.secret===name))
    fail("UNREVIEWED_GITHUB_SECRET_NAME");
   await runGH(["secret","set",name,"--repo",REPO,"--app","actions"],value);
  },
  deleteSecret:async(name)=>{
   if(!P5_V0083_REST_LOGIN_ENTRIES.some(e=>e.secret===name))
    fail("UNREVIEWED_GITHUB_SECRET_DELETE");
   await runGH(["secret","delete",name,"--repo",REPO,"--app","actions"]);
  }
 };
}
async function main(){
 let pool;
 try{
  admission(process.env);
  pool=new Pool({connectionString:process.env.DATABASE_URL,
   max:1,connectionTimeoutMillis:9000,idleTimeoutMillis:1800});
  const result=await commissionP5V0083TwoRestLoginsOnce(
   pool,realP5V0083GitHubSecretDriver(),process.env);
  console.log(JSON.stringify(result,null,2));
 }catch(e){
  const msg=String(e?.message??"");
  console.error(/^REFUSED_P5_V0083_REST_LOGIN_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_V0083_REST_LOGIN_UNKNOWN_DB_OR_GITHUB_HOLD");
  process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.P5_V0083_TWO_LOGIN_ONCE)await main();
