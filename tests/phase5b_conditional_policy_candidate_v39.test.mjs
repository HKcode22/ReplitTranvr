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
const p={...shared,dayPlanSha256s,schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,nativePreFeatureReview:{approved:true,rightsSha256:trust.rightsSha256,externalContentUseReviewSha256:h("native-external")},nativeLaterReview:{approved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,reviewedWitnessOnlyRole:"phase5_fids_t24_witness_prod_20261107",laterReviewerFingerprintSha256:laterFingerprint,validFromUtc:start,validUntilUtc:end,frameSha256:shared.frameSha256,configSha256:shared.configSha256,maximumPrivateRetentionHours:24,selectedTConfig:{semanticsEvidenceSha256:h("semantics"),verifiedProviderNativeSchedule:true,milestone:"departure.scheduledTime.utc",version:"v1",artifactHash:h("artifact")},dayAppendPolicy:day}};
const q={...shared,schema:"v39.phase6.delegated-source-review-policy.v1",delegatedAutomatedSourceSigningApproved:true,queryReviewerFingerprintSha256:trust.queryReviewerFingerprintSha256,registryReviewerFingerprintSha256:trust.dayReviewerFingerprintSha256};
const dailyBytes=buf(p),signingBytes=buf(q),transportBytes=buf({schema:"v39.phase6.approved-nonpaid-source-transport-trust.v1",independentTransportAndSigningScopeApproved:true,reviewedMainSha:trust.reviewedCodeSha,dailyPolicySha256:sha(dailyBytes),signingPolicySha256:sha(signingBytes),expectedReaderSessionLogin:trust.expectedReaderSessionLogin,minimumPreparationLeadMinutes:20,maximumPreparationLookaheadMinutes:720});
const baseDigests={daily:sha(dailyBytes),signing:sha(signingBytes),transport:sha(transportBytes)};
const review={schema:"v39.phase5b.prospective-conditional-commissioning-review.v1",ownerDelegatedTechnicalScopeReviewed:true,protocolSha256:h("protocol"),externalContentUseReviewSha256:h("external"),manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,baseDigests,firstEligibleRunDayIndex:5,effectiveUtc:effective,validUntilUtc:end,standaloneNoT24ProtocolSha256:null};
const prospective={runDayIndex:5,firstRequestUtc:"2026-11-29T15:45:00.000Z",preparationOpensUtc:"2026-11-29T03:45:00.000Z",genesisAbsent:true,preparedQueryCount:0};
const proofKey=generateKeyPairSync("ed25519").publicKey;
const publicPins={laneFingerprintSha256:fp,proofFingerprintSha256:sha(proofKey.export({type:"spki",format:"der"})),
 lanePublicKeyBase64:Buffer.from(key.export({type:"spki",format:"pem"})).toString("base64"),
 proofPublicKeyBase64:Buffer.from(proofKey.export({type:"spki",format:"pem"})).toString("base64")};
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

test("T107 candidate validates actual proof public key, not an arbitrary distinct digest",()=>{
 assert.equal(prepare(inputs).paidGo,false);
 const wrong=generateKeyPairSync("ed25519").publicKey;
 for(const delta of [{proofPublicKeyBase64:undefined},{proofPublicKeyBase64:"not-base64"},{proofFingerprintSha256:h("unbound-proof")},
  {proofPublicKeyBase64:Buffer.from(wrong.export({type:"spki",format:"pem"})).toString("base64")},
  {proofPublicKeyBase64:publicPins.lanePublicKeyBase64}])
  assert.throws(()=>prepare({...inputs,publicPins:{...publicPins,...delta}}),/EXISTING_PUBLIC_ACTOR_PINS/);
});

