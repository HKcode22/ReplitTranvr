/**
 * Gate 3 terminal assessment for the existing PREPAID collector result.
 *
 * An OFFLINE_CANDIDATE is NOT a passed paid Gate3, a provider receipt, or
 * authorization to write a durable SETTLED SQL record. The future actual
 * paid owner must independently authenticate the exact source/readback
 * evidence and provider session/account before calling this function, and
 * any database terminalization needs separate owner-verifiable evidence.
 *
 * Absolute provider balance values and external spent credit deltas are
 * checked in memory only: neither enters evidenceDigestSha256.
 */
import {createHash} from "node:crypto";
import type {PrepaidLiveWindowResultV39}
  from "./prepaidProbeWindow_v39";

export interface Gate3TerminalAssessmentInputV39 {
  expectedSessionId:string;
  canaryCreditCeiling:number;
  fixedExposureSeconds:number;
  result:PrepaidLiveWindowResultV39;
  sourceReadbackVerified:boolean;
  publishedReceiverParityVerified:boolean;
  foreignActiveBillableCount:number;
}
export type Gate3TerminalAssessmentV39=Readonly<{
  schema:"v39.phase3.gate3.terminal-assessment.v1";
  status:"OFFLINE_CANDIDATE"|"HOLD";
  reasons:readonly string[];
  // Digest contains only non-provider metadata. A digest is NOT proof
  // of authorization or cryptographic provider delivery authenticity.
  safeMetadataDigestSha256:string|null;
  paidProviderCalls:0;
  approvedPaidCanary:false;
  authoritativeProviderEvidenceVerifiedHere:false;
  durableOwnerReceiptWritten:false;
}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const int=(v:unknown,max:number)=>typeof v==="number"&&
  Number.isSafeInteger(v)&&v>=0&&v<=max;
const canonical=(x:unknown):string=>JSON.stringify(x);
export function assessGate3CanaryTerminalV39(
  input:Gate3TerminalAssessmentInputV39,
):Gate3TerminalAssessmentV39{
  if(!input||!UUID.test(input.expectedSessionId??"")||
     !int(input.canaryCreditCeiling,100)||input.canaryCreditCeiling===0||
     !int(input.fixedExposureSeconds,3600)||input.fixedExposureSeconds===0||
     !int(input.foreignActiveBillableCount,100000)||
     typeof input.sourceReadbackVerified!=="boolean"||
     typeof input.publishedReceiverParityVerified!=="boolean"||
     !input.result || typeof input.result!=="object")
    throw Error("GATE3_TERMINAL_ASSESSMENT_INPUT_INVALID");

  const result=input.result;
  const reasons:string[]=[];
  const credit=result.externalCredits;
  const internal=result.internalSendCredits;
  if(result.runtimeSessionId!==input.expectedSessionId)
    reasons.push("WRONG_PREPAID_SESSION");
  if(result.status!=="settling"&&result.status!=="completed")
    reasons.push("WINDOW_NOT_SUCCESSFULLY_STOPPED");
  if(result.durationCensored!==false||result.stopReason!==null)
    reasons.push("WINDOW_STOPPED_EARLY_OR_ABNORMALLY");
  const start=result.windowStart instanceof Date?result.windowStart.getTime():NaN;
  const end=result.windowEnd instanceof Date?result.windowEnd.getTime():NaN;
  if(!Number.isFinite(start)||!Number.isFinite(end)||
     end-start < input.fixedExposureSeconds*1000)
    reasons.push("ACTUAL_EXPOSURE_SHORTER_THAN_FROZEN_DURATION");
  if(result.subscriptionDeleted!==true)
    reasons.push("OWNED_SUBSCRIPTION_DELETE_NOT_VERIFIED");
  if(result.reconciliationStatus!=="MATCH")
    reasons.push("EXACT_CREDIT_RECONCILIATION_NOT_MATCHED");
  if(!int(credit,100)||credit===0)
    reasons.push("AUTHORITATIVE_SPEND_MISSING_OR_NOT_POSITIVE");
  if(!int(internal,100)||internal===0)
    reasons.push("RECEIVED_ITEM_CREDITS_MISSING_OR_NOT_POSITIVE");
  if(int(credit,100)&&int(internal,100)&&credit!==internal)
    reasons.push("EXTERNAL_RECEIVED_ITEM_CREDITS_DIFFER");
  if(typeof credit==="number"&&credit>input.canaryCreditCeiling)
    reasons.push("EXTERNAL_CREDIT_HARD_CAP_EXCEEDED");
  if(typeof internal==="number"&&internal>input.canaryCreditCeiling)
    reasons.push("RECEIVED_ITEM_HARD_CAP_EXCEEDED");
  if(!Number.isSafeInteger(result.settlementReads)||result.settlementReads<3)
    reasons.push("THREE_STABLE_PROVIDER_READS_NOT_EVIDENCED");
  if(result.metrics===null)
    reasons.push("SOURCE_AND_CALLBACK_METRICS_MISSING");
  else {
    if(result.metrics.internalSendCredits!==internal)
      reasons.push("SOURCE_METRIC_COST_DISAGREEMENT");
    if(result.metrics.callbackFailures!==0||
       result.metrics.costItemDisagreementCount!==0)
      reasons.push("SOURCE_CALLBACK_OR_ITEM_COST_FAILURE");
    if(!int(result.metrics.deliveryCount,1_000_000)||
       result.metrics.deliveryCount===0)
      reasons.push("NO_DURABLY_RECEIVED_DELIVERY");
  }
  if(input.sourceReadbackVerified!==true)
    reasons.push("RAW_SOURCE_READBACK_NOT_VERIFIED");
  if(input.publishedReceiverParityVerified!==true)
    reasons.push("PUBLISHED_RECEIVER_PARITY_UNVERIFIED");
  if(input.foreignActiveBillableCount!==0)
    reasons.push("FOREIGN_BILLABLE_PROVIDER_SUBSCRIPTION_PRESENT");

  const status=reasons.length?"HOLD":"OFFLINE_CANDIDATE";
  // Avoid storing actual provider credit delta or absolute balance.
  const safeMetadataDigestSha256=status==="OFFLINE_CANDIDATE"
    ?createHash("sha256").update(canonical({
        schema:"v39.phase3.gate3.terminal-safe-metadata.v1",
        sessionId:input.expectedSessionId,
        receivedCredits:internal,
        settledReadCount:result.settlementReads,
        deliveryCount:result.metrics?.deliveryCount,
        callbackFailures:result.metrics?.callbackFailures,
        exactCreditMatch:true,
        strictProviderDeletion:true,
        sourceReadbackVerified:true,
        receiverParityVerified:true,
        noForeignBillables:true,
      })).digest("hex"):null;
  return {
    schema:"v39.phase3.gate3.terminal-assessment.v1",
    status,reasons:reasons.sort(),safeMetadataDigestSha256,
    paidProviderCalls:0,approvedPaidCanary:false,
    authoritativeProviderEvidenceVerifiedHere:false,
    durableOwnerReceiptWritten:false,
  };
}
