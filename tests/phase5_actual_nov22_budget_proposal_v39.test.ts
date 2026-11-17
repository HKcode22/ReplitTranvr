import {assembleP5UnsignedRealFivePairCalendarSlotBudgetReview} from "../server/lib/disruption/phase5RealFivePairB0062UnsignedStageInputHandoff_v39";
import {compileP6UnsignedFutureSourceDayPlans} from "../server/lib/disruption/phase6UnsignedFutureSourceDayPlanCompiler_v39";
import {buildP5Crossover40WindowReview} from "../server/lib/disruption/phase5Crossover40WindowEvidenceReview_v39";
import {previewP5IndependentTreatmentActiveSegments} from "../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39";
import {readFileSync,mkdtempSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compileP6ActualCandidateExport,writeP6ActualCandidateExport,prepareP6ActualReviewInput,prepareP6ActualReleaseIdentityReview,inspectP6ExactReviewCheckout,verifyP6ActualCommittedPlanParity,verifyP6ActualCommittedCheckout} from "../scripts/v39_phase6_actual_release_candidate_export_v39";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitP6InertReleaseStage} from "../scripts/v39_phase6_inert_release_stage_manual_v39.mjs";
import {buildP5V0082UnknownAirportSevenCostOnlyDraft} from "../server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs";
import {buildP5ProspectiveSeedCalendarPreview} from "../scripts/v39_phase5_prospective_seed_to_calendar_preview_v39.mjs";
import {proposeP5ActualNov22Budget,assembleP6ActualFirstSeedReleaseCandidate,reconcileP6ActualJointBudget,P6_CURRENT_QUOTA_EVIDENCE_PATH} from "../server/lib/disruption/phase5ActualNov22BudgetProposal_v39";
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
    alertRunSpendCeilingCredits:680,dailySoftStopMarginCredits:10,
    productionReconcileToleranceCredits:0,startAdmissionToleranceSeconds:120,
    safetyWatchdogPollMs:10000,settlementInitialWaitSeconds:60,settlementPollIntervalSeconds:30,
    settlementStableReadCount:3,settlementTimeoutSeconds:300
   },
   providerRangeEvidenceSha256:h("e"),timingEvidenceSha256:h("f"),
   asOfUtc:"2026-11-15T09:37:44.000Z",
   providerMaxRangeMinutes:240,refreshEveryMinutes:15,physicalGetsPerRefreshUpperBound:1,
   getLeadSeconds:900,apiUnitsPerPhysicalGet:2,cycleRestCeilingUnits:49468,
   protectedRestFloorUnits:1000,explicitOtherOnlyChargeDates:b.explicitOtherOnlyChargeDates,
   jointBudgetReview:{accountEvidenceSha256:hash(readFileSync("data-collection/phase5/evidence/2026-11-15_owner_actual_free_quota_59968.json")),
    observedAtUtc:"2026-11-15T09:37:44.000Z",apiUnitsLimit:60000,apiUnitsRemaining:59968,
    apiUnitsResetAtUtc:"2026-12-04T02:21:21.000Z",alertCreditsRemaining:1830,preFreezeProjectApiUnits:32,
    authorizedFutureRefillApiUnits:0,authorizedFutureRefillAlertCredits:0,endingApiMarginUnits:500,
    preRunAlertSpendCeilingCredits:0,endingAlertMarginCredits:150},
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

 // Prospective date-only alternative after the original seed reveal: test the
 // actual generic compilers, never pass a synthetic review to a live writer.
 it("checks the compressed Nov21–Dec24 UTC alternative through existing B0062 and SOURCE compilers",()=>{
  const f=reviewFixture(),old=actualPreview();
  const bytes=readFileSync("data-collection/phase5/evidence/2026-11-17_compact_actual_shape_calendar_REVIEW_ONLY.json");
  expect(createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0")).update(bytes).digest("hex")).toBe("ee17a694594356e2b0c772545c490c198db11b42");
  const receipt=JSON.parse(bytes.toString("utf8")),c=receipt.cases[0];
  expect(receipt.status).toBe("PROSPECTIVE_COMPACT_REVIEW_NOT_RELEASE");
  expect(receipt.phase6PaidGo).toBe(false);
  expect(c.firstServiceUtc).toBe("2026-11-21T00:00:00.000Z");
  expect(c.lastServiceEndUtc).toBe("2026-12-24T04:00:00.000Z");
  const digest=(x:unknown)=>hash(Buffer.from(JSON.stringify(x)));
  const iso=(ms:number)=>new Date(ms).toISOString();
  const moves=new Map<number,string>(c.rows.map((x:any)=>[x.runDayIndex,x.startUtc]));
  expect(moves.size).toBe(31);
  const dateMapSha256=digest(Object.fromEntries(c.rows.map((x:any)=>[String(x.runDayIndex),x.startUtc.slice(0,10)])));
  const envelope=structuredClone(old.shapeEnvelope);
  envelope.days=envelope.days.map((d,i)=>{
   const plan=c.rows[i],r=old.calendarDraft.calendarDays[i];
   expect(plan.runDayIndex).toBe(d.runDayIndex);
   expect(plan.originalStartUtc).toBe(d.startUtc);
   expect(plan.windowShape).toBe(d.windowShape);
   expect(plan.anchorIcao).toBe(r.anchorIcao);
   expect(plan.partition).toBe(d.partition);
   expect(plan.fixedKnownAirportSet).toEqual(d.pairedAirportCandidates);
   const startUtc=moves.get(d.runDayIndex)!;
   const delta=Date.parse(startUtc)-Date.parse(d.startUtc);
   const shift=(t:string)=>iso(Date.parse(t)+delta);
   const activeSegments=d.activeSegments.map(s=>({...s,startUtc:shift(s.startUtc),endUtc:shift(s.endUtc)}));
   expect(activeSegments.map(({startUtc,endUtc})=>({startUtc,endUtc}))).toEqual(plan.segments);
   return {...d,dateUtc:startUtc.slice(0,10),startUtc,endUtc:shift(d.endUtc),activeSegments,
    excludedSplitGap:d.excludedSplitGap?{startUtc:shift(d.excludedSplitGap.startUtc),endUtc:shift(d.excludedSplitGap.endUtc)}:null,
    earliestPermittedEarlyDrawUtc:shift(d.earliestPermittedEarlyDrawUtc),
    latestPermittedEarlyDrawUtcInclusive:shift(d.latestPermittedEarlyDrawUtcInclusive),
    earliestPossibleSourceT24SpanUtc:shift(d.earliestPossibleSourceT24SpanUtc)};
  });
  // Rebind the exact existing 40 conservative-window evidence identity
  // (no provider observations, no fabricated claims).
  const prior40=buildP5Crossover40WindowReview({ownerCorrectedReadback:JSON.parse(ownerEvidenceBytes.toString("utf8")),firstRunDateUtc:"2026-11-22"});
  const rows40=prior40.reviewRows.map(r=>{
   const d=envelope.days[r.runDayIndex-1],startUtc=d.startUtc,conservativeEndUtc=iso(Date.parse(startUtc)+6*3600000);
   const identity={dateMapSha256,pairId:r.pairId,crossoverPeriod:r.crossoverPeriod,runDayIndex:r.runDayIndex,slot:r.slot,airportIcao:r.airportIcao,startUtc,conservativeEndUtc};
   return {...r,reviewKeySha256:digest(identity),startUtc,conservativeEndUtc,dateUtc:d.dateUtc,weekdayClass:r.weekdayClass};
  });
  const basic=rows40.map(r=>({reviewKeySha256:r.reviewKeySha256,pairId:r.pairId,crossoverPeriod:r.crossoverPeriod,runDayIndex:r.runDayIndex,slot:r.slot,airportIcao:r.airportIcao,startUtc:r.startUtc,conservativeEndUtc:r.conservativeEndUtc,dateUtc:r.dateUtc,weekdayClass:r.weekdayClass}));
  const review40={...prior40,firstRunDateUtc:"2026-11-21",candidateDateMapSha256:dateMapSha256,windowIdentitySha256:digest(basic),reviewRows:rows40};
  const treatment=previewP5IndependentTreatmentActiveSegments(review40,{treatmentSeedHex:seedBundle.treatmentSeedHex,announcedCommitmentSha256:seedBundle.announcedCommitmentSha256,claimedCommitmentObservedAtUtc:seedBundle.claimedCommitmentObservedAtUtc});
  expect(treatment.assignmentSha256).toBe(old.shapeEnvelope.claimedTreatmentAssignmentSha256);
  envelope.dateMapSha256=dateMapSha256;
  envelope.crossoverReview40Sha256=review40.windowIdentitySha256;
  envelope.shapeEnvelopeSha256=digest(envelope.days);
  const draft=structuredClone(old.calendarDraft);
  draft.calendarDays=draft.calendarDays.map(r=>{
   const startUtc=moves.get(r.runDayIndex)!;
   return {...r,startUtc,budgetDayId:"p5-f8-"+startUtc.slice(0,10).replace(/-/g,"")+"-"+String(r.runDayIndex).padStart(2,"0")};
  });
  draft.proposedShapeEnvelopeSha256=envelope.shapeEnvelopeSha256;
  draft.proposedDateMapSha256=dateMapSha256;
  draft.proposedCalendarRowsSha256=digest(draft.calendarDays);
  draft.proposedCalendarDraftSha256=digest({schema:draft.schema,actualCorrectedPairSelectionSha256:draft.actualCorrectedPairSelectionSha256,proposedShapeEnvelopeSha256:draft.proposedShapeEnvelopeSha256,proposedDateMapSha256:draft.proposedDateMapSha256,claimedTreatmentAssignmentSha256:draft.claimedTreatmentAssignmentSha256,claimedTreatmentCommitmentSha256:draft.claimedTreatmentCommitmentSha256,assembledAtUtc:draft.assembledAtUtc,calendarDays:draft.calendarDays});
  // Original calendar pin MUST still refuse the proposed date revision.
  expect(()=>proposeP5ActualNov22Budget(draft)).toThrow("FIRST_REAL_CALENDAR_BYTES_REQUIRED");
  const external={...f.external,expectedExternalCalendarDraftJsonSha256:digest(draft),
   expectedCalendarRowsSha256:draft.proposedCalendarRowsSha256,calendarSha256:draft.proposedCalendarRowsSha256,
   explicitOtherOnlyChargeDates:c.chargeRows.filter((r:any)=>r.categories.BASE_FIDS+r.categories.SPLIT_FIDS===0).map((r:any)=>r.dateUtc),
   restOtherByUtcDate:c.chargeRows.map((r:any)=>({chargeDayUtc:r.dateUtc,dailyRestCeilingUnits:1900,categories:{FIDS_RETRY_UNIT_BUDGET:r.categories.RETRY,VALIDATION_UNIT_BUDGET:r.categories.VALIDATION,OUTCOME_REST_UNIT_BUDGET:r.categories.OUTCOME,HISTORY_BOOTSTRAP_UNIT_BUDGET:r.categories.HISTORY,DIAGNOSTIC_UNIT_BUDGET:r.categories.DIAGNOSTIC}}))};
  const unsigned=assembleP5UnsignedRealFivePairCalendarSlotBudgetReview(draft,external);
  const cost=unsigned.slotOnlyBudget;
  expect(cost.utcCategoryRows).toHaveLength(38);
  expect(cost.cycleSourceUnits+cost.cycleOtherUnits).toBe(37388);
  expect(cost.utcCategoryRows.every(r=>Object.values(r.categories).reduce((a,b)=>a+b,0)<=1900)).toBe(true);
  expect(unsigned.unsignedStageInput.phase6AuthorizationId).toBe("CI-ONLY-NOT-RELEASE");
  expect(Buffer.byteLength(JSON.stringify(unsigned.unsignedStageInput))).toBeLessThanOrEqual(48000);
  const plans=compileP6UnsignedFutureSourceDayPlans({stage:unsigned.unsignedStageInput,expectedStageInputSha256:unsigned.unsignedStageInputSha256,envelope,expectedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256,timing:f.timing,expectedTimingJsonSha256:f.expectedTimingJsonSha256});
  expect(plans.files).toHaveLength(31);
  expect(plans.totalPlannedQueries).toBe(6144);
  expect(plans.ordinaryAirportSelectionsCreated).toBe(0);
  expect(plans.phase6PaidGo).toBe(false);
  expect(JSON.parse(plans.files[0].bytes).templates[0].scheduledRequestUtc).toBe("2026-11-19T23:45:00.000Z");
  expect(unsigned.phase6PaidGo).toBe(false);
  expect(unsigned.existingB0062WriterInvoked).toBe(false);
 });
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
 it("admits one independently pinned inert stage using existing role names; never shares both credentials or implies GO",()=>{
  const a=assembleP6ActualFirstSeedReleaseCandidate(reviewFixture()),input=a.unsignedStageInput;
  const raw=JSON.stringify(input);
  // Ensure the actual original-seed metadata packet fits the protected
  // GitHub secret size; all keys/hashes/approvals here are CI fixtures.
  expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(48000);
  const c=buildP5V0082UnknownAirportSevenCostOnlyDraft({schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",
   slotBudgetInput:input.slotBudgetInput,expectedReviewerSlotEnvelopeSha256:input.expectedSignedSlotEnvelopeSha256});
  const url=(role:string)=>"postgresql://"+role+":CI_ONLY@ep-ci.neon.tech/neondb?sslmode=require";
  const stageRole="phase5_b0062_prelaunch_stage_prod20261113",costRole="phase5_fids_budget_freeze_prod20261113";
  const stageKey="P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL",costKey="P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL";
  const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
   GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:input.codeSha40,V39_P5_APPROVED_CODE_SHA:input.codeSha40,
   P6_INERT_STAGE_MODE:"calendar",P6_INERT_STAGE_CONFIRM:"STAGE_EXACT_31_DAY_CALENDAR_DISABLED_AUTH_NO_PROVIDER",
   P6_INERT_CALENDAR_REVIEW_APPROVED:"1",ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",
   P6_INERT_STAGE_INPUT_JSON:raw,P6_INERT_STAGE_INPUT_SHA256:hash(Buffer.from(raw)),V39_P5_MANIFEST_SHA256:input.manifestSha256,
   [stageKey]:url(stageRole)};
  const x=admitP6InertReleaseStage(env);
  expect(x).toMatchObject({mode:"calendar",role:stageRole,phase6PaidGo:false});
  expect(JSON.stringify(x)).not.toContain("CI_ONLY");expect(JSON.stringify(x)).not.toContain(raw);
  for(const bad of [{[costKey]:url(costRole)},{P6_INERT_STAGE_INPUT_SHA256:"0".repeat(64)},{GITHUB_RUN_ATTEMPT:"2"},
   {V39_PHASE6_PROCESS_ARMED:"1"},{P6_INERT_CALENDAR_REVIEW_APPROVED:"0"},{AERODATABOX_API_KEY:"forbidden"},{DATABASE_URL:"forbidden"}])
   expect(()=>admitP6InertReleaseStage({...env,...bad})).toThrow();
  const cost={...env,[stageKey]:"",[costKey]:url(costRole),P6_INERT_STAGE_MODE:"cost",
   P6_INERT_STAGE_CONFIRM:"STAGE_EXACT_SEVEN_COST_UPPER_BOUNDS_DISABLED_AUTH_NO_PROVIDER",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
   P6_INERT_COST_REVIEW_APPROVED:"1",P6_INERT_COST_ENVELOPE_SHA256:c.costOnlyCategoryDraftSha256};
  expect(admitP6InertReleaseStage(cost)).toMatchObject({mode:"cost",role:costRole,phase6PaidGo:false});
  expect(()=>admitP6InertReleaseStage({...cost,V39_PHASE5_SOURCE_RIGHTS_APPROVED:"0"})).toThrow("NO_DISTINCT_COST_AND_RIGHTS_APPROVAL");
  expect(()=>admitP6InertReleaseStage({...cost,P6_INERT_COST_ENVELOPE_SHA256:"0".repeat(64)})).toThrow("MISSING_DISTINCT_AUTHENTIC");
 });
 it("exports original reviewed-input candidates with exact byte pins, no overwrite and no release authority",()=>{
  const f=reviewFixture(),externalBytes=Buffer.from(JSON.stringify(f.external,null,2)),timingBytes=Buffer.from(JSON.stringify(f.timing));
  const input={externalBytes,expectedExternalFileSha256:hash(externalBytes),timingBytes,expectedTimingFileSha256:hash(timingBytes)};
  const a=compileP6ActualCandidateExport(input);
  const direct=assembleP6ActualFirstSeedReleaseCandidate(f);
  expect(a.summary.dayPlanSha256s).toEqual(direct.dayPlans.dayPlanSha256s);
  expect(a.summary.unsignedStageInputSha256).toBe(direct.unsignedStageInputSha256);
  expect(a.files).toHaveLength(32);
  expect(a.summary).toMatchObject({sourceQueries:6144,totalReservedUnits:41960,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false});
  expect(()=>compileP6ActualCandidateExport({...input,expectedExternalFileSha256:"0".repeat(64)})).toThrow("EXACT_REVIEW_INPUT_FILE_BYTES_REQUIRED");
  expect(()=>writeP6ActualCandidateExport(a,join(process.cwd(),"no-export-here"))).toThrow("OUTPUT_MUST_BE_OUTSIDE_REPOSITORY");
  const dest=join(mkdtempSync(join(tmpdir(),"p6-actual-candidate-ci-")),"review");
  writeP6ActualCandidateExport(a,dest);
  expect(a.files.every(x=>hash(readFileSync(join(dest,x.path)))===x.sha256)).toBe(true);
  expect(()=>writeP6ActualCandidateExport(a,dest)).toThrow();
 });
 it("compares all 31 regenerated runtime plans with exact committed and working bytes without granting release",()=>{
  const f=reviewFixture(),externalBytes=Buffer.from(JSON.stringify(f.external)),timingBytes=Buffer.from(JSON.stringify(f.timing));
  const a=compileP6ActualCandidateExport({externalBytes,expectedExternalFileSha256:hash(externalBytes),timingBytes,expectedTimingFileSha256:hash(timingBytes)});
  const bytes=new Map(a.files.slice(0,31).map(x=>[x.path,Buffer.from(x.bytes)]));
  const read=(path:string)=>{const b=bytes.get(path);if(!b)throw Error("missing");return b;};
  expect(verifyP6ActualCommittedPlanParity(a,read,read)).toEqual({verifiedPlanCount:31,dayPlanSha256s:a.summary.dayPlanSha256s});
  const last=a.files[30].path;
  expect(()=>verifyP6ActualCommittedPlanParity(a,p=>p===last?Buffer.concat([read(p),Buffer.from(" ")]):read(p),read)).toThrow("FINAL_COMMITTED_PLAN_BYTES_DIFFER");
  expect(()=>verifyP6ActualCommittedPlanParity(a,read,p=>p===last?Buffer.concat([read(p),Buffer.from(" ")]):read(p))).toThrow("FINAL_COMMITTED_PLAN_BYTES_DIFFER");
  expect(()=>verifyP6ActualCommittedPlanParity(a,p=>{if(p===last)throw Error("missing");return read(p);},read)).toThrow("FINAL_COMMITTED_PLAN_MISSING");
  expect(()=>verifyP6ActualCommittedPlanParity({...a,files:a.files.slice(1)},read,read)).toThrow("FINAL_EXPORT_STRUCTURE_DRIFT");
  expect(()=>verifyP6ActualCommittedPlanParity({...a,summary:{...a.summary,dayPlanSha256s:a.summary.dayPlanSha256s.map((d,i)=>i===30?{...d,sha256:"0".repeat(64)}:d)}},read,read)).toThrow("FINAL_COMPILED_PLAN_IDENTITY_DRIFT");
  expect(()=>verifyP6ActualCommittedCheckout(a)).toThrow("REVIEW_CHECKOUT_NOT_EXACT");
 });
 it("binds the original dual-ledger tree without reallocating REST categories or overspending",()=>{
  const f=reviewFixture(),b=proposeP5ActualNov22Budget(f.draft),j=f.external.jointBudgetReview;
  const a=assembleP6ActualFirstSeedReleaseCandidate(f);
  expect(a.jointBudget.netRestCeiling).toBe(49468);
  expect(a.jointBudget.restUnallocated).toBe(6508);
  expect(a.unsignedStageInput.slotBudgetInput.cycleRestCeilingUnits).toBe(49468);
  expect(a.jointBudget.alertUnallocated).toBe(0);
  const funded={...j,authorizedFutureRefillApiUnits:6000,authorizedFutureRefillAlertCredits:6000};
  expect(reconcileP6ActualJointBudget(funded,b,6680)).toMatchObject({netRestCeiling:43468,restUnallocated:508,alertUnallocated:0,refillPerformed:false});
  for(const [bad,cap] of [
   [{...j,preFreezeProjectApiUnits:0},680],
   [{...j,authorizedFutureRefillApiUnits:1},680],
   [{...j,alertCreditsRemaining:1831},680],
   [{...j,accountEvidenceSha256:"0".repeat(64)},680],
   [{...j,endingApiMarginUnits:6509+500},680],
   [{...j},681],
   [{...funded,authorizedFutureRefillApiUnits:7000,authorizedFutureRefillAlertCredits:7000},6680]
  ] as const)expect(()=>reconcileP6ActualJointBudget(bad,b,cap)).toThrow();
  const external={...f.external,cycleRestCeilingUnits:50000};
  expect(()=>assembleP6ActualFirstSeedReleaseCandidate({...f,external,expectedExternalInputSha256:hash(Buffer.from(JSON.stringify(external)))})).toThrow("EXACT_PROPOSAL_SETTINGS_CHANGED");
 });
 it("does not replace missing review hashes or silently alter the proposed budget",()=>{
  const f=reviewFixture();
  expect(()=>assembleP6ActualFirstSeedReleaseCandidate({...f,expectedExternalInputSha256:"0".repeat(64)})).toThrow("EXACT_EXTERNAL_INPUT");
  const external=structuredClone(f.external);
  external.restOtherByUtcDate[0].categories.DIAGNOSTIC_UNIT_BUDGET+=2;
  expect(()=>assembleP6ActualFirstSeedReleaseCandidate({...f,external,
   expectedExternalInputSha256:hash(Buffer.from(JSON.stringify(external)))})).toThrow("EXACT_PROPOSED_PHYSICAL_CAPS_CHANGED");
 });
 it("prefills only known original-seed frame/calendar and exact 47 charge dates without invented external review",()=>{
  const code="09b80926caae24ba07a1f8a20c819090d8f2528c";
  const x=prepareP6ActualReviewInput(code),p=x.externalCandidate;
  expect(x.originalPreviewSha256).toBe("003885e93f3a3daa1098f648502c5a7dd3beb6e317e906ffe281760aaba763af");
  expect(x.calendarDraft.calendarDays).toHaveLength(31);
  expect(x.calendarDraft.calendarDays.filter(d=>d.pairAirportSet===null)).toHaveLength(21);
  expect(p.frameSha256).toBe("02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94");
  expect(p.restOtherByUtcDate).toHaveLength(47);
  expect(x.proposedTotalReservedUnits).toBe(41960);
  expect(x.proposedSourceQueries).toBe(6144);
  expect(x.proposedPeakDailyUnits).toBe(1228);
  expect(x.missingExternalFields).toEqual(["manifestSha256","calendarSha256","configSha256","phase6AuthorizationId","predecessorEvidenceIds","alertSafety","providerRangeEvidenceSha256","timingEvidenceSha256","jointBudgetReview"]);
  expect(x.jointBudgetScenarios.map(s=>[s.candidate.authorizedFutureRefillApiUnits,s.arithmetic.netRestCeiling,s.arithmetic.restUnallocated,s.proposedAlertRunCeiling])).toEqual([[0,49468,6508,680],[3000,46468,3508,3680],[6000,43468,508,6680]]);
  expect(x.jointBudgetScenarios.every(s=>!s.reviewed&&!s.arithmetic.refillPerformed&&!s.arithmetic.phase6PaidGo)).toBe(true);
  expect(x.quotaEvidence).toMatchObject({path:P6_CURRENT_QUOTA_EVIDENCE_PATH,
   observedAtUtc:"2026-11-16T09:18:44.000Z",unitsRemaining:59968,alertCredits:1830});
  expect(x.quotaEvidence.sha256).toBe(hash(readFileSync(P6_CURRENT_QUOTA_EVIDENCE_PATH)));
  expect(x.concreteReviewRecommendation).toMatchObject({
   status:"REVIEW_PROPOSAL_ONLY_NOT_SIGNED_NOT_APPROVED",calendarRowsDigestCandidate:p.expectedCalendarRowsSha256,
   netRestCeilingUnits:46468,proposedAlertSafety:{unsettledBurstMarginCredits:50,protectedAlertFloorCredits:1000,
   alertRunSpendCeilingCredits:3680,dailySoftStopMarginCredits:150,productionReconcileToleranceCredits:0,
   startAdmissionToleranceSeconds:120,safetyWatchdogPollMs:5000,settlementInitialWaitSeconds:30,
   settlementPollIntervalSeconds:10,settlementStableReadCount:3,settlementTimeoutSeconds:600},
   historicalSmoke:{observedMaximumUnsettledGap:0,singleAirportHistoricalOnly:true},
   actualClock:{runId:43832469501,receiptCount:8,observedReadyMsRange:[38114,70132],observedReleaseSlipMsRange:[3,7]},
   futureRefillConfirmed:false,fullScopeAlertSafetyMeasured:false,independentReviewerApproved:false,stageAuthorizationGranted:false});
  const current=x.concreteReviewRecommendation.jointBudgetReview,b=proposeP5ActualNov22Budget(x.calendarDraft);
  expect(reconcileP6ActualJointBudget(current,b,3680)).toMatchObject({netRestCeiling:46468,restUnallocated:3508,phase6PaidGo:false});
  for(const tamper of [{accountEvidenceSha256:"0".repeat(64)},{alertCreditsRemaining:1831},{apiUnitsRemaining:59969}])
   expect(()=>reconcileP6ActualJointBudget({...current,...tamper},b,3680)).toThrow("DATED_ACCOUNT_EVIDENCE_DRIFT");
  expect(x.timingCandidate.timingEvidenceSha256).toBeNull();
  expect(x.phase6PaidGo).toBe(false);
  expect(x.sourceRightsApproved).toBe(false);
  expect(prepareP6ActualReviewInput(code)).toEqual(x);
  const noRefill=prepareP6ActualReviewInput(code,0);
  expect(noRefill.concreteReviewRecommendation).toMatchObject({
   netRestCeilingUnits:49468,jointBudgetReview:{authorizedFutureRefillApiUnits:0,authorizedFutureRefillAlertCredits:0},
   proposedAlertSafety:{alertRunSpendCeilingCredits:680},independentReviewerApproved:false,stageAuthorizationGranted:false});
  expect(noRefill.calendarDraft).toEqual(x.calendarDraft);
  expect(noRefill.externalCandidate).toEqual(x.externalCandidate);
  expect(noRefill.missingExternalFields).toEqual(x.missingExternalFields);
  expect(noRefill).toMatchObject({phase6PaidGo:false,sourceRightsApproved:false,actualBudgetReviewApproved:false});
  expect(()=>prepareP6ActualReviewInput(code,1 as any)).toThrow("EXPLICIT_REVIEW_REFILL_CHOICE_REQUIRED");
  expect(()=>prepareP6ActualReviewInput("fake")).toThrow();
  const ext=Buffer.from(JSON.stringify(p)),timing=Buffer.from(JSON.stringify(x.timingCandidate));
  expect(()=>compileP6ActualCandidateExport({externalBytes:ext,expectedExternalFileSha256:hash(ext),timingBytes:timing,expectedTimingFileSha256:hash(timing)})).toThrow();
 });

 it("builds actual content-bound release identity candidates and all 31 plan digests, but no runnable authorization",()=>{
  const code=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const x=prepareP6ActualReleaseIdentityReview(code);
  expect(x.checkout).toEqual(inspectP6ExactReviewCheckout(code));
  const digest=(v:unknown)=>hash(Buffer.from(JSON.stringify(v)));
  for(const a of [x.manifestCandidate,x.configCandidate,x.rangeEvidenceCandidate,x.timingEvidenceCandidate])
   expect(a.sha256).toBe(digest(a.content));
  expect(x.manifestCandidate.content.sourceInventorySha256).toBe(digest(x.sourceInventory));
  expect(x.manifestCandidate.content.executableFileCount).toBe(x.sourceInventory.length);
  expect(x.manifestCandidate.content.configCandidateSha256).toBe(x.configCandidate.sha256);
  expect(x.manifestCandidate.content.calendarRowsSha256).toBe("45a44fffeb774b5d0829487bd82f1a4a40f70085bc776f269cf04f0a8c70962c");
  expect(x.manifestCandidate.content.bindingDocuments).toHaveLength(8);
  expect(x.manifestCandidate.content.bindingDocuments.every(a=>hash(readFileSync(a.path))===a.sha256)).toBe(true);
  expect(x.sourceInventory.some(a=>a.path==="scripts/v39_phase6_enable_source_owner_v39.ts")).toBe(true);
  expect(x.sourceInventory.every(a=>!a.path.startsWith("data-collection/")&&!a.path.includes(".env"))).toBe(true);
  expect(JSON.stringify(x.manifestCandidate.content)).not.toContain(code);
  expect(x.configCandidate.content.splitRule).toMatchObject({train:[1,20],validation:[21,25],test:[26,31],
   groupBy:"flight_instance_id",concreteTestRowsMaterialized:false});
  expect(x.configCandidate.content.source.cycleRestCeilingUnits).toBe(46468);
  expect(x.geometry).toMatchObject({dayPlanCount:31,totalQueries:6144,totalReservedUnits:41960});
  expect(x.geometry.dayPlanSha256s).toHaveLength(31);
  expect(x.geometry.dayPlanSha256s.every((v,i)=>v.runDayIndex===i+1&&/^[a-f0-9]{64}$/.test(v.sha256))).toBe(true);
  expect(x).toMatchObject({actualAuthorizationId:null,finalPredecessorEvidenceIds:null,
   stagePacketExported:false,candidateDigestsApproved:false,sourceRightsApproved:false,
   scientificFreezeApproved:false,phase6PaidGo:false});
  expect(JSON.stringify(x)).not.toContain("REVIEW-ONLY-NOT-AN-AUTHORIZATION");
  expect(JSON.stringify(x)).not.toContain('"unsignedStageInput"');
  expect(()=>inspectP6ExactReviewCheckout("0".repeat(40))).toThrow("REVIEW_CHECKOUT_NOT_EXACT");
  const noRefill=prepareP6ActualReleaseIdentityReview(code,0);
  expect(noRefill.configCandidate.content.source.cycleRestCeilingUnits).toBe(49468);
  expect(noRefill.configCandidate.content.jointBudgetReviewCandidate.authorizedFutureRefillApiUnits).toBe(0);
  expect(noRefill.configCandidate.content.alertSafetyCandidate.alertRunSpendCeilingCredits).toBe(680);
  expect(noRefill.configCandidate.sha256).toBe(digest(noRefill.configCandidate.content));
  expect(noRefill.manifestCandidate.sha256).toBe(digest(noRefill.manifestCandidate.content));
  expect(noRefill.manifestCandidate.content.configCandidateSha256).toBe(noRefill.configCandidate.sha256);
  expect(noRefill.configCandidate.sha256).not.toBe(x.configCandidate.sha256);
  expect(noRefill.manifestCandidate.sha256).not.toBe(x.manifestCandidate.sha256);
  expect(noRefill.geometry).toEqual(x.geometry);
  expect(noRefill.sourceInventory).toEqual(x.sourceInventory);
  expect(noRefill.rangeEvidenceCandidate).toEqual(x.rangeEvidenceCandidate);
  expect(noRefill.timingEvidenceCandidate).toEqual(x.timingEvidenceCandidate);
  expect(noRefill).toMatchObject({actualAuthorizationId:null,finalPredecessorEvidenceIds:null,
   stagePacketExported:false,candidateDigestsApproved:false,sourceRightsApproved:false,
   scientificFreezeApproved:false,phase6PaidGo:false});
 },20000);

});
