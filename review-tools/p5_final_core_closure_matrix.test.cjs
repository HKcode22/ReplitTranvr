"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const matrix=JSON.parse(fs.readFileSync("review-tools/2026-11-19_FINAL_CORE_REVIEWER_CLOSURE_MATRIX_NO_GO.json","utf8"));
const work=JSON.parse(fs.readFileSync("review-tools/2026-11-18_FINAL_CORE_MECHANICAL_BINDINGS_READY_NO_GO.json","utf8"));
const ledger=JSON.parse(fs.readFileSync("review-tools/fixtures/p5_877_evidence_ledger.json","utf8"));
const draft=work.draftReview;

test("closure matrix is bound to the exact current final-core evidence set",()=>{
 assert.equal(matrix.schema,"v39.phase5.final-core-reviewer-closure-matrix.v1");
 assert.equal(matrix.status,"REVIEWER_CLOSURE_MATRIX_EVIDENCE_RECOMMENDATIONS_NOT_APPROVAL");
 assert.equal(matrix.baseCodeSha,draft.baseCodeSha);
 assert.equal(matrix.evidenceCommit,draft.evidenceCommit);
 assert.equal(matrix.mechanicallyReady.finalPredecessorCount,draft.predecessorEvidenceIds.length);
 assert.equal(draft.predecessorEvidenceIds.length,ledger.evidence.length);
 assert.deepEqual(new Set(draft.predecessorEvidenceIds),new Set(ledger.evidence.map(x=>x.evidenceId)));
});
test("all mechanically-ready hashes exactly match the final-core workpaper",()=>{
 const map={
  calendarRowsSha256:"calendarRowsSha256",frameSha256:"frameSha256",
  existingRangeEvidenceSha256:"existingRangeEvidenceSha256",existingTimingEvidenceSha256:"existingTimingEvidenceSha256",
  accountReviewSha256:"accountReviewSha256",rawAccountEvidenceSha256:"rawAccountEvidenceSha256",
  scientificFreezeEvidenceSha256:"scientificFreezeEvidenceSha256",
  providerAccountAndBudgetEvidenceSha256:"providerAccountAndBudgetEvidenceSha256",
  publishedAndGithubStopEvidenceSha256:"publishedAndGithubStopEvidenceSha256",
  operationalReleaseEvidenceSha256:"operationalReleaseEvidenceSha256"
 };
 for(const [a,b] of Object.entries(map))assert.equal(matrix.mechanicallyReady[a],draft[b],a);
});
test("evidence-backed recommendations remain recommendations, never copied approvals",()=>{
 const expected=["currentAccountAndBudgetApproved","legacyPublishedAutoCollectVerifiedOff","githubPaidDispatchFlagsVerifiedOff","activeBillableSubscriptionsVerifiedZero","separatePaidDispatchStillRequired"];
 assert.deepEqual(Object.keys(matrix.evidenceBackedRecommendations).sort(),expected.sort());
 for(const k of expected){
  assert.equal(matrix.evidenceBackedRecommendations[k].recommendedValue,true,k);
  assert.equal(draft[k],false,k+" must remain reviewer-owned in draft");
 }
});
test("four substantive reviewer judgments remain explicit and unfilled",()=>{
 const expected=["finalPredecessorsApproved","independentScientificFreezeApproved","independentSourceUseApproved","independentOperationalReleaseApproved"];
 assert.deepEqual(Object.keys(matrix.explicitReviewerJudgments).sort(),expected.sort());
 for(const k of expected)assert.equal(matrix.explicitReviewerJudgments[k].value,null,k);
 assert.equal(matrix.explicitReviewerJudgments.independentSourceUseApproved.sourceRightsEvidenceSha256,null);
 assert.equal(draft.sourceRightsEvidenceSha256,null);
 assert.equal(draft.independentSourceUseApproved,false);
});
test("reviewer identity/clock fields and GO remain unset",()=>{
 for(const k of matrix.reviewerSuppliedIdentityAndClock)assert.equal(draft[k],null,k);
 assert.equal(matrix.legacyAlertStartApproved,false);
 assert.equal(matrix.phase6PaidGo,false);
 assert.equal(draft.phase6PaidGo,false);
 assert.equal(draft.legacyAlertStartApproved,false);
});
