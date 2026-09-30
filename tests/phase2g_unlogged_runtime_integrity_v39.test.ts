import fs from "node:fs";
import { describe, expect, it } from "vitest";

const watchdog = fs.readFileSync(
  "scripts/v39_phase2g_github_actions_watchdog_v39.ts",
  "utf8",
);
const recovery = fs.readFileSync(
  "scripts/v39_phase2g_stage1_recover_after_exit_v39.ts",
  "utf8",
);
const execution = fs.readFileSync(
  "server/lib/disruption/probeExecutionPrepaid_v39.ts",
  "utf8",
);

describe("Phase2G UNLOGGED runtime integrity guards", () => {
  it("fails closed immediately if the bound runtime session row disappears", () => {
    expect(watchdog).toContain("runtime_state_loss:session_row_missing");
    expect(watchdog).toContain("runtimeSessionRowPresent");
    expect(watchdog).toContain('status === "probing" && !runtimeSessionRowPresent');
  });

  it("detects monotonic runtime regressions during the live probe", () => {
    expect(watchdog).toContain("runtime_state_loss:delivery_count_regressed");
    expect(watchdog).toContain("runtime_state_loss:internal_credit_regressed");
    expect(watchdog).toContain("runtime_state_loss:callback_count_regressed");
    expect(watchdog).toContain("runtime_state_loss:item_count_regressed");
    expect(watchdog).toContain("lastScientificItemRows");
  });

  it("records PostgreSQL lifecycle evidence without using it as an outcome signal", () => {
    expect(watchdog).toContain("pg_postmaster_start_time()");
    expect(watchdog).toContain("database_postmaster_start_utc");
    expect(watchdog).toContain("database_postmaster_start_changed");
  });

  it("preserves tightly-scoped runtime-state-loss reasons in exact recovery", () => {
    expect(recovery).toContain("allowedRuntimeStateLossStopReason");
    expect(recovery).toContain(
      "session_row_missing|delivery_count_regressed|internal_credit_regressed|callback_count_regressed|item_count_regressed|terminal_snapshot_mismatch",
    );
  });

  it("requires terminal runtime/metric agreement before a deferred-cleanup success", () => {
    expect(execution).toContain("terminal_runtime_counts");
    expect(execution).toContain("terminalRuntimeMismatch");
    expect(execution).toContain("terminalDeliveries !== result.metrics.deliveryCount");
    expect(execution).toContain("terminalItems !== result.metrics.rowsDelivered");
    expect(execution).toContain(
      "scientificHealth.counts.resolvedPhysicalIds !==",
    );
    expect(execution).toContain("runtime_state_loss:terminal_snapshot_mismatch");
  });
});
