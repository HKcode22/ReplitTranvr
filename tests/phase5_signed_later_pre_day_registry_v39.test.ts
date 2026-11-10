import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {verifyP5SignedLaterPreDayRegistry,
 selectP5LaterPreDueRegistryEntries,
 type P5SignedLaterPreDayRegistry,
 type P5SignedLaterPreDayRegistryPins}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import type {P5SignedWitnessedLaterPrePacket}
 from "../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";

const SHA=(v:string)=>v.repeat(64);
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const code="e".repeat(40);
const first="data-collection/phase5/frozen/later_slot_hub_a.json";
const second="data-collection/phase5/frozen/later_slot_hub_b.json";
const third="data-collection/phase5/frozen/later_slot_hub_t90.json";
const registryFile="data-collection/phase5/frozen/later_day_shard_0001.json";
const srcOne="data-collection/phase5/frozen/source_query_a0001.json";
const srcTwo="data-collection/phase5/frozen/source_query_b0001.json";
const native="2027-02-10T12:00:00.000Z";
const uuid="a23e4567-e89b-42d3-a456-426614174000";
const receipt=SHA("a");
function fakePacket(file:string,horizon:"T-6h"|"T-90m",v2=false){
 const id=file===first?"leg:flight:a":
  file===second?"leg:flight:b":"leg:flight:a";
 const query=horizon==="T-6h"?SHA("b"):SHA("c");
 return {
  schema:v2?"v39.phase5.github-standalone-later-pre-asof-reviewed.v2":
   "v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,
  independentLaterHorizonAndT24ReviewAttested:v2?undefined:true,
  independentlyReviewedLaterWithoutT24AsOfAttested:v2?true:undefined,
  prePermit:{
   runDayIndex:4,manifestSha256:SHA("1"),
   expectedReviewedReleaseSha256:SHA("2"),
   expectedReviewedSourceRightsSha256:SHA("3"),
   queryDigestSha256:query,flightInstanceId:id,
   horizon,selectedTNativeUtc:native,
   expectedSourcePopulationQueryId:uuid,
   identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
   externalNativeTPhysicalLegAndSourceUseReviewed:true,
   reviewedT24WitnessReceipt:v2?undefined:{receiptSha256:receipt},
   reviewedStandaloneLaterNoT24:v2?{
    missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
    reviewedProtocolSha256:SHA("4")
   }:undefined
  }
 } as unknown as P5SignedWitnessedLaterPrePacket;
}
function fixture(){
 const files=new Map<string,Buffer>([
  [first,Buffer.from(JSON.stringify(fakePacket(first,"T-6h")))],
  [second,Buffer.from(JSON.stringify(fakePacket(second,"T-6h")))],
  [third,Buffer.from(JSON.stringify(fakePacket(third,"T-90m")))]
 ]);
 const source:P5SignedSourceBatchRegistry={
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:SHA("1"),runDayIndex:4,entries:[
   {filePath:srcOne,expectedPacketSha256:SHA("5"),
    expectedQueryDigestSha256:SHA("b")},
   {filePath:srcTwo,expectedPacketSha256:SHA("6"),
    expectedQueryDigestSha256:SHA("c")}
  ]
 };
 const sourceBytes=Buffer.from(JSON.stringify(source));
 const registry:P5SignedLaterPreDayRegistry={
  schema:"v39.phase5.signed-later-pre-day-registry.v1",
  manifestSha256:SHA("1"),reviewedCodeSha:code,
  sourceDayRegistrySha256:digest(sourceBytes),
  sourceDayRegistryFilePath:"data-collection/phase5/frozen/source_day_0004.json",
  runDayIndex:4,shardIndex:1,entries:[
   {filePath:first,expectedPacketSha256:digest(files.get(first)!),
    expectedQueryDigestSha256:SHA("b"),expectedFlightInstanceId:"leg:flight:a",
    expectedHorizon:"T-6h",expectedSelectedTNativeUtc:native,
    expectedSourcePopulationQueryId:uuid,expectedT24ReceiptSha256:receipt},
   {filePath:second,expectedPacketSha256:digest(files.get(second)!),
    expectedQueryDigestSha256:SHA("b"),expectedFlightInstanceId:"leg:flight:b",
    expectedHorizon:"T-6h",expectedSelectedTNativeUtc:native,
    expectedSourcePopulationQueryId:uuid,expectedT24ReceiptSha256:receipt},
   {filePath:third,expectedPacketSha256:digest(files.get(third)!),
    expectedQueryDigestSha256:SHA("c"),expectedFlightInstanceId:"leg:flight:a",
    expectedHorizon:"T-90m",expectedSelectedTNativeUtc:native,
    expectedSourcePopulationQueryId:uuid,expectedT24ReceiptSha256:receipt}
  ]
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const pins:P5SignedLaterPreDayRegistryPins={
  registryFilePath:registryFile,
  expectedRegistrySha256:digest(registryBytes),
  expectedSourceDayRegistrySha256:digest(sourceBytes),
  expectedManifestSha256:SHA("1"),
  expectedApprovedMainSha:code,expectedRunDayIndex:4,
  expectedReleaseSha256:SHA("2"),expectedRightsSha256:SHA("3")
 };
 const readFrozen=(path:string)=>files.get(path)??Buffer.from("{}");
 const verify=(r=registry,rb=registryBytes,s=source,sb=sourceBytes,
   p=pins)=>
  verifyP5SignedLaterPreDayRegistry(rb,r,sb,s,p,readFrozen);
 return{files,source,sourceBytes,registry,registryBytes,pins,readFrozen,verify};
}
describe("signed per-day multiple later PRE flights, source registry lineage",()=>{
 it("authenticates two separate native flights and T6/T90 without individual GH secrets",()=>{
  const f=fixture(),v=f.verify();
  expect(v.entries).toHaveLength(3);
  expect(v.entries[0].packetSha256).toBe(digest(f.files.get(first)!));
  expect(v.sourceDayRegistrySha256).toBe(f.registry.sourceDayRegistrySha256);
  expect(v.githubChildDispatches).toBe(0);
  const t6=selectP5LaterPreDueRegistryEntries(
   v,"2027-02-10T05:00:00.000Z");
  expect(t6.dueForActualPgReadback).toBe(2);
  expect(t6.selectedForActualPgReadback.map(x=>x.filePath))
   .toEqual([first,second]);
  const t90=selectP5LaterPreDueRegistryEntries(
   v,"2027-02-10T10:00:00.000Z");
  expect(t90.dueForActualPgReadback).toBe(1);
  expect(t90.selectedForActualPgReadback[0].filePath).toBe(third);
 });
 it("honestly censors missed cutoffs; never lets GH clock resurrect a horizon",()=>{
  const f=fixture(),v=f.verify();
  const late=selectP5LaterPreDueRegistryEntries(
   v,"2027-02-10T11:00:00.000Z");
  expect(late.selectedForActualPgReadback).toHaveLength(0);
  expect(late.statuses.every(x=>x.state==="MISSED_OR_TOO_CLOSE_CENSOR"))
   .toBe(true);
  expect(()=>selectP5LaterPreDueRegistryEntries(v,"test time"))
   .toThrow("UNVERIFIED_REGISTRY_OR_REAL_DB_CLOCK");
 });
 it("refuses registry, source registry, and individual packet byte changes",()=>{
  const f=fixture();
  expect(()=>f.verify(f.registry,
   Buffer.concat([f.registryBytes,Buffer.from(" ")])))
   .toThrow("UNSIGNED_REGISTRY_OR_SOURCE_REGISTRY_BYTES");
  expect(()=>f.verify(f.registry,f.registryBytes,
   f.source,Buffer.concat([f.sourceBytes,Buffer.from(" ")])))
   .toThrow("UNSIGNED_REGISTRY_OR_SOURCE_REGISTRY_BYTES");
  const badFile=new Map(f.files);
  badFile.set(first,Buffer.concat([f.files.get(first)!,Buffer.from(" ")]));
  expect(()=>verifyP5SignedLaterPreDayRegistry(
   f.registryBytes,f.registry,f.sourceBytes,f.source,f.pins,
   (p)=>badFile.get(p)!))
   .toThrow("FROZEN_FLIGHT_PACKET_BYTES_NOT_AUTHENTIC");
 });
 it("refuses duplicate same-flight/same-horizon even with distinct filenames",()=>{
  const f=fixture();
  const copy={...f.registry,entries:[
   f.registry.entries[0],{...f.registry.entries[1],
    expectedFlightInstanceId:"leg:flight:a"}]};
  const rb=Buffer.from(JSON.stringify(copy));
  expect(()=>f.verify(copy,rb,f.source,f.sourceBytes,
   {...f.pins,expectedRegistrySha256:digest(rb)}))
   .toThrow("DUPLICATE_CROSS_SOURCE_OR_UNAUTHENTICATED_FLIGHT_ENTRY");
 });
 it("refuses omitted source digest, unknown rights, code, cross-day flight and forged T24 SHA",()=>{
  const f=fixture();
  const variants=[
   {...f.registry,reviewedCodeSha:"d".repeat(40)},
   {...f.registry,runDayIndex:5},
   {...f.registry,entries:[{...f.registry.entries[0],
     expectedQueryDigestSha256:SHA("d")}]},
   {...f.registry,entries:[{...f.registry.entries[0],
     expectedT24ReceiptSha256:SHA("e")}]}
  ];
  for(const r of variants){
   const bytes=Buffer.from(JSON.stringify(r));
   expect(()=>f.verify(r,bytes,f.source,f.sourceBytes,
     {...f.pins,expectedRegistrySha256:digest(bytes)})).toThrow();
  }
 });
 it("makes missing T24 an explicit separate evidence type, never an implied witness",()=>{
  const f=fixture();
  const packet=fakePacket(third,"T-90m",true);
  const buf=Buffer.from(JSON.stringify(packet));
  const e={...f.registry.entries[2],expectedPacketSha256:digest(buf),
   expectedT24ReceiptSha256:undefined};
  const reg={...f.registry,entries:[
   f.registry.entries[0],f.registry.entries[1],e]};
  const bytes=Buffer.from(JSON.stringify(reg));
  const files=new Map(f.files);files.set(third,buf);
  const output=verifyP5SignedLaterPreDayRegistry(
   bytes,reg,f.sourceBytes,f.source,
   {...f.pins,expectedRegistrySha256:digest(bytes)},
   (p)=>files.get(p)!);
  expect(output.entries[2].t24ReceiptSha256).toBeUndefined();
  const forged={...reg,entries:[
   reg.entries[0],reg.entries[1],{...e,
    expectedT24ReceiptSha256:SHA("a")}]};
  const forgedBytes=Buffer.from(JSON.stringify(forged));
  expect(()=>verifyP5SignedLaterPreDayRegistry(
   forgedBytes,forged,f.sourceBytes,f.source,
   {...f.pins,expectedRegistrySha256:digest(forgedBytes)},
   (p)=>files.get(p)!))
   .toThrow("NO_T24_STANDALONE_REQUIRES_EXPLICIT_SEPARATE_AMENDMENT");
 });
 it("bounds selected real-database reviews to four earliest due, never redraws",()=>{
  const f=fixture(),v=f.verify();
  const x=selectP5LaterPreDueRegistryEntries(
   v,"2027-02-10T05:00:00.000Z",1);
  expect(x.selectedForActualPgReadback).toHaveLength(1);
  expect(x.deferredWithinWindowCount).toBe(1);
  expect(x.totalSignedFlightHorizons).toBe(3);
  expect(x.providerCalls).toBe(0);
  expect(()=>selectP5LaterPreDueRegistryEntries(
   v,"2027-02-10T05:00:00.000Z",5))
   .toThrow("UNVERIFIED_REGISTRY_OR_REAL_DB_CLOCK");
 });
});
