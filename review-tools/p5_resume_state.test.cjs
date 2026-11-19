"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {next}=require("./p5_resume_existing_final_commissioning.cjs");
const ready={
 completedStageJournal:false,acknowledgedCalendarOnly:false,completedStaticInstall:false,
 completedInertApproval:false,stageJournalPresent:false,partialStaticInstall:false,partialInertApproval:false,
 anyMutationJournal:false,coreReview:true,corePrepared:true,authOnMain:true,coreAdopted:true,
 policyDecision:true,policyObjects:true,privateReview:true,staticWorkpaper:true,staticReview:true,freezeWorkpaper:false,
 finalFreezeDecision:false,finalRepinPresent:false,finalRepinComplete:false,finalRepinMain:null,partialFinalRepin:false
};
test("normal fully reviewed state proceeds to one commissioning mode",()=>assert.equal(next(ready).mode,"COMMISSION_EXISTING_INERT_NO_GO"));
test("completed static install resumes forward without replay",()=>{
 const out=next({...ready,completedStaticInstall:true});
 assert.equal(out.mode,"RESUME_AFTER_ACKNOWLEDGED_STATIC_NO_GO");
});
test("completed static plus completed inert flags still resumes forward",()=>{
 const out=next({...ready,completedStaticInstall:true,completedInertApproval:true});
 assert.equal(out.mode,"RESUME_AFTER_ACKNOWLEDGED_STATIC_NO_GO");
});
test("partial inert or partial stage journal after static install is a hard hold",()=>{
 assert.match(next({...ready,completedStaticInstall:true,partialInertApproval:true,anyMutationJournal:true}).status,/HOLD_EXISTING_MUTATION/);
 assert.match(next({...ready,completedStaticInstall:true,stageJournalPresent:true,anyMutationJournal:true}).status,/HOLD_EXISTING_MUTATION/);
});
test("acknowledged calendar has priority over static recovery",()=>{
 const out=next({...ready,completedStaticInstall:true,stageJournalPresent:true,acknowledgedCalendarOnly:true});
 assert.equal(out.mode,"RESUME_ACKNOWLEDGED_CALENDAR_NO_GO");
});
test("completed two-stage chain requires workpaper, genuine freeze, then one final repin",()=>{
 const base={...ready,completedStageJournal:true,stageJournalPresent:true};
 assert.equal(next(base).mode,"RECOVER_EXISTING_FREEZE_WORKPAPER");
 assert.equal(next({...base,freezeWorkpaper:true}).status,"HOLD_FINAL_PHASE5_FREEZE_DECISION_ABSENT");
 assert.equal(next({...base,freezeWorkpaper:true,finalFreezeDecision:true}).mode,"FINAL_SCHEDULER_REPIN_AFTER_FREEZE");
 assert.equal(next({...base,freezeWorkpaper:true,finalFreezeDecision:true,finalRepinPresent:true,finalRepinComplete:true,finalRepinMain:"b".repeat(40)}).status,"PHASE5_FINAL_FREEZE_AND_SCHEDULER_REPIN_COMPLETE_NO_PAID_GO");
});
test("partial or premature final repin is a hard no-replay hold",()=>{
 assert.match(next({...ready,finalRepinPresent:true,partialFinalRepin:true}).status,/HOLD_FINAL_REPIN_EXISTS_BEFORE_COMPLETED_COMMISSIONING/);
 const base={...ready,completedStageJournal:true,stageJournalPresent:true,freezeWorkpaper:true,finalFreezeDecision:true,finalRepinPresent:true,partialFinalRepin:true};
 assert.match(next(base).status,/HOLD_FINAL_REPIN_JOURNAL_RECONCILE_NO_REPLAY/);
});
test("partial static install remains unreplayable",()=>assert.match(next({...ready,partialStaticInstall:true,anyMutationJournal:true}).status,/HOLD_EXISTING_MUTATION/));
test("missing genuine reviewed inputs still stop before commissioning",()=>{
 assert.equal(next({...ready,coreReview:false}).status,"HOLD_EXACT_CORE_REVIEW_FILE_ABSENT");
 assert.equal(next({...ready,authOnMain:false}).status,"HOLD_PREPARED_AUTH_NOT_IN_APPROVED_MAIN_LEDGER");
 assert.equal(next({...ready,privateReview:false}).status,"HOLD_EXACT_PRIVATE_POLICY_BYTE_REVIEW_ABSENT");
});
