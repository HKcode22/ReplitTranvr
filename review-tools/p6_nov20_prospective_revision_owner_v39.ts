import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {Pool} from "pg";
import {
  compileP6ActualCandidateExport,
  prepareP6ActualReleaseIdentityReview,
  prepareP6ActualReviewInput,
} from "../scripts/v39_phase6_actual_release_candidate_export_v39";
import {
  compileP6ProspectiveDisabledStageRevisionV39,
  commitP6ProspectiveDisabledStageRevisionOnceV39,
  verifyP6ProspectiveDisabledStageRevisionReadOnlyV39,
  type P6ProspectiveDisabledStageRevisionReviewV39,
} from "../server/lib/disruption/phase6ProspectiveDisabledStageRevision_v39";
import {P5_TWO_STAGE_ROLES} from "../scripts/v39_phase5_two_stage_logins_independent_live_readonly_once.mjs";

const CODE=/^[a-f0-9]{40}$/;
const REPO="HKcode22/ReplitTranvr";
const OLD_STAGE_SHA="b833c9f52a24a6f953ebf5e2f3df481310b6bedd25a1d41c4f7a5d5833b2e745";
const OLD_COST_SHA="abc19fc266558940b43fc2bad580178174e7e5877feb6bfff599a49427f50e7a";
const OLD_MANIFEST_SHA="bd14ff3e558b975a889741380da807644ca9d3573a23e2416986ee6f71e1e41f";
const AUTH_ID="AUTH-20261119-P5INERTFREEZE";
const DATE_REVIEW_PATH="data-collection/phase5/evidence/2026-11-20_phase6_nov20_date_revision_second_agent_review_NO_GO.md";
const BOUNDED_SOURCE_PATH="data-collection/phase5/evidence/2026-11-19_aerodatabox_bounded_published_terms_source_use_review.md";
const PITR_REVIEW_PATH="data-collection/phase5/evidence/2026-11-19_replit_pitr_recovery_control_review.md";
const HOLD=(s:string):never=>{throw Error("HOLD_P6_NOV20_PRIVATE_REVISION_"+s);};
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const jsonHash=(x:unknown)=>hash(JSON.stringify(x));
const readJson=(p:string)=>JSON.parse(readFileSync(p,"utf8"));
const exactMain=()=>{
  const root=realpathSync(execFileSync("git",["rev-parse","--show-toplevel"],{encoding:"utf8"}).trim());
  if(root!==realpathSync(process.cwd()))HOLD("RUN_FROM_REPO_ROOT");
  const head=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const remote=execFileSync("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"],{encoding:"utf8"}).trim();
  const dirty=execFileSync("git",["status","--porcelain","--untracked-files=no"],{encoding:"utf8"}).trim();
  if(!CODE.test(head)||head!==remote||dirty!=="")HOLD("EXACT_CLEAN_REMOTE_MAIN_REQUIRED");
  return head;
};
const writerRole=P5_TWO_STAGE_ROLES.find((x:any)=>x.key==="P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL")?.role;
const budgetRole=P5_TWO_STAGE_ROLES.find((x:any)=>x.key==="P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL")?.role;
if(!writerRole||!budgetRole)HOLD("TWO_STAGE_ROLE_BINDING");

function oldReviews(oldInput:any){
  if(jsonHash(oldInput)!==OLD_STAGE_SHA||oldInput.phase6AuthorizationId!==AUTH_ID||
     oldInput.manifestSha256!==OLD_MANIFEST_SHA||!CODE.test(oldInput.codeSha40??""))
    HOLD("OLD_PRIVATE_STAGE_NOT_EXACT_FROZEN_PACKET");
  return {
    oldStageReview:{
      expectedSignedStagePacketSha256:OLD_STAGE_SHA,
      expectedExactWriterRole:writerRole,
      independentCalendarTreatmentReviewApproved:true as const,
      independentProviderAccountAndRestBudgetReviewApproved:true as const,
      narrowPrelaunchOwnerApproved:true as const,
    },
    oldFreezeReview:{
      expectedStagedB0062PacketSha256:OLD_STAGE_SHA,
      expectedSignedSevenCategoryCostSha256:OLD_COST_SHA,
      expectedExactBudgetWriterRole:budgetRole,
      independentProspectiveCalendarAndTreatmentApproved:true as const,
      independentRealProviderRangeAndRestBudgetApproved:true as const,
      independentSourceContentsRightsForIntendedUseApproved:false as const,
      sourceUseDeferredToPhase6Activation:true as const,
      exactRestrictedNoProviderBudgetFreezeApproved:true as const,
    },
  };
}

