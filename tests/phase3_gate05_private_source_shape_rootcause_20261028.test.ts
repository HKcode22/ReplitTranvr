import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {diagnoseGate05OriginalFlightSourceShapeV39 as d}
 from "../server/lib/disruption/gate05PrivateSourceShapeDiagnostic_v39";

const start="2026-10-29T03:45:00.000Z";
const stop="2026-10-29T04:45:00.000Z";

describe("Gate05 original raw source shape actual root cause",()=>{
 it("distinguishes airborne provider status from absent location and from coordinates without clock",()=>{
  const flights=[
   {id:"sensitive-id",number:"XX101",status:2,codeshareStatus:1,
    airline:{iata:"XX"},departure:{airport:{icao:"WSSS"},scheduledTime:{utc:start}},
    arrival:{airport:{icao:"YSSY"}},location:null},
   {id:"sensitive-id",number:"XX101",status:6,codeshareStatus:1,
    airline:{iata:"XX"},departure:{airport:{icao:"WSSS"},scheduledTime:{utc:start}},
    arrival:{airport:{icao:"YSSY"}},location:{lat:1,lon:2}},
   {id:"sensitive-id2",number:"XX202",status:8,codeshareStatus:1,
    airline:{iata:"XX"},departure:{airport:{icao:"WSSS"},scheduledTime:{utc:start}},
    arrival:{airport:{icao:"YSSY"}},location:{lat:1.2,lon:2.1,reportedAtUtc:start}},
   {number:"marketing-secret",status:9,codeshareStatus:2},
  ];
  const x=d(flights,start,stop);
  expect(x.rawItemCount).toBe(4);
  expect(x.rawAirborneStatusItems).toBe(3);
  expect(x.rawArrivedStatusItems).toBe(1);
  expect(x.locationObjectItems).toBe(2);
  expect(x.airborneStatusWithValidTimedGeometry).toBe(1);
  expect(x.airborneStatusWithValidInWindowPoint).toBe(1);
  expect(x.providerStatuses.EnRoute).toBe(1);
  expect(x.providerStatuses.Departed).toBe(1);
  expect(x.providerStatuses.Arrived).toBe(1);
  expect(x.provisionalOperatorRouteScheduleCandidateCount).toBe(2);
  expect(x.uniqueProviderIdCandidateCount).toBe(2);
  expect(x.codeshareItems.operator).toBe(3);
  expect(x.codeshareItems.marketing).toBe(1);
  expect(x.uniquePhysicalOperatingLegsVerified).toBe(false);
  expect(JSON.stringify(x)).not.toContain("sensitive-id");
  expect(JSON.stringify(x)).not.toContain("marketing-secret");
  expect(JSON.stringify(x)).not.toContain("XX101");
  expect(JSON.stringify(x)).not.toContain("WSSS");
 });
 it("exposes no source actual-vs-estimated certification even if runwayTime is present",()=>{
  const x=d([{status:"Arrived",codeshareStatus:"IsOperator",
    departure:{runwayTime:{utc:start}},arrival:{runwayTime:{utc:stop}}}],start,stop);
  expect(x.departureRunwayTimePresent).toBe(1);
  expect(x.arrivalRunwayTimePresent).toBe(1);
  expect(x.actualVsEstimatedRunwayTimeVerified).toBe(false);
  expect(x.scheduledWheelsOffSemanticsVerified).toBe(false);
 });
 it("treats location evidence without airborne provider status as different category",()=>{
  const x=d([{status:"Expected",codeshareStatus:0,
    location:{lat:12,lon:112,reportedAtUtc:start}}],start,stop);
  expect(x.locationObjectButNotAirborneStatusItems).toBe(1);
  expect(x.rawAirborneStatusItems).toBe(0);
  expect(x.inWindowLocationItems).toBe(1);
  expect(x.airborneStatusWithValidInWindowPoint).toBe(0);
 });
 it("is bound to private original-blob hash-verification code and does not add I/O",()=>{
  const script=readFileSync("scripts/v39_gate05_wsss_original_raw_final_readonly_20261028.mjs","utf8");
  const src=readFileSync("server/lib/disruption/gate05PrivateSourceShapeDiagnostic_v39.ts","utf8");
  expect(script).toContain("adaptGate05LoggedJournalToCensusV39");
  expect(script).toContain("authenticatedPrivateFlightObjects.push");
  expect(script).toContain("diagnoseGate05OriginalFlightSourceShapeV39");
  expect(script).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(script).toContain("store.downloadBytes(path)");
  expect(src).not.toContain("console.log");
  expect(src).not.toContain("fetch(");
  expect(src).not.toContain("process.env");
  expect(src).not.toContain("pg.");
  expect(script).not.toMatch(/(?:client|store)\.(?:query\(\s*["'](?:UPDATE|INSERT|DELETE)|delete\(|uploadBytes\()/);
 });
});