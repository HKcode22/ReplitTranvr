import {describe,it,expect} from "vitest";
import {evaluateGate05ReadOnlyAdmissionV39, type Gate05AccountSnapshotV39}
  from "../server/lib/disruption/gate05ReadOnlyAdmission_v39";
const known=():Gate05AccountSnapshotV39=>({
  creditsRemaining:2037,apiUnitsRemaining:60000,
  apiUnitsLimit:60000,requestsRemaining:1000,
  observedAtUtc:"2026-10-19T10:00:00Z",
  activeBillableSubscriptions:0,activeUnrelatedSubscriptions:0,
  configuredRestDbSameAsV39:true,restBudgetTablePresent:true,
  restBudgetCategories:[
    {category:"fids_base",capUnits:100,usedUnits:20,enabled:true},
    {category:"fids_retry",capUnits:30,usedUnits:0,enabled:true}
  ]
});
describe("Gate05 account admission: observation is NEVER paid approval",()=>{
  it("does not authorize a pilot even with healthy synthetic account and ledger",()=>{
    const x=evaluateGate05ReadOnlyAdmissionV39(known());
    expect(Object.values(x.checks).every(Boolean)).toBe(true);
    expect(x.paidPilotAuthorized).toBe(false);
    expect(x.scientificGate05Passed).toBe(false);
    expect(x.sourceAndTariffVerified).toBe(false);
    expect(x.blockers).toContain("actual_departure_label_not_verified");
    expect(x.providerMutationsByThisObserver).toBe(0);
    expect(x.restRequestsByThisObserver).toBe(0);
  });
  it("fail-closes and reports different legacy REST ledger database config",()=>{
    const x=evaluateGate05ReadOnlyAdmissionV39({
      ...known(),configuredRestDbSameAsV39:false
    });
    expect(x.checks.restLedgerDbConfigurationConfirmed).toBe(false);
    expect(x.blockers).toContain("restLedgerDbConfigurationConfirmed");
  });
  it("blocks foreign active subscription, missing category, low quota",()=>{
    const v=known();
    v.activeBillableSubscriptions=1;
    v.apiUnitsRemaining=4;
    v.restBudgetCategories=[v.restBudgetCategories[0]];
    const x=evaluateGate05ReadOnlyAdmissionV39(v);
    expect(x.checks.noActiveBillableSubscriptions).toBe(false);
    expect(x.checks.restLedgerCategoriesValid).toBe(false);
    expect(x.checks.sufficientApiUnitsForTheoreticalTwoQueryPreview).toBe(false);
  });
  it("never trusts negatives, overdrawn cap or corrupt dates",()=>{
    expect(()=>evaluateGate05ReadOnlyAdmissionV39({...known(),creditsRemaining:-1}))
      .toThrow("GATE05_READONLY_ACCOUNT_INPUT_HOLD");
    expect(()=>evaluateGate05ReadOnlyAdmissionV39({...known(),observedAtUtc:"invalid"}))
      .toThrow("GATE05_READONLY_ACCOUNT_INPUT_HOLD");
    const x=known();x.restBudgetCategories=[
      {category:"fids_base",capUnits:10,usedUnits:11,enabled:true}
    ];
    expect(()=>evaluateGate05ReadOnlyAdmissionV39(x)).toThrow("GATE05_REST_BUDGET_ROW_HOLD");
  });
  it("rejects duplicate categories instead of double-counting",()=>{
    const x=known();x.restBudgetCategories=[
      x.restBudgetCategories[0],x.restBudgetCategories[0]
    ];
    expect(()=>evaluateGate05ReadOnlyAdmissionV39(x))
      .toThrow("GATE05_REST_BUDGET_DUPLICATE_CATEGORY_HOLD");
  });
});
