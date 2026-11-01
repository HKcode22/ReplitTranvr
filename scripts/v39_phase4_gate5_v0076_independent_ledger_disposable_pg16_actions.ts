/**
 * Actual disposable PG16: stage 3 synthetic V0076 owners, audit under
 * independent REPEATABLE READ READ ONLY transaction, inject a fake ledger
 * row, audit exact parity, and reject tampered/corrupt ledger accounting.
 * No real GitHub owner timing, provider, source, production database or PRE.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {stageP4G5PreparedOwnerDbOnlyV39}
 from "../server/lib/disruption/phase4Gate5DurablePreparedOwner_v39";
import {auditP4G5V0076IndependentLedgerReadOnlyV39,
 type P4G5LedgerExpectedOwnerV39}
 from "../server/lib/disruption/phase4Gate5V0076IndependentLedgerReadOnly_v39";

const REPO="HKcode22/ReplitTranvr";
const FIXTURE="data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json";
const FAIL="P4_G5_LEDGER_";
async function expectHold(fn:()=>Promise<unknown>,needle:string){
 let caught=false;
 try{await fn();}catch(e){
  caught=e instanceof Error&&e.message===needle;
 }
 if(!caught)throw Error("P4_G5_LEDGER_DISPOSABLE_EXPECTED_REJECTION_NOT_PROVEN");
}
export async function main(){
 const env=process.env;
 const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_EVENT_NAME!=="push"||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||env.GITHUB_SHA!==sha||
    !/^[a-f0-9]{40}$/.test(sha)||
    env.GITHUB_JOB!=="v0076-independent-ledger-disposable"||
    env.GITHUB_WORKFLOW!=="Phase4 Gate5 V0076 Independent Ledger Disposable PG16"||
    env.GITHUB_WORKFLOW_REF!==REPO+
     "/.github/workflows/phase4-gate5-v0076-independent-ledger-disposable-pg16.yml@refs/heads/main"||
    env.P4_G5_LEDGER_DISPOSABLE_INTENT!=="SYNTHETIC_ONLY_NO_PROVIDER"||
    env.DATABASE_URL!=="postgresql://postgres:postgres@localhost:5432/gate5_ledger"||
    !!env.AERODATABOX_API_KEY||!!env.RAPIDAPI_KEY||
    !!env.GATE05_AUTOMATION_DATABASE_URL||!!env.V39_DATABASE_RUNTIME_URL)
  throw Error("P4_G5_LEDGER_DISPOSABLE_FORBIDDEN_CONTEXT");
 const bytes=readFileSync(FIXTURE,"utf8");
 const manifest=JSON.parse(bytes);
 if(manifest.mode!=="HOLD_NO_PROVIDER"||
    manifest.paidSourceActivationAuthorized!==false||
    manifest.verifiedFirstNativeT!==false||
    manifest.legallyPermittedSourceRetentionVerified!==false)
  throw Error("P4_G5_LEDGER_DISPOSABLE_NOT_SYNTHETIC");
 const hash=createHash("sha256").update(bytes).digest("hex");
 const db=new pg.Client({connectionString:env.DATABASE_URL,
  connectionTimeoutMillis:8000,query_timeout:15000});
 await db.connect();
 try{
  const expected:P4G5LedgerExpectedOwnerV39[]=[];
  for(const [n,h] of (["T-24h","T-6h","T-90m"] as const).entries()){
   const lag=h==="T-24h"?1440:h==="T-6h"?360:90;
   const first=Date.parse(manifest.grid.serviceWindowStartUtc)-
    (lag+manifest.grid.acquisitionGuardMinutes)*60000;
   const owner=prepareP4G5PhysicalOwnerV39({
    cohortId:manifest.cohortId,frozenManifestBytes:bytes,
    reviewedManifestSha256:hash,grid:manifest.grid,horizon:h,
    actualOwnerProcessStartedAtUtc:new Date(first-
     (manifest.grid.githubPrearmLeadMinutes+5)*60000).toISOString()
   });
   const input={owner,githubRunId:String(90000111+n),
    reviewedAuthorizationSha256:"a".repeat(64)};
   const staged=await stageP4G5PreparedOwnerDbOnlyV39(db,{
    owner,githubRunId:input.githubRunId,
    reviewedRunAuthorizationSha256:input.reviewedAuthorizationSha256
   });
   if(staged.ownerRowsNewlyInserted!==1)
    throw Error("P4_G5_LEDGER_DISPOSABLE_STAGING_HOLD");
   expected.push(input);
  }
  const initial=await auditP4G5V0076IndependentLedgerReadOnlyV39(db,expected);
  if(initial.exactPlannedQueryCount!==9||initial.physicalAttemptsRecorded!==0||
     initial.nonrefundableUnitsReserved!==0||
     initial.status!=="NO_LEDGER_PHYSICAL_ATTEMPTS_SOURCE_UNOBSERVED")
   throw Error("P4_G5_LEDGER_DISPOSABLE_ZERO_LEDGER_RECONCILIATION_HOLD");
  const owner=expected[0].owner,q=owner.entries[0];
  const receipt=createHash("sha256").update([
   hash,owner.ownerDigest,q.queryDigest,"1"].join("|")).digest("hex");
  // Only in disposable database: simulate a valid committed ledger receipt,
  // without waiting for 2027, creating provider network activity, or claiming
  // that a real GitHub process made a physical GET. This bypasses the
  // SEC-DEF function on purpose; never permitted in production.
  await db.query("UPDATE clean.phase4_g5_fids_physical_owner_v39 "+
   "SET state='ACTIVE' WHERE owner_digest=$1",[owner.ownerDigest]);
  await db.query("UPDATE clean.phase4_g5_fids_allowed_query_v39 "+
   "SET last_reserved_attempt=1 WHERE query_digest=$1",[q.queryDigest]);
  await db.query("UPDATE clean.phase4_g5_fids_cohort_budget_v39 "+
   "SET reserved_units=2 WHERE manifest_sha256=$1",[hash]);
  await db.query(
   "INSERT INTO clean.phase4_g5_fids_physical_attempt_v39("+
   "expected_reservation_sha256,owner_digest,query_digest,github_run_id,"+
   "physical_attempt_number,charged_reserved_units,committed_at_utc) "+
   "VALUES ($1,$2,$3,$4,1,2,$5::timestamptz)",
   [receipt,owner.ownerDigest,q.queryDigest,expected[0].githubRunId,
    new Date(Date.parse(q.plannedPhysicalStartUtc)+30000).toISOString()]);
  const reconciled=await auditP4G5V0076IndependentLedgerReadOnlyV39(db,expected);
  if(reconciled.physicalAttemptsRecorded!==1||
     reconciled.nonrefundableUnitsReserved!==2||
     reconciled.perHorizon["T-24h"].committedAttempts!==1||
     reconciled.perHorizon["T-6h"].unattemptedQueries!==3||
     reconciled.perHorizon["T-90m"].unattemptedQueries!==3||
     reconciled.status!=="PHYSICAL_ATTEMPT_LEDGER_RECONCILED_SOURCE_UNVERIFIED")
   throw Error("P4_G5_LEDGER_DISPOSABLE_NONZERO_PARITY_HOLD");
  await db.query("UPDATE clean.phase4_g5_fids_cohort_budget_v39 "+
   "SET reserved_units=4 WHERE manifest_sha256=$1",[hash]);
  await expectHold(
   ()=>auditP4G5V0076IndependentLedgerReadOnlyV39(db,expected),
   "P4_G5_LEDGER_NONREFUNDABLE_BUDGET_PARITY_HOLD");
  await db.query("UPDATE clean.phase4_g5_fids_cohort_budget_v39 "+
   "SET reserved_units=2 WHERE manifest_sha256=$1",[hash]);
  await db.query("UPDATE clean.phase4_g5_fids_allowed_query_v39 "+
   "SET last_reserved_attempt=2 WHERE query_digest=$1",[q.queryDigest]);
  await expectHold(
   ()=>auditP4G5V0076IndependentLedgerReadOnlyV39(db,expected),
   "P4_G5_LEDGER_QUERY_LAST_RESERVED_MISMATCH");
  await db.query("UPDATE clean.phase4_g5_fids_allowed_query_v39 "+
   "SET last_reserved_attempt=1 WHERE query_digest=$1",[q.queryDigest]);
  const restored=await auditP4G5V0076IndependentLedgerReadOnlyV39(db,expected);
  if(restored.nonrefundableUnitsReserved!==2)
   throw Error("P4_G5_LEDGER_DISPOSABLE_RESTORE_HOLD");
  let immutable=false;
  try{await db.query(
   "DELETE FROM clean.phase4_g5_fids_physical_attempt_v39 "+
   "WHERE expected_reservation_sha256=$1",[receipt]);
  }catch(e){immutable=e instanceof Error&&
    /P4_G5_IRREVERSIBLE_PHYSICAL_RESERVATION/.test(e.message);}
  if(!immutable)throw Error("P4_G5_LEDGER_DISPOSABLE_REFUND_ALLOWED");
  console.log(JSON.stringify({
   status:"V0076_INDEPENDENT_READONLY_THREE_HORIZON_LEDGER_PG16_PASS_NO_PROVIDER",
   frozenOwnersVerified:3,queriesVerified:restored.exactPlannedQueryCount,
   syntheticCommittedAttemptRows:restored.physicalAttemptsRecorded,
   syntheticNonrefundableUnits:restored.nonrefundableUnitsReserved,
   rejectedBudgetDrift:true,rejectedQuerySpendDrift:true,
   immutableAttemptDeletionRejected:true,
   realGitHubPhysicalPrearmVerified:false,
   actualHttpReceiptsProven:false,certifiedPrePersisted:false,
   sourceSemanticsVerified:false,retentionRightsVerified:false,
   productionWrites:0,providerCalls:0,strictGate5Passed:false,
   phase5FreezeAuthorized:false,phase6Authorized:false
  }));
 }finally{await db.end().catch(()=>undefined);}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0076_independent_ledger_disposable_pg16_actions.ts"))
 void main().catch(e=>{
  const msg=e instanceof Error&&e.message.startsWith(FAIL)&&
   /^[A-Z0-9_]+$/.test(e.message)?e.message:
   "P4_G5_LEDGER_DISPOSABLE_UNEXPECTED_HOLD";
  console.error(msg);process.exitCode=2;
 });
