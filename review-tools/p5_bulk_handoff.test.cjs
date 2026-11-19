"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {sequence,planInertApprovals,staticReviewWorkpaper,INERT_APPROVALS}=require("./p5_bulk_final_owner_handoff.cjs");
const h=x=>x.repeat(64).slice(0,64),main="a".repeat(40);
function ops(log){return Object.fromEntries(["coreInputs","assemble","verify","prepareStaticReviewWorkpaper","installPlan","checkStagePrerequisites","noPriorAttempt","storeManifest","install","installInertApprovals","stage","resumeStage"].map(k=>[k,(...a)=>log.push([k,...a])]));}
test("mode sequencing never mutates before verification/planning",()=>{
 let l=[];sequence("PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE",ops(l));assert.deepEqual(l,[["coreInputs","PREPARE_CORE_EXACT_REVIEW_NO_LEDGER_WRITE"]]);
 l=[];sequence("PREPARE_POLICY_REVIEW",ops(l));assert.deepEqual(l,[["assemble"]]);
 l=[];sequence("PREPARE_STATIC_REVIEW",ops(l));assert.deepEqual(l,[["verify"],["prepareStaticReviewWorkpaper"]]);
 l=[];sequence("RESUME_ACKNOWLEDGED_CALENDAR_NO_GO",ops(l));assert.deepEqual(l,[["verify"],["resumeStage"]]);
 l=[];sequence("COMMISSION_EXISTING_INERT_NO_GO",ops(l));assert.deepEqual(l.map(x=>x[0]),["verify","installPlan","checkStagePrerequisites","noPriorAttempt","storeManifest","install","installInertApprovals","stage"]);
});
test("unknown mode refuses",()=>assert.throws(()=>sequence("GO",ops([])),/HOLD_P5_BULK_MODE/));
test("existing inert approval names need no write when review has no replacement section",()=>{
 const review={},metadata=INERT_APPROVALS.map((name,i)=>({name,updatedAt:`2026-11-19T06:0${i}:00.000Z`}));
 assert.deepEqual(planInertApprovals(review,{},metadata,()=>{throw Error("should not plan")}),[]);
});
test("reviewed inert approval installation is exactly three names and no GO",()=>{
 const receipt={authArtifactSha256:h("1"),stageSha256:h("2"),costEnvelopeSha256:h("3")};
 const replacements=INERT_APPROVALS.map((name,i)=>({name,updatedAt:`2026-11-19T06:0${i}:00.000Z`}));
 const review={inertStageFlagInstallation:{approvedExactInertStageFlagInstallation:true,phase6PaidGo:false,authArtifactSha256:receipt.authArtifactSha256,stageSha256:receipt.stageSha256,costEnvelopeSha256:receipt.costEnvelopeSha256,approvedNames:[...INERT_APPROVALS],approvedReplacements:replacements}};
 const metadata=[...replacements];
 const out=planInertApprovals(review,receipt,metadata,(names,rows,reps)=>names.map(name=>({name,operation:"REPLACE_REVIEWED"})));
 assert.deepEqual(out.map(x=>x.name).sort(),[...INERT_APPROVALS].sort());
 assert.throws(()=>planInertApprovals({...review,inertStageFlagInstallation:{...review.inertStageFlagInstallation,phase6PaidGo:true}},receipt,metadata,()=>[]),/HOLD_P5_BULK_EXACT_INERT_FLAG_REVIEW_SCOPE/);
});
test("static workpaper stays explicitly unapproved and excludes control names",()=>{
 const values={};for(let i=0;i<31;i++)values["STATIC_"+String(i).padStart(2,"0")]="v"+i;
 const receipt={schema:"v39.phase5.exact-final-commissioning-bundle.v1",status:"EXACT_LEDGER_AUTH_AND_REVIEWED_POLICY_BUNDLE_VERIFIED_NO_PAID_DISPATCH",phase6PaidGo:false,approvalFlagsPrepared:0,githubMutations:0,main,staticSecretsPrepared:31,approvedPrivatePolicyReviewSha256:h("1"),authArtifactSha256:h("2"),stageSha256:h("3"),costEnvelopeSha256:h("4")};
 const metadata=[...Object.keys(values),...INERT_APPROVALS].map((name,i)=>({name,updatedAt:`2026-11-19T06:${String(i%60).padStart(2,"0")}:00.000Z`}));
 const plan=(names,rows,reps)=>names.map(name=>({name,operation:"REPLACE_REVIEWED"}));
 const w=staticReviewWorkpaper(receipt,h("5"),h("6"),values,metadata,plan);
 assert.equal(w.status,"EXACT_STATIC_INSTALL_REVIEW_WORKPAPER_NOT_APPROVED_NO_GO");
 assert.equal(w.draftReview.approvedStaticInstallation,false);
 assert.equal(w.draftReview.independentGlobalStopConfirmed,false);
 assert.equal(w.draftReview.phase6PaidGo,false);
 assert.equal(w.draftReview.inertStageFlagInstallation.approvedExactInertStageFlagInstallation,false);
 assert.equal(w.staticCount,31);assert.equal(w.inertCount,3);
});
