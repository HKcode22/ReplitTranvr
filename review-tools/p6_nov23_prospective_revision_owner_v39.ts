/** Reuse the exact already-installed Nov22 owner package and original
 * compiler for the postponed Monday prospective disabled revision.
 * Preview is unsigned; only an actual separately reviewed date-decision
 * artifact on exact main can produce an apply-capable private package.
 * No provider credentials, source authorization, policy installation or GO. */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {lstatSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from "node:fs";
import {resolve,join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {Pool} from "pg";
import {prepareP6ActualReviewInput,prepareP6ActualReleaseIdentityReview,compileP6ActualCandidateExport,verifyP6ActualCommittedPlanParity} from "../scripts/v39_phase6_actual_release_candidate_export_v39";
import {compileP6ProspectiveDisabledStageRevisionV39,commitP6ProspectiveDisabledStageRevisionOnceV39,verifyP6ProspectiveDisabledStageRevisionReadOnlyV39,type P6ProspectiveDisabledStageRevisionReviewV39} from "../server/lib/disruption/phase6ProspectiveDisabledStageRevision_v39";
import {P5_TWO_STAGE_ROLES} from "../scripts/v39_phase5_two_stage_logins_independent_live_readonly_once.mjs";
import {P6_NOV22_STAGE_CODE,P6_NOV22_STAGE_SHA,P6_NOV22_COST_SHA,P6_MONDAY_CALENDAR_ROWS_SHA} from "../scripts/v39_phase6_revised_stage_executable_bridge_v39";
const REPO="HKcode22/ReplitTranvr",OLD_MANIFEST="3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7",OLD_CONFIG="001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88",ORIGINAL_MANIFEST="bd14ff3e558b975a889741380da807644ca9d3573a23e2416986ee6f71e1e41f";
const RECOVER_NOV22="RECOVER_EXACT_NOV22_FROM_COMMITTED_EVIDENCE";
const NOV22_CALENDAR="9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6";
const NOV22_RANGE="cde412a012e912f9fbe42cd29375ddbaf674054d11af45fe6d2a8eab36c81bb3";
const NOV22_TIMING="88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5";
const NOV22_PREDECESSORS=Object.freeze([
 "RUN-20261116-OWNERREVIEW112557","RUN-20261116-PREARMCLOCK43832469501","RUN-20261116-QUOTA091844",
 "RUN-20261116-BTSOVERLAP14198898471","RUN-20261116-SOURCEGAPSENSITIVITY","RUN-20261116-HISTORICALFIDSCLEAR",
 "RUN-20261116-V0103VERIFY43987495623","RUN-20261116-HISTORICALPREINVENTORY","RUN-20261116-V0104OWNERINSTALL",
 "RUN-20261116-HEARTBEAT43992105353","RUN-20261116-PRIMARYEXPIRY43997742324","RUN-20261116-HISTORICALPRECLASSIFICATION015741",
 "RUN-20261119-FRESHACCOUNT033903","RUN-20261119-SCIENTIFICSCOPEREVIEW","RUN-20261119-FRESHBUDGETRECONCILED",
 "RUN-20261119-OPERATIONALSCOPEREVIEW","RUN-20261119-EXACTCOMPACTCOST","RUN-20261119-NATIVEPOSTGEOMETRY",
 "RUN-20261119-ACTUALSIGNERALIASES","RUN-20261119-ACTUALPOLICYRECOVERY","RUN-20261119-ACTUALOWNERRECOVERY",
 "DEC-20261119-OWNERPRESERVEF8","RUN-20261119-EXISTINGSTOPGUARDEVIDENCE","RUN-20261119-FINALOWNERMETADATA",
 "RUN-20261119-NATIVECOREPREARMREVIEW","RUN-20261119-CURRENTGITHUBSTOP","RUN-20261119-PUBLISHEDGITHUBSTOPCOMBINED"
]);
const DATE="data-collection/phase5/evidence/2026-11-20_nov23_monday_exact_geometry_budget_REVIEW_ONLY.json";
const RIGHTS="data-collection/phase5/evidence/2026-11-19_aerodatabox_bounded_published_terms_source_use_review.md",PITR="data-collection/phase5/evidence/2026-11-19_replit_pitr_recovery_control_review.md";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const sha=(x:string|Buffer)=>createHash("sha256").update(x).digest("hex"),hash=(x:unknown)=>sha(JSON.stringify(x)),hold=(s:string):never=>{throw Error("HOLD_P6_MONDAY_REVISION_"+s);};
const cmd=(c:string,a:string[])=>execFileSync(c,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:2*1024*1024}).trim();
const exactCheckout=()=>{
 const head=cmd("git",["rev-parse","HEAD"]);
 if(!C.test(head)||realpathSync(process.cwd())!==realpathSync(cmd("git",["rev-parse","--show-toplevel"]))||cmd("git",["status","--porcelain","--untracked-files=no"])!=="")hold("CLEAN_EXACT_CHECKOUT");
 return head;
};
const remote=()=>cmd("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
const privateDir=(p:string)=>{const x=resolve(p),s=lstatSync(x);if(!s.isDirectory()||s.isSymbolicLink()||realpathSync(x)!==x||s.uid!==process.getuid?.()||(s.mode&0o077)!==0||!x.startsWith(realpathSync(process.env.HOME!)+"/.travnr-"))hold("PRIVATE_DIRECTORY");return x;};
const privateRead=(p:string,expected?:string,max=2*1024*1024)=>{const s=lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.uid!==process.getuid?.()||(s.mode&0o077)!==0||s.size<100||s.size>max)hold("PRIVATE_FILE");const bytes=readFileSync(p);if(expected&&sha(bytes)!==expected)hold("PRIVATE_FILE_SHA");return bytes;};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function validateP6MondayDateDecision(x:any,expected:{reviewDigest:string;dateReceiptSha256:string;oldStageSha256:string;sourceInventorySha256:string},now:Date){
 const keys=["schema","reviewDigest","dateReceiptSha256","oldStageSha256","sourceInventorySha256","reviewedBy","reviewedAtUtc","independentProspectiveRevisionApproved","originalScientificDesignPreserved","oldStageRemainsArchivedEvidence","noBackfillApproved","sourceUseDeferredToPhase6Activation","phase6PaidGo"];
 if(!x||Object.keys(x).length!==keys.length||keys.some(k=>!Object.hasOwn(x,k))||x.schema!=="v39.phase6.monday-prospective-date-independent-review.v1"||
    !Object.entries(expected).every(([k,v])=>H.test(v)&&x[k]===v)||
    typeof x.reviewedBy!=="string"||x.reviewedBy.trim().length<3||!/^[\x20-\x7e]{3,120}$/.test(x.reviewedBy)||
    typeof x.reviewedAtUtc!=="string"||!Number.isFinite(Date.parse(x.reviewedAtUtc))||new Date(x.reviewedAtUtc).toISOString()!==x.reviewedAtUtc||
    Date.parse(x.reviewedAtUtc)>now.getTime()||Date.parse(x.reviewedAtUtc)>=Date.parse("2026-11-23T23:10:00.000Z")||
    ["independentProspectiveRevisionApproved","originalScientificDesignPreserved","oldStageRemainsArchivedEvidence","noBackfillApproved","sourceUseDeferredToPhase6Activation"].some(k=>x[k]!==true)||x.phase6PaidGo!==false)hold("EXACT_INDEPENDENT_DATE_DECISION_REQUIRED");
 return true;
}
export function recoverP6Nov22StageInputFromCommittedEvidence(){
 const r=prepareP6ActualReviewInput(P6_NOV22_STAGE_CODE,0,"COMPACT_NOV22"),rec=r.concreteReviewRecommendation;
 if(r.externalCandidate.expectedCalendarRowsSha256!==NOV22_CALENDAR||r.proposedSourceQueries!==6144||
    r.proposedTotalReservedUnits!==36740||r.proposedPeakDailyUnits!==1280||
    r.frameEvidence.frameHash!=="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94"||
    rec.netRestCeilingUnits!==49468||!same(rec.proposedAlertSafety,{
     unsettledBurstMarginCredits:50,protectedAlertFloorCredits:1000,alertRunSpendCeilingCredits:680,
     dailySoftStopMarginCredits:150,productionReconcileToleranceCredits:0,startAdmissionToleranceSeconds:120,
     safetyWatchdogPollMs:5000,settlementInitialWaitSeconds:30,settlementPollIntervalSeconds:10,
     settlementStableReadCount:3,settlementTimeoutSeconds:600}))hold("RECOVERED_NOV22_PUBLIC_EVIDENCE_DRIFT");
 const external={...r.externalCandidate,manifestSha256:OLD_MANIFEST,calendarSha256:NOV22_CALENDAR,
  configSha256:OLD_CONFIG,frameSha256:r.frameEvidence.frameHash,codeSha40:P6_NOV22_STAGE_CODE,
  phase6AuthorizationId:"AUTH-20261119-P5INERTFREEZE",predecessorEvidenceIds:[...NOV22_PREDECESSORS],
  alertSafety:rec.proposedAlertSafety,providerRangeEvidenceSha256:NOV22_RANGE,timingEvidenceSha256:NOV22_TIMING,
  cycleRestCeilingUnits:rec.netRestCeilingUnits,jointBudgetReview:rec.jointBudgetReview};
 const timing={...r.timingCandidate,timingEvidenceSha256:NOV22_TIMING};
 const eb=Buffer.from(JSON.stringify(external)),tb=Buffer.from(JSON.stringify(timing));
 const result=compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:sha(eb),
  timingBytes:tb,expectedTimingFileSha256:sha(tb),calendarVariant:"COMPACT_NOV22"});
 const stage=result.files.find(x=>x.path==="unsigned-stage-input.json");
 if(!stage||result.summary.unsignedStageInputSha256!==P6_NOV22_STAGE_SHA||stage.sha256!==P6_NOV22_STAGE_SHA||
    result.summary.unsignedCostOnlyEnvelopeSha256!==P6_NOV22_COST_SHA)hold("RECOVERED_NOV22_EXACT_HASH_MISMATCH");
 const input=JSON.parse(stage.bytes);
 if(hash(input)!==P6_NOV22_STAGE_SHA||input.manifestSha256!==OLD_MANIFEST||input.configSha256!==OLD_CONFIG||
    input.calendarSha256!==NOV22_CALENDAR||input.codeSha40!==P6_NOV22_STAGE_CODE||
    input.phase6AuthorizationId!=="AUTH-20261119-P5INERTFREEZE"||
    !same(input.predecessorEvidenceIds,NOV22_PREDECESSORS))hold("RECOVERED_NOV22_STAGE_SCOPE");
 return {input,costSha256:result.summary.unsignedCostOnlyEnvelopeSha256,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
function oldPackage(dir:string){
 const old=privateRead(join(dir,"new-stage-input.json"),P6_NOV22_STAGE_SHA,48000),m=privateRead(join(dir,"new-manifest.json"),OLD_MANIFEST),c=privateRead(join(dir,"new-config.json"),OLD_CONFIG);
 const input=JSON.parse(old.toString("utf8")),manifest=JSON.parse(m.toString("utf8")),config=JSON.parse(c.toString("utf8"));
 if(JSON.stringify(input)!==old.toString()||input.codeSha40!==P6_NOV22_STAGE_CODE||input.manifestSha256!==OLD_MANIFEST||input.configSha256!==OLD_CONFIG||input.phase6AuthorizationId!=="AUTH-20261119-P5INERTFREEZE"||
   manifest.originalFrozenManifestSha256!==ORIGINAL_MANIFEST||manifest.sourceUseDeferredToPhase6Activation!==true||manifest.scientificFreezeApproved!==true||manifest.phase6PaidGo!==false||config.calendarRowsSha256!==input.calendarSha256)hold("EXISTING_NOV22_STAGE_SCOPE");
 return input;
}
function baseReview(head:string,old:any){
 const r=prepareP6ActualReviewInput(head,0,"COMPACT_MONDAY_NOV23"),identity=prepareP6ActualReleaseIdentityReview(head,0,"COMPACT_MONDAY_NOV23"),rev=r.calendarRevisionReview;
 const dateReceiptSha256=sha(readFileSync(DATE)),boundedSourceUseEvidenceSha256=sha(readFileSync(RIGHTS)),recoveryControlEvidenceSha256=sha(readFileSync(PITR));
 if(!rev||rev.firstSourceUtc!=="2026-11-23T23:45:00.000Z"||rev.authorizationDeadlineUtc!=="2026-11-23T23:10:00.000Z"||rev.firstServiceUtc!=="2026-11-25T00:00:00.000Z"||rev.lastServiceEndUtc!=="2026-12-27T04:00:00.000Z"||rev.allocatedOutcomeTailUtc!=="2026-12-29T04:00:00.000Z"||rev.calendarRowsSha256!==P6_MONDAY_CALENDAR_ROWS_SHA||r.proposedTotalReservedUnits!==36740||r.proposedPeakDailyUnits!==1280||r.proposedSourceQueries!==6144||identity.geometry.dayPlanCount!==31||!same(old.alertSafety,r.concreteReviewRecommendation.proposedAlertSafety)||old.frameSha256!==r.frameEvidence.frameHash||old.slotBudgetInput.cycleRestCeilingUnits!==r.concreteReviewRecommendation.netRestCeilingUnits)hold("EXACT_GEOMETRY_OR_HISTORICAL_SCOPE");
 const scope={schema:"v39.phase6.monday-date-review-scope.v1",oldStageSha256:P6_NOV22_STAGE_SHA,oldCostSha256:P6_NOV22_COST_SHA,oldManifestSha256:OLD_MANIFEST,originalFrozenManifestSha256:ORIGINAL_MANIFEST,dateReceiptSha256,sourceInventorySha256:identity.manifestCandidate.content.sourceInventorySha256,configCandidateSha256:identity.configCandidate.sha256,manifestCandidateSha256:identity.manifestCandidate.sha256,calendarRowsSha256:rev.calendarRowsSha256,dateMapSha256:rev.dateMapSha256,firstServiceUtc:rev.firstServiceUtc,firstSourceUtc:rev.firstSourceUtc,authorizationDeadlineUtc:rev.authorizationDeadlineUtc,lastServiceEndUtc:rev.lastServiceEndUtc,allocatedOutcomeTailUtc:rev.allocatedOutcomeTailUtc,boundedSourceUseEvidenceSha256,recoveryControlEvidenceSha256,sourceQueries:6144,reservedUnits:36740,peakUtcDayUnits:1280,sourceUseDeferredToPhase6Activation:true,phase6PaidGo:false};
 return {r,identity,scope,reviewDigest:hash(scope)};
}
function approvedDecision(path:string,expectedSha:string,expected:Parameters<typeof validateP6MondayDateDecision>[1],head:string){
 if(!H.test(expectedSha)||!/^data-collection\/phase5\/evidence\/2026-11-[0-9]{2}_[A-Za-z0-9_.-]{5,140}\.json$/.test(path))hold("COMMITTED_DATE_DECISION_PATH");
 const raw=readFileSync(path),tracked=execFileSync("git",["show",head+":"+path],{stdio:["ignore","pipe","ignore"],timeout:10000});
 if(!raw.equals(tracked)||sha(raw)!==expectedSha)hold("COMMITTED_DATE_DECISION_BYTES");
 const x=JSON.parse(raw.toString("utf8"));validateP6MondayDateDecision(x,expected,new Date());return x;
}
function prepared(old:any,head:string,b:ReturnType<typeof baseReview>,decisionSha:string,now?:Date){
 const {r,identity,scope}=b;
 const config={...identity.configCandidate.content,status:"REVIEWED_PROSPECTIVE_MONDAY_SUCCESSOR_NOT_SOURCE_AUTH",originalFrozenPacketPreserved:true,originalFrozenManifestSha256:OLD_MANIFEST,ancestralOriginalFrozenManifestSha256:ORIGINAL_MANIFEST,prospectiveDateRevisionApproved:true,prospectiveDateRevisionEvidenceSha256:decisionSha,boundedSourceUseEvidenceSha256:scope.boundedSourceUseEvidenceSha256,recoveryControlEvidenceSha256:scope.recoveryControlEvidenceSha256,reviewApproved:true,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,legacyAlertStartApproved:false,phase6PaidGo:false};
 const configSha=hash(config),manifest={...identity.manifestCandidate.content,status:"SCIENTIFIC_FREEZE_PROSPECTIVE_MONDAY_SUCCESSOR_APPROVED_NO_GO",originalCandidateConfigSha256:identity.configCandidate.sha256,configCandidateSha256:configSha,originalFrozenPacketPreserved:true,originalFrozenManifestSha256:OLD_MANIFEST,ancestralOriginalFrozenManifestSha256:ORIGINAL_MANIFEST,prospectiveDateRevisionApproved:true,prospectiveDateRevisionEvidenceSha256:decisionSha,boundedSourceUseEvidenceSha256:scope.boundedSourceUseEvidenceSha256,recoveryControlEvidenceSha256:scope.recoveryControlEvidenceSha256,calendarRowsSha256:scope.calendarRowsSha256,configSha256:configSha,finalPredecessorsApproved:false,scientificFreezeApproved:true,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,phase6PaidGo:false};
 const manifestRaw=JSON.stringify(manifest),rec=r.concreteReviewRecommendation;
 const external={...r.externalCandidate,manifestSha256:sha(manifestRaw),calendarSha256:scope.calendarRowsSha256,configSha256:configSha,frameSha256:old.frameSha256,codeSha40:head,phase6AuthorizationId:old.phase6AuthorizationId,predecessorEvidenceIds:[...old.predecessorEvidenceIds],alertSafety:old.alertSafety,providerRangeEvidenceSha256:identity.rangeEvidenceCandidate.sha256,timingEvidenceSha256:identity.timingEvidenceCandidate.sha256,cycleRestCeilingUnits:rec.netRestCeilingUnits,jointBudgetReview:rec.jointBudgetReview};
 const timing={...r.timingCandidate,timingEvidenceSha256:identity.timingEvidenceCandidate.sha256},eb=Buffer.from(JSON.stringify(external)),tb=Buffer.from(JSON.stringify(timing));
 const result=compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:sha(eb),timingBytes:tb,expectedTimingFileSha256:sha(tb),calendarVariant:"COMPACT_MONDAY_NOV23"});
 const input=JSON.parse(result.files[31].bytes),stageSha=result.summary.unsignedStageInputSha256,costSha=result.summary.unsignedCostOnlyEnvelopeSha256;
 const writer=P5_TWO_STAGE_ROLES.find((x:any)=>x.key==="P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL")?.role,budget=P5_TWO_STAGE_ROLES.find((x:any)=>x.key==="P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL")?.role;
 if(!writer||!budget||result.files.length!==32||result.summary.sourceQueries!==6144||result.summary.totalReservedUnits!==36740||result.summary.peakDailyUnits!==1280)hold("EXACT_RELEASE_EXPORT");
 const sr=(stage:string)=>({expectedSignedStagePacketSha256:stage,expectedExactWriterRole:writer,independentCalendarTreatmentReviewApproved:true as const,independentProviderAccountAndRestBudgetReviewApproved:true as const,narrowPrelaunchOwnerApproved:true as const});
 const fr=(stage:string,cost:string)=>({expectedStagedB0062PacketSha256:stage,expectedSignedSevenCategoryCostSha256:cost,expectedExactBudgetWriterRole:budget,independentProspectiveCalendarAndTreatmentApproved:true as const,independentRealProviderRangeAndRestBudgetApproved:true as const,independentSourceContentsRightsForIntendedUseApproved:false as const,sourceUseDeferredToPhase6Activation:true as const,exactRestrictedNoProviderBudgetFreezeApproved:true as const});
 const review:P6ProspectiveDisabledStageRevisionReviewV39={schema:"v39.phase6.prospective-disabled-stage-revision-review.v2",expectedOldStageInputSha256:P6_NOV22_STAGE_SHA,expectedOldCostEnvelopeSha256:P6_NOV22_COST_SHA,expectedNewStageInputSha256:stageSha,expectedNewCostEnvelopeSha256:costSha,expectedOriginalFrozenManifestSha256:OLD_MANIFEST,expectedNewManifestSha256:input.manifestSha256,expectedPriorCodeSha40:P6_NOV22_STAGE_CODE,expectedCurrentCodeSha40:head,reviewedCalendarRevisionEvidenceSha256:decisionSha,independentProspectiveRevisionApproved:true,originalScientificDesignPreserved:true,oldStageRemainsArchivedEvidence:true,noBackfillApproved:true};
 const ctx={oldInput:old,oldStageReview:sr(P6_NOV22_STAGE_SHA),oldFreezeReview:fr(P6_NOV22_STAGE_SHA,P6_NOV22_COST_SHA),newInput:input,newStageReview:sr(stageSha),newFreezeReview:fr(stageSha,costSha),newManifestRaw:manifestRaw,review};
 const compiled=compileP6ProspectiveDisabledStageRevisionV39({...ctx,now});
 if(compiled.changedParentDays!==31||compiled.firstNewServiceUtc!==scope.firstServiceUtc)hold("EXACT_TRANSITION");
 return {ctx,result,manifest,config,external,timing,stageSha,costSha,reviewDigest:b.reviewDigest};
}
/** Review-only historical reconstruction, no git/DB mutation. The caller
 * still pins the resulting complete stage/cost/manifest/config bytes. */
