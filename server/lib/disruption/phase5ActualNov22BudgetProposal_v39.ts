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
// Two exact, independently reproducible prospective metadata candidates.
// Default remains the historical Nov22 bytes. The compact variant must be
// selected explicitly; no generic caller-supplied calendar hash override.
export type P6ActualCalendarVariant="ORIGINAL_NOV22"|"COMPACT_NOV21"|"COMPACT_NOV22";
const variants={
 ORIGINAL_NOV22:{draft:"46a4d2cd3f0da28365f43a66e3dfcb740a3393434425299b6c22e38322919333",rows:"45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c",total:41960,dates:47,peak:1228,sourceBefore:2560,sourceAfter:9728,before:9364,overlap:344,after:32252,firstSource:"2026-11-20T23:45:00.000Z"},
 COMPACT_NOV21:{draft:"dcf06aaeb4f4e6ac697230f2eac634ebe5f9d1f72cda4e5bacff0aadfb48c943",rows:"7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c",total:37388,dates:38,peak:1280,sourceBefore:4352,sourceAfter:7936,before:13400,overlap:1096,after:22892,firstSource:"2026-11-19T23:45:00.000Z"},
 COMPACT_NOV22:{draft:"ba6ce0f7ca6f63b154d2d5c3d8d85ccdcd2baf7f7b0a56f2cedc8d7feb136049",rows:"9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6",total:36740,dates:37,peak:1280,sourceBefore:4352,sourceAfter:7936,before:12752,overlap:1096,after:22892,firstSource:"2026-11-20T23:45:00.000Z"}
} as const;
function exactVariant(variant:P6ActualCalendarVariant){
 if(!Object.hasOwn(variants,variant))hold("UNKNOWN_CALENDAR_VARIANT");
 return variants[variant];
}
const reset=Date.parse("2026-12-04T02:21:21.000Z");
const asOf="2026-11-15T09:37:44.000Z";
// Keep the original historical proposal reproducible; use the newly
// supplied live observation for current review, never overwrite history.
export const P6_CURRENT_QUOTA_EVIDENCE_PATH="data-collection/phase5/evidence/2026-11-16_owner_actual_free_quota_59968.json";
const recordedQuotaPaths:Record<string,string>={
 [asOf]:"data-collection/phase5/evidence/2026-11-15_owner_actual_free_quota_59968.json",
 "2026-11-16T09:18:44.000Z":P6_CURRENT_QUOTA_EVIDENCE_PATH
};
const day=(x:number)=>new Date(x).toISOString().slice(0,10);
const settings=Object.freeze({providerMaxRangeMinutes:240,refreshEveryMinutes:15,
 physicalGetsPerRefreshUpperBound:1,getLeadSeconds:900,apiUnitsPerPhysicalGet:2 as const,
 cycleRestCeilingUnits:50000,protectedRestFloorUnits:1000,dailyRestCeilingUnits:1900,
 retryReserveFractionOfSourceUnits:0.1,validationUnitsPerActiveServiceDate:16,
 outcomeUnitsPerEligiblePhysicalDate:640,outcomeTailAfterSegmentEndHours:48,
 historyBootstrapPaidUnits:0,diagnosticUnitsPerBudgetDate:8});
/** Idealized scheduler capacity, not observed GH runner timing. Exact UTC
 * nominal request times, 15m minimum prearm lead, existing EDF order.
 * A child occupies a slot through nominal GET plus assumed completion tail.
 * Constant phase offset is a grid sensitivity, NOT random/missed ticks.
 */
