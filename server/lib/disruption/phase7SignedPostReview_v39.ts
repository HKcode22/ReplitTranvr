/** Private, independently signed POST settlement and exact bundle review.
 * No paid worker signing authority. Missing or unverified evidence cannot
 * be promoted to a physical gate-out or a completed research group. */
import {createHash,createPublicKey,verify} from "node:crypto";
import type {P6PostCommittedScope,P6PostPreservationAnchor} from "./phase6ActualPostOutcomeObservability_v39";
import type {Phase7DerivedReleaseContract} from "./phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "./phase7ReviewedSourceTransformation_v39";
import {assemblePhase7FinalGroupCandidate,type Phase7StoredPreFragment,type Phase7GroupOutcomeScope,type Phase7FinalAssemblyIds} from "./phase7FinalGroupAssembly_v39";
import {hashPhase7DurableCandidate,validateDurableDerivedBundle,type Phase7DurableDerivedBundle,type Phase7DurableBundleApproval} from "./phase7DurableDerivedBundleCandidate_v39";
const H=/^[a-f0-9]{64}$/;
const digest=(x:unknown):x is string=>typeof x==="string"&&H.test(x)&&!/^([a-f0-9])\1{63}$/.test(x);
const hold=(s:string):never=>{throw Error("HOLD_P7_SIGNED_POST_REVIEW_"+s);};
const exact=(x:unknown,ks:string[])=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const clock=(s:string)=>{const n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s)hold("CLOCK");return n;};
function decode(s:unknown,max:number):Buffer{
 if(typeof s!=="string"||s.length<4||s.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(s))return hold("ENCODING");
 const b=Buffer.from(s,"base64");if(b.length>max||b.toString("base64")!==s)hold("ENCODING");return b;
}
export interface Phase7SignedPostSettlement{
 schema:"v39.phase7.exact-post-group-settlement.v1";
 policySha256:string;manifestSha256:string;rightsSha256:string;
 anchorSha256:string;committedPostSha256:string;fragmentsSha256:string;
 reviewedAtUtc:string;validUntilUtc:string;releasedAtUtc:string;
 scope:Phase7GroupOutcomeScope;assemblyIds:Phase7FinalAssemblyIds;
 approval:Phase7DurableBundleApproval;
}
export function phase7PostFragmentsDigest(fragments:readonly Phase7StoredPreFragment[]){
 return hashPhase7DurableCandidate(fragments.map(f=>({groupId:f.groupId,contractSha256:f.contractSha256,profileSha256:f.profileSha256,packetSha256:f.packetSha256})).sort((a,b)=>a.packetSha256.localeCompare(b.packetSha256)));
}
export function readPhase7PostReviewerPublicKey(env:NodeJS.ProcessEnv){
 if(!digest(env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256)||!digest(env.P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256))hold("PROTECTED_POLICY");
 const pem=decode(env.P6_PHASE7_POST_OUTCOME_REVIEWER_PUBLIC_KEY_BASE64,4096).toString("utf8");
 if(!pem.startsWith("-----BEGIN PUBLIC KEY-----"))hold("PUBLIC_KEY_ONLY");
 const key=createPublicKey(pem),fp=createHash("sha256").update(key.export({type:"spki",format:"der"})).digest("hex");
 if(key.asymmetricKeyType!=="ed25519"||fp!==env.P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256||
  [env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256,env.P6_PHASE7_POST_NATIVE_REVIEWER_FINGERPRINT_SHA256].includes(fp))hold("DISTINCT_SIGNER");
 return key;
}
/** Authenticates the actual independent decision. This does not issue it,
 * prove the reviewer had a source, or create a right to retain the result.
 * The exact same group bytes can be reconciled after an unknown commit. */
