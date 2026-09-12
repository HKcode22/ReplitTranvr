// ============================================================
// Phase 2 step 11 — build the measured sampling frame (Option 1).
//
// THE DECISION (frozen 2026-08-17, recorded in IMPLEMENTATION_LOG §3 Step B):
//   The plan §6 is explicit: "Sampling frame v2: from '276 hard-coded' to
//   'measured universe'"; step 2 says "build the frame from that universe,
//   not from a static 276 list". We therefore build the frame from the
//   MEASURED AeroDataBox universe (`/collection/coverage` → universeUnion),
//   NOT from our 276. The 276 is kept as a flagged curated/reference subset.
//
// Frame pipeline (PART 1 §4 / §6):
//   1. Measured provider universe (AeroDataBox feed-covered airports).
//   2. Feed eligibility — every universe airport is feed-covered by
//      construction of `listFeedAirports`; coverage-failed airports (probe/
//      feed errors, never empty observations) leave the frame.
//   3. FRAME = every eligible universe airport, INCLUDING zero-yield ones
//      (tracked, never dropped).
//   4. PRIMARY STRATA = traffic tier × macro-region.
//   5. Balancing variables (network degree*, intl/domestic, carrier
//      diversity*, time zone) reported WITHIN strata — never crossed — from
//      a FIXED reference snapshot at frame-build time.
//
// Frozen traffic-tier rule (v1 provisional — V3.9-f.7 §4.1 SUPERSEDES as binding):
//   - Airports in our curated catalog (`adbAirportCatalog_v3.ts`, 276) keep
//     their human-classified tier: 30 HUB + 89 MID + 157 REGIONAL
//     (`tier_source = "curated"`).
//   - EVERY other universe airport is `tier_source = "unclassified"` and
//     remains UNCLASSIFIED and excluded from core sampling. V3.9-f.7 §4.1
//     requires a measured external traffic
//     reference (OAG/Cirium or ACI/FAA 12-month scheduled departures) with
//     frozen HUB/MID/REGIONAL thresholds + version/hash + rebuild of
//     clean.adb_sampling_frame BEFORE Gate 1/2. Until rebuild, `tier_source='unclassified'`
//     must be treated as `traffic_unverified` and 18-cell counts are provisional.
//   - Macro-region mapping is the explicit airport-level frozen artifact in
//     adbAirportCatalog_v3.ts. Missing entries remain visible as UNMAPPED;
//     there is no ICAO-prefix fallback.
//   - The daily slot mix is still {HUB:1, MID:2, REGIONAL:1} (§4) — the
//     frame size does not change what we collect per day, only the eligible
//     pool and its recorded design probabilities.
//
// Feed eligibility (per-airport, explicit — NOT one union population):
//   The measured universe is the UNION of three feeds (schedule / live /
//   ADS-B). The two ML layers need different feeds:
//     PRE  (FIDS/schedule layer)  → needs the FlightSchedules feed
//     POST (airborne/live layer)  → needs FlightLiveUpdates OR AdsbUpdates
//   Each frame row records feed_schedule / feed_live / feed_adsb and the
//   derived pre_eligible / post_eligible flags, so the frame never conflates
//   "provider supports the airport" with "supports every layer".
//
// Persistence:
//   The frame is written to `clean.adb_sampling_frame` (migration 0021) —
//   the DB-backed frame §6 explicitly allows. The collector reads candidates
//   from THIS table, not the static 276, so the measured frame actually
//   drives collection.
//
// Macro-regions use an auditable, versioned airport-level mapping. Coordinates
// may replace it in a later frozen artifact; Russia remains unmapped until then.
// ============================================================

