"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),cp=require("node:child_process");
const a=JSON.parse(fs.readFileSync("review-tools/2026-11-19_PHASE5_FINAL_DOWNSTREAM_TRANSITION_AUDIT_NO_GO.json","utf8"));
const gh=p=>cp.execFileSync("git",["hash-object",p],{encoding:"utf8"}).trim();
test("candidate and freeze boundary stay exact",()=>{
 assert.equal(a.productionMain,"70580b3749544dfcbeff39da181b2aa42b1b4476");
 assert.equal(a.restoredPrivateCandidate.verifiedPlans,31);
 assert.equal(a.restoredPrivateCandidate.plannedQueries,6144);
 assert.equal(a.restoredPrivateCandidate.reservedRestUnits,37388);
 assert.equal(a.restoredPrivateCandidate.providerCalls,0);
 assert.equal(a.restoredPrivateCandidate.databaseWrites,0);
 assert.equal(a.phase5TechnicalProtocolFrozen,true);
 assert.equal(a.phase5ScientificReleaseFrozen,false);
 assert.equal(a.phase6PaidGo,false);
});
test("all nine exact helper pins match repository bytes",()=>{
 const map={
  coreInputs:"review-tools/p5_prepare_adopt_exact_final_core_inputs.cjs",
  finalPolicyValidator:"review-tools/p5_exact_final_release_policy_bindings.cjs",
  sixPolicyAssembler:"review-tools/p5_assemble_exact_six_final_policies.cjs",
  bundleManifest:"review-tools/p5_export_exact_approved_bundle.cjs",
  staticInstaller:"review-tools/p5_install_exact_approved_static_values.cjs",
  inertStageChain:"review-tools/p5_run_existing_inert_stage_chain.cjs",
  schedulerRepin:"review-tools/p5_final_primary_relay_repin.cjs",
  bulkHandoff:"review-tools/p5_bulk_final_owner_handoff.cjs",
  consolidatedResume:"review-tools/p5_resume_existing_final_commissioning.cjs"
 };
 for(const [k,p] of Object.entries(map))assert.equal(a.exactHelperPins[k],gh(p),k);
});
test("transition list is exhaustive, ordered, and Phase6 remains separate",()=>{
 assert.equal(a.transitions.length,15);
 assert.deepEqual(a.transitions.map(x=>x.order),Array.from({length:15},(_,i)=>i+1));
 assert.ok(a.transitions.slice(0,14).every(x=>x.implemented===true&&x.tested===true));
 assert.equal(a.transitions[14].kind,"phase6-separate");
 assert.equal(a.transitions[14].currentState,"NOT_PHASE5_AUTOMATIC");
});
test("actual current hold remains review-file-only",()=>{
 assert.equal(a.currentActualHold.status,"HOLD_EXACT_CORE_REVIEW_FILE_ABSENT");
 assert.deepEqual(a.currentActualHold.missing,["reviewed-final-core-scope-decisions.json"]);
 assert.equal(a.currentActualHold.preparedAuth,null);
 assert.equal(a.currentActualHold.existingJournalsPreserved,true);
 assert.equal(a.currentActualHold.phase6PaidGo,false);
});
test("all remaining review materializers are exact and no-mutation",()=>{
 assert.equal(a.finalReviewMaterialization.materializer,gh("review-tools/p5_final_core_review_materializer.cjs"));
 assert.equal(a.finalReviewMaterialization.productionMutations,0);
 const m=a.reviewMaterialization;
 assert.equal(m.finalCore.materializer,gh("review-tools/p5_final_core_review_materializer.cjs"));
 assert.equal(m.finalCore.ownerWrapper,gh("review-tools/p5_materialize_final_core_review_once.sh"));
 assert.equal(m.finalPolicyBinding.materializer,gh("review-tools/p5_final_policy_binding_materializer.cjs"));
 assert.equal(m.privatePolicyBytes.materializer,gh("review-tools/p5_private_policy_review_materializer.cjs"));
 assert.equal(m.staticInstall.materializer,gh("review-tools/p5_static_install_review_materializer.cjs"));
 assert.equal(m.finalPhase5Freeze.materializer,gh("review-tools/p5_final_phase5_freeze_decision.cjs"));
 for(const k of ["finalPolicyBinding","privatePolicyBytes","staticInstall","finalPhase5Freeze"])assert.equal(m[k].ownerWrapper,gh("review-tools/p5_materialize_downstream_review_once.sh"));
 assert.match(a.engineeringConclusion,/review-materialization/);
});
