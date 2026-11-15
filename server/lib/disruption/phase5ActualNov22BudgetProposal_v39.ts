/** Actual first commitment replay and proposed seven-category cap review.
 * Never treat model assumptions as provider or independent review evidence.
 * No stage input, SQL, credentials, new randomness, HTTP, or activation.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {summarizeP6CandidateLeadCoverage,compileP6UnsignedFutureSourceDayPlans} from "./phase6UnsignedFutureSourceDayPlanCompiler_v39";
import {assembleP5UnsignedRealFivePairCalendarSlotBudgetReview,type P5B0062ExternallyClaimedSlotCostInput} from "./phase5RealFivePairB0062UnsignedStageInputHandoff_v39";
import type {P5Adaptive31ShapeEnvelope} from "./phase5Prospective31DayShapeEnvelope_v39";
import {buildP5PrelaunchSlotBudgetEnvelope} from "./phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import type {P5PrelaunchSlotBudgetInput,P5PrelaunchSlotChargeDayInput} from "./phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import type {buildP5ActualFivePairB0062CalendarOnlyDraft} from "./phase5RealFivePairB0062CalendarOnlyDraft_v39";
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
 const timingTemplates:Parameters<typeof summarizeP6CandidateLeadCoverage>[0][number][]=[];
 const horizons=[["T-24h",24*H],["T-6h",6*H],["T-90m",90*M]] as const;
 const slots=["HUB","MID_A","MID_B","REGIONAL"] as const;
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
  // Independent enumeration for comparison with the original cost compiler.
  // Split within actual exposed segments only, never include the inactive gap.
  const range=settings.providerMaxRangeMinutes*M;
  for(const [a,b] of segments)for(let p=a;p<b;p+=range){
   const end=Math.min(p+range,b);
   for(const [horizon,offset] of horizons){
    for(let t=p-offset-settings.getLeadSeconds*1000;
        t<end-offset-settings.getLeadSeconds*1000;t+=settings.refreshEveryMinutes*M){
     for(const slot of slots)timingTemplates.push({runDayIndex:d.runDayIndex,slot,horizon,
      serviceWindowStartUtc:new Date(p).toISOString(),serviceWindowEndUtc:new Date(end).toISOString(),scheduledRequestUtc:new Date(t).toISOString()});
     const date=day(t),r=physicalSource.get(date)??{base:0,split:0};
     r[p===a?"base":"split"]+=8;physicalSource.set(date,r);
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
 // Same actual first-seed dates, partitions, horizons, refreshes and cost
 // calculation above. Latencies are explicitly illustrative, NOT observed.
 // Retain original 900s candidate lead and existing 900s GET lead bounds.
 if(timingTemplates.length!==6144||timingTemplates.length*2!==budget.cycleSourceUnits)
  hold("ACTUAL_TIMING_TEMPLATE_COST_DRIFT");
 const timingScenarios=[1800,2700,3600].flatMap(maxPopulationStalenessSeconds=>
  [[0,0,0],[120,180,0],[120,180,300],[300,300,300]].map(([maxSchedulerSlipSeconds,maxResponseAndPersistSeconds,additionalAuditDelaySeconds])=>{
   const timing={maxPopulationStalenessSeconds,maxSchedulerSlipSeconds,maxResponseAndPersistSeconds};
   const coverage=summarizeP6CandidateLeadCoverage(timingTemplates,timing,additionalAuditDelaySeconds);
   return {timing,additionalAuditDelaySeconds,coverage};
  }));
 return {schema:"v39.phase5.actual-first-seed-budget-proposal-not-stage-input.v1",
  status:"ACTUAL_CALENDAR_PROPOSED_CAPS_NOT_AUTHORIZED",calendarDraftJsonSha256:expectedDraft,calendarRowsSha256:expectedRows,
  settings,totals,physicalUtcRows:rows,explicitOtherOnlyChargeDates,
  nativeLeadDiagnostic:{status:"ILLUSTRATIVE_EXACT_FIRST_CALENDAR_CUTOFF_TIME_ONLY",templateCount:timingTemplates.length,
   actualLatencyMeasured:false,actualFlightYieldMeasured:false,policyChanged:false,timingScenarios},
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

/** Assemble the actual first-seed candidate using the EXISTING two compilers.
 * No evidence hashes synthesized, no new draw, no signature or live writes.
 * The caller supplies the complete separately reviewed input; the proposal
 * is a parity check, not proof of approval. A changed budget requires an
 * explicit revised review, not this exact-proposal assembly.
 */
