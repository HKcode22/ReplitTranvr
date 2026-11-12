#!/usr/bin/env python3
"""Convert the EXISTING Phase4 August-2026 BTS official ZIP into isolated, 
provenance-stamped, historical-only CSV.gz. NO network, DB, PRE or paid provider.
Public 2026-08 reporting carrier data, unavailable in August at prediction time.
"""
from __future__ import annotations
import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import zipfile

# Reuse the actual Phase4 clock/flag parser, rather than a second BTS adapter.
from v39_phase4_gate5_free_bts_aug2026_reference_actions import (
    SOURCE, MAX_ROWS, MAX_UNCOMPRESSED, parse_hhmm, boolean_field
)

SCHEMA="v39.phase5.bts-us-aug2026-historical-postflight-training-reference.v1"
REQUIRED=(
 "FlightDate","Reporting_Airline","Flight_Number_Reporting_Airline",
 "Origin","Dest","Tail_Number","Cancelled","Diverted",
 "CRSDepTime","DepTime","DepDelay","WheelsOff",
 "CRSArrTime","ArrTime","ArrDelay","WheelsOn","LateAircraftDelay"
)
OUTPUT=[
 "source_row_number","flight_date","reporting_airline","flight_number",
 "origin_iata","dest_iata","tail_number","cancelled","diverted",
 "scheduled_gate_departure_local_hhmm","actual_gate_departure_local_hhmm",
 "reported_departure_gate_delay_minutes",
 "actual_wheels_off_local_hhmm","scheduled_gate_arrival_local_hhmm",
 "actual_gate_arrival_local_hhmm","reported_arrival_gate_delay_minutes",
 "actual_wheels_on_local_hhmm","reported_late_aircraft_delay_minutes",
 "historical_outcome_available_not_before_utc","source_record_sha256",
 "same_tail_predecessor_asof_live_verified"
]
# BTS release-history page lists August 2026 added on 2026-10-19,
# but the exact official PREZIP archive in our existing Phase4 workflow is
# dated 2026-10-26 15:49 in BTS directory listing. The time zone is
# unspecified, so use 2026-10-27 UTC midnight as a CONSERVATIVE earliest
# feature availability for this particular downloadable archive. Actual
# first verified receipt in our own GitHub run may be LATER.
PUBLISHED_NOT_BEFORE="2026-10-27T00:00:00.000Z"
MAX_ZIP=45_000_000
VALID_TAIL=re.compile(r"^[A-Z0-9-]{2,12}$")
VALID_CARRIER=re.compile(r"^[A-Z0-9]{2,3}$")
VALID_FLIGHT=re.compile(r"^[A-Z0-9]{1,5}$")
VALID_AIRPORT=re.compile(r"^[A-Z]{3}$")
def refuse(code:str)->None: raise ValueError("REFUSED_P5_BTS_HISTORIC_"+code)
def digest_file(path:Path)->str:
 h=hashlib.sha256()
 with path.open("rb") as f:
  while b:=f.read(1024*1024):h.update(b)
 return h.hexdigest()
def integer_minutes(x:str)->str:
 x=x.strip()
 if not x:return ""
 try:n=float(x)
 except ValueError:refuse("INVALID_NONNUMERIC_REPORTED_DELAY")
 if not (n==n and abs(n)<100000):refuse("OUTLIER_OR_NONFINITE_DELAY")
 return str(int(n)) if n.is_integer() else str(n)
def flag(x:str)->str:
 v=boolean_field(x)
 if v is None:refuse("INVALID_CANCEL_DIVERT_STATUS")
 return "1" if v else "0"
def local(x:str)->str:
 # The official 2026 technical directive explicitly permits midnight
 # written 2400. Preserve its original local rollover marker, never
 # silently coerce it to 0000 on an unverified UTC calendar date.
 if re.fullmatch(r"2400(?:\.0+)?",x.strip()):return "2400"
 s=parse_hhmm(x)
 if s is None and x.strip()!="":refuse("INVALID_OR_AMBIGUOUS_HHMM")
 return s or ""
