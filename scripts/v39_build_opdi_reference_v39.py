#!/usr/bin/env python3
"""Build the V3.9 Phase-2 zero-cost traffic reference from EUROCONTROL OPDI.

This script downloads only public OPDI monthly FLIGHT parquet files and the
public-domain OurAirports airport table. It never calls AeroDataBox and needs no
credentials. Raw monthly files are processed one-at-a-time and are not emitted
as artifacts; only file hashes, aggregate airport/route/operator statistics and
the frozen candidate reference are retained.

Binding source semantics: OBSERVED commercial movements, NOT airline schedules.
A movement is included in the traffic metric when:
  * OPDI has valid ADEP + ADES,
  * both airports resolve in the pinned OurAirports snapshot and are marked
    scheduled_service=yes,
  * OPDI supplies a valid 3-letter ICAO operator.

The tier policy is explicitly predeclared here and in the Plan revision:
  HUB = top 10% by annual observed commercial departures,
  MID = next 30%,
  REGIONAL = remaining 60%,
with traffic DESC / ICAO ASC tie ordering. This is a project sampling stratum,
not an industry hub classification.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import re
import shutil
import tempfile
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Tuple

import duckdb
import requests

OPDI_VERSION = "v0.0.2"
OPDI_BASE = "https://www.eurocontrol.int/performance/data/download/OPDI/v002/flight_list"
OURAIRPORTS_URL = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv"
REFERENCE_START = date(2025, 8, 1)
REFERENCE_END = date(2026, 7, 31)
REFERENCE_MAX_AGE_DAYS = 62
MIN_AIRPORT_DEPARTURES = 53  # >=1 observed operator-coded departure/week over 365d
MIN_ROUTE_DEPARTURES = 53    # same threshold for network-degree edges
HUB_SHARE = 0.10
HUB_MID_CUMULATIVE_SHARE = 0.40
TIER_POLICY_VERSION = "opdi-observed-rank-10-30-60-v1"
ICAO4 = re.compile(r"^[A-Z0-9]{4}$")
OPERATOR3 = re.compile(r"^[A-Z]{3}$")
ISO2 = re.compile(r"^[A-Z]{2}$")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_json(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def month_range(start: date, end: date) -> List[str]:
    out: List[str] = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        out.append(f"{y:04d}{m:02d}")
        if m == 12:
            y += 1
            m = 1
        else:
            m += 1
    return out


def download(url: str, path: Path, timeout: int = 120) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=timeout) as response:
        response.raise_for_status()
        h = hashlib.sha256()
        with path.open("wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                h.update(chunk)
                f.write(chunk)
    return h.hexdigest()


def normalize_column_map(columns: Iterable[str]) -> Dict[str, str]:
    return {str(c).strip().lower(): str(c) for c in columns}


def resolve_column(columns: Mapping[str, str], *aliases: str) -> str:
    for alias in aliases:
        hit = columns.get(alias.lower())
        if hit:
            return hit
    raise RuntimeError(f"OPDI_REQUIRED_COLUMN_MISSING:{'/'.join(aliases)}")


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def read_opdi_month(path: Path) -> Tuple[Counter, Counter, Dict[str, Counter], Dict[str, int]]:
    """Return all-pair routes, operator-coded routes, per-origin operator counts, QC."""
    con = duckdb.connect(database=":memory:")
    try:
        desc = con.execute("DESCRIBE SELECT * FROM read_parquet(?)", [str(path)]).fetchall()
        cmap = normalize_column_map(row[0] for row in desc)
        adep = quote_ident(resolve_column(cmap, "ADEP", "adep"))
        ades = quote_ident(resolve_column(cmap, "ADES", "ades"))
        operator = quote_ident(resolve_column(cmap, "icao_operator", "ICAO_OPERATOR", "operator_icao"))
        sql = f"""
          SELECT upper(trim(CAST({adep} AS VARCHAR))) AS origin,
                 upper(trim(CAST({ades} AS VARCHAR))) AS destination,
                 upper(trim(CAST({operator} AS VARCHAR))) AS operator,
                 count(*)::BIGINT AS n
            FROM read_parquet(?)
           GROUP BY 1,2,3
        """
        rows = con.execute(sql, [str(path)]).fetchall()
    finally:
        con.close()

    all_pair_routes: Counter = Counter()
    operator_routes: Counter = Counter()
    operator_counts: Dict[str, Counter] = defaultdict(Counter)
    qc = Counter()
    for origin, destination, operator, n in rows:
        n = int(n)
        qc["rows_grouped"] += n
        origin = (origin or "").strip().upper()
        destination = (destination or "").strip().upper()
        operator = (operator or "").strip().upper()
        if not ICAO4.fullmatch(origin) or not ICAO4.fullmatch(destination) or origin == destination:
            qc["invalid_airport_pair"] += n
            continue
        all_pair_routes[(origin, destination)] += n
        if not OPERATOR3.fullmatch(operator):
            qc["missing_or_invalid_icao_operator"] += n
            continue
        operator_routes[(origin, destination)] += n
        operator_counts[origin][operator] += n
        qc["operator_coded_pair_rows"] += n
    return all_pair_routes, operator_routes, operator_counts, dict(qc)


def load_ourairports(path: Path) -> Tuple[Dict[str, Dict[str, Any]], str]:
    raw_sha = sha256_file(path)
    result: Dict[str, Dict[str, Any]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            icao = (row.get("icao_code") or row.get("gps_code") or row.get("ident") or "").strip().upper()
            if not ICAO4.fullmatch(icao):
                continue
            country = (row.get("iso_country") or "").strip().upper()
            if not ISO2.fullmatch(country):
                continue
            try:
                longitude = float(row.get("longitude_deg") or "")
                if not math.isfinite(longitude) or longitude < -180 or longitude > 180:
                    longitude = None
            except Exception:
                longitude = None
            scheduled_service = (row.get("scheduled_service") or "").strip().lower() == "yes"
            timezone_name = (row.get("timezone") or "").strip() or None
            result[icao] = {
                "country_iso2": country,
                "longitude_e": longitude,
                "scheduled_service": scheduled_service,
                "airport_timezone": timezone_name,
                "airport_type": (row.get("type") or "").strip() or None,
            }
    return result, raw_sha


def effective_count(counter: Counter) -> Tuple[float, int, float]:
    total = sum(counter.values())
    if total <= 0:
        return 0.0, 0, 0.0
    hhi = 0.0
    shannon = 0.0
    count5 = 0
    for n in counter.values():
        p = n / total
        hhi += p * p
        if p >= 0.05:
            count5 += 1
        if p > 0:
            shannon -= p * math.log(p)
    return (1.0 / hhi if hhi > 0 else 0.0), count5, shannon


def tier_hash(rows: List[Dict[str, Any]]) -> str:
    pairs = sorted(({"icao": r["icao"], "tier": r["tier"]} for r in rows), key=lambda x: x["icao"])
    return sha256_json(pairs)


def assign_rank_tiers(rows: List[Dict[str, Any]]) -> Tuple[int, int, int, int]:
    n = len(rows)
    if n < 12:
        raise RuntimeError(f"OPDI_REFERENCE_TOO_FEW_CLASSIFIABLE_AIRPORTS:{n}")
    hub_count = max(1, math.ceil(n * HUB_SHARE))
    hub_mid_count = min(n, max(hub_count + 1, math.ceil(n * HUB_MID_CUMULATIVE_SHARE)))
    for i, row in enumerate(rows):
        rank = i + 1
        row["tier"] = "HUB" if rank <= hub_count else "MID" if rank <= hub_mid_count else "REGIONAL"
    return hub_count, hub_mid_count - hub_count, n - hub_mid_count, int(rows[hub_count - 1]["traffic_metric_value"])


def percentile(values: List[float], q: float) -> float | None:
    if not values:
        return None
    s = sorted(values)
    idx = max(0, min(len(s) - 1, math.ceil(q * len(s)) - 1))
    return s[idx]


def build_reference(month_dir: Path) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    months = month_range(REFERENCE_START, REFERENCE_END)
    if len(months) != 12:
        raise RuntimeError("OPDI_REFERENCE_EXPECTED_EXACTLY_12_MONTHS")

    ourairports_path = month_dir / "ourairports-airports.csv"
    ourairports_sha = download(OURAIRPORTS_URL, ourairports_path)
    airport_meta, parsed_ourairports_sha = load_ourairports(ourairports_path)
    if ourairports_sha != parsed_ourairports_sha:
        raise RuntimeError("OURAIRPORTS_HASH_CHANGED_DURING_READ")

    all_pair_routes: Counter = Counter()
    operator_routes: Counter = Counter()
    operator_counts: Dict[str, Counter] = defaultdict(Counter)
    source_files: List[Dict[str, Any]] = []
    qc_total = Counter()

    for month in months:
        url = f"{OPDI_BASE}/flight_list_{month}.parquet"
        path = month_dir / f"flight_list_{month}.parquet"
        digest = download(url, path)
        all_routes_m, operator_routes_m, operators_m, qc_m = read_opdi_month(path)
        all_pair_routes.update(all_routes_m)
        operator_routes.update(operator_routes_m)
        for origin, counter in operators_m.items():
            operator_counts[origin].update(counter)
        qc_total.update(qc_m)
        source_files.append({"month": month, "url": url, "sha256": digest, "bytes": path.stat().st_size})
        path.unlink(missing_ok=True)

    # Restrict the observed-commercial reference to operator-coded flights
    # between airports that OurAirports currently marks as scheduled-service.
    commercial_routes: Counter = Counter()
    all_scheduled_pair_routes: Counter = Counter()
    excluded_missing_metadata = 0
    excluded_non_scheduled_airport = 0
    for route, n in all_pair_routes.items():
        o, d = route
        om, dm = airport_meta.get(o), airport_meta.get(d)
        if not om or not dm:
            excluded_missing_metadata += n
            continue
        if not om["scheduled_service"] or not dm["scheduled_service"]:
            excluded_non_scheduled_airport += n
            continue
        all_scheduled_pair_routes[route] += n
    for route, n in operator_routes.items():
        o, d = route
        om, dm = airport_meta.get(o), airport_meta.get(d)
        if not om or not dm or not om["scheduled_service"] or not dm["scheduled_service"]:
            continue
        commercial_routes[route] += n

    all_dep = Counter()
    commercial_dep = Counter()
    for (o, _d), n in all_scheduled_pair_routes.items():
        all_dep[o] += n
    for (o, _d), n in commercial_routes.items():
        commercial_dep[o] += n

    out_neighbors: Dict[str, set] = defaultdict(set)
    in_neighbors: Dict[str, set] = defaultdict(set)
    intl_departures = Counter()
    country_resolved_departures = Counter()
    for (o, d), n in commercial_routes.items():
        if n >= MIN_ROUTE_DEPARTURES:
            out_neighbors[o].add(d)
            in_neighbors[d].add(o)
        om, dm = airport_meta[o], airport_meta[d]
        country_resolved_departures[o] += n
        if om["country_iso2"] != dm["country_iso2"]:
            intl_departures[o] += n

    rows: List[Dict[str, Any]] = []
    for icao, departures in commercial_dep.items():
        if departures < MIN_AIRPORT_DEPARTURES:
            continue
        meta = airport_meta[icao]
        # Only operators attached to included commercial routes count toward
        # diversity. Reconstruct from route-level totals by applying the monthly
        # operator ledger at origin; this denominator may include operator-coded
        # flights to non-scheduled destinations, so carrier_coverage_share is
        # diagnostic and diversity is still explicitly observational.
        operators = operator_counts.get(icao, Counter())
        eff, count5, shannon = effective_count(operators)
        coverage = departures / all_dep[icao] if all_dep[icao] > 0 else 0.0
        connected = out_neighbors[icao] | in_neighbors[icao]
        rows.append({
            "icao": icao,
            "traffic_metric_value": int(departures),
            "tier": "REGIONAL",  # overwritten deterministically below
            "country_iso2": meta["country_iso2"],
            "longitude_e": meta["longitude_e"],
            "airport_timezone": meta["airport_timezone"],
            "out_degree": len(out_neighbors[icao]),
            "in_degree": len(in_neighbors[icao]),
            "undirected_degree": len(connected),
            "effective_carriers": eff,
            "intl_share": (intl_departures[icao] / country_resolved_departures[icao]) if country_resolved_departures[icao] else 0.0,
            "carrier_coverage_share": max(0.0, min(1.0, coverage)),
            "_operator_count_5pct": count5,
            "_operator_shannon": shannon,
            "_airport_type": meta["airport_type"],
        })

    rows.sort(key=lambda r: (-r["traffic_metric_value"], r["icao"]))
    hub_count, mid_count, regional_count, hub_cut = assign_rank_tiers(rows)

    provenance = {
        "opdi_version": OPDI_VERSION,
        "reference_period_start": REFERENCE_START.isoformat(),
        "reference_period_end": REFERENCE_END.isoformat(),
        "source_files": source_files,
        "ourairports": {"url": OURAIRPORTS_URL, "sha256": ourairports_sha},
        "algorithm": {
            "commercial_filter": "valid ADEP/ADES + both OurAirports scheduled_service=yes + valid 3-letter OPDI icao_operator",
            "airport_min_observed_departures": MIN_AIRPORT_DEPARTURES,
            "route_min_observed_departures": MIN_ROUTE_DEPARTURES,
            "tier_policy": {
                "kind": "rank",
                "version": TIER_POLICY_VERSION,
                "hub_rank_share": HUB_SHARE,
                "hub_mid_cumulative_rank_share": HUB_MID_CUMULATIVE_SHARE,
                "sort": "traffic_metric_desc_then_icao_asc",
            },
        },
    }
    raw_reference_sha = sha256_json(provenance)
    frozen_rows = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    retrieval = datetime.now(timezone.utc).date().isoformat()
    tier_cut_rule = ";".join([
        f"policy={TIER_POLICY_VERSION}",
        "kind=rank",
        "sort=traffic_metric_desc_then_icao_asc",
        f"hub_share={HUB_SHARE}",
        f"hub_mid_cumulative_share={HUB_MID_CUMULATIVE_SHARE}",
        f"hub_rank_count={hub_count}",
        f"hub_mid_cumulative_rank_count={hub_count + mid_count}",
        "regional=remainder",
        f"airport_min_observed_departures={MIN_AIRPORT_DEPARTURES}",
        f"route_degree_threshold=observed_operator_coded_departures>={MIN_ROUTE_DEPARTURES}_over_365d",
    ])
    reference = {
        "schema_version": "v3.9-traffic-reference-frozen-1",
        "status": "READY_FROZEN_REFERENCE",
        "traffic_source_name": "EUROCONTROL OPDI / OpenSky Network + OurAirports",
        "traffic_source_version": f"OPDI {OPDI_VERSION}; OurAirports snapshot {retrieval}",
        "traffic_retrieval_date": retrieval,
        "reference_period_start": REFERENCE_START.isoformat(),
        "reference_period_end": REFERENCE_END.isoformat(),
        "traffic_metric_name": "observed_commercial_departures",
        "traffic_metric_units": "operator_coded_observed_departures_per_frozen_12_month_period",
        "reference_semantics": "observed_commercial_movements",
        "reference_max_age_days": REFERENCE_MAX_AGE_DAYS,
        "reference_freshness_basis": "latest complete OPDI monthly release; OPDI roadmap documents releases roughly every two months and portal is monthly-file based",
        "hub_cut_metric": hub_cut,
        "tier_cut_rule": tier_cut_rule,
        "raw_reference_sha256": raw_reference_sha,
        "tier_hash": tier_hash(frozen_rows),
        "license_access_basis": "EUROCONTROL OPDI open datasets for transparent/reproducible performance analysis; OpenSky research data attribution required; OurAirports Public Domain; project use is non-commercial research",
        "airports": frozen_rows,
    }

    coverage_values = [r["carrier_coverage_share"] for r in frozen_rows]
    diagnostics = {
        "schema_version": "v3.9-opdi-reference-diagnostics-1",
        "status": "PASS_CANDIDATE_BUILT",
        "provenance": provenance,
        "qc": dict(qc_total),
        "excluded_missing_airport_metadata_flights": excluded_missing_metadata,
        "excluded_non_scheduled_airport_pair_flights": excluded_non_scheduled_airport,
        "all_valid_scheduled_pair_observations": sum(all_scheduled_pair_routes.values()),
        "operator_coded_commercial_observations": sum(commercial_routes.values()),
        "classifiable_airports": len(frozen_rows),
        "hub_count": hub_count,
        "mid_count": mid_count,
        "regional_count": regional_count,
        "hub_cut_metric": hub_cut,
        "carrier_coverage_share_p10": percentile(coverage_values, 0.10),
        "carrier_coverage_share_p50": percentile(coverage_values, 0.50),
        "carrier_coverage_share_p90": percentile(coverage_values, 0.90),
        "required_anchor_reference_airports": {
            code: next((r for r in rows if r["icao"] == code), None) for code in ("WSSS", "OMAA")
        },
        "top_20": rows[:20],
        "reference_sha256": sha256_json(reference),
    }
    return reference, diagnostics


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--diagnostics", required=True)
    parser.add_argument("--workdir", default=None)
    args = parser.parse_args()

    if args.workdir:
        workdir = Path(args.workdir).resolve()
        workdir.mkdir(parents=True, exist_ok=True)
        cleanup = False
    else:
        workdir = Path(tempfile.mkdtemp(prefix="v39-opdi-"))
        cleanup = True
    try:
        reference, diagnostics = build_reference(workdir)
        out = Path(args.output).resolve()
        diag = Path(args.diagnostics).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        diag.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(reference, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        diag.write_text(json.dumps(diagnostics, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps({
            "status": "PASS_CANDIDATE_BUILT",
            "reference": str(out),
            "diagnostics": str(diag),
            "airports": diagnostics["classifiable_airports"],
            "tiers": {"HUB": diagnostics["hub_count"], "MID": diagnostics["mid_count"], "REGIONAL": diagnostics["regional_count"]},
            "WSSS": diagnostics["required_anchor_reference_airports"]["WSSS"],
            "OMAA": diagnostics["required_anchor_reference_airports"]["OMAA"],
        }, indent=2))
        return 0
    finally:
        if cleanup:
            shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
