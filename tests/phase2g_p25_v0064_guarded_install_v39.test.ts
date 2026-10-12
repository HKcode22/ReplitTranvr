import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const src=readFileSync("scripts/v39_phase2g_p25_v0064_guarded_install_v39.ts","utf8");
const ddl=readFileSync("migrations/current/V0064__phase2g_prepaid_source_pending_intent_v39.sql","utf8");
describe("P25 V0064 installer is guarded metadata-only, no paid action",()=>{
  it("defaults to read-only dry run and requires source head plus exact operator token",()=>{
    expect(src).toContain('const apply=args.includes("--apply")');
    expect(src).toContain('approvedFlag!=="I_APPROVE_ONLY_ADDITIVE_V0064_ON_IDLE_PRODUCTION"');
    expect(src).toContain('if(apply&&head!==expected)');
    expect(src).toContain('BEGIN TRANSACTION READ ONLY');
    expect(src).toContain('client.query("ROLLBACK")');
    expect(src).toContain("SOURCE_DIRTY_OR_UNREVIEWED");
    expect(src).toContain("git");
  });
  it("refuses migration with old/partial table, active probe/runtime, missing base or lock race",()=>{
    expect(src).toContain("P25_V0064_REQUIRED_BASE_SCHEMA_MISSING");
    expect(src).toContain("HOLD_EXISTING_OR_PARTIAL_V0064");
    expect(src).toContain("HOLD_ACTIVE_PROBE_OR_RUNTIME");
    expect(src).toContain("pg_try_advisory_xact_lock(943023,64)");
    expect(src).toContain("P25_V0064_RACE_EXISTING_SOURCE_TABLE");
    expect(src).toContain("P25_V0064_POST_DDL_PROOF_FAILED_ROLLBACK");
    expect(src).toContain("SET LOCAL lock_timeout='3000ms'");
    expect(src).toContain("SET LOCAL statement_timeout='10000ms'");
  });
  it("actual migration adds only LOGGED metadata and immutable source retention guard",()=>{
    expect(ddl).toContain("CREATE TABLE clean.phase2g_prepaid_source_intent_v39");
    expect(ddl).toContain("CREATE TRIGGER trg_p2g_prepaid_source_intent_v39");
    expect(ddl).toContain("IF TG_OP='DELETE' THEN");
    expect(ddl).toContain("source_retention_until = first_node_received_utc");
    expect(ddl).toContain("interval '168 hours'");
    expect(ddl).not.toMatch(/\bDROP\s+TABLE\b|\bTRUNCATE\s+TABLE\b/i);
    expect(src).toContain("paid_yssy_go_authorized:false");
    expect(src).toContain("independent_provider_zero_billable_verified_by_this_script:false");
    expect(src).not.toMatch(/(?:getBalance|listSubscriptionsStrict|deleteSubscriptionVerifiedStrict)\s*\(/);
  });
});
