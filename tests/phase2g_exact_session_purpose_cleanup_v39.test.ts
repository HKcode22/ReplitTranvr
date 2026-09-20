import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  join(process.cwd(), "scripts", "v39_phase2g_exact_session_purpose_cleanup_v39.ts"),
  "utf8",
);

describe("Phase2G exact prepaid-session purpose cleanup helper", () => {
  it("is scoped to exact session blob/runtime cleanup and never imports provider subscription operations", () => {
    expect(src).toContain("cleanupPrepaidProbeSessionV39");
    expect(src).toContain("--session");
    expect(src).toContain("--expected-live-blobs");
    expect(src).toContain("REFUSED:LIVE_BLOB_COUNT_MISMATCH");
    expect(src).toContain('const apply=has("--apply")');
    expect(src).toContain('mode:"DRY_RUN"');
    expect(src).toContain('mode:"APPLY"');
    expect(src).not.toContain("aerodataboxLimiter");
    expect(src).not.toContain("createSubscription(");
    expect(src).not.toContain("deleteSubscription(");
    expect(src).not.toContain("listSubscriptions");
  });

  it("records zero provider/subscription/credit mutation claims", () => {
    expect(src).toContain("provider_mutation:false");
    expect(src).toContain("subscription_mutation:false");
    expect(src).toContain("alert_credits_spent:0");
  });
});
