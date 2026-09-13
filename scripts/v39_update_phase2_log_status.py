#!/usr/bin/env python3
"""Bring the canonical Phase-2 section of V3.9_IMPLEMENTATION_LOG.md to current truth.

Assertion-driven: only exact known stale text is replaced, and a single dated
status block is inserted under §1.7. Refuses on drift rather than guessing.
"""
from pathlib import Path

LOG = Path("SEPmd/V3.9_IMPLEMENTATION_LOG.md")
MARKER = "<!-- V39_PHASE2_STATUS_20260913 -->"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"REFUSED:{label}:expected_exactly_one_match:found={count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = LOG.read_text(encoding="utf-8")

    heading = "### 1.7 Phase 2 — prerequisite P → Gate 1 → references/frame → pre-probe freeze → safety smoke → Gate 2\n\n"
    if text.count(heading) != 1:
        raise SystemExit(f"REFUSED:phase2-heading:expected_exactly_one_match:found={text.count(heading)}")

    status = """<!-- V39_PHASE2_STATUS_20260913 -->
**Current Phase-2 execution pointer — 2026-09-13 (binding Plan + repository truth):**

This table separates **implementation readiness** from **live/execution PASS**. A coded/tested owner is not a gate PASS. Execute strictly 2A→2H and stop at the first unmet predecessor.

| Subphase | Implementation status | Execution / evidence status | Exact next condition |
|---|---|---|---|
| **2A — prerequisite P** | **DONE / TESTED** — migrations 0054–0056, dedicated App-Storage provider-blob boundary, PostgreSQL `UNLOGGED` prepaid runtime, expiry owners, Phase-2-scoped verifier, fresh verification receipt, and P-pass v2 artifact owner are implemented | **AWAITING_PRODUCTION_BINDING — NOT PASS** | Bind a dedicated production App Storage bucket, production least-privilege runtime DB role/evidence, production webhook evidence, owner-approved Phase-2 retention evidence, then pass the live synthetic write/read/delete/absence + runtime checks and record cryptographic P PASS |
| **2B — Gate 1 coverage** | **DONE / TESTED** — P admission, current coverage hashing, provider pin, per-feed evidence and artifact verification are implemented | **WAITING ON 2A** — historical coverage is not a fresh post-P PASS | After true P PASS, run fresh Gate 1 and write a new hash-valid PASS artifact |
| **2C — traffic/region reference freeze** | **DONE / TESTED, PRE-OUTCOME METHODOLOGY BOUND** — binding f.8 now permits explicitly labeled observed commercial-movement/network semantics; validated zero-cost MrAirspace/ADSB.lol + OurAirports reference is repository-pinned; region mapper/hash is implemented | **WAITING ON 2B FOR RUN-SPECIFIC FREEZE RECORD** | Fresh Gate 1 must precede the write-once reference freeze; pinned source must still pass source-cadence freshness/contract at that freeze time |
| **2D — final frame** | **DONE / TESTED** — final-frame owner intersects fresh provider coverage with the frozen reference, applies reviewed region mapping, preserves `UNCLASSIFIED`/`UNMAPPED`, computes eligibility and frame hash/version | **WAITING ON 2A–2C** | Run only after P PASS + fresh Gate 1 + admissible frozen reference |
| **2E — `preprobe_reference_freeze_record`** | **DONE / TESTED** — real write-once owner, 18 cells, exactly 12 dual-eligible HUB candidates, mandatory WSSS/OMAA, replacements, P90 normalization caps, protocol and hashes | **WAITING ON 2D** | Active final frame must hash-match current P/Gate1/reference/region inputs, then write the real preprobe freeze |
| **2F — mandatory safety smoke** | **DONE / TESTED OWNER** — isolated prepaid/App-Storage+UNLOGGED smoke path exists and cleanup/reconciliation requirements are enforced | **NOT RUN — SEPARATE EXACT AUTH REQUIRED** | After 2E, create/approve exact run-specific AUTH (airport/filter/window/Alert cap/API-unit allowance/start/expiry/stop owner/preprobe hash), run smoke, settle/cleanup, then mandatory STOP/handoff |
| **2G — Gate 2 Stage 1** | **DONE / TESTED OWNER** — hash-selected sequential 12-candidate/replacement runner uses isolated prepaid path and bounded probe budget | **NOT RUN — WAITS ON 2F HANDOFF/AUTH** | Smoke PASS + mandatory handoff, then exact Stage-1 authorization; run sequential 2h/cap-censored probes and freeze deterministic promotion |
| **2H — Gate 2 Stage 2** | **DONE / TESTED OWNER** — promoted-only 4h confirmation/replacement path exists | **NOT RUN — WAITS ON 2G HANDOFF/AUTH** | Valid Stage-1 promotion + handoff/authorization; run confirmations/replacements and lock final five. Gate-2 PASS completes Phase 2, then mandatory handoff before Phase 3 |

**Current pointer:** Phase 0 PASS → Phase 1/Gate 0 PASS → **Phase 2A live production binding is the first unmet execution prerequisite**. Do not skip 2A merely because 2B–2H code is already implemented.

"""
    if MARKER not in text:
        text = text.replace(heading, heading + status, 1)

    text = replace_once(
        text,
        "The current `v39:security:verify`, `reference:freeze`, `preprobe:freeze`, and `smoke:safety` package entries are stubs and must have been replaced during Phase 0 before Phase 2 starts.",
        "**Current owner status (2026-09-13):** the canonical `v39:security:verify`, `v39:reference:freeze`, `v39:frame:build`, `v39:preprobe:freeze`, `v39:smoke:safety`, `v39:probe:stage1`, and `v39:probe:stage2` entries are real fail-closed owners on the Phase-2 safety branch. Their existence does not manufacture live PASS evidence; use the 2A–2H status table above for the execution pointer.",
        "stale-phase2-stub-status",
    )

    text = replace_once(
        text,
        "- choose exactly one permitted 12-month traffic source ending ≤30 days before frame freeze;",
        "- choose exactly one permitted 12-month exogenous traffic/network source under binding Plan §4.1 semantics: continuous/monthly sources end ≤30 UTC days before frame freeze; an explicitly observed quarterly source frozen under the latest-complete-four-quarter rule may end ≤92 UTC days before frame freeze;",
        "phase2c-freshness-rule",
    )

    LOG.write_text(text, encoding="utf-8")
    print("PASS: Phase-2 implementation-log status and amended reference rule updated exactly")


if __name__ == "__main__":
    main()
