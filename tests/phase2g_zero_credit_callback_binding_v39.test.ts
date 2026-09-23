import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflow = readFileSync(join(root, ".github", "workflows", "phase2g-zero-credit-callback-binding.yml"), "utf8");
const paid = readFileSync(join(root, ".github", "workflows", "phase2g-paid-stage1.yml"), "utf8");
const routes = readFileSync(join(root, "server", "routes_v3.ts"), "utf8");

describe("Phase2G zero-credit cross-environment callback binding", () => {
  it("verifies the live Replit runtime and GitHub webhook secret without provider access", () => {
    expect(workflow).toContain("Phase2G Zero-Credit Callback Binding");
    expect(workflow).toContain("AERODATABOX_WEBHOOK_SECRET: ${{ secrets.AERODATABOX_WEBHOOK_SECRET }}");
    expect(workflow).toContain("V39_DATABASE_RUNTIME_URL: ${{ secrets.V39_DATABASE_RUNTIME_URL }}");
    expect(workflow).toContain("/__v39/workspace-runtime");
    expect(workflow).toContain("/__v39/phase2g/webhook-secret-match");
    expect(workflow).toContain("/__v39/phase2g/runtime-db-binding");
    expect(workflow).toContain("GITHUB_REPLIT_RUNTIME_DB_BINDING=PASS");
    expect(workflow).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING=PASS");
    expect(workflow).toContain("PROVIDER_CALLS=0");
    expect(workflow).toContain("PROVIDER_MUTATIONS=0");
    expect(workflow).toContain("ALERT_CREDITS_SPENT=0");
    expect(workflow).not.toContain("AERODATABOX_API_KEY");
    expect(workflow).not.toContain("createSubscription");
    expect(workflow).not.toContain("deleteSubscription");
    expect(workflow).not.toContain("getBalance");
  });

  it("requires the same binding again in the paid gate and paid owner", () => {
    expect(routes).toContain('/__v39/phase2g/webhook-secret-match');
    expect(routes).toContain('/__v39/phase2g/runtime-db-binding');
    const gate = paid.slice(paid.indexOf("  gate:"), paid.indexOf("  owner:"));
    const ownerScript = readFileSync(join(root, "scripts", "v39_phase2g_github_actions_owner_v39.sh"), "utf8");
    expect(gate).toContain("Verify GitHub/Replit runtime DB binding");
    expect(gate).toContain("Verify GitHub/Replit webhook-secret binding");
    expect(ownerScript).toContain("GITHUB_REPLIT_RUNTIME_HEALTH_RECHECK=START");
    expect(ownerScript).toContain("GITHUB_REPLIT_RUNTIME_HEALTH_RECHECK=PASS");
    expect(ownerScript).toContain("GITHUB_REPLIT_RUNTIME_DB_BINDING_CHECK=START");
    expect(ownerScript).toContain("GITHUB_REPLIT_RUNTIME_DB_BINDING=PASS");
    expect(ownerScript).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING_CHECK=START");
    expect(ownerScript).toContain("GITHUB_REPLIT_WEBHOOK_SECRET_BINDING=PASS");
  });
});
