#!/usr/bin/env python3
"""Apply the exact Phase-2F fail-closed webhook/management secret repair.

This patcher exists because the live deployment-binding verifier proved that a
published process can return HTTP 200 to a wrong x-webhook-secret when
AERODATABOX_WEBHOOK_SECRET is absent. It performs three exact replacements in
server/routes_v3.ts, creates a source-contract regression test, and refuses any
source drift.

It does not call AeroDataBox, does not touch credentials, and does not authorize
or perform paid work.
"""
from pathlib import Path

PATH = Path("server/routes_v3.ts")
TEST_PATH = Path("tests/phase2f_webhook_secret_failclosed_v39.test.ts")

REPLACEMENTS = [
    (
        '  if (!secret) return next();\n',
        '  if (!secret) { res.status(503).json({ error: "WEBHOOK_SECRET_NOT_CONFIGURED" }); return; }\n',
        "management guard missing-secret refusal",
    ),
    (
        '    if(secret&&(!req.params.secret||req.params.secret!==secret)){res.status(404).json({error:"Not found"});return;}\n',
        '    if(!secret){res.status(503).json({error:"WEBHOOK_SECRET_NOT_CONFIGURED"});return;}\n'
        '    if(!req.params.secret||req.params.secret!==secret){res.status(404).json({error:"Not found"});return;}\n',
        "prepaid webhook missing-secret refusal",
    ),
    (
        '      const secret=webhookSecret();if(secret&&(!req.params.secret||req.params.secret!==secret)){res.status(404).json({error:"Not found"});return;}\n',
        '      const secret=webhookSecret();if(!secret){res.status(503).json({error:"WEBHOOK_SECRET_NOT_CONFIGURED"});return;}if(!req.params.secret||req.params.secret!==secret){res.status(404).json({error:"Not found"});return;}\n',
        "general webhook missing-secret refusal",
    ),
]

TEST_CONTENT = '''import { readFileSync } from "fs";
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
'''


def main() -> None:
    if not PATH.exists():
        raise SystemExit(f"BLOCKED: missing {PATH}")
    src = PATH.read_text(encoding="utf-8")
    original = src
    for old, new, label in REPLACEMENTS:
        count = src.count(old)
        if count != 1:
            raise SystemExit(f"BLOCKED: source drift for {label}: expected exactly 1 match, got {count}")
        src = src.replace(old, new, 1)

    forbidden = [
        'if (!secret) return next();',
        'if(secret&&(!req.params.secret||req.params.secret!==secret))',
    ]
    if any(token in src for token in forbidden):
        raise SystemExit("BLOCKED: fail-open secret pattern remains after patch")
    if src == original:
        raise SystemExit("BLOCKED: patch produced no change")

    if TEST_PATH.exists() and TEST_PATH.read_text(encoding="utf-8") != TEST_CONTENT:
        raise SystemExit(f"BLOCKED: existing regression test differs from expected contract: {TEST_PATH}")

    PATH.write_text(src, encoding="utf-8")
    TEST_PATH.write_text(TEST_CONTENT, encoding="utf-8")
    print("PASS: server/routes_v3.ts patched fail-closed for missing webhook secret")
    print(f"PASS: regression contract written to {TEST_PATH}")
    print("PAID_OR_MUTATING_PROVIDER_ACTION=false")
    print("NEXT: inspect diff, run typecheck/offline/full/lint, commit/push main, deploy, then rerun Phase-2F deployment binding proof")


if __name__ == "__main__":
    main()
