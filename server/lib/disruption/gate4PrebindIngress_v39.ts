/**
 * DRAFT / NOT DEPLOYED: Gate4 callback pre-binding durable quarantine.
 *
 * Provider allocates subscription ID during CREATE; the callback receiver
 * must be ready BEFORE CREATE for billable SEND. During this brief gap,
 * callback-secret possession and a claimed provider subscription ID are
 * NOT positive provider ownership. First store the original bytes under
 * exact independently reviewed scope; do NOT attribute, emit science events,
 * start Phase6, mutate provider, or enroll an inferred owned ID.
 *
 * On successful durable COMMIT plus independent database readback, ACK only
 * original receipt. Any persistence uncertainty -> non-2xx/STOP escalation.
 * Neither this module nor a local test establishes external source custody,
 * independent STOP, paid approval, or provider-hard-credit cap.
 */
import {createHash} from "node:crypto";
export type Gate4PrebindScopeV39=Readonly<{
  scopeId:string;
  authorizationSha256:string;
  sourceCommit:string;
  airportIcao:string;
}>;
export type Gate4PrebindOriginalV39=Readonly<{
  scopeId:string;
  authorizationSha256:string;
  sourceCommit:string;
  airportIcao:string;
  claimedSubscriptionId:string;
  originalSha256:string;
  originalBytes:Buffer;
}>;
export type Gate4PrebindReceiptV39=Readonly<{
  scopeId:string;
  originalSha256:string;
  committed:boolean;
  originalBytesVerified:boolean;
}>;
export type Gate4PrebindOriginalStoreV39=Readonly<{
  writeOriginal:(original:Gate4PrebindOriginalV39)=>
    Promise<Gate4PrebindReceiptV39>;
  readBackOriginal:(scopeId:string,originalSha256:string)=>
    Promise<Gate4PrebindReceiptV39>;
}>;
export type Gate4PrebindIngressResultV39=Readonly<{
  status:"QUARANTINED_DURABLY_PENDING_ID_BINDING"|"HOLD";
  reason:string;
  httpStatus:200|400|415|422|503;
  responseAcknowledged:boolean;
  immutableOriginalVerified:boolean;
  attributedToOwnedSubscription:false;
  sourceOwnerConfirmed:false;
  paidAuthorization:false;
  providerRequests:0;
}>;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA40=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const ICAO=/^[A-Z]{4}$/;
const CLAIM=/^[A-Za-z0-9_-]{6,128}$/;
const MAX_RAW_BYTES=2*1024*1024;
const result=(status:Gate4PrebindIngressResultV39["status"],
  reason:string,httpStatus:Gate4PrebindIngressResultV39["httpStatus"]):
Gate4PrebindIngressResultV39=>({
  status,reason,httpStatus,responseAcknowledged:httpStatus===200,
  immutableOriginalVerified:httpStatus===200,
  attributedToOwnedSubscription:false,sourceOwnerConfirmed:false,
  paidAuthorization:false,providerRequests:0
});
function consistentReceipt(
  got:Gate4PrebindReceiptV39|null|undefined,
  scopeId:string,sha:string
):boolean{
  return !!got&&got.scopeId===scopeId&&got.originalSha256===sha&&
    got.committed===true&&got.originalBytesVerified===true;
}
/** Strictly independent scope provided by reviewed ticket, NOT callback body. */
export function checkGate4PrebindScopeV39(s:Gate4PrebindScopeV39):boolean{
  return !!s&&UUID.test(s.scopeId)&&SHA40.test(s.sourceCommit)&&
    SHA256.test(s.authorizationSha256)&&ICAO.test(s.airportIcao);
}
export async function quarantineGate4PrebindOriginalV39(
  scope:Gate4PrebindScopeV39,
  raw:Buffer,
  store:Gate4PrebindOriginalStoreV39
):Promise<Gate4PrebindIngressResultV39>{
  if(!checkGate4PrebindScopeV39(scope)||!store||
    typeof store.writeOriginal!=="function"||
    typeof store.readBackOriginal!=="function")
    return result("HOLD","INDEPENDENT_SCOPE_OR_STORE_UNAVAILABLE",503);
  if(!Buffer.isBuffer(raw)||raw.length<2||raw.length>MAX_RAW_BYTES)
    return result("HOLD","ORIGINAL_BODY_UNAVAILABLE_OR_TOO_LARGE",400);
  let parsed:unknown;
  try{parsed=JSON.parse(raw.toString("utf8"));}
  catch{return result("HOLD","ORIGINAL_JSON_INVALID",400);}
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))
    return result("HOLD","ORIGINAL_ENVELOPE_INVALID",422);
  const e=parsed as Record<string,unknown>;
  const subscription=e.subscription;
  if(!subscription||typeof subscription!=="object"||
     Array.isArray(subscription))
    return result("HOLD","SUBSCRIPTION_CLAIM_MISSING",422);
  const sub=subscription as Record<string,unknown>;
  const subject=sub.subject;
  if(!subject||typeof subject!=="object"||Array.isArray(subject))
    return result("HOLD","SUBJECT_CLAIM_MISSING",422);
  const s=subject as Record<string,unknown>;
  if(!CLAIM.test(sub.id as string??"")||
    s.type!=="FlightByAirportIcao"||
    s.id!==scope.airportIcao||
    !Array.isArray(e.flights)||e.flights.length>250)
    return result("HOLD","UNEXPECTED_ALERT_SCOPE_OR_ENVELOPE",422);
  // "claimed" is untrusted: this must never become a signed owner receipt.
  const sha=createHash("sha256").update(raw).digest("hex");
  const original:Gate4PrebindOriginalV39={
    ...scope,claimedSubscriptionId:sub.id as string,
    originalSha256:sha,originalBytes:Buffer.from(raw)
  };
  try{
    const committed=await store.writeOriginal(original);
    if(!consistentReceipt(committed,scope.scopeId,sha))
      return result("HOLD","DURABLE_WRITE_NOT_CONFIRMED",503);
    const verified=await store.readBackOriginal(scope.scopeId,sha);
    if(!consistentReceipt(verified,scope.scopeId,sha))
      return result("HOLD","DURABLE_READBACK_NOT_CONFIRMED",503);
  }catch{
    return result("HOLD","DURABLE_STORAGE_OR_READBACK_UNAVAILABLE",503);
  }
  return result("QUARANTINED_DURABLY_PENDING_ID_BINDING",
    "ORIGINAL_ONLY_NO_OWNER_CLAIM",200);
}
