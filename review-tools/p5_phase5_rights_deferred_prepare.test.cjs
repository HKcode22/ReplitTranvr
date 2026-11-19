"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {ALLOWED,EVIDENCE,AUTH_ID,RESERVED_RIGHTS_ID,freezeArtifacts}=require("./p5_phase5_rights_deferred_prepare.cjs");
const h=x=>x.repeat(64).slice(0,64);
test("reviewed source delta is exactly the Phase5 rights-deferral production patch",()=>{
 assert.deepEqual([...ALLOWED].sort(),[
  ".github/workflows/phase5-exact-inert-release-stage-manual.yml",
  "scripts/v39_phase6_enable_source_owner_v39.ts",
  "scripts/v39_phase6_inert_release_stage_manual_v39.mjs",
  "scripts/v39_phase6_release_inventory_readonly.mjs",
  "server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs",
  "tests/phase5_actual_nov22_budget_proposal_v39.test.ts",
  "tests/phase5_source_rights_deferred_to_phase6_activation_v39.test.mjs",
  "tests/phase5_v0093_cost_only_inert_seven_rest_freeze_pg16_v39.test.ts",
  "tests/phase6_release_inventory_readonly_v39.test.ts"
 ].sort());
});
test("frozen manifest is scientifically approved but source-use remains deferred",()=>{
 const c={schema:"v39.config",reviewApproved:false,sourceRightsApproved:false,phase6PaidGo:false};
 const m={schema:"v39.manifest",scientificFreezeApproved:false,finalPredecessorsApproved:false,phase6PaidGo:false};
 const inv={sha256:h("a"),rows:[{path:"x",mode:"100644",sha256:h("b")}]};
 const account={jointBudgetReview:{apiUnitsRemaining:59968,alertCreditsRemaining:1830}};
 const x=freezeArtifacts(c,m,inv,"1".repeat(40),["EVIDENCE-ONE"],account);
 assert.equal(x.config.reviewApproved,true);
 assert.equal(x.config.sourceRightsApproved,false);
 assert.equal(x.config.sourceUseDeferredToPhase6Activation,true);
 assert.equal(x.manifest.scientificFreezeApproved,true);
 assert.equal(x.manifest.phase5CommissioningApproved,true);
 assert.equal(x.manifest.phase5PredecessorsApproved,true);
 assert.equal(x.manifest.finalPredecessorsApproved,false);
 assert.equal(x.manifest.sourceRightsApproved,false);
 assert.equal(x.manifest.sourceUseDeferredToPhase6Activation,true);
 assert.equal(x.manifest.phase6PaidGo,false);
 assert.equal(x.predecessors.at(-1),RESERVED_RIGHTS_ID);
 assert.equal(x.predecessors.length,2);
});
test("source-rights evidence is null in Phase5 frozen release evidence",()=>{
 const x=freezeArtifacts(
  {schema:"v39.config",phase6PaidGo:false},
  {schema:"v39.manifest",phase6PaidGo:false,bindingDocuments:[]},
  {sha256:h("c"),rows:[]},
  "2".repeat(40),[],{jointBudgetReview:{}}
 );
 assert.equal(x.manifest.releaseEvidence.sourceRightsEvidenceSha256,null);
 assert.equal(x.manifest.releaseEvidence.reservedSourceRightsEvidenceId,RESERVED_RIGHTS_ID);
 assert.equal(x.config.releaseEvidence.ownerCommissioningDecisionIssueCommentId,7002623385);
});
test("technical evidence hashes remain exact and no source-rights hash is smuggled in",()=>{
 assert.equal(Object.keys(EVIDENCE).length,5);
 for(const value of Object.values(EVIDENCE))assert.match(value,/^[a-f0-9]{64}$/);
 assert.equal(AUTH_ID,"AUTH-20261119-F8CYCLE1");
 assert.equal(RESERVED_RIGHTS_ID,"RUN-20261119-SOURCERIGHTS");
});