import { createHash } from "node:crypto";
import { applyBootMigrations } from "../server/db";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { getAirportCoverage } from "../server/lib/disruption/adbCollectionController_v3";
import {
  AIRPORT_TIERS,
  AIRPORT_REGION_MAPPING_SOURCE,
  AIRPORT_REGION_MAPPING_VERSION,
  regionForIcao,
  tierForIcao,
  type AirportTier,
} from "../server/lib/disruption/adbAirportCatalog_v3";
import type { FeedService } from "../server/lib/disruption/aerodataboxLimiter_v3";

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
 * ICAO → macro-region (§1.5.10 / ChatGPT round-3 item 3).
 *
 * Resolution is only through the explicit frozen airport mapping. Missing
 * airports, including Russia absent coordinates, remain UNMAPPED.
 */
export const REGION_MAPPING_VERSION = AIRPORT_REGION_MAPPING_VERSION;

export function macroRegionForIcao(icao: string): MacroRegion | null {
  return regionForIcao(icao);
}

export interface FrameRow {
  icao: string;
  /** UNCLASSIFIED = missing traffic reference; visible, never blanket REGIONAL (§1.5.10). */
  tier: AirportTier | "UNCLASSIFIED";
  /**
   * "curated"     = in our 276 catalog (human-classified traffic tier).
   * "unclassified" = universe-only; tier stays UNCLASSIFIED (NOT provisional
   *                  REGIONAL) until a frozen traffic reference classifies it.
   */
  tierSource: "curated" | "unclassified";
  /** §8 priors HUB=3/MID=1.5/REGIONAL=1; UNCLASSIFIED carries 1.0 but is excluded from sampling. */
  trafficPrior: number;
  region: MacroRegion | null;
  /** How this row's region was assigned (override vs provisional table + version). */
  regionSource: string | null;
  exclusionReason: string | null;
  feedSchedule: boolean;
  feedLive: boolean;
  feedAdsb: boolean;
  preEligible: boolean;
  postEligible: boolean;
}

export interface StratumCell {
  tier: AirportTier;
  region: MacroRegion;
  /** Universe-airport count in this cell (the frame). */
  frameCount: number;
  /** Of those, how many are from our curated 276 catalog. */
  curated: number;
}

export interface CatalogFrame {
  fetchedAt: string | null;
  universeCount: number;
  catalogCount: number;
  catalogInUniverse: number;
  missingFromUniverse: string[];
  universeNotInCatalog: string[];
  unmapped: string[];
  frame: FrameRow[];
  strata: StratumCell[];
  emptyCells: Array<{ tier: AirportTier; region: MacroRegion }>;
  /** Curated 276 ∩ universe, as a fraction of the curated catalog. */
  curatedInUniverseFraction: number;
  preEligibleCount: number;
  postEligibleCount: number;
  /** pre AND post — the subset usable by both model layers. */
  bothEligibleCount: number;
  unclassifiedCount: number;
}

export interface CoverageInput {
  fetchedAt: string | null;
  universe: Partial<Record<FeedService, string[]>>;
  universeUnion: string[];
  catalogCount: number;
  catalogInUniverse: number;
  catalogMissingFromUniverse: string[];
  universeNotInCatalog: string[];
}

const FEED_SERVICES: readonly FeedService[] = ["FlightSchedules", "FlightLiveUpdates", "AdsbUpdates"];

function upperSet(list?: string[]): Set<string> {
  return new Set((list ?? []).map((c) => c.toUpperCase()).filter(Boolean));
}

