#!/usr/bin/env python3
"""Actual preserved August 2026 BTS historical gate-out vs wheels-off
local-clock contrast. Aggregate only, no prospective feature, native
AeroDataBox identity, UTC rollover, scheduled runway label, or paid GO.
No provider/network/production DB. Input exact SHA pinned.
"""
from __future__ import annotations
import csv
import datetime as dt
import gzip
import hashlib
import json
import math
from collections import Counter
from pathlib import Path
import re
import sys

GZIP_SHA="406587471b44794ea1f574fad2400fc0bafdd85f6898faa8f41b6706294a4614"
RAW_SHA="203509350f574f81728ca51175a17360d0413aa990512f8e0c8f1342f5baf23a"
EXPECTED_ROWS=608389
THRESHOLD=15
# Same origin local HHMM lacks explicit day offset. This prospective
# analysis definition retains a plausibility-bounded modulo elapsed
# contrast, not a certified taxi-out duration. No UTC assignment.
MAX_LOCAL_MINUTES=180
FIELDS=("source_row_number","flight_date","cancelled","diverted",
 "scheduled_gate_departure_local_hhmm","actual_gate_departure_local_hhmm",
 "reported_departure_gate_delay_minutes","actual_wheels_off_local_hhmm",
 "same_tail_predecessor_asof_live_verified","historical_outcome_available_not_before_utc")
