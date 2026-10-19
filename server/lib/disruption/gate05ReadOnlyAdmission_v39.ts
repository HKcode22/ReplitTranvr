/**
 * Gate 0.5 account- and DB-budget observability assessment ONLY.
 * Pure function. Nothing in this module grants authority to make a GET/POST,
 * to alter the FIDS ledger or to start a paid Gate0.5 pilot.
 */
export interface Gate05AccountSnapshotV39 {
  creditsRemaining:number;
  apiUnitsRemaining:number;
  apiUnitsLimit:number;
  requestsRemaining:number;
  observedAtUtc:string;
  activeBillableSubscriptions:number;
  activeUnrelatedSubscriptions:number;
  configuredRestDbSameAsV39:boolean;
  restBudgetTablePresent:boolean;
  restBudgetCategories:readonly {
    category:string;
    capUnits:number;
    usedUnits:number;
    enabled:boolean;
  }[];
}
export interface Gate05ReadOnlyAdmissionV39 {
  schema:"v39.gate05.readonly-admission.v1";
  status:"READ_ONLY_ACCOUNT_OBSERVED_NOT_AUTHORIZED";
  checks:{
    validAccountEvidence:boolean;
    noActiveBillableSubscriptions:boolean;
    restLedgerDbConfigurationConfirmed:boolean;
    restLedgerPresent:boolean;
    restLedgerCategoriesValid:boolean;
    sufficientApiUnitsForTheoreticalTwoQueryPreview:boolean;
  };
  blockers:string[];
  account:{
    creditsRemaining:number;
    apiUnitsRemaining:number;
    apiUnitsLimit:number;
    requestsRemaining:number;
    observedAtUtc:string;
    activeBillableSubscriptions:number;
    activeUnrelatedSubscriptions:number;
  };
  restBudgetCategories:{category:string;capUnits:number;usedUnits:number;remainingUnits:number;enabled:boolean}[];
  fidsApiUnitsPreviewCeiling:12;
  providerGetAttemptCount:"UNKNOWN_MAY_RETRY";
  providerMutationsByThisObserver:0;
  restRequestsByThisObserver:0;
  sourceAndTariffVerified:false;
  scientificGate05Passed:false;
  paidPilotAuthorized:false;
}
function safe(n:number){return Number.isSafeInteger(n)&&n>=0}
export function evaluateGate05ReadOnlyAdmissionV39(
  x:Gate05AccountSnapshotV39
):Gate05ReadOnlyAdmissionV39{
  if(!x||!safe(x.creditsRemaining)||!safe(x.apiUnitsRemaining)||
     !safe(x.apiUnitsLimit)||!safe(x.requestsRemaining)||
     !safe(x.activeBillableSubscriptions)||!safe(x.activeUnrelatedSubscriptions)||
     !Number.isFinite(Date.parse(x.observedAtUtc))||
     !Array.isArray(x.restBudgetCategories))
    throw Error("GATE05_READONLY_ACCOUNT_INPUT_HOLD");
  const categories=x.restBudgetCategories.map(r=>{
    if(!r||typeof r.category!=="string"||!/^[a-z_]{1,40}$/.test(r.category)||
       !safe(r.capUnits)||!safe(r.usedUnits)||r.usedUnits>r.capUnits||
       typeof r.enabled!=="boolean")throw Error("GATE05_REST_BUDGET_ROW_HOLD");
    return {category:r.category,capUnits:r.capUnits,usedUnits:r.usedUnits,
      remainingUnits:r.capUnits-r.usedUnits,enabled:r.enabled};
  });
  if(new Set(categories.map(r=>r.category)).size!==categories.length)
    throw Error("GATE05_REST_BUDGET_DUPLICATE_CATEGORY_HOLD");
  const exists=new Set(categories.map(r=>r.category));
  const required=["fids_base","fids_retry"];
  const restValid=required.every(c=>exists.has(c)&&
    categories.find(r=>r.category===c)!.enabled);
  const checks={
    validAccountEvidence:x.apiUnitsRemaining<=x.apiUnitsLimit,
    noActiveBillableSubscriptions:x.activeBillableSubscriptions===0 &&
      x.activeUnrelatedSubscriptions===0,
    restLedgerDbConfigurationConfirmed:x.configuredRestDbSameAsV39,
    restLedgerPresent:x.restBudgetTablePresent,
    restLedgerCategoriesValid:restValid,
    sufficientApiUnitsForTheoreticalTwoQueryPreview:x.apiUnitsRemaining>=12
  };
  return {
    schema:"v39.gate05.readonly-admission.v1",
    status:"READ_ONLY_ACCOUNT_OBSERVED_NOT_AUTHORIZED",
    checks,
    blockers:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k)
      .concat([
        "provider_tariff_and_retention_entitlement_not_authenticated",
        "provider_contract_bytes_sha_not_verified",
        "actual_departure_label_not_verified",
        "sample_minima_and_pilot_authorization_not_frozen"
      ]),
    account:{
      creditsRemaining:x.creditsRemaining,apiUnitsRemaining:x.apiUnitsRemaining,
      apiUnitsLimit:x.apiUnitsLimit,requestsRemaining:x.requestsRemaining,
      observedAtUtc:x.observedAtUtc,
      activeBillableSubscriptions:x.activeBillableSubscriptions,
      activeUnrelatedSubscriptions:x.activeUnrelatedSubscriptions
    },
    restBudgetCategories:categories,
    fidsApiUnitsPreviewCeiling:12,
    providerGetAttemptCount:"UNKNOWN_MAY_RETRY",
    providerMutationsByThisObserver:0,restRequestsByThisObserver:0,
    sourceAndTariffVerified:false,scientificGate05Passed:false,
    paidPilotAuthorized:false
  };
}
