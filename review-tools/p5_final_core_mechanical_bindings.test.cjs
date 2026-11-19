"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),crypto=require("node:crypto");
const artifact=JSON.parse(fs.readFileSync("review-tools/2026-11-18_FINAL_CORE_MECHANICAL_BINDINGS_READY_NO_GO.json","utf8"));
const ledgerRaw=fs.readFileSync("review-tools/fixtures/p5_877_evidence_ledger.json");
const ledger=JSON.parse(ledgerRaw.toString("utf8"));
const ledgerBlob=crypto.createHash("sha1").update(Buffer.from("blob "+ledgerRaw.length+"\0")).update(ledgerRaw).digest("hex");
const byId=Object.fromEntries(ledger.evidence.map(x=>[x.evidenceId,x]));
const h=x=>/^[a-f0-9]{64}$/.test(x);
test("fixture is the exact PR877 evidence ledger bound by the workpaper",()=>assert.equal(ledgerBlob,artifact.ledgerBlob));
test("mechanical bindings point to exact ledger entries",()=>{
 for(const [field,v] of Object.entries(artifact.mechanicallyBoundEvidence)){
  assert.ok(byId[v.evidenceId],field+" missing ledger evidence");
  assert.equal(v.path,byId[v.evidenceId].path);
  assert.equal(v.sha256,byId[v.evidenceId].sha256);
  assert.equal(artifact.draftReview[field],v.sha256);
  assert.ok(h(v.sha256));
 }
});
test("all predecessor IDs exist and remain unique",()=>{
 const ids=artifact.draftReview.predecessorEvidenceIds;
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ids)assert.ok(byId[id],id);
});
test("unresolved source-rights evidence is not fabricated",()=>{
 assert.equal(artifact.deliberatelyUnbound.sourceRightsEvidenceSha256,null);
 assert.equal(artifact.draftReview.sourceRightsEvidenceSha256,null);
 assert.equal(artifact.draftReview.independentSourceUseApproved,false);
});
test("no approval or GO can be inferred from this artifact",()=>{
 assert.equal(artifact.phase6PaidGo,false);
 assert.equal(artifact.draftReview.phase6PaidGo,false);
 assert.equal(artifact.draftReview.finalPredecessorsApproved,false);
 for(const k of ["independentScientificFreezeApproved","independentOperationalReleaseApproved","currentAccountAndBudgetApproved","legacyPublishedAutoCollectVerifiedOff","githubPaidDispatchFlagsVerifiedOff","activeBillableSubscriptionsVerifiedZero","separatePaidDispatchStillRequired"])assert.equal(artifact.draftReview[k],false,k);
 for(const k of ["reviewedBy","reviewedAtUtc","cleanupOwner","authorizationId","startNotBeforeUtc","expiresAtUtc","accountEvidenceValidUntilUtc"])assert.equal(artifact.draftReview[k],null,k);
});
test("fixed release identity matches current final-core contract",()=>{
 assert.equal(artifact.draftReview.baseCodeSha,"70580b3749544dfcbeff39da181b2aa42b1b4476");
 assert.equal(artifact.draftReview.evidenceCommit,"2655adad1cf8d33fa6f05ef17bc19c3fb295e427");
 assert.equal(artifact.draftReview.calendarRowsSha256,"7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c");
 assert.equal(artifact.draftReview.frameSha256,"02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94");
});
