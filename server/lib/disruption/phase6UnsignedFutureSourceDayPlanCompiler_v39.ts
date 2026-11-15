/**
 * Pure reviewed-plan candidate compiler. Reuse the exact B0062/V0093
 * unsigned stage input and its cost envelope; no airport draw, DB, HTTP,
 * signing key, release, or provider authorization is produced here.
 */
import {createHash} from "node:crypto";
import {buildP5PrelaunchSlotBudgetEnvelope} from "./phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import type {assembleP5UnsignedRealFivePairCalendarSlotBudgetReview} from "./phase5RealFivePairB0062UnsignedStageInputHandoff_v39";
import type {P5Adaptive31ShapeEnvelope} from "./phase5Prospective31DayShapeEnvelope_v39";
import type {P5DynamicDayGridInput} from "./phase5DynamicDaySourceGrid_v39";
const sha=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const H=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("REFUSED_P6_PLAN_COMPILER_"+s);};
const iso=(t:number)=>new Date(t).toISOString();
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const HORIZONS=[["T-24h",86400000],["T-6h",21600000],["T-90m",5400000]] as const;
type Stage=ReturnType<typeof assembleP5UnsignedRealFivePairCalendarSlotBudgetReview>["unsignedStageInput"];
type Timing={
 timingEvidenceSha256:string;
 maxPopulationStalenessSeconds:number;
 maxSchedulerSlipSeconds:number;
 maxResponseAndPersistSeconds:number;
 minimumPreCommitMarginSeconds:number;
 minimumPreparationLeadMinutes:number;
};
const integer=(x:number,a:number,b:number)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
/** Existing candidate audit requires >15 minutes before the individual PRE
 * cutoff. Evaluate nominal scheduled requests plus reviewed delay bounds.
 * This diagnostic measures cutoff TIME geometry, never flight counts or
 * an observed yield. Assumes no early GET; no extra hard release gate. */
