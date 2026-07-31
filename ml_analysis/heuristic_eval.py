#!/usr/bin/env python3
"""
Heuristic performance evaluation + final ML feature set determination.

Runs against the CLEAN dataset (rows with weather + label).
Back-propagates the flight's final outcome as the label.
Then evaluates the heuristic (heuristic_tier) as a classifier,
split by pre-departure / post-departure.

Also prints the FINAL feature list for XGBoost after removing:
  - heuristic-derived / signal columns
  - manual bucketing columns (carrier_health_score, carrier_reliable)
  - fallback-only / constant columns (historical_otp_*, freezing flags)
  - high-null or redundant columns (icao, tail_number, equipment_type)

Usage:
    python3 ml_analysis/heuristic_eval.py [path/to/csv]
"""
import csv
import sys
from collections import Counter

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "risk_score_history_v2.csv"


def strip_quotes(v):
    if v and len(v) >= 2 and v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    return v


with open(CSV_PATH) as f:
    reader = csv.DictReader(f)
    cols = reader.fieldnames
    rows = [dict((k, strip_quotes(v)) for k, v in r.items()) for r in reader]

# ------------------------------------------------------------------
# Build clean set: weather present on BOTH ends + delay label present
# ------------------------------------------------------------------
clean = [
    r for r in rows
    if r["destination_visibility_miles"] and r["destination_visibility_miles"].strip()
    and r["origin_visibility_miles"] and r["origin_visibility_miles"].strip()
    and r["actual_delay_minutes"] and r["actual_delay_minutes"].strip() != ""
]

# ------------------------------------------------------------------
# Back-propagate the flight's FINAL outcome to every row
# ------------------------------------------------------------------
flight_outcome = {}
for r in rows:
    fid = r["monitored_flight_id"]
    if fid not in flight_outcome:
        flight_outcome[fid] = {"max_delay": 0.0, "cancelled": False}
    try:
        d = float(r["actual_delay_minutes"]) if r["actual_delay_minutes"].strip() else 0.0
        if d > flight_outcome[fid]["max_delay"]:
            flight_outcome[fid]["max_delay"] = d
    except ValueError:
        pass
    if r["actual_cancelled"] and r["actual_cancelled"].strip().lower() == "true":
        flight_outcome[fid]["cancelled"] = True

for r in clean:
    fo = flight_outcome[r["monitored_flight_id"]]
    r["_label"] = 1 if (fo["cancelled"] or fo["max_delay"] >= 15) else 0

print("=== CLEAN DATASET ===")
print(f"Rows: {len(clean)}")
print(f"Unique flights: {len(set(r['monitored_flight_id'] for r in clean))}")
pos = sum(1 for r in clean if r["_label"])
print(f"Labeled positive (final delay>=15 or cancelled): {pos} ({pos/len(clean)*100:.1f}%)")
print(f"Labeled negative: {len(clean)-pos} ({(len(clean)-pos)/len(clean)*100:.1f}%)")
print()

# ------------------------------------------------------------------
# Heuristic as classifier (tier = green / amber / red)
# ------------------------------------------------------------------
def conf_matrix(rows, pos_col, pred_fn):
    tp = fp = tn = fn = 0
    for r in rows:
        p = 1 if r[pos_col] else 0
        pred = pred_fn(r)
        if pred == 1 and p == 1:
            tp += 1
        elif pred == 1 and p == 0:
            fp += 1
        elif pred == 0 and p == 0:
            tn += 1
        else:
            fn += 1
    return tp, fp, tn, fn


def stats(tp, fp, tn, fn, label):
    prec = tp / (tp + fp) if (tp + fp) else 0
    rec = tp / (tp + fn) if (tp + fn) else 0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0
    print(f"  {label}: TP={tp} FP={fp} TN={tn} FN={fn}")
    print(f"    Precision={prec*100:.1f}%  Recall={rec*100:.1f}%  F1={f1*100:.1f}%")


def pred_red(r):
    return 1 if r["heuristic_tier"] == "red" else 0


def pred_amber_red(r):
    return 1 if r["heuristic_tier"] in ("red", "amber") else 0


print("=== HEURISTIC PERFORMANCE (all clean rows, label=back-propagated) ===")
stats(*conf_matrix(clean, "_label", pred_red), "RED = positive")
stats(*conf_matrix(clean, "_label", pred_amber_red), "AMBER+RED = positive")
print()

