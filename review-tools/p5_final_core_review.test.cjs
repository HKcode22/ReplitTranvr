"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {validateReview,decisionAuth}=require("./p5_prepare_adopt_exact_final_core_inputs.cjs");
const H=x=>x.repeat(64).slice(0,64);
const review={
 schema:"v39.phase5.exact-final-core-scope-review.v1",
 baseCodeSha:"70580b3749544dfcbeff39da181b2aa42b1b4476",
 evidenceCommit:"2655adad1cf8d33fa6f05ef17bc19c3fb295e427",
 calendarRowsSha256:"7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c",
 frameSha256:"02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94",
 existingRangeEvidenceSha256:"cde412a012e912f9fbe42cd29375ddbaf674054d11af45fe6d2a8eab36c81bb3",
 existingTimingEvidenceSha256:"88cbedd1ec867a6372f69c2708e180509f849d71a34963d4fb5ac851d6e30be5",
 accountReviewSha256:"8b1c5f077dca3c024d73d0a782323d009ea60706bb042c2babbe0d76e522f33b",
 rawAccountEvidenceSha256:"7002466888531e26e29c1ecd205ecbed5a534282ced73b5adb315e5c98a5f4b0",
 phase6PaidGo:false,legacyAlertStartApproved:false,finalPredecessorsApproved:true,
 independentScientificFreezeApproved:true,independentSourceUseApproved:true,independentOperationalReleaseApproved:true,
 currentAccountAndBudgetApproved:true,legacyPublishedAutoCollectVerifiedOff:true,githubPaidDispatchFlagsVerifiedOff:true,
 activeBillableSubscriptionsVerifiedZero:true,separatePaidDispatchStillRequired:true,
 scientificFreezeEvidenceSha256:H("1"),sourceRightsEvidenceSha256:H("2"),providerAccountAndBudgetEvidenceSha256:H("3"),
 publishedAndGithubStopEvidenceSha256:H("4"),operationalReleaseEvidenceSha256:H("5"),
 reviewedBy:"independent-reviewer",reviewedAtUtc:"2026-11-19T06:20:00.000Z",cleanupOwner:"HKcode22",
 authorizationId:"AUTH-20261119-FINAL",startNotBeforeUtc:"2026-11-19T06:00:00.000Z",
 expiresAtUtc:"2026-11-20T04:00:00.000Z",accountEvidenceValidUntilUtc:"2026-11-20T02:00:00.000Z",
 predecessorEvidenceIds:["RUN-20261119-SCIENTIFICSCOPEREVIEW","RUN-20261119-FRESHACCOUNT033903","RUN-20261119-OPERATIONALSCOPEREVIEW"]
};
const now=Date.parse("2026-11-19T06:30:00.000Z");
test("exact prospective core review is admitted before strict deadline",()=>assert.equal(validateReview(review,now),true));
test("review must remain separate from paid GO and legacy Alert start",()=>{
 assert.throws(()=>validateReview({...review,phase6PaidGo:true},now));
 assert.throws(()=>validateReview({...review,legacyAlertStartApproved:true},now));
});
test("all explicit independent decisions are required",()=>{
 for(const k of ["independentScientificFreezeApproved","independentSourceUseApproved","independentOperationalReleaseApproved","currentAccountAndBudgetApproved","legacyPublishedAutoCollectVerifiedOff","githubPaidDispatchFlagsVerifiedOff","activeBillableSubscriptionsVerifiedZero","separatePaidDispatchStillRequired"])
  assert.throws(()=>validateReview({...review,[k]:false},now),/ACTUAL_INDEPENDENT_DECISIONS_REQUIRED/);
});
test("review clocks are prospective and bounded",()=>{
 assert.throws(()=>validateReview({...review,startNotBeforeUtc:"2026-11-19T07:00:00.000Z"},now),/CURRENT_PROSPECTIVE_REVIEW_CLOCK/);
 assert.throws(()=>validateReview({...review,expiresAtUtc:"2026-11-19T06:29:59.000Z"},now),/CURRENT_PROSPECTIVE_REVIEW_CLOCK/);
 assert.throws(()=>validateReview({...review,accountEvidenceValidUntilUtc:"2026-11-19T06:29:59.000Z"},now),/CURRENT_PROSPECTIVE_REVIEW_CLOCK/);
 assert.throws(()=>validateReview(review,Date.parse("2026-11-19T23:10:00.000Z")),/CURRENT_PROSPECTIVE_REVIEW_CLOCK/);
});
test("predecessor identities must be unique and exact",()=>{
 assert.throws(()=>validateReview({...review,predecessorEvidenceIds:[review.predecessorEvidenceIds[0],review.predecessorEvidenceIds[0]]},now),/EXACT_PREDECESSOR_ORDER/);
 assert.throws(()=>validateReview({...review,evidenceCommit:"x"},now),/EXACT_REVIEWED_COMPACT_SCOPE/);
});
test("AUTH construction preserves separate paid gate and exact seven caps",()=>{
 const cats=[
  ["FIDS_BASE_UNITS",11904],["FIDS_SPLIT_UNITS",384],["FIDS_RETRY_UNIT_BUDGET",1260],
  ["VALIDATION_UNIT_BUDGET",496],["OUTCOME_REST_UNIT_BUDGET",23040],["HISTORY_BOOTSTRAP_UNIT_BUDGET",0],["DIAGNOSTIC_UNIT_BUDGET",304]
 ].map(([category,ceilingUnits])=>({category,ceilingUnits}));
 const out=decisionAuth(review,H("a"),H("b"),cats);
 assert.equal(out.phaseGate,"Phase 6 (separate authorization)");
 assert.equal(out.releaseActivation.legacyAlertStartApproved,false);
 assert.equal(out.releaseActivation.independentSourceUseApproved,true);
 assert.equal(Object.values(out.maxRestUnitsByCategory).reduce((a,b)=>a+b,0),37388);
 assert.throws(()=>decisionAuth(review,H("a"),H("b"),cats.map((x,i)=>i?x:{...x,ceilingUnits:x.ceilingUnits+1})),/EXACT_FINAL_SEVEN_CAPS/);
});
