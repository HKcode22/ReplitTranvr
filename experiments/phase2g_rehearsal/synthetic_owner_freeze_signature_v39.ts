import {
  createHash,createPublicKey,sign as edSign,verify as edVerify,
  type KeyObject
} from "node:crypto";
import {
  reconcileSyntheticSignedAttemptsV39,
  type SignedSyntheticSenderFrameV39,
  type SyntheticInternalDeliveryV39,
  type SyntheticAttemptReconciliationV39
} from "./signed_attempt_reconciliation_v39";
import type {DualSourceMessageV2} from "./dual_source_wire_canonical_receipt_v39";

/**
 * TEST-ONLY prospective owner/session freeze — NO live launch authorization.
 *
 * Ed25519 signing key models GitHub owner. Public key fingerprint and exact
 * expected context must be pinned INDEPENDENTLY by the test harness. Merely
 * supplying a key alongside its signature is not an authority chain.
 * The authenticated bytes are an explicit fixed-order tuple, not JSON key
 * insertion order. Validated object has no unknown fields.
 *
 * Real lifecycle challenge: one immutable planning freeze occurs BEFORE
 * subscription creation; its separately signed exact subscription binding
 * can only be frozen AFTER creation. This synthetic after-binding fixture
 * does not implement that two-stage production transaction.
 */
export type SyntheticOwnerFreezeV39=Readonly<{
  schema:"v39.phase2g.synthetic-owner-freeze.v1";
  mode:"synthetic-only";
  owner:"github-actions-emulator";
  stage:"Phase2G-Stage1";
  sessionId:string;
  providerSubscriptionId:string;
  frozenPlanSha256:string;
  frozenImplementationSha256:string;
  ownerCommitSha:string;
  receiverCommitSha:string;
  databasePostmasterStartUtc:string;
  signedAtUtc:string;
  windowStartUtc:string;
  windowEndUtc:string;
  airportIcao:"YSSY";
  physicalFlightContract:"v39-physical-flight-instance-v2";
  sampleBucketMinutes:15;
  maxDeliveryRetries:0;
  providerCreditCeiling:500;
  stage1ReserveCredits:450;
  protectedAccountFloorCredits:1000;
  providerEmulatorOnly:true;
}>;
export type SignedSyntheticOwnerFreezeV39=Readonly<{
  freeze:SyntheticOwnerFreezeV39;
  signatureBase64:string;
}>;
export type VerifiedSyntheticOwnerFreezeV39=Readonly<{
  ownerSignatureVerified:true;
  frozenRunSha256:string;
  pinnedOwnerPublicKeySha256:string;
  freeze:SyntheticOwnerFreezeV39;
  productionOwnerAuthority:false;
  paidLaunchAuthorized:false;
  scientificRecoveryAuthorized:false;
}>;

const FIELDS=[
  "schema","mode","owner","stage","sessionId","providerSubscriptionId",
  "frozenPlanSha256","frozenImplementationSha256","ownerCommitSha",
  "receiverCommitSha","databasePostmasterStartUtc","signedAtUtc",
  "windowStartUtc","windowEndUtc","airportIcao","physicalFlightContract",
  "sampleBucketMinutes","maxDeliveryRetries","providerCreditCeiling",
  "stage1ReserveCredits","protectedAccountFloorCredits","providerEmulatorOnly"
] as const;
const HASH=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_.:-]{1,160}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const isUtc=(v:unknown):v is string=>{
  if(typeof v!=="string"||!ISO.test(v))return false;
  const n=Date.parse(v);
  return Number.isFinite(n)&&new Date(n).toISOString()===v;
};
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const fail=(reason:string):never=>{throw new Error(reason)};

