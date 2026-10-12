import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const s=readFileSync("server/lib/disruption/probeExecution_v39.ts","utf8");
describe("P25 exact historical quarantined MISMATCH is not an arbitrary budget mismatch bypass",()=>{
 it("requires the only mismatched budget to match one frozen failed 500-credit P2G24 safe-mode probe",()=>{
  expect(s).toContain('historicalMismatchId !== "P2G-S1-20261009-23"');
  expect(s).toContain('config.probeBudgetDayId !== "P2G-S1-20261012-03"');
  expect(s).toContain('"fba71c745e37426255d7117b05f76b5f9e035159650c3d23c88c79fa7b0f8871"');
  expect(s).toContain("p.probe_id=18 AND p.icao='YSSY'");
  expect(s).toContain("p.status='failed' AND p.duration_censored=true");
  expect(s).toContain("p.reconciliation_status='UNRESOLVED'");
  expect(s).toContain("p.provider_content_safe_mode=true");
  expect(s).toContain("p.reserved_credits=500");
  expect(s).toContain("p.credits_spent IS NULL AND p.internal_send_credits IS NULL");
  expect(s).toContain("b.state='MISMATCH'");
 });
 it("checks 30 retained originals and exact incident30 current-risk containment, no other open incident",()=>{
  expect(s).toContain("i.detail->>'adminScope'='CURRENT_HAZARD_CONTAINED_ONLY'");
  expect(s).toContain("i.detail->>'runtimeCleanupVerified'='false'");
  expect(s).toContain("Number(r?.historical_source_refs)===30");
  expect(s).toContain("Number(r?.unresolved_incident_count)===0");
  expect(s).toContain('ORDER BY probe_budget_day_id LIMIT 2');
  expect(s).toContain("mismatch.rows.length===1");
  expect(s).toContain("if(!exactQuarantine)");
 });
 it("keeps old mismatch guard for every other state and does not change historical budget data",()=>{
  expect(s).toContain("REFUSED_PROBE_BUDGET_MISMATCH");
  expect(s).toContain("REFUSED_PROBE_BUDGET_OPEN");
  expect(s).not.toContain("UPDATE clean.adb_probe_budget_day SET state='CLOSED' WHERE probe_budget_day_id='P2G-S1-20261009-23'");
  expect(s).toContain("async function p25ExactHistoricalQuarantinePermitsNewDayV39");
 });
});
