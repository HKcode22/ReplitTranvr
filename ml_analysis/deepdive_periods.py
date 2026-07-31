#!/usr/bin/env python3
"""
Deep dive: May-June vs July data + how the monitor produces so many rows.

Answers:
1. When were May-June rows actually scored? (scored_at vs departure_date)
2. Were May-June rows created in real-time or by the July rescore?
3. Why is there no 'long' horizon / why are most July rescore rows post-departure?
4. How do 17k July rows come from 967 flights when the monitor caps at 41/cycle?
5. Pre-departure vs post-departure rows by date (affects the train/test split).

Usage: python3 ml_analysis/deepdive_periods.py
"""
import csv
from collections import defaultdict, Counter

CSV = "risk_score_history_v2.csv"


def strip_quotes(v):
    if v and len(v) >= 2 and v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    return v


with open(CSV) as f:
    reader = csv.DictReader(f)
    rows = [dict((k, strip_quotes(v)) for k, v in r.items()) for r in reader]

print("=== 1. WHEN WERE MAY/JUNE ROWS ACTUALLY SCORED? ===")
# scored_at tells us the real scoring time. departure_date tells us the flight date.
# If scored_at is in July for a May flight => it was RESCORED, not originally monitored.
mayjune = [r for r in rows if (r["departure_date"] or "")[:10].startswith(("2026-05", "2026-06"))]
print(f"May/June rows total: {len(mayjune)}")
scored_months = Counter((r["scored_at"] or "")[:7] for r in mayjune)
print(f"  scored_at month distribution: {dict(sorted(scored_months.items()))}")
for r in mayjune[:3]:
    print(f"  sample: flight={r['flight_number']} dep={r['departure_date'][:10]} scored={r['scored_at'][:19]} "
          f"hours_until={r['hours_until_departure']} delay={r['actual_delay_minutes']}")

july = [r for r in rows if (r["departure_date"] or "")[:10].startswith("2026-07")]
scored_jul = Counter((r["scored_at"] or "")[:10] for r in july)
print(f"\\nJuly rows total: {len(july)}")
print(f"  scored_at day distribution (top): {dict(sorted(scored_jul.items())[:15])}")
print("  => May/June rows were ALL scored in July = created by the RESCORE, "
      "not by original real-time monitoring.")
print()

print("=== 2. FLIGHT COUNT MATH: 41/cycle vs 967 flights ===")
print("The seeder inserts ~72 real flights/day (6 airports x 4 time buckets x 3 flights).")
print("Flights stay in the table until archived (36h after departure).")
print("So the DB accumulates ~72-150 active flights per day, and the monitor")
print("rotates through them 41 per cycle, every 60 min. Each flight is scored")
print("many times before archiving -> many rows per flight.")
flights_per_day = defaultdict(set)
for r in july:
    flights_per_day[(r["departure_date"] or "")[:10]].add(r["monitored_flight_id"])
print("\\nUnique flights departing per day (July):")
for d in sorted(flights_per_day):
    print(f"  {d}: {len(flights_per_day[d])} flights")
print(f"  TOTAL unique July flights: {len(set(r['monitored_flight_id'] for r in july))}")
print()

print("=== 3. PRE vs POST DEPARTURE BY DATE (critical for split design) ===")
for d in sorted(flights_per_day):
    sub = [r for r in july if (r["departure_date"] or "")[:10] == d]
    pre = sum(1 for r in sub if float(r["hours_until_departure"]) > 0)
    post = len(sub) - pre
    hrs = [float(r["hours_until_departure"]) for r in sub]
    print(f"  {d}: rows={len(sub):5d} pre={pre:5d} post={post:5d} "
          f"avg_hours={sum(hrs)/len(hrs):+6.1f} min={min(hrs):+7.1f}")
print()
print("=> July 20-23 (rescore) is mostly POST-departure rows.")
print("=> July 25-29 (live monitor) is mostly PRE-departure rows.")
print("=> So a 'train on 20-22, test on 25-29' temporal split = testing")
print("   generalization from post-departure features to pre-departure features.")
print()

