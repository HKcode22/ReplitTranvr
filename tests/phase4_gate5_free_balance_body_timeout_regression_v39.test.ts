import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

describe("Gate5 strict FREE balance body deadline (postpilot hardening)",()=>{
 it("uses one persistent signal for GET and body without aborting after headers",()=>{
  const code=readFileSync("server/lib/disruption/aerodataboxLimiter_v3.ts","utf8");
  const start=code.indexOf("export async function getBalanceEvidenceStrict()");
  const end=code.indexOf("export async function getBalanceEvidenceStrictWithRetry",start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const s=code.slice(start,end);
  expect(s).toContain("AbortSignal.timeout(ADB_HTTP_ATTEMPT_TIMEOUT_MS)");
  expect(s).toContain("headers: headers(), signal: strictBalanceSignal");
  expect(s).toContain("await readJsonOrNull(resp)");
  expect(s).toContain("if (strictBalanceSignal.aborted)");
  expect(s).toContain("ADB_FREE_BALANCE_BODY_DEADLINE_EXCEEDED");
  expect(s).toContain('throw new Error("BALANCE_UNAVAILABLE: transport failure")');
  expect(s).toContain("providerPaidFidsGets: 0");
  expect(s.indexOf("await readJsonOrNull(resp)")).toBeGreaterThan(s.indexOf("signal: strictBalanceSignal"));
  expect(s).not.toContain("clearTimeout");
  expect(s).not.toContain("setTimeout(");
  expect(s).not.toContain("INSERT INTO");
  expect(s).not.toContain("POST /subscriptions");
 });
 it("does not alter the frozen current Nov2 T6/T90 paid source script or its workflow",()=>{
  const paid=readFileSync("scripts/v39_phase4_gate5_wsss_20261102_three_horizon_real_aggregate_paid_actions.ts","utf8");
  const workflow=readFileSync(".github/workflows/phase4-gate5-wsss-20261102-real-paid-aggregate-three-horizons.yml","utf8");
  expect(paid).toContain("getBalanceEvidenceStrict()");
  expect(paid).toContain("sourceMissingNotZeroPopulation:true");
  expect(paid).toContain("started>=3");
  expect(workflow).toContain('cron: "17 11 2 11 *"');
 });
});
