import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {buildP5ProspectiveSeedCalendarPreview} from "../scripts/v39_phase5_prospective_seed_to_calendar_preview_v39.mjs";
import {proposeP5ActualNov22Budget,assembleP6ActualFirstSeedReleaseCandidate} from "../server/lib/disruption/phase5ActualNov22BudgetProposal_v39";
const seedBytes=readFileSync("data-collection/phase5/planning/2026-11-15_actual_first_seed_43700154416.json");
const seedBundle=JSON.parse(seedBytes.toString("utf8"));
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const ownerEvidenceBytes=readFileSync("data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json");
const dateCandidateBytes=readFileSync("data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json");
function actualPreview(){
 expect(hash(seedBytes)).toBe("66e523802a513b9ce57ca1130ad282577ff53fa7522c78364ba5ef72f72f0d93");
 const x=buildP5ProspectiveSeedCalendarPreview({seedBundle,expected:{
  bundleCommitmentSha256:"925b94cbb236d0a981637eeccae985a2924cc3f11afcb47727b3acf93e792bcf",
  reviewedCodeSha:"09b80926caae24ba07a1f8a20c819090d8f2528c",workflowRunId:"43700154416",
  dateCandidateBytesSha256:"9be154ce8ac2d897643558ff0c575a83a33bc8a4f77768d68fdd791a73c12311",
  firstRunDateUtc:"2026-11-22"},ownerEvidenceBytes,dateCandidateBytes});
 expect(x.sha256).toBe("003885e93f3a3daa1098f648502c5a7dd3beb6e317e906ffe281760aaba763af");
 return x.result;
}
const actual=()=>actualPreview().calendarDraft;
describe("original actual first randomization and seven-category cap PROPOSAL",()=>{
 it("reproduces the expired-artifact-independent exact preview, no new seed",()=>{
  const x=actual();expect(x.calendarDays).toHaveLength(31);expect(x.futureOrdinaryAirportsSelected).toBe(0);
 });
 it("allocates exact real-calendar UTC caps and conservatively accounts for the reset day",()=>{
  const b=proposeP5ActualNov22Budget(actual());
  expect(b.totals).toEqual({FIDS_BASE_UNITS:11904,FIDS_SPLIT_UNITS:384,FIDS_RETRY_UNIT_BUDGET:1280,
   VALIDATION_UNIT_BUDGET:496,OUTCOME_REST_UNIT_BUDGET:27520,HISTORY_BOOTSTRAP_UNIT_BUDGET:0,DIAGNOSTIC_UNIT_BUDGET:376});
  expect(b.explicitOtherOnlyChargeDates).toEqual(["2026-11-29","2026-11-30","2026-12-01","2027-01-05","2027-01-06"]);
  expect(b.physicalUtcRows).toHaveLength(47);expect(b.peakDailyUnits).toBe(1228);
  expect(b.totalReservedUnits).toBe(41960);expect(b.unallocatedUnits).toBe(7040);
  expect(b.renewal.conservativePriorCycleMax).toBe(9708);expect(b.renewal.conservativeNextCycleMax).toBe(32596);
  expect(b.alert.currentUnbufferedHeadroom).toBe(830);expect(b.phase6PaidGo).toBe(false);
  expect(b.providerCalls).toBe(0);expect(b.databaseWrites).toBe(0);
 });
 it("quantifies real-calendar timing geometry with no changed cap, lead, or invented flight yield",()=>{
  const b=proposeP5ActualNov22Budget(actual()),d=b.nativeLeadDiagnostic;
  expect(d.templateCount).toBe(6144);expect(d.timingScenarios).toHaveLength(12);
  expect(d.actualLatencyMeasured).toBe(false);expect(d.policyChanged).toBe(false);
  const s=d.timingScenarios.find(x=>x.timing.maxPopulationStalenessSeconds===2700&&x.timing.maxSchedulerSlipSeconds===120&&x.additionalAuditDelaySeconds===0)!;
  const tighter=d.timingScenarios.find(x=>x.timing.maxPopulationStalenessSeconds===1800&&x.timing.maxSchedulerSlipSeconds===120&&x.additionalAuditDelaySeconds===0)!;
  for(const x of s.coverage.byHorizon){
   expect(x.exposedCutoffSeconds).toBe(1843200);
   expect(x.modeledUncoveredCutoffSeconds).toBe(43200);
   expect(x.modeledEligibleCutoffSeconds).toBe(1800000);
  }
  for(const x of tighter.coverage.byHorizon)expect(x.modeledEligibleCutoffSeconds).toBe(1228800);
  for(const s of d.timingScenarios)for(const x of s.coverage.byHorizon)
   expect(x.modeledEligibleCutoffSeconds+x.modeledUncoveredCutoffSeconds).toBe(x.exposedCutoffSeconds);
  expect(b.totalReservedUnits).toBe(41960);expect(b.phase6PaidGo).toBe(false);
 });
 it("reproduces exact calendar capacity misses and bounded stored-parent correction without changing cost or requests",()=>{
  const b=proposeP5ActualNov22Budget(actual()),d=b.sourceDispatcherCapacityDiagnostic;
  expect(d.templateCount).toBe(6144);expect(d.actualJitterMeasured).toBe(false);expect(d.actualChildCompletionMeasured).toBe(false);
  const old=d.results.find(x=>x.profile.name==="CURRENT"&&x.completionTailMinutes===15)!;
  const next=d.results.find(x=>x.profile.name==="CANDIDATE"&&x.completionTailMinutes===15)!;
  expect(old.phaseZero.missed).toBe(1584);expect(old.worstMissed).toBe(1956);
  expect(next.phaseZero.submitted).toBe(6144);expect(next.worstMissed).toBe(0);expect(next.peakActive).toBeLessThanOrEqual(24);
  expect(d.results.find(x=>x.profile.name==="CANDIDATE"&&x.completionTailMinutes===25)!.worstMissed).toBe(16);
  expect(b.totalReservedUnits).toBe(41960);expect(b.phase6PaidGo).toBe(false);
 });
 it("bounds actual first-seed native POST physical cost without assuming any actual flight or retention",()=>{
  const b=proposeP5ActualNov22Budget(actual()),d=b.postGeometryDiagnostic;
  expect(d.scenarios).toHaveLength(21);
  expect(d.actualAnchorAvailabilityMeasured).toBe(false);
  expect(d.actualOutcomeCoverageMeasured).toBe(false);
  expect(d.policyChanged).toBe(false);
  for(const s of d.scenarios){
   expect(s.partitionSlotUpperBound).toBe(144);
   expect(s.midnightCrossingGroups+s.geometryEligibleGroups).toBe(144);
   expect(s.maximumOneGetPerPartitionSlotUnits).toBe(2*s.geometryEligibleGroups);
   expect(s.maximumOneGetPerPartitionSlotUnits).toBeLessThanOrEqual(288);
   expect(s.everyGeometryEligibleChargeDateWithinProposedOutcomeCap).toBe(true);
   expect(s.byHorizon.map(x=>x.totalTemplates)).toEqual([2048,2048,2048]);
   expect(s.byHorizon[0].modeledRetainedTemplates).toBe(0);
  }
  const early=d.scenarios.find(x=>x.followupMinutes===60&&x.dispatchWindowMinutes===20)!;
  expect(early.geometryEligibleGroups).toBe(144);
  expect(early.modeledAnyAnchorGroups).toBe(144);
  expect(early.byHorizon.map(x=>x.modeledRetainedTemplates)).toEqual([0,2048,2048]);
  const late=d.scenarios.find(x=>x.followupMinutes===1440&&x.dispatchWindowMinutes===20)!;
  expect(late.modeledAnyAnchorGroups).toBe(0);
  expect(b.totals.OUTCOME_REST_UNIT_BUDGET).toBe(27520);
  expect(b.totalReservedUnits).toBe(41960);expect(b.phase6PaidGo).toBe(false);
 });
 it("refuses a revised calendar rather than silently redrawing",()=>{
  const d=actual();d.calendarDays[0].startUtc="2026-11-23T00:00:00.000Z";
  expect(()=>proposeP5ActualNov22Budget(d)).toThrow("FIRST_REAL_CALENDAR_BYTES_REQUIRED");
 });
});

