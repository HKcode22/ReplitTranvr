import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {readFileSync} from "node:fs";
import {prepareP6ConditionalPolicyCandidate as prepare} from "../scripts/v39_phase5b_conditional_policy_candidate_v39.mjs";
const sha=b=>createHash("sha256").update(b).digest("hex"),buf=x=>Buffer.from(JSON.stringify(x)),h=x=>sha(x);
const key=generateKeyPairSync("ed25519").publicKey,fp=sha(key.export({type:"spki",format:"der"}));
const laterKey=generateKeyPairSync("ed25519"),laterFingerprint=sha(laterKey.publicKey.export({type:"spki",format:"der"}));
const start="2026-11-25T00:00:00.000Z",end="2026-12-30T00:00:00.000Z",now="2026-11-27T00:47:29.055Z",effective="2026-11-28T00:00:00.000Z";
const trust={independentStudyTrustPinsApproved:true,reviewedCodeSha:"a".repeat(40),manifestSha256:h("manifest"),calendarSha256:h("calendar"),rightsSha256:h("rights"),releaseSha256:h("release"),dayReviewerFingerprintSha256:h("day"),queryReviewerFingerprintSha256:h("query"),expectedReaderSessionLogin:"fixture"};
const shared={approvedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,rightsSha256:trust.rightsSha256,releaseSha256:trust.releaseSha256,
 configSha256:h("config"),frameSha256:h("frame"),providerContractSha256:h("contract"),reviewedCategoryBudgetSha256:h("budget"),expectedPrepareRole:"fixture",
 budgetReleaseMode:"COST_UPPER_BOUND",reviewed31DaySourceRequestGridSha256:null,reviewedCostEnvelopeSha256:h("cost"),validFromUtc:start,validUntilUtc:end};
