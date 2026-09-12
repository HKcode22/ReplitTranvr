/**
 * V3.9 Phase-2 reference/pre-probe freeze owner.
 *
 * OFFLINE ONLY. This command never calls a provider. It refuses unless the
 * binding predecessor artifacts are current and cryptographically valid.
 * Freeze files are write-once: an identical existing freeze is accepted
 * idempotently; changed inputs are refused rather than overwritten.
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { verifyGate1CoverageArtifact, type Gate1CoverageArtifact } from "../server/lib/disruption/gate1Coverage_v39";
import { loadVerifiedPrerequisitePPass } from "../server/lib/disruption/phase2Admission_v39";
import {
  REGION_MAPPING_HASH,
  REGION_MAPPING_RETRIEVAL_DATE,
  REGION_MAPPING_SOURCE,
  REGION_MAPPING_VERSION,
  REGION_REVIEWED_ISO_COUNT,
} from "../server/lib/disruption/regionMapping_v39";
import {
  parseFrozenTrafficReference,
  type FrozenTrafficReferenceV39,
} from "../server/lib/disruption/trafficReference_v39";
import {
  buildPreprobeReferenceFreezeV39,
  verifyPreprobeReferenceFreezeV39,
  type PreprobeFrameRowV39,
  type PreprobeReferenceFreezeV39,
} from "../server/lib/disruption/preprobeReferenceFreeze_v39";
import { frameHash, type FinalFrameRowV39 } from "./build_final_frame_v39";
import { v39Pool } from "../server/lib/disruption/db_v39";

const mode = process.argv[2] === "preprobe" ? "preprobe" : "reference";
const SHA = /^[a-f0-9]{64}$/i;

function sha256(raw: string | Buffer): string {
  return createHash("sha256").update(raw).digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

interface LoadedInputs {
  root: string;
  planSha256: string;
  pArtifactSha256: string;
  gate1: Gate1CoverageArtifact;
  traffic: FrozenTrafficReferenceV39;
  trafficArtifactSha256: string;
}

interface ReferenceFreezeRecordV39 {
  schema_version: "v3.9-reference-freeze-1";
  status: "READY_FROZEN_REFERENCE";
  frozen_at_utc: string;
  plan_sha256: string;
  prerequisite_p_artifact_sha256: string;
  gate1_artifact_sha256: string;
  traffic_reference_artifact_sha256: string;
  traffic_reference_raw_sha256: string;
  traffic_tier_hash: string;
  traffic_source_name: string;
  traffic_source_version: string;
  traffic_retrieval_date: string;
  reference_period_start: string;
  reference_period_end: string;
  traffic_metric_name: string;
  traffic_metric_units: string;
  hub_cut_metric: number;
  tier_cut_rule: string;
  region_mapping_version: string;
  region_mapping_hash: string;
  region_mapping_source: string;
  region_mapping_retrieval_date: string;
  artifact_sha256: string;
}

function unsignedReference(record: ReferenceFreezeRecordV39): Omit<ReferenceFreezeRecordV39, "artifact_sha256"> {
  const { artifact_sha256: _ignored, ...unsigned } = record;
  return unsigned;
}

function verifyReferenceFreeze(input: unknown): input is ReferenceFreezeRecordV39 {
  if (!input || typeof input !== "object") return false;
  const record = input as ReferenceFreezeRecordV39;
  if (record.schema_version !== "v3.9-reference-freeze-1" || record.status !== "READY_FROZEN_REFERENCE") return false;
  if (!SHA.test(record.artifact_sha256)) return false;
  return sha256(canonical(unsignedReference(record))) === record.artifact_sha256;
}

function readJson(path: string, label: string): unknown {
  if (!existsSync(path)) throw new Error(`BLOCKED:${label}_MISSING`);
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { throw new Error(`BLOCKED:${label}_INVALID_JSON`); }
}

function loadInputs(root: string): LoadedInputs {
  const planPath = join(root, "SEPmd", "V3.9_DataCollectPlan_f.8.md");
  if (!existsSync(planPath)) throw new Error("BLOCKED:BINDING_PLAN_MISSING");
  const planSha256 = sha256(readFileSync(planPath));

  const p = loadVerifiedPrerequisitePPass(root);
  if (!SHA.test(p.artifact_sha256)) throw new Error("BLOCKED:PREREQUISITE_P_HASH_INVALID");

  const gate1Path = join(root, "artifacts", "gate1-coverage.json");
  const gate1 = readJson(gate1Path, "GATE1_ARTIFACT");
  if (!verifyGate1CoverageArtifact(gate1)) throw new Error("BLOCKED:GATE1_FRESH_PASS_REQUIRED");

  if (REGION_REVIEWED_ISO_COUNT !== 249) throw new Error("BLOCKED:REGION_MAPPING_ISO_REVIEW_INCOMPLETE");
  if (!SHA.test(REGION_MAPPING_HASH)) throw new Error("BLOCKED:REGION_MAPPING_HASH_INVALID");

  const trafficPath = process.env.V39_TRAFFIC_REFERENCE_FILE || join(root, "artifacts", "traffic-reference-frozen.json");
  if (!existsSync(trafficPath)) throw new Error("BLOCKED:TRAFFIC_REFERENCE_FROZEN_FILE_MISSING");
  const trafficRaw = readFileSync(trafficPath, "utf8");
  const traffic = parseFrozenTrafficReference(trafficRaw);

  return {
    root,
    planSha256,
    pArtifactSha256: p.artifact_sha256,
    gate1,
    traffic,
    trafficArtifactSha256: sha256(trafficRaw),
  };
}

function referenceMatchesCurrent(record: ReferenceFreezeRecordV39, input: LoadedInputs): boolean {
  return record.plan_sha256 === input.planSha256
    && record.prerequisite_p_artifact_sha256 === input.pArtifactSha256
    && record.gate1_artifact_sha256 === input.gate1.artifact_sha256
    && record.traffic_reference_artifact_sha256 === input.trafficArtifactSha256
    && record.traffic_reference_raw_sha256 === input.traffic.raw_reference_sha256
    && record.traffic_tier_hash === input.traffic.tier_hash
    && record.region_mapping_version === REGION_MAPPING_VERSION
    && record.region_mapping_hash === REGION_MAPPING_HASH;
}

function writeReferenceFreeze(input: LoadedInputs): ReferenceFreezeRecordV39 {
  const path = join(input.root, "artifacts", "reference-freeze-record.json");
  if (existsSync(path)) {
    const existing = readJson(path, "REFERENCE_FREEZE_RECORD");
    if (!verifyReferenceFreeze(existing)) throw new Error("BLOCKED:REFERENCE_FREEZE_EXISTING_INVALID");
    if (!referenceMatchesCurrent(existing, input)) throw new Error("BLOCKED:REFERENCE_FREEZE_INPUT_DRIFT_REFUSE_OVERWRITE");
    return existing;
  }

  const base = {
    schema_version: "v3.9-reference-freeze-1" as const,
    status: "READY_FROZEN_REFERENCE" as const,
    frozen_at_utc: new Date().toISOString(),
    plan_sha256: input.planSha256,
    prerequisite_p_artifact_sha256: input.pArtifactSha256,
    gate1_artifact_sha256: input.gate1.artifact_sha256,
    traffic_reference_artifact_sha256: input.trafficArtifactSha256,
    traffic_reference_raw_sha256: input.traffic.raw_reference_sha256,
    traffic_tier_hash: input.traffic.tier_hash,
    traffic_source_name: input.traffic.traffic_source_name,
    traffic_source_version: input.traffic.traffic_source_version,
    traffic_retrieval_date: input.traffic.traffic_retrieval_date,
    reference_period_start: input.traffic.reference_period_start,
    reference_period_end: input.traffic.reference_period_end,
    traffic_metric_name: input.traffic.traffic_metric_name,
    traffic_metric_units: input.traffic.traffic_metric_units,
    hub_cut_metric: input.traffic.hub_cut_metric,
    tier_cut_rule: input.traffic.tier_cut_rule,
    region_mapping_version: REGION_MAPPING_VERSION,
    region_mapping_hash: REGION_MAPPING_HASH,
    region_mapping_source: REGION_MAPPING_SOURCE,
    region_mapping_retrieval_date: REGION_MAPPING_RETRIEVAL_DATE,
  };
  const record: ReferenceFreezeRecordV39 = { ...base, artifact_sha256: sha256(canonical(base)) };
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return record;
}

interface ActiveFrameSnapshot {
  frameVersion: string;
  frameHash: string;
  rows: PreprobeFrameRowV39[];
}

async function loadAndVerifyActiveFrame(input: LoadedInputs): Promise<ActiveFrameSnapshot> {
  const registry = await v39Pool.query(
    `SELECT active_frame_version,frame_hash,traffic_reference_hash,region_mapping_hash,tier_hash
       FROM clean.adb_sampling_frame_registry WHERE registry_key='ACTIVE'`,
  );
  if (registry.rowCount !== 1) throw new Error("BLOCKED:ACTIVE_FINAL_FRAME_REGISTRY_MISSING");
  const reg = registry.rows[0];
  const frameVersion = String(reg.active_frame_version ?? "");
  const registeredFrameHash = String(reg.frame_hash ?? "");
  if (!frameVersion || !SHA.test(registeredFrameHash)) throw new Error("BLOCKED:ACTIVE_FINAL_FRAME_REGISTRY_INVALID");
  if (String(reg.traffic_reference_hash ?? "") !== input.traffic.raw_reference_sha256) {
    throw new Error("BLOCKED:ACTIVE_FRAME_TRAFFIC_REFERENCE_HASH_MISMATCH");
  }
  if (String(reg.region_mapping_hash ?? "") !== REGION_MAPPING_HASH) {
    throw new Error("BLOCKED:ACTIVE_FRAME_REGION_MAPPING_HASH_MISMATCH");
  }
  if (String(reg.tier_hash ?? "") !== input.traffic.tier_hash) throw new Error("BLOCKED:ACTIVE_FRAME_TIER_HASH_MISMATCH");

  const result = await v39Pool.query(
    `SELECT icao,tier,tier_source,tier_verified,traffic_prior,traffic_metric_value,
            region,region_source,exclusion_reason,feed_schedule,feed_live,feed_adsb,
            pre_eligible,post_eligible,out_degree,in_degree,undirected_degree,effective_carriers,intl_share
       FROM clean.adb_sampling_frame
      WHERE frame_version=$1
      ORDER BY icao`,
    [frameVersion],
  );
  if (!result.rowCount) throw new Error("BLOCKED:ACTIVE_FINAL_FRAME_EMPTY");

  const hashRows: FinalFrameRowV39[] = result.rows.map((row) => ({
    icao: String(row.icao),
    tier: row.tier,
    tierSource: row.tier_source,
    tierVerified: Boolean(row.tier_verified),
    trafficPrior: Number(row.traffic_prior),
    trafficMetricValue: row.traffic_metric_value === null ? null : Number(row.traffic_metric_value),
    region: row.region,
    regionSource: row.region_source,
    exclusionReason: row.exclusion_reason,
    feedSchedule: Boolean(row.feed_schedule),
    feedLive: Boolean(row.feed_live),
    feedAdsb: Boolean(row.feed_adsb),
    preEligible: Boolean(row.pre_eligible),
    postEligible: Boolean(row.post_eligible),
    reference: null,
  }));
  const recomputed = frameHash(hashRows);
  if (recomputed !== registeredFrameHash) throw new Error("BLOCKED:ACTIVE_FINAL_FRAME_HASH_MISMATCH");

  const rows: PreprobeFrameRowV39[] = result.rows.map((row) => ({
    icao: String(row.icao),
    tier: String(row.tier),
    tierVerified: Boolean(row.tier_verified),
    region: row.region === null ? null : String(row.region),
    preEligible: Boolean(row.pre_eligible),
    postEligible: Boolean(row.post_eligible),
    trafficMetricValue: row.traffic_metric_value === null ? null : Number(row.traffic_metric_value),
    outDegree: row.out_degree === null ? null : Number(row.out_degree),
    inDegree: row.in_degree === null ? null : Number(row.in_degree),
    undirectedDegree: row.undirected_degree === null ? null : Number(row.undirected_degree),
    effectiveCarriers: row.effective_carriers === null ? null : Number(row.effective_carriers),
    intlShare: row.intl_share === null ? null : Number(row.intl_share),
  }));
  return { frameVersion, frameHash: registeredFrameHash, rows };
}

function existingPreprobeMatches(
  existing: PreprobeReferenceFreezeV39,
  input: LoadedInputs,
  frame: ActiveFrameSnapshot,
): boolean {
  return existing.plan_sha256 === input.planSha256
    && existing.prerequisite_p_artifact_sha256 === input.pArtifactSha256
    && existing.gate1_artifact_sha256 === input.gate1.artifact_sha256
    && existing.traffic_reference_artifact_sha256 === input.trafficArtifactSha256
    && existing.traffic_reference_raw_sha256 === input.traffic.raw_reference_sha256
    && existing.traffic_tier_hash === input.traffic.tier_hash
    && existing.region_mapping_hash === REGION_MAPPING_HASH
    && existing.frame_version === frame.frameVersion
    && existing.frame_hash === frame.frameHash;
}

async function writePreprobeFreeze(input: LoadedInputs): Promise<PreprobeReferenceFreezeV39> {
  const frame = await loadAndVerifyActiveFrame(input);
  const path = join(input.root, "artifacts", "preprobe-reference-freeze-record.json");
  if (existsSync(path)) {
    const existing = readJson(path, "PREPROBE_FREEZE_RECORD");
    if (!verifyPreprobeReferenceFreezeV39(existing)) throw new Error("BLOCKED:PREPROBE_FREEZE_EXISTING_INVALID");
    if (!existingPreprobeMatches(existing, input, frame)) throw new Error("BLOCKED:PREPROBE_FREEZE_INPUT_DRIFT_REFUSE_OVERWRITE");
    return existing;
  }

  const artifact = buildPreprobeReferenceFreezeV39(frame.rows, input.traffic, {
    frozenAtUtc: new Date().toISOString(),
    planSha256: input.planSha256,
    prerequisitePArtifactSha256: input.pArtifactSha256,
    gate1ArtifactSha256: input.gate1.artifact_sha256,
    frameVersion: frame.frameVersion,
    frameHash: frame.frameHash,
    trafficReferenceArtifactSha256: input.trafficArtifactSha256,
    regionMappingVersion: REGION_MAPPING_VERSION,
    regionMappingHash: REGION_MAPPING_HASH,
    regionMappingSource: REGION_MAPPING_SOURCE,
  });
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return artifact;
}

export async function main(): Promise<number> {
  try {
    const input = loadInputs(process.cwd());
    if (mode === "reference") {
      const record = writeReferenceFreeze(input);
      console.log(JSON.stringify({
        status: "PASS",
        mode,
        artifact_sha256: record.artifact_sha256,
        traffic_reference_raw_sha256: record.traffic_reference_raw_sha256,
        tier_hash: record.traffic_tier_hash,
        region_mapping_hash: record.region_mapping_hash,
      }, null, 2));
      return 0;
    }

    const artifact = await writePreprobeFreeze(input);
    console.log(JSON.stringify({
      status: "PASS",
      mode,
      artifact_sha256: artifact.artifact_sha256,
      frame_version: artifact.frame_version,
      frame_hash: artifact.frame_hash,
      diagnostics_hash: artifact.frame_diagnostics_sha256,
      shortlist_count: artifact.shortlist.length,
      replacement_count: artifact.replacements.length,
      degree_cap: artifact.degreeCap,
      carriers_cap: artifact.carriersCap,
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