function buildPrivatePackage(oldStagePath:string){
  const currentHead=exactMain();
  for(const p of [DATE_REVIEW_PATH,BOUNDED_SOURCE_PATH,PITR_REVIEW_PATH])
    if(!existsSync(p))HOLD("REQUIRED_REVIEW_EVIDENCE_MISSING");
  const oldRaw=readFileSync(oldStagePath);
  let oldInput:any; try{oldInput=JSON.parse(oldRaw.toString("utf8"));}catch{HOLD("OLD_STAGE_INVALID_JSON");}
  if(jsonHash(oldInput)!==OLD_STAGE_SHA)HOLD("OLD_STAGE_CANONICAL_SHA_MISMATCH");
  const {oldStageReview,oldFreezeReview}=oldReviews(oldInput);

  const review=prepareP6ActualReviewInput(currentHead,0,"COMPACT_NOV22");
  const identity=prepareP6ActualReleaseIdentityReview(currentHead,0,"COMPACT_NOV22");
  const rec=review.concreteReviewRecommendation;
  const revision=review.calendarRevisionReview;
  if(revision?.status!=="PROSPECTIVE_COMPACT_REVIEW_NOT_SIGNED"||
     revision?.firstServiceUtc!=="2026-11-22T00:00:00.000Z"||
     revision?.firstSourceUtc!=="2026-11-20T23:45:00.000Z"||
     revision?.lastServiceEndUtc!=="2026-12-24T04:00:00.000Z"||
     revision?.originalTreatmentAssignmentSha256!==review.shapeEnvelope.claimedTreatmentAssignmentSha256||
     review.calendarDraft.calendarDays.length!==31||
     review.proposedSourceQueries!==6144||review.proposedTotalReservedUnits!==36740||
     identity.geometry.dayPlanCount!==31||identity.geometry.totalQueries!==6144||identity.geometry.totalReservedUnits!==36740)
    HOLD("COMPACT_NOV22_REVIEW_GEOMETRY_DRIFT");

  const dateReviewSha=hash(readFileSync(DATE_REVIEW_PATH));
  const boundedSourceSha=hash(readFileSync(BOUNDED_SOURCE_PATH));
  const pitrReviewSha=hash(readFileSync(PITR_REVIEW_PATH));

  const reviewedConfig:any={
    ...identity.configCandidate.content,
    status:"REVIEWED_PROSPECTIVE_DATE_SUCCESSOR_NOT_SOURCE_AUTH",
    originalFrozenPacketPreserved:true,
    originalFrozenManifestSha256:OLD_MANIFEST_SHA,
    prospectiveDateRevisionApproved:true,
    prospectiveDateRevisionEvidenceSha256:dateReviewSha,
    boundedSourceUseEvidenceSha256:boundedSourceSha,
    recoveryControlEvidenceSha256:pitrReviewSha,
    reviewApproved:true,
    sourceRightsApproved:false,
    sourceUseDeferredToPhase6Activation:true,
    legacyAlertStartApproved:false,
    phase6PaidGo:false,
  };
  const configSha=jsonHash(reviewedConfig);
  const reviewedManifest:any={
    ...identity.manifestCandidate.content,
    status:"SCIENTIFIC_FREEZE_PROSPECTIVE_DATE_SUCCESSOR_APPROVED_NO_GO",
    originalCandidateConfigSha256:identity.configCandidate.sha256,
    configCandidateSha256:configSha,
    originalFrozenPacketPreserved:true,
    originalFrozenManifestSha256:OLD_MANIFEST_SHA,
    prospectiveDateRevisionApproved:true,
    prospectiveDateRevisionEvidenceSha256:dateReviewSha,
    boundedSourceUseEvidenceSha256:boundedSourceSha,
    recoveryControlEvidenceSha256:pitrReviewSha,
    calendarRowsSha256:review.externalCandidate.expectedCalendarRowsSha256,
    configSha256:configSha,
    finalPredecessorsApproved:false,
    scientificFreezeApproved:true,
    sourceRightsApproved:false,
    sourceUseDeferredToPhase6Activation:true,
    phase6PaidGo:false,
  };
  const newManifestRaw=JSON.stringify(reviewedManifest);
  const manifestSha=hash(newManifestRaw);
  const external:any={
    ...review.externalCandidate,
    manifestSha256:manifestSha,
    calendarSha256:review.externalCandidate.expectedCalendarRowsSha256,
    configSha256:configSha,
    frameSha256:oldInput.frameSha256,
    codeSha40:currentHead,
    phase6AuthorizationId:AUTH_ID,
    predecessorEvidenceIds:[...oldInput.predecessorEvidenceIds],
    alertSafety:rec.proposedAlertSafety,
    providerRangeEvidenceSha256:identity.rangeEvidenceCandidate.sha256,
    timingEvidenceSha256:identity.timingEvidenceCandidate.sha256,
    cycleRestCeilingUnits:rec.netRestCeilingUnits,
    jointBudgetReview:rec.jointBudgetReview,
  };
  const timing:any={
    ...review.timingCandidate,
    timingEvidenceSha256:identity.timingEvidenceCandidate.sha256,
  };
  const externalRaw=JSON.stringify(external),timingRaw=JSON.stringify(timing);
  const exported=compileP6ActualCandidateExport({
    externalBytes:Buffer.from(externalRaw),
    expectedExternalFileSha256:hash(externalRaw),
    timingBytes:Buffer.from(timingRaw),
    expectedTimingFileSha256:hash(timingRaw),
    calendarVariant:"COMPACT_NOV22",
  });
  const stageFile=exported.files.find((f:any)=>f.path==="unsigned-stage-input.json");
  if(!stageFile||stageFile.sha256!==exported.summary.unsignedStageInputSha256)
    HOLD("NEW_STAGE_EXPORT_MISSING");
  const newInput=JSON.parse(stageFile.bytes);
  if(newInput.phase6AuthorizationId!==AUTH_ID||newInput.manifestSha256!==manifestSha||
     newInput.configSha256!==configSha||newInput.codeSha40!==currentHead||
     newInput.predecessorEvidenceIds.length!==oldInput.predecessorEvidenceIds.length)
    HOLD("NEW_STAGE_IDENTITY_DRIFT");

  const newStageReview={
    expectedSignedStagePacketSha256:exported.summary.unsignedStageInputSha256,
    expectedExactWriterRole:writerRole,
    independentCalendarTreatmentReviewApproved:true as const,
    independentProviderAccountAndRestBudgetReviewApproved:true as const,
    narrowPrelaunchOwnerApproved:true as const,
  };
  const newFreezeReview={
    expectedStagedB0062PacketSha256:exported.summary.unsignedStageInputSha256,
    expectedSignedSevenCategoryCostSha256:exported.summary.unsignedCostOnlyEnvelopeSha256,
    expectedExactBudgetWriterRole:budgetRole,
    independentProspectiveCalendarAndTreatmentApproved:true as const,
    independentRealProviderRangeAndRestBudgetApproved:true as const,
    independentSourceContentsRightsForIntendedUseApproved:false as const,
    sourceUseDeferredToPhase6Activation:true as const,
    exactRestrictedNoProviderBudgetFreezeApproved:true as const,
  };
  const revisionReview:P6ProspectiveDisabledStageRevisionReviewV39={
    schema:"v39.phase6.prospective-disabled-stage-revision-review.v1",
    expectedOldStageInputSha256:OLD_STAGE_SHA,
    expectedOldCostEnvelopeSha256:OLD_COST_SHA,
    expectedNewStageInputSha256:exported.summary.unsignedStageInputSha256,
    expectedNewCostEnvelopeSha256:exported.summary.unsignedCostOnlyEnvelopeSha256,
    expectedOriginalFrozenManifestSha256:OLD_MANIFEST_SHA,
    expectedNewManifestSha256:manifestSha,
    expectedPriorCodeSha40:oldInput.codeSha40,
    expectedCurrentCodeSha40:currentHead,
    reviewedCalendarRevisionEvidenceSha256:dateReviewSha,
    independentProspectiveRevisionApproved:true,
    originalScientificDesignPreserved:true,
    oldStageRemainsArchivedEvidence:true,
    noBackfillApproved:true,
  };
  const revisionInput={
    oldInput,oldStageReview,oldFreezeReview,
    newInput,newStageReview,newFreezeReview,
    newManifestRaw,review:revisionReview,
  };
  const compiled=compileP6ProspectiveDisabledStageRevisionV39(revisionInput);
  return {
    schema:"v39.phase6.private-prospective-revision-package.v1",
    preparedAtUtc:new Date().toISOString(),
    currentHead,
    dateReviewSha256:dateReviewSha,
    boundedSourceUseEvidenceSha256:boundedSourceSha,
    recoveryControlEvidenceSha256:pitrReviewSha,
    external, timing, reviewedConfig, reviewedManifest,
    revisionInput,
    compiledSummary:{
      firstOldServiceUtc:compiled.firstOldServiceUtc,
      firstNewServiceUtc:compiled.firstNewServiceUtc,
      changedParentDays:compiled.changedParentDays,
      oldStageInputSha256:OLD_STAGE_SHA,
      newStageInputSha256:exported.summary.unsignedStageInputSha256,
      oldCostEnvelopeSha256:OLD_COST_SHA,
      newCostEnvelopeSha256:exported.summary.unsignedCostOnlyEnvelopeSha256,
      oldManifestSha256:OLD_MANIFEST_SHA,
      newManifestSha256:manifestSha,
      sourceQueries:exported.summary.sourceQueries,
      totalReservedUnits:exported.summary.totalReservedUnits,
      providerCalls:0,databaseWrites:0,phase6PaidGo:false,
    },
  };
}

