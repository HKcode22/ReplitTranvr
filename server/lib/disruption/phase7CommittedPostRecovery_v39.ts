/** Recovery-only boundary for an already committed POST. No HTTP, reserve,
 * source write, policy creation, or authorization. Independent reviewer must
 * supply the exact prior audit receipt, kept only within source custody.
 * This is deliberately not a paid child entrypoint or a rerun of one. */
import {verify} from "node:crypto";
import type {Pool} from "pg";
import {readP6CommittedPostOutcomeObservability,type P6PostCommittedScope} from "./phase6ActualPostOutcomeObservability_v39";
import {phase7AuditedPreservationGroups,requirePhase7PostConsumer,consumeCommittedPhase7Post,type Phase7PostAudit,type Phase7PostConsumer} from "./phase7PostPreservationBridge_v39";
import {readPhase7PostReviewerPublicKey} from "./phase7SignedPostReview_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import {verifyP5FuturePostReviewedFrame} from "./phase5V0083FuturePostOriginalDb_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_COMMITTED_POST_RECOVERY_"+s);};
const H=/^[a-f0-9]{64}$/;
const clock=(s:string)=>{const t=Date.parse(s);if(!Number.isFinite(t)||new Date(t).toISOString()!==s)hold("CLOCK");return t;};
const exact=(o:unknown,ks:string[])=>!!o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
function decode(v:unknown,max:number){
 if(typeof v!=="string"||v.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(v))return hold("WIRE");
 const b=Buffer.from(v,"base64");if(b.length>max||b.toString("base64")!==v)hold("WIRE");return b;
}
export interface Phase7CommittedPostRecoveryReceipt{
 schema:"v39.phase7.committed-post-recovery-receipt.v1";
 policySha256:string;
 committedScopeSha256:string;
 originalAuditSha256:string;
 originalAuditAtUtc:string;
 reviewedAtUtc:string;
 validUntilUtc:string;
}
export function phase7CommittedPostAuditIdentity(a:Phase7PostAudit){
 phase7AuditedPreservationGroups(a);
 if(Object.getOwnPropertyDescriptor(a,"privatePreservationAnchors")?.enumerable!==false||
  Object.getOwnPropertyDescriptor(a,"privateDecisions")?.enumerable!==false||
  !Array.isArray(a.privateDecisions))hold("PRIVATE_AUDIT");
 // Include the entire private denominator, not just counts or a chosen
 // anchor. Sorting removes only query ordering differences.
 const sort=(v:readonly unknown[])=>v.map(hashPhase7DurableCandidate).sort();
 return hashPhase7DurableCandidate({publicAudit:{...a},anchors:sort(a.privatePreservationAnchors),
  decisions:sort(a.privateDecisions),ambiguous:[...a.privateAmbiguousPreservationFlightIds].sort()});
}
function verifyReceipt(env:NodeJS.ProcessEnv,s:P6PostCommittedScope,wire:unknown){
 if(!exact(wire,["payloadBase64","signatureBase64"]))return hold("WIRE");
 const w=wire as {payloadBase64:string;signatureBase64:string};
 const raw=decode(w.payloadBase64,4096),sig=decode(w.signatureBase64,64);
 if(sig.length!==64||!verify(null,raw,readPhase7PostReviewerPublicKey(env),sig))hold("SIGNATURE");
 const x=JSON.parse(raw.toString("utf8")) as Phase7CommittedPostRecoveryReceipt;
 if(!exact(x,["schema","policySha256","committedScopeSha256","originalAuditSha256","originalAuditAtUtc","reviewedAtUtc","validUntilUtc"])||
  x.schema!=="v39.phase7.committed-post-recovery-receipt.v1"||
  x.policySha256!==env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256||
  x.committedScopeSha256!==hashPhase7DurableCandidate(s)||!H.test(x.originalAuditSha256))hold("EXACT_SCOPE");
 const prior=clock(x.originalAuditAtUtc),reviewed=clock(x.reviewedAtUtc),until=clock(x.validUntilUtc);
 if(prior>reviewed||reviewed>=until||until-prior>600000)hold("REVIEW_WINDOW");
 return x;
}
/** Requires an independently signed receipt of the previous full audit.
 * Re-read the identical original and live denominator from the existing
 * restricted SOURCE role. If an anchor expired or new PRE appeared, hold
 * instead of silently settling a smaller/different experiment. Existing
 * bundle consumer performs its own fresh exact review and reconciliation.
 * Recovery beyond the existing ten-minute original read is NOT authorized. */
export async function recoverPhase7CommittedPost(input:{
 env:NodeJS.ProcessEnv;scope:P6PostCommittedScope;wire:unknown;
 source:Pick<Pool,"connect">;consumer:Phase7PostConsumer;
}){
 const {env,scope:s,wire,source}=input;
 if(env.AERODATABOX_API_KEY||env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
  env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
  Object.entries(env).some(([k,v])=>k.startsWith("P6_PHASE7_")&&k.includes("PRIVATE_KEY")&&v))hold("RECOVERY_ONLY");
 const f=verifyP5FuturePostReviewedFrame(s.packet);
 if(f.reservedSha256!==s.reservationSha256||s.packet.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
  s.packet.reviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256)hold("ORIGINAL_SCOPE");
 const consumer=requirePhase7PostConsumer(env,input.consumer),receipt=verifyReceipt(env,s,wire);
 const a=await readP6CommittedPostOutcomeObservability(source,s);
 const now=clock(a.privateObservedDbClockUtc);
 if(now<clock(receipt.reviewedAtUtc)||now>=clock(receipt.validUntilUtc)||
  phase7CommittedPostAuditIdentity(a)!==receipt.originalAuditSha256)hold("LIVE_AUDIT_DRIFT");
 await consumer.preflight(s.packet);
 const result=await consumeCommittedPhase7Post(consumer,s,a);
 return {status:"COMMITTED_POST_RECOVERY_INDEPENDENT_READBACK_NO_GET" as const,
  ...result,paidReservations:0,phase6PaidGo:false as const};
}
