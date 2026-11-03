import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {auditP4G5BinaryOutcomeBoundsV39,
 summarizeP4G5BoundsAcrossCellsV39,
 type P4G5BoundedCellV39} from
 "../server/lib/disruption/phase4Gate5PartialIdentification_v39";

const source=():P4G5BoundedCellV39=>({
 cohortId:"WSSS_NOV2_SOURCE_ONLY",airportIcao:"WSSS",horizon:"T-24h",
 evidenceFrame:"SOURCE_ONLY_REPEATED_ROWS",
 target:"ORIGINAL_ACTUAL_ONLY_WHEELS_OFF",
 repeatedSourceObservationRows:542,
 populationMembers:null,horizonEligible:null,
 preExpected:null,prePersisted:null,
 capturedInsidePopulation:null,capturedOutsidePopulation:null,
 unresolvedWebhookIdentities:null,
 targetKnownApplicable:null,targetKnownNotApplicable:null,
 targetApplicabilityUnknown:null,reportedVerifiedObserved:null,
 reportedVerifiedPositive:null,adsbProxyOnly:null,
 estimatedOrUnverified:null,pending:null,missingOrCensored:null
});
const flight=():P4G5BoundedCellV39=>({
 ...source(),cohortId:"WSSS_FUTURE_HORIZON_CI",
 evidenceFrame:"FLIGHT_LEVEL_SCOPED",repeatedSourceObservationRows:650,
 populationMembers:110,horizonEligible:100,
 preExpected:100,prePersisted:99,
 capturedInsidePopulation:85,capturedOutsidePopulation:4,
 unresolvedWebhookIdentities:3,
 targetKnownApplicable:100,targetKnownNotApplicable:0,
 targetApplicabilityUnknown:0,
 reportedVerifiedObserved:90,reportedVerifiedPositive:10,
 adsbProxyOnly:2,estimatedOrUnverified:3,
 pending:1,missingOrCensored:4
});
describe("Gate5 exact denominator and MNAR partial identification",()=>{
 it("Nov2 paid source-only 9/9 still has NO flight denominator or manufactured CI",()=>{
  const artifact=JSON.parse(readFileSync(
   "data-collection/phase4/GATE5_20261102_BOUNDED_CLOSEOUT_HOLD_STATUS.json",
   "utf8"));
  expect(artifact.repeatedSourceObservationRows).toBe(542);
  expect(artifact.uniquePhysicalOperatingFlightDenominator).toBeNull();
  expect(artifact.persistedFlightSpecificPRE).toBeNull();
  const r=auditP4G5BinaryOutcomeBoundsV39(source());
  expect(r.countClass).toBe("SOURCE_ONLY_NO_FLIGHT_DENOMINATOR");
  expect(r.preCompleteness.value).toBeNull();
  expect(r.verifiedTargetCoverage.value).toBeNull();
  expect(r.outcomeBoundsAmongKnownApplicable).toBeNull();
  expect(r.populationWideRisk).toBeNull();
  expect(r.gate5ScientificPassed).toBe(false);
 });
 it("correct worst-case binary bounds, not complete-case assumption",()=>{
  const r=auditP4G5BinaryOutcomeBoundsV39(flight());
  expect(r.countClass).toBe("FLIGHT_LEVEL_COMPLETE_COUNTS");
  expect(r.preCompleteness.value).toBeCloseTo(0.99);
  expect(r.webhookCapture.value).toBeCloseTo(0.85);
  expect(r.verifiedTargetCoverage.value).toBeCloseTo(0.9);
  expect(r.outcomeBoundsAmongKnownApplicable?.lower).toBeCloseTo(0.1);
  expect(r.outcomeBoundsAmongKnownApplicable?.upper).toBeCloseTo(0.2);
  expect(r.outcomeBoundsAmongKnownApplicable?.width).toBeCloseTo(0.1);
  expect(r.outcomeBoundsAmongKnownApplicable?.observedOnlyRate)
   .toBeCloseTo(10/90);
  expect(r.nonIgnorableMissingnessCouldReverseConclusions).toBe(true);
  expect(r.iidSamplingOrMissingAtRandomAssumed).toBe(false);
 });
 it("100% missing verified actual: [0,1], no false certification from ADSB positions",()=>{
  const f=flight();
  f.reportedVerifiedObserved=0;f.reportedVerifiedPositive=0;
  f.adsbProxyOnly=100;f.estimatedOrUnverified=0;
  f.pending=0;f.missingOrCensored=0;
  const r=auditP4G5BinaryOutcomeBoundsV39(f);
  expect(r.outcomeBoundsAmongKnownApplicable).toMatchObject({
   lower:0,upper:1,width:1,observedOnlyRate:null
  });
  expect(r.verifiedTargetCoverage.value).toBe(0);
  expect(r.gate5ScientificPassed).toBe(false);
 });
 it("zero real applicable denominator returns NULL, never zero label risk",()=>{
  const f=flight();
  f.targetKnownApplicable=0;f.targetKnownNotApplicable=100;
  f.reportedVerifiedObserved=0;f.reportedVerifiedPositive=0;
  f.adsbProxyOnly=0;f.estimatedOrUnverified=0;
  f.pending=0;f.missingOrCensored=0;
  const r=auditP4G5BinaryOutcomeBoundsV39(f);
  expect(r.verifiedTargetCoverage.value).toBeNull();
  expect(r.verifiedTargetCoverage.reason).toBe("ZERO_MEASURED_DENOMINATOR");
  expect(r.outcomeBoundsAmongKnownApplicable).toBeNull();
 });
 it("unresolved applicability explicitly prevents population-wide claim",()=>{
  const f=flight();
  f.targetKnownApplicable=90;f.targetApplicabilityUnknown=10;
  f.reportedVerifiedObserved=80;f.reportedVerifiedPositive=8;
  const r=auditP4G5BinaryOutcomeBoundsV39(f);
  expect(r.unknownApplicabilityPreventsFullTargetPopulationClaim).toBe(true);
  expect(r.outcomeBoundsAmongKnownApplicable?.denominator).toBe(90);
  expect(r.populationWideRisk).toBeNull();
 });
 it("missing PRE is not a reason to redefine capture or actual label denominator",()=>{
  const f=flight();
  f.prePersisted=0;f.capturedInsidePopulation=0;
  const r=auditP4G5BinaryOutcomeBoundsV39(f);
  expect(r.preCompleteness.value).toBe(0);
  expect(r.webhookCapture.value).toBe(0);
  expect(r.outcomeBoundsAmongKnownApplicable?.lower).toBe(0.1);
  expect(r.gate5ScientificPassed).toBe(false);
 });
 it("partial counts are explicitly unknown, not a zero outcome rate",()=>{
  const f=flight();
  f.targetKnownApplicable=null;f.reportedVerifiedObserved=null;
  f.reportedVerifiedPositive=null;
  const r=auditP4G5BinaryOutcomeBoundsV39(f);
  expect(r.countClass).toBe("FLIGHT_LEVEL_PARTIAL_COUNTS");
  expect(r.outcomeBoundsAmongKnownApplicable).toBeNull();
  expect(r.verifiedTargetCoverage.reason).toBe("NOT_MEASURED");
 });
 it("impossible flight-level partitions and repeated source-as-flight misclassification HOLD",()=>{
  const cases:Array<(f:P4G5BoundedCellV39)=>void>=[
   f=>{f.horizonEligible=111;},
   f=>{f.preExpected=99;},
   f=>{f.prePersisted=101;},
   f=>{f.capturedInsidePopulation=101;},
   f=>{f.targetKnownApplicable=110;},
   f=>{f.reportedVerifiedObserved=91;},
   f=>{f.reportedVerifiedPositive=91;},
   f=>{f.reportedVerifiedObserved=101;},
   f=>{f.repeatedSourceObservationRows=-2;},
   f=>{f.targetKnownApplicable=0;f.reportedVerifiedObserved=1;},
  ];
  for(const change of cases){
   const f=flight();change(f);
   expect(()=>auditP4G5BinaryOutcomeBoundsV39(f)).toThrow("HOLD");
  }
  const fake=source();
  fake.populationMembers=542;
  expect(()=>auditP4G5BinaryOutcomeBoundsV39(fake))
   .toThrow("SOURCE_ONLY_CANNOT_ASSERT_FLIGHT_COUNTS");
 });
 it("explicit source/target class partition, no estimated or proxy promotion",()=>{
  const r=summarizeP4G5BoundsAcrossCellsV39([
   flight(),source(),{...flight(),horizon:"T-6h",
    target:"ALTERNATIVE_PROVIDER_TERMINAL_STATUS"}
  ]);
  expect(r.totalCells).toBe(3);
  expect(r.sourceOnlyCells).toBe(1);
  expect(r.numericallyIdentifiableCells).toBe(2);
  expect(r.maximumUnlabeledOutcomeRiskWidth).toBeCloseTo(0.1);
  expect(r.gate5ScientificPassed).toBe(false);
  expect(r.noIndependentSamplingOrCausalIdentificationClaim).toBe(true);
  expect(()=>summarizeP4G5BoundsAcrossCellsV39([flight(),flight()]))
   .toThrow("DUPLICATE");
 });
 it("module itself cannot call provider, write database or certify science",()=>{
  const src=readFileSync(
   "server/lib/disruption/phase4Gate5PartialIdentification_v39.ts","utf8");
  for(const prohibited of ["fetch(","process.env","INSERT INTO","UPDATE clean",
   "DELETE FROM","COMMIT","AERODATABOX_API_KEY"]){
   expect(src).not.toContain(prohibited);
  }
  const r=auditP4G5BinaryOutcomeBoundsV39(flight());
  expect(r.independentlyAuthenticatedTargetSemantics).toBe(false);
  expect(r.certifiedProviderSourceRights).toBe(false);
  expect(r.phase5Authorized).toBe(false);
  expect(r.phase6Authorized).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
});
