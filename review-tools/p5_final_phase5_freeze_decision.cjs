#!/usr/bin/env node
"use strict";
/**
 * Materialize and validate the genuine post-commissioning Phase5 FREEZE.
 * No GitHub, DB, provider, secret or paid-GO mutation. This binds the exact
 * already-verified commissioning workpaper to an explicit reviewer decision.
 */
const fs=require("node:fs"),crypto=require("node:crypto");
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,AUTH=/^AUTH-\d{8}-[A-Z0-9]+$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_FINAL_FREEZE_"+k)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const canonical=x=>Buffer.from(JSON.stringify(x));
const validUtc=x=>typeof x==="string"&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const exactReadback=(x,mode,w)=>{
 const status=mode==="calendar"?"INDEPENDENT_EXACT_B0062_CALENDAR_ONLY_READONLY_MATCH_NO_GO":"INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO";
 need(x?.status===status&&x.codeSha===w.reviewedMainSha&&x.independentOwnerReadback===true&&
  x.authorizationEnabled===false&&x.providerCalls===0&&x.databaseWrites===0&&
  x.phase6PaidGo===false&&x.phase5ScientificFreeze===false&&x.verifiedReadOnly===true&&x.database==="neondb",
  "READBACK_"+mode.toUpperCase());
 need(x.manifestSha256===w.manifestSha256&&x.calendarSha256===w.calendarSha256&&
  x.exactReviewedStagePacketSha256===w.stageSha256&&x.calendarRows===31&&
  x.pairedAirportDays===10&&x.ordinaryAirportDaysUnselected===21&&x.restPhysicalChargeDates===38&&
  x.sourceQueriesAndPhysicalAttemptsZero===true&&x.alertSafetyValuesExact===true,"READBACK_SCOPE_"+mode.toUpperCase());
 if(mode==="calendar")need(x.costStageCommitted===false&&x.categoryCycleCaps===0&&x.categoryUtcBudgetRows===0,"CALENDAR_NO_COST");
 else need(x.exactReviewedCostEnvelopeSha256===w.costEnvelopeSha256&&x.categoryCycleCaps===7&&x.categoryUtcBudgetRows===266,"COST_SCOPE");
 need(validUtc(x.snapshotAtUtc),"READBACK_CLOCK_"+mode.toUpperCase());
 return Date.parse(x.snapshotAtUtc);
};
function validateWorkpaper(w){
 const hashes=["authArtifactSha256","manifestSha256","configSha256","calendarSha256","stageSha256","costEnvelopeSha256",
  "approvedPrivatePolicyReviewSha256","policyBundleSha256","bundleReceiptSha256","manifestStorageReceiptSha256","stageChainJournalSha256"];
 need(w?.schema==="v39.phase5.final-freeze-review-workpaper.v1"&&
  w.status==="EXACT_COMMISSIONING_EVIDENCE_WORKPAPER_NOT_FREEZE_NO_GO"&&C.test(w.reviewedMainSha??"")&&AUTH.test(w.authorizationId??"")&&
  hashes.every(k=>H.test(w[k]??""))&&w.evidenceScope==="EXISTING_ACKNOWLEDGED_COMMISSIONING_RECEIPTS_ONLY_NOT_FRESH_RECHECK","WORKPAPER_SCOPE");
 need(w.independentHumanFreezeDecisionAuthenticated===false&&w.phase5FreezeApproved===false&&w.reviewedBy===null&&w.reviewedAtUtc===null&&
  w.authorizationEnabled===false&&w.phase6PaidGo===false&&w.providerCalls===0&&w.databaseWrites===0,"WORKPAPER_NO_GO");
 const m=w.manifestStorageReceipt;
 need(m?.status==="EXACT_APPROVED_MANIFEST_STORED_AND_FRESH_READBACK_NO_GO"&&m.manifestSha256===w.manifestSha256&&
  m.authSha256===w.authArtifactSha256&&[0,1].includes(m.manifestRowsWritten)&&m.databaseWrites===m.manifestRowsWritten&&
  m.independentReadOnlyBytesMatch===true&&m.providerCalls===0&&m.authorizationEnabled===false&&m.phase6PaidGo===false,"MANIFEST_RECEIPT");
 need(Number.isSafeInteger(w.calendar?.runId)&&w.calendar.runId>0&&Number.isSafeInteger(w.cost?.runId)&&w.cost.runId>0&&
  w.calendar.runId!==w.cost.runId,"DISTINCT_STAGE_RUNS");
 const calendarAt=exactReadback(w.calendar.receipt,"calendar",w),costAt=exactReadback(w.cost.receipt,"cost",w);
 need(calendarAt<=costAt,"READBACK_ORDER");
 return {calendarAt,costAt};
}
function materialize(workpaper,input,nowMs=Date.now()){
 const t=validateWorkpaper(workpaper);
 need(input?.schema==="v39.phase5.final-freeze-reviewer-decision-input.v1"&&input.phase6PaidGo===false,"INPUT_SCOPE");
 for(const k of ["phase5ScientificReleaseFreezeApproved","commissioningEvidenceApproved","finalSchedulerRepinApproved","separatePhase6PaidGoRequired"])
  need(input[k]===true,"EXPLICIT_DECISION_"+k.toUpperCase());
 need(typeof input.reviewedBy==="string"&&input.reviewedBy.trim().length>=3&&validUtc(input.reviewedAtUtc),"REVIEWER_IDENTITY");
 const reviewed=Date.parse(input.reviewedAtUtc);
 need(Number.isFinite(nowMs)&&reviewed>=t.costAt&&reviewed<=nowMs,"REVIEW_CLOCK");
 const workpaperSha256=sha(canonical(workpaper));
 return {
  schema:"v39.phase5.final-freeze-decision.v1",
  status:"PHASE5_FINAL_SCIENTIFIC_RELEASE_FREEZE_APPROVED_NO_PAID_GO",
  reviewedMainSha:workpaper.reviewedMainSha,
  authorizationId:workpaper.authorizationId,
  authArtifactSha256:workpaper.authArtifactSha256,
  manifestSha256:workpaper.manifestSha256,
  configSha256:workpaper.configSha256,
  calendarSha256:workpaper.calendarSha256,
  stageSha256:workpaper.stageSha256,
  costEnvelopeSha256:workpaper.costEnvelopeSha256,
  approvedPrivatePolicyReviewSha256:workpaper.approvedPrivatePolicyReviewSha256,
  policyBundleSha256:workpaper.policyBundleSha256,
  finalFreezeWorkpaperSha256:workpaperSha256,
  bundleReceiptSha256:workpaper.bundleReceiptSha256,
  manifestStorageReceiptSha256:workpaper.manifestStorageReceiptSha256,
  stageChainJournalSha256:workpaper.stageChainJournalSha256,
  calendarRunId:workpaper.calendar.runId,
  calendarReadbackAtUtc:workpaper.calendar.receipt.snapshotAtUtc,
  costRunId:workpaper.cost.runId,
  costReadbackAtUtc:workpaper.cost.receipt.snapshotAtUtc,
  phase5ScientificReleaseFreezeApproved:true,
  commissioningEvidenceApproved:true,
  finalSchedulerRepinApproved:true,
  separatePhase6PaidGoRequired:true,
  reviewedBy:input.reviewedBy.trim(),
  reviewedAtUtc:input.reviewedAtUtc,
  authorizationEnabled:false,
  phase6PaidGo:false
 };
}
function validateDecision(workpaper,d,nowMs=Date.now()){
 const expected=materialize(workpaper,{
  schema:"v39.phase5.final-freeze-reviewer-decision-input.v1",
  phase6PaidGo:false,
  phase5ScientificReleaseFreezeApproved:d?.phase5ScientificReleaseFreezeApproved,
  commissioningEvidenceApproved:d?.commissioningEvidenceApproved,
  finalSchedulerRepinApproved:d?.finalSchedulerRepinApproved,
  separatePhase6PaidGoRequired:d?.separatePhase6PaidGoRequired,
  reviewedBy:d?.reviewedBy,
  reviewedAtUtc:d?.reviewedAtUtc
 },nowMs);
 need(d&&JSON.stringify(d)===JSON.stringify(expected),"DECISION_BYTES_OR_SCOPE");
 return true;
}
const read=(p,canonicalRequired=false)=>{const raw=fs.readFileSync(p);let x;try{x=JSON.parse(raw)}catch{need(false,"INVALID_JSON")}
 if(canonicalRequired)need(canonical(x).equals(raw),"NONCANONICAL_"+p.split("/").pop());return {raw,x}};
function run(){
 need(process.argv.length===4,"ARGS");
 const work=read(process.argv[2],true).x,input=read(process.argv[3],true).x;
 process.stdout.write(canonical(materialize(work,input)));
}
module.exports={materialize,validateDecision,validateWorkpaper,canonical};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_FINAL_FREEZE_[A-Z0-9_./-]+$/.test(s)?s:"HOLD_P5_FINAL_FREEZE_REDACTED");process.exitCode=2}
