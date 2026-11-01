/**
 * Gate5 physically scoped FIDS attempt DB adapter (not a provider client).
 *
 * Connects the pure three-horizon physical dispatch guard to the staged
 * V0076 irrevocable reservation SQL. This module NEVER calls AeroDataBox.
 * No production workflow imports it and V0076 has NO production grants.
 *
 * An independent production admission/rights review must code-pin a real
 * future manifest, install/limit the exact DB role, and connect the sender
 * only after COMMIT + a fresh cutoff check. Successful SQL alone is NOT
 * permission for a paid GET or a certified selected T.
 */
import {assessP4G5PhysicalAttemptV39,type P4G5PhysicalOwnerV39}
 from "./phase4Gate5PhysicalOwnerDispatchGuard_v39";
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
export const P4_G5_PAID_MANIFEST_RELEASE_PIN_V39:string|null=null;
export interface P4G5ReservationDbClientV39{
 query(sql:string,params?:readonly unknown[]):Promise<{
  rows:Array<Record<string,unknown>>;rowCount:number|null
 }>;
 end():Promise<void>;
}
export interface P4G5ReservationDependenciesV39{
 openScopedClient():Promise<P4G5ReservationDbClientV39>;
 nowUtc():string;
 accountEvidence():Promise<{
  observedAtUtc:string;apiUnitsRemaining:number;requestsRemaining:number
 }>;
}
export interface P4G5PhysicalDbAttemptScopeV39{
 owner:P4G5PhysicalOwnerV39;
 queryIndex:number;physicalAttemptNumber:number;
 githubRunId:string;
 otherProjectUnitsAlreadyReserved:number;
 thisOwnerPriorPhysicalUnits:number;
 currentProjectAvailableUnits:number;
}
function ms(value:string,label:string):number{
 if(typeof value!=="string"||!ISO.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(value).toISOString()!==value)
  throw Error("P4_G5_DB_ADAPTER_UTC_HOLD:"+label);
 return Date.parse(value);
}
export function requireP4G5PaidManifestPromotionV39(owner:P4G5PhysicalOwnerV39){
 if(P4_G5_PAID_MANIFEST_RELEASE_PIN_V39===null||
    owner.manifestSha256!==P4_G5_PAID_MANIFEST_RELEASE_PIN_V39)
  throw Error("P4_G5_PAID_SOURCE_RELEASE_NOT_REVIEWED");
}
/**
 * This *low-level DB-only* method is deliberately importable for simulated
 * disposable PG tests. It does NOT call the above production release gate,
 * and its result NEVER authorizes provider dispatch.
 *
 * The actual paid GitHub operator must call requireP4G5PaidManifestPromotion
 * and authenticate source semantics, retention rights and exact job scope
 * before calling this function and adding a separate actual-HTTP adapter.
 */
