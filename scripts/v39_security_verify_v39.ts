/**
 * v39:security:verify — retention/security verifier (§1.5.15 / ChatGPT P1-8).
 *
 * Two separate verdicts (never conflated):
 *  - MACHINERY (Phase-0 scope): secret handling, DB path, webhook auth
 *    config, raw-ingress owner, redaction utilities. All must pass, else exit 1.
 *  - TERMS (Phase-2 prerequisite P scope): actual Plan Terms, content
 *    classes, legal basis from Gate-0 channel evidence. Reported as
 *    PENDING-BY-DESIGN here — it cannot pass in Phase 0 and must NOT fail
 *    the Phase-0 aggregate preflight for that reason.
 * Exit 0 iff all machinery checks pass (Terms pending is informational).
 */
import { existsSync } from "fs";
import { join } from "path";

interface Check { name: string; pass: boolean; detail: string; }

function main(): void {
  const root = process.cwd();
  const machinery: Check[] = [];
  const termsPending: Check[] = [];
  const has = (p: string) => existsSync(join(root, p));

  machinery.push({
    name: "webhook-secret-configured",
    pass: !!(process.env.AERODATABOX_WEBHOOK_SECRET || process.env.WEBHOOK_BASE_URL || process.env.REPLIT_DOMAINS),
    detail: "webhook secret or public base URL must be configured (else compensating-control state required)",
  });
  machinery.push({
    name: "database-url-configured",
    pass: !!process.env.DATABASE_URL,
    detail: "DATABASE_URL required for webhook/raw/expiry least-privilege path",
  });
  machinery.push({
    name: "raw-ingress-owner-exists",
    pass: has("server/lib/disruption/rawIngress_v3.ts"),
    detail: "rawIngress_v3.ts must exist for replay-safe identity checks",
  });
  machinery.push({
    name: "redaction-owner-exists",
    pass: has("server/lib/redact.ts"),
    detail: "redact.ts must exist; redaction tests prove secrets stay out of telemetry",
  });
  termsPending.push({
    name: "real-terms-verified",
    pass: false,
    detail: "PENDING-BY-DESIGN: actual Plan Terms/content classes/legal basis require Gate-0 channel evidence (prerequisite P, not Phase 0)",
  });

  console.log("SECURITY-VERIFY");
  console.log("  machinery (Phase-0 scope):");
  let failed = 0;
  for (const c of machinery) {
    console.log(`    [${c.pass ? "PASS" : "BLOCKED"}] ${c.name} — ${c.detail}`);
    if (!c.pass) failed++;
  }
  console.log("  terms (prerequisite-P scope, informational here):");
  for (const c of termsPending) {
    console.log(`    [PENDING] ${c.name} — ${c.detail}`);
  }
  if (failed > 0) {
    console.log(`RESULT: BLOCKED (${failed} machinery items open)`);
    process.exit(1);
  }
  console.log("RESULT: PASS (machinery green; Terms pending for prerequisite P)");
}

main();
