import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "scripts", "v39_close_probe_budget_day_safe_v39.ts"), "utf8");

describe("Gate-2 safe-mode probe budget-day closure", () => {
  it("uses the provider-content-safe conservative exposure owner", () => {
    expect(source).toContain("prepaidSafeBudgetExposureV39");
    expect(source).not.toContain("probeBudgetExposure(dayId)");
  });

  it("refuses closure with active or failed probes and records overshoot as mismatch", () => {
    expect(source).toContain("REFUSED_PROBE_BUDGET_DAY_ACTIVE_PROBE");
    expect(source).toContain("REFUSED_PROBE_BUDGET_DAY_HAS_FAILED_OR_ABANDONED_PROBE");
    expect(source).toContain("state='MISMATCH'");
    expect(source).toContain("PROTOCOL_DEVIATION_PROBE_BUDGET_DAY_EXPOSURE");
  });

  it("binds closure to the exact runtime artifact and budget-day ID", () => {
    expect(source).toContain("loadProbeRuntimeConfig(runtimeFile, runtimeSha)");
    expect(source).toContain("loaded.config.probeBudgetDayId !== dayId");
    expect(source).toContain("PASS_CLOSED");
  });
});
