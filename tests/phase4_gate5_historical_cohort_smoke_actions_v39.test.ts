import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 P4_G5_HISTORICAL_MANIFEST_PATH_V39,
 P4_G5_HISTORICAL_MANIFEST_SHA256_V39,
 P4_G5_HISTORICAL_WORKFLOW_REF_V39,
 P4_G5_HISTORICAL_WORKFLOW_NAME_V39,
 P4_G5_HISTORICAL_INTENT_V39,
 requireP4HistoricalSmokeContextV39
} from "../scripts/v39_phase4_gate5_historical_cohort_smoke_readonly_actions";

const bytes=()=>readFileSync(P4_G5_HISTORICAL_MANIFEST_PATH_V39,"utf8");
const sha="a".repeat(40);
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_EVENT_NAME:"push",GITHUB_REF:"refs/heads/main",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:sha,
 GITHUB_JOB:"historical-cohort-smoke",
 GITHUB_WORKFLOW:P4_G5_HISTORICAL_WORKFLOW_NAME_V39,
 GITHUB_WORKFLOW_REF:P4_G5_HISTORICAL_WORKFLOW_REF_V39,
 P4_G5_HISTORICAL_SMOKE_INTENT:P4_G5_HISTORICAL_INTENT_V39
});
describe("Historical Oct31 postflight SQL schema smoke — no provider",()=>{
 it("matches exact immutable reviewed historical manifest digest and no-new-cohort scope",()=>{
  const m=requireP4HistoricalSmokeContextV39(env(),sha,bytes());
  expect(m.airportIcao).toBe("WSSS");
  expect(m.serviceWindowStartUtc).toBe("2026-10-31T17:00:00.000Z");
  expect(m.serviceWindowEndUtc).toBe("2026-10-31T18:00:00.000Z");
  expect(m.reviewedFrozenManifestSha256)
   .toBe(P4_G5_HISTORICAL_MANIFEST_SHA256_V39);
  expect(Date.parse(m.readAsOfUtc)).toBeGreaterThan(
    Date.parse(m.serviceWindowEndUtc));
  const content=JSON.parse(bytes());
  expect(content.sourceOriginalT6h).toBe("UNOBSERVED");
  expect(content.phase5FreezeAuthorized).toBe(false);
  expect(content.phase6Authorized).toBe(false);
 });
 it("refuses any tampering even with syntactically valid JSON",()=>{
  const tampered=bytes().replace("UNOBSERVED", "OBSERVED");
  expect(()=>requireP4HistoricalSmokeContextV39(env(),sha,tampered))
    .toThrow("P4_HIST_SMOKE_FROZEN_MANIFEST_DIGEST_MISMATCH");
  expect(()=>requireP4HistoricalSmokeContextV39(env(),sha,bytes()+"\n"))
    .toThrow("P4_HIST_SMOKE_FROZEN_MANIFEST_DIGEST_MISMATCH");
 });
 it("refuses scheduled, manual or second-attempt GitHub invocations",()=>{
  for(const [key,value] of [
    ["GITHUB_EVENT_NAME","schedule"],["GITHUB_REF","refs/heads/dev"],
    ["GITHUB_RUN_ATTEMPT","2"],["GITHUB_JOB","other-job"],
    ["GITHUB_WORKFLOW_REF","wrong-path"],
    ["P4_G5_HISTORICAL_SMOKE_INTENT","OTHER_SCOPE"],
    ["GITHUB_REPOSITORY","outside/repository"]
  ]){
    expect(()=>requireP4HistoricalSmokeContextV39({...env(),[key]:value},sha,bytes()))
      .toThrow("P4_HIST_SMOKE_ACTIONS_PROVENANCE_OR_PROVIDER_HOLD");
  }
 });
 it("refuses unexpected paid credentials and nonmatching exact checkout SHA",()=>{
  for(const key of ["AERODATABOX_API_KEY","RAPIDAPI_KEY",
    "V39_DATABASE_RUNTIME_URL","DATABASE_URL"]){
    expect(()=>requireP4HistoricalSmokeContextV39({...env(),[key]:"present"},sha,bytes()))
      .toThrow("P4_HIST_SMOKE_ACTIONS_PROVENANCE_OR_PROVIDER_HOLD");
  }
  expect(()=>requireP4HistoricalSmokeContextV39(env(),"b".repeat(40),bytes()))
    .toThrow("P4_HIST_SMOKE_ACTIONS_PROVENANCE_OR_PROVIDER_HOLD");
 });
 it("protected workflow is push/main only; DB secret limited to SQL step",()=>{
  const s=readFileSync(
   ".github/workflows/phase4-gate5-historical-cohort-schema-smoke-readonly.yml","utf8");
  expect(s).toContain("branches: [main]");
  expect(s).toContain("environment: phase2g-paid");
  expect(s).toContain("GATE05_AUTOMATION_DATABASE_URL: ${{ secrets.GATE05_AUTOMATION_DATABASE_URL }}");
  expect(s).toContain("persist-credentials: false");
  expect(s).not.toContain("workflow_dispatch:");
  expect(s).not.toContain("schedule:");
  expect(s).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(s).not.toContain("secrets.V39_DATABASE_RUNTIME_URL");
  expect(s).not.toContain("node --import tsx scripts/v39_gate5_source_inventory_readonly_actions.ts");
 });
 it("script opens repeatable-read READ ONLY transaction and rollback, no provider or SQL writes",()=>{
  const s=readFileSync(
   "scripts/v39_phase4_gate5_historical_cohort_smoke_readonly_actions.ts","utf8");
  expect(s).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(s).toContain('client.query("ROLLBACK")');
  expect(s).toContain("default_transaction_read_only=on");
  expect(s).toContain("auditP4FreshCohortV39(client,scope)");
  expect(s).not.toContain("fetch(");
  expect(s).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE FROM\b/i);
  expect(s).toContain("T24_UNOBSERVED;T6_UNOBSERVED");
 });
});