function validated(f:SyntheticOwnerFreezeV39):void{
  if(!f||typeof f!=="object"||Array.isArray(f)||
    Object.keys(f).length!==FIELDS.length||
    Object.keys(f).some(k=>!FIELDS.includes(k as typeof FIELDS[number])))
    fail("OWNER_FREEZE_UNKNOWN_OR_MISSING_FIELDS");
  if(f.schema!=="v39.phase2g.synthetic-owner-freeze.v1"||
     f.mode!=="synthetic-only"||f.owner!=="github-actions-emulator"||
     f.stage!=="Phase2G-Stage1"||f.airportIcao!=="YSSY"||
     f.physicalFlightContract!=="v39-physical-flight-instance-v2"||
     f.sampleBucketMinutes!==15||f.maxDeliveryRetries!==0||
     f.providerCreditCeiling!==500||f.stage1ReserveCredits!==450||
     f.protectedAccountFloorCredits!==1000||
     f.providerEmulatorOnly!==true||
     typeof f.sessionId!=="string"||!UUID.test(f.sessionId)||
     typeof f.providerSubscriptionId!=="string"||
     !TOKEN.test(f.providerSubscriptionId)||
     ![f.frozenPlanSha256,f.frozenImplementationSha256].every(
       x=>typeof x==="string"&&HASH.test(x))||
     ![f.ownerCommitSha,f.receiverCommitSha].every(
       x=>typeof x==="string"&&COMMIT.test(x))||
     ![f.databasePostmasterStartUtc,f.signedAtUtc,
       f.windowStartUtc,f.windowEndUtc].every(isUtc))
    fail("OWNER_FREEZE_CONTRACT_INVALID");
  const start=Date.parse(f.windowStartUtc),end=Date.parse(f.windowEndUtc);
  if(end-start!==7_200_000||
     Date.parse(f.databasePostmasterStartUtc)>Date.parse(f.signedAtUtc)||
     Date.parse(f.signedAtUtc)>start)
    fail("OWNER_FREEZE_TIME_OR_DURATION_INVALID");
}
function frozenBytes(f:SyntheticOwnerFreezeV39):Buffer{
  validated(f);
  return Buffer.from(JSON.stringify([
    "p2g-synthetic-ed25519-owner-freeze-v1",
    ...FIELDS.map(k=>f[k])
  ]),"utf8");
}
export function syntheticOwnerFreezeSha256V39(f:SyntheticOwnerFreezeV39):string{
  return sha(frozenBytes(f));
}
export function syntheticOwnerPublicKeyFingerprintV39(publicKeyPem:string):string{
  const k=createPublicKey(publicKeyPem);
  if(k.asymmetricKeyType!=="ed25519")
    fail("OWNER_FREEZE_PUBLIC_KEY_NOT_ED25519");
  return sha(k.export({type:"spki",format:"der"}) as Buffer);
}
export function signSyntheticOwnerFreezeV39(
  freeze:SyntheticOwnerFreezeV39,privateKey:KeyObject
):SignedSyntheticOwnerFreezeV39{
  if(privateKey.type!=="private"||privateKey.asymmetricKeyType!=="ed25519")
    fail("OWNER_FREEZE_PRIVATE_KEY_NOT_ED25519");
  return {freeze,signatureBase64:edSign(null,frozenBytes(freeze),privateKey).toString("base64")};
}
export function verifySyntheticOwnerFreezeV39(input:{
  signed:SignedSyntheticOwnerFreezeV39;
  trustedOwnerPublicKeyPem:string;
  pinnedOwnerPublicKeySha256:string;
  expectedIndependentFreeze:SyntheticOwnerFreezeV39;
}):VerifiedSyntheticOwnerFreezeV39{
  if(typeof input.pinnedOwnerPublicKeySha256!=="string"||
     !HASH.test(input.pinnedOwnerPublicKeySha256))
    fail("OWNER_TRUST_ANCHOR_NOT_PINNED");
  const actualFingerprint=syntheticOwnerPublicKeyFingerprintV39(
    input.trustedOwnerPublicKeyPem
  );
  if(actualFingerprint!==input.pinnedOwnerPublicKeySha256)
    fail("OWNER_PUBLIC_KEY_PIN_MISMATCH");
  const f=input.signed?.freeze;
  // A signed but wrong run/window/build is NOT authorization. Compare every
  // field with an independently specified expected candidate freeze.
  const bytes=frozenBytes(f);
  const expectedBytes=frozenBytes(input.expectedIndependentFreeze);
  if(!bytes.equals(expectedBytes))
    fail("OWNER_FREEZE_INDEPENDENT_CONTEXT_MISMATCH");
  const sig=input.signed.signatureBase64;
  if(typeof sig!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(sig))
    fail("OWNER_FREEZE_SIGNATURE_ENCODING_INVALID");
  const decoded=Buffer.from(sig,"base64");
  if(decoded.length!==64||decoded.toString("base64")!==sig)
    fail("OWNER_FREEZE_SIGNATURE_ENCODING_INVALID");
  const pub=createPublicKey(input.trustedOwnerPublicKeyPem);
  if(!edVerify(null,bytes,pub,decoded))
    fail("OWNER_FREEZE_SIGNATURE_INVALID");
  return {
    ownerSignatureVerified:true,
    frozenRunSha256:sha(bytes),
    pinnedOwnerPublicKeySha256:actualFingerprint,
    freeze:f,productionOwnerAuthority:false,paidLaunchAuthorized:false,
    scientificRecoveryAuthorized:false
  };
}

