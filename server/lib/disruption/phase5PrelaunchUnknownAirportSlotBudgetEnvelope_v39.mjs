/**
 * Phase5 PRE-LAUNCH budget-envelope candidate for unknown future adaptive sites.
 *
 * Four airport SLOT positions, three prospective PRE horizons, exact dated
 * window shapes, source range partitions and explicit refresh times are enough
 * to plan a conservative REST spending envelope without pretending that all
 * 21 ordinary-day airport identities already exist.
 *
 * This is NOT a Stage22 real-ICAO SOURCE query grid, an independently certified
 * provider account limit, a signed V0082 release, or Phase6 authorization.
 * No database, network, paid provider or flight-data access.
 */
import {createHash} from "node:crypto";
import {partitionP5F8ServiceSegments} from "./phase5F8SegmentedSourceCoverage_v39.mjs";

const D=86_400_000,H=3_600_000,M=60_000;
const SHA=/^[0-9a-f]{64}$/;
const DATE=/^\d{4}-\d\d-\d\d$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const HORIZONS=[["T-24h",24*H],["T-6h",6*H],["T-90m",90*M]];
const OTHER=[
 "FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET",
 "OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET",
 "DIAGNOSTIC_UNIT_BUDGET"
];
const sha=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const hold=x=>{throw Error("REFUSED_P5_PRELAUNCH_SLOT_ENVELOPE_"+x);};
const integer=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const at=x=>typeof x==="string"&&ISO.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x
 ?Date.parse(x):hold("INVALID_EXACT_UTC");
const canonicalDate=x=>typeof x==="string"&&DATE.test(x)&&
 Number.isFinite(Date.parse(x+"T00:00:00.000Z"))&&
 new Date(Date.parse(x+"T00:00:00.000Z")).toISOString().slice(0,10)===x;
const segments=(start,shape)=>{
 if(shape==="4h")return [{startUtc:new Date(start).toISOString(),
  endUtc:new Date(start+4*H).toISOString()}];
 if(shape==="up-to-6h")return [{startUtc:new Date(start).toISOString(),
  endUtc:new Date(start+6*H).toISOString()}];
 if(shape==="2x2h")return [
  {startUtc:new Date(start).toISOString(),endUtc:new Date(start+2*H).toISOString()},
  {startUtc:new Date(start+3*H).toISOString(),endUtc:new Date(start+5*H).toISOString()}
 ];
 hold("UNKNOWN_TREATMENT_WINDOW_SHAPE");
};

/**
 * Takes a separately reviewed DATE/SHAPE plan. Ordinary-day airport identities
 * are intentionally not supplied or inferred. Each request is a cost slot,
 * not a real FIDS query. Page/attempt multiplier must cover real provider
 * pagination and retry exposure before signing a live budget.
 */
