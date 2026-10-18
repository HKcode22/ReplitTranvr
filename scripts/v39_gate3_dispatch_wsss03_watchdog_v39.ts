/**
 * Convenience operator handoff for the separate INDEPENDENT Github Actions
 * WSSS03 safety sidecar. This script runs in a SECOND Replit Shell after
 * the paid owner printed PREPARED_NO_CREATE. It can dispatch ONLY the
 * existing workflow (which contains NO paid provider CREATE) then observes
 * its verified Actions-bot ARMED lease. It NEVER calls AeroDataBox/SQL.
 *
 * A github workflow-dispatch HTTP 204 acknowledgement alone is not ARMED.
 * Never dispatch again on ambiguous acceptance or after this script returns
 * HOLD. The owner separately authenticates both returned numbers.
 */
import {execFileSync} from "node:child_process";
import {verifyGate3WatchdogLiveLeaseFromGitHubV39}
 from "../server/lib/disruption/gate3WatchdogLiveLease_v39";

const REPO="HKcode22/ReplitTranvr";
const WF="phase3-gate3-independent-safety.yml";
const AUTH="AUTH-20261018-G3WSSS03";
const AUTH_FILE="data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS03.json";
const SHA="cf6ffea3db5672aad5305a7a307b0ebc1f5fb9c9324dab8772c2a7c22b085ebf";
const START="2026-10-18T04:30:00Z";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEAD=/^[0-9a-f]{40}$/;
const BOT="github-actions[bot]";

export function reviewWsss02DispatchInputsV39(sessionId:string,head:string,
 now:Date=new Date()):void{
 if(!UUID.test(sessionId)||!HEAD.test(head)||
    sessionId==="b010a425-7ad6-4490-893d-534bd1bb59b9"||
    sessionId==="7985f9d2-b20f-49fa-b7ae-0ec62348d291")
   throw Error("GATE3_WSSS03_DISPATCH_INPUT_INVALID");
 if(!(now instanceof Date)||!Number.isFinite(now.getTime())||
    now.getTime()<Date.parse(START)-480_000||
    now.getTime()>Date.parse(START)-60_000)
   throw Error("GATE3_WSSS03_DISPATCH_NOT_IN_PRESTART_WINDOW");
}
type Comment={id:number;user?:{login?:string};body?:string;
 updated_at?:string};
