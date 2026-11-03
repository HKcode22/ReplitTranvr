/**
 * One-time production operator bootstrap for prospectively reviewed G5A.
 * This script does NOT make an AeroDataBox call, write flight Content, arm
 * any GitHub paid workflow or authorize scientific Gate5.
 *
 * Prefer GitHub Environment 'phase2g-paid' for only the newly minted
 * non-admin source writer. Do not put DATABASE_URL or the runtime URL into
 * GitHub; the independent audit reader remains a separate existing secret.
 *
 * Exact pinned Replit shell invocation only after PR has passed CI.
 */
import {randomBytes} from "node:crypto";
import {execFileSync,spawnSync} from "node:child_process";
import pg from "pg";
const REPO="HKcode22/ReplitTranvr";
const ROLE="p4_g5_g5a_owner_20261103";
const ENV="phase2g-paid";
const SECRET="P4_G5_SOURCE_OWNER_DATABASE_URL";
const INTENT="ONE_G5A_FUTURE_SOURCE_DB_ROLE_AND_GITHUB_ENV_SECRET_NO_PROVIDER";
type Priv={relation:string; privileges:readonly ("SELECT"|"INSERT"|"UPDATE")[]};
export const P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39:readonly Priv[]=[
 {relation:"clean.fids_query_response",privileges:["SELECT","INSERT"]},
 {relation:"clean.flight_population",privileges:["SELECT","INSERT"]},
 {relation:"clean.phase4_g5_fids_original_binding_v39",privileges:["SELECT","INSERT"]},
 {relation:"clean.phase4_g5_fids_cohort_budget_v39",privileges:["SELECT","INSERT","UPDATE"]},
 {relation:"clean.phase4_g5_fids_physical_owner_v39",privileges:["SELECT","INSERT","UPDATE"]},
 {relation:"clean.phase4_g5_fids_allowed_query_v39",privileges:["SELECT","INSERT","UPDATE"]},
 {relation:"clean.phase4_g5_fids_physical_attempt_v39",privileges:["SELECT","INSERT"]},
 {relation:"clean.flight_snapshots",privileges:["SELECT","INSERT"]}
];
const reserveFunction="clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)";
const sha=/^[a-f0-9]{40}$/;
function hold(what:string):never{
 throw Error("P4_G5_G5A_GITHUB_ROLE_"+what+"_HOLD");
}
function run(bin:string,args:string[],input?:string):boolean{
 const x=spawnSync(bin,args,{input,encoding:"utf8",timeout:18000,
  stdio:["pipe","pipe","pipe"]});
 // Deliberately discard all gh stdout/stderr; it can mention private data.
 return !x.error&&x.status===0;
}
function conn(uri:string,name:string):pg.Client{
 if(!uri||!/^postgres(ql)?:\/\//.test(uri)||uri.length>3000)hold(name+"_URL");
 return new pg.Client({connectionString:uri,connectionTimeoutMillis:9000,
  query_timeout:14000,application_name:"p4_g5_g5a_credential_once"});
}
function quoteId(id:string){
 return '"'+id.replace(/"/g,'""')+'"';
}
function quoteLiteral(value:string){
 return "'"+value.replace(/'/g,"''")+"'";
}
function ownerUri(src:string,password:string){
 const u=new URL(src);
 u.username=encodeURIComponent(ROLE);
 u.password=encodeURIComponent(password);
 return u.toString();
}
export function verifyG5AOwnerGrantPlanV39(){
 if(P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39.length!==8||
  new Set(P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39.map(x=>x.relation)).size!==8||
  P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39.some(x=>
   !/^clean\.[a-z0-9_]+$/.test(x.relation)||
   x.privileges.length===0||
   x.privileges.some(p=>!["SELECT","INSERT","UPDATE"].includes(p))||
   !x.privileges.includes("SELECT")||
   !x.privileges.includes("INSERT"))||
  !reserveFunction.startsWith("clean.reserve_phase4_g5_"))
  hold("GRANT_PLAN");
 return true;
}
async function facts(db:pg.Client,side:"ADMIN"|"RUNTIME"){
 await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{
  const r=await db.query(`SELECT current_database() db,current_user role,
   current_setting('server_version_num')::integer>=160000 AS pg16,
   (SELECT rolsuper OR rolcreaterole FROM pg_roles WHERE rolname=current_user) AS can_create_role,
   has_schema_privilege(current_user,'clean','CREATE') AS can_create_clean,
   has_schema_privilege(current_user,'clean','USAGE') AS can_use_clean,
   has_table_privilege(current_user,'clean.phase4_g5_fids_original_binding_v39','SELECT') AS can_read_private_v0077`);
  if(r.rows.length!==1)hold(side+"_CATALOG");
  const f=r.rows[0];
  await db.query("ROLLBACK");
  return f;
 }catch(e){
  await db.query("ROLLBACK").catch(()=>undefined);
  hold(side+"_CATALOG");
 }
}
async function requireCatalog(db:pg.Client){
 const r=await db.query(`SELECT to_regclass($1::text) IS NOT NULL AS exists,
   (SELECT pg_get_serial_sequence($1::text,'id')) AS seq`,["clean.flight_population"]);
 if(r.rows.length!==1||r.rows[0].exists!==true)hold("BASELINE_SCHEMA");
 for(const g of P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39){
  const q=await db.query("SELECT to_regclass($1::text) IS NOT NULL AS exists",[g.relation]);
  if(q.rows[0]?.exists!==true)hold("REQUIRED_RELATION_MISSING");
 }
 const f=await db.query("SELECT to_regprocedure($1::text) IS NOT NULL AS exists",[reserveFunction]);
 if(f.rows[0]?.exists!==true)hold("RESERVE_FUNCTION_MISSING");
}
async function grantAndCommit(admin:pg.Client,password:string,dbName:string){
 let tx=false;
 try{
  await admin.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await admin.query("SET LOCAL statement_timeout='12000ms'");
  await admin.query("SET LOCAL lock_timeout='2000ms'");
  const lock=await admin.query("SELECT pg_try_advisory_xact_lock(76,88) AS got");
  if(lock.rows[0]?.got!==true)hold("CONCURRENT_PROVISION");
  const existing=await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1",[ROLE]);
  if(existing.rows.length!==0)hold("ROLE_ALREADY_EXISTS_DO_NOT_ROTATE_AUTOMATICALLY");
  const expires="2026-11-10 00:00:00+00";
  await admin.query("CREATE ROLE "+quoteId(ROLE)+
   " LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"+
   " PASSWORD "+quoteLiteral(password)+" VALID UNTIL "+quoteLiteral(expires));
  await admin.query("GRANT CONNECT ON DATABASE "+quoteId(dbName)+" TO "+quoteId(ROLE));
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+quoteId(ROLE));
  for(const g of P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39){
   await admin.query("GRANT "+g.privileges.join(",")+" ON TABLE "+
    g.relation+" TO "+quoteId(ROLE));
  }
  // No blanket sequence access. Only sequences attached to exact
  // source/PRE tables that actually have serial-id defaults.
  for(const g of P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39){
   for(const column of ["id","population_member_id"]){
    const r=await admin.query("SELECT pg_get_serial_sequence($1,$2) seq",[g.relation,column]);
    const sequence=r.rows[0]?.seq;
    if(typeof sequence==="string"&&/^clean\.[a-z0-9_]+$/.test(sequence))
     await admin.query("GRANT USAGE ON SEQUENCE "+sequence+" TO "+quoteId(ROLE));
   }
  }
  await admin.query("GRANT EXECUTE ON FUNCTION "+reserveFunction+" TO "+quoteId(ROLE));
  await admin.query("COMMIT");tx=false;
 }catch(e){
  if(tx)await admin.query("ROLLBACK").catch(()=>undefined);
  const code=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  if(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code))
   hold("SCHEMA_WRITE_SQLSTATE_"+code);
  if(e instanceof Error&&/^P4_G5_G5A_GITHUB_ROLE_/.test(e.message))throw e;
  hold("SCHEMA_WRITE");
 }
}
async function verifyNewRole(db:pg.Client,expectedDatabase:string){
 await db.connect();let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  const r=await db.query(`SELECT current_database() db,current_user role,
   has_schema_privilege(current_user,'clean','USAGE') can_use_clean,
   has_schema_privilege(current_user,'clean','CREATE') can_create_clean,
   has_database_privilege(current_user,current_database(),'CREATE') can_create_database,
   (SELECT rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls
    FROM pg_roles WHERE rolname=current_user) can_admin`);
  const a=r.rows[0];
  if(r.rows.length!==1||a.db!==expectedDatabase||a.role!==ROLE||
     a.can_use_clean!==true||a.can_create_clean!==false||
     a.can_create_database!==false||a.can_admin!==false)
   hold("POSTCOMMIT_OWNER_ADMIN_ACL");
  for(const g of P4_G5_SOURCE_OWNER_RELATION_GRANTS_V39){
   const q=await db.query(`SELECT
    has_table_privilege(current_user,$1,'SELECT') AS can_select,
    has_table_privilege(current_user,$1,'INSERT') AS can_insert,
    has_table_privilege(current_user,$1,'UPDATE') AS can_update,
    has_table_privilege(current_user,$1,'DELETE') AS can_delete,
    has_table_privilege(current_user,$1,'TRUNCATE') AS can_truncate,
    has_table_privilege(current_user,$1,'REFERENCES') AS can_ref,
    has_table_privilege(current_user,$1,'TRIGGER') AS can_trigger`,[g.relation]);
   const p=q.rows[0];
   if(q.rows.length!==1||p.can_select!==true||p.can_insert!==true||
      p.can_update!==g.privileges.includes("UPDATE")||
      p.can_delete!==false||p.can_truncate!==false||
      p.can_ref!==false||p.can_trigger!==false)
    hold("POSTCOMMIT_OWNER_TABLE_ACL");
  }
  const k=await db.query("SELECT has_function_privilege(current_user,$1,'EXECUTE') allowed",
   [reserveFunction]);
  if(k.rows[0]?.allowed!==true)hold("POSTCOMMIT_RESERVATION_PERMISSION");
  await db.query("ROLLBACK");tx=false;
 }finally{
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  await db.end().catch(()=>undefined);
 }
}
export async function main(){
 const env=process.env;
 if(env.P4_G5_SOURCE_OWNER_CREDENTIAL_ONCE!==INTENT||
    env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    !env.DATABASE_URL||!env.V39_DATABASE_RUNTIME_URL||
    env.DATABASE_URL===env.V39_DATABASE_RUNTIME_URL||
    env.GITHUB_ACTIONS==="true")
  hold("EXPLICIT_OPERATOR_ENVIRONMENT");
 const checkout=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",timeout:4000}).trim();
 if(!sha.test(checkout))hold("UNPINNED_CHECKOUT");
 verifyG5AOwnerGrantPlanV39();
 // Preflight GitHub auth BEFORE creating a role. No privileged database
 // mutations if the Replit operator shell cannot actually publish a secret.
 if(!run("gh",["--version"])||
    !run("gh",["auth","status","--hostname","github.com"]))
  hold("GITHUB_CLI_AUTH_REQUIRED_NO_DB_CHANGES");
 const admin=conn(env.DATABASE_URL,"ADMIN");
 const runtime=conn(env.V39_DATABASE_RUNTIME_URL,"RUNTIME");
 await admin.connect();await runtime.connect();
 try{
  const a=await facts(admin,"ADMIN"),w=await facts(runtime,"RUNTIME");
  if(!a.pg16||!a.can_create_role||!a.can_create_clean||
     a.db!==w.db||a.role===w.role||w.can_create_clean||
     w.can_read_private_v0077||!w.can_use_clean)
   hold("ADMIN_RUNTIME_ROLE_CATALOG");
  await requireCatalog(admin);
  const existing=await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1",[ROLE]);
  if(existing.rows.length)hold("ROLE_ALREADY_EXISTS_DO_NOT_RECREATE");
  const password=randomBytes(36).toString("base64url");
  const scopedUri=ownerUri(env.DATABASE_URL,password);
  await grantAndCommit(admin,password,String(a.db));
  // Role can CONNECT, write only its exact allowed data, never modify DDL,
  // and cannot access the private worker path. No role or password printed.
  const specific=conn(scopedUri,"NEW_SOURCE_OWNER");
  await verifyNewRole(specific,String(a.db));
  if(!run("gh",["secret","set",SECRET,"--repo",REPO,
       "--env",ENV],scopedUri))
   hold("ROLE_CREATED_BUT_GITHUB_SECRET_UPLOAD_FAILED_CONTACT_OPERATOR");
  const workflowQueued=run("gh",["workflow","run",
   "phase4-gate5-future-owner-credentials-readiness-no-provider.yml",
   "--repo",REPO,"--ref","main"]);
  console.log(JSON.stringify({
   status:"G5A_DEDICATED_SOURCE_WRITER_ROLE_AND_GITHUB_SECRET_PUBLISHED_ONCE",
   githubReadinessDispatchQueued:workflowQueued,
   roleSeparateFromPrivilegedAndRuntime:true,
   githubSecretDestination:"phase2g-paid/"+SECRET,
   adminOrDeletePrivilegesGranted:false,
   providerCalls:0,flightContentWrites:0,scientificGate5Passed:false,
   phase5FreezeAuthorized:false,phase6Authorized:false
  }));
 }finally{
  await runtime.end().catch(()=>undefined);
  await admin.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_source_owner_credential_once.ts"))
 void main().catch((e:unknown)=>{
  const msg=e instanceof Error?e.message:"";
  console.error(/^P4_G5_G5A_GITHUB_ROLE_[A-Z0-9_]+_HOLD$/.test(msg)?
   msg:"P4_G5_G5A_GITHUB_ROLE_UNKNOWN_ERROR_NO_SECRET_PRINTED_HOLD");
  process.exitCode=2;
 });
