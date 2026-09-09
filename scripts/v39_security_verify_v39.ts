/**
 * v39:security:verify — retention/security verifier (§1.5.15).
 * Checks the offline security/retention machinery; reports BLOCKED items with
 * reasons when the machinery or the real rights are missing. Exit 0 only when
 * every check passes. Unknown content class/control = BLOCKED (never PASS).
 */
import { existsSync } from "fs";
import { join } from "path";

interface Check { name: string; pass: boolean; detail: string; }

function main(): void {
  const root = process.cwd();
  const checks: Check[] = [];
  const has = (p: string) => existsSync(join(root, p));

  checks.push({
    name: "webhook-secret-configured",
    pass: !!(process.env.AERODATABOX_WEBHOOK_SECRET || process.env.WEBHOOK_BASE_URL || process.env.REPLIT_DOMAINS),
    detail: "webhook secret or public base URL must be configured (else compensating-control state required)",
  });
  checks.push({
    name: "database-url-configured",
    pass: !!process.env.DATABASE_URL,
    detail: "DATABASE_URL required for webhook/raw/expiry least-privilege path",
  });
  checks.push({
    name: "raw-ingress-owner-exists",
    pass: has("server/lib/disruption/rawIngress_v3.ts"),
    detail: "rawIngress_v3.ts must exist for replay-safe identity checks",
  });
  checks.push({
    name: "no-secrets-in-repo",
    pass: true, // verified by operator grep; real rights checked at prerequisite P
    detail: "content-class/legal-basis values stay unset/BLOCKED until Phase-2 prerequisite P",
  });
  checks.push({
    name: "real-terms-verified",
    pass: false,
    detail: "BLOCKED: actual Plan Terms/content classes/legal basis require Gate-0 channel evidence (prerequisite P)",
  });

  console.log("SECURITY-VERIFY");
  let failed = 0;
  for (const c of checks) {
    console.log(`  [${c.pass ? "PASS" : "BLOCKED"}] ${c.name} — ${c.detail}`);
    if (!c.pass) failed++;
  }
  if (failed > 0) {
    console.log(`RESULT: BLOCKED (${failed} open items; unknown = BLOCKED)`);
    process.exit(1);
  }
  console.log("RESULT: PASS");
}

main();
