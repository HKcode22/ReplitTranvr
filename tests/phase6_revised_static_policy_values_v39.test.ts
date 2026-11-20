import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {it,expect} from "vitest";
import {prepareP6ActualReviewInput,compileP6ActualCandidateExport} from "../scripts/v39_phase6_actual_release_candidate_export_v39";
import {buildRevisedStaticValues,bindMondayPolicyStage} from "../review-tools/p6_nov20_finalize_recovered_policies_v39";
import {compileP6ProspectiveDisabledStageRevisionV39} from "../server/lib/disruption/phase6ProspectiveDisabledStageRevision_v39";
// Independent replay using public planning metadata only. The exact stage hash
// is the owner-confirmed revised packet, not a new authorization or DB action.
it("replays the actual revised 6144-query compiler against the exact owner stage and all committed plans",()=>{
 const code="0a7b1a28f243de76d4c83026d15f585265ef6f7b";
 const h=(v:string|Buffer)=>createHash("sha256").update(v).digest("hex");
 const evidence=(path:string)=>({path,sha256:h(readFileSync(path))});
 const docs=(p:string[])=>p.map(evidence);
 const review=prepareP6ActualReviewInput(code,0,"COMPACT_NOV22");
 const rec=review.concreteReviewRecommendation;
 const {timingEvidenceSha256:unused,...timingLimits}=review.timingCandidate;
 const timingSha=h(JSON.stringify({schema:"v39.phase6.prearm-timing-policy-evidence-candidate.v1",clock:rec.actualClock,historicalSourceAndPost:docs(["data-collection/phase4/2026-11-05_G5A_NOV06_1400Z_NEW_PROSPECTIVE_RELEASE_GATE.md","data-collection/phase5/2026-11-16_EXACT_POSTSTAGE_COMMISSIONING_READBACK.md","data-collection/phase5/2026-11-16_PREARM_CLOCK_TWO_WAVE_VALIDATION_NO_GO.md"]),proposedLimits:timingLimits,liveNeonAndProviderBoundsCertified:false,sustainedCronCertified:false,independentReviewApproved:false}));
 const rangeSha=h(JSON.stringify({schema:"v39.phase6.provider-range-price-evidence-candidate.v1",originalHistoricalAccount:evidence("data-collection/evidence/early-gates/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json"),currentQuota:review.quotaEvidence,historicalPaidSource:docs(["data-collection/phase3/2026-10-27_GATE05C_FIDS_WITHLEG_PAID_SCHEMA_RETEST_PROTOCOL.md","data-collection/phase4/2026-11-01_GATE5_REAL_PAID_FIDS_ONE_NONRETAINED_SEMANTIC_CHECK.md","data-collection/phase5/2026-11-16_FINAL_DUAL_LEDGER_REVIEW_AND_COMMISSIONING.md"]),proposedProviderRangeMinutes:review.externalCandidate.providerMaxRangeMinutes,proposedApiUnitsPerPhysicalGet:review.externalCandidate.apiUnitsPerPhysicalGet,publicContractRangeBasis:"September 7 provider announcement summarized in cited repository checkpoint; prior 12h documented range, not measured today",currentAccountRangePriceCertified:false,sourceRightsApproved:false,independentReviewApproved:false}));
 const predecessorEvidenceIds=["RUN-20261116-OWNERREVIEW112557","RUN-20261116-PREARMCLOCK43832469501","RUN-20261116-QUOTA091844","RUN-20261116-BTSOVERLAP14198898471","RUN-20261116-SOURCEGAPSENSITIVITY","RUN-20261116-HISTORICALFIDSCLEAR","RUN-20261116-V0103VERIFY43987495623","RUN-20261116-HISTORICALPREINVENTORY","RUN-20261116-V0104OWNERINSTALL","RUN-20261116-HEARTBEAT43992105353","RUN-20261116-PRIMARYEXPIRY43997742324","RUN-20261116-HISTORICALPRECLASSIFICATION015741","RUN-20261119-FRESHACCOUNT033903","RUN-20261119-SCIENTIFICSCOPEREVIEW","RUN-20261119-FRESHBUDGETRECONCILED","RUN-20261119-OPERATIONALSCOPEREVIEW","RUN-20261119-EXACTCOMPACTCOST","RUN-20261119-NATIVEPOSTGEOMETRY","RUN-20261119-ACTUALSIGNERALIASES","RUN-20261119-ACTUALPOLICYRECOVERY","RUN-20261119-ACTUALOWNERRECOVERY","DEC-20261119-OWNERPRESERVEF8","RUN-20261119-EXISTINGSTOPGUARDEVIDENCE","RUN-20261119-FINALOWNERMETADATA","RUN-20261119-NATIVECOREPREARMREVIEW","RUN-20261119-CURRENTGITHUBSTOP","RUN-20261119-PUBLISHEDGITHUBSTOPCOMBINED"];
 const external={...review.externalCandidate,manifestSha256:"3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7",calendarSha256:"9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6",configSha256:"001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88",frameSha256:review.frameEvidence.frameHash,codeSha40:code,phase6AuthorizationId:"AUTH-20261119-P5INERTFREEZE",predecessorEvidenceIds,alertSafety:rec.proposedAlertSafety,providerRangeEvidenceSha256:rangeSha,timingEvidenceSha256:timingSha,cycleRestCeilingUnits:rec.netRestCeilingUnits,jointBudgetReview:rec.jointBudgetReview};
 const eb=Buffer.from(JSON.stringify(external)),tb=Buffer.from(JSON.stringify({...review.timingCandidate,timingEvidenceSha256:timingSha}));
 const result=compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:h(eb),timingBytes:tb,expectedTimingFileSha256:h(tb),calendarVariant:"COMPACT_NOV22"});
 const stage=result.files[31].bytes;
 expect(h(stage)).toBe("6d06cd56f3cf09b7d4f5a6033b70f253e6247a9e1b27dbb839b0080a66e771fc");
 const st=JSON.parse(stage);
 expect(result.summary.unsignedCostOnlyEnvelopeSha256).toBe("a3d3525a890bfe542f9588b18d3b5d9367ba657ccae2c1c0401edc625ac46124");
 for(const f of result.files.slice(0,31))expect(h(readFileSync(f.path))).toBe(f.sha256);
 const p={codeSha:"b".repeat(40),manifestSha256:st.manifestSha256,configSha256:st.configSha256,calendarSha256:st.calendarSha256,frameSha256:st.frameSha256,costSha256:result.summary.unsignedCostOnlyEnvelopeSha256,providerContractSha256:"63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09",releaseSha256:h("synthetic release"),rightsSha256:h("synthetic rights")};
 const names=["P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64"];
 const mockPolicies=Object.fromEntries(names.map(n=>[n,{synthetic:true,approved:false}]));
 const v=buildRevisedStaticValues(p,mockPolicies,stage,h("synthetic price"));
 expect(Object.keys(v)).toHaveLength(31);
 expect(v.V39_P5_APPROVED_CODE_SHA).toBe(p.codeSha);
 expect(JSON.parse(v.P6_INERT_STAGE_INPUT_JSON).codeSha40).toBe(code);
 expect(v.P6_INERT_STAGE_INPUT_SHA256).toBe(h(stage));
 expect(v.P6_NONPAID_DAILY_POLICY_SHA256).toBe(h(Buffer.from(v.P6_NONPAID_DAILY_POLICY_BASE64,"base64")));
 expect(()=>buildRevisedStaticValues({...p,codeSha:code},mockPolicies,stage,h("synthetic price"))).toThrow(/STATIC_EXACT_REVISED_PINS/);
 expect(()=>buildRevisedStaticValues(p,mockPolicies,stage+" ",h("synthetic price"))).toThrow(/STATIC_EXACT_REVISED_PINS/);
 console.log("REVISED_STATIC_31_VALUES_PIN_SEPARATION_SYNTHETIC_NO_GO");
},30000);

