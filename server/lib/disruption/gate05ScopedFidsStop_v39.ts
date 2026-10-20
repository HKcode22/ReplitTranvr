/**
 * Draft Gate0.5 emergency STOP adapters. NO automatic deployment/authority.
 *
 * The independent safety owner uses ONLY the narrowly granted SQL STOP function.
 * It cannot reach a dispatcher process's AbortController, so a remote STOP can
 * prevent additional reservations but cannot retract an already accepted GET.
 *
 * Local in-process STOP additionally aborts its controller immediately before
 * committing the same durable terminal STOP. Neither path refunds attempts.
 */
import type {Pool} from "pg";
export type Gate05StopReasonV39 = "OPERATOR_STOP"|"EXPIRED"|"SAFETY_ABORT";

type Gate05DurableReceiptV39={
  state:"STOPPED";
  reservedAttempts:number;
  reservedUnits:number;
  providerRequestAlreadySentMayBeBilled:true;
  paidProviderMutationByStop:0;
};
export interface Gate05StopReceiptV39 extends Gate05DurableReceiptV39 {
  localAbortRequested:true;
}
export interface Gate05IndependentStopReceiptV39 extends Gate05DurableReceiptV39 {
  localAbortRequested:false;
}

const safeUuid=(v:unknown):v is string=>
  typeof v==="string"&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const safeReason=(v:unknown):v is Gate05StopReasonV39=>
  v==="OPERATOR_STOP"||v==="EXPIRED"||v==="SAFETY_ABORT";

async function durableStop(
  db:Pick<Pool,"query">,scopeId:string,reason:Gate05StopReasonV39
):Promise<Gate05DurableReceiptV39>{
  // No direct table mutations, admin credentials, or provider requests.
  // SQL function serializes STOP with reservation on the scope row lock.
  const r=await db.query(
    "SELECT state,reserved_attempts,reserved_units FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)",
    [scopeId,reason]
  );
  if(r.rowCount!==1||r.rows[0]?.state!=="STOPPED")
    throw Error("GATE05_STOP_DURABLE_RECEIPT_HOLD");
  const attempts=Number(r.rows[0].reserved_attempts);
  const units=Number(r.rows[0].reserved_units);
  if(!Number.isSafeInteger(attempts)||attempts<0||attempts>6||
     !Number.isSafeInteger(units)||units!==attempts*2||units>12)
    throw Error("GATE05_STOP_ACCOUNTING_HOLD");
  return {
    state:"STOPPED",reservedAttempts:attempts,reservedUnits:units,
    providerRequestAlreadySentMayBeBilled:true,
    paidProviderMutationByStop:0
  };
}

/**
 * Owner-local path: abort first, then terminal SQL STOP. If SQL fails,
 * controller remains aborted; the caller must reconcile the scope.
 */
export async function stopGate05ScopedFidsV39(args:{
  db:Pick<Pool,"query">;
  scopeId:string;
  reason:Gate05StopReasonV39;
  controller:AbortController;
}):Promise<Gate05StopReceiptV39>{
  if(!args||!safeUuid(args.scopeId)||!safeReason(args.reason)||
     !(args.controller instanceof AbortController))
    throw Error("GATE05_STOP_SCOPE_OR_REASON_HOLD");
  args.controller.abort();
  const receipt=await durableStop(args.db,args.scopeId,args.reason);
  return {...receipt,localAbortRequested:true};
}

/**
 * A safety process independent of the dispatcher has no access to that
 * process's AbortController. It can still terminally STOP scope admission
 * through its own dedicated login and matching SQL function.
 *
 * Important: a GET reserved and already accepted before STOP may be billed.
 * An autonomous supervisor, authenticated safety session, and tested expiry
 * schedule must exist BEFORE any paid pilot.
 */
export async function stopGate05IndependentlyV39(args:{
  db:Pick<Pool,"query">;
  scopeId:string;
  reason:Gate05StopReasonV39;
}):Promise<Gate05IndependentStopReceiptV39>{
  if(!args||!safeUuid(args.scopeId)||!safeReason(args.reason))
    throw Error("GATE05_STOP_SCOPE_OR_REASON_HOLD");
  const receipt=await durableStop(args.db,args.scopeId,args.reason);
  return {...receipt,localAbortRequested:false};
}
