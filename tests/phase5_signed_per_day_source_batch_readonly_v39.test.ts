import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 reviewP5SignedSourceDayBatchAgainstActualQueue,
 type P5SignedSourceBatchRegistry
} from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import {classifyP5SignedUpcomingSourceQueue,
 type P5SourceQueueMetadataRow}
 from "../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
const h=(c:string)=>c.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const base=Date.parse("2027-02-02T12:00:00.000Z");
const iso=(t:number)=>new Date(t).toISOString();
const scope={
 expectedManifestSha256:h("a"),expectedReleaseSha256:h("b"),
 expectedRightsSha256:h("c"),expectedProviderContractSha256:h("d"),
 expectedSourceRole:P5_STAGE28_GROUPS.source
};
function row(key:"e"|"f",update:Partial<P5SourceQueueMetadataRow>={}):
 P5SourceQueueMetadataRow{
 const second=key==="f";
 return {
  query_digest:h(key),manifest_sha256:h("a"),run_day_index:1,
  query_key:second?"P5_D01_YSSY_T24_PART01":"P5_D01_WSSS_T24_PART01",
  slot_id:second?"MID_A":"HUB",horizon:"T-24h",
  airport_icao:second?"YSSY":"WSSS",
  state:"PREPARED",github_run_id:"00000",early_draw_sha256:h("9"),
  rights_review_sha256:h("c"),reviewed_release_sha256:h("b"),
  provider_contract_sha256:h("d"),
  planned_dispatch_utc:iso(base),hard_latest_dispatch_utc:iso(base+60_000),
  prediction_cutoff_utc:iso(base+600_000),
  api_units_per_attempt:2,max_physical_attempts:1,
  existing_attempt_sha256:null,existing_prearm_sha256:null,
  existing_original_population_query_id:null,...update
 };
}
function packet(key:"e"|"f",day=1){
 const second=key==="f";
 return {
  schema:"v39.phase5.github-source-one-query-template.v2",
  manifestSha256:h("a"),queryDigestSha256:h(key),
  plan:{
   acquisition:{
    runDayIndex:day,slot:second?"MID_A":"HUB",horizon:"T-24h",
    icao:second?"YSSY":"WSSS",
    queryKey:second?"P5_D01_YSSY_T24_PART01":"P5_D01_WSSS_T24_PART01",
    scheduledRequestUtc:iso(base),apiUnitsPerAttempt:2,
    maxAttempts:1,providerQueryDirection:"Departure"
   },
   day:{scheduledStartUtc:iso(base+3600000)},
   expectedEarlyDrawSha256:h("9"),reviewedReleaseSha256:h("b"),
   reviewedProviderRightsSha256:h("c"),openapiSha256:h("d"),
   independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true
  }
 };
}
function fixture(
 rows:P5SourceQueueMetadataRow[]=[row("e"),row("f")],
 now=base-3600_000
){
 const files=new Map<string,Buffer>();
 const entries=(["e","f"] as const).map(key=>{
  const filePath="data-collection/phase5/frozen/prospective_day01_"+key+".json";
  const content=Buffer.from(JSON.stringify(packet(key)));
  files.set(filePath,content);
  return{filePath,expectedPacketSha256:sha(content),
   expectedQueryDigestSha256:h(key)};
 });
 const registry:P5SignedSourceBatchRegistry={
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:h("a"),runDayIndex:1,entries
 };
 const bytes=Buffer.from(JSON.stringify(registry));
 const pins={
  registryFilePath:"data-collection/phase5/frozen/prospective_day01_batch.json",
  expectedRegistrySha256:sha(bytes),expectedManifestSha256:h("a"),
  expectedReleaseSha256:h("b"),expectedRightsSha256:h("c"),
  expectedProviderContractSha256:h("d"),expectedRunDayIndex:1
 };
 const scan=classifyP5SignedUpcomingSourceQueue(rows,scope,iso(now));
 const read=(path:string):Buffer=>{
  const value=files.get(path);
  if(!value)throw Error("FROZEN_FILE_NOT_PRESENT");
  return value;
 };
 return {files,registry,bytes,pins,scan,read};
}
const run=(f:ReturnType<typeof fixture>)=>
 reviewP5SignedSourceDayBatchAgainstActualQueue(
  f.scan,f.bytes,f.registry,f.pins,f.read);