export function assembleP6ActualFirstSeedReleaseCandidate(input:{
 draft:Draft;
 envelope:P5Adaptive31ShapeEnvelope;
 external:P5B0062ExternallyClaimedSlotCostInput;
 expectedExternalInputSha256:string;
 timing:Parameters<typeof compileP6UnsignedFutureSourceDayPlans>[0]["timing"];
 expectedTimingJsonSha256:string;
}){
 const {draft,envelope,external,timing}=input;
 const proposal=proposeP5ActualNov22Budget(draft);
 if(!external||sha(external)!==input.expectedExternalInputSha256||
    external.expectedExternalCalendarDraftJsonSha256!==expectedDraft||
    external.expectedCalendarRowsSha256!==expectedRows||
    !envelope||envelope.shapeEnvelopeSha256!==draft.proposedShapeEnvelopeSha256||
    !timing||sha(timing)!==input.expectedTimingJsonSha256)
  hold("EXACT_EXTERNAL_INPUT_SHAPE_OR_TIMING_REQUIRED");
 const s=proposal.settings;
 if(external.providerMaxRangeMinutes!==s.providerMaxRangeMinutes||
    external.refreshEveryMinutes!==s.refreshEveryMinutes||
    external.physicalGetsPerRefreshUpperBound!==s.physicalGetsPerRefreshUpperBound||
    external.getLeadSeconds!==s.getLeadSeconds||
    external.apiUnitsPerPhysicalGet!==s.apiUnitsPerPhysicalGet||
    external.cycleRestCeilingUnits!==s.cycleRestCeilingUnits||
    external.protectedRestFloorUnits!==s.protectedRestFloorUnits||
    external.restOtherByUtcDate.some(r=>r.dailyRestCeilingUnits!==s.dailyRestCeilingUnits))
  hold("EXACT_PROPOSAL_SETTINGS_CHANGED");
 const review=assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,external);
 const actual=review.slotOnlyBudget.utcCategoryRows;
 if(actual.length!==proposal.physicalUtcRows.length||
    actual.some((r,i)=>{
     const p=proposal.physicalUtcRows[i];
     return r.chargeDayUtc!==p.chargeDayUtc||
      Object.keys(r.categories).length!==Object.keys(p.categories).length||
      Object.entries(r.categories).some(([k,v])=>p.categories[k as keyof typeof p.categories]!==v);
    })||
    review.slotOnlyBudget.cycleSourceUnits+review.slotOnlyBudget.cycleOtherUnits!==proposal.totalReservedUnits)
  hold("EXACT_PROPOSED_PHYSICAL_CAPS_CHANGED");
 const plans=compileP6UnsignedFutureSourceDayPlans({
  stage:review.unsignedStageInput,expectedStageInputSha256:review.unsignedStageInputSha256,
  envelope,expectedShapeEnvelopeSha256:draft.proposedShapeEnvelopeSha256,
  timing,expectedTimingJsonSha256:input.expectedTimingJsonSha256});
 if(plans.files.length!==31||plans.totalPlannedQueries!==6144||
    plans.totalPlannedQueries*2!==review.slotOnlyBudget.cycleSourceUnits||
    plans.ordinaryAirportSelectionsCreated!==0)
  hold("ACTUAL_FIRST_SEED_PLAN_PARITY");
 return {
  status:"EXACT_FIRST_SEED_RELEASE_REVIEW_BUNDLE_UNSIGNED_NO_GO" as const,
  externalInputSha256:input.expectedExternalInputSha256,
  timingJsonSha256:input.expectedTimingJsonSha256,
  calendarDraftSha256:expectedDraft,
  calendarRowsSha256:expectedRows,
  seedReplayedNotRedrawn:true,
  unsignedStageInputSha256:review.unsignedStageInputSha256,
  unsignedStageInput:review.unsignedStageInput,
  dayPlans:plans,
  totalReservedUnits:proposal.totalReservedUnits,
  peakDailyUnits:proposal.peakDailyUnits,
  independentReleaseStillRequired:true,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false
 };
}
