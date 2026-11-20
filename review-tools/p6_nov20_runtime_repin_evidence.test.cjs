"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createHash}=require("node:crypto");
const {BASE,STAGE,STOP_PATH,STOP_NAMES,STOP_VALUES,MODE_NAMES,verifyEnableReceipt,verifyCurrentStop}=require("./p6_nov20_runtime_repin_evidence.cjs");
const {PINS}=require("./p6_nov20_final_main_nine_pin_repin.cjs");
const authHash="a".repeat(64),now=Date.parse("2026-11-20T04:00:00.000Z");
const fixture=()=>({transition:{...STAGE,status:"EXISTING_DB_AUTH_ENABLED_NO_PROVIDER_NO_WORKFLOW_SWITCH_CHANGED",authArtifactSha256:authHash,enabledAtDatabaseUtc:"2026-11-20T03:45:00.000Z",independentStagedValuesMatch:true,exactPhysicalRestGuardVerified:true,databaseAuthorizationEnabled:true,providerCalls:0,databaseWrites:2,githubFlagsChanged:0,legacyAlertStarted:false,phase6PaidGoGrantedByThisTransition:false},readback:{status:"P6_SOURCE_AUTH_ENABLED_INDEPENDENT_READBACK_NO_PAID_DISPATCH",observedAtUtc:"2026-11-20T03:45:01.000Z",verifiedReadOnly:true,exactEnabledRowAndDurableMarker:true,exactStoredReviewedManifest:true,exactPhysicalRestGuardVerified:true,providerCalls:0,databaseWrites:0,githubFlagsChanged:0,phase6PaidGoGrantedByThisTransition:false}});
const ledger=()=>({schema:"v39.phase6.source-enable-approval-ledger.v1",approvals:[{authorizationId:STAGE.authorizationId,artifactSha256:authHash}]});
test("exact current staged receipt and independent readback required",()=>{
 const f=fixture();assert.equal(verifyEnableReceipt(JSON.stringify(f),ledger()).codeSha,BASE);
 for(const field of ["manifestSha256","calendarSha256","configSha256","stagePacketSha256","costEnvelopeSha256","codeSha"]){
   const x=fixture();x.transition[field]="b".repeat(64);assert.throws(()=>verifyEnableReceipt(JSON.stringify(x),ledger()),/EXACT_TRANSITION/);
 }
});
test("never allow transition-only, stale readback, missing approval or paid work",()=>{
 const f=fixture();
 assert.throws(()=>verifyEnableReceipt(JSON.stringify({transition:f.transition}),ledger()),/EXACT_INDEPENDENT_READBACK/);
 assert.throws(()=>verifyEnableReceipt(JSON.stringify(f),{...ledger(),approvals:[]}),/AUTH_NOT_IN_LEDGER/);
 f.readback.observedAtUtc="2026-11-20T03:00:00.000Z";assert.throws(()=>verifyEnableReceipt(JSON.stringify(f),ledger()),/EXACT_INDEPENDENT_READBACK/);
 const p=fixture();p.transition.providerCalls=1;assert.throws(()=>verifyEnableReceipt(JSON.stringify(p),ledger()),/EXACT_TRANSITION/);
});
const stop=()=>({productionMain:BASE,evidenceId:"RUN-20261120-CURRENTGITHUBSTOP",fourStopSecretValuesExact:true,all21ModeVarsUnset:true,secretPlaintextPrinted:false,githubWritesByAttestation:0,providerCalls:0,databaseWrites:0,expectedStopValues:Object.fromEntries(STOP_NAMES.map((n,i)=>[n,STOP_VALUES[i]])),modeVariableNames:MODE_NAMES,observedAtUtc:"2026-11-20T02:23:21.671Z"});
const signed=e=>{const raw=JSON.stringify(e)+"\n";return [raw,{...ledger(),evidence:[{path:STOP_PATH,evidenceId:e.evidenceId,sha256:createHash("sha256").update(raw).digest("hex")}]}]};
const secs=()=>STOP_NAMES.map(name=>({name,updated_at:"2026-11-20T02:00:00Z"}));
test("STOP proof must be hash-bound and unmodified since actual attestation",()=>{
 const [raw,l]=signed(stop());assert.equal(verifyCurrentStop(raw,l,secs(),[],now),true);
 assert.throws(()=>verifyCurrentStop(raw+" ",l,secs(),[],now),/STOP_NOT_HASH_BOUND/);
 const s=secs();s[0].updated_at="2026-11-20T03:00:00Z";assert.throws(()=>verifyCurrentStop(raw,l,s,[],now),/STOP_SECRET_CHANGED/);
 assert.throws(()=>verifyCurrentStop(raw,l,secs(),[{name:MODE_NAMES[0]}],now),/COLLECTION_MODE_NOT_UNSET/);
 assert.throws(()=>verifyCurrentStop(raw,l,secs().slice(1),[],now),/STOP_SECRET_CHANGED/);
});
test("nine unique identity pins only",()=>{
 assert.equal(PINS.length,9);assert.equal(new Set(PINS).size,9);
 for(const forbidden of ["RIGHTS","ARMED","STOP","BUDGET","DATABASE","API_KEY"])assert.equal(PINS.some(x=>x.includes(forbidden)),false);
});