const rehash=(f:ReturnType<typeof fixture>)=>{
 f.bytes=Buffer.from(JSON.stringify(f.registry));
 f.pins.expectedRegistrySha256=sha(f.bytes);
};
describe("Phase5 exact per-day signed source registry -> actual DB queue; no dispatch",()=>{
 it("joins two distinct signed packets and never allocates provider/Alert/DB writes",()=>{
  const x=run(fixture());
  expect(x.inspectedQueryCount).toBe(2);
  expect(x.dueForIndependentReviewCount).toBe(2);
  expect(x.missedOrLateCount).toBe(0);
  expect(x.handoffs.map(z=>z.airportIcao)).toEqual(["WSSS","YSSY"]);
  expect(x.providerCalls).toBe(0);
  expect(x.githubChildDispatchCount).toBe(0);
  expect(x.paidPhase6GoGranted).toBe(false);
  expect(x.databaseWrites).toBe(0);
  expect(x.independentSevenRestUtcAndAlertBudgetsStillRequired).toBe(true);
 });
 it("retains an already reserved query as missing/owned while another is due",()=>{
  const f=fixture([row("e",{existing_attempt_sha256:h("1")}),row("f")]);
  const r=run(f);
  expect(r.alreadyPrearmedReservedCount).toBe(1);
  expect(r.dueForIndependentReviewCount).toBe(1);
  expect(r.handoffs[0].status).toBe(
   "SIGNED_QUERY_ALREADY_PREARMED_OR_RESERVED_NO_REDISPATCH");
 });
 it("keeps STOP and missed cutoff as distinct counted outcomes",()=>{
  const f=fixture([row("e",{state:"STOPPED"}),row("f")],base+2*60000);
  const r=run(f);
  expect(r.stoppedCount).toBe(1);
  expect(r.missedOrLateCount).toBe(1);
  expect(r.githubChildDispatchCount).toBe(0);
 });
 it("allows prospective not-yet-in-lookahead day without false invalidation",()=>{
  const r=run(fixture([],base-4*3600000));
  expect(r.inspectedQueryCount).toBe(2);
  expect(r.dbMissingHoldCount).toBe(0);
  expect(r.handoffs.every(x=>x.status===
   "SIGNED_QUERY_NOT_YET_IN_DB_QUEUE_LOOKAHEAD")).toBe(true);
 });
 it("rejects missing actual rows in lookahead, but preserves their count",()=>{
  const r=run(fixture([row("e")]));
  expect(r.dbMissingHoldCount).toBe(1);
  expect(r.dueForIndependentReviewCount).toBe(1);
 });
 it("refuses changed registry bytes and wrong future-day scope",()=>{
  const a=fixture();a.bytes=Buffer.from(a.bytes.toString()+" ");
  expect(()=>run(a)).toThrow("UNSIGNED_REGISTRY_BYTES_OR_UNREVIEWED_QUEUE");
  const b=fixture();b.registry.runDayIndex=2;rehash(b);
  expect(()=>run(b)).toThrow("REGISTRY_DAY_SCOPE_COUNT_OR_MANIFEST_NOT_APPROVED");
 });
 it("rejects duplicate query digest, duplicate file and self-reference",()=>{
  const a=fixture();
  a.registry.entries[1].expectedQueryDigestSha256=h("e");rehash(a);
  expect(()=>run(a)).toThrow("DUPLICATED_OR_UNBOUNDED_SIGNED_QUERY_FILE");
  const b=fixture();
  b.registry.entries[1].filePath=b.registry.entries[0].filePath;rehash(b);
  expect(()=>run(b)).toThrow("DUPLICATED_OR_UNBOUNDED_SIGNED_QUERY_FILE");
  const c=fixture();
  c.registry.entries[0].filePath=c.pins.registryFilePath;rehash(c);
  expect(()=>run(c)).toThrow("DUPLICATED_OR_UNBOUNDED_SIGNED_QUERY_FILE");
 });
 it("refuses forged packet bytes, cross-day packet and wrong airport",()=>{
  const a=fixture();const key=a.registry.entries[0].filePath;
  a.files.set(key,Buffer.from(JSON.stringify(packet("f"))));
  expect(()=>run(a)).toThrow("UNSIGNED_FILE_OR_QUEUE_NOT_AUTHENTICATED");
  const b=fixture();const pkt=Buffer.from(JSON.stringify(packet("e",2)));
  b.files.set(b.registry.entries[0].filePath,pkt);
  b.registry.entries[0].expectedPacketSha256=sha(pkt);rehash(b);
  expect(()=>run(b)).toThrow("CROSS_DAY_OR_CROSS_QUERY_SIGNED_PACKET");
  const c=fixture([row("e",{airport_icao:"KGPT"}),row("f")]);
  expect(()=>run(c)).toThrow("ACTUAL_DB_SOURCE_ROW_DRIFT");
 });
 it("refuses 97 entries rather than silently dropping budget-day queries",()=>{
  const f=fixture();
  f.registry.entries=Array.from({length:97},(_,i)=>({
   filePath:"data-collection/phase5/frozen/entry_"+i.toString().padStart(4,"0")+".json",
   expectedPacketSha256:h("a"),expectedQueryDigestSha256:h("b")
  }));
  rehash(f);
  expect(()=>run(f)).toThrow("REGISTRY_DAY_SCOPE_COUNT_OR_MANIFEST_NOT_APPROVED");
 });
});
