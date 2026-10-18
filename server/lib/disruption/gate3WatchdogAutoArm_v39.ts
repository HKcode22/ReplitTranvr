/**
 * Gate3 authenticated independent watchdog AUTOMATIC handoff.
 * One source owner -> at most one GitHub Actions workflow dispatch.
 * The Actions job remains independently hosted and must publish a fresh,
 * fully verified Actions-bot lease. No paid provider/SQL operations here.
 *
 * An ambiguous dispatch or unreadable GitHub response is always HOLD:
 * never dispatch a second workflow for the same session automatically.
 */
import {execFileSync} from "node:child_process";
import {
  verifyGate3WatchdogLiveLeaseFromGitHubV39,
  type Gate3WatchdogLeaseScopeV39
} from "./gate3WatchdogLiveLease_v39";

const REPO="HKcode22/ReplitTranvr";
const WORKFLOW="phase3-gate3-independent-safety.yml";
const SHA=/^[a-f0-9]{64}$/;
const HEAD=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
type Comment={id:number;user?:{login?:string;type?:string};body?:string|null};
export type Gate3AutoArmRequestV39=Readonly<{
  sessionId:string;authId:string;authFile:string;authSha256:string;
  startUtc:string;expectedGitHead:string;
}>;
export type Gate3AutoArmDepsV39=Readonly<{
  now:()=>Date;
  sleep:(ms:number)=>Promise<void>;
  listComments:()=>Promise<readonly Comment[]>;
  dispatchOnce:(scope:Gate3AutoArmRequestV39)=>Promise<void>;
  verifyLease:(scope:Gate3WatchdogLeaseScopeV39)=>Promise<unknown>;
}>;

function validate(req:Gate3AutoArmRequestV39,now:Date):void{
  const start=Date.parse(req?.startUtc??"");
  if(!req||!UUID.test(req.sessionId)||!SHA.test(req.authSha256)||
     !HEAD.test(req.expectedGitHead)||!ISO.test(req.startUtc)||
     !Number.isFinite(start)||!/^(AUTH-\d{8}-[A-Z0-9]+)$/.test(req.authId)||
     req.authFile!==`data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_${req.authId.slice(5,13)}_${req.authId.slice(-6)}.json`||
     !(now instanceof Date)||!Number.isFinite(now.getTime())||
     start-now.getTime()<60_000||start-now.getTime()>480_000)
    throw Error("GATE3_AUTOARM_REQUEST_OR_CLOCK_HOLD");
}
function selectors(comment:Comment,req:Gate3AutoArmRequestV39):
  Gate3WatchdogLeaseScopeV39|null{
  if(comment.user?.login!=="github-actions[bot]"||
     comment.user?.type!=="Bot"||typeof comment.body!=="string"||
     !Number.isSafeInteger(comment.id)||comment.id<=0)return null;
  try{
    const l=JSON.parse(comment.body);
    if(l?.schema!=="v39.gate3.wsss-watchdog-lease.v1"||
       l.sessionId!==req.sessionId||
       l.expectedGitHead!==req.expectedGitHead||
       l.authSha256!==req.authSha256||
       l.startUtc!==req.startUtc||
       !Number.isSafeInteger(l.githubRunId)||l.githubRunId<=0)
      return null;
    return {githubRunId:l.githubRunId,commentId:comment.id,
      expectedGitHead:req.expectedGitHead,
      authSha256:req.authSha256,sessionId:req.sessionId,
      startUtc:req.startUtc};
  }catch{return null}
}
/** A selector alone is never accepted. Existing matching lease must be
 * genuinely active; stale or stopped => HOLD, not another dispatch. */
