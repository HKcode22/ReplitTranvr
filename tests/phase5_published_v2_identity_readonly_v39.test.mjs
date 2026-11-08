import test from 'node:test';
import assert from 'node:assert/strict';
import {assessV2PublishedIdentity} from '../scripts/v39_phase5_published_v2_identity_readonly.mjs';
const PIN='6c187d58e2b1339aace71079e27767523d8ca3ce';
const OLD='84b7f1565d0402facc8c3b9aacedc599eb6e2af1';
const payload=(sha)=>JSON.stringify({
 schema:'v39.phase2f-workspace-runtime.v1',status:'PASS',
 git_head:sha,published_deployment:true,prepaid_route_registered:true,
 runtime_durability_class:'autoscale',prepaid_source_custody_ready:true,
 accidentalSecret:'NEVER_EMIT'
});
test('reviewed source PIN is observable but never a signed POST or scientific PASS',()=>{
 const x=assessV2PublishedIdentity({httpCode:200,curlExit:0,elapsedMs:250,body:payload(PIN)});
 assert.equal(x.status,'OBSERVED_V2_SOURCE_PIN_MATCH_NOT_SIGNED_POST_PROOF');
 assert.equal(x.sourcePinMatchesReviewedV2,true);
 assert.equal(x.expectedReviewedExecutableSourcePin,PIN);
 assert.equal(x.signedNonemptyExternalPostDurableAckVerified,false);
 assert.equal(x.phase5ScientificFreezePassed,false);
 assert.equal(x.phase6PaidGo,false);
 assert(!JSON.stringify(x).includes('NEVER_EMIT'));
});
test('old published source fails even though it is healthy HTTPS 200',()=>{
 const x=assessV2PublishedIdentity({httpCode:200,curlExit:0,elapsedMs:250,body:payload(OLD)});
 assert.equal(x.status,'HOLD_PUBLISHED_SOURCE_NOT_REVIEWED_V2_PIN');
 assert.equal(x.claimedPublishedGitHead,OLD);
 assert.equal(x.publishedRawCustodyClaim,true);
 assert.equal(x.sourcePinMatchesReviewedV2,false);
});
test('Replit unavailable or invalid public metadata reports HOLD, not a fabricated outage root cause',()=>{
 for(const o of [
  {httpCode:404,curlExit:0,elapsedMs:500,body:'Not found'},
  {httpCode:0,curlExit:6,elapsedMs:0,body:''},
  {httpCode:200,curlExit:0,elapsedMs:100,body:'{invalid'},
  {httpCode:200,curlExit:0,elapsedMs:100,body:JSON.stringify({git_head:PIN})}
 ]){
  const x=assessV2PublishedIdentity(o);
  assert.equal(x.status,'HOLD_PUBLIC_RUNTIME_UNAVAILABLE_OR_INVALID');
  assert.equal(x.sourcePinMatchesReviewedV2,false);
  assert.equal(x.providerCalls,0);
  assert.equal(x.databaseWrites,0);
 }
});
test('wrong source SHA or malformed public response never reflected as credential data',()=>{
 const a=assessV2PublishedIdentity({httpCode:200,curlExit:0,elapsedMs:10,body:payload('0'.repeat(40))});
 assert.equal(a.status,'HOLD_PUBLISHED_SOURCE_NOT_REVIEWED_V2_PIN');
 const b=assessV2PublishedIdentity({httpCode:200,curlExit:0,elapsedMs:10,body:'{"schema":"v39.phase2f-workspace-runtime.v1","status":"PASS","git_head":"NO_SECRET_BUT_INVALID","published_deployment":true,"prepaid_route_registered":true}'});
 assert.equal(b.claimedPublishedGitHead,null);
 assert.equal(b.sourcePinMatchesReviewedV2,false);
});
