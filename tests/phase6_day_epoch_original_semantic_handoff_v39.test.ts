import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {inspectP6DayEpochExistingShardSemanticsNoGo}
 from "../server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs";
const h=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const buf=(x:unknown)=>Buffer.from(JSON.stringify(x));
const manifest="a".repeat(64),calendar="b".repeat(64),
 code="f".repeat(40),release="c".repeat(64),
 rights="d".repeat(64),review="e".repeat(64);
const root="data-collection/phase5/frozen/";
const now="2026-11-14T02:00:00.000Z";
function fixture(){
 const srcPath=root+"source_day1_shard1_registry.json";
 const prePath=root+"later_day1_shard1_registry.json";
 const postPath=root+"post_day1_shard1_registry.json";
 const src=buf({
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:manifest,runDayIndex:1,
  entries:[{filePath:root+"source_packet_one.json",
   expectedPacketSha256:h("packet"),expectedQueryDigestSha256:h("query")}]
 });
 const sourceEntry={
  lane:"SOURCE",runDayIndex:1,shardIndex:1,
  filePath:srcPath,fileSha256:h(src),
  publishedAtUtc:"2026-11-14T01:50:00.000Z",
  notBeforeUtc:"2026-11-14T01:59:00.000Z",
  hardLatestUtc:"2026-11-14T02:15:00.000Z",
  reviewEvidenceSha256:review,sourceRegistryFilePath:null,
  sourceRegistrySha256:null
 };
 const pre=buf({
  schema:"v39.phase5.signed-later-pre-day-registry.v1",
  manifestSha256:manifest,reviewedCodeSha:code,
  sourceDayRegistryFilePath:srcPath,
  sourceDayRegistrySha256:h(src),
  runDayIndex:1,shardIndex:1,
  entries:[{filePath:root+"later_packet_one.json",
   expectedPacketSha256:h("pre-packet"),
   expectedQueryDigestSha256:h("query"),
   expectedFlightInstanceId:"flight_day_1_sample_1",
   expectedHorizon:"T-6h"}]
 });
 const preEntry={
  ...sourceEntry,lane:"LATER_PRE",filePath:prePath,
  fileSha256:h(pre),
  publishedAtUtc:"2026-11-14T01:51:00.000Z",
  sourceRegistryFilePath:srcPath,sourceRegistrySha256:h(src)
 };
 const post=buf({
  schema:"v39.phase5.github-future-post-reviewed-release.v1",
  approvedCodeSha:code,
  reviewed:{manifestSha256:manifest,runDayIndex:1,
   requestSha256:h("post"),
   independentFuturePostRequestAndRightsReview:true},
  independentSourceContentsUseAndRESTReleaseAttested:true
 });
 const postEntry={
  ...sourceEntry,lane:"POST",filePath:postPath,
  fileSha256:h(post),
  publishedAtUtc:"2026-11-14T01:52:00.000Z",
  sourceRegistryFilePath:srcPath,sourceRegistrySha256:h(src)
 };
 const prior={
  schema:"v39.phase6.run-day-scoped-append-only-index.v1",
  runDayIndex:1,revision:1,previousIndexSha256:null,
  manifestSha256:manifest,calendarSha256:calendar,
  reviewedCodeSha:code,reviewedReleaseSha256:release,
  reviewedRightsSha256:rights,entries:[sourceEntry]
 };
 const priorBytes=buf(prior);
 const current={...prior,revision:2,previousIndexSha256:h(priorBytes),
  entries:[sourceEntry,preEntry,postEntry]};
 const raw=buf(current);
 const files=new Map([[srcPath,src],[prePath,pre],[postPath,post]]);
 function receipt(overrides:any={}){
  return{
   redactedSummary:{
    status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH",
    externalEd25519ReviewerVerified:true,
    restrictedPrivatePg16ReaderVerified:true,
    actualPrivateRegistryBytesRead:true,
    authoritativeFlightSemanticAdmissionDone:false,
    providerCalls:0,databaseWrites:0,githubChildDispatches:0,
    phase6PaidGo:false,
    indexSha256:h(raw),runDayIndex:1,indexRevision:2,
    observedDbClockUtc:now,
    ...overrides.redactedSummary
   },
   privateCurrentIndexBytes:overrides.privateCurrentIndexBytes??raw,
   privatePreviousIndexBytes:overrides.privatePreviousIndexBytes??priorBytes,
   privateParsedIndex:overrides.privateParsedIndex??current,
   getFrozen:overrides.getFrozen??((path:string)=>{
    const bytes=files.get(path);
    if(!bytes)throw Error("TEST_MISSING_FROZEN_BYTES");
    return bytes;
   })
  };
 }
 return{current,raw,priorBytes,receipt,files,
  srcPath,prePath,postPath,sourceEntry,preEntry,postEntry};
}
describe("Day-epoch externally verified byte adapter to existing Phase5 semantic audit NO GO",()=>{
 it("reuses original SOURCE/T6/POST validators and produces bounded due proposals, zero dispatch",()=>{
  const x=fixture(),out=inspectP6DayEpochExistingShardSemanticsNoGo(x.receipt());
  expect(out.redactedSummary.selectedRouteCount).toBe(3);
  expect(out.redactedSummary.lanes.map((x:any)=>x.proposed)).toEqual([1,1,1]);
  expect(out.redactedSummary.externallySignedDayEpochIndexSha256).toBe(h(x.raw));
  expect(out.redactedSummary.originalV0096GlobalChainNotUsed).toBe(true);
  expect(out.redactedSummary.derivedProjectionIsNotAnAdditionalReviewerSignature).toBe(true);
  expect(out.redactedSummary.phase6PaidGo).toBe(false);
  expect(out.redactedSummary.githubChildDispatches).toBe(0);
  expect(Object.keys(out)).toEqual(["redactedSummary"]);
  expect(JSON.stringify(out)).not.toContain(x.srcPath);
  expect(JSON.stringify(out)).not.toContain("flight_day_1_sample_1");
  expect(out.privateRoutingCandidates).toHaveLength(3);
 });
 it("refuses a changed SOURCE registry even if caller supplies the signed index",()=>{
  const f=fixture();
  const x=f.receipt({getFrozen:(path:string)=>{
   if(path===f.srcPath)return Buffer.from("tampered");
   return f.files.get(path)!;
  }});
  expect(()=>inspectP6DayEpochExistingShardSemanticsNoGo(x)).
   toThrow(/UNVERIFIED_FROZEN_REGISTRY_BYTES/);
 });
 it("refuses fake POST legal review and duplicate/altered flight horizon",()=>{
  const f=fixture();
  const bad=JSON.parse(f.files.get(f.postPath)!.toString());
  bad.independentSourceContentsUseAndRESTReleaseAttested=false;
  const postBytes=buf(bad);
  const alteredEntry={...f.postEntry,fileSha256:h(postBytes)};
  const current={...f.current,entries:[
   f.sourceEntry,f.preEntry,alteredEntry]};
  const raw=buf(current);
  const x=f.receipt({privateCurrentIndexBytes:raw,privateParsedIndex:current,
   redactedSummary:{indexSha256:h(raw)},
   getFrozen:(path:string)=>path===f.postPath?postBytes:f.files.get(path)!});
  expect(()=>inspectP6DayEpochExistingShardSemanticsNoGo(x)).
   toThrow(/POST_NOT_AN_EXACT_REVIEWED_ORIGINAL_PACKET/);
 });
 it("rejects wrong day, wrong signed SHA and an absent predecessor",()=>{
  const f=fixture();
  expect(()=>inspectP6DayEpochExistingShardSemanticsNoGo(
   f.receipt({redactedSummary:{indexSha256:h("wrong")}}))).
   toThrow(/NOT_AN_VERIFIED_READONLY_DAY_REGISTRY_BUNDLE/);
  expect(()=>inspectP6DayEpochExistingShardSemanticsNoGo(
   f.receipt({privatePreviousIndexBytes:Buffer.from("{}")}))).
   toThrow(/MISSING_SIGNED_DAY_PREDECESSOR/);
  expect(()=>inspectP6DayEpochExistingShardSemanticsNoGo(
   f.receipt({redactedSummary:{runDayIndex:2}}))).
   toThrow(/NOT_AN_VERIFIED_READONLY_DAY_REGISTRY_BUNDLE/);
 });
 it("does not treat review, good SOURCE and PRE as physical actual outcome",()=>{
  const f=fixture(),x=inspectP6DayEpochExistingShardSemanticsNoGo(f.receipt());
  expect(x.redactedSummary.actualOperatingFlightMembershipEstablishedHere).toBe(false);
  expect(x.redactedSummary.individualUnderlyingFlightPacketsVerifiedHere).toBe(false);
  expect(x.redactedSummary.actualIndividualChildPaidReleaseDone).toBe(false);
 });
});
