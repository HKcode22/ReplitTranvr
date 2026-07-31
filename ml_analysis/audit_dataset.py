#!/usr/bin/env python3
"""
Comprehensive data quality audit for risk_score_history_v2.csv.

Purpose: per-column, per-row audit to decide what is safe to feed into
XGBoost. Catches: nulls, constants, quote-wrapped values (export artifact),
duplicate/derived columns, heuristic-math columns, manual bucketing, and
per-row vs per-flight label problems.

Usage:
    python3 ml_analysis/audit_dataset.py [path/to/csv]
"""
import csv
import sys
from collections import Counter
from datetime import datetime

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "risk_score_history_v2.csv"

print(f"=== AUDIT: {CSV_PATH} ===\n")


def load(path):
    with open(path) as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        cols = reader.fieldnames
    return rows, cols


def strip_quotes(v):
    """Strip literal surrounding double-quotes (pgAdmin export artifact)."""
    if v and len(v) >= 2 and v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    return v


def clean_rows(rows, cols):
    out = []
    for r in rows:
        c = {k: strip_quotes(v) for k, v in r.items()}
        out.append(c)
    return out


rows_raw, cols = load(CSV_PATH)
rows = clean_rows(rows_raw, cols)

print(f"Total rows: {len(rows)}")
print(f"Total columns: {len(cols)}\n")

# ------------------------------------------------------------------
print("=== 1. QUOTE-WRAPPED VALUES (CSV export artifact) ===")
for c in cols:
    qw = sum(1 for r in rows_raw if r[c] and len(r[c]) >= 2 and r[c].startswith('"') and r[c].endswith('"'))
    if qw:
        print(f"  {c}: {qw}/{len(rows)} wrapped ({qw/len(rows)*100:.1f}%)")
print()

# ------------------------------------------------------------------
print("=== 2. PER-COLUMN NULL / EMPTY COUNT ===")
for c in cols:
    nulls = sum(1 for r in rows if r[c] is None or r[c].strip() == "")
    pct = nulls / len(rows) * 100
    flag = ""
    if pct >= 40:
        flag = "  <-- HEAVY NULL, evaluate drop"
    elif pct >= 5:
        flag = "  <-- some nulls"
    print(f"  {c}: {nulls}/{len(rows)} null ({pct:.1f}%){flag}")
print()

# ------------------------------------------------------------------
print("=== 3. CONSTANT / NEAR-CONSTANT COLUMNS (no signal for ML) ===")
for c in cols:
    vals = [r[c] for r in rows if r[c] and r[c].strip() != ""]
    uniq = set(vals)
    if len(uniq) <= 3:
        top = Counter(vals).most_common(3)
        print(f"  {c}: unique={len(uniq)} values {top}")
print()

# ------------------------------------------------------------------
print("=== 4. SUSPICIOUS VALUE PATTERNS ===")
# Numeric columns that should rarely be exactly 0 but often are sentinel
num_cols = [
    "hours_until_departure", "origin_wind_speed_kt", "origin_gust_speed_kt",
    "origin_visibility_miles", "origin_ceiling_ft", "destination_wind_speed_kt",
    "destination_gust_speed_kt", "destination_visibility_miles",
    "destination_ceiling_ft", "origin_nas_avg_delay_minutes",
    "destination_nas_avg_delay_minutes", "carrier_cancellation_rate_24h",
    "carrier_avg_delay_24h", "carrier_health_sample_size",
    "historical_otp_sample_size", "time_of_day_risk", "day_of_week_risk",
    "connection_risk", "departure_hour", "departure_day_of_week",
]
for c in num_cols:
    if c not in cols:
        continue
    vals = []
    for r in rows:
        try:
            vals.append(float(r[c]))
        except (ValueError, TypeError):
            pass
    if not vals:
        continue
    n = len(vals)
    zeros = sum(1 for v in vals if v == 0)
    neg = sum(1 for v in vals if v < 0)
    # max/min
    mn, mx = min(vals), max(vals)
    sentinel = ""
    if mx == 99999:
        sentinel = " <-- 99999 is 'unlimited ceiling' sentinel (legit)"
    if zeros / n > 0.9 and c not in ("departure_day_of_week",):
        sentinel += f" <-- {zeros/n*100:.0f}% are zero, check if real or fallback"
    print(f"  {c}: n={n} min={mn} max={mx} zeros={zeros/n*100:.0f}% neg={neg}{sentinel}")
print()

