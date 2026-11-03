import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {assessG5RExpeditedSourceReadinessV39,
 type G5RHistoricalReceiptV39} from
 "../server/lib/disruption/phase4Gate5ExpeditedReadinessV39";

const source=():G5RHistoricalReceiptV39=>
 JSON.parse(readFileSync(
  "data-collection/phase4/GATE5_20261102_BOUNDED_CLOSEOUT_HOLD_STATUS.json",
  "utf8")) as G5RHistoricalReceiptV39;
describe("owner-directed Gate5-R: pragmatic PASS only for measured source readiness",()=>{
 it("genuinely audited 9/9 November 2 -> revised operational readiness PASS",()=>{
  const r=assessG5RExpeditedSourceReadinessV39(source());
  expect(r.status).toBe("GATE5_REVISED_COLLECTION_READINESS_PASS");
  expect(r.sourceOriginalPaidGets).toBe(9);
  expect(r.sourceMeasuredRestApiUnits).toBe(18);
  expect(r.phase5PlanningMayProceed).toBe(true);
  expect(r.oldStrictActualRunwayScientificGate5Passed).toBe(false);
  expect(r.phase5FreezeAuthorized).toBe(false);
  expect(r.phase6LiveCollectionAuthorized).toBe(false);
  expect(r.firstDayProspectiveFlightLevelAuditRequired).toBe(true);
  expect(r.noProviderApiCalls).toBe(true);
  expect(r.noDatabaseWrites).toBe(true);
 });
 it("does not pretend 542 source rows are 542 unique physical flights",()=>{
  const r=assessG5RExpeditedSourceReadinessV39(source());
  expect(r.verifiedUniquePhysicalFlightPopulation).toBeNull();
  expect(r.historicalPersistedPRE).toBeNull();
  expect(r.historicalInsideOutsideWebhookRatio).toBeNull();
  expect(r.observedActualWheelsOff).toBeNull();
  expect(r.verifiedLongTermContentStorageRights).toBeNull();
  expect(r.historicalDataIsNotFlightLevel).toBe(true);
 });
 it("wrong frozen hash, horizon job, duplicate run and audit identity stop",()=>{
  const tests:Array<(x:G5RHistoricalReceiptV39)=>void>=[
   x=>{x.originalCohortFrozenManifestSha256="0".repeat(64);},
   x=>{x.originalGitHubRuns["T-90m"]=x.originalGitHubRuns["T-6h"];},
   x=>{x.originalGitHubRuns["T-6h"]=2;},
   x=>{x.independentAuditRunId=0;},
   x=>{x.sourceOnlyOperationalStatus="ALMOST_COMPLETE";},
   x=>{x.scientificGate5Status="PASS";},
   x=>{x.evidenceClassification="RAW_PROVIDER_WIRE_VERIFIED";}
  ];
  for(const change of tests){
   const s=source();change(s);
   expect(()=>assessG5RExpeditedSourceReadinessV39(s)).toThrow("HOLD");
  }
 });
 it("partial / extra paid slots / repeated row drift never silently PASS",()=>{
  const tests:Array<(x:G5RHistoricalReceiptV39)=>void>=[
   x=>{x.successfulPhysicalFidsGets=8;},
   x=>{x.measuredRestApiUnits=16;},
   x=>{x.repeatedSourceObservationRows=543;},
   x=>{x.noFurtherNovember2PaidRerunRequired=false;}
  ];
  for(const change of tests){
   const s=source();change(s);
   expect(()=>assessG5RExpeditedSourceReadinessV39(s)).toThrow("HOLD");
  }
 });
 it("fabricated flight-level counts, provider actuality or legal rights cannot pass",()=>{
  const tests:Array<(x:G5RHistoricalReceiptV39)=>void>=[
   x=>{x.uniquePhysicalOperatingFlightDenominator=79;},
   x=>{x.persistedFlightSpecificPRE=10;},
   x=>{x.verifiedFirstProviderNativeT="2026-11-02T00:00:00Z";},
   x=>{x.independentlyMatchedInsideWebhooks=0;},
   x=>{x.independentlyMatchedOutsideWebhooks=0;},
   x=>{x.certifiedActualOnlyWheelsOff=true;},
   x=>{x.lawfulSourceRetention=true;},
   x=>{x.retainedOriginalSourceBodies=true;},
   x=>{x.prospectiveThreeHorizonScientificCohortCompleted=true;},
   x=>{x.scientificGate5Passed=true;},
   x=>{x.phase5FreezeAuthorized=true;},
   x=>{x.phase6Authorized=true;},
   x=>{x.nextCohortActivationAuthorized=true;}
  ];
  for(const change of tests){
   const s=source();change(s);
   expect(()=>assessG5RExpeditedSourceReadinessV39(s)).toThrow("HOLD");
  }
 });
 it("source code never calls provider or DB or authorizes full data collection",()=>{
  const s=readFileSync(
   "server/lib/disruption/phase4Gate5ExpeditedReadinessV39.ts","utf8");
  for(const forbidden of [
   "fetch(","process.env","INSERT INTO","DELETE FROM","UPDATE clean",
   "AERODATABOX_API_KEY","RAPIDAPI_KEY","setTimeout("]){
   expect(s).not.toContain(forbidden);
  }
  const r=assessG5RExpeditedSourceReadinessV39(source());
  expect(r.versionedScope).toBe("PROSPECTIVE_PROVIDER_OBSERVABLE_DISRUPTION");
  expect(r.alternativePrimaryTargets).toContain(
   "PROVIDER_REPORTED_TERMINAL_STATUS");
  expect(r.alternativePrimaryTargets).toContain(
   "PROVIDER_REPORTED_SCHEDULE_VERSION_CHANGE_15_MIN");
 });
});
