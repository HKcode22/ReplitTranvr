import {compileP6UnsignedFutureSourceDayPlans} from "../server/lib/disruption/phase6UnsignedFutureSourceDayPlanCompiler_v39";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {proposeP5Adaptive31ShapeEnvelope}
 from "../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39";
import {p5TreatmentCommitmentForSeed}
 from "../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39";
import {buildP5ActualFivePairB0062CalendarOnlyDraft}
 from "../server/lib/disruption/phase5RealFivePairB0062CalendarOnlyDraft_v39";
import {assembleP5UnsignedRealFivePairCalendarSlotBudgetReview}
 from "../server/lib/disruption/phase5RealFivePairB0062UnsignedStageInputHandoff_v39";
import {compileP5InertB0062UtcStagePacket}
 from "../server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs";
const digest=(x:unknown)=>createHash("sha256")
 .update(JSON.stringify(x)).digest("hex");
const H=(s:string)=>s.repeat(64);
const ONE_HOUR=3_600_000;
const ONE_DAY=86_400_000;
const MINUTE=60_000;
const first="2027-01-20";
const source=()=>JSON.parse(readFileSync(new URL(
 "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
 import.meta.url),"utf8"));
const hubs=["WSSS","OMAA","SKBO","YSSY"];
const regions:Record<string,string>={
 WSSS:"Asia-Pacific",OMAA:"Gulf/Africa",
 SKBO:"South America",YSSY:"Oceania"
};
const treatmentSeed=
 "31be6f0d392e4d84f72a0e8bc5369eb57a4c916083b962edef7e7319146a0d25";
