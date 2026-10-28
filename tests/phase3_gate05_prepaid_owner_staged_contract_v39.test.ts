import {readFileSync,existsSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {loadMigrationFilesV39} from "../server/lib/disruption/schemaMigration_v39";
const name="V0074__gate05_science_prepaid_owner_v39.sql";
const raw=readFileSync("migrations/staged/"+name,"utf8");
const source=readFileSync("server/lib/disruption/prepaidProbeRuntime_v39.ts","utf8");
describe("Gate05 original scientific prepaid route: additive staged owner",()=>{
  it("keeps V0074 out of production boot until an exact approved deployment",async()=>{
    expect(existsSync("migrations/staged/"+name)).toBe(true);
    expect(existsSync("migrations/current/"+name)).toBe(false);
    const migrations=await loadMigrationFilesV39();
    expect(migrations.some(x=>x.kind==="VERSIONED"&&x.version===74)).toBe(false);
  });
  it("freezes the signed budget and exact sixty-minute pilot window",()=>{
    for(const s of [
      "alert_credit_ceiling = 500",
      "early_stop_credits = 350",
      "rest_api_units_ceiling = 12",
      "stop_at_utc = start_at_utc + INTERVAL '60 minutes'",
      "CREATE UNIQUE INDEX gate05_one_nonterminal_owner_v39",
      "GATE05_OWNER_FROZEN_SCOPE_OR_BUDGET",
      "GATE05_OWNER_TERMINAL_IMMUTABLE",
      "GATE05_EXACT_LOGGED_OWNER_REQUIRED",
      "GATE05_SESSION_BIND_MUST_EQUAL_EXACT_LOGGED_OWNER",
      "GATE05_PROVIDER_BINDING_IMMUTABLE"
    ])expect(raw).toContain(s);
  });
  it("preserves historical owner kinds and does not leak provider secrets into LOGGED metadata",()=>{
    for(const s of [
      "'phase2_safety_smoke'","'anchor_probe'","'phase3_credit_canary'",
      "'phase3_gate05_science'","'WSSS'",
      "REVOKE ALL ON TABLE clean.phase3_gate05_science_owner_v39 FROM PUBLIC"
    ])expect(raw).toContain(s);
    expect(raw).not.toMatch(/CREATE UNLOGGED TABLE clean\.phase3_gate05/i);
    expect(raw).not.toMatch(/CREATE SUBSCRIPTION|HTTP\s+POST|provider_api_key|webhook_secret|raw_payload|private_key/i);
  });
  it("generic Phase2 armer cannot accidentally mint a Gate05 session ID",()=>{
    expect(source).toContain('"phase3_gate05_science"');
    expect(source).toContain('"GATE05_GENERIC_PREPAID_ARM_FORBIDDEN"');
  });
});
