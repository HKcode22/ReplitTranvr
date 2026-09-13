import { createHash } from "crypto";
import {
  ANCHOR_CAPACITY_GATE_ROWS_PER_HOUR,
  PROBE_CAP_DAILY,
} from "./adbAirportCatalog_v3";
import type { FrozenProbeArtifact, FrozenProbeCandidate } from "./anchorPromotion_v39";
import {
  buildFrameDiagnostics18V39,
  frameDiagnosticsHashV39,
  FRAME_DIAGNOSTIC_REGIONS_V39,
  type FrameDiagnosticCellV39,
  type FrameDiagnosticRegionV39,
} from "./frameDiagnostics_v39";
import type { FrozenTrafficReferenceV39 } from "./trafficReference_v39";

export const PREPROBE_FREEZE_SCHEMA_V39 = "v3.9-preprobe-reference-freeze-1" as const;
export const PREPROBE_STAGE1_TARGET_MINUTES_V39 = 120;
export const PREPROBE_STAGE2_TARGET_MINUTES_V39 = 240;
export const PREPROBE_DEFAULT_UTC_SLOT_HOUR_V39 = 12;
export const PREPROBE_DEFAULT_WEEKDAY_CLASS_V39 = "weekday" as const;

export interface PreprobeFrameRowV39 {
  icao: string;
  tier: string;
  tierVerified: boolean;
  region: string | null;
  preEligible: boolean;
  postEligible: boolean;
  trafficMetricValue: number | null;
  outDegree: number | null;
  inDegree: number | null;
  undirectedDegree: number | null;
  effectiveCarriers: number | null;
  intlShare: number | null;
}

export interface PreprobeFreezeEvidenceV39 {
  frozenAtUtc: string;
  planSha256: string;
  prerequisitePArtifactSha256: string;
  gate1ArtifactSha256: string;
  frameVersion: string;
  frameHash: string;
  trafficReferenceArtifactSha256: string;
  regionMappingVersion: string;
  regionMappingHash: string;
  regionMappingSource: string;
}

export interface PreprobeReferenceFreezeV39 extends FrozenProbeArtifact {
  schema_version: typeof PREPROBE_FREEZE_SCHEMA_V39;
  status: "READY_FROZEN_PREPROBE_REFERENCE";
  frozen_at_utc: string;
  artifact_sha256: string;
  plan_sha256: string;
  prerequisite_p_artifact_sha256: string;
  gate1_artifact_sha256: string;
  frame_version: string;
  frame_hash: string;
  frame_diagnostics: FrameDiagnosticCellV39[];
  frame_diagnostics_sha256: string;
  traffic_reference_artifact_sha256: string;
  traffic_reference_raw_sha256: string;
  traffic_tier_hash: string;
  traffic_source_name: string;
  traffic_source_version: string;
  traffic_reference_period: { start: string; end: string };
  tier_cut_rule: string;
  region_mapping_version: string;
  region_mapping_hash: string;
  region_mapping_source: string;
  normalization: {
    method: "nearest-rank-p90-non-null-frame";
    degreeCap: number;
    carriersCap: number;
  };
  shortlist_selection: {
    method: "mandatory-reference-seed-then-region-round-robin-exogenous-priority-v1";
    mandatory: ["WSSS", "OMAA"];
    score_formula: string;
    region_order: readonly FrameDiagnosticRegionV39[];
  };
  probe_protocol: {
    capacityGateRowsPerHour: number;
    probeBudgetDayHardCapCredits: number;
    stage1TargetMinutes: number;
    stage2TargetMinutes: number;
    scoreFormula: string;
    yieldFormula: string;
  };
  probeTimeClass: {
    stage1UtcSlotHour: number;
    stage1WeekdayClass: "weekday" | "weekend";
    stage2UtcSlotHour: number;
    stage2WeekdayClass: "weekday" | "weekend";
  };
}

const SHA = /^[a-f0-9]{64}$/i;
const ICAO = /^[A-Z0-9]{4}$/;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value), "utf8").digest("hex");
}

function assertSha(value: string, label: string): void {
  if (!SHA.test(value)) throw new Error(`PREPROBE_FREEZE_${label.toUpperCase()}_INVALID`);
}

