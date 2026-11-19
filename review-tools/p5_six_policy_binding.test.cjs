"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const fixture=require("./fixtures/p5_six_policy_candidate.json");
const {assemble,FLAGS,HASHES}=require("./p5_assemble_exact_six_final_policies.cjs");
const {validateFinalPolicies}=require("./p5_exact_final_release_policy_bindings.cjs");
const h=x=>x.repeat(64).slice(0,64),code="70580b3749544dfcbeff39da181b2aa42b1b4476";
const p={
 authVerified:true,authorizationId:"AUTH-20261119-FINAL",authArtifactSha256:h("a"),
 codeSha:code,manifestSha256:h("1"),configSha256:h("2"),calendarSha256:"7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c",
 frameSha256:"02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94",
 rightsSha256:h("3"),providerContractSha256:h("4"),costSha256:h("5"),
 sourceInventorySha256:h("6"),executableFileCount:2188,
 dayPlanSha256s:fixture.policyDrafts.P6_NONPAID_DAILY_POLICY_BASE64.dayPlanSha256s,
 airportTimezoneCatalogSha256:"4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534",
 dailyRestCeiling:1900,cycleRestCeiling:49468,minimumProtectedFloor:1000,maxQueriesPerDay:288,
 nowUtc:"2026-11-19T06:40:00.000Z",outcomeTailUtc:"2026-12-26T04:00:00.000Z"
};
const decisions=Object.fromEntries(FLAGS.map(k=>[k,true]));
const s={
 schema:"v39.phase5.final-six-policy-binding-decisions.v1",phase6PaidGo:false,
 authorizationId:p.authorizationId,authArtifactSha256:p.authArtifactSha256,reviewedMainSha:p.codeSha,
 manifestSha256:p.manifestSha256,configSha256:p.configSha256,rightsSha256:p.rightsSha256,costSha256:p.costSha256,
 reviewedBy:"independent-reviewer",reviewedAtUtc:"2026-11-19T06:35:00.000Z",
 decisions,
 releaseSha256:h("7"),externalContentUseReviewSha256:h("8"),builderSha256:h("9"),
 runAndRetentionEvidenceSha256:h("a"),selectedTArtifactHash:h("b"),selectedTSemanticsEvidenceSha256:h("c"),
 t24CustodyPolicySha256:h("d"),reviewedProviderPriceSha256:h("e"),externalPostContentsAndBudgetEvidenceSha256:h("f"),
 validFromUtc:"2026-11-19T05:00:00.000Z",validUntilUtc:"2026-12-27T04:00:00.000Z",
 builderFrozenAtUtc:"2026-11-19T06:30:00.000Z",selectedTVersion:"departure.scheduledTime.utc/v39",
 standaloneNoT24ProtocolSha256:null
};
for(const k of HASHES)assert.match(s[k],/^[a-f0-9]{64}$/);
const ops={
 hash:x=>crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex"),
 publicFingerprint:pem=>crypto.createHash("sha256").update(crypto.createPublicKey(pem).export({type:"spki",format:"der"})).digest("hex"),
 byteLength:Buffer.byteLength
};
function work(){return {status:"PRIVATE_SIX_POLICY_SHAPES_WITH_PUBLIC_CONTRACT_CANDIDATE_NOT_RUNTIME",phase6PaidGo:false,manifestApproved:false,policyDrafts:structuredClone(fixture.policyDrafts)};}
test("actual public candidate shapes assemble into a valid six-policy bundle",()=>{
 const w=assemble(work(),p,s,ops);
 const out=validateFinalPolicies(w,{...p,releaseSha256:s.releaseSha256},ops);
 assert.equal(out.policyCount,6);assert.equal(out.validThroughOutcomeTail,true);
 assert.equal(out.policyDigests.length,6);
});
test("transport hashes bind final daily and signing policy bytes",()=>{
 const w=assemble(work(),p,s,ops),x=w.P6_NONPAID_TRANSPORT_TRUST_BASE64;
 assert.equal(x.dailyPolicySha256,ops.hash(w.P6_NONPAID_DAILY_POLICY_BASE64));
 assert.equal(x.signingPolicySha256,ops.hash(w.P6_NONPAID_SIGNING_POLICY_BASE64));
});
test("assembled selected-T, T24 custody and POST policies bind final rights and cost pins",()=>{
 const w=assemble(work(),p,s,ops),d=w.P6_NONPAID_DAILY_POLICY_BASE64,post=w.P6_NATIVE_POST_POLICY_BASE64;
 assert.equal(d.nativePreFeatureReview.rightsSha256,p.rightsSha256);
 assert.equal(d.nativeLaterReview.selectedTConfig.artifactHash,s.selectedTArtifactHash);
 assert.equal(d.nativeLaterReview.t24Custody.policySha256,s.t24CustodyPolicySha256);
 assert.equal(post.reviewedCategoryBudgetSha256,p.costSha256);
 assert.equal(post.reviewedProviderPriceSha256,s.reviewedProviderPriceSha256);
});
test("any missing explicit policy decision is refused before assembly",()=>{
 const bad=structuredClone(s);bad.decisions[FLAGS[0]]=false;
 assert.throws(()=>assemble(work(),p,bad,ops),/EXPLICIT_REVIEWED_POLICY_DECISIONS/);
});
test("validity must cover the entire outcome tail",()=>{
 assert.throws(()=>assemble(work(),p,{...s,validUntilUtc:"2026-12-25T00:00:00.000Z"},ops),/REVIEWED_VALIDITY/);
});
test("validator rejects post-assembly tampering",()=>{
 const w=assemble(work(),p,s,ops);w.P6_NATIVE_POST_POLICY_BASE64.expectedApiUnitsPerGet=3;
 assert.throws(()=>validateFinalPolicies(w,{...p,releaseSha256:s.releaseSha256},ops),/REVIEWED_POST_COST_AND_WINDOW/);
});
