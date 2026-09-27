import fs from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

describe("Phase2G scientific observability wiring", () => {
  it("wires live scientific health into the independent GitHub watchdog", () => {
    const source = read("scripts/v39_phase2g_github_actions_watchdog_v39.ts");
    expect(source).toContain("readPhase2gScientificHealthV39");
    expect(source).toContain("SCIENTIFIC_HEALTH");
    expect(source).toContain("scientific_health_status");
    expect(source).toContain("scientific_contract_violation:");
    expect(source).toContain("durableStopReason");
  });

  it("preserves a validated scientific stop reason in abnormal-exit recovery", () => {
    const source = read("scripts/v39_phase2g_stage1_recover_after_exit_v39.ts");
    expect(source).toContain('optional("--stop-reason")');
    expect(source).toContain(
      "/^scientific_contract_violation:[a-z0-9_]{1,96}$/",
    );
    expect(source).toContain("stopReason = requestedStopReason");
  });

  it("preserves scientific-health evidence in the paid workflow", () => {
    const workflow = read(".github/workflows/phase2g-paid-stage1.yml");
    expect(workflow).toContain("Preserve scientific-health evidence");
    expect(workflow).toContain("artifacts/phase2g-scientific-health-*.jsonl");
    expect(workflow).toContain("Preserve owner evidence artifacts");
  });

  it("exposes a no-provider scientific-health mode in the Monday helper", () => {
    const helper = read("scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh");
    expect(helper).toContain("scientific-health)");
    expect(helper).toContain("provider_call=false");
    expect(helper).toContain("database_mutation=false");
    expect(helper).toContain("v39_phase2g_scientific_health_snapshot_v39.ts");
  });
});
