/**
 * Phase5 future POST: a source-backed PRE is sufficient (1/3 valid).
 * Pure signed packet + actual SOURCE-role pre-audit + real DB-clock
 * + bounded GitHub run history. NO paid V0083 reservation in this file.
 */
import {createHash} from "node:crypto";
import {verifyP5FuturePostReviewedFrame}
 from "./phase5V0083FuturePostOriginalDb_v39";
import type {P5ReviewedFuturePostOneGet,
 P5FuturePostActualPreReadback}
 from "./phase5V0083FuturePostOriginalDb_v39";
import type {P5SignedFuturePostPacket}
 from "../../../scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39";

const SHA=/^[a-f0-9]{64}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const PREFIX="P5 POST ";
const fail=(m:string):never=>{throw Error("REFUSED_P5_FUTURE_POST_GH_"+m);};
export interface P5FuturePostSignedPins{
 frozenPacketPath:string;expectedPacketSha256:string;
 approvedCodeSha:string;currentGithubRunId:string;
 manifestSha256:string;sourceRightsSha256:string;
 categoryBudgetSha256:string;providerContractSha256:string;
 requestSha256:string;requestContextSha256:string;
 frameSha256:string;providerPriceSha256:string;
}
export interface P5PostGhRunHistory{
 total_count:number;
 workflow_runs:{id:number;display_title:string;
 status:string;created_at:string;conclusion:string|null}[];
}
const exactTime=(x:string):number=>{
 if(typeof x!=="string"||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)||
    !Number.isFinite(Date.parse(x))||
    new Date(x).toISOString()!==x)
  return fail("INVALID_READONLY_DB_CLOCK");
 return Date.parse(x);
};
export function admitP5FuturePostFrozenForReadOnly(
 bytes:Buffer,packet:P5SignedFuturePostPacket,
 pins:P5FuturePostSignedPins
):P5ReviewedFuturePostOneGet{
 if(!pins||!PATH.test(pins.frozenPacketPath??"")||
    !/^[a-f0-9]{40}$/.test(pins.approvedCodeSha??"")||
    !/^[0-9]{5,25}$/.test(pins.currentGithubRunId??"")||
    ![pins.expectedPacketSha256,pins.manifestSha256,
      pins.sourceRightsSha256,pins.categoryBudgetSha256,
      pins.providerContractSha256,pins.requestSha256,
      pins.requestContextSha256,pins.frameSha256,pins.providerPriceSha256]
      .every(x=>typeof x==="string"&&SHA.test(x))||
    !Buffer.isBuffer(bytes)||bytes.length<300||bytes.length>100000||
    createHash("sha256").update(bytes).digest("hex")!==pins.expectedPacketSha256)
  fail("UNREVIEWED_FROZEN_POST_PACKET_OR_SHA");
 if(!packet||
    packet.schema!=="v39.phase5.github-future-post-reviewed-release.v1"||
    packet.approvedCodeSha!==pins.approvedCodeSha||
    packet.independentSourceContentsUseAndRESTReleaseAttested!==true||
    !packet.reviewed||Object.hasOwn(packet.reviewed,"githubRunId"))
  fail("CROSS_RUN_OR_UNATTESTED_FUTURE_POST");
 const p={...packet.reviewed,
  githubRunId:pins.currentGithubRunId} as P5ReviewedFuturePostOneGet;
 verifyP5FuturePostReviewedFrame(p);
 if(p.manifestSha256!==pins.manifestSha256||
    p.reviewedSourceRightsSha256!==pins.sourceRightsSha256||
    p.reviewedCategoryBudgetSha256!==pins.categoryBudgetSha256||
    p.reviewedProviderContractSha256!==pins.providerContractSha256||
    p.requestSha256!==pins.requestSha256||
    p.reviewedRequestContextSha256!==pins.requestContextSha256||
    p.reviewedFrameSha256!==pins.frameSha256||
    p.reviewedProviderPriceSha256!==pins.providerPriceSha256)
  fail("FROZEN_POST_RIGHTS_BUDGET_REQUEST_DRIFT");
 return p;
}
export function planP5FuturePostOneChild(
 p:P5ReviewedFuturePostOneGet,
 pre:P5FuturePostActualPreReadback,
 dbClockUtc:string,
 history:P5PostGhRunHistory|null,
 frozenPath:string
){
 const f=verifyP5FuturePostReviewedFrame(p);
 if(!PATH.test(frozenPath)||
    !pre||pre.status!=="ACTUAL_SAME_FLIGHT_SOURCE_BOUND_PRE_PARTIAL_ALLOWED"||
    pre.manifestSha256!==p.manifestSha256||
    pre.runDayIndex!==p.runDayIndex||
    pre.flightInstanceId!==p.flightInstanceId||
    pre.observedFromIndependentRestrictedDb!==true||
    pre.providerCalls!==0||pre.databaseWrites!==0||
    !Number.isSafeInteger(pre.observedValidHorizonCount)||
    pre.observedValidHorizonCount<1||
    pre.observedValidHorizonCount>3||
    !Array.isArray(pre.observedValidHorizons)||
    pre.observedValidHorizons.length!==pre.observedValidHorizonCount||
    !Array.isArray(pre.missingPreHorizons)||
    pre.missingPreHorizons.length!==3-pre.observedValidHorizonCount)
  fail("NO_REAL_SIGNED_NATIVE_PRE_NOT_ALL_THREE_REQUIRED");
 const now=exactTime(dbClockUtc);
 if(now<f.start)
  return{status:"FUTURE_POST_NOT_YET_IN_REVIEWED_WINDOW" as const,
   shouldDispatch:false as const,observedPreCount:pre.observedValidHorizonCount,
   missingPreCount:pre.missingPreHorizons.length,
   providerCalls:0 as const,databaseWrites:0 as const};
 if(now>f.end-90_000)
  return{status:"FUTURE_POST_MISSED_OR_TOO_CLOSE_NO_LATE_GET" as const,
   shouldDispatch:false as const,observedPreCount:pre.observedValidHorizonCount,
   missingPreCount:pre.missingPreHorizons.length,
   providerCalls:0 as const,databaseWrites:0 as const};
 if(!history||!Number.isSafeInteger(history.total_count)||
    history.total_count<0||history.total_count>100||
    !Array.isArray(history.workflow_runs)||
    history.workflow_runs.length!==history.total_count)
  return fail("GITHUB_POST_RUN_HISTORY_TRUNCATED_OR_UNAVAILABLE");
 let seen=false;
 for(const r of history.workflow_runs){
  if(!r||!Number.isSafeInteger(r.id)||r.id<=0||
     typeof r.display_title!=="string"||
     !["queued","in_progress","completed","waiting",
       "pending","requested"].includes(r.status)||
     !Number.isFinite(Date.parse(r.created_at)))
    fail("MALFORMED_REST_POST_GITHUB_HISTORY");
  if(!r.display_title.startsWith(PREFIX))
    fail("OLD_UNIDENTIFIABLE_POST_WORKFLOW_ATTEMPT_HOLD");
  if(r.display_title===PREFIX+frozenPath)seen=true;
 }
 return{status:seen?"PREVIOUS_SIGNED_POST_ATTEMPT_NO_PAID_RETRY" as const:
   "ONE_REVIEWED_POST_CHILD_CAN_BE_DISPATCHED" as const,
  shouldDispatch:!seen,
  observedPreCount:pre.observedValidHorizonCount,
  missingPreCount:pre.missingPreHorizons.length,
  providerCalls:0 as const,databaseWrites:0 as const};
}
