#!/usr/bin/env python3
"""One finite FREE official BTS U.S. reporting-carrier flight reference sample.

Official PREZIP August 2026 reporting-carrier On-Time Performance file contains
published actual 'WheelsOff' in local time. This is a retrospective U.S.
reporting-carrier subset, not the WSSS provider-observable population, a
predeparture feature, verified scheduled wheels-off, or a join to ADB.

Download no subscription, no provider credentials, one ZIP request; preserve
source archive only in a 2-day GitHub Actions artifact; separate job downloads
and independently recalculates source hash/aggregate, without DB or raw logs.
"""
from __future__ import annotations
import csv
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys
import zipfile
import urllib.request
import urllib.error

SOURCE = ("https://transtats.bts.gov/PREZIP/"
          "On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2026_8.zip")
ROOT = Path("/tmp/v39_gate5_free_bts_aug2026")
ZIP = ROOT / "official_bts_reporting_carrier_2026_8.zip"
SUMMARY = ROOT / "official_bts_reporting_carrier_aug2026_summary.json"
MAX_ZIP = 45_000_000
MAX_UNCOMPRESSED = 600_000_000
MAX_ROWS = 1_000_000
COLUMNS = ("FlightDate", "Reporting_Airline", "Flight_Number_Reporting_Airline",
           "Origin", "Dest", "Cancelled", "Diverted", "WheelsOff",
           "CRSDepTime", "DepTime")
SCHEMA = "v39.phase4.gate5-free-bts-aug2026-reporting-actual-reference.v1"

def guarded(job: str) -> None:
    e = os.environ
    if (e.get("GITHUB_ACTIONS") != "true" or
        e.get("GITHUB_REPOSITORY") != "HKcode22/ReplitTranvr" or
        e.get("GITHUB_REF") != "refs/heads/main" or
        e.get("GITHUB_EVENT_NAME") != "push" or
        e.get("GITHUB_RUN_ATTEMPT") != "1" or
        e.get("GITHUB_JOB") != job or
        e.get("GITHUB_WORKFLOW") !=
          "Phase4 Gate5 Free BTS Actual Reference (No Paid Provider)" or
        not re.fullmatch(r"[a-f0-9]{40}", e.get("GITHUB_SHA","")) or
        e.get("ADB_AUTO_COLLECT") != "0" or
        e.get("V39_PHASE6_PROCESS_ARMED") != "0" or
        any(e.get(k) for k in ("AERODATABOX_API_KEY", "RAPIDAPI_KEY",
              "DATABASE_URL","V39_DATABASE_RUNTIME_URL",
              "GATE05_AUTOMATION_DATABASE_URL"))):
        raise ValueError("P4_G5_BTS_GITHUB_MAIN_NO_SECRETS_HOLD")

def parse_hhmm(value: str) -> str | None:
    if not value:
        return None
    x=value.strip()
    # BTS CSV often stores HHmm as integer-like floating point "1234.00".
    if not re.fullmatch(r"\d{1,4}(?:\.0+)?", x):
        return None
    n=int(x.split(".")[0])
    if n<0 or n>2359 or n%100>59:
        return None
    return f"{n:04d}"

def boolean_field(value: str) -> bool | None:
    if value.strip() in ("0","0.0","0.00"):
        return False
    if value.strip() in ("1","1.0","1.00"):
        return True
    return None