/**
 * Invoke the existing exact-attempt sender/edge/internal audit only after an
 * independently pinned and verified owner binding. Equal counts do not turn
 * this into an approved real-world scientific recovery.
 */
export async function reconcileSyntheticUnderSignedOwnerFreezeV39(input:{
  signedOwner:SignedSyntheticOwnerFreezeV39;
  trustedOwnerPublicKeyPem:string;
  pinnedOwnerPublicKeySha256:string;
  expectedIndependentFreeze:SyntheticOwnerFreezeV39;
  signedSender:SignedSyntheticSenderFrameV39;
  independentSenderKey:string;
  edgeSigningKey:string;
  trustedAuditUtc:string;
  signedEdgeReceipts:readonly DualSourceMessageV2[];
  committedInternal:readonly SyntheticInternalDeliveryV39[];
}):Promise<{
  signedOwnerVerified:true;
  attemptResult:SyntheticAttemptReconciliationV39;
  scientificCompletionAuthorized:false;
  automaticRecoveryAuthorized:false;
}>{
  const verified=verifySyntheticOwnerFreezeV39({
    signed:input.signedOwner,
    trustedOwnerPublicKeyPem:input.trustedOwnerPublicKeyPem,
    pinnedOwnerPublicKeySha256:input.pinnedOwnerPublicKeySha256,
    expectedIndependentFreeze:input.expectedIndependentFreeze
  });
  if(input.signedSender.frame.windowStartUtc!==verified.freeze.windowStartUtc||
     input.signedSender.frame.windowEndUtc!==verified.freeze.windowEndUtc)
    fail("SENDER_WINDOW_NOT_OWNER_FROZEN");
  const attemptResult=await reconcileSyntheticSignedAttemptsV39({
    signedSender:input.signedSender,
    independentSenderKey:input.independentSenderKey,
    edgeSigningKey:input.edgeSigningKey,
    expectedSessionId:verified.freeze.sessionId,
    expectedProviderSubscriptionId:verified.freeze.providerSubscriptionId,
    expectedOwnerFrozenRunSha256:verified.frozenRunSha256,
    trustedAuditUtc:input.trustedAuditUtc,
    signedEdgeReceipts:input.signedEdgeReceipts,
    committedInternal:input.committedInternal
  });
  return {
    signedOwnerVerified:true,attemptResult,
    scientificCompletionAuthorized:false,automaticRecoveryAuthorized:false
  };
}
