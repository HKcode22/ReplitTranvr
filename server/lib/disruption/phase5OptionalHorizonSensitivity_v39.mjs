/**
 * Phase5 five-horizon idea: strictly nonpaid WHAT-IF cost arithmetic.
 *
 * This never registers an extra horizon, changes the 31-day parent
 * calendar, signs a V0087 packet, pays AeroDataBox or claims new
 * flight evidence. In particular: airport×segment×horizon planning
 * GROUPS are not charged HTTP requests, and Alert credits are
 * not REST API units.
 *
 * Exact new flight horizons T-12h/T-3h are proposals, not live code.
 * Real FIDS cadence, partition count, duplicate coalescing and
 * source rights need separate independent verification.
 */
const MAX=10_000_000;
const hold=x=>{throw Error("REFUSED_P5_HORIZON_WHATIF_"+x);};
const count=(x,max=MAX)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export const P5_OPTIONAL_HORIZON_SCENARIO_SCHEMA=
 "v39.phase5.optional-five-horizon-rest-alert-whatif.v1";
export function auditP5FiveHorizonCostSensitivityV39(input){
 if(!input||input.schema!==P5_OPTIONAL_HORIZON_SCENARIO_SCHEMA||
    input.assumptionBasis!=="ILLUSTRATIVE_UNMEASURED_PHYSICAL_REQUESTS"||
    !count(input.parentBatchDays,31)||input.parentBatchDays!==31||
    !count(input.activeSegments,34)||input.activeSegments!==34||
    !count(input.airportSlots,4)||input.airportSlots!==4||
    !count(input.unitsPerFidsGet,50)||input.unitsPerFidsGet<1||
    !count(input.projectRestCapUnits)||
    !count(input.existingFidsRestReservedUnits)||
    !count(input.otherRestReservedUnits)||
    !count(input.explicitAlertRefillRestReservedUnits)||
    !count(input.alertCreditsAvailable)||
    !count(input.alertCreditsExpectedSends)||
    !input.optionalPhysicalGets||
    !count(input.optionalPhysicalGets["T-12h"])||
    !count(input.optionalPhysicalGets["T-3h"])||
    Object.keys(input.optionalPhysicalGets).length!==2)
  hold("UNREVIEWED_SCENARIO_SHAPE_OR_CHARGE_UNITS");
 const baselineHorizonCount=3,proposedHorizonCount=5;
 const groups=input.activeSegments*input.airportSlots;
 const extraGets=input.optionalPhysicalGets["T-12h"]+
  input.optionalPhysicalGets["T-3h"];
 const marginalRestUnits=extraGets*input.unitsPerFidsGet;
 const baselineRestExposure=input.existingFidsRestReservedUnits+
  input.otherRestReservedUnits+input.explicitAlertRefillRestReservedUnits;
 const proposedRestExposure=baselineRestExposure+marginalRestUnits;
 // No use of any Alert credit as if it were a REST unit, even when
 // the separate scenario reserves API units for explicit refill.
 const alertCreditShortfall=Math.max(0,input.alertCreditsExpectedSends-
  input.alertCreditsAvailable);
 return{
  schema:"v39.phase5.five-horizon-whatif-report.v1",
  status:"ILLUSTRATIVE_COST_ONLY_NEEDS_MEASURED_GAIN_AND_RELEASE",
  horizonCore:["T-24h","T-6h","T-90m"],
  optionalNotActivated:["T-12h","T-3h"],
  parentBatchDays:31,
  activeSegments:34,airportSlots:4,
  originalLogicalSourceGroups:groups*baselineHorizonCount,
  proposedLogicalSourceGroups:groups*proposedHorizonCount,
  additionalLogicalSourceGroups:groups*2,
  // These numbers derive only from EXPLICIT assumed physical requests.
  // They are never inferred from logical source-planning groups.
  assumedNewPhysicalFidsGets:extraGets,
  incrementalRestUnits:marginalRestUnits,
  baselineRestUnits:baselineRestExposure,
  proposedRestUnits:proposedRestExposure,
  remainingRestUnitsAfterOptional:input.projectRestCapUnits-proposedRestExposure,
  assumedMarginalRestFitsWithinCap:
   proposedRestExposure<=input.projectRestCapUnits,
  alertCreditsAvailable:input.alertCreditsAvailable,
  alertCreditsExpectedSends:input.alertCreditsExpectedSends,
  alertCreditShortfall,
  alertCostsIndependentFromFidsRest:true,
  mayAssumeAlertRefillFromRestWithoutSeparateApproval:false,
  independentProviderRequestCountMeasuredByThisFunction:false,
  fiveHorizonPredictiveValueMeasuredByThisFunction:false,
  operatingFlightNIncreasedByExtraSnapshots:false,
  sameFlightLeakageSafeguardsStillRequired:true,
  fiveHorizonCollectionSchemaOrCodeApproved:false,
  contentsRightsCertified:false,
  currentThreeHorizonPlanModified:false,
  paidApiRequests:0,databaseWrites:0,
  phase5ScientificFreezePassed:false,phase6PaidGo:false
 };
}
