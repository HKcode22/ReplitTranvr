/**
 * Phase 4 Gate 5 redo: OFFLINE, pure evidence completeness adjudicator.
 *
 * This module is NOT a paid operator, does not fetch, persist or authorize any
 * provider work, and cannot certify the provenance of caller-supplied flags.
 * Status is necessarily HOLD until independent external evidence is reviewed.
 * Binding: V3.9-f.8 §§5, 5.1–5.2, 6.0, 7, 10.2, 16 Gate 0.5/5, 17(17–19).
 */
export type Gate5ProofV39 = "VERIFIED" | "UNVERIFIED" | "MISSING";
export type Gate5HorizonV39 = "T-24h" | "T-6h" | "T-90m";
export const GATE5_PRE_HORIZONS_V39 = ["T-24h","T-6h","T-90m"] as const;

export interface Gate5RedoHorizonEvidenceV39 {
  horizon: Gate5HorizonV39;
  sourceState: "RETAINED_ASOF_VERIFIED" | "UNOBSERVED" | "EXPIRED" | "UNVERIFIED";
  sourceAvailableBeforeCutoff: boolean;
  sourceIntegrityVerified: boolean;
  candidatePopulationCount: number | null;
  confirmedOperatingCount: number | null;
  horizonEligibleCount: number | null;
  persistedCertifiedPreCount: number | null;
  webhookCapturedCount: number | null;
  capturedOutsidePopulationCount: number | null;
  requiredFeaturesCompleteCount: number | null;
  optionalFeaturesMissingCount: number | null;
  targetApplicableCount: number | null;
  actualOutcomeObservedCount: number | null;
  targetPendingCount: number | null;
  targetCensoredCount: number | null;
  targetMissingCount: number | null;
  targetNotApplicableCount: number | null;
}

export interface Gate5RedoEvidenceV39 {
  frozenSingleCohort: Gate5ProofV39;
  selectedProviderNativeTMilestone: Gate5ProofV39;
  firstObservedScheduleVersionAndAsOf: Gate5ProofV39;
  physicalOperatingLegAndCodeshareRules: Gate5ProofV39;
  actualOnlyRunwayTargetSemantics: Gate5ProofV39;
  fidsPrimaryVersusContextRole: Gate5ProofV39;
  providerRangeBoundaryAndTruncation: Gate5ProofV39;
  preFrozenFullHorizonAcquisitionGrid: Gate5ProofV39;
  measuredAcquisitionGuardCadenceStaleness: Gate5ProofV39;
  gitHubRunnerPrearmedBeforeFirstCutoff: Gate5ProofV39;
  originalRawRetentionPermissionAndExpiry: Gate5ProofV39;
  accountBudgetAndExactPaidScopeReviewed: Gate5ProofV39;
  duplicateAndLateRequestRefusalTested: Gate5ProofV39;
  // Counter checks are post-observation measurements; unknown != zero.
  horizons: readonly Gate5RedoHorizonEvidenceV39[];
}

export interface Gate5RedoAssessmentV39 {
  schema: "v39.phase4.gate5-redo-offline-admission.v1";
  sourcePilotAdmission: "HOLD" | "READY_FOR_SEPARATE_EXPLICIT_AUTHORIZATION_REVIEW";
  scientificGate5: "HOLD" | "EVIDENCE_COMPLETE_REQUIRES_INDEPENDENT_GATE_REVIEW";
  phase5FreezeAuthorized: false;
  phase6Authorized: false;
  providerCalls: 0;
  databaseWrites: 0;
  blockers: string[];
  // Weather remains optional missingness at PRE; Phase 5 separately verifies weather.
  weatherAbsenceDoesNotEraseEligibleSnapshot: true;
}

