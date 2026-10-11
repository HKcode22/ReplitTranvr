import {
  createHash,createPublicKey,sign as signEd25519,
  verify as verifyEd25519,type KeyObject
} from "node:crypto";
import {
  assessP20VariableRateRehearsalV39,
  type P20VariableRateFixtureV39,
  type P20VariableRateAssessmentV39
} from "./variable_rate_wallclock_audit_v39";

/**
 * P20 SYNTHETIC-ONLY independent sender schedule freeze.
 *
 * A preplanned array merely bundled with a post-run report can be rewritten
 * after failures. This fixture demonstrates Ed25519 authentication of the
 * expected ATTEMPTS + times + hashes BEFORE the 120m run. POST-run sender
 * acknowledgments are compared against this pre-run plan.
 *
 * Does not authenticate AeroDataBox or independently prove host elapsed time.
 */
export type P20PlannedSyntheticAttemptV39=Readonly<{
  attemptId:string;sentUtc:string;sourceWireSha256:string;
  syntheticCostCredits:number;
}>;
export type P20FrozenSyntheticScheduleV39=Readonly<{
  schema:"v39.phase2g.synthetic-pre-run-variable-rate-schedule.v1";
  mode:"synthetic-only";
  sender:"isolated-provider-emulator";
  ownerFrozenRunSha256:string;
  frozenAtUtc:string;windowStartUtc:string;windowEndUtc:string;
  attempts:readonly P20PlannedSyntheticAttemptV39[];
}>;
export type P20SignedSyntheticScheduleV39=Readonly<{
  plan:P20FrozenSyntheticScheduleV39;
  signatureBase64:string;
}>;
const HEX=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_.:-]{1,160}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
function date(s:unknown):number{
  if(typeof s!=="string"||!UTC.test(s))return NaN;
  const n=Date.parse(s);
  return Number.isFinite(n)&&new Date(n).toISOString()===s?n:NaN;
}
function pinnedBytes(p:P20FrozenSyntheticScheduleV39):Buffer{
  if(!p||typeof p!=="object"||Array.isArray(p)||
     Object.keys(p).sort().join(",")!==
       ["schema","mode","sender","ownerFrozenRunSha256",
        "frozenAtUtc","windowStartUtc","windowEndUtc","attempts"].sort().join(",")||
     p.schema!=="v39.phase2g.synthetic-pre-run-variable-rate-schedule.v1"||
     p.mode!=="synthetic-only"||p.sender!=="isolated-provider-emulator"||
     typeof p.ownerFrozenRunSha256!=="string"||!HEX.test(p.ownerFrozenRunSha256)||
     !Array.isArray(p.attempts)||p.attempts.length<1||p.attempts.length>2000)
    throw Error("P20_SIGNED_PRE_RUN_PLAN_SCHEMA_INVALID");
  const freeze=date(p.frozenAtUtc),from=date(p.windowStartUtc),end=date(p.windowEndUtc);
  if(!Number.isFinite(freeze)||!Number.isFinite(from)||!Number.isFinite(end)||
     freeze>=from||end-from!==7_200_000)
    throw Error("P20_PLAN_WAS_NOT_FROZEN_BEFORE_120M_WINDOW");
  const seen=new Set<string>();
  let prior=-Infinity;
  for(const a of p.attempts){
    if(!a||typeof a!=="object"||Array.isArray(a)||
       Object.keys(a).sort().join(",")!==
         ["attemptId","sentUtc","sourceWireSha256","syntheticCostCredits"].sort().join(",")||
       typeof a.attemptId!=="string"||!ID.test(a.attemptId)||
       typeof a.sourceWireSha256!=="string"||!HEX.test(a.sourceWireSha256)||
       !Number.isSafeInteger(a.syntheticCostCredits)||
       a.syntheticCostCredits<0||a.syntheticCostCredits>1||
       seen.has(a.attemptId))
      throw Error("P20_SIGNED_PRE_RUN_ATTEMPT_INVALID_OR_DUPLICATE");
    seen.add(a.attemptId);
    const t=date(a.sentUtc);
    if(!Number.isFinite(t)||t<from||t>=end||t<prior)
      throw Error("P20_SIGNED_PRE_RUN_ATTEMPT_TIME_UNFROZEN");
    prior=t;
  }
  // Fixed-order tuple and explicit field projection, not JSON object order.
  return Buffer.from(JSON.stringify([
    "p20-independent-variable-rate-sender-plan-v1",
    p.schema,p.mode,p.sender,p.ownerFrozenRunSha256,
    p.frozenAtUtc,p.windowStartUtc,p.windowEndUtc,
    p.attempts.map(x=>[
      x.attemptId,x.sentUtc,x.sourceWireSha256,x.syntheticCostCredits
    ])
  ]),"utf8");
}
export function p20SenderPublicFingerprintV39(pem:string):string{
  const key=createPublicKey(pem);
  if(key.asymmetricKeyType!=="ed25519")
    throw Error("P20_SIGNER_KEY_NOT_ED25519");
  return sha(key.export({type:"spki",format:"der"}) as Buffer);
}
export function p20FrozenSenderPlanSha256V39(p:P20FrozenSyntheticScheduleV39):string{
  return sha(pinnedBytes(p));
}
export function signP20FrozenSenderScheduleV39(
  plan:P20FrozenSyntheticScheduleV39,key:KeyObject
):P20SignedSyntheticScheduleV39{
  if(key.type!=="private"||key.asymmetricKeyType!=="ed25519")
    throw Error("P20_SIGNER_PRIVATE_KEY_NOT_ED25519");
  return {
    plan,signatureBase64:signEd25519(null,pinnedBytes(plan),key).toString("base64")
  };
}
export function assessIndependentlyPinnedP20RehearsalV39(input:{
  signed:P20SignedSyntheticScheduleV39;
  senderPublicPem:string;
  pinnedSenderPublicFingerprint:string;
  independentlyPinnedOwnerRunSha256:string;
  independentlyPinnedScheduleSha256:string;
  observed:P20VariableRateFixtureV39;
}):P20VariableRateAssessmentV39{
  const bytes=pinnedBytes(input.signed.plan);
  if(input.signed.plan.ownerFrozenRunSha256!==input.independentlyPinnedOwnerRunSha256||
     sha(bytes)!==input.independentlyPinnedScheduleSha256)
    throw Error("P20_INDEPENDENT_OWNER_OR_PREPLAN_SHA_MISMATCH");
  if(p20SenderPublicFingerprintV39(input.senderPublicPem)!==
     input.pinnedSenderPublicFingerprint)
    throw Error("P20_INDEPENDENT_SIGNER_KEY_PIN_MISMATCH");
  const sig=input.signed.signatureBase64;
  if(typeof sig!=="string"||!/^[A-Za-z0-9+/]{86}==$/.test(sig)||
     Buffer.from(sig,"base64").length!==64||
     Buffer.from(sig,"base64").toString("base64")!==sig||
     !verifyEd25519(null,bytes,createPublicKey(input.senderPublicPem),
        Buffer.from(sig,"base64")))
    throw Error("P20_PRE_RUN_INDEPENDENT_SENDER_SIGNATURE_INVALID");
  const p=input.signed.plan,v=input.observed;
  if(p.windowStartUtc!==v.ownerWindowStartUtc||
     p.windowEndUtc!==v.ownerWindowEndUtc||
     p.attempts.length!==v.preplannedSenderAttempts.length)
    throw Error("P20_POST_RUN_PLAN_RECONSTRUCTION_OR_WINDOW_SHIFT");
  for(let i=0;i<p.attempts.length;i++){
    const a=p.attempts[i],b=v.preplannedSenderAttempts[i];
    if(!b||a.attemptId!==b.attemptId||a.sentUtc!==b.sentUtc||
       a.sourceWireSha256!==b.sourceWireSha256||
       a.syntheticCostCredits!==b.syntheticCostCredits)
      throw Error("P20_POST_RUN_PLAN_RECONSTRUCTION_OR_WINDOW_SHIFT");
  }
  return assessP20VariableRateRehearsalV39(v);
}
