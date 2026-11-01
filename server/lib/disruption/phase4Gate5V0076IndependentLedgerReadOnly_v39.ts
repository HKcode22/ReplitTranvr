/**
 * Independent cohort-scoped V0076 physical attempt ledger audit.
 * Read-only, with a caller-owned DB connection; no provider, PRE writes,
 * flight identities, source retention permit or actual-label certification.
 *
 * An unobserved horizon must stay UNOBSERVED; a PREPARED owner with zero
 * reservations is not an evidence-backed flight-data observation.
 */
import type {P4G5PhysicalOwnerV39}
 from "./phase4Gate5PhysicalOwnerDispatchGuard_v39";

const H=["T-24h","T-6h","T-90m"] as const;
const SHA=/^[a-f0-9]{64}$/;
const RUN=/^[0-9]{5,25}$/;
export type P4G5LedgerExpectedOwnerV39={
 owner:P4G5PhysicalOwnerV39;
 githubRunId:string;
 reviewedAuthorizationSha256:string;
};
export interface P4G5LedgerReadOnlyDbV39{
 query(sql:string,params?:readonly unknown[]):Promise<{rows:Record<string,unknown>[]}>;
}
const iso=(v:unknown):string=>{
 if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString();
 if(typeof v==="string"&&Number.isFinite(Date.parse(v)))
  return new Date(v).toISOString();
 throw Error("P4_G5_LEDGER_INVALID_PG_TIMESTAMP");
};
const count=(v:unknown):number=>{
 const n=typeof v==="number"?v:
  typeof v==="string"&&/^\d+$/.test(v)?Number(v):NaN;
 if(!Number.isSafeInteger(n)||n<0||n>50000)
  throw Error("P4_G5_LEDGER_INVALID_COUNTER");
 return n;
};
const row=(v:unknown):Record<string,unknown>=>{
 if(!v||typeof v!=="object"||Array.isArray(v))
  throw Error("P4_G5_LEDGER_BAD_SQL_ROW");
 return v as Record<string,unknown>;
};
export const P4_G5_LEDGER_BUDGET_SQL=[
 "SELECT manifest_sha256,cohort_id,project_unit_ceiling,reserved_units",
 "FROM clean.phase4_g5_fids_cohort_budget_v39",
 "WHERE manifest_sha256=$1"
].join(" ");
export const P4_G5_LEDGER_OWNERS_SQL=[
 "SELECT owner_digest,manifest_sha256,horizon,github_run_id,",
 "reviewed_authorization_sha256,actual_github_runner_started_at_utc,",
 "verified_prearm_deadline_utc,first_planned_dispatch_utc,",
 "last_planned_dispatch_utc,hard_owner_expires_at_utc,state",
 "FROM clean.phase4_g5_fids_physical_owner_v39",
 "WHERE manifest_sha256=$1 ORDER BY horizon"
].join(" ");
export const P4_G5_LEDGER_QUERIES_SQL=[
 "SELECT q.query_digest,q.owner_digest,q.query_index,",
 "q.planned_dispatch_utc,q.hard_latest_dispatch_utc,",
 "q.prediction_cutoff_utc,q.max_physical_attempts,q.last_reserved_attempt",
 "FROM clean.phase4_g5_fids_allowed_query_v39 q",
 "JOIN clean.phase4_g5_fids_physical_owner_v39 o",
 "ON o.owner_digest=q.owner_digest",
 "WHERE o.manifest_sha256=$1 ORDER BY q.owner_digest,q.query_index"
].join(" ");
export const P4_G5_LEDGER_ATTEMPTS_SQL=[
 "SELECT a.expected_reservation_sha256,a.owner_digest,a.query_digest,",
 "a.github_run_id,a.physical_attempt_number,a.charged_reserved_units,",
 "a.committed_at_utc",
 "FROM clean.phase4_g5_fids_physical_attempt_v39 a",
 "JOIN clean.phase4_g5_fids_physical_owner_v39 o",
 "ON o.owner_digest=a.owner_digest",
 "WHERE o.manifest_sha256=$1",
 "ORDER BY a.query_digest,a.physical_attempt_number"
].join(" ");
function expectedScope(list:readonly P4G5LedgerExpectedOwnerV39[]){
 if(!Array.isArray(list)||list.length!==3)
  throw Error("P4_G5_LEDGER_MISSING_THREE_FROZEN_OWNERS");
 const owners=new Map<string,P4G5LedgerExpectedOwnerV39>();
 const horizon=new Set<string>(), runs=new Set<string>();
 let manifest:string|undefined,cohort:string|undefined,cap:number|undefined;
 const digests=new Set<string>();
 for(const e of list){
  const o=e?.owner;
  if(!o||!H.includes(o.horizon)||!SHA.test(o.manifestSha256)||
     !SHA.test(o.ownerDigest)||!SHA.test(e.reviewedAuthorizationSha256)||
     !RUN.test(e.githubRunId)||runs.has(e.githubRunId)||
     horizon.has(o.horizon)||owners.has(o.ownerDigest)||
     o.status!=="OWNER_TIMING_PLAN_ONLY_NEEDS_TRUSTED_DURABLE_ATTEMPT_LEDGER"||
     o.actualPaidOwnerAuthorized!==false||o.entries.length===0||
     o.expectedQueries!==o.entries.length||
     !Number.isSafeInteger(o.projectRestApiUnitsBudget)||
     o.projectRestApiUnitsBudget<2||o.projectRestApiUnitsBudget>50000||
     o.perAttemptApiUnits!==2||o.maxAttemptsPerQuery<1||
     o.maxAttemptsPerQuery>3)
   throw Error("P4_G5_LEDGER_UNAPPROVED_OR_DUPLICATE_EXPECTED_OWNER");
  if(manifest!==undefined&&(manifest!==o.manifestSha256||
     cohort!==o.cohortId||cap!==o.projectRestApiUnitsBudget))
   throw Error("P4_G5_LEDGER_DIFFERENT_COHORT_OR_BUDGET");
  manifest=o.manifestSha256;cohort=o.cohortId;cap=o.projectRestApiUnitsBudget;
  runs.add(e.githubRunId);horizon.add(o.horizon);owners.set(o.ownerDigest,e);
  for(const [i,q] of o.entries.entries()){
   if(q.queryIndex!==i||q.horizon!==o.horizon||
      !SHA.test(q.queryDigest)||digests.has(q.queryDigest))
    throw Error("P4_G5_LEDGER_DUPLICATE_OR_CHANGED_FROZEN_QUERY");
   digests.add(q.queryDigest);
  }
 }
 if(horizon.size!==3||manifest===undefined)
  throw Error("P4_G5_LEDGER_MISSING_HORIZON");
 return {manifest,cohort:cohort!,cap:cap!,owners};
}
export async function auditP4G5V0076IndependentLedgerReadOnlyV39(
 db:P4G5LedgerReadOnlyDbV39,list:readonly P4G5LedgerExpectedOwnerV39[]
){
 const scope=expectedScope(list);
 let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await db.query("SET LOCAL statement_timeout='10000ms'");
  const b=await db.query(P4_G5_LEDGER_BUDGET_SQL,[scope.manifest]);
  const o=await db.query(P4_G5_LEDGER_OWNERS_SQL,[scope.manifest]);
  const q=await db.query(P4_G5_LEDGER_QUERIES_SQL,[scope.manifest]);
  const a=await db.query(P4_G5_LEDGER_ATTEMPTS_SQL,[scope.manifest]);
  if(b.rows.length!==1||o.rows.length!==3||q.rows.length>300||
     a.rows.length>900)throw Error("P4_G5_LEDGER_MISSING_OR_EXTRA_BOUND_ROWS");
  const budget=row(b.rows[0]);
  if(budget.manifest_sha256!==scope.manifest||
     budget.cohort_id!==scope.cohort||
     count(budget.project_unit_ceiling)!==scope.cap)
   throw Error("P4_G5_LEDGER_BUDGET_MANIFEST_DRIFT");
  const byOwner=new Map<string,{expected:P4G5LedgerExpectedOwnerV39;state:string}>();
  for(const raw of o.rows){
   const r=row(raw),e=scope.owners.get(String(r.owner_digest)),expected=e?.owner;
   if(!e||!expected||byOwner.has(expected.ownerDigest)||
      r.manifest_sha256!==scope.manifest||
      r.horizon!==expected.horizon||
      r.github_run_id!==e.githubRunId||
      r.reviewed_authorization_sha256!==e.reviewedAuthorizationSha256||
      iso(r.actual_github_runner_started_at_utc)!==expected.ownerActuallyObservedAtUtc||
      iso(r.verified_prearm_deadline_utc)!==expected.ownerDeadlineUtc||
      iso(r.first_planned_dispatch_utc)!==expected.entries[0].plannedPhysicalStartUtc||
      iso(r.last_planned_dispatch_utc)!==
        expected.entries[expected.entries.length-1].plannedPhysicalStartUtc||
      iso(r.hard_owner_expires_at_utc)!==
        new Date(Date.parse(expected.entries[expected.entries.length-1].plannedPhysicalStartUtc)+
          15*60000).toISOString()||
      !["PREPARED","ACTIVE","STOPPED"].includes(String(r.state)))
    throw Error("P4_G5_LEDGER_OWNER_OR_GITHUB_IDENTITY_DRIFT");
   byOwner.set(expected.ownerDigest,{expected:e,state:String(r.state)});
  }
  if(byOwner.size!==3)throw Error("P4_G5_LEDGER_INCOMPLETE_HORIZON_OWNERS");
  const byQuery=new Map<string,{ownerDigest:string;last:number;
    max:number;planned:number;latest:number;used:number}>();
  let expectedQueries=0;
  for(const owner of scope.owners.values()){
   expectedQueries+=owner.owner.entries.length;
   for(const qe of owner.owner.entries){
    byQuery.set(qe.queryDigest,{
     ownerDigest:owner.owner.ownerDigest,last:-1,
     max:owner.owner.maxAttemptsPerQuery,
     planned:Date.parse(qe.plannedPhysicalStartUtc),
     latest:Date.parse(qe.hardLatestPhysicalStartUtc),used:0
    });
   }
  }
  if(q.rows.length!==expectedQueries)
   throw Error("P4_G5_LEDGER_QUERY_GRID_INCOMPLETE");
  for(const raw of q.rows){
   const r=row(raw),e=byQuery.get(String(r.query_digest));
   const owner=scope.owners.get(String(r.owner_digest))?.owner;
   const expected=owner?.entries.find(z=>z.queryDigest===r.query_digest);
   if(!e||e.last!==-1||!owner||!expected||
      e.ownerDigest!==r.owner_digest||
      count(r.query_index)!==expected.queryIndex||
      iso(r.planned_dispatch_utc)!==expected.plannedPhysicalStartUtc||
      iso(r.hard_latest_dispatch_utc)!==expected.hardLatestPhysicalStartUtc||
      iso(r.prediction_cutoff_utc)!==expected.cutoffUtc||
      count(r.max_physical_attempts)!==e.max||
      count(r.last_reserved_attempt)>e.max)
    throw Error("P4_G5_LEDGER_QUERY_GRID_OR_SPEND_DRIFT");
   e.last=count(r.last_reserved_attempt);
  }
  let reserved=0, attempts=0;
  const perHorizon:Record<typeof H[number],{ownerState:string;plannedQueries:number;
    committedAttempts:number;reservedUnits:number;unattemptedQueries:number}>={
   "T-24h":{ownerState:"UNKNOWN",plannedQueries:0,committedAttempts:0,
     reservedUnits:0,unattemptedQueries:0},
   "T-6h":{ownerState:"UNKNOWN",plannedQueries:0,committedAttempts:0,
     reservedUnits:0,unattemptedQueries:0},
   "T-90m":{ownerState:"UNKNOWN",plannedQueries:0,committedAttempts:0,
     reservedUnits:0,unattemptedQueries:0}
  };
  for(const {expected,state} of byOwner.values()){
   const h=expected.owner.horizon;
   perHorizon[h].ownerState=state;
   perHorizon[h].plannedQueries=expected.owner.entries.length;
  }
  for(const raw of a.rows){
   const r=row(raw),qd=String(r.query_digest),e=byQuery.get(qd);
   const owner=e&&byOwner.get(e.ownerDigest);
   const number=count(r.physical_attempt_number);
   const units=count(r.charged_reserved_units);
   const commit=Date.parse(iso(r.committed_at_utc));
   if(!e||!owner||e.last===-1||
      r.owner_digest!==e.ownerDigest||
      r.github_run_id!==owner.expected.githubRunId||
      owner.state==="PREPARED"||
      number!==e.used+1||number>e.max||
      units!==2||commit<e.planned||commit>e.latest||
      r.expected_reservation_sha256!==
       createExpectedReservation(scope.manifest,e.ownerDigest,qd,number))
    throw Error("P4_G5_LEDGER_PHYSICAL_ATTEMPT_SEQUENCE_OR_CLOCK_DRIFT");
   e.used++;attempts++;reserved+=units;
   perHorizon[owner.expected.owner.horizon].committedAttempts++;
   perHorizon[owner.expected.owner.horizon].reservedUnits+=units;
  }
  for(const [qd,e] of byQuery){
   if(e.last<0||e.last!==e.used)
    throw Error("P4_G5_LEDGER_QUERY_LAST_RESERVED_MISMATCH");
   if(e.used===0){
    const h=byOwner.get(e.ownerDigest)!.expected.owner.horizon;
    perHorizon[h].unattemptedQueries++;
   }
  }
  if(reserved!==count(budget.reserved_units)||reserved>scope.cap)
   throw Error("P4_G5_LEDGER_NONREFUNDABLE_BUDGET_PARITY_HOLD");
  await db.query("COMMIT");tx=false;
  return {
   schema:"v39.phase4.gate5-v0076-independent-ledger-audit.v1" as const,
   status:attempts===0?"NO_LEDGER_PHYSICAL_ATTEMPTS_SOURCE_UNOBSERVED":
    "PHYSICAL_ATTEMPT_LEDGER_RECONCILED_SOURCE_UNVERIFIED",
   threeExactFrozenHorizonOwnersVerified:true as const,
   exactPlannedQueryCount:expectedQueries,physicalAttemptsRecorded:attempts,
   nonrefundableUnitsReserved:reserved,projectUnitCeiling:scope.cap,
   perHorizon,
   // This is not proof that zero source calls occurred outside the ledger.
   sourceRequestsOutsideLedgerExcluded:false as const,
   actualProviderHttpReceiptsReconciled:false as const,
   originalPayloadIntegrityAudited:false as const,
   certifiedPreAndOutcomesAudited:false as const,
   firstSelectedTVerified:false as const,
   actualOnlyWheelsOffVerified:false as const,
   lawfulRetentionRightsVerified:false as const,
   strictGate5Passed:false as const,
   phase5FreezeAuthorized:false as const,phase6Authorized:false as const,
   providerCalls:0 as const,databaseWrites:0 as const
  };
 }catch(err){
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  throw err;
 }
}
import {createHash} from "node:crypto";
function createExpectedReservation(m:string,o:string,q:string,n:number){
 return createHash("sha256").update([m,o,q,String(n)].join("|")).digest("hex");
}