export function reconstructP6ExactMondayHistoricalCandidate(head:string,decisionRaw:string,now:Date){
 const old=recoverP6Nov22StageInputFromCommittedEvidence().input,b=baseReview(head,old);
 validateP6MondayDateDecision(JSON.parse(decisionRaw),{reviewDigest:b.reviewDigest,
  dateReceiptSha256:b.scope.dateReceiptSha256,oldStageSha256:P6_NOV22_STAGE_SHA,
  sourceInventorySha256:b.scope.sourceInventorySha256},now);
 return prepared(old,head,b,sha(decisionRaw),now);
}
function save(p:string,files:Record<string,string>){
 const d=resolve(p),home=realpathSync(process.env.HOME!);
 if(dirname(d)!==home||!d.startsWith(home+"/.travnr-phase6-monday-"))hold("PRIVATE_OUTPUT_LOCATION");
 mkdirSync(d,{mode:0o700});
 for(const [name,value] of Object.entries(files)){const f=join(d,name);mkdirSync(dirname(f),{recursive:true,mode:0o700});writeFileSync(f,value,{mode:0o600,flag:"wx"});}
 return d;
}
async function main(){
 const [mode,oldDir,decisionPath,decisionSha,outOrPackage]=process.argv.slice(2),head=exactCheckout();
 if(!["--preview","--prepare-reviewed","--apply-reviewed"].includes(mode)||process.env.GITHUB_ACTIONS==="true"||process.env.ADB_AUTO_COLLECT!=="0"||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.V39_PHASE6_OWNER_APPROVED!=="0"||[process.env.AERODATABOX_API_KEY,process.env.AERODATABOX_WEBHOOK_SECRET,process.env.RAPIDAPI_KEY].some(Boolean))hold("OWNER_NO_PROVIDER_SCOPE");
 const old=oldDir===RECOVER_NOV22?recoverP6Nov22StageInputFromCommittedEvidence().input:oldPackage(privateDir(oldDir)),b=baseReview(head,old);
 if(mode==="--preview"){
  if(process.argv.length!==4)hold("PREVIEW_ARGUMENTS");
  console.log(JSON.stringify({status:"MONDAY_EXACT_REVIEW_SCOPE_NOT_APPROVED_NO_GO",...b.scope,reviewDigest:b.reviewDigest,independentDateRevisionApproved:false,providerCalls:0,databaseWrites:0}));
  return;
 }
 if(process.argv.length!==7||head!==remote())hold("EXACT_REVIEWED_MAIN_REQUIRED");
 const expected={reviewDigest:b.reviewDigest,dateReceiptSha256:b.scope.dateReceiptSha256,oldStageSha256:P6_NOV22_STAGE_SHA,sourceInventorySha256:b.scope.sourceInventorySha256};
 approvedDecision(decisionPath,decisionSha,expected,head);
 const v=prepared(old,head,b,decisionSha);
 const summary={main:head,stageSha256:v.stageSha,costSha256:v.costSha,manifestSha256:v.ctx.newInput.manifestSha256,configSha256:v.ctx.newInput.configSha256,reviewDigest:v.reviewDigest,decisionSha256:decisionSha,dayPlanSha256s:v.result.summary.dayPlanSha256s,sourceQueries:6144,reservedUnits:36740,phase6PaidGo:false};
 if(mode==="--prepare-reviewed"){
  const files:Record<string,string>={"prospective-revision-package.json":JSON.stringify(v.ctx),"new-stage-input.json":JSON.stringify(v.ctx.newInput),"new-manifest.json":v.ctx.newManifestRaw,"new-config.json":JSON.stringify(v.config),"new-external.json":JSON.stringify(v.external),"new-timing.json":JSON.stringify(v.timing),"revision-review.json":JSON.stringify(v.ctx.review),"review-summary.json":JSON.stringify(summary)};
  for(const f of v.result.files.slice(0,31))files["plans/"+f.path.split("/").at(-1)]=f.bytes;
  console.log(JSON.stringify({status:"MONDAY_REVIEWED_PRIVATE_PACKAGE_PREPARED_NO_GO",output:save(outOrPackage,files),...summary,providerCalls:0,databaseWrites:0}));return;
 }
 const dir=privateDir(outOrPackage);
 if(!privateRead(join(dir,"prospective-revision-package.json")).equals(Buffer.from(JSON.stringify(v.ctx)))||process.env.P6_MONDAY_OWNER_APPLY_APPROVAL!=="APPLY_EXACT_REVIEWED_DISABLED_MONDAY_STAGE_ONLY_NO_PROVIDER")hold("EXACT_REVIEWED_PACKAGE_AND_OWNER_APPROVAL");
 // Refuse any owner DB mutation unless ALL 31 tracked and working plan bytes
 // already match the exact Monday compiler. Green preview CI alone is not parity.
 verifyP6ActualCommittedPlanParity(v.result,path=>execFileSync("git",["show",head+":"+path],{stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:600000}),path=>readFileSync(path));
 const u=new URL(process.env.DATABASE_URL??"");
 if(!["postgresql:","postgres:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||!u.password||!u.hostname.endsWith(".neon.tech")||u.pathname!=="/neondb"||u.hash||!["require","verify-full"].includes(u.searchParams.get("sslmode")??"")||process.env.V39_DATABASE_RUNTIME_URL===process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||remote()!==head)hold("EXISTING_OWNER_PRIMARY_TLS");
 const pool=new Pool({connectionString:u.toString(),max:2,connectionTimeoutMillis:8000,query_timeout:30000,application_name:"p6_monday_prospective_disabled_revision"});
 try{const receipt=await commitP6ProspectiveDisabledStageRevisionOnceV39(pool,v.ctx);console.log(JSON.stringify(receipt));const fresh=await verifyP6ProspectiveDisabledStageRevisionReadOnlyV39(pool,v.ctx,receipt);console.log(JSON.stringify(fresh));}
 finally{await pool.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_P6_MONDAY_REVISION_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_MONDAY_REVISION_REDACTED_RECONCILE_NO_REPLAY");process.exitCode=2;});