# ------------------------------------------------------------------
print("=== 5. DUPLICATE COLUMNS (same value in two columns) ===")
cols_lower = {c.lower(): c for c in cols}
pairs = [
    ("time_of_day_risk", "signal_time_of_day"),
    ("day_of_week_risk", "signal_day_of_week"),
    ("connection_risk", "signal_connection_risk"),
    ("historical_risk", "signal_carrier_health"),
]
for a, b in pairs:
    if not b or a not in cols_lower or b not in cols_lower:
        continue
    a, b = cols_lower[a], cols_lower[b]
    mism = sum(1 for r in rows if r[a] != r[b])
    print(f"  {a} vs {b}: {mism}/{len(rows)} mismatches")
print()

# ------------------------------------------------------------------
print("=== 6. HEURISTIC DERIVED COLUMNS (candidates for drop) ===")
derived = {
    "time_of_day_risk": "riskScorer.timeOfDayRaw(departure_time)",
    "day_of_week_risk": "riskScorer.dayOfWeekRaw(departure_date)",
    "connection_risk": "riskScorer.connectionRiskRaw(departure_time)",
    "horizon": "riskScorer.getHorizon(hours_until_departure)",
    "historical_risk": "mirror of weighted historicalOtp",
    "carrier_health_score": "carrierHealth.computeHealthScore bucketing",
    "carrier_reliable": "carrierHealth sampleSize<3 check",
    "historical_otp_score": "historicalOtp.riskPoints (fallback=5)",
    "historical_otp_source": "source tag, mostly 'fallback'",
}
for c, why in derived.items():
    if c in cols_lower:
        vals = Counter(r[cols_lower[c]] for r in rows if r[cols_lower[c]])
        top = vals.most_common(3)
        print(f"  {c} ({why}): top={top}")
print()

# ------------------------------------------------------------------
print("=== 7. LABEL (actual_delay_minutes) PER-ROW vs PER-FLIGHT ===")
# Same flight, different rows, different delay values => label is time-varying
flight_delays = {}
for r in rows:
    fid = r["monitored_flight_id"]
    if fid not in flight_delays:
        flight_delays[fid] = set()
    if r["actual_delay_minutes"]:
        flight_delays[fid].add(r["actual_delay_minutes"])

multi = sum(1 for s in flight_delays.values() if len(s) > 1)
print(f"  Flights with DIFFERENT delay values across their rows: {multi}/{len(flight_delays)}")
print("  => confirms label is time-varying; back-propagation of final outcome required")
print()

# ------------------------------------------------------------------
print("=== 8. UNIQUE FLIGHTS / ROWS PER FLIGHT ===")
fid_counts = Counter(r["monitored_flight_id"] for r in rows)
print(f"  Unique flights: {len(fid_counts)}")
print(f"  Rows per flight: min={min(fid_counts.values())} max={max(fid_counts.values())} avg={sum(fid_counts.values())/len(fid_counts):.1f}")
print()

# ------------------------------------------------------------------
print("=== 9. is_test_flight ANALYSIS ===")
c = Counter(r["is_test_flight"] for r in rows)
print(f"  is_test_flight: {dict(c)}")
print("  NOTE: is_test=true means AUTO-SEEDED from AeroDataBox (real flight data)")
print("        is_test=false means added by a real user. BOTH are real flights.")
print()

# ------------------------------------------------------------------
print("=== 10. FINAL CLEAN DATASET FOR ML ===")
# Clean: has weather features AND has a label (delay populated)
has_weather = [r for r in rows
               if r["destination_visibility_miles"] and r["destination_visibility_miles"].strip() != ""
               and r["origin_visibility_miles"] and r["origin_visibility_miles"].strip() != ""]
has_label = [r for r in has_weather
             if r["actual_delay_minutes"] and r["actual_delay_minutes"].strip() != ""]
print(f"  Rows with both origin+dest weather: {len(has_weather)}")
print(f"  Rows with weather AND delay label: {len(has_label)}")

# Back-propagate label
flight_outcome = {}
for r in rows:
    fid = r["monitored_flight_id"]
    if fid not in flight_outcome:
        flight_outcome[fid] = {"max_delay": 0.0, "cancelled": False}
    if r["actual_delay_minutes"]:
        try:
            d = float(r["actual_delay_minutes"])
            if d > flight_outcome[fid]["max_delay"]:
                flight_outcome[fid]["max_delay"] = d
        except ValueError:
            pass
    if r["actual_cancelled"] and r["actual_cancelled"].strip().lower() == "true":
        flight_outcome[fid]["cancelled"] = True

for r in has_label:
    fo = flight_outcome.get(r["monitored_flight_id"], {"max_delay": 0, "cancelled": False})
    r["_label"] = 1 if (fo["cancelled"] or fo["max_delay"] >= 15) else 0

pos = sum(1 for r in has_label if r["_label"] == 1)
neg = len(has_label) - pos
print(f"  After back-propagation: {pos} positive, {neg} negative ({pos/len(has_label)*100:.1f}% positive)")
print(f"  Unique flights in clean set: {len(set(r['monitored_flight_id'] for r in has_label))}")
