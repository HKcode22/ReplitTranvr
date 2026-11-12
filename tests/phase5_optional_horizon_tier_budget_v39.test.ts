import {describe,it,expect} from "vitest";
import {
 auditP5OptionalHorizonTierBudgetV39,
 P5_HORIZON_TIER_BUDGET_SCHEMA
} from "../server/lib/disruption/phase5OptionalHorizonTierBudget_v39.mjs";
const sample=()=>({
 schema:P5_HORIZON_TIER_BUDGET_SCHEMA,
 mode:"ILLUSTRATIVE_READONLY_NO_PROVIDER",
 parentBatchDays:31,activeSegments:34,airportSlots:4,
 projectCycleCapUnits:50000,
 projectCycleUsedUnits:1000,
 providerReportedRemainingUnits:59000,
 futureBaselineFidsUnits:10000,
 futureOtherRestUnits:9000,
 futurePostRecoveryUnits:5000,
 futureRetriesDiagnosticsUnits:2000,
 futureApprovedAlertRefillRestUnits:7000,
 protectedRestMarginUnits:5000,
 availableAlertCredits:1830,
 protectedAlertFloorCredits:1000,
 plannedAlertSendCredits:5000,
 fidsUnitsPerPhysicalGet:2,
 assumedExtraPhysicalGets:{"T-3h":136,"T-12h":136,"T-45m":136}
});
describe("optional four/five/six horizon full-ledger cost scenarios",()=>{
 it("keeps 408 planning groups distinct from billed physical requests",()=>{
  const r=auditP5OptionalHorizonTierBudgetV39(sample());
  expect(r.originalLogicalSourceGroups).toBe(408);
  expect(r.effectiveSpendableRestUnits).toBe(49000);
  expect(r.futureAllCategoryRestReservedWithMargin).toBe(38000);
  expect(r.nominalNewAlertCreditsNeeded).toBe(4170);
  expect(r.tiers.map(x=>x.totalLogicalSourceGroups))
   .toEqual([544,680,816]);
  expect(r.tiers.map(x=>x.incrementalRestApiUnits))
   .toEqual([272,544,816]);
  expect(r.tiers.map(x=>x.wouldFitRestArithmeticOnly))
   .toEqual([true,true,true]);
  expect(r.tiers[2].horizonNames).toEqual([
   "T-24h","T-6h","T-90m","T-3h","T-12h","T-45m"
  ]);
  expect(r.tiers.every(x=>x.phase6Go===false)).toBe(true);
  expect(r.providerCalls).toBe(0);
  expect(r.liveSchemaModified).toBe(false);
 });
 it("can have 4 arithmetic-fit but not 5 or 6 with more GETs",()=>{
  const x=sample();
  x.assumedExtraPhysicalGets={"T-3h":3000,"T-12h":3000,"T-45m":3000};
  const r=auditP5OptionalHorizonTierBudgetV39(x);
  expect(r.tiers.map(x=>x.wouldFitRestArithmeticOnly))
   .toEqual([true,false,false]);
  expect(r.tiers[0].remainingSpendableRestAfterTier).toBe(5000);
 });
 it("separates Alert SEND balance/refill from FIDS REST arithmetic",()=>{
  const x=sample();x.futureApprovedAlertRefillRestUnits=0;
  const r=auditP5OptionalHorizonTierBudgetV39(x);
  expect(r.tiers[0].wouldFitRestArithmeticOnly).toBe(true);
  expect(r.tiers[0].wouldFitNominalAlertsOnly).toBe(false);
  expect(r.oneToOneRefillActuallyVerifiedHere).toBe(false);
  expect(r.defaultRecommendation).toBe(
   "KEEP_REVIEWED_THREE_UNTIL_REAL_COST_AND_FEATURE_VALUE");
 });
 it("never turns optimistic zero-extra-GET assumptions into measured GO",()=>{
  const x=sample();
  x.assumedExtraPhysicalGets={"T-3h":0,"T-12h":0,"T-45m":0};
  const r=auditP5OptionalHorizonTierBudgetV39(x);
  expect(r.tiers.every(t=>t.wouldFitRestArithmeticOnly)).toBe(true);
  expect(r.tiers.every(t=>t.independentSourceTimingCoverageMeasured===false))
   .toBe(true);
  expect(r.tiers.every(t=>t.extraSignedQueueHorizonPermitted===false))
   .toBe(true);
  expect(r.sourceAndModelUtilityProvenByThisFunction).toBe(false);
 });
 it("refuses unbounded, omitted, invented horizon and negative inputs",()=>{
  const bad=[
   {projectCycleCapUnits:-1},
   {projectCycleUsedUnits:5000000},
   {parentBatchDays:30},
   {activeSegments:100},
   {mode:"OWNER_VERIFIED_PHASE6_GO"},
   {fidsUnitsPerPhysicalGet:0},
   {assumedExtraPhysicalGets:{"T-3h":10,"T-12h":20}},
   {assumedExtraPhysicalGets:{"T-3h":10,"T-12h":20,"T-1h":1}},
   {assumedExtraPhysicalGets:{"T-3h":10.5,"T-12h":20,"T-45m":10}}
  ];
  for(const change of bad)
   expect(()=>auditP5OptionalHorizonTierBudgetV39({...sample(),...change}))
    .toThrow("REFUSED_P5_HORIZON_TIER_");
 });
});
