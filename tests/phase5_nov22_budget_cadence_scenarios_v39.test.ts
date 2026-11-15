import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {proposeP5RealCorrectedPairDateGeometry} from "../server/lib/disruption/phase5CorrectedPairDateGeometryProposal_v39";
import {buildP5PrelaunchSlotBudgetEnvelope} from "../server/lib/disruption/phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import {partitionP5F8ServiceSegments} from "../server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs";
const source=JSON.parse(readFileSync("data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json","utf8"));
const date=proposeP5RealCorrectedPairDateGeometry({ownerCorrectedReadback:source,firstRunDateUtc:"2026-11-22"});
const h=3600000,m=60000,iso=(x:number)=>new Date(x).toISOString();
const pin=createHash("sha256").update("CI source-only scenario marker not provider evidence").digest("hex");
const other=["FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"];
const orders:number[][]=[];for(let i=1;i<=5;i++)for(let j=i+1;j<=5;j++)orders.push([i,j]);
function scenario(refresh:number,mult:number,alternativeFirst:number[]){
 const days=date.days.map(d=>{
  const p=d.pairId?Number(d.pairId.slice(5)):null;
  const alternative=p!==null&&(d.crossoverPeriod===1?alternativeFirst.includes(p):!alternativeFirst.includes(p));
  return {runDayIndex:d.runDayIndex,startUtc:d.conservativeStartUtc,utcSlot:d.utcSlot.slice(0,2),
   partition:d.runDayIndex<=20?"train":d.runDayIndex<=25?"validation":"test",
   windowShape:alternative?(p!<=3?"2x2h":"up-to-6h"):"4h"};
 });
 const charges=new Set<string>();let maxTemplates=0,maxPartition=0;
 for(const d of days){
  const a=Date.parse(d.startUtc),segments=d.windowShape==="2x2h"?[[a,a+2*h],[a+3*h,a+5*h]]:[[a,a+(d.windowShape==="4h"?4:6)*h]];
  let templates=0;
  for(const part of partitionP5F8ServiceSegments({segments:segments.map(([x,y])=>({startUtc:iso(x),endUtc:iso(y)}))},240)){
   const start=Date.parse(part.partStartUtc),end=Date.parse(part.partEndUtc);
   maxPartition=Math.max(maxPartition,Math.ceil((end-start)/(refresh*m)));
   for(const offset of [24*h,6*h,90*m])
    for(let t=start-offset-300000;t<end-offset-300000;t+=refresh*m){charges.add(iso(t).slice(0,10));templates+=4;}
  }
  maxTemplates=Math.max(maxTemplates,templates);
 }
 const input={schema:"v39.phase5.prelaunch-slot-budget-input.v1",
  manifestSha256:pin,calendarSha256:pin,configSha256:pin,frameSha256:pin,providerRangeEvidenceSha256:pin,timingEvidenceSha256:pin,
  asOfUtc:"2026-11-15T00:00:00.000Z",providerMaxRangeMinutes:240,refreshEveryMinutes:refresh,physicalGetsPerRefreshUpperBound:mult,
  getLeadSeconds:300,apiUnitsPerPhysicalGet:2,cycleRestCeilingUnits:50000,protectedRestFloorUnits:1000,
  calendarDays:days,restOtherByUtcDate:[...charges].sort().map(chargeDayUtc=>({chargeDayUtc,dailyRestCeilingUnits:1900,categories:Object.fromEntries(other.map(k=>[k,0]))}))};
 return {input,maxTemplates,maxPartition};
}
describe("prospective Nov22 source-only model across every balanced treatment allocation",()=>{
 it.each([[5,1,36864,1536,864],[10,1,18432,768,432],[15,1,12288,512,288],[30,1,6144,256,144],[60,1,3072,128,72],[10,2,36864,1536,432],[15,2,24576,1024,288]])("refresh %s multiplier %s: exact model and current compiler capacity",(refresh,mult,total,peak,templates)=>{
  expect(date.days).toHaveLength(31);expect(orders).toHaveLength(10);
  for(const order of orders){
   const x=scenario(refresh,mult,order),budget=buildP5PrelaunchSlotBudgetEnvelope(x.input);
   expect(budget.cycleSourceUnits).toBe(total);expect(Math.max(...budget.utcCategoryRows.map((r:any)=>r.fidsBaseUnits+r.fidsSplitUnits))).toBe(peak);
   expect(x.maxTemplates).toBe(templates);
   expect(budget.phase6PaidGo).toBe(false);
   if(refresh>=15){expect(x.maxTemplates).toBeLessThanOrEqual(384);expect(x.maxPartition).toBeLessThanOrEqual(32);}
  }
 });
 it("5m two-GET overbudget, 10m longest-day template limit, 5m per-partition limit",()=>{
  for(const order of orders){
   expect(()=>buildP5PrelaunchSlotBudgetEnvelope(scenario(5,2,order).input)).toThrow(/OVERSPENT|CEILING/);
   expect(scenario(10,1,order).maxTemplates).toBeGreaterThan(384);
   expect(scenario(5,1,order).maxPartition).toBeGreaterThan(32);
  }
 });
});
