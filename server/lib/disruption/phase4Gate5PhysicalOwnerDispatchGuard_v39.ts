/**
 * Phase4 Gate5: guard every *physical* FIDS attempt for an independently
 * running GitHub horizon owner. This is the reusable pure dispatch guard,
 * NOT the authenticated database reservation or the provider HTTP adapter.
 *
 * The old October31 dated cron may not be used to "catch up" a missed slot.
 * One expired slot remains UNOBSERVED; later arrivals cannot repair it.
 */
import {createHash} from "node:crypto";
import {
 draftP4Gate5ThreeHorizonGridV39,
 type P4Gate5GridDraftInputV39,
 type P4Gate5GridHorizonV39
} from "./phase4Gate5FrozenGridDraft_v39";

export const P4_G5_PHYSICAL_DISPATCH_SCHEMA_V39=
 "v39.phase4.gate5-physical-source-dispatch-guard.v1" as const;
export const P4_G5_OWNER_HORIZONS_V39=["T-24h","T-6h","T-90m"] as const;
const HORIZON_JOBS={
 "T-24h":"owner-t24",
 "T-6h":"owner-t6",
 "T-90m":"owner-t90"
} as const;
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
function at(value:string,label:string):number{
 if(typeof value!=="string"||!UTC.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(value).toISOString()!==value)
  throw Error("P4_PHYSICAL_INVALID_UTC:"+label);
 return Date.parse(value);
}
export interface P4G5PhysicalOwnerPlanInputV39{
 cohortId:string;
 frozenManifestBytes:string;
 reviewedManifestSha256:string;
 grid:P4Gate5GridDraftInputV39;
 horizon:P4Gate5GridHorizonV39;
 // The timestamp at which this specific GitHub job really began its
 // runtime process (not a cron due time, PR merge time or owner claim).
 actualOwnerProcessStartedAtUtc:string;
}
export function prepareP4G5PhysicalOwnerV39(input:P4G5PhysicalOwnerPlanInputV39){
 if(!input||typeof input.cohortId!=="string"||
    !/^[A-Z][A-Z0-9_-]{7,79}$/.test(input.cohortId)||
    typeof input.frozenManifestBytes!=="string"||
    input.frozenManifestBytes.length>20000||
    !SHA.test(input.reviewedManifestSha256)||
    !P4_G5_OWNER_HORIZONS_V39.includes(input.horizon))
  throw Error("P4_PHYSICAL_NO_REVIEWED_MANIFEST_OR_OWNER");
 const hash=createHash("sha256").update(input.frozenManifestBytes).digest("hex");
 if(hash!==input.reviewedManifestSha256)
  throw Error("P4_PHYSICAL_MANIFEST_SHA_MISMATCH");
 let manifest:unknown;
 try{manifest=JSON.parse(input.frozenManifestBytes)}catch{
  throw Error("P4_PHYSICAL_MANIFEST_PARSE_HOLD");
 }
 if(!manifest||typeof manifest!=="object"||Array.isArray(manifest)||
    input.frozenManifestBytes!==
      JSON.stringify(manifest,null,2)+"\n")
  throw Error("P4_PHYSICAL_MANIFEST_BYTES_NOT_CANONICAL");
 const m=manifest as Record<string,unknown>;
 if(m.cohortId!==input.cohortId||
    JSON.stringify(m.grid)!==JSON.stringify(input.grid))
  throw Error("P4_PHYSICAL_COHORT_OR_GRID_MISMATCH");
 const grid=draftP4Gate5ThreeHorizonGridV39(input.grid);
 if(input.grid.acquisitionGuardMinutes<15)
  throw Error("P4_PHYSICAL_HARD_CUTOFF_GUARD_HOLD");
 const owner=grid.horizonOwners.find(x=>x.horizon===input.horizon);
 if(!owner)throw Error("P4_PHYSICAL_HORIZON_MISSING");
 const queries=grid.queries.filter(x=>x.horizon===input.horizon);
 if(queries.length!==owner.queryCount||!queries.length)
  throw Error("P4_PHYSICAL_QUERY_COUNT_HOLD");
 const start=at(input.actualOwnerProcessStartedAtUtc,"actualStart");
 const open=at(owner.earliestPhysicalStartUtc,"first")-
  Math.min(240,330-
   (at(owner.latestPhysicalStartUtc,"last")-
    at(owner.earliestPhysicalStartUtc,"first"))/60000)*60000;
 const deadline=at(owner.verifiedPrearmDeadlineUtc,"deadline");
 // Actual running process must have been observed BEFORE the deadline.
 // If a GitHub cron is late, no retrospective proof may be constructed.
 if(start<open||start>deadline)
  throw Error("P4_PHYSICAL_GITHUB_OWNER_NOT_ACTUALLY_PREARMED");
 const querySlots=queries.map((q,i)=>({
  queryIndex:i,
  horizon:input.horizon,
  queryDigest:createHash("sha256").update([
   hash,input.cohortId,input.horizon,String(i),
   q.candidateGridCutoffUtc,q.plannedPhysicalStartUtc,
   q.providerQueryFromLocal,q.providerQueryToLocal
  ].join("|")).digest("hex"),
  plannedPhysicalStartUtc:q.plannedPhysicalStartUtc,
  cutoffUtc:q.candidateGridCutoffUtc,
  hardLatestPhysicalStartUtc:new Date(
   at(q.candidateGridCutoffUtc,"cutoff")-15*60000).toISOString(),
  sourceFromLocal:q.providerQueryFromLocal,
  sourceToLocal:q.providerQueryToLocal,
  sourceAirportIcao:q.sourceAirportIcao
 }));
 const ownerDigest=createHash("sha256").update([
  hash,input.cohortId,input.horizon,owner.earliestPhysicalStartUtc,
  owner.latestPhysicalStartUtc,String(owner.queryCount)
 ].join("|")).digest("hex");
 return {
  schema:P4_G5_PHYSICAL_DISPATCH_SCHEMA_V39,
  status:"OWNER_TIMING_PLAN_ONLY_NEEDS_TRUSTED_DURABLE_ATTEMPT_LEDGER" as const,
  manifestSha256:hash,cohortId:input.cohortId,
  horizon:input.horizon,githubJob:HORIZON_JOBS[input.horizon],
  ownerDigest,
  ownerActuallyObservedAtUtc:input.actualOwnerProcessStartedAtUtc,
  ownerDeadlineUtc:owner.verifiedPrearmDeadlineUtc,
  entries:querySlots,
  expectedQueries:queries.length,
  maxAttemptsPerQuery:input.grid.maxAttemptsPerQuery,
  perAttemptApiUnits:input.grid.apiUnitsPerPhysicalAttempt,
  horizonWorstCaseApiUnits:queries.length*
   input.grid.maxAttemptsPerQuery*input.grid.apiUnitsPerPhysicalAttempt,
  fullGridWorstCaseApiUnits:grid.expectedMaxApiUnits,
  projectRestApiUnitsBudget:input.grid.projectRestApiUnitsBudget,
  actualPaidOwnerAuthorized:false as const,
  sourceOriginalStored:false as const,
  strictGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const
 };
}
export type P4G5PhysicalOwnerV39=ReturnType<typeof prepareP4G5PhysicalOwnerV39>;
export interface P4G5PhysicalAttemptInputV39{
 owner:P4G5PhysicalOwnerV39;
 queryIndex:number;
 physicalAttemptNumber:number;
 actualReservationCommittedAtUtc:string;
 actualFetchStartUtc:string;
 // These must be re-measured immediately before the *real* provider GET.
 // A pure validation cannot authenticate this evidence.
 currentAccountApiUnitsRemaining:number;
 currentProjectApiUnitsRemaining:number;
 projectUnitsAlreadyReservedForOtherSourceQueries:number;
 accountedThisOwnerPhysicalAttemptUnits:number;
 // An actual paid adapter MUST implement DB-enforced unique reservation of
 // (manifestSha256, ownerDigest, queryDigest, attempt number) before GET.
 // A local Set is insufficient for retry/crash/repeated GitHub processes.
}
function nonnegative(n:number,label:string){
 if(!Number.isSafeInteger(n)||n<0)
  throw Error("P4_PHYSICAL_INVALID_LEDGER_NUMBER:"+label);
}
export function assessP4G5PhysicalAttemptV39(x:P4G5PhysicalAttemptInputV39){
 if(!x||!x.owner||!Number.isSafeInteger(x.queryIndex)||
    x.queryIndex<0||x.queryIndex>=x.owner.entries.length)
  throw Error("P4_PHYSICAL_UNKNOWN_QUERY");
 if(!Number.isSafeInteger(x.physicalAttemptNumber)||
    x.physicalAttemptNumber<1||
    x.physicalAttemptNumber>x.owner.maxAttemptsPerQuery)
  throw Error("P4_PHYSICAL_ATTEMPT_LIMIT_HOLD");
 const row=x.owner.entries[x.queryIndex];
 const reserved=at(x.actualReservationCommittedAtUtc,"reservation");
 const physical=at(x.actualFetchStartUtc,"fetch");
 const planned=at(row.plannedPhysicalStartUtc,"planned");
 const latest=at(row.hardLatestPhysicalStartUtc,"latest");
 const cutoff=at(row.cutoffUtc,"cutoff");
 if(reserved>physical||
    physical<planned||
    physical>latest||
    latest>cutoff-15*60000||
    physical<at(x.owner.ownerActuallyObservedAtUtc,"ownerStart"))
  throw Error("P4_PHYSICAL_MISSED_OR_EARLY_CUTOFF_NO_RETRY");
 for(const [name,v] of [
  ["account",x.currentAccountApiUnitsRemaining],
  ["project",x.currentProjectApiUnitsRemaining],
  ["other",x.projectUnitsAlreadyReservedForOtherSourceQueries],
  ["owner",x.accountedThisOwnerPhysicalAttemptUnits]
 ] as const)nonnegative(v,name);
 const per=x.owner.perAttemptApiUnits;
 if(x.currentAccountApiUnitsRemaining<per||
    x.currentProjectApiUnitsRemaining<per||
    x.projectUnitsAlreadyReservedForOtherSourceQueries+
     x.owner.fullGridWorstCaseApiUnits>x.owner.projectRestApiUnitsBudget||
    x.accountedThisOwnerPhysicalAttemptUnits+per>
      x.owner.horizonWorstCaseApiUnits)
  throw Error("P4_PHYSICAL_CYCLE_OR_PROJECT_BUDGET_HOLD");
 const reservationId=createHash("sha256").update([
  x.owner.manifestSha256,x.owner.ownerDigest,row.queryDigest,
  String(x.physicalAttemptNumber)
 ].join("|")).digest("hex");
 return {
  schema:"v39.phase4.gate5-physical-attempt-checked-not-sent.v1" as const,
  status:"TIMING_AND_COST_CHECKED_DURABLE_DB_RESERVATION_STILL_REQUIRED" as const,
  manifestSha256:x.owner.manifestSha256,
  ownerDigest:x.owner.ownerDigest,
  queryDigest:row.queryDigest,
  expectedUniqueReservationId:reservationId,
  physicalAttemptNumber:x.physicalAttemptNumber,
  actualFetchStartUtc:x.actualFetchStartUtc,
  fullGridWorstCaseApiUnits:x.owner.fullGridWorstCaseApiUnits,
  // CRITICAL: no caller can treat this pure return as a provider permit.
  durableDbUniqueAttemptReservationProven:false as const,
  authorizedProviderDispatch:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  strictGate5Passed:false as const
 };
}
export function assertP4G5OwnerGitHubContextV39(
 e:NodeJS.ProcessEnv,actualCheckoutSha:string,horizon:P4Gate5GridHorizonV39
){
 const repo="HKcode22/ReplitTranvr";
 const workflow=repo+
  "/.github/workflows/phase4-gate5-three-physical-owner-rehearsal.yml@refs/heads/main";
 if(!P4_G5_OWNER_HORIZONS_V39.includes(horizon)||
    e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==repo||
    e.GITHUB_EVENT_NAME!=="push"||e.GITHUB_REF!=="refs/heads/main"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_JOB!==HORIZON_JOBS[horizon]||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 Three GitHub Physical Owner Rehearsal"||
    e.GITHUB_WORKFLOW_REF!==workflow||
    !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??"")||
    actualCheckoutSha!==e.GITHUB_SHA||
    e.P4_G5_OWNER_REHEARSAL_INTENT!=="SIMULATED_TIMES_NO_PROVIDER"||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    !!e.V39_DATABASE_RUNTIME_URL||!!e.GATE05_AUTOMATION_DATABASE_URL||
    !!e.DATABASE_URL)
  throw Error("P4_PHYSICAL_GITHUB_REHEARSAL_CONTEXT_OR_SECRETS_HOLD");
}