describe("actual first seed to original B0062 and 31-day plan compilers",()=>{
 // Fixture identities are deliberately synthetic, NOT runtime release pins.
 // Actual calendar and proposed budget use the preserved first seed.
 function reviewFixture(){
  const preview=actualPreview(),draft=preview.calendarDraft,b=proposeP5ActualNov22Budget(draft);
  const h=(c:string)=>c.repeat(64);
  const external:Parameters<typeof assembleP6ActualFirstSeedReleaseCandidate>[0]["external"]={
   schema:"v39.phase5.b0062-calendar-slot-review-input.v1",
   expectedExternalCalendarDraftJsonSha256:b.calendarDraftJsonSha256,
   expectedCalendarRowsSha256:b.calendarRowsSha256,
   expectedCorrectedPairSelectionSha256:draft.actualCorrectedPairSelectionSha256,
   manifestSha256:h("a"),calendarSha256:h("b"),configSha256:h("c"),frameSha256:h("d"),
   codeSha40:"e".repeat(40),phase6AuthorizationId:"CI-ONLY-NOT-RELEASE",
   predecessorEvidenceIds:["CI-ONLY-NOT-EVIDENCE"],
   alertSafety:{
    unsettledBurstMarginCredits:10,protectedAlertFloorCredits:1000,
    alertRunSpendCeilingCredits:830,dailySoftStopMarginCredits:10,
    productionReconcileToleranceCredits:0,startAdmissionToleranceSeconds:120,
    safetyWatchdogPollMs:10000,settlementInitialWaitSeconds:60,settlementPollIntervalSeconds:30,
    settlementStableReadCount:3,settlementTimeoutSeconds:300
   },
   providerRangeEvidenceSha256:h("e"),timingEvidenceSha256:h("f"),
   asOfUtc:"2026-11-15T09:37:44.000Z",
   providerMaxRangeMinutes:240,refreshEveryMinutes:15,physicalGetsPerRefreshUpperBound:1,
   getLeadSeconds:900,apiUnitsPerPhysicalGet:2,cycleRestCeilingUnits:50000,
   protectedRestFloorUnits:1000,explicitOtherOnlyChargeDates:b.explicitOtherOnlyChargeDates,
   restOtherByUtcDate:b.physicalUtcRows.map(r=>({chargeDayUtc:r.chargeDayUtc,dailyRestCeilingUnits:1900,
    categories:{FIDS_RETRY_UNIT_BUDGET:r.categories.FIDS_RETRY_UNIT_BUDGET,
     VALIDATION_UNIT_BUDGET:r.categories.VALIDATION_UNIT_BUDGET,
     OUTCOME_REST_UNIT_BUDGET:r.categories.OUTCOME_REST_UNIT_BUDGET,
     HISTORY_BOOTSTRAP_UNIT_BUDGET:r.categories.HISTORY_BOOTSTRAP_UNIT_BUDGET,
     DIAGNOSTIC_UNIT_BUDGET:r.categories.DIAGNOSTIC_UNIT_BUDGET}}))
  };
  const timing={timingEvidenceSha256:external.timingEvidenceSha256,
   maxPopulationStalenessSeconds:2700,maxSchedulerSlipSeconds:120,
   maxResponseAndPersistSeconds:180,minimumPreCommitMarginSeconds:120,minimumPreparationLeadMinutes:20};
  const digest=(x:unknown)=>hash(Buffer.from(JSON.stringify(x)));
  return {draft,envelope:preview.shapeEnvelope,external,expectedExternalInputSha256:digest(external),
   timing,expectedTimingJsonSha256:digest(timing)};
 }
 it("produces 31 exact review-only metadata plans with first-seed cost parity",()=>{
  const f=reviewFixture(),x=assembleP6ActualFirstSeedReleaseCandidate(f);
  expect(x.dayPlans.files).toHaveLength(31);
  expect(x.dayPlans.totalPlannedQueries).toBe(6144);
  expect(x.totalReservedUnits).toBe(41960);
  expect(x.peakDailyUnits).toBe(1228);
  expect(x.dayPlans.dayPlanSha256s).toEqual(assembleP6ActualFirstSeedReleaseCandidate(f).dayPlans.dayPlanSha256s);
  expect(x.unsignedStageInput.calendarDays.filter(d=>d.pairAirportSet===null)).toHaveLength(21);
  expect(x.independentReleaseStillRequired).toBe(true);
  expect(x.phase6PaidGo).toBe(false);
 });
 it("does not replace missing review hashes or silently alter the proposed budget",()=>{
  const f=reviewFixture();
  expect(()=>assembleP6ActualFirstSeedReleaseCandidate({...f,expectedExternalInputSha256:"0".repeat(64)})).toThrow("EXACT_EXTERNAL_INPUT");
  const external=structuredClone(f.external);
  external.restOtherByUtcDate[0].categories.DIAGNOSTIC_UNIT_BUDGET+=2;
  expect(()=>assembleP6ActualFirstSeedReleaseCandidate({...f,external,
   expectedExternalInputSha256:hash(Buffer.from(JSON.stringify(external)))})).toThrow("EXACT_PROPOSED_PHYSICAL_CAPS_CHANGED");
 });
});
