/** Post-freeze INFRASTRUCTURE-ONLY recovery for the 2026-11-04 T-24h
 * verified prearm which terminated via PG 57P01 while idle. No new owner,
 * no source/label edits, no provider access until existing V0076 constraints.
 * Refuses all other owners, any reservation, unknown/ongoing GH jobs, drift.
 */
import {createHash} from "node:crypto";
import type {P4G5PhysicalOwnerV39}
 from "./phase4Gate5PhysicalOwnerDispatchGuard_v39";
const ORIGINAL_RUN="41810504164";
const ORIGINAL_SHA="266ec47814bfb5482902eeb94dd83e4bc0975e3e";
const REPO="HKcode22/ReplitTranvr";
const NAME="Phase4 Gate5 G5A WSSS Real Prospective GitHub Owner";
const PATH=".github/workflows/phase4-gate5-g5a-real-wsss-prospective-owner.yml";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const iso=(x:unknown)=>x instanceof Date?x.toISOString():String(x);
const fail=():never=>{throw Error("P4_G5_G5A_57P01_ORIGINAL_OWNER_RECOVERY_HOLD");};
type Db={query:(q:string,p?:unknown[])=>Promise<{rows:any[]}>};
export type RecoveryProof={
 status:"G5A_VERIFIED_FAILED_T24_OWNER_ZERO_RESERVATION_HANDOFF";
 originalRunId:string;originalAuthorizationSha256:string;
 noNewOwnerRow:true;noPaidAttemptsBeforeHandoff:true;
};
export function verifyG5AT24RecoveryEvidenceV39(a:{
 originalRunId:string;newRunId:string;newJobStartedAtUtc:string;
 oldSha:string;oldRunName:string;oldRunPath:string;oldRunEvent:string;
 oldRunAttempt:number;oldRunState:string;oldRunConclusion:string;
 oldRunStartedAtUtc:string;oldJobState:string;oldJobConclusion:string;
 oldJobStartedAtUtc:string;oldJobCompletedAtUtc:string;
 oldOwnerState:string;oldOwnerJobStartUtc:string;oldAuthMatches:boolean;
 prearmDeadlineUtc:string;attempts:number;reservedUnits:number;matchingQueries:number;
}){
 const oldStart=Date.parse(a.oldJobStartedAtUtc),oldRun=Date.parse(a.oldRunStartedAtUtc),
  oldEnd=Date.parse(a.oldJobCompletedAtUtc),newStart=Date.parse(a.newJobStartedAtUtc),
  deadline=Date.parse(a.prearmDeadlineUtc);
 if(a.originalRunId!==ORIGINAL_RUN||a.newRunId===ORIGINAL_RUN||
  a.oldSha!==ORIGINAL_SHA||a.oldRunName!==NAME||a.oldRunPath!==PATH||
  a.oldRunEvent!=="workflow_dispatch"||a.oldRunAttempt!==1||
  a.oldRunState!=="completed"||a.oldRunConclusion!=="failure"||
  a.oldJobState!=="completed"||a.oldJobConclusion!=="failure"||
  a.oldOwnerState!=="ACTIVE"||
  a.oldOwnerJobStartUtc!==a.oldJobStartedAtUtc||!a.oldAuthMatches||
  a.matchingQueries!==3||a.attempts!==0||a.reservedUnits!==0||
  ![oldStart,oldRun,oldEnd,newStart,deadline].every(Number.isFinite)||
  oldRun>oldStart||oldStart>deadline||oldEnd<=oldStart||
  oldEnd>newStart||newStart>deadline)fail();
 return true as const;
}
export async function proveAndBindFailedG5AT24OwnerV39(input:{
 db:Db;token:string;owner:P4G5PhysicalOwnerV39;
 horizon:string;newRunId:string;newJobStartedAtUtc:string;
 manifestSha:string;rightsSha:string;protocolSha:string;
 fetchJson?:(path:string)=>Promise<any>;
}):Promise<RecoveryProof>{
 if(input.horizon!=="T-24h"||
   input.owner.horizon!=="T-24h"||input.newRunId===ORIGINAL_RUN||
   input.owner.entries.length!==3||input.manifestSha!==input.owner.manifestSha256||
   !/^[a-f0-9]{64}$/.test(input.rightsSha)||
   !/^[a-f0-9]{64}$/.test(input.protocolSha))fail();
 const fetchJson=input.fetchJson??(async(path:string)=>{
  const response=await fetch("https://api.github.com/repos/"+REPO+path,{
   method:"GET",redirect:"error",signal:AbortSignal.timeout(9000),
   headers:{Accept:"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"g5a-verified-crashed-owner-handoff",
    Authorization:"Bearer "+input.token}
  });
  if(!response.ok)fail();
  return response.json();
 });
 const [run,jobs,owner,allowed,attempts,budget]=await Promise.all([
  fetchJson("/actions/runs/"+ORIGINAL_RUN),
  fetchJson("/actions/runs/"+ORIGINAL_RUN+"/jobs?per_page=100"),
  input.db.query("SELECT state,github_run_id,reviewed_authorization_sha256,"+
   "actual_github_runner_started_at_utc FROM clean.phase4_g5_fids_physical_owner_v39 "+
   "WHERE owner_digest=$1 AND manifest_sha256=$2",
   [input.owner.ownerDigest,input.manifestSha]),
  input.db.query("SELECT query_digest,query_index,planned_dispatch_utc,"+
   "hard_latest_dispatch_utc,prediction_cutoff_utc,max_physical_attempts,"+
   "last_reserved_attempt FROM clean.phase4_g5_fids_allowed_query_v39 "+
   "WHERE owner_digest=$1 ORDER BY query_index",
   [input.owner.ownerDigest]),
  input.db.query("SELECT count(*)::int AS n FROM clean.phase4_g5_fids_physical_attempt_v39 "+
   "WHERE owner_digest=$1",[input.owner.ownerDigest]),
  input.db.query("SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39 "+
   "WHERE manifest_sha256=$1",[input.manifestSha])
 ]);
 if(!run||!jobs||!Array.isArray(jobs.jobs)||
  run.repository?.full_name!==REPO||run.head_branch!=="main"||
  run.id!==Number(ORIGINAL_RUN)||owner.rows.length!==1||
  attempts.rows.length!==1||budget.rows.length!==1||
  allowed.rows.length!==3)fail();
 const matched=jobs.jobs.filter((j:any)=>j?.name==="owner-t24");
 if(matched.length!==1||matched[0].run_id!==Number(ORIGINAL_RUN))fail();
 const job=matched[0],o=owner.rows[0];
 const originalProofSha=sha(JSON.stringify({
  githubRunId:ORIGINAL_RUN,gitSha:ORIGINAL_SHA,
  runStartedAtUtc:iso(run.run_started_at),
  jobStartedAtUtc:iso(job.started_at),jobName:"owner-t24",
  workflowPath:run.path
 }));
 const originalAuthSha=sha(JSON.stringify({
  mode:"G5A_REPORTED_SCHEDULE_REVISION",
  manifestSha:input.manifestSha,gitSha:ORIGINAL_SHA,
  githubRunId:ORIGINAL_RUN,
  verifiedGitHubRunSha256:originalProofSha,
  rightsScopeSha256:input.rightsSha,
  g5aProtocolSha256:input.protocolSha
 }));
 let matching=0;
 for(const [i,record] of allowed.rows.entries()){
  const q=input.owner.entries[i];
  if(q&&record.query_digest===q.queryDigest&&
    Number(record.query_index)===q.queryIndex&&
    iso(record.planned_dispatch_utc)===q.plannedPhysicalStartUtc&&
    iso(record.hard_latest_dispatch_utc)===q.hardLatestPhysicalStartUtc&&
    iso(record.prediction_cutoff_utc)===q.cutoffUtc&&
    Number(record.max_physical_attempts)===1&&
    Number(record.last_reserved_attempt)===0)matching++;
 }
 verifyG5AT24RecoveryEvidenceV39({
  originalRunId:String(o.github_run_id),newRunId:input.newRunId,
  newJobStartedAtUtc:input.newJobStartedAtUtc,
  oldSha:String(run.head_sha),oldRunName:String(run.name),
  oldRunPath:String(run.path),oldRunEvent:String(run.event),
  oldRunAttempt:Number(run.run_attempt),oldRunState:String(run.status),
  oldRunConclusion:String(run.conclusion),
  oldRunStartedAtUtc:iso(run.run_started_at),
  oldJobState:String(job.status),oldJobConclusion:String(job.conclusion),
  oldJobStartedAtUtc:iso(job.started_at),
  oldJobCompletedAtUtc:iso(job.completed_at),
  oldOwnerState:String(o.state),
  oldOwnerJobStartUtc:iso(o.actual_github_runner_started_at_utc),
  oldAuthMatches:o.reviewed_authorization_sha256===originalAuthSha,
  prearmDeadlineUtc:input.owner.ownerDeadlineUtc,
  attempts:Number(attempts.rows[0].n),
  reservedUnits:Number(budget.rows[0].reserved_units),
  matchingQueries:matching
 });
 return {status:"G5A_VERIFIED_FAILED_T24_OWNER_ZERO_RESERVATION_HANDOFF",
  originalRunId:ORIGINAL_RUN,originalAuthorizationSha256:originalAuthSha,
  noNewOwnerRow:true,noPaidAttemptsBeforeHandoff:true};
}