print("=== 4. HOW MANY PRE-DEPARTURE ROWS DO WE HAVE? (the production domain) ===")
pre_all = [r for r in july if float(r["hours_until_departure"]) > 0]
post_all = [r for r in july if float(r["hours_until_departure"]) <= 0]
print(f"  July pre-departure rows: {len(pre_all)} ({len(pre_all)/len(july)*100:.0f}%)")
print(f"  July post-departure rows: {len(post_all)} ({len(post_all)/len(july)*100:.0f}%)")
# labels for pre-departure rows (back-propagated)
outcome = {}
for r in rows:
    fid = r["monitored_flight_id"]
    if fid not in outcome:
        outcome[fid] = {"d": 0.0, "c": False}
    try:
        dd = float(r["actual_delay_minutes"]) if r["actual_delay_minutes"].strip() else 0.0
        if dd > outcome[fid]["d"]:
            outcome[fid]["d"] = dd
    except ValueError:
        pass
    if r["actual_cancelled"] and r["actual_cancelled"].strip().lower() == "true":
        outcome[fid]["c"] = True

pos_pre = sum(1 for r in pre_all if outcome[r["monitored_flight_id"]]["c"] or outcome[r["monitored_flight_id"]]["d"] >= 15)
print(f"  Pre-departure rows labeled positive (back-prop): {pos_pre} ({pos_pre/len(pre_all)*100:.1f}%)")
print()

print("=== 5. INBOUND DELAY RAW MINUTES (potential feature we dropped) ===")
ir = [float(r["signal_inbound_delay_raw_minutes"]) for r in july
      if r["signal_inbound_delay_raw_minutes"] and r["signal_inbound_delay_raw_minutes"].strip()]
vals = ir
nonz = sum(1 for v in vals if v > 0)
print(f"  July rows with inbound_delay_raw_minutes: {len(ir)}/{len(july)} ({len(ir)/len(july)*100:.1f}%)")
print(f"  nonzero: {nonz} ({nonz/len(vals)*100:.1f}%), max={max(vals):.0f}, mean={sum(vals)/len(vals):.1f}")
print("  => this is RAW data from the flight-status API (inbound aircraft delay in minutes),")
print("     NOT heuristic math. It should be re-added as a feature.")
print()

print("=== 6. CONSTANT/NULL AUDIT WITHIN THE KEPT JULY FEATURES ===")
keep = [
    "carrier_iata", "origin_iata", "destination_iata",
    "hours_until_departure", "departure_hour", "departure_day_of_week",
    "origin_flight_category", "origin_wind_speed_kt", "origin_gust_speed_kt",
    "origin_visibility_miles", "origin_ceiling_ft", "origin_has_thunderstorm",
    "destination_flight_category", "destination_wind_speed_kt", "destination_gust_speed_kt",
    "destination_visibility_miles", "destination_ceiling_ft", "destination_has_thunderstorm",
    "origin_has_ground_stop", "origin_has_ground_delay", "origin_nas_avg_delay_minutes",
    "destination_has_ground_stop", "destination_has_ground_delay", "destination_nas_avg_delay_minutes",
    "carrier_cancellation_rate_24h", "carrier_avg_delay_24h", "carrier_health_sample_size",
    "equipment_group",
]
for c in keep:
    n = len(july)
    nulls = sum(1 for r in july if not r[c] or r[c].strip() == "")
    non = [r[c] for r in july if r[c] and r[c].strip() != ""]
    uniq = len(set(non))
    try:
        num = [float(v) for v in non]
        zeros = sum(1 for v in num if v == 0)
        flag = f" zeros={zeros/len(non)*100:.0f}%"
        info = f"min={min(num):.2f} max={max(num):.2f}{flag}"
    except (ValueError, TypeError):
        top = Counter(non).most_common(3)
        info = f"top={top}"
    flag2 = "  <-- CONSTANT" if uniq <= 1 and nulls == 0 else ""
    print(f"  {c}: null={nulls}/{n} unique={uniq} {info}{flag2}")
