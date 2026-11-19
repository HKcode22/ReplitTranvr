"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {PINS,verifyEnableReceipt}=require("./p6_final_main_nine_pin_repin.cjs");
test("pin set is exact nine unique lane identities",()=>{assert.equal(PINS.length,9);assert.equal(new Set(PINS).size,9);
 for(const forbidden of ["RIGHTS","ARMED","STOP","BUDGET","DATABASE","API_KEY"])assert.equal(PINS.some(x=>x.includes(forbidden)),false);
});
test("acknowledged source-enable receipt must match final ledger approval",()=>{
 const r={status:"EXISTING_DB_AUTH_ENABLED_NO_PROVIDER_NO_WORKFLOW_SWITCH_CHANGED",authorizationId:"AUTH-20261119-ABC",authArtifactSha256:"a".repeat(64),databaseAuthorizationEnabled:true,providerCalls:0,githubFlagsChanged:0,legacyAlertStarted:false,phase6PaidGoGrantedByThisTransition:false};
 const l={schema:"v39.phase6.source-enable-approval-ledger.v1",approvals:[{authorizationId:r.authorizationId,artifactSha256:r.authArtifactSha256}]};
 assert.equal(verifyEnableReceipt(JSON.stringify(r),l).authorizationId,r.authorizationId);
});
test("unapproved receipt is refused",()=>{
 const r={status:"EXISTING_DB_AUTH_ENABLED_NO_PROVIDER_NO_WORKFLOW_SWITCH_CHANGED",authorizationId:"AUTH-20261119-ABC",authArtifactSha256:"a".repeat(64),databaseAuthorizationEnabled:true,providerCalls:0,githubFlagsChanged:0,legacyAlertStarted:false,phase6PaidGoGrantedByThisTransition:false};
 assert.throws(()=>verifyEnableReceipt(JSON.stringify(r),{schema:"v39.phase6.source-enable-approval-ledger.v1",approvals:[]}),/AUTH_NOT_IN_FINAL_LEDGER/);
});