/** Build the measured frame from a coverage report. Exported for tests. */
export function buildStratifiedFrame(cov: CoverageInput): CatalogFrame {
  const missingSet = new Set(cov.catalogMissingFromUniverse.map((c) => c.toUpperCase()));
  const curatedCount = cov.catalogCount;

  const scheduleSet = upperSet(cov.universe.FlightSchedules);
  const liveSet = upperSet(cov.universe.FlightLiveUpdates);
  const adsbSet = upperSet(cov.universe.AdsbUpdates);

  const frame: FrameRow[] = [];
  const unmapped: string[] = [];
  for (const raw of cov.universeUnion) {
    const icao = raw.toUpperCase();
    const region = macroRegionForIcao(icao);
    if (!region) unmapped.push(icao);
    const regionSource = region
      ? `${AIRPORT_REGION_MAPPING_SOURCE}@${REGION_MAPPING_VERSION}`
      : null;
    const feedSchedule = scheduleSet.has(icao);
    const feedLive = liveSet.has(icao);
    const feedAdsb = adsbSet.has(icao);
    const curatedTier = tierForIcao(icao);
    if (curatedTier) {
      frame.push({
        icao,
        tier: curatedTier,
        tierSource: "curated",
        trafficPrior: curatedTier === "HUB" ? 3 : curatedTier === "MID" ? 1.5 : 1.0,
        region,
        regionSource,
        exclusionReason: region ? null : "UNMAPPED_REGION",
        feedSchedule,
        feedLive,
        feedAdsb,
        preEligible: feedSchedule,
        postEligible: feedLive || feedAdsb,
      });
    } else {
      // §1.5.10 / ChatGPT round-3 item 3: missing traffic reference stays
      // UNCLASSIFIED (visible, excluded from sampling) — never blanket REGIONAL.
      frame.push({
        icao,
        tier: "UNCLASSIFIED",
        tierSource: "unclassified",
        trafficPrior: 1.0,
        region,
        regionSource,
        exclusionReason: region ? "UNCLASSIFIED_TIER" : "UNCLASSIFIED_TIER;UNMAPPED_REGION",
        feedSchedule,
        feedLive,
        feedAdsb,
        preEligible: feedSchedule,
        postEligible: feedLive || feedAdsb,
      });
    }
  }

  const strata: StratumCell[] = [];
  for (const tier of AIRPORT_TIERS) {
    for (const region of MACRO_REGIONS) {
      const rows = frame.filter((r) => r.tier === tier && r.region === region);
      strata.push({
        tier,
        region,
        frameCount: rows.length,
        curated: rows.filter((r) => r.tierSource === "curated").length,
      });
    }
  }

  const emptyCells = strata
    .filter((s) => s.frameCount === 0)
    .map((s) => ({ tier: s.tier, region: s.region }));

  return {
    fetchedAt: cov.fetchedAt,
    universeCount: cov.universeUnion.length,
    catalogCount: curatedCount,
    catalogInUniverse: cov.catalogInUniverse,
    missingFromUniverse: cov.catalogMissingFromUniverse,
    universeNotInCatalog: cov.universeNotInCatalog,
    unmapped,
    frame,
    strata,
    emptyCells,
    curatedInUniverseFraction:
      curatedCount > 0 ? cov.catalogInUniverse / curatedCount : 0,
    preEligibleCount: frame.filter((r) => r.preEligible).length,
    postEligibleCount: frame.filter((r) => r.postEligible).length,
    bothEligibleCount: frame.filter((r) => r.preEligible && r.postEligible).length,
    unclassifiedCount: frame.filter((r) => r.tierSource === "unclassified").length,
  };
}

/** Write the measured frame into clean.adb_sampling_frame (migration 0021).
 *  Versioned: every build INSERTs a new frame_version (never DELETEs prior
 *  rows), so the prior frame artifact is preserved (§1.5.10 / ChatGPT round-3).
 *  The collector reads candidates from the authoritative active registry. */
