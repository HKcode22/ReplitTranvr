import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
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
  it("never interpolates dispatch data into bash or supplies secrets during checkout/install",()=>{
    const yaml=readFileSync(new URL(
      "../.github/workflows/phase3-gate4-live-exact-stop-candidate.yml",
      import.meta.url),"utf8");
    const marker="      - name: Run reviewed STOP-only implementation";
    const i=yaml.indexOf(marker);
    expect(i).toBeGreaterThan(0);
    const preparation=yaml.slice(0,i);
    const execution=yaml.slice(i);
    // Provider key and restricted DB URL exist only on the STOP execution step.
    expect(preparation).not.toContain("secrets.AERODATABOX_API_KEY");
    expect(preparation).not.toContain("secrets.GATE4_SAFETY_READONLY_DATABASE_URL");
    expect(execution).toContain("AERODATABOX_API_KEY: ${{ secrets.AERODATABOX_API_KEY }}");
    expect(execution).toContain("GATE4_SAFETY_READONLY_DATABASE_URL: ${{ secrets.GATE4_SAFETY_READONLY_DATABASE_URL }}");
    const run=execution.split("        run: |")[1]?.split("      - name: Honest STOP")[0]??"";
    expect(run).not.toMatch(/\$\{\{\s*inputs\./);
    for(const variable of ["SCOPE_ID","AUTH_SHA","ICAO","START_UTC",
      "STOP_UTC","STARTING_CREDITS","SOFT_TARGET","PROTECTED_FLOOR"]){
      expect(run).toContain('" when source seal is closed",async()=>{
  await expect(runGate4LiveStopWatchV39(scope,
    "WATCH_G4_EXACT_ID_STOP_NO_CREATE",{}))
    .rejects.toThrow("GATE4_ACTIONS_RELEASE_OR_ENV_NOT_APPROVED_HOLD");
 });
});
+variable+'"');
    }
  });
 it("provider and DB are never contacted when source seal is closed",async()=>{
  await expect(runGate4LiveStopWatchV39(scope,
    "WATCH_G4_EXACT_ID_STOP_NO_CREATE",{}))
    .rejects.toThrow("GATE4_ACTIONS_RELEASE_OR_ENV_NOT_APPROVED_HOLD");
 });
});
