/**
 * Future Gate5 pre-expiry source reader: independent GitHub admission.
 * No provider request, storage mutation, or authority for scientific PASS.
 * The reviewed SHA must be pinned in THIS code, not from an event or env.
 */
import {createHash} from "node:crypto";

export const P4_G5_FUTURE_HORIZON_MANIFEST_PATH_V39=
 "data-collection/phase4/GATE5_NEXT_HORIZON_ORIGINAL_AUDIT_HOLD.json";
export const P4_G5_FUTURE_GRID_PATH_V39=
 "data-collection/phase4/GATE5_NEXT_REVIEWED_SOURCE_GRID.json";
export const P4_G5_FUTURE_SOURCE_WORKFLOW_V39=
 "Phase4 Gate5 Future Reviewed Source Owner";
export const P4_G5_FUTURE_SOURCE_WORKFLOW_PATH_V39=
 ".github/workflows/phase4-gate5-future-reviewed-source-owner.yml";
export const P4_G5_FUTURE_HORIZON_APPROVED_SHA256_V39:string|null=null;
const SHA=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const HORIZON_JOBS={
 "owner-t24":"T-24h","owner-t6":"T-6h","owner-t90":"T-90m"
} as const;
type OwnerJob=keyof typeof HORIZON_JOBS;
type Horizon=typeof HORIZON_JOBS[OwnerJob];
function hold(reason:string):never{throw Error("P4_G5_FUTURE_HORIZON_"+reason+"_HOLD")}
function object(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))hold("NONOBJECT");
 return x as Record<string,unknown>;
}
export type P4G5FutureHorizonReviewV39={
 status:"HOLD_NO_APPROVED_FUTURE_AUDIT";manifestSha256:string
}|{
 status:"REVIEWED_FUTURE_HORIZON_READONLY";
 manifestSha256:string;frozenGridSha256:string;
 cohortId:string;sourceOwnerHeadSha:string
};
/** Hold has no credential or source access. A future PR must pin approved bytes. */
export function admitP4G5FutureHorizonManifestV39(
 bytes:string,approvedSha256:string|null
):P4G5FutureHorizonReviewV39{
 if(typeof bytes!=="string"||bytes.length>12000)hold("MANIFEST_SIZE");
 let m:Record<string,unknown>;
 try{m=object(JSON.parse(bytes));}catch{hold("MANIFEST_PARSE")}
 if(bytes!==JSON.stringify(m,null,2)+"\n"||
    m.schema!=="v39.phase4.gate5-future-horizon-github-audit.v1"||
    Object.keys(m).length!==14)hold("MANIFEST_CANONICAL");
 const hash=createHash("sha256").update(bytes,"utf8").digest("hex");
 if(m.mode==="HOLD_NO_APPROVED_FUTURE_SOURCE"){
  if(approvedSha256!==null||m.cohortId!==null||
     m.frozenGridPath!==null||m.frozenGridSha256!==null||
     m.sourceOwnerHeadSha!==null||m.sourceRightsEvidenceSha256!==null||
     m.metadataProofStorageRightsReviewed!==false||
     m.readOnlyDbApproved!==false||
     m.scientificGate5Passed!==false||
     m.phase5FreezeAuthorized!==false||m.phase6Authorized!==false||
     m.sourceWorkflowName!==P4_G5_FUTURE_SOURCE_WORKFLOW_V39||
     m.sourceWorkflowPath!==P4_G5_FUTURE_SOURCE_WORKFLOW_PATH_V39)
    hold("MANIFEST_NOT_INERT");
  return {status:"HOLD_NO_APPROVED_FUTURE_AUDIT",manifestSha256:hash};
 }
 if(m.mode!=="REVIEWED_FUTURE_SOURCE_READONLY"||
    !approvedSha256||!SHA.test(approvedSha256)||hash!==approvedSha256||
    !/^[A-Z][A-Z0-9_-]{7,79}$/.test(String(m.cohortId))||
    m.frozenGridPath!==P4_G5_FUTURE_GRID_PATH_V39||
    !SHA.test(String(m.frozenGridSha256))||
    !COMMIT.test(String(m.sourceOwnerHeadSha))||
    !SHA.test(String(m.sourceRightsEvidenceSha256))||
    m.sourceWorkflowName!==P4_G5_FUTURE_SOURCE_WORKFLOW_V39||
    m.sourceWorkflowPath!==P4_G5_FUTURE_SOURCE_WORKFLOW_PATH_V39||
    m.metadataProofStorageRightsReviewed!==true||
    m.readOnlyDbApproved!==true||
    m.scientificGate5Passed!==false||
    m.phase5FreezeAuthorized!==false||m.phase6Authorized!==false)
  hold("UNAPPROVED_SOURCE_OR_RIGHTS");
 return {status:"REVIEWED_FUTURE_HORIZON_READONLY",manifestSha256:hash,
  frozenGridSha256:String(m.frozenGridSha256),
  cohortId:String(m.cohortId),sourceOwnerHeadSha:String(m.sourceOwnerHeadSha)};
}
export type P4G5AttestedSourceRunV39={
 runId:string;horizon:Horizon;jobName:OwnerJob;headSha:string
};
/** Both metadata payloads must come from GitHub API, not passed job output. */
export function attestP4G5FutureSourceGitHubV39(
 review:Extract<P4G5FutureHorizonReviewV39,
 {status:"REVIEWED_FUTURE_HORIZON_READONLY"}>,
 eventRunId:unknown,runValue:unknown,jobsValue:unknown
):P4G5AttestedSourceRunV39{
 const run=object(runValue),jobs=object(jobsValue);
 const repo=object(run.repository),headRepo=object(run.head_repository);
 const id=run.id;
 if(!Number.isSafeInteger(id)||id!==eventRunId||Number(id)<=0||
    repo.full_name!=="HKcode22/ReplitTranvr"||
    headRepo.full_name!=="HKcode22/ReplitTranvr"||
    run.name!==P4_G5_FUTURE_SOURCE_WORKFLOW_V39||
    run.path!==P4_G5_FUTURE_SOURCE_WORKFLOW_PATH_V39||
    run.head_sha!==review.sourceOwnerHeadSha||
    run.head_branch!=="main"||
    !["push","schedule"].includes(String(run.event))||
    run.run_attempt!==1||run.status!=="completed"||
    run.conclusion!=="success"||
    jobs.total_count!==1||!Array.isArray(jobs.jobs)||
    jobs.jobs.length!==1)
  hold("SOURCE_RUN_UNVERIFIED");
 const job=object(jobs.jobs[0]);
 const name=job.name;
 if(typeof name!=="string"||
    !Object.prototype.hasOwnProperty.call(HORIZON_JOBS,name)||
    job.run_id!==id||job.status!=="completed"||
    job.conclusion!=="success")
  hold("SOURCE_JOB_UNVERIFIED");
 const jobName=name as OwnerJob;
 return {runId:String(id),horizon:HORIZON_JOBS[jobName],
  jobName,headSha:review.sourceOwnerHeadSha};
}
/** GitHub context and secret segregation, rechecked in protected reader. */
export function assertP4G5FutureHorizonGitHubContextV39(
 e:NodeJS.ProcessEnv,job:"admit-future-horizon"|"read-future-horizon",
 localSha:string
){
 if(e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    e.GITHUB_EVENT_NAME!=="workflow_run"||
    e.GITHUB_REF!=="refs/heads/main"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 Future Pre-expiry Independent Original Audit"||
    e.GITHUB_JOB!==job||
    e.GITHUB_WORKFLOW_REF!==
     "HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-future-preexpiry-original-audit.yml@refs/heads/main"||
    !COMMIT.test(e.GITHUB_SHA??"")||e.GITHUB_SHA!==localSha||
    e.P4_G5_HORIZON_READONLY_INTENT!=="VERIFY_FUTURE_ORIGINALS_NO_PROVIDER"||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    !!e.DATABASE_URL||!!e.V39_DATABASE_RUNTIME_URL||
    (job==="admit-future-horizon"&&!!e.GATE05_AUTOMATION_DATABASE_URL))
  hold("GITHUB_CONTEXT_OR_SECRETS");
}
