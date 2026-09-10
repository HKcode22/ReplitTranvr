from pathlib import Path
p = Path('SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md')
s = p.read_text()
h = '7acd388c4b20b5c1cea9ca3a7ef5c309671ad40971936ed67f27abcbd3d241a9'
line = f'**AUTH_ARTIFACT_SHA256:{h}**\n\n'
anchor = '## GATE-0-20260910-PASS — Phase 1 / Gate 0 complete\n\n'
if line not in s:
    if anchor not in s:
        raise SystemExit('Gate0 PASS entry missing')
    s = s.replace(anchor, anchor + line, 1)
p.write_text(s)
