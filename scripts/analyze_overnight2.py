#!/usr/bin/env python3
"""
Overnight-2 dataset analysis: sampling stamps, per-batch stats, route-graph
connectivity (the GNN concern), tail-number rotation chains, hour-of-day
spread and delay distribution. Run on the latest export:

    python3 scripts/analyze_overnight2.py flight_data_pre_post7.csv
"""
import csv
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta

PATH = sys.argv[1] if len(sys.argv) > 1 else "flight_data_pre_post7.csv"


def clean(v):
    if isinstance(v, str):
        v = v.strip()
        if len(v) >= 2 and v.startswith('"') and v.endswith('"'):
            v = v[1:-1].replace('""', '"').strip()
    return v


def dt(v):
    if not v or v == "null":
        return None
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError:
        return None


rows = []
with open(PATH, newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        rows.append({k: clean(v) for k, v in r.items()})

n = len(rows)
print(f"rows={n}\n")

# ---- per-batch / per-subscription breakdown ----
print("## per batch_id")
by_batch = defaultdict(list)
for r in rows:
    by_batch[r.get("sampling_batch_id") or "(adhoc)"].append(r)
for b, rs in sorted(by_batch.items()):
    uniq_flights = len({r.get("dedup_key") for r in rs})
    tiers = Counter(r.get("airport_tier") for r in rs)
    subs = Counter(r.get("subject_id") for r in rs)
    stages = Counter(r.get("data_stage") for r in rs)
    print(f"{b}: rows={len(rs)} uniq_flights={uniq_flights} stage={dict(stages)} "
          f"tiers={dict(tiers)} top_airports={subs.most_common(3)}")

# ---- route graph connectivity (union-find over dep->arr edges) ----
parent = {}

def find(x):
    parent.setdefault(x, x)
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x

def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[ra] = rb

edges = set()
nodes = set()
for r in rows:
    d, a = r.get("dep_airport_icao"), r.get("arr_airport_icao")
    if d and a:
        edges.add((d, a))
        nodes.update((d, a))
        union(d, a)
print(f"\n## route graph (unique flights as edges)")
print(f"dep airports={len({r.get('dep_airport_icao') for r in rows if r.get('dep_airport_icao')})} "
      f"arr airports={len({r.get('arr_airport_icao') for r in rows if r.get('arr_airport_icao')})}")
print(f"unique directed route pairs (dep,arr)={len(edges)} from {len(nodes)} nodes")
comp = defaultdict(int)
for node in nodes:
    comp[find(node)] += 1
sizes = sorted(comp.values(), reverse=True)
print(f"connected components={len(sizes)}  largest={sizes[:5]}")
print(f"largest component holds {sizes[0]}/{len(nodes)} airports "
      f"({100*sizes[0]/len(nodes):.0f}%) of all distinct airports in dataset")

# do we see both directions of the top route pairs? (bidirectional edge check)
two_way = sum(1 for (a, b) in edges if (b, a) in edges)
print(f"route pairs seen in BOTH directions: {two_way} of {len(edges)}")

# ---- tail-number rotation chains (the lag-feature concern) ----
tails = Counter(clean(r.get("aircraft_reg")) for r in rows)
tails.pop("", None)
reused = {t: c for t, c in tails.items() if c >= 2}
print(f"\n## tail rotation")
print(f"tails with >=2 captures: {len(reused)} of {len(tails)} total tails "
      f"({100*sum(reused.values())/sum(tails.values()):.0f}% of tail captures are re-captures)")
chain = Counter()
for t, c in reused.items():
    chain[c] += 1
print(f"tail re-capture counts: {dict(sorted(chain.items()))}")

# ---- hour-of-day spread (capture times, UTC) ----
hours = Counter(dt(r.get("received_at")).hour for r in rows if dt(r.get("received_at")))
hours_s = " ".join(f"{h}:{hours[h]}" for h in range(24) if hours[h])
print(f"\n## received_at hour (UTC) distribution\n{hours_s}")

# ---- delay stats by data stage ----
def mins(key_rw, key_sc):
    out = []
    for r in rows:
        rw, sc = dt(r.get(key_rw)), dt(r.get(key_sc))
        if rw and sc:
            out.append((rw - sc).total_seconds() / 60)
    return out

def bucket(vals, label):
    if not vals:
        print(f"  {label}: none")
        return
    print(f"  {label}: min={min(vals):.0f} mean={sum(vals)/len(vals):.0f} max={max(vals):.0f} n={len(vals)}")

print("\n## delay (runway - scheduled, minutes)")
bucket(mins("dep_runway_utc", "dep_scheduled_utc"), "departure")
bucket(mins("arr_runway_utc", "arr_scheduled_utc"), "arrival")
bucket(mins("arr_revised_utc", "arr_scheduled_utc"), "arrival revised")

# ---- credits observed during the free ad-hoc era vs batch era ----
crs = [int(r.get("credits_remaining")) for r in rows if r.get("credits_remaining")]
if crs:
    print(f"\n## credits_remaining on rows: min={min(crs)} max={max(crs)}")
    ts = sorted(dt(r.get("received_at")) for r in rows if dt(r.get("received_at")))
    print(f"first row={ts[0]} last row={ts[-1]} span_hours={(ts[-1]-ts[0]).total_seconds()/3600:.1f}")