pre = [r for r in clean if float(r["hours_until_departure"]) > 0]
post = [r for r in clean if float(r["hours_until_departure"]) <= 0]
print(f"=== PRE-DEPARTURE rows: {len(pre)} (hours_until_departure > 0) ===")
stats(*conf_matrix(pre, "_label", pred_red), "RED")
stats(*conf_matrix(pre, "_label", pred_amber_red), "AMBER+RED")
print()
print(f"=== POST-DEPARTURE rows: {len(post)} ===")
stats(*conf_matrix(post, "_label", pred_red), "RED")
stats(*conf_matrix(post, "_label", pred_amber_red), "AMBER+RED")
print()

# ------------------------------------------------------------------
# FINAL FEATURE SET
# ------------------------------------------------------------------
print("=== FINAL XGBOOST FEATURE SET ===")
KEEP = [
    # route / schedule
    "carrier_iata", "origin_iata", "destination_iata",
    "hours_until_departure", "departure_hour", "departure_day_of_week",
    # origin weather (raw METAR-derived)
    "origin_flight_category", "origin_wind_speed_kt", "origin_gust_speed_kt",
    "origin_visibility_miles", "origin_ceiling_ft", "origin_has_thunderstorm",
    # destination weather (raw METAR-derived)
    "destination_flight_category", "destination_wind_speed_kt", "destination_gust_speed_kt",
    "destination_visibility_miles", "destination_ceiling_ft", "destination_has_thunderstorm",
    # NAS / ATC (raw)
    "origin_has_ground_stop", "origin_has_ground_delay", "origin_nas_avg_delay_minutes",
    "destination_has_ground_stop", "destination_has_ground_delay", "destination_nas_avg_delay_minutes",
    # carrier raw metrics (real, computed from DB)
    "carrier_cancellation_rate_24h", "carrier_avg_delay_24h", "carrier_health_sample_size",
    # aircraft
    "equipment_group",
]
print(f"Count: {len(KEEP)}")
for c in KEEP:
    print(f"  {c}")
print()

DROP = {
    # IDs / labels / metadata
    "id", "monitored_flight_id", "scored_at",
    "actual_delay_minutes", "actual_cancelled", "actual_status",
    "flight_number", "departure_date", "departure_time",
    "is_test_flight", "agency_id",
    # heuristic outputs (leak the target)
    "heuristic_score", "heuristic_tier", "historical_risk",
    # heuristic intermediate math (also duplicated below)
    "signal_inbound_aircraft_delay", "signal_inbound_delay_raw_minutes",
    "signal_atc_ground_stop", "signal_atc_ground_delay",
    "signal_origin_weather", "signal_destination_weather",
    "signal_carrier_health", "signal_time_of_day", "signal_day_of_week",
    "signal_connection_risk",
    # EXACT duplicates of signal_* columns (verified: 0 mismatches)
    "time_of_day_risk", "day_of_week_risk", "connection_risk",
    # derived from hours_until_departure (never 'long')
    "horizon",
    # MANUAL bucketing of raw carrier metrics (user confirmed)
    "carrier_health_score", "carrier_reliable",
    # 100% fallback / constant (sample_size=0, source='fallback', score 2/3)
    "historical_otp_score", "historical_otp_sample_size", "historical_otp_source",
    # near-constant booleans (origin 100% false, dest 99.99% false)
    "origin_has_freezing", "destination_has_freezing",
    # high-null (66%/60%) + redundant
    "origin_icao", "destination_icao", "tail_number", "equipment_type",
    # JSON program arrays (mostly empty, high cardinality)
    "nas_origin_programs", "nas_destination_programs",
}
print(f"=== DROPPED ({len(DROP)} columns) ===")
for c in sorted(DROP):
    print(f"  {c}")
print()

# Verify all columns accounted for
missing = set(cols) - set(KEEP) - DROP - {"raw_api_data"}
if missing:
    print(f"WARNING: unaccounted columns: {missing}")
else:
    print(f"Accounted: {len(KEEP)}+{len(DROP)} = {len(KEEP)+len(DROP)} of {len(cols)} columns (raw_api_data excluded)")

# ------------------------------------------------------------------
# Rows surviving if we ALSO drop rows with null in any KEEP column
# ------------------------------------------------------------------
print()
print("=== ROWS WITH NULL IN ANY KEPT FEATURE ===")
bad = 0
for r in clean:
    for c in KEEP:
        if not r[c] or r[c].strip() == "":
            bad += 1
            break
print(f"Rows with null in any kept feature: {bad}/{len(clean)}")
print(f"Final training rows: {len(clean) - bad}")
