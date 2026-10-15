/**
 * Compensate for transport-ambiguous provider CREATE.
 *
 * The service may have created a billable subscription even if the HTTP
 * response is lost/throws. Never blindly retry CREATE; run the existing
 * strict provider LIST reconciliation for one exact owned ICAO + callback
 * identity. The injected recovery hook MUST check exact provider identity
 * and refuse multiple matches. This module itself makes NO provider calls.
 *
 * Null means strict recovery completed and found NO matching ACTIVE
 * subscription. An exception means the provider account outcome is
 * INDETERMINATE and new paid exposure MUST remain on hold.
 */
export async function resolveAmbiguousPrepaidCreateV39<T extends {id?:string|null}>(
  hooks:{
    createOnce:()=>Promise<T|null>;
    recoverExactUsingStrictList:()=>Promise<T|null>;
  },
):Promise<Readonly<{
  subscription:T|null;
  recoveredAfterAmbiguity:boolean;
}>>{
  if(!hooks || typeof hooks.createOnce!=="function"||
     typeof hooks.recoverExactUsingStrictList!=="function")
    throw Error("PREPAID_AMBIGUOUS_CREATE_HOOKS_INVALID");
  let created:T|null=null;
  try{
    created=await hooks.createOnce();
  }catch{
    // Deliberately treat exceptions as ambiguous, NOT proof of non-create.
  }
  if(created?.id){
    if(typeof created.id!=="string"||!created.id.trim())
      throw Error("PREPAID_CREATE_INVALID_SUBSCRIPTION_ID");
    return {subscription:created,recoveredAfterAmbiguity:false};
  }
  try{
    const recovered=await hooks.recoverExactUsingStrictList();
    if(recovered && (!recovered.id||typeof recovered.id!=="string"||
       !recovered.id.trim()))
      throw Error("PREPAID_AMBIGUOUS_CREATE_INVALID_RECOVERED_ID");
    return {subscription:recovered,recoveredAfterAmbiguity:!!recovered};
  }catch{
    // A failed LIST, multiple exact matches, or unexpected recovered
    // identity is not the same as a definitively absent subscription.
    throw Error("PREPAID_AMBIGUOUS_CREATE_PROVIDER_OUTCOME_UNVERIFIED_HOLD");
  }
}
