import {describe,it,expect} from "vitest";
import {buildP5PrelaunchSlotBudgetEnvelope} from
 "../server/lib/disruption/phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";

const H=3600000,M=60000,D=86400000;
const sha=c=>c.repeat(64);
const iso=n=>new Date(n).toISOString();
const OTHER=[
 "FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET",
 "OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET",
 "DIAGNOSTIC_UNIT_BUDGET"
];
function fixture(){
 const first=Date.parse("2027-01-04T00:00:00.000Z");
 const slots=[0,4,8,12,16,20];
 const calendarDays=Array.from({length:31},(_,i)=>{
  const windowShape=i<26?"4h":i<29?"2x2h":"up-to-6h";
  const hour=slots[i%6],start=first+i*7*D+hour*H;
  return {runDayIndex:i+1,startUtc:iso(start),
   utcSlot:String(hour).padStart(2,"0"),windowShape,
   partition:i<20?"train":i<25?"validation":"test"};
 });
 // Independent fixture charge-date enumeration, NO real airport identities.
 // Date set includes each dated T24/T6/T90 source refresh; no assumed
 // "exactly 31" charge-days or guessed Day-1.
 const chargeDates=new Set();
 for(const day of calendarDays){
  const s=Date.parse(day.startUtc);
  const segments=day.windowShape==="2x2h"?
    [[s,s+2*H],[s+3*H,s+5*H]]:
    [[s,s+(day.windowShape==="up-to-6h"?6:4)*H]];
  for(const [a,b] of segments){
   for(let partStart=a;partStart<b;partStart+=4*H){
    const end=Math.min(partStart+4*H,b);
    for(const offset of [24*H,6*H,90*M]){
     const firstGet=partStart-offset-120000;
     const stop=end-offset-120000;
     for(let t=firstGet;t<stop;t+=60*M)
      chargeDates.add(iso(t).slice(0,10));
    }
   }
  }
 }
 return {
  schema:"v39.phase5.prelaunch-slot-budget-input.v1",
  manifestSha256:sha("a"),calendarSha256:sha("b"),
  configSha256:sha("c"),frameSha256:sha("d"),
  providerRangeEvidenceSha256:sha("e"),timingEvidenceSha256:sha("f"),
  asOfUtc:"2026-12-01T00:00:00.000Z",providerMaxRangeMinutes:240,
  refreshEveryMinutes:60,physicalGetsPerRefreshUpperBound:1,
  getLeadSeconds:120,apiUnitsPerPhysicalGet:2,
  cycleRestCeilingUnits:50000,protectedRestFloorUnits:1000,
  calendarDays,restOtherByUtcDate:[...chargeDates].sort().map(chargeDayUtc=>({
   chargeDayUtc,dailyRestCeilingUnits:1900,
   categories:Object.fromEntries(OTHER.map(x=>[x,0]))
  }))
 };
}
describe("Phase5 nonpaid 31-day slot-only UTC budget envelope",()=>{
 it("reserves future source slots without inventing 21 adaptive airports",()=>{
  const input=fixture();
  const out=buildP5PrelaunchSlotBudgetEnvelope(input);
  expect(out.status).toBe(
   "SLOT_BUDGET_ONLY_CANDIDATE_AIRPORT_IDENTITIES_NOT_FROZEN");
  expect(out.ordinaryAdaptiveAirportDaysUnselected).toBe(21);
  expect(out.sourcePlanningPartitionGroups).toBeGreaterThanOrEqual(408);
  expect(out.utcCategoryRows.length).toBeGreaterThanOrEqual(31);
  expect(out.utcCategoryRows.every(d=>
    d.fidsBaseUnits+d.fidsSplitUnits<=d.dailyRestCeilingUnits)).toBe(true);
  expect(out.cycleSourceUnits).toBe(out.physicalGetsUpperBound*2);
  expect(out.prelaunchEnvelopeSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(out)).not.toMatch(/"airportIcao"/);
  expect(out.actualFlightQueryGridCertified).toBe(false);
  expect(out.physicalGetReservations).toBe(0);
  expect(out.databaseWrites).toBe(0);
  expect(out.providerCalls).toBe(0);
  expect(out.phase6PaidGo).toBe(false);
 });
 it("refuses missing charge dates and missing non-FIDS category reservations",()=>{
  const missing=fixture();
  missing.restOtherByUtcDate.pop();
  expect(()=>buildP5PrelaunchSlotBudgetEnvelope(missing))
   .toThrow("SOURCE_AND_OTHER_UTC_CHARGE_DATES_NOT_EXACT");
  const noCat=fixture();
  delete noCat.restOtherByUtcDate[0].categories.DIAGNOSTIC_UNIT_BUDGET;
  expect(()=>buildP5PrelaunchSlotBudgetEnvelope(noCat))
   .toThrow("UNSIGNED_OR_INCOMPLETE_FIVE_OTHER_REST_CATEGORIES");
 });
 it("refuses overspending, stale slots, unverified range and false shape",()=>{
  const over=fixture();
  over.restOtherByUtcDate.forEach(d=>d.dailyRestCeilingUnits=2);
  expect(()=>buildP5PrelaunchSlotBudgetEnvelope(over))
   .toThrow("PHYSICAL_UTC_REST_BUDGET_OVERSPENT");
  const late=fixture();late.asOfUtc="2027-02-01T00:00:00.000Z";
  expect(()=>buildP5PrelaunchSlotBudgetEnvelope(late))
   .toThrow("FIRST_PLANNED_SOURCE_SLOT_ALREADY_PAST");
  const range=fixture();range.providerMaxRangeMinutes=0;
  expect(()=>buildP5PrelaunchSlotBudgetEnvelope(range))
   .toThrow("MISSING_REVIEWED_SHAPE_RANGE_OR_FINANCIAL_INPUTS");
  const shape=fixture();shape.calendarDays[30].windowShape="4h";
  expect(()=>buildP5PrelaunchSlotBudgetEnvelope(shape))
   .toThrow("F8_26_3_2_EXPOSURE_GEOMETRY_MISMATCH");
 });
 it("refuses forecast partition leakage and duplicate future charge dates",()=>{
  const split=fixture();split.calendarDays[20].partition="train";
  expect(()=>buildP5PrelaunchSlotBudgetEnvelope(split))
   .toThrow("UNFROZEN_31_DAY_SHAPE_OR_PROTECTED_SPLIT");
  const dup=fixture();dup.restOtherByUtcDate.push({...dup.restOtherByUtcDate[0]});
  expect(()=>buildP5PrelaunchSlotBudgetEnvelope(dup))
   .toThrow("UNSIGNED_OR_INCOMPLETE_FIVE_OTHER_REST_CATEGORIES");
 });
});
