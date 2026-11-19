"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {
  verifyReadback,runSequence,validateManifestStorageReceipt,
  prepareFreezeWorkpaper,acknowledgedCalendar
}=require("./p5_run_existing_inert_stage_chain.cjs");
const h=x=>x.repeat(64).slice(0,64);
const main="a".repeat(40),receiptSha=h("b"),manifestReceiptSha=h("c"),journalSha=h("d"),metadataSha=h("9");
const review={
 schema:"v39.phase5.exact-final-commissioning-bundle.v1",
 status:"EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH",
 phase6PaidGo:false,main,manifestSha256:h("1"),configSha256:h("2"),calendarSha256:h("3"),
 authArtifactSha256:h("4"),stageSha256:h("5"),costEnvelopeSha256:h("6"),
 approvedPrivatePolicyReviewSha256:h("7"),policyBundleSha256:h("8"),
 authorizationId:"AUTH-20261119-TEST",staticSecretsPrepared:31
};
const manifest={
 status:"EXACT_APPROVED_MANIFEST_STORED_AND_FRESH_READBACK_NO_GO",
 manifestSha256:review.manifestSha256,authSha256:review.authArtifactSha256,
 manifestRowsWritten:1,databaseWrites:1,independentReadOnlyBytesMatch:true,
 providerCalls:0,authorizationEnabled:false,phase6PaidGo:false
};
const readback=(mode,time)=>({
 status:mode==="calendar"?"INDEPENDENT_EXACT_B0062_CALENDAR_ONLY_READONLY_MATCH_NO_GO":"INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO",
 codeSha:main,independentOwnerReadback:true,authorizationEnabled:false,providerCalls:0,databaseWrites:0,
 phase6PaidGo:false,phase5ScientificFreeze:false,verifiedReadOnly:true,database:"neondb",
 manifestSha256:review.manifestSha256,calendarSha256:review.calendarSha256,
 exactReviewedStagePacketSha256:review.stageSha256,calendarRows:31,pairedAirportDays:10,
 ordinaryAirportDaysUnselected:21,restPhysicalChargeDates:38,sourceQueriesAndPhysicalAttemptsZero:true,
 alertSafetyValuesExact:true,snapshotAtUtc:time,
 ...(mode==="calendar"?{costStageCommitted:false,categoryCycleCaps:0,categoryUtcBudgetRows:0}:{
  exactReviewedCostEnvelopeSha256:review.costEnvelopeSha256,categoryCycleCaps:7,categoryUtcBudgetRows:266
 })
});
const calendar=readback("calendar","2026-11-19T06:00:00.000Z");
const cost=readback("cost","2026-11-19T06:05:00.000Z");
const journal=[
 {status:"CHAIN_STARTED",main,receiptSha,providerCalls:0,phase6PaidGo:false,secretMetadataSha256:metadataSha},
 {mode:"calendar",status:"DISPATCH_ATTEMPTED_NO_REPLAY"},
 {mode:"calendar",status:"DISPATCH_EXACT_RUN_ID",runId:11},
 {mode:"calendar",status:"EXACT_RUN_SUCCESS",runId:11},
 {mode:"calendar",status:"INDEPENDENT_READBACK_MATCH",runId:11,receipt:calendar},
 {mode:"cost",status:"DISPATCH_ATTEMPTED_NO_REPLAY"},
 {mode:"cost",status:"DISPATCH_EXACT_RUN_ID",runId:12},
 {mode:"cost",status:"EXACT_RUN_SUCCESS",runId:12},
 {mode:"cost",status:"INDEPENDENT_READBACK_MATCH",runId:12,receipt:cost},
 {status:"BOTH_EXISTING_INERT_STAGES_EXACT_READBACK_NO_GO",calendarId:11,costId:12,authorizationEnabled:false,phase6PaidGo:false}
];
test("exact calendar and cost readbacks are accepted",()=>{
 verifyReadback(calendar,"calendar",main,review);verifyReadback(cost,"cost",main,review);
});
test("normal sequence is calendar then cost",()=>{
 const calls=[],ops={dispatch:m=>(calls.push("dispatch:"+m),m==="calendar"?1:2),awaitSuccess:(id,m)=>calls.push("success:"+m),readback:(m,id)=>calls.push("readback:"+m)};
 assert.deepEqual(runSequence(ops),{calendarId:1,costId:2});
 assert.deepEqual(calls,["dispatch:calendar","success:calendar","readback:calendar","dispatch:cost","success:cost","readback:cost"]);
});
test("acknowledged calendar resume dispatches cost only",()=>{
 const calls=[],ops={dispatch:m=>(calls.push("dispatch:"+m),2),awaitSuccess:(id,m)=>calls.push("success:"+m),readback:(m,id)=>calls.push("readback:"+m)};
 assert.deepEqual(runSequence(ops,11),{calendarId:11,costId:2});
 assert.deepEqual(calls,["dispatch:cost","success:cost","readback:cost"]);
});
test("acknowledged calendar journal is exact",()=>assert.equal(acknowledgedCalendar(journal.slice(0,5),review,receiptSha,metadataSha).runId,11));
test("completed two-stage journal produces freeze workpaper only",()=>{
 const out=prepareFreezeWorkpaper(review,receiptSha,manifest,manifestReceiptSha,journal,journalSha);
 assert.equal(out.phase5FreezeApproved,false);assert.equal(out.phase6PaidGo,false);assert.equal(out.calendar.runId,11);assert.equal(out.cost.runId,12);
});
test("unsafe or reordered states are refused",()=>{
 assert.throws(()=>verifyReadback({...calendar,authorizationEnabled:true},"calendar",main,review));
 assert.throws(()=>validateManifestStorageReceipt(review,{...manifest,manifestSha256:h("f")}));
 const early=journal.map((x,i)=>i===8?{...x,receipt:{...cost,snapshotAtUtc:"2026-11-19T05:00:00.000Z"}}:x);
 assert.throws(()=>prepareFreezeWorkpaper(review,receiptSha,manifest,manifestReceiptSha,early,journalSha));
 const same=journal.map((x,i)=>i===6||i===7||i===8?{...x,runId:11}:i===9?{...x,costId:11}:x);
 assert.throws(()=>prepareFreezeWorkpaper(review,receiptSha,manifest,manifestReceiptSha,same,journalSha));
});
