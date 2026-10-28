import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {gate05ProviderReadFailureTransientV39,gate05TelemetryDecisionV39,
 GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS,
 GATE05_PROVIDER_POLL_INTERVAL_MS} from
 "../server/lib/disruption/gate05ProviderTelemetrySafety_v39";

const audit=readFileSync(
 "scripts/v39_gate05_retry5_no_paid_settlement_readonly_v39.ts","utf8");
const wf=readFileSync(
 ".github/workflows/phase3-gate05-retry5-readonly-settlement.yml","utf8");

describe("Gate05 bounded provider telemetry faults are not fabricated scientific data",()=>{
 it("does not confuse short provider GET timeouts with lack of credits",()=>{
  const t=Date.parse("2026-10-28T10:18:00.000Z");
  expect(gate05TelemetryDecisionV39({
    nowMs:t+30000,firstFaultAtMs:t,knownExactOwnedProviderId:true,
    ownerMayBeCreating:false
  })).toBe("RETRY_READ_ONLY_WITH_CENSORED_CONTROL_OBSERVATION");
  expect(gate05TelemetryDecisionV39({
    nowMs:t+GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS,
    firstFaultAtMs:t,knownExactOwnedProviderId:true,ownerMayBeCreating:false
  })).toBe("RETRY_READ_ONLY_WITH_CENSORED_CONTROL_OBSERVATION");
  expect(gate05TelemetryDecisionV39({
    nowMs:t+GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS+1,
    firstFaultAtMs:t,knownExactOwnedProviderId:true,ownerMayBeCreating:false
  })).toBe("EXACT_OWNED_DELETE_REQUIRED_ACCOUNTING_UNKNOWN");
  expect(GATE05_PROVIDER_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(20000);
  expect(GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS).toBeLessThanOrEqual(120000);
 });
 it("never guesses an exact DELETE when the remote CREATE or ownership is ambiguous",()=>{
  for(const known of [false,true]){
   expect(()=>gate05TelemetryDecisionV39({
     nowMs:10,firstFaultAtMs:20,knownExactOwnedProviderId:known,
     ownerMayBeCreating:true
   })).toThrow("GATE05_TELEMETRY_CLOCK_INVALID");
  }
  expect(gate05TelemetryDecisionV39({
   nowMs:140000,firstFaultAtMs:0,knownExactOwnedProviderId:false,
   ownerMayBeCreating:true
  })).toBe("UNCERTAIN_CREATE_OR_OWNER_HOLD_NO_GUESS");
  expect(gate05TelemetryDecisionV39({
   nowMs:140000,firstFaultAtMs:0,knownExactOwnedProviderId:false,
   ownerMayBeCreating:false
  })).toBe("UNCERTAIN_CREATE_OR_OWNER_HOLD_NO_GUESS");
 });
 it("retries only transport and server errors; invalid account is not transient",()=>{
  for(const e of ["BALANCE_UNAVAILABLE: transport failure",
    "BALANCE_UNAVAILABLE: HTTP 503",
    "R1_LIST_UNAVAILABLE: transport failure (details redacted)",
    "R1_LIST_UNAVAILABLE: HTTP 502 (body redacted)"])
   expect(gate05ProviderReadFailureTransientV39(e)).toBe(true);
  for(const e of ["BALANCE_UNAVAILABLE: HTTP 401",
    "BALANCE_UNAVAILABLE: missing/invalid Date header",
    "BALANCE_UNAVAILABLE: invalid response",
    "R1_LIST_UNAVAILABLE: HTTP 403 (body redacted)",
    "GATE05_DB_OWNER_MISMATCH"])expect(gate05ProviderReadFailureTransientV39(e)).toBe(false);
 });
 it("does not allow the settlement audit to create/delete/substitute billing evidence",()=>{
  expect(wf).toContain("workflow_dispatch:");
  expect(wf).toContain("environment: phase2g-paid");
  expect(wf).toContain("v39_gate05_retry5_no_paid_settlement_readonly_v39.ts");
  expect(wf).not.toMatch(/^\s+schedule:/m);
  for(const x of [
   'const SCOPE="e69ffa34-d8a6-456f-a49c-9dd459e6d294"',
   'const BASELINE=1981',
   'await db.query("BEGIN READ ONLY")',
   'getBalanceEvidenceStrictWithRetry({maxAttempts:3})',
   'listSubscriptionsStrictWithRetry({maxAttempts:3})',
   'exactOwnedSubscriptionActive:exactStillActive',
   'finalBillingSettlementMayLag:true',
   'noProviderMutation:true'
  ])expect(audit).toContain(x);
  expect(audit).not.toContain("createGate4SingleWithRawReceiptV39(");
  expect(audit).not.toContain("deleteSubscriptionVerifiedStrict(");
  expect(audit).not.toContain("refillBalance(");
 });
});
