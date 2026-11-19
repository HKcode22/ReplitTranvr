"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {next}=require("./p5_resume_existing_final_commissioning.cjs");
const base={
 coreReview:false,corePrepared:false,authOnMain:false,coreAdopted:false,
 policyDecision:false,policyObjects:false,privateReview:false,staticWorkpaper:false,
 staticReview:false,completedStageJournal:false,acknowledgedCalendarOnly:false,
 freezeWorkpaper:false,finalFreezeDecision:false,finalRepinPresent:false,finalRepinComplete:false,finalRepinMain:null,partialFinalRepin:false,anyMutationJournal:false
};
const n=x=>next({...base,...x});
test("completed stages require workpaper, independent freeze, and final repin in order",()=>{
 assert.deepEqual(n({completedStageJournal:true,freezeWorkpaper:false}),{mode:"RECOVER_EXISTING_FREEZE_WORKPAPER"});
 assert.deepEqual(n({completedStageJournal:true,freezeWorkpaper:true}),{status:"HOLD_FINAL_PHASE5_FREEZE_DECISION_ABSENT",missing:["approved-final-phase5-freeze.json"]});
 assert.deepEqual(n({completedStageJournal:true,freezeWorkpaper:true,finalFreezeDecision:true}),{mode:"FINAL_SCHEDULER_REPIN_AFTER_FREEZE"});
 assert.deepEqual(n({completedStageJournal:true,freezeWorkpaper:true,finalFreezeDecision:true,finalRepinPresent:true,finalRepinComplete:true,finalRepinMain:"c".repeat(40)}),{status:"PHASE5_FINAL_FREEZE_AND_SCHEDULER_REPIN_COMPLETE_NO_PAID_GO"});
});
test("scheduler repin cannot precede completed commissioning or replay an uncertain journal",()=>{
 assert.match(n({finalRepinPresent:true,partialFinalRepin:true}).status,/HOLD_FINAL_REPIN_EXISTS_BEFORE_COMPLETED_COMMISSIONING/);
 assert.match(n({completedStageJournal:true,freezeWorkpaper:true,finalFreezeDecision:true,finalRepinPresent:true,partialFinalRepin:true}).status,/HOLD_FINAL_REPIN_JOURNAL_RECONCILE_NO_REPLAY/);
});
test("acknowledged calendar-only journal resumes cost exactly once despite mutation journal presence",()=>{
 const x=n({acknowledgedCalendarOnly:true,coreAdopted:true,privateReview:true,staticReview:true,authOnMain:true,anyMutationJournal:true});
 assert.equal(x.mode,"RESUME_ACKNOWLEDGED_CALENDAR_NO_GO");
});
test("unknown mutation journal holds before any new preparation or commission",()=>{
 assert.match(n({coreReview:true,corePrepared:true,authOnMain:true,coreAdopted:true,policyDecision:true,policyObjects:true,privateReview:true,staticWorkpaper:true,staticReview:true,anyMutationJournal:true}).status,/HOLD_EXISTING_MUTATION_JOURNAL/);
});
test("core sequence is review -> prepare -> ledger AUTH -> adopt",()=>{
 assert.match(n({}).status,/HOLD_EXACT_CORE_REVIEW_FILE_ABSENT/);
 assert.equal(n({coreReview:true}).mode,"PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE");
 assert.match(n({coreReview:true,corePrepared:true}).status,/HOLD_PREPARED_AUTH_NOT_IN_APPROVED_MAIN_LEDGER/);
 assert.equal(n({coreReview:true,corePrepared:true,authOnMain:true}).mode,"ADOPT_CORE_ALREADY_APPROVED_ON_MAIN");
});
test("policy sequence requires decision then private exact-byte review",()=>{
 assert.match(n({coreReview:true,corePrepared:true,authOnMain:true,coreAdopted:true}).status,/HOLD_EXACT_POLICY_BINDING_REVIEW_ABSENT/);
 assert.equal(n({coreReview:true,corePrepared:true,authOnMain:true,coreAdopted:true,policyDecision:true}).mode,"PREPARE_POLICY_REVIEW");
 assert.match(n({coreReview:true,corePrepared:true,authOnMain:true,coreAdopted:true,policyDecision:true,policyObjects:true}).status,/HOLD_EXACT_PRIVATE_POLICY_BYTE_REVIEW_ABSENT/);
});
test("static review is prepared before final inert commissioning",()=>{
 const common={coreReview:true,corePrepared:true,authOnMain:true,coreAdopted:true,policyDecision:true,policyObjects:true,privateReview:true};
 assert.equal(n(common).mode,"PREPARE_STATIC_REVIEW");
 assert.match(n({...common,staticWorkpaper:true}).status,/HOLD_EXACT_STATIC_INSTALL_REVIEW_ABSENT/);
 assert.equal(n({...common,staticWorkpaper:true,staticReview:true}).mode,"COMMISSION_EXISTING_INERT_NO_GO");
});
