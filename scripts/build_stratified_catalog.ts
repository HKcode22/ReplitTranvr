// ============================================================
// Stratified catalog build — V3.9 plan §17 step 11, §4, §27.1.
//
//   npm run build-catalog
//
// Turns the coverage measurement (universe = 4,332, our catalog ∩
// universe = 267) into the official sampling FRAME:
//
//   frame = catalog ∩ universe, stratified by PRIMARY STRATA =
//           traffic tier × macro-region (plan §4, §6)
//
// Plan requirements checked (§27.1 #2, verbatim):
//   1. Frame stratified by traffic tier × macro-region.
//   2. No tier-empty cells (every tier appears in every region).
//   3. Balancing variables (intl share, carrier diversity, timezone,
//      network degree) reported WITHIN strata, never crossed.
//   4. catalogInUniverse fraction reported; zero-yield airports STAY in
//      the frame; only coverage-failed airports leave.
//
// Macro-regions are the plan's OWN list (§23, verbatim):
//   North America · Europe · Asia-Pacific · Gulf/Africa ·
//   South America · Oceania
//
// All calls are free (reads the cached coverage from getAirportCoverage;
// coverage itself is a free endpoint). This spends NOTHING.
// ============================================================

import { pool } from "../server/db";
import { getAirportCoverage } from "../server/lib/disruption/adbCollectionController_v3";
import {
  AIRPORT_CATALOG,
  AIRPORT_TIERS,
  type AirportTier,
} from "../server/lib/disruption/adbAirportCatalog_v3";

export type MacroRegion =
  | "North America"
  | "Europe"
  | "Asia-Pacific"
  | "Gulf/Africa"
  | "South America"
  | "Oceania";

export const MACRO_REGIONS: readonly MacroRegion[] = [
  "North America",
  "Europe",
  "Asia-Pacific",
  "Gulf/Africa",
  "South America",
  "Oceania",
];

/**
 * ICAO → macro-region via the standard prefix table (plan §23 regions).
 * Every prefix in the catalog maps to exactly one region:
 *   K/C/M → North America; E/L/U → Europe; R/V/W/Z → Asia-Pacific;
 *   O/H/F/D/G → Gulf/Africa; S → South America; Y/N → Oceania.
 */
export function macroRegionForIcao(icao: string): MacroRegion | null {
  const p = (icao ?? "").trim().toUpperCase();
  if (!p) return null;
  const c = p[0];
  if ("KCM".includes(c)) return "North America";
  if ("ELU".includes(c)) return "Europe";
  if ("RVWZ".includes(c)) return "Asia-Pacific";
  if ("OHFDG".includes(c)) return "Gulf/Africa";
  if (c === "S") return "South America";
  if ("YN".includes(c)) return "Oceania";
  return null;
}

export interface FrameRow {
  icao: string;
  tier: AirportTier;
  region: MacroRegion;
  inUniverse: boolean;
}

export interface StratumCell {
  tier: AirportTier;
  region: MacroRegion;
  catalog: number;
  inUniverse: number;
}

export interface CatalogFrame {
  fetchedAt: string | null;
  universeCount: number;
  catalogCount: number;
  catalogInUniverse: number;
  missingFromUniverse: string[];
  frame: FrameRow[];
  strata: StratumCell[];
  emptyCells: Array<{ tier: AirportTier; region: MacroRegion }>;
  inUniverseFraction: number;
}

