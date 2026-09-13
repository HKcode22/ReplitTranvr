#!/usr/bin/env python3
"""Build a zero-cost V3.9 Phase-2 candidate traffic reference from OPDI.

Public inputs only:
- EUROCONTROL OPDI v0.0.2 monthly FLIGHT parquet files
- OurAirports airports.csv

The artifact is explicitly OBSERVED commercial movements, not airline schedules.
Raw monthly files are processed one-at-a-time and deleted after aggregation.
"""
from __future__ import annotations

import argparse, csv, hashlib, json, math, re, shutil, tempfile
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Tuple

import duckdb
import requests

OPDI_VERSION = "v0.0.2"
OPDI_BASE = "https://www.eurocontrol.int/performance/data/download/OPDI/v002/flight_list"
OURAIRPORTS_URL = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv"
REFERENCE_START = date(2025, 8, 1)
REFERENCE_END = date(2026, 7, 31)
REFERENCE_MAX_AGE_DAYS = 62
MIN_AIRPORT_DEPARTURES = 53
MIN_ROUTE_DEPARTURES = 53
HUB_SHARE = 0.10
HUB_MID_CUMULATIVE_SHARE = 0.40
TIER_POLICY_VERSION = "opdi-observed-rank-10-30-60-v1"
ICAO4 = re.compile(r"^[A-Z0-9]{4}$")
OPERATOR3 = re.compile(r"^[A-Z]{3}$")
ISO2 = re.compile(r"^[A-Z]{2}$")


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_json(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def months_between(start: date, end: date) -> List[str]:
    out, y, m = [], start.year, start.month
    while (y, m) <= (end.year, end.month):
        out.append(f"{y:04d}{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def download(url: str, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha256()
    with requests.get(url, stream=True, timeout=180) as r:
        r.raise_for_status()
        with path.open("wb") as f:
            for chunk in r.iter_content(1024 * 1024):
                if chunk:
                    h.update(chunk); f.write(chunk)
    return h.hexdigest()


def qident(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def resolve(columns: Iterable[str], *aliases: str) -> str:
    m = {str(c).lower(): str(c) for c in columns}
    for alias in aliases:
        if alias.lower() in m:
            return m[alias.lower()]
    raise RuntimeError(f"OPDI_REQUIRED_COLUMN_MISSING:{'/'.join(aliases)}")


def read_month(path: Path) -> Tuple[Counter, Dict[Tuple[str, str], Counter], Counter]:
    """Return all valid airport-pair counts, route→operator counts, and QC."""
    con = duckdb.connect(":memory:")
    try:
        cols = [r[0] for r in con.execute("DESCRIBE SELECT * FROM read_parquet(?)", [str(path)]).fetchall()]
        adep = qident(resolve(cols, "adep", "ADEP"))
        ades = qident(resolve(cols, "ades", "ADES"))
        oper = qident(resolve(cols, "icao_operator", "ICAO_OPERATOR", "operator_icao"))
        rows = con.execute(f"""
          SELECT upper(trim(CAST({adep} AS VARCHAR))),
                 upper(trim(CAST({ades} AS VARCHAR))),
                 upper(trim(CAST({oper} AS VARCHAR))), count(*)::BIGINT
          FROM read_parquet(?) GROUP BY 1,2,3
        """, [str(path)]).fetchall()
    finally:
        con.close()

    all_routes: Counter = Counter()
    route_operators: Dict[Tuple[str, str], Counter] = defaultdict(Counter)
    qc = Counter()
    for origin, destination, operator, n in rows:
        n = int(n); qc["rows_grouped"] += n
        origin, destination, operator = (origin or "").strip().upper(), (destination or "").strip().upper(), (operator or "").strip().upper()
        if not ICAO4.fullmatch(origin) or not ICAO4.fullmatch(destination) or origin == destination:
            qc["invalid_airport_pair"] += n; continue
        route = (origin, destination)
        all_routes[route] += n
        if OPERATOR3.fullmatch(operator):
            route_operators[route][operator] += n
            qc["operator_coded_pair_rows"] += n
        else:
            qc["missing_or_invalid_icao_operator"] += n
    return all_routes, route_operators, qc


def load_airports(path: Path) -> Dict[str, Dict[str, Any]]:
    result: Dict[str, Dict[str, Any]] = {}
    with path.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            icao = (row.get("icao_code") or row.get("gps_code") or row.get("ident") or "").strip().upper()
            country = (row.get("iso_country") or "").strip().upper()
            if not ICAO4.fullmatch(icao) or not ISO2.fullmatch(country): continue
            try:
                lon = float(row.get("longitude_deg") or "")
                if not math.isfinite(lon) or lon < -180 or lon > 180: lon = None
            except Exception: lon = None
            result[icao] = {
                "country_iso2": country,
                "longitude_e": lon,
                "scheduled_service": (row.get("scheduled_service") or "").strip().lower() == "yes",
                "airport_timezone": (row.get("timezone") or "").strip() or None,
            }
    return result


def diversity(counts: Counter) -> Tuple[float, int, float]:
    total = sum(counts.values())
    if total <= 0: return 0.0, 0, 0.0
    hhi = shannon = 0.0; count5 = 0
    for n in counts.values():
        p = n / total; hhi += p * p
        if p >= .05: count5 += 1
        if p > 0: shannon -= p * math.log(p)
    return (1 / hhi if hhi else 0.0), count5, shannon


def nearest_rank(values: List[float], q: float) -> float | None:
    if not values: return None
    s = sorted(values); return s[max(0, min(len(s)-1, math.ceil(q*len(s))-1))]


def assign_tiers(rows: List[Dict[str, Any]]) -> Tuple[int,int,int,int]:
    if len(rows) < 12: raise RuntimeError(f"OPDI_REFERENCE_TOO_FEW_CLASSIFIABLE_AIRPORTS:{len(rows)}")
    hub = max(1, math.ceil(len(rows) * HUB_SHARE))
    hubmid = min(len(rows), max(hub + 1, math.ceil(len(rows) * HUB_MID_CUMULATIVE_SHARE)))
    for i, row in enumerate(rows): row["tier"] = "HUB" if i < hub else "MID" if i < hubmid else "REGIONAL"
    return hub, hubmid-hub, len(rows)-hubmid, int(rows[hub-1]["traffic_metric_value"])


def build(workdir: Path) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    months = months_between(REFERENCE_START, REFERENCE_END)
    if len(months) != 12: raise RuntimeError("OPDI_REFERENCE_EXPECTED_12_MONTHS")

    airport_file = workdir / "ourairports.csv"
    airport_sha = download(OURAIRPORTS_URL, airport_file)
    airports = load_airports(airport_file)

    all_routes: Counter = Counter()
    route_operators: Dict[Tuple[str,str], Counter] = defaultdict(Counter)
    source_files, qc = [], Counter()
    for month in months:
        url = f"{OPDI_BASE}/flight_list_{month}.parquet"
        path = workdir / f"flight_list_{month}.parquet"
        digest = download(url, path)
        routes_m, operators_m, qc_m = read_month(path)
        all_routes.update(routes_m); qc.update(qc_m)
        for route, counts in operators_m.items(): route_operators[route].update(counts)
        source_files.append({"month": month, "url": url, "sha256": digest, "bytes": path.stat().st_size})
        path.unlink(missing_ok=True)

    all_sched_routes, commercial_routes = Counter(), Counter()
    retained_route_operators: Dict[Tuple[str,str], Counter] = {}
    excluded_meta = excluded_nonscheduled = 0
    for route, n in all_routes.items():
        o,d = route; om,dm = airports.get(o), airports.get(d)
        if not om or not dm: excluded_meta += n; continue
        if not om["scheduled_service"] or not dm["scheduled_service"]: excluded_nonscheduled += n; continue
        all_sched_routes[route] += n
        ops = route_operators.get(route, Counter())
        if ops:
            retained_route_operators[route] = ops
            commercial_routes[route] = sum(ops.values())

    all_dep, commercial_dep = Counter(), Counter()
    origin_operators: Dict[str, Counter] = defaultdict(Counter)
    out_neighbors, in_neighbors = defaultdict(set), defaultdict(set)
    intl, country_known = Counter(), Counter()
    for (o,d), n in all_sched_routes.items(): all_dep[o] += n
    for (o,d), n in commercial_routes.items():
        commercial_dep[o] += n; origin_operators[o].update(retained_route_operators[(o,d)])
        if n >= MIN_ROUTE_DEPARTURES: out_neighbors[o].add(d); in_neighbors[d].add(o)
        country_known[o] += n
        if airports[o]["country_iso2"] != airports[d]["country_iso2"]: intl[o] += n

    rows: List[Dict[str, Any]] = []
    for icao, departures in commercial_dep.items():
        if departures < MIN_AIRPORT_DEPARTURES: continue
        eff,count5,shannon = diversity(origin_operators[icao])
        coverage = departures / all_dep[icao] if all_dep[icao] else 0.0
        rows.append({
            "icao": icao, "traffic_metric_value": int(departures), "tier": "REGIONAL",
            "country_iso2": airports[icao]["country_iso2"], "longitude_e": airports[icao]["longitude_e"],
            "airport_timezone": airports[icao]["airport_timezone"],
            "out_degree": len(out_neighbors[icao]), "in_degree": len(in_neighbors[icao]),
            "undirected_degree": len(out_neighbors[icao] | in_neighbors[icao]),
            "effective_carriers": eff, "intl_share": intl[icao]/country_known[icao] if country_known[icao] else 0.0,
            "carrier_coverage_share": max(0.0,min(1.0,coverage)),
            "_operator_count_5pct": count5, "_operator_shannon": shannon,
        })
    rows.sort(key=lambda r: (-r["traffic_metric_value"], r["icao"]))
    hub,mid,regional,hub_cut = assign_tiers(rows)

    provenance = {
        "opdi_version": OPDI_VERSION,
        "reference_period_start": REFERENCE_START.isoformat(), "reference_period_end": REFERENCE_END.isoformat(),
        "source_files": source_files, "ourairports": {"url": OURAIRPORTS_URL, "sha256": airport_sha},
        "algorithm": {
            "commercial_filter": "valid ADEP/ADES; both OurAirports scheduled_service=yes; valid 3-letter OPDI icao_operator",
            "airport_min_observed_departures": MIN_AIRPORT_DEPARTURES, "route_min_observed_departures": MIN_ROUTE_DEPARTURES,
            "operator_diversity_population": "only retained observed-commercial routes",
            "tier_policy": {"kind":"rank","version":TIER_POLICY_VERSION,"hub_rank_share":HUB_SHARE,"hub_mid_cumulative_rank_share":HUB_MID_CUMULATIVE_SHARE,"sort":"traffic_metric_desc_then_icao_asc"},
        },
    }
    clean_rows = [{k:v for k,v in row.items() if not k.startswith("_")} for row in rows]
    retrieval = datetime.now(timezone.utc).date().isoformat()
    cut_rule = ";".join([
        f"policy={TIER_POLICY_VERSION}","kind=rank","sort=traffic_metric_desc_then_icao_asc",
        f"hub_share={HUB_SHARE}",f"hub_mid_cumulative_share={HUB_MID_CUMULATIVE_SHARE}",
        f"hub_rank_count={hub}",f"hub_mid_cumulative_rank_count={hub+mid}","regional=remainder",
        f"airport_min_observed_departures={MIN_AIRPORT_DEPARTURES}",
        f"route_degree_threshold=observed_operator_coded_departures>={MIN_ROUTE_DEPARTURES}_over_365d",
    ])
    pairs = sorted(({"icao":r["icao"],"tier":r["tier"]} for r in clean_rows), key=lambda x:x["icao"])
    reference = {
        "schema_version":"v3.9-traffic-reference-frozen-1","status":"READY_FROZEN_REFERENCE",
        "traffic_source_name":"EUROCONTROL OPDI / OpenSky Network + OurAirports",
        "traffic_source_version":f"OPDI {OPDI_VERSION}; OurAirports snapshot {retrieval}",
        "traffic_retrieval_date":retrieval,"reference_period_start":REFERENCE_START.isoformat(),"reference_period_end":REFERENCE_END.isoformat(),
        "traffic_metric_name":"observed_commercial_departures","traffic_metric_units":"operator_coded_observed_departures_per_frozen_12_month_period",
        "reference_semantics":"observed_commercial_movements","reference_max_age_days":REFERENCE_MAX_AGE_DAYS,
        "reference_freshness_basis":"latest complete OPDI monthly release; OPDI portal refreshes monthly files and public roadmap uses an approximately two-month release cadence",
        "hub_cut_metric":hub_cut,"tier_cut_rule":cut_rule,"raw_reference_sha256":sha256_json(provenance),
        "tier_hash":sha256_json(pairs),
        "license_access_basis":"EUROCONTROL OPDI open performance data for transparent/reproducible analysis; OpenSky attribution; OurAirports Public Domain; non-commercial research use",
        "airports":clean_rows,
    }
    coverages=[r["carrier_coverage_share"] for r in clean_rows]
    diagnostics = {
        "schema_version":"v3.9-opdi-reference-diagnostics-1","status":"PASS_CANDIDATE_BUILT","provenance":provenance,"qc":dict(qc),
        "excluded_missing_airport_metadata_flights":excluded_meta,"excluded_non_scheduled_airport_pair_flights":excluded_nonscheduled,
        "all_valid_scheduled_pair_observations":sum(all_sched_routes.values()),"operator_coded_commercial_observations":sum(commercial_routes.values()),
        "operator_coded_coverage_share":sum(commercial_routes.values())/sum(all_sched_routes.values()) if all_sched_routes else 0.0,
        "classifiable_airports":len(clean_rows),"hub_count":hub,"mid_count":mid,"regional_count":regional,"hub_cut_metric":hub_cut,
        "carrier_coverage_share_p10":nearest_rank(coverages,.10),"carrier_coverage_share_p50":nearest_rank(coverages,.50),"carrier_coverage_share_p90":nearest_rank(coverages,.90),
        "required_anchor_reference_airports":{code:next((r for r in rows if r["icao"]==code),None) for code in ("WSSS","OMAA")},
        "top_20":rows[:20],"reference_sha256":sha256_json(reference),
    }
    return reference, diagnostics


def main() -> int:
    p=argparse.ArgumentParser(); p.add_argument("--output",required=True); p.add_argument("--diagnostics",required=True); p.add_argument("--workdir")
    a=p.parse_args(); cleanup=not bool(a.workdir); workdir=Path(a.workdir).resolve() if a.workdir else Path(tempfile.mkdtemp(prefix="v39-opdi-")); workdir.mkdir(parents=True,exist_ok=True)
    try:
        ref,diag=build(workdir)
        for path,obj in ((Path(a.output),ref),(Path(a.diagnostics),diag)):
            path=path.resolve(); path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(obj,indent=2,sort_keys=True)+"\n",encoding="utf-8")
        print(json.dumps({"status":"PASS_CANDIDATE_BUILT","airports":diag["classifiable_airports"],"tiers":{"HUB":diag["hub_count"],"MID":diag["mid_count"],"REGIONAL":diag["regional_count"]},"operator_coverage":diag["operator_coded_coverage_share"],"WSSS":diag["required_anchor_reference_airports"]["WSSS"],"OMAA":diag["required_anchor_reference_airports"]["OMAA"]},indent=2)); return 0
    finally:
        if cleanup: shutil.rmtree(workdir,ignore_errors=True)

if __name__ == "__main__": raise SystemExit(main())
