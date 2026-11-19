#!/usr/bin/env node
"use strict";
/**
 * Post-merge Phase5 final preparation for rights-deferred commissioning.
 * PREPARE ONLY: no DB writes, GitHub secret writes, workflow dispatch, provider
 * calls, or source authorization. The exact restored 70580 candidate is rebound
 * only across the reviewed PR879 source delta.
 */
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {pathToFileURL}=require("node:url");
const REPO="HKcode22/ReplitTranvr",BASE="70580b3749544dfcbeff39da181b2aa42b1b4476",PR=879;
const EVIDENCE_HEAD="a4b385907149f5b99ef8f85a11c554c583707916";
const LEDGER_BLOB="bdfed63588475f90149a61b0d7cae13ec51cffa9";
const AUTH_ID="AUTH-20261119-F8CYCLE1",RESERVED_RIGHTS_ID="RUN-20261119-SOURCERIGHTS";
const PINS=Object.freeze({
 "manifest-candidate.json":"9f6a12965dcf3eb911da4b13b3d58e5b8ebd0c6544861f499b7ec807cf0dbe25",
 "config-candidate.json":"4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb",
 "source-inventory.json":"6cf7dbe2421604fed2909f6539f68021103137eb5d320c40faf28dfb799fd6a0",
 "external-input-offline-review-NOT-STAGE.json":"a7508acbea9de20ffb3e69771b94f0d6b61f47e77f6bafe38376a9a7c8454fe9"
});
const TIMING="88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5";
const EVIDENCE=Object.freeze({
 scientificFreezeEvidenceSha256:"b7900e4d4c6e1f26c58c4a333c2b2ac480803ab39ece9b972cb657b9b3d29203",
 providerAccountAndBudgetEvidenceSha256:"8b1c5f077dca3c024d73d0a782323d009ea60706bb042c2babbe0d76e522f33b",
 publishedAndGithubStopEvidenceSha256:"0fe341791b99013146eff5d6fce18dc3ea8c1cd5e5243224d3c9d85b72b7763c",
 operationalReleaseEvidenceSha256:"fd0aa7d6b35b69bb657cbfa8cc481b91a855249bb0fea1802ccc69ada6e5a462",
 currentFidsRangeCostEvidenceSha256:"f6463a2befcfc4e6b6ea9c7ae78383d05055785b4461da8bc573827b9c8dcbe1"
});
const ALLOWED=Object.freeze([
 ".github/workflows/phase5-exact-inert-release-stage-manual.yml",
 "scripts/v39_phase6_enable_source_owner_v39.ts",
 "scripts/v39_phase6_inert_release_stage_manual_v39.mjs",
 "scripts/v39_phase6_release_inventory_readonly.mjs",
 "server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs",
 "tests/phase5_actual_nov22_budget_proposal_v39.test.ts",
 "tests/phase5_source_rights_deferred_to_phase6_activation_v39.test.mjs",
 "tests/phase5_v0093_cost_only_inert_seven_rest_freeze_pg16_v39.test.ts",
 "tests/phase6_release_inventory_readonly_v39.test.ts"
]);
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const need=(x,s)=>{if(!x)throw Error("HOLD_P5_DEFERRED_PREP_"+s)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const json=x=>JSON.stringify(x);
const gitBlob=b=>{const h=crypto.createHash("sha1");h.update(Buffer.from("blob "+b.length+"\0"));h.update(b);return h.digest("hex")};
const call=(c,a,o={})=>execFileSync(c,a,{cwd:process.cwd(),encoding:"utf8",timeout:60000,maxBuffer:32*1024*1024,stdio:["ignore","pipe","ignore"],...o}).trim();
const gh=(a,o={})=>call("gh",a,o);
const scope=p=>/^(?:server|scripts|migrations|tests|shared|client|patches|\.github\/(?:workflows|actions))\//.test(p)||/^(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|tsconfig(?:\.[\w-]+)?\.json|[\w-]+\.config\.[cm]?[jt]s|\.npmrc|\.nvmrc|\.node-version)$/.test(p);
function secureDir(p){const q=fs.realpathSync(p),s=fs.lstatSync(q);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIR");return q}
function readJ(p,max=4_000_000){const b=fs.readFileSync(p);need(b.length>1&&b.length<=max,"FILE_SIZE");const x=JSON.parse(b);need(Buffer.from(json(x)).equals(b),"NONCANONICAL_JSON");return {b,x,sha256:sha(b)}}
function writeOnce(dir,name,b){const raw=Buffer.isBuffer(b)?b:Buffer.from(b),p=path.join(dir,name);try{fs.writeFileSync(p,raw,{flag:"wx",mode:0o600})}catch(e){if(e.code!=="EEXIST")throw e;need(fs.readFileSync(p).equals(raw),"EXISTING_OUTPUT_DIFFERS")}return p}
function api(url){return JSON.parse(gh(["api",url]))}
function blob(id){const x=api("repos/"+REPO+"/git/blobs/"+id);need(x.sha===id&&x.encoding==="base64","BLOB_RESPONSE");const b=Buffer.from(x.content.replace(/\s+/g,""),"base64");need(gitBlob(b)===id,"BLOB_HASH");return b}
function tree(commit){
 const c=api("repos/"+REPO+"/git/commits/"+commit),t=api("repos/"+REPO+"/git/trees/"+c.tree.sha+"?recursive=1");
 need(c.sha===commit&&t.truncated===false,"TREE_COMPLETE");return new Map(t.tree.filter(x=>x.type==="blob").map(x=>[x.path,x]));
}
function candidateDir(){
 if(process.env.P5_FINAL_REVIEW_DIRECTORY)return secureDir(process.env.P5_FINAL_REVIEW_DIRECTORY);
 const home=fs.realpathSync(os.homedir()),m=[];
 for(const n of fs.readdirSync(home).filter(n=>/^\.phase5-final-review-[A-Za-z0-9_-]+$/.test(n))){
  const d=path.join(home,n,"nov18-"+BASE.slice(0,12));if(!fs.existsSync(d))continue;
  try{const q=secureDir(d);if(Object.entries(PINS).every(([k,v])=>readJ(path.join(q,k)).sha256===v)&&readJ(path.join(q,"timing-input-offline-review.json"),10000).x.timingEvidenceSha256===TIMING)m.push(q)}catch{}
 }
 need(m.length===1,"EXACTLY_ONE_RESTORED_CANDIDATE");return m[0];
}
function currentIdentity(){
 const root=fs.realpathSync(git(["rev-parse","--show-toplevel"])),head=git(["rev-parse","HEAD"]),remote=gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
 need(root===fs.realpathSync(process.cwd())&&C.test(head)&&head===remote&&git(["status","--porcelain","--untracked-files=no"])==="","EXACT_CLEAN_CURRENT_MAIN");
 const pr=api("repos/"+REPO+"/pulls/"+PR);
 need(pr.merged===true&&pr.merge_commit_sha===head,"PR879_NOT_EXACT_CURRENT_MAIN");
 const cmp=api("repos/"+REPO+"/compare/"+BASE+"..."+head),files=(cmp.files||[]).map(x=>x.filename).sort();
 need(cmp.status==="ahead"&&json(files)===json([...ALLOWED].sort()),"UNREVIEWED_FINAL_MAIN_DELTA");
 return {root,head};
}
function rebindInventory(oldInv,oldManifest,head){
 need(Array.isArray(oldInv)&&sha(Buffer.from(json(oldInv)))===PINS["source-inventory.json"],"OLD_INVENTORY_PIN");
 const a=tree(BASE),b=tree(head),as=new Map([...a].filter(([p])=>scope(p))),bs=new Map([...b].filter(([p])=>scope(p)));
 const rows=new Map(oldInv.map(x=>[x.path,x]));need(rows.size===as.size&&rows.size===oldInv.length&&[...as].every(([p,x])=>rows.get(p)?.mode===x.mode),"OLD_INVENTORY_SCOPE");
 const delta=[...new Set([...as.keys(),...bs.keys()])].sort().filter(p=>as.get(p)?.sha!==bs.get(p)?.sha||as.get(p)?.mode!==bs.get(p)?.mode);
 need(json(delta)===json([...ALLOWED].sort()),"SOURCE_DELTA_NOT_EXACT_PR879");
 const out=[...bs].sort(([p],[q])=>p<q?-1:p>q?1:0).map(([p,x])=>{
  need(["100644","100755"].includes(x.mode)&&C.test(x.sha),"SOURCE_TREE_ROW");
  if(as.get(p)?.sha===x.sha&&as.get(p)?.mode===x.mode)return rows.get(p);
  const raw=blob(x.sha);return {path:p,mode:x.mode,sha256:sha(raw)};
 });
 const refs=[...(oldManifest.bindingDocuments||[]),oldManifest.originalSeed,oldManifest.calendarRevisionReceipt].filter(Boolean);
 for(const x of refs)need(typeof x.path==="string"&&a.get(x.path)?.sha&&a.get(x.path).sha===b.get(x.path)?.sha,"BINDING_DOCUMENT_DRIFT");
 return {rows:out,sha256:sha(Buffer.from(json(out)))};
}
function freezeArtifacts(c,m,inventory,head,evidenceIds,account){
 const releaseEvidence={...EVIDENCE,sourceRightsEvidenceSha256:null,reservedSourceRightsEvidenceId:RESERVED_RIGHTS_ID,ownerCommissioningDecisionIssueCommentId:7002623385};
 const config={...c,status:"PHASE5_FROZEN_CONFIG_SOURCE_USE_DEFERRED_NO_GO",jointBudgetReviewCandidate:account.jointBudgetReview,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,reviewApproved:true,phase5CommissioningApproved:true,releaseEvidence,legacyAlertStartApproved:false,phase6PaidGo:false};
 const configSha=sha(Buffer.from(json(config)));
 const manifest={...m,status:"PHASE5_FROZEN_MANIFEST_SOURCE_USE_DEFERRED_NO_GO",configSha256:configSha,sourceInventorySha256:inventory.sha256,executableFileCount:inventory.rows.length,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,scientificFreezeApproved:true,phase5CommissioningApproved:true,phase5PredecessorsApproved:true,finalPredecessorsApproved:false,releaseEvidence,phase6PaidGo:false};
 const manifestSha=sha(Buffer.from(json(manifest)));
 need(config.sourceRightsApproved===false&&manifest.sourceRightsApproved===false&&config.sourceUseDeferredToPhase6Activation===true&&manifest.sourceUseDeferredToPhase6Activation===true&&manifest.scientificFreezeApproved===true&&manifest.phase6PaidGo===false,"DEFERRED_MANIFEST_SCOPE");
 return {config,configSha,manifest,manifestSha,predecessors:[...evidenceIds,RESERVED_RIGHTS_ID],head};
}
async function prepare(){
 need(process.argv.length===3&&process.argv[2]==="PREPARE_PHASE5_RIGHTS_DEFERRED_NO_GO"&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&!["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL","V39_DATABASE_RUNTIME_URL","NODE_OPTIONS"].some(k=>process.env[k]),"OFFLINE_PREPARE_SCOPE");
 const {root,head}=currentIdentity(),dir=candidateDir();
 const c=readJ(path.join(dir,"config-candidate.json")).x,m=readJ(path.join(dir,"manifest-candidate.json")).x,inv=readJ(path.join(dir,"source-inventory.json")).x,e=readJ(path.join(dir,"external-input-offline-review-NOT-STAGE.json"),100000).x,t=readJ(path.join(dir,"timing-input-offline-review.json"),10000).x;
 need(readJ(path.join(dir,"config-candidate.json")).sha256===PINS["config-candidate.json"]&&readJ(path.join(dir,"manifest-candidate.json")).sha256===PINS["manifest-candidate.json"]&&readJ(path.join(dir,"external-input-offline-review-NOT-STAGE.json"),100000).sha256===PINS["external-input-offline-review-NOT-STAGE.json"]&&t.timingEvidenceSha256===TIMING,"RESTORED_CANDIDATE_PINS");
 need(c.reviewApproved===false&&c.sourceRightsApproved===false&&m.scientificFreezeApproved===false&&m.finalPredecessorsApproved===false&&m.phase6PaidGo===false&&e.codeSha40===BASE&&e.phase6AuthorizationId===null&&e.predecessorEvidenceIds===null,"UNSIGNED_BASE_SCOPE");
 const ledgerFile=api("repos/"+REPO+"/contents/data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json?ref="+EVIDENCE_HEAD);
 need(ledgerFile.sha===LEDGER_BLOB,"EVIDENCE_LEDGER_BLOB");const ledgerRaw=Buffer.from(ledgerFile.content.replace(/\s+/g,""),"base64"),ledger=JSON.parse(ledgerRaw);
 need(Array.isArray(ledger.evidence)&&ledger.evidence.length===28&&Array.isArray(ledger.approvals)&&ledger.approvals.length===0,"EVIDENCE_LEDGER_SCOPE");
 for(const [field,h] of Object.entries(EVIDENCE))need(ledger.evidence.some(x=>x.sha256===h),("EVIDENCE_"+field).toUpperCase());
 const accountRow=ledger.evidence.find(x=>x.evidenceId==="RUN-20261119-FRESHBUDGETRECONCILED"),accountRaw=Buffer.from(api("repos/"+REPO+"/contents/"+accountRow.path+"?ref="+EVIDENCE_HEAD).content.replace(/\s+/g,""),"base64");
 need(sha(accountRaw)===EVIDENCE.providerAccountAndBudgetEvidenceSha256,"ACCOUNT_EVIDENCE");const account=JSON.parse(accountRaw);
 need(account.jointBudgetReview?.apiUnitsRemaining===59968&&account.jointBudgetReview.alertCreditsRemaining===1830&&account.arithmetic?.restReserved===37388&&account.arithmetic.netRestCeiling===49468&&account.arithmetic.unallocatedAfterFloor===11080,"ACCOUNT_BUDGET");
 const inventory=rebindInventory(inv,m,head),frozen=freezeArtifacts(c,m,inventory,head,ledger.evidence.map(x=>x.evidenceId),account);
 const external={...e,codeSha40:head,manifestSha256:frozen.manifestSha,configSha256:frozen.configSha,phase6AuthorizationId:AUTH_ID,predecessorEvidenceIds:frozen.predecessors,asOfUtc:account.jointBudgetReview.observedAtUtc,jointBudgetReview:account.jointBudgetReview};
 const eb=Buffer.from(json(external)),tb=Buffer.from(json(t)),exporter=await import(pathToFileURL(path.join(root,"scripts/v39_phase6_actual_release_candidate_export_v39.ts")).href);
 const result=exporter.compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:sha(eb),timingBytes:tb,expectedTimingFileSha256:sha(tb),calendarVariant:"COMPACT_NOV21"}),parity=exporter.verifyP6ActualCommittedCheckout(result),sf=result.files.find(f=>f.path==="unsigned-stage-input.json");
 need(parity.verifiedPlanCount===31&&result.summary.sourceQueries===6144&&result.summary.totalReservedUnits===37388&&result.summary.peakDailyUnits===1280&&sf&&sha(sf.bytes)===sf.sha256,"STAGE_EXPORT_PARITY");
 const stage=JSON.parse(sf.bytes),b0062=await import(pathToFileURL(path.join(root,"server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs")).href),v0093=await import(pathToFileURL(path.join(root,"server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs")).href);
 const calendarReview={expectedSignedStagePacketSha256:sf.sha256,expectedExactWriterRole:"phase5_b0062_prelaunch_stage_prod20261113",independentCalendarTreatmentReviewApproved:true,independentProviderAccountAndRestBudgetReviewApproved:true,narrowPrelaunchOwnerApproved:true};
 const cp=b0062.compileP5InertB0062UtcStagePacket(stage,calendarReview);
 const costDraft=(await import(pathToFileURL(path.join(root,"server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs")).href)).buildP5V0082UnknownAirportSevenCostOnlyDraft({schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",slotBudgetInput:stage.slotBudgetInput,expectedReviewerSlotEnvelopeSha256:stage.expectedSignedSlotEnvelopeSha256});
 const costReview={expectedStagedB0062PacketSha256:cp.stagePacketSha256,expectedSignedSevenCategoryCostSha256:costDraft.costOnlyCategoryDraftSha256,expectedExactBudgetWriterRole:"phase5_fids_budget_freeze_prod20261113",independentProspectiveCalendarAndTreatmentApproved:true,independentRealProviderRangeAndRestBudgetApproved:true,independentSourceContentsRightsForIntendedUseApproved:false,sourceUseDeferredToPhase6Activation:true,exactRestrictedNoProviderBudgetFreezeApproved:true};
 const vp=v0093.compileP5V0093CostOnlySevenRestReview(stage,calendarReview,costReview);
 need(cp.phase6PaidGo===false&&vp.phase6PaidGo===false&&vp.sourceUseDeferredToPhase6Activation===true&&vp.independentSourceContentsRightsForIntendedUseApproved===false,"INERT_COMPILER_SCOPE");
 const review={schema:"v39.phase5.rights-deferred-commissioning-review.v1",status:"PHASE5_COMMISSIONING_TECHNICAL_REVIEW_AND_OWNER_DIRECTIVE_APPROVED_NO_SOURCE_GO",reviewKind:"technical-evidence-review-plus-owner-directive",ownerDecisionIssueCommentId:7002623385,reviewedMainSha:head,authorizationId:AUTH_ID,manifestSha256:frozen.manifestSha,configSha256:frozen.configSha,stageSha256:sf.sha256,costEnvelopeSha256:costDraft.costOnlyCategoryDraftSha256,evidence:EVIDENCE,predecessorEvidenceIds:frozen.predecessors,phase5ScientificFreezeApproved:true,calendarTreatmentReviewApproved:true,providerAccountAndRestBudgetReviewApproved:true,costOnlyFreezeReviewApproved:true,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,authorizationEnabled:false,phase6PaidGo:false};
 const out=path.join(dir,"phase5-rights-deferred-"+head.slice(0,12));if(!fs.existsSync(out))fs.mkdirSync(out,{mode:0o700});secureDir(out);
 for(const [n,b] of [["approved-manifest.json",Buffer.from(json(frozen.manifest))],["approved-config.json",Buffer.from(json(frozen.config))],["source-inventory.json",Buffer.from(json(inventory.rows))],["approved-external-input.json",eb],["approved-timing-input.json",tb],["exact-stage-input.json",Buffer.from(sf.bytes)],["phase5-commissioning-review.json",Buffer.from(json(review))]])writeOnce(out,n,b);
 const receipt={status:"PHASE5_RIGHTS_DEFERRED_FINAL_INPUTS_PREPARED_NO_GO",main:head,authorizationId:AUTH_ID,manifestSha256:frozen.manifestSha,configSha256:frozen.configSha,sourceInventorySha256:inventory.sha256,executableFiles:inventory.rows.length,stageSha256:sf.sha256,costEnvelopeSha256:costDraft.costOnlyCategoryDraftSha256,predecessorCount:frozen.predecessors.length,reservedSourceRightsEvidenceId:RESERVED_RIGHTS_ID,verifiedPlanCount:31,plannedQueries:6144,reservedRestUnits:37388,peakDailyUnits:1280,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false,directory:out};
 writeOnce(out,"preparation-receipt.json",Buffer.from(json(receipt)));console.log(json(receipt));
}
module.exports={ALLOWED,EVIDENCE,AUTH_ID,RESERVED_RIGHTS_ID,freezeArtifacts};
if(require.main===module)prepare().catch(e=>{const s=String(e?.message??"");console.error(/^HOLD_P5_DEFERRED_PREP_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_DEFERRED_PREP_UNKNOWN");process.exitCode=2});
