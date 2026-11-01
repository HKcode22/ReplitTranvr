/**
 * Gate5 one-use privileged V0076 metadata-only installer, deliberately NOT
 * wired to app boot or GitHub paid actions. Requires separately reviewed
 * operator invocation after Replit readonly permission diagnosis.
 *
 * NO GRANTS, provider calls, subscription changes, or flight-data writes.
 */
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import pg from "pg";

export const V0076_INSTALL_FILE_V39 =
 "migrations/staged/V0076__phase4_gate5_logged_physical_fids_attempt_owner_v39.sql";
export const V0076_REVIEWED_BLOB_SHA_V39 =
 "c74b3d9d2cc635e8fa604f81f6c91595ea558f2f";
export const V0076_INSTALL_INTENT_V39 =
 "AUTHORIZE_METADATA_ONLY_V0076_NO_PROVIDER_NO_ROLE_GRANTS";
const FIELDS=["cohort_exists","owner_exists","query_exists",
 "attempt_exists","reserve_exists"] as const;
const CATALOG_SQL=[
 "SELECT",
 "current_database() AS database_name,current_user AS role_name,",
 "current_setting('server_version_num')::int AS server_version,",
 "current_setting('transaction_read_only')='on' AS readonly,",
 "to_regnamespace('clean') IS NOT NULL AS clean_exists,",
 "has_schema_privilege(current_user,'clean','USAGE') AS can_use,",
 "has_schema_privilege(current_user,'clean','CREATE') AS can_create,",
 "to_regclass('clean.fids_query_response') IS NOT NULL AS original_exists,",
 "to_regclass('clean.flight_population') IS NOT NULL AS population_exists,",
 "to_regclass('clean.provider_content_blob_ref') IS NOT NULL AS blobref_exists,",
 "to_regclass('clean.phase3_gate05_science_owner_v39') IS NOT NULL AS gate05_exists,",
 "to_regclass('clean.phase4_g5_fids_cohort_budget_v39') IS NOT NULL AS cohort_exists,",
 "to_regclass('clean.phase4_g5_fids_physical_owner_v39') IS NOT NULL AS owner_exists,",
 "to_regclass('clean.phase4_g5_fids_allowed_query_v39') IS NOT NULL AS query_exists,",
 "to_regclass('clean.phase4_g5_fids_physical_attempt_v39') IS NOT NULL AS attempt_exists,",
 "to_regprocedure(",
 "'clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)')",
 "IS NOT NULL AS reserve_exists"
].join(" ");
export interface V0076CatalogV39 {
 database_name:string;role_name:string;server_version:number;readonly:boolean;
 clean_exists:boolean;can_use:boolean;can_create:boolean;
 original_exists:boolean;population_exists:boolean;
 blobref_exists:boolean;gate05_exists:boolean;
 cohort_exists:boolean;owner_exists:boolean;query_exists:boolean;
 attempt_exists:boolean;reserve_exists:boolean;
}
export function assertV0076ExactSourceV39(bytes:string,blobSha:string){
 if(blobSha!==V0076_REVIEWED_BLOB_SHA_V39||
    !bytes.startsWith("-- V0076 STAGED ONLY, NOT AUTO-APPLIED")||
    bytes.length<8500||bytes.length>14000||
    !bytes.includes("CREATE FUNCTION clean.reserve_phase4_g5_fids_physical_attempt_v39(")||
    !bytes.includes("REVOKE EXECUTE ON FUNCTION clean.reserve_phase4_g5_fids_physical_attempt_v39(")||
    /\bGRANT\s+(?:ALL|EXECUTE|INSERT|UPDATE|DELETE)\b/i.test(bytes)||
    /\bDROP\s+(?:TABLE|SCHEMA|FUNCTION)\b/i.test(bytes)||
    /\bTRUNCATE\b/i.test(bytes)||
    bytes.includes("ALTER TABLE clean.flight_population"))
  throw Error("P4_G5_V0076_SOURCE_NOT_REVIEWED_HOLD");
}
export function assertV0076InstallerIntentV39(env:NodeJS.ProcessEnv){
 if(env.V39_GATE5_V0076_INSTALL_INTENT!==V0076_INSTALL_INTENT_V39||
    env.V39_GATE5_V0076_EXPECTED_BLOB!==V0076_REVIEWED_BLOB_SHA_V39)
  throw Error("P4_G5_V0076_INSTALL_INTENT_OR_SOURCE_HOLD");
}
export function assessV0076InstallerCatalogV39(
 priv:V0076CatalogV39,worker:V0076CatalogV39
){
 for(const f of [priv,worker]){
  if(!f||!f.readonly||!f.clean_exists||!f.can_use||
     !f.original_exists||!f.population_exists||
     !f.blobref_exists||!f.gate05_exists||f.server_version<160000||
     !f.database_name||!f.role_name||
     FIELDS.some(k=>typeof f[k]!=="boolean"))
   throw Error("P4_G5_V0076_EXISTING_SCIENCE_SCHEMA_OR_PG16_HOLD");
  if(FIELDS.some(k=>f[k]))
   throw Error("P4_G5_V0076_OBJECTS_ALREADY_OR_PARTIALLY_INSTALLED_HOLD");
 }
 if(priv.database_name!==worker.database_name||
    priv.role_name===worker.role_name||
    !priv.can_create||worker.can_create)
  throw Error("P4_G5_V0076_DISTINCT_PRIVILEGED_RUNTIME_ROLE_HOLD");
 return {status:"EXACT_METADATA_SOURCE_READY_FOR_SEPARATE_INSTALL" as const,
  providerCalls:0 as const,productionPaidOwnerArmed:false as const};
}
async function inspect(c:pg.Client):Promise<V0076CatalogV39>{
 await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 try{
  const r=await c.query(CATALOG_SQL);
  if(r.rows.length!==1)throw Error("P4_G5_V0076_CATALOG_INVALID");
  await c.query("ROLLBACK");
  return r.rows[0] as V0076CatalogV39;
 }catch(e){
  await c.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }
}
export async function installV0076ReviewedMetadataV39(){
 assertV0076InstallerIntentV39(process.env);
 const blob=execFileSync("git",["rev-parse","HEAD:"+V0076_INSTALL_FILE_V39],{
  encoding:"utf8"
 }).trim();
 const sql=readFileSync(V0076_INSTALL_FILE_V39,"utf8");
 assertV0076ExactSourceV39(sql,blob);
 const adminUrl=process.env.DATABASE_URL;
 const runtimeUrl=process.env.V39_DATABASE_RUNTIME_URL;
 if(!adminUrl||!runtimeUrl||adminUrl===runtimeUrl)
  throw Error("P4_G5_V0076_DISTINCT_CONNECTIONS_REQUIRED");
 const opts={connectionTimeoutMillis:8000,query_timeout:15000,
  application_name:"phase4_gate5_v0076_metadata_only"};
 const admin=new pg.Client({...opts,connectionString:adminUrl});
 const worker=new pg.Client({...opts,connectionString:runtimeUrl});
 let a=false,w=false,tx=false;
 try{
  await worker.connect();w=true;
  await admin.connect();a=true;
  const workerFacts=await inspect(worker);
  const adminFacts=await inspect(admin);
  assessV0076InstallerCatalogV39(adminFacts,workerFacts);
  // This one-use DDL transaction is entirely rolled back on ANY failure.
  await admin.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  await admin.query("SET LOCAL statement_timeout='12000ms'");
  await admin.query("SET LOCAL lock_timeout='2000ms'");
  await admin.query("SELECT pg_advisory_xact_lock(76,39)");
  const before=await admin.query([
   "SELECT",
   "to_regclass('clean.phase4_g5_fids_cohort_budget_v39') IS NOT NULL AS c,",
   "to_regclass('clean.phase4_g5_fids_physical_owner_v39') IS NOT NULL AS o,",
   "to_regclass('clean.phase4_g5_fids_allowed_query_v39') IS NOT NULL AS q,",
   "to_regclass('clean.phase4_g5_fids_physical_attempt_v39') IS NOT NULL AS a,",
   "to_regprocedure(",
   "'clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)')",
   "IS NOT NULL AS f"
  ].join(" "));
  if(before.rows.length!==1||Object.values(before.rows[0]).some(Boolean))
   throw Error("P4_G5_V0076_CONCURRENT_DDL_OR_COLLISION_HOLD");
  await admin.query(sql);
  const counts=await admin.query([
   "SELECT",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_cohort_budget_v39) AS c,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_owner_v39) AS o,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_allowed_query_v39) AS q,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_attempt_v39) AS a,",
   "has_function_privilege('PUBLIC',",
   "'clean.reserve_phase4_g5_fids_physical_attempt_v39(text,text,text,text,integer,text)',",
   "'EXECUTE') AS public_execute"
  ].join(" "));
  if(counts.rows.length!==1||
     counts.rows[0].public_execute!==false||
     ["c","o","q","a"].some(k=>Number(counts.rows[0][k])!==0))
   throw Error("P4_G5_V0076_EMPTY_AND_PRIVATE_INSTALL_HOLD");
  await admin.query("COMMIT");tx=false;
  console.log(JSON.stringify({
   status:"V0076_METADATA_ONLY_INSTALLED_PRIVATE_UNGRANTED_NO_OWNER",
   reviewedGitBlob:blob,metadataTables:4,reservationFunctions:1,
   activeOwners:0,physicalAttempts:0,
   runtimeRoleGrantAdded:false,providerCalls:0,flightDataWrites:0,
   strictGate5Passed:false,phase5FreezeAuthorized:false,phase6Authorized:false
  }));
 }catch(e){
  if(tx)await admin.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }finally{
  if(a)await admin.end().catch(()=>undefined);
  if(w)await worker.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0076_metadata_only_installer.ts"))
 void installV0076ReviewedMetadataV39().catch(e=>{
  const code=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  console.error(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?
   "P4_G5_V0076_METADATA_INSTALL_HOLD_SQLSTATE_"+code:
   "P4_G5_V0076_METADATA_INSTALL_HOLD_NO_PROVIDER");
  process.exitCode=2;
 });
