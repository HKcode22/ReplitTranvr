from pathlib import Path


def insert_after_once(text: str, anchor: str, addition: str, marker: str) -> str:
    if marker in text:
        return text
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit(f"anchor missing for {marker}: {anchor[:80]}")
    end = idx + len(anchor)
    return text[:end] + addition + text[end:]


def insert_after_paragraph(text: str, anchor_start: str, addition: str, marker: str) -> str:
    if marker in text:
        return text
    start = text.find(anchor_start)
    if start < 0:
        raise SystemExit(f"paragraph anchor missing for {marker}")
    end = text.find("\n\n", start)
    if end < 0:
        raise SystemExit(f"paragraph end missing for {marker}")
    return text[: end + 2] + addition + text[end + 2 :]


ledger_p = Path("SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md")
volume2_p = Path("SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE2.md")
log_p = Path("SEPmd/V3.9_IMPLEMENTATION_LOG.md")
manifest_p = Path("server/lib/disruption/manifest_v3.ts")

ledger = ledger_p.read_text()
ledger_marker = "<!-- PHASE2-AUDIT-20260911-001 -->"
ledger_entry = """<!-- PHASE2-AUDIT-20260911-001 -->
## PHASE2-AUDIT-20260911-001 — prerequisite-P re-audit and Phase-2 admission repair

**Current decision:** `PHASE0=PASS`, `PHASE1=PASS`, `PREPAID_SECURITY_RETENTION=BLOCKED_REVERIFY`, `GATE1_MEASUREMENT=RETAINED_NOT_AUTHORIZING`, `REGION_REFERENCE=READY`, `TRAFFIC_REFERENCE=BLOCKED_PENDING_PERMITTED_REFERENCE`, `REFERENCE_FREEZE=BLOCKED`, `PHASE2D_FRAME=NO_GO`, `PHASE2E_PREPROBE=NO_GO`, `PAID_WORK=NO_GO`.

A repository/runtime re-audit found that the earlier prerequisite-P readiness claim was not reproducible on a clean runtime. The prior shell helper could misstate deployed retention surfaces and could synthesize blanket retention evidence. The binding Plan requires class/surface-specific evidence and fail-closed unknowns, so the earlier P readiness conclusion is superseded. Phase 0 and Phase 1/Gate 0 remain closed/PASS.

Repairs now fail closed: prerequisite P writes a sanitized durable PASS artifact only after all five live checks pass; the artifact is bound to the retention-matrix hash and a deterministic security-contract hash over the actual security/ingress/incident-stop owners. Gate 1 validates that artifact before any provider coverage read. The current historical Gate-1 measurement is retained as evidence but its sanitized `PASS_MEASUREMENT_RETAINED` artifact cannot satisfy the current Gate-1-v2 verifier or reference-freeze admission. A fresh Gate-1 run is required after P PASS.

The Plan-exact region mapping is repaired/ready. The binding traffic decision is to obtain one permitted global historical scheduled-route reference (preferred candidates: Cirium or OAG only if the actual license permits the required research/history). Until such a source is actually obtained, hashed, and frozen, `TRAFFIC_REFERENCE=BLOCKED` and airports lacking verified traffic remain `UNCLASSIFIED`. FAA/BTS alone is not global; OpenSky ADS-B alone does not satisfy the scheduled-route variables in Plan §4.5.

The reference/preprobe freeze commands also fail closed: they reject stale Gate-1 evidence and cannot return success merely because inputs exist. Until the real hash-locked freeze-record writer/schema is implemented and writes its artifact, freeze remains BLOCKED.

**Next permitted work:** re-establish prerequisite P on the current security contract only. Then rerun Gate 1 under fresh valid read-only AUTH. Then obtain/freeze the permitted traffic reference and implement the real reference-freeze writer before Phase 2D. Safety smoke, probes, Gate 2, canary, and paid collection remain NO-GO.

---

"""
if ledger_marker not in ledger:
    first_sep = ledger.find("---\n\n")
    if first_sep < 0:
        raise SystemExit("ledger top separator missing")
    pos = first_sep + len("---\n\n")
    ledger = ledger[:pos] + ledger_entry + ledger[pos:]
    ledger_p.write_text(ledger)

