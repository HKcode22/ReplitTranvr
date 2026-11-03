/**
 * Optional one-time *metadata permission only* for the 3 G5A POST FIDS GETs.
 * No provider HTTP, role creation, flight Content, new schema, or secret read.
 * The source role already exists from merged #371, approved by the owner.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";
const ROLE="p4_g5_g5a_owner_20261103";
const TABLE="clean.adb_rest_attempt_ledger";
const INTENT="EXACT_G5A_POST_IMMUTABLE_LEDGER_INSERT_SELECT_NO_OTHER_PRIVILEGES";
const SHA=/^[a-f0-9]{40}$/;
function hold(msg:string):never{throw Error("P4_G5_G5A_POST_GRANT_"+msg+"_HOLD")}
export async function main(){
 const e=process.env;
 if(e.P4_G5_G5A_POST_GRANT_INTENT!==INTENT||
    !e.DATABASE_URL||!e.V39_DATABASE_RUNTIME_URL||
    e.DATABASE_URL===e.V39_DATABASE_RUNTIME_URL||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||
    e.GITHUB_ACTIONS==="true")
   hold("OPERATOR_INTENT_OR_DB_URL");
 const commit=execFileSync("git",["rev-parse","HEAD"],
  {encoding:"utf8",timeout:4000}).trim();
 if(!SHA.test(commit))hold("SOURCE_PIN");
 const admin=new pg.Client({connectionString:e.DATABASE_URL,
  connectionTimeoutMillis:8500,query_timeout:12000,
  application_name:"g5a_post_ledger_exact_grant_once"});
 const runtime=new pg.Client({connectionString:e.V39_DATABASE_RUNTIME_URL,
  connectionTimeoutMillis:8500,query_timeout:12000,
  application_name:"g5a_post_ledger_runtime_restricted_ro"});
 await admin.connect();await runtime.connect();
 try{
  const [a,w]=await Promise.all([
   admin.query(`SELECT current_database() AS db,current_user AS role,
     current_setting('server_version_num')::int>=160000 AS pg16,
     (SELECT rolsuper OR rolcreaterole FROM pg_roles WHERE rolname=current_user) AS can_grant`),
   runtime.query(`SELECT current_database() AS db,current_user AS role,
     has_table_privilege(current_user,$1,'DELETE') AS can_delete_source`,[TABLE])
  ]);
  const ar=a.rows[0],wr=w.rows[0];
  if(a.rows.length!==1||w.rows.length!==1||
     ar.pg16!==true||ar.can_grant!==true||
     ar.db!==wr.db||ar.role===wr.role)
   hold("ROLE_SEPARATION_OR_PG16");
  const target=await admin.query(`SELECT COUNT(*)::int n FROM pg_roles
   WHERE rolname=$1 AND NOT rolsuper AND NOT rolcreatedb
     AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls`,[ROLE]);
  if(Number(target.rows[0]?.n)!==1)hold("SOURCE_OWNER_MISSING_OR_PRIVILEGED");
  const rel=await admin.query("SELECT to_regclass($1::text) AS found",[TABLE]);
  if(rel.rows.length!==1||!rel.rows[0].found)hold("BASELINE_LEDGER_NOT_PRESENT");
  const old=await admin.query(`SELECT
   has_table_privilege($1,$2,'SELECT') can_select,
   has_table_privilege($1,$2,'INSERT') can_insert,
   has_table_privilege($1,$2,'UPDATE') can_update,
   has_table_privilege($1,$2,'DELETE') can_delete,
   has_table_privilege($1,$2,'TRUNCATE') can_truncate,
   has_table_privilege($1,$2,'REFERENCES') can_ref,
   has_table_privilege($1,$2,'TRIGGER') can_trigger`,[ROLE,TABLE]);
  if(old.rows.length!==1)hold("ORIGINAL_TABLE_ACL_UNVERIFIABLE");
  const prior=old.rows[0];
  if(prior.can_update||prior.can_delete||prior.can_truncate||prior.can_ref||prior.can_trigger)
   hold("UNEXPECTED_EXISTING_DANGEROUS_GRANTS");
  let changed=false;
  if(!(prior.can_select&&prior.can_insert)){
   await admin.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
   let tx=true;
   try{
    await admin.query("SET LOCAL statement_timeout='10000ms'");
    await admin.query("SET LOCAL lock_timeout='1500ms'");
    const lock=await admin.query("SELECT pg_try_advisory_xact_lock(76,97) AS ok");
    if(lock.rows[0]?.ok!==true)hold("CONCURRENT_GRANT");
    await admin.query("GRANT SELECT,INSERT ON TABLE "+TABLE+" TO "+ROLE);
    await admin.query("COMMIT");tx=false;changed=true;
   }finally{if(tx)await admin.query("ROLLBACK").catch(()=>undefined)}
  }
  const post=await admin.query(`SELECT
   has_table_privilege($1,$2,'SELECT') s,
   has_table_privilege($1,$2,'INSERT') i,
   has_table_privilege($1,$2,'UPDATE') u,
   has_table_privilege($1,$2,'DELETE') d,
   has_table_privilege($1,$2,'TRUNCATE') t,
   has_table_privilege($1,$2,'REFERENCES') r,
   has_table_privilege($1,$2,'TRIGGER') g`,[ROLE,TABLE]);
  const x=post.rows[0];
  if(post.rows.length!==1||!x.s||!x.i||x.u||x.d||x.t||x.r||x.g)
   hold("POSTCOMMIT_TABLE_ACL");
  const pub=await admin.query(`SELECT EXISTS(
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL aclexplode(
      COALESCE(c.relacl,acldefault('r',c.relowner))) p
    WHERE n.nspname='clean' AND c.relname='adb_rest_attempt_ledger'
      AND p.grantee=0 AND p.privilege_type='INSERT'
  ) AS public_insert`);
  if(pub.rows[0]?.public_insert===true)hold("PUBLIC_INSERT_ALREADY_ALLOWED");
  console.log(JSON.stringify({
   status:changed?
    "G5A_POST_BASELINE_LEDGER_EXACT_SELECT_INSERT_GRANTED_ONCE":
    "G5A_POST_BASELINE_LEDGER_GRANT_ALREADY_PRESENT_NO_REINSTALL",
   sourceRoleNonAdmin:true,sourceRoleNoDelete:true,
   sourceRoleNoSchemaDdlGranted:true,
   publicInsertNotEnabled:true,providerCalls:0,
   databaseContentWrites:0,phase5FreezeAuthorized:false
  }));
 }finally{
  await runtime.end().catch(()=>undefined);
  await admin.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_g5a_post_ledger_exact_grant_once.ts"))
 void main().catch(e=>{
  const msg=e instanceof Error?e.message:"";
  console.error(/^P4_G5_G5A_POST_GRANT_[A-Z0-9_]+_HOLD$/.test(msg)?
   msg:"P4_G5_G5A_POST_GRANT_UNKNOWN_NO_SECRETS_HOLD");
  process.exitCode=2;
 });
