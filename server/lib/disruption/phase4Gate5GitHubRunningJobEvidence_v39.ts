/**
 * Phase4 Gate5: independent GitHub-API evidence of a RUNNING Actions job.
 * This module validates evidence only. It cannot verify provider rights,
 * activate V0076, authorize collection, or prove future horizon prearming
 * from a short rehearsal. The caller must independently fetch GitHub API
 * metadata in its own GitHub process; arbitrary user-supplied JSON is not
 * authenticated by this pure function.
 */
import {assertP4G5OwnerGitHubContextV39}
 from "./phase4Gate5PhysicalOwnerDispatchGuard_v39";
import type {P4Gate5GridHorizonV39}
 from "./phase4Gate5FrozenGridDraft_v39";

const REPO="HKcode22/ReplitTranvr";
const WORKFLOW="Phase4 Gate5 Three GitHub Physical Owner Rehearsal";
const SHA=/^[a-f0-9]{40}$/;
const RUN_ID=/^[0-9]{5,25}$/;
const TIMES=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const HORIZONS={
 "owner-t24":"T-24h",
 "owner-t6":"T-6h",
 "owner-t90":"T-90m"
} as const;
type ObjectLike=Record<string,unknown>;
function obj(v:unknown):ObjectLike {
 if(v===null||typeof v!=="object"||Array.isArray(v))
  throw Error("P4_G5_GITHUB_API_EVIDENCE_HOLD");
 return v as ObjectLike;
}
function strictTime(v:unknown):number {
 if(typeof v!=="string"||!TIMES.test(v))throw Error("P4_G5_GITHUB_API_TIME_HOLD");
 const n=Date.parse(v);
 if(!Number.isFinite(n))throw Error("P4_G5_GITHUB_API_TIME_HOLD");
 return n;
}
function validId(v:unknown):boolean {
 return typeof v==="number"&&Number.isSafeInteger(v)&&v>0;
}
export function attestP4G5RunningRehearsalJobV39(
 env:NodeJS.ProcessEnv,checkoutSha:string,runRaw:unknown,jobRaw:unknown,
 observedAtUtc:string,verifiedAtUtc:string
){
 const jobName=env.GITHUB_JOB;
 if(jobName!=="owner-t24"&&jobName!=="owner-t6"&&jobName!=="owner-t90")
  throw Error("P4_G5_GITHUB_UNKNOWN_OWNER_JOB_HOLD");
 const horizon:H4=HORIZONS[jobName];
 assertP4G5OwnerGitHubContextV39(env,checkoutSha,horizon);
 if(!RUN_ID.test(env.GITHUB_RUN_ID??"")||!SHA.test(checkoutSha))
  throw Error("P4_G5_GITHUB_IDENTITY_MISSING_HOLD");
 const run=obj(runRaw),job=obj(jobRaw),rrepo=obj(run.repository);
 const runId=Number(env.GITHUB_RUN_ID);
 const started=strictTime(job.started_at);
 const runCreated=strictTime(run.created_at);
 const runStarted=strictTime(run.run_started_at);
 const observed=strictTime(observedAtUtc);
 const verified=strictTime(verifiedAtUtc);
 // This proof is valid only while THIS independently checked job is active.
 // An Actions success elsewhere is not evidence of actual early prearming.
 if(!validId(run.id)||run.id!==runId||
    run.run_attempt!==1||run.event!=="push"||
    run.head_branch!=="main"||run.head_sha!==checkoutSha||
    run.name!==WORKFLOW||rrepo.full_name!==REPO||
    run.status!=="in_progress"||run.conclusion!==null||
    !validId(job.id)||job.run_id!==runId||
    job.name!==jobName||job.status!=="in_progress"||
    job.conclusion!==null||
    (typeof job.head_sha==="string"&&job.head_sha!==checkoutSha)||
    (typeof job.workflow_name==="string"&&job.workflow_name!==WORKFLOW)||
    runCreated>runStarted||runStarted>started||
    started>observed||observed>verified||
    observed-started>15*60000||
    verified-observed>2*60000||
    (env.GITHUB_RUN_NUMBER&&
      Number(env.GITHUB_RUN_NUMBER)!==run.run_number))
  throw Error("P4_G5_GITHUB_RUNNING_JOB_NOT_AUTHENTICATED_HOLD");
 return {
  schema:"v39.phase4.gate5-github-running-owner-evidence.v1" as const,
  status:"REAL_GITHUB_API_RUNNING_REHEARSAL_JOB_ONLY_NO_PROVIDER" as const,
  horizon,githubJob:jobName,githubRunId:env.GITHUB_RUN_ID,
  actualGitHubJobStartedAtUtc:new Date(started).toISOString(),
  actualThisProcessObservedAtUtc:new Date(observed).toISOString(),
  githubApiVerifiedAtUtc:new Date(verified).toISOString(),
  independentlyVerifiedRunningJobMetadata:true as const,
  realFutureHorizonPrearmed:false as const,
  authenticatedProviderSourceSemantics:false as const,
  lawfulRetentionRightsVerified:false as const,
  productionV0076OwnerActivated:false as const,
  paidProviderDispatchAuthorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  strictGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const
 };
}
type H4=P4Gate5GridHorizonV39;
