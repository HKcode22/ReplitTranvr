#!/usr/bin/env python3
"""
Analyze flight_data_pre_post export for data-quality issues.

Accepts EITHER the JSON dump (flight_data_pre_post.json) or the CSV export
(flight_data_pre_post.csv). JSON preserves NULL vs '' vs 'null' correctly;
for a CSV the analyzer strips CSV quoting/artifacts so the numbers match the
DB table (note: CSV re-exports can double-quote timestamp cells — see
MDplan/V3_OvernightRun_Diagnosis.md §2; the analyzer handles both).

Usage:
    python3 scripts/analyze_flight_data_pre_post.py [path/to/flight_data_pre_post.json|.csv]

What it checks, column group by column group:
  1. Identity + carrier + times      (should be ~always filled)
  2. status / status_code            (numeric enum from AeroDataBox)
  3. codeshare_status                (numeric enum)
  4. greatCircleDistance (gcd_*)     (capitalized keys in real payload)
  5. departure/arrival quality[]     (numeric codes)
  6. flightPlan (fp_*)               (often absent in real payloads)
  7. location / ADS-B (loc_*)        (should be null pre-departure)
  8. sampling metadata               (batch/tier/probability/weight)
  9. subscription / balance meta
 10. date/time sanity                (utc vs local, runway vs scheduled)

It prints, for each column: how many rows are non-null, how many distinct
values, and the top values — so you can see exactly where data is being
lost.
"""

import csv
import json
import sys
from collections import Counter
from datetime import datetime

PATH = sys.argv[1] if len(sys.argv) > 1 else "flight_data_pre_post.csv"


def _clean(v):
    """Strip CSV double-quote artifacts (e.g. '"2026-...Z"' -> '2026-...Z')."""
    if isinstance(v, str):
        v = v.strip()
        if len(v) >= 2 and v.startswith('"') and v.endswith('"'):
            v = v[1:-1].replace('""', '"').strip()
    return v


def load(path: str) -> list[dict]:
    if path.endswith(".csv"):
        with open(path, newline="", encoding="utf-8") as f:
            return [{k: _clean(v) for k, v in row.items()} for row in csv.DictReader(f)]
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def nonnull(v):
    return v is not None and v != "" and v != "null"


def report(cols: list[tuple[str, str]], rows: list[dict], n: int):
    """cols = [(column_name, label), ...]. Prints fill-rate + distinct + top."""
    for col, label in cols:
        vals = Counter(r.get(col) for r in rows)
        nn = sum(1 for r in rows if nonnull(r.get(col)))
        distinct = len(vals)
        top = ", ".join(f"{k}={v}" for k, v in vals.most_common(4) if k is not None)
        pct = 100 * nn / n if n else 0
        flag = "OK" if pct > 95 else ("MIXED" if pct > 0 else "EMPTY")
        print(f"[{flag}] {col:32s} {label:22s} nonnull={nn}/{n} ({pct:4.0f}%) distinct={distinct} top: {top or '-'}")


