import {describe,it,expect} from "vitest";
import {
 assessP5Stage11ContinuousCutoffGrid,
 P5_STAGE11_SCHEMA,type P5Stage11Grid
} from "../server/lib/disruption/phase5ContinuousPerFlightRefreshCoverage_v39";

const iso=(n:number)=>new Date(n).toISOString();
const date=(n:number)=>iso(n).slice(0,10);
const start=Date.parse("2027-01-01T14:00:00.000Z");
const DAY=86_400_000;
const H=[["T-24h",1440,"T24"],["T-6h",360,"T6"],
 ["T-90m",90,"T90"]] as const;
const S=[["HUB","WSSS"],["MID_A","OMAA"],
 ["MID_B","SKBO"],["REGIONAL","KGPT"]] as const;
function sample(refreshes:number):P5Stage11Grid{
 const days:P5Stage11Grid["days"]=[],gets:P5Stage11Grid["gets"]=[];
 for(let i=1;i<=31;i++){
   const t=start+(i-1)*DAY;
   days.push({
    runDayIndex:i,serviceDateUtc:date(t),
    serviceWindowStartUtc:iso(t),
    serviceWindowEndUtc:iso(t+4*3_600_000),
    airports:{HUB:"WSSS",MID_A:"OMAA",MID_B:"SKBO",REGIONAL:"KGPT"},
    windowShape:i%2===0?"2x2h":"4h"
   });
   for(const [slot,icao] of S)for(const [h,m,label] of H){
     // Source is requested 5m before first flight cutoff then every 50m.
     // Worst-case slip+persist+commit = 5m, first usable source at cutoff.
     for(let j=0;j<refreshes;j++){
       const at=t-m*60_000-5*60_000+j*50*60_000;
       gets.push({
         queryKey:"p5_refresh_"+i+"_"+slot+"_"+label+"_"+j,
         runDayIndex:i,slot,horizon:h,airportIcao:icao,
         serviceWindowStartUtc:iso(t),
         serviceWindowEndUtc:iso(t+4*3_600_000),
         scheduledGetUtc:iso(at),actualChargeDayUtc:date(at),
         apiUnitsPerAttempt:2,maxPhysicalAttempts:1
       });
     }
   }
 }
 const frozenChargeDayDates=[
   ...new Set([...days.map(d=>d.serviceDateUtc),
     ...gets.map(g=>g.actualChargeDayUtc)])
 ].sort();
 return {
   schema:P5_STAGE11_SCHEMA,
   startServiceDateUtc:date(start),
   calendarSha256:"a".repeat(64),configSha256:"b".repeat(64),
   frameSha256:"c".repeat(64),providerContractSha256:"d".repeat(64),
   days,gets,maxPopulationStalenessSeconds:3600,
   maxSchedulerSlipSeconds:60,
   maxResponseAndPersistSeconds:120,
   minimumPreCommitMarginSeconds:120,
   verifiedProviderMaxFidsRangeMinutes:240,
   apiUnitsPerPhysicalGet:2,
   projectCycleApiCeiling:50000,
   otherCategoryCycleReservedUnits:1000,
   protectedProjectApiFloorUnits:1000,
   chargeDayBudgets:frozenChargeDayDates.map(d=>({
     chargeDayUtc:d,dailyApiCeiling:1900,
     otherCategoryReservedUnits:60,alreadyReservedFidsUnits:0
   }))
 };
}
describe("Phase5 Stage11 complete per-flight source refresh coverage (PURE)",()=>{
 it("correctly HOLDS 31d×4×3 single-GET candidate as unable to cover 4h",()=>{
   const a=assessP5Stage11ContinuousCutoffGrid(sample(1));
   expect(a.status).toBe("HOLD_REFRESH_GAPS_CANNOT_COVER_ALL_FLIGHT_CUTOFFS");
   expect(a.serviceDays).toBe(31);
   expect(a.numberOfAirportHorizonGroups).toBe(372);
   expect(a.plannedPhysicalGets).toBe(372);
   expect(a.candidateFidsApiUnits).toBe(744);
   expect(a.gaps).toHaveLength(372);
   expect(a.gaps[0].uncoveredSeconds).toBe(3*3600+5*60);
   expect(a.allHypotheticalCutoffInstantsCovered).toBe(false);
   expect(a.phase6PaidGo).toBe(false);
 });
 it("allows a fully continuous 5-refresh hypothetical plan but never scientific GO",()=>{
   const a=assessP5Stage11ContinuousCutoffGrid(sample(5));
   expect(a.status).toBe("CANDIDATE_GRID_TEMPORAL_COVERAGE_ONLY_NOT_RELEASED");
   expect(a.gaps).toHaveLength(0);
   expect(a.plannedPhysicalGets).toBe(1860);
   expect(a.candidateFidsApiUnits).toBe(3720);
   expect(a.physicalUtcChargeDays).toBe(32);
   expect(a.byUtcChargeDay[0].day).toBe("2026-12-31");
   expect(a.allHypotheticalCutoffInstantsCovered).toBe(true);
   expect(a.actualProviderAvailabilityCertified).toBe(false);
   expect(a.nativeSelectedTAndPhysicalLegCertified).toBe(false);
   expect(a.perFlightDurablePreWritten).toBe(false);
   expect(a.providerUseAndRetentionCertified).toBe(false);
   expect(a.phase5FreezePassed).toBe(false);
   expect(a.phase6PaidGo).toBe(false);
 });
 it("identifies a genuine 50min late-day coverage hole without fabricating a PRE",()=>{
   const p=sample(5);
   p.gets=p.gets.filter(x=>!x.queryKey.endsWith("_4"));
   const a=assessP5Stage11ContinuousCutoffGrid(p);
   expect(a.gaps.length).toBeGreaterThan(300);
   expect(a.allHypotheticalCutoffInstantsCovered).toBe(false);
 });
 it("refuses unknown or physically impossible latency, staleness or range",()=>{
   const x=sample(5);x.maxPopulationStalenessSeconds=300;
   expect(()=>assessP5Stage11ContinuousCutoffGrid(x))
      .toThrow("IMPOSSIBLE_STALENESS_VS_LATENCY");
   const y=sample(5);y.verifiedProviderMaxFidsRangeMinutes=120;
   expect(()=>assessP5Stage11ContinuousCutoffGrid(y))
      .toThrow("SERVICE_INTERVAL_OR_PROVIDER_MAX_RANGE");
   const z=sample(5);z.maxPopulationStalenessSeconds=0;
   expect(()=>assessP5Stage11ContinuousCutoffGrid(z))
      .toThrow("STALENESS_UNFROZEN");
 });
 it("never attributes an actual billed GET to flight service date by assumption",()=>{
   const p=sample(5);
   const before=p.gets[0].actualChargeDayUtc;
   p.gets[0].actualChargeDayUtc=date(
     Date.parse(p.gets[0].scheduledGetUtc)+DAY);
   expect(p.gets[0].actualChargeDayUtc).not.toBe(before);
   expect(()=>assessP5Stage11ContinuousCutoffGrid(p))
      .toThrow("PHYSICAL_UTC_CHARGE_DAY_MISMATCH");
 });
 it("requires the explicit full charge-day budget, Day0 included",()=>{
   const p=sample(5);
   p.chargeDayBudgets.shift();
   expect(()=>assessP5Stage11ContinuousCutoffGrid(p))
      .toThrow("FROZEN_CHARGE_DAY_BUDGETS");
   const p2=sample(5);
   p2.chargeDayBudgets[0].otherCategoryReservedUnits=1890;
   expect(()=>assessP5Stage11ContinuousCutoffGrid(p2))
      .toThrow("DAILY_TOTAL_REST_RESERVATION_EXCEEDED");
 });
 it("rejects duplicate airports, tampered query contract and unbounded cost",()=>{
   const a=sample(5);
   a.days[0].airports.MID_A="WSSS";
   expect(()=>assessP5Stage11ContinuousCutoffGrid(a))
      .toThrow("UNFROZEN_FOUR_SELECTED_AIRPORTS");
   const b=sample(5);
   b.gets[2].serviceWindowStartUtc=iso(start+3_600_000);
   expect(()=>assessP5Stage11ContinuousCutoffGrid(b))
      .toThrow("GET_CHANGED_FROZEN_SERVICE_FRAME");
   const c=sample(5);
   c.projectCycleApiCeiling=4000;
   expect(()=>assessP5Stage11ContinuousCutoffGrid(c))
      .toThrow("CYCLE_REST_RESERVATION_EXCEEDED");
 });
 it("rejects duplicate/missing 31-day calendar and stale provider contract SHA",()=>{
   const a=sample(5);a.days[1].runDayIndex=1;
   expect(()=>assessP5Stage11ContinuousCutoffGrid(a)).toThrow();
   const b=sample(5);b.providerContractSha256="unverified";
   expect(()=>assessP5Stage11ContinuousCutoffGrid(b))
      .toThrow("UNSIGNED_CALENDAR_OR_SOURCE_CONTRACT");
 });
});
