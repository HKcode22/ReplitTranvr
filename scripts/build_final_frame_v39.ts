/**
 * Phase 2D final sampling-frame owner.
 *
 * This is the binding v39:frame:build command. It deliberately refuses before
 * any provider call unless prerequisite P, a fresh valid Gate-1 PASS artifact,
 * and a frozen permitted traffic reference are all present. It does not use
 * curated/human tiers.
 *
 * Provider coverage membership is re-read transiently from the documented-free
 * coverage endpoints and must hash-match the frozen Gate-1 artifact exactly;
 * the membership list is not committed. The final frame then uses the frozen
 * traffic reference for tier/country/longitude/balancing variables and the
 * reviewed country→macro-region mapper for region assignment.
 */
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { applyBootMigrations } from "../server/db";
import { v39Pool } from "../server/lib/disruption/db_v39";
import { getAirportCoverage } from "../server/lib/disruption/adbCollectionController_v3";
import { allCatalogAirports } from "../server/lib/disruption/adbAirportCatalog_v3";
import {
  buildGate1CoverageArtifact,
  verifyGate1CoverageArtifact,
  type Gate1CoverageArtifact,
} from "../server/lib/disruption/gate1Coverage_v39";
import { loadVerifiedPrerequisitePPass } from "../server/lib/disruption/phase2Admission_v39";
import {
  REGION_MAPPING_HASH,
  REGION_MAPPING_SOURCE,
  REGION_MAPPING_VERSION,
  resolveRegion,
  type MacroRegion as RegionCode,
} from "../server/lib/disruption/regionMapping_v39";
import {
  parseFrozenTrafficReference,
  trafficReferenceIndex,
  type FrozenTrafficAirportRow,
  type FrozenTrafficReferenceV39,
  type FrozenTrafficTier,
} from "../server/lib/disruption/trafficReference_v39";

export type FrameTier = FrozenTrafficTier | "UNCLASSIFIED";
export type FrameRegion = "North America" | "Europe" | "Asia-Pacific" | "Gulf/Africa" | "South America" | "Oceania";

const REGION_LABEL: Readonly<Record<RegionCode, FrameRegion>> = Object.freeze({
  NA: "North America",
  EU: "Europe",
  AP: "Asia-Pacific",
  MEA: "Gulf/Africa",
  SA: "South America",
  OC: "Oceania",
});

export interface FinalFrameRowV39 {
  icao: string;
  tier: FrameTier;
  tierSource: "traffic_reference" | "missing_reference";
  tierVerified: boolean;
  trafficPrior: number;
  trafficMetricValue: number | null;
  region: FrameRegion | null;
  regionSource: string | null;
  exclusionReason: string | null;
  feedSchedule: boolean;
  feedLive: boolean;
  feedAdsb: boolean;
  preEligible: boolean;
  postEligible: boolean;
  reference: FrozenTrafficAirportRow | null;
}

export interface CoverageForFinalFrame {
  fetchedAt: string | null;
  universe: Partial<Record<"FlightSchedules" | "FlightLiveUpdates" | "AdsbUpdates", string[]>>;
  universeUnion: string[];
}

function upperSet(values?: string[]): Set<string> {
  return new Set((values ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean));
}

function normalizedStrings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`BLOCKED:COVERAGE_REMEASUREMENT_SHAPE_INVALID:${label}`);
  }
  return [...new Set(value.map((item) => item.trim().toUpperCase()).filter(Boolean))].sort();
}

/**
 * The live collection controller exposes coverage as { feeds, all }, whereas
 * the Phase-2D frame builder intentionally uses the narrower
 * { universe, universeUnion } shape. Keep that boundary explicit and validate
 * it fail-closed so controller refactors cannot silently corrupt a frame.
 */
export function normalizeAirportCoverageForFinalFrame(input: unknown): CoverageForFinalFrame {
  if (!input || typeof input !== "object") {
    throw new Error("BLOCKED:COVERAGE_REMEASUREMENT_SHAPE_INVALID:root");
  }
  const raw = input as Record<string, unknown>;
  if (!raw.feeds || typeof raw.feeds !== "object") {
    throw new Error("BLOCKED:COVERAGE_REMEASUREMENT_SHAPE_INVALID:feeds");
  }
  const feeds = raw.feeds as Record<string, unknown>;
  const schedule = normalizedStrings(feeds.FlightSchedules, "FlightSchedules");
  const live = normalizedStrings(feeds.FlightLiveUpdates, "FlightLiveUpdates");
  const adsb = normalizedStrings(feeds.AdsbUpdates, "AdsbUpdates");
  const reportedAll = normalizedStrings(raw.all, "all");
  const recomputedAll = [...new Set([...schedule, ...live, ...adsb])].sort();
  if (reportedAll.length !== recomputedAll.length || reportedAll.some((icao, i) => icao !== recomputedAll[i])) {
    throw new Error("BLOCKED:COVERAGE_REMEASUREMENT_SHAPE_INVALID:all_union_mismatch");
  }
  return {
    fetchedAt: typeof raw.fetchedAt === "string" ? raw.fetchedAt : null,
    universe: {
      FlightSchedules: schedule,
      FlightLiveUpdates: live,
      AdsbUpdates: adsb,
    },
    universeUnion: recomputedAll,
  };
}

