/** Owner-local exact first-seed release candidate exporter.
 * Reuses existing preview and assembly functions. No signing, staging,
 * secret changes, database, network, fresh randomness or approval inference.
 */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {splitRuleHash} from "../server/lib/disruption/manifest_v3";
import {readFileSync,writeFileSync,mkdirSync,realpathSync} from "node:fs";
import {resolve,dirname,relative,isAbsolute} from "node:path";
import {fileURLToPath} from "node:url";
import {buildP5ProspectiveSeedCalendarPreview} from "./v39_phase5_prospective_seed_to_calendar_preview_v39.mjs";
import {assembleP6ActualFirstSeedReleaseCandidate,proposeP5ActualNov22Budget,reconcileP6ActualJointBudget,P6_CURRENT_QUOTA_EVIDENCE_PATH} from "../server/lib/disruption/phase5ActualNov22BudgetProposal_v39";
import {buildP5V0082UnknownAirportSevenCostOnlyDraft} from "../server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs";
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const H=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("HOLD_P6_ACTUAL_RELEASE_EXPORT_"+s);};
type AssemblyInput=Parameters<typeof assembleP6ActualFirstSeedReleaseCandidate>[0];
/** Preserve the one actual first seed, used for both review and export. */
export function replayP6OriginalSeed(){
 const seedBytes=readFileSync("data-collection/phase5/planning/2026-11-15_actual_first_seed_43700154416.json");
 if(hash(seedBytes)!=="66e523802a513b9ce57ca1130ad282577ff53fa7522c78364ba5ef72f72f0d93")hold("ORIGINAL_SEED_CHANGED");
 const preview=buildP5ProspectiveSeedCalendarPreview({
  seedBundle:JSON.parse(seedBytes.toString("utf8")),
  expected:{bundleCommitmentSha256:"925b94cbb236d0a981637eeccae985a2924cc3f11afcb47727b3acf93e792bcf",
   reviewedCodeSha:"09b80926caae24ba07a1f8a20c819090d8f2528c",workflowRunId:"43700154416",
   dateCandidateBytesSha256:"9be154ce8ac2d897643558ff0c575a83a33bc8a4f77768d68fdd791a73c12311",firstRunDateUtc:"2026-11-22"},
  ownerEvidenceBytes:readFileSync("data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json"),
  dateCandidateBytes:readFileSync("data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json")});
 if(preview.sha256!=="003885e93f3a3daa1098f648502c5a7dd3beb6e317e906ffe281760aaba763af")hold("ORIGINAL_PREVIEW_CHANGED");
 return preview;
}

/** Actual prospective calendar + exact cost rows, already present in original
 * evidence and original compiler. Explicit nulls prevent this review-only
 * input from being mistaken for a runnable stage packet. No false pins.
 */
