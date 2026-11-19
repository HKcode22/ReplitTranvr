#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {resolve,isAbsolute,relative} from 'node:path';
import {pathToFileURL} from 'node:url';

const REPO='HKcode22/ReplitTranvr';
const EXPECTED_MAIN='ae0915d1eb0c37651d280ff3f178efdb640ed509';
const AUTHORIZATION_ID='AUTH-20261119-P5INERTFREEZE';
const H=/^[a-f0-9]{64}$/;
const C=/^[a-f0-9]{40}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>JSON.stringify(x);
const hold=s=>{throw new Error('HOLD_P5_POST879_PREPARE_'+s);};
const need=(x,s)=>{if(!x)hold(s);};
const cmd=(c,a,o={})=>execFileSync(c,a,{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000,maxBuffer:16*1024*1024,...o}).trim();

export const PREDECESSOR_EVIDENCE_IDS=Object.freeze([
 'RUN-20261116-OWNERREVIEW112557','RUN-20261116-PREARMCLOCK43832469501','RUN-20261116-QUOTA091844',
 'RUN-20261116-BTSOVERLAP14198898471','RUN-20261116-SOURCEGAPSENSITIVITY','RUN-20261116-HISTORICALFIDSCLEAR',
 'RUN-20261116-V0103VERIFY43987495623','RUN-20261116-HISTORICALPREINVENTORY','RUN-20261116-V0104OWNERINSTALL',
 'RUN-20261116-HEARTBEAT43992105353','RUN-20261116-PRIMARYEXPIRY43997742324','RUN-20261116-HISTORICALPRECLASSIFICATION015741',
 'RUN-20261119-FRESHACCOUNT033903','RUN-20261119-SCIENTIFICSCOPEREVIEW','RUN-20261119-FRESHBUDGETRECONCILED',
 'RUN-20261119-OPERATIONALSCOPEREVIEW','RUN-20261119-EXACTCOMPACTCOST','RUN-20261119-NATIVEPOSTGEOMETRY',
 'RUN-20261119-ACTUALSIGNERALIASES','RUN-20261119-ACTUALPOLICYRECOVERY','RUN-20261119-ACTUALOWNERRECOVERY',
 'DEC-20261119-OWNERPRESERVEF8','RUN-20261119-EXISTINGSTOPGUARDEVIDENCE','RUN-20261119-FINALOWNERMETADATA',
 'RUN-20261119-NATIVECOREPREARMREVIEW','RUN-20261119-CURRENTGITHUBSTOP','RUN-20261119-PUBLISHEDGITHUBSTOPCOMBINED'
]);

export const FRESH_NO_REFILL_BUDGET=Object.freeze({
 accountEvidenceSha256:'7002466888531e26e29c1ecd205ecbed5a534282ced73b5adb315e5c98a5f4b0',
 observedAtUtc:'2026-11-19T03:39:03.000Z',
 apiUnitsLimit:60000,apiUnitsRemaining:59968,apiUnitsResetAtUtc:'2026-12-04T02:21:21.000Z',
 alertCreditsRemaining:1830,preFreezeProjectApiUnits:32,
 authorizedFutureRefillApiUnits:0,authorizedFutureRefillAlertCredits:0,
 endingApiMarginUnits:500,preRunAlertSpendCeilingCredits:0,endingAlertMarginCredits:150
});

export const RELEASE_EVIDENCE=Object.freeze({
 scientificFreezeEvidenceSha256:'b7900e4d4c6e1f26c58c4a333c2b2ac480803ab39ece9b972cb657b9b3d29203',
 providerAccountAndBudgetEvidenceSha256:'8b1c5f077dca3c024d73d0a782323d009ea60706bb042c2babbe0d76e522f33b',
 publishedAndGithubStopEvidenceSha256:'0fe341791b99013146eff5d6fce18dc3ea8c1cd5e5243224d3c9d85b72b7763c',
 operationalReleaseEvidenceSha256:'fd0aa7d6b35b69bb657cbfa8cc481b91a855249bb0fea1802ccc69ada6e5a462'
});

