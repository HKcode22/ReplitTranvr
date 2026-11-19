"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {refresh}=require("./p5_refresh_final_core_after_source_evidence.cjs");
function base(){
 const evidence=[{evidenceId:"RUN-20261119-A",path:"data-collection/phase5/evidence/a.json",sha256:"a".repeat(64)},{evidenceId:"RUN-20261119-B",path:"data-collection/phase5/evidence/b.json",sha256:"b".repeat(64)}];
 const ledger={schema:"v39.phase6.source-enable-approval-ledger.v1",phaseGate:"Phase 6 (separate authorization)",scope:"C_D_GITHUB_SOURCE_PRE_POST_EXISTING_CALENDAR_NO_LEGACY_ALERT_START",evidence,approvals:[]};
 const draft={schema:"v39.phase5.exact-final-core-scope-review.v1",evidenceCommit:"1".repeat(40),predecessorEvidenceIds:evidence.map(x=>x.evidenceId),sourceRightsEvidenceSha256:null,independentSourceUseApproved:false,finalPredecessorsApproved:false,phase6PaidGo:false};
 const mechanical={schema:"v39.phase5.final-core-mechanical-bindings-ready.v1",phase6PaidGo:false,evidenceCommit:"1".repeat(40),ledgerBlob:"c".repeat(40),draftReview:draft,mechanicallyBoundEvidence:{scientificFreezeEvidenceSha256:{evidenceId:"RUN-20261119-A",path:"x",sha256:"a".repeat(64)}},deliberatelyUnbound:{sourceRightsEvidenceSha256:null}};
 const closure={schema:"v39.phase5.final-core-reviewer-closure-matrix.v1",phase6PaidGo:false,evidenceCommit:"1".repeat(40),mechanicallyReady:{finalPredecessorCount:2},explicitReviewerJudgments:{independentSourceUseApproved:{value:null,sourceRightsEvidenceSha256:null}}};
 return {mechanical,closure,ledger};
}
function next(l){const x=structuredClone(l);x.evidence.push({evidenceId:"RUN-20261119-SOURCEUSE",path:"data-collection/phase5/evidence/2026-11-19_independent_source_use_review.json",sha256:"f".repeat(64)});return x}
test("single genuine source-use evidence append refreshes commit and predecessor set without approval",()=>{
 const b=base(),n=next(b.ledger),x=refresh(b.mechanical,b.closure,b.ledger,n,"2".repeat(40),"RUN-20261119-SOURCEUSE");
 assert.equal(x.mechanical.evidenceCommit,"2".repeat(40));assert.equal(x.mechanical.draftReview.evidenceCommit,"2".repeat(40));
 assert.deepEqual(x.mechanical.draftReview.predecessorEvidenceIds,["RUN-20261119-A","RUN-20261119-B","RUN-20261119-SOURCEUSE"]);
 assert.equal(x.mechanical.draftReview.sourceRightsEvidenceSha256,null);assert.equal(x.mechanical.draftReview.independentSourceUseApproved,false);
 assert.equal(x.mechanical.mechanicallyBoundEvidence.sourceRightsEvidenceSha256.sha256,"f".repeat(64));
 assert.equal(x.closure.explicitReviewerJudgments.independentSourceUseApproved.value,null);
 assert.equal(x.closure.mechanicallyReady.finalPredecessorCount,3);
});
test("existing approvals may not change during source-evidence registration",()=>{
 const b=base(),n=next(b.ledger);n.approvals.push({authorizationId:"AUTH-20261119-X"});
 assert.throws(()=>refresh(b.mechanical,b.closure,b.ledger,n,"2".repeat(40),"RUN-20261119-SOURCEUSE"),/APPROVALS_CHANGED/);
});
test("ledger must be a single append preserving all old rows exactly",()=>{
 const b=base();let n=next(b.ledger);n.evidence[0].sha256="d".repeat(64);assert.throws(()=>refresh(b.mechanical,b.closure,b.ledger,n,"2".repeat(40),"RUN-20261119-SOURCEUSE"),/LEDGER_NOT_SINGLE_APPEND/);
 n=next(b.ledger);n.evidence.push({evidenceId:"RUN-20261119-X",path:"data-collection/phase5/evidence/x.json",sha256:"e".repeat(64)});assert.throws(()=>refresh(b.mechanical,b.closure,b.ledger,n,"2".repeat(40),"RUN-20261119-SOURCEUSE"),/LEDGER_NOT_SINGLE_APPEND/);
});
test("NO_GO/non-source evidence cannot satisfy source row",()=>{
 const b=base(),n=next(b.ledger);n.evidence.at(-1).path="data-collection/phase5/evidence/2026-11-19_source_use_NO_GO.json";
 assert.throws(()=>refresh(b.mechanical,b.closure,b.ledger,n,"2".repeat(40),"RUN-20261119-SOURCEUSE"),/SOURCE_ROW/);
});
test("pristine draft must align exactly to old ledger",()=>{
 const b=base(),n=next(b.ledger);b.mechanical.draftReview.sourceRightsEvidenceSha256="f".repeat(64);
 assert.throws(()=>refresh(b.mechanical,b.closure,b.ledger,n,"2".repeat(40),"RUN-20261119-SOURCEUSE"),/PRISTINE_DRAFT/);
});
