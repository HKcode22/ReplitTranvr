"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const a=JSON.parse(fs.readFileSync("review-tools/2026-11-19_FINAL_CORE_TECHNICAL_REVIEW_RECOMMENDATION_NO_GO.json","utf8"));
const m=JSON.parse(fs.readFileSync("review-tools/2026-11-18_FINAL_CORE_MECHANICAL_BINDINGS_READY_NO_GO.json","utf8"));
test("technical recommendations are yes only for non-source-use domains",()=>{
 assert.equal(a.recommendations.finalPredecessorsApproved.recommendedValue,true);
 assert.equal(a.recommendations.independentScientificFreezeApproved.recommendedValue,true);
 assert.equal(a.recommendations.independentOperationalReleaseApproved.recommendedValue,true);
 for(const k of ["currentAccountAndBudgetApproved","legacyPublishedAutoCollectVerifiedOff","githubPaidDispatchFlagsVerifiedOff","activeBillableSubscriptionsVerifiedZero","separatePaidDispatchStillRequired"])
  assert.equal(a.recommendations[k].recommendedValue,true,k);
 assert.equal(a.sourceUse.recommendedValue,null);
 assert.equal(a.sourceUse.providerGrantClaimed,false);
 assert.equal(a.phase6PaidGo,false);
});
test("technical recommendation evidence matches exact mechanical bindings",()=>{
 assert.equal(a.evidenceHashes.scientific,m.mechanicallyBoundEvidence.scientificFreezeEvidenceSha256.sha256);
 assert.equal(a.evidenceHashes.accountBudget,m.mechanicallyBoundEvidence.providerAccountAndBudgetEvidenceSha256.sha256);
 assert.equal(a.evidenceHashes.publishedGithubStop,m.mechanicallyBoundEvidence.publishedAndGithubStopEvidenceSha256.sha256);
 assert.equal(a.evidenceHashes.operational,m.mechanicallyBoundEvidence.operationalReleaseEvidenceSha256.sha256);
});
test("technical recommendation cannot imply historical full Gate5 or paid readiness",()=>{
 const s=JSON.stringify(a);
 assert.match(s,/does not retroactively mark full historical Gate5 PASS/i);
 assert.match(s,/not a paid dispatch approval/i);
 assert.equal(a.sourceUse.status,"SEPARATE_GENUINE_DECISION_REQUIRED");
});
