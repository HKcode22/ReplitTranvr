import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "server", "lib", "disruption", "probeExecutionPrepaid_v39.ts"),
  "utf8",
);

function prepaidLiveWindowCallBlock(): string {
  const startToken = "const result = await runPrepaidLiveWindowV39({";
  const start = source.indexOf(startToken);
  if (start < 0) throw new Error("TEST_FIXTURE_MISSING_PREPAID_LIVE_WINDOW_CALL");
  const end = source.indexOf("\n  });", start);
  if (end < 0) throw new Error("TEST_FIXTURE_MISSING_PREPAID_LIVE_WINDOW_CALL_END");
  return source.slice(start, end + "\n  });".length);
}

describe("Phase-2G safe-mode probe guard band", () => {
  it("stores reservation plus frozen burst margin as durable safe-mode exposure", () => {
    expect(source).toContain(
      "const durableReservedExposure = reservation + runtime.unsettledBurstMarginCredits;",
    );
    expect(source).toContain(
      "if (conservativePrior + durableReservedExposure > PROBE_BUDGET_DAY_HARD_CAP)",
    );
    expect(source).toContain(
      "runtime.probeBudgetDayId, durableReservedExposure, input.artifacts.preprobeSha256",
    );
  });

  it("uses the reservation as the live soft-stop and leaves the margin as guard band", () => {
    expect(source).toContain(
      "const liveHardCapCredits = Math.min(PROBE_BUDGET_DAY_HARD_CAP, priorExposure + reservation);",
    );
    const liveCall = prepaidLiveWindowCallBlock();
    expect(liveCall).toContain("hardCapCredits: liveHardCapCredits");
    expect(liveCall).not.toContain("hardCapCredits: PROBE_BUDGET_DAY_HARD_CAP,");
  });

  it("requires the exact AUTH ceiling to cover reservation plus margin", () => {
    expect(source).toContain(
      "reservation + input.artifacts.runtime.unsettledBurstMarginCredits > input.authMaxAlertCredits",
    );
  });

  it("fails closed and marks the probe budget day MISMATCH on settled cap overshoot", () => {
    expect(source).toContain(
      "const settledBudgetDayCredits = priorExposure + settledCurrentCredits;",
    );
    expect(source).toContain(
      "if (settledBudgetDayCredits > PROBE_BUDGET_DAY_HARD_CAP)",
    );
    expect(source).toContain("stopReason: \"probe_cap_overshoot\"");
    expect(source).toContain("SET state='MISMATCH'");
  });
});
