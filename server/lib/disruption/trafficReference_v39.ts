import { createHash } from "crypto";

export type FrozenTrafficTier = "HUB" | "MID" | "REGIONAL";

export interface FrozenTrafficAirportRow {
  icao: string;
  traffic_metric_value: number;
  tier: FrozenTrafficTier;
  country_iso2: string;
  longitude_e: number | null;
  airport_timezone: string | null;
  out_degree: number | null;
  in_degree: number | null;
  undirected_degree: number | null;
  effective_carriers: number | null;
  intl_share: number | null;
}

export interface FrozenTrafficReferenceV39 {
  schema_version: "v3.9-traffic-reference-frozen-1";
  status: "READY_FROZEN_REFERENCE";
  traffic_source_name: string;
  traffic_source_version: string;
  traffic_retrieval_date: string;
  reference_period_start: string;
  reference_period_end: string;
  traffic_metric_name: string;
  traffic_metric_units: string;
  hub_cut_metric: number;
  tier_cut_rule: string;
  raw_reference_sha256: string;
  tier_hash: string;
  license_access_basis: string;
  airports: FrozenTrafficAirportRow[];
}

const ICAO = /^[A-Z0-9]{4}$/;
const ISO2 = /^[A-Z]{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA = /^[a-f0-9]{64}$/;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${canonical(obj[key])}`).join(",")}}`;
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value), "utf8").digest("hex");
}

export function computeTierHash(rows: readonly FrozenTrafficAirportRow[]): string {
  const pairs = rows
    .map((row) => ({ icao: row.icao.trim().toUpperCase(), tier: row.tier }))
    .sort((a, b) => a.icao.localeCompare(b.icao));
  return sha256Hex(pairs);
}

export interface TrafficReferenceVerdict {
  pass: boolean;
  failures: string[];
  rowCount: number;
}

function finiteNonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nullableNonnegative(value: unknown): boolean {
  return value === null || finiteNonnegative(value);
}

export function verifyFrozenTrafficReference(ref: FrozenTrafficReferenceV39): TrafficReferenceVerdict {
  const failures: string[] = [];
  if (ref.schema_version !== "v3.9-traffic-reference-frozen-1") failures.push("schema-version-invalid");
  if (ref.status !== "READY_FROZEN_REFERENCE") failures.push("status-not-ready");
  for (const [name, value] of [
    ["traffic_source_name", ref.traffic_source_name],
    ["traffic_source_version", ref.traffic_source_version],
    ["traffic_metric_name", ref.traffic_metric_name],
    ["traffic_metric_units", ref.traffic_metric_units],
    ["tier_cut_rule", ref.tier_cut_rule],
    ["license_access_basis", ref.license_access_basis],
  ] as const) {
    if (!String(value ?? "").trim()) failures.push(`${name}-missing`);
  }
  if (!DATE.test(ref.traffic_retrieval_date ?? "")) failures.push("traffic-retrieval-date-invalid");
  if (!DATE.test(ref.reference_period_start ?? "") || !DATE.test(ref.reference_period_end ?? "")) {
    failures.push("reference-period-invalid");
  } else {
    const start = Date.parse(`${ref.reference_period_start}T00:00:00Z`);
    const end = Date.parse(`${ref.reference_period_end}T00:00:00Z`);
    const spanDays = (end - start) / 86_400_000 + 1;
    if (!(spanDays >= 365 && spanDays <= 366)) failures.push(`reference-period-not-12-months:${spanDays}d`);
  }
  if (!finiteNonnegative(ref.hub_cut_metric) || ref.hub_cut_metric <= 0) failures.push("hub-cut-metric-invalid");
  if (!SHA.test(ref.raw_reference_sha256 ?? "")) failures.push("raw-reference-hash-invalid");
  if (!SHA.test(ref.tier_hash ?? "")) failures.push("tier-hash-invalid-format");
  if (!Array.isArray(ref.airports) || ref.airports.length === 0) failures.push("airport-reference-empty");

  const seen = new Set<string>();
  for (const row of ref.airports ?? []) {
    const icao = String(row.icao ?? "").trim().toUpperCase();
    if (!ICAO.test(icao)) failures.push(`icao-invalid:${icao || "<empty>"}`);
    if (seen.has(icao)) failures.push(`icao-duplicate:${icao}`);
    seen.add(icao);
    if (!finiteNonnegative(row.traffic_metric_value)) failures.push(`traffic-invalid:${icao}`);
    if (!["HUB", "MID", "REGIONAL"].includes(row.tier)) failures.push(`tier-invalid:${icao}`);
    if (!ISO2.test(String(row.country_iso2 ?? "").trim().toUpperCase())) failures.push(`country-invalid:${icao}`);
    if (row.longitude_e !== null && (typeof row.longitude_e !== "number" || !Number.isFinite(row.longitude_e) || row.longitude_e < -180 || row.longitude_e > 180)) {
      failures.push(`longitude-invalid:${icao}`);
    }
    if (!nullableNonnegative(row.out_degree) || !nullableNonnegative(row.in_degree) || !nullableNonnegative(row.undirected_degree)) failures.push(`degree-invalid:${icao}`);
    if (!nullableNonnegative(row.effective_carriers)) failures.push(`effective-carriers-invalid:${icao}`);
    if (row.intl_share !== null && (typeof row.intl_share !== "number" || !Number.isFinite(row.intl_share) || row.intl_share < 0 || row.intl_share > 1)) failures.push(`intl-share-invalid:${icao}`);
  }

  if (Array.isArray(ref.airports) && ref.airports.length > 0) {
    const expected = computeTierHash(ref.airports);
    if (expected !== ref.tier_hash) failures.push("tier-hash-mismatch");
  }

  return { pass: failures.length === 0, failures: [...new Set(failures)].sort(), rowCount: ref.airports?.length ?? 0 };
}

export function parseFrozenTrafficReference(raw: string): FrozenTrafficReferenceV39 {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("TRAFFIC_REFERENCE_NOT_JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("TRAFFIC_REFERENCE_NOT_OBJECT");
  const ref = parsed as FrozenTrafficReferenceV39;
  const verdict = verifyFrozenTrafficReference(ref);
  if (!verdict.pass) throw new Error(`TRAFFIC_REFERENCE_INVALID:${verdict.failures.slice(0, 8).join(",")}`);
  return ref;
}

export function trafficReferenceIndex(ref: FrozenTrafficReferenceV39): Map<string, FrozenTrafficAirportRow> {
  return new Map(ref.airports.map((row) => [row.icao.trim().toUpperCase(), { ...row, icao: row.icao.trim().toUpperCase(), country_iso2: row.country_iso2.trim().toUpperCase() }]));
}