const day={schema:"v39.phase6.delegated-later-day-append-review-policy.v1",delegatedAutomatedLaterDayAppendApproved:true,approvedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,calendarSha256:trust.calendarSha256,rightsSha256:trust.rightsSha256,releaseSha256:trust.releaseSha256,laterReviewerFingerprintSha256:laterFingerprint,dayReviewerFingerprintSha256:trust.dayReviewerFingerprintSha256,queryReviewerFingerprintSha256:trust.queryReviewerFingerprintSha256,maximumIndexRevision:64,validFromUtc:start,validUntilUtc:end};
const reviewedPlanBytes=Array.from({length:31},(_,i)=>readFileSync(new URL("../data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json",import.meta.url)));
const dayPlanSha256s=reviewedPlanBytes.map((bytes,i)=>({runDayIndex:i+1,sha256:sha(bytes)}));
const p={...shared,dayPlanSha256s,schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,nativeLaterReview:{approved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,reviewedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107",laterReviewerFingerprintSha256:laterFingerprint,validFromUtc:start,validUntilUtc:end,frameSha256:shared.frameSha256,configSha256:shared.configSha256,maximumPrivateRetentionHours:24,selectedTConfig:{semanticsEvidenceSha256:h("semantics"),verifiedProviderNativeSchedule:true,milestone:"departure.scheduledTime.utc",version:"v1",artifactHash:h("artifact")},dayAppendPolicy:day}};
const q={...shared,schema:"v39.phase6.delegated-source-review-policy.v1",delegatedAutomatedSourceSigningApproved:true,queryReviewerFingerprintSha256:trust.queryReviewerFingerprintSha256,registryReviewerFingerprintSha256:trust.dayReviewerFingerprintSha256};
const dailyBytes=buf(p),signingBytes=buf(q),transportBytes=buf({schema:"v39.phase6.approved-nonpaid-source-transport-trust.v1",independentTransportAndSigningScopeApproved:true,reviewedMainSha:trust.reviewedCodeSha,dailyPolicySha256:sha(dailyBytes),signingPolicySha256:sha(signingBytes),expectedReaderSessionLogin:trust.expectedReaderSessionLogin,minimumPreparationLeadMinutes:20,maximumPreparationLookaheadMinutes:720});
const baseDigests={daily:sha(dailyBytes),signing:sha(signingBytes),transport:sha(transportBytes)};
const review={schema:"v39.phase5b.prospective-conditional-commissioning-review.v1",ownerDelegatedTechnicalScopeReviewed:true,protocolSha256:h("protocol"),externalContentUseReviewSha256:h("external"),manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,baseDigests,firstEligibleRunDayIndex:5,effectiveUtc:effective,validUntilUtc:end,standaloneNoT24ProtocolSha256:null};
const prospective={runDayIndex:5,firstRequestUtc:"2026-11-29T15:45:00.000Z",preparationOpensUtc:"2026-11-29T03:45:00.000Z",genesisAbsent:true,preparedQueryCount:0};
const publicPins={laneFingerprintSha256:fp,proofFingerprintSha256:h("proof"),lanePublicKeyBase64:key.export({type:"spki",format:"pem"}).toString().length?Buffer.from(key.export({type:"spki",format:"pem"})).toString("base64"):""};
const inputs={dailyBytes,signingBytes,transportBytes,baseDigests,trust,reviewBytes:buf(review),reviewSha256:sha(buf(review)),publicPins,prospective,observedUtc:now,reviewedPlanBytes};
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

test("T089 exact checked-in 31-plan bytes bind preparation clock and cover all prospective conditional days",()=>{
 const result=prepare(inputs);
 const last=Math.max(...reviewedPlanBytes.slice(4).flatMap(b=>JSON.parse(b).templates.map(t=>Date.parse(t.serviceWindowEndUtc))));
 assert.equal(result.reviewedConditionalThroughUtc,new Date(last).toISOString());
 const drift=[...reviewedPlanBytes];drift[4]=Buffer.concat([drift[4],Buffer.from(" ")]);
 assert.throws(()=>prepare({...inputs,reviewedPlanBytes:drift}),/HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_BASE_BYTES/);
 assert.throws(()=>prepare({...inputs,reviewedPlanBytes:reviewedPlanBytes.slice(0,30)}),/REVIEWED_PLAN_PINS/);
 assert.throws(()=>prepare({...inputs,prospective:{...prospective,firstRequestUtc:"2026-11-29T15:46:00.000Z",preparationOpensUtc:"2026-11-29T03:46:00.000Z"}}),/REVIEWED_PLAN_CLOCK/);
 const b=buf({...review,validUntilUtc:"2026-11-30T23:00:00.000Z"});
 assert.throws(()=>prepare({...inputs,reviewBytes:b,reviewSha256:sha(b)}),/REVIEWED_PLAN_INTERVAL/);
});

import {deriveP6NativeT24PolicyTransition,matchesP6T24RegistryPolicyDigest,verifyP6T24PrivateRegistry,p6T24RegistryReviewPreimage} from "../server/lib/disruption/phase6PrivateT24RegistryTransport_v39.mjs";
import {requireP6ConditionalPreflightClock} from "../scripts/v39_phase6_stored_source_postcommit_native_later_v39.mjs";
test("T095 exact additive successor retains only earlier native registry digest",()=>{
 const x=prepare(inputs),d=JSON.parse(x.privatePolicyBytes.daily),transition=deriveP6NativeT24PolicyTransition(d);
 assert.equal(transition.previousDailyPolicySha256,baseDigests.daily);
 const trust={expectedT24PolicySha256:x.dailySha256,nativeT24PolicyTransition:transition};
 const old={policySha256:baseDigests.daily,runDayIndex:4};
 assert.equal(matchesP6T24RegistryPolicyDigest(trust,old,false),true);
 assert.equal(matchesP6T24RegistryPolicyDigest(trust,old,true),false);
 assert.equal(matchesP6T24RegistryPolicyDigest(trust,{...old,runDayIndex:5},false),false);
 assert.equal(matchesP6T24RegistryPolicyDigest(trust,{...old,policySha256:h("wrong")},false),false);
 assert.equal(matchesP6T24RegistryPolicyDigest(trust,{...old,policySha256:x.dailySha256,runDayIndex:5},true),true);
 assert.equal(matchesP6T24RegistryPolicyDigest({expectedT24PolicySha256:x.dailySha256},old,false),false);
 assert.throws(()=>deriveP6NativeT24PolicyTransition({...d,frameSha256:h("changed")}),/PREDECESSOR_BYTES_DRIFT/);
 assert.equal(deriveP6NativeT24PolicyTransition(p),undefined);
});
test("T096 earlier native day does not inherit future conditional clock",()=>{
 const d=JSON.parse(prepare(inputs).privatePolicyBytes.daily);
 const scope={nativeT24PolicyTransition:deriveP6NativeT24PolicyTransition(d),c:{selector:{runDayIndex:4}},conditionalT24Reviewer:d.conditionalT24PermitReview,conditionalLaterReviewer:d.conditionalLaterPermitReview};
 assert.doesNotThrow(()=>requireP6ConditionalPreflightClock(scope,now,false));
 const marked={...scope,c:{selector:{runDayIndex:5}}};
 assert.throws(()=>requireP6ConditionalPreflightClock(marked,now,false),/CONDITIONAL_T24_REVIEWER_CLOCK/);
 assert.doesNotThrow(()=>requireP6ConditionalPreflightClock(marked,effective,false));
 assert.throws(()=>requireP6ConditionalPreflightClock(marked,end,false),/CONDITIONAL_T24_REVIEWER_CLOCK/);
 assert.throws(()=>requireP6ConditionalPreflightClock({...scope,nativeT24PolicyTransition:undefined},now,false),/CONDITIONAL_T24_REVIEWER_CLOCK/);
});

import {deriveP6T24QueueTrust} from "../server/lib/disruption/phase6PrivateT24QueueRouting_v39.mjs";
test("T095 actual registry verifier retains an intact Ed25519 native predecessor wire and rejects tampering",()=>{
 const candidate=prepare(inputs),pem=laterKey.publicKey.export({type:"spki",format:"pem"}).toString();
 const oldTrust=deriveP6T24QueueTrust({trust,policyBytes:dailyBytes,expectedPolicySha256:baseDigests.daily,reviewerPublicKeyPem:pem});
 const newTrust=deriveP6T24QueueTrust({trust,policyBytes:candidate.privatePolicyBytes.daily,expectedPolicySha256:candidate.dailySha256,reviewerPublicKeyPem:pem});
 const query=h("query-id"),sourcePath="data-collection/phase5/frozen/source_fixture_01.json",sourceEvidence=h("source-review");
 const source=buf({schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",manifestSha256:trust.manifestSha256,runDayIndex:4,entries:[{expectedQueryDigestSha256:query}]});
 const parsed={runDayIndex:4,manifestSha256:trust.manifestSha256,reviewedCodeSha:trust.reviewedCodeSha,reviewedRightsSha256:trust.rightsSha256,reviewedReleaseSha256:trust.releaseSha256,calendarSha256:trust.calendarSha256,entries:[{lane:"SOURCE",filePath:sourcePath,fileSha256:sha(source),reviewEvidenceSha256:sourceEvidence}]};
 const indexBytes=buf(parsed),index={redactedSummary:{status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH",externalEd25519ReviewerVerified:true,restrictedPrivatePg16ReaderVerified:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false,runDayIndex:4,indexSha256:sha(indexBytes)}};
 Object.defineProperties(index,{privateCurrentIndexBytes:{value:indexBytes},privateParsedIndex:{value:parsed},getFrozen:{value:path=>{assert.equal(path,sourcePath);return source;}}});
 const registry={schema:"v39.phase6.native-t24-private-registry.v1",runDayIndex:4,shardIndex:1,reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,releaseSha256:trust.releaseSha256,sourceRegistryPath:sourcePath,sourceRegistrySha256:sha(source),sourceReviewEvidenceSha256:sourceEvidence,entries:[{filePath:"data-collection/phase5/frozen/t24p_fixture_01.json",packetSha256:h("packet"),flightInstanceId:"leg:native:fixture",queryDigestSha256:query,selectedTNativeUtc:"2026-11-28T12:00:00.000Z",cutoffUtc:"2026-11-27T12:00:00.000Z"}]};
 const registryBytes=buf(registry),reviewWire={schema:"v39.phase6.native-t24-registry-ed25519.v1",audience:"HKcode22/ReplitTranvr:PHASE6_T24_NATIVE_PRE_REGISTRY_ONLY",logicalPath:"data-collection/phase5/frozen/t24r_fixture_01.json",runDayIndex:4,shardIndex:1,registrySha256:sha(registryBytes),reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,releaseSha256:trust.releaseSha256,policySha256:baseDigests.daily,reviewedAtUtc:"2026-11-27T10:00:00.000Z",validUntilUtc:"2026-11-27T13:00:00.000Z",retentionNotAfterUtc:"2026-11-27T14:00:00.000Z",reviewerFingerprintSha256:laterFingerprint};
 const wire={review:reviewWire,signatureBase64:sign(null,p6T24RegistryReviewPreimage(reviewWire),laterKey.privateKey).toString("base64")};
 const args={index,registryBytes,wire,observedDbClockUtc:"2026-11-27T11:00:00.000Z"};
 assert.deepEqual(verifyP6T24PrivateRegistry({...args,trust:oldTrust}).reg,registry);
 assert.deepEqual(verifyP6T24PrivateRegistry({...args,trust:newTrust}).reg,registry);
 assert.throws(()=>verifyP6T24PrivateRegistry({...args,trust:{...newTrust,nativeT24PolicyTransition:undefined}}),/REGISTRY_WIRE_OR_STUDY_SCOPE_DRIFT/);
 assert.throws(()=>verifyP6T24PrivateRegistry({...args,trust:newTrust,wire:{...wire,review:{...reviewWire,policySha256:candidate.dailySha256}}}),/REGISTRY_SIGNATURE_INVALID/);
 assert.throws(()=>verifyP6T24PrivateRegistry({...args,trust:newTrust,observedDbClockUtc:reviewWire.validUntilUtc}),/REGISTRY_SIGNATURE_EXPIRED_OR_FUTURE/);
});
