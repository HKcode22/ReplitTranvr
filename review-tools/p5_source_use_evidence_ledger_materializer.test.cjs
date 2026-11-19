"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const {materializeEvidence,appendLedger,pretty}=require("./p5_source_use_evidence_ledger_materializer.cjs");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
function input(basis="INDEPENDENT_APPLICABLE_TERMS_REVIEW"){return {
 schema:"v39.phase5.source-use-reviewer-decision-input.v1",phase6PaidGo:false,
 independentSourceUseApproved:true,intendedProspectiveUseReviewed:true,intendedRetentionAndResearchUseReviewed:true,reviewerIndependenceAttested:true,
 reviewBasis:basis,providerGrantClaimed:basis==="WRITTEN_PROVIDER_PERMISSION",providerPermissionReference:basis==="WRITTEN_PROVIDER_PERMISSION"?"provider-ticket-123":null,
 basisReferences:[{label:"Applicable terms review",sha256:"a".repeat(64)}],
 rationale:"Independent reviewer assessed the applicable source-use evidence for the exact intended prospective research scope.",
 reviewedBy:"Independent Source Reviewer",reviewedAtUtc:"2026-11-19T07:00:00.000Z"
}}
function ledger(){return {schema:"v39.phase6.source-enable-approval-ledger.v1",phaseGate:"Phase 6 (separate authorization)",scope:"C_D_GITHUB_SOURCE_PRE_POST_EXISTING_CALENDAR_NO_LEGACY_ALERT_START",evidence:[{evidenceId:"RUN-20261119-OLD",path:"data-collection/phase5/evidence/old.json",sha256:"b".repeat(64)}],approvals:[]}}
const NOW=Date.parse("2026-11-19T07:05:00.000Z");
test("independent applicable-terms review materializes without claiming provider grant",()=>{
 const e=materializeEvidence(input(),NOW);assert.equal(e.independentSourceUseApproved,true);assert.equal(e.providerGrantClaimed,false);assert.equal(e.reviewBasis,"INDEPENDENT_APPLICABLE_TERMS_REVIEW");assert.equal(e.phase6PaidGo,false);
});
test("written provider permission requires an explicit reference",()=>{
 const x=input("WRITTEN_PROVIDER_PERMISSION");x.providerPermissionReference=null;assert.throws(()=>materializeEvidence(x,NOW),/PROVIDER_PERMISSION_REFERENCE/);
});
test("terms review cannot falsely claim provider grant",()=>{
 const x=input();x.providerGrantClaimed=true;assert.throws(()=>materializeEvidence(x,NOW),/NO_FALSE_PROVIDER_GRANT/);
});
test("all source-use decisions and reviewer independence are explicit",()=>{
 for(const k of ["independentSourceUseApproved","intendedProspectiveUseReviewed","intendedRetentionAndResearchUseReviewed","reviewerIndependenceAttested"]){const x=input();x[k]=false;assert.throws(()=>materializeEvidence(x,NOW),/EXPLICIT_SOURCE_USE_DECISION/)}
});
test("ledger append preserves approvals and hash-binds exact evidence bytes",()=>{
 const l=ledger(),raw=pretty(materializeEvidence(input(),NOW));
 const out=appendLedger(l,"RUN-20261119-SOURCEUSE","data-collection/phase5/evidence/2026-11-19_independent_source_use_review.json",raw);
 assert.equal(out.approvals.length,0);assert.equal(out.evidence.length,2);assert.equal(out.evidence.at(-1).sha256,sha(raw));assert.deepEqual(out.approvals,l.approvals);
});
test("NO_GO/NOT_APPROVAL paths and duplicate evidence are refused",()=>{
 const l=ledger(),raw=pretty(materializeEvidence(input(),NOW));
 assert.throws(()=>appendLedger(l,"RUN-20261119-SOURCEUSE","data-collection/phase5/evidence/2026-11-19_source_use_NO_GO.json",raw),/EVIDENCE_IDENTITY/);
 const once=appendLedger(l,"RUN-20261119-SOURCEUSE","data-collection/phase5/evidence/2026-11-19_independent_source_use_review.json",raw);
 assert.throws(()=>appendLedger(once,"RUN-20261119-SOURCEUSE2","data-collection/phase5/evidence/2026-11-19_independent_source_use_review_2.json",raw),/DUPLICATE_EVIDENCE/);
});
test("future reviewer time and weak rationale are refused",()=>{
 let x=input();x.reviewedAtUtc="2026-11-19T07:06:00.000Z";assert.throws(()=>materializeEvidence(x,NOW),/REVIEWER_CLOCK/);
 x=input();x.rationale="short";assert.throws(()=>materializeEvidence(x,NOW),/RATIONALE/);
});