export async function persistFrameToDb(
  frame: CatalogFrame,
  frameVersion?: string,
  frameHash?: string | null,
): Promise<{ rows: number; frameVersion: string }> {
  if (frame.frame.length === 0) {
    throw new Error("refusing to persist an empty frame — build failed?");
  }
  const effectiveHash = frameHash ?? createHash("sha256")
    .update(JSON.stringify([...frame.frame].sort((a, b) => a.icao.localeCompare(b.icao))))
    .digest("hex");
  const version = frameVersion ?? `frame_${effectiveHash.slice(0, 16)}`;
  const client = await pool.connect();
  let rows = 0;
  try {
    await client.query("BEGIN");
    for (const r of frame.frame) {
      await client.query(
      `INSERT INTO clean.adb_sampling_frame
         (icao, tier, tier_source, traffic_prior, region, region_source, exclusion_reason,
          feed_schedule, feed_live, feed_adsb, pre_eligible, post_eligible, in_frame,
          frame_version, frame_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13,$14)
       ON CONFLICT (icao, frame_version) DO UPDATE SET
         tier = EXCLUDED.tier, tier_source = EXCLUDED.tier_source,
         traffic_prior = EXCLUDED.traffic_prior, region = EXCLUDED.region,
         region_source = EXCLUDED.region_source,
         exclusion_reason = EXCLUDED.exclusion_reason,
         feed_schedule = EXCLUDED.feed_schedule, feed_live = EXCLUDED.feed_live,
         feed_adsb = EXCLUDED.feed_adsb, pre_eligible = EXCLUDED.pre_eligible,
         post_eligible = EXCLUDED.post_eligible, in_frame = EXCLUDED.in_frame,
         frame_hash = EXCLUDED.frame_hash`,
      [r.icao, r.tier, r.tierSource, r.trafficPrior, r.region, r.regionSource, r.exclusionReason,
       r.feedSchedule, r.feedLive, r.feedAdsb, r.preEligible, r.postEligible,
       version, effectiveHash],
      );
      rows++;
    }
    await client.query(
    `INSERT INTO clean.adb_sampling_frame_registry (registry_key, active_frame_version, frame_hash, activated_at)
     VALUES ('ACTIVE', $1, $2, now())
     ON CONFLICT (registry_key) DO UPDATE SET
       active_frame_version = EXCLUDED.active_frame_version,
       frame_hash = EXCLUDED.frame_hash,
       activated_at = EXCLUDED.activated_at`,
      [version, effectiveHash],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return { rows, frameVersion: version };
}

async function main(): Promise<void> {
  console.log("Building the measured sampling frame (Option 1 — universe, not 276)...\n");

  // Ensure migration 0021 (clean.adb_sampling_frame) exists before persisting.
  await applyBootMigrations();

  const cov = await getAirportCoverage();
  if (!cov) {
    console.error(
      "Coverage measurement FAILED — check AERODATABOX_API_KEY is set (npm run logs:last).",
    );
    await pool.end();
    process.exit(1);
  }

  const frame = buildStratifiedFrame({
    fetchedAt: cov.fetchedAt,
    universe: cov.universe,
    universeUnion: cov.universeUnion,
    catalogCount: cov.catalogCount,
    catalogInUniverse: cov.catalogInUniverse,
    catalogMissingFromUniverse: cov.catalogMissingFromUniverse,
    universeNotInCatalog: cov.universeNotInCatalog,
  });

  const unclassified = frame.frame.filter((r) => r.tierSource === "unclassified").length;
  const curatedInFrame = frame.frame.filter((r) => r.tierSource === "curated").length;

  console.log(`fetchedAt                     : ${frame.fetchedAt}`);
  console.log(`universeCount                 : ${frame.universeCount}  (measured AeroDataBox universe)`);
  console.log(`frameCount                    : ${frame.frame.length}  (every feed-eligible universe airport)`);
  console.log(`  curated (our 276 ∩ frame)   : ${curatedInFrame}`);
  console.log(`  unclassified (universe)     : ${unclassified}  (visible, excluded from core sampling)`);
  console.log(`unmapped (no region)          : ${frame.unmapped.length}${frame.unmapped.length ? "  ⚠ " + frame.unmapped.join(", ") : ""}`);
  console.log(`curated catalog total         : ${frame.catalogCount}  (30 HUB + 89 MID + 157 REGIONAL)`);
  console.log(`curated ∩ universe            : ${frame.catalogInUniverse}  (ours that ADB serves)`);
  console.log(`curated in-universe fraction  : ${(frame.curatedInUniverseFraction * 100).toFixed(1)}%`);
  console.log("");
  console.log("Feed eligibility (explicit per layer — NOT one union population):");
  console.log(`  pre_eligible  (has FlightSchedules feed)   : ${frame.preEligibleCount}`);
  console.log(`  post_eligible (has LiveUpdates OR ADS-B)   : ${frame.postEligibleCount}`);
  console.log(`  both (pre AND post)                       : ${frame.bothEligibleCount}`);
  console.log("");
  console.log("Frame validation:");
  console.log(`  exactly-one region per row                : ${frame.unmapped.length === 0 ? "YES" : "NO — " + frame.unmapped.length + " unmapped excluded"}`);
  console.log(`  unclassified ⇒ UNCLASSIFIED (excluded)      : ${unclassified} rows`);

  console.log("Primary strata (traffic tier × macro-region) — PART 1 §4 / §17 step 11:");
  console.log("  cell                          frame   curated");
  for (const s of frame.strata) {
    const flag = s.frameCount === 0 ? "  ⚠ EMPTY" : "";
    console.log(
      `  ${s.tier.padEnd(8)} × ${s.region.padEnd(15)}   ${String(s.frameCount).padStart(5)}      ${String(s.curated).padStart(3)}${flag}`,
    );
  }

  if (frame.emptyCells.length === 0) {
    console.log("\n  → no empty tier × region cells (every stratum has universe airports)");
  } else {
    console.log(
      `\n  → ⚠ WARNING — ${frame.emptyCells.length} empty cell(s):`,
      frame.emptyCells.map((c) => `${c.tier}×${c.region}`).join(", "),
    );
  }

  if (frame.missingFromUniverse.length) {
    console.log(
      `\nMissing from universe (not collectable — stays cataloged, PART 1 §4): ${
        frame.missingFromUniverse.join(", ")
      }`,
    );
  }

  console.log(`\nPersisting frame to clean.adb_sampling_frame (migration 0021)...`);
  const { rows } = await persistFrameToDb(frame);
  console.log(`  → wrote ${rows} rows — the collector now samples from THIS measured frame, not the 276.`);

  console.log(`
Frozen traffic-tier rule v1 (PROVISIONAL — V3.9-f.7 §4.1 requires rebuild with external traffic reference):
  curated catalog airports → their human-classified tier (HUB/MID/REGIONAL).
  all other universe airports → UNCLASSIFIED (tier_source = "unclassified")
  and excluded from core slots. A
  traffic reference snapshot (OAG/Cirium or ACI/FAA 12-month departures) +
  frozen thresholds + region country→macro-region lookup (§4.2) must re-tier
  them before FREEZE (see V3.9-f.7 §4.1/4.2). No tier or region is invented without evidence.
  ⚠ If unclassified >0, frame is NOT YET FINAL per A30 — rebuild required before Gate 1/2 + FREEZE.`);

  console.log(`
Feed eligibility: PRE needs FlightSchedules; POST needs FlightLiveUpdates or
  AdsbUpdates — recorded per airport (pre_eligible / post_eligible) so the
  frame never claims "provider supports airport" = "supports every layer".

Balancing variables (PART 1 §4 — reported WITHIN strata, never crossed):
  network degree · intl/domestic · carrier diversity · time zone
  → from a FIXED reference snapshot at frame-build time.
Zero-yield airports: stay in the frame, tracked, never dropped (PART 1 §4).
Only coverage-failed airports leave the frame.`);

  await pool.end();
}

if (process.argv[1]?.endsWith("build_stratified_catalog.ts")) {
  main().catch(async (err: any) => {
    console.error("catalog build failed:", err?.message || err);
    await pool.end();
    process.exit(1);
  });
}
