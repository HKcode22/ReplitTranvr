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
  if(r.rowCount!==1||!Array.isArray(r.rows)||r.rows.length!==1||
     r.rows[0]?.state!=="STOPPED")
    throw Error("GATE05_STOP_DURABLE_RECEIPT_HOLD");
  // node-postgres normally returns COUNT(bigint) and SUM(bigint) as decimal
  // strings. Number(null), Number("") and Number(" ") all equal zero, but
  // absent/ambiguous receipts must never be interpreted as zero attempts.
  const counter=(x:unknown):number=>{
    if(typeof x==="number"&&Number.isSafeInteger(x)&&x>=0)return x;
    if(typeof x==="string"&&/^(?:0|[1-9][0-9]*)$/.test(x)){
      const n=Number(x);
      if(Number.isSafeInteger(n))return n;
    }
    throw Error("GATE05_STOP_ACCOUNTING_HOLD");
  };
  const attempts=counter(r.rows[0].reserved_attempts);
  const units=counter(r.rows[0].reserved_units);
  if(attempts>6||units!==attempts*2||units>12)
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


/**
 * Independent expiry guard CORE, not a deployed supervisor.
 *
 * The operator must provision an independently running process with the
 * dedicated safety LOGIN and an authenticated, immutable scope expiry. This
 * function does not look up the expiry from the DB (safety LOGIN has no
 * table SELECT rights), mint approval, activate scope or touch AeroDataBox.
 *
 * SQL reservation already checks clock_timestamp() < expires_at_utc; that is
 * the authoritative fail-closed deadline even if this process crashes.
 * This optional guard durably records STOPPED at/after that deadline.
 *
 * A process crash, machine sleep or network outage can delay its receipt;
 * do not represent invocation as a watchdog uptime guarantee.
 */
export async function runGate05ExpiryGuardV39(args:{
  db:Pick<Pool,"query">;
  scopeId:string;
  expiresAtUtc:string;
  /** Injectable clock/sleep allow fake-time testing without provider/DB. */
  nowMs?:()=>number;
  sleepMs?:(ms:number)=>Promise<void>;
}):Promise<Gate05IndependentStopReceiptV39>{
  if(!args||!safeUuid(args.scopeId)||
     typeof args.expiresAtUtc!=="string"||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(args.expiresAtUtc))
    throw Error("GATE05_EXPIRY_GUARD_INPUT_HOLD");
  const deadline=Date.parse(args.expiresAtUtc);
  // Date.parse silently normalizes impossible calendar days in some engines.
  // Round-trip the UTC calendar fields before trusting a safety deadline.
  if(!Number.isSafeInteger(deadline)||
     new Date(deadline).toISOString().slice(0,19)!==
       args.expiresAtUtc.slice(0,19))
    throw Error("GATE05_EXPIRY_GUARD_TIME_HOLD");
  const now=args.nowMs??Date.now;
  const sleep=args.sleepMs??((ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms)));
  // A long-running process is intentionally NOT an auth or deployment
  // mechanism. A maximum one-day horizon bounds stale supervisor inputs.
  const initial=now();
  if(!Number.isSafeInteger(initial)||deadline-initial>86_400_000)
    throw Error("GATE05_EXPIRY_GUARD_CLOCK_HOLD");
  let lastObserved=initial;
  for(let checks=0;checks<2882;checks++){
    const present=now();
    // A process clock may jump forward and then roll backward. Comparing
    // only against the initial timestamp misses this later regression.
    if(!Number.isSafeInteger(present)||
       present<initial-120_000||present<lastObserved-120_000)
      throw Error("GATE05_EXPIRY_GUARD_CLOCK_HOLD");
    lastObserved=present;
    const remaining=deadline-present;
    if(remaining<=0){
      return stopGate05IndependentlyV39({
        db:args.db,scopeId:args.scopeId,reason:"EXPIRED"
      });
    }
    // Independent guard wakes at least twice each minute; it cannot force
    // already dispatched HTTP requests to unbill.
    await sleep(Math.min(remaining,30_000));
  }
  throw Error("GATE05_EXPIRY_GUARD_BOUNDED_WAIT_HOLD");
}
