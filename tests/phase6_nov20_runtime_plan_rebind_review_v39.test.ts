import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {verifyDayPlanGeometry,verifyRuntimePlans} from "../review-tools/p6_nov20_prepare_runtime_plan_rebind_v39";
import {replayP6CompactNov22Review,prepareP6ActualReviewInput,compileP6ActualCandidateExport} from "../scripts/v39_phase6_actual_release_candidate_export_v39";
const plan=(n:number)=>JSON.parse(readFileSync("data-collection/phase5/planning/phase6-source-day-"+String(n).padStart(2,"0")+".json","utf8"));
const clocks=["budgetDayUtc","physicalChargeDayUtc","serviceWindowStartUtc","serviceWindowEndUtc","earliestPlannedCutoffUtc","scheduledRequestUtc"];
const revise=(old:any)=>{
 const x=JSON.parse(JSON.stringify(old));
 const shift=(s:string)=>{const t=new Date(Date.parse(s)+86400000).toISOString();return s.length===10?t.slice(0,10):t};
 x.expectedServiceStartUtc=shift(x.expectedServiceStartUtc);
 for(const r of x.templates)for(const k of clocks)r[k]=shift(r[k]);
 return x;
};
describe("exact revised runtime day-plan rebind",()=>{
 it("permits only approved first day shift with reviewed evidence digest changes",()=>{
  const old=plan(1),next=revise(old);
  next.reviewedRefreshTiming.reviewed31DayCoverageGridSha256="a".repeat(64);
  next.reviewedSegmentedSource.reviewedProviderRangeEvidenceSha256="b".repeat(64);
  expect(()=>verifyDayPlanGeometry(old,next,1)).not.toThrow();
 });
 it("never moves other days or changes any query identity or price",()=>{
  const old=plan(1),next=revise(old);next.templates[0].apiUnitsPerAttempt++;
  expect(()=>verifyDayPlanGeometry(old,next,1)).toThrow(/UNAPPROVED_PLAN_GEOMETRY_DRIFT/);
  expect(()=>verifyDayPlanGeometry(plan(2),revise(plan(2)),2)).toThrow(/UNAPPROVED_PLAN_GEOMETRY_DRIFT/);
  expect(()=>verifyDayPlanGeometry(old,old,1)).toThrow(/UNAPPROVED_PLAN_GEOMETRY_DRIFT/);
  const bad=revise(old);bad.templates[0].sourceId="not permitted";
  expect(()=>verifyDayPlanGeometry(old,bad,1)).toThrow(/UNAPPROVED_PLAN_GEOMETRY_DRIFT/);
 });
 it("all other day geometry is immutable, including exact revised embedded ordinary envelope",()=>{
 const envelope=replayP6CompactNov22Review().shapeEnvelope;
 for(let n=2;n<=31;n++){
 const old=plan(n),next=JSON.parse(JSON.stringify(old));
 if(old.pairedIcaos===null)next.reviewedOrdinaryDayEnvelope={envelope,independentlyReviewedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256};
 expect(()=>verifyDayPlanGeometry(old,next,n)).not.toThrow();
 }
 });
 it("refuses unchanged or tampered ordinary-day envelopes",()=>{
 const old=plan(6);
 expect(old.pairedIcaos).toBeNull();
 expect(()=>verifyDayPlanGeometry(old,old,6)).toThrow(/NEW_ORDINARY_ENVELOPE_DRIFT/);
 const envelope=replayP6CompactNov22Review().shapeEnvelope;
 const bad=JSON.parse(JSON.stringify(old));bad.reviewedOrdinaryDayEnvelope={envelope,independentlyReviewedShapeEnvelopeSha256:"f".repeat(64)};
 expect(()=>verifyDayPlanGeometry(old,bad,6)).toThrow(/NEW_ORDINARY_ENVELOPE_DRIFT/);
 });
});

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
 const d=verifyRuntimePlans(result,stage,p=>readFileSync(p));
 expect(d).toHaveLength(31);
 expect(d.every(x=>x.changed)).toBe(true);
 const p1=JSON.parse(result.files[0].bytes),p6=JSON.parse(result.files[5].bytes),env=p6.reviewedOrdinaryDayEnvelope.envelope;
 console.log(JSON.stringify({status:"EXACT_NOV20_PUBLIC_METADATA_REPLAY_NO_GO",plans:d,planRebindMetadata:{coverageGridSha256:p1.reviewedRefreshTiming.reviewed31DayCoverageGridSha256,rangeEvidenceSha256:p1.reviewedSegmentedSource.reviewedProviderRangeEvidenceSha256,dateMapSha256:env.dateMapSha256,crossoverReview40Sha256:env.crossoverReview40Sha256,shapeEnvelopeSha256:env.shapeEnvelopeSha256},providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
},30000);
