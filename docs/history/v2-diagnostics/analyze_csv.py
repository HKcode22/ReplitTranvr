import csv
from collections import Counter, defaultdict

NEW_THRESHOLD = 13469
SIGNAL_COLS = [
    "signal_inbound_aircraft_delay", "signal_inbound_delay_raw_minutes",
    "signal_atc_ground_stop", "signal_atc_ground_delay",
    "signal_origin_weather", "signal_destination_weather",
    "signal_carrier_health", "signal_time_of_day",
    "signal_day_of_week", "signal_connection_risk"
]

with open("/Users/hk/Downloads/replitTravnr/risk_score_history_v2.csv", newline="") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

total = len(rows)
new_rows = [r for r in rows if int(r["id"]) > NEW_THRESHOLD]
old_rows = [r for r in rows if int(r["id"]) <= NEW_THRESHOLD]
print(f"Total rows: {total}, NEW rows (id > {NEW_THRESHOLD}): {len(new_rows)}, OLD rows: {len(old_rows)}")
print("=" * 70)

# 1. departure_time format
print("\n1. departure_time format (24h vs AM/PM):")
am_pm = []
twenty_four = []
for r in rows:
    t = r["departure_time"].strip()
    if "AM" in t.upper() or "PM" in t.upper():
        am_pm.append(t)
    else:
        twenty_four.append(t)
print(f"   24h format count: {len(twenty_four)}, AM/PM count: {len(am_pm)}")
if am_pm:
    print(f"   AM/PM examples: {am_pm[:10]}")
if twenty_four:
    print(f"   24h examples: {twenty_four[:10]}")

# 2. hours_until_departure negative values in NEW rows
print("\n2. hours_until_departure (NEW rows, id > 13469):")
neg_vals = []
all_vals = []
for r in new_rows:
    v = float(r["hours_until_departure"])
    all_vals.append(v)
    if v < 0:
        neg_vals.append((r["id"], v))
print(f"   Negative count: {len(neg_vals)} / {len(new_rows)}")
if neg_vals:
    print(f"   Examples: {neg_vals[:10]}")
dist = Counter(all_vals)
print(f"   Distribution (top 20): {dist.most_common(20)}")

# 3. equipment_group in NEW rows
print("\n3. equipment_group (NEW rows):")
eg_pop = sum(1 for r in new_rows if r["equipment_group"].strip())
eg_unknown = sum(1 for r in new_rows if not r["equipment_group"].strip())
print(f"   Populated: {eg_pop} ({eg_pop/len(new_rows)*100:.1f}%), Unknown/empty: {eg_unknown} ({eg_unknown/len(new_rows)*100:.1f}%)")

# 4. destination_icao null rate in NEW rows
print("\n4. destination_icao null rate (NEW rows):")
null_dest = [r for r in new_rows if not r["destination_icao"].strip()]
print(f"   Null/empty destination_icao: {len(null_dest)} / {len(new_rows)} ({len(null_dest)/len(new_rows)*100:.2f}%)")
if null_dest:
    carrier_counts = Counter(r["carrier_iata"] for r in null_dest)
    print(f"   Carriers affected: {dict(carrier_counts)}")

# 5. actual_delay_minutes in NEW rows
print("\n5. actual_delay_minutes (NEW rows):")
non_zero_delay = []
for r in new_rows:
    d = r["actual_delay_minutes"].strip()
    if d and float(d) != 0:
        non_zero_delay.append((r["id"], d))
print(f"   Non-zero count: {len(non_zero_delay)} / {len(new_rows)}")
if non_zero_delay:
    print(f"   Non-zero delays (id, value): {non_zero_delay[:20]}")

# 6. actual_cancelled in NEW rows
print("\n6. actual_cancelled (NEW rows):")
cancelled = [r for r in new_rows if r["actual_cancelled"].strip().lower() == "true"]
print(f"   Cancelled: {len(cancelled)} / {len(new_rows)} ({len(cancelled)/len(new_rows)*100:.2f}%)")
if cancelled:
    print(f"   Cancelled flight ids: {[r['id'] for r in cancelled[:20]]}")
    print(f"   Cancelled details (id, carrier, flight): {[(r['id'], r['carrier_iata'], r['flight_number']) for r in cancelled[:20]]}")

# 7. actual_status distribution NEW vs OLD
print("\n7. actual_status distribution:")
new_status = Counter(r["actual_status"] for r in new_rows)
old_status = Counter(r["actual_status"] for r in old_rows)
print(f"   NEW: {dict(new_status)}")
print(f"   OLD: {dict(old_status)}")

# 8. signal columns in NEW rows
print("\n8. Signal columns (NEW rows):")
for col in SIGNAL_COLS:
    vals = [r[col].strip() for r in new_rows]
    c = Counter(vals)
    print(f"   {col}: {dict(c)}")

# 9. carrier_avg_delay_24h
print("\n9. carrier_avg_delay_24h (all rows):")
exceptions = []
for r in rows:
    v = r["carrier_avg_delay_24h"].strip()
    if v and float(v) != 0.0:
        exceptions.append((r["id"], v))
if exceptions:
    print(f"   Exceptions (non-zero): {exceptions[:10]}")
else:
    print("   All values are 0.0 - confirmed.")

# 10. carrier_health_score in NEW rows
print("\n10. carrier_health_score (NEW rows):")
ch_vals = [r["carrier_health_score"].strip() for r in new_rows]
print(f"    Distribution: {dict(Counter(ch_vals))}")

# 11. origin_visibility_miles and origin_ceiling_ft in NEW rows
print("\n11. Weather fields (NEW rows):")
vis_vals = [r["origin_visibility_miles"].strip() for r in new_rows]
ceil_vals = [r["origin_ceiling_ft"].strip() for r in new_rows]
print(f"    origin_visibility_miles: {dict(Counter(vis_vals).most_common(20))}")
print(f"    origin_ceiling_ft: {dict(Counter(ceil_vals).most_common(20))}")

# 12. Constant signals in NEW data
print("\n12. Constant signals in NEW data:")
for col in SIGNAL_COLS:
    vals = [r[col].strip() for r in new_rows]
    uniq = set(vals)
    if len(uniq) == 1:
        print(f"   CONSTANT: {col} = {uniq.pop()}")
    else:
        print(f"   Varied: {col} has {len(uniq)} unique values")

# 13. Cancelled flights and heuristic_score
print("\n13. Cancelled flights -> heuristic_score = 75?")
cancelled_all = [r for r in rows if r["actual_cancelled"].strip().lower() == "true"]
all_good = True
for r in cancelled_all:
    hs = r["heuristic_score"].strip()
    if hs != "75":
        print(f"   Exception: id={r['id']}, heuristic_score={hs}, actual_cancelled={r['actual_cancelled']}")
        all_good = False
if all_good:
    print(f"   YES - all {len(cancelled_all)} cancelled flights have heuristic_score=75")
else:
    print(f"   Total cancelled flights checked: {len(cancelled_all)}")

# 14. Unique scored_at in NEW data
print("\n14. Unique scored_at timestamps (NEW data):")
scored_ats = set(r["scored_at"] for r in new_rows)
print(f"   Unique scored_at count: {len(scored_ats)}")
print(f"   Examples: {list(sorted(scored_ats))[:10]}")
