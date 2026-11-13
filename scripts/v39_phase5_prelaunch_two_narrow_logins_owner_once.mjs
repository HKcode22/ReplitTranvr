/**
 * Phase5 → Phase6: EXACTLY TWO distinct narrow prelaunch SQL LOGIN identities.
 *
 * Source #603 and #608 cost-only writers require current_user = session_user =
 * the dedicated reviewed login, with their exact table-level ACL; existing
 * V0082 NOLOGIN group is NOT a session credential. Do not reinstall schemas.
 *
 * STOP-default: no action on import, GitHub Actions can only run disposable
 * PostgreSQL CI with an injected mock-secret driver. The owner-operated
 * Replit Shell needs exact current main SHA + separate explicit approval.
 * No calendar or budget inserts, provider GET, PRE, POST or paid GO here.
 */
import {randomBytes} from "node:crypto";
import {spawn} from "node:child_process";
import pg from "pg";

const {Pool}=pg;
const REPO="HKcode22/ReplitTranvr";
export const APPROVAL="COMMISSION_ONLY_TWO_NARROW_P5_B0062_V0093_PRELAUNCH_LOGINS_NO_PROVIDER";
export const ENTRIES=Object.freeze([
 {role:"phase5_b0062_prelaunch_stage_prod20261113",
  secret:"P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL",
  read:[
   "adb_phase6_calendar_day","adb_phase6_authorization",
   "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39",
   "adb_sampling_draw","phase5_fids_day_budget_v39",
   "phase5_fids_allowed_query_v39","phase5_fids_seven_rest_release_v39",
   "phase5_fids_cycle_rest_category_cap_v39",
   "phase5_fids_utc_rest_category_budget_v39"],
  write:[
   "adb_phase6_calendar_day","adb_phase6_authorization",
   "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39"]},
 {role:"phase5_fids_budget_freeze_prod20261113",
  secret:"P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL",
  read:[
   "adb_phase6_authorization","adb_phase6_calendar_day",
   "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39",
   "phase5_fids_allowed_query_v39","phase5_fids_seven_rest_release_v39",
   "phase5_fids_cycle_rest_category_cap_v39",
   "phase5_fids_utc_rest_category_budget_v39"],
  write:[
   "phase5_fids_seven_rest_release_v39",
   "phase5_fids_cycle_rest_category_cap_v39",
   "phase5_fids_utc_rest_category_budget_v39"]}
]);
const EXCLUDED=[
 "phase5_fids_day_budget_v39","phase5_fids_exact_query_partition_v39",
 "phase5_fids_physical_attempt_v39","phase5_fids_original_binding_v39",
 "fids_query_response","flight_population","flight_snapshots"
];
const ALL=[...new Set([...ENTRIES.flatMap(e=>[...e.read,...e.write]),...EXCLUDED])];
const SHA=/^[0-9a-f]{40}$/;
const ROLE=/^phase5_[a-z0-9_]{15,60}$/;
const IDENT=/^[a-z][a-z0-9_]{3,75}$/;
const fail=s=>{throw Error("HOLD_P5_NARROW_PRELAUNCH_TWO_LOGIN_"+s);};
const table=t=>{
 if(!IDENT.test(t)||!ALL.includes(t))fail("UNREVIEWED_SQL_RELATION");
 return "clean."+t;
};
const role=s=>{
 if(!ROLE.test(s)||!ENTRIES.some(x=>x.role===s))fail("UNREVIEWED_ROLE");
 return s;
};
function admission(env){
 if(env.P5_PRELAUNCH_TWO_LOGIN_APPROVAL!==APPROVAL||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    !SHA.test(env.P5_PRELAUNCH_APPROVED_MAIN_SHA??"")||
    !env.DATABASE_URL)
  fail("NOT_EXACT_OWNER_NO_PROVIDER_INERT_APPROVAL");
 let db;
 try{db=new URL(env.DATABASE_URL);}catch{fail("INVALID_ADMIN_DATABASE_URL");}
 if(!["postgres:","postgresql:"].includes(db.protocol)||
    !db.hostname||!db.password||db.pathname!=="/neondb"||
    !decodeURIComponent(db.username)||
    decodeURIComponent(db.username).startsWith("phase5_")||
    db.hash)
  fail("NOT_AN_OWNER_DATABASE_URL");
 if(env.GITHUB_ACTIONS==="true"&&
    !(env.P5_PRELAUNCH_CI_DISPOSABLE_PG16==="1"&&
      env.DATABASE_URL===
       "postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable"))
  fail("NO_LIVE_OR_UNKNOWN_CI_DB");
 return db;
}
function secretURL(base,name,password){
 const url=new URL(base);
 url.username=role(name);
 url.password=password;
 return url.toString();
}
async function snapshot(c,expectedCreated){
 const a=(await c.query(
  "SELECT current_database() db,current_user actor,"+
  "current_setting('server_version_num')::int major,"+
  "current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,"+
  "(SELECT rolcreaterole OR rolsuper FROM pg_catalog.pg_roles "+
  "WHERE rolname=current_user) creator,"+
  "(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) superuser"
 )).rows[0];
 if(!a||a.db!=="neondb"||Number(a.major)<160000||
    a.ro!=="off"||a.replica!==false||a.creator!==true||
    (process.env.GITHUB_ACTIONS==="true"?
      (a.actor!=="postgres"||a.superuser!==true):
      (a.actor!=="neondb_owner"||a.superuser!==false)))
  fail("WRONG_PG16_OWNER_PRIMARY_OR_PRIVILEGE");
 const tables=(await c.query(
  "SELECT n,t.o IS NOT NULL AS present FROM "+
  "unnest($1::text[]) AS v(n) "+
  "LEFT JOIN LATERAL (SELECT to_regclass('clean.'||v.n) o) t ON true",
  [ALL])).rows;
 if(tables.length!==ALL.length||tables.some(x=>x.present!==true))
  fail("BASELINE_V0079_V0093_TABLES_MISSING_NEVER_REINSTALL");
 const acls=(await c.query(
  "SELECT COUNT(*)::int calendar FROM clean.adb_phase6_calendar_day"
 )).rows[0]?.calendar;
 const [auth,source,attempt,category,draw]=await Promise.all([
  c.query("SELECT COUNT(*)::int n FROM clean.adb_phase6_authorization"),
  c.query("SELECT COUNT(*)::int n FROM clean.phase5_fids_allowed_query_v39"),
  c.query("SELECT COUNT(*)::int n FROM clean.phase5_fids_physical_attempt_v39"),
  c.query("SELECT COUNT(*)::int n FROM clean.phase5_fids_seven_rest_release_v39"),
  c.query("SELECT COUNT(*)::int n FROM clean.adb_sampling_draw")
 ]);
 if([acls,auth.rows[0]?.n,source.rows[0]?.n,attempt.rows[0]?.n,
     category.rows[0]?.n,draw.rows[0]?.n].some(n=>n!==0))
  fail("PHASE6_ALREADY_STAGED_OR_SOURCE_ACTIVE_NO_EXTRA_LOGINS");
 const costColumns=(await c.query(
  "SELECT COUNT(*)::int n FROM information_schema.columns "+
  "WHERE table_schema='clean' AND "+
  "table_name='phase5_fids_seven_rest_release_v39' "+
  "AND column_name IN ('budget_release_mode','reviewed_cost_envelope_sha256')"
 )).rows[0]?.n;
 if(costColumns!==2)fail("V0093_NOT_INSTALLED_OR_DRIFTED");
 const rows=(await c.query(
  "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolcreaterole,"+
  "rolcreatedb,rolreplication,rolbypassrls FROM pg_catalog.pg_roles "+
  "WHERE rolname=ANY($1::text[])",
  [ENTRIES.map(e=>e.role)])).rows;
 if(rows.length!==(expectedCreated?2:0))
  fail("ROLE_ALREADY_EXISTS_OR_PARTIALLY_COMMISSIONED_NEVER_RETRY");
 if(expectedCreated){
  if(rows.some(x=>x.rolcanlogin!==true||x.rolinherit!==false||
    x.rolsuper!==false||x.rolcreaterole!==false||
    x.rolcreatedb!==false||x.rolreplication!==false||
    x.rolbypassrls!==false))
   fail("LOGIN_UNEXPECTEDLY_ELEVATED");
  const membership=(await c.query(
   "SELECT member.rolname AS login FROM pg_catalog.pg_auth_members m "+
   "JOIN pg_catalog.pg_roles member ON member.oid=m.member "+
   "WHERE member.rolname=ANY($1::text[])",
   [ENTRIES.map(e=>e.role)])).rows;
  if(membership.length!==0)fail("LOGIN_UNEXPECTED_INHERITED_OR_SET_ROLE_MEMBERSHIP");
  for(const e of ENTRIES){
   const perm=await c.query("SELECT "+
    ALL.flatMap(t=>["SELECT","INSERT","UPDATE","DELETE","TRUNCATE"].
     map(op=>"has_table_privilege($1,'"+table(t)+"','"+op+"') AS "+
       "p"+ALL.indexOf(t)+"_"+op.toLowerCase())).join(","),
    [role(e.role)]);
   const p=perm.rows[0];
   if(!p)fail("ACL_READBACK_MISSING");
   for(let k=0;k<ALL.length;k++){
    const t=ALL[k],seen=e.read.includes(t),insert=e.write.includes(t);
    if(p["p"+k+"_select"]!==seen||
       p["p"+k+"_insert"]!==insert||
       ["update","delete","truncate"].some(op=>p["p"+k+"_"+op]!==false))
     fail("LOGIN_HAS_EXCESS_OR_MISSING_ACTUAL_TABLE_PRIVILEGE");
   }
   const pg=(await c.query(
    "SELECT has_schema_privilege($1,'clean','USAGE') AS can_use",
    [e.role])).rows[0];
   if(pg?.can_use!==true)fail("MISSING_CLEAN_SCHEMA_USABLE");
  }
 }
 return {version:Number(a.major),actor:a.actor,zeroPhase6Data:true};
}
async function executePlan(c,secrets,base){
 for(const e of ENTRIES){
  const password=randomBytes(48).toString("hex");
  const login=role(e.role);
  await c.query("CREATE ROLE "+login+
   " LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB"+
   " NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'");
  await c.query("GRANT USAGE ON SCHEMA clean TO "+login);
  await c.query("GRANT SELECT ON "+e.read.map(table).join(",")+" TO "+login);
  await c.query("GRANT INSERT ON "+e.write.map(table).join(",")+" TO "+login);
  secrets.push({name:e.secret,value:secretURL(base,e.role,password)});
 }
}
export async function commissionP5PrelaunchTwoNarrowLoginsOnce(
 pool,gh,env=process.env
){
 admission(env);
 if(!gh||!["getMainSha","listSecretNames","setSecret","deleteSecret"].
    every(k=>typeof gh[k]==="function"))
  fail("REVIEWED_ENCRYPTED_GITHUB_SECRETS_DRIVER_REQUIRED");
 if(await gh.getMainSha()!==env.P5_PRELAUNCH_APPROVED_MAIN_SHA)
  fail("GITHUB_MAIN_NOT_EXACT_APPROVED_SHA");
 const existingSecrets=await gh.listSecretNames();
 if(!Array.isArray(existingSecrets)||
    ENTRIES.some(e=>existingSecrets.includes(e.secret)))
  fail("GITHUB_SECRET_ALREADY_PRESENT_OR_UNVERIFIABLE");
 const c=await pool.connect();
 let started=false,attemptedCommit=false;
 const touched=[];
 try{
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  started=true;
  await c.query("SET LOCAL statement_timeout='40000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  const lock=(await c.query(
   "SELECT pg_try_advisory_xact_lock("+
   "hashtext('v39-p5-prelaunch'),hashtext('two-narrow-owner-logins')) got"
  )).rows[0]?.got;
  if(lock!==true)fail("OTHER_OWNER_COMMISSIONER_ACTIVE");
  await snapshot(c,false);
  const toSet=[];
  await executePlan(c,toSet,env.DATABASE_URL);
  await snapshot(c,true);
  // Secrets are sent encrypted to GitHub BEFORE DB commit. A precommit
  // failure rolls back roles and deletes only the exact newly created names.
  for(const s of toSet){
   touched.push(s.name);
   await gh.setSecret(s.name,s.value);
  }
  const afterSecrets=await gh.listSecretNames();
  if(ENTRIES.some(e=>!afterSecrets.includes(e.secret)))
   fail("ENCRYPTED_SECRET_READBACK_INCOMPLETE");
  if(env.GITHUB_ACTIONS==="true"&&
      env.P5_PRELAUNCH_CI_INJECT_PRECOMMIT_FAILURE==="1")
   fail("CI_INJECTED_PRECOMMIT_FAILURE");
  if(await gh.getMainSha()!==env.P5_PRELAUNCH_APPROVED_MAIN_SHA)
   fail("MAIN_CHANGED_DURING_OWNER_COMMISSIONING");
  attemptedCommit=true;
  await c.query("COMMIT");started=false;
  await snapshot(c,true);
  if(ENTRIES.some(e=>!afterSecrets.includes(e.secret)))
   fail("GITHUB_SECRET_POSTCOMMIT_UNVERIFIED");
  return {
   status:"P5_B0062_AND_V0093_TWO_NARROW_LOGINS_COMMISSIONED_NO_GO",
   productionLoginCount:2,encryptedGithubSecretsCreated:2,
   secretNames:ENTRIES.map(e=>e.secret),
   directTableGrantsOnly:true,noRoleMemberships:true,
   noSourceOrFlightACL:true,dbSourceRowsWritten:0,
   calendarOrBudgetRowsWritten:0,providerCalls:0,
   phase5ScientificFreeze:false,phase6PaidGo:false
  };
 }catch(e){
  if(attemptedCommit)
   fail("COMMIT_UNKNOWN_OR_POSTCOMMIT_FAILURE_QUARANTINE_NEVER_RETRY");
  let rollback=!started;
  if(started){
   try{await c.query("ROLLBACK");rollback=true;}catch{rollback=false;}
  }
  let cleaned=true;
  for(const name of touched.reverse()){
   try{await gh.deleteSecret(name);}catch{cleaned=false;}
  }
  if(!rollback||!cleaned)
   fail("PRECOMMIT_ROLLBACK_OR_SECRET_CLEANUP_UNVERIFIED_NEVER_RETRY");
  throw e;
 }finally{c.release();}
}
function runGh(args,stdin){
 return new Promise((resolve,reject)=>{
  const ch=spawn("gh",args,{stdio:["pipe","pipe","pipe"]});
  let result="";
  ch.stdout.on("data",x=>{result+=String(x).slice(0,10000);});
  ch.stderr.on("data",()=>{});
  ch.on("error",()=>reject(Error("GH_CLI_UNAVAILABLE")));
  ch.on("close",code=>code===0?resolve(result):
   reject(Error("GH_CLI_COMMAND_FAILED")));
  ch.stdin.end(stdin);
 });
}
export function realP5PrelaunchGitHubDriver(){
 return {
  getMainSha:async()=>String(await runGh([
   "api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"
  ])).trim(),
  listSecretNames:async()=>String(await runGh([
   "api","repos/"+REPO+"/actions/secrets","--paginate",
   "--jq",".secrets[].name"
  ])).trim().split("\n").filter(Boolean),
  setSecret:async(name,value)=>{
   if(!ENTRIES.some(e=>e.secret===name))fail("UNREVIEWED_SECRET_NAME");
   await runGh(["secret","set",name,"--repo",REPO,"--app","actions"],value);
  },
  deleteSecret:async(name)=>{
   if(!ENTRIES.some(e=>e.secret===name))fail("UNREVIEWED_SECRET_DELETE");
   await runGh(["secret","delete",name,"--repo",REPO,"--app","actions"]);
  }
 };
}
async function main(){
 let pool;
 try{
  admission(process.env);
  pool=new Pool({connectionString:process.env.DATABASE_URL,
   max:1,connectionTimeoutMillis:9000,idleTimeoutMillis:1800});
  const out=await commissionP5PrelaunchTwoNarrowLoginsOnce(
   pool,realP5PrelaunchGitHubDriver(),process.env);
  console.log(JSON.stringify(out));
 }catch(e){
  const msg=String(e?.message??"");
  console.error(/^HOLD_P5_NARROW_PRELAUNCH_TWO_LOGIN_[A-Z0-9_]+$/.test(msg)?
   msg:"HOLD_P5_NARROW_PRELAUNCH_TWO_LOGIN_AMBIGUOUS_OR_NOT_APPROVED");
  process.exitCode=2;
 }finally{await pool?.end().catch(()=>{});}
}
if(process.env.P5_PRELAUNCH_TWO_LOGIN_APPROVAL)await main();
