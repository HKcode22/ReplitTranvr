#!/usr/bin/env python3
"""Evaluate MrAirspace quarterly flight-schedule extracts for V3.9 Phase 2.

This is deliberately a CANDIDATE evaluator, not the production freeze owner.
It downloads the four ODbL quarterly Parquet releases covering 2025-07-01
through 2026-06-30, verifies the release SHA-256 digests published by GitHub,
removes quarter-boundary overlap exactly as the upstream README instructs, and
aggregates only provider-independent airport/route/operator statistics.

Important semantics:
- the upstream project calls these "flight schedules", but the records are
  derived from observed ADS-B tracks plus callsign-route enrichment;
- this script therefore labels the metric observed_commercial_movements and
  NEVER calls it published/scheduled airline departures;
- ambiguous origin/destination candidates are excluded unless the callsign
  route-validation field yields exactly one ICAO origin and destination;
- raw rows are deleted after each quarter and are never committed.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import tempfile
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import duckdb
import requests
from timezonefinder import TimezoneFinder

REFERENCE_START = date(2025, 7, 1)
REFERENCE_END = date(2026, 6, 30)
MIN_AIRPORT_MOVEMENTS = 53
MIN_ROUTE_MOVEMENTS = 53
ICAO4 = re.compile(r"^[A-Z0-9]{4}$")
OPERATOR3 = re.compile(r"^[A-Z]{3}$")
ISO2 = re.compile(r"^[A-Z]{2}$")
ICAO_TOKEN = re.compile(r"[A-Z0-9]{4}")
OURAIRPORTS_URL = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv"

QUARTERS = [
    {
        "label": "2025_Q3",
        "months": {7, 8, 9},
        "url": "https://github.com/MrAirspace/aircraft-flight-schedules/releases/download/aircraft_flight_schedules_2025_quarter3/2025_Q3_detailed_github.parquet",
        "sha256": "aa9936affcd07b3ad60b7d166484e4fdf71b52eb4d4085e8b53401f8e3ff889b",
        "bytes": 970997726,
    },
    {
        "label": "2025_Q4",
        "months": {10, 11, 12},
        "url": "https://github.com/MrAirspace/aircraft-flight-schedules/releases/download/aircraft_flight_schedules_2025_quarter4/2025_Q4_detailed_github.parquet",
        "sha256": "f540e9264292a0476b35302da2249d54c5f4833046258a0d75b7a979c7f884de",
        "bytes": 871154403,
    },
    {
        "label": "2026_Q1",
        "months": {1, 2, 3},
        "url": "https://github.com/MrAirspace/aircraft-flight-schedules/releases/download/aircraft_flight_schedules_2026_quarter1/2026_Q1_detailed_github.parquet",
        "sha256": "12ec161c7f1739934053d743625bb48e86b3785c3fcb0549b0e08ae93b1199ce",
        "bytes": 840340093,
    },
    {
        "label": "2026_Q2",
        "months": {4, 5, 6},
        "url": "https://github.com/MrAirspace/aircraft-flight-schedules/releases/download/aircraft_flight_schedules_2026_quarter2/2026_Q2_detailed_github.parquet",
        "sha256": "2bef8bc41b9c5fc0708271859362a10d9a703a15ad57863e7e934bf3738226db",
        "bytes": 911949077,
    },
]


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_json(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def download_verified(url: str, path: Path, expected_sha: str, expected_bytes: int) -> Dict[str, Any]:
    h = hashlib.sha256()
    total = 0
    with requests.get(url, stream=True, timeout=(30, 300), allow_redirects=True) as response:
        response.raise_for_status()
        with path.open("wb") as out:
            for chunk in response.iter_content(4 * 1024 * 1024):
                if not chunk:
                    continue
                out.write(chunk)
                h.update(chunk)
                total += len(chunk)
    actual = h.hexdigest()
    if actual != expected_sha:
        raise RuntimeError(f"MRAIRSPACE_SHA256_MISMATCH:{path.name}:{actual}:{expected_sha}")
    if total != expected_bytes:
        raise RuntimeError(f"MRAIRSPACE_SIZE_MISMATCH:{path.name}:{total}:{expected_bytes}")
    return {"url": url, "sha256": actual, "bytes": total}


def qident(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def resolve(columns: Iterable[str], name: str) -> str:
    by_lower = {str(column).lower(): str(column) for column in columns}
    hit = by_lower.get(name.lower())
    if not hit:
        raise RuntimeError(f"MRAIRSPACE_REQUIRED_COLUMN_MISSING:{name}")
    return hit


def parse_icao_tokens(value: Any) -> List[str]:
    text = str(value or "").strip().upper()
    if not text or text == "-":
        return []
    return ICAO_TOKEN.findall(text)


def resolve_route(origin_raw: Any, destination_raw: Any, validation_raw: Any) -> Tuple[str | None, str | None, str]:
    validation = parse_icao_tokens(validation_raw)
    if len(validation) == 2 and validation[0] != validation[1]:
        return validation[0], validation[1], "callsign_validation"
    origins = parse_icao_tokens(origin_raw)
    destinations = parse_icao_tokens(destination_raw)
    if len(origins) == 1 and len(destinations) == 1 and origins[0] != destinations[0]:
        return origins[0], destinations[0], "track_unique"
    return None, None, "ambiguous_or_missing"


def quarter_aggregate(path: Path, quarter: Dict[str, Any]) -> Tuple[Counter, Dict[Tuple[str, str], Counter], Counter, Dict[str, Any]]:
    con = duckdb.connect(":memory:")
    try:
        columns = [row[0] for row in con.execute("DESCRIBE SELECT * FROM read_parquet(?)", [str(path)]).fetchall()]
        required = {
            "airline": resolve(columns, "Airline"),
            "callsign": resolve(columns, "Callsign"),
            "origin_time": resolve(columns, "Track_Origin_DateTime_UTC"),
            "origin_airports": resolve(columns, "Track_Origin_ApplicableAirports"),
            "destination_airports": resolve(columns, "Track_Destination_ApplicableAirports"),
            "route_validation": resolve(columns, "Route_Validation_Based_on_Callsign"),
        }
        mlist = ",".join(str(m) for m in sorted(quarter["months"]))
        rows = con.execute(
            f"""
            SELECT
              upper(trim(CAST({qident(required['airline'])} AS VARCHAR))) AS airline,
              upper(trim(CAST({qident(required['callsign'])} AS VARCHAR))) AS callsign,
              CAST({qident(required['origin_airports'])} AS VARCHAR) AS origin_airports,
              CAST({qident(required['destination_airports'])} AS VARCHAR) AS destination_airports,
              CAST({qident(required['route_validation'])} AS VARCHAR) AS route_validation,
              count(*)::BIGINT AS n
            FROM read_parquet(?)
            WHERE try_cast({qident(required['origin_time'])} AS TIMESTAMP) IS NOT NULL
              AND extract(month FROM try_cast({qident(required['origin_time'])} AS TIMESTAMP)) IN ({mlist})
              AND CAST(try_cast({qident(required['origin_time'])} AS TIMESTAMP) AS DATE) BETWEEN ? AND ?
            GROUP BY 1,2,3,4,5
            """,
            [str(path), REFERENCE_START.isoformat(), REFERENCE_END.isoformat()],
        ).fetchall()
    finally:
        con.close()

    routes: Counter = Counter()
    route_operators: Dict[Tuple[str, str], Counter] = defaultdict(Counter)
    qc = Counter()
    route_source = Counter()
    for airline, callsign, origin_raw, destination_raw, validation_raw, n in rows:
        n = int(n)
        qc["inside_quarter_rows"] += n
        origin, destination, source = resolve_route(origin_raw, destination_raw, validation_raw)
        route_source[source] += n
        if not origin or not destination or not ICAO4.fullmatch(origin) or not ICAO4.fullmatch(destination):
            qc["route_unresolved"] += n
            continue
        route = (origin, destination)
        routes[route] += n
        operator = str(airline or "").strip().upper()
        if OPERATOR3.fullmatch(operator):
            route_operators[route][operator] += n
            qc["valid_operator_rows"] += n
        else:
            # Callsign prefix is diagnostic only; never silently substituted for the upstream Airline field.
            cs = str(callsign or "").strip().upper()
            if len(cs) >= 3 and OPERATOR3.fullmatch(cs[:3]):
                qc["callsign_prefix_available_but_not_used"] += n
            qc["invalid_or_missing_airline"] += n
    return routes, route_operators, qc, {"route_resolution": dict(route_source), "columns": required}


def load_airports(path: Path) -> Dict[str, Dict[str, Any]]:
    result: Dict[str, Dict[str, Any]] = {}
    timezone_finder = TimezoneFinder(in_memory=True)
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            icao = (row.get("icao_code") or row.get("gps_code") or row.get("ident") or "").strip().upper()
            country = (row.get("iso_country") or "").strip().upper()
            if not ICAO4.fullmatch(icao) or not ISO2.fullmatch(country):
                continue
            try:
                lat = float(row.get("latitude_deg") or "")
                lon = float(row.get("longitude_deg") or "")
                if not (math.isfinite(lat) and -90 <= lat <= 90 and math.isfinite(lon) and -180 <= lon <= 180):
                    lat = lon = None
            except Exception:
                lat = lon = None
            tz = timezone_finder.timezone_at(lng=lon, lat=lat) if lat is not None and lon is not None else None
            result[icao] = {
                "country_iso2": country,
                "latitude": lat,
                "longitude_e": lon,
                "airport_timezone": tz,
                "scheduled_service": (row.get("scheduled_service") or "").strip().lower() == "yes",
            }
    return result


def diversity(counts: Counter) -> Tuple[float, int, float]:
    total = sum(counts.values())
    if total <= 0:
        return 0.0, 0, 0.0
    hhi = 0.0
    shannon = 0.0
    count5 = 0
    for n in counts.values():
        p = n / total
        hhi += p * p
        if p >= 0.05:
            count5 += 1
        if p > 0:
            shannon -= p * math.log(p)
    return (1.0 / hhi if hhi else 0.0), count5, shannon


def percentile(values: List[float], q: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, min(len(ordered) - 1, math.ceil(q * len(ordered)) - 1))]


def build(workdir: Path) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    airports_path = workdir / "ourairports.csv"
    airports_meta = download_verified_ourairports(airports_path)
    airports = load_airports(airports_path)

    all_routes: Counter = Counter()
    route_operators: Dict[Tuple[str, str], Counter] = defaultdict(Counter)
    qc = Counter()
    sources: List[Dict[str, Any]] = []
    quarter_diagnostics: Dict[str, Any] = {}

    for quarter in QUARTERS:
        local = workdir / f"{quarter['label']}.parquet"
        source = download_verified(quarter["url"], local, quarter["sha256"], quarter["bytes"])
        source["label"] = quarter["label"]
        source["quarter_months"] = sorted(quarter["months"])
        routes, operators, q_qc, q_diag = quarter_aggregate(local, quarter)
        all_routes.update(routes)
        for route, counts in operators.items():
            route_operators[route].update(counts)
        qc.update(q_qc)
        quarter_diagnostics[quarter["label"]] = {"qc": dict(q_qc), **q_diag}
        sources.append(source)
        local.unlink(missing_ok=True)

    observed_routes: Counter = Counter()
    observed_route_operators: Dict[Tuple[str, str], Counter] = {}
    excluded_missing_metadata = 0
    excluded_non_scheduled_airport = 0
    for route, n in all_routes.items():
        origin, destination = route
        om = airports.get(origin)
        dm = airports.get(destination)
        if not om or not dm:
            excluded_missing_metadata += n
            continue
        if not om["scheduled_service"] or not dm["scheduled_service"]:
            excluded_non_scheduled_airport += n
            continue
        observed_routes[route] += n
        observed_route_operators[route] = route_operators.get(route, Counter())

    departures = Counter()
    carrier_coded_departures = Counter()
    origin_operators: Dict[str, Counter] = defaultdict(Counter)
    out_neighbors = defaultdict(set)
    in_neighbors = defaultdict(set)
    international = Counter()
    country_known = Counter()
    for (origin, destination), n in observed_routes.items():
        departures[origin] += n
        country_known[origin] += n
        if airports[origin]["country_iso2"] != airports[destination]["country_iso2"]:
            international[origin] += n
        if n >= MIN_ROUTE_MOVEMENTS:
            out_neighbors[origin].add(destination)
            in_neighbors[destination].add(origin)
        ops = observed_route_operators[(origin, destination)]
        op_n = sum(ops.values())
        if op_n:
            carrier_coded_departures[origin] += op_n
            origin_operators[origin].update(ops)

    rows: List[Dict[str, Any]] = []
    for icao, n in departures.items():
        if n < MIN_AIRPORT_MOVEMENTS:
            continue
        meta = airports[icao]
        effective, count5, shannon = diversity(origin_operators[icao])
        coverage = carrier_coded_departures[icao] / n if n else 0.0
        rows.append({
            "icao": icao,
            "traffic_metric_value": int(n),
            "country_iso2": meta["country_iso2"],
            "longitude_e": meta["longitude_e"],
            "airport_timezone": meta["airport_timezone"],
            "out_degree": len(out_neighbors[icao]),
            "in_degree": len(in_neighbors[icao]),
            "undirected_degree": len(out_neighbors[icao] | in_neighbors[icao]),
            "effective_carriers": effective if carrier_coded_departures[icao] > 0 else None,
            "carrier_count_5pct": count5 if carrier_coded_departures[icao] > 0 else None,
            "carrier_shannon": shannon if carrier_coded_departures[icao] > 0 else None,
            "carrier_coverage_share": max(0.0, min(1.0, coverage)),
            "intl_share": international[icao] / country_known[icao] if country_known[icao] else None,
        })
    rows.sort(key=lambda row: (-row["traffic_metric_value"], row["icao"]))

    provenance = {
        "source_name": "MrAirspace aircraft-flight-schedules",
        "source_repository": "https://github.com/MrAirspace/aircraft-flight-schedules",
        "source_semantics": "global high-level flight schedules extracted from ADS-B observations plus callsign-route validation; not a published airline schedule feed",
        "license": "ODbL-1.0",
        "reference_period_start": REFERENCE_START.isoformat(),
        "reference_period_end": REFERENCE_END.isoformat(),
        "source_files": sources,
        "ourairports": airports_meta,
        "known_source_caveats": [
            "2026_Q2 May 5-7 missing or considerably incomplete per upstream release notes",
            "upstream notes occasional duplicates and incomplete tracks; 2025-Q2+ linking improved but is not perfect",
            "coverage follows ADSB.lol receiver coverage and is not guaranteed complete worldwide",
        ],
        "algorithm": {
            "quarter_overlap": "retain only Track_Origin_DateTime_UTC whose month belongs to the release quarter, per upstream README",
            "route_resolution": "prefer exactly-two-ICAO callsign validation; otherwise require exactly one track-origin and exactly one track-destination ICAO; ambiguous rows excluded",
            "commercial_scope": "origin and destination must both be OurAirports scheduled_service=yes",
            "operator": "upstream Airline field must be exactly three letters; callsign prefix is diagnostic only",
            "airport_min_movements": MIN_AIRPORT_MOVEMENTS,
            "route_degree_threshold": MIN_ROUTE_MOVEMENTS,
            "timezone": "timezonefinder coordinate-derived IANA timezone from OurAirports coordinates",
        },
    }
    coverages = [row["carrier_coverage_share"] for row in rows]
    candidate = {
        "schema_version": "v3.9-mrairspace-reference-candidate-1",
        "status": "CANDIDATE_NOT_FROZEN",
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "reference_period_start": REFERENCE_START.isoformat(),
        "reference_period_end": REFERENCE_END.isoformat(),
        "traffic_metric_name": "observed_commercial_movements",
        "traffic_metric_units": "resolved observed departures per 12-month period",
        "semantics_warning": "NOT published/scheduled airline departures; ADS-B observed movement-derived reference",
        "provenance_sha256": sha256_json(provenance),
        "airports": rows,
    }
    diagnostics = {
        "schema_version": "v3.9-mrairspace-reference-diagnostics-1",
        "status": "PASS_CANDIDATE_BUILT",
        "provenance": provenance,
        "qc": dict(qc),
        "quarter_diagnostics": quarter_diagnostics,
        "resolved_observed_route_movements": int(sum(observed_routes.values())),
        "classifiable_airports": len(rows),
        "excluded_missing_airport_metadata_movements": int(excluded_missing_metadata),
        "excluded_non_scheduled_airport_movements": int(excluded_non_scheduled_airport),
        "carrier_coverage_share_p10": percentile(coverages, 0.10),
        "carrier_coverage_share_p50": percentile(coverages, 0.50),
        "carrier_coverage_share_p90": percentile(coverages, 0.90),
        "required_anchor_reference_airports": {
            code: next((row for row in rows if row["icao"] == code), None) for code in ("WSSS", "OMAA")
        },
        "top_50": rows[:50],
        "candidate_sha256": sha256_json(candidate),
    }
    return candidate, diagnostics


def download_verified_ourairports(path: Path) -> Dict[str, Any]:
    h = hashlib.sha256()
    total = 0
    with requests.get(OURAIRPORTS_URL, stream=True, timeout=(30, 120)) as response:
        response.raise_for_status()
        with path.open("wb") as out:
            for chunk in response.iter_content(1024 * 1024):
                if chunk:
                    out.write(chunk)
                    h.update(chunk)
                    total += len(chunk)
    return {"url": OURAIRPORTS_URL, "sha256": h.hexdigest(), "bytes": total}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--diagnostics", required=True)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="v39-mrairspace-") as temp:
        candidate, diagnostics = build(Path(temp))
    Path(args.output).write_text(json.dumps(candidate, indent=2) + "\n", encoding="utf-8")
    Path(args.diagnostics).write_text(json.dumps(diagnostics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": diagnostics["status"],
        "airports": diagnostics["classifiable_airports"],
        "resolved_movements": diagnostics["resolved_observed_route_movements"],
        "carrier_coverage_p50": diagnostics["carrier_coverage_share_p50"],
        "WSSS": diagnostics["required_anchor_reference_airports"]["WSSS"],
        "OMAA": diagnostics["required_anchor_reference_airports"]["OMAA"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
