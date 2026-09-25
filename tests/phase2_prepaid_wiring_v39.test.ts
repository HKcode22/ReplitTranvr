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

  it("resolves and persists physical identity sequentially inside the prepaid item transaction", () => {
    const runtime = read("server/lib/disruption/prepaidProbeRuntime_v39.ts");

    const functionStart = runtime.indexOf(
      "export async function persistPrepaidProbeWebhookV39",
    );
    const functionEnd = runtime.indexOf(
      "export async function prepaidProbeInternalCreditsV39",
      functionStart,
    );

    expect(functionStart).toBeGreaterThanOrEqual(0);
    expect(functionEnd).toBeGreaterThan(functionStart);

    const block = runtime.slice(functionStart, functionEnd);

    const loop = block.indexOf(
      "for (let itemIndex = 0; itemIndex < flights.length; itemIndex += 1)",
    );
    const resolve = block.indexOf(
      "await resolvePrepaidFlightIdentityV39(client, sessionId, flight)",
      loop,
    );
    const insert = block.indexOf(
      "INSERT INTO clean.prepaid_probe_item_runtime",
      resolve,
    );

    expect(loop).toBeGreaterThanOrEqual(0);
    expect(resolve).toBeGreaterThan(loop);
    expect(insert).toBeGreaterThan(resolve);

    for (const column of [
      "provider_flight_id",
      "callsign",
      "operating_carrier",
      "operating_flight_number",
      "origin_icao",
      "destination_icao",
      "origin_time_zone",
      "scheduled_gate_out_utc",
      "scheduled_gate_in_utc",
      "flight_instance_id",
      "initial_service_date",
      "provisional_identity_key",
      "codeshare_resolution_status",
      "identity_resolution_status",
    ]) {
      expect(block).toContain(column);
    }

    expect(block).not.toContain("clean.webhook_flight_identity");
    expect(block).not.toContain("clean.webhook_flight_schedule_version");
  });

  it("computes prepaid scientific metrics from physical identity rather than flight-number proxies", () => {
    const runtime = read("server/lib/disruption/prepaidProbeRuntime_v39.ts");

    const start = runtime.indexOf(
      "export async function prepaidProbeMetricsV39",
    );
    const end = runtime.indexOf(
      "export async function persistProbeReconciliationEvidenceV39",
      start,
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = runtime.slice(start, end);

    expect(block).toContain(
      "summarizePrepaidPhysicalIdentityRowsV39",
    );

    for (const field of [
      "flight_instance_id",
      "provisional_identity_key",
      "identity_resolution_status",
      "codeshare_status",
      "aircraft_reg",
      "origin_icao",
      "destination_icao",
      "scheduled_gate_out_utc",
      "scheduled_gate_in_utc",
      "received_at_utc",
    ]) {
      expect(block).toContain(field);
    }

    expect(block).not.toMatch(
      /count\s*\(\s*DISTINCT\s+flight_number/i,
    );
    expect(block).not.toMatch(
      /GROUP\s+BY\s+runtime_flight_key/i,
    );
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
