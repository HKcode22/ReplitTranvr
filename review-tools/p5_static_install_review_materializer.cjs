#!/usr/bin/env node
"use strict";
/** Canonical static-install review materializer from the exact generated workpaper. */
const fs=require("node:fs"),crypto=require("node:crypto");
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/,H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const INERT=["P6_INERT_CALENDAR_REVIEW_APPROVED","P6_INERT_COST_REVIEW_APPROVED","V39_PHASE5_SOURCE_RIGHTS_APPROVED"];
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_STATIC_REVIEW_MATERIALIZER_"+k)};
const canonical=x=>Buffer.from(JSON.stringify(x));
const utc=x=>typeof x==="string"&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
function exactPlan(plan,count){
 need(Array.isArray(plan)&&plan.length===count&&new Set(plan.map(x=>x.name)).size===count&&plan.every(x=>typeof x.name==="string"&&["CREATE","REPLACE_REVIEWED"].includes(x.operation)&&Object.hasOwn(x,"oldUpdatedAt")),"PLAN_SCOPE");
}
function materialize(work,input,nowMs=Date.now()){
 need(work?.status==="EXACT_STATIC_INSTALL_REVIEW_WORKPAPER_NOT_APPROVED_NO_GO"&&C.test(work.main??"")&&Number.isSafeInteger(work.staticCount)&&Number.isSafeInteger(work.inertCount)&&work.staticCount===31&&work.inertCount===3,"WORKPAPER_SCOPE");
 exactPlan(work.staticPlan,31);exactPlan(work.inertPlan,3);
 const d=work.draftReview,a=d?.inertStageFlagInstallation;
 need(d?.schema==="v39.phase5.static-install-review.v1"&&d.approvedStaticInstallation===false&&d.independentGlobalStopConfirmed===false&&d.phase6PaidGo===false&&d.main===work.main&&[d.bundleReceiptSha256,d.staticValuesSha256,d.privatePolicyReviewSha256].every(x=>H.test(x??""))&&Array.isArray(d.approvedReplacements),"PRISTINE_DRAFT");
 need(a?.approvedExactInertStageFlagInstallation===false&&a.phase6PaidGo===false&&[a.authArtifactSha256,a.stageSha256,a.costEnvelopeSha256].every(x=>H.test(x??""))&&JSON.stringify(a.approvedNames)===JSON.stringify(INERT)&&Array.isArray(a.approvedReplacements),"PRISTINE_INERT_DRAFT");
 need(input?.schema==="v39.phase5.static-install-reviewer-decision-input.v1"&&input.phase6PaidGo===false&&input.approvedStaticInstallation===true&&input.independentGlobalStopConfirmed===true&&input.approvedExactInertStageFlagInstallation===true&&input.adoptExactReplacementMetadata===true,"EXPLICIT_DECISIONS");
 need(typeof input.reviewedBy==="string"&&input.reviewedBy.trim().length>=3&&utc(input.reviewedAtUtc)&&Date.parse(input.reviewedAtUtc)<=nowMs,"REVIEW_CLOCK");
 const out=JSON.parse(JSON.stringify(d));
 out.approvedStaticInstallation=true;out.independentGlobalStopConfirmed=true;out.reviewedBy=input.reviewedBy.trim();out.reviewedAtUtc=input.reviewedAtUtc;
 out.inertStageFlagInstallation.approvedExactInertStageFlagInstallation=true;
 need(JSON.stringify(out.approvedReplacements)===JSON.stringify(d.approvedReplacements)&&JSON.stringify(out.inertStageFlagInstallation.approvedReplacements)===JSON.stringify(a.approvedReplacements),"REPLACEMENT_METADATA_DRIFT");
 return out;
}
function run(){
 need(process.argv.length===4,"ARGS");const wr=fs.readFileSync(process.argv[2]),work=JSON.parse(wr),ir=fs.readFileSync(process.argv[3]),input=JSON.parse(ir);
 need(canonical(input).equals(ir),"REVIEW_INPUT_NOT_CANONICAL");
 process.stdout.write(canonical(materialize(work,input)));
}
module.exports={INERT,materialize,canonical};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_STATIC_REVIEW_MATERIALIZER_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_STATIC_REVIEW_MATERIALIZER_REDACTED");process.exitCode=2}