export type P6ReviewRefillChoice=0|3000|6000;
export function prepareP6ActualReviewInput(codeSha:string,reviewRefillChoice:P6ReviewRefillChoice=3000){
 if(![0,3000,6000].includes(reviewRefillChoice))hold("EXPLICIT_REVIEW_REFILL_CHOICE_REQUIRED");
 if(!/^[a-f0-9]{40}$/.test(codeSha))hold("EXACT_REVIEW_CODE_SHA_REQUIRED");
 const preview=replayP6OriginalSeed();
 const draft=preview.result.calendarDraft,proposal=proposeP5ActualNov22Budget(draft);
 const ownerEvidencePath="data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json";
 const ownerEvidenceBytes=readFileSync(ownerEvidencePath);
 const owner=JSON.parse(ownerEvidenceBytes.toString("utf8"));
 const quotaPath=P6_CURRENT_QUOTA_EVIDENCE_PATH;
 const quotaBytes=readFileSync(quotaPath),quota=JSON.parse(quotaBytes.toString("utf8"));
 if(owner.frozenFrameHash!=="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94"||
    owner.selectedAirportIcaosSha256!==draft.actualCorrectedPairSelectionSha256||
    quota.observedAtUtc!=="2026-11-16T09:18:44.000Z"||quota.apiUnitsRemaining!==59968||quota.apiUnitsLimit!==60000||quota.alertCreditsRemaining!==1830||quota.requestsRemaining!==239973||quota.paidProviderCalls!==0||quota.databaseWrites!==0||
    quota.sourceRightsCertified!==false||quota.phase6PaidGo!==false)
  hold("ORIGINAL_FRAME_OR_ACCOUNT_EVIDENCE_CHANGED");
 const settings=proposal.settings;
 const externalCandidate={
  schema:"v39.phase5.b0062-calendar-slot-review-input.v1" as const,
  expectedExternalCalendarDraftJsonSha256:proposal.calendarDraftJsonSha256,
  expectedCalendarRowsSha256:proposal.calendarRowsSha256,
  expectedCorrectedPairSelectionSha256:draft.actualCorrectedPairSelectionSha256,
  manifestSha256:null,calendarSha256:null,configSha256:null,
  frameSha256:owner.frozenFrameHash as string,codeSha40:codeSha,
  phase6AuthorizationId:null,predecessorEvidenceIds:null,alertSafety:null,
  providerRangeEvidenceSha256:null,timingEvidenceSha256:null,
  asOfUtc:quota.observedAtUtc as string,
  providerMaxRangeMinutes:settings.providerMaxRangeMinutes,
  refreshEveryMinutes:settings.refreshEveryMinutes,
  physicalGetsPerRefreshUpperBound:settings.physicalGetsPerRefreshUpperBound,
  getLeadSeconds:settings.getLeadSeconds,apiUnitsPerPhysicalGet:settings.apiUnitsPerPhysicalGet,
  cycleRestCeilingUnits:settings.cycleRestCeilingUnits,
  protectedRestFloorUnits:settings.protectedRestFloorUnits,
  explicitOtherOnlyChargeDates:proposal.explicitOtherOnlyChargeDates,
  jointBudgetReview:null,
  restOtherByUtcDate:proposal.physicalUtcRows.map(r=>({chargeDayUtc:r.chargeDayUtc,
   dailyRestCeilingUnits:settings.dailyRestCeilingUnits,categories:{
    FIDS_RETRY_UNIT_BUDGET:r.categories.FIDS_RETRY_UNIT_BUDGET,
    VALIDATION_UNIT_BUDGET:r.categories.VALIDATION_UNIT_BUDGET,
    OUTCOME_REST_UNIT_BUDGET:r.categories.OUTCOME_REST_UNIT_BUDGET,
    HISTORY_BOOTSTRAP_UNIT_BUDGET:r.categories.HISTORY_BOOTSTRAP_UNIT_BUDGET,
    DIAGNOSTIC_UNIT_BUDGET:r.categories.DIAGNOSTIC_UNIT_BUDGET}}))
 };
 // Concrete choices for owner review, using the dated actual account only.
 // 500 REST / 150 Alert ending margins are proposals, NOT measured or
 // approved. No current refill permission, balance, or live GO inferred.
 const jointBudgetScenarios=[0,3000,6000].map(refill=>{
  const candidate={
   accountEvidenceSha256:hash(quotaBytes),observedAtUtc:quota.observedAtUtc as string,
   apiUnitsLimit:quota.apiUnitsLimit as number,apiUnitsRemaining:quota.apiUnitsRemaining as number,
   apiUnitsResetAtUtc:quota.apiUnitsResetAtUtc as string,alertCreditsRemaining:quota.alertCreditsRemaining as number,
   preFreezeProjectApiUnits:quota.apiUnitsLimit-quota.apiUnitsRemaining,
   authorizedFutureRefillApiUnits:refill,authorizedFutureRefillAlertCredits:refill,
   endingApiMarginUnits:500,preRunAlertSpendCeilingCredits:0,endingAlertMarginCredits:150
  };
  const alertRunCeiling=candidate.alertCreditsRemaining+refill-1000-candidate.endingAlertMarginCredits;
  return {status:"DATED_ACCOUNT_BUDGET_SCENARIO_NOT_APPROVED",candidate,
   proposedAlertRunCeiling:alertRunCeiling,
   reviewed:false,arithmetic:reconcileP6ActualJointBudget(candidate,proposal,alertRunCeiling)};
 });
 // Preserve the actually completed clock run and earlier measured safety
 // baseline; neither provides a new account-specific terms or throughput SLA.
 const clockPath="data-collection/phase5/evidence/2026-11-16_prearm_clock_43832469501.json";
 const clockBytes=readFileSync(clockPath),clock=JSON.parse(clockBytes.toString("utf8"));
 if(clock.workflowRunId!==43832469501||clock.ownedReceiptCount!==8||
    clock.reviewedMainSha!=="bb7b6d12f194cdf4c4379be41d2cab5ecc84934a"||
    clock.rows?.length!==8||clock.rows.some((x:any,i:number)=>
     x.receipt.wave!==Math.floor(i/4)+1||x.receipt.slot!==i%4+1||
     x.receipt.status!=="OBSERVED_READY_AND_TIMELY_NO_PROVIDER"||
     x.receipt.runId!==43832469501||x.receipt.providerCalls!==0||
     x.receipt.productionDatabaseWrites!==0||
     !Number.isFinite(x.receipt.releaseSlipMs)||x.receipt.releaseSlipMs<0||x.receipt.releaseSlipMs>7)||
    clock.productionNeonOrProviderLatencyCertified!==false||clock.phase6PaidGo!==false)
  hold("ACTUAL_CLOCK_RECEIPT_DRIFT");
 const smokePath="data-collection/evidence/original-artifacts/other/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json";
 const smokeBytes=readFileSync(smokePath),smoke=JSON.parse(smokeBytes.toString("utf8"));
 if(smoke.status!=="PASS"||smoke.authorizationId!=="AUTH-20260915-P2F095554"||
    smoke.unsettledBurstMarginCredits!==50||smoke.protectedAlertFloor!==1000||
    smoke.settlementInitialWaitSeconds!==30||smoke.settlementPollIntervalSeconds!==10||
    smoke.settlementStableReadCount!==3||smoke.settlementTimeoutSeconds!==600||
    smoke.watchdogPollMs!==5000||smoke.exactExternalInternalReconciliation!==true)
  hold("HISTORICAL_SAFETY_SMOKE_DRIFT");
 // Explicit review scenario, not approved stage input. The historical 3k
 // default preserves exact prior review receipts; the no-refill option is
 // the current minimum-release proposal. Neither grants Alert spend.
 const recommendedFinancial=jointBudgetScenarios[reviewRefillChoice===0?0:reviewRefillChoice===3000?1:2];
 const proposedAlertSafety={
  unsettledBurstMarginCredits:smoke.unsettledBurstMarginCredits as number,
  protectedAlertFloorCredits:smoke.protectedAlertFloor as number,
  alertRunSpendCeilingCredits:recommendedFinancial.proposedAlertRunCeiling,
  // Higher conservative proposal following the later Gate05 observation;
  // the 4-airport SEND burst and latency remain independently unproved.
  dailySoftStopMarginCredits:150,productionReconcileToleranceCredits:0,
  startAdmissionToleranceSeconds:120,
  safetyWatchdogPollMs:smoke.watchdogPollMs as number,
  settlementInitialWaitSeconds:smoke.settlementInitialWaitSeconds as number,
  settlementPollIntervalSeconds:smoke.settlementPollIntervalSeconds as number,
  settlementStableReadCount:smoke.settlementStableReadCount as number,
  settlementTimeoutSeconds:smoke.settlementTimeoutSeconds as number
 };
 const timingCandidate={
  timingEvidenceSha256:null,
  // Demonstrated geometry scenario, NOT measured runtime or approval.
  maxPopulationStalenessSeconds:2700,maxSchedulerSlipSeconds:120,
  maxResponseAndPersistSeconds:180,minimumPreCommitMarginSeconds:120,
  minimumPreparationLeadMinutes:20
 };
 return {schema:"v39.phase6.actual-first-seed-prefilled-review-only.v1" as const,
  status:"REAL_METADATA_PARTIAL_REVIEW_NOT_STAGE_INPUT_NO_GO" as const,
  reviewedCodeCandidate:codeSha,originalPreviewSha256:preview.sha256,
  originalSeedWorkflowRunId:"43700154416",
  frameEvidence:{path:ownerEvidencePath,sha256:hash(ownerEvidenceBytes),observedUtc:owner.observedUtc,
   frameHash:owner.frozenFrameHash,currentFrameRevalidated:false},
  quotaEvidence:{path:quotaPath,sha256:hash(quotaBytes),observedAtUtc:quota.observedAtUtc,
   unitsRemaining:quota.apiUnitsRemaining,unitsLimit:quota.apiUnitsLimit,alertCredits:quota.alertCreditsRemaining,
   resetAtUtc:quota.apiUnitsResetAtUtc,currentBalanceRevalidated:false},
  calendarDraft:draft,shapeEnvelope:preview.result.shapeEnvelope,
  externalCandidate,timingCandidate,jointBudgetScenarios,
  concreteReviewRecommendation:{
   status:"REVIEW_PROPOSAL_ONLY_NOT_SIGNED_NOT_APPROVED",
   calendarRowsDigestCandidate:proposal.calendarRowsSha256,
   jointBudgetReview:recommendedFinancial.candidate,
   netRestCeilingUnits:recommendedFinancial.arithmetic.netRestCeiling,
   proposedAlertSafety,
   historicalSmoke:{path:smokePath,sha256:hash(smokeBytes),
    evidenceId:"RUN-20260915-D61659402642563B6FEDF2AAA981474838BF088B67526528426F9702509C9D1B",
    observedMaximumUnsettledGap:smoke.measuredMaxUnsettledCreditGap,
    singleAirportHistoricalOnly:true},
   actualClock:{path:clockPath,sha256:hash(clockBytes),runId:clock.workflowRunId,
    receiptCount:clock.ownedReceiptCount,observedReadyMsRange:clock.observedReadyMsRange,
    observedReleaseSlipMsRange:clock.observedReleaseSlipMsRange},
   futureRefillConfirmed:false,fullScopeAlertSafetyMeasured:false,
   liveProviderRangeAndProductionTimingCertified:false,
   independentReviewerApproved:false,stageAuthorizationGranted:false
  },
  missingExternalFields:Object.entries(externalCandidate).filter(([,v])=>v===null).map(([k])=>k),
  sourceRightsApproved:false,rangePriceAccountSpecificVerified:false,timingBoundsMeasured:false,
  reviewedMetadataOnly:false,actualBudgetReviewApproved:false,
  proposedSourceQueries:proposal.nativeLeadDiagnostic.templateCount,
  proposedTotalReservedUnits:proposal.totalReservedUnits,proposedPeakDailyUnits:proposal.peakDailyUnits,
  proposedProtectedFloorUnits:proposal.protectedFloorUnits,proposedUnallocatedUnits:proposal.unallocatedUnits,
  providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
}
/** Bind review-only identity bytes to actual checked-out code and real evidence.
 * This is not a new release gate. Git commit/tree is recorded separately from
 * the content manifest, so committing only an approval/ledger or metadata
 * day-plan cannot create a self-referential AUTH/manifest/code SHA cycle.
 * No private env, provider Contents, signing keys or approved stage packet. */
const reviewGit=(argv:string[])=>execFileSync("git",argv,{
 encoding:"utf8",stdio:["ignore","pipe","ignore"],maxBuffer:12*1024*1024,timeout:20000
});
export function inspectP6ExactReviewCheckout(codeSha:string){
 if(!/^[a-f0-9]{40}$/.test(codeSha)||
    realpathSync(reviewGit(["rev-parse","--show-toplevel"]).trim())!==realpathSync(process.cwd())||
    reviewGit(["rev-parse","HEAD"]).trim()!==codeSha||
    reviewGit(["status","--porcelain","--untracked-files=no"]).trim()!=="")
  hold("REVIEW_CHECKOUT_NOT_EXACT_CLEAN_TRACKED_CODE");
 const treeSha=reviewGit(["rev-parse","HEAD^{tree}"]).trim();
 if(!/^[a-f0-9]{40}$/.test(treeSha))hold("REVIEW_TREE_IDENTITY");
 return {codeSha,treeSha};
}
const inExecutableScope=(p:string)=>/^(?:server|scripts|migrations|tests|shared|client|patches|\.github\/(?:workflows|actions))\//.test(p)||
 /^(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|tsconfig(?:\.[\w-]+)?\.json|[\w-]+\.config\.[cm]?[jt]s|\.npmrc|\.nvmrc|\.node-version)$/.test(p);
function readReleaseSourceInventory(){
 const rows=reviewGit(["ls-tree","-r","-z","--full-tree","HEAD"]).split("\0").filter(Boolean)
  .map(entry=>{
   const tab=entry.indexOf("\t"),metadata=entry.slice(0,tab).split(" "),path=entry.slice(tab+1);
   return {mode:metadata[0],type:metadata[1],gitBlob:metadata[2],path};
  }).filter(x=>inExecutableScope(x.path)).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(rows.length<100||rows.some(x=>!["100644","100755"].includes(x.mode)||x.type!=="blob"||!/^[a-f0-9]{40}$/.test(x.gitBlob)))
  hold("RELEASE_SOURCE_INVENTORY_SCOPE");
 // Verify raw bytes against the tracked Git blob, not only the stat cache.
 const sources=rows.map(x=>{
  const raw=readFileSync(x.path);
  const blob=createHash("sha1").update(Buffer.from("blob "+raw.length+"\0")).update(raw).digest("hex");
  if(blob!==x.gitBlob)hold("REVIEW_TRACKED_SOURCE_BYTES_DRIFT");
  return {path:x.path,mode:x.mode,sha256:hash(raw)};
 });
 for(const path of ["package.json","package-lock.json","scripts/v39_phase6_actual_release_candidate_export_v39.ts",
  "scripts/v39_phase6_inert_release_stage_manual_v39.mjs","scripts/v39_phase6_enable_source_owner_v39.ts",
  ".github/workflows/phase5-exact-inert-release-stage-manual.yml","server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts"])
  if(!sources.some(x=>x.path===path))hold("RELEASE_SOURCE_INVENTORY_REQUIRED_OWNER_MISSING");
 return sources;
}
const fileEvidence=(path:string)=>({path,sha256:hash(readFileSync(path))});
const docEvidence=(paths:string[])=>paths.map(fileEvidence);
/** Uses the exact actual seed and latest retained account/timing evidence.
 * The returned geometry is compiled by the original assembler with a
 * deliberately NOT-AUTH identity and historical references, never a claimed
 * authorization. Only counts and digests are returned; stage bytes and
 * runnable day-plan bytes are not emitted here. */
export function prepareP6ActualReleaseIdentityReview(codeSha:string,reviewRefillChoice:P6ReviewRefillChoice=3000){
 const checkout=inspectP6ExactReviewCheckout(codeSha);
 const review=prepareP6ActualReviewInput(codeSha,reviewRefillChoice),r=review.concreteReviewRecommendation;
 const seedPath="data-collection/phase5/planning/2026-11-15_actual_first_seed_43700154416.json";
 const seed=JSON.parse(readFileSync(seedPath,"utf8")),preview=replayP6OriginalSeed();
 const {timingEvidenceSha256:_unknownTiming,...timingLimits}=review.timingCandidate;
 const timingEvidence={
  schema:"v39.phase6.prearm-timing-policy-evidence-candidate.v1",
  clock: r.actualClock,
  historicalSourceAndPost:docEvidence([
   "data-collection/phase4/2026-11-05_G5A_NOV06_1400Z_NEW_PROSPECTIVE_RELEASE_GATE.md",
   "data-collection/phase5/2026-11-16_EXACT_POSTSTAGE_COMMISSIONING_READBACK.md",
   "data-collection/phase5/2026-11-16_PREARM_CLOCK_TWO_WAVE_VALIDATION_NO_GO.md"]),
  proposedLimits:timingLimits,
  liveNeonAndProviderBoundsCertified:false,sustainedCronCertified:false,independentReviewApproved:false
 };
 const timingSha=hash(JSON.stringify(timingEvidence));
 const rangeEvidence={
  schema:"v39.phase6.provider-range-price-evidence-candidate.v1",
  originalHistoricalAccount:fileEvidence("data-collection/evidence/early-gates/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json"),
  currentQuota:review.quotaEvidence,
  historicalPaidSource:docEvidence([
   "data-collection/phase3/2026-10-27_GATE05C_FIDS_WITHLEG_PAID_SCHEMA_RETEST_PROTOCOL.md",
   "data-collection/phase4/2026-11-01_GATE5_REAL_PAID_FIDS_ONE_NONRETAINED_SEMANTIC_CHECK.md",
   "data-collection/phase5/2026-11-16_FINAL_DUAL_LEDGER_REVIEW_AND_COMMISSIONING.md"]),
  proposedProviderRangeMinutes:review.externalCandidate.providerMaxRangeMinutes,
  proposedApiUnitsPerPhysicalGet:review.externalCandidate.apiUnitsPerPhysicalGet,
  publicContractRangeBasis:"September 7 provider announcement summarized in cited repository checkpoint; prior 12h documented range, not measured today",
  currentAccountRangePriceCertified:false,sourceRightsApproved:false,independentReviewApproved:false
 };
 const rangeSha=hash(JSON.stringify(rangeEvidence));
 const proposal=proposeP5ActualNov22Budget(review.calendarDraft);
 const config={
  schema:"v39.phase6.actual-first-seed-config-candidate.v1",
  status:"PROPOSED_NOT_FROZEN",
  frameSha256:review.frameEvidence.frameHash,
  calendarRowsSha256:review.externalCandidate.expectedCalendarRowsSha256,
  originalSeedSha256:hash(readFileSync(seedPath)),
  // Existing split helper; reuse the original revealed treatment seed as
  // the explicit split-rule fingerprint input, never draw another seed.
  splitRule:{sha256:splitRuleHash(seed.treatmentSeedHex),seedBasis:"original treatmentSeedHex",
   train:[1,20],validation:[21,25],test:[26,31],groupBy:"flight_instance_id",
   concreteTestRowsMaterialized:false},
  selectedT:"PROVIDER_NATIVE_SCHEDULE_CANDIDATE_NOT_CERTIFIED_GATE_OUT",
  primary:"T-6h_actual_gate_out_delay_minutes_conditional",
  pairedUpdate:"T-90m",comparator:"T-24h",airborneEtaSeparate:true,
  actualOnlyGateOutCertified:false,sourceRightsApproved:false,
  source:{...proposal.settings,cycleRestCeilingUnits:r.netRestCeilingUnits,
   preHorizons:["T-24h","T-6h","T-90m"],timing:timingLimits},
  physicalUtcCategoryRowsSha256:hash(JSON.stringify(proposal.physicalUtcRows)),
  jointBudgetReviewCandidate:r.jointBudgetReview,alertSafetyCandidate:r.proposedAlertSafety,
  timingEvidenceCandidateSha256:timingSha,rangeEvidenceCandidateSha256:rangeSha,
  legacyAlertStartApproved:false,reviewApproved:false,phase6PaidGo:false
 };
 const configSha=hash(JSON.stringify(config));
 const sources=readReleaseSourceInventory(),sourceInventorySha256=hash(JSON.stringify(sources));
 const historicalRefs=[
  "RUN-20260913-643BF82FD98B3DA416433077BB7E21DC231C07A2F34289245436EC160C7D8984",
  r.historicalSmoke.evidenceId
 ];
 const ledger=readFileSync("data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md","utf8");
 if(historicalRefs.some(id=>!ledger.includes(id)))hold("HISTORICAL_LEDGER_REFERENCE_MISSING");
 const manifest={
  schema:"v39.phase6.actual-first-seed-release-manifest-candidate.v1",
  status:"UNSIGNED_REVIEW_CANDIDATE_NOT_SCIENTIFIC_FREEZE",
  sourceInventorySha256,executableFileCount:sources.length,
  scope:"tracked source, scripts, tests, migrations, workflows and runtime dependency/config files; exact checkout separately identified",
  bindingDocuments:docEvidence([
   "data-collection/plans/V3.9_DataCollectPlan_f.8.md",
   "data-collection/plans/V3.9_f.8_Gate5_Expedited_Collection_Amendment_A_20261102.md",
   "data-collection/plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md",
   "data-collection/plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md",
   "data-collection/plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md",
   "data-collection/plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md",
   "data-collection/phase5/2026-11-11_AMENDMENT_E_CANONICAL_TRAVELER_PREDICTIONS_C_D_FREE_ADSB.md",
   "data-collection/phase5/2026-11-10_ADR_PHASE6_AUTONOMOUS_C_PLUS_D_HYBRID_DESIGN.md"]),
  originalSeed:fileEvidence(seedPath),originalPreviewSha256:review.originalPreviewSha256,
  frameEvidence:review.frameEvidence,
  calendarRowsSha256:config.calendarRowsSha256,configCandidateSha256:configSha,
  timingEvidenceCandidateSha256:timingSha,rangeEvidenceCandidateSha256:rangeSha,
  historicalRefs,finalPredecessorsApproved:false,scientificFreezeApproved:false,phase6PaidGo:false
 };
 const manifestSha=hash(JSON.stringify(manifest));
 const proposed={...review.externalCandidate,manifestSha256:manifestSha,calendarSha256:config.calendarRowsSha256,
  configSha256:configSha,phase6AuthorizationId:"REVIEW-ONLY-NOT-AN-AUTHORIZATION",
  predecessorEvidenceIds:historicalRefs,alertSafety:r.proposedAlertSafety,
  providerRangeEvidenceSha256:rangeSha,timingEvidenceSha256:timingSha,
  cycleRestCeilingUnits:r.netRestCeilingUnits,jointBudgetReview:r.jointBudgetReview};
 const timing={...timingLimits,timingEvidenceSha256:timingSha};
 const geometry=assembleP6ActualFirstSeedReleaseCandidate({
  draft:preview.result.calendarDraft,envelope:preview.result.shapeEnvelope,external:proposed,
  expectedExternalInputSha256:hash(JSON.stringify(proposed)),timing,expectedTimingJsonSha256:hash(JSON.stringify(timing))});
 if(geometry.dayPlans.files.length!==31||geometry.dayPlans.totalPlannedQueries!==6144||geometry.totalReservedUnits!==41960)
  hold("ACTUAL_REVIEW_GEOMETRY_DRIFT");
 const after=inspectP6ExactReviewCheckout(codeSha);
 if(after.treeSha!==checkout.treeSha)hold("REVIEW_CHECKOUT_CHANGED");
 return {schema:"v39.phase6.actual-first-seed-identity-review-only.v1",
  status:"EXACT_CONTENT_DIGESTS_AND_GEOMETRY_REVIEW_ONLY_NOT_RELEASE",
  checkout,manifestCandidate:{sha256:manifestSha,content:manifest},
  configCandidate:{sha256:configSha,content:config},
  timingEvidenceCandidate:{sha256:timingSha,content:timingEvidence},
  rangeEvidenceCandidate:{sha256:rangeSha,content:rangeEvidence},
  calendarRowsDigestCandidate:config.calendarRowsSha256,sourceInventory:sources,
  geometry:{dayPlanCount:geometry.dayPlans.files.length,totalQueries:geometry.dayPlans.totalPlannedQueries,
   totalReservedUnits:geometry.totalReservedUnits,dayPlanSha256s:geometry.dayPlans.dayPlanSha256s,
   coverageGridSha256:geometry.dayPlans.coverageGridSha256},
  // Do not return the non-AUTH stage packet or its hash: reviewer approval
  // and actual predecessor IDs must replace the review-only context.
  actualAuthorizationId:null,finalPredecessorEvidenceIds:null,
  candidateDigestsApproved:false,stagePacketExported:false,
  sourceRightsApproved:false,scientificFreezeApproved:false,phase6PaidGo:false};
}
export function compileP6ActualCandidateExport(input:{
 externalBytes:Buffer;expectedExternalFileSha256:string;
 timingBytes:Buffer;expectedTimingFileSha256:string;
}){
 const {externalBytes,timingBytes}=input;
 if(!Buffer.isBuffer(externalBytes)||externalBytes.length<100||externalBytes.length>100000||
    !Buffer.isBuffer(timingBytes)||timingBytes.length<100||timingBytes.length>10000||
    !H.test(input.expectedExternalFileSha256)||!H.test(input.expectedTimingFileSha256)||
    hash(externalBytes)!==input.expectedExternalFileSha256||hash(timingBytes)!==input.expectedTimingFileSha256)
  hold("EXACT_REVIEW_INPUT_FILE_BYTES_REQUIRED");
 let external:AssemblyInput["external"],timing:AssemblyInput["timing"];
 try{external=JSON.parse(externalBytes.toString("utf8"));timing=JSON.parse(timingBytes.toString("utf8"));}
 catch{return hold("INVALID_REVIEW_JSON");}
 const preview=replayP6OriginalSeed();
 const assembled=assembleP6ActualFirstSeedReleaseCandidate({draft:preview.result.calendarDraft,envelope:preview.result.shapeEnvelope,
  external,expectedExternalInputSha256:hash(JSON.stringify(external)),timing,expectedTimingJsonSha256:hash(JSON.stringify(timing))});
 const files=assembled.dayPlans.files.map(f=>({path:f.path,sha256:f.sha256,bytes:f.bytes}));
 const stageBytes=JSON.stringify(assembled.unsignedStageInput);
 if(hash(stageBytes)!==assembled.unsignedStageInputSha256||files.length!==31||
    files.some((f,i)=>f.path!=="data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json"||hash(f.bytes)!==f.sha256))
  hold("EXACT_OUTPUT_PARITY");
 files.push({path:"unsigned-stage-input.json",sha256:hash(stageBytes),bytes:stageBytes});
 const cost=buildP5V0082UnknownAirportSevenCostOnlyDraft({schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",slotBudgetInput:assembled.unsignedStageInput.slotBudgetInput,expectedReviewerSlotEnvelopeSha256:assembled.unsignedStageInput.expectedSignedSlotEnvelopeSha256});
 const summary={status:"ACTUAL_FIRST_SEED_LOCAL_REVIEW_EXPORT_UNSIGNED_NO_GO",
  unsignedCostOnlyEnvelopeSha256:cost.costOnlyCategoryDraftSha256,unsignedStageInputByteCount:Buffer.byteLength(stageBytes),
  originalPreviewSha256:preview.sha256,inputExternalFileSha256:input.expectedExternalFileSha256,inputTimingFileSha256:input.expectedTimingFileSha256,
  unsignedStageInputSha256:assembled.unsignedStageInputSha256,dayPlanSha256s:assembled.dayPlans.dayPlanSha256s,
  sourceQueries:assembled.dayPlans.totalPlannedQueries,totalReservedUnits:assembled.totalReservedUnits,peakDailyUnits:assembled.peakDailyUnits,
  jointBudget:assembled.jointBudget,
  independentReleaseStillRequired:true,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
 return {summary,files};
}
export function writeP6ActualCandidateExport(result:ReturnType<typeof compileP6ActualCandidateExport>,destination:string){
 const root=realpathSync(process.cwd()),out=resolve(destination),parent=realpathSync(dirname(out));
 const verifiedOut=resolve(parent,out.slice(dirname(out).length+1));
 const rel=relative(root,verifiedOut);
 if(!rel||(!rel.startsWith(".."+"/")&&rel!==".."&&!isAbsolute(rel)))hold("OUTPUT_MUST_BE_OUTSIDE_REPOSITORY");
 // Atomic admission of a fresh directory; existing exports never overwritten.
 mkdirSync(verifiedOut,{mode:0o700});
 for(const f of result.files){
  if(hash(f.bytes)!==f.sha256||!(/^(?:data-collection\/phase5\/planning\/phase6-source-day-(?:0[1-9]|[12][0-9]|3[01])\.json|unsigned-stage-input\.json)$/.test(f.path)))hold("INVALID_OUTPUT_FILE");
  const path=resolve(verifiedOut,f.path);
  mkdirSync(dirname(path),{recursive:true,mode:0o700});
  writeFileSync(path,f.bytes,{flag:"wx",mode:0o600});
 }
 writeFileSync(resolve(verifiedOut,"review-summary.json"),JSON.stringify(result.summary),{flag:"wx",mode:0o600});
 return result.summary;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  // Review-only packet of prospective metadata; no actual provider Contents.
  if((process.argv[2]==="--review-only"||process.argv[2]==="--review-only-no-refill")&&process.argv.length===4){
   const refillChoice=process.argv[2]==="--review-only-no-refill"?0:3000;
   const review=prepareP6ActualReviewInput(process.argv[3],refillChoice);
   console.log(JSON.stringify({...review,releaseIdentityReview:prepareP6ActualReleaseIdentityReview(process.argv[3],refillChoice)},null,2));
  }else{
  if(process.env.GITHUB_ACTIONS==="true"||process.argv.length!==7)hold("OWNER_LOCAL_EXACT_ARGUMENTS");
  const [externalPath,externalSha,timingPath,timingSha,out]=process.argv.slice(2);
  const result=compileP6ActualCandidateExport({externalBytes:readFileSync(externalPath),expectedExternalFileSha256:externalSha,
   timingBytes:readFileSync(timingPath),expectedTimingFileSha256:timingSha});
  console.log(JSON.stringify(writeP6ActualCandidateExport(result,out)));
  }
 }catch(e){const msg=String((e as Error)?.message??"");console.error(/^HOLD_P6_ACTUAL_RELEASE_EXPORT_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P6_ACTUAL_RELEASE_EXPORT_REDACTED_NO_RELEASE");process.exitCode=2;}
}
