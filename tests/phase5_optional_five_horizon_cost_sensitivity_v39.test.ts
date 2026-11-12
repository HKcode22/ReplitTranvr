import {describe,it,expect} from "vitest";
import {
 P5_OPTIONAL_HORIZON_SCENARIO_SCHEMA,
 auditP5FiveHorizonCostSensitivityV39
} from "../server/lib/disruption/phase5OptionalHorizonSensitivity_v39.mjs";
function scenario(){
 return{
  schema:P5_OPTIONAL_HORIZON_SCENARIO_SCHEMA,
  assumptionBasis:"ILLUSTRATIVE_UNMEASURED_PHYSICAL_REQUESTS",
  parentBatchDays:31,activeSegments:34,airportSlots:4,
  unitsPerFidsGet:2,
  projectRestCapUnits:50000,
  existingFidsRestReservedUnits:11000,
  otherRestReservedUnits:22000,
  explicitAlertRefillRestReservedUnits:5000,
  alertCreditsAvailable:1800,
  alertCreditsExpectedSends:2500,
  optionalPhysicalGets:{"T-12h":136,"T-3h":136}
 };
}
describe("Phase5 explicit optional 5-horizon cost-only analysis",()=>{
 it("keeps 34 segments and four slots separate from physical FIDS billing",()=>{
  const x=auditP5FiveHorizonCostSensitivityV39(scenario());
  expect(x.originalLogicalSourceGroups).toBe(408);
  expect(x.proposedLogicalSourceGroups).toBe(680);
  expect(x.additionalLogicalSourceGroups).toBe(272);
  expect(x.assumedNewPhysicalFidsGets).toBe(272);
  expect(x.incrementalRestUnits).toBe(544);
  expect(x.baselineRestUnits).toBe(38000);
  expect(x.proposedRestUnits).toBe(38544);
  expect(x.remainingRestUnitsAfterOptional).toBe(11456);
  expect(x.assumedMarginalRestFitsWithinCap).toBe(true);
  expect(x.alertCreditShortfall).toBe(700);
  expect(x.mayAssumeAlertRefillFromRestWithoutSeparateApproval).toBe(false);
  expect(x.fiveHorizonPredictiveValueMeasuredByThisFunction).toBe(false);
  expect(x.currentThreeHorizonPlanModified).toBe(false);
  expect(x.phase6PaidGo).toBe(false);
 });
 it("refuses to assume one charged GET per logical source group",()=>{
  const x=scenario();
  x.optionalPhysicalGets={"T-12h":0,"T-3h":0};
  const y=auditP5FiveHorizonCostSensitivityV39(x);
  expect(y.additionalLogicalSourceGroups).toBe(272);
  expect(y.assumedNewPhysicalFidsGets).toBe(0);
  expect(y.incrementalRestUnits).toBe(0);
 });
 it("makes refresh cost explicit, and does not call it model improvement",()=>{
  const x=scenario();
  x.optionalPhysicalGets={"T-12h":544,"T-3h":544};
  const y=auditP5FiveHorizonCostSensitivityV39(x);
  expect(y.assumedNewPhysicalFidsGets).toBe(1088);
  expect(y.incrementalRestUnits).toBe(2176);
  expect(y.fiveHorizonPredictiveValueMeasuredByThisFunction).toBe(false);
  expect(y.operatingFlightNIncreasedByExtraSnapshots).toBe(false);
 });
 it("reports REST cap exhaustion independently of short Alert credit balance",()=>{
  const x=scenario();
  x.otherRestReservedUnits=13000;
  x.existingFidsRestReservedUnits=30000;
  x.explicitAlertRefillRestReservedUnits=6800;
  const y=auditP5FiveHorizonCostSensitivityV39(x);
  expect(y.assumedMarginalRestFitsWithinCap).toBe(false);
  expect(y.remainingRestUnitsAfterOptional).toBe(-344);
  expect(y.alertCreditShortfall).toBe(700);
  expect(y.paidApiRequests).toBe(0);
 });
 it.each([
  ["unmeasured source request basis",{assumptionBasis:"LIVE_VERIFIED"}],
  ["larger date count",{parentBatchDays:32}],
  ["different sampling segment count",{activeSegments:35}],
  ["different airport slots",{airportSlots:5}],
  ["missing units",{unitsPerFidsGet:0}],
  ["negative costs",{otherRestReservedUnits:-1}],
  ["fractional requests",{optionalPhysicalGets:{"T-12h":1.5,"T-3h":2}}],
  ["mislabeled horizon",{optionalPhysicalGets:{"T-12h":1,"T-6h":1}}],
  ["injected API count",{optionalPhysicalGets:{"T-12h":2,"T-3h":1,"T-1h":1}}]
 ])("refuses %s rather than charging it",(_label,delta)=>{
  expect(()=>auditP5FiveHorizonCostSensitivityV39({
   ...scenario(),...delta
  })).toThrow("REFUSED_P5_HORIZON_WHATIF_");
 });
});