function verifyCheckout(codeSha){
 need(C.test(codeSha),'INVALID_CODE_SHA');
 const root=realpathSync(cmd('git',['rev-parse','--show-toplevel']));
 need(root===realpathSync(process.cwd()),'NOT_REPOSITORY_ROOT');
 need(cmd('git',['rev-parse','HEAD'])===codeSha,'CHECKOUT_NOT_EXACT_CODE_SHA');
 need(cmd('git',['status','--porcelain','--untracked-files=no'])==='','TRACKED_WORKTREE_NOT_CLEAN');
 return root;
}

function finalConfig(identity){
 const c=identity.configCandidate.content;
 need(identity.configCandidate.sha256===sha(canonical(c)),'CONFIG_CANDIDATE_DIGEST_DRIFT');
 return {
  ...c,
  status:'REVIEWED_PHASE5_INERT_CONFIG_RIGHTS_DEFERRED_NO_GO',
  jointBudgetReviewCandidate:FRESH_NO_REFILL_BUDGET,
  sourceRightsApproved:false,
  sourceUseDeferredToPhase6Activation:true,
  reviewApproved:true,
  legacyAlertStartApproved:false,
  phase6PaidGo:false
 };
}

function finalManifest(identity,configSha){
 const m=identity.manifestCandidate.content;
 need(identity.manifestCandidate.sha256===sha(canonical(m)),'MANIFEST_CANDIDATE_DIGEST_DRIFT');
 return {
  ...m,
  status:'PHASE5_SCIENTIFIC_FREEZE_RIGHTS_DEFERRED_NO_GO',
  configSha256:configSha,
  sourceRightsApproved:false,
  sourceUseDeferredToPhase6Activation:true,
  scientificFreezeApproved:true,
  finalPredecessorsApproved:true,
  releaseEvidence:RELEASE_EVIDENCE,
  phase5OwnerDecisionRef:'ISSUE413-COMMENT-7002623385',
  phase6PaidGo:false
 };
}

