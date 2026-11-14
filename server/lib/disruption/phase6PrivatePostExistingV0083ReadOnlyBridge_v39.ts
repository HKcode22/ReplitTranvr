/**
 * Phase6: day-epoch Ed25519 signed POST route + V0095 independently verified
 * restricted POST_PACKET -> EXISTING Phase5 V0083 POST read-only admission.
 *
 * A signed packet cannot become paid GO, a false physical flight label,
 * or a POST outcome without a real SOURCE-role same-flight PRE readback.
 * This function does NOT dispatch GitHub, use AeroDataBox, issue SQL,
 * reserve credits, or run the existing paid V0083 owner. A due result
 * still REQUIRES independently authenticated complete GH history and the
 * original V0083 serializable reservation before one physical POST GET.
 */
import {createHash} from "node:crypto";
import {
 admitP5FuturePostGithubParent
} from "../../../scripts/v39_phase5_future_post_github_child_dispatcher_v39";
import {
 admitP5FuturePostFrozenForReadOnly,
 planP5FuturePostOneChild
} from "./phase5FuturePostGithubReadonlyRelease_v39";
import type {
 P5FuturePostActualPreReadback
} from "./phase5V0083FuturePostOriginalDb_v39";
import type {
 P5SignedFuturePostPacket
} from "../../../scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39";

export const P6_PRIVATE_POST_ORIGINAL_V0083_BRIDGE_SCHEMA=
 "v39.phase6.private-post-original-v0083-source-pre-readonly-no-dispatch.v1";
