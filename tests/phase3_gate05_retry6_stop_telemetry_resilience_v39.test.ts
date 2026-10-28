import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {describe,it,expect} from "vitest";
import {
 gate05TelemetryDecisionV39,GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS
} from "../server/lib/disruption/gate05ProviderTelemetrySafety_v39";

const stop=readFileSync(
 "scripts/v39_gate05_science_exact_owned_actions_stop_retry6_v39.ts","utf8");
const historic=readFileSync(
 "scripts/v39_gate05_science_exact_owned_actions_stop_retry5_v39.ts","utf8");

describe("Future Gate05 exact-owned STOP has bounded missing control telemetry",()=>{
 it("distinguishes unknown credits from a fabricated zero when balance GET fails",()=>{
  for(const s of [
    "GATE05_STOP_TRANSIENT_FREE_TELEMETRY_GAP",
    "providerCreditCounter:null",
    "noCreditsAssumed:true",
    "noFlightRecordsSynthesized:true",
    "GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS",
    "GATE05_PROVIDER_POLL_INTERVAL_MS",
    "gate05TelemetryDecisionV39(",
    "EXTENDED_FREE_TELEMETRY_OUTAGE",
    "shortenedObservation:true",
    "strictSciencePassed:false",
    "accountSettlementPending:true"
  ])expect(stop).toContain(s);
  expect(stop).not.toContain("const graceMs=knownExactId?30000:");
 });
 it("preserves mandatory exact-ID STOP at deadline and 350 observed soft threshold",()=>{
  for(const s of [
    "if(observedAt>=policy.stopMs&&knownExactId)",
    "deleteSubscriptionVerifiedStrict(knownExactId",
    "if(now>=policy.stopMs||providerCharged>=350)",
    "knownExactId",
    "MAX", // intentionally absent? use actual positive required below
  ].filter(x=>x!=="MAX"))expect(stop).toContain(s);
  expect(stop).toContain("exactOwnedDeleteVerified:true");
  expect(stop).toContain("finalAlertDebits:null");
  expect(stop).toContain("noProviderCreates:true");
  expect(stop).not.toContain("createGate4SingleWithRawReceiptV39(");
 });
 it("the verified early STOP is a safety-success, not a scientific 60-minute PASS",()=>{
  expect(stop).toContain("EXACT_OWNED_DELETE_VERIFIED_EARLY_SCIENCE_CENSORED");
  expect(stop).toContain("EXACT_OWNED_DELETE_VERIFIED_BILLING_SETTLEMENT_PENDING");
  expect(stop).toContain("EXACT_OWNED_DELETE_VERIFIED_BILLING_UNKNOWN");
  expect(stop).toContain("providerHardCap:false");
  const baseline=Date.parse("2026-10-28T10:15:00Z");
  const fail=baseline+2*60000;
  expect(gate05TelemetryDecisionV39({
    nowMs:fail+GATE05_ACTIVE_BALANCE_TELEMETRY_GRACE_MS+1,
    firstFaultAtMs:fail,knownExactOwnedProviderId:true,
    ownerMayBeCreating:false
  })).toBe("EXACT_OWNED_DELETE_REQUIRED_ACCOUNTING_UNKNOWN");
 });
 it("does not edit the immutable original retry5 safety run source",()=>{
  expect(historic).toContain(
    'v39_gate05_science_exact_owned_actions_stop_retry5_v39.ts');
  expect(historic).not.toContain("gate05TelemetryDecisionV39(");
  expect(stop).toContain(
    'v39_gate05_science_exact_owned_actions_stop_retry6_v39.ts');
  const p=spawnSync(process.execPath,[
    "--import","tsx","scripts/v39_gate05_science_exact_owned_actions_stop_retry6_v39.ts"
  ],{encoding:"utf8",timeout:20000,
    env:{...process.env,GITHUB_ACTIONS:"",GITHUB_SHA:"",
      AERODATABOX_API_KEY:"",GATE05_SCIENCE_SAFETY_DATABASE_URL:""}});
  expect(p.error).toBeUndefined();
  expect(p.status).toBe(2);
 });
});
