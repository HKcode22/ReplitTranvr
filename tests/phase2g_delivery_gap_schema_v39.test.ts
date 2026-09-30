import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const migration55 = readFileSync(
  join(process.cwd(), "migrations", "0055_prepaid_probe_unlogged_runtime.sql"),
  "utf8",
);

const migration58 = readFileSync(
  join(process.cwd(), "migrations", "0058_phase2g_reconciliation_evidence.sql"),
  "utf8",
);

const migration62 = readFileSync(
  join(
    process.cwd(),
    "migrations",
    "0062_phase2g_delivery_gap_reconciliation_status.sql",
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

describe("Phase2G DELIVERY_GAP schema compatibility", () => {
  it("documents the legacy 0055 constraint defect", () => {
    expect(migration55).toContain(
      "reconciliation_status IN ('MATCH','MISMATCH','UNRESOLVED')",
    );
    expect(migration55).not.toContain(
      "reconciliation_status IN ('MATCH','DELIVERY_GAP','MISMATCH','UNRESOLVED')",
    );
  });

  it("confirms 0058 made DELIVERY_GAP durable reconciliation evidence", () => {
    expect(migration58).toContain(
      "CHECK (evidence_status IN ('MATCH','DELIVERY_GAP','MISMATCH','UNRESOLVED'))",
    );
  });

  it("repairs adb_anchor_probe to accept every reconciliation diagnostic state", () => {
    expect(migration62).toContain(
      "adb_anchor_probe_reconciliation_status_check",
    );

    expect(migration62).toContain("'MATCH'");
    expect(migration62).toContain("'DELIVERY_GAP'");
    expect(migration62).toContain("'MISMATCH'");
    expect(migration62).toContain("'UNRESOLVED'");
  });

  it("does not weaken completed/settling scientific acceptance", () => {
    expect(migration62).not.toContain(
      "adb_anchor_probe_safe_completed_shape",
    );
    expect(migration62).not.toContain(
      "adb_anchor_probe_safe_settling_shape",
    );

    expect(execution).toContain(
      'const acceptedReconciliation = result.reconciliationStatus === "MATCH";',
    );
  });

  it("keeps DELIVERY_GAP terminal/non-scoreable in execution", () => {
    expect(execution).toContain(
      'reconciliationStatus?: "MATCH" | "DELIVERY_GAP" | "MISMATCH" | "UNRESOLVED" | null;',
    );
    expect(execution).toContain(
      "const acceptedReconciliation = result.reconciliationStatus === \"MATCH\";",
    );
  });
});