it("binds the Monday six-policy statics to the real recompiled stage and tail, never old pins",()=>{
 const h=(v:string|Buffer)=>createHash("sha256").update(v).digest("hex");
 const code="c".repeat(40),review=prepareP6ActualReviewInput(code,0,"COMPACT_MONDAY_NOV23"),rec=review.concreteReviewRecommendation;
 const calendar=review.externalCandidate.expectedCalendarRowsSha256;
 const config=JSON.stringify({calendarRowsSha256:calendar,frameSha256:review.frameEvidence.frameHash,phase6PaidGo:false});
 const manifest=JSON.stringify({calendarRowsSha256:calendar,configSha256:h(config),originalFrozenPacketPreserved:true,originalFrozenManifestSha256:"3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7",scientificFreezeApproved:true,sourceUseDeferredToPhase6Activation:true,sourceRightsApproved:false,phase6PaidGo:false});
 const timingSha=h("synthetic timing");
 const external={...review.externalCandidate,manifestSha256:h(manifest),calendarSha256:calendar,configSha256:h(config),phase6AuthorizationId:"AUTH-20261120-CIMONDAY",predecessorEvidenceIds:["CI-ONLY-NOT-RELEASE"],alertSafety:rec.proposedAlertSafety,providerRangeEvidenceSha256:h("synthetic range"),timingEvidenceSha256:timingSha,cycleRestCeilingUnits:rec.netRestCeilingUnits,jointBudgetReview:rec.jointBudgetReview};
 const eb=Buffer.from(JSON.stringify(external)),tb=Buffer.from(JSON.stringify({...review.timingCandidate,timingEvidenceSha256:timingSha}));
 const result=compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:h(eb),timingBytes:tb,expectedTimingFileSha256:h(tb),calendarVariant:"COMPACT_MONDAY_NOV23"});
 const stage=result.files[31].bytes;
 const b=bindMondayPolicyStage(stage,manifest,config,eb,tb);
 expect(b.outcomeTailUtc).toBe("2026-12-29T04:00:00.000Z");expect(b.stageSha).toBe(h(stage));expect(b.costSha).toBe(result.summary.unsignedCostOnlyEnvelopeSha256);
 const p={codeSha:"d".repeat(40),manifestSha256:h(manifest),configSha256:h(config),calendarSha256:calendar,frameSha256:review.frameEvidence.frameHash,costSha256:b.costSha,providerContractSha256:"63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09",releaseSha256:h("synthetic release"),rightsSha256:h("synthetic rights"),outcomeTailUtc:b.outcomeTailUtc};
 const names=["P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64"];
 const w=Object.fromEntries(names.map(n=>[n,{synthetic:true,approved:false}]));
 const v=buildRevisedStaticValues(p,w,stage,h("price"),b);
 expect(Object.keys(v)).toHaveLength(31);expect(v.V39_P5_CALENDAR_HASH).toBe(calendar);expect(v.P6_INERT_STAGE_INPUT_SHA256).toBe(h(stage));expect(v.V39_P5_POST_CATEGORY_BUDGET_SHA256).toBe(b.costSha);
 expect(()=>buildRevisedStaticValues({...p,outcomeTailUtc:"2026-12-26T04:00:00.000Z"},w,stage,h("price"),b)).toThrow("STATIC_MONDAY_BINDING");
 expect(()=>buildRevisedStaticValues(p,w,stage,h("price"))).toThrow("STATIC_EXACT_REVISED_PINS");
 expect(()=>bindMondayPolicyStage(stage,manifest+" ",config,eb,tb)).toThrow("MONDAY_EXACT_COMPILER_AND_MANIFEST");
},30000);

