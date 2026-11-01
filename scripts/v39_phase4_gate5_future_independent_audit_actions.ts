/**
 * Future NEW Gate5 cohort independent 3-query audit GitHub operator.
 * After a separate reviewed manifest-promotion PR only. No provider key,
 * subscription, paid GET, INSERT, PRE writer or old Oct31 backfill.
 */
import {readFileSync,appendFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import pg from "pg";
import {auditP4FreshCohortV39}
 from "../server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39";
import {
 NEXT_AUDIT_MANIFEST_PATH_V39,NEXT_AUDIT_APPROVED_SHA256_V39,
 assertP4NextAuditGitHubV39,validateP4NextCohortAuditManifestV39
} from "../server/lib/disruption/phase4Gate5NextIndependentAuditAdmission_v39";

export async function mainP4NextIndependentAuditV39(){
 const job=process.env.GITHUB_JOB;
 if(job!=="validate-next-cohort-manifest"&&
    job!=="independent-next-cohort-readonly")
  throw Error("P4_NEXT_AUDIT_UNEXPECTED_JOB_HOLD");
 const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 assertP4NextAuditGitHubV39(process.env,head,job);
 const bytes=readFileSync(NEXT_AUDIT_MANIFEST_PATH_V39,"utf8");
 const now=new Date().toISOString();
 const resolved=validateP4NextCohortAuditManifestV39(
  bytes,NEXT_AUDIT_APPROVED_SHA256_V39,now);
 if(job==="validate-next-cohort-manifest"){
  if(!process.env.GITHUB_OUTPUT)
   throw Error("P4_NEXT_AUDIT_MISSING_GITHUB_OUTPUT");
  appendFileSync(process.env.GITHUB_OUTPUT,
   "ready="+(resolved.status==="APPROVED_READONLY_COHORT_AUDIT"?"true":"false")+"\n");
  console.log(JSON.stringify({
   schema:"v39.phase4.future-independent-audit-github-admission.v1",
   status:resolved.status,manifestSha256:resolved.manifestSha256,
   sourceSemanticsStillRequireIndependentValidation:true,
   paidProviderCalls:0,databaseWrites:0,
   strictGate5Passed:false,phase5FreezeAuthorized:false,phase6Authorized:false
  }));
  return;
 }
 if(resolved.status!=="APPROVED_READONLY_COHORT_AUDIT"||!resolved.scope)
  throw Error("P4_NEXT_AUDIT_NEW_COHORT_NOT_APPROVED");
 const url=process.env.GATE05_AUTOMATION_DATABASE_URL;
 if(!url)throw Error("P4_NEXT_AUDIT_READER_CREDENTIAL_UNAVAILABLE");
 const db=new pg.Client({
  connectionString:url,application_name:"phase4_gate5_next_cohort_independent_reader",
  connectionTimeoutMillis:9000,query_timeout:15000,
  options:"-c default_transaction_read_only=on"
 });
 let tx=false;
 try{
  await db.connect();
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await db.query("SET LOCAL statement_timeout = '12000ms'");
  await db.query("SET LOCAL lock_timeout = '2000ms'");
  const result=await auditP4FreshCohortV39(db,resolved.scope);
  console.log(JSON.stringify({
   auditType:"NEXT_COHORT_REAL_DB_THREE_QUERY_READ_ONLY_NOT_SCIENCE_PASS",
   ...result,providerCalls:0,databaseWrites:0,
   scientificallyCertifiedPerHorizonSnapshots:false,
   strictGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  }));
  console.log("P4_NEXT_COHORT_INDEPENDENT_DB_AUDIT_DONE_NOT_CERTIFIED");
 }finally{
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  await db.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_future_independent_audit_actions.ts"))
 void mainP4NextIndependentAuditV39().catch(e=>{
  const code=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  console.error(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?
   "P4_NEXT_AUDIT_HOLD_SQLSTATE_"+code:
   "P4_NEXT_AUDIT_HOLD_NO_PROVIDER");
  process.exitCode=2;
 });