function modelStoredSourceCapacity(templates:readonly {scheduledRequestUtc:string}[]){
 const tasks=templates.map(t=>Date.parse(t.scheduledRequestUtc)).sort((a,b)=>a-b);
 const scenarios=[{name:"CURRENT",perTickCap:4,inFlightCap:8,maxLeadMinutes:105},
  {name:"CANDIDATE",perTickCap:8,inFlightCap:24,maxLeadMinutes:35}];
 const results=scenarios.flatMap(profile=>[0,5,15,25,35,60].map(completionTailMinutes=>{
  const runs=Array.from({length:10},(_,phaseMinutes)=>{
   let i=0,submitted=0,missed=0,peak=0;let active:number[]=[];
   for(let tick=Math.floor((tasks[0]-105*M)/(10*M))*10*M+phaseMinutes*M;tick<=tasks[tasks.length-1];tick+=10*M){
    active=active.filter(x=>x>tick);
    while(i<tasks.length&&tasks[i]-15*M<tick){i++;missed++;}
    let available=Math.max(0,Math.min(profile.perTickCap,profile.inFlightCap-active.length));
    while(available>0&&i<tasks.length&&tasks[i]-tick<=profile.maxLeadMinutes*M){
     active.push(tasks[i]+completionTailMinutes*M);i++;submitted++;available--;
    }
    peak=Math.max(peak,active.length);
   }
   missed+=tasks.length-i;
   if(submitted+missed!==tasks.length)hold("CAPACITY_MODEL_DENOMINATOR_DRIFT");
   return {phaseMinutes,submitted,missed,peak};
  });
  return {profile,completionTailMinutes,phaseZero:runs[0],worstMissed:Math.max(...runs.map(r=>r.missed)),peakActive:Math.max(...runs.map(r=>r.peak))};
 }));
 return {status:"EXACT_FIRST_SEED_IDEALIZED_DISPATCH_CAPACITY_NOT_LIVE_THROUGHPUT",
  templateCount:tasks.length,tickMinutes:10,minimumLeadMinutes:15,actualJitterMeasured:false,actualChildCompletionMeasured:false,actualProviderYieldMeasured:false,
  policyChangedByModel:false,results};
}
export function proposeP5ActualNov22Budget(draft:Draft,variant:P6ActualCalendarVariant="ORIGINAL_NOV22"){
 const selected=exactVariant(variant),expectedDraft=selected.draft,expectedRows=selected.rows;
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
 const scenarioTag=variant==="ORIGINAL_NOV22"?"ACTUAL_FIRST_SEED_BUDGET_MODEL_ONLY_NOT_APPROVED_RELEASE":"ACTUAL_COMPACT_NOV21_BUDGET_MODEL_ONLY_NOT_APPROVED_RELEASE";
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
 if(total!==selected.total||unallocated!==50000-1000-selected.total||sourceBeforeReset!==selected.sourceBefore||sourceAfterReset!==selected.sourceAfter||
  before!==selected.before||overlap!==selected.overlap||after!==selected.after||rows.length!==selected.dates||
  Math.max(...rows.map(r=>r.totalReservedUnits))!==selected.peak)hold("ACTUAL_BUDGET_MODEL_DRIFT");
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
 // Physical follow-up design diagnostic, NOT an approved runtime policy.
 // Group the exact existing refresh templates across all three horizons.
 // Distinct slots can subsequently resolve to the same physical airport;
 // treating them as distinct here makes the cost an upper bound.
 const postGroups=new Map<string,typeof timingTemplates>();
 for(const t of timingTemplates){
  const k=[t.runDayIndex,t.slot,t.serviceWindowStartUtc,t.serviceWindowEndUtc].join("|");
  const group=postGroups.get(k)??[];group.push(t);postGroups.set(k,group);
 }
 if(postGroups.size!==144)hold("ACTUAL_POST_PARTITION_SLOT_COUNT_DRIFT");
 const postScenarios=[30,60,120,240,720,960,1440].flatMap(followupMinutes=>[10,20,30].map(dispatchWindowMinutes=>{
  const byHorizon=horizons.map(([horizon])=>({horizon,totalTemplates:0,modeledRetainedTemplates:0,
   possibleAnchorGroups:0}));
  const costByDate=new Map<string,number>();
  let crossing=0,admittedGeometry=0,modeledAnyAnchorGroups=0;
  for(const group of postGroups.values()){
   const endOfService=Date.parse(group[0].serviceWindowEndUtc);
   const from=endOfService+followupMinutes*M,to=from+dispatchWindowMinutes*M;
   const crosses=day(from)!==day(to);if(crosses)crossing++;
   if(!crosses){
    admittedGeometry++;const charge=day(from);
    costByDate.set(charge,(costByDate.get(charge)??0)+settings.apiUnitsPerPhysicalGet);
   }
   let any=false;
   for(const h of byHorizon){
    const templates=group.filter(t=>t.horizon===h.horizon);
    h.totalTemplates+=templates.length;
    // Illustrative expiry 23h after nominal source GET. Actual committed
    // DB retention and actual lawful use must still be independently established.
    const retained=crosses?0:templates.filter(t=>Date.parse(t.scheduledRequestUtc)+23*H>to).length;
    h.modeledRetainedTemplates+=retained;
    if(retained>0){h.possibleAnchorGroups++;any=true;}
   }
   if(any)modeledAnyAnchorGroups++;
  }
  const physicalUtcUnits=[...costByDate].sort((a,b)=>a[0].localeCompare(b[0])).map(([chargeDayUtc,upperBoundUnits])=>({chargeDayUtc,upperBoundUnits,
   proposedOutcomeCapUnits:rows.find(r=>r.chargeDayUtc===chargeDayUtc)?.categories.OUTCOME_REST_UNIT_BUDGET??0}));
  return {followupMinutes,dispatchWindowMinutes,partitionSlotUpperBound:postGroups.size,
   midnightCrossingGroups:crossing,geometryEligibleGroups:admittedGeometry,modeledAnyAnchorGroups,
   maximumOneGetPerPartitionSlotUnits:admittedGeometry*settings.apiUnitsPerPhysicalGet,
   peakPhysicalUtcUnits:Math.max(0,...costByDate.values()),
   everyGeometryEligibleChargeDateWithinProposedOutcomeCap:physicalUtcUnits.every(x=>x.upperBoundUnits<=x.proposedOutcomeCapUnits),
   byHorizon,physicalUtcUnits};
 }));
 return {schema:"v39.phase5.actual-first-seed-budget-proposal-not-stage-input.v1",
  status:"ACTUAL_CALENDAR_PROPOSED_CAPS_NOT_AUTHORIZED",calendarDraftJsonSha256:expectedDraft,calendarRowsSha256:expectedRows,
  settings,totals,physicalUtcRows:rows,explicitOtherOnlyChargeDates,
  nativeLeadDiagnostic:{status:"ILLUSTRATIVE_EXACT_FIRST_CALENDAR_CUTOFF_TIME_ONLY",templateCount:timingTemplates.length,
   actualLatencyMeasured:false,actualFlightYieldMeasured:false,policyChanged:false,timingScenarios},
  sourceDispatcherCapacityDiagnostic:modelStoredSourceCapacity(timingTemplates),
  postGeometryDiagnostic:{status:"ILLUSTRATIVE_ACTUAL_CALENDAR_ONE_POST_PER_PARTITION_SLOT",
   nominalSourceRetentionHours:23,actualAnchorAvailabilityMeasured:false,actualOutcomeCoverageMeasured:false,
   providerRightsCertified:false,policyChanged:false,scenarios:postScenarios},
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

/** The original f.8 §3.2 budget has two ledgers. A provider refill
 * consumes the same API units that fund the seven REST categories. Do
 * not count it twice, or stage the gross 50k as spendable after refill.
 * These are separately reviewed facts/limits, not provider authentication.
 * All planned refills here occur before the first Dec4 account reset.
 */
export interface P6ActualJointBudgetReview {
 accountEvidenceSha256:string;
 observedAtUtc:string;
 apiUnitsLimit:number;
 apiUnitsRemaining:number;
 apiUnitsResetAtUtc:string;
 alertCreditsRemaining:number;
 preFreezeProjectApiUnits:number;
 authorizedFutureRefillApiUnits:number;
 authorizedFutureRefillAlertCredits:number;
 endingApiMarginUnits:number;
 preRunAlertSpendCeilingCredits:number;
 endingAlertMarginCredits:number;
}
export type P6ActualExternalReview=P5B0062ExternallyClaimedSlotCostInput&{
 jointBudgetReview:P6ActualJointBudgetReview;
};
export function reconcileP6ActualJointBudget(
 j:P6ActualJointBudgetReview,
 proposal:ReturnType<typeof proposeP5ActualNov22Budget>,
 plannedAlertRunCeiling:number
){
 const whole=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=60000;
 const at=Date.parse(j?.observedAtUtc??"");
 const v=Object.values(variants).find(v=>v.draft===proposal.calendarDraftJsonSha256&&v.rows===proposal.calendarRowsSha256);
 if(!v)hold("UNRECOGNIZED_EXACT_BUDGET_VARIANT");
 if(!j||!/^[a-f0-9]{64}$/.test(j.accountEvidenceSha256??"")||
    !Number.isFinite(at)||new Date(at).toISOString()!==j.observedAtUtc||
    at<Date.parse(asOf)||at>=Date.parse(v!.firstSource)||
    j.apiUnitsResetAtUtc!==new Date(reset).toISOString()||j.apiUnitsLimit!==60000||
    ![j.apiUnitsRemaining,j.alertCreditsRemaining,j.preFreezeProjectApiUnits,
      j.authorizedFutureRefillApiUnits,j.authorizedFutureRefillAlertCredits,j.endingApiMarginUnits,
      j.preRunAlertSpendCeilingCredits,j.endingAlertMarginCredits,plannedAlertRunCeiling].every(whole)||
    j.apiUnitsRemaining>j.apiUnitsLimit||plannedAlertRunCeiling<1||plannedAlertRunCeiling>57900||
    // Conservatively include all observed current-cycle account use unless
    // a new separately reviewed allocation design explicitly changes that.
    j.preFreezeProjectApiUnits<j.apiUnitsLimit-j.apiUnitsRemaining||
    j.authorizedFutureRefillApiUnits!==j.authorizedFutureRefillAlertCredits)
  hold("MISSING_OR_INCONSISTENT_JOINT_BUDGET_REVIEW");
 const recordedPath=recordedQuotaPaths[j.observedAtUtc];
 if(recordedPath){
  const bytes=readFileSync(recordedPath);
  const q=JSON.parse(bytes.toString("utf8"));
  if(hash(bytes)!==j.accountEvidenceSha256||q.observedAtUtc!==j.observedAtUtc||q.paidProviderCalls!==0||q.databaseWrites!==0||q.sourceRightsCertified!==false||q.phase6PaidGo!==false||q.apiUnitsLimit!==j.apiUnitsLimit||
     q.apiUnitsRemaining!==j.apiUnitsRemaining||q.apiUnitsResetAtUtc!==j.apiUnitsResetAtUtc||
     q.alertCreditsRemaining!==j.alertCreditsRemaining)
   hold("DATED_ACCOUNT_EVIDENCE_DRIFT");
 }
 const netRestCeiling=proposal.settings.cycleRestCeilingUnits-j.preFreezeProjectApiUnits-
  j.authorizedFutureRefillApiUnits-j.endingApiMarginUnits;
 const restUnallocated=netRestCeiling-proposal.totalReservedUnits-proposal.protectedFloorUnits;
 const alertUnallocated=j.alertCreditsRemaining+j.authorizedFutureRefillAlertCredits-
  j.preRunAlertSpendCeilingCredits-plannedAlertRunCeiling-1000-j.endingAlertMarginCredits;
 const priorCycleRequired=proposal.renewal.conservativePriorCycleMax+j.authorizedFutureRefillApiUnits+
  proposal.protectedFloorUnits+j.endingApiMarginUnits;
 if(restUnallocated<0||alertUnallocated<0||priorCycleRequired>j.apiUnitsRemaining)
  hold("JOINT_BUDGET_OVERSUBSCRIBED_OR_FLOOR_BREACHED");
 return {
  status:"JOINT_REST_ALERT_ARITHMETIC_RECONCILED_NOT_PROVIDER_OR_SPEND_AUTHORIZATION" as const,
  accountEvidenceSha256:j.accountEvidenceSha256,observedAtUtc:j.observedAtUtc,
  grossProjectApiCeiling:proposal.settings.cycleRestCeilingUnits,
  preFreezeProjectApiUnits:j.preFreezeProjectApiUnits,
  authorizedFutureRefillApiUnits:j.authorizedFutureRefillApiUnits,
  authorizedFutureRefillAlertCredits:j.authorizedFutureRefillAlertCredits,
  endingApiMarginUnits:j.endingApiMarginUnits,netRestCeiling,
  sevenRestCategoryAllocation:proposal.totalReservedUnits,protectedRestFloor:proposal.protectedFloorUnits,
  restUnallocated,openingObservedAlertCredits:j.alertCreditsRemaining,
  preRunAlertSpendCeilingCredits:j.preRunAlertSpendCeilingCredits,
  plannedAlertRunCeiling,protectedAlertFloor:1000,endingAlertMarginCredits:j.endingAlertMarginCredits,
  alertUnallocated,priorCycleRequired,
  nextCycleRenewalIndependentlyRequired:true,refillAvailabilityIndependentlyRequired:j.authorizedFutureRefillApiUnits>0,
  accountEvidenceAuthenticatedHere:false,refillPerformed:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false
 };
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
 external:P6ActualExternalReview;
 expectedExternalInputSha256:string;
 timing:Parameters<typeof compileP6UnsignedFutureSourceDayPlans>[0]["timing"];
 expectedTimingJsonSha256:string;
 calendarVariant?:P6ActualCalendarVariant;
}){
 const {draft,envelope,external,timing}=input;
 const variant=input.calendarVariant??"ORIGINAL_NOV22",selected=exactVariant(variant);
 const expectedDraft=selected.draft,expectedRows=selected.rows;
 const proposal=proposeP5ActualNov22Budget(draft,variant);
 if(!external||sha(external)!==input.expectedExternalInputSha256||
    external.expectedExternalCalendarDraftJsonSha256!==expectedDraft||
    external.expectedCalendarRowsSha256!==expectedRows||
    !envelope||envelope.shapeEnvelopeSha256!==draft.proposedShapeEnvelopeSha256||
    !timing||sha(timing)!==input.expectedTimingJsonSha256)
  hold("EXACT_EXTERNAL_INPUT_SHAPE_OR_TIMING_REQUIRED");
 const s=proposal.settings;
 if(external.asOfUtc!==external.jointBudgetReview?.observedAtUtc||
    external.alertSafety?.protectedAlertFloorCredits!==1000||
    !Number.isSafeInteger(external.alertSafety?.unsettledBurstMarginCredits)||
    external.alertSafety.unsettledBurstMarginCredits<0)
  hold("JOINT_BUDGET_ACCOUNT_CLOCK_OR_ALERT_RESERVE_DRIFT");
 const jointBudget=reconcileP6ActualJointBudget(external.jointBudgetReview,proposal,external.alertSafety.alertRunSpendCeilingCredits);
 if(external.providerMaxRangeMinutes!==s.providerMaxRangeMinutes||
    external.refreshEveryMinutes!==s.refreshEveryMinutes||
    external.physicalGetsPerRefreshUpperBound!==s.physicalGetsPerRefreshUpperBound||
    external.getLeadSeconds!==s.getLeadSeconds||
    external.apiUnitsPerPhysicalGet!==s.apiUnitsPerPhysicalGet||
    external.cycleRestCeilingUnits!==jointBudget.netRestCeiling||
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
  jointBudget,
  totalReservedUnits:proposal.totalReservedUnits,
  peakDailyUnits:proposal.peakDailyUnits,
  independentReleaseStillRequired:true,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false
 };
}