export function buildP5PrelaunchSlotBudgetEnvelope(p){
 if(!p||p.schema!=="v39.phase5.prelaunch-slot-budget-input.v1"||
    ![p.manifestSha256,p.calendarSha256,p.configSha256,p.frameSha256,
      p.providerRangeEvidenceSha256,p.timingEvidenceSha256].every(x=>
       typeof x==="string"&&SHA.test(x))||
    !integer(p.providerMaxRangeMinutes,1,360)||
    !integer(p.refreshEveryMinutes,1,240)||
    !integer(p.physicalGetsPerRefreshUpperBound,1,10)||
    !integer(p.getLeadSeconds,1,900)||
    p.apiUnitsPerPhysicalGet!==2||
    !integer(p.cycleRestCeilingUnits,2,50000)||
    !integer(p.protectedRestFloorUnits,0,50000)||
    !Array.isArray(p.calendarDays)||p.calendarDays.length!==31||
    !Array.isArray(p.restOtherByUtcDate))
   hold("MISSING_REVIEWED_SHAPE_RANGE_OR_FINANCIAL_INPUTS");
 const asOf=at(p.asOfUtc);
 const counts={"4h":0,"2x2h":0,"up-to-6h":0};
 const byDate=new Map();
 let prevEnd=-Infinity,physicalGets=0,partitionGroups=0;
 const dayIndex=new Set();
 for(const [idx,day] of p.calendarDays.entries()){
  if(day.runDayIndex!==idx+1||dayIndex.has(day.runDayIndex)||
     !["4h","2x2h","up-to-6h"].includes(day.windowShape)||
     !["train","validation","test"].includes(day.partition)||
     day.partition!==(idx<20?"train":idx<25?"validation":"test"))
   hold("UNFROZEN_31_DAY_SHAPE_OR_PROTECTED_SPLIT");
  dayIndex.add(day.runDayIndex);
  const start=at(day.startUtc);
  if(day.utcSlot!==day.startUtc.slice(11,13)||
     !["00","04","08","12","16","20"].includes(day.utcSlot)||
     start<prevEnd)
   hold("UNFROZEN_UTC_SLOT_OR_OVERLAPPING_PARENT");
  counts[day.windowShape]++;
  const seg=segments(start,day.windowShape);
  prevEnd=Date.parse(seg.at(-1).endUtc);
  const partitions=partitionP5F8ServiceSegments(
   {segments:seg},p.providerMaxRangeMinutes);
  for(const part of partitions)for(const [horizon,offset] of HORIZONS){
   const first=at(part.partStartUtc)-offset-p.getLeadSeconds*1000;
   const last=at(part.partEndUtc)-offset-p.getLeadSeconds*1000;
   if(first<=asOf)hold("FIRST_PLANNED_SOURCE_SLOT_ALREADY_PAST");
   for(let time=first;time<last;time+=p.refreshEveryMinutes*M){
    const utcDate=new Date(time).toISOString().slice(0,10);
    const base=part.partitionIndex===1?"FIDS_BASE_UNITS":"FIDS_SPLIT_UNITS";
    const row=byDate.get(utcDate)??{
     chargeDayUtc:utcDate,fidsBaseUnits:0,fidsSplitUnits:0,
     logicalRefreshSlots:0,physicalGetUpperBound:0
    };
    const upper=4*p.physicalGetsPerRefreshUpperBound;
    row[base==="FIDS_BASE_UNITS"?"fidsBaseUnits":"fidsSplitUnits"]+=
      upper*p.apiUnitsPerPhysicalGet;
    row.logicalRefreshSlots+=4;
    row.physicalGetUpperBound+=upper;
    byDate.set(utcDate,row);
    physicalGets+=upper;
   }
   partitionGroups+=4;
   if(!["T-24h","T-6h","T-90m"].includes(horizon))
    hold("UNKNOWN_HORIZON");
  }
 }
 if(counts["4h"]!==26||counts["2x2h"]!==3||
    counts["up-to-6h"]!==2)
  hold("F8_26_3_2_EXPOSURE_GEOMETRY_MISMATCH");
 if(byDate.size<31||byDate.size>100||partitionGroups<408)
  hold("INSUFFICIENT_PHYSICAL_UTC_CHARGE_DAY_COVERAGE");
 const sourceByUtcDate=[...byDate.values()].sort((a,b)=>
   a.chargeDayUtc.localeCompare(b.chargeDayUtc));
 const others=new Map();
 for(const d of p.restOtherByUtcDate){
  if(!d||!canonicalDate(d.chargeDayUtc)||
     others.has(d.chargeDayUtc)||
     !integer(d.dailyRestCeilingUnits,2,1900)||
     !d.categories||Object.keys(d.categories).length!==5||
     OTHER.some(k=>!integer(d.categories[k],0,50000)))
   hold("UNSIGNED_OR_INCOMPLETE_FIVE_OTHER_REST_CATEGORIES");
  others.set(d.chargeDayUtc,d);
 }
 if(others.size!==sourceByUtcDate.length||
    sourceByUtcDate.some(d=>!others.has(d.chargeDayUtc)))
  hold("SOURCE_AND_OTHER_UTC_CHARGE_DATES_NOT_EXACT");
 let cycleSourceUnits=0,cycleOtherUnits=0;
 const utcCategoryRows=sourceByUtcDate.map(d=>{
  const other=others.get(d.chargeDayUtc);
  const extra=OTHER.reduce((s,k)=>s+other.categories[k],0);
  const source=d.fidsBaseUnits+d.fidsSplitUnits;
  if(extra+source>other.dailyRestCeilingUnits)
   hold("PHYSICAL_UTC_REST_BUDGET_OVERSPENT");
  cycleSourceUnits+=source;cycleOtherUnits+=extra;
  return {...d,dailyRestCeilingUnits:other.dailyRestCeilingUnits,
   dailyOtherReservedUnits:extra,categories:{
    FIDS_BASE_UNITS:d.fidsBaseUnits,FIDS_SPLIT_UNITS:d.fidsSplitUnits,
    ...other.categories}};
 });
 if(cycleSourceUnits!==physicalGets*p.apiUnitsPerPhysicalGet||
    cycleSourceUnits+cycleOtherUnits+p.protectedRestFloorUnits>
      p.cycleRestCeilingUnits)
  hold("PROTECTED_CYCLE_REST_CEILING_EXCEEDED");
 const core={
  schema:"v39.phase5.prelaunch-unknown-icao-slot-budget-envelope.v1",
  manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,
  configSha256:p.configSha256,frameSha256:p.frameSha256,
  providerRangeEvidenceSha256:p.providerRangeEvidenceSha256,
  timingEvidenceSha256:p.timingEvidenceSha256,
  asOfUtc:p.asOfUtc,providerMaxRangeMinutes:p.providerMaxRangeMinutes,
  refreshEveryMinutes:p.refreshEveryMinutes,
  physicalGetsPerRefreshUpperBound:p.physicalGetsPerRefreshUpperBound,
  apiUnitsPerPhysicalGet:p.apiUnitsPerPhysicalGet,
  cycleRestCeilingUnits:p.cycleRestCeilingUnits,
  protectedRestFloorUnits:p.protectedRestFloorUnits,
  cycleSourceUnits,cycleOtherUnits,physicalGetsUpperBound:physicalGets,
  sourcePlanningPartitionGroups:partitionGroups,
  utcCategoryRows
 };
 return {...core,prelaunchEnvelopeSha256:sha(core),
  status:"SLOT_BUDGET_ONLY_CANDIDATE_AIRPORT_IDENTITIES_NOT_FROZEN",
  ordinaryAdaptiveAirportDaysUnselected:21,
  actualFlightQueryGridCertified:false,
  actualSourceLicenseCertified:false,
  physicalGetReservations:0,databaseWrites:0,providerCalls:0,
  phase5ScientificFreezePassed:false,phase6PaidGo:false};
}