test("T109 candidate must preserve an actually valid native feature review",()=>{
 for(const feature of [undefined,null,{approved:true,rightsSha256:h("wrong"),externalContentUseReviewSha256:h("native-external")},
  {approved:true,rightsSha256:trust.rightsSha256,externalContentUseReviewSha256:"invalid"},
  {...p.nativePreFeatureReview,approved:false}]){
  const changed={...p,nativePreFeatureReview:feature},daily=buf(changed),dailySha=sha(daily);
  const transport=buf({...JSON.parse(transportBytes),dailyPolicySha256:dailySha});
  const digests={...baseDigests,daily:dailySha,transport:sha(transport)};
  const wire=buf({...review,baseDigests:digests});
  assert.throws(()=>prepare({...inputs,dailyBytes:daily,transportBytes:transport,baseDigests:digests,reviewBytes:wire,reviewSha256:sha(wire)}),/EXACT_BASE_POLICY/);
 }
 const result=prepare(inputs);
 assert.deepEqual(JSON.parse(result.privatePolicyBytes.daily).nativePreFeatureReview,p.nativePreFeatureReview);
});

import {previewP6ConditionalCandidateFromCommitment as preview} from "../scripts/v39_phase5b_conditional_policy_candidate_v39.mjs";
test("T117 protected composite review binds actual predecessor, exact decision and prospective plans without private output",()=>{
 const commitment=h(JSON.stringify({schema:"v39.phase5b.custody-base-commitment.v1",...baseDigests}));
 const custody={status:"P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY",prospective,observedDbClockUtc:now,basePolicyCommitmentSha256:commitment,
  exactThreePolicyDigestsValidated:true,exact31PlanPinsValidated:true,canonicalNativePredecessorBytes:true,nativePolicyPresent:true,baseIntervalCoversRemainingStudy:true,publicActorsVerified:true,
  conditionalPolicyFieldState:"ABSENT",signingOrPublishingCapabilityPresent:false,actualConditionalPolicyInstalledVerified:false,actualConditionalPreCommitVerified:false,
  providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false};
 const {baseDigests:unused,...rest}=review;
 const decision={...rest,schema:"v39.phase5b.prospective-conditional-commissioning-commitment-review.v1",basePolicyCommitmentSha256:commitment};
 const bytes=buf(decision),args={...inputs,custody,reviewBytes:bytes,reviewSha256:sha(bytes)};
 const result=preview(args),expected=prepare(inputs);
 assert.equal(result.status,"CONDITIONAL_POLICY_CANDIDATE_PREVIEW_NOT_INSTALLED");
 assert.equal(result.candidateCommitmentSha256,h(JSON.stringify({schema:"v39.phase5b.custody-candidate-commitment.v1",daily:expected.dailySha256,signing:expected.signingSha256,transport:expected.transportSha256})));
 assert.equal(result.actualConditionalPolicyInstalledVerified,false);assert.equal(result.signaturesIssued,0);
 for(const value of [...Object.values(baseDigests),expected.dailySha256,expected.signingSha256,expected.transportSha256])assert(!JSON.stringify(result).includes(value));
 assert.equal(result.privatePolicyBytes,undefined);
 for(const delta of [{custody:{...custody,conditionalPolicyFieldState:"PARTIAL_HOLD"}},{custody:{...custody,basePolicyCommitmentSha256:h("wrong")}},{custody:{...custody,observedDbClockUtc:prospective.preparationOpensUtc}},{custody:{...custody,signingOrPublishingCapabilityPresent:true}},{dailyBytes:Buffer.concat([dailyBytes,Buffer.from(" ")])},{reviewSha256:h("unreviewed")}])
  assert.throws(()=>preview({...args,...delta}),/HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_/);
 const bad=buf({...decision,standaloneNoT24ProtocolSha256:h("unapproved")});
 assert.throws(()=>preview({...args,reviewBytes:bad,reviewSha256:sha(bad)}),/EXACT_PROSPECTIVE_REVIEW/);
});


