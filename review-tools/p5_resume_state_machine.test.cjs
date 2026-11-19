"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {next}=require("./p5_resume_existing_final_commissioning.cjs");
const base={
 coreReview:false,corePrepared:false,authOnMain:false,coreAdopted:false,
 policyDecision:false,policyObjects:false,privateReview:false,staticWorkpaper:false,
 staticReview:false,completedStageJournal:false,acknowledgedCalendarOnly:false,
 freezeWorkpaper:false,anyMutationJournal:false
};
const n=x=>next({...base,...x});
test("completed stages never replay and only recover missing freeze workpaper",()=>{
 assert.deepEqual(n({completedStageJournal:true,freezeWorkpaper:true}),{status:"BOTH_STAGES_ALREADY_ACKNOWLEDGED_NO_REPLAY"});
 assert.deepEqual(n({completedStageJournal:true,freezeWorkpaper:false}),{mode:"RECOVER_EXISTING_FREEZE_WORKPAPER"});
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
