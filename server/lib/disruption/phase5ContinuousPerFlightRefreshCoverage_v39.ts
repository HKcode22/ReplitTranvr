/**
 * Phase5 Stage11 — 31-day continuous per-flight cutoff COVERAGE planning.
 * Offline-only, NOT actual provider FIDS, native selected T, budget admission,
 * final Phase5 FREEZE or Phase6 authorization.
 *
 * Plan f.8 §5.2 requires a source refresh grid across the entire 4h flight
 * service window. One GET before the earliest T-h cutoff does not provide a
 * fresh source for all later flight-specific cutoffs. This checks the full
 * continuous cutoff interval, even before any particular flight is known.
 */
import {createHash} from "node:crypto";
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const DAY=/^\d{4}-\d\d-\d\d$/;
const MS_DAY=86_400_000;
const H=[
 ["T-24h",86_400_000],["T-6h",21_600_000],["T-90m",5_400_000]
] as const;
const S=["HUB","MID_A","MID_B","REGIONAL"] as const;
type Horizon=typeof H[number][0];
type Slot=typeof S[number];
export const P5_STAGE11_SCHEMA="v39.phase5.stage11.continuous-cutoff-source-grid.v1" as const;
const refuse=(r:string):never=>{throw Error("REFUSED_P5_STAGE11_REFRESH_GRID_"+r);};
const iso=(n:number)=>new Date(n).toISOString();
function stamp(v:string,label:string):number{
 if(typeof v!=="string"||!UTC.test(v)||!Number.isFinite(Date.parse(v))||
    iso(Date.parse(v))!==v)refuse(label);
 return Date.parse(v);
}
function day(v:string,label:string):number{
 if(typeof v!=="string"||!DAY.test(v))refuse(label);
 const n=Date.parse(v+"T00:00:00.000Z");
 if(!Number.isFinite(n)||iso(n).slice(0,10)!==v)refuse(label);
 return n;
}
function num(v:unknown,label:string,min:number,max:number):number{
 if(!Number.isSafeInteger(v)||Number(v)<min||Number(v)>max)refuse(label);
 return Number(v);
}
export interface P5Stage11FrozenDay{
 runDayIndex:number;serviceDateUtc:string;
 serviceWindowStartUtc:string;serviceWindowEndUtc:string;
 airports:Record<Slot,string>;
 /** 2x2 child segments require separate independently verified range proof. */
 windowShape:"4h"|"2x2h";
}
export interface P5Stage11PlannedGet{
 queryKey:string;runDayIndex:number;slot:Slot;horizon:Horizon;
 airportIcao:string;serviceWindowStartUtc:string;serviceWindowEndUtc:string;
 scheduledGetUtc:string;actualChargeDayUtc:string;
 apiUnitsPerAttempt:2;maxPhysicalAttempts:1;
}
export interface P5Stage11ChargeDay{
 chargeDayUtc:string;dailyApiCeiling:number;otherCategoryReservedUnits:number;
 alreadyReservedFidsUnits:number;
}
export interface P5Stage11Grid{
 schema:typeof P5_STAGE11_SCHEMA;
 startServiceDateUtc:string;
 calendarSha256:string;configSha256:string;frameSha256:string;
 providerContractSha256:string;
 days:P5Stage11FrozenDay[];
 gets:P5Stage11PlannedGet[];
 /** These values require external measurement + release, not hardcoded guesses. */
 maxPopulationStalenessSeconds:number;
 maxSchedulerSlipSeconds:number;
 maxResponseAndPersistSeconds:number;
 minimumPreCommitMarginSeconds:number;
 /** This path models one whole-window request, no undocumented split support. */
 verifiedProviderMaxFidsRangeMinutes:number;
 apiUnitsPerPhysicalGet:2;
 projectCycleApiCeiling:number;
 otherCategoryCycleReservedUnits:number;
 protectedProjectApiFloorUnits:number;
 chargeDayBudgets:P5Stage11ChargeDay[];
}
export interface P5Stage11CoverageGap{
 runDayIndex:number;slot:Slot;horizon:Horizon;
 firstUncoveredCutoffUtc:string;
 uncoveredSeconds:number;
}
export interface P5Stage11Assessment{
 schema:"v39.phase5.stage11.refresh-coverage-audit-result.v1";
 status:"CANDIDATE_GRID_TEMPORAL_COVERAGE_ONLY_NOT_RELEASED"|
        "HOLD_REFRESH_GAPS_CANNOT_COVER_ALL_FLIGHT_CUTOFFS";
 candidateGridSha256:string;serviceDays:31;
 numberOfAirportHorizonGroups:372;
 plannedPhysicalGets:number;candidateFidsApiUnits:number;
 physicalUtcChargeDays:number;
 byUtcChargeDay:{day:string;fidsGets:number;fidsUnits:number;
   otherReservedUnits:number;alreadyReservedFidsUnits:number;
   combinedReservedUnits:number}[];
 gaps:P5Stage11CoverageGap[];
 allHypotheticalCutoffInstantsCovered:boolean;
 actualProviderAvailabilityCertified:false;
 actualFlightPopulationCertified:false;
 nativeSelectedTAndPhysicalLegCertified:false;
 perFlightDurablePreWritten:false;
 providerUseAndRetentionCertified:false;
 phase5FreezePassed:false;phase6PaidGo:false;
}
export function assessP5Stage11ContinuousCutoffGrid(
 p:P5Stage11Grid
):P5Stage11Assessment{
 if(!p||p.schema!==P5_STAGE11_SCHEMA||
   ![p.calendarSha256,p.configSha256,p.frameSha256,p.providerContractSha256]
   .every(x=>typeof x==="string"&&SHA.test(x)))
   refuse("UNSIGNED_CALENDAR_OR_SOURCE_CONTRACT");
 const first=day(p.startServiceDateUtc,"SERVICE_START_DATE");
 const stale=num(p.maxPopulationStalenessSeconds,"STALENESS_UNFROZEN",1,86_400)*1000;
 const slip=num(p.maxSchedulerSlipSeconds,"SCHEDULER_SLIP_UNFROZEN",0,3600)*1000;
 const persist=num(p.maxResponseAndPersistSeconds,"PERSIST_BOUND_UNFROZEN",1,3600)*1000;
 const commit=num(p.minimumPreCommitMarginSeconds,"PRE_MARGIN_UNFROZEN",2,900)*1000;
 const maxRange=num(p.verifiedProviderMaxFidsRangeMinutes,
   "PROVIDER_RANGE_UNVERIFIED",1,1440)*60_000;
 if(stale<=slip+persist+commit)
   refuse("IMPOSSIBLE_STALENESS_VS_LATENCY_AND_COMMIT_MARGIN");
 if(p.apiUnitsPerPhysicalGet!==2)
   refuse("V0079_PROVISIONAL_TWO_UNIT_PRICE_CONTRACT_CHANGED");
 const cycle=num(p.projectCycleApiCeiling,"PROJECT_CYCLE_CEILING",1,50000);
 const otherCycle=num(p.otherCategoryCycleReservedUnits,
   "OTHER_CYCLE_RESERVATIONS_UNFROZEN",0,50000);
 const floor=num(p.protectedProjectApiFloorUnits,
   "PROTECTED_PROJECT_API_FLOOR_UNFROZEN",0,50000);
 if(!Array.isArray(p.days)||p.days.length!==31||
    !Array.isArray(p.gets)||p.gets.length<372||p.gets.length>12000)
   refuse("INCOMPLETE_OR_UNBOUNDED_31_DAY_SOURCE_GRID");
 const grouped=new Map<string,{start:number;end:number;ica:string;
   queries:{requested:number;key:string}[];day:number;slot:Slot;horizon:Horizon}>();
 for(const d of p.days){
   num(d.runDayIndex,"RUN_DAY_INDEX",1,31);
   if(day(d.serviceDateUtc,"SERVICE_DAY")!==first+(d.runDayIndex-1)*MS_DAY)
     refuse("NONCONTIGUOUS_31_DAY_CALENDAR");
   const start=stamp(d.serviceWindowStartUtc,"SERVICE_WINDOW_START"),
     end=stamp(d.serviceWindowEndUtc,"SERVICE_WINDOW_END");
   if(start<day(d.serviceDateUtc,"SERVICE_DAY")||
      start>=day(d.serviceDateUtc,"SERVICE_DAY")+MS_DAY||
      end-start!==4*3_600_000||
      !["4h","2x2h"].includes(d.windowShape)||end-start>maxRange)
     refuse("SERVICE_INTERVAL_OR_PROVIDER_MAX_RANGE_NOT_VERIFIED");
   if(!d.airports||Object.keys(d.airports).length!==4||
      new Set(Object.values(d.airports)).size!==4||
      S.some(slot=>!/^[A-Z]{4}$/.test(d.airports[slot]??"")))
     refuse("UNFROZEN_FOUR_SELECTED_AIRPORTS");
   for(const slot of S)for(const [horizon,delta] of H){
     const key=d.runDayIndex+"|"+slot+"|"+horizon;
     if(grouped.has(key))refuse("DUPLICATE_SERVICE_DAY");
     grouped.set(key,{start:start-delta,end:end-delta,
       ica:d.airports[slot],queries:[],day:d.runDayIndex,slot,horizon});
   }
 }
 if(grouped.size!==31*4*3)refuse("MISSING_HORIZON_GROUPS");
 const keys=new Set<string>();
 const paid=new Map<string,{queries:number;units:number}>();
 for(const q of p.gets){
   if(!q||!Number.isInteger(q.runDayIndex)||
     !S.includes(q.slot)||!H.some(x=>x[0]===q.horizon)||
     !/^[a-zA-Z0-9_.:-]{8,150}$/.test(q.queryKey??"")||
     keys.has(q.queryKey))refuse("DUPLICATE_OR_UNREVIEWED_QUERY");
   keys.add(q.queryKey);
   const g=grouped.get(q.runDayIndex+"|"+q.slot+"|"+q.horizon);
   if(!g)throw Error("REFUSED_P5_STAGE11_REFRESH_GRID_GET_NOT_IN_FROZEN_DAY");
   if(q.airportIcao!==g.ica||
      stamp(q.serviceWindowStartUtc,"QUERY_WINDOW_START")!==
        g.start+H.find(x=>x[0]===q.horizon)![1]||
      stamp(q.serviceWindowEndUtc,"QUERY_WINDOW_END")!==
        g.end+H.find(x=>x[0]===q.horizon)![1]||
      q.apiUnitsPerAttempt!==2||q.maxPhysicalAttempts!==1)
     refuse("GET_CHANGED_FROZEN_SERVICE_FRAME_OR_PRICE");
   const request=stamp(q.scheduledGetUtc,"SIGNED_GET_TIME"),
     physicalDate=iso(request).slice(0,10);
   if(q.actualChargeDayUtc!==physicalDate)
     refuse("PHYSICAL_UTC_CHARGE_DAY_MISMATCH");
   if(g.queries.length>=32)refuse("UNBOUNDED_REFRESHES_PER_GROUP");
   g.queries.push({requested:request,key:q.queryKey});
   const x=paid.get(physicalDate)??{queries:0,units:0};
   x.queries++;x.units+=2;paid.set(physicalDate,x);
 }
 const gaps:P5Stage11CoverageGap[]=[];
 for(const g of grouped.values()){
   if(!g.queries.length)refuse("MISSING_GROUP_QUERY");
   // Conservative interval: provider original may be durable as late as
   // GET + scheduler slip + response/persist; may be as early as GET.
   // Thus every hypothetical cutoff is covered only if a request could be
   // guaranteed available with committed PRE margin yet is not too stale.
   const intervals=g.queries.map(q=>({
     start:q.requested+slip+persist+commit,
     end:q.requested+stale
   })).sort((a,b)=>a.start-b.start);
   let covered=g.start;
   for(const x of intervals){
     if(x.end<=covered)continue;
     if(x.start>covered){
       const end=Math.min(x.start,g.end);
       if(end>covered)gaps.push({
         runDayIndex:g.day,slot:g.slot,horizon:g.horizon,
         firstUncoveredCutoffUtc:iso(covered),
         uncoveredSeconds:(end-covered)/1000
       });
       covered=end;
     }
     covered=Math.max(covered,Math.min(g.end,x.end));
     if(covered>=g.end)break;
   }
   if(covered<g.end)gaps.push({
     runDayIndex:g.day,slot:g.slot,horizon:g.horizon,
     firstUncoveredCutoffUtc:iso(covered),
     uncoveredSeconds:(g.end-covered)/1000
   });
 }
 // A complete frozen REST budget covers EVERY physical charge day, Day0
 // included, and every service date even where a source is missing.
 const chargeDates=new Set<string>(p.days.map(d=>d.serviceDateUtc));
 for(const date of paid.keys())chargeDates.add(date);
 if(!Array.isArray(p.chargeDayBudgets)||
   p.chargeDayBudgets.length!==chargeDates.size)
   refuse("FROZEN_CHARGE_DAY_BUDGETS_MISSING_OR_EXTRA");
 const budgets=new Map<string,P5Stage11ChargeDay>();
 for(const b of p.chargeDayBudgets){
   if(!b||budgets.has(b.chargeDayUtc)||
     !chargeDates.has(b.chargeDayUtc)||
     day(b.chargeDayUtc,"BUDGET_CHARGE_DAY")<first-3*MS_DAY||
     num(b.dailyApiCeiling,"DAILY_PROJECT_API_CEILING",2,1900)<2)
     refuse("INVALID_UTC_CHARGE_DAY_LEDGER");
   num(b.otherCategoryReservedUnits,"DAILY_OTHER_CATEGORY_UNFROZEN",0,1900);
   num(b.alreadyReservedFidsUnits,"DAILY_EXISTING_FIDS_UNFROZEN",0,1900);
   budgets.set(b.chargeDayUtc,b);
 }
 let spend=0;
 const byUtcChargeDay=[...chargeDates].sort().map(d=>{
   const b=budgets.get(d);
   if(!b)refuse("MISSING_PHYSICAL_CHARGE_DAY_LEDGER");
   const f=paid.get(d)??{queries:0,units:0};
   const combined=f.units+b.otherCategoryReservedUnits+b.alreadyReservedFidsUnits;
   if(combined>b.dailyApiCeiling)
     refuse("DAILY_TOTAL_REST_RESERVATION_EXCEEDED");
   spend+=f.units;
   return {day:d,fidsGets:f.queries,fidsUnits:f.units,
     otherReservedUnits:b.otherCategoryReservedUnits,
     alreadyReservedFidsUnits:b.alreadyReservedFidsUnits,
     combinedReservedUnits:combined};
 });
 if(spend+otherCycle+floor>cycle)
   refuse("CYCLE_REST_RESERVATION_EXCEEDED");
 return {
   schema:"v39.phase5.stage11.refresh-coverage-audit-result.v1",
   status:gaps.length?
     "HOLD_REFRESH_GAPS_CANNOT_COVER_ALL_FLIGHT_CUTOFFS":
     "CANDIDATE_GRID_TEMPORAL_COVERAGE_ONLY_NOT_RELEASED",
   candidateGridSha256:createHash("sha256").update(JSON.stringify(p)).digest("hex"),
   serviceDays:31,numberOfAirportHorizonGroups:372,
   plannedPhysicalGets:p.gets.length,candidateFidsApiUnits:spend,
   physicalUtcChargeDays:chargeDates.size,byUtcChargeDay,gaps,
   allHypotheticalCutoffInstantsCovered:gaps.length===0,
   actualProviderAvailabilityCertified:false,
   actualFlightPopulationCertified:false,
   nativeSelectedTAndPhysicalLegCertified:false,
   perFlightDurablePreWritten:false,
   providerUseAndRetentionCertified:false,
   phase5FreezePassed:false,phase6PaidGo:false
 };
}