import {prepareP6ConditionalSuccessorStageFromCommitment as prepareStage} from "../scripts/v39_phase5b_conditional_policy_candidate_v39.mjs";
import {admitP6ConditionalInstallAction,buildP6ConditionalSuccessorStagePlan,stageP6ConditionalSuccessor,verifyP6ConditionalSuccessorReadback,P6_CONDITIONAL_INSTALL_ACTIONS as CA,P6_CONDITIONAL_SUCCESSOR_SECRET_NAMES,p6ConditionalCommitment} from "../scripts/v39_phase5b_conditional_policy_install_v39.mjs";
test("T133 staged successor uses exact protected preview, retains native base and refuses unsafe or ambiguous activation",()=>{
 const base=p6ConditionalCommitment("base",baseDigests),{baseDigests:unused,...rest}=review;
 const decision={...rest,schema:"v39.phase5b.prospective-conditional-commissioning-commitment-review.v1",basePolicyCommitmentSha256:base};
 const reviewBytes=buf(decision),reviewSha256=sha(reviewBytes);
 const custody={status:"P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY",prospective,observedDbClockUtc:now,basePolicyCommitmentSha256:base,
  exactThreePolicyDigestsValidated:true,exact31PlanPinsValidated:true,canonicalNativePredecessorBytes:true,nativePolicyPresent:true,baseIntervalCoversRemainingStudy:true,publicActorsVerified:true,
  conditionalPolicyFieldState:"ABSENT",signingOrPublishingCapabilityPresent:false,actualConditionalPolicyInstalledVerified:false,actualConditionalPreCommitVerified:false,
  providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false};
 const args={...inputs,custody,reviewBytes,reviewSha256},pv=preview(args),expected=pv.candidateCommitmentSha256;
 assert.throws(()=>prepareStage(args,h("wrong")),/EXPECTED_CANDIDATE_COMMITMENT_DRIFT/);
 const candidate=prepareStage(args,expected),plan=buildP6ConditionalSuccessorStagePlan(candidate,expected);
 assert.equal(plan.secretCount,6);assert.deepEqual(plan.privateWrites.map(x=>x.name),P6_CONDITIONAL_SUCCESSOR_SECRET_NAMES);
 assert.doesNotMatch(JSON.stringify(plan),/privateWrites/);
 assert.throws(()=>buildP6ConditionalSuccessorStagePlan(pv,expected),/SECRET_BYTES_CAPACITY/);
 const env={GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_ACTOR:"HKcode22",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:"a".repeat(40),
  P6_PHASE5B_CONDITIONAL_INSTALL_ACTION:CA.STAGE,P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN:"github_pat_"+"a".repeat(64),
  P6_PHASE5B_CONDITIONAL_EXPECTED_CANDIDATE_SHA256:expected,P6_PHASE5B_CONDITIONAL_REVIEW_PROTOCOL_SHA256:decision.protocolSha256,
  P6_CONDITIONAL_COMMITMENT_REVIEW_SHA256:reviewSha256,P6_CONDITIONAL_COMMITMENT_REVIEW_BASE64:reviewBytes.toString("base64")};
 const names=P6_CONDITIONAL_SUCCESSOR_SECRET_NAMES.map(n=>n.replace("P6_PHASE5B_CONDITIONAL_","P6_NONPAID_")),writes=[];
 const transportFactory=()=>({owner:()=>"HKcode22",repoNames:()=>names,environmentNames:()=>[],set:(n,v)=>writes.push([n,v])});
 const run=(e=env,f=transportFactory)=>stageP6ConditionalSuccessor({env:e,candidate,review:decision,transportFactory:f});
 for(const change of [{GITHUB_ACTOR:"other"},{P6_PHASE5B_CONDITIONAL_ACTIVE_PROTOCOL_SHA256:decision.protocolSha256},
  {P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:decision.protocolSha256},{P6_CONDITIONAL_LATER_METADATA_READ_ENABLED:"1"},
  {P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN:"ghp_fixture"},{P6_PHASE5B_CONDITIONAL_EXPECTED_CANDIDATE_SHA256:h("wrong")}])
  assert.throws(()=>run({...env,...change}),/HOLD_P6_CONDITIONAL_INSTALL_/);
 assert.equal(writes.length,0);
 assert.throws(()=>run(env,()=>({...transportFactory(),environmentNames:()=>[names[0]]})),/SECRET_SCOPE_CAPACITY_OR_SHADOW/);
 assert.equal(writes.length,0);
 const partial=run(env,()=>({...transportFactory(),set:(n,v)=>{if(writes.length===2)throw Error("private failure");writes.push([n,v]);}}));
 assert.equal(partial.acknowledgedSecretWrites,2);assert.equal(partial.activeSelectorChanged,false);
 assert.match(partial.status,/HOLD_/);assert.doesNotMatch(JSON.stringify(partial),/private failure/);
 writes.length=0;const complete=run();assert.equal(complete.acknowledgedSecretWrites,6);
 assert.deepEqual(writes.map(x=>x[0]),P6_CONDITIONAL_SUCCESSOR_SECRET_NAMES);assert.equal(complete.actualConditionalPolicyInstalledVerified,false);
 const cp=JSON.parse(candidate.privatePolicyBytes.daily),cq=JSON.parse(candidate.privatePolicyBytes.signing);
 const readbackEnv={...env,P6_PHASE5B_CONDITIONAL_INSTALL_ACTION:CA.VERIFY_STAGED,P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN:"",
  P6_NONPAID_DAILY_POLICY_SHA256:sha(candidate.privatePolicyBytes.daily),P6_NONPAID_SIGNING_POLICY_SHA256:sha(candidate.privatePolicyBytes.signing),
  P6_NONPAID_TRANSPORT_TRUST_SHA256:sha(candidate.privatePolicyBytes.transport),
  P6_PHASE5B_BASE_DAILY_SHA256:baseDigests.daily,P6_PHASE5B_BASE_SIGNING_SHA256:baseDigests.signing,P6_PHASE5B_BASE_TRANSPORT_SHA256:baseDigests.transport,
  P6_CONDITIONAL_LATER_METADATA_READ_ENABLED:"1",P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:decision.protocolSha256,
  P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64:publicPins.lanePublicKeyBase64,
  P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256:publicPins.laneFingerprintSha256,
  P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:publicPins.proofFingerprintSha256};
 const receipt={...custody,conditionalPolicyFieldState:"ALL_FIELDS_PRESENT_NOT_COMMISSIONED_PROOF",conditionalProtocolVarMatchesPolicy:true,conditionalMetadataEnabled:true};
 const read=(e=readbackEnv,patch={})=>verifyP6ConditionalSuccessorReadback({ctx:{p:cp,q:cq,trust,...patch},receipt,review:decision,env:e});
 assert.equal(read().actualConditionalPolicyStagedVerified,true);assert.equal(read().actualConditionalPolicyInstalledVerified,false);
 assert.equal(read({...readbackEnv,P6_PHASE5B_CONDITIONAL_INSTALL_ACTION:CA.VERIFY_ACTIVE,P6_PHASE5B_CONDITIONAL_ACTIVE_PROTOCOL_SHA256:decision.protocolSha256}).actualConditionalPolicyInstalledVerified,true);
 assert.throws(()=>read({...readbackEnv,P6_PHASE5B_CONDITIONAL_INSTALL_ACTION:CA.VERIFY_ACTIVE}),/ACTIVE_SELECTOR_DRIFT/);
 assert.throws(()=>read({...readbackEnv,P6_NONPAID_SIGNING_POLICY_SHA256:h("wrong")}),/READBACK_COMMITMENT_OR_SCOPE_DRIFT/);
 assert.throws(()=>read({...readbackEnv,P6_PHASE5B_BASE_DAILY_SHA256:h("wrong")}),/READBACK_COMMITMENT_OR_SCOPE_DRIFT/);
 assert.throws(()=>read({...readbackEnv,P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN:env.P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN}),/READBACK_WRITE_CAPABILITY_FORBIDDEN/);
 assert.throws(()=>admitP6ConditionalInstallAction({...env,P6_PHASE5B_CONDITIONAL_INSTALL_ACTION:CA.PREVIEW},"conditional_custody"),/PREVIEW_SCOPE/);
});

