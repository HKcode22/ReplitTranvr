import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const helper = readFileSync(
  join(root, "scripts", "v39_phase2g_tuesday_omaa_v2_prepare_v39.sh"),
  "utf8",
);
const workflow = readFileSync(
  join(root, ".github", "workflows", "phase2g-paid-stage1.yml"),
  "utf8",
);
const owner = readFileSync(
  join(root, "scripts", "v39_probe_stage1_owner_v39.ts"),
  "utf8",
);
const preflight = readFileSync(
  join(root, "scripts", "v39_phase2g_stage1_paid_preflight_v39.ts"),
  "utf8",
);

describe("Tuesday OMAA-v2 Phase2G preparation", () => {
  it("binds a fresh OMAA runtime, budget and AUTH to the frozen v2 recovery", () => {
    expect(helper).toContain('EXPECTED_ICAO="OMAA"');
    expect(helper).toContain('P2G-S1-20260929-14');
    expect(helper).toContain('AUTH-20260929-P2G15');
    expect(helper).toContain('2026-09-29T11:00:00Z');
    expect(helper).toContain('2026-09-29T15:10:00Z');
    expect(helper).toContain(
      'phase2g-compact6-identity-v2-recovery-freeze-20260925.json',
    );
    expect(helper).toContain(
      'd8798dbc23d5bce45f62a255e98da0d00c5cbce9d669529fff6b34b2733d6741',
    );
    expect(helper).toContain("--min-stability-buckets 6");
    expect(helper).toContain("--stage1-reservation 450");
    expect(helper).toContain("--stage2-reservation 450");
  });

  it("is zero-credit preparation only and contains no paid launch path", () => {
    expect(helper).toContain("This helper has NO paid-launch mode");
    expect(helper).not.toContain("gh workflow run phase2g-paid-stage1.yml");
    expect(helper).not.toContain("createSubscription(");
    expect(helper).not.toContain("deleteSubscription(");
    expect(helper).not.toContain("refillBalance(");
    expect(helper).toContain("gh workflow run phase2g-zero-credit-callback-binding.yml");
  });

  it("forces the paid workflow caller to supply an explicit candidate instead of defaulting to WSSS", () => {
    const inputBlock = workflow.slice(
      workflow.indexOf("      expected_icao:"),
      workflow.indexOf("      callback_base:"),
    );
    expect(inputBlock).toContain("required: true");
    expect(inputBlock).toContain("no candidate default is permitted");
    expect(inputBlock).not.toContain("default:");
    expect(inputBlock).not.toContain("WSSS");
  });

  it("keeps the scientific selector generic and frozen-order rather than hard-wiring OMAA into execution code", () => {
    expect(owner).toContain("choosePhysicalIdentityV2RemeasurementTargetV39");
    expect(owner).toContain('): "WSSS" | "OMAA" | "MMUN" | null');
    expect(owner).toContain("for (const icao of recovery.ordered_icaos)");
    expect(owner).toContain("REFUSED_IDENTITY_V2_RECOVERY_OUT_OF_ORDER");
    expect(owner).not.toContain('return { icao: "OMAA", replacement: false };');
  });

  it("requires the expected OMAA candidate and current protected balance to pass before paid launch", () => {
    expect(preflight).toContain("next_candidate_mismatch");
    expect(preflight).toContain("provider_balance_below_protected_floor");
    expect(preflight).toContain(
      "1000 + protectedExposure",
    );
    expect(preflight).toContain("active_or_settling_probes=");
    expect(preflight).toContain("open_probe_budget_days=");
    expect(preflight).toContain("PASS_READY_FOR_PAID_STAGE1");
  });
});
