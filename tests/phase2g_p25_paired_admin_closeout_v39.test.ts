import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {assessP25PairedAdministrativeCloseoutV39 as check,
 p25ExactPgTimestampMsV39 as pgMs,
 type P25AdministrativeCloseoutWitnessV39} from
 "../server/lib/disruption/phase2gP25PairedAdministrativeCloseout_v39";
const expiry=Date.parse("2026-10-20T05:02:12.501Z");
const observed=Date.parse("2026-11-08T12:41:19.505Z");
const witness:P25AdministrativeCloseoutWitnessV39={
 observedAtMs:observed,latestOriginalExpiryMs:expiry,
 unresolvedIncidentIds:[31,32],
 incident31:{
  id:31,occurredAtMs:Date.parse("2026-10-13T05:02:49.928Z"),
  cause:"reconciliation",resolved:false,
  kind:"stage1_supervisor_recovery",reason:"provider_subscription_isolation_lost",
  providerDeleteVerified:true,runtimeCleanupVerified:false,probeId:19,
  budgetDayId:"P2G-S1-20261013-03"
 },
 incident32:{
  id:32,occurredAtMs:Date.parse("2026-10-13T05:04:21.617Z"),
  cause:"reconciliation",resolved:false,kind:"prepaid_probe_failed",
  probeId:19,budgetDayId:null
 },
 probeId:19,icao:"YSSY",probeStatus:"failed",
 probeReconciliation:"DELIVERY_GAP",
 probeStopReason:"external_internal_delivery_gap",
 probeDurationCensored:false,probeSessionExact:true,
 historicalExternalCredits:231,historicalReceivedCredits:229,
 historicalCreditGap:2,
 budgetId:"P2G-S1-20261013-03",
 budgetState:"OPEN",budgetCapCredits:500,budgetClosedAtIsNull:true,
 globallyOpenBudgetDays:1,probesInBudget:1,
 activeOrSettlingProbes:0,
 currentActiveProviderSubscriptions:0,currentActiveBillableSubscriptions:0,
 globalRuntimeSessions:0,
 historicalRuntimeDeliveries:0,historicalRuntimeItems:0,
 historicalCleanupJournalRows:0,
 originalReferences:58,originalShaRefs:58,originalMetadataBytes:308832,
 originalTombstonedRefs:58,originalLiveRefs:0,
 originalInvalidContractRefs:0
};
describe("P25 exact dual-incident administrative closeout — no science promotion",()=>{
 it("accepts only exact tombstoned, quiescent, failed historical P25 admin scope",()=>{
  const d=check(witness);
  expect(d).toMatchObject({
    eligible:true,blockers:[],closeOnlyBudget:"P2G-S1-20261013-03",
    closeOnlyIncidents:[31,32],
    preserveProbeId:19,preserveProbeStatus:"failed",
    preserveReconciliation:"DELIVERY_GAP",
    historicalMissingCredits:2,
    paidPhase6Authorized:false,signedWebhookTestAuthorized:false
  });
 });
 it("refuses the prior count-one incident30 synthetic-only exception and any foreign incidents",()=>{
  for(const ids of [[30],[31],[31,32,33],[32,31],[]]){
    expect(check({...witness,unresolvedIncidentIds:ids}).blockers)
      .toContain("UNEXPECTED_OPEN_INCIDENT_SET");
  }
 });
 it("refuses wrong incident32 linkage, type and exact timestamp",()=>{
  const b=witness.incident32!;
  for(const changed of [
   {...b,probeId:18},{...b,kind:"some_other_failure"},
   {...b,budgetDayId:"FOREIGN"},{...b,occurredAtMs:b.occurredAtMs+1},
   {...b,resolved:true}
  ]){
   expect(check({...witness,incident32:changed}).blockers)
    .toContain("INCIDENT32_HISTORIC_FINGERPRINT_MISMATCH");
  }
 });
 it("refuses a false historical #31 provider deletion or forged cleanup proof",()=>{
  const a=witness.incident31!;
  for(const changed of [
   {...a,providerDeleteVerified:false},
   {...a,runtimeCleanupVerified:true},
   {...a,budgetDayId:"FOREIGN"},
   {...a,occurredAtMs:a.occurredAtMs+1}
  ]){
   expect(check({...witness,incident31:changed}).blockers)
    .toContain("INCIDENT31_HISTORIC_FINGERPRINT_MISMATCH");
  }
 });
 it("refuses source expiry not yet reached or 57-of-58 tombstones",()=>{
  expect(check({...witness,observedAtMs:expiry-1}).blockers)
    .toContain("ORIGINAL_EXPIRY_NOT_CONFIRMED");
  expect(check({...witness,originalTombstonedRefs:57,originalLiveRefs:1}).blockers)
    .toContain("EXACT_58_ORIGINAL_TOMBSTONE_CONTRACT_NOT_VERIFIED");
  expect(check({...witness,originalInvalidContractRefs:1}).eligible).toBe(false);
 });
 it("refuses any provider state ambiguity, active subscription or transient state",()=>{
  for(const patch of [
   {currentActiveProviderSubscriptions:1},
   {currentActiveBillableSubscriptions:1},
   {activeOrSettlingProbes:1},
   {globalRuntimeSessions:1},
   {historicalRuntimeDeliveries:1},
   {historicalCleanupJournalRows:1}
  ]){
   expect(check({...witness,...patch}).blockers)
    .toContain("PROVIDER_OR_RUNTIME_NOT_QUIESCENT");
  }
 });
 it("refuses unrelated budget, double-open budget or changed original gap",()=>{
  for(const patch of [
   {globallyOpenBudgetDays:2},{budgetCapCredits:1800},
   {budgetState:"CLOSED"},{probesInBudget:2}
  ]){
   expect(check({...witness,...patch}).blockers)
    .toContain("EXACT_SINGLE_OPEN_P25_BUDGET_NOT_VERIFIED");
  }
  expect(check({...witness,historicalCreditGap:0}).blockers)
   .toContain("ORIGINAL_231_229_CREDIT_RECONCILIATION_CHANGED");
  expect(check({...witness,probeStatus:"completed"}).blockers)
   .toContain("PROBE19_SCIENTIFIC_HISTORIC_FINGERPRINT_MISMATCH");
 });
});
describe("production transaction remains separate from read-only default",()=>{
 const script=readFileSync("scripts/v39_p25_incidents31_32_budget_exact_admin_disposition_v39.ts","utf8");
 it("requires two separate apply approvals and strict provider LIST",()=>{
  expect(script).toContain('args[0]==="--apply"');
  expect(script).toContain("PHASE2G_P25_ADMIN_CLOSEOUT_APPROVAL");
  expect(script).toContain("CLOSE_EXACT_31_32_AND_P25_BUDGET_PRESERVE_DELIVERY_GAP");
  expect(script).toContain("listSubscriptionsStrict()");
  expect(script).toContain('BEGIN TRANSACTION READ ONLY');
  expect(script).toContain('c.query("ROLLBACK")');
 });
 it("bounds updates to exactly IDs 31/32 and P25 budget in one transaction",()=>{
  expect(script).toContain("pg_advisory_xact_lock");
  expect(script).toContain("EXACT_TWO_INCIDENT_RESOLUTION_CONFLICT");
  expect(script).toContain("EXACT_P25_BUDGET_CLOSE_CONFLICT");
  expect(script).toContain("P25_SCIENTIFIC_EVIDENCE_MUST_REMAIN_UNCHANGED");
  expect(script).toContain('await c.query("COMMIT")');
  expect(script).toContain("AND resolved=false AND cause='reconciliation'");
  expect(script).toContain("WHERE probe_budget_day_id=$1 AND state='OPEN'");
  expect(script).toContain("signedWebhookTestAuthorized:false");
 });
});