def main():
    rows = load(PATH)
    n = len(rows)
    print(f"== flight_data_pre_post export analysis ==")
    print(f"rows: {n}\n")

    print("## 1. Identity / carrier / flight numbers")
    report([
        ("id", "row id"),
        ("flight_number", "flight #"),
        ("carrier_iata", "carrier"),
        ("carrier_icao", "carrier icao"),
        ("carrier_name", "carrier name"),
        ("call_sign", "callsign"),
        ("is_cargo", "is cargo"),
        ("aircraft_reg", "tail number"),
        ("aircraft_model", "aircraft model"),
    ], rows, n)

    print("\n## 2. status / status_code (numeric enum in payload)")
    report([("status", "status"), ("status_code", "status code")], rows, n)

    print("\n## 3. codeshare_status (numeric enum in payload)")
    report([("codeshare_status", "codeshare")], rows, n)

    print("\n## 4. greatCircleDistance (gcd_*)")
    report([
        ("gcd_km", "km"),
    ], rows, n)

    print("\n## 5. departure quality[] (numeric codes in payload)")
    report([("dep_quality", "dep quality")], rows, n)
    report([("arr_quality", "arr quality")], rows, n)

    print("\n## 6. Live ADS-B location (loc_*) — null = not airborne / no position")
    report([
        ("loc_lat", "lat"), ("loc_lon", "lon"), ("loc_altitude_ft", "alt ft"),
        ("loc_ground_speed_kt", "gs kt"), ("loc_vsi_fpm", "vsi"),
        ("data_stage", "data stage"), ("has_live_location", "has live loc"),
    ], rows, n)

    print("\n## 8. Sampling metadata (batch stamping)")
    report([
        ("sampling_batch_id", "batch"),
        ("airport_tier", "tier"),
        ("is_randomized", "randomized"),
        ("airport_layer_design_probability", "design prob"),
        ("planned_share", "planned share"),
        ("sampling_weight", "weight"),
        ("random_seed", "seed"),
    ], rows, n)

    print("\n## 9. Subscription / balance meta")
    report([
        ("subscription_id", "sub id"),
        ("subject_type", "subj type"),
        ("subject_id", "subj id (airport)"),
        ("subscription_is_active", "sub active"),
        ("credits_remaining", "credits left"),
        ("balance_last_refilled_utc", "refilled"),
        ("balance_last_deducted_utc", "deducted"),
    ], rows, n)

    print("\n## 10. Date/time sanity")
    report([
        ("dep_scheduled_utc", "dep sched"),
        ("dep_revised_utc", "dep revised"),
        ("dep_runway_utc", "dep runway"),
        ("arr_scheduled_utc", "arr sched"),
        ("arr_runway_utc", "arr runway"),
        ("last_updated_utc", "last updated"),
        ("received_at", "received"),
    ], rows, n)

    # JSON columns (payload_json raw — source of truth; flat mirror removed §15)
    print("\n## 11. JSON payload columns")
    for col, label in [("payload_json", "raw payload"),
                       ("subscription_notices", "subscription notices")]:
        n_json = sum(1 for r in rows if nonnull(r.get(col)))
        print(f"  {col} ({label}): {n_json}/{n} populated")
        if n_json:
            v = next(r.get(col) for r in rows if nonnull(r.get(col)))
            if isinstance(v, str):
                try:
                    v = json.loads(v)
                except Exception:
                    pass
            keys = list(v.keys()) if isinstance(v, dict) else (v if isinstance(v, list) else [])
            sample = ", ".join(str(k) for k in keys[:12])
            print(f"    e.g. keys: {sample}")

    # runway - scheduled delay signal
    deltas = []
    for r in rows:
        d = r.get("dep_runway_utc")
        s = r.get("dep_scheduled_utc")
        if nonnull(d) and nonnull(s):
            try:
                deltas.append((datetime.fromisoformat(d.replace("Z", "+00:00")) -
                               datetime.fromisoformat(s.replace("Z", "+00:00"))).total_seconds() / 60)
            except ValueError:
                pass
    if deltas:
        print(f"\n[delay signal] rows with both dep_runway_utc + dep_scheduled_utc: {len(deltas)}")
        print(f"  min={min(deltas):.0f} min  max={max(deltas):.0f} min  mean={sum(deltas)/len(deltas):.0f} min")

    # duplicate dedup keys
    dk = [r.get("dedup_key") for r in rows]
    print(f"\n[dedup] unique dedup_key: {len(set(dk))} of {n} rows (dups: {n - len(set(dk))})")

    # dep airport spread (bias check)
    dep = Counter(r.get("dep_airport_icao") for r in rows if nonnull(r.get("dep_airport_icao")))
    print(f"\n[bias] distinct dep airports: {len(dep)}")
    print("  top 15:", ", ".join(f"{k}({v})" for k, v in dep.most_common(15)))

    # time span
    times = [r.get("received_at") for r in rows if nonnull(r.get("received_at"))]
    if times:
        print(f"\n[timespan] received_at from {min(times)} to {max(times)}")


if __name__ == "__main__":
    main()