import {previewP6ConditionalDerivationRecipe,deriveP6ConditionalPolicyFromReviewedRecipe} from "../scripts/v39_phase5b_conditional_policy_candidate_v39.mjs";
test("T144 tokenless deterministic recipe reproduces exact protected preview bytes without replaying custody clocks",()=>{
 const base=p6ConditionalCommitment("base",baseDigests),{baseDigests:unused,...rest}=review;
 const decision={...rest,schema:"v39.phase5b.prospective-conditional-commissioning-commitment-review.v1",basePolicyCommitmentSha256:base};
 const reviewBytes=buf(decision),reviewSha256=sha(reviewBytes);
 const custody={status:"P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY",prospective,observedDbClockUtc:now,basePolicyCommitmentSha256:base,
  exactThreePolicyDigestsValidated:true,exact31PlanPinsValidated:true,canonicalNativePredecessorBytes:true,nativePolicyPresent:true,baseIntervalCoversRemainingStudy:true,publicActorsVerified:true,
  conditionalPolicyFieldState:"ABSENT",signingOrPublishingCapabilityPresent:false,actualConditionalPolicyInstalledVerified:false,actualConditionalPreCommitVerified:false,
  providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false};
 const args={...inputs,custody,reviewBytes,reviewSha256},pv=preview(args),expected=prepare(inputs);
 const x=previewP6ConditionalDerivationRecipe(args);
 assert.equal(x.recipe.candidateCommitmentSha256,pv.candidateCommitmentSha256);
 assert.equal(x.actualConditionalPolicyInstalledVerified,false);assert.equal(x.githubWrites,0);
 for(const d of [...Object.values(baseDigests),expected.dailySha256,expected.signingSha256,expected.transportSha256,fp])
  assert(!JSON.stringify(x).includes(d));
 const shared={reviewBytes,recipe:x.recipe,expectedRecipeSha256:x.recipeSha256};
 const daily={...shared,kind:"daily",baseBytes:dailyBytes,expectedBaseSha256:baseDigests.daily,laneFingerprintSha256:fp};
 const signing={...shared,kind:"signing",baseBytes:signingBytes,expectedBaseSha256:baseDigests.signing};
 const db=deriveP6ConditionalPolicyFromReviewedRecipe(daily),sb=deriveP6ConditionalPolicyFromReviewedRecipe(signing);
 assert.deepEqual(db,expected.privatePolicyBytes.daily);assert.deepEqual(sb,expected.privatePolicyBytes.signing);
 const transport={...shared,kind:"transport",baseBytes:transportBytes,expectedBaseSha256:baseDigests.transport,derivedDailyBytes:db,derivedSigningBytes:sb};
 assert.deepEqual(deriveP6ConditionalPolicyFromReviewedRecipe(transport),expected.privatePolicyBytes.transport);
 for(const wrong of [{...daily,laneFingerprintSha256:h("wrong actor")},{...daily,expectedRecipeSha256:h("wrong recipe")},
  {...daily,reviewBytes:buf({...decision,firstEligibleRunDayIndex:6})},{...daily,baseBytes:buf({...p,frameSha256:h("wrong frame")}),expectedBaseSha256:sha(buf({...p,frameSha256:h("wrong frame")}))},
  {...transport,derivedDailyBytes:dailyBytes},{...transport,derivedSigningBytes:signingBytes}])
  assert.throws(()=>deriveP6ConditionalPolicyFromReviewedRecipe(wrong),/HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_/);
 assert.throws(()=>previewP6ConditionalDerivationRecipe({...args,custody:{...custody,observedDbClockUtc:prospective.preparationOpensUtc}}),/HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_/);
});

