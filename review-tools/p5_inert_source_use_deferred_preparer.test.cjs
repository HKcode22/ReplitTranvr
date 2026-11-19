"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {AUTH_ID,RESERVED_RIGHTS_ID,PREDECESSORS,makeWorkpaper}=require("./p5_prepare_inert_commissioning_source_use_deferred.cjs");

test("predeclares one future source-rights evidence slot without claiming it exists",()=>{
 assert.equal(AUTH_ID,"AUTH-20261119-P5INERT");
 assert.equal(RESERVED_RIGHTS_ID,"RUN-20261119-SOURCERIGHTS");
 assert.equal(PREDECESSORS.length,29);
 assert.equal(new Set(PREDECESSORS).size,29);
 assert.equal(PREDECESSORS.at(-1),RESERVED_RIGHTS_ID);
 assert.equal(PREDECESSORS.includes("RUN-20261119-CURRENTFIDSPRICE"),true);
});

test("private workpaper is exact no-go and keeps source permission deferred",()=>{
 const stage={calendarSha256:"a".repeat(64),frameSha256:"b".repeat(64)};
 const cost={costOnlyCategoryDraftSha256:"c".repeat(64)};
 const w=makeWorkpaper(stage,cost,Buffer.from("{}"));
 assert.equal(w.status,"EXACT_INERT_INPUT_READY_SOURCE_USE_DEFERRED_NOT_APPROVED_NO_GO");
 assert.equal(w.authorizationId,AUTH_ID);
 assert.equal(w.sourceRightsEvidencePresent,false);
 assert.equal(w.sourceUseDeferredToPhase6Activation,true);
 assert.equal(w.sourceUse.independentSourceContentsRightsForIntendedUseApproved,false);
 assert.equal(w.sourceUse.requiredBeforePhase6AuthorizationEnable,true);
 assert.equal(w.reviewDecisions.narrowPrelaunchOwnerApproved,true);
 for(const k of [
  "independentCalendarTreatmentReviewApproved",
  "independentProviderAccountAndRestBudgetReviewApproved",
  "independentProspectiveCalendarAndTreatmentApproved",
  "independentRealProviderRangeAndRestBudgetApproved",
  "exactRestrictedNoProviderBudgetFreezeApproved"
 ]) assert.equal(w.reviewDecisions[k],null,k);
 assert.equal(w.phase6PaidGo,false);
 assert.equal(w.providerCalls,0);
 assert.equal(w.databaseWrites,0);
 assert.equal(w.githubMutations,0);
});

test("reserved source-rights slot remains part of staged predecessor identity",()=>{
 const w=makeWorkpaper(
  {calendarSha256:"d".repeat(64),frameSha256:"e".repeat(64)},
  {costOnlyCategoryDraftSha256:"f".repeat(64)},
  Buffer.from('{"x":1}')
 );
 assert.deepEqual(w.predecessorEvidenceIds,PREDECESSORS);
 assert.equal(w.reservedFutureSourceRightsEvidenceId,RESERVED_RIGHTS_ID);
});
