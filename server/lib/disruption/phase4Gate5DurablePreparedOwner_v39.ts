/**
 * Phase4 Gate5 prospective horizon owner PREPARED-only durable staging for V0076.
 *
 * A future owner-specific GitHub runner may stage its exact reviewed, immutable
 * source-query grid. This DB-only module is NEVER a provider permit: it cannot
 * transition an owner to ACTIVE, grant SQL rights, send REST or persist PRE.
 *
 * LIVE integration is hard-gated by the unassigned source release pin and
 * separately authenticated owner/time/rights/source evidence; caller-supplied
 * actual runner clocks are not independent GitHub attestation.
 */
import type {P4G5PhysicalOwnerV39}
 from "./phase4Gate5PhysicalOwnerDispatchGuard_v39";

const SHA=/^[a-f0-9]{64}$/;
const RUN=/^[0-9]{5,25}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
export const P4_G5_PREPARED_OWNER_LIVE_RELEASE_SHA_V39:string|null=null;
export interface P4G5PreparedOwnerDbV39{
 query(sql:string,values?:readonly unknown[]):Promise<{
  rows:Array<Record<string,unknown>>;
 }>;
}
export interface P4G5PreparedOwnerInputV39{
 owner:P4G5PhysicalOwnerV39;
 githubRunId:string;
 reviewedRunAuthorizationSha256:string;
}
function exactMs(s:string):number{
 if(typeof s!=="string"||!ISO.test(s)||
    !Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)
  throw Error("P4_G5_PREPARED_OWNER_INVALID_UTC");
 return Date.parse(s);
}
export function assertP4G5PreparedOwnerInputV39(i:P4G5PreparedOwnerInputV39){
 const o=i?.owner;
 if(!o||o.status!=="OWNER_TIMING_PLAN_ONLY_NEEDS_TRUSTED_DURABLE_ATTEMPT_LEDGER"||
    o.actualPaidOwnerAuthorized!==false||
    o.sourceOriginalStored!==false||
    !SHA.test(o.manifestSha256)||
    !SHA.test(o.ownerDigest)||
    !SHA.test(i.reviewedRunAuthorizationSha256)||
    !RUN.test(i.githubRunId)||
    !["T-24h","T-6h","T-90m"].includes(o.horizon)||
    o.perAttemptApiUnits!==2||
    o.maxAttemptsPerQuery<1||o.maxAttemptsPerQuery>3||
    !Number.isSafeInteger(o.projectRestApiUnitsBudget)||
    o.projectRestApiUnitsBudget<2||o.projectRestApiUnitsBudget>50000||
    o.fullGridWorstCaseApiUnits>o.projectRestApiUnitsBudget||
    o.entries.length===0||o.entries.length>100||
    o.entries.length!==o.expectedQueries)
  throw Error("P4_G5_PREPARED_OWNER_SCOPE_OR_COST_HOLD");
 const first=exactMs(o.entries[0].plannedPhysicalStartUtc);
 const last=exactMs(o.entries[o.entries.length-1].plannedPhysicalStartUtc);
 const start=exactMs(o.ownerActuallyObservedAtUtc);
 const deadline=exactMs(o.ownerDeadlineUtc);
 const expiry=last+15*60000;
 if(start>deadline||deadline>=first||last<first||
    expiry>first+6*3600000)
  throw Error("P4_G5_PREPARED_OWNER_LATE_OR_LONG_GITHUB_RUN_HOLD");
 const seen=new Set<string>();
 for(const [index,e] of o.entries.entries()){
  if(!e||e.queryIndex!==index||!SHA.test(e.queryDigest)||
     seen.has(e.queryDigest)||e.horizon!==o.horizon||
     !/^[A-Z]{4}$/.test(e.sourceAirportIcao))
   throw Error("P4_G5_PREPARED_OWNER_QUERY_BINDING_HOLD");
  seen.add(e.queryDigest);
  const planned=exactMs(e.plannedPhysicalStartUtc);
  const latest=exactMs(e.hardLatestPhysicalStartUtc);
  const cutoff=exactMs(e.cutoffUtc);
  if(planned<first||planned>last||planned>latest||
     latest>cutoff-15*60000||
     (index>0&&planned<=exactMs(o.entries[index-1].plannedPhysicalStartUtc)))
   throw Error("P4_G5_PREPARED_OWNER_CUTOFF_OR_ORDER_HOLD");
 }
 return {
  owner:o,
  firstUtc:new Date(first).toISOString(),
  lastUtc:new Date(last).toISOString(),
  expiresUtc:new Date(expiry).toISOString()
 };
}
export function requireP4G5PreparedLivePromotionV39(
 manifestSha256:string
){
 if(P4_G5_PREPARED_OWNER_LIVE_RELEASE_SHA_V39===null||
    manifestSha256!==P4_G5_PREPARED_OWNER_LIVE_RELEASE_SHA_V39)
  throw Error("P4_G5_PREPARED_OWNER_LIVE_RELEASE_AND_RIGHTS_HOLD");
}
/**
 * Low-level DB-only testable staging boundary, deliberately independent of
 * release and provider clients. Not a production entrypoint and no job
 * imports it. The future production entrypoint must first validate pinned
 * authorized source semantics, rights and GitHub-run attestation, then call.
 */
