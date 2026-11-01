import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {draftP4Gate5ThreeHorizonGridV39,
  type P4Gate5GridDraftInputV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";

const good=():P4Gate5GridDraftInputV39=>({
 airportIcao:"WSSS",airportIanaTimezone:"Asia/Singapore",
 serviceWindowStartUtc:"2026-11-04T17:00:00.000Z",
 serviceWindowEndUtc:"2026-11-04T18:00:00.000Z",
 assignmentFrozenAtUtc:"2026-11-03T10:00:00.000Z",
 acquisitionGuardMinutes:15,refreshCadenceMinutes:30,
 maxStalenessMinutes:45,githubPrearmLeadMinutes:60,
 apiUnitsPerPhysicalAttempt:2,maxAttemptsPerQuery:3,
 projectRestApiUnitsBudget:54,maxSourceQueries:15
});
describe("Phase4 Gate5 nonadaptive future acquisition grid — PURE DRAFT",()=>{
 it("frozen new WSSS cohort uses exact 24h, 6h and 90m cutoff grids, never old Oct31",()=>{
  const p=draftP4Gate5ThreeHorizonGridV39(good());
  expect(p.status).toBe("DRAFT_ONLY_PROVIDER_SOURCE_AND_SELECTED_T_UNVERIFIED");
  expect(p.horizonOwners.map(o=>o.queryCount)).toEqual([3,3,3]);
  expect(p.queries).toHaveLength(9);
  expect(p.expectedMaxApiUnits).toBe(54);
  expect(p.worstCasePhysicalAttempts).toBe(27);
  expect(p.sourceRangeLocal).toEqual({
    from:"2026-11-05T01:00",to:"2026-11-05T02:00"
  });
  expect(p.queries.filter(q=>q.horizon==="T-24h")
    .map(q=>q.candidateGridCutoffUtc)).toEqual([
     "2026-11-03T17:00:00.000Z",
     "2026-11-03T17:30:00.000Z",
     "2026-11-03T18:00:00.000Z"
    ]);
  expect(p.queries.filter(q=>q.horizon==="T-6h")[0]
     .plannedPhysicalStartUtc).toBe("2026-11-04T10:45:00.000Z");
  expect(p.queries.filter(q=>q.horizon==="T-90m")[0]
     .candidateGridCutoffUtc).toBe("2026-11-04T15:30:00.000Z");
  expect(new Set(p.queries.map(q=>q.providerQueryFromLocal))).toEqual(
    new Set(["2026-11-05T01:00"])
  );
  for(const q of p.queries) {
   expect(q.requestDirection).toBe("Departure");
   expect(q.withLeg).toBe(true);
   expect(q.withCancelled).toBe(true);
   expect(q.withCodeshared).toBe(true);
   expect(q.withCargo).toBe(false);
   expect(q.withPrivate).toBe(false);
  }
 });
 it("nondivisible cadence covers the full frozen cutoff interval without adaptive trigger",()=>{
  const p=draftP4Gate5ThreeHorizonGridV39({
    ...good(),refreshCadenceMinutes:25,maxSourceQueries:12,
    projectRestApiUnitsBudget:72
  });
  expect(p.queries).toHaveLength(12);
  expect(p.queries.filter(q=>q.horizon==="T-6h")
    .map(q=>q.candidateGridCutoffUtc)).toEqual([
    "2026-11-04T11:00:00.000Z","2026-11-04T11:25:00.000Z",
    "2026-11-04T11:50:00.000Z","2026-11-04T12:00:00.000Z"
   ]);
 });
 it("fail closed on insufficient budget, missing horizon freshness or late prearm freeze",()=>{
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),projectRestApiUnitsBudget:53
  })).toThrow("P4_GRID_WORST_CASE_API_UNITS_OVER_BUDGET");
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),refreshCadenceMinutes:60,maxStalenessMinutes:30
  })).toThrow("P4_GRID_CADENCE_EXCEEDS_STALENESS");
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),assignmentFrozenAtUtc:"2026-11-03T16:00:00.000Z"
  })).toThrow("P4_GRID_FREEZE_TOO_LATE_FOR_EARLIEST_PREARM");
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),maxSourceQueries:8
  })).toThrow("P4_GRID_TOO_MANY_QUERIES");
 });
 it("never silently map an ambiguous DST-fold service interval to local FIDS strings",()=>{
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),airportIcao:"KJFK",
    airportIanaTimezone:"America/New_York",
    serviceWindowStartUtc:"2026-11-01T05:00:00.000Z",
    serviceWindowEndUtc:"2026-11-01T07:00:00.000Z",
    assignmentFrozenAtUtc:"2026-10-30T12:00:00.000Z",
    projectRestApiUnitsBudget:100,maxSourceQueries:30
  })).toThrow("P4_GRID_DST_EDGE_REQUIRES_SPLIT");
 });
 it("rejects malformed times, unsupported zones, oversized intervals and impossible attempts",()=>{
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),serviceWindowStartUtc:"2026-11-04T17:00Z"
  })).toThrow("P4_GRID_INVALID_UTC");
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),airportIanaTimezone:"Not/A_Timezone"
  })).toThrow("P4_GRID_INVALID_AIRPORT_TIMEZONE");
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),serviceWindowEndUtc:"2026-11-04T23:00:00.000Z"
  })).toThrow("P4_GRID_WINDOW_HOLD");
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),maxAttemptsPerQuery:4
  })).toThrow("P4_GRID_INVALID_NUMBER:attempts");
  expect(()=>draftP4Gate5ThreeHorizonGridV39({
    ...good(),serviceWindowEndUtc:"2026-11-04T17:11:00.000Z",
    refreshCadenceMinutes:15
  })).not.toThrow();
 });
 it("no self-certification, no GitHub dispatch, no provider call, no paid authorization",()=>{
  const a=draftP4Gate5ThreeHorizonGridV39(good());
  expect(a.selectedProviderNativeTCertified).toBe(false);
  expect(a.providerFidsRangeEdgeVerified).toBe(false);
  expect(a.operationalAcquisitionGuardMeasured).toBe(false);
  expect(a.githubPrearmedRunnerObserved).toBe(false);
  expect(a.anyPaidRequestAuthorized).toBe(false);
  expect(a.anyProviderCallMade).toBe(false);
  expect(a.certifiedSnapshotsWritten).toBe(false);
  expect(a.phase5FreezeAuthorized).toBe(false);
  expect(a.phase6Authorized).toBe(false);
  const src=readFileSync("server/lib/disruption/phase4Gate5FrozenGridDraft_v39.ts","utf8");
  expect(src).not.toContain("fetch(");
  expect(src).not.toContain("process.env");
  expect(src).not.toContain("INSERT INTO");
  expect(src).not.toContain("AERODATABOX_API_KEY");
 });
});
