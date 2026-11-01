/**
 * Phase4 Gate5 V0076: owner state PREPARED -> ACTIVE low-level DB boundary.
 *
 * This module has NO production GitHub entrypoint and its LIVE release pin is
 * null. A future reviewed admission layer MUST independently authenticate
 * provider-native T, per-record actuality, physical leg, source rights,
 * actual GitHub runner identity/start, and fixed owner/manifest before use.
 * SHA-shaped placeholders are references, never proof. This code never
 * grants database permissions, requests AeroDataBox or creates reservations.
 */
import type {P4G5PhysicalOwnerV39}
 from "./phase4Gate5PhysicalOwnerDispatchGuard_v39";
import type {P4G5PreparedOwnerDbV39}
 from "./phase4Gate5DurablePreparedOwner_v39";

const SHA=/^[a-f0-9]{64}$/;
const RUN=/^[0-9]{5,25}$/;
export const P4_G5_ACTIVE_LIVE_RELEASE_SHA_V39:string|null=null;

export interface P4G5ActiveTransitionInputV39{
 owner:P4G5PhysicalOwnerV39;
 githubRunId:string;
 reviewedRunAuthorizationSha256:string;
 // References for independent external verification in a FUTURE live
 // entrypoint. Their presence here does not authenticate their meaning.
 providerNativeSelectedTEvidenceSha256:string;
 perRecordActualOnlyRunwayEvidenceSha256:string;
 operatingPhysicalLegEvidenceSha256:string;
 lawfulContentRetentionEvidenceSha256:string;
 independentlyAuthenticatedGitHubRunnerEvidenceSha256:string;
}
export function requireP4G5ActiveLiveReleaseV39(manifestSha256:string){
 if(P4_G5_ACTIVE_LIVE_RELEASE_SHA_V39===null||
    manifestSha256!==P4_G5_ACTIVE_LIVE_RELEASE_SHA_V39)
  throw Error("P4_G5_ACTIVE_LIVE_RELEASE_SOURCE_RIGHTS_NOT_APPROVED");
}
export function assertP4G5ActiveTransitionInputV39(x:P4G5ActiveTransitionInputV39){
 const o=x?.owner;
 if(!o||!SHA.test(o.manifestSha256)||
    !SHA.test(o.ownerDigest)||!RUN.test(x.githubRunId)||
    o.status!=="OWNER_TIMING_PLAN_ONLY_NEEDS_TRUSTED_DURABLE_ATTEMPT_LEDGER"||
    o.actualPaidOwnerAuthorized!==false||
    !["T-24h","T-6h","T-90m"].includes(o.horizon)||
    o.entries.length===0||o.entries.length!==o.expectedQueries||
    !SHA.test(x.reviewedRunAuthorizationSha256)||
    !SHA.test(x.providerNativeSelectedTEvidenceSha256)||
    !SHA.test(x.perRecordActualOnlyRunwayEvidenceSha256)||
    !SHA.test(x.operatingPhysicalLegEvidenceSha256)||
    !SHA.test(x.lawfulContentRetentionEvidenceSha256)||
    !SHA.test(x.independentlyAuthenticatedGitHubRunnerEvidenceSha256))
  throw Error("P4_G5_ACTIVE_UNVERIFIED_MANIFEST_OWNER_OR_PROOF_REFERENCE");
}
function pgIso(v:unknown):string{
 if(v instanceof Date&&!Number.isNaN(v.getTime()))
  return v.toISOString();
 if(typeof v==="string"){
  const t=Date.parse(v);
  if(Number.isFinite(t))return new Date(t).toISOString();
 }
 throw Error("P4_G5_ACTIVE_INVALID_PG_CLOCK");
}
function count(v:unknown):number{
 const n=typeof v==="number"?v:typeof v==="string"&&/^\d+$/.test(v)?Number(v):NaN;
 if(!Number.isSafeInteger(n)||n<0)
  throw Error("P4_G5_ACTIVE_INVALID_CATALOG_COUNT");
 return n;
}
/**
 * DB-only testable transaction. Callers must NEVER expose this to
 * unreviewed GitHub dispatch, Replit cron, a model-generated boolean
 * approval or a production role merely because hashes are formatted.
 */
