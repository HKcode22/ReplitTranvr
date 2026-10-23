import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 GATE4_ACTIONS_LIVE_STOP_RELEASED_V39,
 gate4IndependentApprovalPinsMatchV39,
 gate4StopRunnerTerminalHoldV39,
 reviewGate4LiveWatchLaunchV39,runGate4LiveStopWatchV39
} from "../scripts/v39_gate4_actions_live_stop_v39";
const scope={
 scopeId:"11111111-2222-3333-4444-555555555555",
 sourceCommit:"a".repeat(40),authorizationSha256:"b".repeat(64),
 airportIcao:"WSSS",
 startUtc:"2026-10-22T20:00:00.000Z",
 stopUtc:"2026-10-22T20:10:00.000Z",
 observedStartingCredits:2037,softCreditTarget:20,
 protectedCreditFloor:1000
};
const approvals:NodeJS.ProcessEnv={
 GATE4_SAFETY_APPROVED_SOURCE:scope.sourceCommit,
 GATE4_SAFETY_APPROVED_SCOPE:scope.scopeId,
 GATE4_SAFETY_APPROVED_AUTH:scope.authorizationSha256,
 GATE4_SAFETY_APPROVED_ICAO:scope.airportIcao,
 GATE4_SAFETY_APPROVED_START_UTC:scope.startUtc,
 GATE4_SAFETY_APPROVED_STOP_UTC:scope.stopUtc,
 GATE4_SAFETY_APPROVED_SOFT_TARGET:String(scope.softCreditTarget),
 GATE4_SAFETY_APPROVED_PROTECTED_FLOOR:String(scope.protectedCreditFloor)
};
describe("Gate4 Actions STOP: source seal and independent exact approvals",()=>{
 it("source seal remains OFF, never opened by a dispatch or env",()=>{
  expect(GATE4_ACTIONS_LIVE_STOP_RELEASED_V39).toBe(false);
  const env={
   ...approvals,
   GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"workflow_dispatch",
   GITHUB_REF:"refs/heads/main",GITHUB_SHA:scope.sourceCommit,
   GATE4_SAFETY_ENV_NAME:"gate4-safety",GITHUB_RUN_ID:"999",
   AERODATABOX_API_KEY:"mock-must-not-use",
   GATE4_SAFETY_READONLY_DATABASE_URL:
    "postgresql://gate4_safety_reader_local01:fake@never.example/db?sslmode=verify-full",
   GATE4_SAFETY_EXPECTED_DB_HOST:"never.example"
  };
  expect(reviewGate4LiveWatchLaunchV39(scope,
    "WATCH_G4_EXACT_ID_STOP_NO_CREATE",env)).toBe(false);
 });
 it("every independently protected source/trial/window/limit pin must match",()=>{
  expect(gate4IndependentApprovalPinsMatchV39(scope,approvals)).toBe(true);
  expect(gate4IndependentApprovalPinsMatchV39(scope,{})).toBe(false);
  for(const key of Object.keys(approvals)){
   expect(gate4IndependentApprovalPinsMatchV39(scope,{
     ...approvals,[key]:"FOREIGN_OR_UNAPPROVED"
   })).toBe(false);
   const without={...approvals};
   delete without[key];
   expect(gate4IndependentApprovalPinsMatchV39(scope,without)).toBe(false);
  }
 });
 it("workflow uses protected environment variables, not caller self-approval",()=>{
  const yaml=readFileSync(new URL(
    "../.github/workflows/phase3-gate4-live-exact-stop-candidate.yml",
    import.meta.url),"utf8");
  for(const key of Object.keys(approvals)){
   expect(yaml).toContain(key+": ${{ vars."+key+" }}");
   expect(yaml).not.toContain(key+": ${{ inputs.");
  }
 });
 it("keeps provider/DB secrets out of checkout and dispatch out of bash",()=>{
  const yaml=readFileSync(new URL(
    "../.github/workflows/phase3-gate4-live-exact-stop-candidate.yml",
    import.meta.url),"utf8");
  const marker="      - name: Run reviewed STOP-only implementation";
  const index=yaml.indexOf(marker);
  expect(index).toBeGreaterThan(0);
  const preparation=yaml.slice(0,index);
  const execution=yaml.slice(index);
  expect(preparation).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(preparation).not.toContain("secrets.GATE4_SAFETY_READONLY_DATABASE_URL");
  expect(execution).toContain("AERODATABOX_API_KEY: ${{ secrets.AERODATABOX_API_KEY }}");
  expect(execution).toContain("GATE4_SAFETY_READONLY_DATABASE_URL: ${{ secrets.GATE4_SAFETY_READONLY_DATABASE_URL }}");
  const shell=execution.split("        run: |")[1]?.split("      - name: Honest STOP")[0]??"";
  expect(shell).not.toMatch(/\$\{\{\s*inputs\./);
  for(const variable of ["SCOPE_ID","AUTH_SHA","ICAO","START_UTC",
    "STOP_UTC","STARTING_CREDITS","SOFT_TARGET","PROTECTED_FLOOR"])
    expect(shell).toContain('"$'+variable+'"');
 });
 it("unknown owned ID or custody failure triggers immediate terminal rescue",()=>{
  for(const reason of [
    "BILLABLE_ACTIVE_WITHOUT_OWNER_ID",
    "SPEND_WITHOUT_OWNED_ID",
    "OWNER_CUSTODY_READ_FAILED",
    "OWNER_CUSTODY_SCOPE_MISMATCH",
    "STRICT_INVENTORY_UNAVAILABLE"
  ]){
   expect(gate4StopRunnerTerminalHoldV39({
     status:"HOLD_OWNER_REQUIRED",reason
   })).toBe("EXACT_OWNER_RESCUE_REQUIRED");
  }
  expect(gate4StopRunnerTerminalHoldV39({
    status:"STOP_UNCONFIRMED",reason:"EXACT_DELETE_UNCONFIRMED"
  })).toBe("EXACT_STOP_UNCONFIRMED");
  expect(gate4StopRunnerTerminalHoldV39({
    status:"WATCH",reason:"NO_ACTIVE_OWNED_ID_YET"
  })).toBeNull();
  expect(gate4StopRunnerTerminalHoldV39({
    status:"STOPPED_EXACT_PENDING_SETTLEMENT",reason:"HARD_TIME_DEADLINE"
  })).toBeNull();
 });
 it("provider and DB are never contacted while source seal is closed",async()=>{
  await expect(runGate4LiveStopWatchV39(scope,
    "WATCH_G4_EXACT_ID_STOP_NO_CREATE",{}))
    .rejects.toThrow("GATE4_ACTIONS_RELEASE_OR_ENV_NOT_APPROVED_HOLD");
 });
});
