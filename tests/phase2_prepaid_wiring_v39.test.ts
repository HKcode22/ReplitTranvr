import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Phase-2 isolated prepaid production wiring", () => {
  it("routes the safety smoke away from the legacy Gate-3 canary", () => {
    const wrapper = read("scripts/v39_smoke_safety_v39.ts");
    expect(wrapper).toContain("v39_smoke_safety_owner_v39.ts");
    expect(wrapper).not.toContain("credit_canary.ts");
    const owner = read("scripts/v39_smoke_safety_owner_v39.ts");
    expect(owner).toContain("runPrepaidLiveWindowV39");
    expect(owner).toContain("maxObservedUnsettledCreditGap");
    expect(owner).toContain("rawBefore2xxPathVerified");
  });

  it("routes Stage 1 and Stage 2 only through the prepaid executor", () => {
    for (const path of ["scripts/v39_probe_stage1_owner_v39.ts", "scripts/v39_probe_stage2_owner_v39.ts"]) {
      const text = read(path);
      expect(text).toContain("executePrepaidProbe");
      expect(text).not.toContain("executeProbe,");
    }
    const executor = read("server/lib/disruption/probeExecutionPrepaid_v39.ts");
    expect(executor).toContain("runPrepaidLiveWindowV39");
    expect(executor).not.toContain("clean.raw_delivery");
    expect(executor).not.toContain("clean.flight_data_pre_post");
  });

  it("persists raw provider bytes before normalized prepaid runtime rows", () => {
    const runtime = read("server/lib/disruption/prepaidProbeRuntime_v39.ts");
    const raw = runtime.indexOf("persistProviderBlobBeforeAckV39");
    const normalized = runtime.indexOf("INSERT INTO clean.prepaid_probe_delivery_runtime");
    expect(raw).toBeGreaterThanOrEqual(0);
    expect(normalized).toBeGreaterThan(raw);
    const routes = read("server/routes_v3.ts");
    expect(routes).toContain('/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId');
  });

  it("uses UNLOGGED prepaid tables and safe logged-provider-field constraints", () => {
    const runtimeMigration = read("migrations/0055_prepaid_probe_unlogged_runtime.sql");
    expect((runtimeMigration.match(/CREATE UNLOGGED TABLE/g) ?? [])).toHaveLength(3);
    const safeMigration = read("migrations/0056_prepaid_probe_safe_evidence.sql");
    expect(safeMigration).toContain("adb_anchor_probe_safe_provider_fields_null");
    expect(safeMigration).toContain("subscription_id IS NULL");
    expect(safeMigration).toContain("balance_before IS NULL");
    expect(safeMigration).toContain("credits_spent IS NULL");
    expect(safeMigration).toContain("internal_send_credits IS NULL");
  });

  it("cleans expired sessions first and re-queries blobs afterward in the Phase-2 expiry owner", () => {
    const expiry = read("scripts/v39_phase2_retention_v39.ts");
    const applySession = expiry.indexOf("applyExpiredPrepaidProbeSessionsV39(sessions)");
    const requeryBlob = expiry.indexOf("collectExpiredProviderBlobsV39(now, remaining)", applySession + 1);
    const applyBlob = expiry.indexOf("applyExpiredProviderBlobsV39(blobs)", requeryBlob + 1);
    expect(applySession).toBeGreaterThanOrEqual(0);
    expect(requeryBlob).toBeGreaterThan(applySession);
    expect(applyBlob).toBeGreaterThan(requeryBlob);
  });

  it("orders the post-P Phase 2B-E closure exactly as Gate1 -> reference -> frame -> preprobe and stops before smoke", () => {
    const runner = read("scripts/v39_phase2b_e_close.sh");
    const gate1 = runner.indexOf("scripts/measure_coverage.ts");
    const materialize = runner.indexOf("scripts/v39_materialize_pinned_traffic_reference_v39.ts");
    const referenceFreeze = runner.indexOf("scripts/v39_freeze_record_v39.ts reference");
    const frame = runner.indexOf("scripts/build_final_frame_v39.ts");
    const preprobe = runner.indexOf("scripts/v39_freeze_record_v39.ts preprobe");
    expect(gate1).toBeGreaterThanOrEqual(0);
    expect(materialize).toBeGreaterThan(gate1);
    expect(referenceFreeze).toBeGreaterThan(materialize);
    expect(frame).toBeGreaterThan(referenceFreeze);
    expect(preprobe).toBeGreaterThan(frame);
    expect(runner).toContain("MANDATORY STOP");
    expect(runner).not.toContain("v39_smoke_safety_owner_v39.ts");
    expect(runner).not.toContain("v39_probe_stage1_owner_v39.ts");
    expect(runner).not.toContain("v39_probe_stage2_owner_v39.ts");
  });
});