const claim=()=>({
 treatmentSeedHex:treatmentSeed,
 announcedCommitmentSha256:p5TreatmentCommitmentForSeed(treatmentSeed),
 claimedCommitmentObservedAtUtc:"2026-11-09T00:00:00.000Z"
});
const other=[
 "FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET",
 "OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET",
 "DIAGNOSTIC_UNIT_BUDGET"
] as const;
function fixture(refreshMinutes=240,leadSeconds=120){
 const original=source();
 const envelope=proposeP5Adaptive31ShapeEnvelope({
  ownerCorrectedReadback:original,firstRunDateUtc:first,
  claimedTreatment:claim()
 });
 const last=new Map<string,number>(),ordinary=[];
 for(const d of envelope.days){
  const start=Date.parse(d.startUtc);
  const end=Date.parse(d.endUtc);
  let hub=d.pairedAirportCandidates?.HUB;
  if(!hub){
   const next=envelope.days.find(x=>
    x.runDayIndex>d.runDayIndex&&x.pairedAirportCandidates!==null);
   hub=hubs.find(s=>
    (!last.has(s)||start-last.get(s)!>=ONE_DAY)&&
    (!next||next.pairedAirportCandidates?.HUB!==s||
     Date.parse(next.startUtc)-end>=ONE_DAY)
   );
   if(!hub)throw Error("CI_NO_SAT_PROSPECTIVE_HUB");
   ordinary.push({
    runDayIndex:d.runDayIndex,anchorIcao:hub,
    slotRegions:{
     HUB:regions[hub],MID_A:"Europe",
     MID_B:"North America",REGIONAL:"Oceania"
    }
   });
  }
  last.set(hub,end);
 }
 const draft=buildP5ActualFivePairB0062CalendarOnlyDraft({
  schema:"v39.phase5.actual-five-pair-31-b0062-draft-input.v1",
  ownerCorrectedReadback:original,
  firstRunDateUtc:first,claimedTreatment:claim(),
  ordinaryHubsAndRegions:ordinary,
  predeclaredDailyDrawSeeds:Array.from({length:31},(_,i)=>({
   runDayIndex:i+1,
   frozenDrawSeed:digest({syntheticOnlyDrawSeedForDay:i+1})
  })),
  assembledAtUtc:"2026-11-12T00:00:00.000Z"
 });
 // Independent fixture charge-day enumeration, never a real provider quote.
 const chargeDates=new Set<string>();
 for(const d of draft.calendarDays){
  const t=Date.parse(d.startUtc);
  const segments=d.windowShape==="2x2h"?
   [[t,t+2*ONE_HOUR],[t+3*ONE_HOUR,t+5*ONE_HOUR]]:
   [[t,t+(d.windowShape==="up-to-6h"?6:4)*ONE_HOUR]];
  for(const [start,end] of segments)
   for(let part=start;part<end;part+=4*ONE_HOUR)
    for(const offset of [24*ONE_HOUR,6*ONE_HOUR,90*MINUTE])
     for(let time=part-offset-leadSeconds*1000;
       time<Math.min(part+4*ONE_HOUR,end)-offset-leadSeconds*1000;
       time+=refreshMinutes*MINUTE)
      chargeDates.add(new Date(time).toISOString().slice(0,10));
 }
 const ext={
  schema:"v39.phase5.b0062-calendar-slot-review-input.v1" as const,
  expectedExternalCalendarDraftJsonSha256:digest(draft),
  expectedCalendarRowsSha256:draft.proposedCalendarRowsSha256,
  expectedCorrectedPairSelectionSha256:
   draft.actualCorrectedPairSelectionSha256,
  manifestSha256:H("a"),calendarSha256:H("b"),
  configSha256:H("c"),frameSha256:H("d"),
  codeSha40:"f".repeat(40),
  phase6AuthorizationId:"CI-UNSIGNED-NO-REAL-STAGE-20261113",
  predecessorEvidenceIds:["CI-NO-PROVIDER-OR-PAID-GO"],
  alertSafety:{
   unsettledBurstMarginCredits:10,protectedAlertFloorCredits:1000,
   alertRunSpendCeilingCredits:27000,dailySoftStopMarginCredits:10,
   productionReconcileToleranceCredits:0,
   startAdmissionToleranceSeconds:120,safetyWatchdogPollMs:10000,
   settlementInitialWaitSeconds:60,settlementPollIntervalSeconds:30,
   settlementStableReadCount:3,settlementTimeoutSeconds:300
  },
  providerRangeEvidenceSha256:H("e"),
  timingEvidenceSha256:H("f"),
  asOfUtc:"2026-12-01T00:00:00.000Z",
  providerMaxRangeMinutes:240,
  refreshEveryMinutes:refreshMinutes,
  physicalGetsPerRefreshUpperBound:1,
  getLeadSeconds:leadSeconds,
  apiUnitsPerPhysicalGet:2 as const,
  cycleRestCeilingUnits:50000,
  protectedRestFloorUnits:1000,
  restOtherByUtcDate:[...chargeDates].sort().map(chargeDayUtc=>({
   chargeDayUtc,dailyRestCeilingUnits:1900,
   categories:Object.fromEntries(other.map(k=>[k,0])) as
    Record<typeof other[number],number>
  }))
 };
 return{draft,ext,envelope};
}
describe("actual corrected five paired sites + authentic-geometry B0062 → UNSIGNED UTC slot-budget stage review",()=>{
 it("joins exactly 31 calendar dates with seven physical charge categories without filling ordinary airport identities",()=>{
  const {draft,ext}=fixture();
  const x=assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,ext);
  expect(x.status).toBe(
   "REVIEWABLE_B0062_AND_V0093_INPUT_NOT_EXTERNALLY_APPROVED_OR_GO");
  expect(x.unsignedStageInput.calendarDays).toHaveLength(31);
  expect(x.unsignedStageInput.slotBudgetInput.calendarDays).toHaveLength(31);
  expect(x.knownPairedAirportDays).toBe(10);
  expect(x.futureOrdinaryAirportDaysUnselected).toBe(21);
  expect(x.unsignedStageInput.calendarDays.filter(
   d=>d.pairAirportSet===null)).toHaveLength(21);
  expect(x.unsignedStageInput.expectedSignedSlotEnvelopeSha256)
   .toBe(x.slotOnlyBudget.prelaunchEnvelopeSha256);
  expect(x.unsignedStageInput.expectedSignedCalendarRowsSha256)
   .toBe(draft.proposedCalendarRowsSha256);
  expect(x.slotOnlyBudget.utcCategoryRows.length)
   .toBeGreaterThanOrEqual(31);
  expect(x.slotOnlyBudget.utcCategoryRows.every((d:any)=>
   Object.keys(d.categories).length===7)).toBe(true);
  expect(x.realProviderRangeAndPriceIndependentlyAuthenticatedHere)
   .toBe(false);
  expect(x.independentCalendarTreatmentSignatureAuthenticatedHere)
   .toBe(false);
  expect(x.phase6PaidGo).toBe(false);
  expect(x.providerCalls).toBe(0);
  expect(x.databaseWrites).toBe(0);
 });
 it("does not bypass the actual preexisting independently reviewed B0062 staging compiler",()=>{
  const {draft,ext}=fixture();
  const x=assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,ext);
  expect(()=>compileP5InertB0062UtcStagePacket(
   x.unsignedStageInput,{
    expectedSignedStagePacketSha256:"f".repeat(64),
    independentCalendarTreatmentReviewApproved:false,
    independentProviderAccountAndRestBudgetReviewApproved:false,
    narrowPrelaunchOwnerApproved:false,
    expectedExactWriterRole:"phase5_b0062_prelaunch_stage_ci20261113"
   })).toThrow("MISSING_VERIFIED_INDEPENDENT_PRELAUNCH_REVIEW");
 });
 it("rejects changed paired-site or unsigned future ordinary airport selection",()=>{
  const {draft,ext}=fixture();
  const changed=structuredClone(draft);
  changed.calendarDays[0].pairAirportSet!.MID_A.icao="KTEB";
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(
   changed,{...ext,expectedExternalCalendarDraftJsonSha256:digest(changed)}
  )).toThrow(/REFUSED_P5_/);
  const otherDay=structuredClone(draft);
  otherDay.calendarDays[11].pairAirportSet=
   structuredClone(draft.calendarDays[0].pairAirportSet);
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(
   otherDay,{...ext,expectedExternalCalendarDraftJsonSha256:digest(otherDay)}
  )).toThrow(/REFUSED_P5_/);
 });
 it("refuses a mutated calendar SHA, missing physical UTC charge date or false provider pricing",()=>{
  const {draft,ext}=fixture();
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(
   draft,{...ext,expectedCalendarRowsSha256:H("e")}
  )).toThrow("UNSIGNED_CALENDAR_DRAFT_OR_EXTERNAL_REVIEW_SHA_DRIFT");
  const missing=structuredClone(ext);
  missing.restOtherByUtcDate.pop();
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(
   draft,missing)).toThrow("SOURCE_AND_OTHER_UTC_CHARGE_DATES_NOT_EXACT");
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(
   draft,{...ext,apiUnitsPerPhysicalGet:1 as 2}
  )).toThrow("MISSING_REVIEWED_SHAPE_RANGE_OR_FINANCIAL_INPUTS");
 });
 it("rejects retrospective first horizon and an over-spent daily category",()=>{
  const {draft,ext}=fixture();
  const late={...ext,asOfUtc:"2027-03-01T00:00:00.000Z"};
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(
   draft,late)).toThrow("FIRST_PLANNED_SOURCE_SLOT_ALREADY_PAST");
  const over=structuredClone(ext);
  over.restOtherByUtcDate[0].dailyRestCeilingUnits=2;
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(
   draft,over)).toThrow("PHYSICAL_UTC_REST_BUDGET_OVERSPENT");
 });
});