def digest(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for b in iter(lambda:f.read(1024*1024),b""):h.update(b)
 return h.hexdigest()
def minutes(v):
 if not v:return None
 if v=="2400":return 0
 if not re.fullmatch("[0-9]{4}",v):raise ValueError("BAD_LOCAL_HHMM")
 h=int(v[:2]);m=int(v[2:])
 if h>23 or m>59:raise ValueError("BAD_LOCAL_HHMM")
 return 60*h+m
def signed(v):
 if not v:return None
 x=float(v)
 if not math.isfinite(x) or abs(x)>=100000:raise ValueError("BAD_SIGNED_DELAY")
 return x
def percentile(counts,p):
 # Exact frequency-weighted nearest-rank quantile, reproducible for ties.
 n=sum(counts.values())
 if not n:return None
 target=max(1,math.ceil(p*n))
 total=0
 for value,k in sorted(counts.items()):
  total+=k
  if total>=target:return value
 raise AssertionError("quantile count")
def distribution(counts):
 n=sum(counts.values())
 return {"n":n,"mean":round(sum(x*k for x,k in counts.items())/n,4) if n else None,
  "p50":percentile(counts,.5),"p90":percentile(counts,.9),"p95":percentile(counts,.95),"p99":percentile(counts,.99)}
def analyze(rows,expected_count=None):
 c=Counter();gate_delays=Counter();elapsed=Counter();paired_gate=Counter();wheels_vs_gate=Counter()
 for n,row in enumerate(rows,1):
  if n>1_000_000:raise ValueError("UNBOUNDED_ROWS")
  if any(k not in row or row[k] is None for k in FIELDS) or None in row:raise ValueError("BAD_FIELDS")
  if row["source_row_number"]!=str(n):raise ValueError("ROW_SEQUENCE")
  date=dt.date.fromisoformat(row["flight_date"])
  if (date.year,date.month)!=(2026,8):raise ValueError("WRONG_MONTH")
  if row["cancelled"] not in ("0","1") or row["diverted"] not in ("0","1"):raise ValueError("BAD_STATUS")
  if row["same_tail_predecessor_asof_live_verified"]!="0" or row["historical_outcome_available_not_before_utc"]!="2026-10-27T00:00:00.000Z":
   raise ValueError("HISTORICAL_ONLY_BOUNDARY")
  c["totalRows"]+=1
  delay=signed(row["reported_departure_gate_delay_minutes"])
  scheduled=minutes(row["scheduled_gate_departure_local_hhmm"])
  gate=minutes(row["actual_gate_departure_local_hhmm"]);wheel=minutes(row["actual_wheels_off_local_hhmm"])
  c["allReportedGateDelayRows"]+=delay is not None
  c["allReportedWheelsOffRows"]+=wheel is not None
  c["allReportedWheelsOff2400Rows"]+=row["actual_wheels_off_local_hhmm"]=="2400"
  if row["cancelled"]=="1":
   c["cancelled"]+=1;c["cancelledWithReportedGateDelay"]+=delay is not None
   continue
  c["nonCancelled"]+=1
  c["phase4NonCancelledWheelsOffExcluding2400"]+=wheel is not None and row["actual_wheels_off_local_hhmm"]!="2400"
  c["divertedNonCancelled"]+=row["diverted"]=="1"
  if delay is None:c["nonCancelledMissingGateDelay"]+=1
  else:
   c["nonCancelledWithGateDelay"]+=1;gate_delays[delay]+=1
   c["nonCancelledGateDelayAtLeast15"]+=delay>=THRESHOLD
  if delay is None or scheduled is None or gate is None or wheel is None:
   c["excludedMissingPairedFields"]+=1;continue
  # Check local reported schedule/gate coherence modulo 24h. DepDelay
  # remains the original signed outcome, not a fabricated day offset.
  if abs(((gate-scheduled-delay+720)%1440)-720)>1e-6:
   c["excludedInconsistentReportedGateClock"]+=1;continue
  contrast=(wheel-gate)%1440
  if contrast>MAX_LOCAL_MINUTES:
   c["excludedLocalElapsedAbove180"]+=1;continue
  c["plausiblePairedRows"]+=1
  c["localClockWrapRows"]+=wheel<gate
  c["pairedGateDelayAtLeast15"]+=delay>=THRESHOLD
  candidate=delay+contrast
  c["pairedWheelsOffVersusScheduledGateAtLeast15"]+=candidate>=THRESHOLD
  c["pairedGateBelow15WheelsVsGateAtLeast15"]+=(delay<THRESHOLD and candidate>=THRESHOLD)
  c["pairedGateBelow15"]+=delay<THRESHOLD
  elapsed[contrast]+=1;paired_gate[delay]+=1;wheels_vs_gate[candidate]+=1
 if expected_count is not None and c["totalRows"]!=expected_count:raise ValueError("ROW_COUNT")
 if c["totalRows"]!=c["cancelled"]+c["nonCancelled"]:raise ValueError("ROW_PARTITION")
 if c["nonCancelled"]!=sum(c[k] for k in ("excludedMissingPairedFields","excludedInconsistentReportedGateClock","excludedLocalElapsedAbove180","plausiblePairedRows")):raise ValueError("PAIR_PARTITION")
 if c["pairedWheelsOffVersusScheduledGateAtLeast15"]-c["pairedGateDelayAtLeast15"]!=c["pairedGateBelow15WheelsVsGateAtLeast15"]:
  raise ValueError("THRESHOLD_PARTITION")
 def rate(a,b):return round(100*c[a]/c[b],4) if c[b] else None
 return {"schema":"v39.phase5.bts-historical-gate-v-wheelsoff-contrast.v1",
  "sourceMonth":"2026-08","normalizedHistoricalOnly":True,"localClockContrastCapMinutes":MAX_LOCAL_MINUTES,
  "thresholdMinutes":THRESHOLD,"counts":dict(c),
  "nonCancelledGateDelayMinutes":distribution(gate_delays),
  "pairedGateDelayMinutes":distribution(paired_gate),
  "pairedPlausibleLocalGateToWheelsOffMinutes":distribution(elapsed),
  "pairedWheelsOffVersusScheduledGateProxyMinutes":distribution(wheels_vs_gate),
  "ratesPct":{"pairedCoverageOfNonCancelled":rate("plausiblePairedRows","nonCancelled"),
   "nonCancelledReportedGateDelayAtLeast15":rate("nonCancelledGateDelayAtLeast15","nonCancelledWithGateDelay"),
   "pairedGateDelayAtLeast15":rate("pairedGateDelayAtLeast15","plausiblePairedRows"),
   "pairedWheelsVsScheduledGateAtLeast15":rate("pairedWheelsOffVersusScheduledGateAtLeast15","plausiblePairedRows"),
   "pairedBelow15GateCrossingThreshold":rate("pairedGateBelow15WheelsVsGateAtLeast15","pairedGateBelow15")},
  "certifiedTaxiOutDuration":False,"scheduledRunwayDelayLabel":False,"globalAdbMatchedFlights":0,
  "originalAeroDataBoxPreRows":0,"sourceRawZipReverified":False,"independentScientificFreeze":False,
  "providerCalls":0,"databaseWrites":0,"phase6PaidGo":False}
def actual(root):
 p=root/"bts_reporting_carrier_2026_08_historic_normalized.csv.gz"
 m=root/"bts_aug2026_historical_manifest.json"
 if not p.is_file() or not m.is_file() or not 1_000_000<p.stat().st_size<50_000_000 or m.stat().st_size>100000:
  raise ValueError("SOURCE_FILES")
 if digest(p)!=GZIP_SHA:raise ValueError("NORMALIZED_SHA")
 a=json.loads(m.read_text(encoding="utf-8"))
 if a.get("sourceMonth")!="2026-08" or a.get("sourceOfficialZipSha256")!=RAW_SHA or a.get("normalizedCsvGzipSha256")!=GZIP_SHA or a.get("totalRows")!=EXPECTED_ROWS or a.get("btsIncludedAsOriginalAeroDataBoxPre") is not False or a.get("phase6PaidGo") is not False:
  raise ValueError("SOURCE_MANIFEST")
 with gzip.open(p,"rt",encoding="utf-8",newline="") as f:
  reader=csv.DictReader(f)
  if len(reader.fieldnames or [])!=len(set(reader.fieldnames or [])) or not set(FIELDS).issubset(reader.fieldnames or []):raise ValueError("HEADER")
  out=analyze(reader,EXPECTED_ROWS)
 c=out["counts"]
 # Original Phase4 parse_hhmm excludes the official 2400 midnight marker;
 # the Phase5 normalizer explicitly preserves it. Phase4 also excludes
 # canceled rows even when they have a reported wheels-off. Compare each same
 # definition against original evidence, not a weaker count tolerance.
 if (c["allReportedGateDelayRows"]!=597734 or c["cancelled"]!=11313 or
    a.get("signedGateDelayLabels")!=c["allReportedGateDelayRows"] or
    a.get("canceled")!=c["cancelled"] or
    a.get("missingWheelsOff")!=EXPECTED_ROWS-c["allReportedWheelsOffRows"] or
    c["phase4NonCancelledWheelsOffExcluding2400"]!=596974):
  raise ValueError("INDEPENDENT_HISTORICAL_COUNTS")
 return {**out,"normalizedCsvGzipSha256":GZIP_SHA,"originalSourceZipSha256HistoricalProvenance":RAW_SHA,
  "preservedArtifactId":14198898471}
def selftest():
 def row(n,s,g,w,delay,cancel="0"):
  return {"source_row_number":str(n),"flight_date":"2026-08-01","cancelled":cancel,"diverted":"0",
   "scheduled_gate_departure_local_hhmm":s,"actual_gate_departure_local_hhmm":g,
   "reported_departure_gate_delay_minutes":delay,"actual_wheels_off_local_hhmm":w,
   "same_tail_predecessor_asof_live_verified":"0","historical_outcome_available_not_before_utc":"2026-10-27T00:00:00.000Z"}
 rows=[row(1,"0800","0805","0821","5"),row(2,"2355","2350","0006","-5"),
       row(3,"0800","0820","0821","20"),row(4,"0800","0810","1500","10"),
       row(5,"0800","0800","","0"),row(6,"0800","","","","1"),row(7,"0800","0810","0820","1")]
 out=analyze(rows,7);c=out["counts"]
 assert c["plausiblePairedRows"]==3 and c["localClockWrapRows"]==1
 assert c["pairedGateDelayAtLeast15"]==1 and c["pairedWheelsOffVersusScheduledGateAtLeast15"]==2
 assert c["pairedGateBelow15WheelsVsGateAtLeast15"]==1 and c["excludedLocalElapsedAbove180"]==1
 assert c["excludedMissingPairedFields"]==1 and c["excludedInconsistentReportedGateClock"]==1
 assert out["pairedPlausibleLocalGateToWheelsOffMinutes"]["p50"]==16
 assert out["phase6PaidGo"] is False and out["scheduledRunwayDelayLabel"] is False
 print("BTS_GATE_WHEELSOFF_CONTRAST_UNIT_TEST_PASS_NO_PROVIDER_NO_GO")
if __name__=="__main__":
 if sys.argv[1:]==["--self-test"]:selftest()
 elif len(sys.argv)==3 and sys.argv[1]=="--actual-preserved":print(json.dumps(actual(Path(sys.argv[2])),sort_keys=True,separators=(",",":")))
 else:raise SystemExit("usage: --self-test or --actual-preserved INPUT_DIR")