describe("node-postgres timestamp precision must preserve 31/32 fingerprints",()=>{
 it("reproduces legacy Date->String millisecond loss as the exact incident HOLD cause",()=>{
  const d31=new Date("2026-10-13T05:02:49.928Z");
  const d32=new Date("2026-10-13T05:04:21.617Z");
  expect(d31.getTime()-new Date(String(d31)).getTime()).toBe(928);
  expect(d32.getTime()-new Date(String(d32)).getTime()).toBe(617);
  expect(check({...witness,incident31:{...witness.incident31!,
      occurredAtMs:new Date(String(d31)).getTime()},
    incident32:{...witness.incident32!,
      occurredAtMs:new Date(String(d32)).getTime()}}).blockers)
    .toEqual(["INCIDENT31_HISTORIC_FINGERPRINT_MISMATCH",
              "INCIDENT32_HISTORIC_FINGERPRINT_MISMATCH"]);
 });
 it("converts real PostgreSQL Date values with millisecond precision and keeps exact guard",()=>{
  const i31=pgMs(new Date("2026-10-13T05:02:49.928Z"));
  const i32=pgMs(new Date("2026-10-13T05:04:21.617Z"));
  expect(i31).toBe(Date.parse("2026-10-13T05:02:49.928Z"));
  expect(i32).toBe(Date.parse("2026-10-13T05:04:21.617Z"));
  expect(check({...witness,incident31:{...witness.incident31!,
      occurredAtMs:i31},
    incident32:{...witness.incident32!,
      occurredAtMs:i32}}).eligible).toBe(true);
 });
 it("accepts only canonical UTC fractional ISO or Date and refuses ambiguous input",()=>{
  expect(pgMs("2026-10-13T05:02:49.928Z"))
    .toBe(Date.parse("2026-10-13T05:02:49.928Z"));
  for(const value of [
    null,undefined,0,Infinity,new Date(Number.NaN),
    "Tue Oct 13 2026 05:02:49 GMT+0000",
    "2026-10-13T05:02:49Z",
    "2026-10-13T05:02:49.928",
    "2026-10-13T05:02:49.928+00:00",
    "2026-13-99T05:02:49.928Z"
  ])expect(pgMs(value)).toBeNaN();
 });
 it("preserves strict rejection on one-millisecond incident tamper",()=>{
  expect(check({...witness,incident31:{...witness.incident31!,
    occurredAtMs:pgMs(new Date("2026-10-13T05:02:49.929Z"))}}).blockers)
    .toContain("INCIDENT31_HISTORIC_FINGERPRINT_MISMATCH");
 });
});