def summarize(zip_path: Path) -> dict[str, object]:
    h=hashlib.sha256()
    with zip_path.open("rb") as handle:
        while chunk:=handle.read(1024*1024):
            h.update(chunk)
    with zipfile.ZipFile(zip_path, "r") as z:
        entries=[m for m in z.infolist() if m.filename.lower().endswith(".csv")]
        if (len(entries)!=1 or
            entries[0].file_size<=1000 or
            entries[0].file_size>MAX_UNCOMPRESSED or
            entries[0].is_dir()):
            raise ValueError("P4_G5_BTS_UNEXPECTED_ARCHIVE_LAYOUT")
        counts={"reportingCarrierRows":0,"actualWheelsOffRows":0,
                "canceledRows":0,"divertedRows":0,"missingWheelsOffRows":0,
                "actualWheelsOffWithNoGateSchedule":0,
                "unclassifiedOrInvalidRows":0}
        with z.open(entries[0],"r") as byte_stream,\
             io.TextIOWrapper(byte_stream,encoding="utf-8-sig",
                              errors="strict",newline="") as text:
            reader=csv.reader(text)
            names=next(reader,None)
            if not names or len(names)>200 or any(x not in names for x in COLUMNS):
                raise ValueError("P4_G5_BTS_REQUIRED_OFFICIAL_FIELDS_MISSING")
            idx={name:names.index(name) for name in COLUMNS}
            if len(names)!=len(set(names)):
                raise ValueError("P4_G5_BTS_DUPLICATED_HEADER")
            for raw in reader:
                if not raw or (len(raw)==1 and not raw[0]):
                    continue
                counts["reportingCarrierRows"]+=1
                if counts["reportingCarrierRows"]>MAX_ROWS or len(raw)!=len(names):
                    raise ValueError("P4_G5_BTS_ROW_BOUNDARY_HOLD")
                try:
                    date=dt.date.fromisoformat(raw[idx["FlightDate"]].strip())
                except ValueError:
                    counts["unclassifiedOrInvalidRows"]+=1
                    continue
                if (date.year!=2026 or date.month!=8 or
                    not re.fullmatch(r"[A-Z0-9]{2,3}",raw[idx["Reporting_Airline"]].strip()) or
                    not re.fullmatch(r"[A-Z]{3}",raw[idx["Origin"]].strip()) or
                    not re.fullmatch(r"[A-Z]{3}",raw[idx["Dest"]].strip()) or
                    not re.fullmatch(r"[0-9A-Z]{1,5}",raw[idx["Flight_Number_Reporting_Airline"]].strip())):
                    counts["unclassifiedOrInvalidRows"]+=1
                    continue
                canceled=boolean_field(raw[idx["Cancelled"]])
                diverted=boolean_field(raw[idx["Diverted"]])
                if canceled is None or diverted is None:
                    counts["unclassifiedOrInvalidRows"]+=1
                    continue
                if canceled:
                    counts["canceledRows"]+=1
                if diverted:
                    counts["divertedRows"]+=1
                actual=parse_hhmm(raw[idx["WheelsOff"]])
                if actual is None or canceled:
                    counts["missingWheelsOffRows"]+=1
                else:
                    counts["actualWheelsOffRows"]+=1
                    if parse_hhmm(raw[idx["CRSDepTime"]]) is None:
                        counts["actualWheelsOffWithNoGateSchedule"]+=1
    if counts["reportingCarrierRows"]<1000:
        raise ValueError("P4_G5_BTS_INSUFFICIENT_MONTHLY_SOURCE")
    if (counts["unclassifiedOrInvalidRows"]>counts["reportingCarrierRows"] or
        counts["actualWheelsOffRows"]+counts["missingWheelsOffRows"]+
           counts["unclassifiedOrInvalidRows"]<counts["reportingCarrierRows"]):
        raise ValueError("P4_G5_BTS_COUNTER_CONTRADICTION")
    return {
        "schema":SCHEMA,
        "source":"US_BTS_REPORTING_CARRIER_ONTIME_PREZIP",
        "sourceUri":SOURCE,
        "sourceMonth":"2026-08",
        "sourceZipSha256":h.hexdigest(),
        "zipCompressedBytes":zip_path.stat().st_size,
        "csvUncompressedBytes":entries[0].file_size,
        "sourceFieldWheelsOffIsReportedActual":True,
        "crsDepTimeIsScheduledGateNotScheduledRunway":True,
        "sourceDataAreHistoricUSReportingCarrierOnly":True,
        "physicalLegMatchedToAeroDataBox":False,
        "worldwideFlightCoverageMeasured":False,
        "predictionSnapshotFromThisPostflightSourcePermitted":False,
        "noOriginalF8ScheduledWheelsOffEvidence":True,
        "actualBtsToAdbFlightReferenceRate":None,
        "strictGate5Passed":False,
        "phase5FreezeAuthorized":False,"phase6Authorized":False,
        "paidProviderCalls":0,"databaseWrites":0,
        **counts
    }

def capture() -> None:
    guarded("capture-free-bts")
    request=urllib.request.Request(
        SOURCE,headers={
         "User-Agent":"ReplitTranvr-Gate5-University-Research/1.0",
         "Accept":"*/*"})
    ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
    total=0
    with urllib.request.urlopen(request,timeout=35) as response,\
        ZIP.open("xb") as out:
        if response.status!=200:
            raise ValueError("P4_G5_BTS_DOWNLOAD_HTTP_NOT_200")
        while True:
            block=response.read(1024*1024)
            if not block:break
            total+=len(block)
            if total>MAX_ZIP:
                raise ValueError("P4_G5_BTS_ARCHIVE_TOO_LARGE")
            out.write(block)
    report=summarize(ZIP)
    SUMMARY.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n")
    print(json.dumps({
        "status":"FREE_BTS_OFFICIAL_MONTHLY_ARCHIVE_OBSERVED_PENDING_ARTIFACT",
        "sourceZipSha256":report["sourceZipSha256"],
        "month":"2026-08",
        "reportingRows":report["reportingCarrierRows"],
        "actualReportedWheelsOffRows":report["actualWheelsOffRows"],
        "canceledRows":report["canceledRows"],
        "sourceFlightLinkageToAdb":False,
        "providerApiUnits":0,"databaseWrites":0
    },sort_keys=True))

