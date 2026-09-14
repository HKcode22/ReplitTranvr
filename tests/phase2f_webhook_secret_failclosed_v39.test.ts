import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const routes = readFileSync(join(process.cwd(), "server", "routes_v3.ts"), "utf8");

describe("Phase-2F webhook secret fail-closed contract", () => {
  it("refuses management endpoints when the deployment secret is absent", () => {
    expect(routes).toContain(
      'if (!secret) { res.status(503).json({ error: "WEBHOOK_SECRET_NOT_CONFIGURED" }); return; }',
    );
    expect(routes).not.toContain("if (!secret) return next();");
  });

  it("refuses prepaid and general AeroDataBox webhook ingress when the secret is absent", () => {
    const missingSecretRefusals = routes.match(/WEBHOOK_SECRET_NOT_CONFIGURED/g) ?? [];
    expect(missingSecretRefusals.length).toBeGreaterThanOrEqual(3);
    expect(routes).not.toContain("if(secret&&(!req.params.secret||req.params.secret!==secret))");
    expect(routes).toContain('if(!req.params.secret||req.params.secret!==secret){res.status(404).json({error:"Not found"});return;}');
  });

  it("still rejects an incorrect management header with 403", () => {
    expect(routes).toContain(
      'if (req.header("x-webhook-secret") !== secret) { res.status(403).json({ error: "Forbidden" }); return; }',
    );
  });
});