it("passes the exact Nov22 to Monday calendar through the actual multi-day disabled restage compiler",()=>{
 const h=(v:string|Buffer)=>createHash("sha256").update(v).digest("hex"),json=(v:unknown)=>JSON.stringify(v),digest=(v:unknown)=>h(json(v));
 const oldReview=prepareP6ActualReviewInput("c".repeat(40),0,"COMPACT_NOV22");
 const nextReview=prepareP6ActualReviewInput("d".repeat(40),0,"COMPACT_MONDAY_NOV23");
 function build(review:typeof oldReview,variant:"COMPACT_NOV22"|"COMPACT_MONDAY_NOV23",priorManifest?:string){
  const cfg={schema:"v39.phase6.synthetic-restage-config.v1",calendarRowsSha256:review.externalCandidate.expectedCalendarRowsSha256,frameSha256:review.frameEvidence.frameHash,phase6PaidGo:false};
  const manifest={schema:"v39.phase6.synthetic-restage-manifest.v1",calendarRowsSha256:cfg.calendarRowsSha256,configSha256:digest(cfg),scientificFreezeApproved:true,sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,phase6PaidGo:false,...(priorManifest?{originalFrozenPacketPreserved:true,originalFrozenManifestSha256:priorManifest}:{})};
  const rec=review.concreteReviewRecommendation,timingSha=h("synthetic timing");
  const external={...review.externalCandidate,manifestSha256:digest(manifest),calendarSha256:cfg.calendarRowsSha256,configSha256:digest(cfg),phase6AuthorizationId:"AUTH-20261120-CIRESTAGE",predecessorEvidenceIds:["CI-ONLY-RESTAGE-NOT-APPROVAL"],alertSafety:rec.proposedAlertSafety,providerRangeEvidenceSha256:h("synthetic range"),timingEvidenceSha256:timingSha,cycleRestCeilingUnits:rec.netRestCeilingUnits,jointBudgetReview:rec.jointBudgetReview};
  const eb=Buffer.from(json(external)),tb=Buffer.from(json({...review.timingCandidate,timingEvidenceSha256:timingSha}));
  const out=compileP6ActualCandidateExport({externalBytes:eb,expectedExternalFileSha256:h(eb),timingBytes:tb,expectedTimingFileSha256:h(tb),calendarVariant:variant});
  const raw=out.files[31].bytes,input=JSON.parse(raw),stageSha=h(raw),costSha=out.summary.unsignedCostOnlyEnvelopeSha256;
  const stageReview={expectedSignedStagePacketSha256:stageSha,expectedExactWriterRole:"phase5_b0062_prelaunch_stage_ci20261120",independentCalendarTreatmentReviewApproved:true as const,independentProviderAccountAndRestBudgetReviewApproved:true as const,narrowPrelaunchOwnerApproved:true as const};
  const freezeReview={expectedStagedB0062PacketSha256:stageSha,expectedSignedSevenCategoryCostSha256:costSha,expectedExactBudgetWriterRole:"phase5_fids_budget_freeze_ci_20261120",independentProspectiveCalendarAndTreatmentApproved:true as const,independentRealProviderRangeAndRestBudgetApproved:true as const,independentSourceContentsRightsForIntendedUseApproved:false as const,sourceUseDeferredToPhase6Activation:true as const,exactRestrictedNoProviderBudgetFreezeApproved:true as const};
  return {input,stageSha,costSha,stageReview,freezeReview,manifestRaw:json(manifest)};
 }
 const old=build(oldReview,"COMPACT_NOV22"),next=build(nextReview,"COMPACT_MONDAY_NOV23",old.input.manifestSha256);
 const ctx={oldInput:old.input,oldStageReview:old.stageReview,oldFreezeReview:old.freezeReview,newInput:next.input,newStageReview:next.stageReview,newFreezeReview:next.freezeReview,newManifestRaw:next.manifestRaw,review:{schema:"v39.phase6.prospective-disabled-stage-revision-review.v2" as const,expectedOldStageInputSha256:old.stageSha,expectedOldCostEnvelopeSha256:old.costSha,expectedNewStageInputSha256:next.stageSha,expectedNewCostEnvelopeSha256:next.costSha,expectedOriginalFrozenManifestSha256:old.input.manifestSha256,expectedNewManifestSha256:next.input.manifestSha256,expectedPriorCodeSha40:old.input.codeSha40,expectedCurrentCodeSha40:next.input.codeSha40,reviewedCalendarRevisionEvidenceSha256:h("synthetic date review"),independentProspectiveRevisionApproved:true as const,originalScientificDesignPreserved:true as const,oldStageRemainsArchivedEvidence:true as const,noBackfillApproved:true as const},now:new Date("2026-11-20T10:00:00.000Z")};
 const c=compileP6ProspectiveDisabledStageRevisionV39(ctx);
 expect(c.changedParentDays).toBe(31);expect(c.firstOldServiceUtc).toBe("2026-11-22T00:00:00.000Z");expect(c.firstNewServiceUtc).toBe("2026-11-25T00:00:00.000Z");expect(c.phase6PaidGo).toBe(false);
 expect(()=>compileP6ProspectiveDisabledStageRevisionV39({...ctx,now:new Date("2026-11-23T23:10:00.000Z")})).toThrow("FIRST_PROSPECTIVE_T24_WINDOW_ALREADY_DUE");
},30000);

