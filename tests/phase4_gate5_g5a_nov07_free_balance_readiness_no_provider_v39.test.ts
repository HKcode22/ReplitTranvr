import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 assessG5ANov07ProviderQuotaV39,
 G5A_NOV07_INTERNAL_PROJECT_CAP_V39
} from "../scripts/v39_phase4_gate5_g5a_nov07_free_balance_readiness_no_provider";
const read=(p:string)=>readFileSync(p,"utf8");

describe("G5A Nov7 protected free provider balance readiness; NO FIDS request",()=>{
 const now=Date.parse("2026-11-05T03:30:00Z");
 it("requires exact fresh quota and adequate request allowances",()=>{
  expect(G5A_NOV07_INTERNAL_PROJECT_CAP_V39).toBe(24);
  expect(assessG5ANov07ProviderQuotaV39({
   apiUnitsRemaining:24,requestsRemaining:12,
   observedAtUtc:new Date(now-1000).toISOString()
  },now)).toEqual({
   quotaMetadataFresh:true,
   twentyFourUnitInternalBudgetCanFitProviderQuota:true,
   sourceAndPostRequestAllowanceAdequate:true
  });
  const insufficient=assessG5ANov07ProviderQuotaV39({
   apiUnitsRemaining:23,requestsRemaining:11,observedAtUtc:new Date(now).toISOString()
  },now);
  expect(insufficient.twentyFourUnitInternalBudgetCanFitProviderQuota).toBe(false);
  expect(insufficient.sourceAndPostRequestAllowanceAdequate).toBe(false);
 });
 it("rejects stale, missing or negative quota instead of assuming zero/billing",()=>{
  for(const age of [30001,-30001]){
   expect(()=>assessG5ANov07ProviderQuotaV39({
    apiUnitsRemaining:240,requestsRemaining:50,
    observedAtUtc:new Date(now-age).toISOString()
   },now)).toThrow("G5A_NOV07_FREE_BALANCE_QUOTA_STALE_HOLD");
  }
  expect(()=>assessG5ANov07ProviderQuotaV39({
   apiUnitsRemaining:-1,requestsRemaining:12,observedAtUtc:new Date(now).toISOString()
  },now)).toThrow("G5A_NOV07_FREE_BALANCE_QUOTA_METADATA_INVALID_HOLD");
 });
 it("has manual-only authenticated real provider read with zero DB and paid source access",()=>{
  const w=read(".github/workflows/phase4-gate5-g5a-nov07-free-balance-readiness-no-provider.yml");
  const s=read("scripts/v39_phase4_gate5_g5a_nov07_free_balance_readiness_no_provider.ts");
  expect(w).toContain("  workflow_dispatch:");
  expect(w).not.toContain("  schedule:");
  expect(w).toContain("environment: phase2g-paid");
  expect(w).toContain("AERODATABOX_API_KEY: \${{ secrets.AERODATABOX_API_KEY }}");
  expect(w).toContain("  quota-readonly:");
  expect(w).toContain("github.event_name == 'workflow_dispatch'");
  expect(w).toContain("PROVIDER_CALLS=0 DB_WRITES=0 PAID_RELEASE=NO");
  expect(s).toContain("getBalanceEvidenceStrict()");
  expect(s).not.toContain("fetchFidsAirport(");
  expect(s).not.toContain("reserveG5APostSlotDbV39(");
  expect(s).not.toContain("persistFidsObservation(");
  expect(s).toContain('e.GITHUB_JOB!=="quota-readonly"');
  expect(s).toContain("futureQuotaOrProviderRequestGuaranteed:false");
 });
});
