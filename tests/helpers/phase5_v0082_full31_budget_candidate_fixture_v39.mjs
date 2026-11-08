/**
 * SYNTHETIC ONLY: full 31-day Amendment C Stage21/Stage22 coverage fixture.
 * No AeroDataBox account entitlement, real airport draw, SOURCE, or rights.
 */
import {createHash} from "node:crypto";
import {deriveP5F8SeededPairRoles} from
 "../../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs";
import {partitionP5F8ServiceSegments,digestP5Stage22Requests,
 P5_STAGE22_CATEGORIES} from
 "../../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs";
import {createP5V0082SevenRestFreezeCandidate} from
 "../../server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs";
const SHA=c=>c.repeat(64),MS=60_000,H=3_600_000,D=24*H;
const iso=n=>new Date(n).toISOString();
const regions={HUB:"ASIA",MID_A:"EUROPE",MID_B:"AMERICAS",
 REGIONAL:"OCEANIA"};
const slots=["00","04","08","12","16","20"];
const air=n=>"Q"+String.fromCharCode(65+Math.floor(n/676)%26)+
 String.fromCharCode(65+Math.floor(n/26)%26)+
 String.fromCharCode(65+n%26);
const airports=n=>({HUB:air(n*4),MID_A:air(n*4+1),
 MID_B:air(n*4+2),REGIONAL:air(n*4+3)});
const segment=(start,shape)=>{
 const periods=shape==="2x2h"?
  [{startUtc:iso(start),endUtc:iso(start+2*H)},
   {startUtc:iso(start+3*H),endUtc:iso(start+5*H)}]:
  [{startUtc:iso(start),
    endUtc:iso(start+(shape==="4h"?4:6)*H)}];
 return {startUtc:periods[0].startUtc,endUtc:periods.at(-1).endUtc,
  segments:periods,windowShape:shape};
};
export function full31SyntheticBudgetPlan(){
 const seed=SHA("a");
 const defs=Array.from({length:5},(_,i)=>({
  pairId:"pair_"+String(i+1).padStart(3,"0"),
  frozenPairTemplateSha256:SHA(String(i+1))
 }));
 const roles=new Map(deriveP5F8SeededPairRoles(seed,defs).
   map(r=>[r.pairId,r]));
 const base=Date.parse("2027-01-04T00:00:00.000Z");
 const days=Array.from({length:31},(_,i)=>{
  const n=i+1,pi=n<=5?n:n>=7&&n<=11?n-6:null;
  const pairId=pi===null?null:"pair_"+String(pi).padStart(3,"0");
  const period=pi===null?null:n<=5?1:2;
  const role=pi===null?"ordinary":period===1?
   roles.get(pairId).period1Role:roles.get(pairId).period2Role;
  const shape=role==="alternative"?
    pi<=3?"2x2h":"up-to-6h":"4h";
  const start=base+i*7*D+i%6*4*H;
  return {
   runDayIndex:n,...segment(start,shape),utcSlot:slots[i%6],
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
 const calendar={
  schema:"v39.phase5.f8.crossover-calendar-candidate.v1",
  calendarSha256:SHA("c"),crossoverSeedSha256:seed,
  frozenRegionScheduleSha256:SHA("d"),frozenFrameSha256:SHA("e"),
  projectRestCeilingUnits:50000,otherRestCycleReservedUnits:2000,
  protectedRestFloorUnits:1000,days
 };
 const HOR={"T-24h":24*H,"T-6h":6*H,"T-90m":90*MS};
 const SLOT=["HUB","MID_A","MID_B","REGIONAL"];
 const p={
  schema:"v39.phase5.f8.segmented-fids-coverage-input.v1",
  calendar,reviewedProviderRangeContractSha256:SHA("f"),
  reviewedTimingContractSha256:SHA("a"),providerMaxRangeMinutes:240,
  maxPopulationStalenessSeconds:3600,schedulerSlipSeconds:60,
  responseAndPersistSeconds:120,preCommitMarginSeconds:120,
  apiUnitsPerPhysicalGet:2,projectCycleApiCeiling:50000,
  protectedApiFloorUnits:1000,cycleCategoryCaps:{},
  requests:[],utcChargeBudgets:[],expectedRequestSetSha256:""
 };
 let index=0;
 for(const day of days){
  const parts=partitionP5F8ServiceSegments(day,240);
  for(const slot of SLOT)for(const [horizon,offset] of Object.entries(HOR))
   for(const part of parts){
    const cutoffStart=Date.parse(part.partStartUtc)-offset;
    const cutoffEnd=Date.parse(part.partEndUtc)-offset;
    for(let t=cutoffStart;t<cutoffEnd;t+=50*MS){
     const get=t-5*MS;
     p.requests.push({
      queryKey:"p5-ci-"+String(++index).padStart(7,"0"),
      runDayIndex:day.runDayIndex,slot,horizon,
      airportIcao:day.airports[slot],segmentIndex:part.segmentIndex,
      partitionIndex:part.partitionIndex,
      serviceIntervalStartUtc:part.partStartUtc,
      serviceIntervalEndUtc:part.partEndUtc,
      scheduledGetUtc:iso(get),utcChargeDay:iso(get).slice(0,10),
      apiUnitsPerAttempt:2,maxPhysicalAttempts:1
     });
    }
   }
 }
 const byDate=new Map();
 for(const q of p.requests){
  const date=q.utcChargeDay;
  const categories=byDate.get(date)??Object.fromEntries(
    P5_STAGE22_CATEGORIES.map(k=>[k,0]));
  categories[q.partitionIndex===1?
    "FIDS_BASE_UNITS":"FIDS_SPLIT_UNITS"]+=2;
  byDate.set(date,categories);
 }
 for(const row of byDate.values()){
  row.FIDS_RETRY_UNIT_BUDGET=2;
  row.VALIDATION_UNIT_BUDGET=3;
  row.OUTCOME_REST_UNIT_BUDGET=4;
  row.HISTORY_BOOTSTRAP_UNIT_BUDGET=5;
  row.DIAGNOSTIC_UNIT_BUDGET=6;
 }
 p.utcChargeBudgets=[...byDate].sort((a,b)=>a[0].localeCompare(b[0])).
  map(([utcDay,categoryReservedUnits])=>({
   utcDay,restDailyCeilingUnits:1900,categoryReservedUnits
  }));
 p.cycleCategoryCaps=Object.fromEntries(
  P5_STAGE22_CATEGORIES.map(k=>[
   k,p.utcChargeBudgets.reduce((n,d)=>n+d.categoryReservedUnits[k],0)
  ])
 );
 p.expectedRequestSetSha256=digestP5Stage22Requests(p.requests);
 const input={
  schema:"v39.phase5.v0082.seven-rest-freeze-input.v1",
  manifestSha256:SHA("9"),configSha256:SHA("8"),frameSha256:SHA("e"),
  reviewedProviderRangeEvidenceSha256:SHA("f"),
  expectedStage22CoverageInputSha256:createHash("sha256").
   update(JSON.stringify(p)).digest("hex"),
  coverageInput:p
 };
 const candidate=createP5V0082SevenRestFreezeCandidate(input);
 return {coverageInput:p,freezeInput:input,candidate};
}
