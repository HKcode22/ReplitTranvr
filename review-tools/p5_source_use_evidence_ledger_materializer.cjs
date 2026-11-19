#!/usr/bin/env node
"use strict";
/**
 * Materialize a reviewer-authored source-use decision as public evidence and
 * append its exact hash to the scoped evidence ledger. This tool does not make
 * the source-use decision and does not create an AUTH approval.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ID=/^(?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+$/,SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const EVIDENCE_PATH=/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.json$/;
const SCOPE="C_D_GITHUB_SOURCE_PRE_POST_EXISTING_CALENDAR_NO_LEGACY_ALERT_START";
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_SOURCE_USE_EVIDENCE_"+k)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const canonical=x=>Buffer.from(JSON.stringify(x));
const pretty=x=>Buffer.from(JSON.stringify(x,null,2)+"\n");
const utc=x=>typeof x==="string"&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
function materializeEvidence(input,nowMs=Date.now()){
 need(input?.schema==="v39.phase5.source-use-reviewer-decision-input.v1"&&input.phase6PaidGo===false,"INPUT_SCHEMA");
 need(input.independentSourceUseApproved===true&&input.intendedProspectiveUseReviewed===true&&input.intendedRetentionAndResearchUseReviewed===true&&input.reviewerIndependenceAttested===true,"EXPLICIT_SOURCE_USE_DECISION");
 need(["WRITTEN_PROVIDER_PERMISSION","INDEPENDENT_APPLICABLE_TERMS_REVIEW"].includes(input.reviewBasis),"REVIEW_BASIS");
 need(typeof input.reviewedBy==="string"&&input.reviewedBy.trim().length>=3&&utc(input.reviewedAtUtc)&&Date.parse(input.reviewedAtUtc)<=nowMs,"REVIEWER_CLOCK");
 need(typeof input.rationale==="string"&&input.rationale.trim().length>=20&&input.rationale.length<=12000,"RATIONALE");
 need(Array.isArray(input.basisReferences)&&input.basisReferences.length>=1&&input.basisReferences.length<=32&&input.basisReferences.every(x=>x&&typeof x==="object"&&!Array.isArray(x)&&typeof x.label==="string"&&x.label.trim().length>=2&&x.label.length<=200&&((typeof x.sha256==="string"&&SHA.test(x.sha256))||(typeof x.reference==="string"&&x.reference.trim().length>=3&&x.reference.length<=1000))),"BASIS_REFERENCES");
 if(input.reviewBasis==="WRITTEN_PROVIDER_PERMISSION")need(input.providerGrantClaimed===true&&typeof input.providerPermissionReference==="string"&&input.providerPermissionReference.trim().length>=3,"PROVIDER_PERMISSION_REFERENCE");
 else need(input.providerGrantClaimed===false&&input.providerPermissionReference===null,"NO_FALSE_PROVIDER_GRANT");
 return {
  schema:"v39.phase5.genuine-source-use-review-evidence.v1",
  status:"INDEPENDENT_SOURCE_USE_REVIEW_APPROVED_FOR_INTENDED_PROSPECTIVE_RESEARCH",
  projectScope:SCOPE,
  provider:"AeroDataBox",
  channel:"RapidAPI",
  independentSourceUseApproved:true,
  intendedProspectiveUseReviewed:true,
  intendedRetentionAndResearchUseReviewed:true,
  reviewerIndependenceAttested:true,
  reviewBasis:input.reviewBasis,
  providerGrantClaimed:input.providerGrantClaimed,
  providerPermissionReference:input.providerPermissionReference,
  basisReferences:input.basisReferences,
  rationale:input.rationale.trim(),
  reviewedBy:input.reviewedBy.trim(),
  reviewedAtUtc:input.reviewedAtUtc,
  phase6PaidGo:false
 };
}
function appendLedger(ledger,evidenceId,evidencePath,evidenceRaw){
 need(ledger?.schema==="v39.phase6.source-enable-approval-ledger.v1"&&ledger.phaseGate==="Phase 6 (separate authorization)"&&ledger.scope===SCOPE&&Array.isArray(ledger.evidence)&&Array.isArray(ledger.approvals),"LEDGER_SCOPE");
 need(ID.test(evidenceId??"")&&EVIDENCE_PATH.test(evidencePath??"")&&/(?:source.*use|source.*rights|provider.*permission|permission.*provider)/i.test(evidencePath)&&!/(?:NO_GO|NOT_APPROVAL|NOT_RELEASE|NOT_FREEZE)/i.test(evidencePath),"EVIDENCE_IDENTITY");
 need(!ledger.evidence.some(x=>x.evidenceId===evidenceId||x.path===evidencePath||x.sha256===sha(evidenceRaw)),"DUPLICATE_EVIDENCE");
 const evidence=JSON.parse(evidenceRaw);
 need(evidence?.schema==="v39.phase5.genuine-source-use-review-evidence.v1"&&evidence.independentSourceUseApproved===true&&evidence.phase6PaidGo===false,"EVIDENCE_BYTES");
 const out=JSON.parse(JSON.stringify(ledger));
 out.evidence.push({evidenceId,path:evidencePath,sha256:sha(evidenceRaw)});
 return out;
}
function run(){
 need(process.argv.length===7,"ARGS");
 const [ledgerPath,inputPath,evidenceId,evidencePath,outDir]=process.argv.slice(2);
 const lr=fs.readFileSync(ledgerPath),ledger=JSON.parse(lr),ir=fs.readFileSync(inputPath),input=JSON.parse(ir);
 need(pretty(ledger).equals(lr),"LEDGER_NOT_CANONICAL_PRETTY");
 need(canonical(input).equals(ir),"REVIEWER_INPUT_NOT_CANONICAL");
 const ev=materializeEvidence(input),evRaw=pretty(ev),next=appendLedger(ledger,evidenceId,evidencePath,evRaw),nextRaw=pretty(next);
 fs.mkdirSync(outDir,{recursive:false,mode:0o700});
 const write=(n,b)=>fs.writeFileSync(path.join(outDir,n),b,{flag:"wx",mode:0o600});
 write("source-use-evidence.json",evRaw);write("source-enable-ledger.json",nextRaw);
 write("registration-receipt.json",canonical({schema:"v39.phase5.source-use-evidence-registration-receipt.v1",evidenceId,evidencePath,evidenceSha256:sha(evRaw),priorLedgerSha256:sha(lr),updatedLedgerSha256:sha(nextRaw),approvalCountBefore:ledger.approvals.length,approvalCountAfter:next.approvals.length,phase6PaidGo:false}));
 process.stdout.write(canonical({status:"SOURCE_USE_EVIDENCE_AND_LEDGER_MATERIALIZED_NOT_COMMITTED_NO_GO",evidenceId,evidencePath,evidenceSha256:sha(evRaw),updatedLedgerSha256:sha(nextRaw),outputDirectory:path.resolve(outDir),phase6PaidGo:false}));
}
module.exports={SCOPE,materializeEvidence,appendLedger,canonical,pretty};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_SOURCE_USE_EVIDENCE_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_SOURCE_USE_EVIDENCE_REDACTED");process.exitCode=2}
