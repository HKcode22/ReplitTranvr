import { describe, expect, it } from "vitest";
import { BOOT_MIGRATIONS } from "../server/db";

describe("V3.9 Phase2G production boot migration wiring", () => {
  it("includes physical-flight v2 migration 0061 after 0060", () => {
    const i60 = BOOT_MIGRATIONS.indexOf("0060_phase2g_physical_flight_metrics.sql");
    const i61 = BOOT_MIGRATIONS.indexOf("0061_phase2g_physical_flight_metrics_v2.sql");

    expect(i60).toBeGreaterThanOrEqual(0);
    expect(i61).toBe(i60 + 1);
  });

  it("keeps 0061 as the current terminal Phase2G boot migration", () => {
    expect(BOOT_MIGRATIONS.at(-1)).toBe(
      "0061_phase2g_physical_flight_metrics_v2.sql",
    );
  });
});
