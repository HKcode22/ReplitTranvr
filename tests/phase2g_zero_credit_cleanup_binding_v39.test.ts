import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const file = readFileSync(
  join(process.cwd(), ".github/workflows/phase2g-zero-credit-cleanup-binding.yml"),
  "utf8",
);

describe("Phase2G zero-credit published cleanup binding", () => {
  it("does not request provider credentials or create any subscription", () => {
    expect(file).toContain("Phase2G Zero-Credit Cleanup Key Binding");
    expect(file).toContain("V39_PHASE2G_CLEANUP_SIGNING_KEY: ${{ secrets.V39_PHASE2G_CLEANUP_SIGNING_KEY }}");
    for (const forbidden of [
      "AERODATABOX_API_KEY",
      "DATABASE_URL",
      "V39_DATABASE_RUNTIME_URL",
      "createSubscription",
      "deleteSubscription",
      "refillBalance",
      "v39_phase2g_github_signed_cleanup_v39.ts",
      "--apply",
    ]) {
      expect(file).not.toContain(forbidden);
    }
    expect(file).toContain("PROVIDER_CALLS=0");
    expect(file).toContain("DATABASE_MUTATIONS=0");
    expect(file).toContain("ALERT_CREDITS_SPENT=0");
  });
  it("validates live published source and both directions of HMAC authentication", () => {
    expect(file).toContain("EXPECTED_HEAD");
    expect(file).toContain("GITHUB_SHA");
    expect(file).toContain("runtime_owner_mode");
    expect(file).toContain("phase2g-cleanup-control-key-binding:");
    expect(file).toContain("/__v39/phase2g/cleanup-control-match");
    expect(file).toContain("CLEANUP_KEY_CORRECT_HMAC=PASS");
    expect(file).toContain("CLEANUP_KEY_WRONG_HMAC_REJECTED=PASS");
    expect(file).toContain("UNSIGNED_RUNTIME_CLEANUP_REJECTED=PASS");
  });
});
