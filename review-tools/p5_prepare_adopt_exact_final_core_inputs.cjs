#!/usr/bin/env node
"use strict";
// Mechanical preparation/adoption of the existing core release inputs.
// Never makes a review decision, commits an AUTH ledger entry, signs a
// packet, writes a database, uploads a secret or enables collection.
// First mode uses genuine explicit decisions + exact committed evidence.
// Second mode requires the exact resulting AUTH already approved on main.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {pathToFileURL}=require("node:url");
const REPO="HKcode22/ReplitTranvr",BASE="70580b3749544dfcbeff39da181b2aa42b1b4476";
const LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const ACCOUNT_PATH="data-collection/phase5/evidence/2026-11-18_actual_account_compact_budget_reconciled_NOT_APPROVAL.json";
const ACCOUNT_SHA="8b1c5f077dca3c024d73d0a782323d009ea60706bb042c2babbe0d76e522f33b";
const RAW_ACCOUNT_SHA="7002466888531e26e29c1ecd205ecbed5a534282ced73b5adb315e5c98a5f4b0";
const RANGE="cde412a012e912f9fbe42cd29375ddbaf674054d11af45fe6d2a8eab36c81bb3";
const TIMING="88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5";
const CAL="7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c";
const FRAME="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,ID=/^(?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[A-Z0-9]+$/;
const FLAGS=["independentScientificFreezeApproved","independentSourceUseApproved","independentOperationalReleaseApproved","currentAccountAndBudgetApproved","legacyPublishedAutoCollectVerifiedOff","githubPaidDispatchFlagsVerifiedOff","activeBillableSubscriptionsVerifiedZero","separatePaidDispatchStillRequired"];
const EH=["scientificFreezeEvidenceSha256","sourceRightsEvidenceSha256","providerAccountAndBudgetEvidenceSha256","publishedAndGithubStopEvidenceSha256","operationalReleaseEvidenceSha256"];
const PINS={"manifest-candidate.json":"9f6a12965dcf3eb911da4b13b3d58e5b8ebd0c6544861f499b7ec807cf0dbe25","source-inventory.json":"6cf7dbe2421604fed2909f6539f68021103137eb5d320c40faf28dfb799fd6a0","config-candidate.json":"4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb","external-input-offline-review-NOT-STAGE.json":"a7508acbea9de20ffb3e69771b94f0d6b61f47e77f6bafe38376a9a7c8454fe9"};
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_CORE_INPUT_"+k)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),json=x=>JSON.stringify(x),digest=x=>sha(json(x));
const utc=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const deadline=Date.parse("2026-11-19T23:10:00.000Z");
function validateReview(v,now){
 need(v?.schema==="v39.phase5.exact-final-core-scope-review.v1"&&v.baseCodeSha===BASE&&C.test(v.evidenceCommit??"")&&v.calendarRowsSha256===CAL&&v.frameSha256===FRAME&&v.existingRangeEvidenceSha256===RANGE&&v.existingTimingEvidenceSha256===TIMING&&v.accountReviewSha256===ACCOUNT_SHA&&v.rawAccountEvidenceSha256===RAW_ACCOUNT_SHA,"EXACT_REVIEWED_COMPACT_SCOPE");
 need(v.phase6PaidGo===false&&v.legacyAlertStartApproved===false&&v.finalPredecessorsApproved===true&&FLAGS.every(k=>v[k]===true)&&EH.every(k=>H.test(v[k]??"")),"ACTUAL_INDEPENDENT_DECISIONS_REQUIRED");
 need(typeof v.reviewedBy==="string"&&v.reviewedBy.trim().length>=3&&typeof v.cleanupOwner==="string"&&v.cleanupOwner.trim().length>=6&&/^AUTH-\d{8}-[A-Z0-9]+$/.test(v.authorizationId??""),"EXACT_REVIEW_ACTOR_AND_AUTH_ID");
 need(Array.isArray(v.predecessorEvidenceIds)&&v.predecessorEvidenceIds.length>0&&v.predecessorEvidenceIds.length<=128&&v.predecessorEvidenceIds.every(x=>ID.test(x))&&new Set(v.predecessorEvidenceIds).size===v.predecessorEvidenceIds.length,"EXACT_PREDECESSOR_ORDER");
 need([v.reviewedAtUtc,v.startNotBeforeUtc,v.expiresAtUtc,v.accountEvidenceValidUntilUtc].every(utc)&&Date.parse(v.reviewedAtUtc)<=now&&Date.parse(v.reviewedAtUtc)>=Date.parse("2026-11-19T03:39:03.000Z")&&Date.parse(v.startNotBeforeUtc)<=now&&now<Date.parse(v.expiresAtUtc)&&now<Date.parse(v.accountEvidenceValidUntilUtc)&&now<deadline,"CURRENT_PROSPECTIVE_REVIEW_CLOCK");
 return true;
}
function bindCandidates(c,m,e,t,b,v,hash){
 need(c?.status==="PROPOSED_NOT_FROZEN"&&c.reviewApproved===false&&c.sourceRightsApproved===false&&c.phase6PaidGo===false&&m?.scientificFreezeApproved===false&&m.finalPredecessorsApproved===false&&m.phase6PaidGo===false&&e.phase6AuthorizationId===null&&e.predecessorEvidenceIds===null,"EXISTING_UNSIGNED_CANDIDATES_ONLY");
 need(c.calendarRowsSha256===CAL&&m.calendarRowsSha256===CAL&&c.frameSha256===FRAME&&e.frameSha256===FRAME&&e.providerRangeEvidenceSha256===RANGE&&e.timingEvidenceSha256===TIMING&&t.timingEvidenceSha256===TIMING&&Object.entries(c.source.timing).every(([k,x])=>t[k]===x),"EXACT_ORIGINAL_GEOMETRY_RANGE_TIMING");
 need(c.source.providerMaxRangeMinutes===240&&c.source.apiUnitsPerPhysicalGet===2&&c.source.cycleRestCeilingUnits===49468&&c.source.protectedRestFloorUnits===1000&&b?.jointBudgetReview?.accountEvidenceSha256===RAW_ACCOUNT_SHA&&b.jointBudgetReview.observedAtUtc==="2026-11-19T03:39:03.000Z"&&b.jointBudgetReview.apiUnitsRemaining===59968&&b.jointBudgetReview.alertCreditsRemaining===1830&&b.jointBudgetReview.authorizedFutureRefillApiUnits===0&&b.jointBudgetReview.authorizedFutureRefillAlertCredits===0&&b.arithmetic?.netRestCeiling===49468&&b.arithmetic.restReserved===37388&&b.arithmetic.alertRunCeilingCandidate===680,"EXACT_ACTUAL_NO_REFILL_BUDGET");
 const evidence=Object.fromEntries(EH.map(k=>[k,v[k]]));
 // Preserve original candidate identity (including embedded range evidence)
 // and separately record actual reviewer adoption in final config/manifest.
 // Altering the existing range digest would change all 31 committed day plans.
 const config={...c,status:"REVIEWED_FINAL_CONFIG_EXACT_ARTIFACT_PENDING_LEDGER_NO_GO",jointBudgetReviewCandidate:b.jointBudgetReview,sourceRightsApproved:v.independentSourceUseApproved,reviewApproved:v.independentScientificFreezeApproved,releaseEvidence:evidence,legacyAlertStartApproved:false,phase6PaidGo:false};
 const configSha=hash(config);
 const manifest={...m,status:"REVIEWED_FINAL_MANIFEST_EXACT_ARTIFACT_PENDING_LEDGER_NO_GO",configSha256:configSha,sourceRightsApproved:v.independentSourceUseApproved,scientificFreezeApproved:v.independentScientificFreezeApproved,finalPredecessorsApproved:v.finalPredecessorsApproved,releaseEvidence:evidence,phase6PaidGo:false};
 const external={...e,manifestSha256:hash(manifest),configSha256:configSha,calendarSha256:CAL,phase6AuthorizationId:v.authorizationId,predecessorEvidenceIds:v.predecessorEvidenceIds,asOfUtc:b.jointBudgetReview.observedAtUtc,jointBudgetReview:b.jointBudgetReview};
 need(external.alertSafety?.alertRunSpendCeilingCredits===680&&external.cycleRestCeilingUnits===49468&&external.protectedRestFloorUnits===1000,"EXACT_ALERT_SAFETY_NOT_ALERT_GO");
 return {config,manifest,external,timing:t};
}
function decisionAuth(v,stageContentSha256,costSha,cats){
 need(H.test(stageContentSha256??"")&&H.test(costSha??"")&&Array.isArray(cats)&&cats.length===7&&new Set(cats.map(x=>x.category)).size===7&&cats.every(x=>Number.isSafeInteger(x.ceilingUnits)&&x.ceilingUnits>=0)&&cats.reduce((a,x)=>a+x.ceilingUnits,0)===37388,"EXACT_FINAL_SEVEN_CAPS");
 return {authorizationId:v.authorizationId,phaseGate:"Phase 6 (separate authorization)",airportFilterWindow:"C_D_GITHUB_SOURCE_PRE_POST_EXISTING_CALENDAR_NO_LEGACY_ALERT_START",maxAlertCredits:680,maxRestUnitsByCategory:Object.fromEntries(cats.map(x=>[x.category,x.ceilingUnits])),startNotBeforeUtc:v.startNotBeforeUtc,expiresAtUtc:v.expiresAtUtc,cleanupOwner:v.cleanupOwner,predecessorEvidenceIds:v.predecessorEvidenceIds,releaseActivation:{schema:"v39.phase6.exact-source-activation-review.v1",stageContentSha256,costEnvelopeSha256:costSha,...Object.fromEntries(FLAGS.map(k=>[k,v[k]])),legacyAlertStartApproved:false,...Object.fromEntries(EH.map(k=>[k,v[k]])),accountObservedAtUtc:"2026-11-19T03:39:03.000Z",accountEvidenceValidUntilUtc:v.accountEvidenceValidUntilUtc}};
}
function privateDir(d){const s=fs.lstatSync(d);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIRECTORY");return fs.realpathSync(d)}
function read(d,n,max=4000000){const p=path.join(d,n),s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_INPUT");
 const raw=fs.readFileSync(p),x=JSON.parse(raw.toString("utf8"));need(Buffer.from(json(x)).equals(raw),"CANONICAL_PRIVATE_INPUT");return {p,raw,x,sha256:sha(raw)}}
function write(d,n,x){const p=path.join(d,n),raw=Buffer.from(json(x));try{fs.writeFileSync(p,raw,{flag:"wx",mode:0o600})}catch(e){if(e.code!=="EEXIST")throw e;need(read(d,n).raw.equals(raw),"EXISTING_OUTPUT_DIFFERS_NO_OVERWRITE")}}
const cmd=(c,a,o={})=>execFileSync(c,a,{encoding:"utf8",timeout:30000,maxBuffer:12*1024*1024,stdio:["ignore","pipe","ignore"],...o}).trim();
const git=(a,o={})=>cmd("git",a,o),remote=()=>cmd("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
function sameExecutableScope(ref){
 need(C.test(ref??""),"EVIDENCE_COMMIT");
 const paths=git(["diff","--name-only",BASE,ref]).split("\n").filter(Boolean);
 need(paths.every(x=>x===LEDGER||/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(json|md)$/.test(x)),"EVIDENCE_ONLY_TREE_CHANGES");
}
function evidence(ref,v){
 sameExecutableScope(ref);
 const exact=p=>execFileSync("git",["show",ref+":"+p],{timeout:15000,maxBuffer:2*1024*1024,stdio:["ignore","pipe","ignore"]});
 const raw=exact(LEDGER),l=JSON.parse(raw);
 need(Buffer.from(JSON.stringify(l,null,2)+"\n").equals(raw)&&l.schema==="v39.phase6.source-enable-approval-ledger.v1"&&Array.isArray(l.evidence),"EXACT_SCOPED_LEDGER");
 const hist=exact("data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md").toString("utf8");
 const seen=new Set(Array.from(hist.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g),m=>m[1])),named=new Set();
 for(const r of l.evidence){need(ID.test(r.evidenceId??"")&&!seen.has(r.evidenceId)&&/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(json|md)$/.test(r.path??"")&&H.test(r.sha256??"")&&sha(exact(r.path))===r.sha256,"EXACT_EVIDENCE_PREIMAGE");seen.add(r.evidenceId);if(v.predecessorEvidenceIds.includes(r.evidenceId))named.add(r.sha256)}
 need(v.predecessorEvidenceIds.every(id=>seen.has(id))&&EH.every(k=>named.has(v[k])),"REVIEW_EVIDENCE_NOT_IN_SCOPED_PREDECESSORS");
 const b=exact(ACCOUNT_PATH);need(sha(b)===ACCOUNT_SHA,"EXACT_ACTUAL_ACCOUNT_REVIEW");
 return JSON.parse(b);
}
async function run(){
 const [mode,dirArg,reviewSha]=process.argv.slice(2);
 need(process.argv.length===5&&["PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE","ADOPT_CORE_ALREADY_APPROVED_ON_MAIN"].includes(mode)&&H.test(reviewSha??"")&&process.env.GITHUB_ACTIONS!=="true"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&!["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY"].some(k=>process.env[k]),"OWNER_LOCAL_STOP_SCOPE");
 const root=fs.realpathSync(git(["rev-parse","--show-toplevel"])),head=git(["rev-parse","HEAD"]),d=privateDir(dirArg);
 need(root===fs.realpathSync(process.cwd())&&head===remote()&&git(["status","--porcelain","--untracked-files=no"])===""&&d!==root&&!d.startsWith(root+path.sep),"EXACT_CLEAN_MAIN_AND_PRIVATE_DIRECTORY");sameExecutableScope(head);
 const review=read(d,"reviewed-final-core-scope-decisions.json",200000);
 need(review.sha256===reviewSha,"INDEPENDENT_REVIEW_BYTES");const v=review.x;validateReview(v,Date.now());
 // Candidate inputs are the exact previously recovered private bytes,
 // never recreated from the older public manifest or from estimates.
 const p=Object.fromEntries(Object.entries(PINS).map(([n,expected])=>{const r=read(d,n);need(r.sha256===expected,"PREVIOUS_PRIVATE_CANDIDATE_DRIFT");return [n,r.x]}));
 const timing=read(d,"timing-input-offline-review.json",10000).x;
 const b=evidence(mode==="PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE"?v.evidenceCommit:head,v);
 const x=bindCandidates(p["config-candidate.json"],p["manifest-candidate.json"],p["external-input-offline-review-NOT-STAGE.json"],timing,b,v,digest);
 x.external.codeSha40=head;
 const imp=p=>import(pathToFileURL(path.join(root,p)).href);
 const exporter=await imp("scripts/v39_phase6_actual_release_candidate_export_v39.ts"),owner=await imp("scripts/v39_phase6_enable_source_owner_v39.ts");
 const eb=Buffer.from(json(x.external)),tb=Buffer.from(json(x.timing));
 const result=exporter.compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:sha(eb),timingBytes:tb,expectedTimingFileSha256:sha(tb),calendarVariant:"COMPACT_NOV21"});
 need(exporter.verifyP6ActualCommittedCheckout(result).verifiedPlanCount===31&&result.summary.sourceQueries===6144&&result.summary.totalReservedUnits===37388,"EXACT_EXISTING_31_COMMITTED_PLANS");
 const stage=JSON.parse(result.files.find(f=>f.path==="unsigned-stage-input.json").bytes),costSha=result.summary.unsignedCostOnlyEnvelopeSha256;
 const costModule=await imp("server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs");
 const cost=costModule.buildP5V0082UnknownAirportSevenCostOnlyDraft({schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",slotBudgetInput:stage.slotBudgetInput,expectedReviewerSlotEnvelopeSha256:stage.expectedSignedSlotEnvelopeSha256});
 need(cost.costOnlyCategoryDraftSha256===costSha,"EXACT_COST_DIGEST");
 const auth=decisionAuth(v,owner.p6SourceAuthorizationStageContentSha(stage),costSha,cost.categoryCaps);
 const summary={manifestSha256:digest(x.manifest),configSha256:digest(x.config),stageContentSha256:auth.releaseActivation.stageContentSha256,costEnvelopeSha256:costSha,authArtifactSha256:digest(auth),authorizationId:v.authorizationId,reviewSha256:reviewSha,plannedQueries:6144,reservedUnits:37388,phase6PaidGo:false};
 need(head===remote(),"MAIN_DRIFT");
 if(mode==="PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE"){
  const out=path.join(d,"core-exact-artifact-review");try{fs.mkdirSync(out,{mode:0o700})}catch(e){if(e.code!=="EEXIST")throw e}privateDir(out);
  for(const [k,val] of Object.entries({manifest:x.manifest,config:x.config,external:x.external,timing:x.timing,auth}))write(out,k+".json",val);
  write(out,"review-receipt.json",summary);
  console.log(json({status:"CORE_ARTIFACTS_PREPARED_FROM_REVIEW_DECISIONS_NOT_LEDGER_APPROVED",...summary,approvalEntryProposed:{authorizationId:v.authorizationId,artifactSha256:summary.authArtifactSha256,predecessorEvidenceIds:v.predecessorEvidenceIds},ledgerWrites:0,databaseWrites:0,providerCalls:0}));return;
 }
 // The actual independent exact artifact review is the existing ledger entry.
 // Never adopt an AUTH just because the same locally computed hash exists.
 const old=privateDir(path.join(d,"core-exact-artifact-review"));
 const r=read(old,"review-receipt.json").x;
 need(json(r)===json(summary)&&read(old,"auth.json").sha256===summary.authArtifactSha256,"EXACT_PREVIOUS_PREPARED_ARTIFACT_DRIFT");
 const actual=(await imp("scripts/v39_phase6_source_enable_approval_ledger_v39.ts")).verifyP6SourceEnableAuthFile(path.join(old,"auth.json"),head);
 need(actual.verdict.verified===true&&actual.artifactHash===summary.authArtifactSha256,"EXISTING_LEDGER_AUTH_NOT_APPROVED");
 const stageMod=await imp("scripts/v39_phase6_inert_release_stage_manual_v39.mjs");
 const st=result.files.find(f=>f.path==="unsigned-stage-input.json");
 const ctx=stageMod.admitP6InertOwnerReadback({...process.env,V39_P5_APPROVED_CODE_SHA:head},st.bytes,st.sha256,costSha,head);
 owner.verifyP6SourceActivationReview({input:ctx.input,review:ctx.review,freezeReview:ctx.freezeReview},actual,new Date());
 need(head===remote(),"MAIN_DRIFT");
 for(const [k,val] of Object.entries({manifest:x.manifest,config:x.config,"external-input":x.external,"timing-input":x.timing,auth}))write(d,"approved-"+k+".json",val);
 console.log(json({status:"EXACT_EXISTING_LEDGER_AUTH_CORE_INPUTS_ADOPTED_PRIVATE_NO_GO",main:head,...summary,ledgerWrites:0,databaseWrites:0,providerCalls:0}));
}
module.exports={validateReview,bindCandidates,decisionAuth,FLAGS,EH};
if(require.main===module)run().catch(e=>{const s=String(e?.message??"");console.error(/^HOLD_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_CORE_INPUT_REDACTED");process.exitCode=2});
