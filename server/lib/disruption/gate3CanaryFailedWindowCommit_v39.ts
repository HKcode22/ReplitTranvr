/**
 * Gate3 — FAILED outcome from the shared prepaid window to the LOGGED
 * failure-receipt COMMIT owner. DRAFT / no paid runtime wiring.
 *
 * This is not an admission controller, successful SETTLED receipt, or
 * provider cleanup. It intentionally rejects completed/settling windows,
 * unauthenticated session IDs, and any result not explicitly FAILED.
 * Future real owner MUST independently review provider exposure + rights.
 *
 * Never digest raw stopReason text, provider balances, absolute account
 * credit data, provider subscription IDs, or original webhook bodies.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import type {PrepaidLiveWindowResultV39} from "./prepaidProbeWindow_v39";
import {
  commitGate3CanaryFailureV39,
  type Gate3CommittedFailureV39,
} from "./gate3CanaryFailureCommit_v39";
import type {Gate3CanaryFailureCodeV39} from "./gate3CanaryFailureReceipt_v39";

export type Gate3FailedWindowInputV39=Readonly<{
  expectedSessionId:string;
  icao:string;
  authorizationEvidenceSha256:string;
  result:PrepaidLiveWindowResultV39;
}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ICAO=/^[A-Z]{4}$/;
const SHA=/^[0-9a-f]{64}$/;
const reconciliation=new Set(["MATCH","DELIVERY_GAP","MISMATCH","UNRESOLVED"]);
const isDate=(v:unknown)=>v instanceof Date&&Number.isFinite(v.getTime());
const nonneg=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;

/** Classified reason + safe evidence pointer: neither implies cleanup. */
export function classifyGate3FailedWindowV39(
  input:Gate3FailedWindowInputV39,
):Readonly<{failureCode:Gate3CanaryFailureCodeV39;safeEvidenceSha256:string}>{
  if(!input||typeof input!=="object"||Array.isArray(input)||
     typeof input.expectedSessionId!=="string"||!UUID.test(input.expectedSessionId)||
     typeof input.icao!=="string"||!ICAO.test(input.icao)||
     typeof input.authorizationEvidenceSha256!=="string"||
     !SHA.test(input.authorizationEvidenceSha256)||
     !input.result||typeof input.result!=="object"||
     input.result.runtimeSessionId!==input.expectedSessionId||
     input.result.status!=="failed"||
     !reconciliation.has(input.result.reconciliationStatus)||
     (input.result.stopReason!==null&&
       (typeof input.result.stopReason!=="string"||
        input.result.stopReason.length===0))||
     typeof input.result.subscriptionDeleted!=="boolean"||
     typeof input.result.durationCensored!=="boolean"||
     !isDate(input.result.windowStart)||!isDate(input.result.windowEnd)||
     input.result.windowEnd.getTime()<input.result.windowStart.getTime()||
     !nonneg(input.result.internalSendCredits)||
     !nonneg(input.result.settlementReads)){
    throw Error("GATE3_FAILED_WINDOW_SCOPE_OR_RESULT_INVALID");
  }
  const r=input.result;
  const code:Gate3CanaryFailureCodeV39=
    r.subscriptionDeleted===false&&r.stopReason==="subscription_delete_failed"
      ?"OWNED_DELETE_UNVERIFIED"
    :r.stopReason?.startsWith("subscription_bind_failed_")
      ?"BIND_FAILED"
    :r.stopReason?.startsWith("subscription_create_provider_outcome_unverified_hold")||
     r.stopReason==="subscription_create_failed_after_exact_reconciliation"
      ?"CREATE_AMBIGUOUS_ACCOUNT_HOLD"
    :r.reconciliationStatus==="DELIVERY_GAP"||
     r.reconciliationStatus==="MISMATCH"
      ?"CREDIT_DIFFERENCE"
    :r.reconciliationStatus==="UNRESOLVED"
      ?"SETTLEMENT_UNRESOLVED"
    :"WINDOW_STOPPED";
  // This is only a metadata digest, NOT cryptographic proof that provider
  // deletion, source integrity, or account reconciliation was verified.
  const safeEvidenceSha256=createHash("sha256").update(JSON.stringify({
    schema:"v39.phase3.gate3.failed-window-metadata.v1",
    sessionId:input.expectedSessionId,icao:input.icao,
    authorizationEvidenceSha256:input.authorizationEvidenceSha256,
    failureCode:code,
    reconciliationStatus:r.reconciliationStatus,
    durationCensored:r.durationCensored,
    subscriptionDeleted:r.subscriptionDeleted,
    // Deliberately no externalCredits, account balance, free-form reason,
    // provider subscription ID, webhook body or raw source contents.
  })).digest("hex");
  return {failureCode:code,safeEvidenceSha256};
}

export async function commitGate3FailedWindowV39(
  pool:Pick<Pool,"connect">,
  input:Gate3FailedWindowInputV39,
):Promise<Gate3CommittedFailureV39>{
  // Fail closed BEFORE pool acquisition if result is not an exact failed
  // window; this adapter cannot convert a fixture/success into LIVE PASS.
  const classified=classifyGate3FailedWindowV39(input);
  return commitGate3CanaryFailureV39(pool,{
    sessionId:input.expectedSessionId,
    icao:input.icao,
    authorizationEvidenceSha256:input.authorizationEvidenceSha256,
    failureCode:classified.failureCode,
    safeEvidenceSha256:classified.safeEvidenceSha256,
  });
}
