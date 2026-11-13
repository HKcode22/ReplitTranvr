import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 auditP5Phase6AppendOnlyDayShardIndex,
 type P5Phase6DayShardEntry,
 type P5Phase6DayShardIndex,
 type P5Phase6DayShardPins
} from "../server/lib/disruption/phase5Phase6AppendOnlyDayShardIndex_v39";

const a="a".repeat(64),b="b".repeat(64),c="c".repeat(64),
 d="d".repeat(64),code="e".repeat(40);
const base="data-collection/phase5/frozen/";
const digest=(data:Buffer)=>createHash("sha256").update(data).digest("hex");
const files=new Map<string,Buffer>();
const bytes=(v:unknown)=>Buffer.from(JSON.stringify(v),"utf8");
const observed="2027-02-10T00:36:00.000Z";
const started="2027-02-09T23:00:00.000Z";
function source(day:number,shard:number,pub:string,first:string,last:string){
 const path=base+`source_day${day}_shard${shard}_frozen.json`;
 const raw=bytes({
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:a,runDayIndex:day,
  entries:[{
   filePath:base+`source_packet_d${day}_s${shard}_01.json`,
   expectedPacketSha256:b,
   expectedQueryDigestSha256:digest(Buffer.from(`query-${day}-${shard}`))
  }]
 });
 files.set(path,raw);
 const e:P5Phase6DayShardEntry={
  lane:"SOURCE",runDayIndex:day,shardIndex:shard,
  filePath:path,fileSha256:digest(raw),
  publishedAtUtc:pub,notBeforeUtc:first,hardLatestUtc:last,
  reviewEvidenceSha256:d,sourceRegistryFilePath:null,
  sourceRegistrySha256:null
 };
 return e;
}
function later(day:number,shard:number,src:P5Phase6DayShardEntry,
 pub:string,first:string,last:string){
 const path=base+`later_day${day}_shard${shard}_frozen.json`;
 const raw=bytes({
  schema:"v39.phase5.signed-later-pre-day-registry.v1",
  manifestSha256:a,reviewedCodeSha:code,
  sourceDayRegistryFilePath:src.filePath,
  sourceDayRegistrySha256:src.fileSha256,
  runDayIndex:day,shardIndex:shard,
  entries:[{
   filePath:base+`later_packet_day${day}_shard${shard}.json`,
   expectedPacketSha256:c,expectedQueryDigestSha256:b,
   expectedFlightInstanceId:`flight_day_${day}_shard_${shard}`,
   expectedHorizon:"T-6h"
  }]
 });
 files.set(path,raw);
 return{
  lane:"LATER_PRE",runDayIndex:day,shardIndex:shard,
  filePath:path,fileSha256:digest(raw),
  publishedAtUtc:pub,notBeforeUtc:first,hardLatestUtc:last,
  reviewEvidenceSha256:d,
  sourceRegistryFilePath:src.filePath,
  sourceRegistrySha256:src.fileSha256
 } as P5Phase6DayShardEntry;
}
function post(day:number,shard:number,src:P5Phase6DayShardEntry,
 pub:string,first:string,last:string){
 const path=base+`post_day${day}_shard${shard}_frozen.json`;
 const raw=bytes({
  schema:"v39.phase5.github-future-post-reviewed-release.v1",
  approvedCodeSha:code,
  reviewed:{
   manifestSha256:a,runDayIndex:day,
   requestSha256:digest(Buffer.from(`post-${day}-${shard}`)),
   independentFuturePostRequestAndRightsReview:true
  },
  independentSourceContentsUseAndRESTReleaseAttested:true
 });
 files.set(path,raw);
 return{
  lane:"POST",runDayIndex:day,shardIndex:shard,
  filePath:path,fileSha256:digest(raw),
  publishedAtUtc:pub,notBeforeUtc:first,hardLatestUtc:last,
  reviewEvidenceSha256:d,
  sourceRegistryFilePath:src.filePath,
  sourceRegistrySha256:src.fileSha256
 } as P5Phase6DayShardEntry;
}
function makeIndex(entries:P5Phase6DayShardEntry[],
 revision=1,previousIndexSha256:string|null=null){
 const index:P5Phase6DayShardIndex={
  schema:"v39.phase5.phase6-append-only-day-shard-index.v1",
  manifestSha256:a,calendarSha256:b,reviewedCodeSha:code,
  reviewedReleaseSha256:c,reviewedRightsSha256:d,revision,
  previousIndexSha256,entries
 };
 const raw=bytes(index);
 const pins:P5Phase6DayShardPins={
  expectedIndexSha256:digest(raw),
  expectedManifestSha256:a,expectedCalendarSha256:b,
  expectedCodeSha:code,expectedReleaseSha256:c,expectedRightsSha256:d,
  observedDbClockUtc:observed,
  exactExternallyReviewedIndexSha256:digest(raw)
 };
 return {index,raw,pins};
}
function audit(
 x:ReturnType<typeof makeIndex>,
 prior?:ReturnType<typeof makeIndex>
){
 return auditP5Phase6AppendOnlyDayShardIndex(
  x.raw,x.index,x.pins,(p:string)=>{
   const b=files.get(p);
   if(!b)throw Error("TEST_FILE_NOT_FOUND");
   return b;
  },
  prior?.raw??null,prior?.index??null
 );
}
function fixture(){
 files.clear();
 const s1=source(1,1,"2027-02-09T22:00:00.000Z",
  "2027-02-09T23:20:00.000Z","2027-02-10T00:40:00.000Z");
 const s2=source(2,1,"2027-02-09T22:10:00.000Z",
  "2027-02-10T00:20:00.000Z","2027-02-10T01:40:00.000Z");
 const l1=later(1,1,s1,"2027-02-09T22:20:00.000Z",
  "2027-02-10T00:10:00.000Z","2027-02-10T00:55:00.000Z");
 const p1=post(1,1,s1,"2027-02-09T22:30:00.000Z",
  "2027-02-10T00:30:00.000Z","2027-02-10T00:59:00.000Z");
 return{s1,s2,l1,p1};
}
describe("Phase6 real signed-shard append-only index — NOT a GO",()=>{
 it("selects simultaneous SOURCE days plus LATER/PRE and POST across midnight",()=>{
  const {s1,s2,l1,p1}=fixture();
  const r=audit(makeIndex([s1,s2,l1,p1]));
  expect(r.revision).toBe(1);
  expect(r.publishedShardCount).toBe(4);
  expect(r.dueShardCounts).toEqual({SOURCE:2,LATER_PRE:1,POST:1});
  expect(r.selectedForIndependentChildReview.SOURCE.map(x=>x.runDayIndex)).
   toEqual([1,2]);
  expect(r.deferredDueShardCounts).toEqual({
   SOURCE:0,LATER_PRE:0,POST:0});
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  expect(r.githubChildDispatches).toBe(0);
  expect(r.phase6PaidGo).toBe(false);
 });
 it("progresses to next day and honestly censors expired SOURCE shard",()=>{
  const {s1,s2,l1,p1}=fixture();
  const x=makeIndex([s1,s2,l1,p1]);
  x.pins.observedDbClockUtc="2027-02-10T00:51:00.000Z";
  const r=audit(x);
  expect(r.missedCensoredShardCounts.SOURCE).toBe(1);
  expect(r.selectedForIndependentChildReview.SOURCE.map(x=>x.runDayIndex)).
   toEqual([2]);
  expect(r.selectedForIndependentChildReview.LATER_PRE).toHaveLength(1);
  expect(r.selectedForIndependentChildReview.POST).toHaveLength(1);
 });
 it("accepts appended revision only with exact previous bytes and no rewrite",()=>{
  const {s1,s2,l1,p1}=fixture();
  const first=makeIndex([s1,s2]);
  const second=makeIndex([s1,s2,l1,p1],2,digest(first.raw));
  expect(audit(second,first).revision).toBe(2);
  const changed=makeIndex([s2,s1,l1,p1],2,digest(first.raw));
  expect(()=>audit(changed,first)).toThrow(
   "NON_MONOTONIC_OR_REWRITTEN_PREVIOUS_SHARDS");
  const badPrev=makeIndex([s1,s2,l1,p1],2,"f".repeat(64));
  expect(()=>audit(badPrev,first)).toThrow(
   "NON_MONOTONIC_OR_REWRITTEN_PREVIOUS_SHARDS");
  const skipped=makeIndex([s1,s2,l1,p1],4,digest(first.raw));
  expect(()=>audit(skipped,first)).toThrow(
   "NON_MONOTONIC_OR_REWRITTEN_PREVIOUS_SHARDS");
 });
 it("rejects a changed GitHub registry file or independently reviewed SHA",()=>{
  const {s1,s2}=fixture();
  const x=makeIndex([s1,s2]);
  files.set(s2.filePath,Buffer.from("ALTERED"));
  expect(()=>audit(x)).toThrow("UNVERIFIED_FROZEN_REGISTRY_BYTES");
  fixture();
  const y=makeIndex([s1,s2]);
  y.pins.exactExternallyReviewedIndexSha256="f".repeat(64);
  expect(()=>audit(y)).toThrow("UNPINNED_OR_UNREVIEWED_INDEX_AND_DB_CLOCK");
 });
 it("rejects future self-release and after-due/backfilled publication",()=>{
  const {s1,s2}=fixture();
  const a1=makeIndex([s1,s2]);
  a1.pins.observedDbClockUtc="2027-02-09T20:00:00.000Z";
  expect(()=>audit(a1)).toThrow("RETROSPECTIVE_OR_OVERLONG_SHARD_RELEASE");
  const late={...s2,publishedAtUtc:"2027-02-10T01:20:00.000Z"};
  expect(()=>audit(makeIndex([s1,late]))).toThrow(
   "RETROSPECTIVE_OR_OVERLONG_SHARD_RELEASE");
 });
 it("rejects mismatched SOURCE provenance for POST/LATER",()=>{
  const {s1,s2,l1,p1}=fixture();
  const tampered={...l1,sourceRegistrySha256:"f".repeat(64)};
  expect(()=>audit(makeIndex([s1,s2,tampered,p1]))).toThrow(
   "NONEXISTENT_OR_LATER_SOURCE_PROVENANCE");
  const missing=makeIndex([s2,l1,p1]);
  expect(()=>audit(missing)).toThrow(
   "NONEXISTENT_OR_LATER_SOURCE_PROVENANCE");
 });
 it("rejects same-day duplicate shard identity and path replay",()=>{
  const {s1,s2,l1}=fixture();
  expect(()=>audit(makeIndex([s1,s2,{...s1}]))).toThrow(
   "DUPLICATE_DAY_SHARD_OR_FROZEN_PATH");
  const changed={...s1,filePath:s2.filePath};
  expect(()=>audit(makeIndex([s1,s2,changed]))).toThrow(
   "DUPLICATE_DAY_SHARD_OR_FROZEN_PATH");
  // No POST may steal a source registry file and rename it a different lane.
  expect(()=>audit(makeIndex([s1,s2,l1,{...l1,shardIndex:2}]))).
   toThrow("DUPLICATE_DAY_SHARD_OR_FROZEN_PATH");
 });
 it("honestly defers >4 same-lane shards, without source calls or dropping excess",()=>{
  files.clear();
  const shards=Array.from({length:97},(_,i)=>
   source(1,i+1,"2027-02-09T22:00:00.000Z",
    "2027-02-10T00:10:00.000Z","2027-02-10T00:59:00.000Z"));
  const selected=audit(makeIndex(shards));
  expect(selected.dueShardCounts.SOURCE).toBe(97);
  expect(selected.selectedForIndependentChildReview.SOURCE).toHaveLength(4);
  expect(selected.deferredDueShardCounts.SOURCE).toBe(93);
  expect(selected.githubChildDispatches).toBe(0);
 });
 it("refuses duplicate underlying paid query in distinct SOURCE shards",()=>{
  const {s1,s2}=fixture();
  const p2=JSON.parse(files.get(s2.filePath)!.toString("utf8"));
  const p1=JSON.parse(files.get(s1.filePath)!.toString("utf8"));
  p2.entries[0].expectedQueryDigestSha256=
   p1.entries[0].expectedQueryDigestSha256;
  const newRaw=bytes(p2);
  files.set(s2.filePath,newRaw);
  const x=makeIndex([s1,{...s2,fileSha256:digest(newRaw)}]);
  expect(()=>audit(x)).toThrow("SOURCE_QUERY_REPEATED_ACROSS_DAY_SHARDS");
 });
 it("refuses duplicate flight-horizon across two separately signed later shards",()=>{
  const {s1,l1}=fixture();
  const l2=later(1,2,s1,"2027-02-09T22:30:00.000Z",
   "2027-02-10T00:20:00.000Z","2027-02-10T00:55:00.000Z");
  const p2=JSON.parse(files.get(l2.filePath)!.toString("utf8"));
  const p1=JSON.parse(files.get(l1.filePath)!.toString("utf8"));
  p2.entries[0].expectedFlightInstanceId=p1.entries[0].expectedFlightInstanceId;
  const raw=bytes(p2);files.set(l2.filePath,raw);
  const x=makeIndex([s1,l1,{...l2,fileSha256:digest(raw)}]);
  expect(()=>audit(x)).toThrow("DUPLICATE_FLIGHT_HORIZON_ACROSS_LATER_SHARDS");
 });
 it("refuses the same paid POST request assigned twice in two signed shards",()=>{
  const {s1,p1}=fixture();
  const p2=post(1,2,s1,"2027-02-09T22:40:00.000Z",
   "2027-02-10T00:31:00.000Z","2027-02-10T00:59:00.000Z");
  const newP=JSON.parse(files.get(p2.filePath)!.toString("utf8"));
  const oldP=JSON.parse(files.get(p1.filePath)!.toString("utf8"));
  newP.reviewed.requestSha256=oldP.reviewed.requestSha256;
  const raw=bytes(newP);files.set(p2.filePath,raw);
  expect(()=>audit(makeIndex([s1,p1,{...p2,fileSha256:digest(raw)}]))).
   toThrow("DUPLICATE_PAID_POST_REQUEST_ACROSS_SHARDS");
 });
 it("does not accept an unsigned synthetic index as an operating permit",()=>{
  const {s1,s2,l1,p1}=fixture();
  const x=makeIndex([s1,s2,l1,p1]);
  expect(audit(x).ownerReviewedIndexClaimIsNotCryptographicAuthorization).
   toBe(true);
  expect(audit(x).doesNotVerifyEveryUnderlyingFlightPacket).toBe(true);
  expect(audit(x).doesNotAuthorizeSourceRightsBudgetOrGO).toBe(true);
 });
});