function savePrivate(pkg:any,outDir:string){
  const out=resolve(outDir);
  if(existsSync(out))HOLD("OUTPUT_ALREADY_EXISTS_NO_OVERWRITE");
  mkdirSync(out,{recursive:false,mode:0o700});
  const files:Record<string,string>={
    "prospective-revision-package.json":JSON.stringify(pkg),
    "new-stage-input.json":JSON.stringify(pkg.revisionInput.newInput),
    "new-manifest.json":pkg.revisionInput.newManifestRaw,
    "new-config.json":JSON.stringify(pkg.reviewedConfig),
    "new-external.json":JSON.stringify(pkg.external),
    "new-timing.json":JSON.stringify(pkg.timing),
    "revision-review.json":JSON.stringify(pkg.revisionInput.review),
    "review-summary.json":JSON.stringify(pkg.compiledSummary),
  };
  for(const [name,bytes] of Object.entries(files))
    writeFileSync(resolve(out,name),bytes,{flag:"wx",mode:0o600});
  return {status:"PRIVATE_PROSPECTIVE_REVISION_PACKAGE_PREPARED_NO_DB_NO_PROVIDER_NO_GO",
    outDir:out,...pkg.compiledSummary};
}

function loadPackage(path:string){
  const pkg=readJson(path);
  if(pkg?.schema!=="v39.phase6.private-prospective-revision-package.v1"||
     !pkg.revisionInput||pkg.currentHead!==pkg.revisionInput.newInput?.codeSha40)
    HOLD("PRIVATE_PACKAGE_INVALID");
  compileP6ProspectiveDisabledStageRevisionV39(pkg.revisionInput);
  return pkg;
}
async function applyPrivate(path:string){
  const pkg=loadPackage(path);
  const head=exactMain();
  if(head!==pkg.currentHead)HOLD("MAIN_CHANGED_AFTER_PRIVATE_REVIEW");
  if(process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.AERODATABOX_WEBHOOK_SECRET)
    HOLD("PROVIDER_CREDENTIALS_MUST_BE_UNSET_FOR_REVISION");
  if(process.env.ADB_AUTO_COLLECT!=="0"||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.V39_PHASE6_OWNER_APPROVED!=="0")
    HOLD("COLLECTION_FLAGS_MUST_BE_EXPLICIT_ZERO");
  const url=process.env.DATABASE_URL;
  if(!url||process.env.V39_DATABASE_RUNTIME_URL===url)HOLD("EXISTING_OWNER_DATABASE_URL_REQUIRED");
  const pool=new Pool({connectionString:url,max:2,connectionTimeoutMillis:8000,query_timeout:30000,
    application_name:"p6_nov20_prospective_disabled_stage_revision"});
  try{
    const receipt=await commitP6ProspectiveDisabledStageRevisionOnceV39(pool,pkg.revisionInput);
    console.log(JSON.stringify(receipt));
    const readback=await verifyP6ProspectiveDisabledStageRevisionReadOnlyV39(pool,pkg.revisionInput,receipt);
    console.log(JSON.stringify(readback));
    return {status:"P6_NOV20_DISABLED_STAGE_REVISION_APPLIED_AND_READBACK_NO_PROVIDER_NO_GO",
      receipt,readback};
  }finally{await pool.end();}
}

async function main(){
  const mode=process.argv[2];
  if(mode==="--prepare-private"&&process.argv.length===5){
    const result=savePrivate(buildPrivatePackage(process.argv[3]),process.argv[4]);
    console.log(JSON.stringify(result,null,2)); return;
  }
  if(mode==="--verify-private"&&process.argv.length===4){
    const pkg=loadPackage(process.argv[3]);
    console.log(JSON.stringify({status:"PRIVATE_PACKAGE_REVERIFIED_NO_DB_NO_PROVIDER_NO_GO",
      ...pkg.compiledSummary},null,2)); return;
  }
  if(mode==="--apply-private"&&process.argv.length===4){
    console.log(JSON.stringify(await applyPrivate(process.argv[3]),null,2)); return;
  }
  HOLD("USAGE");
}
main().catch(e=>{
  const m=String((e as Error)?.message??"");
  console.error(/^HOLD_P6_NOV20_PRIVATE_REVISION_[A-Z0-9_]+$/.test(m)?m:
    "HOLD_P6_NOV20_PRIVATE_REVISION_REDACTED_RECONCILE_NO_REPLAY");
  process.exitCode=2;
});