export async function buildPost879RightsDeferredPackage(codeSha=EXPECTED_MAIN){
 need(codeSha===EXPECTED_MAIN,'UNREVIEWED_MAIN_SHA');
 const root=verifyCheckout(codeSha);
 const remote=cmd('gh',['api',`repos/${REPO}/git/ref/heads/main`,'--jq','.object.sha']);
 need(remote===codeSha,'REMOTE_MAIN_CHANGED');
 const exporter=await import(pathToFileURL(resolve(root,'scripts/v39_phase6_actual_release_candidate_export_v39.ts')).href);
 const review=exporter.prepareP6ActualReviewInput(codeSha,0,'COMPACT_NOV21');
 const identity=exporter.prepareP6ActualReleaseIdentityReview(codeSha,0,'COMPACT_NOV21');
 need(identity.status==='EXACT_CONTENT_DIGESTS_AND_GEOMETRY_REVIEW_ONLY_NOT_RELEASE','IDENTITY_REVIEW_STATUS');
 need(identity.geometry?.dayPlanCount===31&&identity.geometry?.totalQueries===6144&&identity.geometry?.totalReservedUnits===37388,'EXACT_GEOMETRY');
 need(identity.calendarRowsDigestCandidate==='7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c','CALENDAR_DIGEST');
 need(identity.timingEvidenceCandidate?.sha256==='88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5','TIMING_DIGEST');
 need(identity.rangeEvidenceCandidate?.sha256==='cde412a012e912f9fbe42cd29375ddbaf674054d11af45fe6d2a8eab36c81bb3','RANGE_DIGEST');
 need(review.concreteReviewRecommendation?.netRestCeilingUnits===49468,'NET_REST_CEILING');
 need(review.proposedTotalReservedUnits===37388&&review.proposedPeakDailyUnits===1280,'REVIEW_BUDGET_GEOMETRY');
 need(review.concreteReviewRecommendation?.proposedAlertSafety?.alertRunSpendCeilingCredits===680,'ALERT_SAFETY_CEILING');

 const config=finalConfig(identity),configRaw=canonical(config),configSha=sha(configRaw);
 const manifest=finalManifest(identity,configSha),manifestRaw=canonical(manifest),manifestSha=sha(manifestRaw);
 const timing={...review.timingCandidate,timingEvidenceSha256:identity.timingEvidenceCandidate.sha256};
 const external={
  ...review.externalCandidate,
  manifestSha256:manifestSha,
  calendarSha256:identity.calendarRowsDigestCandidate,
  configSha256:configSha,
  codeSha40:codeSha,
  phase6AuthorizationId:AUTHORIZATION_ID,
  predecessorEvidenceIds:[...PREDECESSOR_EVIDENCE_IDS],
  alertSafety:review.concreteReviewRecommendation.proposedAlertSafety,
  providerRangeEvidenceSha256:identity.rangeEvidenceCandidate.sha256,
  timingEvidenceSha256:identity.timingEvidenceCandidate.sha256,
  asOfUtc:FRESH_NO_REFILL_BUDGET.observedAtUtc,
  cycleRestCeilingUnits:49468,
  jointBudgetReview:FRESH_NO_REFILL_BUDGET
 };
 const externalRaw=canonical(external),timingRaw=canonical(timing);
 const exported=exporter.compileP6ActualCandidateExport({
  externalBytes:Buffer.from(externalRaw),expectedExternalFileSha256:sha(externalRaw),
  timingBytes:Buffer.from(timingRaw),expectedTimingFileSha256:sha(timingRaw),calendarVariant:'COMPACT_NOV21'
 });
 const parity=exporter.verifyP6ActualCommittedCheckout(exported);
 need(parity.verifiedPlanCount===31&&exported.summary.sourceQueries===6144&&exported.summary.totalReservedUnits===37388&&exported.summary.peakDailyUnits===1280,'FINAL_EXPORT_GEOMETRY');
 const stageFile=exported.files.find(f=>f.path==='unsigned-stage-input.json');
 need(stageFile&&H.test(stageFile.sha256)&&stageFile.sha256===exported.summary.unsignedStageInputSha256,'STAGE_FILE');
 need(Buffer.byteLength(stageFile.bytes)<=48000,'STAGE_SECRET_TOO_LARGE');
 const stage=JSON.parse(stageFile.bytes);
 need(canonical(stage)===stageFile.bytes,'NONCANONICAL_STAGE');
 need(stage.codeSha40===codeSha&&stage.manifestSha256===manifestSha&&stage.configSha256===configSha&&stage.calendarSha256===identity.calendarRowsDigestCandidate&&stage.phase6AuthorizationId===AUTHORIZATION_ID,'STAGE_IDENTITY');
 need(JSON.stringify(stage.predecessorEvidenceIds)===JSON.stringify(PREDECESSOR_EVIDENCE_IDS),'STAGE_PREDECESSORS');
 need(stage.budget?.cycleRestCeilingUnits===49468&&stage.budget?.protectedRestFloorUnits===1000,'STAGE_BUDGET');
 const costSha=exported.summary.unsignedCostOnlyEnvelopeSha256;
 need(H.test(costSha),'COST_DIGEST');
 const secrets={
  V39_P5_APPROVED_CODE_SHA:codeSha,
  P6_INERT_CALENDAR_REVIEW_APPROVED:'1',
  P6_INERT_COST_REVIEW_APPROVED:'1',
  P6_INERT_COST_ENVELOPE_SHA256:costSha,
  V39_P5_MANIFEST_SHA256:manifestSha,
  P6_INERT_STAGE_INPUT_JSON:stageFile.bytes,
  P6_INERT_STAGE_INPUT_SHA256:stageFile.sha256
 };
 need(Object.values(secrets).every(v=>typeof v==='string'&&Buffer.byteLength(v)>0&&Buffer.byteLength(v)<=48000),'SECRET_SIZE');
 need(manifest.scientificFreezeApproved===true&&manifest.sourceRightsApproved===false&&manifest.sourceUseDeferredToPhase6Activation===true&&manifest.phase6PaidGo===false,'MANIFEST_PHASE5_BOUNDARY');
 return {
  schema:'v39.phase5.post879-rights-deferred-closeout-package.v1',
  status:'EXACT_PHASE5_INERT_RIGHTS_DEFERRED_PACKAGE_READY_NO_GO',
  codeSha,authorizationId:AUTHORIZATION_ID,
  manifest,manifestSha256:manifestSha,config,configSha256:configSha,
  external,timing,stageInput:stage,stageInputJson:stageFile.bytes,stageInputSha256:stageFile.sha256,
  costEnvelopeSha256:costSha,calendarRowsSha256:identity.calendarRowsDigestCandidate,
  dayPlanCount:31,plannedQueries:6144,reservedRestUnits:37388,peakDailyUnits:1280,
  netRestCeilingUnits:49468,protectedRestFloorUnits:1000,
  sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,
  scientificFreezeApproved:true,authorizationEnabled:false,phase6PaidGo:false,
  providerCalls:0,databaseWrites:0,githubMutations:0,secrets
 };
}

