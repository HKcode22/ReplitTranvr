import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const text = readFileSync(join(process.cwd(), "scripts", "v39_phase2g_thursday_prepare_v39.sh"), "utf8");

describe("Thursday Phase2G preparation helper", () => {
  it("targets main and fresh Thursday runtime/auth identities", () => {
    expect(text).toContain('expected=main');
    expect(text).toContain('P2G-S1-20260924-10');
    expect(text).toContain('AUTH-20260924-P2G11');
    expect(text).toContain('phase2g-compact6-p2g10-secret-mismatch-recovery-freeze-20260923.json');
  });

  it("contains no paid launch mode or subscription creation", () => {
    expect(text).toContain("This helper has NO paid-launch mode");
    expect(text).not.toContain("v39_phase2g_github_actions_owner_v39.sh             --auth");
    expect(text).not.toContain("createSubscription(");
    expect(text).not.toContain("gh workflow run phase2g-paid-stage1.yml");
    expect(text).toContain("gh workflow run phase2g-zero-credit-secret-binding.yml");
  });

  it("requires explicit confirmation before P2G10 DB adjudication and AUTH approval", () => {
    expect(text).toContain("PHASE2G_CONFIRM_P2G10_ADJUDICATE");
    expect(text).toContain("PHASE2G_CONFIRM_AUTH_SHA");
    expect(text).toContain("DRAFT_ONLY_NOT_AUTHORIZED=true");
  });
});