const SHA=/^[a-f0-9]{64}$/;
const POST=/^data-collection\/phase5\/frozen\/post_[A-Za-z0-9_-]{8,100}\.json$/;
const SOURCE=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const fail=(s:string):never=>{
 throw Error("HOLD_P6_PRIVATE_POST_V0083_"+s);
};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
function timestamp(v:unknown):number{
 if(typeof v!=="string")fail("UNVERIFIED_RESTRICTED_DB_CLOCK");
 const s=v as string;
 if(!ISO.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)fail("UNVERIFIED_RESTRICTED_DB_CLOCK");
 return Date.parse(s);
}
function sealed(v:unknown,key:string){
 if(!v||typeof v!=="object")return false;
 const d=Object.getOwnPropertyDescriptor(v,key);
 return Boolean(d&&d.enumerable===false&&d.writable===false);
}
export interface P6OnePrivatePostPins{
 expectedRoutingIntentSha256:string;
 /** Mandatory for NEW signed run-day mode; old mode retained for CI only. */
 expectedDayEpochIndexSha256?:string;
 expectedPostPacketPath:string;
 expectedPostPacketSha256:string;
 expectedSourceRegistryPath:string;
 expectedFlightInstanceId:string;
}
export function reviewP6PrivatePostWithOriginalV0083NoDispatch({
 indexHandoff,postPacketReceipt,actualPre,actualSourcePreDbClockUtc,
 env,pins
}:{
 indexHandoff:any;
 postPacketReceipt:any;
 actualPre:P5FuturePostActualPreReadback|null;
 actualSourcePreDbClockUtc:string;
 env:NodeJS.ProcessEnv;
 pins:P6OnePrivatePostPins;
}){
 if(!pins||!SHA.test(pins.expectedRoutingIntentSha256??"")||
    !SHA.test(pins.expectedPostPacketSha256??"")||
    !POST.test(pins.expectedPostPacketPath??"")||
    !SOURCE.test(pins.expectedSourceRegistryPath??"")||
    typeof pins.expectedFlightInstanceId!=="string"||
    pins.expectedFlightInstanceId.length<5)
  fail("MISSING_EXACT_PRIVATE_POST_AND_SOURCE_PINS");
 const z=indexHandoff?.redactedSummary;
 const oldOnly=z?.schema===
     "v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1"&&
    z.status==="SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH"&&
    z.underlyingPerFlightPacketsNotHydratedHere===true&&
    sealed(indexHandoff,"privateRegistryBytes")&&
    indexHandoff.privateRegistryBytes instanceof Map;
 const perDay=z?.schema===
     "v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1"&&
    z.status==="ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO"&&
    z.reviewedEd25519SourceWasOriginalDayBytes===true&&
    z.originalV0096GlobalChainNotUsed===true&&
    z.derivedProjectionIsNotAnAdditionalReviewerSignature===true&&
    z.actualIndividualChildPaidReleaseDone===false&&
    SHA.test(z.externallySignedDayEpochIndexSha256??"")&&
    z.externallySignedDayEpochIndexSha256===pins.expectedDayEpochIndexSha256&&
    Number.isSafeInteger(z.runDayIndex)&&z.runDayIndex>=1&&
    z.runDayIndex<=31&&
    sealed(indexHandoff,"getFrozen")&&
    typeof indexHandoff.getFrozen==="function";
 if((!oldOnly&&!perDay)||z.phase6PaidGo!==false||
    z.providerCalls!==0||z.databaseWrites!==0||
    z.githubChildDispatches!==0||
    !sealed(indexHandoff,"privateRoutingCandidates")||
    !Array.isArray(indexHandoff.privateRoutingCandidates))
  fail("UNVERIFIED_V0096_SIGNED_INDEX_PRIVATE_REGISTRY");
 const routes=indexHandoff.privateRoutingCandidates.filter((v:any)=>
  v?.routingIntentSha256===pins.expectedRoutingIntentSha256);
 if(routes.length!==1)fail("NO_UNIQUE_SIGNED_POST_ROUTING_INTENT");
 const route=routes[0];
 if(route.lane!=="POST"||
    (perDay&&route.runDayIndex!==z.runDayIndex)||
    route.signedFrozenPath!==pins.expectedPostPacketPath||
    route.signedFrozenSha256!==pins.expectedPostPacketSha256||
    route.boundSourceRegistryPath!==pins.expectedSourceRegistryPath||
    !SHA.test(route.boundSourceRegistrySha256??"")||
    route.privateBytesOnlyFromRestrictedReader!==true||
    route.independentlyAuthenticatedGHHistoryRequired!==true||
    route.newPaidDispatchAuthorizedHere!==false||
    !Number.isSafeInteger(route.runDayIndex)||
    route.runDayIndex<1||route.runDayIndex>31||
    !Number.isSafeInteger(route.shardIndex))
  fail("V0096_POST_ROUTE_OR_SOURCE_LINK_CHANGED");
 let indexPost:Buffer,indexSource:Buffer;
 try{
  indexPost=perDay?indexHandoff.getFrozen(route.signedFrozenPath):
   indexHandoff.privateRegistryBytes.get(route.signedFrozenPath);
  indexSource=perDay?indexHandoff.getFrozen(route.boundSourceRegistryPath):
   indexHandoff.privateRegistryBytes.get(route.boundSourceRegistryPath);
 }catch{return fail("POST_OR_SOURCE_PRIVATE_REGISTRY_LOOKUP_REFUSED_REDACTED");}
 if(!Buffer.isBuffer(indexPost)||!Buffer.isBuffer(indexSource)||
    hash(indexPost)!==route.signedFrozenSha256||
    hash(indexSource)!==route.boundSourceRegistrySha256)
  fail("INDEX_POST_OR_SOURCE_REGISTRY_PRIVATE_SHA_CHANGED");
 const p=postPacketReceipt?.redactedSummary;
 if(p?.schema!=="v39.phase6.private-source-post-packet-restricted-read-once.v1"||
    p.status!=="VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO"||
    p.kind!=="POST_PACKET"||p.runDayIndex!==route.runDayIndex||
    p.shardIndex!==route.shardIndex||
    p.contentSha256!==route.signedFrozenSha256||
    p.verifiedEd25519Review!==true||
    p.actualPhase6PaidGoCertified!==false||
    p.independentlyAuthorizedProviderUseCertified!==false||
    p.contentsWereCopiedToPublicLogs!==false||
    p.providerCalls!==0||p.databaseWrites!==0||p.githubDispatches!==0||
    !sealed(postPacketReceipt,"privateBytes")||
    !sealed(postPacketReceipt,"privateLogicalPath")||
    postPacketReceipt.privateLogicalPath!==pins.expectedPostPacketPath||
    !Buffer.isBuffer(postPacketReceipt.privateBytes)||
    postPacketReceipt.privateBytes.length<300||
    postPacketReceipt.privateBytes.length>100000||
    hash(postPacketReceipt.privateBytes)!==pins.expectedPostPacketSha256||
    !postPacketReceipt.privateBytes.equals(indexPost))
  fail("POST_ED25519_PG16_READER_OR_BYTE_SHA_DRIFT");
 const indexTime=timestamp(perDay?z.observedRealPgClockUtc:
   z.observedRestrictedPgClockUtc),
   packetTime=timestamp(p.observedDatabaseClockUtc),
   preTime=timestamp(actualSourcePreDbClockUtc);
 if(packetTime<indexTime||packetTime-indexTime>120000||
    preTime<packetTime||preTime-packetTime>120000||
    indexTime<timestamp(route.notBeforeUtc)||
    preTime>=timestamp(route.hardLatestUtc))
  fail("POST_DUE_WINDOW_OR_RESTRICTED_DB_CLOCK_TOO_STALE");

 // Preserve the original schedule-parent read-only GO checks, including
 // actual SOURCE role URL, GH run identity, independent signed budget and
 // source rights. There is no provider key in this parent.
 const parent=(()=>{
  try{return admitP5FuturePostGithubParent(env);}
  catch{return fail("ORIGINAL_P5_POST_PARENT_APPROVAL_HOLD");}
 })();
 if(env.P5_POST_FROZEN_PACKET_FILE!==pins.expectedPostPacketPath||
    env.V39_P5_POST_SIGNED_PACKET_SHA256!==pins.expectedPostPacketSha256)
  fail("P5_POST_CHILD_PATH_OR_EXACT_SHA_CHANGED");

 const parsed=(()=>{
  try{return JSON.parse(postPacketReceipt.privateBytes.toString("utf8")) as P5SignedFuturePostPacket;}
  catch{return fail("PRIVATE_POST_NOT_VALID_SIGNED_JSON");}
 })();
 const original=(()=>{
  try{return admitP5FuturePostFrozenForReadOnly(
   postPacketReceipt.privateBytes,parsed,parent.pins);}
  catch{return fail("ORIGINAL_V0083_SIGNED_POST_RELEASE_REJECTED");}
 })();
 if(original.runDayIndex!==route.runDayIndex||
    original.flightInstanceId!==pins.expectedFlightInstanceId)
  fail("POST_NOT_SAME_NATIVE_FLIGHT_OR_DAY_AS_REVIEWED_RELEASE");

 if(actualPre===null){
  return Object.freeze({redactedSummary:Object.freeze({
   schema:P6_PRIVATE_POST_ORIGINAL_V0083_BRIDGE_SCHEMA,
   status:"POST_SOURCE_PRE_EVIDENCE_NOT_SUPPLIED_UNRESOLVED_NO_DISPATCH",
   runDayIndex:route.runDayIndex,shardIndex:route.shardIndex,
   packetSha256:p.contentSha256,routingIntentSha256:route.routingIntentSha256,
   observedActualSourceClockUtc:actualSourcePreDbClockUtc,
   observedValidPreHorizonCount:null,
   missingPreHorizonCount:null,
   noFalseNegativeFromAbsentPRE:true,
   independentSourcePREReadbackStillRequired:true,
   providerCalls:0,sqlWrites:0,githubDispatches:0,phase6PaidGo:false
  })});
 }
 const decision=(()=>{
  try{return planP5FuturePostOneChild(
   original,actualPre,actualSourcePreDbClockUtc,null,
   pins.expectedPostPacketPath);}
  catch{return fail("ORIGINAL_SOURCE_BOUND_PRE_OR_POST_WINDOW_INVALID");}
 })();

 const due=decision.status==="POST_DUE_REQUIRES_GITHUB_HISTORY_CHECK";
 const result={redactedSummary:Object.freeze({
  schema:P6_PRIVATE_POST_ORIGINAL_V0083_BRIDGE_SCHEMA,
  status:due?
   "ONE_PRIVATE_POST_DUE_NEEDS_AUTHENTICATED_GITHUB_HISTORY_NO_DISPATCH":
   decision.status,
  runDayIndex:route.runDayIndex,shardIndex:route.shardIndex,
  packetSha256:p.contentSha256,
  routingIntentSha256:route.routingIntentSha256,
  sourceRegistrySha256:route.boundSourceRegistrySha256,
  observedActualSourceClockUtc:actualSourcePreDbClockUtc,
  observedValidPreHorizonCount:decision.observedPreCount,
  missingPreHorizonCount:decision.missingPreCount,
  originalSignedV0083ReadOnlyPREAndRightsChecksUsed:true,
  independentCompleteGithubHistoryStillRequired:true,
  exactOriginalV0083PaidReservationNotInvoked:true,
  noPhysicalActualLabelInferred:true,
  providerCalls:0,sqlWrites:0,githubDispatches:0,phase6PaidGo:false
 })};
 if(due){
  Object.defineProperties(result,{
   privatePostPacketBytes:{
    value:Buffer.from(postPacketReceipt.privateBytes),
    enumerable:false,writable:false
   },
   privatePostPacket:{
    value:parsed,enumerable:false,writable:false
   },
   privatePostLogicalPath:{
    value:pins.expectedPostPacketPath,enumerable:false,writable:false
   }
  });
 }
 return Object.freeze(result);
}
