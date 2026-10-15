/**
 * Retain an explicit incident result when provider CREATE outcome cannot be
 * reconciled by the strict account subscription LIST.
 *
 * A timeout/failed strict LIST is not authoritative proof that no billable
 * subscription exists. NEVER retry CREATE, fabricate subscription deletion,
 * or perform purpose cleanup here: a callback may already have arrived.
 *
 * This module is provider-free. markSessionFailed may itself fail if the
 * UNLOGGED runtime disappeared; only the future LOGGED Gate3 owner can
 * independently record that unresolved outcome. This result is NOT durable
 * SQL confirmation or paid authorization.
 */
import type {PrepaidLiveWindowResultV39} from "./prepaidProbeWindow_v39";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PrepaidAmbiguousCreateHoldV39 =Readonly<{
  result:PrepaidLiveWindowResultV39;
  unloggedFailureStateAcknowledged:boolean;
  providerSubscriptionAbsenceProved:false;
  sourceCleanupPerformed:false;
  paidRestartAuthorized:false;
}>;

/** Exactly one best-effort SQL FAILED transition. No source deletion. */
export async function holdPrepaidAmbiguousCreateV39(input:{
  sessionId:string;
  windowStart:Date;
  markSessionFailed:(sessionId:string)=>Promise<void>;
  now?:()=>Date;
}):Promise<PrepaidAmbiguousCreateHoldV39>{
  if(!input||typeof input.sessionId!=="string"||!UUID.test(input.sessionId)||
     !(input.windowStart instanceof Date)||
     !Number.isFinite(input.windowStart.getTime())||
     typeof input.markSessionFailed!=="function"||
     (input.now!==undefined&&typeof input.now!=="function"))
    throw Error("PREPAID_AMBIGUOUS_CREATE_HOLD_INPUT_INVALID");

  let acknowledged=false;
  try{
    await input.markSessionFailed(input.sessionId);
    acknowledged=true;
  }catch{
    // UNLOGGED row may have vanished after PG restart.
    // Never treat this as a successful durable LOGGED receipt.
  }
  const end=input.now?.()??new Date();
  if(!(end instanceof Date)||!Number.isFinite(end.getTime()))
    throw Error("PREPAID_AMBIGUOUS_CREATE_HOLD_CLOCK_INVALID");
  const windowEnd=new Date(Math.max(input.windowStart.getTime(),end.getTime()));
  return {
    result:{
      status:"failed",
      runtimeSessionId:input.sessionId,
      windowStart:input.windowStart,
      windowEnd,
      durationCensored:true,
      stopReason:"subscription_create_provider_outcome_unverified_hold",
      reconciliationStatus:"UNRESOLVED",
      externalCredits:null,
      internalSendCredits:0, // unknown live value; NOT proof no callbacks
      maxObservedUnsettledCreditGap:0,
      settlementReads:0,
      metrics:null,
      cleanupVerifiedAtUtc:null,
      subscriptionDeleted:false,
    },
    unloggedFailureStateAcknowledged:acknowledged,
    providerSubscriptionAbsenceProved:false,
    sourceCleanupPerformed:false,
    paidRestartAuthorized:false,
  };
}
