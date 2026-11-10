import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitP5LaterRegistryChildEnv,approveP5SignedLaterPreChild}
 from "../scripts/v39_phase5_later_pre_registry_child_v39";
import type {P5SignedLaterPreDayRegistry}
 from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry}
 from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";

const h=(v:string)=>v.repeat(64);
const code="e".repeat(40);
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const registryPath="data-collection/phase5/frozen/later_registry_day04.json";
const sourcePath="data-collection/phase5/frozen/source_registry_day04.json";
const flightPath="data-collection/phase5/frozen/later_native_flight_a.json";
const flightPathB="data-collection/phase5/frozen/later_native_flight_b.json";
const uuid="a23e4567-e89b-42d3-a456-426614174000";
function fixture(){
 const source:P5SignedSourceBatchRegistry={
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:h("1"),runDayIndex:4,
  entries:[{filePath:"data-collection/phase5/frozen/source_query_native_a.json",
    expectedPacketSha256:h("5"),expectedQueryDigestSha256:h("c")}]
 };
 const sourceBytes=Buffer.from(JSON.stringify(source));
 const packet=(id:string)=>({
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,
  independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:{
   manifestSha256:h("1"),runDayIndex:4,
   expectedReviewedReleaseSha256:h("2"),
   expectedReviewedSourceRightsSha256:h("3"),
   queryDigestSha256:h("c"),
   flightInstanceId:id,horizon:"T-6h",
   selectedTNativeUtc:"2027-02-10T12:00:00.000Z",
   expectedSourcePopulationQueryId:uuid,
   identityEvidenceTier:"PROVIDER_NATIVE_OPERATING_LEG",
   externalNativeTPhysicalLegAndSourceUseReviewed:true,
   reviewedT24WitnessReceipt:{receiptSha256:h("a")}
  }
 });
 const files=new Map([
  [flightPath,Buffer.from(JSON.stringify(packet("leg:fixture:a")))],
  [flightPathB,Buffer.from(JSON.stringify(packet("leg:fixture:b")))]
 ]);
 const registry:P5SignedLaterPreDayRegistry={
  schema:"v39.phase5.signed-later-pre-day-registry.v1",
  manifestSha256:h("1"),reviewedCodeSha:code,
  sourceDayRegistryFilePath:sourcePath,
  sourceDayRegistrySha256:digest(sourceBytes),
  runDayIndex:4,shardIndex:1,
  entries:[flightPath,flightPathB].map((path,i)=>({
   filePath:path,expectedPacketSha256:digest(files.get(path)!),
   expectedQueryDigestSha256:h("c"),
   expectedFlightInstanceId:i===0?"leg:fixture:a":"leg:fixture:b",
   expectedHorizon:"T-6h",
   expectedSelectedTNativeUtc:"2027-02-10T12:00:00.000Z",
   expectedSourcePopulationQueryId:uuid,
   expectedT24ReceiptSha256:h("a")
  }))
 };
 const registryBytes=Buffer.from(JSON.stringify(registry));
 const env={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  V39_P5_LATER_PRE_APPROVED_CODE_SHA:code,
  P5_LATER_PRE_CONFIRM:"ONE_SIGNED_WITNESSED_T6_OR_T90_PRE_NO_PROVIDER",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  AERODATABOX_WEBHOOK_SECRET:"",
  V39_P5_LATER_PRE_OWNER_APPROVED:"1",
  V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  V39_P5_LATER_PRE_DAY_REGISTRY_SHA256:digest(registryBytes),
  V39_P5_SOURCE_BATCH_REGISTRY_SHA256:digest(sourceBytes),
  V39_P5_MANIFEST_SHA256:h("1"),V39_P5_RELEASE_SHA256:h("2"),
  V39_P5_RIGHTS_SHA256:h("3"),P5_LATER_PRE_DAY_INDEX:"4",
  V39_P5_LATER_PRE_SIGNED_PACKET_SHA256:h("f"),
  V39_P5_LATER_PRE_T24_RECEIPT_SHA256:h("e"),
  V39_P5_QUERY_DIGEST:h("d")
 } as NodeJS.ProcessEnv;
 const check=(path=flightPath,
  e=env,r=registry,rb=registryBytes,s=source,sb=sourceBytes)=>
  approveP5SignedLaterPreChild(e,path,registryPath,rb,r,sb,s,
    (p)=>files.get(p)!);
 return{registry,registryBytes,source,sourceBytes,env,files,check};
}
describe("signed later PRE day registry actual child admission, no provider",()=>{
 it("derives two distinct correct flight hashes from one signed registry",()=>{
  const f=fixture();
  expect(admitP5LaterRegistryChildEnv(f.env)).toBe(4);
  const a=f.check(flightPath),b=f.check(flightPathB);
  expect(a.delegatedEnv.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256)
   .toBe(digest(f.files.get(flightPath)!));
  expect(b.delegatedEnv.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256)
   .toBe(digest(f.files.get(flightPathB)!));
  expect(a.packetSha256).not.toBe(b.packetSha256);
  expect(a.delegatedEnv.V39_P5_QUERY_DIGEST).toBe(h("c"));
  expect(a.delegatedEnv.V39_P5_LATER_PRE_T24_RECEIPT_SHA256).toBe(h("a"));
  expect(a.dynamicPinsFromIndependentRegistry).toBe(true);
  expect(a.providerCalls).toBe(0);
  expect(a.databaseWritesByAdmission).toBe(0);
 });
 it("fails closed when paid GO, source rights, registry signatures or role isolation absent",()=>{
  const f=fixture();
  for(const change of [
   {GITHUB_EVENT_NAME:"schedule"},
   {GITHUB_REF:"refs/pull/xxx"},
   {V39_PHASE5_FREEZE_SIGNED:"0"},
   {V39_PHASE6_PROCESS_ARMED:"0"},
   {V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"},
   {V39_P5_LATER_PRE_DAY_REGISTRY_OWNER_APPROVED:"0"},
   {V39_P5_SOURCE_BATCH_REGISTRY_SHA256:""},
   {P5_LATER_PRE_DAY_INDEX:"32"},
   {P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"cross-privilege"},
   {AERODATABOX_API_KEY:"never"}
  ])expect(()=>f.check(flightPath,{...f.env,...change}))
   .toThrow(/^Error: REFUSED_P5_LATER_REGISTRY_CHILD_/);
 });
 it("refuses a packet not in the signed registry, changed day, source or packet",()=>{
  const f=fixture();
  expect(()=>f.check("data-collection/phase5/frozen/unknown_flight.json"))
   .toThrow("SELECTED_PACKET_NOT_IN_INDEPENDENTLY_SIGNED_DAY_REGISTRY");
  expect(()=>f.check(flightPath,{...f.env,P5_LATER_PRE_DAY_INDEX:"5"}))
   .toThrow("REGISTRY_RUN_DAY_CODE_MANIFEST_OR_SHARD_NOT_AUTHORIZED");
  expect(()=>f.check(flightPath,{...f.env,
   V39_P5_SOURCE_BATCH_REGISTRY_SHA256:h("a")}))
   .toThrow("UNSIGNED_REGISTRY_OR_SOURCE_REGISTRY_BYTES");
  const packet=Buffer.concat([f.files.get(flightPath)!,Buffer.from(" ")]);
  f.files.set(flightPath,packet);
  expect(()=>f.check()).toThrow("FROZEN_FLIGHT_PACKET_BYTES_NOT_AUTHENTIC");
 });
});
