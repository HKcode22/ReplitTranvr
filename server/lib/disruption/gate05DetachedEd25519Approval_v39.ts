/**
 * Gate 0.5 OFFLINE, DRAFT-ONLY Ed25519 detached-signature verification.
 *
 * Verifies signature mathematics over SHA256(raw reviewed authorization bytes)
 * with a Gate05-specific domain separator. A separately trusted public-key
 * fingerprint AND separately reviewed artifact hash must be supplied by
 * independent owner-controlled evidence (never calculated by this verifier
 * and accepted as an approval). This code cannot establish the provenance of
 * those trust anchors, grant a database role, or authorize provider spend.
 */
import {createHash,createPublicKey,timingSafeEqual,verify} from "node:crypto";
import {inspectGate05ExactAuthArtifactV39} from "./gate05AuthorizationArtifact_v39";

const PREFIX=Buffer.from("ReplitTranvr:V39:GATE05:FIDS_AUTH:ED25519:V1\0","utf8");
type ExactPins=Parameters<typeof inspectGate05ExactAuthArtifactV39>[1];
export type Gate05Ed25519ReviewPinsV39=ExactPins & {
  /** Independently approved key SHA256 of its SPKI DER representation. */
  independentlyApprovedSignerSpkiSha256:string;
};
function parse64Base64(s:unknown):Buffer{
  if(typeof s!=="string"||!/^[-+\/0-9A-Za-z]{85}[A-Za-z0-9+/=]{1,3}$/.test(s))
    throw Error("GATE05_SIGNER_SIGNATURE_ENCODING_HOLD");
  const bytes=Buffer.from(s,"base64");
  if(bytes.length!==64||bytes.toString("base64")!==s)
    throw Error("GATE05_SIGNER_SIGNATURE_ENCODING_HOLD");
  return bytes;
}
function sha(bytes:Buffer):Buffer{
  return createHash("sha256").update(bytes).digest();
}
function strictSpki(s:unknown,pinnedSha:unknown){
  if(typeof s!=="string"||s.length>512||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(s)||
     typeof pinnedSha!=="string"||!/^[a-f0-9]{64}$/.test(pinnedSha))
    throw Error("GATE05_SIGNER_ROOT_PIN_HOLD");
  const bytes=Buffer.from(s,"base64");
  if(bytes.length<30||bytes.length>256||bytes.toString("base64")!==s)
    throw Error("GATE05_SIGNER_PUBLIC_KEY_ENCODING_HOLD");
  const actual=sha(bytes);
  if(!timingSafeEqual(actual,Buffer.from(pinnedSha,"hex")))
    throw Error("GATE05_SIGNER_ROOT_PIN_MISMATCH_HOLD");
  let key:ReturnType<typeof createPublicKey>;
  try{key=createPublicKey({key:bytes,format:"der",type:"spki"});}
  catch{throw Error("GATE05_SIGNER_PUBLIC_KEY_INVALID_HOLD");}
  if(key.asymmetricKeyType!=="ed25519"||key.type!=="public")
    throw Error("GATE05_SIGNER_ALGORITHM_HOLD");
  if(!Buffer.from(key.export({format:"der",type:"spki"})).equals(bytes))
    throw Error("GATE05_SIGNER_PUBLIC_KEY_NONCANONICAL_HOLD");
  return key;
}
/** Also used by independently operated signing process (no private key here). */
export function gate05Ed25519SigningMessageV39(authorizationBytes:Buffer):Buffer{
  if(!Buffer.isBuffer(authorizationBytes)||authorizationBytes.length<20||
     authorizationBytes.length>16384)
    throw Error("GATE05_SIGNER_ARTIFACT_BYTES_HOLD");
  return Buffer.concat([PREFIX,sha(authorizationBytes)]);
}
export function verifyGate05DetachedApprovalSignatureV39(args:{
  authorizationBytes:Buffer;
  detachedSignatureBase64:string;
  signerPublicKeySpkiDerBase64:string;
  independentPins:Gate05Ed25519ReviewPinsV39;
}){
  if(!args||!args.independentPins)
    throw Error("GATE05_SIGNER_INDEPENDENT_TRUST_REQUIRED_HOLD");
  // Reuses strict contract/time/query/independent byte SHA256 review.
  const a=inspectGate05ExactAuthArtifactV39(
    args.authorizationBytes,args.independentPins
  );
  const key=strictSpki(args.signerPublicKeySpkiDerBase64,
    args.independentPins.independentlyApprovedSignerSpkiSha256);
  const signature=parse64Base64(args.detachedSignatureBase64);
  if(!verify(null,gate05Ed25519SigningMessageV39(args.authorizationBytes),key,signature))
    throw Error("GATE05_SIGNER_SIGNATURE_NOT_VALID_HOLD");
  return {
    schema:"v39.gate05.detached-ed25519-review.v1" as const,
    status:"CRYPTO_SIGNATURE_VALID_TRUST_AND_LIVE_AUTH_UNVERIFIED" as const,
    verifiedAuthorizationBytesSha256:a.reviewedByteSha256,
    verifiedSignerSpkiSha256:args.independentPins.independentlyApprovedSignerSpkiSha256,
    scopeId:a.scopeId,authorizationId:a.authorizationId,
    allowedQuerySha256:a.allowedQuerySha256,
    maxTotalUnits:12 as const,
    cryptographicSignatureVerified:true as const,
    // Code cannot independently prove who established the key/pin/approval.
    signerIdentityIndependentlyAttested:false as const,
    humanSpendingApprovalIndependentlyVerified:false as const,
    providerPlanAndRightsVerified:false as const,
    databaseCommissioningAuthorized:false as const,
    paidPilotAuthorized:false as const,
    providerCalls:0 as const,
    databaseWrites:0 as const
  };
}
