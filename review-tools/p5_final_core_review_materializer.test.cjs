"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const {materialize}=require("./p5_final_core_review_materializer.cjs");
const mechanical=JSON.parse(fs.readFileSync("review-tools/2026-11-18_FINAL_CORE_MECHANICAL_BINDINGS_READY_NO_GO.json","utf8"));
const closure=JSON.parse(fs.readFileSync("review-tools/2026-11-19_FINAL_CORE_REVIEWER_CLOSURE_MATRIX_NO_GO.json","utf8"));
const ledger=JSON.parse(fs.readFileSync("review-tools/fixtures/p5_877_evidence_ledger.json","utf8"));
const NOW=Date.parse("2026-11-19T06:55:00.000Z");
function synthetic(){
 const m=structuredClone(mechanical),l=structuredClone(ledger);
 const id="RUN-20261119-SYNTHRIGHTS",hash="f".repeat(64);
 l.evidence.push({evidenceId:id,path:"data-collection/phase5/evidence/2026-11-19_provider_source_rights_permission.json",sha256:hash});
 m.draftReview.predecessorEvidenceIds.push(id);
 const input={
  schema:"v39.phase5.final-core-reviewer-decision-input.v1",
  phase6PaidGo:false,legacyAlertStartApproved:false,
  adoptEvidenceBackedRecommendations:true,
  finalPredecessorsApproved:true,
  independentScientificFreezeApproved:true,
  independentSourceUseApproved:true,
  independentOperationalReleaseApproved:true,
  sourceRightsEvidenceId:id,sourceRightsEvidenceSha256:hash,
  reviewedBy:"Independent Reviewer",
  reviewedAtUtc:"2026-11-19T06:50:00.000Z",
  cleanupOwner:"scripts/v39_phase6_enable_source_owner_v39.ts",
  authorizationId:"AUTH-20261119-REVIEW1",
  startNotBeforeUtc:"2026-11-19T06:50:00.000Z",
  expiresAtUtc:"2026-11-19T22:55:00.000Z",
  accountEvidenceValidUntilUtc:"2026-11-19T22:55:00.000Z"
 };
 return {m,l,input,id,hash};
}
test("synthetic genuine permission row can materialize exact reviewed shape",()=>{
 const x=synthetic(),out=materialize(x.m,closure,x.l,x.input,NOW);
 assert.equal(out.sourceRightsEvidenceSha256,x.hash);
 assert.equal(out.independentSourceUseApproved,true);
 assert.equal(out.finalPredecessorsApproved,true);
 assert.equal(out.phase6PaidGo,false);
 assert.equal(out.legacyAlertStartApproved,false);
 assert.equal(out.reviewedBy,"Independent Reviewer");
 assert.ok(out.predecessorEvidenceIds.includes(x.id));
});
test("current preserve-f8 NOT_APPROVAL record cannot masquerade as source permission",()=>{
 const input=synthetic().input;
 const row=ledger.evidence.find(x=>x.evidenceId==="DEC-20261119-OWNERPRESERVEF8");
 assert.ok(row);
 input.sourceRightsEvidenceId=row.evidenceId;input.sourceRightsEvidenceSha256=row.sha256;
 const m=structuredClone(mechanical);
 assert.throws(()=>materialize(m,closure,ledger,input,NOW),/SOURCE_EVIDENCE_NOT_GENUINE_PERMISSION_RECORD/);
});
test("source evidence must already be an exact predecessor",()=>{
 const x=synthetic();x.m.draftReview.predecessorEvidenceIds=x.m.draftReview.predecessorEvidenceIds.filter(id=>id!==x.id);
 assert.throws(()=>materialize(x.m,closure,x.l,x.input,NOW),/SOURCE_EVIDENCE_NOT_A_PREDECESSOR/);
});
test("semantic decisions cannot be inferred or partially adopted",()=>{
 for(const k of ["finalPredecessorsApproved","independentScientificFreezeApproved","independentSourceUseApproved","independentOperationalReleaseApproved"]){
  const x=synthetic();x.input[k]=false;
  assert.throws(()=>materialize(x.m,closure,x.l,x.input,NOW),/EXPLICIT_DECISIONS_REQUIRED/);
 }
 const x=synthetic();x.input.adoptEvidenceBackedRecommendations=false;
 assert.throws(()=>materialize(x.m,closure,x.l,x.input,NOW),/RECOMMENDATIONS_NOT_ADOPTED/);
});
test("expired/future review windows are refused",()=>{
 let x=synthetic();x.input.expiresAtUtc="2026-11-19T06:54:00.000Z";
 assert.throws(()=>materialize(x.m,closure,x.l,x.input,NOW),/CURRENT_WINDOW/);
 x=synthetic();x.input.reviewedAtUtc="2026-11-19T07:00:00.000Z";
 assert.throws(()=>materialize(x.m,closure,x.l,x.input,NOW),/CURRENT_WINDOW/);
});
test("mechanical draft must remain pristine no-GO",()=>{
 const x=synthetic();x.m.draftReview.currentAccountAndBudgetApproved=true;
 assert.throws(()=>materialize(x.m,closure,x.l,x.input,NOW),/MECHANICAL_DRAFT_NOT_PRISTINE/);
});
test("closure recommendation drift is refused",()=>{
 const x=synthetic(),c=structuredClone(closure);
 c.evidenceBackedRecommendations.githubPaidDispatchFlagsVerifiedOff.recommendedValue=false;
 assert.throws(()=>materialize(x.m,c,x.l,x.input,NOW),/CLOSURE_RECOMMENDATIONS/);
});
