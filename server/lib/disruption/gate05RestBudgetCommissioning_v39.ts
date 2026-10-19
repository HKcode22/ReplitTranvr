/**
 * Phase3 Gate0.5: pure commissioning REVIEW, not a migration or authorization.
 * No provider, SQL, storage, or network dependencies.
 *
 * The legacy fidsRestLedger is per-category and DOES NOT restrict a debit to an
 * approved Gate0.5 pilot authorization. A category cap is NOT a pilot cap.
 * Consequently this preview ALWAYS refuses write admission until owner-scoped
 * reservations / stop+disable cleanup are implemented and separately approved.
 */
export interface Gate05RestBudgetHistoryV39 {
  quotaObservedUtc: string;
  quotaResetUtc: string;
  providerApiUnitsRemaining: number;
  providerApiUnitsLimit: number;
  providerAlertCreditsRemaining: number;
  activeBillableSubscriptions: number;
  activeOtherSubscriptions: number;
  budgetControlsRows: number;
  enabledControlsRows: number;
  attemptReservations: number;
  distinctAttemptCycles: number;
  reservedAttemptUnits: number;
  exactRestAndV39ConnectionMatch: boolean;
}
export interface Gate05RestBudgetPreviewV39 {
  schema:"v39.gate05.rest-budget-commissioning-preview.v1";
  status:"BLOCKED_REVIEW_ONLY_UNSCOPED_LEDGER";
  observedProviderResetUtc:string;
  providerApiUnitsRemaining:number;
  providerApiUnitsLimit:number;
  proposedPilotApiUnitCap:12;
  proposedCategoryCaps:readonly [
    {category:"fids_base"; proposedCapUnits:4; enabled:false},
    {category:"fids_retry"; proposedCapUnits:8; enabled:false}
  ];
  projectCycleCeilingReferenceOnly:50000;
  currentCycleProjectAuthorizationConfirmed:false;
  providerCycleIdVerified:null;
  pilotAuthorizationId:null;
  ownerScopedReservationGuardImplemented:false;
  enabledBudgetRowsToInsert:0;
  approvedProviderRequests:0;
  approvedProductionWrites:0;
  checks:Record<string,boolean>;
  blockers:string[];
  scientificGate05Passed:false;
  readyToSeedProduction:false;
}

function safeInt(v:number):boolean {
  return Number.isSafeInteger(v)&&v>=0;
}
function strictUtc(v:string):number {
  if(typeof v!=="string"||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v))
    throw Error("GATE05_CYCLE_TIMESTAMP_INVALID");
  const ms=Date.parse(v);
  if(!Number.isFinite(ms))throw Error("GATE05_CYCLE_TIMESTAMP_INVALID");
  return ms;
}
export function previewGate05RestBudgetCommissioningV39(
  v:Gate05RestBudgetHistoryV39
):Gate05RestBudgetPreviewV39 {
  if(!v || ![
    v.providerApiUnitsRemaining,v.providerApiUnitsLimit,
    v.providerAlertCreditsRemaining,v.activeBillableSubscriptions,
    v.activeOtherSubscriptions,v.budgetControlsRows,v.enabledControlsRows,
    v.attemptReservations,v.distinctAttemptCycles,v.reservedAttemptUnits
  ].every(safeInt))
    throw Error("GATE05_REST_BUDGET_HISTORY_INVALID");
  const seen=strictUtc(v.quotaObservedUtc);
  const reset=strictUtc(v.quotaResetUtc);
  if(typeof v.exactRestAndV39ConnectionMatch!=="boolean")
    throw Error("GATE05_REST_DATABASE_MATCH_INVALID");
  const checks={
    providerCycleResetAfterObservation:reset>seen,
    providerBalancePlausible:v.providerApiUnitsRemaining<=v.providerApiUnitsLimit,
    providerUnitsCoverTheoretical12:v.providerApiUnitsRemaining>=12,
    noActiveSubscriptions:v.activeBillableSubscriptions===0 && v.activeOtherSubscriptions===0,
    exactRestAndV39ConnectionMatch:v.exactRestAndV39ConnectionMatch,
    controlsEmpty:v.budgetControlsRows===0 && v.enabledControlsRows===0,
    noHistoricalLocalReservations:v.attemptReservations===0 &&
      v.distinctAttemptCycles===0 && v.reservedAttemptUnits===0,
    // The historic Gate0 project ceiling was 50k. Current-cycle authority
    // and any already allocated project units still require fresh evidence.
    theoreticalPilotCapWithinHistoricCeiling:12<=50000
  };
  return {
    schema:"v39.gate05.rest-budget-commissioning-preview.v1",
    status:"BLOCKED_REVIEW_ONLY_UNSCOPED_LEDGER",
    observedProviderResetUtc:v.quotaResetUtc,
    providerApiUnitsRemaining:v.providerApiUnitsRemaining,
    providerApiUnitsLimit:v.providerApiUnitsLimit,
    proposedPilotApiUnitCap:12,
    proposedCategoryCaps:[
      {category:"fids_base",proposedCapUnits:4,enabled:false},
      {category:"fids_retry",proposedCapUnits:8,enabled:false}
    ],
    projectCycleCeilingReferenceOnly:50000,
    currentCycleProjectAuthorizationConfirmed:false,
    providerCycleIdVerified:null,pilotAuthorizationId:null,
    ownerScopedReservationGuardImplemented:false,
    enabledBudgetRowsToInsert:0,approvedProviderRequests:0,
    approvedProductionWrites:0,
    checks,
    blockers:[
      ...Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k),
      "REST_CATEGORY_CAPS_NOT_SCOPED_TO_AUTHORIZED_PILOT",
      "REQUIRE_EXPLICIT_PILOT_OWNER_AND_CYCLE_ID",
      "REQUIRE_CURRENT_CYCLE_PROJECT_BUDGET_FREEZE",
      "REQUIRE_OPENAPI_SHA_PLAN_TARIFF_AND_RETENTION_RIGHTS",
      "REQUIRE_TARGET_SEMANTICS_AND_REAL_SAMPLE_DESIGN",
      "REQUIRE_EXPLICIT_HUMAN_AUTH_AND_STALE_EVIDENCE_REFRESH"
    ],
    scientificGate05Passed:false,readyToSeedProduction:false
  };
}
