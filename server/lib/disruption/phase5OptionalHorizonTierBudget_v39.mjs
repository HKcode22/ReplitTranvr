/**
 * Owner's 4/5/6 PRE horizon question: full-ledger arithmetic ONLY.
 * No migration, extra provider GET, source packet, source rights, model
 * validation or paid Phase6 GO. Physical FIDS requests are explicit
 * scenario inputs, NEVER assumed equal to logical planning groups.
 */
export const P5_HORIZON_TIER_BUDGET_SCHEMA=
 "v39.phase5.optional-horizon-tier-full-ledger-sensitivity.v1";
export const P5_HORIZON_TIER_PRIORITY=[
 {count:4,added:"T-3h"},
 {count:5,added:"T-12h"},
 {count:6,added:"T-45m"}
];
const base=["T-24h","T-6h","T-90m"];
const max=1_000_000;
const int=x=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const hold=s=>{throw Error("REFUSED_P5_HORIZON_TIER_"+s);};
export function auditP5OptionalHorizonTierBudgetV39(input){
 if(!input||input.schema!==P5_HORIZON_TIER_BUDGET_SCHEMA||
    input.mode!=="ILLUSTRATIVE_READONLY_NO_PROVIDER"||
    input.parentBatchDays!==31||input.activeSegments!==34||
    input.airportSlots!==4||
    !int(input.fidsUnitsPerPhysicalGet)||
    input.fidsUnitsPerPhysicalGet<1||
    !int(input.projectCycleCapUnits)||
    !int(input.projectCycleUsedUnits)||
    !int(input.providerReportedRemainingUnits)||
    !int(input.futureBaselineFidsUnits)||
    !int(input.futureOtherRestUnits)||
    !int(input.futurePostRecoveryUnits)||
    !int(input.futureRetriesDiagnosticsUnits)||
    !int(input.futureApprovedAlertRefillRestUnits)||
    !int(input.protectedRestMarginUnits)||
    !int(input.availableAlertCredits)||
    !int(input.protectedAlertFloorCredits)||
    !int(input.plannedAlertSendCredits)||
    !input.assumedExtraPhysicalGets||
    Object.keys(input.assumedExtraPhysicalGets).length!==3||
    !int(input.assumedExtraPhysicalGets["T-3h"])||
    !int(input.assumedExtraPhysicalGets["T-12h"])||
    !int(input.assumedExtraPhysicalGets["T-45m"]))
  hold("MISSING_OR_UNMEASURED_FULL_LEDGER_SCENARIO");
 const groups=input.activeSegments*input.airportSlots;
 const projectRemaining=Math.max(0,
  input.projectCycleCapUnits-input.projectCycleUsedUnits);
 const spendableNow=Math.min(projectRemaining,
  input.providerReportedRemainingUnits);
 const frozenFutureRestReservation=input.futureBaselineFidsUnits+
  input.futureOtherRestUnits+input.futurePostRecoveryUnits+
  input.futureRetriesDiagnosticsUnits+input.futureApprovedAlertRefillRestUnits+
  input.protectedRestMarginUnits;
 const alertSpendable=Math.max(0,
  input.availableAlertCredits-input.protectedAlertFloorCredits);
 const projectedAlertCreditDeficit=Math.max(0,
  input.plannedAlertSendCredits-alertSpendable);
 const nominalRefillCoveredUnderOneToOneOnly=
  input.futureApprovedAlertRefillRestUnits>=projectedAlertCreditDeficit;
 const tiers=[];
 let addedGets=0;
 for(const stage of P5_HORIZON_TIER_PRIORITY){
  addedGets+=input.assumedExtraPhysicalGets[stage.added];
  const count=stage.count;
  const marginalRestUnits=addedGets*input.fidsUnitsPerPhysicalGet;
  const totalFutureRestExposure=frozenFutureRestReservation+
   marginalRestUnits;
  tiers.push({
   horizonCount:count,
   horizonNames:[...base,...P5_HORIZON_TIER_PRIORITY.slice(0,count-3)
    .map(x=>x.added)],
   originalLogicalSourceGroups:groups*3,
   optionalLogicalSourceGroups:groups*(count-3),
   totalLogicalSourceGroups:groups*count,
   // All three extra FIDS GET counts are owner-provided assumptions,
   // not the number of groups (and not independent flights).
   assumedIncrementalPhysicalFidsGets:addedGets,
   incrementalRestApiUnits:marginalRestUnits,
   baselineFutureAllCategoryRestReservation:frozenFutureRestReservation,
   totalFutureRestExposureWithMargin:totalFutureRestExposure,
   remainingSpendableRestAfterTier:spendableNow-totalFutureRestExposure,
   wouldFitRestArithmeticOnly:
    totalFutureRestExposure<=spendableNow,
   wouldFitNominalAlertsOnly:
    nominalRefillCoveredUnderOneToOneOnly,
   independentSourceTimingCoverageMeasured:false,
   individualFlightPredictionInformationGainMeasured:false,
   extraSignedQueueHorizonPermitted:false,
   providerContentUseRightsVerified:false,
   phase6Go:false
  });
 }
 return {
  schema:"v39.phase5.optional-horizon-tier-full-ledger-report.v1",
  mode:"HYPOTHETICAL_COST_NOT_CURRENT_ACCOUNT_ATTESTATION",
  coreThreeHorizons:base,
  parentBatchDays:31,activeSegments:34,airportSlots:4,
  originalLogicalSourceGroups:groups*3,
  projectCycleCapUnits:input.projectCycleCapUnits,
  projectCycleUsedUnits:input.projectCycleUsedUnits,
  providerReportedRemainingUnits:input.providerReportedRemainingUnits,
  effectiveSpendableRestUnits:spendableNow,
  futureAllCategoryRestReservedWithMargin:frozenFutureRestReservation,
  nominalNewAlertCreditsNeeded:projectedAlertCreditDeficit,
  nominalAlertRefillApiUnitsReserved:
   input.futureApprovedAlertRefillRestUnits,
  independentAlertSendLedger:true,
  oneToOneRefillActuallyVerifiedHere:false,
  tiers,
  defaultRecommendation:"KEEP_REVIEWED_THREE_UNTIL_REAL_COST_AND_FEATURE_VALUE",
  clientProvidedQuotaProvenRealByThisFunction:false,
  physicalGetCountProvenRealByThisFunction:false,
  sourceAndModelUtilityProvenByThisFunction:false,
  liveSchemaModified:false,providerCalls:0,dbWrites:0,
  phase5ScientificFreezePassed:false,phase6PaidGo:false
 };
}
