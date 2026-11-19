"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {INERT,materialize}=require("./p5_static_install_review_materializer.cjs");
const H="a".repeat(64),MAIN="b".repeat(40);
function work(){
 const staticNames=Array.from({length:31},(_,i)=>"STATIC_"+String(i).padStart(2,"0"));
 const staticPlan=staticNames.map((name,i)=>({name,oldUpdatedAt:i%2?`2026-11-19T06:${String(i).padStart(2,"0")}:00.000Z`:null,operation:i%2?"REPLACE_REVIEWED":"CREATE"}));
 const inertPlan=INERT.map((name,i)=>({name,oldUpdatedAt:null,operation:"CREATE"}));
 return {status:"EXACT_STATIC_INSTALL_REVIEW_WORKPAPER_NOT_APPROVED_NO_GO",main:MAIN,staticCount:31,inertCount:3,staticPlan,inertPlan,draftReview:{
  schema:"v39.phase5.static-install-review.v1",approvedStaticInstallation:false,independentGlobalStopConfirmed:false,phase6PaidGo:false,main:MAIN,bundleReceiptSha256:H,staticValuesSha256:"c".repeat(64),privatePolicyReviewSha256:"d".repeat(64),reviewedBy:null,reviewedAtUtc:null,
  approvedReplacements:staticPlan.filter(x=>x.oldUpdatedAt!==null).map(({name,oldUpdatedAt})=>({name,updatedAt:oldUpdatedAt})),
  inertStageFlagInstallation:{approvedExactInertStageFlagInstallation:false,phase6PaidGo:false,authArtifactSha256:"e".repeat(64),stageSha256:"f".repeat(64),costEnvelopeSha256:"1".repeat(64),approvedNames:[...INERT],approvedReplacements:[]}
 }};
}
function input(){return {schema:"v39.phase5.static-install-reviewer-decision-input.v1",phase6PaidGo:false,approvedStaticInstallation:true,independentGlobalStopConfirmed:true,approvedExactInertStageFlagInstallation:true,adoptExactReplacementMetadata:true,reviewedBy:"Static Reviewer",reviewedAtUtc:"2026-11-19T07:00:00.000Z"}}
const NOW=Date.parse("2026-11-19T07:05:00.000Z");
test("exact workpaper materializes reviewed static and inert approvals",()=>{const w=work(),out=materialize(w,input(),NOW);assert.equal(out.approvedStaticInstallation,true);assert.equal(out.independentGlobalStopConfirmed,true);assert.equal(out.inertStageFlagInstallation.approvedExactInertStageFlagInstallation,true);assert.deepEqual(out.approvedReplacements,w.draftReview.approvedReplacements);assert.deepEqual(out.inertStageFlagInstallation.approvedReplacements,w.draftReview.inertStageFlagInstallation.approvedReplacements);assert.equal(out.phase6PaidGo,false)});
test("all reviewer decisions and replacement adoption are explicit",()=>{for(const k of ["approvedStaticInstallation","independentGlobalStopConfirmed","approvedExactInertStageFlagInstallation","adoptExactReplacementMetadata"]){const x=input();x[k]=false;assert.throws(()=>materialize(work(),x,NOW),/EXPLICIT_DECISIONS/)}});
test("non-pristine workpaper cannot be promoted",()=>{let w=work();w.draftReview.approvedStaticInstallation=true;assert.throws(()=>materialize(w,input(),NOW),/PRISTINE_DRAFT/);w=work();w.draftReview.inertStageFlagInstallation.approvedExactInertStageFlagInstallation=true;assert.throws(()=>materialize(w,input(),NOW),/PRISTINE_INERT_DRAFT/)});
test("plan count/name drift is refused",()=>{let w=work();w.staticPlan.pop();assert.throws(()=>materialize(w,input(),NOW),/PLAN_SCOPE/);w=work();w.inertPlan[0].name=w.inertPlan[1].name;assert.throws(()=>materialize(w,input(),NOW),/PLAN_SCOPE/)});
test("future review timestamp is refused",()=>{const x=input();x.reviewedAtUtc="2026-11-19T07:06:00.000Z";assert.throws(()=>materialize(work(),x,NOW),/REVIEW_CLOCK/)});
