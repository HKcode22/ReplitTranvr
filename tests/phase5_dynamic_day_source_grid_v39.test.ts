import { describe, expect, it } from "vitest";
import {
 materializeP5DynamicDaySourceGrid,
 P5_DYNAMIC_DAY_GRID_SCHEMA,
 type P5DynamicDayGridInput,
} from "../server/lib/disruption/phase5DynamicDaySourceGrid_v39";
import type {
 P5FidsHorizon,P5Slot,
} from "../server/lib/disruption/phase5FidsFreezeGridAdmission_v39";
const S:[P5Slot,string,string][]=[
 ["HUB","WSSS","ASIA"],["MID_A","OMAA","MIDDLE_EAST"],
 ["MID_B","SKBO","SOUTH_AMERICA"],["REGIONAL","KGPT","NORTH_AMERICA"]
];
const H:[P5FidsHorizon,number,string][]=[
 ["T-24h",1440,"T24"],["T-6h",360,"T6"],["T-90m",90,"T90"]
];
const utc=(ms:number)=>new Date(ms).toISOString();
function sample():P5DynamicDayGridInput {
 const start=Date.parse("2026-11-09T14:00:00.000Z");
 const day={
  runDayIndex:1,scheduledStartUtc:new Date(start),
  frozenDrawSeed:"phase5-frozen-day1",drawType:"NEW_TEMPLATE" as const,
  anchorIcao:"WSSS",
  slotRegions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
   MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
  pairAirportSet:null,calendarHash:"a".repeat(64),
  configHash:"b".repeat(64),frameHash:"c".repeat(64),
 };
 const rows=S.map(([slot,icao,region])=>({
  slot_id:slot,target_region:region,draw_type:day.drawType,
  selected_icao:icao,frozen_draw_seed:day.frozenDrawSeed,
  selected_at_utc:"2026-11-08T10:00:00.000Z",
  adaptive_state_hash:slot==="REGIONAL"?"d".repeat(64):null,
  probability_vector:slot==="REGIONAL"?
   [{icao:"KGPT",probability:1,drawScore:1}]:null,
  airport_layer_design_probability:slot==="REGIONAL"?1:null,
 }));
 const templates:P5DynamicDayGridInput["templates"]=[];
 for(const [slot] of S){
  for(const [horizon,minutes,label] of H){
   const cutoff=start-minutes*60_000;
   const request=cutoff-10*60_000;
   templates.push({
    runDayIndex:1,budgetDayUtc:"2026-11-09",
    physicalChargeDayUtc:utc(request).slice(0,10),
    slot,horizon,providerQueryDirection:"Departure",
    serviceWindowStartUtc:utc(start),
    serviceWindowEndUtc:utc(start+4*3_600_000),
    earliestPlannedCutoffUtc:utc(cutoff),
    scheduledRequestUtc:utc(request),
    maxResponseAndPersistSeconds:120,
    apiUnitsPerAttempt:2,maxAttempts:1,
    queryKey:"p5_day1_"+slot+"_"+label
   });
  }
 }
 // Hash through exact existing canonical PostgreSQL-jsonb-safe readback.
 const { verifyPreparedDailyDraw } = requireReadback();
 return {
  schema:P5_DYNAMIC_DAY_GRID_SCHEMA,
  reviewedCalendarSha256:day.calendarHash,
  reviewedConfigSha256:day.configHash,
  reviewedFrameSha256:day.frameHash,
  providerContractSha256:"f".repeat(64),
  day,committedEarlyDrawRows:rows,
  expectedCommittedEarlyDrawSha256:verifyPreparedDailyDraw(day,rows).stateHash,
  templates
 };
}
// Synchronous import instead of network, database or source runtime.
function requireReadback(){
 return {verifyPreparedDailyDraw};
}
import { verifyPreparedDailyDraw } from "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";
describe("Phase5 dynamic early draw to one-day source grid (NO provider/DB)",()=>{
 it("materializes 4 selected airports x 3 horizons as NOT PAID",()=>{
  const r=materializeP5DynamicDaySourceGrid(sample());
  expect(r.status).toBe("DYNAMIC_DAY_CANDIDATES_MATCH_COMMITTED_DRAW_NOT_RELEASED");
  expect(r.acquisitions).toHaveLength(12);
  expect(r.plannedPhysicalGetCount).toBe(12);
  expect(r.candidateFidsApiUnits).toBe(24);
  expect(r.acquisitions.find(q=>q.slot==="HUB")?.icao).toBe("WSSS");
  expect(r.acquisitions.find(q=>q.slot==="REGIONAL")?.icao).toBe("KGPT");
  expect(r.acquisitions.every(q=>q.maxAttempts===1&&q.apiUnitsPerAttempt===2)).toBe(true);
  expect(r.actualChargeDayUtcCounts).toEqual([
   {day:"2026-11-08",physicalRequests:4,candidateApiUnits:8},
   {day:"2026-11-09",physicalRequests:8,candidateApiUnits:16}
  ]);
  expect(r.sourceCandidateDigestSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(r.actualGithubRunPrearmVerified).toBe(false);
  expect(r.actualSourceOriginalCommitted).toBe(false);
  expect(r.actualFlightLevelPreCertified).toBe(false);
  expect(r.authorizedSourceRights).toBe(false);
  expect(r.authorizesPaidGet).toBe(false);
  expect(r.phase6Go).toBe(false);
 });
 it("canonicalizes independent source template ordering",()=>{
  const a=sample(),b=sample();
  b.templates.reverse();b.committedEarlyDrawRows.reverse();
  expect(materializeP5DynamicDaySourceGrid(a).sourceCandidateDigestSha256)
   .toBe(materializeP5DynamicDaySourceGrid(b).sourceCandidateDigestSha256);
 });
 it("refuses a missing or tampered real early selection readback",()=>{
  const a=sample();a.committedEarlyDrawRows.pop();
  expect(()=>materializeP5DynamicDaySourceGrid(a))
   .toThrow("MISSING_OR_DUPLICATED_SLOTS");
  const b=sample();b.expectedCommittedEarlyDrawSha256="0".repeat(64);
  expect(()=>materializeP5DynamicDaySourceGrid(b))
   .toThrow("UNVERIFIED_EARLY_DRAW_READBACK");
 });
 it("refuses candidate templates smuggling an airport selected in the future",()=>{
  const a=sample();
  (a.templates[0] as any).icao="YSSY";
  expect(()=>materializeP5DynamicDaySourceGrid(a))
   .toThrow("UNAPPROVED_DYNAMIC_AIRPORT_IN_TEMPLATE");
 });
 it("rejects 24h40m selection; actual Stage1 owner needs >24h45m",()=>{
  const a=sample();
  for(const r of a.committedEarlyDrawRows)
   r.selected_at_utc="2026-11-08T13:20:00.000Z";
  // The saved-draw verifier now enforces the real owner boundary FIRST.
  expect(()=>verifyPreparedDailyDraw(a.day,a.committedEarlyDrawRows))
   .toThrow("DRAW_TOO_LATE_FOR_T24_SOURCE");
  expect(()=>materializeP5DynamicDaySourceGrid(a))
   .toThrow("DRAW_TOO_LATE_FOR_T24_SOURCE");
 });
 it("rejects selection over 72h early",()=>{
  const a=sample();
  for(const r of a.committedEarlyDrawRows)
   r.selected_at_utc="2026-11-06T13:00:00.000Z";
  expect(()=>verifyPreparedDailyDraw(a.day,a.committedEarlyDrawRows))
   .toThrow("DRAW_TOO_EARLY_FOR_PROSPECTIVE_SAMPLING");
  expect(()=>materializeP5DynamicDaySourceGrid(a))
   .toThrow("DRAW_TOO_EARLY_FOR_PROSPECTIVE_SAMPLING");
 });
 it("refuses wrong calendar, swapped billing date and service start",()=>{
  const a=sample();a.reviewedCalendarSha256="e".repeat(64);
  expect(()=>materializeP5DynamicDaySourceGrid(a))
   .toThrow("FROZEN_CALENDAR_CONFIG_FRAME_CONFLICT");
  const b=sample();b.templates[0].physicalChargeDayUtc="2026-11-09";
  expect(()=>materializeP5DynamicDaySourceGrid(b))
   .toThrow("ACTUAL_UTC_CHARGE_DAY_MISMATCH");
  const c=sample();c.templates[1].serviceWindowStartUtc="2026-11-09T15:00:00.000Z";
  expect(()=>materializeP5DynamicDaySourceGrid(c))
   .toThrow("UNFROZEN_SERVICE_WINDOW");
 });
 it("refuses missing, duplicate, or unlabeled horizon queries",()=>{
  const a=sample();a.templates.pop();
  expect(()=>materializeP5DynamicDaySourceGrid(a))
   .toThrow("MISSING_OR_EXTRA_SLOT_HORIZON_TEMPLATE");
  const b=sample();b.templates[1].slot=b.templates[0].slot;
  b.templates[1].horizon=b.templates[0].horizon;
  expect(()=>materializeP5DynamicDaySourceGrid(b))
   .toThrow("DUPLICATE_SLOT_HORIZON");
 });
 it("refuses unsigned retries, wrong price, or source deadline violation",()=>{
  const a=sample();a.templates[0].maxAttempts=2;
  expect(()=>materializeP5DynamicDaySourceGrid(a))
   .toThrow("UNREVIEWED_REQUEST_UNIT_PRICE_OR_RETRY");
  const b=sample();b.templates[0].apiUnitsPerAttempt=3;
  expect(()=>materializeP5DynamicDaySourceGrid(b))
   .toThrow("UNREVIEWED_REQUEST_UNIT_PRICE_OR_RETRY");
  const c=sample();c.templates[0].maxResponseAndPersistSeconds=3601;
  expect(()=>materializeP5DynamicDaySourceGrid(c))
   .toThrow("SOURCE_COMMIT_MARGIN");
  const d=sample();d.templates[0].scheduledRequestUtc=
   d.templates[0].earliestPlannedCutoffUtc;
  expect(()=>materializeP5DynamicDaySourceGrid(d))
   .toThrow("EARLY_DRAW_OR_QUERY_AFTER_CUTOFF");
 });
});
