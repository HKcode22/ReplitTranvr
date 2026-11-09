import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {
 proposeP5RollingEarliestFirstDayScenario
} from "../server/lib/disruption/phase5RollingEarliestFirstDayScenario_v39";

function realCorrectedPacket(){
 return JSON.parse(readFileSync(new URL(
  "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
  import.meta.url),"utf8"));
}
const base=()=>({
 ownerCorrectedReadback:realCorrectedPacket(),
 assumedAllGatesReadyAtUtc:"2026-11-09T09:27:00.000Z",
 schedulerSlipBoundSeconds:300,
 responseAndPersistBoundSeconds:120,
 preCommitMarginSeconds:60
});
describe("rolling earliest prospective Phase6 day, NOT a launch permit",()=>{
 it("does not force November 24 when earlier valid clock geometry is possible",()=>{
  const p=proposeP5RollingEarliestFirstDayScenario(base());
  expect(p.status).toBe("SCENARIO_EARLIEST_DATE_ONLY_NOT_RELEASE");
  expect(p.earliestFirstBatchDayUtcDate).toBe("2026-11-11");
  expect(p.earliestFirstBatchStartUtc).toBe("2026-11-11T00:00:00.000Z");
  expect(p.hypotheticalFirstWindowStartT24Utc).toBe("2026-11-10T00:00:00.000Z");
  expect(p.totalExtraPreT24SafetySeconds).toBe(480);
  expect(p.conservativeReadyForFirstT24Utc).toBe("2026-11-09T09:35:00.000Z");
  expect(p.dateCandidate.days).toHaveLength(31);
  expect(p.dateCandidate.candidateRunDatesByIndex["1"]).toBe("2026-11-11");
  expect(p.dateCandidate.dateMapSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(p.proposedCalendarSpanDays).toBeGreaterThanOrEqual(31);
  expect(p.proposedEndDateUtc).not.toBeNull();
  expect(p.doesNotForceNov24OrJan05).toBe(true);
  expect(p.providerCalls).toBe(0);
  expect(p.databaseWrites).toBe(0);
  expect(p.paidAlertCreates).toBe(0);
  for(const k of [
   "actualReadinessEvidenceAuthenticated",
   "actualEarliestPhysicalOperatingFlightTVerified",
   "providerFidsReachabilityAndLatencyVerified",
   "all31DaysFrozenAndIndependentlyAudited",
   "providerRetentionRightsVerified",
   "realSourcePREPOSTReceiverVerified",
   "scientificPhase5FreezePassed","phase6PaidGo"
  ] as const)expect(p[k]).toBe(false);
 });
 it("moves the earliest day later when readiness misses the T24 by minutes",()=>{
  const p=proposeP5RollingEarliestFirstDayScenario({
   ...base(),assumedAllGatesReadyAtUtc:"2026-11-09T23:59:00.000Z",
   schedulerSlipBoundSeconds:60,responseAndPersistBoundSeconds:60,
   preCommitMarginSeconds:60
  });
  expect(p.conservativeReadyForFirstT24Utc).toBe("2026-11-10T00:02:00.000Z");
  expect(p.earliestFirstBatchDayUtcDate).toBe("2026-11-12");
  expect(p.hypotheticalFirstWindowStartT24Utc).toBe("2026-11-11T00:00:00.000Z");
 });
 it("rolls a date estimate with readiness, not a hardcoded calendar or old pilot",()=>{
  const earlier=proposeP5RollingEarliestFirstDayScenario({
   ...base(),assumedAllGatesReadyAtUtc:"2026-11-08T22:00:00.000Z"
  });
  const later=proposeP5RollingEarliestFirstDayScenario({
   ...base(),assumedAllGatesReadyAtUtc:"2026-11-12T22:00:00.000Z"
  });
  expect(earlier.earliestFirstBatchDayUtcDate).toBe("2026-11-10");
  expect(later.earliestFirstBatchDayUtcDate).toBe("2026-11-14");
  expect(later.dateCandidate.dateMapSha256).not.toBe(earlier.dateCandidate.dateMapSha256);
  expect(later.phase6PaidGo).toBe(false);
 });
 it("never allows zero, negative, fractional or missing latency assumptions",()=>{
  const bad=[
   {...base(),schedulerSlipBoundSeconds:0},
   {...base(),responseAndPersistBoundSeconds:-1},
   {...base(),preCommitMarginSeconds:0},
   {...base(),schedulerSlipBoundSeconds:1.1},
   {...base(),responseAndPersistBoundSeconds:undefined},
   {...base(),additionalReserveSeconds:-2},
   {...base(),additionalReserveSeconds:100_000},
   {...base(),assumedAllGatesReadyAtUtc:"2026-11-09"},
   {...base(),assumedAllGatesReadyAtUtc:"2026-02-30T09:27:00.000Z"},
   {...base(),assumedAllGatesReadyAtUtc:"not-authenticated"}
  ];
  for(const x of bad){
   expect(()=>proposeP5RollingEarliestFirstDayScenario(x as any))
    .toThrow(/REFUSED_P5_ROLLING_FIRST_DAY/);
  }
 });
 it("cannot turn a short 31-day search horizon into false schedule feasibility",()=>{
  const p=proposeP5RollingEarliestFirstDayScenario({
   ...base(),maxCalendarSpanDays:31
  });
  expect(p.status).toBe("HOLD_SCENARIO_CANNOT_FIT_THIRTY_ONE_DATES");
  expect(p.dateCandidate.days.length).toBeLessThan(31);
  expect(p.proposedEndDateUtc).toBeNull();
  expect(p.phase6PaidGo).toBe(false);
 });
 it("changed source airport identities still fail closed",()=>{
  const input=base();
  input.ownerCorrectedReadback.candidatePairAirportSets[2].airports.MID_A.icao="KTEB";
  expect(()=>proposeP5RollingEarliestFirstDayScenario(input))
   .toThrow(/REFUSED_P5_REAL_PAIR_DATE_PROPOSAL/);
 });
});