async function findVerifiedLease(
  req:Gate3AutoArmRequestV39,deps:Gate3AutoArmDepsV39
):Promise<Gate3WatchdogLeaseScopeV39|null>{
  const matches=(await deps.listComments()).map(c=>selectors(c,req))
    .filter((c):c is Gate3WatchdogLeaseScopeV39=>c!==null);
  if(matches.length>1)
    throw Error("GATE3_AUTOARM_DUPLICATE_BOT_LEASE_HOLD");
  if(matches.length===0)return null;
  await deps.verifyLease(matches[0]); // Must authenticate job + fresh beat.
  return matches[0];
}
/** Can execute once only, in the SAME paid owner process and source UUID.
 * A valid existing active bot lease is allowed; no automatic re-dispatch.
 */
export async function autoArmGate3WatchdogV39(
  req:Gate3AutoArmRequestV39,
  deps:Gate3AutoArmDepsV39=productionDeps(),
):Promise<Gate3WatchdogLeaseScopeV39>{
  validate(req,deps.now());
  const previous=await findVerifiedLease(req,deps);
  if(previous)return previous;
  // A failed/unknown workflow-dispatch response may still have launched.
  // Never retry a dispatch, even if no bot comment becomes visible.
  try{await deps.dispatchOnce(req)}
  catch{throw Error("GATE3_AUTOARM_DISPATCH_AMBIGUOUS_NO_RETRY_HOLD")}
  const deadline=Math.min(Date.parse(req.startUtc)-20_000,
                          deps.now().getTime()+150_000);
  while(deps.now().getTime()<deadline){
    const lease=await findVerifiedLease(req,deps);
    if(lease)return lease;
    await deps.sleep(4000);
  }
  throw Error("GATE3_AUTOARM_INDEPENDENT_BOT_NOT_ARMED_HOLD");
}
function headers(token:string){
  return {authorization:`Bearer ${token}`,
    accept:"application/vnd.github+json",
    "x-github-api-version":"2022-11-28"};
}
async function listComments(token:string):Promise<readonly Comment[]>{
  const all:Comment[]=[];
  for(let page=1;page<=8;page++){
    const response=await fetch(
      `https://api.github.com/repos/${REPO}/issues/38/comments?per_page=100&page=${page}`,{
        headers:headers(token),signal:AbortSignal.timeout(8000)
      });
    if(!response.ok)throw Error("GATE3_AUTOARM_GITHUB_COMMENTS_UNAVAILABLE_HOLD");
    const rows=await response.json() as unknown;
    if(!Array.isArray(rows))throw Error("GATE3_AUTOARM_COMMENTS_INVALID_HOLD");
    all.push(...(rows as Comment[]));
    if(rows.length<100)return all;
  }
  throw Error("GATE3_AUTOARM_COMMENTS_PAGINATION_HOLD");
}
function gh(args:string[]):string {
  return execFileSync("gh",args,{encoding:"utf8",timeout:12000,
    stdio:["ignore","pipe","pipe"]}).trim();
}
function productionDeps():Gate3AutoArmDepsV39{
  // Both the owner and the independent bot use real authenticated GitHub.
  const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
  if(!token||token.length<10)
    throw Error("GATE3_AUTOARM_AUTHENTICATED_GITHUB_TOKEN_REQUIRED");
  return {
    now:()=>new Date(),
    sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),
    listComments:()=>listComments(token),
    verifyLease:verifyGate3WatchdogLiveLeaseFromGitHubV39,
    dispatchOnce:async req=>{
      // Exact pinned GitHub main; the job also independently checks GITHUB_SHA.
      const head=gh(["api",`repos/${REPO}/git/ref/heads/main`,
                     "--jq",".object.sha"]);
      if(head!==req.expectedGitHead)
        throw Error("GATE3_AUTOARM_REMOTE_MAIN_CHANGED_HOLD");
      gh(["workflow","run",WORKFLOW,"--repo",REPO,"--ref","main",
          "-f","confirm=WATCH_G3_WSSS_EXACT_NO_CREATE",
          "-f",`expected_head=${req.expectedGitHead}`,
          "-f",`auth_id=${req.authId}`,
          "-f",`auth_file=${req.authFile}`,
          "-f",`auth_sha=${req.authSha256}`,
          "-f",`session_id=${req.sessionId}`,
          "-f",`start_utc=${req.startUtc}`]);
    }
  };
}
