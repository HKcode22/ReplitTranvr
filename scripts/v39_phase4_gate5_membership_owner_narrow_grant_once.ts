/**
 * G5A emergency restricted-source-writer membership trigger permission fix.
 * ONLY two PostgreSQL GRANT privileges, one review-gated transaction, zero
 * provider requests, and NO V0076/77/78 reinstall, ledger modification,
 * raw response/backfill, database schema change, or blanket role grants.
 *
 * Requires exact reviewed MAIN checkout + explicit Replit operator intent,
 * separate admin/runtime URLs, exact existing live trigger/role catalog,
 * and post-commit independent read-only verification.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";
const ROLE="p4_g5_g5a_owner_20261103";
const TABLE="clean.population_research_membership";
const INTENT="ONE_REVIEWED_G5A_MEMBERSHIP_INSERT_AND_KEY_SELECT";
const COMMIT=/^[a-f0-9]{40}$/;
function hold(k:string):never{throw Error("G5A_MEMBER_GRANT_"+k+"_HOLD")}
export type AclFacts={
 roleExists:boolean;roleRestricted:boolean;roleNotExpired:boolean;
 memberTableExists:boolean;memberTriggerEnabled:boolean;
 triggerRunsAsInvoker:boolean;memberKeyExists:boolean;
 sourceCanInsertPopulation:boolean;
 sourceCanInsertMembership:boolean;
 sourceCanSelectMembershipTable:boolean;
 sourceCanSelectMembershipKey:boolean;
 sourceCanUpdateMembership:boolean;sourceCanDeleteMembership:boolean;
};
export function assertG5AMembershipGrantBeforeV39(a:AclFacts){
 if(!a.roleExists||!a.roleRestricted||!a.roleNotExpired||
    !a.memberTableExists||!a.memberTriggerEnabled||
    !a.triggerRunsAsInvoker||!a.memberKeyExists||
    !a.sourceCanInsertPopulation)
  hold("BASELINE_TRIGGER_OR_ROLE_DRIFT");
 if(a.sourceCanInsertMembership||a.sourceCanSelectMembershipTable||
    a.sourceCanSelectMembershipKey||
    a.sourceCanUpdateMembership||a.sourceCanDeleteMembership)
  hold("PREEXISTING_MEMBERSHIP_GRANT_REVIEW_REQUIRED");
 return true;
}
export function assertG5AMembershipGrantAfterV39(a:AclFacts){
 if(!a.roleExists||!a.roleRestricted||!a.roleNotExpired||
    !a.memberTriggerEnabled||!a.triggerRunsAsInvoker||
    !a.sourceCanInsertPopulation||
    !a.sourceCanInsertMembership||!a.sourceCanSelectMembershipKey||
    a.sourceCanSelectMembershipTable||
    a.sourceCanUpdateMembership||a.sourceCanDeleteMembership)
  hold("POSTCOMMIT_GRANT_SCOPE_DRIFT");
 return true;
}
function client(uri:string,app:string){
 if(!/^postgres(?:ql)?:\/\//.test(uri??"")||uri.length>3000)hold("DATABASE_URL");
 return new pg.Client({
  connectionString:uri,connectionTimeoutMillis:9000,query_timeout:13000,
  application_name:app
 });
}
const factsSql=`
 SELECT
  (SELECT count(*)::int FROM pg_roles WHERE rolname=$1)=1 AS role_exists,
  (SELECT NOT(rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication
    OR rolbypassrls) FROM pg_roles WHERE rolname=$1) AS role_restricted,
  (SELECT rolvaliduntil>clock_timestamp()+interval '2 days'
    FROM pg_roles WHERE rolname=$1) AS role_not_expired,
  to_regclass($2) IS NOT NULL AS member_table_exists,
  (SELECT count(*)::int FROM pg_trigger WHERE
     tgrelid='clean.flight_population'::regclass
     AND tgname='trg_flight_population_research_membership'
     AND tgenabled IN ('O','A'))=1 AS member_trigger_enabled,
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='clean'
    AND p.proname='ensure_population_research_membership'
    AND NOT p.prosecdef)=1 AS trigger_invoker,
  (SELECT count(*)::int FROM information_schema.columns WHERE
     table_schema='clean' AND table_name='population_research_membership'
     AND column_name='population_member_id')=1 AS member_key_exists,
  has_table_privilege($1,'clean.flight_population','INSERT') AS population_insert,
  has_table_privilege($1,$2,'INSERT') AS member_insert,
  has_table_privilege($1,$2,'SELECT') AS member_select,
  has_column_privilege($1,$2,'population_member_id','SELECT') AS member_key_select,
  has_table_privilege($1,$2,'UPDATE') AS member_update,
  has_table_privilege($1,$2,'DELETE') AS member_delete
`;
async function inspect(db:pg.Client):Promise<AclFacts>{
 const result=await db.query(factsSql,[ROLE,TABLE]);
 if(result.rows.length!==1)hold("CATALOG_CARDINALITY");
 const r=result.rows[0];
 const vals=[
  r.role_exists,r.role_restricted,r.role_not_expired,r.member_table_exists,
  r.member_trigger_enabled,r.trigger_invoker,r.member_key_exists,
  r.population_insert,r.member_insert,r.member_select,
  r.member_key_select,r.member_update,r.member_delete
 ];
 if(vals.some(x=>typeof x!=="boolean"))hold("CATALOG_BOOLEAN");
 return {
  roleExists:r.role_exists,roleRestricted:r.role_restricted,
  roleNotExpired:r.role_not_expired,memberTableExists:r.member_table_exists,
  memberTriggerEnabled:r.member_trigger_enabled,triggerRunsAsInvoker:r.trigger_invoker,
  memberKeyExists:r.member_key_exists,sourceCanInsertPopulation:r.population_insert,
  sourceCanInsertMembership:r.member_insert,
  sourceCanSelectMembershipTable:r.member_select,
  sourceCanSelectMembershipKey:r.member_key_select,
  sourceCanUpdateMembership:r.member_update,
  sourceCanDeleteMembership:r.member_delete
 };
}
async function readonly(db:pg.Client){
 await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{
  const r=await inspect(db);
  await db.query("ROLLBACK");
  return r;
 }catch(e){await db.query("ROLLBACK").catch(()=>undefined);throw e}
}
export async function main(){
 const env=process.env;
 const sha=execFileSync("git",["rev-parse","HEAD"],{
  encoding:"utf8",timeout:4000}).trim();
 if(!COMMIT.test(sha)||env.P4_G5_MEMBERSHIP_OWNER_GRANT_INTENT!==INTENT||
    env.P4_G5_REVIEWED_MAIN_SHA!==sha||
    env.GITHUB_ACTIONS==="true"||env.ADB_AUTO_COLLECT!=="0"||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    !env.DATABASE_URL||!env.V39_DATABASE_RUNTIME_URL||
    env.DATABASE_URL===env.V39_DATABASE_RUNTIME_URL)
  hold("EXPLICIT_PINNED_REPLIT_OPERATOR_CONTEXT");
 const admin=client(env.DATABASE_URL,"g5a_one_scoped_membership_grant");
 const runtime=client(env.V39_DATABASE_RUNTIME_URL,"g5a_scoped_grant_runtime_readonly");
 await admin.connect();await runtime.connect();
 let tx=false,commitAttempted=false;
 try{
  const a=await admin.query("SELECT current_database() AS db,current_user AS role");
  const u=await runtime.query("SELECT current_database() AS db,current_user AS role,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS can_ddl");
  if(a.rows.length!==1||u.rows.length!==1||
     a.rows[0].db!==u.rows[0].db||a.rows[0].role===u.rows[0].role||
     u.rows[0].can_ddl!==false)hold("ADMIN_RUNTIME_SEPARATION");
  const before=await readonly(admin);
  assertG5AMembershipGrantBeforeV39(before);
  await admin.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await admin.query("SET LOCAL statement_timeout='9000ms'");
  await admin.query("SET LOCAL lock_timeout='2000ms'");
  const lock=await admin.query("SELECT pg_try_advisory_xact_lock(79,39) AS got");
  if(lock.rows[0]?.got!==true)hold("CONCURRENT_GRANT");
  assertG5AMembershipGrantBeforeV39(await inspect(admin));
  await admin.query(
    'GRANT INSERT ON TABLE clean.population_research_membership TO "'+ROLE+'"');
  await admin.query(
    'GRANT SELECT (population_member_id) ON TABLE clean.population_research_membership TO "'+ROLE+'"');
  assertG5AMembershipGrantAfterV39(await inspect(admin));
  commitAttempted=true;
  await admin.query("COMMIT");tx=false;
  const after=await readonly(admin);
  assertG5AMembershipGrantAfterV39(after);
  console.log(JSON.stringify({
   status:"G5A_REVIEWED_ONE_TIME_MEMBERSHIP_TRIGGER_MINIMUM_GRANTS_INSTALLED",
   rolePreexistingAndRestricted:true,triggerPreservedAsInvoker:true,
   memberInsertOnly:true,memberKeyColumnSelectOnly:true,
   memberFullTableSelect:false,memberUpdate:false,memberDelete:false,
   providerCalls:0,sourceContentWrites:0,ledgerWrites:0,
   phase6Authorized:false,scientificGate5Passed:false
  }));
 }catch(e){
  if(tx)await admin.query("ROLLBACK").catch(()=>undefined);
  if(commitAttempted)
   hold("COMMIT_AMBIGUOUS_READONLY_INSPECT_BEFORE_ANY_RETRY");
  throw e;
 }finally{
  await runtime.end().catch(()=>undefined);
  await admin.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_membership_owner_narrow_grant_once.ts"))
 void main().catch((e:unknown)=>{
  const msg=e instanceof Error?e.message:"";
  const code=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  const safe=/^G5A_MEMBER_GRANT_[A-Z0-9_]+_HOLD$/.test(msg)?msg:
   typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?
    "G5A_MEMBER_GRANT_SQLSTATE_"+code+"_HOLD":
    "G5A_MEMBER_GRANT_UNKNOWN_REDACTED_HOLD";
  console.error(safe);process.exitCode=2;
 });
