import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync} from "node:crypto";
import {prepareP6ConditionalPolicyCandidate as prepare} from "../scripts/v39_phase5b_conditional_policy_candidate_v39.mjs";
const sha=b=>createHash("sha256").update(b).digest("hex"),buf=x=>Buffer.from(JSON.stringify(x)),h=x=>sha(x);
const key=generateKeyPairSync("ed25519").publicKey,fp=sha(key.export({type:"spki",format:"der"}));
const start="2026-11-25T00:00:00.000Z",end="2026-12-30T00:00:00.000Z",now="2026-11-27T00:47:29.055Z",effective="2026-11-28T00:00:00.000Z";
const trust={independentStudyTrustPinsApproved:true,reviewedCodeSha:"a".repeat(40),manifestSha256:h("manifest"),calendarSha256:h("calendar"),rightsSha256:h("rights"),releaseSha256:h("release"),dayReviewerFingerprintSha256:h("day"),queryReviewerFingerprintSha256:h("query"),expectedReaderSessionLogin:"fixture"};
const shared={approvedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,rightsSha256:trust.rightsSha256,releaseSha256:trust.releaseSha256,
 configSha256:h("config"),frameSha256:h("frame"),providerContractSha256:h("contract"),reviewedCategoryBudgetSha256:h("budget"),expectedPrepareRole:"fixture",
 budgetReleaseMode:"COST_UPPER_BOUND",reviewed31DaySourceRequestGridSha256:null,reviewedCostEnvelopeSha256:h("cost"),validFromUtc:start,validUntilUtc:end};
const day={schema:"v39.phase6.delegated-later-day-append-review-policy.v1",delegatedAutomatedLaterDayAppendApproved:true,approvedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,rightsSha256:trust.rightsSha256,releaseSha256:trust.releaseSha256,laterReviewerFingerprintSha256:h("later"),dayReviewerFingerprintSha256:trust.dayReviewerFingerprintSha256,queryReviewerFingerprintSha256:trust.queryReviewerFingerprintSha256,maximumIndexRevision:64,validFromUtc:start,validUntilUtc:end};
const p={...shared,schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,nativeLaterReview:{approved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,reviewedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107",laterReviewerFingerprintSha256:h("later"),validFromUtc:start,validUntilUtc:end,selectedTConfig:{semanticsEvidenceSha256:h("semantics")},dayAppendPolicy:day}};
const q={...shared,schema:"v39.phase6.delegated-source-review-policy.v1",delegatedAutomatedSourceSigningApproved:true,queryReviewerFingerprintSha256:trust.queryReviewerFingerprintSha256,registryReviewerFingerprintSha256:trust.dayReviewerFingerprintSha256};
const dailyBytes=buf(p),signingBytes=buf(q),transportBytes=buf({schema:"v39.phase6.approved-nonpaid-source-transport-trust.v1",independentTransportAndSigningScopeApproved:true,reviewedMainSha:trust.reviewedCodeSha,dailyPolicySha256:sha(dailyBytes),signingPolicySha256:sha(signingBytes),expectedReaderSessionLogin:trust.expectedReaderSessionLogin});
const baseDigests={daily:sha(dailyBytes),signing:sha(signingBytes),transport:sha(transportBytes)};
const review={schema:"v39.phase5b.prospective-conditional-commissioning-review.v1",ownerDelegatedTechnicalScopeReviewed:true,protocolSha256:h("protocol"),externalContentUseReviewSha256:h("external"),manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,baseDigests,firstEligibleRunDayIndex:5,effectiveUtc:effective,validUntilUtc:end,standaloneNoT24ProtocolSha256:null};
const prospective={runDayIndex:5,firstRequestUtc:"2026-11-29T15:45:00.000Z",preparationOpensUtc:"2026-11-29T03:45:00.000Z",genesisAbsent:true,preparedQueryCount:0};
const publicPins={laneFingerprintSha256:fp,proofFingerprintSha256:h("proof"),lanePublicKeyBase64:key.export({type:"spki",format:"pem"}).toString().length?Buffer.from(key.export({type:"spki",format:"pem"})).toString("base64"):""};
const inputs={dailyBytes,signingBytes,transportBytes,baseDigests,trust,reviewBytes:buf(review),reviewSha256:sha(buf(review)),publicPins,prospective,observedUtc:now};
test("T088 candidate preserves native and budget bytes, exact review and distinct actual public admissions; no install",()=>{
 const x=prepare(inputs),d=JSON.parse(x.privatePolicyBytes.daily),s=JSON.parse(x.privatePolicyBytes.signing),t=JSON.parse(x.privatePolicyBytes.transport);
 assert.deepEqual(d.nativeLaterReview.dayAppendPolicy,day);
 assert.deepEqual(d.nativeLaterReview.conditionalLaterDayAppendPolicy.conditionalLaterPreScope,d.nativeLaterReview.conditionalT24Scope);
 assert.equal(d.conditionalLaterPermitReview.standaloneNoT24ProtocolSha256,null);
 assert.equal(s.conditionalServicePolicy.firstEligibleRunDayIndex,5);assert.equal(s.reviewedCostEnvelopeSha256,q.reviewedCostEnvelopeSha256);
 assert.equal(t.dailyPolicySha256,sha(x.privatePolicyBytes.daily));assert.equal(t.signingPolicySha256,sha(x.privatePolicyBytes.signing));
 assert.equal(x.githubWrites,0);assert.equal(x.paidGo,false);assert.equal(x.protectedActualReadbackVerified,false);
 assert.doesNotMatch(JSON.stringify(x),/privatePolicyBytes|lanePublicKeyBase64/);
});
test("T088 refuses missing separate review, published day, retrospective clock, drifted bytes and reused signer",()=>{
 for(const delta of [{prospective:{...prospective,preparedQueryCount:1}},{prospective:{...prospective,genesisAbsent:false}},{observedUtc:prospective.preparationOpensUtc},{dailyBytes:Buffer.concat([dailyBytes,Buffer.from(" ")])},{publicPins:{...publicPins,proofFingerprintSha256:fp}}])
  assert.throws(()=>prepare({...inputs,...delta}),/HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_/);
 for(const delta of [{ownerDelegatedTechnicalScopeReviewed:false},{standaloneNoT24ProtocolSha256:h("standalone")},{effectiveUtc:start},{firstEligibleRunDayIndex:4},{rightsSha256:h("wrong")}]){const b=buf({...review,...delta});assert.throws(()=>prepare({...inputs,reviewBytes:b,reviewSha256:sha(b)}),/EXACT_PROSPECTIVE_REVIEW/)}
});
