import {
 solveP5F8FrozenCandidatePool,digestP5F8FrozenCandidatePool
} from "../server/lib/disruption/phase5F8FiniteCandidateSolver_v39.mjs";
import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {
 auditP5F8CrossoverCandidate,deriveP5F8SeededPairRoles
} from "../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs";
const h=x=>x.repeat(64);
const seed=h("a");
const MS=86400000,H=3600000;
const slots=["00","04","08","12","16","20"];
const format=n=>new Date(n).toISOString();
const airports=n=>{
 const cell=(m)=>"Q"+String.fromCharCode(65+Math.floor(m/676)%26)+
   String.fromCharCode(65+Math.floor(m/26)%26)+
   String.fromCharCode(65+m%26);
 return {HUB:cell(n*4),MID_A:cell(n*4+1),
  MID_B:cell(n*4+2),REGIONAL:cell(n*4+3)};
};
const targetRegions={HUB:"ASIA",MID_A:"MIDEAST",
 MID_B:"AFRICA",REGIONAL:"NORTH_AMERICA"};
const template=i=>h(String(i));
function window(start,shape){
 const end=start+(shape==="2x2h"?5:shape==="4h"?4:6)*H;
 const segments=shape==="2x2h"?
  [{startUtc:format(start),endUtc:format(start+2*H)},
   {startUtc:format(start+3*H),endUtc:format(start+5*H)}]:
  [{startUtc:format(start),endUtc:format(end)}];
 return {startUtc:format(start),endUtc:format(end),segments,windowShape:shape};
}
function make(){
 const pairs=Array.from({length:5},(_,i)=>({
  pairId:"pair_"+String(i+1).padStart(3,"0"),
  frozenPairTemplateSha256:template(i+1)
 }));
 const roles=deriveP5F8SeededPairRoles(seed,pairs);
 const roleById=new Map(roles.map(x=>[x.pairId,x]));
 const base=Date.parse("2027-01-04T00:00:00.000Z");
 const days=Array.from({length:31},(_,i)=>{
  const n=i+1,pairIndex=n<=5?n:n>=7&&n<=11?n-6:null;
  const pairId=pairIndex===null?null:
    "pair_"+String(pairIndex).padStart(3,"0");
  const period=pairIndex===null?null:n<=5?1:2;
  const role=pairIndex===null?"ordinary":
    period===1?roleById.get(pairId).period1Role:
      roleById.get(pairId).period2Role;
  const alt=pairIndex<=3?"2x2h":"up-to-6h";
  const shape=role==="alternative"?alt:"4h";
  const start=base+i*7*MS+((i%6)*4*H);
  return {
   runDayIndex:n,
   ...window(start,shape),
   utcSlot:slots[i%6],
   airports:airports(pairIndex??n+50),
   targetRegions:{...targetRegions},
   partition:"train",
   drawType:period===2?"PAIR_REPLAY":"NEW_TEMPLATE",
   pairId,crossoverPeriod:period,pairRole:role,
   frozenPairTemplateSha256:pairIndex===null?null:template(pairIndex),
   alertBudgetDayId:"ci-parent-"+String(n).padStart(2,"0"),
   plannedAlertCredits:150,
   unsettledAlertMarginCredits:50,
   alertDayCeilingCredits:1900,
   fidsRestUnitsReserved:150,
   otherRestUnitsReserved:75
  };
 });
 return {
  schema:"v39.phase5.f8.crossover-calendar-candidate.v1",
  calendarSha256:h("c"),crossoverSeedSha256:seed,
  frozenRegionScheduleSha256:h("d"),frozenFrameSha256:h("e"),
  projectRestCeilingUnits:50000,otherRestCycleReservedUnits:2000,
  protectedRestFloorUnits:1000,days
 };
}
const copy=x=>structuredClone(x);
const includes=(p,reason)=>{
 const a=auditP5F8CrossoverCandidate(p);
 assert.equal(a.phase6Go,false);
 assert.equal(a.phase5FreezePassed,false);
 assert.equal(a.status,"UNSAT_HARD_F8_CALENDAR_CONSTRAINTS");
 assert.ok(a.errors.includes(reason),JSON.stringify(a.errors));
};
describe("Stage21 binding f.8 31-batch-day paired crossover hard gates",()=>{
 it("admits only a structurally valid 26/3/2 five-pair candidate, never scientific FREEZE",()=>{
  const result=auditP5F8CrossoverCandidate(make());
  assert.equal(result.status,"SAT_STRUCTURAL_CANDIDATE_NOT_FINAL_FREEZE");
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.plannedShapes,{"4h":26,"2x2h":3,"up-to-6h":2});
  assert.equal(result.ordinaryFourHourDays,21);
  assert.equal(result.crossover2x2Pairs,3);
  assert.equal(result.crossoverUpTo6hPairs,2);
  assert.equal(result.matchedPairs,5);
  assert.equal(result.completedUTCSlotSixDayBlocks,5);
  assert.equal(result.providerCalls,0);
  assert.equal(result.databaseWrites,0);
  assert.equal(result.phase5FreezePassed,false);
  assert.equal(result.phase6Go,false);
  assert.equal(result.requiredRegionPermutationAndAnchorFrameVerified,false);
  assert.equal(result.providerMeasuredRangeAndActualChargeDaysVerified,false);
 });
 it("fails if 31 standard 4h days try to masquerade as the f.8 crossover design",()=>{
  const p=make();
  p.days=p.days.map(r=>({...r,...window(Date.parse(r.startUtc),"4h")}));
  includes(p,"F8_26_3_2_SHAPE_OR_21_ORDINARY_TOTALS");
 });
 it("refuses an unplanned 2x2 gap, exposed gap flights are never implied",()=>{
  const p=make();
  const x=p.days.find(x=>x.windowShape==="2x2h");
  x.segments[1].startUtc=x.segments[0].endUtc;
  includes(p,"SPLIT_2X2_EXPOSURE_OR_GAP_INVALID");
 });
 it("refuses 2h split gaps that the controller cannot execute",()=>{
  const p=make(),x=p.days.find(x=>x.windowShape==="2x2h");
  // Exposures remain 2h+2h, but the gap is now 2h, not 1h.
  x.segments[1].startUtc=format(Date.parse(x.segments[1].startUtc)+H);
  x.segments[1].endUtc=format(Date.parse(x.segments[1].endUtc)+H);
  x.endUtc=x.segments[1].endUtc;
  includes(p,"SPLIT_2X2_GAP_NOT_EXECUTABLE_FROZEN_60MIN");
 });
 it("enforces frozen period2 same ICAOs and region, not a new adaptive draw",()=>{
  const p=make();
  p.days[6].airports.HUB="ZZZZ";
  includes(p,"PAIR_AIRPORT_OR_TARGET_REGION_REDRAW");
  const p2=make();
  p2.days[6].drawType="NEW_TEMPLATE";
  includes(p2,"PAIR_PERIOD2_MUST_REPLAY_FROZEN_PERIOD1");
 });
 it("enforces minimum 24h from previous END to next START for reused airport",()=>{
  const p=make(),first=p.days[0],second=p.days[1];
  const now=Date.parse(first.endUtc)+23*H;
  Object.assign(second,window(now,second.windowShape));
  second.airports=copy(first.airports);
  second.utcSlot=second.startUtc.slice(11,13);
  includes(p,"REPEATED_AIRPORT_24H_END_TO_START_WASHOUT");
 });
 it("refuses paired treatment periods separated by changed time class or split",()=>{
  const p=make();
  p.days[6].partition="test";
  includes(p,"PAIR_TIME_WEEKDAY_OR_PARTITION_MISMATCH");
 });
 it("refuses a repeated UTC slot within a six-day balance block",()=>{
  const p=make();
  p.days[1].utcSlot=p.days[0].utcSlot;
  includes(p,"UTC_SLOT_NOT_BOUND_TO_WINDOW");
 });
 it("refuses missing per-parent Alert reserve and overflowing cycle REST",()=>{
  const p=make();
  p.days[0].plannedAlertCredits=1900;
  includes(p,"ALERT_PARENT_DAY_CAP_OR_UNSETTLED_MARGIN");
  const q=make();
  q.projectRestCeilingUnits=5000;
  includes(q,"PROJECT_CYCLE_REST_RESERVATIONS_OVER_CEILING");
 });
 it("requires exact reproducible pre-frozen seed-derived within-pair order",()=>{
  const p=make(),first=p.days[0],second=p.days[6];
  const role1=first.pairRole,role2=second.pairRole;
  first.pairRole=role2;second.pairRole=role1;
  const tmp=first.windowShape;
  Object.assign(first,window(Date.parse(first.startUtc),second.windowShape));
  Object.assign(second,window(Date.parse(second.startUtc),tmp));
  includes(p,"TREATMENT_ORDER_NOT_FROM_FROZEN_SEEDED_DRAW");
 });
 it("rejects incomplete or invented 31-day packet and unseeded templates",()=>{
  const p=make();p.days.pop();
  const r=auditP5F8CrossoverCandidate(p);
  assert.equal(r.status,"UNSAT_MISSING_OR_UNFROZEN_CALENDAR_INPUT");
  assert.throws(()=>deriveP5F8SeededPairRoles(seed,[]),
   /INVALID_SEEDED_PAIR_TEMPLATES/);
 });
});