volume2 = volume2_p.read_text()
vol_marker = "<!-- PHASE2-AUDIT-CORRECTION-20260911 -->"
vol_entry = """<!-- PHASE2-AUDIT-CORRECTION-20260911 -->
## Superseding Phase-2 audit correction — 2026-09-11

The explainer below remains a historical account of what the earlier session attempted, but its claims that prerequisite P was complete/currently PASS and that Gate 1 authorized Phase-2 progression are **superseded** by canonical audit `PHASE2-AUDIT-20260911-001`.

Current truth: `PREPAID_SECURITY_RETENTION=BLOCKED_REVERIFY`; the historical Gate-1 measurement is retained but is not progression-authorizing; the repaired region mapping is READY; `TRAFFIC_REFERENCE=BLOCKED_PENDING_PERMITTED_REFERENCE`; reference freeze, Phase 2D, Phase 2E, safety smoke, Gate 2 and paid work are NO-GO. The old all-`NOT_DEPLOYED`/blanket-retention evidence must not be used operationally.

Prerequisite P now requires a durable sanitized PASS artifact bound to the live retention-matrix/security-contract hashes. Gate 1 and reference freeze validate that artifact. The current sanitized historical Gate-1 artifact is intentionally rejected by current freeze admission, so Gate 1 must be rerun after P PASS. The traffic acquisition path is a permitted global 12-month historical scheduled-route source; until access is actually obtained and frozen, missing traffic rows remain `UNCLASSIFIED`.

---

"""
if vol_marker not in volume2:
    first_sep = volume2.find("---\n\n")
    if first_sep < 0:
        raise SystemExit("volume2 top separator missing")
    pos = first_sep + len("---\n\n")
    volume2 = volume2[:pos] + vol_entry + volume2[pos:]
    volume2_p.write_text(volume2)

log = log_p.read_text()
log_marker = "CURRENT PHASE-2 RE-AUDIT STATUS — 2026-09-11"
log_entry = """> **CURRENT PHASE-2 RE-AUDIT STATUS — 2026-09-11 (supersedes earlier Phase-2 readiness claims):** `PREPAID_SECURITY_RETENTION=BLOCKED_REVERIFY`, `GATE1_MEASUREMENT=RETAINED_NOT_AUTHORIZING`, `REGION_REFERENCE=READY`, `TRAFFIC_REFERENCE=BLOCKED_PENDING_PERMITTED_REFERENCE`, `REFERENCE_FREEZE=BLOCKED`, `PHASE2D=NO_GO`, `PHASE2E=NO_GO`, `PAID_WORK=NO_GO`. The earlier prerequisite-P shell evidence was not reproducible and could misdeclare deployed storage/blanket retention. Current code fails closed: P must emit a durable sanitized PASS artifact bound to the retention-matrix + security-contract hashes; Gate 1 validates it before any coverage read; reference freeze rejects the historical sanitized Gate-1 artifact and cannot return success until a real hash-locked freeze writer exists. Re-establish P, then rerun Gate 1, then obtain/freeze a permitted global 12-month scheduled-route traffic reference. Missing traffic rows remain `UNCLASSIFIED`; no Phase 2D/2E or paid progression is authorized. Canonical evidence: `PHASE2-AUDIT-20260911-001`.

"""
if log_marker not in log:
    log = insert_after_paragraph(
        log,
        "> **CURRENT PHASE-1 / GATE-0 STATUS — PASS (2026-09-10):**",
        log_entry,
        log_marker,
    )
    log_p.write_text(log)

manifest = manifest_p.read_text()
module_marker = 'server/lib/disruption/prerequisitePArtifact_v39.ts'
if module_marker not in manifest:
    anchor = '  current("module", "server/lib/disruption/retentionSecurity_v39.ts", "security/retention/incident machinery"),'
    addition = '\n  current("module", "server/lib/disruption/prerequisitePArtifact_v39.ts", "durable prerequisite-P closure artifact and security-contract binding"),'
    manifest = insert_after_once(manifest, anchor, addition, module_marker)

script_marker = 'scripts/measure_coverage.ts'
if script_marker not in manifest:
    anchor = '  current("script", "scripts/v39_security_verify_v39.ts", "deployment-aware security/retention verifier"),'
    addition = '\n  current("script", "scripts/measure_coverage.ts", "AUTH + prerequisite-P-gated Gate-1 coverage measurement"),\n  current("script", "scripts/v39_freeze_record_v39.ts", "fail-closed reference/preprobe freeze admission checker"),'
    manifest = insert_after_once(manifest, anchor, addition, script_marker)

test_marker = 'tests/prerequisite_p_artifact_v39.test.ts'
if test_marker not in manifest:
    anchor = '  current("test", "tests/retention_security_v39.test.ts", "retention/security"),'
    addition = '\n  current("test", "tests/gate1_coverage_v39.test.ts", "Gate-1 sanitized artifact and prerequisite-P admission"),\n  current("test", "tests/prerequisite_p_artifact_v39.test.ts", "durable prerequisite-P artifact/contract binding"),'
    manifest = insert_after_once(manifest, anchor, addition, test_marker)

manifest_p.write_text(manifest)
