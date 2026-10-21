import {describe,it,expect} from "vitest";
import {
  previewGate05RestBudgetCommissioningV39,
  type Gate05RestBudgetHistoryV39
} from "../server/lib/disruption/gate05RestBudgetCommissioning_v39";
const history=():Gate05RestBudgetHistoryV39=>({
  quotaObservedUtc:"2026-10-19T09:53:29.000Z",
  quotaResetUtc:"2026-11-04T02:21:21.000Z",
  providerApiUnitsRemaining:60000,providerApiUnitsLimit:60000,
  providerAlertCreditsRemaining:2037,
  activeBillableSubscriptions:0,activeOtherSubscriptions:0,
  budgetControlsRows:0,enabledControlsRows:0,
  attemptReservations:0,distinctAttemptCycles:0,reservedAttemptUnits:0,
  exactRestAndV39ConnectionMatch:true
});
describe("Gate 0.5 cycle-scoped REST budget preview: never seeds production",()=>{
  it("records observed clean cycle without inventing cycle ID or authorizing GET",()=>{
    const r=previewGate05RestBudgetCommissioningV39(history());
    expect(r.status).toBe("BLOCKED_REVIEW_ONLY_UNSCOPED_LEDGER");
    expect(r.proposedPilotApiUnitCap).toBe(12);
    expect(r.proposedCategoryCaps.map(x=>x.proposedCapUnits)).toEqual([4,8]);
    expect(r.proposedCategoryCaps.every(x=>x.enabled===false)).toBe(true);
    expect(Object.values(r.checks).every(Boolean)).toBe(true);
    expect(r.currentCycleProjectAuthorizationConfirmed).toBe(false);
    expect(r.projectCycleCeilingReferenceOnly).toBe(50000);
    expect(r.providerCycleIdVerified).toBeNull();
    expect(r.pilotAuthorizationId).toBeNull();
    expect(r.ownerScopedReservationGuardImplemented).toBe(false);
    expect(r.readyToSeedProduction).toBe(false);
    expect(r.approvedProviderRequests).toBe(0);
    expect(r.approvedProductionWrites).toBe(0);
    expect(r.blockers).toContain("REST_CATEGORY_CAPS_NOT_SCOPED_TO_AUTHORIZED_PILOT");
  });
  it("flags historical reservations and control rows rather than resetting",()=>{
    const r=previewGate05RestBudgetCommissioningV39({
      ...history(),budgetControlsRows:1,enabledControlsRows:1,
      attemptReservations:2,distinctAttemptCycles:1,reservedAttemptUnits:4
    });
    expect(r.checks.controlsEmpty).toBe(false);
    expect(r.checks.noHistoricalLocalReservations).toBe(false);
    expect(r.readyToSeedProduction).toBe(false);
  });
  it("flags provider quota cycle expiry and insufficient units",()=>{
    const r=previewGate05RestBudgetCommissioningV39({
      ...history(),quotaResetUtc:"2026-10-18T02:21:21.000Z",
      providerApiUnitsRemaining:8
    });
    expect(r.checks.providerCycleResetAfterObservation).toBe(false);
    expect(r.checks.providerUnitsCoverTheoretical12).toBe(false);
  });
  it("rejects tampered or implausible snapshot evidence",()=>{
    expect(()=>previewGate05RestBudgetCommissioningV39({
      ...history(),reservedAttemptUnits:-1
    })).toThrow("GATE05_REST_BUDGET_HISTORY_INVALID");
    expect(()=>previewGate05RestBudgetCommissioningV39({
      ...history(),quotaObservedUtc:"tomorrow"
    })).toThrow("GATE05_CYCLE_TIMESTAMP_INVALID");
    expect(()=>previewGate05RestBudgetCommissioningV39({
      ...history(),exactRestAndV39ConnectionMatch:null as any
    })).toThrow("GATE05_REST_DATABASE_MATCH_INVALID");
  });
});