const NATIVE_CANDIDATE_AUDIT_LEAD_SECONDS=900;
export function summarizeP6CandidateLeadCoverage(
 templates:readonly P5DynamicDayGridInput["templates"][number][],
 timing:Pick<Timing,"maxPopulationStalenessSeconds"|"maxSchedulerSlipSeconds"|"maxResponseAndPersistSeconds">,
 additionalAuditDelaySeconds:number
){
 if(!integer(additionalAuditDelaySeconds,0,3600))hold("INVALID_DIAGNOSTIC_AUDIT_DELAY");
 const groups=new Map<string,{horizon:typeof HORIZONS[number][0];start:number;end:number;intervals:[number,number][]}>();
 for(const q of templates){
  const h=HORIZONS.find(([name])=>name===q.horizon);
  if(!h)hold("INVALID_DIAGNOSTIC_HORIZON");
  const start=Date.parse(q.serviceWindowStartUtc)-h![1],end=Date.parse(q.serviceWindowEndUtc)-h![1],
    request=Date.parse(q.scheduledRequestUtc);
  if(![start,end,request].every(Number.isFinite)||start>=end)hold("INVALID_DIAGNOSTIC_CLOCK");
  const key=[q.runDayIndex,q.slot,q.horizon,q.serviceWindowStartUtc,q.serviceWindowEndUtc].join("|");
  const group=groups.get(key)??{horizon:h![0],start,end,intervals:[]};
  const earliest=Math.max(start,request+(timing.maxSchedulerSlipSeconds+timing.maxResponseAndPersistSeconds+
   additionalAuditDelaySeconds+NATIVE_CANDIDATE_AUDIT_LEAD_SECONDS)*1000);
  const latest=Math.min(end,request+timing.maxPopulationStalenessSeconds*1000);
  if(earliest<latest)group.intervals.push([earliest,latest]);
  groups.set(key,group);
 }
 const byHorizon=HORIZONS.map(([horizon])=>({horizon,exposedCutoffSeconds:0,
  modeledEligibleCutoffSeconds:0,modeledUncoveredCutoffSeconds:0}));
 for(const g of groups.values()){
  const out=byHorizon.find(x=>x.horizon===g.horizon)!;
  let covered=0,prior=g.start;
  for(const [a,b] of g.intervals.sort((x,y)=>x[0]-y[0])){
   covered+=Math.max(0,b-Math.max(a,prior));prior=Math.max(prior,b);
  }
  const total=(g.end-g.start)/1000,eligible=covered/1000;
  out.exposedCutoffSeconds+=total;out.modeledEligibleCutoffSeconds+=eligible;
  out.modeledUncoveredCutoffSeconds+=total-eligible;
 }
 return {candidateAuditMinimumLeadSeconds:NATIVE_CANDIDATE_AUDIT_LEAD_SECONDS,
  additionalAuditDelaySeconds,assumption:"NOMINAL_REQUEST_NO_EARLY_GET_REVIEWED_SOURCE_DELAY_BOUND",
  units:"airport-slot-cutoff-seconds",actualFlightYieldMeasured:false,
  scientificReleaseBlockedByDiagnostic:false,byHorizon};
}
export function compileP6UnsignedFutureSourceDayPlans(input:{
 stage:Stage;expectedStageInputSha256:string;
 envelope:P5Adaptive31ShapeEnvelope;expectedShapeEnvelopeSha256:string;
 timing:Timing;expectedTimingJsonSha256:string;
}){
 const {stage,envelope,timing}=input;
 if(!stage||!envelope||!timing||
   ![input.expectedStageInputSha256,input.expectedShapeEnvelopeSha256,input.expectedTimingJsonSha256].every(x=>H.test(x??""))||
   sha(stage)!==input.expectedStageInputSha256||
   sha(envelope.days)!==input.expectedShapeEnvelopeSha256||
   envelope.shapeEnvelopeSha256!==input.expectedShapeEnvelopeSha256||
   sha(timing)!==input.expectedTimingJsonSha256||
   envelope.schema!=="v39.phase5.31day-shape-with-prospective-adaptive-draws.v1"||
   envelope.phase6PaidGo!==false||envelope.days.length!==31||
   stage.calendarDays.length!==31||
   sha(stage.calendarDays)!==stage.expectedSignedCalendarRowsSha256||
   timing.timingEvidenceSha256!==stage.slotBudgetInput.timingEvidenceSha256)
  hold("EXACT_INPUT_PIN_OR_GEOMETRY");
 const b=stage.slotBudgetInput;
 const budget=buildP5PrelaunchSlotBudgetEnvelope(b);
 if(budget.prelaunchEnvelopeSha256!==stage.expectedSignedSlotEnvelopeSha256||
   b.calendarDays.length!==31||
   b.manifestSha256!==stage.manifestSha256||b.calendarSha256!==stage.calendarSha256||
   b.configSha256!==stage.configSha256||b.frameSha256!==stage.frameSha256)
  hold("COST_ENVELOPE_PIN_OR_IDENTITY");
 if(!integer(timing.maxPopulationStalenessSeconds,1,86400)||
   !integer(timing.maxSchedulerSlipSeconds,0,3600)||
   !integer(timing.maxResponseAndPersistSeconds,1,3600)||
   !integer(timing.minimumPreCommitMarginSeconds,120,900)||
   !integer(timing.minimumPreparationLeadMinutes,15,180)||
   timing.maxSchedulerSlipSeconds+timing.maxResponseAndPersistSeconds+timing.minimumPreCommitMarginSeconds>b.getLeadSeconds)
  hold("RESPONSE_SLIP_OR_PRE_MARGIN_EXCEEDS_REVIEWED_LEAD");
 const charge=new Map<string,{base:number;split:number;count:number}>();
 const perDay=envelope.days.map((d,i)=>{
  const row=stage.calendarDays[i],slotDay=b.calendarDays[i];
  if(d.runDayIndex!==i+1||row.runDayIndex!==i+1||slotDay.runDayIndex!==i+1||
    d.startUtc!==row.startUtc||d.startUtc!==slotDay.startUtc||
    d.utcSlot!==row.timeClass||d.utcSlot.slice(0,2)!==row.utcSlot||row.utcSlot!==slotDay.utcSlot||
    d.partition!==row.partition||d.partition!==slotDay.partition||
    d.windowShape!==row.windowShape||d.windowShape!==slotDay.windowShape||
    (d.pairId===null?null:"pair_00"+d.pairId.slice(5))!==row.pairId||d.crossoverPeriod!==row.crossoverPeriod||d.pairRole!==row.pairRole||
    row.drawType!==(d.crossoverPeriod===2?"PAIR_REPLAY":"NEW_TEMPLATE")||
    (d.pairedAirportCandidates===null)!==(row.pairAirportSet===null)||
    (d.pairedAirportCandidates!==null&&SLOTS.some(s=>row.pairAirportSet?.[s].icao!==d.pairedAirportCandidates?.[s])))
   hold("DAY_SHAPE_OR_PAIR_DRIFT");
  // The original approved shape has one inactive hour in split windows.
  const start=Date.parse(d.startUtc),hour=3600000;
  const geometry=d.windowShape==="2x2h"?[[start,start+2*hour],[start+3*hour,start+5*hour]]:
   [[start,start+(d.windowShape==="4h"?4:6)*hour]];
  if(d.activeSegments.length!==geometry.length||
   d.activeSegments.some((s,j)=>s.segmentIndex!==j+1||s.startUtc!==iso(geometry[j][0])||s.endUtc!==iso(geometry[j][1])))
   hold("EXPOSED_SEGMENT_DRIFT");
  const templates:P5DynamicDayGridInput["templates"]=[];
  for(const [si,[a,z]] of geometry.entries()){
   let pi=0;
   for(let s=a;s<z;s+=b.providerMaxRangeMinutes*60000){
    pi++;const end=Math.min(s+b.providerMaxRangeMinutes*60000,z);
    for(const [h,offset] of HORIZONS){
     let covered=s-offset,refresh=0;
     for(let cutoff=s-offset;cutoff<end-offset;cutoff+=b.refreshEveryMinutes*60000){
      refresh++;
      const request=cutoff-b.getLeadSeconds*1000;
      const until=request+timing.maxPopulationStalenessSeconds*1000;
      if(refresh>32||request<=Date.parse(b.asOfUtc))hold("REFRESH_BOUND_OR_PAST");
      if(request+1000*(timing.maxSchedulerSlipSeconds+timing.maxResponseAndPersistSeconds+timing.minimumPreCommitMarginSeconds)>covered&&covered<end-offset)
       hold("CUT_OFF_COVERAGE_GAP");
      covered=Math.max(covered,until);
      const physicalChargeDayUtc=iso(request).slice(0,10);
      for(const slot of SLOTS){
       templates.push({queryKey:`p6.d${i+1}.${slot}.${h}.s${si+1}.p${pi}.r${refresh}`,
        runDayIndex:i+1,slot,horizon:h,providerQueryDirection:"Departure",
        budgetDayUtc:d.startUtc.slice(0,10),physicalChargeDayUtc,
        serviceWindowStartUtc:iso(s),serviceWindowEndUtc:iso(end),
        earliestPlannedCutoffUtc:iso(cutoff),scheduledRequestUtc:iso(request),
        maxResponseAndPersistSeconds:timing.maxResponseAndPersistSeconds,apiUnitsPerAttempt:2,maxAttempts:1});
       const v=charge.get(physicalChargeDayUtc)??{base:0,split:0,count:0};
       v.count++;v[pi===1?"base":"split"]+=2;charge.set(physicalChargeDayUtc,v);
      }
     }
     if(covered<end-offset)hold("END_OF_PARTITION_COVERAGE_GAP");
    }
   }
  }
  // Stage6 segmented mode presently requires more than 12, at most 384.
  if(templates.length<=12||templates.length>384)hold("DAY_QUERY_COUNT_UNSUPPORTED");
  const first=Math.min(...templates.map(t=>Date.parse(t.scheduledRequestUtc)));
  if(Date.parse(d.latestPermittedEarlyDrawUtcInclusive)+timing.minimumPreparationLeadMinutes*60000>first)
   hold("LATEST_DRAW_LEAVES_INSUFFICIENT_PREPARATION_LEAD");
  return {d,row,templates};
 });
 if(charge.size!==budget.utcCategoryRows.length||budget.utcCategoryRows.some(r=>{
  const x=charge.get(r.chargeDayUtc);
  return !x||x.count!==r.logicalRefreshSlots||x.base*b.physicalGetsPerRefreshUpperBound!==r.fidsBaseUnits||
    x.split*b.physicalGetsPerRefreshUpperBound!==r.fidsSplitUnits;
 }))hold("UTC_CATEGORY_TEMPLATE_COST_MISMATCH");
 const coverageGridSha256=sha(perDay.map(x=>({runDayIndex:x.d.runDayIndex,templates:x.templates})));
 const files=perDay.map(({d,row,templates})=>{
  const plan={schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:d.runDayIndex,
   expectedServiceStartUtc:d.startUtc,expectedDrawType:row.drawType,pairedIcaos:d.pairedAirportCandidates,templates,
   reviewedRefreshTiming:{reviewed31DayCoverageGridSha256:coverageGridSha256,
    maxPopulationStalenessSeconds:timing.maxPopulationStalenessSeconds,maxSchedulerSlipSeconds:timing.maxSchedulerSlipSeconds,
    minimumPreCommitMarginSeconds:timing.minimumPreCommitMarginSeconds,verifiedProviderMaxFidsWindowMinutes:b.providerMaxRangeMinutes},
   reviewedSegmentedSource:{windowShape:d.windowShape,verifiedProviderMaxRangeMinutes:b.providerMaxRangeMinutes,reviewedProviderRangeEvidenceSha256:b.providerRangeEvidenceSha256},
   ...(d.pairedAirportCandidates===null?{reviewedOrdinaryDayEnvelope:{envelope,independentlyReviewedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256}}:{})};
  const bytes=JSON.stringify(plan);
  if(Buffer.byteLength(bytes)>500000)hold("PLAN_TOO_LARGE");
  return {runDayIndex:d.runDayIndex,path:`data-collection/phase5/planning/phase6-source-day-${String(d.runDayIndex).padStart(2,"0")}.json`,
   sha256:createHash("sha256").update(bytes).digest("hex"),bytes};
 });
 const diagnosticTemplates=perDay.flatMap(d=>d.templates);
 // Reports only. Never change signed plan bytes or force full coverage.
 const candidateLeadCoverageScenarios=[0,300].map(delay=>
  summarizeP6CandidateLeadCoverage(diagnosticTemplates,timing,delay));
 return {status:"UNSIGNED_31_DAY_METADATA_REVIEW_CANDIDATE_NO_GO",files,
  candidateLeadCoverageScenarios,
  dayPlanSha256s:files.map(({runDayIndex,sha256})=>({runDayIndex,sha256})),coverageGridSha256,
  costEnvelopeSha256:budget.prelaunchEnvelopeSha256,totalPlannedQueries:[...charge.values()].reduce((n,x)=>n+x.count,0),
  providerCalls:0,databaseWrites:0,phase6PaidGo:false,ordinaryAirportSelectionsCreated:0};
}
