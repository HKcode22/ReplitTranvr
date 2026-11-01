/**
 * Real disposable PostgreSQL16 test of V0076 PREPARED -> ACTIVE transition.
 * Dynamic relative-to-now synthetic timestamps make actual database-clock
 * prearm constraints testable. NOT an authenticated GitHub flight owner:
 * no real frozen study cohort, source, rights, provider key or paid dispatch.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {stageP4G5PreparedOwnerDbOnlyV39}
 from "../server/lib/disruption/phase4Gate5DurablePreparedOwner_v39";
import {
 activateP4G5PreparedOwnerDbOnlyV39,
 requireP4G5ActiveLiveReleaseV39,
 P4_G5_ACTIVE_LIVE_RELEASE_SHA_V39
} from "../server/lib/disruption/phase4Gate5OwnerActiveTransition_v39";
const REPO="HKcode22/ReplitTranvr";
const SHA="a".repeat(64);
function exactAt(n:number){return new Date(Math.ceil(n/60000)*60000).toISOString();}
export async function main(){
 const e=process.env;
 const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==REPO||
    e.GITHUB_EVENT_NAME!=="push"||e.GITHUB_REF!=="refs/heads/main"||
    e.GITHUB_RUN_ATTEMPT!=="1"||e.GITHUB_JOB!=="disposable-v0076-activation"||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 V0076 Disposable PREPARED to ACTIVE"||
    e.GITHUB_WORKFLOW_REF!==REPO+
      "/.github/workflows/phase4-gate5-v0076-active-transition-disposable-pg16.yml@refs/heads/main"||
    e.GITHUB_SHA!==sha||! /^[a-f0-9]{40}$/.test(sha)||
    e.P4_G5_ACTIVE_DISPOSABLE_INTENT!=="SYNTHETIC_ZERO_PROVIDER_NULL_RELEASE"||
    !!e.V39_DATABASE_RUNTIME_URL||!!e.GATE05_AUTOMATION_DATABASE_URL||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    e.DATABASE_URL!=="postgresql://postgres:postgres@localhost:5432/gate5_activation")
  throw Error("P4_G5_ACTIVE_DISPOSABLE_CONTEXT_OR_PRODUCTION_SECRET_HOLD");
 if(P4_G5_ACTIVE_LIVE_RELEASE_SHA_V39!==null)
  throw Error("P4_G5_ACTIVE_LIVE_RELEASE_UNEXPECTED");
 const started=Date.now();
 const start=Date.parse(exactAt(started+26*3600000));
 const windowStart=new Date(start).toISOString();
 const grid={
  airportIcao:"WSSS",airportIanaTimezone:"Asia/Singapore",
  serviceWindowStartUtc:windowStart,
  serviceWindowEndUtc:new Date(start+3600000).toISOString(),
  assignmentFrozenAtUtc:exactAt(started-3*3600000),
  acquisitionGuardMinutes:30,refreshCadenceMinutes:30,
  maxStalenessMinutes:45,githubPrearmLeadMinutes:60,
  apiUnitsPerPhysicalAttempt:2,maxAttemptsPerQuery:3,
  projectRestApiUnitsBudget:54,maxSourceQueries:15
 };
 const manifest={cohortId:"SYNTHETIC_WSSS_ACTIVE_PG16_NO_PROVIDER",grid};
 const bytes=JSON.stringify(manifest,null,2)+"\n";
 const digest=createHash("sha256").update(bytes).digest("hex");
 try{
  requireP4G5ActiveLiveReleaseV39(digest);
  throw Error("P4_G5_ACTIVE_LIVE_RELEASE_BYPASSED");
 }catch(err){
  if(!(err instanceof Error)||
     err.message!=="P4_G5_ACTIVE_LIVE_RELEASE_SOURCE_RIGHTS_NOT_APPROVED")
   throw err;
 }
 // Simulate an early process start only in an isolated disposable database.
 const owner=prepareP4G5PhysicalOwnerV39({
  cohortId:manifest.cohortId,frozenManifestBytes:bytes,
  reviewedManifestSha256:digest,grid,horizon:"T-24h",
  actualOwnerProcessStartedAtUtc:new Date(started).toISOString()
 });
 const input={owner,githubRunId:"9900112200",
  reviewedRunAuthorizationSha256:SHA,
  providerNativeSelectedTEvidenceSha256:SHA,
  perRecordActualOnlyRunwayEvidenceSha256:SHA,
  operatingPhysicalLegEvidenceSha256:SHA,
  lawfulContentRetentionEvidenceSha256:SHA,
  independentlyAuthenticatedGitHubRunnerEvidenceSha256:SHA};
 const c=new pg.Client({connectionString:e.DATABASE_URL,
  connectionTimeoutMillis:8000,query_timeout:15000});
 await c.connect();
 try{
  const staged=await stageP4G5PreparedOwnerDbOnlyV39(c,input);
  if(staged.ownerRowsNewlyInserted!==1)
   throw Error("P4_G5_ACTIVE_DISPOSABLE_STAGING_NOT_NEW");
  // A same-count but tampered query grid MUST not activate. This is
  // disposable PostgreSQL only; restore the exact original after rollback.
  const driftSlot=owner.entries[1];
  if(owner.maxAttemptsPerQuery!==3)
   throw Error("P4_G5_ACTIVE_DISPOSABLE_EXPECTED_THREE_ATTEMPT_CAP");
  await c.query(
   "UPDATE clean.phase4_g5_fids_allowed_query_v39 "+
   "SET max_physical_attempts=2 WHERE query_digest=$1",
   [driftSlot.queryDigest]);
  let driftDenied=false;
  try{await activateP4G5PreparedOwnerDbOnlyV39(c,input);}
  catch(err){driftDenied=err instanceof Error&&
   err.message==="P4_G5_ACTIVE_QUERY_GRID_OR_ATTEMPT_DRIFT";}
  if(!driftDenied)
   throw Error("P4_G5_ACTIVE_DISPOSABLE_DRIFT_ALLOWED");
  const before=await c.query(
   "SELECT state FROM clean.phase4_g5_fids_physical_owner_v39 "+
   "WHERE owner_digest=$1",[owner.ownerDigest]);
  if(before.rows.length!==1||before.rows[0].state!=="PREPARED")
   throw Error("P4_G5_ACTIVE_DISPOSABLE_DRIFT_NOT_ROLLED_BACK");
  await c.query(
   "UPDATE clean.phase4_g5_fids_allowed_query_v39 "+
   "SET max_physical_attempts=$2 WHERE query_digest=$1",
   [driftSlot.queryDigest,owner.maxAttemptsPerQuery]);
  const active=await activateP4G5PreparedOwnerDbOnlyV39(c,input);
  if(active.ownerRowActivated!==1||active.providerCalls!==0||
     active.authorizedProviderDispatch!==false)
   throw Error("P4_G5_ACTIVE_DISPOSABLE_TRANSITION_CONTRACT_HOLD");
  let duplicateDenied=false;
  try{await activateP4G5PreparedOwnerDbOnlyV39(c,input);}
  catch(err){duplicateDenied=err instanceof Error&&
   err.message==="P4_G5_ACTIVE_OWNER_STATE_OR_AUTHORIZATION_DRIFT";}
  if(!duplicateDenied)
   throw Error("P4_G5_ACTIVE_DISPOSABLE_REPLAY_ALLOWED_HOLD");
  // Even ACTIVE cannot bypass V0076's actual physical clock. We have
  // prearmed well before the first permitted GET; paid GET must be refused.
  const slot=owner.entries[0];
  const reservation=createHash("sha256").update([
    digest,owner.ownerDigest,slot.queryDigest,"1"].join("|")).digest("hex");
  let prematureDenied=false;
  try{
   await c.query("SELECT clean.reserve_phase4_g5_fids_physical_attempt_v39("+
    "$1,$2,$3,$4,$5,$6)",[
     digest,owner.ownerDigest,input.githubRunId,slot.queryDigest,1,reservation
    ]);
  }catch(err){
   prematureDenied=err instanceof Error&&
    /P4_G5_PHYSICAL_SOURCE_WINDOW_MISSED_OR_EARLY/.test(err.message);
  }
  if(!prematureDenied)
   throw Error("P4_G5_ACTIVE_DISPOSABLE_PREMATURE_GET_NOT_REFUSED");
  const check=await c.query([
   "SELECT",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_owner_v39 WHERE state='ACTIVE') AS active,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_allowed_query_v39) AS queries,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_attempt_v39) AS attempts,",
   "(SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39 LIMIT 1) AS reserved"
  ].join(" "));
  const f=check.rows[0];
  if(f.active!==1||f.queries!==3||f.attempts!==0||f.reserved!==0)
   throw Error("P4_G5_ACTIVE_DISPOSABLE_PG16_RECONCILIATION_HOLD");
  console.log(JSON.stringify({
   status:"V0076_DISPOSABLE_PREPARED_TO_ACTIVE_BOUNDED_NO_GET",
   ...f,githubRealPrearmIndependentlyProven:false,
   sourceSemanticsVerified:false,retentionRightsVerified:false,
   liveReleaseShaAssigned:false,providerCalls:0,
   physicalGetRequests:0,productionDbWrites:0,
   strictGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  }));
 }finally{await c.end().catch(()=>undefined);}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0076_active_transition_disposable_pg16_actions.ts"))
 void main().catch(e=>{
  const m=e instanceof Error&&/^P4_G5_[A-Z0-9_]+$/.test(e.message)?
   e.message:"P4_G5_ACTIVE_DISPOSABLE_HOLD_NO_PROVIDER";
  console.error(m);process.exitCode=2;
 });
