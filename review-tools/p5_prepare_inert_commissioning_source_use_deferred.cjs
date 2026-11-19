#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),{execFileSync}=require("node:child_process"),{pathToFileURL}=require("node:url");
const REPO="HKcode22/ReplitTranvr",MAIN="70580b3749544dfcbeff39da181b2aa42b1b4476";
const MANIFEST="9f6a12965dcf3eb911da4b13b3d58e5b8ebd0c6544861f499b7ec807cf0dbe25",CONFIG="4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb",SOURCE_INV="6cf7dbe2421604fed2909f6539f68021103137eb5d320c40faf28dfb799fd6a0",EXTERNAL="a7508acbea9de20ffb3e69771b94f0d6b61f47e77f6bafe38376a9a7c8454fe9",TIMING="88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5";
const AUTH_ID="AUTH-20261119-P5INERT",RESERVED_RIGHTS_ID="RUN-20261119-SOURCERIGHTS";
const ACCOUNT_PATH="data-collection/phase5/evidence/2026-11-18_actual_account_compact_budget_reconciled_NOT_APPROVAL.json";
const PREDECESSORS=["RUN-20261116-OWNERREVIEW112557","RUN-20261116-PREARMCLOCK43832469501","RUN-20261116-QUOTA091844","RUN-20261116-BTSOVERLAP14198898471","RUN-20261116-SOURCEGAPSENSITIVITY","RUN-20261116-HISTORICALFIDSCLEAR","RUN-20261116-V0103VERIFY43987495623","RUN-20261116-HISTORICALPREINVENTORY","RUN-20261116-V0104OWNERINSTALL","RUN-20261116-HEARTBEAT43992105353","RUN-20261116-PRIMARYEXPIRY43997742324","RUN-20261116-HISTORICALPRECLASSIFICATION015741","RUN-20261119-FRESHACCOUNT033903","RUN-20261119-SCIENTIFICSCOPEREVIEW","RUN-20261119-FRESHBUDGETRECONCILED","RUN-20261119-OPERATIONALSCOPEREVIEW","RUN-20261119-EXACTCOMPACTCOST","RUN-20261119-NATIVEPOSTGEOMETRY","RUN-20261119-ACTUALSIGNERALIASES","RUN-20261119-ACTUALPOLICYRECOVERY","RUN-20261119-ACTUALOWNERRECOVERY","DEC-20261119-OWNERPRESERVEF8","RUN-20261119-EXISTINGSTOPGUARDEVIDENCE","RUN-20261119-FINALOWNERMETADATA","RUN-20261119-NATIVECOREPREARMREVIEW","RUN-20261119-CURRENTGITHUBSTOP","RUN-20261119-PUBLISHEDGITHUBSTOPCOMBINED","RUN-20261119-CURRENTFIDSPRICE","RUN-20261119-SOURCERIGHTS"];
const need=(x,s)=>{if(!x)throw Error("HOLD_P5_INERT_PREP_"+s)},sha=b=>crypto.createHash("sha256").update(b).digest("hex"),canonical=x=>Buffer.from(JSON.stringify(x));
const git=a=>execFileSync("git",a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:15000}).trim(),gh=a=>execFileSync("gh",a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:15000}).trim();
function secureDir(p){const q=fs.realpathSync(p),s=fs.lstatSync(q);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIR");return q}
function readJson(p,max=4_000_000){const b=fs.readFileSync(p);need(b.length>1&&b.length<=max,"FILE_SIZE");return {b,x:JSON.parse(b),sha256:sha(b)}}
function makeWorkpaper(stage,c,stageRaw){
 return {schema:"v39.phase5.inert-commissioning-review-workpaper.v1",status:"EXACT_INERT_INPUT_READY_SOURCE_USE_DEFERRED_NOT_APPROVED_NO_GO",main:MAIN,authorizationId:AUTH_ID,stageSha256:sha(stageRaw),costEnvelopeSha256:c.costOnlyCategoryDraftSha256,manifestSha256:MANIFEST,configSha256:CONFIG,calendarSha256:stage.calendarSha256,frameSha256:stage.frameSha256,predecessorEvidenceIds:PREDECESSORS,reservedFutureSourceRightsEvidenceId:RESERVED_RIGHTS_ID,sourceRightsEvidencePresent:false,sourceUseDeferredToPhase6Activation:true,reviewDecisions:{independentCalendarTreatmentReviewApproved:null,independentProviderAccountAndRestBudgetReviewApproved:null,narrowPrelaunchOwnerApproved:true,independentProspectiveCalendarAndTreatmentApproved:null,independentRealProviderRangeAndRestBudgetApproved:null,exactRestrictedNoProviderBudgetFreezeApproved:null},sourceUse:{independentSourceContentsRightsForIntendedUseApproved:false,requiredBeforePhase6AuthorizationEnable:true},verifiedPlanCount:31,plannedQueries:6144,reservedRestUnits:37388,peakDailyUnits:1280,categoryCount:7,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
}
async function run(){
 need(process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&
  !["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL","V39_DATABASE_RUNTIME_URL","NODE_OPTIONS"].some(k=>process.env[k]),"OFFLINE_SCOPE");
 const root=fs.realpathSync(git(["rev-parse","--show-toplevel"])),head=git(["rev-parse","HEAD"]);
 need(root===fs.realpathSync(process.cwd())&&head===MAIN&&head===gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"])&&git(["status","--porcelain","--untracked-files=no"])==="","EXACT_MAIN");
 const dir=secureDir(process.env.P5_FINAL_REVIEW_DIRECTORY||"");need(!dir.startsWith(root+path.sep)&&dir!==root,"PRIVATE_OUTSIDE_REPO");
 const files={manifest:readJson(path.join(dir,"manifest-candidate.json")),config:readJson(path.join(dir,"config-candidate.json")),inv:readJson(path.join(dir,"source-inventory.json")),external:readJson(path.join(dir,"external-input-offline-review-NOT-STAGE.json")),timing:readJson(path.join(dir,"timing-input-offline-review.json"),10000),account:readJson(path.join(root,ACCOUNT_PATH),200000)};
 need(files.manifest.sha256===MANIFEST&&files.config.sha256===CONFIG&&files.inv.sha256===SOURCE_INV&&files.external.sha256===EXTERNAL&&files.timing.x.timingEvidenceSha256===TIMING,"RECOVERED_BYTES");
 const e=files.external.x,b=files.account.x;
 need(e.codeSha40===MAIN&&e.phase6AuthorizationId===null&&e.predecessorEvidenceIds===null&&e.manifestSha256===MANIFEST&&e.configSha256===CONFIG&&b?.jointBudgetReview?.observedAtUtc==="2026-11-19T03:39:03.000Z"&&b.jointBudgetReview.apiUnitsRemaining===59968&&b.jointBudgetReview.alertCreditsRemaining===1830&&b.arithmetic?.restReserved===37388,"CURRENT_INPUT");
 need(new Set(PREDECESSORS).size===PREDECESSORS.length&&PREDECESSORS.at(-1)===RESERVED_RIGHTS_ID,"PREDECESSOR_PLAN");
 const ext={...e,phase6AuthorizationId:AUTH_ID,predecessorEvidenceIds:PREDECESSORS,asOfUtc:b.jointBudgetReview.observedAtUtc,jointBudgetReview:b.jointBudgetReview};
 const eb=canonical(ext),tb=canonical(files.timing.x),exporter=await import(pathToFileURL(path.join(root,"scripts/v39_phase6_actual_release_candidate_export_v39.ts")).href);
 const result=exporter.compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:sha(eb),timingBytes:tb,expectedTimingFileSha256:sha(tb),calendarVariant:"COMPACT_NOV21"});
 const parity=exporter.verifyP6ActualCommittedCheckout(result),stageFile=result.files.find(f=>f.path==="unsigned-stage-input.json");
 need(parity.verifiedPlanCount===31&&result.summary.sourceQueries===6144&&result.summary.totalReservedUnits===37388&&result.summary.peakDailyUnits===1280&&stageFile,"EXPORT_PARITY");
 const stageRaw=Buffer.from(stageFile.bytes),stage=JSON.parse(stageRaw);
 need(canonical(stage).equals(stageRaw)&&stage.codeSha40===MAIN&&stage.phase6AuthorizationId===AUTH_ID&&JSON.stringify(stage.predecessorEvidenceIds)===JSON.stringify(PREDECESSORS)&&stage.manifestSha256===MANIFEST&&stage.configSha256===CONFIG,"STAGE_IDENTITY");
 const cost=await import(pathToFileURL(path.join(root,"server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs")).href);
 const c=cost.buildP5V0082UnknownAirportSevenCostOnlyDraft({schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",slotBudgetInput:stage.slotBudgetInput,expectedReviewerSlotEnvelopeSha256:stage.expectedSignedSlotEnvelopeSha256});
 need(c.costOnlyCategoryDraftSha256===result.summary.unsignedCostOnlyEnvelopeSha256&&c.categoryCaps.length===7&&c.phase6PaidGo===false&&c.providerCalls===0,"COST_PARITY");
 const out=path.join(dir,"phase5-inert-commissioning-"+MAIN.slice(0,12));fs.mkdirSync(out,{mode:0o700});
 const write=(name,raw)=>{const p=path.join(out,name);try{fs.writeFileSync(p,raw,{flag:"wx",mode:0o600})}catch(err){if(err.code!=="EEXIST")throw err;need(fs.readFileSync(p).equals(raw),"EXISTING_OUTPUT_DIFFERS")}};
 write("exact-inert-stage-input.json",stageRaw);
 const work=makeWorkpaper(stage,c,stageRaw);
 write("inert-commissioning-review-workpaper-NOT-APPROVED.json",canonical(work));
 console.log(JSON.stringify({status:"P5_INERT_COMMISSIONING_INPUT_PREPARED_PRIVATE_NO_GO",directory:out,stageSha256:work.stageSha256,costEnvelopeSha256:work.costEnvelopeSha256,authorizationId:AUTH_ID,predecessorCount:PREDECESSORS.length,reservedFutureSourceRightsEvidenceId:RESERVED_RIGHTS_ID,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false}));
}
module.exports={AUTH_ID,RESERVED_RIGHTS_ID,PREDECESSORS,makeWorkpaper};
if(require.main===module)run().catch(e=>{const s=String(e?.message??"");console.error(/^HOLD_P5_INERT_PREP_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_INERT_PREP_REDACTED");process.exitCode=2});
