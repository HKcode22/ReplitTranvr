import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {summarizeP4OneStatusFeasibility}
 from "../server/lib/disruption/phase4Gate5OneStatusFeasibility_v39";
import {p4OnePaidStatusGuard}
 from "../scripts/v39_phase4_wsss_one_paid_status_probe_20261029";
const request={number:"SQ123",originIcao:"WSSS" as const,destinationIcao:"YSSY"};
const source={
 number:"SQ 123",id:"synthetic-provider-id",
 aircraft:{reg:"TEST-1",modeS:"AABBCC"},
 departure:{airport:{icao:"WSSS"},scheduledTime:{utc:"2026-10-28T00:00:00Z"},
  runwayTime:{utc:"2026-10-28T00:10:00Z"},
  revisedTime:{utc:"2026-10-28T00:05:00Z"}},
 arrival:{airport:{icao:"YSSY"}}
};
describe("Phase4 one-Tier2-status source feasibility, never science PASS",()=>{
 it("counts source-origin and destination-matched fields, never certifies time actuality",()=>{
  const report=summarizeP4OneStatusFeasibility([source],request);
  expect(report).toMatchObject({
   returnedStatusRecords:1,sameFlightNumberRecords:1,
   sourceAirportOriginMatched:1,originAndDestinationMatched:1,
   originalRunwayTimeFieldPresent:1,originalScheduleTimeFieldPresent:1,
   providerIdFieldPresent:1,aircraftIcao24FieldPresent:1,
   aircraftRegistrationFieldPresent:1,
   providerRunwayFieldActualityCertified:false,
   independentPhysicalLegIdentityCertified:false,
   providerScheduledTGateOrRunwaySemanticsCertified:false,
   strictGate5Passed:false,phase6Authorized:false,
   maxPaidStatusGets:1,automaticRetries:0,databaseWrites:0,
   sourceBytesPersisted:false
  });
  expect(JSON.stringify(report)).not.toContain("SQ");
  expect(JSON.stringify(report)).not.toContain("TEST-1");
 });
 it("rejects identity and route collisions from being counted as matched flight",()=>{
  const report=summarizeP4OneStatusFeasibility([
   {...source,number:"QF123"},
   {...source,departure:{airport:{icao:"KLAX"}}},
   {...source,arrival:{airport:{icao:"KGPT"}}}
  ],request);
  expect(report.sameFlightNumberRecords).toBe(2);
  expect(report.sourceAirportOriginMatched).toBe(1);
  expect(report.originAndDestinationMatched).toBe(0);
  expect(report.originalRunwayTimeFieldPresent).toBe(0);
  expect(report.independentPhysicalLegIdentityCertified).toBe(false);
 });
 it("absent provider data stays zero source fields, not source population zero",()=>{
  const report=summarizeP4OneStatusFeasibility([],request);
  expect(report.returnedStatusRecords).toBe(0);
  expect(report.strictGate5Passed).toBe(false);
  expect(report.noProviderAlertsOrSubscriptions).toBe(true);
 });
 it("rejects unexpectedly large response or invalid candidate",()=>{
  expect(()=>summarizeP4OneStatusFeasibility(Array(31).fill(source),request))
   .toThrow("P4_STATUS_RESPONSE_SHAPE_HOLD");
  expect(()=>summarizeP4OneStatusFeasibility([source],{
   ...request,number:"source with spaces"}))
   .toThrow("P4_STATUS_CANDIDATE_FORMAT_HOLD");
 });
 it("GitHub execution only main, once, before sunset and only exact approved intent",()=>{
  const env={
   GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
   GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"push",
   GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
   P4_ONE_STATUS_EXACT_INTENT:"ONE_PROTECTED_FIDS_OPERATOR_STATUS_TIER2_NO_RETRY"
  };
  expect(()=>p4OnePaidStatusGuard(env,Date.parse("2026-10-30T00:00:00Z")))
   .not.toThrow();
  for(const wrong of [
   {GITHUB_REF:"refs/heads/feature"},{GITHUB_RUN_ATTEMPT:"2"},
   {GITHUB_EVENT_NAME:"workflow_dispatch"},
   {P4_ONE_STATUS_EXACT_INTENT:"anything"}
  ])expect(()=>p4OnePaidStatusGuard({...env,...wrong},Date.parse("2026-10-30T00:00:00Z")))
   .toThrow("P4_ONE_STATUS_CONTEXT_OR_DEADLINE_HOLD");
  expect(()=>p4OnePaidStatusGuard(env,Date.parse("2026-11-01T00:00:00Z")))
   .toThrow("P4_ONE_STATUS_CONTEXT_OR_DEADLINE_HOLD");
 });
 it("workflow protected and paid script has one HTTP GET, no paid loop or SQL DML",()=>{
  const script=readFileSync("scripts/v39_phase4_wsss_one_paid_status_probe_20261029.ts","utf8");
  const workflow=readFileSync(".github/workflows/phase4-gate5-one-paid-wsss-status-feasibility.yml","utf8");
  expect((script.match(/await fetch\(/g)??[]).length).toBe(1);
  expect(script).toContain("REPEATABLE READ READ ONLY");
  expect(script).toContain('await c.query("ROLLBACK")');
  expect(script).toContain("attempted=1");
  expect(script).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|DROP|TRUNCATE)\s+clean\./);
  expect(workflow).toContain("environment: phase2g-paid");
  expect(workflow).toContain("AERODATABOX_API_KEY:");
  expect(workflow).toContain("GATE05_AUTOMATION_DATABASE_URL:");
  expect(workflow).not.toContain("workflow_dispatch");
  expect(workflow).not.toContain("schedule:");
  expect(workflow).not.toContain("AERODATABOX_WEBHOOK_SECRET:");
 });
});
