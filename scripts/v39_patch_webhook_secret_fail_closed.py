#!/usr/bin/env python3
"""Apply the exact Phase-2F fail-closed webhook/management secret repair.

This patcher exists because the live deployment-binding verifier proved that a
published process can return HTTP 200 to a wrong x-webhook-secret when
AERODATABOX_WEBHOOK_SECRET is absent. It performs three exact replacements in
server/routes_v3.ts and refuses any source drift.

It does not call AeroDataBox, does not touch credentials, and does not authorize
or perform paid work.
"""
from pathlib import Path

PATH = Path("server/routes_v3.ts")

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

    PATH.write_text(src, encoding="utf-8")
    print("PASS: server/routes_v3.ts patched fail-closed for missing webhook secret")
    print("PAID_OR_MUTATING_PROVIDER_ACTION=false")
    print("NEXT: run typecheck/tests, inspect diff, commit/push main, deploy, then rerun Phase-2F deployment binding proof")


if __name__ == "__main__":
    main()
