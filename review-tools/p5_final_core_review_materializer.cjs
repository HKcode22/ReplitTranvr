#!/usr/bin/env node
"use strict";
/**
 * Canonical Phase5 final-core review materializer.
 *
 * This tool NEVER makes a review decision. It accepts an explicit reviewer
 * decision input, verifies that every supplied evidence identity is already
 * present in the exact scoped evidence ledger, and emits canonical
 * reviewed-final-core-scope-decisions.json bytes. No GitHub/DB/provider access.
 */
const fs=require("node:fs"),crypto=require("node:crypto");
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,ID=/^(?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[A-Z0-9]+$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_FINAL_REVIEW_MATERIALIZER_"+k)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const canonical=x=>Buffer.from(JSON.stringify(x));
const readJson=(p,requireCanonical=false)=>{const raw=fs.readFileSync(p);let x;try{x=JSON.parse(raw)}catch{need(false,"INVALID_JSON")}
 if(requireCanonical)need(canonical(x).equals(raw),"NONCANONICAL_JSON_"+p.split("/").pop());
 return {raw,x,sha256:sha(raw)}};
function validUtc(x){return typeof x==="string"&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x}
function materialize(mechanical,closure,ledger,input,nowMs=Date.now()){
 need(mechanical?.schema==="v39.phase5.final-core-mechanical-bindings-ready.v1"&&mechanical.phase6PaidGo===false,"MECHANICAL_SCOPE");
 need(closure?.schema==="v39.phase5.final-core-reviewer-closure-matrix.v1"&&closure.phase6PaidGo===false,"CLOSURE_SCOPE");
 need(mechanical.baseCodeSha===closure.baseCodeSha&&mechanical.evidenceCommit===closure.evidenceCommit&&C.test(mechanical.evidenceCommit),"EVIDENCE_IDENTITY");
 const rec=closure.evidenceBackedRecommendations;
 const recKeys=["currentAccountAndBudgetApproved","legacyPublishedAutoCollectVerifiedOff","githubPaidDispatchFlagsVerifiedOff","activeBillableSubscriptionsVerifiedZero","separatePaidDispatchStillRequired"];
 need(rec&&recKeys.every(k=>rec[k]?.recommendedValue===true),"CLOSURE_RECOMMENDATIONS");
 need(ledger?.schema==="v39.phase6.source-enable-approval-ledger.v1"&&Array.isArray(ledger.evidence)&&Array.isArray(ledger.approvals),"LEDGER_SCOPE");
 need(input?.schema==="v39.phase5.final-core-reviewer-decision-input.v1","INPUT_SCHEMA");
 need(input.phase6PaidGo===false&&input.legacyAlertStartApproved===false,"NO_GO_SCOPE");
 need(input.adoptEvidenceBackedRecommendations===true,"RECOMMENDATIONS_NOT_ADOPTED");
 const explicit=["finalPredecessorsApproved","independentScientificFreezeApproved","independentSourceUseApproved","independentOperationalReleaseApproved"];
 need(explicit.every(k=>input[k]===true),"EXPLICIT_DECISIONS_REQUIRED");
 need(typeof input.reviewedBy==="string"&&input.reviewedBy.trim().length>=3&&typeof input.cleanupOwner==="string"&&input.cleanupOwner.trim().length>=6,"REVIEWER_IDENTITY");
 need(/^AUTH-\d{8}-[A-Z0-9]+$/.test(input.authorizationId??""),"AUTH_ID");
 need([input.reviewedAtUtc,input.startNotBeforeUtc,input.expiresAtUtc,input.accountEvidenceValidUntilUtc].every(validUtc),"UTC_WINDOW");
 const reviewed=Date.parse(input.reviewedAtUtc),start=Date.parse(input.startNotBeforeUtc),exp=Date.parse(input.expiresAtUtc),acct=Date.parse(input.accountEvidenceValidUntilUtc);
 need(reviewed<=nowMs&&start<=nowMs&&nowMs<exp&&nowMs<acct&&reviewed>=Date.parse("2026-11-19T03:39:03.000Z")&&nowMs<Date.parse("2026-11-19T23:10:00.000Z"),"CURRENT_WINDOW");
 need(ID.test(input.sourceRightsEvidenceId??"")&&H.test(input.sourceRightsEvidenceSha256??""),"SOURCE_EVIDENCE_IDENTITY");
 const rows=new Map(ledger.evidence.map(r=>[r.evidenceId,r]));
 const sourceRow=rows.get(input.sourceRightsEvidenceId);
 need(sourceRow&&sourceRow.sha256===input.sourceRightsEvidenceSha256,"SOURCE_EVIDENCE_NOT_IN_LEDGER");
 need(typeof sourceRow.path==="string"&&
      /(?:source.*rights|rights.*source|source.*use|provider.*permission|permission.*provider)/i.test(sourceRow.path)&&
      !/(?:NOT_APPROVAL|NO_GO|NOT_RELEASE|NOT_FREEZE|OWNER_DECISION_PRESERVE_F8)/i.test(sourceRow.path),
      "SOURCE_EVIDENCE_NOT_GENUINE_PERMISSION_RECORD");
 const d=JSON.parse(JSON.stringify(mechanical.draftReview));
 need(d?.schema==="v39.phase5.exact-final-core-scope-review.v1"&&d.baseCodeSha===mechanical.baseCodeSha&&d.evidenceCommit===mechanical.evidenceCommit,"DRAFT_SCOPE");
 need(d.phase6PaidGo===false&&d.legacyAlertStartApproved===false&&
      ["finalPredecessorsApproved","independentScientificFreezeApproved","independentSourceUseApproved","independentOperationalReleaseApproved","currentAccountAndBudgetApproved","legacyPublishedAutoCollectVerifiedOff","githubPaidDispatchFlagsVerifiedOff","activeBillableSubscriptionsVerifiedZero","separatePaidDispatchStillRequired"].every(k=>d[k]===false)&&
      ["sourceRightsEvidenceSha256","reviewedBy","reviewedAtUtc","cleanupOwner","authorizationId","startNotBeforeUtc","expiresAtUtc","accountEvidenceValidUntilUtc"].every(k=>d[k]===null),
      "MECHANICAL_DRAFT_NOT_PRISTINE");
 const ids=d.predecessorEvidenceIds;
 need(Array.isArray(ids)&&ids.length>=1&&new Set(ids).size===ids.length&&ids.every(x=>ID.test(x)&&rows.has(x)),"PREDECESSOR_SCOPE");
 need(ids.includes(input.sourceRightsEvidenceId),"SOURCE_EVIDENCE_NOT_A_PREDECESSOR");
 // Every evidence-backed recommendation remains an explicit reviewer adoption:
 // this tool only copies the reviewer's one adoption bit into the five fields.
 Object.assign(d,{
  finalPredecessorsApproved:true,
  independentScientificFreezeApproved:true,
  independentSourceUseApproved:true,
  independentOperationalReleaseApproved:true,
  currentAccountAndBudgetApproved:true,
  legacyPublishedAutoCollectVerifiedOff:true,
  githubPaidDispatchFlagsVerifiedOff:true,
  activeBillableSubscriptionsVerifiedZero:true,
  separatePaidDispatchStillRequired:true,
  sourceRightsEvidenceSha256:input.sourceRightsEvidenceSha256,
  reviewedBy:input.reviewedBy.trim(),
  reviewedAtUtc:input.reviewedAtUtc,
  cleanupOwner:input.cleanupOwner.trim(),
  authorizationId:input.authorizationId,
  startNotBeforeUtc:input.startNotBeforeUtc,
  expiresAtUtc:input.expiresAtUtc,
  accountEvidenceValidUntilUtc:input.accountEvidenceValidUntilUtc,
  phase6PaidGo:false,
  legacyAlertStartApproved:false
 });
 const expectedHashes=[
  "scientificFreezeEvidenceSha256","sourceRightsEvidenceSha256",
  "providerAccountAndBudgetEvidenceSha256","publishedAndGithubStopEvidenceSha256",
  "operationalReleaseEvidenceSha256"
 ];
 need(expectedHashes.every(k=>H.test(d[k]??"")),"FINAL_EVIDENCE_HASHES");
 need(ids.every(id=>rows.has(id))&&expectedHashes.every(k=>ids.some(id=>rows.get(id).sha256===d[k])),"FINAL_EVIDENCE_CLOSURE");
 return d;
}
function run(){
 need(process.argv.length===6,"ARGS");
 const [mechanicalPath,closurePath,ledgerPath,inputPath]=process.argv.slice(2);
 const mechanical=readJson(mechanicalPath).x,closure=readJson(closurePath).x,ledger=readJson(ledgerPath).x,input=readJson(inputPath,true).x;
 const out=materialize(mechanical,closure,ledger,input);
 const raw=canonical(out);
 process.stdout.write(raw);
}
module.exports={materialize,canonical,readJson};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_FINAL_REVIEW_MATERIALIZER_[A-Z0-9_./-]+$/.test(s)?s:"HOLD_P5_FINAL_REVIEW_MATERIALIZER_REDACTED");process.exitCode=2;}
