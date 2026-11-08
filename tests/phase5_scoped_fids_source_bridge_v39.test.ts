import { describe,it,expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  admitP5ScopedFidsSource,runP5ScopedFidsSource,
  type P5SourceSingleQueryPlan,type P5SourcePorts,
} from "../server/lib/disruption/phase5ScopedFidsSourceBridge_v39";
import { verifyPreparedDailyDraw } from "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";

function fixture():P5SourceSingleQueryPlan {
 const day={
  runDayIndex:1,scheduledStartUtc:new Date("2026-11-09T14:00:00.000Z"),
  frozenDrawSeed:"frozen-phase5-day1",drawType:"NEW_TEMPLATE" as const,
  anchorIcao:"WSSS",
  slotRegions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
  pairAirportSet:null,
  calendarHash:"a".repeat(64),configHash:"b".repeat(64),frameHash:"c".repeat(64),
 };
 const rows=[
  ["HUB","WSSS","ASIA"],["MID_A","OMAA","MIDDLE_EAST"],
  ["MID_B","SKBO","SOUTH_AMERICA"],["REGIONAL","KGPT","NORTH_AMERICA"],
 ].map(([slot,icao,region])=>({
  slot_id:slot,target_region:region,draw_type:"NEW_TEMPLATE",
  selected_icao:icao,frozen_draw_seed:day.frozenDrawSeed,
  selected_at_utc:"2026-11-08T10:00:00.000Z",adaptive_state_hash:
   slot==="REGIONAL"?"d".repeat(64):null,
  probability_vector:slot==="REGIONAL"?
    [{icao:"KGPT",probability:1,drawScore:1}]:null,
  airport_layer_design_probability:slot==="REGIONAL"?1:null,
 }));
 return {
  sourcePartition:{
   schema:"v39.phase5.amendment-c.source-segment-partition.v1",
   windowShape:"4h",segmentIndex:1,partitionIndex:1,
   verifiedProviderMaxRangeMinutes:240,
   reviewedProviderRangeEvidenceSha256:"7".repeat(64)
  },
  day,savedEarlyDrawRows:rows,
  expectedEarlyDrawSha256:verifyPreparedDailyDraw(day,rows).stateHash,
  reviewedReleaseSha256:"e".repeat(64),reviewedProviderRightsSha256:"f".repeat(64),
  openapiSha256:"1".repeat(64),
  independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true,
  providerApiVersion:"ci-verified-schema",fidsProtocolVersion:"phase5-staged-no-provider-v1",
  localFrom:"2026-11-09T22:00",localTo:"2026-11-10T02:00",
  ianaTimezone:"Asia/Singapore",
  acquisition:{
   runDayIndex:1,budgetDayUtc:"2026-11-09",slot:"HUB",
   icao:"WSSS",horizon:"T-24h",providerQueryDirection:"Departure",
   serviceWindowStartUtc:"2026-11-09T14:00:00.000Z",
   serviceWindowEndUtc:"2026-11-09T18:00:00.000Z",
   earliestPlannedCutoffUtc:"2026-11-08T14:00:00.000Z",
   scheduledRequestUtc:"2026-11-08T13:40:00.000Z",
   plannedAirportSelectionUtc:"2026-11-08T11:00:00.000Z",
   maxResponseAndPersistSeconds:120,apiUnitsPerAttempt:2,maxAttempts:1,
   queryKey:"P5-D01-HUB-T24-FIDS-01",
  },
 };
}
function ports(
 opts:{
  clock?:string;
  http?:number;
  unavailable?:boolean;
  persistedAt?:string;
  wrongReceipt?:boolean;
  malformedOriginal?:boolean;
 }={},
){
 const calls={dbClock:0,reserve:0,fetch:0,persist:0};
 const body=JSON.stringify({departures:[],arrivals:[]});
 const sourceTransport:typeof fetch=async()=>{calls.fetch++;
  return new Response(body,{status:opts.http??200,
   headers:{"content-type":"application/json"}});
 };
 const p:P5SourcePorts={
  async readDbClock(){calls.dbClock++;
   return new Date(opts.clock??"2026-11-08T13:41:00.000Z");
  },
  async reservePhysicalBeforeGet(q){calls.reserve++;
   return {queryKey:q.queryKey,runDayIndex:q.runDayIndex,icao:q.icao,
    attemptNumber:1 as const,maxUnits:2 as const,reservationSha256:"9".repeat(64)};
  },
  async commitOriginalAndPopulation(q){calls.persist++;
   const raw=q.sourceQuery.rawPayload as any;
   const original=raw.originalDecodedEntityBodyEvidence;
   return {
    persisted:true as const,reservationSha256:opts.wrongReceipt?
      "8".repeat(64):q.physical.reservationSha256,
    sourcePopulationQueryId:q.sourceQuery.populationQueryId,
    sourceResponseHash:q.sourceQuery.responseHash,
    sourceAvailableAtUtc:opts.persistedAt??"2026-11-08T13:42:00.000Z",
    normalizedRowsPersisted:q.normalizedRows.length,
    originalDecodedBodySha256:original.bodySha256,
    retentionExpiryUtc:q.expectedExpiresAtUtc,
   };
  },
  fetchImpl:sourceTransport,
  sleepImpl:async()=>{},
 };
 return {p,calls};
}
describe("Phase5 single-GET scoped FIDS source bridge, no network, no DB",()=>{
 it("accepts exactly the SECOND exposed 2x2 child but never its inactive one-hour gap",()=>{
  const f=fixture();f.sourcePartition.windowShape="2x2h";
  f.sourcePartition.segmentIndex=2;
  f.acquisition.serviceWindowStartUtc="2026-11-09T17:00:00.000Z";
  f.acquisition.serviceWindowEndUtc="2026-11-09T19:00:00.000Z";
  expect(admitP5ScopedFidsSource(f,new Date("2026-11-08T13:41:00.000Z"))
   .restCategory).toBe("fids_base");
  f.acquisition.serviceWindowStartUtc="2026-11-09T16:00:00.000Z";
  f.acquisition.serviceWindowEndUtc="2026-11-09T17:00:00.000Z";
  expect(()=>admitP5ScopedFidsSource(f,new Date("2026-11-08T13:41:00.000Z")))
   .toThrow("SOURCE_NOT_EXACT_FROZEN_EXPOSED_PARTITION");
 });
 it("classifies an up-to-6h last 2h provider-range partition as FIDS_SPLIT",async()=>{
  const f=fixture(),o=ports();
  f.sourcePartition.windowShape="up-to-6h";
  f.sourcePartition.partitionIndex=2;
  f.acquisition.serviceWindowStartUtc="2026-11-09T18:00:00.000Z";
  f.acquisition.serviceWindowEndUtc="2026-11-09T20:00:00.000Z";
  expect(admitP5ScopedFidsSource(f,new Date("2026-11-08T13:41:00.000Z"))
   .restCategory).toBe("fids_split");
  const result=await runP5ScopedFidsSource(f,o.p);
  expect(result.status).toBe("SOURCE_ORIGINAL_BOUND_TIMELY_NOT_FLIGHT_PRE");
  expect(o.calls).toMatchObject({reserve:1,fetch:1,persist:1});
 });
 it("never accepts partial or undocumented range overlaps, changed shape or guessed provider limit",async()=>{
  const f=fixture();
  f.sourcePartition.windowShape="up-to-6h";
  f.sourcePartition.partitionIndex=2;
  f.acquisition.serviceWindowStartUtc="2026-11-09T18:00:00.000Z";
  f.acquisition.serviceWindowEndUtc="2026-11-09T20:00:00.000Z";
  const bad={...f,sourcePartition:{...f.sourcePartition,verifiedProviderMaxRangeMinutes:300}};
  expect(()=>admitP5ScopedFidsSource(bad,new Date("2026-11-08T13:41:00.000Z")))
   .toThrow("SOURCE_NOT_EXACT_FROZEN_EXPOSED_PARTITION");
  f.sourcePartition.reviewedProviderRangeEvidenceSha256="";
  expect(()=>admitP5ScopedFidsSource(f,new Date("2026-11-08T13:41:00.000Z")))
   .toThrow("UNVERIFIED_AMENDMENT_C_SOURCE_PARTITION");
 });
 it("refuses overlong first partition, gap intersection and changed segment index before any HTTP",async()=>{
  const f=fixture(),o=ports();
  f.sourcePartition.windowShape="2x2h";f.sourcePartition.segmentIndex=1;
  await expect(runP5ScopedFidsSource(f,o.p))
   .rejects.toThrow("SOURCE_NOT_EXACT_FROZEN_EXPOSED_PARTITION");
  expect(o.calls.reserve).toBe(0);expect(o.calls.fetch).toBe(0);
  f.acquisition.serviceWindowEndUtc="2026-11-09T16:00:00.000Z";
  expect(admitP5ScopedFidsSource(f,new Date("2026-11-08T13:41:00.000Z"))
   .restCategory).toBe("fids_base");
  f.sourcePartition.segmentIndex=3;
  expect(()=>admitP5ScopedFidsSource(f,new Date("2026-11-08T13:41:00.000Z")))
   .toThrow("SOURCE_SEGMENT_NOT_IN_FROZEN_EXPOSURE");
 });
 it("refuses missing scoped ports before source admission",async()=>{
  await expect(runP5ScopedFidsSource(fixture(),{} as any))
   .rejects.toThrow("NO_SCOPED_PORTS");
 });
 it("refuses false rights approval before reserving or fetching anything",async()=>{
  const f=fixture(),o=ports();
  f.independentlyApprovedSourceAndRetention=false as true;
  await expect(runP5ScopedFidsSource(f,o.p))
    .rejects.toThrow("RELEASE_OR_RIGHTS_NOT_PINNED");
  expect(o.calls.reserve).toBe(0);expect(o.calls.fetch).toBe(0);
 });
 it("refuses unselected airport and wrong immutable four-draw hash before any GET",async()=>{
  const a=fixture(),o=ports();
  a.acquisition.icao="YSSY";
  await expect(runP5ScopedFidsSource(a,o.p))
    .rejects.toThrow("AIRPORT_SELECTION_NOT_MATCHED");
  expect(o.calls.fetch).toBe(0);
  const b=fixture();b.expectedEarlyDrawSha256="0".repeat(64);
  await expect(runP5ScopedFidsSource(b,o.p))
    .rejects.toThrow("EARLY_DRAW_SHA_MISMATCH");
  expect(o.calls.reserve).toBe(0);
 });
 it("refuses wrong source direction, unpriced retries or late DB clock",async()=>{
  const a=fixture(),o=ports();
  a.acquisition.maxAttempts=3;
  await expect(runP5ScopedFidsSource(a,o.p))
    .rejects.toThrow("UNKNOWN_ONE_ATTEMPT_PRICING");
  const b=fixture();b.acquisition.providerQueryDirection="Arrival" as "Departure";
  await expect(runP5ScopedFidsSource(b,o.p))
    .rejects.toThrow("WRONG_DAY_ROLE_OR_SOURCE_FRAME");
  const c=fixture(),late=ports({clock:"2026-11-08T13:59:50.000Z"});
  await expect(runP5ScopedFidsSource(c,late.p))
    .rejects.toThrow("DB_CLOCK_OUTSIDE_PROSPECTIVE_WINDOW");
  expect(late.calls.reserve).toBe(0);expect(late.calls.fetch).toBe(0);
 });
 it("proves explicit scoped budget reservation BEFORE one provider attempt",async()=>{
  const f=fixture(),o=ports();
  const result=await runP5ScopedFidsSource(f,o.p);
  expect(result.status).toBe("SOURCE_ORIGINAL_BOUND_TIMELY_NOT_FLIGHT_PRE");
  expect(result.physicalAttemptsReserved).toBe(1);
  expect(result.actualPreCertified).toBe(false);
  expect(result.providerOriginalBound).toBe(true);
  expect(o.calls).toMatchObject({reserve:1,fetch:1,persist:1});
 });
 it("never performs a second paid physical GET after retryable 503",async()=>{
  const f=fixture(),o=ports({http:503});
  const result=await runP5ScopedFidsSource(f,o.p);
  expect(result.status).toBe("SOURCE_UNOBSERVED_OR_UNPERSISTED");
  expect(result.actualPreCertified).toBe(false);
  expect(o.calls.reserve).toBe(1);expect(o.calls.fetch).toBe(1);
  expect(o.calls.persist).toBe(0);
 });
 it("propagates V0079 local DB refusal instead of calling it a provider coverage miss",async()=>{
  const f=fixture(),o=ports();
  o.p.reservePhysicalBeforeGet=async()=>{
   throw Error("REFUSED_PHASE5_V0079_SCOPED_DB_FROZEN_QUERY_OR_SELECTION_CHANGED");
  };
  await expect(runP5ScopedFidsSource(f,o.p))
   .rejects.toThrow("REFUSED_PHASE5_V0079_SCOPED_DB_FROZEN_QUERY_OR_SELECTION_CHANGED");
  expect(o.calls.fetch).toBe(0);
  expect(o.calls.persist).toBe(0);
 });

 it("refuses forged V0077 commit receipt even after physical fetch",async()=>{
  const f=fixture(),o=ports({wrongReceipt:true});
  await expect(runP5ScopedFidsSource(f,o.p))
    .rejects.toThrow("ATOMIC_ORIGINAL_DB_READBACK_MISMATCH");
  expect(o.calls.reserve).toBe(1);expect(o.calls.fetch).toBe(1);
  expect(o.calls.persist).toBe(1);
 });
 it("marks source physically committed after planned cutoff as NOT PRE",async()=>{
  const f=fixture(),o=ports({persistedAt:"2026-11-08T14:01:00.000Z"});
  const r=await runP5ScopedFidsSource(f,o.p);
  expect(r.status).toBe("BOUND_SOURCE_LATE_NOT_PRE");
  expect(r.providerOriginalBound).toBe(true);
  expect(r.actualPreCertified).toBe(false);
 });
 it("requires raw decoded provider body, not just reconstructed normalized records",()=>{
  const c=readFileSync("server/lib/disruption/phase5ScopedFidsSourceBridge_v39.ts","utf8");
  expect(c).toContain("originalDecodedEntityBodyPreserved!==true");
  expect(c).toContain("SOURCE_ORIGINAL_BOUND_TIMELY_NOT_FLIGHT_PRE");
  expect(c).toContain("budgetOwner:{");
  expect(c).toContain("commitOriginalAndPopulation");
  expect(c).not.toContain("persistFidsObservation(");
  expect(c).not.toContain("import { fidsRestLedger");
  expect(c).not.toContain("persistFidsObservation(sourceQuery");
 });
 it("only binds source timing, never pretends provider-native actual-only wheels-off is certified",()=>{
  const f=fixture();
  const r=admitP5ScopedFidsSource(f,new Date("2026-11-08T13:41:00Z"));
  expect(r.selectedIcao).toBe("WSSS");
  expect(r.earliestPlannedCutoffMs).toBe(Date.parse(f.acquisition.earliestPlannedCutoffUtc));
 });
});
