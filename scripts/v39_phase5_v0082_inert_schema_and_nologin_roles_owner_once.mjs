/**
 * Phase5 V0082 ADDITIVE INERT schema + exact NOLOGIN-only permission release.
 * NEVER touches/replays installed V0079/V0080/V0081, opens SOURCE/PRE, or
 * performs paid HTTP. A reviewed future owner must invoke exactly once with
 * separate privileged DB connection, current main SHA and explicit permit.
 *
 * CI: real disposable PostgreSQL16 only. CREATE TABLE/FUNCTION/TRIGGER,
 * CREATE ROLE and grants are all inside ONE SERIALIZABLE transaction.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createHash} from "node:crypto";
import pg from "pg";
const {Pool}=pg;
const PERMIT="INSTALL_EMPTY_V0082_ONLY_AND_BUDGET_NOLOGIN_ROLES_NO_PROVIDER";
const LOCAL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const SHA=/^[0-9a-f]{40}$/;
const PIN="49b0954c25eeff6c496dfb03cf8b6d735e26badb";
const FILE="V0082__phase5_seven_rest_categories_exposed_partition_hold_v39.sql";
const ROLES={
 prepare:"phase5_fids_prepare_prod_20261107",
 source:"phase5_fids_source_prod_20261107",
 pre:"phase5_fids_pre_writer_prod_20261107",
 witness:"phase5_fids_t24_witness_prod_20261107",
 budget:"phase5_fids_budget_freeze_prod_20261108"
};
const EXISTING=[ROLES.prepare,ROLES.source,ROLES.pre,ROLES.witness];
const NEW_TABLES=[
 "phase5_fids_seven_rest_release_v39",
 "phase5_fids_cycle_rest_category_cap_v39",
 "phase5_fids_utc_rest_category_budget_v39",
 "phase5_fids_exact_query_partition_v39"
];
const FUNCTIONS=[
 "clean.phase5_fids_v0082_immutable_v39()",
 "clean.phase5_fids_v0082_category_immutable_v39()",
 "clean.phase5_fids_v0082_enforce_category_get_v39()"
];
const TRIGGERS=[
 "p5_v0082_release_immutable","p5_v0082_caps_immutable",
 "p5_v0082_part_immutable","p5_v0082_day_category_immutable",
 "phase5_fids_v0082_seven_rest_before_physical"
];
const BEFORE=[
 "phase5_fids_cycle_budget_v39","phase5_fids_day_budget_v39",
 "phase5_fids_utc_charge_budget_v39","phase5_fids_allowed_query_v39",
 "phase5_fids_physical_attempt_v39","phase5_fids_original_binding_v39",
 "phase5_fids_github_prearm_v39","phase5_t24_postcommit_witness_v39"
];
const hold=x=>{throw Error("REFUSED_P5_V0082_SCHEMA_OWNER_"+x);};
const csv=arr=>arr.join(",");
function admit(env){
 if(env.P5_V0082_INERT_SCHEMA_ONCE!==PERMIT||
    !env.DATABASE_URL||!env.V39_DATABASE_RUNTIME_URL||
    env.DATABASE_URL===env.V39_DATABASE_RUNTIME_URL||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.P5_V0082_EXPECTED_OWNER_ROLE?.length<2||
    !SHA.test(env.P5_V0082_REVIEWED_MAIN_SHA??""))
   hold("MISSING_EXACT_OWNER_MAIN_SHA_DISTINCT_DATABASE_ROLE_AND_INERT_APPROVAL");
 if(env.GITHUB_ACTIONS==="true"&&
    (env.DATABASE_URL!==LOCAL||
     env.P5_V0082_EXPECTED_OWNER_ROLE!=="postgres"||
     env.P5_V0082_CI_DISPOSABLE_ONLY!=="1"||
     env.P5_V0082_REVIEWED_MAIN_SHA!==env.GITHUB_SHA))
   hold("CI_LOCAL_DISPOSABLE_MAIN_SHA_ONLY");
}
function readPinned(){
 const file=resolve(process.cwd(),"migrations/staged",FILE);
 const data=readFileSync(file);
 const blob=createHash("sha1").update("blob "+data.length+"\0").
  update(data).digest("hex");
 if(blob!==PIN)hold("MIGRATION_FILE_BLOB_CHANGED_REQUIRE_NEW_REVIEW");
 return data.toString("utf8");
}
async function objects(c,installed){
 const tables=(await c.query(
  "SELECT relname FROM pg_catalog.pg_class r JOIN pg_catalog.pg_namespace n"+
  " ON n.oid=r.relnamespace WHERE n.nspname='clean' "+
  "AND r.relkind IN ('r','p') AND r.relname=ANY($1::text[])",
  [installed?NEW_TABLES:NEW_TABLES.concat(BEFORE)]
 )).rows.map(r=>r.relname);
 if(installed?tables.length!==4||NEW_TABLES.some(x=>!tables.includes(x)):
     tables.length!==BEFORE.length||NEW_TABLES.some(x=>tables.includes(x))||
     BEFORE.some(x=>!tables.includes(x)))
  hold(installed?"POST_INSTALL_V0082_TABLES_MISSING":"BASELINE_OR_NEW_V0082_ALREADY_PRESENT");
 const funcs=(await c.query(
  "SELECT name,to_regprocedure(name) IS NOT NULL AS found "+
  "FROM unnest($1::text[]) AS names(name)",[FUNCTIONS]
 )).rows;
 if(funcs.length!==3||funcs.some(f=>f.found!==installed))
  hold("MIGRATION_FUNCTION_SET_NOT_ALL_OR_NONE");
 const triggers=(await c.query(
  "SELECT tgname FROM pg_catalog.pg_trigger "+
  "WHERE tgname=ANY($1::text[]) AND NOT tgisinternal",[TRIGGERS]
 )).rows;
 if(triggers.length!==(installed?5:0))
  hold("MIGRATION_TRIGGER_SET_NOT_ALL_OR_NONE");
}
async function baseline(c){
 const r=(await c.query(
  "SELECT current_database() db,current_user actor,"+
  "current_setting('server_version_num') ver,"+
  "current_setting('transaction_read_only') ro,"+
  "pg_is_in_recovery() replica,"+
  "has_schema_privilege(current_user,'clean','CREATE') may_create,"+
  "(SELECT rolsuper OR rolcreaterole FROM pg_catalog.pg_roles "+
  " WHERE rolname=current_user) may_create_role"
 )).rows[0];
 if(!r||r.db!=="neondb"||Number(r.ver)<160000||
    r.ro!=="off"||r.replica!==false||
    r.may_create!==true||r.may_create_role!==true)
   hold("NOT_POSTGRES16_PRIVILEGED_PRIMARY_SCHEMA_OWNER");
 const counts=(await c.query(
  "SELECT "+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) queries,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39) attempts,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_original_binding_v39) originals,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_github_prearm_v39) prearms"
 )).rows[0];
 if(!counts||Object.values(counts).some(v=>v!==0))
   hold("SOURCE_ORIGINAL_OR_GITHUB_PREARM_ALREADY_PRESENT_NOT_INERT");
 const roles=(await c.query(
  "SELECT rolname,rolcanlogin,rolsuper,rolcreaterole,rolinherit,"+
  "rolcreatedb,rolreplication,rolbypassrls "+
  "FROM pg_catalog.pg_roles WHERE rolname=ANY($1::text[])",
  [Object.values(ROLES)]
 )).rows;
 if(roles.length!==4||roles.some(x=>x.rolname===ROLES.budget||
     !EXISTING.includes(x.rolname)||x.rolcanlogin!==false||
     x.rolsuper!==false||x.rolcreaterole!==false||
     x.rolinherit!==false||x.rolcreatedb!==false||
     x.rolreplication!==false||x.rolbypassrls!==false))
   hold("EXISTING_FOUR_SCOPED_NOLOGIN_ROLES_OR_NEW_BUDGET_ROLE_UNEXPECTED");
 const f=(await c.query(
  "SELECT "+
  "to_regprocedure('clean.reserve_phase5_fids_physical_get_v39("+
   "text,text,text,text,text,text)') IS NOT NULL reservation,"+
  "to_regprocedure('clean.prearm_phase5_fids_github_query_v39("+
   "text,text,text,text,text,text)') IS NOT NULL prearm"
 )).rows[0];
 if(!f||f.reservation!==true||f.prearm!==true)
   hold("INSTALLED_V0079_V0080_GUARDS_INCOMPLETE");
 // This table exists only once the independently commissioned V0081 is ready.
 if((await c.query(
  "SELECT to_regclass('clean.phase5_t24_postcommit_witness_v39') IS NOT NULL ok"
 )).rows[0]?.ok!==true)
   hold("INDEPENDENT_POSTCOMMIT_WITNESS_NOT_PRESENT");
}
async function checks(c){
 await objects(c,true);
 const probes=[];
 const add=(role,table,priv,expected)=>
   probes.push({role,table,priv,expected});
 for(const t of NEW_TABLES)for(const priv of
    ["INSERT","UPDATE","DELETE","TRUNCATE"]){
   add(ROLES.pre,"clean."+t,priv,false);
   add(ROLES.witness,"clean."+t,priv,false);
   add(ROLES.source,"clean."+t,priv,false);
 }
 const capTables=NEW_TABLES.slice(0,3);
 for(const t of capTables){
  add(ROLES.budget,"clean."+t,"SELECT",true);
  add(ROLES.budget,"clean."+t,"INSERT",true);
  for(const priv of ["UPDATE","DELETE","TRUNCATE"])
    add(ROLES.budget,"clean."+t,priv,false);
  add(ROLES.prepare,"clean."+t,"SELECT",true);
  for(const priv of ["INSERT","UPDATE","DELETE","TRUNCATE"])
    add(ROLES.prepare,"clean."+t,priv,false);
 }
 const part="clean.phase5_fids_exact_query_partition_v39";
 add(ROLES.prepare,part,"SELECT",true);
 add(ROLES.prepare,part,"INSERT",true);
 for(const priv of ["UPDATE","DELETE","TRUNCATE"])
   add(ROLES.prepare,part,priv,false);
 for(const priv of ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE"])
   add(ROLES.budget,part,priv,false);
 for(const t of [
   "clean.adb_phase6_authorization","clean.adb_phase6_calendar_day",
   "clean.phase5_fids_cycle_budget_v39",
   "clean.phase5_fids_utc_charge_budget_v39",
   "clean.phase5_fids_allowed_query_v39"])
   add(ROLES.budget,t,"SELECT",true);
 for(const t of ["clean.phase5_fids_allowed_query_v39",
    "clean.phase5_fids_physical_attempt_v39",
    "clean.phase5_fids_original_binding_v39",
    "clean.fids_query_response","clean.flight_population",
    "clean.flight_snapshots"]){
   add(ROLES.budget,t,"INSERT",false);
   if(["clean.fids_query_response","clean.flight_population",
       "clean.flight_snapshots"].includes(t))
     add(ROLES.budget,t,"SELECT",false);
 }
 const per=180;
 for(let i=0;i<probes.length;i+=per){
  const slice=probes.slice(i,i+per);
  const sql="SELECT "+slice.map((p,j)=>
   "has_table_privilege('"+p.role+"','"+p.table+"','"+p.priv+
     "') AS p"+j).join(",");
  const val=(await c.query(sql)).rows[0];
  if(!val||slice.some((p,j)=>val["p"+j]!==p.expected))
   hold("NEW_V0082_NOLOGIN_PERMISSION_MATRIX_NOT_EXACT");
 }
 const role=(await c.query(
  "SELECT rolcanlogin,rolinherit,rolsuper,rolcreaterole,rolcreatedb,"+
  "rolreplication,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=$1",
  [ROLES.budget]
 )).rows[0];
 if(!role||role.rolcanlogin!==false||role.rolinherit!==false||
    role.rolsuper!==false||role.rolcreaterole!==false||
    role.rolcreatedb!==false||role.rolreplication!==false||
    role.rolbypassrls!==false)
   hold("BUDGET_ROLE_IS_LOGIN_OR_ADMIN");
 const members=(await c.query(
  "SELECT a.inherit_option,a.set_option,a.admin_option "+
  "FROM pg_catalog.pg_auth_members a JOIN pg_catalog.pg_roles r "+
  "ON a.roleid=r.oid WHERE r.rolname=$1",[ROLES.budget]
 )).rows;
 if(members.some(x=>x.inherit_option!==false||x.set_option!==false||
     x.admin_option!==true)||members.length>1)
  hold("NEW_BUDGET_ROLE_UNSAFE_MEMBERSHIP");
 const publicGrants=(await c.query(
  "SELECT COUNT(*)::int AS n FROM pg_catalog.pg_class cl "+
  "JOIN pg_catalog.pg_namespace ns ON ns.oid=cl.relnamespace "+
  "CROSS JOIN LATERAL aclexplode(coalesce(cl.relacl,acldefault('r',cl.relowner))) acl "+
  "WHERE ns.nspname='clean' AND cl.relname=ANY($1::text[]) "+
  "AND acl.grantee=0",
  [NEW_TABLES]
 )).rows[0]?.n;
 if(publicGrants!==0)
  hold("V0082_TABLE_PUBLIC_PRIVILEGE_NOT_REVOKED");
 const exposed=(await c.query(
  "SELECT COUNT(*)::int n FROM pg_catalog.pg_proc p "+
  "JOIN pg_catalog.pg_namespace ns ON ns.oid=p.pronamespace "+
  "CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl "+
  "WHERE ns.nspname='clean' AND p.proname LIKE 'phase5_fids_v0082_%' "+
  "AND acl.grantee=0"
 )).rows[0]?.n;
 if(exposed!==0)
  hold("V0082_FUNCTION_PUBLIC_EXECUTE_NOT_REVOKED");
}
async function zero(c){
 const v=(await c.query(
  "SELECT "+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39) r,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_cycle_rest_category_cap_v39) caps,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_utc_rest_category_budget_v39) d,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_exact_query_partition_v39) p,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39) a"
 )).rows[0];
 if(!v||Object.values(v).some(n=>n!==0))
  hold("SCHEMA_INSTALL_CANNOT_MINT_SOURCE_BUDGET_OR_PAID_ROWS");
}
export async function installPhase5V0082EmptySchemaAndNoLoginRolesOnce(
 pool,env=process.env){
 admit(env);
 const migration=readPinned();
 const c=await pool.connect();
 let open=false,commitAttempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");open=true;
  await c.query("SET LOCAL statement_timeout='30000ms'");
  await c.query("SET LOCAL lock_timeout='3500ms'");
  const owner=(await c.query("SELECT current_user AS who")).rows[0]?.who;
  if(owner!==env.P5_V0082_EXPECTED_OWNER_ROLE)
   hold("UNEXPECTED_ACTUAL_SCHEMA_OWNER_DATABASE_ROLE");
  const lock=(await c.query(
   "SELECT pg_try_advisory_xact_lock(hashtext('v39-phase5-v0082'),"+
   "hashtext('empty-budget-role-install')) AS ok"
  )).rows[0];
  if(lock?.ok!==true)hold("ALREADY_INSTALLING_V0082_SCHEMA");
  await baseline(c);
  await objects(c,false);
  await c.query(migration);
  if(env.GITHUB_ACTIONS==="true"&&env.P5_V0082_CI_INJECT_ROLLBACK==="1")
    hold("CI_INJECTED_ATOMIC_V0082_INSTALL_ROLLBACK");
  await c.query(
   "CREATE ROLE "+ROLES.budget+" NOLOGIN NOINHERIT NOSUPERUSER "+
   "NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"
  );
  await c.query("GRANT USAGE ON SCHEMA clean TO "+ROLES.budget);
  const readOld=[
   "adb_phase6_authorization","adb_phase6_calendar_day",
   "phase5_fids_cycle_budget_v39",
   "phase5_fids_utc_charge_budget_v39",
   "phase5_fids_allowed_query_v39"
  ];
  const cap=NEW_TABLES.slice(0,3);
  await c.query("GRANT SELECT ON "+
   csv(readOld.concat(cap).map(t=>"clean."+t))+" TO "+ROLES.budget);
  await c.query("GRANT INSERT ON "+
   csv(cap.map(t=>"clean."+t))+" TO "+ROLES.budget);
  await c.query("GRANT SELECT ON "+
   csv(NEW_TABLES.map(t=>"clean."+t))+" TO "+ROLES.prepare);
  await c.query("GRANT INSERT ON clean."+
   "phase5_fids_exact_query_partition_v39 TO "+ROLES.prepare);
  await objects(c,true);
  await checks(c);
  await zero(c);
  commitAttempted=true;
  await c.query("COMMIT");open=false;
  await checks(c);
  await zero(c);
  return {
   status:"V0082_EMPTY_FROZEN_CATEGORY_SCHEMA_AND_NOLOGIN_ACL_INSTALLED_INERT",
   stagedExactGitBlobSha1:PIN,ownerReviewedMainSha:env.P5_V0082_REVIEWED_MAIN_SHA,
   newTables:4,newFunctions:3,newTriggers:5,
   newBudgetFreezeNoLoginRoles:1,newRuntimeLoginRoles:0,
   extendedOldPrepareNoLoginRoles:1,
   sourceRoleNewPaidPermissions:0,rawFlightRows:0,
   categoryBudgetRows:0,physicalSourceAttempts:0,
   actualProviderFidsGets:0,providerAlertCreates:0,
   accountRightsCertified:false,phase5ScientificFreeze:false,phase6PaidGo:false
  };
 }catch(e){
  if(open&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)
   hold("AMBIGUOUS_SCHEMA_DDL_COMMIT_REQUIRE_INDEPENDENT_READONLY_AUDIT");
  throw e;
 }finally{c.release();}
}
async function main(){
 let pool;
 try{
  admit(process.env);
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:12000,idleTimeoutMillis:4000});
  const out=await installPhase5V0082EmptySchemaAndNoLoginRolesOnce(pool);
  console.log(JSON.stringify(out));
 }catch(err){
  const message=typeof err?.message==="string"&&
   /^REFUSED_P5_V0082_SCHEMA_OWNER_[A-Z0-9_]+$/.test(err.message)?
   err.message:"REFUSED_P5_V0082_SCHEMA_OWNER_UNEXPECTED_DATABASE_HOLD";
  // No SQL exception detail, password, owner URL or API keys in log.
  console.error(message);
  process.exitCode=2;
 }finally{if(pool)await pool.end().catch(()=>{});}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
 await main();
