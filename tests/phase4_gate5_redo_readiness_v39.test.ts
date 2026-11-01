import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
  assessPhase4Gate5RedoEvidenceV39,
  GATE5_PRE_HORIZONS_V39,
  type Gate5RedoEvidenceV39,
  type Gate5RedoHorizonEvidenceV39
} from "../server/lib/disruption/phase4Gate5RedoReadiness_v39";
import {scheduledWsssHorizonV39}
 from "../scripts/v39_phase4_one_prospective_fids_paid_actions";

const completeHorizon=(h:Gate5RedoHorizonEvidenceV39["horizon"]):Gate5RedoHorizonEvidenceV39=>({
 horizon:h,sourceState:"RETAINED_ASOF_VERIFIED",
 sourceAvailableBeforeCutoff:true,sourceIntegrityVerified:true,
 candidatePopulationCount:20,confirmedOperatingCount:14,
 horizonEligibleCount:14,persistedCertifiedPreCount:14,
 webhookCapturedCount:0,capturedOutsidePopulationCount:0,
 requiredFeaturesCompleteCount:10,optionalFeaturesMissingCount:4,
 targetApplicableCount:14,actualOutcomeObservedCount:0,
 targetPendingCount:14,targetCensoredCount:0,targetMissingCount:0,
 targetNotApplicableCount:0
});
const complete=():Gate5RedoEvidenceV39=>({
 frozenSingleCohort:"VERIFIED",
 selectedProviderNativeTMilestone:"VERIFIED",
 firstObservedScheduleVersionAndAsOf:"VERIFIED",
 physicalOperatingLegAndCodeshareRules:"VERIFIED",
 actualOnlyRunwayTargetSemantics:"VERIFIED",
 fidsPrimaryVersusContextRole:"VERIFIED",
 providerRangeBoundaryAndTruncation:"VERIFIED",
 preFrozenFullHorizonAcquisitionGrid:"VERIFIED",
 measuredAcquisitionGuardCadenceStaleness:"VERIFIED",
 gitHubRunnerPrearmedBeforeFirstCutoff:"VERIFIED",
 originalRawRetentionPermissionAndExpiry:"VERIFIED",
 accountBudgetAndExactPaidScopeReviewed:"VERIFIED",
 duplicateAndLateRequestRefusalTested:"VERIFIED",
 horizons:GATE5_PRE_HORIZONS_V39.map(completeHorizon)
});
describe("Phase4 Gate5 next cohort redo evidence — offline only",()=>{
 it("reproduces the real Oct31 failed 08:42 PDT delayed 03:07 scheduled attempt",()=>{
  const e={
   GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
   GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
   GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
   P4_FIDS_SCHEDULE_CRON:"7 10 31 10 *",
   P4_ONE_FIDS_EXACT_INTENT:"PHASE4_WSSS_THREE_HORIZON_SINGLE_GET_PER_CRON_NO_RETRIES"
  } as NodeJS.ProcessEnv;
  expect(()=>scheduledWsssHorizonV39(e,Date.parse("2026-10-31T15:42:29Z")))
   .toThrow("P4_FIDS_SCHEDULED_HORIZON_WINDOW_HOLD");
  expect(()=>scheduledWsssHorizonV39(e,Date.parse("2026-10-31T10:45:00Z")))
   .not.toThrow();
  expect(()=>scheduledWsssHorizonV39(e,Date.parse("2026-10-31T10:45:00.001Z")))
   .toThrow();
 });
 it("the actual Oct31 cohort cannot be promoted; T6 unobserved, T24 expired",()=>{
  const e=complete();
  e.selectedProviderNativeTMilestone="UNVERIFIED";
  e.actualOnlyRunwayTargetSemantics="UNVERIFIED";
  e.physicalOperatingLegAndCodeshareRules="UNVERIFIED";
  e.preFrozenFullHorizonAcquisitionGrid="MISSING";
  e.horizons=[
    {...completeHorizon("T-24h"),sourceState:"EXPIRED",
      candidatePopulationCount:null,horizonEligibleCount:null,persistedCertifiedPreCount:null},
    {...completeHorizon("T-6h"),sourceState:"UNOBSERVED",
      candidatePopulationCount:null,horizonEligibleCount:null,persistedCertifiedPreCount:null},
    {...completeHorizon("T-90m"),candidatePopulationCount:86,
      confirmedOperatingCount:0,horizonEligibleCount:null,
      persistedCertifiedPreCount:0,webhookCapturedCount:null,
      targetApplicableCount:null,actualOutcomeObservedCount:null,
      targetPendingCount:null,targetCensoredCount:null,targetMissingCount:null,
      targetNotApplicableCount:null}
  ];
  const a=assessPhase4Gate5RedoEvidenceV39(e);
  expect(a.sourcePilotAdmission).toBe("HOLD");
  expect(a.scientificGate5).toBe("HOLD");
  expect(a.blockers).toContain("UNVERIFIED_ASOF_SOURCE:T-6h");
  expect(a.blockers).toContain("UNVERIFIED_ASOF_SOURCE:T-24h");
  expect(a.blockers).toContain("PROOF_MISSING:selectedProviderNativeTMilestone");
  expect(a.blockers).toContain("UNMEASURED_COUNTERS:T-90m");
  expect(a.phase5FreezeAuthorized).toBe(false);
  expect(a.phase6Authorized).toBe(false);
  expect(a.providerCalls).toBe(0);
 });
 it("a missing horizon, duplicate horizon, or impossible counter is never science complete",()=>{
  const a=complete();
  a.horizons=[
   completeHorizon("T-24h"),completeHorizon("T-24h"),
   {...completeHorizon("T-90m"),webhookCapturedCount:21}
  ];
  const r=assessPhase4Gate5RedoEvidenceV39(a);
  expect(r.blockers).toContain("DUPLICATE_HORIZON:T-24h");
  expect(r.blockers).toContain("MISSING_HORIZON:T-6h");
  expect(r.blockers).toContain("COUNTER_CONTRADICTION:T-90m");
  expect(r.scientificGate5).toBe("HOLD");
 });
 it("a fully provided fixture still never self-authorizes paid work, phase5 or phase6",()=>{
  const r=assessPhase4Gate5RedoEvidenceV39(complete());
  expect(r.blockers).toEqual([]);
  expect(r.sourcePilotAdmission).toBe("READY_FOR_SEPARATE_EXPLICIT_AUTHORIZATION_REVIEW");
  expect(r.scientificGate5).toBe("EVIDENCE_COMPLETE_REQUIRES_INDEPENDENT_GATE_REVIEW");
  expect(r.phase5FreezeAuthorized).toBe(false);
  expect(r.phase6Authorized).toBe(false);
  expect(r.weatherAbsenceDoesNotEraseEligibleSnapshot).toBe(true);
 });
 it("no provider integration or data mutation occurs in the offline evaluator",()=>{
  const s=readFileSync("server/lib/disruption/phase4Gate5RedoReadiness_v39.ts","utf8");
  expect(s).not.toContain("fetch(");
  expect(s).not.toContain("getV39Pool");
  expect(s).not.toContain("AERODATABOX_API_KEY");
  expect(s).not.toContain("INSERT INTO");
  expect(s).not.toContain("setTimeout");
 });
});
