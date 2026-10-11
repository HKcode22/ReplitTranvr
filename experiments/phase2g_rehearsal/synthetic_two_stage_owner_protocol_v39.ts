import {
  createHash,createPublicKey,sign as signEd25519,verify as verifyEd25519,
  type KeyObject
} from "node:crypto";
import {
  signSyntheticOwnerFreezeV39,
  verifySyntheticOwnerFreezeV39,
  syntheticOwnerFreezeSha256V39,
  syntheticOwnerPublicKeyFingerprintV39,
  type SyntheticOwnerFreezeV39,
  type SignedSyntheticOwnerFreezeV39
} from "./synthetic_owner_freeze_signature_v39";

/**
 * P13 — isolated two-stage protocol simulation. It NEVER calls a provider.
 * Stage A freezes plan BEFORE a subscription exists. Stage B signs a binding
 * AFTER an independently declared synthetic creation event. Each stage has a
 * distinct domain-separated Ed25519 signature and exact immutable fields.
 *
 * This is NOT a distributed uniqueness lock, authoritative subscription
 * proof, production owner key ceremony or scientific recovery authorization.
 */
export type SyntheticPreSubscriptionPlanV39=Readonly<
  Omit<SyntheticOwnerFreezeV39,"providerSubscriptionId"|"signedAtUtc"> & {
    phase:"pre_subscription";
    providerSubscriptionId:null;
    frozenAtUtc:string;
  }
>;
export type SignedSyntheticPreSubscriptionPlanV39=Readonly<{
  plan:SyntheticPreSubscriptionPlanV39;
  signatureBase64:string;
}>;
export type SyntheticPostSubscriptionBindingV39=Readonly<{
  schema:"v39.phase2g.synthetic-subscription-binding.v1";
  mode:"synthetic-only";
  prePlanSha256:string;
  postFreezeSha256:string;
  providerSubscriptionId:string;
  createAttemptSha256:string;
  providerCreatedAtUtc:string;
  boundAtUtc:string;
}>;
export type SignedSyntheticPostSubscriptionBindingV39=Readonly<{
  binding:SyntheticPostSubscriptionBindingV39;
  signatureBase64:string;
}>;
export type VerifiedSyntheticTwoStageOwnerV39=Readonly<{
  twoSignaturesVerified:true;
  prePlanSha256:string;
  boundFreezeSha256:string;
  providerSubscriptionId:string;
  independentCreationVerified:false;
  crossProcessOneSubscriptionProven:false;
  productionOwnerAuthority:false;
  paidLaunchAuthorized:false;
  scientificRecoveryAuthorized:false;
}>;

const HASH=/^[a-f0-9]{64}$/;
const TOKEN=/^[A-Za-z0-9_.:-]{1,160}$/;
const ISOUTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const utc=(v:unknown):v is string=>typeof v==="string"&&
  ISOUTC.test(v)&&Number.isFinite(Date.parse(v))&&
  new Date(Date.parse(v)).toISOString()===v;
