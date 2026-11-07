import {describe,it,expect} from "vitest";
import {
 planStage8P5DayV0079Proposals,type Stage8DayProposalInput
} from "../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39";
import {materializeP5DynamicDaySourceGrid,
 P5_DYNAMIC_DAY_GRID_SCHEMA,type P5DynamicDayGridInput}
 from "../server/lib/disruption/phase5DynamicDaySourceGrid_v39";
import {verifyPreparedDailyDraw} from
 "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";
import type {P5CommittedDayReadonlyResult} from
 "../server/lib/disruption/phase5CommittedDayGridReadonly_v39";
const sh=(c:string)=>c.repeat(64);
const iso=(ms:number)=>new Date(ms).toISOString();
const S=[
 ["HUB","WSSS","ASIA","Asia/Singapore"],
 ["MID_A","OMAA","MIDDLE_EAST","Asia/Dubai"],
 ["MID_B","SKBO","SOUTH_AMERICA","America/Bogota"],
 ["REGIONAL","KGPT","NORTH_AMERICA","America/Chicago"]
] as const;
const H=[["T-24h",1440,"T24"],["T-6h",360,"T6"],["T-90m",90,"T90"]] as const;
function fixture():Stage8DayProposalInput{
 const start=Date.parse("2026-11-09T14:00:00.000Z");
 const day={
  runDayIndex:1,scheduledStartUtc:new Date(start),
  frozenDrawSeed:"phase5-stage8-real-draw-fixture",
  drawType:"NEW_TEMPLATE" as const,anchorIcao:"WSSS",
  slotRegions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
   MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
  pairAirportSet:null,
  calendarHash:sh("a"),configHash:sh("b"),frameHash:sh("c")
 };
 const draw=S.map(([slot,icao,region])=>({
  slot_id:slot,target_region:region,draw_type:day.drawType,
  selected_icao:icao,frozen_draw_seed:day.frozenDrawSeed,
  selected_at_utc:"2026-11-08T10:00:00.000Z",
  adaptive_state_hash:slot==="REGIONAL"?sh("d"):null,
  probability_vector:slot==="REGIONAL"?
   [{icao:"KGPT",probability:1,drawScore:1}]:null,
  airport_layer_design_probability:slot==="REGIONAL"?1:null
 }));
 const templates:P5DynamicDayGridInput["templates"]=[];
 for(const [slot] of S)for(const [horizon,m,label] of H){
  const cutoff=start-m*60_000;
  const request=cutoff-600_000;
  templates.push({
   runDayIndex:1,budgetDayUtc:"2026-11-09",
   physicalChargeDayUtc:iso(request).slice(0,10),
   slot,horizon,providerQueryDirection:"Departure",
   serviceWindowStartUtc:iso(start),
   serviceWindowEndUtc:iso(start+4*3_600_000),
   earliestPlannedCutoffUtc:iso(cutoff),
   scheduledRequestUtc:iso(request),
   maxResponseAndPersistSeconds:120,
   apiUnitsPerAttempt:2,maxAttempts:1,
   queryKey:"p5_day1_"+slot+"_"+label
  });
 }
 const grid=materializeP5DynamicDaySourceGrid({
  schema:P5_DYNAMIC_DAY_GRID_SCHEMA,
  reviewedCalendarSha256:sh("a"),reviewedConfigSha256:sh("b"),
  reviewedFrameSha256:sh("c"),
  providerContractSha256:sh("f"),
  day,committedEarlyDrawRows:draw,
  expectedCommittedEarlyDrawSha256:verifyPreparedDailyDraw(day,draw).stateHash,
  templates
 });
 const stage7:P5CommittedDayReadonlyResult={
  schema:"v39.phase5.db-readback-day-grid.v1",
  status:"SAVED_SOURCE_DAY_READ_ONLY_CANDIDATES_NOT_RELEASED",
  dbClockAtReadUtc:"2026-11-08T10:01:00.000Z",
  restrictedReaderRoleVerified:true,databaseReadOnlySnapshot:true,
  databaseWrites:0,providerCalls:0,selectedDayCandidateGrid:grid,
  sourceResponseCaptured:false,flightLevelPreCertified:false,
  accountRightsCertified:false,phase5FreezePassed:false,phase6Go:false
 };
 return {
  stage7,day,savedEarlyDrawRows:draw,
  manifestSha256:sh("e"),calendarSha256:sh("a"),
  configSha256:sh("b"),frameSha256:sh("c"),
  providerContractSha256:sh("f"),reviewedReleaseSha256:sh("1"),
  rightsReviewSha256:sh("2"),
  localFrames:S.map(([slot,icao,_region,ianaTimezone])=>({
   slot,icao,ianaTimezone,providerApiVersion:"1.15.4",
   fidsProtocolVersion:"v39"
  })),
  chargeDayBudgets:[
   {chargeDayUtc:"2026-11-08",dailyApiCeiling:1900,
    otherCategoriesReserved:50,existingSourceReserved:0},
   {chargeDayUtc:"2026-11-09",dailyApiCeiling:1900,
    otherCategoriesReserved:50,existingSourceReserved:0}
  ],
  cycleUnitsAvailable:1000
 };
}
describe("Phase5 Stage8 one real-day V0079 query row proposals",()=>{
 it("materializes precisely 12 unsigned PREPARED proposals with Day0 charge budgets",()=>{
  const p=fixture(),out=planStage8P5DayV0079Proposals(p);
  expect(out.queries).toHaveLength(12);
  expect(out.sourceQueryCount).toBe(12);
  expect(out.maximumCandidateGetUnits).toBe(24);
  expect(out.actualUtcChargeBudgets.map(x=>[x.day,x.candidateUnits]))
   .toEqual([["2026-11-08",8],["2026-11-09",16]]);
  expect(out.queries.every(q=>q.state==="PREPARED"&&
   q.github_run_id==="00000"&&q.api_units_per_attempt===2&&
   q.max_physical_attempts===1)).toBe(true);
  expect(out.queries.every(q=>new Date(q.hard_latest_dispatch_utc)<new Date(q.prediction_cutoff_utc))).toBe(true);
  expect(out.queries.find(q=>q.airport_icao==="WSSS")?.airport_iana_timezone).toBe("Asia/Singapore");
  expect(out.queries.find(q=>q.airport_icao==="WSSS")?.from_local).toBe("2026-11-09T22:00");
  expect(out.databaseWrites).toBe(0);expect(out.providerCalls).toBe(0);
  expect(out.installedV0079).toBe(false);
  expect(out.independentlyReviewedSourceRights).toBe(false);
  expect(out.actualGitHubPrearmVerified).toBe(false);
  expect(out.flightLevelPreCertified).toBe(false);
  expect(out.phase5FreezePassed).toBe(false);
  expect(out.phase6Go).toBe(false);
 });
 it("is reproducible even when readback row and candidate input order changes",()=>{
  const p=fixture(),q=fixture();
  q.savedEarlyDrawRows.reverse();
  q.stage7.selectedDayCandidateGrid.acquisitions.reverse();
  expect(planStage8P5DayV0079Proposals(p).dayProposalSha256)
   .toBe(planStage8P5DayV0079Proposals(q).dayProposalSha256);
 });
 it("refuses changed selected ICAO or a forged saved draw digest",()=>{
  const p=fixture();
  p.stage7.selectedDayCandidateGrid.acquisitions[0].icao="YSSY";
  expect(()=>planStage8P5DayV0079Proposals(p)).toThrow();
  const q=fixture();q.savedEarlyDrawRows[3].selected_icao="KSFO";
  expect(()=>planStage8P5DayV0079Proposals(q)).toThrow();
 });
 it("rejects new provider contract or calendar without reapproval",()=>{
  const p=fixture();p.providerContractSha256=sh("0");
  expect(()=>planStage8P5DayV0079Proposals(p)).toThrow("TAMPERED");
  const q=fixture();q.calendarSha256=sh("0");
  expect(()=>planStage8P5DayV0079Proposals(q)).toThrow();
 });
 it("never charges a guessed service day when actual UTC Day0 has no budget",()=>{
  const p=fixture();p.chargeDayBudgets.shift();
  expect(()=>planStage8P5DayV0079Proposals(p)).toThrow("MISSING_OR_EXTRA_UTC_CHARGE_DAY_BUDGET");
  const q=fixture();q.chargeDayBudgets[0].otherCategoriesReserved=1895;
  expect(()=>planStage8P5DayV0079Proposals(q)).toThrow("INSUFFICIENT_FROZEN_UTC_CHARGE_BUDGET");
  const t=fixture();t.cycleUnitsAvailable=20;
  expect(()=>planStage8P5DayV0079Proposals(t)).toThrow("CYCLE_BUDGET");
 });
 it("rejects unknown timezone, swapped local frame, postrequest DB draw",()=>{
  const p=fixture();p.localFrames[0].ianaTimezone="Mars/Olympus";
  expect(()=>planStage8P5DayV0079Proposals(p)).toThrow("UNRECOGNIZED_IANA_TIMEZONE");
  const q=fixture();q.localFrames[0].icao="YSSY";
  expect(()=>planStage8P5DayV0079Proposals(q)).toThrow("UNREVIEWED_SOURCE_FRAME");
  const t=fixture();
  t.stage7.dbClockAtReadUtc="2026-11-09T20:00:00.000Z";
  expect(()=>planStage8P5DayV0079Proposals(t)).toThrow("SAVED_DAY_READBACK_AFTER_FIRST_GET");
 });
});
