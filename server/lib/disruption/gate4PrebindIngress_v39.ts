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
  readBackOriginal:(original:Gate4PrebindOriginalV39)=>
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
  // Only the route's authenticated bearer path reaches this function.
  // A provider-shaped but unfamiliar envelope must NOT be discarded before
  // its original bytes are stored: charged SENDs cannot be reconstructed later.
  // Quarantine remains untrusted and unattributed until separate, verified
  // positive CREATE/V0072 ownership and offline contract review.
  let parsed:unknown;
  try{parsed=JSON.parse(raw.toString("utf8"));}
  catch{return result("HOLD","ORIGINAL_JSON_INVALID",400);}
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))
    return result("HOLD","ORIGINAL_ENVELOPE_INVALID",422);
  const e=parsed as Record<string,unknown>;
  const sub=e.subscription&&typeof e.subscription==="object"&&
    !Array.isArray(e.subscription)
    ?e.subscription as Record<string,unknown>:null;
  const claimedId=typeof sub?.id==="string"&&CLAIM.test(sub.id)
    ?sub.id:"UNVERIFIED";
  const subject=sub?.subject&&typeof sub.subject==="object"&&
    !Array.isArray(sub.subject)
    ?sub.subject as Record<string,unknown>:null;
  // These safe fixed codes explain provider-contract divergence but reveal no
  // payload value, flight identity, subscription ID or secret to logs.
  let contractReason="ORIGINAL_ONLY_NO_OWNER_CLAIM";
  if(!sub)contractReason="UNTRUSTED_SUBSCRIPTION_MISSING";
  else if(claimedId==="UNVERIFIED")
    contractReason="UNTRUSTED_SUBSCRIPTION_ID_INVALID";
  else if(!subject)contractReason="UNTRUSTED_SUBJECT_MISSING";
  else if(subject.type!=="FlightByAirportIcao")
    contractReason="UNTRUSTED_SUBJECT_TYPE_DIFFERENT";
  // Current official AeroDataBox schema permits a nullable subject.id.
  // A null or absent subject ID is not grounds to destroy a paid original.
  else if(subject.id!==scope.airportIcao&&
     subject.id!==null&&subject.id!==undefined)
    contractReason="UNTRUSTED_SUBJECT_ID_DIFFERENT";
  else if(!Array.isArray(e.flights))
    contractReason="UNTRUSTED_FLIGHTS_NOT_ARRAY";
  else if(e.flights.length>250)
    contractReason="UNTRUSTED_FLIGHTS_OVER_250";
  else if(subject.id===null||subject.id===undefined)
    contractReason="OFFICIAL_OPTIONAL_SUBJECT_ID_ABSENT";
  const sha=createHash("sha256").update(raw).digest("hex");
  const original:Gate4PrebindOriginalV39={
    ...scope,claimedSubscriptionId:claimedId,
    originalSha256:sha,originalBytes:Buffer.from(raw)
  };
  try{
    const committed=await store.writeOriginal(original);
    if(!consistentReceipt(committed,scope.scopeId,sha))
      return result("HOLD","DURABLE_WRITE_NOT_CONFIRMED",503);
    const verified=await store.readBackOriginal(original);
    if(!consistentReceipt(verified,scope.scopeId,sha))
      return result("HOLD","DURABLE_READBACK_NOT_CONFIRMED",503);
  }catch(e){
    // Return only a fixed, reviewed code to the authenticated callback
    // caller. Never surface PostgreSQL details, SQL strings or secrets.
    const candidate=e instanceof Error?e.message:"";
    const reason=/^GATE4_PREBIND_(ACQUIRE|BEGIN|INSERT|TX_READBACK|TX_COMPARE|COMMIT|POST_COMMIT_QUERY)_HOLD$/.test(candidate)
      ?candidate:"DURABLE_STORAGE_OR_READBACK_UNAVAILABLE";
    return result("HOLD",reason,503);
  }
  return result("QUARANTINED_DURABLY_PENDING_ID_BINDING",
    contractReason,200);
}