def convert(input_zip:Path,output_dir:Path,allow_fixture:bool=False)->dict:
 if not input_zip.is_file() or input_zip.stat().st_size<100 or (
     input_zip.stat().st_size>MAX_ZIP and not allow_fixture):
  refuse("UNVERIFIED_OR_TOO_LARGE_OFFICIAL_ZIP")
 source_sha=digest_file(input_zip)
 if not allow_fixture:
  # The existing Phase4 verified-source job already produced this exact
  # month/hash and checked its full ZIP. This second stage never invents a
  # new source identity or trusts a similarly named unverified ZIP.
  summary=input_zip.parent/"official_bts_reporting_carrier_aug2026_summary.json"
  if not summary.is_file():refuse("PHASE4_INDEPENDENT_OFFICIAL_SOURCE_MANIFEST_MISSING")
  att=json.loads(summary.read_text(encoding="utf-8"))
  if (att.get("sourceZipSha256")!=source_sha or
      att.get("sourceMonth")!="2026-08" or
      att.get("sourceUri")!=SOURCE or
      att.get("phase5FreezeAuthorized") is not False or
      att.get("phase6Authorized") is not False):
   refuse("PHASE4_ORIGINAL_SOURCE_SHA_OR_HOLD_STATUS_MISMATCH")
 with zipfile.ZipFile(input_zip) as z:
  members=[m for m in z.infolist() if m.filename.lower().endswith(".csv")]
  if len(members)!=1 or members[0].file_size>MAX_UNCOMPRESSED or (
     members[0].file_size<100 and not allow_fixture):
   refuse("INCOMPLETE_OR_UNBOUNDED_CSV_ARCHIVE")
  if members[0].flag_bits & 1:refuse("ENCRYPTED_ARCHIVE")
  output_dir.mkdir(parents=True,exist_ok=True)
  dst=output_dir/"bts_reporting_carrier_2026_08_historic_normalized.csv.gz"
  counts={"totalRows":0,"canceled":0,"diverted":0,
          "missingActualGateOut":0,"missingWheelsOff":0,
          "missingTail":0,"signedGateDelayLabels":0,
          "signedArrivalDelayLabels":0,"lateAircraftDelayReported":0}
  distinct_tails=set()
  with z.open(members[0],"r") as b,open(dst,"wb") as out:
   with io.TextIOWrapper(b,encoding="utf-8-sig",newline="") as t,\
       gzip.GzipFile(fileobj=out,mode="wb",mtime=0,filename="") as zipped,\
       io.TextIOWrapper(zipped,encoding="utf-8",newline="") as w:
    reader=csv.DictReader(t)
    names=reader.fieldnames or []
    if len(names)!=len(set(names)) or any(x not in names for x in REQUIRED):
     refuse("OFFICIAL_BTS_REQUIRED_CSV_FIELDS_MISSING")
    writer=csv.DictWriter(w,fieldnames=OUTPUT,lineterminator="\n")
    writer.writeheader()
    for row in reader:
     if not row or None in row:refuse("CSV_INVALID_FIELD_COUNT")
     counts["totalRows"]+=1
     if counts["totalRows"]>MAX_ROWS:refuse("MORE_THAN_ONE_MILLION_SOURCE_ROWS")
     date=row["FlightDate"].strip()
     try:d=dt.date.fromisoformat(date)
     except ValueError:refuse("INVALID_OFFICIAL_FLIGHT_DATE")
     if (d.year,d.month)!=(2026,8):refuse("NOT_THE_REVIEWED_2026_08_MONTH")
     carrier=row["Reporting_Airline"].strip()
     num=row["Flight_Number_Reporting_Airline"].strip()
     origin=row["Origin"].strip();dest=row["Dest"].strip()
     if not VALID_CARRIER.fullmatch(carrier) or not VALID_FLIGHT.fullmatch(num) or \
         not VALID_AIRPORT.fullmatch(origin) or not VALID_AIRPORT.fullmatch(dest):
      refuse("UNSAFE_OPERATING_ROUTE_OR_FLIGHT_IDENTITY")
     tail=row["Tail_Number"].strip().upper()
     if tail and not VALID_TAIL.fullmatch(tail):refuse("MALFORMED_TAIL_REGISTRATION")
     canc=flag(row["Cancelled"]);div=flag(row["Diverted"])
     dep=integer_minutes(row["DepDelay"])
     arr=integer_minutes(row["ArrDelay"])
     late=integer_minutes(row["LateAircraftDelay"])
     if canc=="1":counts["canceled"]+=1
     if div=="1":counts["diverted"]+=1
     if not tail:counts["missingTail"]+=1
     else:distinct_tails.add(tail)
     gate_out=local(row["DepTime"])
     wheels_off=local(row["WheelsOff"])
     if not gate_out:counts["missingActualGateOut"]+=1
     if not wheels_off:counts["missingWheelsOff"]+=1
     if dep:counts["signedGateDelayLabels"]+=1
     if arr:counts["signedArrivalDelayLabels"]+=1
     if late:counts["lateAircraftDelayReported"]+=1
     # Distinct carrier/flight/date/route ≠ same operating leg as ADB; source
     # SHA is a provenance digest only, not independent identity proof.
     stable={k:row[k] for k in REQUIRED}
     record_sha=hashlib.sha256(json.dumps(stable,sort_keys=True,
       separators=(",",":")).encode("utf-8")).hexdigest()
     writer.writerow({
      "source_row_number":counts["totalRows"],"flight_date":date,
      "reporting_airline":carrier,"flight_number":num,
      "origin_iata":origin,"dest_iata":dest,"tail_number":tail,
      "cancelled":canc,"diverted":div,
      "scheduled_gate_departure_local_hhmm":local(row["CRSDepTime"]),
      "actual_gate_departure_local_hhmm":gate_out,
      "reported_departure_gate_delay_minutes":dep,
      "actual_wheels_off_local_hhmm":wheels_off,
      "scheduled_gate_arrival_local_hhmm":local(row["CRSArrTime"]),
      "actual_gate_arrival_local_hhmm":local(row["ArrTime"]),
      "reported_arrival_gate_delay_minutes":arr,
      "actual_wheels_on_local_hhmm":local(row["WheelsOn"]),
      "reported_late_aircraft_delay_minutes":late,
      "historical_outcome_available_not_before_utc":PUBLISHED_NOT_BEFORE,
      "source_record_sha256":record_sha,
      "same_tail_predecessor_asof_live_verified":"0"
     })
 if not allow_fixture and counts["totalRows"]<1000:refuse("OFFICIAL_MONTH_TOO_FEW_FLIGHTS")
 manifest={
  "schema":SCHEMA,"source":"BTS_TRANTSTATS_REPORTING_CARRIER_ONTIME",
  "sourceUri":SOURCE,"sourceMonth":"2026-08",
  "sourceOfficialZipSha256":source_sha,
  "sourceZipBytes":input_zip.stat().st_size,
  "normalizedCsvGzipSha256":digest_file(dst),
  "normalizedCompressedBytes":dst.stat().st_size,
  "publicBtsReleaseDate2026_10_19VerifiedFromReleasePage":True,
  "historicalAvailableNotBeforeUtc":PUBLISHED_NOT_BEFORE,
  "localAirportHHmmNotConvertedToUtc":True,
  "sourceRowFlightKeysNotIndependentlyMatchedToAerodatabox":True,
  "allRowTailLinksUnverifiedForLiveAsOf":True,
  "btsIncludedAsOriginalAeroDataBoxPre":False,
  "btsGateOutLabelUsedAsWheelsoffLabel":False,
  "btsPostflightLabelsAllowedBeforeHistoricalPublication":False,
  "retrospectiveUSOnly":True,"carrierAndReportingSelectionBiasUnmeasured":True,
  "actualProductionBtsRowsWritten":0,"phase5ScientificFreeze":False,
  "phase6PaidGo":False,"providerCalls":0,"databaseWrites":0,
  "distinctTailRegistrationsReported":len(distinct_tails),
  **counts
 }
 (output_dir/"bts_aug2026_historical_manifest.json").write_text(
  json.dumps(manifest,indent=2,sort_keys=True)+"\n",encoding="utf-8")
 return manifest
