/**
 * Phase3 Gate4 independently witnessed STOP-ARMED run receipt.
 * No HTTP/provider I/O here. The protected GitHub STOP job emits its own
 * issue comment AFTER authenticated receiver, DB and provider prearm.
 * The external CREATE operator must independently GET the GitHub run, jobs,
 * and genuine GitHub Actions bot comment; none is proof by itself.
 *
 * This proves recently ARMED at the sampled time, not guaranteed future
 * runner uptime, provider credit hard cap, or ownership of a CREATE ID.
 */
import type {Gate4ActionsWatchScopeV39} from "./gate4ActionsWatchdogPolicy_v39";
import {reviewGate4ActionsWatchScopeV39} from "./gate4ActionsWatchdogPolicy_v39";

export const GATE4_ARMED_COMMENT_MARKER_V39="GATE4_ACTIONS_ARMED_RECEIPT_V1\n";
const SHA=/^[a-f0-9]{40}$/;
const githubUtc=(x:unknown)=>typeof x==="string"&&
  /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$/.test(x)&&
  Number.isFinite(Date.parse(x));
const safeId=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>0;
const utc=(x:unknown)=>typeof x==="string"&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)&&
  Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
export type Gate4ArmedRunReceiptV39=Readonly<{
 schema:"v39.gate4.actions-armed-receipt.v1";
 runId:number;runnerSource:string;receiverSource:string;
 scopeId:string;airportIcao:string;startUtc:string;stopUtc:string;
 startingCredits:number;softCreditTarget:number;protectedCreditFloor:number;
 armedAtUtc:string;providerCreates:0;
}>;
export function gate4ArmedCommentBodyV39(
 scope:Gate4ActionsWatchScopeV39,runId:number,
 runnerSha:string,atUtc:string
):string{
 if(!reviewGate4ActionsWatchScopeV39(scope)||!safeId(runId)||
   !SHA.test(runnerSha)||!utc(atUtc))
   throw Error("GATE4_ARMED_COMMENT_INVALID_HOLD");
 return GATE4_ARMED_COMMENT_MARKER_V39+JSON.stringify({
  schema:"v39.gate4.actions-armed-receipt.v1",
  runId,runnerSource:runnerSha,receiverSource:scope.sourceCommit,
  scopeId:scope.scopeId,airportIcao:scope.airportIcao,
  startUtc:scope.startUtc,stopUtc:scope.stopUtc,
  startingCredits:scope.observedStartingCredits,
  softCreditTarget:scope.softCreditTarget,
  protectedCreditFloor:scope.protectedCreditFloor,
  armedAtUtc:atUtc,providerCreates:0
 } satisfies Gate4ArmedRunReceiptV39);
}
type GRun={id?:number;status?:string;event?:string;head_branch?:string;
 head_sha?:string;run_attempt?:number;workflow_id?:number};
type GJob={run_id?:number;name?:string;status?:string;
 steps?:Array<{name?:string;status?:string}>};
type GComment={user?:{login?:string;id?:number;type?:string};
 created_at?:string;body?:string};
export function gate4ReviewIndependentArmedProofV39(args:{
 scope:Gate4ActionsWatchScopeV39;runnerSha:string;runId:number;
 nowUtc:string;workflowId:number;run:GRun;jobs:readonly GJob[];
 comments:readonly GComment[];
}):boolean{
 const {scope,runnerSha,runId,nowUtc,workflowId,run,jobs,comments}=args??{};
 if(!scope||!reviewGate4ActionsWatchScopeV39(scope)||
    !SHA.test(runnerSha??"")||!safeId(runId)||!safeId(workflowId)||
    !utc(nowUtc)||!run||!Array.isArray(jobs)||!Array.isArray(comments))
   return false;
 const now=Date.parse(nowUtc);
 if(now<Date.parse(scope.startUtc)||now>=Date.parse(scope.stopUtc)-30_000||
    run.id!==runId||run.head_sha!==runnerSha||
    run.head_branch!=="main"||run.event!=="workflow_dispatch"||
    run.status!=="in_progress"||run.run_attempt!==1||
    run.workflow_id!==workflowId) return false;
 const live=jobs.some(j=>j.run_id===runId&&
    j.name==="gate4-live-stop"&&j.status==="in_progress"&&
    j.steps?.some((s:{name?:string;status?:string})=>s.name===
      "Run protected STOP-only implementation (no CREATE)"&&
      s.status==="in_progress"));
 if(!live)return false;
 return comments.some(c=>{
   if(c.user?.login!=="github-actions[bot]"||
      c.user?.id!==41898282||!githubUtc(c.created_at)||
      typeof c.body!=="string"||
      !c.body.startsWith(GATE4_ARMED_COMMENT_MARKER_V39))
     return false;
   const when=Date.parse(c.created_at);
   if(when>now||now-when>45_000)return false;
   let r:Gate4ArmedRunReceiptV39;
   try{r=JSON.parse(c.body.slice(
     GATE4_ARMED_COMMENT_MARKER_V39.length));}
   catch{return false;}
   if(c.body!==GATE4_ARMED_COMMENT_MARKER_V39+JSON.stringify(r))
     return false;
   if(!utc(r.armedAtUtc)||
      Math.abs(Date.parse(r.armedAtUtc)-when)>15_000)return false;
   return r.schema==="v39.gate4.actions-armed-receipt.v1"&&
     r.runId===runId&&r.runnerSource===runnerSha&&
     r.receiverSource===scope.sourceCommit&&r.scopeId===scope.scopeId&&
     r.airportIcao===scope.airportIcao&&r.startUtc===scope.startUtc&&
     r.stopUtc===scope.stopUtc&&
     r.startingCredits===scope.observedStartingCredits&&
     r.softCreditTarget===scope.softCreditTarget&&
     r.protectedCreditFloor===scope.protectedCreditFloor&&
     r.providerCreates===0;
 });
}