export async function reserveP4G5PhysicalAttemptDbOnlyV39(
 scope:P4G5PhysicalDbAttemptScopeV39,
 deps:P4G5ReservationDependenciesV39
){
 const {owner,queryIndex,physicalAttemptNumber}=scope;
 if(!owner||owner.status!=="OWNER_TIMING_PLAN_ONLY_NEEDS_TRUSTED_DURABLE_ATTEMPT_LEDGER"||
    owner.actualPaidOwnerAuthorized!==false||
    typeof scope.githubRunId!=="string"||
    !/^[0-9]{5,25}$/.test(scope.githubRunId))
  throw Error("P4_G5_DB_ADAPTER_OWNER_OR_RUN_ID_HOLD");
 const now=deps.nowUtc(),currentMs=ms(now,"admission");
 const quota=await deps.accountEvidence();
 const observed=ms(quota.observedAtUtc,"quota");
 if(observed>currentMs+2000||currentMs-observed>30000||
    !Number.isSafeInteger(quota.apiUnitsRemaining)||
    !Number.isSafeInteger(quota.requestsRemaining)||
    quota.apiUnitsRemaining<owner.perAttemptApiUnits||
    quota.requestsRemaining<1)
  throw Error("P4_G5_DB_ADAPTER_STALE_OR_DEPLETED_FREE_QUOTA");
 const checked=assessP4G5PhysicalAttemptV39({
  owner,queryIndex,physicalAttemptNumber,
  actualReservationCommittedAtUtc:now,
  actualFetchStartUtc:now,
  currentAccountApiUnitsRemaining:quota.apiUnitsRemaining,
  currentProjectApiUnitsRemaining:scope.currentProjectAvailableUnits,
  projectUnitsAlreadyReservedForOtherSourceQueries:
   scope.otherProjectUnitsAlreadyReserved,
  accountedThisOwnerPhysicalAttemptUnits:scope.thisOwnerPriorPhysicalUnits
 });
 const client=await deps.openScopedClient();
 let tx=false,committed=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const res=await client.query(
   "SELECT clean.reserve_phase4_g5_fids_physical_attempt_v39("+
    "$1,$2,$3,$4,$5,$6) AS committed_at_utc",
   [
    owner.manifestSha256,owner.ownerDigest,scope.githubRunId,
    checked.queryDigest,physicalAttemptNumber,
    checked.expectedUniqueReservationId
   ]
  );
  if(res.rows.length!==1||!res.rows[0]||
     !res.rows[0].committed_at_utc)
   throw Error("P4_G5_DB_ADAPTER_MISSING_COMMITTED_RECEIPT");
  const t=res.rows[0].committed_at_utc;
  const committedAt=t instanceof Date?t.toISOString():String(t);
  ms(committedAt,"commit");
  await client.query("COMMIT");
  tx=false;committed=true;
  // The clock may have passed the hard cutoff during the DB transaction.
  // A valid nonrefundable journal must never justify a later network GET.
  const afterCommit=deps.nowUtc();
  const post=assessP4G5PhysicalAttemptV39({
   owner,queryIndex,physicalAttemptNumber,
   actualReservationCommittedAtUtc:committedAt,
   actualFetchStartUtc:afterCommit,
   currentAccountApiUnitsRemaining:quota.apiUnitsRemaining,
   currentProjectApiUnitsRemaining:scope.currentProjectAvailableUnits,
   projectUnitsAlreadyReservedForOtherSourceQueries:
    scope.otherProjectUnitsAlreadyReserved,
   accountedThisOwnerPhysicalAttemptUnits:scope.thisOwnerPriorPhysicalUnits
  });
  return {
   schema:"v39.phase4.gate5-db-reservation-committed-no-provider.v1" as const,
   status:"IRREVERSIBLE_DB_ATTEMPT_COMMITTED_NO_PAID_SOURCE_DISPATCH" as const,
   reservationSha256:post.expectedUniqueReservationId,
   manifestSha256:owner.manifestSha256,
   ownerDigest:owner.ownerDigest,
   queryDigest:post.queryDigest,
   physicalAttemptNumber,
   dbCommittedAtUtc:committedAt,
   freshPostCommitCutoffCheckedAtUtc:afterCommit,
   billedProviderCallMade:false as const,
   authorizedProviderDispatch:false as const,
   sourceOriginalPersisted:false as const,
   dbReservationWrites:1 as const,
   strictGate5Passed:false as const,
   phase5FreezeAuthorized:false as const,
   phase6Authorized:false as const
  };
 }catch(err){
  if(tx)await client.query("ROLLBACK").catch(()=>undefined);
  // A failed post-COMMIT safety check does NOT refund the reservation.
  // Deliberately no retry and no silent success.
  if(committed)throw Error("P4_G5_DB_ADAPTER_POSTCOMMIT_CUTOFF_HOLD_NONREFUNDABLE");
  throw err;
 }finally{
  await client.end().catch(()=>undefined);
 }
}
