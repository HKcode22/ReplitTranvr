/**
 * Real Phase5 Stage6 -> Stage8 Amendment C segmented source candidate proof.
 * Pure fixtures; no provider HTTP, no DB, no current source range entitlement.
 */
import {describe,it,expect} from "vitest";
import {verifyPreparedDailyDraw} from
 "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";
import {
 materializeP5DynamicDaySourceGrid,
 P5_DYNAMIC_DAY_SEGMENTED_MULTI_GRID_SCHEMA,
 type P5DynamicDayGridInput,
 type P5DayReviewedSegmentedSource,
} from "../server/lib/disruption/phase5DynamicDaySourceGrid_v39";
import {planStage8P5DayV0079Proposals} from
 "../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39";
import type {P5CommittedDayReadonlyResult} from
 "../server/lib/disruption/phase5CommittedDayGridReadonly_v39";

const BASE=Date.parse("2026-11-09T14:00:00.000Z");
const H=3_600_000,M=60_000;
const iso=(n:number)=>new Date(n).toISOString();
const sha=(c:string)=>c.repeat(64);
const airports=[
 ["HUB","WSSS","ASIA","Asia/Singapore"],
 ["MID_A","OMAA","MIDDLE_EAST","Asia/Dubai"],
 ["MID_B","SKBO","SOUTH_AMERICA","America/Bogota"],
 ["REGIONAL","KGPT","NORTH_AMERICA","America/Chicago"]
] as const;
const horizons=[
 ["T-24h",24*H,"T24"],
 ["T-6h",6*H,"T6"],
 ["T-90m",90*M,"T90"]
] as const;
const shapes=[
 ["2x2h",120,72,0],
 ["up-to-6h",240,108,36],
 ["4h",240,72,0]
] as const;