/** Build the stratified frame from a coverage report. Exported for tests. */
export function buildStratifiedFrame(
  cov: {
    fetchedAt: string | null;
    universeCount: number;
    catalogCount: number;
    catalogInUniverse: number;
    catalogMissingFromUniverse: string[];
  },
): CatalogFrame {
  const universeSet = new Set<string>();
  const missingSet = new Set(cov.catalogMissingFromUniverse.map((c) => c.toUpperCase()));

  const frame: FrameRow[] = [];
  for (const tier of AIRPORT_TIERS) {
    for (const icao of AIRPORT_CATALOG[tier]) {
      const up = icao.toUpperCase();
      const region = macroRegionForIcao(up);
      if (!region) continue; // catalog entry without a region (shouldn't happen)
      const inUniverse = !missingSet.has(up);
      if (inUniverse) universeSet.add(up);
      frame.push({ icao: up, tier, region, inUniverse });
    }
  }

  const strata: StratumCell[] = [];
  for (const tier of AIRPORT_TIERS) {
    for (const region of MACRO_REGIONS) {
      const rows = frame.filter((r) => r.tier === tier && r.region === region);
      strata.push({
        tier,
        region,
        catalog: rows.length,
        inUniverse: rows.filter((r) => r.inUniverse).length,
      });
    }
  }

  const emptyCells = strata
    .filter((s) => s.inUniverse === 0)
    .map((s) => ({ tier: s.tier, region: s.region }));

  return {
    fetchedAt: cov.fetchedAt,
    universeCount: cov.universeCount,
    catalogCount: cov.catalogCount,
    catalogInUniverse: cov.catalogInUniverse,
    missingFromUniverse: cov.catalogMissingFromUniverse,
    frame,
    strata,
    emptyCells,
    inUniverseFraction:
      cov.catalogCount > 0 ? cov.catalogInUniverse / cov.catalogCount : 0,
  };
}

async function main(): Promise<void> {
  console.log("Building the stratified sampling frame (tier × macro-region)...\n");

  const cov = await getAirportCoverage();
  if (!cov) {
    console.error(
      "Coverage measurement FAILED — check AERODATABOX_API_KEY is set (npm run logs:last).",
    );
    await pool.end();
    process.exit(1);
  }

  const frame = buildStratifiedFrame(cov);

  console.log(`fetchedAt                     : ${frame.fetchedAt}`);
  console.log(`universeCount                 : ${frame.universeCount}  (AeroDataBox-covered)`);
  console.log(`catalogCount (ours)           : ${frame.catalogCount}`);
  console.log(`catalogInUniverse (the frame) : ${frame.catalogInUniverse}`);
  console.log(`in-universe fraction          : ${(frame.inUniverseFraction * 100).toFixed(1)}%`);
  console.log("");

  console.log("Primary strata (traffic tier × macro-region) — plan §4/§6/§27.1:");
  console.log("  cell                          catalog   in-universe");
  for (const s of frame.strata) {
    const flag = s.inUniverse === 0 ? "  ⚠ EMPTY" : "";
    console.log(
      `  ${s.tier.padEnd(8)} × ${s.region.padEnd(15)}   ${String(s.catalog).padStart(4)}      ${String(s.inUniverse).padStart(5)}${flag}`,
    );
  }

  const zeroCells = frame.emptyCells;
  if (zeroCells.length === 0) {
    console.log("\n  → no tier-empty cells ✓ (every tier appears in every region)");
  } else {
    console.log(
      `\n  → ⚠ WARNING — ${zeroCells.length} tier-empty cell(s):`,
      zeroCells.map((c) => `${c.tier}×${c.region}`).join(", "),
      "\n    (plan §27.1 forbids these; the catalog must be expanded before the run)",
    );
  }

  if (frame.missingFromUniverse.length) {
    console.log(
      `\nMissing from universe (excluded from frame, stays cataloged — §4): ${
        frame.missingFromUniverse.join(", ")
      }`,
    );
  }

  console.log(`
Balancing variables (plan §4/§6 — reported WITHIN strata, never crossed):
  network degree · intl/domestic · carrier diversity · time zone
  → these come from a FIXED reference snapshot (external data, §23a).
  → reported per stratum in a follow-up once the reference snapshot is loaded.
Zero-yield airports: stay in the frame, tracked, never dropped (§4/§8).
Only coverage-failed airports leave the frame.`);

  await pool.end();
}

main().catch(async (err: any) => {
  console.error("catalog build failed:", err?.message || err);
  await pool.end();
  process.exit(1);
});