const digest=(v:unknown):v is string=>typeof v==="string"&&HASH.test(v);
const fail=(code:string):never=>{throw new Error(code)};
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const PLAN_FIELDS=[
  "schema","mode","owner","stage","sessionId","frozenPlanSha256",
  "frozenImplementationSha256","ownerCommitSha","receiverCommitSha",
  "databasePostmasterStartUtc","windowStartUtc","windowEndUtc",
  "airportIcao","physicalFlightContract","sampleBucketMinutes",
  "maxDeliveryRetries","providerCreditCeiling","stage1ReserveCredits",
  "protectedAccountFloorCredits","providerEmulatorOnly",
  "phase","providerSubscriptionId","frozenAtUtc"
] as const;
const BIND_FIELDS=[
  "schema","mode","prePlanSha256","postFreezeSha256",
  "providerSubscriptionId","createAttemptSha256",
  "providerCreatedAtUtc","boundAtUtc"
] as const;
const exactFields=(v:unknown,fields:readonly string[])=>{
  if(!v||typeof v!=="object"||Array.isArray(v)||
     Object.keys(v).length!==fields.length||
     Object.keys(v).some(k=>!fields.includes(k)))
    fail("TWO_STAGE_UNEXPECTED_OR_MISSING_FIELDS");
};
export function prospectivePostFreezeFromPlanV39(
  plan:SyntheticPreSubscriptionPlanV39,
  subscriptionId:string,boundAtUtc:string
):SyntheticOwnerFreezeV39{
  // The plan's null subscription is never mistaken for an actual provider ID.
  const {phase,providerSubscriptionId,frozenAtUtc,...fixed}=plan;
  void phase;void providerSubscriptionId;void frozenAtUtc;
  return {...fixed,providerSubscriptionId:subscriptionId,signedAtUtc:boundAtUtc};
}
function planBytes(p:SyntheticPreSubscriptionPlanV39):Buffer{
  exactFields(p,PLAN_FIELDS);
  if(p.phase!=="pre_subscription"||p.providerSubscriptionId!==null||
     !utc(p.frozenAtUtc))fail("TWO_STAGE_PRE_SUBSCRIPTION_PHASE_INVALID");
  // Reuse exactly the frozen F.8 metric, 120min and budget validator with a
  // PROHIBITED synthetic sentinel that is NOT serialized or signed as a real
  // subscription. All runtime identities remain unbound at this stage.
  const mock=prospectivePostFreezeFromPlanV39(
    p,"__unbound_test_only__",
    p.frozenAtUtc
  );
  syntheticOwnerFreezeSha256V39(mock);
  return Buffer.from(JSON.stringify([
    "p2g-synthetic-precreate-owner-plan-ed25519-v1",
    ...PLAN_FIELDS.map(k=>p[k])
  ]),"utf8");
}
export function preSubscriptionPlanSha256V39(p:SyntheticPreSubscriptionPlanV39):string{
  return sha(planBytes(p));
}
function bindingBytes(b:SyntheticPostSubscriptionBindingV39):Buffer{
  exactFields(b,BIND_FIELDS);
  if(b.schema!=="v39.phase2g.synthetic-subscription-binding.v1"||
     b.mode!=="synthetic-only"||!digest(b.prePlanSha256)||
     !digest(b.postFreezeSha256)||!digest(b.createAttemptSha256)||
     typeof b.providerSubscriptionId!=="string"||
     !TOKEN.test(b.providerSubscriptionId)||
     !utc(b.providerCreatedAtUtc)||!utc(b.boundAtUtc))
    fail("TWO_STAGE_BINDING_SCHEMA_INVALID");
  if(Date.parse(b.boundAtUtc)<Date.parse(b.providerCreatedAtUtc))
    fail("TWO_STAGE_BINDING_PRECEDES_CREATION");
  return Buffer.from(JSON.stringify([
    "p2g-synthetic-postcreate-subscription-bind-ed25519-v1",
    ...BIND_FIELDS.map(k=>b[k])
  ]),"utf8");
}
function keyIsOwner(key:KeyObject):void{
  if(key.type!=="private"||key.asymmetricKeyType!=="ed25519")
    fail("TWO_STAGE_OWNER_SIGNING_KEY_NOT_ED25519");
}
const sign=(b:Buffer,key:KeyObject)=>{
  keyIsOwner(key);
  return signEd25519(null,b,key).toString("base64");
};
function verifyWithPin(input:{
  bytes:Buffer;sig:string;ownerPublicKeyPem:string;pinnedOwnerPublicKeySha256:string
}):void{
  if(!digest(input.pinnedOwnerPublicKeySha256))
    fail("TWO_STAGE_OWNER_PIN_MISSING");
  if(syntheticOwnerPublicKeyFingerprintV39(input.ownerPublicKeyPem)!==
     input.pinnedOwnerPublicKeySha256)
    fail("TWO_STAGE_OWNER_KEY_PIN_MISMATCH");
  if(typeof input.sig!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(input.sig))
    fail("TWO_STAGE_SIGNATURE_ENCODING_INVALID");
  const decoded=Buffer.from(input.sig,"base64");
  if(decoded.length!==64||decoded.toString("base64")!==input.sig)
    fail("TWO_STAGE_SIGNATURE_ENCODING_INVALID");
  if(!verifyEd25519(null,input.bytes,createPublicKey(input.ownerPublicKeyPem),decoded))
    fail("TWO_STAGE_SIGNATURE_INVALID");
}
export function signSyntheticPreSubscriptionPlanV39(
  plan:SyntheticPreSubscriptionPlanV39,ownerPrivateKey:KeyObject
):SignedSyntheticPreSubscriptionPlanV39{
  return {plan,signatureBase64:sign(planBytes(plan),ownerPrivateKey)};
}
export function signSyntheticPostSubscriptionBindingV39(
  binding:SyntheticPostSubscriptionBindingV39,ownerPrivateKey:KeyObject
):SignedSyntheticPostSubscriptionBindingV39{
  return {binding,signatureBase64:sign(bindingBytes(binding),ownerPrivateKey)};
}
export function verifySyntheticTwoStageOwnerV39(input:{
  signedPlan:SignedSyntheticPreSubscriptionPlanV39;
  signedBinding:SignedSyntheticPostSubscriptionBindingV39;
  signedPostFreeze:SignedSyntheticOwnerFreezeV39;
  trustedOwnerPublicKeyPem:string;
  pinnedOwnerPublicKeySha256:string;
  independentlyExpectedPlan:SyntheticPreSubscriptionPlanV39;
  independentlyReportedSubscriptionId:string;
  independentlyReportedCreateAttemptSha256:string;
  independentlyReportedCreatedAtUtc:string;
  observedPriorBindings?:readonly SignedSyntheticPostSubscriptionBindingV39[];
}):VerifiedSyntheticTwoStageOwnerV39{
  const p=input.signedPlan.plan,b=input.signedBinding.binding;
  const planText=planBytes(p);
  if(!planText.equals(planBytes(input.independentlyExpectedPlan)))
    fail("TWO_STAGE_PLAN_DIFFERS_FROM_FROZEN_POLICY");
  verifyWithPin({
    bytes:planText,sig:input.signedPlan.signatureBase64,
    ownerPublicKeyPem:input.trustedOwnerPublicKeyPem,
    pinnedOwnerPublicKeySha256:input.pinnedOwnerPublicKeySha256
  });
  const preHash=sha(planText);
  const boundText=bindingBytes(b);
  verifyWithPin({
    bytes:boundText,sig:input.signedBinding.signatureBase64,
    ownerPublicKeyPem:input.trustedOwnerPublicKeyPem,
    pinnedOwnerPublicKeySha256:input.pinnedOwnerPublicKeySha256
  });
  if(b.prePlanSha256!==preHash)
    fail("TWO_STAGE_PRE_PLAN_DIGEST_BROKEN");
  if(b.providerSubscriptionId!==input.independentlyReportedSubscriptionId||
     b.createAttemptSha256!==input.independentlyReportedCreateAttemptSha256||
     b.providerCreatedAtUtc!==input.independentlyReportedCreatedAtUtc)
    fail("TWO_STAGE_INDEPENDENT_CREATION_MISMATCH");
  if(Date.parse(p.frozenAtUtc)>Date.parse(b.providerCreatedAtUtc))
    fail("TWO_STAGE_PLAN_NOT_FROZEN_BEFORE_CREATION");
  if(Date.parse(b.boundAtUtc)>Date.parse(p.windowStartUtc))
    fail("TWO_STAGE_SUBSCRIPTION_BOUND_AFTER_WINDOW_START");
  const exactPost=prospectivePostFreezeFromPlanV39(
    p,b.providerSubscriptionId,b.boundAtUtc
  );
  const ownerProof=verifySyntheticOwnerFreezeV39({
    signed:input.signedPostFreeze,
    trustedOwnerPublicKeyPem:input.trustedOwnerPublicKeyPem,
    pinnedOwnerPublicKeySha256:input.pinnedOwnerPublicKeySha256,
    expectedIndependentFreeze:exactPost
  });
  if(b.postFreezeSha256!==ownerProof.frozenRunSha256)
    fail("TWO_STAGE_POST_FREEZE_DIGEST_BROKEN");
  for(const observed of input.observedPriorBindings??[]){
    const otherBytes=bindingBytes(observed.binding);
    verifyWithPin({
      bytes:otherBytes,sig:observed.signatureBase64,
      ownerPublicKeyPem:input.trustedOwnerPublicKeyPem,
      pinnedOwnerPublicKeySha256:input.pinnedOwnerPublicKeySha256
    });
    if(observed.binding.prePlanSha256===preHash&&
       (observed.binding.providerSubscriptionId!==b.providerSubscriptionId||
        !otherBytes.equals(boundText)))
      fail("TWO_STAGE_CONFLICTING_OWNER_BINDINGS");
  }
  return {
    twoSignaturesVerified:true,prePlanSha256:preHash,
    boundFreezeSha256:ownerProof.frozenRunSha256,
    providerSubscriptionId:b.providerSubscriptionId,
    independentCreationVerified:false,
    crossProcessOneSubscriptionProven:false,
    productionOwnerAuthority:false,paidLaunchAuthorized:false,
    scientificRecoveryAuthorized:false
  };
}

