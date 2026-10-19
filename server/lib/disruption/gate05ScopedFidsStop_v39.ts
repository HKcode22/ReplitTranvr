/**
 * Draft pilot emergency stop adapter (NO automatic deployment or authority).
 * The ONLY write is the scoped terminal stop function on an already authorized
 * pilot. Do not give this to the unrestricted legacy application DB role.
 * The controller must retain an AbortController and pass signal to
 * fetchGate05ScopedFidsV39; stop cancels local HTTP first, then durably STOPs.
 * An HTTP request already accepted upstream can still bill after abort.
 */
import type {Pool} from "pg";
export type Gate05StopReasonV39 = "OPERATOR_STOP"|"EXPIRED"|"SAFETY_ABORT";

export interface Gate05StopReceiptV39 {
  state:"STOPPED";
  reservedAttempts:number;
  reservedUnits:number;
  localAbortRequested:true;
  providerRequestAlreadySentMayBeBilled:true;
  paidProviderMutationByStop:0;
}
const safeUuid=(v:string)=>/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
export async function stopGate05ScopedFidsV39(args:{
  db:Pick<Pool,"query">;
  scopeId:string;
  reason:Gate05StopReasonV39;
  controller:AbortController;
}):Promise<Gate05StopReceiptV39>{
  if(!args||!safeUuid(args.scopeId)||
     !["OPERATOR_STOP","EXPIRED","SAFETY_ABORT"].includes(args.reason)||
     !(args.controller instanceof AbortController))
    throw Error("GATE05_STOP_SCOPE_OR_REASON_HOLD");
  // Cancel immediately, before waiting for durable DB stop lock.
  args.controller.abort();
  const r=await args.db.query(
    "SELECT state,reserved_attempts,reserved_units FROM clean.stop_gate05_fids_pilot_v39($1::uuid,$2::text)",
    [args.scopeId,args.reason]
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
    localAbortRequested:true,
    providerRequestAlreadySentMayBeBilled:true,
    paidProviderMutationByStop:0
  };
}