function construct(shape:P5DayReviewedSegmentedSource["windowShape"],rangeMin:number){
 const day={
  runDayIndex:1,scheduledStartUtc:new Date(BASE),
  frozenDrawSeed:"phase5-actual-selected-segmented",
  drawType:"NEW_TEMPLATE" as const,anchorIcao:"WSSS",
  slotRegions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
    MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
  pairAirportSet:null,calendarHash:sha("a"),configHash:sha("b"),
  frameHash:sha("c")
 };
 const rows=airports.map(([slot,icao,region])=>({
  slot_id:slot,target_region:region,draw_type:day.drawType,
  selected_icao:icao,frozen_draw_seed:day.frozenDrawSeed,
  selected_at_utc:"2026-11-08T10:00:00.000Z",
  adaptive_state_hash:slot==="REGIONAL"?sha("d"):null,
  probability_vector:slot==="REGIONAL"?
   [{icao:"KGPT",probability:1,drawScore:1}]:null,
  airport_layer_design_probability:slot==="REGIONAL"?1:null
 }));
 const groups=shape==="2x2h"?[[0,2],[3,5]]:
  [[0,shape==="4h"?4:6]];
 const parts:{seg:number;part:number;from:number;to:number}[]=[];
 for(let seg=0;seg<groups.length;seg++){
  let i=0; const [a,b]=groups[seg];
  for(let t=BASE+a*H;t<BASE+b*H;t+=rangeMin*M)
   parts.push({seg:seg+1,part:++i,from:t,
     to:Math.min(t+rangeMin*M,BASE+b*H)});
 }
 const templates:P5DynamicDayGridInput["templates"]=[];
 for(const [slot] of airports)for(const [horizon,offset,label] of horizons){
  for(const part of parts){
   // A hypothetical 45m refresh / 60m staleness, conservatively allowing
   // 2m PRE commit + 60s persistence. All partition cutoffs are covered.
   let n=0;
   for(let t=part.from-offset-3*M;t<part.to-offset;t+=45*M){
    const cutoff=t+6*M;
    if(cutoff>=part.to-offset)break;
    templates.push({
     runDayIndex:1,budgetDayUtc:"2026-11-09",
     physicalChargeDayUtc:iso(t).slice(0,10),
     slot,horizon,providerQueryDirection:"Departure",
     serviceWindowStartUtc:iso(part.from),
     serviceWindowEndUtc:iso(part.to),
     earliestPlannedCutoffUtc:iso(cutoff),
     scheduledRequestUtc:iso(t),queryKey:
       ["p5day1",slot,label,"s"+part.seg,"p"+part.part,"r"+n++].join("_"),
     maxResponseAndPersistSeconds:60,apiUnitsPerAttempt:2,maxAttempts:1
    });
   }
  }
 }
 const input:P5DynamicDayGridInput={
  schema:P5_DYNAMIC_DAY_SEGMENTED_MULTI_GRID_SCHEMA,
  reviewedSegmentedSource:{
    windowShape:shape,verifiedProviderMaxRangeMinutes:rangeMin,
    reviewedProviderRangeEvidenceSha256:sha("e")
  },
  reviewedRefreshTiming:{
   reviewed31DayCoverageGridSha256:sha("f"),
   maxPopulationStalenessSeconds:3600,maxSchedulerSlipSeconds:0,
   minimumPreCommitMarginSeconds:120,
   verifiedProviderMaxFidsWindowMinutes:rangeMin
  },
  reviewedCalendarSha256:sha("a"),
  reviewedConfigSha256:sha("b"),reviewedFrameSha256:sha("c"),
  providerContractSha256:sha("1"),day,
  committedEarlyDrawRows:rows,
  expectedCommittedEarlyDrawSha256:
    verifyPreparedDailyDraw(day,rows).stateHash,templates
 };
 return {input,parts};
}
function proposals(p:P5DynamicDayGridInput){
 const candidate=materializeP5DynamicDaySourceGrid(p);
 const stage7:P5CommittedDayReadonlyResult={
  schema:"v39.phase5.db-readback-day-grid.v1",
  status:"SAVED_SOURCE_DAY_READ_ONLY_CANDIDATES_NOT_RELEASED",
  restrictedReaderRoleVerified:true,databaseReadOnlySnapshot:true,
  dbClockAtReadUtc:"2026-11-08T10:01:00.000Z",
  databaseWrites:0,providerCalls:0,
  selectedDayCandidateGrid:candidate,
  sourceResponseCaptured:false,flightLevelPreCertified:false,
  accountRightsCertified:false,phase5FreezePassed:false,phase6Go:false
 };
 const chargeDayBudgets=candidate.actualChargeDayUtcCounts.map(d=>({
  chargeDayUtc:d.day,dailyApiCeiling:1900,
  otherCategoriesReserved:50,existingSourceReserved:0
 }));
 const {day,committedEarlyDrawRows}=p;
 return planStage8P5DayV0079Proposals({
  stage7,day,savedEarlyDrawRows:committedEarlyDrawRows,
  manifestSha256:sha("2"),calendarSha256:sha("a"),
  configSha256:sha("b"),frameSha256:sha("c"),
  providerContractSha256:sha("1"),
  reviewedReleaseSha256:sha("3"),rightsReviewSha256:sha("4"),
  localFrames:airports.map(([slot,icao,,ianaTimezone])=>({
   slot,icao,ianaTimezone,providerApiVersion:"1.15.4",
   fidsProtocolVersion:"v39"
  })),chargeDayBudgets,cycleUnitsAvailable:10000
 });
}
describe("Amendment C Stage6/8 exact prospective segmented day-source grid",()=>{
 for(const [shape,range,expected,split] of shapes){
  it(`enumerates ${shape}, correct BASE/SPLIT digest bindings and no inactive gap`,()=>{
   const {input,parts}=construct(shape,range);
   const v=materializeP5DynamicDaySourceGrid(input);
   expect(v.status).toBe(
     "DYNAMIC_SEGMENTED_MULTI_REFRESH_CANDIDATES_NOT_RELEASED");
   expect(v.acquisitionCount).toBe(expected);
   expect(v.authorizesPaidGet).toBe(false);
   expect(v.sourcePartitionPins).toHaveLength(expected);
   expect(v.sourcePartitionPins?.some(x=>x.segmentIndex===2))
    .toBe(shape==="2x2h");
   expect(v.sourcePartitionPins?.every(pin=>parts.some(p=>
     pin.serviceWindowStartUtc===iso(p.from)&&
     pin.serviceWindowEndUtc===iso(p.to)&&
     pin.segmentIndex===p.seg&&pin.partitionIndex===p.part)))
    .toBe(true);
   if(shape==="2x2h")expect(v.acquisitions.every(q=>
     !(Date.parse(q.serviceWindowStartUtc)<BASE+3*H &&
       Date.parse(q.serviceWindowEndUtc)>BASE+2*H))).toBe(true);
   const ready=proposals(input);
   expect(ready.sourceQueryCount).toBe(expected);
   expect(ready.sourcePartitionPins).toHaveLength(expected);
   expect(ready.sourcePartitionPins?.filter(x=>
     x.restCategory==="FIDS_SPLIT_UNITS")).toHaveLength(split);
   expect(ready.sourcePartitionPins?.every(x=>
     ready.queries.some(q=>q.query_digest===x.queryDigest &&
       q.query_key===x.queryKey))).toBe(true);
   expect(ready.phase6Go).toBe(false);
  });
 }
 it("rejects an attempted query through 2x2 inactive gap",()=>{
  const x=construct("2x2h",120).input;
  const q=x.templates.find(q=>q.serviceWindowStartUtc===iso(BASE+3*H))!;
  q.serviceWindowStartUtc=iso(BASE+2*H);
  expect(()=>materializeP5DynamicDaySourceGrid(x))
   .toThrow("SOURCE_NOT_EXACT_AMENDMENT_C_PARTITION");
 });
 it("rejects a missing second child source refresh and missing full partition",()=>{
  const x=construct("2x2h",120).input;
  x.templates=x.templates.filter(q=>q.serviceWindowStartUtc!==iso(BASE+3*H));
  expect(()=>materializeP5DynamicDaySourceGrid(x))
   .toThrow("MISSING_MULTI_REFRESH_HORIZON_PARTITION");
 });
 it("rejects an unverified provider-range pin or altered range",()=>{
  const x=construct("up-to-6h",240).input;
  x.reviewedSegmentedSource!.reviewedProviderRangeEvidenceSha256="";
  expect(()=>materializeP5DynamicDaySourceGrid(x))
   .toThrow("UNVERIFIED_AMENDMENT_C_SEGMENTED_SOURCE");
  const y=construct("up-to-6h",240).input;
  y.reviewedSegmentedSource!.verifiedProviderMaxRangeMinutes=360;
  expect(()=>materializeP5DynamicDaySourceGrid(y))
   .toThrow("UNVERIFIED_MULTI_REFRESH_TIMING_CONTRACT");
 });
 it("refuses a 6h whole-window GET when only 4h provider range reviewed",()=>{
  const x=construct("up-to-6h",240).input;
  x.templates[0].serviceWindowEndUtc=iso(BASE+6*H);
  expect(()=>materializeP5DynamicDaySourceGrid(x))
   .toThrow("SOURCE_NOT_EXACT_AMENDMENT_C_PARTITION");
 });
 it("rejects gaps in 2x2 child coverage after removing a mid-refresh",()=>{
  const x=construct("2x2h",120).input;
  const q=x.templates.find(q=>q.slot==="HUB"&&q.horizon==="T-24h"&&
    q.serviceWindowStartUtc===iso(BASE+3*H))!;
  x.templates=x.templates.filter(z=>z!==q);
  expect(()=>materializeP5DynamicDaySourceGrid(x))
   .toThrow("GAP_IN_ACTUAL_DYNAMIC_DAY_FLIGHT_CUTOFF_COVERAGE");
 });
});