import {deriveP6ConditionalRuntimeEnvironment} from "../scripts/v39_phase5b_conditional_policy_derivation_v39.mjs";
test("T145 tokenless protected consumers derive only their existing policy, staged and active never overlap",()=>{
 const base=p6ConditionalCommitment("base",baseDigests),{baseDigests:unused,...rest}=review;
 const decision={...rest,schema:"v39.phase5b.prospective-conditional-commissioning-commitment-review.v1",basePolicyCommitmentSha256:base};
 const reviewBytes=buf(decision),reviewSha256=sha(reviewBytes);
 const custody={status:"P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY",prospective,observedDbClockUtc:now,basePolicyCommitmentSha256:base,
  exactThreePolicyDigestsValidated:true,exact31PlanPinsValidated:true,canonicalNativePredecessorBytes:true,nativePolicyPresent:true,baseIntervalCoversRemainingStudy:true,publicActorsVerified:true,
  conditionalPolicyFieldState:"ABSENT",signingOrPublishingCapabilityPresent:false,actualConditionalPolicyInstalledVerified:false,actualConditionalPreCommitVerified:false,
  providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false};
 const x=previewP6ConditionalDerivationRecipe({...inputs,custody,reviewBytes,reviewSha256}),candidate=prepare(inputs);
 const approval=buf({schema:"v39.phase5b.conditional-derivation-approval.v1",reviewBase64:reviewBytes.toString("base64"),recipe:x.recipe,recipeSha256:x.recipeSha256}).toString("base64");
 const daily={P6_NONPAID_DAILY_POLICY_BASE64:dailyBytes.toString("base64"),P6_NONPAID_DAILY_POLICY_SHA256:baseDigests.daily,
  P6_PHASE5B_DERIVATION_LANE_FINGERPRINT_SHA256:fp,P6_PHASE5B_DERIVATION_EXECUTABLE_SHA:"c".repeat(40),
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"c".repeat(40),
  P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:"",P6_CONDITIONAL_LATER_METADATA_READ_ENABLED:""};
 const active={...daily,P6_PHASE5B_DERIVATION_APPROVAL_BASE64:approval};
 const target="scripts/v39_phase6_private_t24_restartable_enrollment_v39.mjs",full="scripts/v39_phase6_nonpaid_source_day_github_runtime_v39.mjs";
 const a=deriveP6ConditionalRuntimeEnvironment(active,target);
 assert.equal(a.env.P6_NONPAID_DAILY_POLICY_BASE64,candidate.privatePolicyBytes.daily.toString("base64"));assert.equal(a.env.P6_NONPAID_DAILY_POLICY_SHA256,candidate.dailySha256);
 assert.equal(a.env.P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256,decision.protocolSha256);assert.equal(a.env.P6_CONDITIONAL_LATER_METADATA_READ_ENABLED,"1");
 assert.equal(a.env.P6_NONPAID_SIGNING_POLICY_BASE64,undefined);assert.equal(a.env.P6_NONPAID_TRANSPORT_TRUST_BASE64,undefined);
 assert.equal(a.env.P6_PHASE5B_DERIVATION_APPROVAL_BASE64,undefined);assert.equal(a.maskValues.length,2);
 const inactive=deriveP6ConditionalRuntimeEnvironment(daily,target);assert.equal(inactive.derived,false);assert.equal(inactive.env.P6_NONPAID_DAILY_POLICY_BASE64,daily.P6_NONPAID_DAILY_POLICY_BASE64);
 const all={...daily,P6_NONPAID_SIGNING_POLICY_BASE64:signingBytes.toString("base64"),P6_NONPAID_SIGNING_POLICY_SHA256:baseDigests.signing,
  P6_NONPAID_TRANSPORT_TRUST_BASE64:transportBytes.toString("base64"),P6_NONPAID_TRANSPORT_TRUST_SHA256:baseDigests.transport,
  P6_NONPAID_SOURCE_CONFIRM:"VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_ACTOR:"HKcode22",
  P6_CONDITIONAL_COMMITMENT_REVIEW_BASE64:reviewBytes.toString("base64"),P6_CONDITIONAL_COMMITMENT_REVIEW_SHA256:reviewSha256,
  P6_PHASE5B_CONDITIONAL_EXPECTED_CANDIDATE_SHA256:x.recipe.candidateCommitmentSha256,P6_PHASE5B_CONDITIONAL_REVIEW_PROTOCOL_SHA256:decision.protocolSha256};
 const stageEnv={...all,P6_PHASE5B_DERIVATION_STAGED_APPROVAL_BASE64:approval,P6_PHASE5B_CONDITIONAL_INSTALL_ACTION:"VERIFY_STAGED_CONDITIONAL_SUCCESSOR"};
 const staged=deriveP6ConditionalRuntimeEnvironment(stageEnv,full);
 assert.equal(staged.env.P6_PHASE5B_CONDITIONAL_ACTIVE_PROTOCOL_SHA256,undefined);
 assert.equal(staged.env.P6_PHASE5B_DERIVATION_READBACK_MODE,"INACTIVE_RECIPE");
 assert.equal(staged.env.P6_NONPAID_TRANSPORT_TRUST_SHA256,candidate.transportSha256);assert.equal(staged.maskValues.length,6);
 const activeEnv={...all,P6_PHASE5B_DERIVATION_APPROVAL_BASE64:approval,P6_PHASE5B_CONDITIONAL_INSTALL_ACTION:"VERIFY_ACTIVE_CONDITIONAL_SUCCESSOR"};
 assert.equal(deriveP6ConditionalRuntimeEnvironment(activeEnv,full).env.P6_PHASE5B_CONDITIONAL_ACTIVE_PROTOCOL_SHA256,decision.protocolSha256);
 assert.equal(deriveP6ConditionalRuntimeEnvironment(activeEnv,full).env.P6_PHASE5B_DERIVATION_READBACK_MODE,"ACTIVE_RECIPE");
 assert.equal(deriveP6ConditionalRuntimeEnvironment({...daily,P6_PHASE5B_DERIVATION_READBACK_MODE:"ACTIVE_RECIPE"},target).env.P6_PHASE5B_DERIVATION_READBACK_MODE,undefined);
 for(const bad of [{...active,GITHUB_SHA:"d".repeat(40)},{...active,P6_PHASE5B_DERIVATION_LEGACY_SELECTOR:decision.protocolSha256},
  {...active,P6_PHASE5B_DERIVATION_LANE_FINGERPRINT_SHA256:h("wrong actor")},{...active,P6_NONPAID_DAILY_POLICY_BASE64:""},
  {...active,P6_CONDITIONAL_SERVICE_PROTOCOL_SHA256:h("drift")},{...active,P6_PHASE5B_DERIVATION_STAGED_APPROVAL_BASE64:approval}])
  assert.throws(()=>deriveP6ConditionalRuntimeEnvironment(bad,target),/HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_/);
 for(const bad of [{...stageEnv,P6_PHASE5B_CONDITIONAL_INSTALL_ACTION:"STAGE_EXACT_REVIEWED_CONDITIONAL_SUCCESSOR"},{...stageEnv,GITHUB_ACTOR:"other"},
  {...stageEnv,P6_PHASE5B_CONDITIONAL_EXPECTED_CANDIDATE_SHA256:h("drift")},{...activeEnv,P6_PHASE5B_CONDITIONAL_INSTALL_TOKEN:"unapproved"}])
  assert.throws(()=>deriveP6ConditionalRuntimeEnvironment(bad,full),/HOLD_P6_CONDITIONAL_POLICY_CANDIDATE_/);
 assert.throws(()=>deriveP6ConditionalRuntimeEnvironment(stageEnv,target),/DERIVATION_RUNTIME_ACTION/);
});
test("T145 all eight protected consumers use the same tokenless approval and exact in-memory wrapper",()=>{
 for(const name of [".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",".github/workflows/phase6-private-later-enrollment.yml",".github/workflows/phase5-cd-github-bounded-pre-tick.yml",".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml",".github/workflows/phase5-one-signed-day-source-child-dispatch.yml",".github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml",".github/workflows/phase6-direct-recovery-tick.yml",".github/workflows/phase6-rolling-controller-bounded-session.yml"]){
  const y=readFileSync(name,"utf8");
  assert.match(y,/P6_PHASE5B_DERIVATION_APPROVAL_BASE64:.*vars\.P6_PHASE5B_CONDITIONAL_DERIVATION_APPROVAL_BASE64/,name);
  assert.match(y,/node scripts\/v39_phase5b_conditional_derived_exec_v39\.mjs (npx --no-install tsx|node) scripts\//,name);
  assert.doesNotMatch(y,/secrets\.P6_PHASE5B_DERIVATION_/);
 }
});
