import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {
 auditP5F8SegmentedSourceCoverage,partitionP5F8ServiceSegments,
 digestP5Stage22Requests,P5_STAGE22_CATEGORIES
} from "../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs";
import {deriveP5F8SeededPairRoles}
 from "../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs";

const SHA=c=>c.repeat(64),MS=60_000,H=3_600_000,D=24*H;
const iso=t=>new Date(t).toISOString();
const slots=["00","04","08","12","16","20"];
const regions={HUB:"ASIA",MID_A:"EUROPE",MID_B:"AMERICAS",
 REGIONAL:"OCEANIA"};
function icao(n){
 return "Q"+String.fromCharCode(65+Math.floor(n/676)%26)+
  String.fromCharCode(65+Math.floor(n/26)%26)+
  String.fromCharCode(65+n%26);
}
const airports=n=>({HUB:icao(n*4),MID_A:icao(n*4+1),
 MID_B:icao(n*4+2),REGIONAL:icao(n*4+3)});
function window(t,shape){
 const seg=shape==="2x2h"?
  [{startUtc:iso(t),endUtc:iso(t+2*H)},
   {startUtc:iso(t+3*H),endUtc:iso(t+5*H)}]:
  [{startUtc:iso(t),endUtc:iso(t+(shape==="4h"?4:6)*H)}];
 return {startUtc:seg[0].startUtc,
  endUtc:seg.at(-1).endUtc,segments:seg,windowShape:shape};
}
function calendar(){
 const seed=SHA("a");
 const defs=Array.from({length:5},(_,i)=>({
  pairId:"pair_"+String(i+1).padStart(3,"0"),
  frozenPairTemplateSha256:SHA(String(i+1))
 }));
 const roles=new Map(deriveP5F8SeededPairRoles(seed,defs)
   .map(r=>[r.pairId,r]));
 const base=Date.parse("2027-01-04T00:00:00.000Z");
 const days=Array.from({length:31},(_,i)=>{
  const n=i+1,pi=n<=5?n:n>=7&&n<=11?n-6:null;
  const pairId=pi===null?null:"pair_"+String(pi).padStart(3,"0");
  const period=pi===null?null:n<=5?1:2;
  const role=pi===null?"ordinary":period===1?
   roles.get(pairId).period1Role:roles.get(pairId).period2Role;
  const shape=role==="alternative"?
   pi<=3?"2x2h":"up-to-6h":"4h";
  const t=base+i*7*D+i%6*4*H;
  return {
   runDayIndex:n,...window(t,shape),utcSlot:slots[i%6],
   airports:airports(pi??n+50),targetRegions:{...regions},
   partition:"train",drawType:period===2?"PAIR_REPLAY":"NEW_TEMPLATE",
   pairId,crossoverPeriod:period,pairRole:role,
   frozenPairTemplateSha256:pi===null?null:SHA(String(pi)),
   alertBudgetDayId:"p5-ci-parent-"+String(n).padStart(2,"0"),
   plannedAlertCredits:100,unsettledAlertMarginCredits:50,
   alertDayCeilingCredits:1900,
   fidsRestUnitsReserved:150,otherRestUnitsReserved:75
  };
 });
 return {
  schema:"v39.phase5.f8.crossover-calendar-candidate.v1",
  calendarSha256:SHA("c"),crossoverSeedSha256:seed,
  frozenRegionScheduleSha256:SHA("d"),frozenFrameSha256:SHA("e"),
  projectRestCeilingUnits:50000,otherRestCycleReservedUnits:2000,
  protectedRestFloorUnits:1000,days
 };
}
const HOR={"T-24h":24*H,"T-6h":6*H,"T-90m":90*MS};
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
function rebudget(p){
 const byDay=new Map();
 for(const q of p.requests){
  const charge=q.utcChargeDay;
  const b=byDay.get(charge)??Object.fromEntries(
   P5_STAGE22_CATEGORIES.map(x=>[x,0]));
  b[q.partitionIndex===1?"FIDS_BASE_UNITS":"FIDS_SPLIT_UNITS"]+=
   q.apiUnitsPerAttempt;
  byDay.set(charge,b);
 }
 p.utcChargeBudgets=[...byDay].sort((a,b)=>a[0].localeCompare(b[0]))
 .map(([utcDay,categoryReservedUnits])=>({
  utcDay,restDailyCeilingUnits:1900,categoryReservedUnits
 }));
 p.expectedRequestSetSha256=digestP5Stage22Requests(p.requests);
 return p;
}
function fixture(){
 const c=calendar();
 const p={
  schema:"v39.phase5.f8.segmented-fids-coverage-input.v1",
  calendar:c,
  reviewedProviderRangeContractSha256:SHA("f"),
  reviewedTimingContractSha256:SHA("a"),
  providerMaxRangeMinutes:240,
  maxPopulationStalenessSeconds:3600,
  schedulerSlipSeconds:60,responseAndPersistSeconds:120,
  preCommitMarginSeconds:120,apiUnitsPerPhysicalGet:2,
  projectCycleApiCeiling:50000,protectedApiFloorUnits:1000,
  cycleCategoryCaps:Object.fromEntries(
   P5_STAGE22_CATEGORIES.map(k=>[k,50000])),
  requests:[],utcChargeBudgets:[],expectedRequestSetSha256:""
 };
 let index=0;
 for(const day of c.days){
  const parts=partitionP5F8ServiceSegments(day,240);
  for(const slot of SLOTS)for(const [horizon,offset] of
    Object.entries(HOR))for(const part of parts){
   const cutoffStart=Date.parse(part.partStartUtc)-offset;
   const cutoffEnd=Date.parse(part.partEndUtc)-offset;
   for(let t=cutoffStart;t<cutoffEnd;t+=50*MS){
    const get=t-5*MS;
    p.requests.push({
     queryKey:"p5-ci-"+String(++index).padStart(7,"0"),
     runDayIndex:day.runDayIndex,slot,horizon,
     airportIcao:day.airports[slot],
     segmentIndex:part.segmentIndex,
     partitionIndex:part.partitionIndex,
     serviceIntervalStartUtc:part.partStartUtc,
     serviceIntervalEndUtc:part.partEndUtc,
     scheduledGetUtc:iso(get),
     utcChargeDay:iso(get).slice(0,10),
     apiUnitsPerAttempt:2,maxPhysicalAttempts:1
    });
   }
  }
 }
 return rebudget(p);
}
const clone=x=>structuredClone(x);
describe("Phase5 Stage22 no-paid f.8 segment FIDS coverage + seven-category ledger",()=>{
 it("covers ALL exposed 31-day crossover segments but explicitly excludes 2x2 gaps",()=>{
  const p=fixture();
  const r=auditP5F8SegmentedSourceCoverage(p);
  assert.equal(r.status,
   "CANDIDATE_EXPOSED_SEGMENTS_TEMPORALLY_COVERED_NOT_RELEASE");
  assert.equal(r.batchDays,31);
  assert.equal(r.expectedAirportHorizonPartitionGroups,432);
  assert.equal(r.plannedPhysicalGets,1968);
  assert.equal(r.projectedFidsBaseUnits,2*(
   26*5+3*6+2*(5+3))*12-2*(3*3+2*3)*12);
  assert.equal(r.projectedFidsBaseUnits+r.projectedFidsSplitUnits,3936);
  assert.equal(r.excludedGapWindows.length,3);
  assert.equal(r.temporalCoverageGaps.length,0);
  assert.equal(r.allHypotheticalExposedCutoffsCovered,true);
  assert.equal(r.chargeDays.every(d=>d.restUnitsReserved<=1900),true);
  assert.equal(r.authenticProviderMaxRangeIndependentlyMeasured,false);
  assert.equal(r.actualFidsSourceAvailableAtVerified,false);
  assert.equal(r.phase5FreezePassed,false);
  assert.equal(r.phase6Go,false);
  assert.equal(r.providerCalls,0);
  assert.equal(r.databaseWrites,0);
 });
 it("never covers, charges or admits 2x2 treatment gap as exposure",()=>{
  const p=fixture();
  const d=p.calendar.days.find(d=>d.windowShape==="2x2h");
  const parts=partitionP5F8ServiceSegments(d,240);
  assert.equal(parts.length,2);
  assert.equal(parts[0].partEndUtc,d.segments[0].endUtc);
  assert.equal(parts[1].partStartUtc,d.segments[1].startUtc);
  assert.notEqual(parts[0].partEndUtc,parts[1].partStartUtc);
  const q=p.requests.find(q=>q.runDayIndex===d.runDayIndex);
  q.serviceIntervalStartUtc=d.segments[0].endUtc;
  rebudget(p);
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(p),
   /MUTATED_SERVICE_FRAME_PRICE_OR_RETRY/);
 });
 it("splits each six-hour maximum into deterministic 4h+2h service partitions",()=>{
  const p=fixture();
  const d=p.calendar.days.find(x=>x.windowShape==="up-to-6h");
  const parts=partitionP5F8ServiceSegments(d,240);
  assert.equal(parts.length,2);
  assert.equal(Date.parse(parts[0].partEndUtc)-
   Date.parse(parts[0].partStartUtc),4*H);
  assert.equal(Date.parse(parts[1].partEndUtc)-
   Date.parse(parts[1].partStartUtc),2*H);
  const q=p.requests.filter(x=>x.runDayIndex===d.runDayIndex&&
    x.slot==="HUB"&&x.horizon==="T-24h"&&x.partitionIndex===2);
  assert.equal(q.length,3);
 });
 it("holds missing late-window refresh instead of treating future response as pre-cutoff",()=>{
  const p=fixture();
  const candidate=p.requests.findIndex(q=>q.runDayIndex===1&&
   q.slot==="HUB"&&q.horizon==="T-24h"&&
   q.partitionIndex===1);
  p.requests.splice(candidate,1);
  rebudget(p);
  const r=auditP5F8SegmentedSourceCoverage(p);
  assert.equal(r.status,"HOLD_EXPOSED_FLIGHT_CUTOFF_REFRESH_COVERAGE_GAPS");
  assert.ok(r.temporalCoverageGaps.length>0);
  assert.equal(r.phase6Go,false);
 });
 it("refuses a missing entire six-hour split partition",()=>{
  const p=fixture();
  const d=p.calendar.days.find(x=>x.windowShape==="up-to-6h");
  p.requests=p.requests.filter(q=>!(
    q.runDayIndex===d.runDayIndex&&q.slot==="HUB"&&
    q.horizon==="T-90m"&&q.partitionIndex===2));
  rebudget(p);
  const r=auditP5F8SegmentedSourceCoverage(p);
  assert.equal(r.status,"HOLD_EXPOSED_FLIGHT_CUTOFF_REFRESH_COVERAGE_GAPS");
  assert.ok(r.temporalCoverageGaps.some(x=>
   x.reason==="NO_REQUEST_FOR_EXPOSED_PARTITION"));
 });
 it("refuses unbudgeted physical UTC charge day, including before batch window",()=>{
  const p=fixture();
  p.utcChargeBudgets.shift();
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(p),
   /UNBUDGETED_ACTUAL_UTC_CHARGE_DAY/);
 });
 it("refuses wrong physical UTC day, underreserved FIDS split, and changed request SHA",()=>{
  const p=fixture();
  p.requests[0].utcChargeDay="2027-04-01";
  rebudget(p);
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(p),
   /WRONG_PHYSICAL_UTC_CHARGE_DAY/);
  const q=fixture();
  const split=q.utcChargeBudgets.find(b=>b.categoryReservedUnits.FIDS_SPLIT_UNITS>0);
  split.categoryReservedUnits.FIDS_SPLIT_UNITS=0;
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(q),
   /FIDS_BASE_OR_SPLIT_CHARGE_RESERVATION_NOT_EXACT/);
  const r=fixture();r.requests[0].scheduledGetUtc=
   "2027-01-01T00:00:00.000Z";
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(r),
   /UNREVIEWED_OR_MUTATED_REQUEST_GRID/);
 });
 it("enforces individual seven-category rest caps independently from Alert credits",()=>{
  const p=fixture();
  p.cycleCategoryCaps.FIDS_BASE_UNITS=1;
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(p),
   /SEVEN_CATEGORY_CYCLE_CAP_EXCEEDED/);
  const q=fixture();
  q.utcChargeBudgets[0].categoryReservedUnits.VALIDATION_UNIT_BUDGET=1900;
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(q),
   /ACTUAL_UTC_DAY_REST_CEILING_EXCEEDED/);
  const r=fixture();r.projectCycleApiCeiling=4000;
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(r),
   /PROTECTED_CYCLE_REST_BUDGET_EXCEEDED/);
 });
 it("rejects structurally invalid 31-day calendar without guessing new dates",()=>{
  const p=fixture();
  p.calendar.days[2].windowShape="4h";
  assert.throws(()=>auditP5F8SegmentedSourceCoverage(p),
   /BINDING_F8_CALENDAR_UNSAT/);
 });
});
