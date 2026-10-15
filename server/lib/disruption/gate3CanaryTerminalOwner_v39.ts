/**
 * Gate3 terminal SQL disposition adapter — DRAFT, provider-free.
 *
 * Bind one exact prepaid window result to exactly ONE of the existing
 * PostgreSQL transaction-owned terminal receipt writers. A failed window
 * must never flow to SETTLED, and an incomplete/held success candidate must
 * not mutate an owner just because its SQL identity is syntactically valid.
 *
 * IMPORTANT: This is neither the live execution owner nor permission to
 * create a subscription. Host release identity, actual callback source
 * readback, signed AUTH, and provider settlement/delete must be
 * independently VERIFIED before the future live owner can call it.
 *
 * In particular: sourceReadbackVerified/publishedReceiverParityVerified
 * inputs here are NOT trusted attestations, and a committed candidate is
 * not a certified Gate3 PASS.
 */
import type {Pool} from "pg";
import type {PrepaidLiveWindowResultV39} from "./prepaidProbeWindow_v39";
import {
  commitGate3FailedWindowV39,
  type Gate3FailedWindowInputV39,
} from "./gate3CanaryFailedWindowCommit_v39";
import {
  commitGate3SettledCandidateV39,
  type Gate3SettledCommitInputV39,
} from "./gate3CanarySettledCommit_v39";

export type Gate3TerminalOwnerInputV39=Readonly<{
  sessionId:string;
  icao:string;
  authorizationEvidenceSha256:string;
  canaryCreditCeiling:number;
  fixedExposureSeconds:number;
  sourceReadbackVerified:boolean;
  publishedReceiverParityVerified:boolean;
  foreignActiveBillableCount:number;
  result:PrepaidLiveWindowResultV39;
}>;

export type Gate3TerminalOwnerReceiptV39=Readonly<{
  schema:"v39.phase3.gate3.terminal-owner-disposition.v1";
  disposition:"FAILED_DURABLY_RECORDED"|"SETTLED_CANDIDATE_DURABLY_RECORDED";
  sessionId:string;
  committed:true;
  exactSqlOwnerReceipt:true;
  liveGate3Certified:false;
  sourceAndProviderEvidenceAuthenticatedHere:false;
  authorizesAnotherPaidRun:false;
  providerCalls:0;
}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z]{4}$/;

export async function commitGate3TerminalDispositionV39(
  pool:Pick<Pool,"connect">,
  input:Gate3TerminalOwnerInputV39,
):Promise<Gate3TerminalOwnerReceiptV39>{
  if(!input||typeof input!=="object"||Array.isArray(input)||
     typeof input.sessionId!=="string"||!UUID.test(input.sessionId)||
     typeof input.icao!=="string"||!ICAO.test(input.icao)||
     typeof input.authorizationEvidenceSha256!=="string"||
     !SHA.test(input.authorizationEvidenceSha256)||
     !Number.isSafeInteger(input.canaryCreditCeiling)||
     input.canaryCreditCeiling<1||input.canaryCreditCeiling>100||
     !Number.isSafeInteger(input.fixedExposureSeconds)||
     input.fixedExposureSeconds<1||input.fixedExposureSeconds>3600||
     typeof input.sourceReadbackVerified!=="boolean"||
     typeof input.publishedReceiverParityVerified!=="boolean"||
     !Number.isSafeInteger(input.foreignActiveBillableCount)||
     input.foreignActiveBillableCount<0||
     !input.result||typeof input.result!=="object"||
     input.result.runtimeSessionId!==input.sessionId)
    throw Error("GATE3_TERMINAL_OWNER_EXACT_INPUT_REQUIRED");

  let disposition:Gate3TerminalOwnerReceiptV39["disposition"];
  if(input.result.status==="failed"){
    const failure:Gate3FailedWindowInputV39={
      expectedSessionId:input.sessionId,
      icao:input.icao,
      authorizationEvidenceSha256:input.authorizationEvidenceSha256,
      result:input.result,
    };
    const r=await commitGate3FailedWindowV39(pool,failure);
    if(r.committed!==true)throw Error("GATE3_TERMINAL_OWNER_FAILURE_NOT_COMMITTED_HOLD");
    disposition="FAILED_DURABLY_RECORDED";
  }else if(input.result.status==="settling"||input.result.status==="completed"){
    const success:Gate3SettledCommitInputV39={
      sessionId:input.sessionId,icao:input.icao,
      authorizationEvidenceSha256:input.authorizationEvidenceSha256,
      assessment:{
        expectedSessionId:input.sessionId,
        canaryCreditCeiling:input.canaryCreditCeiling,
        fixedExposureSeconds:input.fixedExposureSeconds,
        sourceReadbackVerified:input.sourceReadbackVerified,
        publishedReceiverParityVerified:input.publishedReceiverParityVerified,
        foreignActiveBillableCount:input.foreignActiveBillableCount,
        result:input.result,
      },
    };
    const r=await commitGate3SettledCandidateV39(pool,success);
    if(r.committed!==true)throw Error("GATE3_TERMINAL_OWNER_SETTLED_NOT_COMMITTED_HOLD");
    disposition="SETTLED_CANDIDATE_DURABLY_RECORDED";
  }else{
    throw Error("GATE3_TERMINAL_OWNER_UNKNOWN_RESULT_HOLD");
  }
  return {
    schema:"v39.phase3.gate3.terminal-owner-disposition.v1",
    disposition,sessionId:input.sessionId,committed:true,
    exactSqlOwnerReceipt:true,liveGate3Certified:false,
    sourceAndProviderEvidenceAuthenticatedHere:false,
    authorizesAnotherPaidRun:false,providerCalls:0,
  };
}
