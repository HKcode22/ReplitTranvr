import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const read = (p: string) => readFileSync(p, "utf8");
const active = [
  "server/routes_v3.ts",
  "server/lib/disruption/rawIngress_v3.ts",
  "server/lib/disruption/flightInstanceCanonical_v3.ts",
  "server/lib/disruption/adbCollectionController_v3.ts",
  "server/lib/disruption/phase6SegmentActivation_v39.ts",
  "server/lib/disruption/phase6SafetyWatchdog_v39.ts",
  "server/lib/disruption/airborneMaterializer_v39.ts",
  "server/lib/disruption/probeExecution_v39.ts",
  "server/lib/disruption/historicalFeatureStore_v3.ts",
  "server/lib/disruption/fidsCensus_v3.ts",
  "server/lib/disruption/gates_v3.ts",
  "scripts/v39_phase6_start_owner_v39.ts",
  "scripts/v39_phase6_pause_v39.ts",
  "scripts/v39_probe_stage1_owner_v39.ts",
  "scripts/v39_probe_stage2_owner_v39.ts",
  "scripts/v39_gate5_owner_v39.ts",
  "scripts/anchor_probe.ts",
  "scripts/credit_canary.ts",
  "scripts/check_collection_health.ts",
  "scripts/export_flight_data.ts",
  "scripts/backfill_flight_data_pre_post.ts",
];

describe("V3.9 dedicated DB runtime separation", () => {
  it("uses a dedicated fail-closed V39_DATABASE_RUNTIME_URL owner", () => {
    const src = read("server/lib/disruption/db_v39.ts");
    expect(src).toContain("V39_DATABASE_RUNTIME_URL");
    expect(src).toContain("V39_DATABASE_RUNTIME_URL_REQUIRED");
    expect(src).not.toContain("process.env.DATABASE_URL");
    expect(src).not.toContain("DATABASE_RUNTIME_URL ||");
  });
  it("keeps the ordinary Travnr shared pool unchanged", () => {
    const src = read("server/db.ts");
    expect(src).toContain("process.env.DATABASE_RUNTIME_URL || process.env.DATABASE_URL");
  });
  it("routes active V3.9 raw-pool owners away from the shared app pool", () => {
    for (const file of active) {
      const src = read(file);
      expect(src, file).toContain("db_v39");
      expect(src, file).not.toMatch(/import\s*\{\s*pool\s*\}\s*from\s*["'][^"']*server\/db["']/);
      expect(src, file).not.toMatch(/import\s*\{\s*pool\s*\}\s*from\s*["']\.\.\/\.\.\/db["']/);
    }
  });
  it("keeps boot migrations on owner DB and provisions the V3.9-specific secret", () => {
    expect(read("server/db.ts")).toContain("migrationPool");
    const provision = read("scripts/provision_runtime_role_v39.ts");
    expect(provision).toContain("V39_DATABASE_RUNTIME_URL");
    expect(provision).toContain("travnr_v39_runtime");
    expect(provision).not.toContain('upsertEnvVar(env, "DATABASE_RUNTIME_URL"');
    expect(provision).not.toContain("DATABASE neondb");
  });
});
