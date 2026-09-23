import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflow = readFileSync(join(root, ".github", "workflows", "phase2g-zero-credit-secret-binding.yml"), "utf8");

describe("Phase2G zero-credit cross-environment secret binding workflow", () => {
  it("uses only the webhook secret and live runtime checks", () => {
    expect(workflow).toContain("Phase2G Zero-Credit Secret Binding");
    expect(workflow).toContain("AERODATABOX_WEBHOOK_SECRET");
    expect(workflow).not.toContain("AERODATABOX_API_KEY");
    expect(workflow).toContain("/__v39/workspace-runtime");
    expect(workflow).toContain("/__v39/phase2g/webhook-secret-match");
    expect(workflow).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING=PASS");
  });

  it("contains no provider create/delete/refill operation", () => {
    expect(workflow).not.toContain("createSubscription");
    expect(workflow).not.toContain("deleteSubscription");
    expect(workflow).not.toContain("refillBalance");
    expect(workflow).not.toContain("/subscriptions/");
    expect(workflow).toContain("provider_call=false");
    expect(workflow).toContain("provider_mutation=false");
    expect(workflow).toContain("alert_credits_spent=0");
  });
});
