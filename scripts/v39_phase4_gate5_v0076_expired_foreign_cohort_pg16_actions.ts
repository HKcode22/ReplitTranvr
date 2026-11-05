/**
 * Actual isolated PostgreSQL16 regression for expired historical V0076
 * cohort vs still-unexpired competing owner. Synthetic data ONLY.
 * No protected DB, real GitHub owner, provider FIDS or paid requests.
 */
import pg from "pg";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {prepareP4G5PhysicalOwnerV39} from
 "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {stageP4G5PreparedOwnerDbOnlyV39} from
 "../server/lib/disruption/phase4Gate5DurablePreparedOwner_v39";

const URL="postgresql://postgres:postgres@localhost:5432/gate5_disposable?sslmode=disable";
const RESTRICTED="postgresql://g5a_test_writer:fake-local-only@localhost:5432/gate5_disposable?sslmode=disable";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const iso=(n:number)=>new Date(n).toISOString();
function hold(name:string):never{throw Error("G5A_EXPIRED_FOREIGN_PG16_"+name+"_HOLD")}
function client(uri:string){return new pg.Client({connectionString:uri,
 connectionTimeoutMillis:8000,query_timeout:14000,
 application_name:"g5a_pure_disposable_expired_foreign_v0076"});}
function requireCI(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    e.GITHUB_EVENT_NAME!=="pull_request"||
    e.GITHUB_JOB!=="expired-foreign-pg16"||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 V0076 Expired Foreign Owner Disposable PG16"||
    e.DATABASE_URL!==URL||
    !!e.V39_DATABASE_RUNTIME_URL||!!e.P4_G5_SOURCE_OWNER_DATABASE_URL||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    !!e.GATE05_AUTOMATION_DATABASE_URL)
  hold("DISPOSABLE_ONLY");
}
export async function main(){
 requireCI();
 const admin=client(URL),writer=client(RESTRICTED);
 let writerConnected=false,stage="BOOT";
 await admin.connect();
 try{
  stage="SEED_HISTORICAL_EXPIRED_OWNER_AND_IRREVERSIBLE_RESERVATION";
  const now=Date.now();
  const foreign="b".repeat(64),foreignOwner="c".repeat(64);
  const foreignQuery="d".repeat(64),foreignReceipt="e".repeat(64);
  await admin.query(
   "INSERT INTO clean.phase4_g5_fids_cohort_budget_v39("+
   "manifest_sha256,cohort_id,project_unit_ceiling,reserved_units) "+
   "VALUES($1,'SYNTHETIC_EXPIRED_OLD_20261105',24,2)",[foreign]);
  await admin.query(
   "INSERT INTO clean.phase4_g5_fids_physical_owner_v39("+
   "owner_digest,manifest_sha256,horizon,github_run_id,"+
   "reviewed_authorization_sha256,actual_github_runner_started_at_utc,"+
   "verified_prearm_deadline_utc,first_planned_dispatch_utc,"+
   "last_planned_dispatch_utc,hard_owner_expires_at_utc,state) "+
   "VALUES($1,$2,'T-24h','88888888',$3,$4,$5,$6,$7,$8,'ACTIVE')",
   [foreignOwner,foreign,"a".repeat(64),iso(now-260*60000),
    iso(now-240*60000),iso(now-180*60000),
    iso(now-150*60000),iso(now-135*60000)]);
  await admin.query(
   "INSERT INTO clean.phase4_g5_fids_allowed_query_v39("+
   "query_digest,owner_digest,query_index,planned_dispatch_utc,"+
   "hard_latest_dispatch_utc,prediction_cutoff_utc,max_physical_attempts,last_reserved_attempt) "+
   "VALUES($1,$2,0,$3,$4,$5,1,1)",
   [foreignQuery,foreignOwner,iso(now-180*60000),
    iso(now-165*60000),iso(now-150*60000)]);
  await admin.query(
   "INSERT INTO clean.phase4_g5_fids_physical_attempt_v39("+
   "expected_reservation_sha256,owner_digest,query_digest,github_run_id,"+
   "physical_attempt_number,charged_reserved_units,committed_at_utc) "+
   "VALUES($1,$2,$3,'88888888',1,2,$4)",
   [foreignReceipt,foreignOwner,foreignQuery,iso(now-175*60000)]);
  stage="CREATE_REAL_NONADMIN_SOURCE_WRITER";
  await admin.query("CREATE ROLE g5a_test_writer LOGIN NOSUPERUSER NOCREATEDB "+
   "NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'fake-local-only'");
  await admin.query("GRANT CONNECT ON DATABASE gate5_disposable TO g5a_test_writer");
  await admin.query("GRANT USAGE ON SCHEMA clean TO g5a_test_writer");
  for(const table of [
   "clean.phase4_g5_fids_cohort_budget_v39",
   "clean.phase4_g5_fids_physical_owner_v39",
   "clean.phase4_g5_fids_allowed_query_v39"
  ])await admin.query("GRANT SELECT,INSERT,UPDATE ON TABLE "+table+
   " TO g5a_test_writer");
  // Source writer is NOT a superuser and cannot delete historical ledgers.
  await writer.connect();writerConnected=true;
  const role=await writer.query("SELECT current_user AS user_name,"+
   "has_schema_privilege(current_user,'clean','CREATE') AS ddl");
  if(role.rows[0]?.user_name!=="g5a_test_writer"||
     role.rows[0]?.ddl!==false)hold("WRITER_NOT_RESTRICTED");

  stage="ADMIT_NEW_DISTINCT_FROZEN_OWNER_WITH_EXPIRED_HISTORICAL_BUDGET";
  const bytes=readFileSync(
   "data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json","utf8");
  const m=JSON.parse(bytes);
  const digest=sha(bytes);
  function fresh(h:"T-24h"|"T-6h",run:string){
   const lag=h==="T-24h"?1440:360;
   const first=Date.parse(m.grid.serviceWindowStartUtc)-
    (lag+m.grid.acquisitionGuardMinutes)*60000;
   const owner=prepareP4G5PhysicalOwnerV39({
    cohortId:m.cohortId,frozenManifestBytes:bytes,reviewedManifestSha256:digest,
    grid:m.grid,horizon:h,
    actualOwnerProcessStartedAtUtc:iso(first-
     (m.grid.githubPrearmLeadMinutes+5)*60000)
   });
   return {owner,githubRunId:run,reviewedRunAuthorizationSha256:"a".repeat(64)};
  }
  const admitted=await stageP4G5PreparedOwnerDbOnlyV39(writer,fresh("T-24h","99990001"));
  if(admitted.ownerRowsNewlyInserted!==1||admitted.paidAttemptsCreated!==0)
   hold("EXPIRED_OWNER_BLOCKED_OR_PAID_DISPATCH");
  const after=await admin.query(
   "SELECT (SELECT count(*)::int FROM clean.phase4_g5_fids_cohort_budget_v39) AS budgets,"+
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_attempt_v39) AS receipts,"+
   "(SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$1) AS old_reserved,"+
   "(SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$2) AS new_reserved",
   [foreign,digest]);
  const z=after.rows[0];
  if(z.budgets!==2||z.receipts!==1||z.old_reserved!==2||z.new_reserved!==0)
   hold("HISTORICAL_LEDGER_OR_NEW_BUDGET_MODIFIED");

  stage="SEED_REAL_UNEXPIRED_COMPETING_FOREIGN_OWNER";
  const future="f".repeat(64),futureOwner="1".repeat(64);
  await admin.query(
   "INSERT INTO clean.phase4_g5_fids_cohort_budget_v39("+
   "manifest_sha256,cohort_id,project_unit_ceiling,reserved_units) "+
   "VALUES($1,'SYNTHETIC_FUTURE_OVERLAP_20261106',24,0)",[future]);
  await admin.query(
   "INSERT INTO clean.phase4_g5_fids_physical_owner_v39("+
   "owner_digest,manifest_sha256,horizon,github_run_id,"+
   "reviewed_authorization_sha256,actual_github_runner_started_at_utc,"+
   "verified_prearm_deadline_utc,first_planned_dispatch_utc,"+
   "last_planned_dispatch_utc,hard_owner_expires_at_utc,state) "+
   "VALUES($1,$2,'T-24h','88880001',$3,$4,$5,$6,$7,$8,'PREPARED')",
   [futureOwner,future,"a".repeat(64),iso(now+10*60000),
    iso(now+20*60000),iso(now+60*60000),
    iso(now+90*60000),iso(now+105*60000)]);
  stage="MUST_REJECT_OVERLAPPING_FOREIGN_OWNER";
  let refused=false;
  try{await stageP4G5PreparedOwnerDbOnlyV39(writer,fresh("T-6h","99990002"))}
  catch(e){
   refused=e instanceof Error&&
    e.message==="P4_G5_PREPARED_OWNER_FOREIGN_UNEXPIRED_OWNER_HOLD";
  }
  if(!refused)hold("LIVE_FOREIGN_OWNER_NOT_BLOCKED");
  const test=await admin.query(
   "SELECT (SELECT count(*)::int FROM clean.phase4_g5_fids_physical_attempt_v39) AS receipts,"+
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_owner_v39 "+
   "WHERE manifest_sha256=$1) AS new_owners,"+
   "(SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$2) AS historical_reserved",[digest,foreign]);
  const t=test.rows[0];
  if(t.receipts!==1||t.new_owners!==1||t.historical_reserved!==2)
   hold("UNEXPIRED_REJECTION_MUTATED_LEDGER");
  console.log(JSON.stringify({
   status:"G5A_V0076_DISPOSABLE_EXPIRED_HISTORICAL_COHORT_NEW_PREARM_PG16_PASS",
   originalHistoricalReservationUnmodified:true,
   newDistinctCohortStagedByRestrictedRole:true,
   activeFutureCompetingOwnerBlocked:true,
   historicalPaidAttemptRows:1,newCohortBudgetReservedUnits:0,
   providerCalls:0,productionDatabaseWrites:0,scientificGate5Passed:false
  }));
 }catch(e){
  const code=e&&typeof e==="object"?(e as {code?:unknown}).code:null;
  console.error(JSON.stringify({
   status:"G5A_V0076_DISPOSABLE_FOREIGN_OWNER_HOLD",stage,
   sqlstate:typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?code:null,
   providerCalls:0,productionDatabaseWrites:0
  }));
  throw Error("G5A_V0076_DISPOSABLE_FOREIGN_OWNER_FAILED");
 }finally{
  if(writerConnected)await writer.end().catch(()=>undefined);
  await admin.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith(
 "v39_phase4_gate5_v0076_expired_foreign_cohort_pg16_actions.ts"))
 void main().catch(()=>{process.exitCode=2});