function safeOut(out){
 const abs=resolve(out),root=realpathSync(process.cwd()),rel=relative(root,abs);
 need(isAbsolute(abs)&&rel&&rel.startsWith('..'),'OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
 mkdirSync(abs,{mode:0o700});
 return abs;
}
function writeOne(dir,name,value){writeFileSync(resolve(dir,name),typeof value==='string'?value:canonical(value),{flag:'wx',mode:0o600});}

async function main(){
 const [mode,codeSha,out]=process.argv.slice(2);
 need(['--verify-only','--write-private'].includes(mode)&&codeSha===EXPECTED_MAIN,'EXACT_ARGUMENTS');
 const p=await buildPost879RightsDeferredPackage(codeSha);
 const summary={status:p.status,codeSha:p.codeSha,authorizationId:p.authorizationId,manifestSha256:p.manifestSha256,configSha256:p.configSha256,calendarRowsSha256:p.calendarRowsSha256,stageInputSha256:p.stageInputSha256,costEnvelopeSha256:p.costEnvelopeSha256,dayPlanCount:p.dayPlanCount,plannedQueries:p.plannedQueries,reservedRestUnits:p.reservedRestUnits,peakDailyUnits:p.peakDailyUnits,netRestCeilingUnits:p.netRestCeilingUnits,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,scientificFreezeApproved:true,authorizationEnabled:false,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
 if(mode==='--verify-only'){console.log(canonical(summary));return;}
 need(out,'PRIVATE_OUTPUT_REQUIRED');
 const d=safeOut(out);
 writeOne(d,'phase5-frozen-manifest.json',p.manifest);
 writeOne(d,'phase5-reviewed-config.json',p.config);
 writeOne(d,'phase5-stage-input.json',p.stageInputJson);
 writeOne(d,'phase5-static-secret-values-PRIVATE.json',p.secrets);
 writeOne(d,'phase5-closeout-package-summary.json',summary);
 console.log(canonical({...summary,privateOutputDirectory:d,privateFilesWritten:5}));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{const m=String(e?.message??'');console.error(/^(?:HOLD_P5_POST879_PREPARE|HOLD_P6_ACTUAL_RELEASE_EXPORT|REFUSED_P5_INERT_B0062_UTC_STAGE|REFUSED_P5_V0093_COST_ONLY_INPUT_FREEZE)_[A-Z0-9_]+$/.test(m)?m:'HOLD_P5_POST879_PREPARE_REDACTED');process.exitCode=2;});
}