def verify() -> None:
    guarded("verify-free-bts")
    expected=json.loads(SUMMARY.read_text())
    actual=summarize(ZIP)
    if actual!=expected:
        raise ValueError("P4_G5_BTS_SOURCE_ARTIFACT_OR_COUNTER_MISMATCH")
    print(json.dumps({
        "schema":SCHEMA,
        "status":"OFFICIAL_FREE_BTS_SOURCE_RECOMPUTED_FROM_DURABLE_ARTIFACT",
        "verifiedArchiveHash":actual["sourceZipSha256"],
        "reportingRows":actual["reportingCarrierRows"],
        "actualReportedWheelsOffRows":actual["actualWheelsOffRows"],
        "missingWheelsOffRows":actual["missingWheelsOffRows"],
        "canceledRows":actual["canceledRows"],
        "unclassifiedOrInvalidRows":actual["unclassifiedOrInvalidRows"],
        "sourceIsUSReportingCarrierHistorical":True,
        "flightLevelJoinToLiveFidsNotPerformed":True,
        "gate5PhysicalFlightDenominatorCertified":False,
        "scheduledWheelsOffReferenceAvailable":False,
        "preSnapshotsPersisted":False,
        "scientificGate5Passed":False,
        "phase5FreezeAuthorized":False,
        "phase6Authorized":False,
        "paidProviderCalls":0,
        "databaseWrites":0
    },sort_keys=True))

def self_test() -> None:
    import tempfile
    cols=list(COLUMNS)
    rows=[
      ("2026-08-05","UA","123","SFO","LAX","0.00","0.00","1203.00","1130.00","1147.00"),
      ("2026-08-06","UA","124","SFO","LAX","1.00","0.00","","1130.00",""),
      ("2026-08-07","WN","789","LAX","SFO","0.00","1.00","2359","2300","2320")
    ]
    with tempfile.TemporaryDirectory() as d:
        p=Path(d)/"test.zip"
        with zipfile.ZipFile(p,"w") as z:
            out=io.StringIO()
            writer=csv.writer(out)
            writer.writerow(cols)
            for _ in range(400):
                for r in rows:
                    writer.writerow(r)
            z.writestr("source.csv",out.getvalue())
        result=summarize(p)
        assert result["reportingCarrierRows"]==1200
        assert result["actualWheelsOffRows"]==800
        assert result["missingWheelsOffRows"]==400
        assert result["canceledRows"]==400
        assert result["divertedRows"]==400
        assert result["unclassifiedOrInvalidRows"]==0
    assert parse_hhmm("930.00")=="0930"
    assert parse_hhmm("2460") is None
    assert parse_hhmm("") is None
    assert boolean_field("1.00") is True
    assert boolean_field("0") is False
    assert boolean_field("foo") is None
    print("P4_G5_FREE_BTS_SELFTEST_PASS")

if __name__=="__main__":
    action=sys.argv[1] if len(sys.argv)==2 else ""
    try:
        if action=="capture":capture()
        elif action=="verify":verify()
        elif action=="--self-test":self_test()
        else:raise ValueError("P4_G5_BTS_UNKNOWN_ACTION")
    except Exception as e:
        # Classify ONLY finite error types; never echo any external response,
        # headers, raw flight rows, URL query values or secrets.
        if isinstance(e, urllib.error.HTTPError):
            code=int(e.code)
            label=("P4_G5_BTS_HTTP_STATUS_"+str(code) if 100<=code<=599
                   else "P4_G5_BTS_HTTP_UNKNOWN")
        elif isinstance(e, urllib.error.URLError):
            label="P4_G5_BTS_NETWORK_UNAVAILABLE"
        elif isinstance(e, (TimeoutError, ConnectionError)):
            label="P4_G5_BTS_NETWORK_TIMEOUT_OR_CONNECT"
        elif isinstance(e, zipfile.BadZipFile):
            label="P4_G5_BTS_ARCHIVE_NOT_ZIP"
        else:
            label=str(e)
            if not re.fullmatch(r"P4_G5_BTS_[A-Z_]+",label):
                label="P4_G5_BTS_SOURCE_FORMAT_OR_RUNTIME_HOLD"
        print(json.dumps({"status":label,"noPaidProviderCalls":True,
                          "noDbWrites":True,"gate5ScientificPass":False}),
              file=sys.stderr)
        sys.exit(2)
