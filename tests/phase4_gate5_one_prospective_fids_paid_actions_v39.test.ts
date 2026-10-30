import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {requireP4OneFidsSourceActionsV39,futureWsssPopulationWindowV39}
 from "../scripts/v39_phase4_one_prospective_fids_paid_actions";
const intent={
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"push",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
 P4_ONE_FIDS_EXACT_INTENT:"PHASE4_ONE_WSSS_ORIGINAL_FIDS_2_API_UNITS_ZERO_RETRIES"
} as NodeJS.ProcessEnv;
describe("Phase4 one protected paid original FIDS source WSSS operator",()=>{
 it("only accepts first attempt of correct GitHub push with exact consent",()=>{
  expect(()=>requireP4OneFidsSourceActionsV39(intent,Date.parse("2026-10-30T12:00:00Z")))
   .not.toThrow();
  for(const bad of [
   {GITHUB_ACTIONS:"false"},{GITHUB_REPOSITORY:"other/repo"},
   {GITHUB_REF:"refs/heads/feature"},{GITHUB_EVENT_NAME:"workflow_dispatch"},
   {GITHUB_RUN_ATTEMPT:"2"},{GITHUB_SHA:"BAD"},
   {P4_ONE_FIDS_EXACT_INTENT:"NOT_APPROVED"}
  ])expect(()=>requireP4OneFidsSourceActionsV39({...intent,...bad},
      Date.parse("2026-10-30T12:00:00Z"))).toThrow("P4_FIDS_ONE_PAID_CONTEXT_OR_DEADLINE_HOLD");
  expect(()=>requireP4OneFidsSourceActionsV39(intent,Date.parse("2026-11-02T00:00:00Z")))
   .toThrow("P4_FIDS_ONE_PAID_CONTEXT_OR_DEADLINE_HOLD");
 });
 it("uses prospective one-hour UTC window and never reclassifies as verified T",()=>{
  for(const at of [
   Date.parse("2026-10-30T12:01:00.000Z"),
   Date.parse("2026-10-30T19:59:55.000Z"),
   Date.parse("2026-10-31T11:17:15.000Z")
  ]){
   const w=futureWsssPopulationWindowV39(at);
   expect(w.start.getTime()-at).toBeGreaterThanOrEqual(26*3600_000);
   expect(w.end.getTime()-w.start.getTime()).toBe(3600_000);
   expect(w.start.getUTCHours()).toBeGreaterThanOrEqual(0);
   expect(w.start.getUTCMinutes()).toBe(0);
  }
 });
 it("no general paid schedule/retry, all billed work bounded by one physical GET",()=>{
  const workflow=readFileSync(".github/workflows/phase4-gate5-one-prospective-wsss-fids-rawfirst.yml","utf8");
  const script=readFileSync("scripts/v39_phase4_one_prospective_fids_paid_actions.ts","utf8");
  expect(workflow).toContain("environment: phase2g-paid");
  expect(workflow).toContain("Merge pull request #275");
  // A bare '#' inside a YAML plain scalar starts a comment, even if
  // it appears between quotes *inside* an unquoted expression.
  expect(workflow).toContain('if: "${{ github.ref');
  expect(workflow).not.toContain("if: ${{ github.ref");
  expect(workflow).not.toContain("workflow_dispatch");
  expect(script).toContain("billableAttempts=1");
  expect(script).toContain("await checkWritableSchema(dbUrl)");
  expect(script.indexOf("await checkWritableSchema(dbUrl)"))
   .toBeLessThan(script.indexOf("billableAttempts=1"));
  expect(script).toContain("auditStoredDecodedFidsReadbackV39");
  expect(script).toContain("expectedApiUnits:2");
  expect(script).toContain("providerRetries:0");
  expect(script).toContain("strictGate5Passed:false");
  expect(script).toContain("phase6Authorized:false");
  expect(script).not.toContain("createSubscription");
  expect(script).not.toContain("deleteSubscription");
  expect(script).not.toContain("cloudflare");
 });
});
