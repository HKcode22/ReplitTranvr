/**
 * ONE incident-specific, zero-spend continuation of the Nov6 09Z WSSS T-24h
 * GitHub source owner after human cancellation on 2026-11-05 05:39Z.
 *
 * No new V0076 owner, reservation, source Content, migration, or paid GET here.
 * The existing immutable V0076 owner remains attributed to its original run;
 * the new, independently attested GitHub delegate is recorded in its job log.
 * The caller MUST hold the dedicated session advisory lock until collection
 * ends, so parallel cron backups cannot compete as delegates.
 *
 * Never use this for another cohort, another canceled run, any reservation,
 * unknown provider spend or any previously missed source window.
 */
import {createHash} from "node:crypto";
import {isP4G5ReviewedMainWorkflowRestPathV39}
 from "./phase4Gate5GithubRestPathGuard_v39";
import type {P4G5PhysicalOwnerV39}
 from "./phase4Gate5PhysicalOwnerDispatchGuard_v39";

const REPO="HKcode22/ReplitTranvr";
const WORKFLOW=".github/workflows/phase4-gate5-g5a-nov06-real-wsss-prospective-owner.yml";
const NAME="Phase4 Gate5 G5A Nov6 WSSS Real Prospective GitHub Owner";
const ORIGINAL_RUN="41972339194";
const ORIGINAL_JOB=127063231967;
const ORIGINAL_SHA="a509e336d50afd69e497595c6820c5b053693a5e";
const COHORT="WSSS_G5A_20261106_0900Z";
const MANIFEST="7fe022a475447a082e1ccddd3805a5ad554f03885401afb22ee283a2a1b90aed";
const FIRST_PAID=Date.parse("2026-11-05T08:30:00.000Z");
// Note: 00:30 PST is 08:30Z after the November 1 DST transition.
const sha=(x:string)=>createHash("sha256").update(x).digest("hex");
const iso=(x:unknown):string=>{
 const time=x instanceof Date?x.getTime():Date.parse(String(x));
 if(!Number.isFinite(time))throw Error("P4_G5_G5A_CANCEL_HANDOFF_TIME_HOLD");
 return new Date(time).toISOString();
};
function hold():never{
 throw Error("P4_G5_G5A_NOV06_CANCELLED_OWNER_ZERO_SPEND_HANDOFF_HOLD");
}
type Db={query:(sql:string,args?:readonly unknown[])=>Promise<{rows:any[]}>};
export type CancelledT24Evidence={
 originalRunId:string;originalJobId:number;originalSha:string;
 originalEvent:string;originalAttempt:number;originalStatus:string;
 originalConclusion:string;originalJobStatus:string;originalJobConclusion:string;
 originalRunStarted:string;originalJobStarted:string;originalJobCompleted:string;
 originalName:string;originalPathAccepted:boolean;originalBranch:string;
 currentRunId:string;currentJobStarted:string;prearmDeadline:string;
 firstPaidStart:string;existingOwnerState:string;existingOwnerRunId:string;
 ownerAuthorizationMatched:boolean;allowedQueriesMatched:number;
 totalPaidReservations:number;reservedProjectUnits:number;
 projectUnitCeiling:number;
};
export function assertCancelledNov06T24HandoffV39(v:CancelledT24Evidence){
 const r=Date.parse(v.originalRunStarted),s=Date.parse(v.originalJobStarted),
  e=Date.parse(v.originalJobCompleted),n=Date.parse(v.currentJobStarted),
  d=Date.parse(v.prearmDeadline),first=Date.parse(v.firstPaidStart);
 if(v.originalRunId!==ORIGINAL_RUN||v.originalJobId!==ORIGINAL_JOB||
    v.originalSha!==ORIGINAL_SHA||v.originalEvent!=="workflow_dispatch"||
    v.originalAttempt!==1||v.originalStatus!=="completed"||
    v.originalConclusion!=="cancelled"||
    v.originalJobStatus!=="completed"||
    v.originalJobConclusion!=="cancelled"||
    v.originalName!==NAME||v.originalPathAccepted!==true||
    v.originalBranch!=="main"||v.currentRunId===ORIGINAL_RUN||
    !/^\d{5,25}$/.test(v.currentRunId)||
    v.existingOwnerState!=="ACTIVE"||
    v.existingOwnerRunId!==ORIGINAL_RUN||
    !v.ownerAuthorizationMatched||v.allowedQueriesMatched!==3||
    v.totalPaidReservations!==0||v.reservedProjectUnits!==0||
    v.projectUnitCeiling!==24||
    ![r,s,e,n,d,first].every(Number.isFinite)||
    first!==FIRST_PAID||r>s||s>=e||e>n||e>=first||
    n>d||n>=first||d>=first)
   hold();
 return true as const;
}
export async function proveCancelledNov06T24ZeroSpendV39(input:{
 db:Db;token:string;owner:P4G5PhysicalOwnerV39;
 manifestSha:string;rightsSha:string;protocolSha:string;
 currentRunId:string;currentJobStarted:string;
 fetchJson?:(path:string)=>Promise<any>;
}):Promise<{
 status:"G5A_NOV06_CANCELLED_T24_ZERO_SPEND_GITHUB_DELEGATE_VERIFIED";
 boundRunId:string;boundAuthorizationSha:string;
 originalRunId:string;currentRunId:string;
 noPaidReservation:true;
}>{
 if(input.owner.horizon!=="T-24h"||
    input.owner.cohortId!==COHORT||
    input.manifestSha!==MANIFEST||
    input.owner.manifestSha256!==MANIFEST||
    input.owner.entries.length!==3||
    !/^[a-f0-9]{64}$/.test(input.rightsSha)||
    !/^[a-f0-9]{64}$/.test(input.protocolSha))hold();

 const fetchJson=input.fetchJson??(async(path:string)=>{
  const response=await fetch("https://api.github.com/repos/"+REPO+path,{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(9000),
   headers:{Accept:"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"g5a-nov06-cancelled-t24-no-spend-recovery",
    Authorization:"Bearer "+input.token}
  });
  if(!response.ok)hold();
  return response.json();
 });
 const [run,jobs,owners,queries,attempts,budgets]=await Promise.all([
  fetchJson("/actions/runs/"+ORIGINAL_RUN),
  fetchJson("/actions/runs/"+ORIGINAL_RUN+"/jobs?per_page=100"),
  input.db.query(
   "SELECT state,github_run_id,reviewed_authorization_sha256,"+
   "actual_github_runner_started_at_utc,verified_prearm_deadline_utc "+
   "FROM clean.phase4_g5_fids_physical_owner_v39 "+
   "WHERE owner_digest=$1 AND manifest_sha256=$2 AND horizon='T-24h'",
   [input.owner.ownerDigest,MANIFEST]),
  input.db.query(
   "SELECT query_index,query_digest,planned_dispatch_utc,"+
   "hard_latest_dispatch_utc,prediction_cutoff_utc,max_physical_attempts,"+
   "last_reserved_attempt FROM clean.phase4_g5_fids_allowed_query_v39 "+
   "WHERE owner_digest=$1 ORDER BY query_index",
   [input.owner.ownerDigest]),
  input.db.query(
   "SELECT count(*)::int AS n FROM clean.phase4_g5_fids_physical_attempt_v39 "+
   "WHERE owner_digest=$1",[input.owner.ownerDigest]),
  input.db.query(
   "SELECT cohort_id,reserved_units,project_unit_ceiling "+
   "FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$1",[MANIFEST])
 ]);
 if(!run||run.id!==Number(ORIGINAL_RUN)||
    run.repository?.full_name!==REPO||!jobs||
    !Array.isArray(jobs.jobs)||owners.rows.length!==1||
    queries.rows.length!==3||attempts.rows.length!==1||
    budgets.rows.length!==1||budgets.rows[0].cohort_id!==COHORT)
  hold();
 const matched=jobs.jobs.filter((x:any)=>x.name==="owner-t24");
 if(matched.length!==1||matched[0].id!==ORIGINAL_JOB||
    matched[0].run_id!==Number(ORIGINAL_RUN))hold();
 const job=matched[0],owner=owners.rows[0];
 const githubProofSha=sha(JSON.stringify({
  githubRunId:ORIGINAL_RUN,gitSha:ORIGINAL_SHA,
  runStartedAtUtc:iso(run.run_started_at),
  jobStartedAtUtc:iso(job.started_at),jobName:"owner-t24",
  workflowPath:run.path
 }));
 const oldAuthorization=sha(JSON.stringify({
  mode:"G5A_REPORTED_SCHEDULE_REVISION",manifestSha:MANIFEST,
  gitSha:ORIGINAL_SHA,githubRunId:ORIGINAL_RUN,
  verifiedGitHubRunSha256:githubProofSha,
  rightsScopeSha256:input.rightsSha,
  g5aProtocolSha256:input.protocolSha
 }));
 let matchedQueries=0;
 for(const [i,row] of queries.rows.entries()){
  const q=input.owner.entries[i];
  if(q&&Number(row.query_index)===q.queryIndex&&
     row.query_digest===q.queryDigest&&
     iso(row.planned_dispatch_utc)===q.plannedPhysicalStartUtc&&
     iso(row.hard_latest_dispatch_utc)===q.hardLatestPhysicalStartUtc&&
     iso(row.prediction_cutoff_utc)===q.cutoffUtc&&
     Number(row.max_physical_attempts)===1&&
     Number(row.last_reserved_attempt)===0)matchedQueries++;
 }
 assertCancelledNov06T24HandoffV39({
  originalRunId:String(run.id),originalJobId:Number(job.id),
  originalSha:String(run.head_sha),originalEvent:String(run.event),
  originalAttempt:Number(run.run_attempt),originalStatus:String(run.status),
  originalConclusion:String(run.conclusion),
  originalJobStatus:String(job.status),
  originalJobConclusion:String(job.conclusion),
  originalRunStarted:iso(run.run_started_at),
  originalJobStarted:iso(job.started_at),
  originalJobCompleted:iso(job.completed_at),
  originalName:String(run.name),
  originalPathAccepted:isP4G5ReviewedMainWorkflowRestPathV39(run.path,WORKFLOW),
  originalBranch:String(run.head_branch),
  currentRunId:input.currentRunId,currentJobStarted:input.currentJobStarted,
  prearmDeadline:input.owner.ownerDeadlineUtc,
  firstPaidStart:input.owner.entries[0].plannedPhysicalStartUtc,
  existingOwnerState:String(owner.state),
  existingOwnerRunId:String(owner.github_run_id),
  ownerAuthorizationMatched:
   owner.reviewed_authorization_sha256===oldAuthorization&&
   iso(owner.actual_github_runner_started_at_utc)===iso(job.started_at)&&
   iso(owner.verified_prearm_deadline_utc)===input.owner.ownerDeadlineUtc,
  allowedQueriesMatched:matchedQueries,
  totalPaidReservations:Number(attempts.rows[0].n),
  reservedProjectUnits:Number(budgets.rows[0].reserved_units),
  projectUnitCeiling:Number(budgets.rows[0].project_unit_ceiling)
 });
 return {
  status:"G5A_NOV06_CANCELLED_T24_ZERO_SPEND_GITHUB_DELEGATE_VERIFIED",
  boundRunId:ORIGINAL_RUN,boundAuthorizationSha:oldAuthorization,
  originalRunId:ORIGINAL_RUN,currentRunId:input.currentRunId,
  noPaidReservation:true
 };
}
