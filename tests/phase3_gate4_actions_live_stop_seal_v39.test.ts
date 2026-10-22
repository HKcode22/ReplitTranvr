import {describe,it,expect} from "vitest";
import {GATE4_ACTIONS_LIVE_STOP_RELEASED_V39,
  reviewGate4LiveWatchLaunchV39,runGate4LiveStopWatchV39}
 from "../scripts/v39_gate4_actions_live_stop_v39";
const scope={
 scopeId:"11111111-2222-3333-4444-555555555555",
 sourceCommit:"a".repeat(40),authorizationSha256:"b".repeat(64),
 airportIcao:"WSSS",
 startUtc:"2026-10-22T20:00:00.000Z",
 stopUtc:"2026-10-22T20:10:00.000Z",
 observedStartingCredits:2037,softCreditTarget:20,
 protectedCreditFloor:1000
};
describe("Gate4 live Actions STOP entrypoint is source-sealed and cannot do I/O",()=>{
 it("source release seal is OFF, not switchable through GH environment",()=>{
  expect(GATE4_ACTIONS_LIVE_STOP_RELEASED_V39).toBe(false);
  const env={
   GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"workflow_dispatch",
   GITHUB_REF:"refs/heads/main",GITHUB_SHA:scope.sourceCommit,
   GATE4_SAFETY_APPROVED_SOURCE:scope.sourceCommit,
   GATE4_SAFETY_APPROVED_SCOPE:scope.scopeId,
   GATE4_SAFETY_APPROVED_AUTH:scope.authorizationSha256,
   GATE4_SAFETY_APPROVED_ICAO:scope.airportIcao,
   GATE4_SAFETY_ENV_NAME:"gate4-safety",GITHUB_RUN_ID:"999",
   AERODATABOX_API_KEY:"mock-must-not-use",
   GATE4_SAFETY_READONLY_DATABASE_URL:
    "postgresql://gate4_safety_reader_local01:fake@never.example/db?sslmode=verify-full",
   GATE4_SAFETY_EXPECTED_DB_HOST:"never.example"
  };
  expect(reviewGate4LiveWatchLaunchV39(scope,
    "WATCH_G4_EXACT_ID_STOP_NO_CREATE",env)).toBe(false);
 });
 it("provider and DB are never contacted when source seal is closed",async()=>{
  await expect(runGate4LiveStopWatchV39(scope,
    "WATCH_G4_EXACT_ID_STOP_NO_CREATE",{}))
    .rejects.toThrow("GATE4_ACTIONS_RELEASE_OR_ENV_NOT_APPROVED_HOLD");
 });
});
