import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {reviewP6PrivatePostWithOriginalV0083NoDispatch}
 from "../server/lib/disruption/phase6PrivatePostExistingV0083ReadOnlyBridge_v39";
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const H=(x:string)=>x.repeat(64);
const root="data-collection/phase5/frozen/";
const sourcePath=root+"source_registry_abcdefgh.json";
const postPath=root+"post_native_abcdefgh.json";
function fixture(){
 const source=Buffer.from(JSON.stringify({
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:H("a"),runDayIndex:1,
  entries:[{filePath:root+"sourceq_abcdefgh.json",
   expectedPacketSha256:H("b"),expectedQueryDigestSha256:H("c")}]
 }));
 const post=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-future-post-reviewed-release.v1",
  payloadForSyntheticOriginalReadOnlyProof:"X".repeat(400)
 }));
 const route={
  lane:"POST",runDayIndex:1,shardIndex:2,
  signedFrozenPath:postPath,signedFrozenSha256:hash(post),
  boundSourceRegistryPath:sourcePath,boundSourceRegistrySha256:hash(source),
  routingIntentSha256:hash("reviewed due POST route"),
  privateBytesOnlyFromRestrictedReader:true,
  independentlyAuthenticatedGHHistoryRequired:true,
  newPaidDispatchAuthorizedHere:false,
  notBeforeUtc:"2027-03-01T09:30:00.000Z",
  hardLatestUtc:"2027-03-01T10:30:00.000Z"
 };
 const packetMap=new Map([[sourcePath,source],[postPath,post]]);
 const daySha=hash("Ed25519 external day review pinned");
 const index:any={redactedSummary:{
  schema:"v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1",
  status:"ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO",
  runDayIndex:1,externallySignedDayEpochIndexSha256:daySha,
  observedRealPgClockUtc:"2027-03-01T10:08:00.000Z",
  reviewedEd25519SourceWasOriginalDayBytes:true,
  originalV0096GlobalChainNotUsed:true,
  derivedProjectionIsNotAnAdditionalReviewerSignature:true,
  actualIndividualChildPaidReleaseDone:false,
  phase6PaidGo:false,providerCalls:0,databaseWrites:0,
  githubChildDispatches:0
 }};
 Object.defineProperties(index,{
  privateRoutingCandidates:{value:[route],enumerable:false,writable:false},
  getFrozen:{value:(p:string)=>{
   const b=packetMap.get(p);
   if(!b)throw Error("CI_MISSING_PRIVATE_PACKET");
   return Buffer.from(b);
  },enumerable:false,writable:false}
 });
 const packet:any={redactedSummary:{
  schema:"v39.phase6.private-source-post-packet-restricted-read-once.v1",
  status:"VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO",
  kind:"POST_PACKET",runDayIndex:1,shardIndex:2,
  contentSha256:hash(post),
  observedDatabaseClockUtc:"2027-03-01T10:09:00.000Z",
  verifiedEd25519Review:true,actualPhase6PaidGoCertified:false,
  independentlyAuthorizedProviderUseCertified:false,
  contentsWereCopiedToPublicLogs:false,
  providerCalls:0,databaseWrites:0,githubDispatches:0
 }};
 Object.defineProperties(packet,{
  privateBytes:{value:post,enumerable:false,writable:false},
  privateLogicalPath:{value:postPath,enumerable:false,writable:false}
 });
 const pins:any={
  expectedRoutingIntentSha256:route.routingIntentSha256,
  expectedDayEpochIndexSha256:daySha,
  expectedPostPacketPath:postPath,
  expectedPostPacketSha256:hash(post),
  expectedSourceRegistryPath:sourcePath,
  expectedFlightInstanceId:"leg:ci:100"
 };
 const args:any={
  indexHandoff:index,postPacketReceipt:packet,
  actualPre:null,actualSourcePreDbClockUtc:"2027-03-01T10:10:00.000Z",
  env:{},pins
 };
 return{index,route,packetMap,pins,args};
}
describe("NEW protected day-epoch POST to original V0083 STOP boundary",()=>{
 it("accepts exact day-epoch bytes and reaches ORIGINAL V0083 parent release, never bypassing it",()=>{
  const f=fixture();
  expect(()=>reviewP6PrivatePostWithOriginalV0083NoDispatch(f.args)).
   toThrow("ORIGINAL_P5_POST_PARENT_APPROVAL_HOLD");
 });
 it("rejects forged signed day digest and cross-day POST before original gate",()=>{
  const a=fixture();a.pins.expectedDayEpochIndexSha256=H("0");
  expect(()=>reviewP6PrivatePostWithOriginalV0083NoDispatch(a.args)).
   toThrow("UNVERIFIED_V0096_SIGNED_INDEX_PRIVATE_REGISTRY");
  const b=fixture();b.index.redactedSummary.runDayIndex=2;
  expect(()=>reviewP6PrivatePostWithOriginalV0083NoDispatch(b.args)).
   toThrow("V0096_POST_ROUTE_OR_SOURCE_LINK_CHANGED");
 });
 it("rejects missing or altered protected SOURCE and POST bytes",()=>{
  const a=fixture();a.packetMap.delete(sourcePath);
  expect(()=>reviewP6PrivatePostWithOriginalV0083NoDispatch(a.args)).
   toThrow("POST_OR_SOURCE_PRIVATE_REGISTRY_LOOKUP_REFUSED_REDACTED");
  const b=fixture();b.packetMap.set(postPath,Buffer.from("TAMPER"));
  expect(()=>reviewP6PrivatePostWithOriginalV0083NoDispatch(b.args)).
   toThrow("INDEX_POST_OR_SOURCE_REGISTRY_PRIVATE_SHA_CHANGED");
 });
 it("refuses unpinned reviewer claim and never invokes original POST payment",()=>{
  const f=fixture();
  f.index.redactedSummary.derivedProjectionIsNotAnAdditionalReviewerSignature=false;
  expect(()=>reviewP6PrivatePostWithOriginalV0083NoDispatch(f.args)).
   toThrow("UNVERIFIED_V0096_SIGNED_INDEX_PRIVATE_REGISTRY");
 });
});