export function assessPhase4Gate5RedoEvidenceV39(e:Gate5RedoEvidenceV39):Gate5RedoAssessmentV39 {
  const blockers:string[]=[];
  const requireVerified=(field:Exclude<keyof Gate5RedoEvidenceV39,"horizons">)=>{
    if(e[field]!=="VERIFIED")blockers.push("PROOF_MISSING:"+field);
  };
  const beforePaid:Exclude<keyof Gate5RedoEvidenceV39,"horizons">[]=[
    "frozenSingleCohort","selectedProviderNativeTMilestone",
    "firstObservedScheduleVersionAndAsOf","physicalOperatingLegAndCodeshareRules",
    "actualOnlyRunwayTargetSemantics","fidsPrimaryVersusContextRole",
    "providerRangeBoundaryAndTruncation","preFrozenFullHorizonAcquisitionGrid",
    "measuredAcquisitionGuardCadenceStaleness",
    "gitHubRunnerPrearmedBeforeFirstCutoff",
    "originalRawRetentionPermissionAndExpiry",
    "accountBudgetAndExactPaidScopeReviewed",
    "duplicateAndLateRequestRefusalTested"
  ];
  for(const f of beforePaid)requireVerified(f);
  const admissionReady=blockers.length===0;
  const seen=new Set<Gate5HorizonV39>();
  const horizonBlockers:string[]=[];
  for(const h of e.horizons){
    if(!GATE5_PRE_HORIZONS_V39.includes(h.horizon)){
      horizonBlockers.push("INVALID_HORIZON");continue;
    }
    if(seen.has(h.horizon)){horizonBlockers.push("DUPLICATE_HORIZON:"+h.horizon);continue;}
    seen.add(h.horizon);
    const p=h.horizon;
    if(h.sourceState!=="RETAINED_ASOF_VERIFIED"||!h.sourceAvailableBeforeCutoff||
       !h.sourceIntegrityVerified)
      horizonBlockers.push("UNVERIFIED_ASOF_SOURCE:"+p);
    const counts=[
      h.candidatePopulationCount,h.confirmedOperatingCount,
      h.horizonEligibleCount,h.persistedCertifiedPreCount,
      h.webhookCapturedCount,h.capturedOutsidePopulationCount,
      h.requiredFeaturesCompleteCount,h.optionalFeaturesMissingCount,
      h.targetApplicableCount,h.actualOutcomeObservedCount,
      h.targetPendingCount,h.targetCensoredCount,h.targetMissingCount,
      h.targetNotApplicableCount
    ];
    if(counts.some(v=>v===null||!Number.isSafeInteger(v)||v<0)){
      horizonBlockers.push("UNMEASURED_COUNTERS:"+p);continue;
    }
    const [population,confirmed,eligible,pre,captured,_outside,
      requiredComplete,optionalMissing,applicable,observed,pending,censored,
      missing,notApplicable]=counts as number[];
    if(confirmed>population||eligible>population||pre>eligible||
       captured>population||applicable>pre||observed>applicable||
       requiredComplete>pre||optionalMissing>pre||
       applicable+notApplicable!==pre||
       observed+pending+censored+missing!==applicable)
      horizonBlockers.push("COUNTER_CONTRADICTION:"+p);
    if(eligible===0)horizonBlockers.push("UNESTABLISHED_ELIGIBLE_DENOMINATOR:"+p);
    // The source may legitimately lack webhook/weather features; nevertheless
    // every as-of eligible flight must have a persisted PRE row.
    if(pre!==eligible)horizonBlockers.push("CERTIFIED_PRE_NOT_PERSISTED:"+p);
    if(confirmed===0)horizonBlockers.push("NO_CONFIRMED_OPERATING_LEGS:"+p);
    // Zero genuinely observed outcomes is allowed as a measured counter; an
    // unverified actual-only target is caught by the separate proof above.
  }
  for(const h of GATE5_PRE_HORIZONS_V39){
    if(!seen.has(h))horizonBlockers.push("MISSING_HORIZON:"+h);
  }
  blockers.push(...horizonBlockers);
  return {
    schema:"v39.phase4.gate5-redo-offline-admission.v1",
    sourcePilotAdmission:admissionReady
      ? "READY_FOR_SEPARATE_EXPLICIT_AUTHORIZATION_REVIEW":"HOLD",
    scientificGate5:admissionReady&&horizonBlockers.length===0
      ? "EVIDENCE_COMPLETE_REQUIRES_INDEPENDENT_GATE_REVIEW":"HOLD",
    phase5FreezeAuthorized:false,phase6Authorized:false,
    providerCalls:0,databaseWrites:0,blockers,
    weatherAbsenceDoesNotEraseEligibleSnapshot:true
  };
}
