/**
 * V3.9 Phase-2 permitted traffic-reference import owner.
 *
 * OFFLINE ONLY: this command never calls AeroDataBox, OAG, Cirium, or any
 * network service. A separately licensed source adapter/export must first
 * produce the provider-neutral normalized JSON envelope accepted here.
 *
 * Ordering is fail-closed: current prerequisite P + fresh Gate-1 PASS must be
 * valid before this command can write the frozen reference artifact.
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import { loadVerifiedPrerequisitePPass } from "../server/lib/disruption/phase2Admission_v39";
import { verifyGate1CoverageArtifact } from "../server/lib/disruption/gate1Coverage_v39";
import {
  buildFrozenTrafficReferenceV39,
  type NormalizedScheduleRouteRowV39,
  type TrafficReferenceBuildMetadataV39,
} from "../server/lib/disruption/trafficReferenceBuilder_v39";
import { parseFrozenTrafficReference } from "../server/lib/disruption/trafficReference_v39";
import { requireTrafficReferenceFreshnessV39 } from "../server/lib/disruption/trafficReferenceFreshness_v39";

interface NormalizedTrafficReferenceInputV39 {
  schema_version: "v3.9-normalized-schedule-reference-input-1";
  metadata: TrafficReferenceBuildMetadataV39;
  rows: NormalizedScheduleRouteRowV39[];
}

interface TrafficReferenceBuildReportV39 {
  schema_version: "v3.9-traffic-reference-build-report-1";
  status: "PASS";
  built_at_utc: string;
  input_file_sha256: string;
  raw_reference_sha256: string;
  normalized_input_sha256: string;
  frozen_artifact_sha256: string;
  source_name: string;
  source_version: string;
  retrieval_date: string;
  reference_period_start: string;
  reference_period_end: string;
  airport_count: number;
  hub_count: number;
  mid_count: number;
  regional_count: number;
  hub_cut_metric: number;
  weekly_route_departure_threshold: number;
  tier_hash: string;
  tier_cut_rule: string;
  diagnostics_summary: {
    airports_with_positive_degree: number;
    airports_with_multiple_effective_carriers: number;
    mean_international_share: number;
  };
}

function sha256(raw: string | Buffer): string {
  return createHash("sha256").update(raw).digest("hex");
}

function readJson(path: string, label: string): unknown {
  if (!existsSync(path)) throw new Error(`BLOCKED:${label}_MISSING`);
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { throw new Error(`BLOCKED:${label}_INVALID_JSON`); }
}

function loadFreshGate1(root: string): void {
  const path = join(root, "artifacts", "gate1-coverage.json");
  const value = readJson(path, "GATE1_ARTIFACT");
  if (!verifyGate1CoverageArtifact(value)) throw new Error("BLOCKED:GATE1_FRESH_PASS_REQUIRED");
}

function parseInput(path: string): { parsed: NormalizedTrafficReferenceInputV39; raw: string } {
  const raw = readFileSync(path, "utf8");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("TRAFFIC_INPUT_INVALID_JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("TRAFFIC_INPUT_NOT_OBJECT");
  const input = value as Partial<NormalizedTrafficReferenceInputV39>;
  if (input.schema_version !== "v3.9-normalized-schedule-reference-input-1") {
    throw new Error("TRAFFIC_INPUT_SCHEMA_VERSION_INVALID");
  }
  if (!input.metadata || !Array.isArray(input.rows)) throw new Error("TRAFFIC_INPUT_METADATA_OR_ROWS_MISSING");
  return { parsed: input as NormalizedTrafficReferenceInputV39, raw };
}

function existingReferenceMatches(path: string, newRaw: string): boolean {
  if (!existsSync(path)) return false;
  const existingRaw = readFileSync(path, "utf8");
  parseFrozenTrafficReference(existingRaw);
  return sha256(existingRaw) === sha256(newRaw);
}

function writeOnce(path: string, raw: string, label: string): void {
  if (!existsSync(path)) {
    writeFileSync(path, raw, { encoding: "utf8", flag: "wx" });
    return;
  }
  if (readFileSync(path, "utf8") !== raw) throw new Error(`BLOCKED:${label}_EXISTS_WITH_DIFFERENT_CONTENT`);
}

function loadMatchingExistingReport(
  path: string,
  expected: Pick<TrafficReferenceBuildReportV39,
    "input_file_sha256" | "raw_reference_sha256" | "normalized_input_sha256" | "frozen_artifact_sha256" | "tier_hash">,
): TrafficReferenceBuildReportV39 | null {
  if (!existsSync(path)) return null;
  const value = readJson(path, "TRAFFIC_REFERENCE_BUILD_REPORT");
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("BLOCKED:TRAFFIC_REFERENCE_BUILD_REPORT_INVALID");
  }
  const report = value as Partial<TrafficReferenceBuildReportV39>;
  if (report.schema_version !== "v3.9-traffic-reference-build-report-1" || report.status !== "PASS") {
    throw new Error("BLOCKED:TRAFFIC_REFERENCE_BUILD_REPORT_INVALID");
  }
  for (const key of ["input_file_sha256", "raw_reference_sha256", "normalized_input_sha256", "frozen_artifact_sha256", "tier_hash"] as const) {
    if (report[key] !== expected[key]) throw new Error(`BLOCKED:TRAFFIC_REFERENCE_BUILD_REPORT_INPUT_DRIFT:${key}`);
  }
  return report as TrafficReferenceBuildReportV39;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const root = process.cwd();
    const inputArg = argv[0];
    if (!inputArg || argv.length > 1) {
      throw new Error("USAGE:v39_build_traffic_reference_v39 <normalized-reference-input.json>");
    }

    // No artifact mutation before the two binding Phase-2 predecessors pass.
    loadVerifiedPrerequisitePPass(root);
    loadFreshGate1(root);

    const inputPath = resolve(root, inputArg);
    if (!existsSync(inputPath)) throw new Error("TRAFFIC_INPUT_FILE_MISSING");
    const input = parseInput(inputPath);
    const builtAt = new Date();
    const built = buildFrozenTrafficReferenceV39(input.parsed.rows, input.parsed.metadata);
    requireTrafficReferenceFreshnessV39(built.reference, builtAt);

    const frozenPath = join(root, "artifacts", "traffic-reference-frozen.json");
    const frozenRaw = `${JSON.stringify(built.reference, null, 2)}\n`;
    if (existsSync(frozenPath) && !existingReferenceMatches(frozenPath, frozenRaw)) {
      throw new Error("BLOCKED:TRAFFIC_REFERENCE_FROZEN_EXISTS_WITH_DIFFERENT_CONTENT");
    }
    writeOnce(frozenPath, frozenRaw, "TRAFFIC_REFERENCE_FROZEN");

    const intlMean = built.diagnostics.length
      ? built.diagnostics.reduce((sum, row) => sum + row.intlShare, 0) / built.diagnostics.length
      : 0;
    const proposedReport: TrafficReferenceBuildReportV39 = {
      schema_version: "v3.9-traffic-reference-build-report-1",
      status: "PASS",
      built_at_utc: builtAt.toISOString(),
      input_file_sha256: sha256(input.raw),
      raw_reference_sha256: built.reference.raw_reference_sha256,
      normalized_input_sha256: built.normalizedInputSha256,
      frozen_artifact_sha256: sha256(frozenRaw),
      source_name: built.reference.traffic_source_name,
      source_version: built.reference.traffic_source_version,
      retrieval_date: built.reference.traffic_retrieval_date,
      reference_period_start: built.reference.reference_period_start,
      reference_period_end: built.reference.reference_period_end,
      airport_count: built.reference.airports.length,
      hub_count: built.hubRankCount,
      mid_count: built.midRankCount,
      regional_count: built.regionalRankCount,
      hub_cut_metric: built.reference.hub_cut_metric,
      weekly_route_departure_threshold: built.weeklyRouteDepartureThreshold,
      tier_hash: built.reference.tier_hash,
      tier_cut_rule: built.reference.tier_cut_rule,
      diagnostics_summary: {
        airports_with_positive_degree: built.diagnostics.filter((row) => row.undirectedDegree > 0).length,
        airports_with_multiple_effective_carriers: built.diagnostics.filter((row) => row.effectiveCarriers > 1).length,
        mean_international_share: intlMean,
      },
    };
    const reportPath = join(root, "artifacts", "traffic-reference-build-report.json");
    const existingReport = loadMatchingExistingReport(reportPath, proposedReport);
    const report = existingReport ?? proposedReport;
    if (!existingReport) {
      writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    }

    console.log(JSON.stringify({
      status: "PASS",
      idempotent_existing_report: Boolean(existingReport),
      frozen_artifact_sha256: report.frozen_artifact_sha256,
      raw_reference_sha256: report.raw_reference_sha256,
      airport_count: report.airport_count,
      hub_count: report.hub_count,
      mid_count: report.mid_count,
      regional_count: report.regional_count,
      hub_cut_metric: report.hub_cut_metric,
      tier_hash: report.tier_hash,
    }, null, 2));
    return 0;
  } catch (error: any) {
    console.error(String(error?.message ?? error));
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main().then((code) => { process.exitCode = code; });
}