export async function activateP4G5PreparedOwnerDbOnlyV39(
 db:P4G5PreparedOwnerDbV39,
 x:P4G5ActiveTransitionInputV39
){
 assertP4G5ActiveTransitionInputV39(x);
 let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  await db.query("SET LOCAL lock_timeout='2000ms'");
  await db.query("SELECT pg_advisory_xact_lock(76,41)");
  const found=await db.query(
   "SELECT state,manifest_sha256,horizon,github_run_id,"+
   "reviewed_authorization_sha256,actual_github_runner_started_at_utc,"+
   "verified_prearm_deadline_utc,first_planned_dispatch_utc,"+
   "last_planned_dispatch_utc,hard_owner_expires_at_utc "+
   "FROM clean.phase4_g5_fids_physical_owner_v39 "+
   "WHERE owner_digest=$1 AND manifest_sha256=$2 FOR UPDATE",
   [x.owner.ownerDigest,x.owner.manifestSha256]);
  const y=found.rows[0];
  if(found.rows.length!==1||!y||y.state!=="PREPARED"||
     y.horizon!==x.owner.horizon||y.github_run_id!==x.githubRunId||
     y.reviewed_authorization_sha256!==x.reviewedRunAuthorizationSha256||
     pgIso(y.actual_github_runner_started_at_utc)!==x.owner.ownerActuallyObservedAtUtc||
     pgIso(y.verified_prearm_deadline_utc)!==x.owner.ownerDeadlineUtc||
     pgIso(y.first_planned_dispatch_utc)!==x.owner.entries[0].plannedPhysicalStartUtc||
     pgIso(y.last_planned_dispatch_utc)!==
      x.owner.entries[x.owner.entries.length-1].plannedPhysicalStartUtc)
   throw Error("P4_G5_ACTIVE_OWNER_STATE_OR_AUTHORIZATION_DRIFT");
  const clock=await db.query("SELECT clock_timestamp() AS db_now");
  if(clock.rows.length!==1)throw Error("P4_G5_ACTIVE_PG_CLOCK_MISSING");
  const now=Date.parse(pgIso(clock.rows[0].db_now));
  const started=Date.parse(pgIso(y.actual_github_runner_started_at_utc));
  const deadline=Date.parse(pgIso(y.verified_prearm_deadline_utc));
  const first=Date.parse(pgIso(y.first_planned_dispatch_utc));
  const expires=Date.parse(pgIso(y.hard_owner_expires_at_utc));
  if(!Number.isFinite(now)||started>now||started>deadline||
     now>deadline||deadline>=first||expires<=now)
   throw Error("P4_G5_ACTIVE_NOT_WITHIN_PHYSICALLY_PREARMED_WINDOW");

  const budget=await db.query(
   "SELECT reserved_units,project_unit_ceiling "+
   "FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$1 AND cohort_id=$2 FOR UPDATE",
   [x.owner.manifestSha256,x.owner.cohortId]);
  if(budget.rows.length!==1||
     count(budget.rows[0].reserved_units)>count(budget.rows[0].project_unit_ceiling)||
     count(budget.rows[0].project_unit_ceiling)!==x.owner.projectRestApiUnitsBudget)
   throw Error("P4_G5_ACTIVE_COHORT_BUDGET_DRIFT");

  const q=await db.query(
   "SELECT count(*)::int AS n, "+
   "count(*) FILTER(WHERE last_reserved_attempt<>0)::int AS attempted "+
   "FROM clean.phase4_g5_fids_allowed_query_v39 "+
   "WHERE owner_digest=$1",[x.owner.ownerDigest]);
  if(q.rows.length!==1||count(q.rows[0].n)!==x.owner.expectedQueries||
     count(q.rows[0].attempted)!==0)
   throw Error("P4_G5_ACTIVE_QUERY_GRID_OR_ATTEMPT_DRIFT");

  const a=await db.query(
   "SELECT count(*)::int AS n FROM clean.phase4_g5_fids_physical_attempt_v39 "+
   "WHERE owner_digest=$1",[x.owner.ownerDigest]);
  if(a.rows.length!==1||count(a.rows[0].n)!==0)
   throw Error("P4_G5_ACTIVE_PREEXISTING_PHYSICAL_ATTEMPT_HOLD");

  const committed=await db.query(
   "UPDATE clean.phase4_g5_fids_physical_owner_v39 SET state='ACTIVE' "+
   "WHERE owner_digest=$1 AND manifest_sha256=$2 "+
   "AND github_run_id=$3 AND reviewed_authorization_sha256=$4 "+
   "AND state='PREPARED' "+
   "AND actual_github_runner_started_at_utc<=clock_timestamp() "+
   "AND clock_timestamp()<=verified_prearm_deadline_utc "+
   "RETURNING owner_digest",
   [x.owner.ownerDigest,x.owner.manifestSha256,
    x.githubRunId,x.reviewedRunAuthorizationSha256]);
  if(committed.rows.length!==1||
     committed.rows[0]?.owner_digest!==x.owner.ownerDigest)
   throw Error("P4_G5_ACTIVE_RACE_OR_EXPIRED_WINDOW_HOLD");
  await db.query("COMMIT");tx=false;
  return {
   schema:"v39.phase4.gate5-v0076-low-level-active-transition.v1" as const,
   status:"DB_ONLY_ACTIVE_TRANSITION_NOT_SOURCE_OR_RIGHTS_CERTIFICATION" as const,
   ownerDigest:x.owner.ownerDigest,
   ownerHorizon:x.owner.horizon,
   ownerRowActivated:1 as const,
   providerCalls:0 as const,physicalAttemptReservations:0 as const,
   certifiedSourceRightsByThisMethod:false as const,
   independentGitHubRunnerProofByThisMethod:false as const,
   authorizedProviderDispatch:false as const,
   strictGate5Passed:false as const,
   phase5FreezeAuthorized:false as const,phase6Authorized:false as const
  };
 }catch(e){
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }
}
