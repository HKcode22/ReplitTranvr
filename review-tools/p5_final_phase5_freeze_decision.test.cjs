"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const {prepareFreezeWorkpaper}=require("./p5_run_existing_inert_stage_chain.cjs");
const {materialize,validateDecision,validateWorkpaper}=require("./p5_final_phase5_freeze_decision.cjs");
const H=x=>x.repeat(64).slice(0,64),main="a".repeat(40);
const bundle={
 schema:"v39.phase5.exact-final-commissioning-bundle.v1",
 status:"EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH",
 phase6PaidGo:false,main,manifestSha256:H("1"),configSha256:H("2"),calendarSha256:H("3"),
 authArtifactSha256:H("4"),stageSha256:H("5"),costEnvelopeSha256:H("6"),
 approvedPrivatePolicyReviewSha256:H("7"),policyBundleSha256:H("8"),
 authorizationId:"AUTH-20261119-TEST",staticSecretsPrepared:31
};
const manifest={
 status:"EXACT_APPROVED_MANIFEST_STORED_AND_FRESH_READBACK_NO_GO",
 manifestSha256:bundle.manifestSha256,authSha256:bundle.authArtifactSha256,
 manifestRowsWritten:1,databaseWrites:1,independentReadOnlyBytesMatch:true,
 providerCalls:0,authorizationEnabled:false,phase6PaidGo:false
};
const readback=(mode,time)=>({
 status:mode==="calendar"?"INDEPENDENT_EXACT_B0062_CALENDAR_ONLY_READONLY_MATCH_NO_GO":"INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO",
 codeSha:main,independentOwnerReadback:true,authorizationEnabled:false,providerCalls:0,databaseWrites:0,
 phase6PaidGo:false,phase5ScientificFreeze:false,verifiedReadOnly:true,database:"neondb",
 manifestSha256:bundle.manifestSha256,calendarSha256:bundle.calendarSha256,
 exactReviewedStagePacketSha256:bundle.stageSha256,calendarRows:31,pairedAirportDays:10,
 ordinaryAirportDaysUnselected:21,restPhysicalChargeDates:38,sourceQueriesAndPhysicalAttemptsZero:true,
 alertSafetyValuesExact:true,snapshotAtUtc:time,
 ...(mode==="calendar"?{costStageCommitted:false,categoryCycleCaps:0,categoryUtcBudgetRows:0}:{
  exactReviewedCostEnvelopeSha256:bundle.costEnvelopeSha256,categoryCycleCaps:7,categoryUtcBudgetRows:266
 })
});
const calendar=readback("calendar","2026-11-19T06:00:00.000Z"),cost=readback("cost","2026-11-19T06:05:00.000Z");
const journal=[
 {status:"CHAIN_STARTED",main,receiptSha:H("b"),providerCalls:0,phase6PaidGo:false,secretMetadataSha256:H("9")},
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
const work=prepareFreezeWorkpaper(bundle,H("b"),manifest,H("c"),journal,H("d"));
const NOW=Date.parse("2026-11-19T06:10:00.000Z");
const decision=()=>({
 schema:"v39.phase5.final-freeze-reviewer-decision-input.v1",
 phase5ScientificReleaseFreezeApproved:true,
 commissioningEvidenceApproved:true,
 finalSchedulerRepinApproved:true,
 separatePhase6PaidGoRequired:true,
 reviewedBy:"Independent Freeze Reviewer",
 reviewedAtUtc:"2026-11-19T06:06:00.000Z",
 phase6PaidGo:false
});
test("actual generated workpaper is valid no-GO commissioning evidence",()=>{
 const x=validateWorkpaper(work);
 assert.equal(x.calendarAt,Date.parse(calendar.snapshotAtUtc));
 assert.equal(x.costAt,Date.parse(cost.snapshotAtUtc));
 assert.equal(work.phase5FreezeApproved,false);
 assert.equal(work.phase6PaidGo,false);
});
test("explicit reviewer decision materializes exact final Phase5 freeze without paid GO",()=>{
 const out=materialize(work,decision(),NOW);
 assert.equal(out.status,"PHASE5_FINAL_SCIENTIFIC_RELEASE_FREEZE_APPROVED_NO_PAID_GO");
 assert.equal(out.phase5ScientificReleaseFreezeApproved,true);
 assert.equal(out.commissioningEvidenceApproved,true);
 assert.equal(out.finalSchedulerRepinApproved,true);
 assert.equal(out.separatePhase6PaidGoRequired,true);
 assert.equal(out.authorizationEnabled,false);
 assert.equal(out.phase6PaidGo,false);
 assert.equal(out.calendarRunId,11);assert.equal(out.costRunId,12);
 assert.equal(validateDecision(work,out,NOW),true);
});
test("freeze cannot be inferred from a missing/false reviewer judgment",()=>{
 for(const k of ["phase5ScientificReleaseFreezeApproved","commissioningEvidenceApproved","finalSchedulerRepinApproved","separatePhase6PaidGoRequired"]){
  const d=decision();d[k]=false;
  assert.throws(()=>materialize(work,d,NOW),/EXPLICIT_DECISION/);
 }
});
test("review must occur after the final cost readback and not in the future",()=>{
 let d=decision();d.reviewedAtUtc="2026-11-19T06:04:59.999Z";
 assert.throws(()=>materialize(work,d,NOW),/REVIEW_CLOCK/);
 d=decision();d.reviewedAtUtc="2026-11-19T06:11:00.000Z";
 assert.throws(()=>materialize(work,d,NOW),/REVIEW_CLOCK/);
});
test("tampered or enabled commissioning evidence is refused",()=>{
 assert.throws(()=>materialize({...work,authorizationEnabled:true},decision(),NOW),/WORKPAPER_NO_GO/);
 const bad=structuredClone(work);bad.cost.receipt.categoryUtcBudgetRows=265;
 assert.throws(()=>materialize(bad,decision(),NOW),/COST_SCOPE/);
});
test("CLI emits canonical decision bytes from canonical private inputs",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"p5-final-freeze-"));
 try{
  const w=path.join(dir,"work.json"),d=path.join(dir,"decision.json");
  fs.writeFileSync(w,JSON.stringify(work));fs.writeFileSync(d,JSON.stringify(decision()));
  const stdout=cp.execFileSync(process.execPath,[path.resolve("review-tools/p5_final_phase5_freeze_decision.cjs"),w,d],{encoding:"utf8"});
  const out=JSON.parse(stdout);
  assert.equal(stdout,JSON.stringify(out));
  assert.equal(out.phase6PaidGo,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
