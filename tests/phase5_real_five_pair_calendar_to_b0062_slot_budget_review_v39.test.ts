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
function fixture(){
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
     for(let time=part-offset-120_000;
       time<Math.min(part+4*ONE_HOUR,end)-offset-120_000;
       time+=240*MINUTE)
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
  refreshEveryMinutes:240,
  physicalGetsPerRefreshUpperBound:1,
  getLeadSeconds:120,
  apiUnitsPerPhysicalGet:2 as const,
  cycleRestCeilingUnits:50000,
  protectedRestFloorUnits:1000,
  restOtherByUtcDate:[...chargeDates].sort().map(chargeDayUtc=>({
   chargeDayUtc,dailyRestCeilingUnits:1900,
   categories:Object.fromEntries(other.map(k=>[k,0])) as
    Record<typeof other[number],number>
  }))
 };
 return{draft,ext};
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
