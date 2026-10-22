/**
 * Gate4 DRAFT ownership handoff from pre-ID quarantine to exact provider ID.
 *
 * This does NOT authorize a provider CREATE, DELETE, credit spend, publication,
 * source attribution, or scientific replay. All writes are injected; the
 * production adapter is a separately STAGED DB migration (V0072).
 *
 * Independent signer's identity, positive CREATE response provenance,
 * external monotonic anchor trust, and exact provider-account identity MUST be
 * established by a distinct, permissioned supervisor. Caller-provided pins,
 * signatures and mock strict LIST alone do not establish these facts.
 */
import {inspectGate4SignedStopCustodyV39,
  type Gate4SignedStopTicketInputV39} from
  "./gate4SignedStopCustody_v39";
import type {Gate4CustodyExternalAnchorV39} from
  "./gate4DurableCustodyReview_v39";
import type {WebhookSubscription} from "./aerodataboxLimiter_v3";
import {createHash} from "node:crypto";

export type Gate4OwnedBindingV39=Readonly<{
  scopeId:string;
  authorizationSha256:string;
  sourceCommit:string;
  airportIcao:string;
  subscriptionId:string;
  reviewedCreateReceiptSha256:string;
  signedStopTicketSha256:string;
}>;
export type Gate4OwnedBindingReceiptV39=Readonly<{
  committed:boolean;
  exactFieldsVerified:boolean;
}>;
export type Gate4OwnedBindingStoreV39=Readonly<{
  bindOnce:(binding:Gate4OwnedBindingV39)=>
    Promise<Gate4OwnedBindingReceiptV39>;
  readBack:(binding:Gate4OwnedBindingV39)=>
    Promise<Gate4OwnedBindingReceiptV39>;
}>;
export type Gate4OwnedBindingResultV39=Readonly<{
  status:"BOUND_RECEIPT_ONLY_NOT_EXTERNAL_ATTESTATION"|"HOLD";
  reason:string;
  sourceOwnerAttested:false;
  externallyAnchoredIdentityAttested:false;
  quarantinedEventsAttributed:false;
  independentStopArmed:false;
  providerMutationCount:0;
  databaseWritesCertified:false;
  paidAuthorization:false;
}>;
const validHash=/^[a-f0-9]{64}$/;
const validSha=/^[a-f0-9]{40}$/;
const validUUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const validICAO=/^[A-Z]{4}$/;
const validId=/^[A-Za-z0-9_-]{6,128}$/;
const out=(status:Gate4OwnedBindingResultV39["status"],reason:string):
Gate4OwnedBindingResultV39=>({
  status,reason,sourceOwnerAttested:false,
  externallyAnchoredIdentityAttested:false,
  quarantinedEventsAttributed:false,independentStopArmed:false,
  providerMutationCount:0,databaseWritesCertified:false,
  paidAuthorization:false
});
const exact=(r:Gate4OwnedBindingReceiptV39|undefined|null)=>
  !!r&&r.committed===true&&r.exactFieldsVerified===true;

/** Never call this with values recovered solely from an Alert POST body. */
export async function bindGate4ExactVerifiedOwnerCandidateV39(args:{
  binding:Gate4OwnedBindingV39;
  custodyAnchor:Gate4CustodyExternalAnchorV39;
  signedStop:Gate4SignedStopTicketInputV39;
  providerListStrict:()=>Promise<WebhookSubscription[]>;
  store:Gate4OwnedBindingStoreV39;
}):Promise<Gate4OwnedBindingResultV39>{
  const {binding:b,custodyAnchor:a,signedStop,providerListStrict,store}=args;
  if(!b||!a||!signedStop||!store||
     typeof store.bindOnce!=="function"||
     typeof store.readBack!=="function"||
     typeof providerListStrict!=="function"||
     !validUUID.test(b.scopeId)||!validHash.test(b.authorizationSha256)||
     !validSha.test(b.sourceCommit)||!validICAO.test(b.airportIcao)||
     !validId.test(b.subscriptionId)||
     !validHash.test(b.reviewedCreateReceiptSha256)||
     !validHash.test(b.signedStopTicketSha256))
    return out("HOLD","MISSING_EXACT_SCOPE_OR_STORE");

  // The externally supplied anchor must be a valid exact owned state;
  // its independent provenance and anti-rollback protections are NOT
  // self-attestable by this implementation.
  if(a.schema!=="v39.gate4.custody-anchor.v1"||
     !Number.isSafeInteger(a.anchoredRevision)||
     a.anchoredRevision<2||!validHash.test(a.anchoredHeadDigestSha256)||
     a.scopeId!==b.scopeId||
     a.authorizationSha256!==b.authorizationSha256||
     a.sourceCommit!==b.sourceCommit||
     a.subjectId!==b.airportIcao||
     a.exactOwnedSubscriptionId!==b.subscriptionId||
     a.independentlyReviewedCreateReceiptSha256!==
       b.reviewedCreateReceiptSha256)
    return out("HOLD","INDEPENDENT_ANCHOR_FIELDS_MISMATCH");

  // Cryptographic signature and independently reviewed exact pins first,
  // BEFORE even a free strict LIST. Failure never logs raw signed material.
  let inspected:ReturnType<typeof inspectGate4SignedStopCustodyV39>;
  try{inspected=inspectGate4SignedStopCustodyV39(signedStop);}
  catch{return out("HOLD","SIGNED_STOP_TICKET_INVALID");}
  if(!inspected.cryptographicSignatureVerified||
     createHash("sha256").update(signedStop.ticketBytes).digest("hex")!==
       b.signedStopTicketSha256)
    return out("HOLD","SIGNED_TICKET_DIGEST_MISMATCH");
  const p=signedStop.independentPins;
  if(p.expectedSourceCommit!==b.sourceCommit||
     p.expectedScopeId!==b.scopeId||
     p.expectedAuthorizationSha256!==b.authorizationSha256||
     p.expectedSubscriptionId!==b.subscriptionId||
     p.expectedSubjectId!==b.airportIcao)
    return out("HOLD","STOP_SCOPE_BINDING_MISMATCH");

  let subs:WebhookSubscription[];
  try{subs=await providerListStrict();}
  catch{return out("HOLD","STRICT_PROVIDER_INVENTORY_UNAVAILABLE");}
  if(!Array.isArray(subs)||subs.some(s=>!s||
      typeof s.id!=="string"||typeof s.isActive!=="boolean"))
    return out("HOLD","STRICT_PROVIDER_INVENTORY_MALFORMED");
  const active=subs.filter(s=>s.isActive&&s.billingType==="CreditBased");
  if(active.length!==1||
     active[0].id!==b.subscriptionId||
     active[0].subject?.type!=="FlightByAirportIcao"||
     active[0].subject?.id!==b.airportIcao)
    return out("HOLD","OWNER_NOT_UNIQUE_ACTIVE_PROVIDER_SUBSCRIPTION");

  try{
    const committed=await store.bindOnce(b);
    if(!exact(committed))
      return out("HOLD","EXACT_OWNER_BIND_COMMIT_UNCONFIRMED");
    const reread=await store.readBack(b);
    if(!exact(reread))
      return out("HOLD","EXACT_OWNER_BIND_READBACK_MISMATCH");
  }catch{return out("HOLD","OWNED_BIND_STORE_UNAVAILABLE");}
  return out("BOUND_RECEIPT_ONLY_NOT_EXTERNAL_ATTESTATION",
    "POSITIVE_FIELDS_ONLY_PENDING_REAL_TRUST_AND_REPLAY");
}
