"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const {FLAGS,HASHES,pinsFromCore,materialize}=require("./p5_final_policy_binding_materializer.cjs");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),raw=x=>Buffer.from(JSON.stringify(x)),H="a".repeat(64);
function core(){
 const manifest={sourceRightsApproved:true,scientificFreezeApproved:true,finalPredecessorsApproved:true,phase6PaidGo:false};
 const config={sourceRightsApproved:true,reviewApproved:true,phase6PaidGo:false};
 const mr=raw(manifest),cr=raw(config),ms=sha(mr),cs=sha(cr);
 const auth={authorizationId:"AUTH-20261119-TEST1",releaseActivation:{independentSourceUseApproved:true,independentScientificFreezeApproved:true,independentOperationalReleaseApproved:true,sourceRightsEvidenceSha256:"b".repeat(64),costEnvelopeSha256:"c".repeat(64)}};
 const ar=raw(auth);
 const external={codeSha40:"d".repeat(40),manifestSha256:ms,configSha256:cs,phase6AuthorizationId:auth.authorizationId};
 return {auth:{x:auth,raw:ar,sha256:sha(ar)},manifest:{x:manifest,raw:mr,sha256:ms},config:{x:config,raw:cr,sha256:cs},external:{x:external,raw:raw(external),sha256:sha(raw(external))}};
}
function input(){
 return {schema:"v39.phase5.final-policy-binding-reviewer-input.v1",phase6PaidGo:false,reviewedBy:"Policy Reviewer",reviewedAtUtc:"2026-11-19T07:00:00.000Z",
  decisions:Object.fromEntries(FLAGS.map(k=>[k,true])),...Object.fromEntries(HASHES.map(k=>[k:H])),
  validFromUtc:"2026-11-19T06:55:00.000Z",validUntilUtc:"2026-12-27T04:00:00.000Z",builderFrozenAtUtc:"2026-11-19T06:50:00.000Z",selectedTVersion:"departure.scheduledTime.utc-v1",standaloneNoT24ProtocolSha256:null};
}
const NOW=Date.parse("2026-11-19T07:05:00.000Z");
test("core pins are derived, never reviewer supplied",()=>{
 const p=pinsFromCore(core());assert.equal(p.authorizationId,"AUTH-20261119-TEST1");assert.equal(p.rightsSha256,"b".repeat(64));assert.equal(p.costSha256,"c".repeat(64));
 const out=materialize(p,input(),NOW);assert.equal(out.authorizationId,p.authorizationId);assert.equal(out.authArtifactSha256,p.authArtifactSha256);assert.equal(out.reviewedMainSha,p.reviewedMainSha);assert.equal(out.manifestSha256,p.manifestSha256);assert.equal(out.rightsSha256,p.rightsSha256);assert.equal(out.phase6PaidGo,false);
});
test("all seventeen policy decisions must be explicit true",()=>{
 for(const k of FLAGS){const x=input();x.decisions[k]=false;assert.throws(()=>materialize(pinsFromCore(core()),x,NOW),/EXPLICIT_DECISIONS/)}
});
test("all nine policy evidence hashes must be present",()=>{
 for(const k of HASHES){const x=input();x[k]=null;assert.throws(()=>materialize(pinsFromCore(core()),x,NOW),/REVIEW_EVIDENCE_HASHES/)}
});
test("validity must cover the outcome tail and review cannot be future",()=>{
 let x=input();x.validUntilUtc="2026-12-25T00:00:00.000Z";assert.throws(()=>materialize(pinsFromCore(core()),x,NOW),/VALIDITY_WINDOW/);
 x=input();x.reviewedAtUtc="2026-11-19T07:06:00.000Z";assert.throws(()=>materialize(pinsFromCore(core()),x,NOW),/REVIEW_CLOCK/);
});
test("unapproved source-use or manifest/config core is refused",()=>{
 let c=core();c.auth.x.releaseActivation.independentSourceUseApproved=false;assert.throws(()=>pinsFromCore(c),/APPROVED_CORE_AUTH/);
 c=core();c.manifest.x.sourceRightsApproved=false;assert.throws(()=>pinsFromCore(c),/APPROVED_MANIFEST/);
 c=core();c.config.x.sourceRightsApproved=false;assert.throws(()=>pinsFromCore(c),/APPROVED_CONFIG/);
});
test("core manifest/config/auth cross-pin drift is refused",()=>{
 const c=core();c.external.x.manifestSha256="e".repeat(64);assert.throws(()=>pinsFromCore(c),/CORE_CROSS_PINS/);
});
