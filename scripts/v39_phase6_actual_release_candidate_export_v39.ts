/** Owner-local exact first-seed release candidate exporter.
 * Reuses existing preview and assembly functions. No signing, staging,
 * secret changes, database, network, fresh randomness or approval inference.
 */
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdirSync,realpathSync} from "node:fs";
import {resolve,dirname,relative,isAbsolute} from "node:path";
import {fileURLToPath} from "node:url";
import {buildP5ProspectiveSeedCalendarPreview} from "./v39_phase5_prospective_seed_to_calendar_preview_v39.mjs";
import {assembleP6ActualFirstSeedReleaseCandidate,proposeP5ActualNov22Budget,reconcileP6ActualJointBudget} from "../server/lib/disruption/phase5ActualNov22BudgetProposal_v39";
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
export function prepareP6ActualReviewInput(codeSha:string){
 if(!/^[a-f0-9]{40}$/.test(codeSha))hold("EXACT_REVIEW_CODE_SHA_REQUIRED");
 const preview=replayP6OriginalSeed();
 const draft=preview.result.calendarDraft,proposal=proposeP5ActualNov22Budget(draft);
 const ownerEvidencePath="data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json";
 const ownerEvidenceBytes=readFileSync(ownerEvidencePath);
 const owner=JSON.parse(ownerEvidenceBytes.toString("utf8"));
 const quotaPath="data-collection/phase5/evidence/2026-11-15_owner_actual_free_quota_59968.json";
 const quotaBytes=readFileSync(quotaPath),quota=JSON.parse(quotaBytes.toString("utf8"));
 if(owner.frozenFrameHash!=="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94"||
    owner.selectedAirportIcaosSha256!==draft.actualCorrectedPairSelectionSha256||
    quota.apiUnitsRemaining!==59968||quota.apiUnitsLimit!==60000||quota.alertCreditsRemaining!==1830||
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
  missingExternalFields:Object.entries(externalCandidate).filter(([,v])=>v===null).map(([k])=>k),
  sourceRightsApproved:false,rangePriceAccountSpecificVerified:false,timingBoundsMeasured:false,
  reviewedMetadataOnly:false,actualBudgetReviewApproved:false,
  proposedSourceQueries:proposal.nativeLeadDiagnostic.templateCount,
  proposedTotalReservedUnits:proposal.totalReservedUnits,proposedPeakDailyUnits:proposal.peakDailyUnits,
  proposedProtectedFloorUnits:proposal.protectedFloorUnits,proposedUnallocatedUnits:proposal.unallocatedUnits,
  providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
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
  if(process.argv[2]==="--review-only"&&process.argv.length===4){
   console.log(JSON.stringify(prepareP6ActualReviewInput(process.argv[3]),null,2));
  }else{
  if(process.env.GITHUB_ACTIONS==="true"||process.argv.length!==7)hold("OWNER_LOCAL_EXACT_ARGUMENTS");
  const [externalPath,externalSha,timingPath,timingSha,out]=process.argv.slice(2);
  const result=compileP6ActualCandidateExport({externalBytes:readFileSync(externalPath),expectedExternalFileSha256:externalSha,
   timingBytes:readFileSync(timingPath),expectedTimingFileSha256:timingSha});
  console.log(JSON.stringify(writeP6ActualCandidateExport(result,out)));
  }
 }catch(e){const msg=String((e as Error)?.message??"");console.error(/^HOLD_P6_ACTUAL_RELEASE_EXPORT_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P6_ACTUAL_RELEASE_EXPORT_REDACTED_NO_RELEASE");process.exitCode=2;}
}
