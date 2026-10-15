/**
 * V3.9 prepaid owner: compensation for the narrow interval between a
 * confirmed successful provider CREATE and its local SQL session BIND.
 *
 * A failed BIND does NOT imply the paid provider subscription is absent.
 * Attempt exact-ID strict deletion once (the injected adapter owns any
 * bounded provider retries and verifies absence). Even after verified
 * deletion the account remains SETTLEMENT_UNRESOLVED until the independent
 * owner compares authoritative balance and durably received SENDs.
 *
 * Provider-free module: no actual SDK/database imports, no implicit
 * authorization, and no attempt to create/recreate a subscription.
 */
export type PrepaidBindingRecoveryOutcomeV39 =Readonly<{
  status:"BOUND"|"BIND_FAILED_DELETED"|"BIND_FAILED_DELETE_UNRESOLVED";
  subscriptionDeleted:boolean;
  reconciliationRequired:boolean;
  paidRunSucceeded:false;
}>;
export interface PrepaidBindingRecoveryHooksV39 {
  bind:(sessionId:string,subscriptionId:string)=>Promise<void>;
  deleteOwnedVerified:(subscriptionId:string)=>Promise<boolean>;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function bindOrCompensatePrepaidSubscriptionV39(
  input:{sessionId:string;subscriptionId:string},
  hooks:PrepaidBindingRecoveryHooksV39,
):Promise<PrepaidBindingRecoveryOutcomeV39>{
  if(!input||!UUID.test(input.sessionId??"")||
     typeof input.subscriptionId!=="string"||
     !input.subscriptionId.trim()||
     input.subscriptionId.length>256||
     typeof hooks?.bind!=="function"||
     typeof hooks?.deleteOwnedVerified!=="function")
    throw Error("PREPAID_CREATE_BIND_COMPENSATION_INPUT_INVALID");
  try{
    await hooks.bind(input.sessionId,input.subscriptionId);
    return {status:"BOUND",subscriptionDeleted:false,
      reconciliationRequired:false,paidRunSucceeded:false};
  }catch{
    // Never retry provider CREATE after a BIND failure. The exact
    // subscription may still be billable even when SQL is unavailable.
    let deleted=false;
    try{deleted=(await hooks.deleteOwnedVerified(input.subscriptionId))===true;}
    catch{deleted=false;}
    return {
      status:deleted?"BIND_FAILED_DELETED":"BIND_FAILED_DELETE_UNRESOLVED",
      subscriptionDeleted:deleted,reconciliationRequired:true,
      paidRunSucceeded:false,
    };
  }
}
