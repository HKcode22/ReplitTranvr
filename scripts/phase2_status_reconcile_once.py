from pathlib import Path

repo = Path('.')
ledger_p = repo / 'SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md'
vol2_p = repo / 'SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE2.md'
log_p = repo / 'SEPmd/V3.9_IMPLEMENTATION_LOG.md'

ledger = ledger_p.read_text()
vol2 = vol2_p.read_text()
log = log_p.read_text()

ledger_block = '''<!-- PHASE2-AUDIT-20260911-001 -->
## PHASE2-AUDIT-20260911-001 — Canonical Phase-2 readiness re-audit

**This entry supersedes current-readiness conclusions from earlier Phase-2 reports while preserving their historical measurements and evidence.**

**Current status:** `PHASE0=PASS`, `PHASE1=PASS`, `PREPAID_SECURITY_RETENTION=BLOCKED_REVERIFY`, `GATE1_MEASUREMENT=RETAINED_NOT_AUTHORIZING`, `REGION_REFERENCE=READY`, `TRAFFIC_REFERENCE=BLOCKED_PENDING_PERMITTED_REFERENCE`, `PHASE2D=NO-GO`, `PHASE2E=NO-GO`, `PAID_WORK=NO-GO`.

### Why prerequisite P is reopened for verification

The earlier prerequisite-P claim was not reproducible on a clean runtime. Its retention evidence depended on transient shell state, the deployed primary PostgreSQL surface could be declared `NOT_DEPLOYED`, and a blanket 30-day rule was used where the binding Plan requires content-class-specific retention and fail-closed unknowns. Current code now refuses those claims rather than manufacturing PASS.

### Gate-1 evidence handling

The historical Gate-1 coverage measurement remains useful read-only evidence, but because prerequisite P must precede Gate 1 it does **not** authorize downstream progression. Gate 1 must be rerun under a fresh valid read-only AUTH after prerequisite P genuinely passes on the current runtime.

### Repairs already present on current main

- prerequisite-P environment helper no longer fabricates retention PASS evidence;
- security verifier rejects an actually configured primary database being reported as `NOT_DEPLOYED` and emits prerequisite-P PASS only when every check passes;
- retention-matrix checks reject blanket raw retention and require Article-5.6/non-trivial/non-reconstructable support for Derived-Work claims;
- Gate-1 public artifact is aggregate-only (counts, hashes, provenance); provider airport membership lists are transient and not committed by the current owner;
- country→macro-region mapping now implements the binding Russia `<60°E=EU`, `>=60°E=AP`, missing/invalid longitude=`UNMAPPED` rule and explicitly reviews all 249 ISO alpha-2 rows;
- `artifacts/traffic-reference-decision.json` records the traffic-source decision and keeps the frame blocked until a permitted reference exists.

### Traffic-reference decision

Pursue one permitted global historical scheduled-route source covering the binding 12-month research window. Cirium or OAG are preferred candidates **only if the actual evaluation/license permits this project use and provides the required airport traffic, route, operating-carrier, and international-share inputs**. Until the source is actually obtained, versioned and hashed, `TRAFFIC_REFERENCE=BLOCKED`; airports without verified traffic evidence remain `UNCLASSIFIED` and the final frame cannot PASS.

### Required order from here

1. Re-establish prerequisite P on the current runtime with reproducible evidence.
2. Rerun Gate 1 under a new/fresh read-only authorization.
3. Obtain and freeze the permitted traffic reference plus the already-repaired region reference.
4. Rebuild/hash the final Phase-2D sampling frame.
5. Complete the Phase-2E hash-locked pre-probe reference freeze.

Safety smoke, Gate 2 probes, and all paid AeroDataBox work remain **NO-GO** until their owning predecessors and authorizations pass.

This is an evidence/readiness correction only; it does not redesign or weaken the binding V3.9-f.8 Plan.

---

'''

if '<!-- PHASE2-AUDIT-20260911-001 -->' not in ledger:
    marker = '---\n\n'
    if marker not in ledger:
        raise SystemExit('canonical ledger insertion marker missing')
    ledger = ledger.replace(marker, marker + ledger_block, 1)
    ledger_p.write_text(ledger)

