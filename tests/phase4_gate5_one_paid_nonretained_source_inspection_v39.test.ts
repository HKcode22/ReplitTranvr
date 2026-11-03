import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {inspectP4OnePaidNonretainedFidsV39}
 from "../server/lib/disruption/phase4Gate5OnePaidNonretainedSourceInspection_v39";
import {assertP4G5OnePaidEphemeralContext}
 from "../scripts/v39_phase4_gate5_one_paid_nonretained_fids_semantics_actions";
const SHA="a".repeat(40);
const NOW=Date.parse("2026-11-01T12:00:00.000Z");
function env():NodeJS.ProcessEnv{
 return {
  GITHUB_ACTIONS:"true",
  GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"41304087870",
  GITHUB_WORKFLOW:"Phase4 Gate5 One Real Paid Nonretained FIDS Semantics Probe",
  GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-one-real-paid-nonretained-fids-semantics.yml@refs/heads/main",
  GITHUB_JOB:"one-real-paid-nonretained-fids",
  GITHUB_SHA:SHA,
  P4_G5_PAID_EXACT_INTENT:"GATE5_ONE_PAID_FIDS_SEMANTIC_FEASIBILITY_2_UNITS_NO_RETENTION",
  AERODATABOX_API_KEY:"FAKE_TEST_CREDENTIAL_NOT_REAL"
 };
}
describe("One actual paid FIDS probe, zero retention, no false science",()=>{
 it("counts explicit operator, marketing, unknown and generic runway/quality fields independently",()=>{
  const a=inspectP4OnePaidNonretainedFidsV39({departures:[
   {codeshareStatus:"IsOperator",departure:{
    scheduledTime:{utc:"2026-11-01T12:00:00Z"},
    revisedTime:{utc:"2026-11-01T12:05:00Z"},
    runwayTime:{utc:"2026-11-01T12:09:00Z"},
    quality:["Live"],airport:{icao:"WSSS"}},
    arrival:{airport:{icao:"YSSY"}}},
   {codeshareStatus:"IsCodeshared",departure:{
    scheduledTime:{utc:"2026-11-01T12:00:00Z"}}},
   {departure:{runwayTime:{utc:"2026-11-01T12:16:00Z"}}}
  ]});
  expect(a.observedDepartureRecords).toBe(3);
  expect(a.providerOperatorTaggedObservations).toBe(1);
  expect(a.providerMarketingTaggedObservations).toBe(1);
  expect(a.codeshareUnresolvedObservations).toBe(1);
  expect(a.scheduledTimeFieldPresent).toBe(2);
  expect(a.runwayTimeFieldPresent).toBe(2);
  expect(a.runwayTimeWithLiveQuality).toBe(1);
  expect(a.departureMovementObjectPresent).toBe(3);
  expect(a.arrivalMovementObjectPresent).toBe(1);
  expect(a.withLegExpandedMovementPairPresent).toBe(1);
  expect(a.movementOnlyFidsShapePresent).toBe(0);
  expect(a.departureAirportIcaoFieldPresent).toBe(1);
  expect(a.oppositeArrivalAirportIcaoFieldPresent).toBe(1);
  expect(a.requestedAirportOmissionAllowedByOpenApi).toBe(true);
  expect(a.withLegIsDepartureArrivalNotTopLevelLeg).toBe(true);
  expect(a.firstProviderNativeSelectedTCertified).toBe(false);
  expect(a.runwayActualOnlyPerRecordCertified).toBe(false);
  expect(a.retainedSourceForFutureCohort).toBe(false);
  expect(a.strictGate5Passed).toBe(false);
 });
 it("withLeg expands to departure/arrival while requested origin airport may be omitted",()=>{
  const report=inspectP4OnePaidNonretainedFidsV39({departures:[
   {codeshareStatus:"IsOperator",
    departure:{quality:["Basic"],scheduledTime:{utc:"2026-11-03T01:00:00Z"}},
    arrival:{airport:{icao:"YSSY"},quality:["Basic"]}},
   {codeshareStatus:"IsCodeshared",
    movement:{airport:{icao:"YSSY"},quality:["Basic"]}},
   {codeshareStatus:"IsOperator",
    departure:{airport:{icao:"WSSS"},quality:["Live"]}}
  ]});
  expect(report.observedDepartureRecords).toBe(3);
  expect(report.departureMovementObjectPresent).toBe(2);
  expect(report.arrivalMovementObjectPresent).toBe(1);
  expect(report.withLegExpandedMovementPairPresent).toBe(1);
  expect(report.movementOnlyFidsShapePresent).toBe(1);
  expect(report.oppositeArrivalAirportIcaoFieldPresent).toBe(1);
  expect(report.requestedAirportDepartureObjectWithAirportOmitted).toBe(1);
  expect(report.departureAirportIcaoFieldPresent).toBe(1);
  // An omitted departure.airport is valid when it equals the requested
  // airport; an irrelevant absent top-level leg object has no meaning.
  expect(report).not.toHaveProperty("flightLegObjectPresent");
  expect(report).not.toHaveProperty("originIcaoFieldPresent");
  expect(report.confirmedOperatingLegPopulation).toBe(false);
  expect(report.runwayActualOnlyPerRecordCertified).toBe(false);
  expect(report.strictGate5Passed).toBe(false);
 });
 it("preserves historical pinned producer without editing its code",()=>{
  const historical=readFileSync(
   "scripts/v39_phase4_gate5_wsss_20261102_three_horizon_real_aggregate_paid_actions.ts","utf8");
  expect(historical).toContain("inspectP4OnePaidNonretainedFidsV39");
  const inspector=readFileSync(
   "server/lib/disruption/phase4Gate5OnePaidNonretainedSourceInspection_v39.ts","utf8");
  expect(inspector).not.toContain("obj(f.leg)");
  expect(inspector).not.toContain("originIcaoFieldPresent:");
  expect(inspector).toContain("withLegExpandedMovementPairPresent");
  expect(inspector).not.toContain("fetch(");
  expect(inspector).not.toContain("INSERT INTO");
 });
 it("no invented runway actuals when no departure observations exist",()=>{
  const a=inspectP4OnePaidNonretainedFidsV39({departures:[]});
  expect(a.observedDepartureRecords).toBe(0);
  expect(a.runwayTimeFieldPresent).toBe(0);
  expect(a.confirmedOperatingLegPopulation).toBe(false);
  expect(a.certifiedPersistedPreCount).toBeNull();
 });
 it("refuses malformed provider results or >900 unbounded departure records",()=>{
  for(const data of [{},null,[],{departures:{}},
    {departures:[null]},{departures:new Array(901).fill({})}]){
   expect(()=>inspectP4OnePaidNonretainedFidsV39(data)).toThrow();
  }
 });
 it("rejects stale, repeated, foreign, future and database-connected paid jobs",()=>{
  const good=env();
  expect(()=>assertP4G5OnePaidEphemeralContext(good,SHA,NOW)).not.toThrow();
  for(const patch of [
   {GITHUB_EVENT_NAME:"schedule"},{GITHUB_REF:"refs/heads/other"},
   {GITHUB_RUN_ATTEMPT:"2"},{GITHUB_SHA:"b".repeat(40)},
   {GITHUB_JOB:"other"},{GITHUB_RUN_ID:"bad"},
   {P4_G5_PAID_EXACT_INTENT:"NOT_PAID"},
   {DATABASE_URL:"postgres://production"},
   {V39_DATABASE_RUNTIME_URL:"postgres://production"},
   {GATE05_AUTOMATION_DATABASE_URL:"postgres://production"},
   {RAPIDAPI_KEY:"secret"}
  ]){
   expect(()=>assertP4G5OnePaidEphemeralContext({
    ...good,...patch
   },SHA,NOW)).toThrow();
  }
  expect(()=>assertP4G5OnePaidEphemeralContext(good,SHA,
   Date.parse("2026-11-04T00:00:00.000Z"))).toThrow();
 });
 it("one unique push merge, no credential DB inputs or scheduled route",()=>{
  const workflow=readFileSync(
   ".github/workflows/phase4-gate5-one-real-paid-nonretained-fids-semantics.yml","utf8");
  const script=readFileSync(
   "scripts/v39_phase4_gate5_one_paid_nonretained_fids_semantics_actions.ts","utf8");
  expect(workflow).toContain("Merge pull request #325");
  expect(workflow).toContain('if: "${{ github.event_name');
  expect(workflow).not.toContain("workflow_dispatch:");
  expect(workflow).not.toContain("schedule:");
  expect(workflow).not.toContain("secrets.V39_DATABASE_RUNTIME_URL");
  expect(workflow).not.toContain("secrets.GATE05_AUTOMATION_DATABASE_URL");
  expect(workflow).toContain("secrets.AERODATABOX_API_KEY");
  expect(script).toContain("attempts=1;");
  expect(script).toContain("AbortSignal.timeout(15000)");
  expect(script).toContain("responseContentPersisted:false");
  expect(script).toContain("databaseConnections:0");
  expect(script).not.toContain("INSERT INTO");
  expect(script).not.toContain("new pg.Client");
 });
});
