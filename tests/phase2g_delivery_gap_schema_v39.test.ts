import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const baseline = readFileSync(
  join(
    process.cwd(),
    "migrations",
    "baseline",
    "B0062__v39_schema_baseline_20261001.sql",
  ),
  "utf8",
);

const execution = readFileSync(
  join(
    process.cwd(),
    "server",
    "lib",
    "disruption",
    "probeExecutionPrepaid_v39.ts",
  ),
  "utf8",
);

describe("Phase2G DELIVERY_GAP final schema compatibility", () => {
  it("final baseline accepts every diagnostic reconciliation state", () => {
    expect(baseline).toContain(
      "adb_anchor_probe_reconciliation_status_check",
    );
    for (const status of ["MATCH", "DELIVERY_GAP", "MISMATCH", "UNRESOLVED"]) {
      expect(baseline).toContain(`'${status}'::text`);
    }
  });

  it("final baseline contains durable append-only reconciliation evidence", () => {
    expect(baseline).toContain(
      "CREATE TABLE clean.adb_probe_reconciliation_evidence",
    );
    expect(baseline).toContain("DELIVERY_GAP");
    expect(baseline).toContain(
      "Phase-2G reconciliation evidence is append-only",
    );
  });

  it("preserves completed/settling scientific safety shapes", () => {
    expect(baseline).toContain("adb_anchor_probe_safe_completed_shape");
    expect(baseline).toContain("adb_anchor_probe_safe_settling_shape");
    expect(execution).toContain(
      'const acceptedReconciliation = result.reconciliationStatus === "MATCH";',
    );
  });

  it("keeps DELIVERY_GAP terminal/non-scoreable in execution", () => {
    expect(execution).toContain(
      'reconciliationStatus?: "MATCH" | "DELIVERY_GAP" | "MISMATCH" | "UNRESOLVED" | null;',
    );
    expect(execution).toContain(
      'const acceptedReconciliation = result.reconciliationStatus === "MATCH";',
    );
  });
});