export function verifyPhase7SignedPostSettlement(input:{
 env:NodeJS.ProcessEnv;wire:unknown;committed:Readonly<P6PostCommittedScope>;anchor:Readonly<P6PostPreservationAnchor>;
 fragments:readonly Phase7StoredPreFragment[];contract:Phase7DerivedReleaseContract;
 profile:Phase7ReviewedTransformationProfile;observedDbClockUtc:string;
}){
 const {env,wire,anchor:a,committed:c,fragments,contract,profile}=input;
 if(!exact(wire,["payloadBase64","signatureBase64"]))return hold("WIRE");
 const w=wire as {payloadBase64:string;signatureBase64:string},raw=decode(w.payloadBase64,48000),sig=decode(w.signatureBase64,64);
 if(sig.length!==64||!verify(null,raw,readPhase7PostReviewerPublicKey(env),sig))hold("SIGNATURE");
 const x=JSON.parse(raw.toString("utf8")) as Phase7SignedPostSettlement;
 if(!exact(x,["schema","policySha256","manifestSha256","rightsSha256","anchorSha256","committedPostSha256","fragmentsSha256","reviewedAtUtc","validUntilUtc","releasedAtUtc","scope","assemblyIds","approval"])||
  x.schema!=="v39.phase7.exact-post-group-settlement.v1"||x.policySha256!==env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256||
  x.manifestSha256!==a.manifestSha256||x.rightsSha256!==a.rightsSha256||c.packet.manifestSha256!==a.manifestSha256||
  c.packet.reviewedSourceRightsSha256!==a.rightsSha256||c.packet.runDayIndex!==a.runDayIndex||
  c.packet.airportIcao!==a.airportIcao||c.packet.reviewedFrameSha256!==a.frameSha256||
  a.ambiguousIdentity||x.anchorSha256!==hashPhase7DurableCandidate(a)||
  x.committedPostSha256!==hashPhase7DurableCandidate(c)||x.fragmentsSha256!==phase7PostFragmentsDigest(fragments)||
  !exact(x.scope,["groupId","associationReviewSha256","outcomeReviewSha256","groupSettlementDue","evidence"])||
  x.scope.groupSettlementDue!==true)hold("EXACT_SCOPE");
 const now=clock(input.observedDbClockUtc),reviewed=clock(x.reviewedAtUtc),valid=clock(x.validUntilUtc),released=clock(x.releasedAtUtc);
 if(released>reviewed||reviewed>now||now>=valid||valid>Math.min(clock(a.sourceExpiresAtUtc),clock(contract.researchExpiryUtc))||
  valid-reviewed>6*3600000||now-reviewed>6*3600000||released<clock(a.selectedNativeTUtc))hold("LIVE_SETTLEMENT_WINDOW");
 if(Object.values(x.scope.evidence).some(e=>e!=null&&(e.flightInstanceId!==a.flightInstanceId||e.selectedNativeTUtc!==a.selectedNativeTUtc))||
  (x.scope.evidence[a.horizon]!=null&&(
   x.scope.evidence[a.horizon]!.preIssuedAtUtc!==a.preIssuedAtUtc||
   x.scope.evidence[a.horizon]!.originalSourceAvailableAtUtc!==a.originalSourceAvailableAtUtc||
   x.scope.evidence[a.horizon]!.frozenSourceOriginalSha256!==a.sourceResponseSha256)))hold("LIVE_ANCHOR");
 const v=assemblePhase7FinalGroupCandidate(contract,profile,fragments,x.scope,x.releasedAtUtc,x.assemblyIds);
 const bundle:Phase7DurableDerivedBundle={schema:"v39.phase7.durable-derived-bundle.v1",packet:v.packet,
  paired:{...v.association,schema:"v39.phase7.paired-derived-association-reviewed.v1",approvedForUse:true},continuous:v.continuous};
 validateDurableDerivedBundle(contract,bundle,x.approval,new Date(now));
 return {bundle,approval:x.approval,scope:x.scope,assemblyIds:x.assemblyIds,releasedAtUtc:x.releasedAtUtc,
  reviewSha256:createHash("sha256").update(raw).digest("hex"),providerCalls:0 as const,phase6PaidGo:false as const};
}
