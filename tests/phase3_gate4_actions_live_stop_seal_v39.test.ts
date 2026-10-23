import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 GATE4_ACTIONS_LIVE_STOP_RELEASED_V39,
 gate4PublishedReceiverMatchesStopScopeV39,
 gate4IndependentRunnerSourcePinnedV39,
 gate4IndependentApprovalPinsMatchV39,
 GATE4_POSITIVE_OWNER_BIND_GRACE_MS,
 gate4MayWaitForPositiveOwnerBindingV39,
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
 it("reviewed STOP-only source release still refuses without independent approval",()=>{
  expect(GATE4_ACTIONS_LIVE_STOP_RELEASED_V39).toBe(true);
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
 it("requires separate frozen receiver and independently reviewed runner source pins",()=>{
  const runner="c".repeat(40);
  const approved={...approvals,
    GATE4_SAFETY_APPROVED_RUNNER_SHA:runner,
    GITHUB_SHA:runner};
  expect(runner).not.toBe(scope.sourceCommit);
  expect(gate4IndependentRunnerSourcePinnedV39(approved)).toBe(true);
  expect(gate4IndependentApprovalPinsMatchV39(scope,approved)).toBe(true);
  expect(gate4IndependentRunnerSourcePinnedV39({
    ...approved,GATE4_SAFETY_APPROVED_RUNNER_SHA:scope.sourceCommit
  })).toBe(false);
  expect(gate4IndependentRunnerSourcePinnedV39({
    ...approved,GITHUB_SHA:scope.sourceCommit
  })).toBe(false);
  expect(gate4IndependentRunnerSourcePinnedV39({
    ...approved,GATE4_SAFETY_APPROVED_RUNNER_SHA:undefined
  })).toBe(false);
  expect(gate4IndependentRunnerSourcePinnedV39({
    ...approved,GITHUB_SHA:"not-a-sha",
    GATE4_SAFETY_APPROVED_RUNNER_SHA:"not-a-sha"
  })).toBe(false);
 });
 it("admits only an actual separately pinned GH runner and receiver, no CREATE permission",()=>{
  const runner="c".repeat(40);
  const env:NodeJS.ProcessEnv={
    ...approvals,
    GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"workflow_dispatch",
    GITHUB_REF:"refs/heads/main",GITHUB_SHA:runner,
    GATE4_SAFETY_APPROVED_RUNNER_SHA:runner,
    GATE4_SAFETY_ENV_NAME:"gate4-safety",GITHUB_RUN_ID:"999",
    AERODATABOX_API_KEY:"mock-must-not-call",
    GATE4_SAFETY_READONLY_DATABASE_URL:
      "postgresql://gate4_safety_reader_local01:fake@never.example/db?sslmode=verify-full",
    GATE4_SAFETY_EXPECTED_DB_HOST:"never.example",
    GATE4_STOP_ARMED_COMMENT_TOKEN:"test-token-not-live"
  };
  expect(reviewGate4LiveWatchLaunchV39(scope,
    "WATCH_G4_EXACT_ID_STOP_NO_CREATE",env)).toBe(true);
  for(const key of [
    "GATE4_SAFETY_APPROVED_RUNNER_SHA","GATE4_SAFETY_APPROVED_SOURCE",
    "GATE4_SAFETY_APPROVED_START_UTC","GATE4_SAFETY_APPROVED_STOP_UTC",
    "AERODATABOX_API_KEY","GATE4_SAFETY_READONLY_DATABASE_URL",
    "GATE4_STOP_ARMED_COMMENT_TOKEN"
  ]){
    expect(reviewGate4LiveWatchLaunchV39(scope,
      "WATCH_G4_EXACT_ID_STOP_NO_CREATE",
      {...env,[key]:undefined})).toBe(false);
  }
  expect(reviewGate4LiveWatchLaunchV39(scope,
      "WATCH_G4_EXACT_ID_STOP_NO_CREATE",
      {...env,GATE4_PROVIDER_CREATE_ALLOWED:"1"})).toBe(false);
  expect(reviewGate4LiveWatchLaunchV39(scope,
      "WATCH_G4_EXACT_ID_STOP_NO_CREATE",
      {...env,GITHUB_REF:"refs/heads/feature"})).toBe(false);
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
 it("pins runner separately in workflow and passes reviewed receiver SHA",()=>{
   const yaml=readFileSync(new URL(
     "../.github/workflows/phase3-gate4-live-exact-stop-candidate.yml",
     import.meta.url),"utf8");
   expect(yaml).toContain("GATE4_SAFETY_APPROVED_RUNNER_SHA: ${{ vars.GATE4_SAFETY_APPROVED_RUNNER_SHA }}");
   expect(yaml).toContain('test "${GATE4_SAFETY_APPROVED_RUNNER_SHA:-}" = "$GITHUB_SHA"');
   expect(yaml).toContain('--head "$GATE4_SAFETY_APPROVED_SOURCE"');
   expect(yaml).not.toContain('--head "$GITHUB_SHA"');
 });
 it("keeps provider/DB secrets out of checkout and dispatch out of bash",()=>{
  const yaml=readFileSync(new URL(
    "../.github/workflows/phase3-gate4-live-exact-stop-candidate.yml",
    import.meta.url),"utf8");
  const marker="      - name: Run protected STOP-only implementation";
  const index=yaml.indexOf(marker);
  expect(index).toBeGreaterThan(0);
  const preparation=yaml.slice(0,index);
  const execution=yaml.slice(index);
  expect(preparation).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(preparation).not.toContain("secrets.GATE4_SAFETY_READONLY_DATABASE_URL");
  expect(execution).toContain("AERODATABOX_API_KEY: ${{ secrets.AERODATABOX_API_KEY }}");
  expect(execution).toContain("GATE4_STOP_ARMED_COMMENT_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
  expect(yaml).toContain("  issues: write");
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
 it("verifies GitHub checkout at runner SHA rather than receiver SHA",()=>{
  const src=readFileSync(new URL(
    "../scripts/v39_gate4_actions_live_stop_v39.ts",import.meta.url),"utf8");
  expect(src).toContain('}).trim()!==env.GITHUB_SHA)');
  expect(src).toContain('gate4IndependentRunnerSourcePinnedV39(env)');
  expect(src).toContain('GATE4_ACTIONS_LIVE_STOP_RELEASED_V39=true;');
 });
 it("bounds live CREATE-to-positive-ID write gap; never infers ownership",()=>{
   const held={status:"HOLD_OWNER_REQUIRED" as const,
     reason:"BILLABLE_ACTIVE_WITHOUT_OWNER_ID"};
   const start=Date.parse("2026-10-23T22:00:00.000Z");
   expect(GATE4_POSITIVE_OWNER_BIND_GRACE_MS).toBe(8000);
   expect(gate4MayWaitForPositiveOwnerBindingV39(
     held,start,start+300000)).toBe(true);
   expect(gate4MayWaitForPositiveOwnerBindingV39(
     held,start+300000,start+300000)).toBe(false);
   for(const reason of ["SPEND_WITHOUT_OWNED_ID",
     "OWNER_CUSTODY_READ_FAILED","STRICT_INVENTORY_UNAVAILABLE"]){
     expect(gate4MayWaitForPositiveOwnerBindingV39(
       {...held,reason},start,start+300000)).toBe(false);
   }
   expect(gate4MayWaitForPositiveOwnerBindingV39(
     {...held,status:"WATCH"},start,start+300000)).toBe(false);
   expect(gate4MayWaitForPositiveOwnerBindingV39(
     held,NaN,start+300000)).toBe(false);
   const src=readFileSync(new URL(
     "../scripts/v39_gate4_actions_live_stop_v39.ts",import.meta.url),"utf8");
   expect(src).toContain("Date.now()+GATE4_POSITIVE_OWNER_BIND_GRACE_MS");
   expect(src).toContain("const r=await client.query(query,[scope.scopeId]);");
   expect(src).toContain("if(ownerAppeared)continue;");
   expect(src).toContain('hold("AMBIGUOUS_OWNER_ROWS_IN_BIND_GRACE")');
 });
 it("provider and DB are never contacted without mandatory independent approvals",async()=>{
  await expect(runGate4LiveStopWatchV39(scope,
    "WATCH_G4_EXACT_ID_STOP_NO_CREATE",{}))
    .rejects.toThrow("GATE4_ACTIONS_RELEASE_OR_ENV_NOT_APPROVED_HOLD");
 });
});

describe("Gate4 independent STOP published receiver identity before paid trial",()=>{
 const reported={
   status:"PASS",git_head:scope.sourceCommit,
   published_deployment:true,prepaid_route_registered:true,
   gate4_alert_ingress_registered:true,
   gate4_alert_callback_proven:false,
   runtime_owner_mode:"replit-published-deployment",
   provider_mutation:false
 };
 it("accepts source and both registered routes; does not require fake provider callback proof",()=>{
   expect(gate4PublishedReceiverMatchesStopScopeV39(
     reported,scope.sourceCommit)).toBe(true);
 });
 it("rejects older deployed Replit source, even if HTTP health is PASS",()=>{
   expect(gate4PublishedReceiverMatchesStopScopeV39(
     {...reported,git_head:"e655b009dc4d5bd349f2340ee90f6beb18b51896"},
     scope.sourceCommit)).toBe(false);
 });
 it("rejects missing Alert ingress, offline app, failed health or wrong mode",()=>{
   for(const patch of [
     {gate4_alert_ingress_registered:false},
     {prepaid_route_registered:false},
     {published_deployment:false},
     {status:"FAIL"},
     {runtime_owner_mode:"replit-managed-project"},
     {provider_mutation:true}
   ]){
     expect(gate4PublishedReceiverMatchesStopScopeV39(
       {...reported,...patch},scope.sourceCommit)).toBe(false);
   }
 });
 it("rejects malformed, missing or spoofed public status",()=>{
   for(const payload of [null,undefined,[],{},{
     ...reported,git_head:null
   }]){
     expect(gate4PublishedReceiverMatchesStopScopeV39(
       payload,scope.sourceCommit)).toBe(false);
   }
   expect(gate4PublishedReceiverMatchesStopScopeV39(
     reported,"INVALID")).toBe(false);
 });
 it("guard runs after source seal and before provider/Neon connections",()=>{
   const src=readFileSync(new URL(
     "../scripts/v39_gate4_actions_live_stop_v39.ts",import.meta.url),"utf8");
   const live=src.indexOf("export async function runGate4LiveStopWatchV39(");
   const body=src.slice(live);
   expect(body.indexOf("reviewGate4LiveWatchLaunchV39("))
     .toBeLessThan(body.indexOf("fetch(RECEIVER_STATUS_URL,"));
   expect(body.indexOf("fetch(RECEIVER_STATUS_URL,"))
     .toBeLessThan(body.indexOf("new pg.Client("));
   expect(body.indexOf("fetch(RECEIVER_STATUS_URL,"))
     .toBeLessThan(body.indexOf("listSubscriptionsStrictWithRetry()"));
   expect(src).toContain("GATE4_ACTIONS_LIVE_STOP_RELEASED_V39=true;");
 });
});