function trafficPrior(tier: FrameTier): number {
  return tier === "HUB" ? 3 : tier === "MID" ? 1.5 : 1;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value), "utf8").digest("hex");
}

export function buildFinalFrameRows(
  coverage: CoverageForFinalFrame,
  traffic: FrozenTrafficReferenceV39,
): FinalFrameRowV39[] {
  const reference = trafficReferenceIndex(traffic);
  const schedule = upperSet(coverage.universe.FlightSchedules);
  const live = upperSet(coverage.universe.FlightLiveUpdates);
  const adsb = upperSet(coverage.universe.AdsbUpdates);
  const uniqueUniverse = [...new Set(coverage.universeUnion.map((icao) => icao.trim().toUpperCase()).filter(Boolean))].sort();

  return uniqueUniverse.map((icao) => {
    const ref = reference.get(icao) ?? null;
    const tier: FrameTier = ref?.tier ?? "UNCLASSIFIED";
    const feedSchedule = schedule.has(icao);
    const feedLive = live.has(icao);
    const feedAdsb = adsb.has(icao);
    let region: FrameRegion | null = null;
    let regionSource: string | null = null;
    const exclusions: string[] = [];

    if (!ref) {
      exclusions.push("UNCLASSIFIED_TIER", "MISSING_TRAFFIC_REFERENCE", "UNMAPPED_REGION");
    } else {
      const resolved = resolveRegion(ref.country_iso2, ref.longitude_e);
      if (resolved === "UNMAPPED") {
        exclusions.push("UNMAPPED_REGION");
      } else {
        region = REGION_LABEL[resolved];
        regionSource = `${REGION_MAPPING_VERSION}@${REGION_MAPPING_HASH}`;
      }
    }
    if (!feedSchedule) exclusions.push("PRE_FEED_INELIGIBLE");
    if (!(feedLive || feedAdsb)) exclusions.push("POST_FEED_INELIGIBLE");

    return {
      icao,
      tier,
      tierSource: ref ? "traffic_reference" : "missing_reference",
      tierVerified: Boolean(ref),
      trafficPrior: trafficPrior(tier),
      trafficMetricValue: ref?.traffic_metric_value ?? null,
      region,
      regionSource,
      exclusionReason: exclusions.length ? [...new Set(exclusions)].join(";") : null,
      feedSchedule,
      feedLive,
      feedAdsb,
      preEligible: feedSchedule,
      postEligible: feedLive || feedAdsb,
      reference: ref,
    };
  });
}

export function frameHash(rows: readonly FinalFrameRowV39[]): string {
  return sha256(rows.map((row) => ({
    icao: row.icao,
    tier: row.tier,
    tier_source: row.tierSource,
    tier_verified: row.tierVerified,
    traffic_prior: row.trafficPrior,
    traffic_metric_value: row.trafficMetricValue,
    region: row.region,
    region_source: row.regionSource,
    exclusion_reason: row.exclusionReason,
    feed_schedule: row.feedSchedule,
    feed_live: row.feedLive,
    feed_adsb: row.feedAdsb,
    pre_eligible: row.preEligible,
    post_eligible: row.postEligible,
  })).sort((a, b) => a.icao.localeCompare(b.icao)));
}

function loadGate1Artifact(root: string): Gate1CoverageArtifact {
  const file = join(root, "artifacts", "gate1-coverage.json");
  if (!existsSync(file)) throw new Error("BLOCKED:GATE1_ARTIFACT_MISSING");
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(file, "utf8")); } catch { throw new Error("BLOCKED:GATE1_ARTIFACT_INVALID_JSON"); }
  if (!verifyGate1CoverageArtifact(parsed)) throw new Error("BLOCKED:GATE1_FRESH_PASS_REQUIRED");
  return parsed;
}

function loadTrafficReference(root: string): FrozenTrafficReferenceV39 {
  const file = process.env.V39_TRAFFIC_REFERENCE_FILE || join(root, "artifacts", "traffic-reference-frozen.json");
  if (!existsSync(file)) throw new Error("BLOCKED:TRAFFIC_REFERENCE_FROZEN_FILE_MISSING");
  return parseFrozenTrafficReference(readFileSync(file, "utf8"));
}

