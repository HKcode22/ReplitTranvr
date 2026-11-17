'use strict';
// Recover the already-produced exact V0105 main review JSON. No new checkout,
// exporter run, DB access, provider request, approval or staging action.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const PIN='6f518add10d00567a95fbcaf3650ebf608da8a60',TREE='ccf9f6665e3a8547476651a17efcf2261d32c53c';
const CAL='7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c',CFG='4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb';
const RANGE='cde412a012e912f9fbe42cd29375ddbaf674054d11af45fe6d2a8eab36c81bb3',TIME='88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5',GRID='371ce938669dc4c0ec8723d89f58c44507900c3eb18306f5ed7de56f6a95539b';
const INDEX='6b626c5f34a0891d1322eb150d97456a7ed95d02';
const h=b=>crypto.createHash('sha256').update(b).digest('hex'),jbytes=x=>Buffer.from(JSON.stringify(x)),H=/^[a-f0-9]{64}$/;
const check=(ok,k)=>{if(!ok)throw Error('HOLD_P5_RECOVERED_REVIEW_'+k)};
function recover(raw,indexRaw){
 check(Buffer.isBuffer(raw)&&raw.length>100&&raw.length<2*1024*1024,'REVIEW_SIZE');
 check(Buffer.isBuffer(indexRaw)&&crypto.createHash('sha1').update(Buffer.from('blob '+indexRaw.length+'\0')).update(indexRaw).digest('hex')===INDEX,'INDEX_BLOB');
 const j=JSON.parse(raw),r=j.releaseIdentityReview,idx=JSON.parse(indexRaw),g=r?.geometry,rec=j.concreteReviewRecommendation,rev=j.calendarRevisionReview;
 check(j.reviewedCodeCandidate===PIN&&r?.checkout?.codeSha===PIN&&r.checkout.treeSha===TREE,'CHECKOUT');
 check(j.status==='REAL_METADATA_PARTIAL_REVIEW_NOT_STAGE_INPUT_NO_GO'&&j.phase6PaidGo===false&&j.sourceRightsApproved===false&&j.actualBudgetReviewApproved===false&&j.providerCalls===0&&j.databaseWrites===0&&j.githubMutations===0,'OUTER_REVIEW_FLAGS');
 check(r.status==='EXACT_CONTENT_DIGESTS_AND_GEOMETRY_REVIEW_ONLY_NOT_RELEASE'&&r.actualAuthorizationId===null&&r.finalPredecessorEvidenceIds===null&&r.candidateDigestsApproved===false&&r.stagePacketExported===false&&r.sourceRightsApproved===false&&r.scientificFreezeApproved===false&&r.phase6PaidGo===false,'INNER_REVIEW_FLAGS');
 check(Array.isArray(r.sourceInventory)&&r.sourceInventory.length===2180&&new Set(r.sourceInventory.map(x=>x.path)).size===2180&&r.sourceInventory.every(x=>typeof x.path==='string'&&['100644','100755'].includes(x.mode)&&H.test(x.sha256)),'INVENTORY');
 const inv=h(jbytes(r.sourceInventory));
 check(inv===r.manifestCandidate.content.sourceInventorySha256&&r.manifestCandidate.content.executableFileCount===2180,'INVENTORY_DIGEST');
 for(const k of ['manifestCandidate','configCandidate','timingEvidenceCandidate','rangeEvidenceCandidate'])check(H.test(r[k]?.sha256)&&h(jbytes(r[k].content))===r[k].sha256,'HASH_'+k);
 check(r.configCandidate.sha256===CFG&&r.timingEvidenceCandidate.sha256===TIME&&r.rangeEvidenceCandidate.sha256===RANGE,'UNCHANGED_CONFIG_TIMING_RANGE');
 check(r.manifestCandidate.sha256!==idx.candidateManifestSha256&&r.manifestCandidate.content.configCandidateSha256===CFG&&r.manifestCandidate.content.calendarRowsSha256===CAL&&r.manifestCandidate.content.finalPredecessorsApproved===false&&r.manifestCandidate.content.scientificFreezeApproved===false,'MANIFEST_REBIND');
 check(idx.calendarSha256===CAL&&j.calendarDraft.calendarDays.length===31&&h(jbytes(j.calendarDraft.calendarDays))===CAL&&r.calendarRowsDigestCandidate===CAL,'CALENDAR');
 // Actual exporter returns geometry.totalQueries, not totalPlannedQueries.
 check(g?.dayPlanCount===31&&g.totalQueries===6144&&j.proposedSourceQueries===6144&&g.totalReservedUnits===37388&&j.proposedTotalReservedUnits===37388&&g.coverageGridSha256===GRID,'GEOMETRY');
 check(Array.isArray(g.dayPlanSha256s)&&g.dayPlanSha256s.length===31&&idx.dayPlanSha256s.length===31&&g.dayPlanSha256s.every((x,i)=>x.runDayIndex===i+1&&idx.dayPlanSha256s[i].runDayIndex===i+1&&x.sha256===idx.dayPlanSha256s[i].sha256),'PLAN_PARITY');
 check(rev?.independentDateRevisionApproved===false&&rev.phase6PaidGo===false&&rev.firstServiceUtc==='2026-11-21T00:00:00.000Z'&&rev.firstSourceUtc==='2026-11-19T23:45:00.000Z'&&rev.lastServiceEndUtc==='2026-12-24T04:00:00.000Z'&&rev.allocatedOutcomeTailUtc==='2026-12-26T04:00:00.000Z','DATES');
 check(rec.independentReviewerApproved===false&&rec.stageAuthorizationGranted===false&&rec.futureRefillConfirmed===false&&rec.netRestCeilingUnits===49468&&rec.proposedAlertSafety.alertRunSpendCeilingCredits===680&&rec.jointBudgetReview.authorizedFutureRefillApiUnits===0&&rec.jointBudgetReview.authorizedFutureRefillAlertCredits===0&&j.proposedProtectedFloorUnits===1000&&j.proposedPeakDailyUnits===1280,'BUDGET');
 const ext=j.externalCandidate;
 check(ext.codeSha40===PIN&&ext.phase6AuthorizationId===null&&ext.predecessorEvidenceIds===null&&ext.manifestSha256===null&&ext.configSha256===null,'EXT_DRAFT');
 const draft={...ext,manifestSha256:r.manifestCandidate.sha256,calendarSha256:CAL,configSha256:CFG,alertSafety:rec.proposedAlertSafety,providerRangeEvidenceSha256:RANGE,timingEvidenceSha256:TIME,cycleRestCeilingUnits:rec.netRestCeilingUnits,jointBudgetReview:rec.jointBudgetReview};
 const missing=Object.entries(draft).filter(([,v])=>v===null).map(([k])=>k);
 check(JSON.stringify(missing)===JSON.stringify(['phase6AuthorizationId','predecessorEvidenceIds']),'UNEXPECTED_NULL_FIELDS');
 const timing={...j.timingCandidate,timingEvidenceSha256:TIME};
 const files={'manifest-candidate.json':r.manifestCandidate.content,'config-candidate.json':r.configCandidate.content,'timing-evidence-candidate.json':r.timingEvidenceCandidate.content,'range-evidence-candidate.json':r.rangeEvidenceCandidate.content,'external-input-offline-review-NOT-STAGE.json':draft,'timing-input-offline-review.json':timing};
 const receipt={status:'P5_FINAL_V0105_MAIN_MANIFEST_REBOUND_REVIEW_ONLY',main:PIN,tree:TREE,reviewSha256:h(raw),sourceInventorySha256:inv,executableFiles:2180,manifestCandidateSha256:r.manifestCandidate.sha256,configCandidateSha256:CFG,timingEvidenceSha256:TIME,rangeEvidenceSha256:RANGE,calendarRowsSha256:CAL,verifiedDayPlans:31,dayPlanVerification:'EXACT_EXPORTED_SHA256_MATCH_PREVIOUS_INDEPENDENT_COMMITTED_BLOB_INDEX',plannedQueries:g.totalQueries,reservedRestUnits:g.totalReservedUnits,externalReviewDraftSha256:h(jbytes(draft)),timingInputDraftSha256:h(jbytes(timing)),unfilledFields:missing,actualAuthorizationId:null,stagePacketExported:false,sourceRightsApproved:false,scientificFreezeApproved:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return {receipt,files};
}
module.exports={recover};
if(require.main===module){
 try{
  check(process.argv.length===3&&process.env.GITHUB_ACTIONS!=='true','OWNER_LOCAL_ARGS');
  const indexRaw=fs.readFileSync(process.argv[2]),home=fs.realpathSync(os.homedir());
  const matches=[];
  for(const e of fs.readdirSync(home,{withFileTypes:true})){
   if(!e.isDirectory()||!/^\.phase5-final-review-[A-Za-z0-9]+$/.test(e.name))continue;
   const dir=path.join(home,e.name),p=path.join(dir,'review-only.json');
   if(!fs.existsSync(p)||!fs.lstatSync(p).isFile()||fs.statSync(p).size>=2*1024*1024)continue;
   try{const raw=fs.readFileSync(p),j=JSON.parse(raw);if(j.reviewedCodeCandidate===PIN&&j.releaseIdentityReview?.checkout?.treeSha===TREE)matches.push({raw,dir});}catch{}
  }
  check(matches.length>0,'NO_EXISTING_EXACT_OUTPUT');
  check(new Set(matches.map(x=>h(x.raw))).size===1,'MULTIPLE_DIFFERENT_EXACT_OUTPUTS');
  const {raw,dir}=matches[0],{receipt,files}=recover(raw,indexRaw);
  // Only new local private review files. Exact existing content is harmless;
  // conflicting bytes are never overwritten. Receipt written last.
  const result={...receipt,reviewDirectory:dir};
  const entries=[...Object.entries(files).map(([n,x])=>[n,jbytes(x)]),['final-review-receipt.json',Buffer.from(JSON.stringify(result,null,2))]];
  for(const [n,b] of entries){const p=path.join(dir,n);if(fs.existsSync(p))check(fs.lstatSync(p).isFile()&&fs.readFileSync(p).equals(b),'LOCAL_FILE_CONFLICT');}
  for(const [n,b] of entries){const p=path.join(dir,n);if(!fs.existsSync(p))fs.writeFileSync(p,b,{mode:0o600,flag:'wx'});}
  console.log(JSON.stringify(result));
 }catch(e){const m=String(e?.message??'');console.error(/^HOLD_P5_RECOVERED_REVIEW_[A-Za-z_]+$/.test(m)?m:'HOLD_P5_RECOVERED_REVIEW_REDACTED');process.exitCode=2;}
}