vol2_block = '''<!-- PHASE2-AUDIT-CORRECTION-20260911 -->
## Superseding Phase-2 audit correction (2026-09-11)

The older Phase 1→2 explainer remains useful historical explanation, but its current-readiness statements that prerequisite P and all five security/retention checks PASS are **superseded** by canonical evidence `PHASE2-AUDIT-20260911-001`.

Current truth: `PHASE0=PASS`, `PHASE1=PASS`, `PREPAID_SECURITY_RETENTION=BLOCKED_REVERIFY`, `GATE1_MEASUREMENT=RETAINED_NOT_AUTHORIZING`, `REGION_REFERENCE=READY`, `TRAFFIC_REFERENCE=BLOCKED_PENDING_PERMITTED_REFERENCE`, `PHASE2D=NO-GO`, `PHASE2E=NO-GO`, `PAID_WORK=NO-GO`.

The previous prerequisite-P evidence was transient/non-reproducible and could misstate deployed storage plus blanket retention. The current helper/verifier now fails closed. Gate-1 measurement history is retained, but Gate 1 must be rerun after P genuinely passes. The region mapper has been repaired to the Plan-exact ISO/Russia rule. The traffic-source requirement is binding: acquire a permitted global 12-month historical scheduled-route source; until it is actually available and hashed, airports without traffic evidence remain `UNCLASSIFIED` and the frame cannot PASS.

Required order: **P reverify → Gate 1 rerun → permitted traffic/reference freeze → Phase 2D frame rebuild/hash → Phase 2E pre-probe freeze**. Paid work remains NO-GO.

---

'''

if '<!-- PHASE2-AUDIT-CORRECTION-20260911 -->' not in vol2:
    marker = '---\n\n'
    if marker not in vol2:
        raise SystemExit('volume2 insertion marker missing')
    vol2 = vol2.replace(marker, marker + vol2_block, 1)
    vol2_p.write_text(vol2)

log_block = '''> **CURRENT PHASE-2 RE-AUDIT STATUS — PHASE2-AUDIT-20260911-001 (2026-09-11):** `PHASE0=PASS`, `PHASE1=PASS`, `PREPAID_SECURITY_RETENTION=BLOCKED_REVERIFY`, `GATE1_MEASUREMENT=RETAINED_NOT_AUTHORIZING`, `REGION_REFERENCE=READY`, `TRAFFIC_REFERENCE=BLOCKED_PENDING_PERMITTED_REFERENCE`, `PHASE2D=NO-GO`, `PHASE2E=NO-GO`, `PAID_WORK=NO-GO`. The earlier prerequisite-P result was not reproducible and could misdeclare deployed storage/blanket retention; current code now fails closed. Gate-1 evidence remains historical measurement evidence only and must be rerun after P PASS. The region reference is repaired to the Plan-exact ISO/Russia rule. The traffic requirement is binding Plan §4.1/§4.5: pursue a permitted global 12-month historical scheduled-route source (prefer Cirium/OAG only if actual access terms and fields satisfy the Plan); until obtained, airports without traffic data stay `UNCLASSIFIED` and frame rebuild cannot PASS. **Next order: re-establish P → rerun Gate 1 → freeze traffic/reference → rebuild/hash Phase 2D frame → complete Phase 2E pre-probe freeze.** This superseding readiness correction does not modify the binding scientific Plan. Canonical evidence: `PHASE2-AUDIT-20260911-001`.

'''

if 'CURRENT PHASE-2 RE-AUDIT STATUS — PHASE2-AUDIT-20260911-001' not in log:
    anchor = '> **CURRENT PHASE-1 / GATE-0 STATUS — PASS (2026-09-10):**'
    start = log.find(anchor)
    if start < 0:
        raise SystemExit('implementation log Gate0 status anchor missing')
    end = log.find('\n\n', start)
    if end < 0:
        raise SystemExit('implementation log Gate0 status paragraph end missing')
    log = log[:end+2] + log_block + log[end+2:]
    log_p.write_text(log)

# Fail closed if any block did not land.
checks = [
    (ledger_p, '<!-- PHASE2-AUDIT-20260911-001 -->'),
    (vol2_p, '<!-- PHASE2-AUDIT-CORRECTION-20260911 -->'),
    (log_p, 'CURRENT PHASE-2 RE-AUDIT STATUS — PHASE2-AUDIT-20260911-001'),
]
for path, marker in checks:
    if marker not in path.read_text():
        raise SystemExit(f'missing required marker after patch: {path}: {marker}')