function assertCoverageMatchesGate1(coverage: CoverageForFinalFrame, gate1: Gate1CoverageArtifact): void {
  const rebuilt = buildGate1CoverageArtifact(
    {
      feeds: {
        FlightSchedules: { airports: coverage.universe.FlightSchedules ?? [] },
        FlightLiveUpdates: { airports: coverage.universe.FlightLiveUpdates ?? [] },
        AdsbUpdates: { airports: coverage.universe.AdsbUpdates ?? [] },
      },
      catalogIcaos: allCatalogAirports,
      fetchedAtUtc: gate1.coverage!.fetched_at_utc,
      providerPin: gate1.coverage!.provider_pin,
    },
    { evidenceId: gate1.evidence_id, authorizationId: gate1.authorization_id },
  );
  if (rebuilt.status !== "PASS" || !rebuilt.coverage || !gate1.coverage) throw new Error("BLOCKED:GATE1_COVERAGE_REBUILD_FAILED");
  if (rebuilt.coverage.universe_set_sha256 !== gate1.coverage.universe_set_sha256) throw new Error("BLOCKED:COVERAGE_UNIVERSE_DRIFT_SINCE_GATE1");
  for (const service of ["FlightSchedules", "FlightLiveUpdates", "AdsbUpdates"] as const) {
    if (rebuilt.coverage.per_feed[service].response_sha256 !== gate1.coverage.per_feed[service].response_sha256) {
      throw new Error(`BLOCKED:COVERAGE_FEED_DRIFT_SINCE_GATE1:${service}`);
    }
  }
}

