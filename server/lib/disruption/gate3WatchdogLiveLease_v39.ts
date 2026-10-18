/**
 * Gate3 independent GitHub Actions watchdog ARM/HEARTBEAT receipt.
 *
 * A running job alone is not proof that it authenticated the exact Gate3
 * LOGGED owner and provider account. Its own GITHUB_TOKEN may publish a
 * metadata-only issue comment AFTER successful pre-arm reads. The paid owner
 * independently checks that this comment came from the GitHub Actions bot,
 * matches exact SHA/session/AUTH/window/run and has a fresh heartbeat, AND
 * the referenced GitHub Actions run is still in_progress on the same SHA.
 *
 * No provider account balances/IDs, webhook secrets or raw flight data ever
 * appear in the public receipt. This is a trusted workflow attestation, not
 * cryptographic proof of AeroDataBox origin or a provider spending hard cap.
 */
export type Gate3WatchdogLeaseV39=Readonly<{
  schema:"v39.gate3.wsss-watchdog-lease.v1";
  status:"ARMED"|"ACTIVE"|"STOPPED";
  githubRunId:number;
  expectedGitHead:string;
  authSha256:string;
  sessionId:string;
  startUtc:string;
  heartbeatUtc:string;
  providerCreatesByWatchdog:0;
  hardCreditLimitGuaranteed:false;
}>;
export type Gate3WatchdogLeaseScopeV39=Readonly<{
  githubRunId:number;commentId:number;
  expectedGitHead:string;authSha256:string;
  sessionId:string;startUtc:string;
}>;
export type Gate3WatchdogLeaseCommentV39=Readonly<{
  id:number;
  user?:{login?:string;type?:string};
  body?:string|null;
  created_at?:string;updated_at?:string;
}>;
export type Gate3WatchdogLeaseRunV39=Readonly<{
  id:number;status:string;conclusion:string|null;
  head_sha:string;event:string;path?:string;
  name?:string;
  repository?:{full_name?:string};
}>;
const HEAD=/^[0-9a-f]{40}$/;
const SHA=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const WORKFLOW=".github/workflows/phase3-gate3-independent-safety.yml";
const REPO="HKcode22/ReplitTranvr";
const BOT="github-actions[bot]";

export function assertGate3WatchdogLiveLeaseV39(
  scope:Gate3WatchdogLeaseScopeV39,
  comment:Gate3WatchdogLeaseCommentV39,
  run:Gate3WatchdogLeaseRunV39,
  now:Date,
):Gate3WatchdogLeaseV39{
  if(!scope||!comment||!run||
     !Number.isSafeInteger(scope.githubRunId)||scope.githubRunId<=0||
     !Number.isSafeInteger(scope.commentId)||scope.commentId<=0||
     !HEAD.test(scope.expectedGitHead)||!SHA.test(scope.authSha256)||
     !UUID.test(scope.sessionId)||!ISO.test(scope.startUtc)||
     !Number.isFinite(Date.parse(scope.startUtc))||
     !(now instanceof Date)||!Number.isFinite(now.getTime()))
    throw Error("GATE3_WATCHDOG_LEASE_INVALID_SCOPE");
  if(comment.id!==scope.commentId||
     comment.user?.login!==BOT||
     comment.user?.type!=="Bot"||
     typeof comment.body!=="string")
    throw Error("GATE3_WATCHDOG_LEASE_NOT_TRUSTED_GITHUB_ACTIONS_COMMENT");
  if(run.id!==scope.githubRunId||run.head_sha!==scope.expectedGitHead||
     run.event!=="workflow_dispatch"||run.status!=="in_progress"||
     run.conclusion!==null||
     ![WORKFLOW,`${WORKFLOW}@main`,`${WORKFLOW}@refs/heads/main`].includes(String(run.path))||
     run.repository?.full_name!==REPO)
    throw Error("GATE3_WATCHDOG_LEASE_JOB_NOT_ACTIVE_OR_NOT_EXACT_WORKFLOW");
  let lease:Gate3WatchdogLeaseV39;
  try{lease=JSON.parse(comment.body) as Gate3WatchdogLeaseV39}
  catch{throw Error("GATE3_WATCHDOG_LEASE_JSON_INVALID")}
  if(!lease||lease.schema!=="v39.gate3.wsss-watchdog-lease.v1"||
     !["ARMED","ACTIVE"].includes(lease.status)||
     lease.githubRunId!==scope.githubRunId||
     lease.expectedGitHead!==scope.expectedGitHead||
     lease.authSha256!==scope.authSha256||
     lease.sessionId!==scope.sessionId||
     lease.startUtc!==scope.startUtc||
     lease.providerCreatesByWatchdog!==0||
     lease.hardCreditLimitGuaranteed!==false)
    throw Error("GATE3_WATCHDOG_LEASE_CONTENT_SCOPE_OR_STATE_MISMATCH");
  if(!ISO.test(lease.heartbeatUtc)||
     !ISO.test(String(comment.updated_at??"")))
    throw Error("GATE3_WATCHDOG_LEASE_TIMESTAMP_INVALID");
  const beat=Date.parse(lease.heartbeatUtc);
  const updated=Date.parse(comment.updated_at!);
  const current=now.getTime();
  if(!Number.isFinite(beat)||!Number.isFinite(updated)||
     beat>current+5_000||updated>current+5_000||
     current-beat>25_000||current-updated>30_000||
     Math.abs(beat-updated)>10_000)
    throw Error("GATE3_WATCHDOG_LEASE_STALE_HEARTBEAT");
  return lease;
}

