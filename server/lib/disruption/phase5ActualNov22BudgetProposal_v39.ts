/** Actual first commitment replay and proposed seven-category cap review.
 * Never treat model assumptions as provider or independent review evidence.
 * No stage input, SQL, credentials, new randomness, HTTP, or activation.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {buildP5PrelaunchSlotBudgetEnvelope} from "./phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import type {P5PrelaunchSlotBudgetInput,P5PrelaunchSlotChargeDayInput} from "./phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import type {buildP5ActualFivePairB0062CalendarOnlyDraft} from "./phase5RealFivePairB0062CalendarOnlyDraft_v39";
import {partitionP5F8ServiceSegments} from "./phase5F8SegmentedSourceCoverage_v39.mjs";
const sha=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const hash=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
const H=3600000,M=60000,D=86400000;
const hold=(s:string):never=>{throw Error("HOLD_P5_ACTUAL_NOV22_BUDGET_"+s);};
type Draft=ReturnType<typeof buildP5ActualFivePairB0062CalendarOnlyDraft>;
const expectedDraft="46a4d2cd3f0da28365f43a66e3dfcb740a3393434425299b6c22e38322919333";
const expectedRows="45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c";
const reset=Date.parse("2026-12-04T02:21:21.000Z");
const asOf="2026-11-15T09:37:44.000Z";
const day=(x:number)=>new Date(x).toISOString().slice(0,10);
const iso=(x:number)=>new Date(x).toISOString();
const settings=Object.freeze({providerMaxRangeMinutes:240,refreshEveryMinutes:15,
 physicalGetsPerRefreshUpperBound:1,getLeadSeconds:900,apiUnitsPerPhysicalGet:2 as const,
 cycleRestCeilingUnits:50000,protectedRestFloorUnits:1000,dailyRestCeilingUnits:1900,
 retryReserveFractionOfSourceUnits:0.1,validationUnitsPerActiveServiceDate:16,
 outcomeUnitsPerEligiblePhysicalDate:640,outcomeTailAfterSegmentEndHours:48,
 historyBootstrapPaidUnits:0,diagnosticUnitsPerBudgetDate:8});
export function proposeP5ActualNov22Budget(draft:Draft){
 if(sha(draft)!==expectedDraft||sha(draft.calendarDays)!==expectedRows||
    draft.proposedCalendarRowsSha256!==expectedRows||draft.phase6PaidGo!==false||
    draft.calendarDays.length!==31||draft.futureOrdinaryAirportsSelected!==0)
  hold("FIRST_REAL_CALENDAR_BYTES_REQUIRED");
 const physicalSource=new Map<string,{base:number;split:number}>();
 const activeDates=new Set<string>(),outcomeDates=new Set<string>();
 let sourceBeforeReset=0,sourceAfterReset=0;
 const dates=(a:number,b:number,set:Set<string>)=>{
  for(let t=Date.parse(day(a)+"T00:00:00.000Z");t<=b;t+=D)set.add(day(t));
 };
 for(const d of draft.calendarDays){
  const start=Date.parse(d.startUtc);
  const segments=d.windowShape==="2x2h"?[[start,start+2*H],[start+3*H,start+5*H]]:
   [[start,start+(d.windowShape==="4h"?4:6)*H]];
  for(const [a,b] of segments){
   dates(a,b-1,activeDates);dates(a,b+settings.outcomeTailAfterSegmentEndHours*H,outcomeDates);
  }
  for(const p of partitionP5F8ServiceSegments({segments:segments.map(([a,b])=>({startUtc:iso(a),endUtc:iso(b)}))},settings.providerMaxRangeMinutes)){
   for(const offset of [24*H,6*H,90*M]){
    for(let t=Date.parse(p.partStartUtc)-offset-settings.getLeadSeconds*1000;
        t<Date.parse(p.partEndUtc)-offset-settings.getLeadSeconds*1000;t+=settings.refreshEveryMinutes*M){
     const date=day(t),r=physicalSource.get(date)??{base:0,split:0};
     r[p.partitionIndex===1?"base":"split"]+=8;physicalSource.set(date,r);
     if(t<reset)sourceBeforeReset+=8;else sourceAfterReset+=8;
    }
   }
  }
 }
 const all=[...new Set([...physicalSource.keys(),...outcomeDates])].sort();
 const explicitOtherOnlyChargeDates=all.filter(x=>!physicalSource.has(x));
 const restOtherByUtcDate:P5PrelaunchSlotChargeDayInput[]=all.map(chargeDayUtc=>{
  const p=physicalSource.get(chargeDayUtc)??{base:0,split:0};
  return {chargeDayUtc,dailyRestCeilingUnits:settings.dailyRestCeilingUnits,categories:{
   FIDS_RETRY_UNIT_BUDGET:2*Math.ceil((p.base+p.split)/20),
   VALIDATION_UNIT_BUDGET:activeDates.has(chargeDayUtc)?settings.validationUnitsPerActiveServiceDate:0,
   OUTCOME_REST_UNIT_BUDGET:outcomeDates.has(chargeDayUtc)?settings.outcomeUnitsPerEligiblePhysicalDate:0,
   HISTORY_BOOTSTRAP_UNIT_BUDGET:0,DIAGNOSTIC_UNIT_BUDGET:settings.diagnosticUnitsPerBudgetDate}};
 });
 // Scenario-bound identities used ONLY to compare arithmetic to the original
 // cost compiler. They are deliberately not authentic manifest/config/range
 // or timing attestations and must never be given to the live stage writer.
 const scenarioTag="ACTUAL_FIRST_SEED_BUDGET_MODEL_ONLY_NOT_APPROVED_RELEASE";
 const modelPin=(kind:string)=>sha({scenarioTag,kind,settings,expectedDraft});
 const p:P5PrelaunchSlotBudgetInput&{explicitOtherOnlyChargeDates:string[]}={
  schema:"v39.phase5.prelaunch-slot-budget-input.v1",
  manifestSha256:modelPin("not-manifest"),calendarSha256:modelPin("not-approved-calendar"),
  configSha256:modelPin("not-config"),frameSha256:modelPin("not-frame"),
  providerRangeEvidenceSha256:modelPin("not-provider-range-evidence"),
  timingEvidenceSha256:modelPin("not-timing-evidence"),asOfUtc:asOf,
  ...settings,calendarDays:draft.calendarDays.map(d=>({runDayIndex:d.runDayIndex,startUtc:d.startUtc,
   utcSlot:d.utcSlot,windowShape:d.windowShape,partition:d.partition})),
  explicitOtherOnlyChargeDates,restOtherByUtcDate};
 const budget=buildP5PrelaunchSlotBudgetEnvelope(p);
 const totals:Record<string,number>={};let before=0,overlap=0,after=0;
 const rows=budget.utcCategoryRows.map(r=>{
  const source=physicalSource.get(r.chargeDayUtc)??{base:0,split:0};
  if(r.fidsBaseUnits!==source.base||r.fidsSplitUnits!==source.split)hold("ORIGINAL_COST_PARITY");
  const sum=Object.entries(r.categories).reduce((n,[k,v])=>{totals[k]=(totals[k]??0)+v;return n+v;},0);
  if(r.chargeDayUtc<day(reset))before+=sum;
  else if(r.chargeDayUtc===day(reset))overlap+=sum;else after+=sum;
  return {chargeDayUtc:r.chargeDayUtc,categories:r.categories,totalReservedUnits:sum};
 });
 const total=budget.cycleSourceUnits+budget.cycleOtherUnits,unallocated=50000-1000-total;
 if(total!==41960||unallocated!==7040||sourceBeforeReset!==2560||sourceAfterReset!==9728||
  before!==9364||overlap!==344||after!==32252||rows.length!==47)hold("ACTUAL_BUDGET_MODEL_DRIFT");
 const evidence=JSON.parse(readFileSync("data-collection/phase5/evidence/2026-11-15_owner_actual_free_quota_59968.json","utf8"));
 if(evidence.observedAtUtc!==asOf||evidence.apiUnitsRemaining!==59968||evidence.apiUnitsLimit!==60000||
    evidence.alertCreditsRemaining!==1830||Date.parse(evidence.apiUnitsResetAtUtc)!==reset||
    evidence.paidProviderCalls!==0||evidence.phase6PaidGo!==false)hold("EXACT_OWNER_QUOTA_OBSERVATION_REQUIRED");
 return {schema:"v39.phase5.actual-first-seed-budget-proposal-not-stage-input.v1",
  status:"ACTUAL_CALENDAR_PROPOSED_CAPS_NOT_AUTHORIZED",calendarDraftJsonSha256:expectedDraft,calendarRowsSha256:expectedRows,
  settings,totals,physicalUtcRows:rows,explicitOtherOnlyChargeDates,
  sourceChargeDates:physicalSource.size,outcomeChargeDates:outcomeDates.size,
  totalReservedUnits:total,protectedFloorUnits:1000,unallocatedUnits:unallocated,
  peakDailyUnits:Math.max(...rows.map(r=>r.totalReservedUnits)),
  renewal:{actualObservedResetAtUtc:evidence.apiUnitsResetAtUtc,sourceBeforeReset,sourceAfterReset,
   capsPriorUtcDates:before,fullResetDateCap:overlap,capsFollowingUtcDates:after,
   conservativePriorCycleMax:before+overlap,conservativeNextCycleMax:after+overlap,
   futureCycleQuotaVerified:false},
  alert:{observedBalance:1830,protectiveFloor:1000,currentUnbufferedHeadroom:830,
   replenishmentsAssumed:0,fullStudyAlertBudgetApproved:false},
  independentBudgetApproved:false,providerRangePriceAndTimingCertified:false,sourceRightsCertified:false,
  physicalReservations:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
