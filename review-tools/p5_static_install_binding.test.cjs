"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const fixture=require("./fixtures/p5_six_policy_candidate.json");
const {assemble,FLAGS}=require("./p5_assemble_exact_six_final_policies.cjs");
const {validateFinalPolicies}=require("./p5_exact_final_release_policy_bindings.cjs");
const {staticValues}=require("./p5_export_exact_approved_bundle.cjs");
const {validate,planWrites}=require("./p5_install_exact_approved_static_values.cjs");
const h=x=>x.repeat(64).slice(0,64),code="70580b3749544dfcbeff39da181b2aa42b1b4476";
const p={authVerified:true,authorizationId:"AUTH-20261119-FINAL",authArtifactSha256:h("a"),codeSha:code,manifestSha256:h("1"),configSha256:h("2"),calendarSha256:"7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c",frameSha256:"02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94",rightsSha256:h("3"),providerContractSha256:h("4"),costSha256:h("5"),sourceInventorySha256:h("6"),executableFileCount:2188,dayPlanSha256s:fixture.policyDrafts.P6_NONPAID_DAILY_POLICY_BASE64.dayPlanSha256s,airportTimezoneCatalogSha256:"4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534",dailyRestCeiling:1900,cycleRestCeiling:49468,minimumProtectedFloor:1000,maxQueriesPerDay:288,nowUtc:"2026-11-19T06:40:00.000Z",outcomeTailUtc:"2026-12-26T04:00:00.000Z"};
const s={schema:"v39.phase5.final-six-policy-binding-decisions.v1",phase6PaidGo:false,authorizationId:p.authorizationId,authArtifactSha256:p.authArtifactSha256,reviewedMainSha:p.codeSha,manifestSha256:p.manifestSha256,configSha256:p.configSha256,rightsSha256:p.rightsSha256,costSha256:p.costSha256,reviewedBy:"independent-reviewer",reviewedAtUtc:"2026-11-19T06:35:00.000Z",decisions:Object.fromEntries(FLAGS.map(k=>[k,true])),releaseSha256:h("7"),externalContentUseReviewSha256:h("8"),builderSha256:h("9"),runAndRetentionEvidenceSha256:h("a"),selectedTArtifactHash:h("b"),selectedTSemanticsEvidenceSha256:h("c"),t24CustodyPolicySha256:h("d"),reviewedProviderPriceSha256:h("e"),externalPostContentsAndBudgetEvidenceSha256:h("f"),validFromUtc:"2026-11-19T05:00:00.000Z",validUntilUtc:"2026-12-27T04:00:00.000Z",builderFrozenAtUtc:"2026-11-19T06:30:00.000Z",selectedTVersion:"departure.scheduledTime.utc/v39",standaloneNoT24ProtocolSha256:null};
const ops={hash:x=>crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex"),publicFingerprint:pem=>crypto.createHash("sha256").update(crypto.createPublicKey(pem).export({type:"spki",format:"der"})).digest("hex"),byteLength:Buffer.byteLength};
function assembled(){
 const work={status:"PRIVATE_SIX_POLICY_SHAPES_WITH_PUBLIC_CONTRACT_CANDIDATE_NOT_RUNTIME",phase6PaidGo:false,manifestApproved:false,policyDrafts:structuredClone(fixture.policyDrafts)};
 const policies=assemble(work,p,s,ops),pins={...p,releaseSha256:s.releaseSha256};
 const verified=validateFinalPolicies(policies,pins,ops);
 const stage=JSON.stringify({codeSha40:p.codeSha,manifestSha256:p.manifestSha256,phase6AuthorizationId:p.authorizationId});
 const values=staticValues(stage,p.costSha256,pins,policies,verified);
 const receipt={schema:"v39.phase5.exact-final-commissioning-bundle.v1",status:"EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH",main:p.codeSha,phase6PaidGo:false,approvalFlagsPrepared:0,githubMutations:0,providerCalls:0,verifiedPlanCount:31,plannedQueries:6144,reservedRestUnits:37388,staticSecretsPrepared:31,manifestSha256:p.manifestSha256,configSha256:p.configSha256,calendarSha256:p.calendarSha256,stageSha256:ops.hash(JSON.parse(stage)),costEnvelopeSha256:p.costSha256,approvedPrivatePolicyReviewSha256:h("0"),authArtifactSha256:p.authArtifactSha256,policyBundleSha256:h("9"),authorizationId:p.authorizationId,policyDigests:verified.policyDigests};
 // staticValues hashes the raw canonical stage string, not parsed object.
 receipt.stageSha256=crypto.createHash("sha256").update(stage).digest("hex");
 return {policies,verified,stage,values,receipt};
}
test("actual-shape assembled policies produce exactly 31 installable static values",()=>{
 const x=assembled();
 assert.equal(Object.keys(x.values).length,31);
 assert.equal(validate(x.receipt,x.values,x.stage).length,31);
});
test("static values keep all code pins on the exact reviewed main",()=>{
 const x=assembled();for(const k of ["V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA","V39_P5_QUEUE_APPROVED_CODE_SHA"])assert.equal(x.values[k],p.codeSha);
});
test("tampered stage, code pin or policy bytes are refused",()=>{
 const x=assembled();
 assert.throws(()=>validate(x.receipt,{...x.values,V39_P5_APPROVED_CODE_SHA:"0".repeat(40)},x.stage),/CODE_PIN/);
 assert.throws(()=>validate(x.receipt,{...x.values,P6_NONPAID_DAILY_POLICY_BASE64:x.values.P6_NONPAID_DAILY_POLICY_BASE64.slice(4)},x.stage));
 assert.throws(()=>validate(x.receipt,x.values,x.stage+" "),/STAGE_AND_COST_PINS|EXACT/);
});
test("planWrites creates missing secrets and requires exact review for replacements",()=>{
 const names=["A","B"],metadata=[{name:"A",updatedAt:"2026-11-19T06:00:00.000Z"}];
 assert.throws(()=>planWrites(names,metadata,[]),/EXISTING_SECRET_NEEDS_EXACT_REPLACEMENT_REVIEW/);
 const out=planWrites(names,metadata,[{name:"A",updatedAt:metadata[0].updatedAt}]);
 assert.deepEqual(out,[{name:"A",oldUpdatedAt:metadata[0].updatedAt,operation:"REPLACE_REVIEWED"},{name:"B",oldUpdatedAt:null,operation:"CREATE"}]);
});
test("replacement metadata drift refuses instead of overwriting",()=>{
 const names=["A"],metadata=[{name:"A",updatedAt:"2026-11-19T06:00:00.000Z"}];
 assert.throws(()=>planWrites(names,metadata,[{name:"A",updatedAt:"2026-11-19T06:01:00.000Z"}]),/REPLACEMENT_METADATA_DRIFT/);
});
