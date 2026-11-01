import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 assessP4LegacyUltraAccountRecallV39,
 P4_GATE0_HISTORICAL_PATH_V39,
 P4_P2_RETENTION_HISTORICAL_PATH_V39
} from "../server/lib/disruption/phase4Gate5LegacyUltraAccountRecall_v39";
const first=()=>JSON.parse(readFileSync(P4_GATE0_HISTORICAL_PATH_V39,"utf8"));
const second=()=>JSON.parse(readFileSync(P4_P2_RETENTION_HISTORICAL_PATH_V39,"utf8"));
const current=()=>({
 observedAtUtc:"2026-10-31T19:00:00.000Z",
 apiUnitsLimit:60000,apiUnitsRemaining:56300,
 apiUnitsResetAtUtc:"2026-11-04T02:21:21.000Z",
 requestsLimit:240000,requestsRemaining:232000,
 alertCreditsRemaining:2300
});
describe("Phase4 Gate5: no repeated Ultra-plan questions; exact original evidence",()=>{
 it("recalls repo verified account baseline and owner-attested retention with no new call",()=>{
  const r=assessP4LegacyUltraAccountRecallV39(first(),second());
  expect(r.originalAccountEvidenceRecorded).toBe(true);
  expect(r.historicalAccount.plan).toContain("Team Ultra");
  expect(r.historicalAccount.observedEntitlementUnits).toBe(60000);
  expect(r.historicalAccount.independentProjectCeilingUnits).toBe(50000);
  expect(r.historicalAccount.observedAlertCredits).toBe(2900);
  expect(r.originalRetention.ownerAttestedRawMaxHours).toBe(168);
  expect(r.originalRetention.ownerAttestedLiveFidsMaxHours).toBe(24);
  expect(r.originalRetention.pitrRecoveryHours).toBe(168);
  expect(r.currentFreeProviderQuota).toBeNull();
  expect(r.newProspectivePaidGate5Authorized).toBe(false);
  expect(r.paidProviderCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("accepts live free quota only as current reading, not a new plan/rights PASS",()=>{
  const r=assessP4LegacyUltraAccountRecallV39(first(),second(),current());
  expect(r.currentFreeProviderQuota?.apiUnitsRemaining).toBe(56300);
  expect(r.currentQuotaDiffersFromSeptemberHistorical).toBe(false);
  expect(r.currentQuotaNotProofOfPlanOrCachingRights).toBe(true);
  expect(r.originalRetention.planSpecificRightIndependentlyReverifiedToday).toBe(false);
  expect(r.independentlyActualOnlyWheelsOffCertified).toBe(false);
  expect(r.phase5FreezeAuthorized).toBe(false);
  expect(r.phase6Authorized).toBe(false);
 });
 it("new or re-subscribed 50k quota prompts review, never silently imports old 60k",()=>{
  const c={...current(),apiUnitsLimit:50000,apiUnitsRemaining:45000};
  const r=assessP4LegacyUltraAccountRecallV39(first(),second(),c);
  expect(r.currentQuotaDiffersFromSeptemberHistorical).toBe(true);
  expect(r.historicalAccount.observedEntitlementUnits).toBe(60000);
  expect(r.newProspectivePaidGate5Authorized).toBe(false);
 });
 it("refuses forged historical plan baseline and misrecorded backup evidence",()=>{
  const f=first();f.cycle_entitlement_units=50000;
  expect(()=>assessP4LegacyUltraAccountRecallV39(f,second()))
   .toThrow("P4_ACCOUNT_RECALL_ORIGINAL_EVIDENCE_DRIFT_HOLD");
  const g=second();g.surfaces.backup.recoveryWindowHours=0;
  expect(()=>assessP4LegacyUltraAccountRecallV39(first(),g))
   .toThrow("P4_ACCOUNT_RECALL_ORIGINAL_EVIDENCE_DRIFT_HOLD");
 });
 it("rejects bad current balances, reset earlier than reading and invalid UTC",()=>{
  const c={...current(),apiUnitsRemaining:63000};
  expect(()=>assessP4LegacyUltraAccountRecallV39(first(),second(),c))
   .toThrow("P4_ACCOUNT_RECALL_CURRENT_QUOTA_INVALID");
  const d={...current(),apiUnitsResetAtUtc:"2026-10-30T02:21:21.000Z"};
  expect(()=>assessP4LegacyUltraAccountRecallV39(first(),second(),d))
   .toThrow("P4_ACCOUNT_RECALL_CURRENT_QUOTA_INVALID");
  const e={...current(),observedAtUtc:"yesterday"};
  expect(()=>assessP4LegacyUltraAccountRecallV39(first(),second(),e))
   .toThrow("P4_ACCOUNT_RECALL_INVALID");
 });
 it("owner script has one free balance read, no source GET/write or secret printing",()=>{
  const s=readFileSync("scripts/v39_phase4_account_quota_readonly_once.ts","utf8");
  expect(s).toContain("getBalanceEvidenceStrict()");
  expect(s).toContain("assessP4LegacyUltraAccountRecallV39");
  expect(s).not.toContain("getFids");
  expect(s).not.toContain("createSubscription(");
  expect(s).not.toContain("refillBalance(");
  expect(s).not.toContain("DATABASE_URL");
  expect(s).not.toContain("console.log(process.env");
 });
});
