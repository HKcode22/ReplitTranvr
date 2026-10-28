import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const audit=readFileSync(
  "scripts/v39_gate05_fresh_launch_readonly_20261028.mjs","utf8");
const health=readFileSync(
  "server/lib/disruption/workspaceRuntimeHealth_v39.ts","utf8");
describe("Gate05 one-shell source-pinned live readiness is free and fail-closed",()=>{
  it("only uses read-only SQL and public published identity/zero-provider DB proof",()=>{
    expect(audit).toContain('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    expect(audit).toContain("default_transaction_read_only=on");
    expect(audit).toContain("pg_is_in_recovery()");
    expect(audit).toContain("gate05_science_delivery_custody_v39");
    expect(audit).toContain("relpersistence");
    expect(audit).toContain('"/__v39/workspace-runtime"');
    expect(audit).toContain('"/__v39/phase2g/runtime-db-binding"');
    expect(audit).toContain("database_mutation===false");
    expect(audit).not.toMatch(/\b(?:INSERT\s+INTO|UPDATE\s+clean\.|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/i);
    expect(audit).not.toContain("AERODATABOX_API_KEY");
    expect(audit).not.toContain("createGate4SingleWithRawReceiptV39");
    expect(audit).not.toContain("deleteSubscriptionVerifiedStrict");
    expect(audit).not.toContain("fetchFidsAirport");
    expect(audit).not.toContain("refillBalance(");
  });
  it("fails closed rather than reusing a spent 500-credit permit",()=>{
    for(const part of [
      "GATE05_EXPECTED_SOURCE_SHA",
      "PUBLISHED_GATE05_DURABLE_CUSTODY_DISABLED_OR_OLD",
      "PUBLISHED_SOURCE_DOES_NOT_MATCH_REVIEWED_MAIN",
      "PUBLISHED_DB_BINDING_NOT_INDEPENDENTLY_PROVEN",
      "STAGED_V0075_JOURNAL_NOT_INSTALLED",
      "UNSETTLED_NEW_SCIENCE_OWNER_ALREADY_EXISTS",
      "HISTORICAL_PAID_SCOPE_NOT_CONFIRMED_STOPPED",
      "NEW_ONE_USE_OWNER_AND_INDEPENDENT_STOP_NOT_YET_VERIFIED",
      "FIDS_PRE_POST_SAME_COHORT_AND_LABEL_SOURCE_NOT_PROVEN",
      "noAlertCreateDeleteOrRefill:true",
      "canStartPaidNow:false"
    ])expect(audit).toContain(part);
    expect(audit).not.toContain("gh workflow run");
    expect(audit).not.toContain("gh secret set");
  });
  it("published feature flag means opt-in only, NEVER migration/2xx proof",()=>{
    expect(health).toContain("gate05_durable_custody_ready:");
    expect(health).toContain('process.env.V39_GATE05_DURABLE_CUSTODY_REQUIRED==="1"');
    expect(health).toContain("not an");
    expect(health).toContain("separate READ-ONLY catalog");
  });
});
