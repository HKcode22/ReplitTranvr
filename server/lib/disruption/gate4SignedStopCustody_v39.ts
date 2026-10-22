/**
 * Gate4 DRAFT, offline cryptographic STOP-ticket custody binding.
 *
 * Ed25519 signature over domain-separated SHA256(exact reviewed JSON bytes).
 * This is NOT a signer provisioning mechanism, paid authorization, external
 * safety service, production deployment, durable custody store, or proof that
 * any trusted human actually selected the independent pins.
 *
 * Independently reviewed keys, SHA pins, expected window and exact provider
 * subscription identity must be supplied OUTSIDE the ticket and authenticated
 * by the future isolated STOP process before use. Never use the ticket itself
 * to populate its own verification pins.
 */
import {
  createHash,createPublicKey,timingSafeEqual,verify
} from "node:crypto";
import {
  executeGate4IndependentStopCandidateV39,
  type Gate4IndependentStopTicketV39,
  type Gate4IndependentStopPinsV39,
  type Gate4IndependentHeartbeatEvidenceV39
} from "./gate4IndependentStopCandidate_v39";
import type {Gate4ExactOwnedStopDepsV39} from "./gate4StandaloneSafety_v39";

const DOMAIN=Buffer.from("ReplitTranvr:V39:GATE4:STOP_TICKET:ED25519:V1\0","utf8");
const SHA40=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const OWNED=/^[A-Za-z0-9_-]{6,128}$/;
const ICAO=/^[A-Z]{4}$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const KEYS=[
  "schema","sourceCommit","scopeId","authorizationSha256",
  "subscriptionId","subjectType","subjectId","startAtUtc","stopAtUtc"
] as const;
const stopHold=(reason:string):never=>{throw Error("GATE4_STOP_TICKET_"+reason+"_HOLD");};
const hash=(x:Buffer)=>createHash("sha256").update(x).digest();
const exactUtc=(x:unknown):boolean=>typeof x==="string"&&UTC.test(x)&&
  Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;

export type Gate4StopIndependentReviewPinsV39=Readonly<{
  independentlyReviewedTicketSha256:string;
  independentlyReviewedSignerSpkiSha256:string;
  expectedSourceCommit:string;
  expectedScopeId:string;
  expectedAuthorizationSha256:string;
  expectedSubscriptionId:string;
  expectedSubjectId:string;
  expectedStartAtUtc:string;
  expectedStopAtUtc:string;
}>;
export type Gate4SignedStopTicketInputV39=Readonly<{
  ticketBytes:Buffer;
  detachedSignatureBase64:string;
  signerSpkiDerBase64:string;
  independentPins:Gate4StopIndependentReviewPinsV39;
}>;