async function persistFinalFrame(rows: FinalFrameRowV39[], traffic: FrozenTrafficReferenceV39): Promise<{ frameVersion: string; frameHash: string }> {
  if (!rows.length) throw new Error("BLOCKED:FINAL_FRAME_EMPTY");
  const hash = frameHash(rows);
  const version = `frame_${hash.slice(0, 16)}`;
  const client = await v39Pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      const ref = row.reference;
      await client.query(
        `INSERT INTO clean.adb_sampling_frame
           (icao,tier,tier_source,tier_verified,traffic_prior,traffic_metric_name,traffic_metric_value,traffic_metric_units,
            traffic_reference_hash,country_iso2,airport_longitude_e,airport_timezone,out_degree,in_degree,undirected_degree,
            effective_carriers,intl_share,region,region_source,exclusion_reason,feed_schedule,feed_live,feed_adsb,
            pre_eligible,post_eligible,in_frame,frame_version,frame_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,true,$26,$27)
         ON CONFLICT (icao,frame_version) DO UPDATE SET
           tier=EXCLUDED.tier,tier_source=EXCLUDED.tier_source,tier_verified=EXCLUDED.tier_verified,
           traffic_prior=EXCLUDED.traffic_prior,traffic_metric_name=EXCLUDED.traffic_metric_name,
           traffic_metric_value=EXCLUDED.traffic_metric_value,traffic_metric_units=EXCLUDED.traffic_metric_units,
           traffic_reference_hash=EXCLUDED.traffic_reference_hash,country_iso2=EXCLUDED.country_iso2,
           airport_longitude_e=EXCLUDED.airport_longitude_e,airport_timezone=EXCLUDED.airport_timezone,
           out_degree=EXCLUDED.out_degree,in_degree=EXCLUDED.in_degree,undirected_degree=EXCLUDED.undirected_degree,
           effective_carriers=EXCLUDED.effective_carriers,intl_share=EXCLUDED.intl_share,region=EXCLUDED.region,
           region_source=EXCLUDED.region_source,exclusion_reason=EXCLUDED.exclusion_reason,
           feed_schedule=EXCLUDED.feed_schedule,feed_live=EXCLUDED.feed_live,feed_adsb=EXCLUDED.feed_adsb,
           pre_eligible=EXCLUDED.pre_eligible,post_eligible=EXCLUDED.post_eligible,in_frame=true,frame_hash=EXCLUDED.frame_hash`,
        [
          row.icao, row.tier, row.tierSource, row.tierVerified, row.trafficPrior,
          traffic.traffic_metric_name, row.trafficMetricValue, traffic.traffic_metric_units,
          traffic.raw_reference_sha256, ref?.country_iso2 ?? null, ref?.longitude_e ?? null, ref?.airport_timezone ?? null,
          ref?.out_degree ?? null, ref?.in_degree ?? null, ref?.undirected_degree ?? null,
          ref?.effective_carriers ?? null, ref?.intl_share ?? null,
          row.region, row.regionSource, row.exclusionReason,
          row.feedSchedule, row.feedLive, row.feedAdsb, row.preEligible, row.postEligible,
          version, hash,
        ],
      );
    }
    await client.query(
      `INSERT INTO clean.adb_sampling_frame_registry
         (registry_key,active_frame_version,frame_hash,activated_at,traffic_reference_hash,region_mapping_hash,tier_hash,
          traffic_source_name,traffic_source_version,traffic_retrieval_date,reference_period_start,reference_period_end,
          traffic_metric_name,traffic_metric_units,tier_rule_json)
       VALUES ('ACTIVE',$1,$2,now(),$3,$4,$5,$6,$7,$8::date,$9::date,$10::date,$11,$12,$13::jsonb)
       ON CONFLICT (registry_key) DO UPDATE SET
         active_frame_version=EXCLUDED.active_frame_version,frame_hash=EXCLUDED.frame_hash,activated_at=EXCLUDED.activated_at,
         traffic_reference_hash=EXCLUDED.traffic_reference_hash,region_mapping_hash=EXCLUDED.region_mapping_hash,
         tier_hash=EXCLUDED.tier_hash,traffic_source_name=EXCLUDED.traffic_source_name,
         traffic_source_version=EXCLUDED.traffic_source_version,traffic_retrieval_date=EXCLUDED.traffic_retrieval_date,
         reference_period_start=EXCLUDED.reference_period_start,reference_period_end=EXCLUDED.reference_period_end,
         traffic_metric_name=EXCLUDED.traffic_metric_name,traffic_metric_units=EXCLUDED.traffic_metric_units,
         tier_rule_json=EXCLUDED.tier_rule_json`,
      [
        version, hash, traffic.raw_reference_sha256, REGION_MAPPING_HASH, traffic.tier_hash,
        traffic.traffic_source_name, traffic.traffic_source_version, traffic.traffic_retrieval_date,
        traffic.reference_period_start, traffic.reference_period_end, traffic.traffic_metric_name, traffic.traffic_metric_units,
        JSON.stringify({ hub_cut_metric: traffic.hub_cut_metric, tier_cut_rule: traffic.tier_cut_rule }),
      ],
    );
    await client.query("COMMIT");
    return { frameVersion: version, frameHash: hash };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function main(): Promise<number> {
  const root = process.cwd();
  try {
    // P is re-verified here even though Gate 1 also requires it. This prevents
    // stale/copied Gate-1 evidence or a direct frame invocation from bypassing
    // the prerequisite after Plan/retention/inventory code changes.
    loadVerifiedPrerequisitePPass(root);

    // Check all remaining non-provider prerequisites before touching a coverage endpoint.
    const gate1 = loadGate1Artifact(root);
    const traffic = loadTrafficReference(root);

    // Only now is a documented-free coverage re-read allowed; it must match the
    // frozen Gate-1 set exactly or the final frame build refuses.
    const liveCoverage = await getAirportCoverage();
    if (!liveCoverage) throw new Error("BLOCKED:COVERAGE_REMEASUREMENT_UNAVAILABLE");
    const coverage = normalizeAirportCoverageForFinalFrame(liveCoverage);
    assertCoverageMatchesGate1(coverage, gate1);

    const rows = buildFinalFrameRows(coverage, traffic);
    const verified = rows.filter((row) => row.tierVerified);
    const dualEligible = verified.filter((row) => row.region && row.preEligible && row.postEligible);
    if (!verified.length) throw new Error("BLOCKED:NO_TIER_VERIFIED_AIRPORTS");
    if (!dualEligible.length) throw new Error("BLOCKED:NO_DUAL_ELIGIBLE_MAPPED_AIRPORTS");

    await applyBootMigrations();
    const persisted = await persistFinalFrame(rows, traffic);
    console.log(JSON.stringify({
      status: "PASS",
      frame_version: persisted.frameVersion,
      frame_hash: persisted.frameHash,
      frame_rows: rows.length,
      tier_verified: verified.length,
      missing_reference: rows.length - verified.length,
      mapped_dual_eligible: dualEligible.length,
      traffic_reference_hash: traffic.raw_reference_sha256,
      tier_hash: traffic.tier_hash,
      region_mapping_version: REGION_MAPPING_VERSION,
      region_mapping_hash: REGION_MAPPING_HASH,
      region_mapping_source: REGION_MAPPING_SOURCE,
    }, null, 2));
    return 0;
  } catch (error: any) {
    console.error(String(error?.message ?? error));
    return 1;
  } finally {
    await v39Pool.end().catch(() => undefined);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().then((code) => { process.exitCode = code; });
}