describe("metadata-only daily plan compiler reuses frozen cost formula",()=>{
 it("produces 31 byte-pinned day plans, no future adaptive ICAOs and exact charge categories",()=>{
  const {draft,ext,envelope}=fixture(60,300);
  const handoff=assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,ext);
  const timing={timingEvidenceSha256:ext.timingEvidenceSha256,
   maxPopulationStalenessSeconds:4200,maxSchedulerSlipSeconds:60,
   maxResponseAndPersistSeconds:60,minimumPreCommitMarginSeconds:120,minimumPreparationLeadMinutes:20};
  const input={stage:handoff.unsignedStageInput,expectedStageInputSha256:handoff.unsignedStageInputSha256,
   envelope,expectedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256,timing,expectedTimingJsonSha256:digest(timing)};
  const result=compileP6UnsignedFutureSourceDayPlans(input);
  expect(result.files).toHaveLength(31);
  expect(result.totalPlannedQueries*2).toBe(handoff.slotOnlyBudget.cycleSourceUnits);
  const [immediate,audit5m]=result.candidateLeadCoverageScenarios;
  expect(immediate.candidateAuditMinimumLeadSeconds).toBe(900);
  expect(immediate.additionalAuditDelaySeconds).toBe(0);
  expect(audit5m.additionalAuditDelaySeconds).toBe(300);
  expect(immediate.actualFlightYieldMeasured).toBe(false);
  expect(immediate.scientificReleaseBlockedByDiagnostic).toBe(false);
  for(let i=0;i<3;i++){
   const x=immediate.byHorizon[i],y=audit5m.byHorizon[i];
   expect(x.exposedCutoffSeconds).toBe(128*4*3600);
   expect(x.modeledEligibleCutoffSeconds+x.modeledUncoveredCutoffSeconds).toBe(x.exposedCutoffSeconds);
   expect(x.modeledUncoveredCutoffSeconds).toBeGreaterThan(0);
   expect(y.modeledUncoveredCutoffSeconds).toBeGreaterThan(x.modeledUncoveredCutoffSeconds);
  }
  expect(result.dayPlanSha256s).toEqual(compileP6UnsignedFutureSourceDayPlans(input).dayPlanSha256s);
  const plans=result.files.map(f=>JSON.parse(f.bytes));
  expect(plans.filter(p=>p.pairedIcaos===null)).toHaveLength(21);
  expect(plans.filter(p=>p.pairedIcaos!==null)).toHaveLength(10);
  for(const p of plans){
   expect(p.templates.every((q:any)=>!("icao" in q)&&!("plannedAirportSelectionUtc" in q))).toBe(true);
   expect(p.templates.length).toBeGreaterThan(12);
   expect(p.templates.length).toBeLessThanOrEqual(384);
  }
  expect(result.phase6PaidGo).toBe(false);
  expect(result.ordinaryAirportSelectionsCreated).toBe(0);
  expect(()=>compileP6UnsignedFutureSourceDayPlans({...input,expectedTimingJsonSha256:H("f")})).toThrow("EXACT_INPUT_PIN");
  const stale={...timing,maxPopulationStalenessSeconds:1800};
  expect(()=>compileP6UnsignedFutureSourceDayPlans({...input,timing:stale,expectedTimingJsonSha256:digest(stale)})).toThrow("COVERAGE_GAP");
  const late={...timing,minimumPreparationLeadMinutes:60};
  expect(()=>compileP6UnsignedFutureSourceDayPlans({...input,timing:late,expectedTimingJsonSha256:digest(late)})).toThrow("INSUFFICIENT_PREPARATION_LEAD");
 });
});