def selftest():
 with tempfile.TemporaryDirectory() as temp:
  root=Path(temp);z=root/"fixture.zip"
  with zipfile.ZipFile(z,"w",compression=zipfile.ZIP_DEFLATED) as archive:
   sink=io.StringIO();writer=csv.DictWriter(sink,fieldnames=REQUIRED)
   writer.writeheader()
   for i in range(3):
    r={k:"" for k in REQUIRED}
    r.update({"FlightDate":"2026-08-01","Reporting_Airline":"UA",
     "Flight_Number_Reporting_Airline":str(101+i),"Origin":"SFO",
     "Dest":"LAX","Tail_Number":"N123AA","Cancelled":"1" if i==1 else "0",
     "Diverted":"0","CRSDepTime":"0800","DepTime":"" if i==1 else "0840",
     "DepDelay":"" if i==1 else "40.00","WheelsOff":"" if i==1 else "0901",
     "CRSArrTime":"0930","ArrTime":"1041" if i!=1 else "",
     "ArrDelay":"71" if i!=1 else "","WheelsOn":"1030" if i!=1 else "",
     "LateAircraftDelay":"20" if i!=1 else ""})
    writer.writerow(r)
   archive.writestr("official_fixture.csv",sink.getvalue())
  m=convert(z,root/"out",allow_fixture=True)
  assert m["totalRows"]==3 and m["canceled"]==1 and m["missingWheelsOff"]==1
  assert m["signedGateDelayLabels"]==2 and m["distinctTailRegistrationsReported"]==1
  assert m["phase6PaidGo"] is False and m["databaseWrites"]==0
  assert all(row["same_tail_predecessor_asof_live_verified"]=="0" for row in
    csv.DictReader(io.TextIOWrapper(gzip.open(root/"out"/
      "bts_reporting_carrier_2026_08_historic_normalized.csv.gz","rb"))))
  with zipfile.ZipFile(z,"w",compression=zipfile.ZIP_DEFLATED) as archive:
   archive.writestr("fake.csv","field\njunk\n")
  try:convert(z,root/"bad",allow_fixture=True)
  except ValueError as e:assert "REQUIRED_CSV_FIELDS_MISSING" in str(e)
  else:raise AssertionError("Missing BTS columns unexpectedly accepted")
 print("P5_BTS_HISTORICAL_LANE_SELFTEST_PASS_NO_PROVIDER_NO_DB_NO_PRE")
if __name__=="__main__":
 if sys.argv[1:]==["--self-test"]:selftest()
 elif len(sys.argv)==4 and sys.argv[1]=="normalize":
  source=Path(sys.argv[2]);out=Path(sys.argv[3])
  if source.resolve()!=Path(
    "/tmp/v39_gate5_free_bts_aug2026/official_bts_reporting_carrier_2026_8.zip"
   ).resolve() and os.getenv("GITHUB_ACTIONS")=="true":
   refuse("ONLY_THE_EXISTING_PHASE4_OFFICIAL_GH_ARTIFACT_ACCEPTED")
  m=convert(source,out)
  print(json.dumps({k:m[k] for k in (
   "schema","sourceMonth","sourceOfficialZipSha256",
   "normalizedCsvGzipSha256","totalRows","canceled","missingTail",
   "signedGateDelayLabels","phase6PaidGo")},sort_keys=True))
 else:raise SystemExit("usage: ... --self-test | normalize EXISTING_OFFICIAL_ZIP OUT_DIR")