function reqHeaders(token?:string):Record<string,string>{
  const x:Record<string,string>={
    accept:"application/vnd.github+json",
    "x-github-api-version":"2022-11-28",
    "user-agent":"ReplitTranvr-Gate3-Lease",
  };
  if(token)x.authorization=`Bearer ${token}`;
  return x;
}
async function getJson(url:string,token?:string):Promise<unknown>{
  const response=await fetch(url,{headers:reqHeaders(token),
    signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error("GATE3_WATCHDOG_LEASE_GITHUB_API_UNAVAILABLE");
  return response.json();
}
/** Public, read-only evidence; does not use AeroDataBox or PostgreSQL. */
export async function verifyGate3WatchdogLiveLeaseFromGitHubV39(
  scope:Gate3WatchdogLeaseScopeV39,
  now:Date=new Date(),
):Promise<Gate3WatchdogLeaseV39>{
  if(!Number.isSafeInteger(scope?.commentId)||!Number.isSafeInteger(scope?.githubRunId))
    throw Error("GATE3_WATCHDOG_LEASE_INVALID_SCOPE");
  // Replit operator may pass a separately authenticated GitHub CLI GH_TOKEN;
  // Github Actions sidecar itself uses its built-in GITHUB_TOKEN.
  const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
  const [comment,run]=await Promise.all([
    getJson(`https://api.github.com/repos/${REPO}/issues/comments/${scope.commentId}`,token),
    getJson(`https://api.github.com/repos/${REPO}/actions/runs/${scope.githubRunId}`,token)
  ]);
  return assertGate3WatchdogLiveLeaseV39(
    scope,comment as Gate3WatchdogLeaseCommentV39,
    run as Gate3WatchdogLeaseRunV39,now);
}

/** Github Actions uses a workflow-scoped issues:write token, no DB/provider. */
export async function publishGate3WatchdogLeaseV39(
  token:string,lease:Gate3WatchdogLeaseV39,
  priorCommentId?:number,
):Promise<number>{
  if(!token||token.length<10||!lease||
     lease.schema!=="v39.gate3.wsss-watchdog-lease.v1"||
     lease.providerCreatesByWatchdog!==0||
     lease.hardCreditLimitGuaranteed!==false||
     !["ARMED","ACTIVE","STOPPED"].includes(lease.status)||
     !Number.isSafeInteger(lease.githubRunId)||
     !HEAD.test(lease.expectedGitHead)||!SHA.test(lease.authSha256)||
     !UUID.test(lease.sessionId)||!ISO.test(lease.startUtc)||
     !ISO.test(lease.heartbeatUtc))
    throw Error("GATE3_WATCHDOG_LEASE_PUBLISH_SCOPE_INVALID");
  const update=priorCommentId!==undefined;
  if(update&&(!Number.isSafeInteger(priorCommentId)||priorCommentId <= 0))
    throw Error("GATE3_WATCHDOG_LEASE_COMMENT_ID_INVALID");
  const path=update?
    `https://api.github.com/repos/${REPO}/issues/comments/${priorCommentId}`:
    `https://api.github.com/repos/${REPO}/issues/38/comments`;
  const resp=await fetch(path,{
    method:update?"PATCH":"POST",
    headers:{...reqHeaders(token),"content-type":"application/json"},
    body:JSON.stringify({body:JSON.stringify(lease)}),
    signal:AbortSignal.timeout(8000),
  });
  if(!resp.ok)throw Error("GATE3_WATCHDOG_LEASE_PUBLISH_FAILED");
  let value:any;
  try{value=await resp.json()}catch{
    throw Error("GATE3_WATCHDOG_LEASE_PUBLISH_RESPONSE_INVALID")
  }
  if(!Number.isSafeInteger(value?.id)||value.id<=0||
     value.user?.login!==BOT)
    throw Error("GATE3_WATCHDOG_LEASE_GITHUB_ACTOR_NOT_VERIFIED");
  return value.id;
}