export function gate4StopTicketSigningMessageV39(bytes:Buffer):Buffer{
  if(!Buffer.isBuffer(bytes)||bytes.length<50||bytes.length>8192)
    return stopHold("BYTES");
  return Buffer.concat([DOMAIN,hash(bytes)]);
}
function canonicalBase64(x:unknown,min:number,max:number):Buffer{
  if(typeof x!=="string"||x.length>1024||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(x))
    return stopHold("BASE64");
  const data=Buffer.from(x,"base64");
  if(data.length<min||data.length>max||data.toString("base64")!==x)
    return stopHold("BASE64");
  return data;
}
function verifyTicket(input:Gate4SignedStopTicketInputV39):{
  ticket:Gate4IndependentStopTicketV39;
  stopPins:Gate4IndependentStopPinsV39;
}{
  if(!input||!input.independentPins)return stopHold("TRUST_ROOT");
  const p=input.independentPins;
  if(!SHA256.test(p.independentlyReviewedTicketSha256)||
     !SHA256.test(p.independentlyReviewedSignerSpkiSha256)||
     !SHA40.test(p.expectedSourceCommit)||
     !UUID.test(p.expectedScopeId)||
     !SHA256.test(p.expectedAuthorizationSha256)||
     !OWNED.test(p.expectedSubscriptionId)||
     !ICAO.test(p.expectedSubjectId)||
     !exactUtc(p.expectedStartAtUtc)||!exactUtc(p.expectedStopAtUtc))
    return stopHold("INDEPENDENT_PINS");

  const msg=gate4StopTicketSigningMessageV39(input.ticketBytes);
  if(!timingSafeEqual(hash(input.ticketBytes),
     Buffer.from(p.independentlyReviewedTicketSha256,"hex")))
    return stopHold("EXACT_BYTES_DIGEST");

  let parsed:unknown;
  try{parsed=JSON.parse(input.ticketBytes.toString("utf8"));}
  catch{return stopHold("JSON");}
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))
    return stopHold("STRUCTURE");
  const v=parsed as Record<string,unknown>;
  // Canonical wire shape rejects duplicate keys, reordered keys, alternative
  // JSON escapes, trailing bytes, BOMs and unknown/spliced fields.
  if(Object.keys(v).join("|")!==KEYS.join("|")||
     Buffer.from(JSON.stringify(v),"utf8").compare(input.ticketBytes)!==0)
    return stopHold("NONCANONICAL");
  if(v.schema!=="v39.gate4.independent-stop-ticket.v1"||
     v.subjectType!=="FlightByAirportIcao"||
     v.sourceCommit!==p.expectedSourceCommit||
     v.scopeId!==p.expectedScopeId||
     v.authorizationSha256!==p.expectedAuthorizationSha256||
     v.subscriptionId!==p.expectedSubscriptionId||
     v.subjectId!==p.expectedSubjectId||
     v.startAtUtc!==p.expectedStartAtUtc||
     v.stopAtUtc!==p.expectedStopAtUtc)
    return stopHold("SCOPE_MISMATCH");

  const spki=canonicalBase64(input.signerSpkiDerBase64,30,256);
  if(!timingSafeEqual(hash(spki),
      Buffer.from(p.independentlyReviewedSignerSpkiSha256,"hex")))
    return stopHold("SIGNER_FINGERPRINT");
  let key:ReturnType<typeof createPublicKey>;
  try{key=createPublicKey({key:spki,format:"der",type:"spki"});}
  catch{return stopHold("SIGNER_KEY");}
  if(key.type!=="public"||key.asymmetricKeyType!=="ed25519"||
     !Buffer.from(key.export({format:"der",type:"spki"})).equals(spki))
    return stopHold("SIGNER_ALGORITHM");
  const signature=canonicalBase64(input.detachedSignatureBase64,64,64);
  if(!verify(null,msg,key,signature))
    return stopHold("BAD_SIGNATURE");

  const ticket=v as Gate4IndependentStopTicketV39;
  return {ticket,stopPins:{
    sourceCommit:p.expectedSourceCommit,
    scopeId:p.expectedScopeId,
    authorizationSha256:p.expectedAuthorizationSha256,
    exactOwnedSubscriptionId:p.expectedSubscriptionId,
    subjectId:p.expectedSubjectId
  }};
}

/** Returns *no* subscription ID, raw JSON or key bytes in the public report. */
export function inspectGate4SignedStopCustodyV39(input:Gate4SignedStopTicketInputV39){
  verifyTicket(input);
  return {
    schema:"v39.gate4.signed-stop-custody-review.v1" as const,
    status:"CRYPTO_AND_PIN_BINDING_ONLY_NOT_ARMED" as const,
    cryptographicSignatureVerified:true as const,
    independentSignerIdentityAttested:false as const,
    durableSourceCustodyVerified:false as const,
    independentClockAndWorkerVerified:false as const,
    paidAuthorization:false as const,
    databaseWrites:0 as const,
    providerRequests:0 as const
  };
}

/**
 * Future external process integration point. Signature is checked BEFORE
 * even a free provider LIST. Endpoint/DB/clock/heartbeat read are not here.
 * A caller still MUST independently attest signer+pins+owned-ID provenance
 * and independently provision authorized STOP-only provider credentials.
 */
export async function executeGate4SignedStopCandidateV39(
  input:Gate4SignedStopTicketInputV39,
  nowUtc:string,
  heartbeatEvidence:Gate4IndependentHeartbeatEvidenceV39|null,
  deps:Gate4ExactOwnedStopDepsV39
){
  const trusted=verifyTicket(input);
  const result=await executeGate4IndependentStopCandidateV39(
    trusted.ticket,trusted.stopPins,nowUtc,heartbeatEvidence,deps
  );
  return {
    ...result,cryptographicSignatureVerified:true as const,
    independentSignerIdentityAttested:false as const,
    durableSourceCustodyVerified:false as const
  };
}
