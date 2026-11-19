#!/usr/bin/env node
"use strict";
// Owner-local mechanical assembly using the existing verified AUTH, exact
// exporter and existing six-policy validator. Not an approver or signer.
// The generated policy bytes still require the existing independently
// approved-private-policy-review.json before any installation.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {pathToFileURL}=require("node:url");
const REPO="HKcode22/ReplitTranvr",H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const WORK="7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e";
const CATALOG="4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534";
const CONTRACT="63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09";
const NAMES=["P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64"];
const FLAGS=[
 "independentStudyTrustPinsApproved","delegatedDailyPacketProductionApproved",
 "delegatedAutomatedSourceSigningApproved","independentTransportAndSigningScopeApproved",
 "independentPostReviewerPinsApproved","nativePreFeatureApproved","nativeLaterApproved",
 "privatePublicationApproved","nativeT24ReviewApproved","independentT24WitnessProtocolReviewed",
 "verifiedProviderNativeSchedule","independentT24CustodyTrustApproved",
 "delegatedAutomatedLaterDayAppendApproved","independentPostRequestGeometryApproved",
 "delegatedPostPacketAndDayAppendApproved","independentSourceContentsUseAndRESTReleaseAttested",
 "independentProviderContentRetentionApproved"
];
const HASHES=["releaseSha256","externalContentUseReviewSha256","builderSha256","runAndRetentionEvidenceSha256","selectedTArtifactHash","selectedTSemanticsEvidenceSha256","t24CustodyPolicySha256","reviewedProviderPriceSha256","externalPostContentsAndBudgetEvidenceSha256"];
const hold=s=>{throw Error("HOLD_P5_SIX_FINAL_"+s)},need=(x,s)=>{if(!x)hold(s)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const utc=v=>typeof v==="string"&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const keys=(x,a)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===a.length&&a.every(k=>Object.hasOwn(x,k));
function assemble(work,p,s,ops){
 need(work?.status==="PRIVATE_SIX_POLICY_SHAPES_WITH_PUBLIC_CONTRACT_CANDIDATE_NOT_RUNTIME"&&work.phase6PaidGo===false&&work.manifestApproved===false&&keys(work.policyDrafts,NAMES),"EXACT_EXISTING_UNSIGNED_WORKPAPER");
 need(p?.authVerified===true&&C.test(p.codeSha??"")&&[p.manifestSha256,p.calendarSha256,p.configSha256,p.frameSha256,p.rightsSha256,p.providerContractSha256,p.costSha256,p.authArtifactSha256].every(v=>H.test(v??"")),"VERIFIED_EXISTING_AUTH_AND_FINAL_PINS");
 need(s?.schema==="v39.phase5.final-six-policy-binding-decisions.v1"&&s.phase6PaidGo===false&&s.authorizationId===p.authorizationId&&s.authArtifactSha256===p.authArtifactSha256&&s.reviewedMainSha===p.codeSha&&s.manifestSha256===p.manifestSha256&&s.configSha256===p.configSha256&&s.rightsSha256===p.rightsSha256&&s.costSha256===p.costSha256,"REVIEWED_DECISION_SCOPE");
 need(typeof s.reviewedBy==="string"&&s.reviewedBy.trim().length>=3&&utc(s.reviewedAtUtc)&&Date.parse(s.reviewedAtUtc)<=Date.parse(p.nowUtc),"ACTUAL_REVIEW_CLOCK");
 need(keys(s.decisions,FLAGS)&&FLAGS.every(k=>s.decisions[k]===true)&&HASHES.every(k=>H.test(s[k]??"")),"EXPLICIT_REVIEWED_POLICY_DECISIONS");
 need(utc(s.validFromUtc)&&utc(s.validUntilUtc)&&utc(s.builderFrozenAtUtc)&&Date.parse(s.validFromUtc)<=Date.parse(p.nowUtc)&&Date.parse(s.validUntilUtc)>=Date.parse(p.outcomeTailUtc)&&Date.parse(s.builderFrozenAtUtc)<=Date.parse(s.reviewedAtUtc)&&Date.parse(s.validFromUtc)<Date.parse(s.validUntilUtc),"REVIEWED_VALIDITY");
 need(typeof s.selectedTVersion==="string"&&s.selectedTVersion.trim().length>0&&s.selectedTVersion.length<=150&&(s.standaloneNoT24ProtocolSha256===null||H.test(s.standaloneNoT24ProtocolSha256??"")),"SELECTED_T_REVIEW");
 // Do not allow the old candidate's false flags to silently become approvals.
 // Exact reviewer decisions above explicitly supply each independent value.
 const w=JSON.parse(JSON.stringify(work.policyDrafts)),[t,d,g,x,pt,post]=NAMES.map(n=>w[n]),l=d.nativeLaterReview,a=l.dayAppendPolicy,u=l.t24Custody,f=d.nativePreFeatureReview;
 const common={manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,releaseSha256:s.releaseSha256,rightsSha256:p.rightsSha256};
 const ext={...common,configSha256:p.configSha256,frameSha256:p.frameSha256,providerContractSha256:p.providerContractSha256};
 const dates={validFromUtc:s.validFromUtc,validUntilUtc:s.validUntilUtc};
 const costs={reviewedCategoryBudgetSha256:p.costSha256,reviewedCostEnvelopeSha256:p.costSha256,reviewed31DaySourceRequestGridSha256:null};
 Object.assign(t,common,{reviewedCodeSha:p.codeSha,independentStudyTrustPinsApproved:s.decisions.independentStudyTrustPinsApproved});
 for(const v of [d,g])Object.assign(v,ext,dates,costs,{approvedCodeSha:p.codeSha});
 Object.assign(d,{delegatedDailyPacketProductionApproved:s.decisions.delegatedDailyPacketProductionApproved,dayPlanSha256s:p.dayPlanSha256s});
 Object.assign(g,{delegatedAutomatedSourceSigningApproved:s.decisions.delegatedAutomatedSourceSigningApproved});
 Object.assign(f,{approved:s.decisions.nativePreFeatureApproved,rightsSha256:p.rightsSha256,externalContentUseReviewSha256:s.externalContentUseReviewSha256});
 Object.assign(l,dates,{approved:s.decisions.nativeLaterApproved,privatePublicationApproved:s.decisions.privatePublicationApproved,nativeT24ReviewApproved:s.decisions.nativeT24ReviewApproved,independentT24WitnessProtocolReviewed:s.decisions.independentT24WitnessProtocolReviewed,frameSha256:p.frameSha256,configSha256:p.configSha256,builderSha256:s.builderSha256,builderFrozenAtUtc:s.builderFrozenAtUtc,runAndRetentionEvidenceSha256:s.runAndRetentionEvidenceSha256,standaloneNoT24ProtocolSha256:s.standaloneNoT24ProtocolSha256});
 Object.assign(l.selectedTConfig,{verifiedProviderNativeSchedule:s.decisions.verifiedProviderNativeSchedule,version:s.selectedTVersion,artifactHash:s.selectedTArtifactHash,semanticsEvidenceSha256:s.selectedTSemanticsEvidenceSha256});
 Object.assign(u,{independentT24CustodyTrustApproved:s.decisions.independentT24CustodyTrustApproved,policySha256:s.t24CustodyPolicySha256,policyValidFromUtc:s.validFromUtc,policyValidUntilUtc:s.validUntilUtc});
 Object.assign(a,common,dates,{approvedCodeSha:p.codeSha,delegatedAutomatedLaterDayAppendApproved:s.decisions.delegatedAutomatedLaterDayAppendApproved});
 // Order matters: transport hashes must describe final daily/signing bytes.
 Object.assign(x,{independentTransportAndSigningScopeApproved:s.decisions.independentTransportAndSigningScopeApproved,reviewedMainSha:p.codeSha,dailyPolicySha256:ops.hash(d),signingPolicySha256:ops.hash(g)});
 Object.assign(pt,{independentPostReviewerPinsApproved:s.decisions.independentPostReviewerPinsApproved});
 Object.assign(post,common,dates,{reviewedCodeSha:p.codeSha,reviewedFrameSha256:p.frameSha256,reviewedCategoryBudgetSha256:p.costSha256,reviewedProviderContractSha256:p.providerContractSha256,reviewedProviderPriceSha256:s.reviewedProviderPriceSha256,externalPostContentsAndBudgetEvidenceSha256:s.externalPostContentsAndBudgetEvidenceSha256,independentPostRequestGeometryApproved:s.decisions.independentPostRequestGeometryApproved,delegatedPostPacketAndDayAppendApproved:s.decisions.delegatedPostPacketAndDayAppendApproved,independentSourceContentsUseAndRESTReleaseAttested:s.decisions.independentSourceContentsUseAndRESTReleaseAttested,independentProviderContentRetentionApproved:s.decisions.independentProviderContentRetentionApproved});
 return w;
}
const cmd=(c,a,o={})=>execFileSync(c,a,{encoding:"utf8",timeout:30000,maxBuffer:12*1024*1024,stdio:["ignore","pipe","ignore"],...o}).trim();
const main=()=>cmd("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
function read(d,n,max=4000000){
 const f=path.join(d,n),s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>=10&&s.size<=max,"PRIVATE_FILE");
 const raw=fs.readFileSync(f),x=JSON.parse(raw.toString("utf8"));return {f,raw,x,sha256:sha(raw)};
}
function writeOnce(d,n,raw){
 const f=path.join(d,n);
 try{fs.writeFileSync(f,raw,{flag:"wx",mode:0o600})}catch(e){if(e.code!=="EEXIST")throw e;const s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&fs.readFileSync(f).equals(Buffer.from(raw)),"EXISTING_OUTPUT_DIFFERS");}
}
async function run(){
 const [corePath,dir,decisionSha]=process.argv.slice(2);
 need(process.argv.length===5&&H.test(decisionSha??"")&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&!["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY"].some(k=>process.env[k]),"OWNER_NONPAID_SCOPE");
 const d=fs.realpathSync(dir),ds=fs.lstatSync(dir),root=fs.realpathSync(cmd("git",["rev-parse","--show-toplevel"])),head=cmd("git",["rev-parse","HEAD"]);
 need(ds.isDirectory()&&!ds.isSymbolicLink()&&ds.uid===process.getuid()&&(ds.mode&0o077)===0&&d!==root&&!d.startsWith(root+path.sep)&&root===fs.realpathSync(process.cwd()),"PRIVATE_OUTSIDE_CHECKOUT");
 need(C.test(head)&&head===main()&&cmd("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_MAIN");
 const work=read(d,"policy-complete-shape-NOT-RUNTIME.json"),contract=read(d,"public-provider-contract-CANDIDATE.json",20000000),decision=read(d,"reviewed-final-policy-binding-decisions.json");
 need(work.sha256===WORK&&contract.sha256===CONTRACT&&decision.sha256===decisionSha,"EXACT_PRIVATE_INPUT_HASHES");
 const manifest=read(d,"approved-manifest.json"),config=read(d,"approved-config.json"),external=read(d,"approved-external-input.json"),timing=read(d,"approved-timing-input.json"),authFile=read(d,"approved-auth.json");
 const imp=p=>import(pathToFileURL(path.join(root,p)).href);
 const auth=(await imp("scripts/v39_phase6_source_enable_approval_ledger_v39.ts")).verifyP6SourceEnableAuthFile(authFile.f,head);
 need(auth.verdict.verified===true&&auth.artifactHash===authFile.sha256,"EXISTING_LEDGER_AUTH_REQUIRED");
 const e=external.x;need(e.codeSha40===head&&e.manifestSha256===manifest.sha256&&e.configSha256===config.sha256&&e.phase6AuthorizationId===auth.record.authorizationId&&JSON.stringify(e.predecessorEvidenceIds)===JSON.stringify(auth.record.predecessorEvidenceIds),"FINAL_STAGE_PINS");
 const exporter=await imp("scripts/v39_phase6_actual_release_candidate_export_v39.ts");
 const result=exporter.compileP6ActualCandidateExport({externalBytes:external.raw,expectedExternalFileSha256:external.sha256,timingBytes:timing.raw,expectedTimingFileSha256:timing.sha256,calendarVariant:"COMPACT_NOV21"});
 need(exporter.verifyP6ActualCommittedCheckout(result).verifiedPlanCount===31&&result.summary.sourceQueries===6144&&result.summary.totalReservedUnits===37388,"COMPACT_PARITY");
 // The exact existing stage verifier is pure here; no database connection.
 const stage=result.files.find(f=>f.path==="unsigned-stage-input.json"),costSha=result.summary.unsignedCostOnlyEnvelopeSha256;
 const stageMod=await imp("scripts/v39_phase6_inert_release_stage_manual_v39.mjs");
 const ctx=stageMod.admitP6InertOwnerReadback({...process.env,V39_P5_APPROVED_CODE_SHA:head},stage.bytes,stage.sha256,costSha,head);
 const owner=await imp("scripts/v39_phase6_enable_source_owner_v39.ts");
 owner.verifyP6SourceActivationReview({input:ctx.input,review:ctx.review,freezeReview:ctx.freezeReview},auth,new Date());
 const p={authVerified:true,authorizationId:auth.record.authorizationId,authArtifactSha256:auth.artifactHash,codeSha:head,manifestSha256:manifest.sha256,configSha256:config.sha256,calendarSha256:e.calendarSha256,frameSha256:e.frameSha256,rightsSha256:auth.record.releaseActivation.sourceRightsEvidenceSha256,providerContractSha256:contract.sha256,costSha256:costSha,sourceInventorySha256:manifest.x.sourceInventorySha256,executableFileCount:manifest.x.executableFileCount,dayPlanSha256s:result.summary.dayPlanSha256s,airportTimezoneCatalogSha256:CATALOG,dailyRestCeiling:1900,cycleRestCeiling:e.cycleRestCeilingUnits,minimumProtectedFloor:e.protectedRestFloorUnits,maxQueriesPerDay:288,nowUtc:new Date().toISOString(),outcomeTailUtc:"2026-12-26T04:00:00.000Z"};
 const ops={hash:x=>sha(JSON.stringify(x)),publicFingerprint:pem=>{const k=crypto.createPublicKey(pem);need(k.asymmetricKeyType==="ed25519","SIGNER_TYPE");return sha(k.export({type:"spki",format:"der"}))},byteLength:Buffer.byteLength};
 const core=require(path.resolve(corePath));core.verifyFinalManifest(manifest.x,config.x,p,ops);
 const w=assemble(work.x,p,decision.x,ops),verified=core.validateFinalPolicies(w,{...p,releaseSha256:decision.x.releaseSha256},ops),raw=JSON.stringify(w);
 need(main()===head,"MAIN_DRIFT");
 writeOnce(d,"approved-policy-objects.json",raw);
 // Filename matches the existing consumer; exact independent byte review
 // is still required and this tool never writes that review or sets secrets.
 const receipt={status:"SIX_POLICY_BYTES_ASSEMBLED_EXISTING_INDEPENDENT_BYTE_REVIEW_REQUIRED_NO_GO",main:head,authorizationId:p.authorizationId,policyBundleSha256:sha(raw),decisionSha256:decision.sha256,policyDigests:verified.policyDigests,policySizes:verified.policySizes,independentExactPolicyReviewCreated:false,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
 writeOnce(d,"six-policy-assembly-receipt.json",JSON.stringify(receipt));
 console.log(JSON.stringify(receipt));
}
module.exports={assemble,FLAGS,HASHES};
if(require.main===module)run().catch(e=>{const s=String(e?.message??"");console.error(/^HOLD_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_SIX_FINAL_PRIVATE_INPUT_OR_VALIDATION");process.exitCode=2});
