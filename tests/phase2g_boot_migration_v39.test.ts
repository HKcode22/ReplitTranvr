import { describe, expect, it } from "vitest";
import { BOOT_MIGRATIONS } from "../server/db";

describe("V3.9 Phase2G production boot migration wiring", () => {
  it("keeps physical-flight v2 migration 0061 directly after 0060", () => {
    const i60 = BOOT_MIGRATIONS.indexOf(
      "0060_phase2g_physical_flight_metrics.sql",
    );
    const i61 = BOOT_MIGRATIONS.indexOf(
      "0061_phase2g_physical_flight_metrics_v2.sql",
    );

    expect(i60).toBeGreaterThanOrEqual(0);
    expect(i61).toBe(i60 + 1);
  });

  it("wires reconciliation-status repair 0062 directly after 0061", () => {
    const i61 = BOOT_MIGRATIONS.indexOf(
      "0061_phase2g_physical_flight_metrics_v2.sql",
    );
    const i62 = BOOT_MIGRATIONS.indexOf(
      "0062_phase2g_delivery_gap_reconciliation_status.sql",
    );

    expect(i61).toBeGreaterThanOrEqual(0);
    expect(i62).toBe(i61 + 1);
  });

  it("keeps 0062 as the current terminal Phase2G boot migration", () => {
    expect(BOOT_MIGRATIONS.at(-1)).toBe(
      "0062_phase2g_delivery_gap_reconciliation_status.sql",
    );
  });
});