async function getComments(token:string):Promise<Comment[]>{
 const list:Comment[]=[];
 // Issue comments are ordered ascending; read bounded successive pages.
 for(let page=1;page<=8;page++){
  const r=await fetch(`https://api.github.com/repos/${REPO}/issues/38/comments?per_page=100&page=${page}`,{
   headers:{authorization:`Bearer ${token}`,accept:"application/vnd.github+json",
    "x-github-api-version":"2022-11-28"},
   signal:AbortSignal.timeout(8000)
  });
  if(!r.ok)throw Error("GATE3_WSSS03_GITHUB_COMMENTS_UNAVAILABLE_HOLD");
  const rows=await r.json();
  if(!Array.isArray(rows))throw Error("GATE3_WSSS03_GITHUB_COMMENTS_INVALID");
  list.push(...rows as Comment[]);
  if(rows.length<100)break;
  if(page===8)throw Error("GATE3_WSSS03_TOO_MANY_GITHUB_COMMENTS");
 }
 return list;
}
function matchingLease(comment:Comment,sid:string,head:string){
 if(comment.user?.login!==BOT||typeof comment.body!=="string")return null;
 try{
  const x=JSON.parse(comment.body);
  if(x?.schema!=="v39.gate3.wsss-watchdog-lease.v1"||
     x.sessionId!==sid||x.expectedGitHead!==head||
     x.authSha256!==SHA||x.startUtc!==START||
     !Number.isSafeInteger(x.githubRunId))return null;
  return {runId:x.githubRunId,commentId:comment.id};
 }catch{return null}
}
async function main(){
 if(process.argv.length!==6||process.argv[2]!=="--session-id"||
    process.argv[4]!=="--expected-head")
  throw Error("GATE3_WSSS03_DISPATCH_EXACT_ARGUMENTS_REQUIRED");
 const sessionId=process.argv[3],head=process.argv[5];
 reviewWsss02DispatchInputsV39(sessionId,head);
 const token=process.env.GH_TOKEN ||
  execFileSync("gh",["auth","token"],{encoding:"utf8"}).trim();
 if(token.length<10)throw Error("GATE3_WSSS03_GITHUB_AUTH_MISSING");
 process.env.GH_TOKEN=token; // private to this Node process; do not print.
 const remote=execFileSync("gh",
  ["api",`repos/${REPO}/git/ref/heads/main`,"--jq",".object.sha"],
  {encoding:"utf8"}).trim();
 if(remote!==head)throw Error("GATE3_WSSS03_MAIN_CHANGED_HOLD");
 // If an exact lease already exists, return only after full active verification;
 // NEVER launch a second workflow for the same source/session.
 let dispatched=false;
 const previous=(await getComments(token))
  .map(z=>matchingLease(z,sessionId,head))
  .find(z=>z!==null);
 if(previous){
  await verifyGate3WatchdogLiveLeaseFromGitHubV39({
   githubRunId:previous.runId,commentId:previous.commentId,
   expectedGitHead:head,authSha256:SHA,sessionId,startUtc:START
  });
  console.log(JSON.stringify({
   status:"REUSED_FRESH_ALREADY_DISPATCHED_BOT_LEASE",
   run_id:previous.runId,comment_id:previous.commentId,
   owner_prompt_line:`${previous.runId} ${previous.commentId}`,
   provider_creates_by_this_script:0
  }));
  return;
 }
 // Exactly ONE dispatch. A transport error here may have succeeded; HOLD,
 // never automatically retry; investigate Actions and bot comments.
 execFileSync("gh",["workflow","run",WF,"--repo",REPO,"--ref","main",
  "-f","confirm=WATCH_G3_WSSS_EXACT_NO_CREATE",
  "-f",`expected_head=${head}`,
  "-f",`auth_id=${AUTH}`,
  "-f",`auth_file=${AUTH_FILE}`,
  "-f",`auth_sha=${SHA}`,
  "-f",`session_id=${sessionId}`,
  "-f",`start_utc=${START}`
 ],{stdio:["ignore","pipe","pipe"]});
 dispatched=true;
 console.log(JSON.stringify({status:"WORKFLOW_DISPATCHED_NO_PAID_CREATE",
   session_id:sessionId,please_wait_for_verified_bot_lease:true}));
 const deadline=Date.now()+150_000;
 while(Date.now()<deadline){
  const all=(await getComments(token));
  const match=all.map(z=>matchingLease(z,sessionId,head))
   .find(z=>z!==null);
  if(match){
   await verifyGate3WatchdogLiveLeaseFromGitHubV39({
    githubRunId:match.runId,commentId:match.commentId,
    expectedGitHead:head,authSha256:SHA,sessionId,startUtc:START
   });
   console.log(JSON.stringify({
    status:"INDEPENDENT_WATCHDOG_ARMED_VERIFIED",
    run_id:match.runId,comment_id:match.commentId,
    owner_prompt_line:`${match.runId} ${match.commentId}`,
    provider_creates_by_this_script:0
   }));
   return;
  }
  await new Promise(resolve=>setTimeout(resolve,4000));
 }
 throw Error("GATE3_WSSS03_ARM_NOT_PROVEN_DO_NOT_DISPATCH_AGAIN_HOLD");
}
if(import.meta.url===`file://${process.argv[1]}`){
  main().catch(e=>{
   console.error(JSON.stringify({status:"HOLD",
    reason:String(e?.message??"").startsWith("GATE3_")?String(e.message):
      "GATE3_WSSS03_DISPATCH_AMBIGUOUS_GITHUB_WORKFLOW_HOLD",
    no_automatic_dispatch_retry:true,provider_creates_by_this_script:0
   }));
   process.exitCode=2;
  });
}