function makePool(opts={}){
 const p=make();
 const {days,...basePacket}=p;
 const candidateDays=days.map(x=>[x]);
 if(opts.alternativeForDay31){
  const x=structuredClone(days[30]);
  Object.assign(x,window(Date.parse(x.startUtc)+4*H,x.windowShape));
  x.utcSlot=x.startUtc.slice(11,13);
  candidateDays[30].push(x);
 }
 const timeWindowScheduleSeedSha256=h("f");
 return {
  schema:"v39.phase5.f8.finite-candidate-calendar-csp-input.v1",
  basePacket,candidateDays,timeWindowScheduleSeedSha256,
  expectedCandidateSetSha256:digestP5F8FrozenCandidatePool(
    basePacket,candidateDays,timeWindowScheduleSeedSha256),
  maxSearchNodes:10000
 };
}
describe("Stage21b finite-candidate f.8 time-window SAT solver",()=>{
 it("selects a complete valid 31-day assignment without certifying live science",()=>{
  const result=solveP5F8FrozenCandidatePool(makePool());
  assert.equal(result.status,
   "SAT_FINITE_CANDIDATE_SCHEDULE_NOT_SCIENTIFIC_RELEASE");
  assert.equal(result.days.length,31);
  assert.equal(result.feasibleCandidates,1);
  assert.equal(result.visitedNodes,31);
  assert.equal(result.structuralAudit.errors.length,0);
  assert.equal(result.providerCalls,0);
  assert.equal(result.databaseWrites,0);
  assert.equal(result.phase5FreezePassed,false);
  assert.equal(result.phase6Go,false);
 });
 it("uses §8.8 lexical tie break after exact weekday×UTC soft-score equality",()=>{
  const result=solveP5F8FrozenCandidatePool(
   makePool({alternativeForDay31:true}));
  assert.equal(result.status,
   "SAT_FINITE_CANDIDATE_SCHEDULE_NOT_SCIENTIFIC_RELEASE");
  assert.equal(result.feasibleCandidates,2);
  assert.equal(result.days[30].utcSlot,"00");
  assert.equal(result.tieBreak,
   "LEXICALLY_SMALLEST_CANONICAL_SCHEDULE_AT_EQUAL_SCORE");
 });
 it("returns UNSAT only for fully searched provided finite choices",()=>{
  const p=makePool();
  p.candidateDays[0][0].pairRole="ordinary";
  p.expectedCandidateSetSha256=digestP5F8FrozenCandidatePool(
   p.basePacket,p.candidateDays,p.timeWindowScheduleSeedSha256);
  const x=solveP5F8FrozenCandidatePool(p);
  assert.equal(x.status,"UNSAT_SUPPLIED_FROZEN_CANDIDATE_POOL_ONLY");
  assert.equal(x.feasibleCandidates,0);
  assert.equal(x.phase6Go,false);
 });
 it("never mislabels a capped search as UNSAT or globally optimal",()=>{
  const p=makePool({alternativeForDay31:true});
  p.maxSearchNodes=1;
  const x=solveP5F8FrozenCandidatePool(p);
  assert.equal(x.status,"HOLD_BOUNDED_SEARCH_NOT_PROVEN_COMPLETE");
  assert.equal(x.phase5FreezePassed,false);
 });
 it("rejects candidate pool mutation without matching frozen SHA",()=>{
  const p=makePool();
  p.candidateDays[0][0].utcSlot="20";
  const x=solveP5F8FrozenCandidatePool(p);
  assert.equal(x.status,"HOLD_INVALID_FROZEN_CANDIDATE_POOL");
  assert.equal(x.reason,"CHANGED_FROZEN_CANDIDATE_POOL_HASH");
 });
});
