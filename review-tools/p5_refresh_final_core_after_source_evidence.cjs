#!/usr/bin/env node
"use strict";
/**
 * Refresh final-core mechanical/closure review aids after a genuine source-use
 * evidence row has been committed to the scoped evidence ledger.
 *
 * No review boolean is changed. sourceRightsEvidenceSha256 remains evidence
 * binding only; independentSourceUseApproved stays false until reviewer input.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const C=/^[a-f0-9]{40}$/,H=/^[a-f0-9]{64}$/,ID=/^(?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+$/;
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_SOURCE_REFRESH_"+k)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
const pretty=x=>Buffer.from(JSON.stringify(x,null,2)+"\n");
function refresh(mechanical,closure,oldLedger,newLedger,evidenceCommit,sourceId){
 need(mechanical?.schema==="v39.phase5.final-core-mechanical-bindings-ready.v1"&&mechanical.phase6PaidGo===false,"MECHANICAL_SCOPE");
 need(closure?.schema==="v39.phase5.final-core-reviewer-closure-matrix.v1"&&closure.phase6PaidGo===false,"CLOSURE_SCOPE");
 need(mechanical.evidenceCommit===closure.evidenceCommit&&C.test(mechanical.evidenceCommit??"")&&C.test(evidenceCommit??"")&&evidenceCommit!==mechanical.evidenceCommit,"EVIDENCE_COMMIT");
 need(oldLedger?.schema==="v39.phase6.source-enable-approval-ledger.v1"&&newLedger?.schema===oldLedger.schema&&oldLedger.phaseGate===newLedger.phaseGate&&oldLedger.scope===newLedger.scope&&Array.isArray(oldLedger.evidence)&&Array.isArray(newLedger.evidence)&&Array.isArray(oldLedger.approvals)&&Array.isArray(newLedger.approvals),"LEDGER_SCOPE");
 need(JSON.stringify(oldLedger.approvals)===JSON.stringify(newLedger.approvals),"APPROVALS_CHANGED");
 need(newLedger.evidence.length===oldLedger.evidence.length+1&&oldLedger.evidence.every((x,i)=>JSON.stringify(x)===JSON.stringify(newLedger.evidence[i])),"LEDGER_NOT_SINGLE_APPEND");
 need(ID.test(sourceId??""),"SOURCE_ID");
 const source=newLedger.evidence.at(-1);
 need(source.evidenceId===sourceId&&H.test(source.sha256??"")&&typeof source.path==="string"&&/(?:source.*use|source.*rights|provider.*permission|permission.*provider)/i.test(source.path)&&!/(?:NO_GO|NOT_APPROVAL|NOT_RELEASE|NOT_FREEZE)/i.test(source.path),"SOURCE_ROW");
 const d=mechanical.draftReview;
 need(d?.schema==="v39.phase5.exact-final-core-scope-review.v1"&&d.evidenceCommit===mechanical.evidenceCommit&&Array.isArray(d.predecessorEvidenceIds)&&d.predecessorEvidenceIds.length===oldLedger.evidence.length&&d.predecessorEvidenceIds.every((id,i)=>id===oldLedger.evidence[i].evidenceId)&&d.sourceRightsEvidenceSha256===null&&d.independentSourceUseApproved===false&&d.finalPredecessorsApproved===false&&d.phase6PaidGo===false,"PRISTINE_DRAFT");
 const m=JSON.parse(JSON.stringify(mechanical)),c=JSON.parse(JSON.stringify(closure));
 m.evidenceCommit=evidenceCommit;m.ledgerBlob=gitBlob(pretty(newLedger));
 m.draftReview.evidenceCommit=evidenceCommit;
 m.draftReview.predecessorEvidenceIds=[...d.predecessorEvidenceIds,sourceId];
 m.deliberatelyUnbound={
  sourceRightsEvidenceSha256:source.sha256,
  evidenceId:sourceId,
  path:source.path,
  reason:"Genuine source-use evidence is now hash-bound and in the predecessor set, but independentSourceUseApproved remains a reviewer decision."
 };
 m.mechanicallyBoundEvidence.sourceRightsEvidenceSha256={evidenceId:sourceId,path:source.path,sha256:source.sha256};
 c.evidenceCommit=evidenceCommit;
 c.mechanicallyReady.finalPredecessorCount=m.draftReview.predecessorEvidenceIds.length;
 c.mechanicallyReady.sourceRightsEvidenceSha256=source.sha256;
 c.mechanicallyReady.sourceRightsEvidenceId=sourceId;
 c.mechanicallyReady.sourceRightsEvidencePath=source.path;
 c.explicitReviewerJudgments.independentSourceUseApproved.sourceRightsEvidenceSha256=source.sha256;
 c.explicitReviewerJudgments.independentSourceUseApproved.sourceRightsEvidenceId=sourceId;
 c.explicitReviewerJudgments.independentSourceUseApproved.value=null;
 return {mechanical:m,closure:c,ledger:newLedger,source};
}
function run(){
 need(process.argv.length===9,"ARGS");
 const [mechanicalPath,closurePath,oldLedgerPath,newLedgerPath,evidenceCommit,sourceId,outDir]=process.argv.slice(2);
 const read=p=>JSON.parse(fs.readFileSync(p));
 const result=refresh(read(mechanicalPath),read(closurePath),read(oldLedgerPath),read(newLedgerPath),evidenceCommit,sourceId);
 fs.mkdirSync(outDir,{recursive:false,mode:0o700});
 const mb=pretty(result.mechanical),cb=pretty(result.closure),lb=pretty(result.ledger);
 fs.writeFileSync(path.join(outDir,"final-core-mechanical.json"),mb,{flag:"wx",mode:0o600});
 fs.writeFileSync(path.join(outDir,"final-core-closure.json"),cb,{flag:"wx",mode:0o600});
 fs.writeFileSync(path.join(outDir,"source-enable-ledger.json"),lb,{flag:"wx",mode:0o600});
 fs.writeFileSync(path.join(outDir,"refresh-receipt.json"),Buffer.from(JSON.stringify({schema:"v39.phase5.final-core-source-evidence-refresh-receipt.v1",evidenceCommit,sourceEvidenceId:sourceId,sourceRightsEvidenceSha256:result.source.sha256,mechanicalSha256:sha(mb),closureSha256:sha(cb),ledgerSha256:sha(lb),predecessorCount:result.mechanical.draftReview.predecessorEvidenceIds.length,reviewApproved:false,phase6PaidGo:false})),{flag:"wx",mode:0o600});
 process.stdout.write(Buffer.from(JSON.stringify({status:"FINAL_CORE_SOURCE_EVIDENCE_REFRESHED_NOT_APPROVED_NO_GO",evidenceCommit,sourceEvidenceId:sourceId,sourceRightsEvidenceSha256:result.source.sha256,predecessorCount:result.mechanical.draftReview.predecessorEvidenceIds.length,outputDirectory:path.resolve(outDir),phase6PaidGo:false})));
}
module.exports={refresh,pretty,gitBlob};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_SOURCE_REFRESH_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_SOURCE_REFRESH_REDACTED");process.exitCode=2}