import {validateP6MondayDateDecision} from "../review-tools/p6_nov23_prospective_revision_owner_v39";
it("requires the real exact separately reviewed Monday scope, not the unsigned geometry receipt",()=>{
 const h=(s:string)=>createHash("sha256").update(s).digest("hex"),expected={reviewDigest:h("scope"),dateReceiptSha256:h("date"),oldStageSha256:h("old"),sourceInventorySha256:h("source")};
 const synthetic={schema:"v39.phase6.monday-prospective-date-independent-review.v1",...expected,reviewedBy:"CI synthetic reviewer only",reviewedAtUtc:"2026-11-20T10:00:00.000Z",independentProspectiveRevisionApproved:true,originalScientificDesignPreserved:true,oldStageRemainsArchivedEvidence:true,noBackfillApproved:true,sourceUseDeferredToPhase6Activation:true,phase6PaidGo:false};
 const now=new Date("2026-11-20T10:01:00.000Z");expect(validateP6MondayDateDecision(synthetic,expected,now)).toBe(true);
 for(const bad of [{...synthetic,independentProspectiveRevisionApproved:false},{...synthetic,reviewDigest:h("other")},{...synthetic,sourceInventorySha256:h("other")},{...synthetic,phase6PaidGo:true},{...synthetic,reviewedAtUtc:"2026-11-23T23:10:00.000Z"}])expect(()=>validateP6MondayDateDecision(bad,expected,now)).toThrow("EXACT_INDEPENDENT_DATE_DECISION_REQUIRED");
});
