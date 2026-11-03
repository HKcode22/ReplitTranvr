/**
 * Real PG16 isolated one-time V0078 installer execution/failure audit.
 * Only local CI fixture connections. Never connects to production or provider.
 */
import pg from "pg";
import {
 P4_G5_V0078_ONE_TIME_INTENT_V39,
 P4_G5_V0078_REVIEWED_GIT_BLOB_V39,
 assertP4G5V0078InstallIntentV39,
 installP4G5V0078OnceV39
} from "./v39_phase4_gate5_v0078_one_time_exact_sql_installer";
import {inspectP4G5V0078TwoRoleV39} from
 "./v39_phase4_gate5_v0078_production_readonly_preflight";

const OWNER="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const RUNTIME="postgresql://v0078_runtime_fixture:v0078_disposable_only@localhost:5432/v39_ci?sslmode=disable";
function context(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    !["pull_request","push"].includes(e.GITHUB_EVENT_NAME??"")||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    !(
      (e.GITHUB_JOB==="v0078-installer-disposable-pg16"&&
       e.GITHUB_WORKFLOW==="Phase4 Gate5 V0078 One-Time Installer Disposable PG16")||
      (e.GITHUB_JOB==="readonly-v0078-preflight-disposable-pg16"&&
       e.GITHUB_WORKFLOW==="Phase4 Gate5 V0078 Production Readonly Preflight Disposable PG16")
    )||
    e.DATABASE_URL!==OWNER||e.V39_DATABASE_RUNTIME_URL!==RUNTIME||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    !!e.GATE05_AUTOMATION_DATABASE_URL)
  throw Error("V0078_INSTALLER_DISPOSABLE_CI_SCOPE_HOLD");
 const reviewed={
  V39_GATE5_V0078_INSTALL_INTENT:P4_G5_V0078_ONE_TIME_INTENT_V39,
  V39_GATE5_V0078_EXPECTED_BLOB:P4_G5_V0078_REVIEWED_GIT_BLOB_V39,
  ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0"
 };
 for(const [key,value] of Object.entries(reviewed))process.env[key]=value;
 assertP4G5V0078InstallIntentV39(process.env);
}
async function holds(f:()=>Promise<unknown>,hint:string){
 let refused=false;
 try{await f()}catch(e){
  if(e instanceof Error&&e.message.includes(hint))refused=true;
  else throw Error("V0078_INSTALLER_DISPOSABLE_WRONG_REFUSAL");
 }
 if(!refused)throw Error("V0078_INSTALLER_DISPOSABLE_REFUSAL_FAIL_OPEN");
}
export async function main(){
 context();
 const original=await inspectP4G5V0078TwoRoleV39();
 if(original.status!=="V0078_PREINSTALL_CATALOG_CANDIDATE_ONLY_NEEDS_OWNER_REVIEW")
  throw Error("V0078_INSTALLER_DISPOSABLE_EXPECTED_CANDIDATE_HOLD");
 // Hold another session's advisory lock. The installer must refuse and
 // leave the original global UNIQUE unchanged, without any data mutation.
 const blocker=new pg.Client({
  connectionString:OWNER,connectionTimeoutMillis:8000,query_timeout:15000,
  application_name:"v0078_disposable_lock_refusal_proof"
 });
 await blocker.connect();
 try{
  const held=await blocker.query(
   "SELECT pg_advisory_lock(78,39)");
  if(held.rowCount!==1)throw Error("V0078_DISPOSABLE_FAILED_TO_SEED_ADVISORY_LOCK");
  await holds(installP4G5V0078OnceV39,
   "P4_G5_V0078_MIGRATION_OWNER_ADVISORY_LOCK_BUSY_HOLD");
  const unchanged=await inspectP4G5V0078TwoRoleV39();
  if(unchanged.status!=="V0078_PREINSTALL_CATALOG_CANDIDATE_ONLY_NEEDS_OWNER_REVIEW")
   throw Error("V0078_DISPOSABLE_LOCK_REFUSAL_CHANGED_SCHEMA_HOLD");
 }finally{
  await blocker.query("SELECT pg_advisory_unlock(78,39)").catch(()=>undefined);
  await blocker.end().catch(()=>undefined);
 }
 const receipt=await installP4G5V0078OnceV39();
 if(receipt.status!=="V0078_PRODUCTION_LEGACY_KEY_REPLACEMENT_INSTALLED_ONCE"||
    receipt.privateV0077Unchanged!==true||
    receipt.providerCalls!==0||
    receipt.sourceRightsCertified!==false||
    receipt.scientificGate5Passed!==false)
  throw Error("V0078_DISPOSABLE_INSTALLED_RECEIPT_NOT_SAFE_HOLD");
 // Second invocation: read-only catalog detects V0078 installed and fails
 // BEFORE opening a write transaction. This must not alter installed DDL.
 await holds(installP4G5V0078OnceV39,
  "P4_G5_V0078_TWO_ROLE_PRODUCTION_READONLY_PREFLIGHT_HOLD");
 const post=await inspectP4G5V0078TwoRoleV39();
 if(post.status!=="V0078_ALREADY_PRESENT_DO_NOT_REINSTALL_HOLD"||
    !post.flags.v0077PrivateToRuntime||!post.flags.alreadyV0078Present)
  throw Error("V0078_DISPOSABLE_DOUBLE_INSTALL_NOT_REJECTED_HOLD");
 console.log(JSON.stringify({
  status:"P4_G5_V0078_ONE_TIME_INSTALLER_REAL_DISPOSABLE_PG16_PASS",
  advisoryLockFailureRolledBack:true,
  precommitLockedCatalogReverified:true,
  finalSchemaSingleCommit:true,
  crossRolePostcommitReadOnlyVerified:true,
  repeatedInstallationRefused:true,
  privateV0077Maintained:true,
  legacyNonFidsConstraintPolicyRetained:true,
  exactReviewedBlob:P4_G5_V0078_REVIEWED_GIT_BLOB_V39,
  productionWrites:0,providerCalls:0,
  realAccountRetentionRightsCertified:false,
  realProspectiveThreeHorizonPRECertified:false,
  scientificGate5Passed:false,phase5FreezeAuthorized:false,
  phase6Authorized:false
 }));
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0078_installer_disposable_pg16_actions.ts"))
 void main().catch((e:unknown)=>{
  // Only internal phase label; never leak role names, SQL or credentials.
  console.error("P4_G5_V0078_INSTALLER_DISPOSABLE_PG16_TEST_HOLD",
    e instanceof Error&&e.message.startsWith("V0078_")?e.message:
     "NO_DETAILS");
  process.exitCode=2;
 });
