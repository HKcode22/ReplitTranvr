#!/usr/bin/env python3
"""Apply the reviewed Phase-2 open-reference amendment to the binding V3.9-f.8 Plan.

This is intentionally assertion-driven. It changes only the exact §4.1/§4.5
sentences reviewed in SEPmd/V3.9_PHASE2_PLAN_AMENDMENT_PROPOSAL.md. If the
binding Plan has drifted, it refuses instead of guessing.
"""
from pathlib import Path

PLAN = Path("SEPmd/V3.9_DataCollectPlan_f.8.md")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"REFUSED:{label}:expected_exactly_one_match:found={count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = PLAN.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "### 4.1 Global traffic-tier assignment (binding)\n\nTier must be measured independently of Phase-6 outcomes; missing traffic data can never be replaced by blanket REGIONAL assignment.",
        "### 4.1 Global traffic-tier assignment (binding)\n\n**Phase-2 open-reference correction (2026-09-13; pre-probe, same V3.9-f.8):** the exogenous §4 reference may use either published scheduled commercial service or an explicitly labeled observed commercial-movement/network reference derived from independent historical operations. The selected semantics are frozen before any paid Stage-1/Stage-2 probe, are never chosen from delay/yield/outcome results, and must be used consistently throughout §4.1/§4.5. Observed movements MUST NOT be described as published schedules, passenger demand, or the Phase-6 FIDS population. This correction changes only the independent sampling/balancing proxy; all missing-data, hashing, tiering, eligibility, anti-leakage, and authorization rules remain binding.\n\nTier must be measured independently of Phase-6 outcomes; missing traffic data can never be replaced by blanket REGIONAL assignment.",
        "section-4.1-correction-note",
    )

    text = replace_once(
        text,
        "| Source | MEASURE→FREEZE: choose one actually accessible/licensed reference. OAG/Cirium access is NOT assumed. If no permitted source is available, `TRAFFIC_REFERENCE=BLOCKED` and final frame rebuild cannot pass |",
        "| Source | MEASURE→FREEZE: choose one actually accessible/licensed exogenous airport-activity reference. Freeze `reference_semantics` as either `scheduled_commercial_service` or `observed_commercial_movements`; OAG/Cirium access is NOT assumed. An observed reference must come from independent historical operations, remain explicitly labeled observed, and satisfy the frozen §4.5 quality/coverage rules. If no permitted source satisfies the selected semantics, `TRAFFIC_REFERENCE=BLOCKED` and final frame rebuild cannot pass |",
        "section-4.1-source-row",
    )

    text = replace_once(
        text,
        "| Reference period | **Single 12-month window ending ≤30 days before frame freeze** (e.g. `2025-08-04` through `2026-08-03` when frame freeze is `2026-09-02`) — never a rolling window that moves during Phase 6 |",
        "| Reference period | Freeze exactly one 12-month window and never roll it during Phase 6. For continuously/monthly available sources, the window must end **≤30 UTC calendar days before frame freeze**. For a **quarterly published source explicitly frozen under the latest-complete-quarter rule**, use the latest complete four consecutive source quarters available at reference freeze; the reference end may be at most **92 UTC calendar days** before frame freeze. If a newer complete quarter has been publicly released before reference freeze, rebuild using the newest four consecutive complete quarters. The selected cadence/freshness rule is frozen before any paid probe/yield observation. |",
        "section-4.1-reference-period-row",
    )

    text = replace_once(
        text,
        "### 4.5 Frame-balancing reference variables (binding)\n\n| Variable | Source | Formula / definition | Reference period | Missing policy | Manifest fields |",
        "### 4.5 Frame-balancing reference variables (binding)\n\nThe frozen `reference_semantics` from §4.1 controls the terms below. Under `scheduled_commercial_service`, the original scheduled-service definitions apply. Under `observed_commercial_movements`, use the explicitly observed definitions in this table and never relabel them as published schedules. The reference remains exogenous to Phase-6 sampling/outcomes in either case.\n\n| Variable | Source | Formula / definition | Reference period | Missing policy | Manifest fields |",
        "section-4.5-semantics-note",
    )

    text = replace_once(
        text,
        "| **Network degree** | Permitted/licensed scheduled-route reference (for example OAG, a lawfully retained historical FIDS-derived artifact, or airline schedule data), never the future Phase-6 population | Directed: `out-degree = distinct destinations with ≥1 scheduled departure/week`; `in-degree` similarly; `undirected degree = distinct connected airports either direction`; report all three, primary = undirected | Same 12-month window as traffic tier | No schedule data → `degree=NULL, degree_unverified=true` | `degree_source, degree_period, degree_threshold (≥1/week), degree_version` |",
        "| **Network degree** | Same permitted/licensed exogenous reference frozen under §4.1, never the future Phase-6 population | If `scheduled_commercial_service`: directed `out-degree = distinct destinations with ≥1 scheduled departure/week`; `in-degree` similarly; primary = undirected degree. If `observed_commercial_movements`: directed out-/in-degree use distinct resolved airport connections with **≥53 observed resolved movements over the fixed 365-day reference**; primary = undirected degree. Report all three and freeze the threshold semantics. | Same 12-month window as traffic tier | Missing qualifying route data → `degree=NULL, degree_unverified=true` | `degree_source, degree_period, degree_threshold, degree_version, reference_semantics` |",
        "section-4.5-network-degree-row",
    )

    text = replace_once(
        text,
        "| **Carrier diversity** | Same external reference schedule (NOT `flight_population`) | `carrier_count = distinct operating carriers with ≥5% of departures at airport`; primary metric `effective carriers = 1/HHI` where `HHI=Σp_i²`; alternative `Shannon H=-Σp ln p` reported but not primary | Same 12-month | No data → NULL | `carrier_diversity_source, carrier_period, carrier_metric (1/HHI), carrier_threshold` |",
        "| **Carrier diversity** | Same exogenous reference frozen under §4.1 (NOT `flight_population`) | Primary metric remains `effective carriers = 1/HHI` where `HHI=Σp_i²`; also report `carrier_count` at the frozen 5% share threshold and Shannon `H=-Σp ln p`. For scheduled semantics, shares are scheduled departures. For observed semantics, shares are resolved observed departures using only the upstream operating-airline ICAO field; missing/invalid operator rows are not replaced by callsign-prefix guesses, and `carrier_coverage_share` must be reported. | Same 12-month | No qualifying operator data → NULL | `carrier_diversity_source, carrier_period, carrier_metric (1/HHI), carrier_threshold, carrier_coverage_share, reference_semantics` |",
        "section-4.5-carrier-row",
    )

    text = replace_once(
        text,
        "| **International/domestic mix** | Same external reference (NOT `flight_population`) | `intl_share = international scheduled departures / total scheduled departures` (route-level intl = origin country ≠ destination country) | Same | NULL | `intl_source, intl_period` |",
        "| **International/domestic mix** | Same exogenous reference frozen under §4.1 (NOT `flight_population`) | Route-level international means origin country ≠ destination country. For scheduled semantics: `intl_share = international scheduled departures / scheduled departures with known country pair`. For observed semantics: `intl_share = international resolved observed departures / resolved observed departures with known country pair`. | Same | NULL | `intl_source, intl_period, reference_semantics` |",
        "section-4.5-international-row",
    )

    PLAN.write_text(text, encoding="utf-8")
    print("PASS: binding V3.9-f.8 §4.1/§4.5 Phase-2 reference amendment applied exactly")


if __name__ == "__main__":
    main()
