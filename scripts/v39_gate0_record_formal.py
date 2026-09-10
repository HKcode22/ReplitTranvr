from pathlib import Path
p = Path('SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md')
s = p.read_text()
anchor = 'Sanitized evidence artifact: `SEPmd/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json`.\n'
block = '''Sanitized evidence artifact: `SEPmd/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json`.

### Formal guarded rerun

On exact Replit/GitHub HEAD `9dd75fff3c2f336530b6158aa7c71d8c2a600e31`, repository AUTH verification passed for `AUTH-20260910-G0A` with approved SHA-256 `7acd388c4b20b5c1cea9ca3a7ef5c309671ad40971936ed67f27abcbd3d241a9`. The formal `v39:gate0:inspect` execution used evidence ID `GATE-0-20260910-FORMAL`, exited `0`, returned artifact status `PASS` with no reasons, and produced artifact SHA-256 `ff75d9b01ed814d23607043c31a5b5c72e242a71ed4e4b267f4be1c54a3404eb`. The account values remained `60000` entitlement, `59994` remaining, `6` used, `2900` Alert credits, and zero subscriptions. `budget_freeze_status=BLOCKED_LATER_LIVE_VALUE` is expected because 25 fields are owned by later Plan stages; it does not reopen Gate 0. Formal result artifact: `SEPmd/V3.9_GATE0_FORMAL_RESULT_20260910.json`.
'''
if '### Formal guarded rerun' not in s:
    if anchor not in s:
        raise SystemExit('Gate0 evidence anchor missing')
    s = s.replace(anchor, block, 1)
p.write_text(s)