import {buildP5V0082UnknownAirportSevenCostOnlyDraft} from "../server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs";
describe("explicit prospective outcome-only physical UTC dates",()=>{
 it("includes positive outcome-only cap with zero FIDS templates and exact seven categories",()=>{
  const {draft,ext,envelope}=fixture(60,300);
  const last=ext.restOtherByUtcDate.at(-1)!.chargeDayUtc;
  const d=new Date(Date.parse(last+"T00:00:00Z")+ONE_DAY).toISOString().slice(0,10);
  const additional={chargeDayUtc:d,dailyRestCeilingUnits:1900,
   categories:{...ext.restOtherByUtcDate[0].categories,OUTCOME_REST_UNIT_BUDGET:80}};
  const revised={...ext,explicitOtherOnlyChargeDates:[d],restOtherByUtcDate:[...ext.restOtherByUtcDate,additional]};
  const x=assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,revised);
  const row=x.slotOnlyBudget.utcCategoryRows.find((r:any)=>r.chargeDayUtc===d);
  expect(row).toMatchObject({fidsBaseUnits:0,fidsSplitUnits:0,logicalRefreshSlots:0,physicalGetUpperBound:0,dailyOtherReservedUnits:80});
  expect(Object.keys(row.categories)).toHaveLength(7);
  const old=assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,ext);
  expect(x.slotOnlyBudget.cycleSourceUnits).toBe(old.slotOnlyBudget.cycleSourceUnits);
  expect(x.slotOnlyBudget.cycleOtherUnits).toBe(old.slotOnlyBudget.cycleOtherUnits+80);
  const cost=buildP5V0082UnknownAirportSevenCostOnlyDraft({schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",
   slotBudgetInput:x.unsignedStageInput.slotBudgetInput,expectedReviewerSlotEnvelopeSha256:x.unsignedStageInput.expectedSignedSlotEnvelopeSha256});
  expect(cost.days.find((r:any)=>r.chargeDayUtc===d)).toMatchObject({fidsBaseUnits:0,fidsSplitUnits:0,dailyOtherReservedUnits:80});
  const timing={timingEvidenceSha256:ext.timingEvidenceSha256,maxPopulationStalenessSeconds:4200,maxSchedulerSlipSeconds:60,
   maxResponseAndPersistSeconds:60,minimumPreCommitMarginSeconds:120,minimumPreparationLeadMinutes:20};
  const plans=compileP6UnsignedFutureSourceDayPlans({stage:x.unsignedStageInput,expectedStageInputSha256:x.unsignedStageInputSha256,
   envelope,expectedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256,timing,expectedTimingJsonSha256:digest(timing)});
  expect(plans.files).toHaveLength(31);
  expect(plans.files.flatMap(f=>JSON.parse(f.bytes).templates).some((q:any)=>q.physicalChargeDayUtc===d)).toBe(false);
  expect(plans.totalPlannedQueries*2).toBe(x.slotOnlyBudget.cycleSourceUnits);
  expect(x.phase6PaidGo).toBe(false);
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,{...revised,explicitOtherOnlyChargeDates:[]})).toThrow("SOURCE_AND_OTHER_UTC_CHARGE_DATES_NOT_EXACT");
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,{...revised,explicitOtherOnlyChargeDates:[last]})).toThrow("INVALID_EXPLICIT_OTHER_ONLY_CHARGE_DATES");
  expect(()=>assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,{...revised,restOtherByUtcDate:[...ext.restOtherByUtcDate,{...additional,dailyRestCeilingUnits:2}]})).toThrow("PHYSICAL_UTC_REST_BUDGET_OVERSPENT");
 });
});
