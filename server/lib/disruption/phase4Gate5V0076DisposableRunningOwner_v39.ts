/**
 * Verify the *actual* current GitHub Actions job against Actions REST
 * metadata before an isolated V0076 PostgreSQL PREPARED->ACTIVE test.
 *
 * This is exclusively disposable. A real GitHub job proof is NOT a real
 * future flight prearm or authorization of provider-native T/labels/rights.
 * Caller MUST retrieve the API objects independently with a read-only token.
 */
const REPO="HKcode22/ReplitTranvr";
const WORKFLOW="Phase4 Gate5 V0076 Disposable PREPARED to ACTIVE";
const WORKFLOW_REF=REPO+
 "/.github/workflows/phase4-gate5-v0076-active-transition-disposable-pg16.yml@refs/heads/main";
const SHA=/^[a-f0-9]{40}$/;
const ID=/^[1-9][0-9]{4,24}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
function row(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value))
  throw Error("P4_G5_V0076_ATTEST_GITHUB_RESPONSE_HOLD");
 return value as Record<string,unknown>;
}
function when(value:unknown):number{
 if(typeof value!=="string"||!ISO.test(value))
  throw Error("P4_G5_V0076_ATTEST_GITHUB_CLOCK_HOLD");
 const ms=Date.parse(value);
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==value.slice(0,19))
  throw Error("P4_G5_V0076_ATTEST_GITHUB_CLOCK_HOLD");
 return ms;
}
export function attestP4G5V0076DisposableRunningOwnerV39(
 env:NodeJS.ProcessEnv,checkoutSha:string,
 runRaw:unknown,jobRaw:unknown,observedUtc:string,verifiedUtc:string
){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_EVENT_NAME!=="push"||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    env.GITHUB_JOB!=="disposable-v0076-activation"||
    env.GITHUB_WORKFLOW!==WORKFLOW||
    env.GITHUB_WORKFLOW_REF!==WORKFLOW_REF||
    env.GITHUB_SHA!==checkoutSha||!SHA.test(checkoutSha)||
    !ID.test(env.GITHUB_RUN_ID??"")||
    env.P4_G5_ACTIVE_DISPOSABLE_INTENT!=="SYNTHETIC_ZERO_PROVIDER_NULL_RELEASE"||
    env.DATABASE_URL!=="postgresql://postgres:postgres@localhost:5432/gate5_activation"||
    !!env.V39_DATABASE_RUNTIME_URL||!!env.GATE05_AUTOMATION_DATABASE_URL||
    !!env.AERODATABOX_API_KEY||!!env.RAPIDAPI_KEY)
  throw Error("P4_G5_V0076_ATTEST_DISPOSABLE_CONTEXT_HOLD");
 const run=row(runRaw),job=row(jobRaw),rrepo=row(run.repository);
 const id=Number(env.GITHUB_RUN_ID);
 const created=when(run.created_at);
 const runStarted=when(run.run_started_at);
 const jobStarted=when(job.started_at);
 const observed=when(observedUtc),verified=when(verifiedUtc);
 if(!Number.isSafeInteger(run.id)||run.id!==id||
    run.run_attempt!==1||
    (env.GITHUB_RUN_NUMBER&&run.run_number!==Number(env.GITHUB_RUN_NUMBER))||
    run.event!=="push"||run.head_branch!=="main"||
    run.head_sha!==checkoutSha||run.name!==WORKFLOW||
    rrepo.full_name!==REPO||run.status!=="in_progress"||
    run.conclusion!==null||
    !Number.isSafeInteger(job.id)||Number(job.id)<=0||
    job.run_id!==id||job.name!=="disposable-v0076-activation"||
    job.status!=="in_progress"||job.conclusion!==null||
    (typeof job.head_sha==="string"&&job.head_sha!==checkoutSha)||
    (typeof job.workflow_name==="string"&&job.workflow_name!==WORKFLOW)||
    created>runStarted||runStarted>jobStarted||
    jobStarted>observed||observed>verified||
    observed-jobStarted>15*60000||verified-observed>2*60000)
  throw Error("P4_G5_V0076_ATTEST_NOT_REAL_RUNNING_JOB_HOLD");
 return {
  schema:"v39.phase4.gate5-v0076-real-gh-disposable-binding.v1" as const,
  githubRunId:env.GITHUB_RUN_ID!,
  actualGitHubJobStartedAtUtc:new Date(jobStarted).toISOString(),
  observedAtUtc:new Date(observed).toISOString(),
  verifiedAtUtc:new Date(verified).toISOString(),
  githubRunningJobApiVerified:true as const,
  futureCohortPrearmVerified:false as const,
  sourceSemanticsCertified:false as const,
  retentionRightsCertified:false as const,
  realProviderCallsAuthorized:false as const,
  strictGate5Passed:false as const
 };
}