function nearestRankP90(values: readonly number[], label: string): number {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (!valid.length) throw new Error(`PREPROBE_FREEZE_${label.toUpperCase()}_CAP_UNAVAILABLE`);
  const rank = Math.ceil(0.9 * valid.length);
  const value = valid[Math.max(0, rank - 1)];
  if (!(value > 0)) throw new Error(`PREPROBE_FREEZE_${label.toUpperCase()}_CAP_NONPOSITIVE`);
  return value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function exogenousPriority(
  row: PreprobeFrameRowV39,
  traffic: FrozenTrafficReferenceV39,
  degreeCap: number,
  carriersCap: number,
  regionShare: number,
): number {
  const trafficScore = clamp01((row.trafficMetricValue ?? 0) / traffic.hub_cut_metric);
  const degreeNorm = clamp01((row.undirectedDegree ?? 0) / degreeCap);
  const carrierNorm = clamp01((row.effectiveCarriers ?? 0) / carriersCap);
  const intl = clamp01(row.intlShare ?? 0);
  const rarity = clamp01(1 - regionShare);
  const geo = 0.5 * degreeNorm + 0.3 * intl + 0.2 * rarity;
  const carrier = 0.6 * carrierNorm + 0.4 * intl;
  // Anchor weights excluding the not-yet-observed 20% yield component, then
  // rescaled to [0,1]. This is only a Stage-1 shortlist prior, never a final
  // anchor score and never uses probe/Phase-6 outcomes.
  return (0.4 * trafficScore + 0.2 * geo + 0.2 * carrier) / 0.8;
}

function validateCandidateRow(row: PreprobeFrameRowV39): void {
  if (!ICAO.test(row.icao)) throw new Error(`PREPROBE_FREEZE_ICAO_INVALID:${row.icao}`);
  if (row.tier !== "HUB" || !row.tierVerified || !row.region || !row.preEligible || !row.postEligible) {
    throw new Error(`PREPROBE_FREEZE_CANDIDATE_NOT_DUAL_HUB:${row.icao}`);
  }
  for (const [label, value] of [
    ["traffic", row.trafficMetricValue],
    ["degree", row.undirectedDegree],
    ["carriers", row.effectiveCarriers],
    ["intl", row.intlShare],
  ] as const) {
    if (value === null || !Number.isFinite(value) || value < 0) {
      throw new Error(`PREPROBE_FREEZE_CANDIDATE_${label.toUpperCase()}_INVALID:${row.icao}`);
    }
  }
  if ((row.intlShare ?? 0) > 1) throw new Error(`PREPROBE_FREEZE_CANDIDATE_INTL_INVALID:${row.icao}`);
}

interface ScoredCandidate {
  row: PreprobeFrameRowV39;
  score: number;
  regionShare: number;
}

function toFrozenCandidate(candidate: ScoredCandidate): FrozenProbeCandidate {
  const row = candidate.row;
  return {
    icao: row.icao,
    region: row.region!,
    tier: row.tier,
    preEligible: row.preEligible,
    postEligible: row.postEligible,
    trafficMetricValue: row.trafficMetricValue!,
    degree: row.undirectedDegree!,
    effectiveCarriers: row.effectiveCarriers!,
    intlShare: row.intlShare!,
    regionShare: candidate.regionShare,
  };
}

function selectShortlistAndReplacements(
  rows: readonly PreprobeFrameRowV39[],
  traffic: FrozenTrafficReferenceV39,
  degreeCap: number,
  carriersCap: number,
): { shortlist: FrozenProbeCandidate[]; replacements: FrozenProbeCandidate[] } {
  const mapped = rows.filter((row) => row.region !== null);
  if (!mapped.length) throw new Error("PREPROBE_FREEZE_NO_MAPPED_FRAME_ROWS");
  const regionCounts = new Map<string, number>();
  for (const row of mapped) regionCounts.set(row.region!, (regionCounts.get(row.region!) ?? 0) + 1);

  const hubRows = rows.filter((row) => row.tier === "HUB" && row.tierVerified && row.region && row.preEligible && row.postEligible);
  if (hubRows.length < 12) throw new Error(`PREPROBE_FREEZE_UNSAT_DUAL_HUB_COUNT:${hubRows.length}`);
  for (const row of hubRows) validateCandidateRow(row);

  const scored: ScoredCandidate[] = hubRows.map((row) => {
    const regionShare = (regionCounts.get(row.region!) ?? 0) / mapped.length;
    return { row, regionShare, score: exogenousPriority(row, traffic, degreeCap, carriersCap, regionShare) };
  });
  const byIcao = new Map(scored.map((candidate) => [candidate.row.icao, candidate]));
  for (const required of ["WSSS", "OMAA"] as const) {
    if (!byIcao.has(required)) throw new Error(`PREPROBE_FREEZE_UNSAT_REQUIRED_DUAL_HUB:${required}`);
  }

  const shortlist: ScoredCandidate[] = [byIcao.get("WSSS")!, byIcao.get("OMAA")!];
  const selected = new Set(shortlist.map((candidate) => candidate.row.icao));
  const byRegion = new Map<string, ScoredCandidate[]>();
  for (const candidate of scored) {
    if (selected.has(candidate.row.icao)) continue;
    const bucket = byRegion.get(candidate.row.region!) ?? [];
    bucket.push(candidate);
    byRegion.set(candidate.row.region!, bucket);
  }
  for (const bucket of byRegion.values()) bucket.sort((a, b) => b.score - a.score || a.row.icao.localeCompare(b.row.icao));

  while (shortlist.length < 12) {
    let progressed = false;
    for (const region of FRAME_DIAGNOSTIC_REGIONS_V39) {
      const bucket = byRegion.get(region);
      const next = bucket?.shift();
      if (!next) continue;
      shortlist.push(next);
      selected.add(next.row.icao);
      progressed = true;
      if (shortlist.length === 12) break;
    }
    if (!progressed) break;
  }
  if (shortlist.length !== 12) throw new Error(`PREPROBE_FREEZE_UNSAT_SHORTLIST_COUNT:${shortlist.length}`);

  const replacements = scored
    .filter((candidate) => !selected.has(candidate.row.icao))
    .sort((a, b) => b.score - a.score || a.row.icao.localeCompare(b.row.icao));
  return {
    shortlist: shortlist.map(toFrozenCandidate),
    replacements: replacements.map(toFrozenCandidate),
  };
}

function unsignedArtifact(artifact: PreprobeReferenceFreezeV39): Omit<PreprobeReferenceFreezeV39, "artifact_sha256"> {
  const { artifact_sha256: _ignored, ...unsigned } = artifact;
  return unsigned;
}

export function verifyPreprobeReferenceFreezeV39(input: unknown): input is PreprobeReferenceFreezeV39 {
  if (!input || typeof input !== "object") return false;
  const artifact = input as PreprobeReferenceFreezeV39;
  if (artifact.schema_version !== PREPROBE_FREEZE_SCHEMA_V39 || artifact.status !== "READY_FROZEN_PREPROBE_REFERENCE") return false;
  if (!SHA.test(artifact.artifact_sha256) || sha256(unsignedArtifact(artifact)) !== artifact.artifact_sha256) return false;
  if (!SHA.test(artifact.frame_hash) || !SHA.test(artifact.frame_diagnostics_sha256)) return false;
  if (!Array.isArray(artifact.frame_diagnostics) || artifact.frame_diagnostics.length !== 18) return false;
  if (frameDiagnosticsHashV39(artifact.frame_diagnostics) !== artifact.frame_diagnostics_sha256) return false;
  if (!Array.isArray(artifact.shortlist) || artifact.shortlist.length !== 12) return false;
  if (!artifact.shortlist.some((c) => c.icao === "WSSS") || !artifact.shortlist.some((c) => c.icao === "OMAA")) return false;
  const all = [...artifact.shortlist, ...(artifact.replacements ?? [])];
  if (new Set(all.map((c) => c.icao)).size !== all.length) return false;
  if (!all.every((c) => c.tier === "HUB" && c.preEligible && c.postEligible)) return false;
  if (!(artifact.degreeCap > 0 && artifact.carriersCap > 0 && artifact.hubCutMetric > 0)) return false;
  return true;
}

export function buildPreprobeReferenceFreezeV39(
  rows: readonly PreprobeFrameRowV39[],
  traffic: FrozenTrafficReferenceV39,
  evidence: PreprobeFreezeEvidenceV39,
): PreprobeReferenceFreezeV39 {
  for (const [label, value] of [
    ["plan_sha256", evidence.planSha256],
    ["prerequisite_p_artifact_sha256", evidence.prerequisitePArtifactSha256],
    ["gate1_artifact_sha256", evidence.gate1ArtifactSha256],
    ["frame_hash", evidence.frameHash],
    ["traffic_reference_artifact_sha256", evidence.trafficReferenceArtifactSha256],
    ["region_mapping_hash", evidence.regionMappingHash],
  ] as const) assertSha(value, label);
  if (!evidence.frameVersion.trim() || !evidence.regionMappingVersion.trim() || !evidence.regionMappingSource.trim()) {
    throw new Error("PREPROBE_FREEZE_EVIDENCE_METADATA_MISSING");
  }
  const frozenAt = new Date(evidence.frozenAtUtc);
  if (!Number.isFinite(frozenAt.getTime())) throw new Error("PREPROBE_FREEZE_FROZEN_AT_INVALID");
  if (!rows.length) throw new Error("PREPROBE_FREEZE_FRAME_EMPTY");

  // Binding Plan: normalization caps use every non-null frame-airport value.
  // Region mapping/tier eligibility constrain the shortlist, not the cap denominator.
  const degreeCap = nearestRankP90(rows.map((row) => row.undirectedDegree).filter((x): x is number => x !== null), "degree");
  const carriersCap = nearestRankP90(rows.map((row) => row.effectiveCarriers).filter((x): x is number => x !== null), "carriers");
  const selected = selectShortlistAndReplacements(rows, traffic, degreeCap, carriersCap);
  const diagnostics = buildFrameDiagnostics18V39(rows);

  const base = {
    schema_version: PREPROBE_FREEZE_SCHEMA_V39,
    status: "READY_FROZEN_PREPROBE_REFERENCE" as const,
    version: "v39-preprobe-reference-v1",
    frozen_at_utc: frozenAt.toISOString(),
    plan_sha256: evidence.planSha256.toLowerCase(),
    prerequisite_p_artifact_sha256: evidence.prerequisitePArtifactSha256.toLowerCase(),
    gate1_artifact_sha256: evidence.gate1ArtifactSha256.toLowerCase(),
    frame_version: evidence.frameVersion,
    frame_hash: evidence.frameHash.toLowerCase(),
    frame_diagnostics: diagnostics,
    frame_diagnostics_sha256: frameDiagnosticsHashV39(diagnostics),
    traffic_reference_artifact_sha256: evidence.trafficReferenceArtifactSha256.toLowerCase(),
    traffic_reference_raw_sha256: traffic.raw_reference_sha256,
    traffic_tier_hash: traffic.tier_hash,
    traffic_source_name: traffic.traffic_source_name,
    traffic_source_version: traffic.traffic_source_version,
    traffic_reference_period: { start: traffic.reference_period_start, end: traffic.reference_period_end },
    tier_cut_rule: traffic.tier_cut_rule,
    region_mapping_version: evidence.regionMappingVersion,
    region_mapping_hash: evidence.regionMappingHash.toLowerCase(),
    region_mapping_source: evidence.regionMappingSource,
    shortlist: selected.shortlist,
    replacements: selected.replacements,
    hubCutMetric: traffic.hub_cut_metric,
    degreeCap,
    carriersCap,
    normalization: {
      method: "nearest-rank-p90-non-null-frame" as const,
      degreeCap,
      carriersCap,
    },
    shortlist_selection: {
      method: "mandatory-reference-seed-then-region-round-robin-exogenous-priority-v1" as const,
      mandatory: ["WSSS", "OMAA"] as ["WSSS", "OMAA"],
      score_formula: "(0.40*traffic_score+0.20*geo_score+0.20*carrier_score)/0.80; no observed yield",
      region_order: FRAME_DIAGNOSTIC_REGIONS_V39,
    },
    probe_protocol: {
      capacityGateRowsPerHour: ANCHOR_CAPACITY_GATE_ROWS_PER_HOUR,
      probeBudgetDayHardCapCredits: PROBE_CAP_DAILY,
      stage1TargetMinutes: PREPROBE_STAGE1_TARGET_MINUTES_V39,
      stage2TargetMinutes: PREPROBE_STAGE2_TARGET_MINUTES_V39,
      scoreFormula: "anchor_score=0.40*traffic+0.20*geo+0.20*carrier+0.20*yield",
      yieldFormula: "mean(clamp01(unique_flights_per_credit/reference),clamp01(tail_chain_links_per_credit/reference),clamp01(stability/reference))",
    },
    probeTimeClass: {
      stage1UtcSlotHour: PREPROBE_DEFAULT_UTC_SLOT_HOUR_V39,
      stage1WeekdayClass: PREPROBE_DEFAULT_WEEKDAY_CLASS_V39,
      stage2UtcSlotHour: PREPROBE_DEFAULT_UTC_SLOT_HOUR_V39,
      stage2WeekdayClass: PREPROBE_DEFAULT_WEEKDAY_CLASS_V39,
    },
  };
  const artifact = { ...base, artifact_sha256: sha256(base) } as PreprobeReferenceFreezeV39;
  if (!verifyPreprobeReferenceFreezeV39(artifact)) throw new Error("PREPROBE_FREEZE_INTERNAL_VERIFICATION_FAILED");
  return artifact;
}
