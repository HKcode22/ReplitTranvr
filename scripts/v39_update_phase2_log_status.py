#!/usr/bin/env python3
"""Render the marked Phase-2 status block from canonical repository truth.

This intentionally edits only the block beginning at V39_PHASE2_STATUS_20260913
and ending immediately before "Plan ownership". It refuses on marker drift so a
large implementation log can never be rewritten heuristically.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

LOG = Path("SEPmd/V3.9_IMPLEMENTATION_LOG.md")
STATUS = Path("artifacts/phase2-current-status.json")
MARKER = "<!-- V39_PHASE2_STATUS_20260913 -->"
TERMINATOR = "**Plan ownership:**"


def require_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SystemExit(f"REFUSED:{label}:missing_or_invalid")
    return value.strip()


def status_value(status: dict[str, Any], key: str) -> str:
    return require_string(status.get(key), f"status.{key}")


def is_pass(value: str) -> bool:
    return "PASS" in value and "NOT_PASS" not in value and "WAITING" not in value


def execution_text(value: str) -> str:
    return f"**{value.replace('_', ' ')}**"


def next_condition(key: str, value: str) -> str:
    if is_pass(value):
        return "Complete; preserve the recorded evidence and do not rerun unless an integrity check invalidates it."
    conditions = {
        "phase2a_prerequisite_p": "Complete the production security/retention binding and record cryptographic prerequisite-P PASS before Gate 1.",
        "phase2b_gate1": "Run fresh documented-free Gate-1 coverage only after prerequisite P PASS.",
        "phase2c_reference_rules": "Freeze the run-specific traffic/region reference only after the fresh Gate-1 PASS.",
        "phase2d_final_frame": "Apply and verify only the guarded production 0057 Phase-2D schema contract, then resume after the already-passed 2C reference freeze and rebuild/hash the final frame; do not rerun Gate 1.",
        "phase2e_preprobe_freeze": "After the 2D frame passes and hash-matches its frozen inputs, write/verify the preprobe reference freeze and cryptographic handoff.",
        "phase2f_safety_smoke": "After 2E, freeze the smoke runtime controls, prepare a separate exact run-specific AUTH, obtain human exact-SHA approval, run the mandatory smoke, settle/clean up, then STOP for handoff.",
        "phase2g_gate2_stage1": "Only after 2F PASS/handoff, freeze the shared Gate-2 runtime and obtain a separate exact Stage-1 authorization before sequential probes.",
        "phase2h_gate2_stage2": "Only after deterministic Stage-1 promotion/handoff, obtain a separate exact Stage-2 authorization, run confirmations/replacements, close the shared probe budget day, and record Gate-2 PASS.",
    }
    return conditions[key]


def row(name: str, implementation: str, status_key: str, status: dict[str, Any]) -> str:
    value = status_value(status, status_key)
    return (
        f"| **{name}** | {implementation} | {execution_text(value)} | "
        f"{next_condition(status_key, value)} |"
    )


def render(data: dict[str, Any]) -> str:
    if require_string(data.get("branch"), "branch") != "main":
        raise SystemExit("REFUSED:canonical-status-not-main")
    pointer = require_string(data.get("current_execution_pointer"), "current_execution_pointer")
    status = data.get("status")
    if not isinstance(status, dict):
        raise SystemExit("REFUSED:status-object-missing")

    rows = [
        row(
            "2A — prerequisite P",
            "**DONE / TESTED** — live security/retention verifier, restricted runtime role, App-Storage provider-blob boundary, UNLOGGED prepaid runtime, and cryptographic P-pass owner are implemented.",
            "phase2a_prerequisite_p",
            status,
        ),
        row(
            "2B — Gate 1 coverage",
            "**DONE / TESTED** — documented-free provider health/coverage measurement, hashes, provider pin, per-feed evidence, and artifact verification are implemented.",
            "phase2b_gate1",
            status,
        ),
        row(
            "2C — traffic/region reference freeze",
            "**DONE / TESTED** — binding observed-commercial-movement reference, deterministic tiers, region mapping, source-cadence validation, and write-once run-specific freeze are implemented.",
            "phase2c_reference_rules",
            status,
        ),
        row(
            "2D — final frame",
            "**DONE / TESTED** — final-frame owner uses the fresh coverage plus frozen reference, preserves `UNCLASSIFIED`/`UNMAPPED`, verifies the runtime schema contract, and hashes/persists the frame.",
            "phase2d_final_frame",
            status,
        ),
        row(
            "2E — `preprobe_reference_freeze_record`",
            "**DONE / TESTED** — write-once freeze plus cryptographic handoff owner bind the final frame, 18 cells, exactly 12 dual-eligible HUB candidates, WSSS/OMAA, replacements, normalization, and probe protocol.",
            "phase2e_preprobe_freeze",
            status,
        ),
        row(
            "2F — mandatory safety smoke",
            "**DONE / TESTED OWNER** — exact preprobe + frozen smoke-runtime + exact human-approved AUTH are required; paid smoke enforces reconciliation, raw-before-2xx, cleanup, settlement, and no-foreign-subscription checks.",
            "phase2f_safety_smoke",
            status,
        ),
        row(
            "2G — Gate 2 Stage 1",
            "**DONE / TESTED OWNER** — exact smoke/Gate-2-runtime-bound Stage-1 AUTH, shared 500-credit probe budget day, sequential 12-candidate/replacement execution, and deterministic promotion handoff are implemented.",
            "phase2g_gate2_stage1",
            status,
        ),
        row(
            "2H — Gate 2 Stage 2",
            "**DONE / TESTED OWNER** — exact promotion-bound Stage-2 AUTH, sequential confirmations/replacements, safe budget-day closure, and final Gate-2/Phase-2 PASS recorder are implemented.",
            "phase2h_gate2_stage2",
            status,
        ),
    ]

    return "\n".join(
        [
            MARKER,
            "**Current Phase-2 execution pointer — 2026-09-13 (binding Plan + repository truth):**",
            "",
            "This table separates **implementation readiness** from **live/execution PASS**. A coded/tested owner is not a gate PASS. Execute strictly 2A→2H and stop at the first unmet predecessor.",
            "",
            "| Subphase | Implementation status | Execution / evidence status | Exact next condition |",
            "|---|---|---|---|",
            *rows,
            "",
            f"**Current pointer:** `{pointer}`. The machine-readable source of truth is `artifacts/phase2-current-status.json`; earlier PASS stages are preserved rather than rerun.",
            "",
        ]
    )


def main() -> None:
    text = LOG.read_text(encoding="utf-8")
    data = json.loads(STATUS.read_text(encoding="utf-8"))

    if text.count(MARKER) != 1:
        raise SystemExit(f"REFUSED:phase2-status-marker:expected_exactly_one:found={text.count(MARKER)}")
    marker_index = text.index(MARKER)
    terminator_index = text.find(TERMINATOR, marker_index)
    if terminator_index < 0:
        raise SystemExit("REFUSED:phase2-status-terminator-missing")
    if text.find(MARKER, marker_index + len(MARKER)) >= 0:
        raise SystemExit("REFUSED:duplicate-phase2-status-marker")

    prefix = text[:marker_index]
    suffix = text[terminator_index:]
    updated = prefix + render(data) + suffix
    if updated == text:
        print("PASS: Phase-2 implementation-log status already matches canonical artifact")
        return

    LOG.write_text(updated, encoding="utf-8")
    print(
        "PASS: Phase-2 implementation-log status rendered from "
        f"{STATUS} pointer={data['current_execution_pointer']}"
    )


if __name__ == "__main__":
    main()
