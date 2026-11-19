"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const {NAMES,FLAGS,pinsFromPolicies,materialize}=require("./p5_private_policy_review_materializer.cjs");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),canon=x=>Buffer.from(JSON.stringify(x));
function policies(){
 const main="a".repeat(40),manifest="b".repeat(64),config="c".repeat(64),release="d".repeat(64),rights="e".repeat(64);
 return {
  P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:{reviewedCodeSha:main,manifestSha256:manifest,releaseSha256:release,rightsSha256:rights,independentStudyTrustPinsApproved:true},
  P6_NONPAID_DAILY_POLICY_BASE64:{approvedCodeSha:main,manifestSha256:manifest,configSha256:config,releaseSha256:release,rightsSha256:rights,delegatedDailyPacketProductionApproved:true,nativePreFeatureReview:{approved:true},nativeLaterReview:{approved:true,privatePublicationApproved:true,nativeT24ReviewApproved:true,independentT24WitnessProtocolReviewed:true,t24Custody:{independentT24CustodyTrustApproved:true},dayAppendPolicy:{delegatedAutomatedLaterDayAppendApproved:true}}},
  P6_NONPAID_SIGNING_POLICY_BASE64:{approvedCodeSha:main,manifestSha256:manifest,releaseSha256:release,rightsSha256:rights,delegatedAutomatedSourceSigningApproved:true},
  P6_NONPAID_TRANSPORT_TRUST_BASE64:{independentTransportAndSigningScopeApproved:true},
  P6_PRIVATE_POST_REVIEWER_TRUST_BASE64:{independentPostReviewerPinsApproved:true},
  P6_NATIVE_POST_POLICY_BASE64:{reviewedCodeSha:main,manifestSha256:manifest,releaseSha256:release,rightsSha256:rights,independentPostRequestGeometryApproved:true,delegatedPostPacketAndDayAppendApproved:true,independentSourceContentsUseAndRESTReleaseAttested:true,independentProviderContentRetentionApproved:true}
 };
}
function receipt(p){const raw=canon(p);return {status:"SIX_POLICY_BYTES_ASSEMBLED_EXISTING_INDEPENDENT_BYTE_REVIEW_REQUIRED_NO_GO",main:p.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64.reviewedCodeSha,authorizationId:"AUTH-20261119-X",policyBundleSha256:sha(raw),policyDigests:NAMES.map(name=>({name,sha256:sha(canon(p[name]))})),phase6PaidGo:false}}
function input(){return {schema:"v39.phase5.private-policy-reviewer-decision-input.v1",phase6PaidGo:false,decisions:Object.fromEntries(FLAGS.map(k=>[k,true])),reviewedBy:"Private Reviewer",reviewedAtUtc:"2026-11-19T07:00:00.000Z"}}
const NOW=Date.parse("2026-11-19T07:05:00.000Z");
test("exact assembled policy bytes derive all private review pins",()=>{const p=policies(),pins=pinsFromPolicies(p,receipt(p)),out=materialize(pins,input(),NOW);assert.equal(out.finalPolicyBundleSha256,sha(canon(p)));assert.equal(out.policyDigests.length,6);assert.equal(out.manifestSha256,"b".repeat(64));assert.equal(out.phase6PaidGo,false)});
test("six independent private decisions are explicit",()=>{for(const k of FLAGS){const x=input();x.decisions[k]=false;const p=policies();assert.throws(()=>materialize(pinsFromPolicies(p,receipt(p)),x,NOW),/EXPLICIT_DECISIONS/)}});
test("assembly receipt must exactly match policy bytes",()=>{const p=policies(),q=receipt(p);q.policyBundleSha256="f".repeat(64);assert.throws(()=>pinsFromPolicies(p,q),/ASSEMBLY_RECEIPT/)});
test("cross-policy pin drift is refused",()=>{const p=policies();p.P6_NATIVE_POST_POLICY_BASE64.rightsSha256="f".repeat(64);assert.throws(()=>pinsFromPolicies(p,receipt(p)),/POLICY_CROSS_PIN/)});
test("unapproved source/retention or native policy is refused",()=>{let p=policies();p.P6_NATIVE_POST_POLICY_BASE64.independentProviderContentRetentionApproved=false;assert.throws(()=>pinsFromPolicies(p,receipt(p)),/POST_POLICY_SHAPE/);p=policies();p.P6_NONPAID_DAILY_POLICY_BASE64.nativeLaterReview.nativeT24ReviewApproved=false;assert.throws(()=>pinsFromPolicies(p,receipt(p)),/NATIVE_DELEGATED_POLICY_SHAPE/)});
test("future reviewer timestamp is refused",()=>{const p=policies(),x=input();x.reviewedAtUtc="2026-11-19T07:06:00.000Z";assert.throws(()=>materialize(pinsFromPolicies(p,receipt(p)),x,NOW),/REVIEW_CLOCK/)});