/** Pure test helper: no provider call, no creation, no persistent ledger. */
export function makeSyntheticTwoStageOwnerV39(input:{
  plan:SyntheticPreSubscriptionPlanV39;
  subscriptionId:string;
  providerCreatedAtUtc:string;
  boundAtUtc:string;
  createAttemptSha256:string;
  ownerPrivateKey:KeyObject;
}):{
  signedPlan:SignedSyntheticPreSubscriptionPlanV39;
  signedPostFreeze:SignedSyntheticOwnerFreezeV39;
  signedBinding:SignedSyntheticPostSubscriptionBindingV39;
}{
  const {plan,subscriptionId,boundAtUtc}=input;
  const post=prospectivePostFreezeFromPlanV39(plan,subscriptionId,boundAtUtc);
  const binding:SyntheticPostSubscriptionBindingV39={
    schema:"v39.phase2g.synthetic-subscription-binding.v1",
    mode:"synthetic-only",
    prePlanSha256:preSubscriptionPlanSha256V39(plan),
    postFreezeSha256:syntheticOwnerFreezeSha256V39(post),
    providerSubscriptionId:subscriptionId,
    createAttemptSha256:input.createAttemptSha256,
    providerCreatedAtUtc:input.providerCreatedAtUtc,
    boundAtUtc
  };
  return {
    signedPlan:signSyntheticPreSubscriptionPlanV39(plan,input.ownerPrivateKey),
    signedPostFreeze:signSyntheticOwnerFreezeV39(post,input.ownerPrivateKey),
    signedBinding:signSyntheticPostSubscriptionBindingV39(binding,input.ownerPrivateKey)
  };
}