export async function stageP4G5PreparedOwnerDbOnlyV39(
 db:P4G5PreparedOwnerDbV39,input:P4G5PreparedOwnerInputV39
){
 const {owner:o,firstUtc,lastUtc,expiresUtc}=
  assertP4G5PreparedOwnerInputV39(input);
 let tx=false;
 let newlyCreated=0;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  await db.query("SET LOCAL lock_timeout='2000ms'");
  await db.query("SELECT pg_advisory_xact_lock(76,40)");
  // Conservative: never stage another manifest into this project cap.
  const foreign=await db.query(
   "SELECT count(*)::int AS n FROM clean.phase4_g5_fids_cohort_budget_v39 "+
    "WHERE manifest_sha256<>$1",[o.manifestSha256]);
  if(foreign.rows.length!==1||Number(foreign.rows[0].n)!==0)
   throw Error("P4_G5_PREPARED_OWNER_FOREIGN_COHORT_HOLD");

  await db.query(
   "INSERT INTO clean.phase4_g5_fids_cohort_budget_v39"+
   "(manifest_sha256,cohort_id,project_unit_ceiling) VALUES($1,$2,$3) "+
   "ON CONFLICT DO NOTHING",
   [o.manifestSha256,o.cohortId,o.projectRestApiUnitsBudget]);
  const budget=await db.query(
   "SELECT reserved_units,project_unit_ceiling FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$1 AND cohort_id=$2 AND project_unit_ceiling=$3 "+
   "FOR UPDATE",
   [o.manifestSha256,o.cohortId,o.projectRestApiUnitsBudget]);
  // A previously dispatched earlier horizon must NEVER prevent the later
  // T-6h or T-90m owners from being admitted into the SAME frozen cohort.
  // The V0076 database reservation function, not this PREPARED-only stage,
  // controls actual physical spend and enforces its reserved-unit ceiling.
  const reserved=Number(budget.rows[0]?.reserved_units);
  const ceiling=Number(budget.rows[0]?.project_unit_ceiling);
  if(budget.rows.length!==1||!Number.isSafeInteger(reserved)||
     !Number.isSafeInteger(ceiling)||reserved<0||
     ceiling!==o.projectRestApiUnitsBudget||reserved>ceiling)
   throw Error("P4_G5_PREPARED_OWNER_BUDGET_DRIFT_OR_INVALID_CAP_HOLD");
  // An unrelated/replayed GitHub run cannot be used for another horizon.
  const replay=await db.query(
   "SELECT count(*)::int AS n FROM clean.phase4_g5_fids_physical_owner_v39 "+
   "WHERE manifest_sha256=$1 AND github_run_id=$2 "+
   "AND owner_digest<>$3",
   [o.manifestSha256,input.githubRunId,o.ownerDigest]);
  if(replay.rows.length!==1||Number(replay.rows[0].n)!==0)
   throw Error("P4_G5_PREPARED_OWNER_GITHUB_RUN_REUSE_HOLD");
  const inserted=await db.query(
   "INSERT INTO clean.phase4_g5_fids_physical_owner_v39("+
   "owner_digest,manifest_sha256,horizon,github_run_id,"+
   "reviewed_authorization_sha256,actual_github_runner_started_at_utc,"+
   "verified_prearm_deadline_utc,first_planned_dispatch_utc,"+
   "last_planned_dispatch_utc,hard_owner_expires_at_utc,state) "+
   "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PREPARED') "+
   "ON CONFLICT DO NOTHING RETURNING owner_digest",
   [o.ownerDigest,o.manifestSha256,o.horizon,input.githubRunId,
    input.reviewedRunAuthorizationSha256,o.ownerActuallyObservedAtUtc,
    o.ownerDeadlineUtc,firstUtc,lastUtc,expiresUtc]);
  if(inserted.rows.length>1)
   throw Error("P4_G5_PREPARED_OWNER_INSERT_SHAPE_HOLD");
  newlyCreated=inserted.rows.length;
  const verified=await db.query(
   "SELECT count(*)::int AS n FROM clean.phase4_g5_fids_physical_owner_v39 "+
   "WHERE owner_digest=$1 AND manifest_sha256=$2 AND horizon=$3 "+
   "AND github_run_id=$4 AND reviewed_authorization_sha256=$5 "+
   "AND actual_github_runner_started_at_utc=$6::timestamptz "+
   "AND verified_prearm_deadline_utc=$7::timestamptz "+
   "AND first_planned_dispatch_utc=$8::timestamptz "+
   "AND last_planned_dispatch_utc=$9::timestamptz "+
   "AND hard_owner_expires_at_utc=$10::timestamptz AND state='PREPARED'",
   [o.ownerDigest,o.manifestSha256,o.horizon,input.githubRunId,
    input.reviewedRunAuthorizationSha256,o.ownerActuallyObservedAtUtc,
    o.ownerDeadlineUtc,firstUtc,lastUtc,expiresUtc]);
  if(verified.rows.length!==1||Number(verified.rows[0].n)!==1)
   throw Error("P4_G5_PREPARED_OWNER_DRIFT_OR_ACTIVE_HOLD");

  for(const e of o.entries){
   await db.query(
    "INSERT INTO clean.phase4_g5_fids_allowed_query_v39("+
    "query_digest,owner_digest,query_index,planned_dispatch_utc,"+
    "hard_latest_dispatch_utc,prediction_cutoff_utc,"+
    "max_physical_attempts) "+
    "VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
    [e.queryDigest,o.ownerDigest,e.queryIndex,e.plannedPhysicalStartUtc,
     e.hardLatestPhysicalStartUtc,e.cutoffUtc,o.maxAttemptsPerQuery]);
   const check=await db.query(
    "SELECT count(*)::int AS n FROM clean.phase4_g5_fids_allowed_query_v39 "+
    "WHERE query_digest=$1 AND owner_digest=$2 AND query_index=$3 "+
    "AND planned_dispatch_utc=$4::timestamptz "+
    "AND hard_latest_dispatch_utc=$5::timestamptz "+
    "AND prediction_cutoff_utc=$6::timestamptz "+
    "AND max_physical_attempts=$7 AND last_reserved_attempt=0",
    [e.queryDigest,o.ownerDigest,e.queryIndex,e.plannedPhysicalStartUtc,
     e.hardLatestPhysicalStartUtc,e.cutoffUtc,o.maxAttemptsPerQuery]);
   if(check.rows.length!==1||Number(check.rows[0].n)!==1)
    throw Error("P4_G5_PREPARED_OWNER_QUERY_DRIFT_OR_DISPATCH_HOLD");
  }
  const rows=await db.query(
   "SELECT count(*)::int AS n FROM clean.phase4_g5_fids_allowed_query_v39 "+
   "WHERE owner_digest=$1",[o.ownerDigest]);
  if(rows.rows.length!==1||Number(rows.rows[0].n)!==o.entries.length)
   throw Error("P4_G5_PREPARED_OWNER_MISSING_OR_EXTRA_QUERIES_HOLD");
  await db.query("COMMIT");tx=false;
  return {
   schema:"v39.phase4.gate5-durable-prepared-owner-v0076.v1" as const,
   status:"OWNER_AND_QUERY_GRID_PERSISTED_PREPARED_ONLY_NO_PROVIDER" as const,
   manifestSha256:o.manifestSha256,
   ownerDigest:o.ownerDigest,horizon:o.horizon,
   plannedQueryCount:o.entries.length,
   ownerRowsNewlyInserted:newlyCreated,
   activeOwnersCreated:0 as const,
   paidAttemptsCreated:0 as const,
   providerCalls:0 as const,
   authorizedProviderDispatch:false as const,
   actualGitHubRunnerIndependentlyAttestedByThisMethod:false as const,
   sourceAndRightsIndependentlyCertifiedByThisMethod:false as const,
   strictGate5Passed:false as const,
   phase5FreezeAuthorized:false as const,phase6Authorized:false as const
  };
 }catch(e){
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }
}
