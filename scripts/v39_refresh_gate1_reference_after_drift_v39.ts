import "dotenv/config";
import { createHash } from "crypto";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join, relative } from "path";
import {
  verifyGate1CoverageArtifact,
  type Gate1CoverageArtifact,
} from "../server/lib/disruption/gate1Coverage_v39";
import { loadVerifiedPrerequisitePPass } from "../server/lib/disruption/phase2Admission_v39";
import {
  REGION_MAPPING_HASH,
  REGION_MAPPING_VERSION,
} from "../server/lib/disruption/regionMapping_v39";
import { parseFrozenTrafficReference } from "../server/lib/disruption/trafficReference_v39";
import { runGate1Coverage, verifyPrerequisitePPassFile } from "./measure_coverage";
import { parseArgs } from "./v39_paid_guard_v39";

const SHA = /^[a-f0-9]{64}$/i;

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
  region_mapping_version: string;
  region_mapping_hash: string;
  artifact_sha256: string;
  [key: string]: unknown;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function sha256(raw: string | Buffer): string {
  return createHash("sha256").update(raw).digest("hex");
}

function verifyReferenceFreeze(input: unknown): input is ReferenceFreezeRecordV39 {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const record = input as ReferenceFreezeRecordV39;
  if (record.schema_version !== "v3.9-reference-freeze-1" || record.status !== "READY_FROZEN_REFERENCE") return false;
  if (!SHA.test(String(record.artifact_sha256 ?? ""))) return false;
  const { artifact_sha256: _ignored, ...unsigned } = record;
  return sha256(canonical(unsigned)) === record.artifact_sha256;
}

function archiveExact(path: string, raw: string): void {
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== raw) throw new Error(`BLOCKED:PHASE2_HISTORY_COLLISION:${path}`);
    return;
  }
  writeFileSync(path, raw, { encoding: "utf8", flag: "wx" });
}

function readJsonFile<T>(path: string, label: string): { raw: string; value: T } {
  if (!existsSync(path)) throw new Error(`BLOCKED:${label}_MISSING`);
  const raw = readFileSync(path, "utf8");
  try {
    return { raw, value: JSON.parse(raw) as T };
  } catch {
    throw new Error(`BLOCKED:${label}_INVALID_JSON`);
  }
}

function currentFrozenInputs(root: string) {
  const planPath = join(root, "SEPmd", "V3.9_DataCollectPlan_f.8.md");
  if (!existsSync(planPath)) throw new Error("BLOCKED:BINDING_PLAN_MISSING");
  const p = loadVerifiedPrerequisitePPass(root);
  const trafficPath = process.env.V39_TRAFFIC_REFERENCE_FILE || join(root, "artifacts", "traffic-reference-frozen.json");
  if (!existsSync(trafficPath)) throw new Error("BLOCKED:TRAFFIC_REFERENCE_FROZEN_FILE_MISSING");
  const trafficRaw = readFileSync(trafficPath, "utf8");
  const traffic = parseFrozenTrafficReference(trafficRaw);
  return {
    planSha256: sha256(readFileSync(planPath)),
    pArtifactSha256: p.artifact_sha256,
    trafficArtifactSha256: sha256(trafficRaw),
    trafficRawSha256: traffic.raw_reference_sha256,
    trafficTierHash: traffic.tier_hash,
  };
}

function assertOnlyGate1MayRoll(
  reference: ReferenceFreezeRecordV39,
  oldGate1: Gate1CoverageArtifact,
  frozen: ReturnType<typeof currentFrozenInputs>,
): void {
  if (reference.gate1_artifact_sha256 !== oldGate1.artifact_sha256) {
    throw new Error("BLOCKED:REFERENCE_FREEZE_OLD_GATE1_BINDING_MISMATCH");
  }
  if (reference.plan_sha256 !== frozen.planSha256) throw new Error("BLOCKED:PLAN_DRIFT_DURING_GATE1_REFRESH");
  if (reference.prerequisite_p_artifact_sha256 !== frozen.pArtifactSha256) {
    throw new Error("BLOCKED:PREREQUISITE_P_DRIFT_DURING_GATE1_REFRESH");
  }
  if (reference.traffic_reference_artifact_sha256 !== frozen.trafficArtifactSha256) {
    throw new Error("BLOCKED:TRAFFIC_REFERENCE_ARTIFACT_DRIFT_DURING_GATE1_REFRESH");
  }
  if (reference.traffic_reference_raw_sha256 !== frozen.trafficRawSha256) {
    throw new Error("BLOCKED:TRAFFIC_REFERENCE_RAW_DRIFT_DURING_GATE1_REFRESH");
  }
  if (reference.traffic_tier_hash !== frozen.trafficTierHash) {
    throw new Error("BLOCKED:TRAFFIC_TIER_DRIFT_DURING_GATE1_REFRESH");
  }
  if (reference.region_mapping_version !== REGION_MAPPING_VERSION || reference.region_mapping_hash !== REGION_MAPPING_HASH) {
    throw new Error("BLOCKED:REGION_MAPPING_DRIFT_DURING_GATE1_REFRESH");
  }
}

async function main(argv = process.argv.slice(2)): Promise<number> {
  const root = process.cwd();
  const gate1Path = join(root, "artifacts", "gate1-coverage.json");
  const referencePath = join(root, "artifacts", "reference-freeze-record.json");
  const preprobePath = join(root, "artifacts", "preprobe-reference-freeze-record.json");
  const { evidenceId } = parseArgs(argv);

  try {
    if (existsSync(preprobePath)) {
      throw new Error("BLOCKED:PREPROBE_ALREADY_EXISTS_GATE1_REFERENCE_REFRESH_FORBIDDEN");
    }
    if (!verifyPrerequisitePPassFile(root)) {
      throw new Error("BLOCKED:PREREQUISITE_P_PASS_REQUIRED_BEFORE_GATE1_REFRESH");
    }
    if (!evidenceId || !/^GATE-1-\d{8}-[A-Z0-9]+$/.test(evidenceId)) {
      throw new Error("REFUSED:NEW_GATE1_EVIDENCE_ID_REQUIRED");
    }

    const oldGateLoaded = readJsonFile<unknown>(gate1Path, "OLD_GATE1_ARTIFACT");
    if (!verifyGate1CoverageArtifact(oldGateLoaded.value)) {
      throw new Error("BLOCKED:OLD_GATE1_ARTIFACT_INVALID");
    }
    const oldGate1 = oldGateLoaded.value;
    if (oldGate1.evidence_id === evidenceId) {
      throw new Error("REFUSED:NEW_GATE1_EVIDENCE_ID_MUST_DIFFER_FROM_SUPERSEDED_GATE1");
    }

    const oldReferenceLoaded = readJsonFile<unknown>(referencePath, "OLD_REFERENCE_FREEZE");
    if (!verifyReferenceFreeze(oldReferenceLoaded.value)) {
      throw new Error("BLOCKED:OLD_REFERENCE_FREEZE_INVALID");
    }
    const oldReference = oldReferenceLoaded.value;
    const frozen = currentFrozenInputs(root);
    assertOnlyGate1MayRoll(oldReference, oldGate1, frozen);

    let freshGateText = "";
    const freshGate1 = await runGate1Coverage(
      argv,
      undefined,
      undefined,
      (text) => { freshGateText = text; },
    );
    if (!freshGateText || !verifyGate1CoverageArtifact(JSON.parse(freshGateText))) {
      throw new Error("BLOCKED:FRESH_GATE1_CAPTURE_INVALID");
    }

    if (freshGate1.artifact_sha256 === oldGate1.artifact_sha256) {
      console.log(JSON.stringify({
        status: "PASS_NO_LONGER_DRIFTED",
        gate1_artifact_sha256: oldGate1.artifact_sha256,
        reference_freeze_artifact_sha256: oldReference.artifact_sha256,
        provider_action: "documented-free coverage only",
        paid_or_mutating_provider_action: false,
        next: "resume Phase 2D using the existing frozen Gate-1/reference chain",
      }, null, 2));
      return 0;
    }

    const historyDir = join(root, "artifacts", "phase2-history", "coverage-drift", oldGate1.artifact_sha256);
    mkdirSync(historyDir, { recursive: true });
    const oldGateArchive = join(historyDir, "gate1-coverage.json");
    const oldReferenceArchive = join(historyDir, "reference-freeze-record.json");
    archiveExact(oldGateArchive, oldGateLoaded.raw);
    archiveExact(oldReferenceArchive, oldReferenceLoaded.raw);

    // Canonical replacement is performed only after exact old evidence is archived.
    // The reference freeze is recreated by the existing write-once owner from the
    // same Plan/P/traffic/region inputs plus the new Gate-1 artifact.
    writeFileSync(gate1Path, freshGateText, "utf8");
    unlinkSync(referencePath);

    const freeze = spawnSync(
      "npx",
      ["tsx", "scripts/v39_freeze_record_v39.ts", "reference"],
      { cwd: root, env: process.env, encoding: "utf8" },
    );
    if (freeze.stdout) process.stdout.write(freeze.stdout);
    if (freeze.stderr) process.stderr.write(freeze.stderr);

    if (freeze.status !== 0 || !existsSync(referencePath)) {
      // Fail closed and restore the prior canonical chain. The archived copies
      // remain as immutable evidence of the attempted refresh.
      writeFileSync(gate1Path, oldGateLoaded.raw, "utf8");
      if (existsSync(referencePath)) unlinkSync(referencePath);
      writeFileSync(referencePath, oldReferenceLoaded.raw, "utf8");
      throw new Error(`BLOCKED:REFRESHED_REFERENCE_FREEZE_FAILED:exit=${freeze.status ?? "signal"}`);
    }

    const newReferenceLoaded = readJsonFile<unknown>(referencePath, "NEW_REFERENCE_FREEZE");
    if (!verifyReferenceFreeze(newReferenceLoaded.value)) {
      writeFileSync(gate1Path, oldGateLoaded.raw, "utf8");
      unlinkSync(referencePath);
      writeFileSync(referencePath, oldReferenceLoaded.raw, "utf8");
      throw new Error("BLOCKED:NEW_REFERENCE_FREEZE_INVALID_ROLLED_BACK");
    }
    const newReference = newReferenceLoaded.value;
    if (newReference.gate1_artifact_sha256 !== freshGate1.artifact_sha256) {
      writeFileSync(gate1Path, oldGateLoaded.raw, "utf8");
      unlinkSync(referencePath);
      writeFileSync(referencePath, oldReferenceLoaded.raw, "utf8");
      throw new Error("BLOCKED:NEW_REFERENCE_GATE1_BINDING_MISMATCH_ROLLED_BACK");
    }

    const receiptBase = {
      schema_version: "v3.9-phase2-coverage-drift-supersession-1",
      status: "PASS_SUPERSEDED_PRE_2D",
      recorded_at_utc: new Date().toISOString(),
      reason: "documented-free provider feed membership drift detected before Phase 2D final-frame persistence",
      superseded_gate1_evidence_id: oldGate1.evidence_id,
      superseded_gate1_artifact_sha256: oldGate1.artifact_sha256,
      replacement_gate1_evidence_id: freshGate1.evidence_id,
      replacement_gate1_artifact_sha256: freshGate1.artifact_sha256,
      superseded_reference_freeze_artifact_sha256: oldReference.artifact_sha256,
      replacement_reference_freeze_artifact_sha256: newReference.artifact_sha256,
      traffic_reference_artifact_sha256: frozen.trafficArtifactSha256,
      traffic_reference_raw_sha256: frozen.trafficRawSha256,
      traffic_tier_hash: frozen.trafficTierHash,
      region_mapping_hash: REGION_MAPPING_HASH,
      old_gate1_archive: relative(root, oldGateArchive),
      old_reference_archive: relative(root, oldReferenceArchive),
      provider_action: "documented-free coverage only",
      paid_or_mutating_provider_action: false,
      preprobe_existed_before_supersession: false,
    };
    const receipt = { ...receiptBase, artifact_sha256: sha256(canonical(receiptBase)) };
    const receiptPath = join(historyDir, `supersession-to-${freshGate1.artifact_sha256}.json`);
    archiveExact(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

    console.log(JSON.stringify({
      status: "PASS_SUPERSEDED_PRE_2D",
      old_gate1_artifact_sha256: oldGate1.artifact_sha256,
      new_gate1_artifact_sha256: freshGate1.artifact_sha256,
      old_reference_freeze_artifact_sha256: oldReference.artifact_sha256,
      new_reference_freeze_artifact_sha256: newReference.artifact_sha256,
      supersession_receipt_sha256: receipt.artifact_sha256,
      history_directory: relative(root, historyDir),
      paid_or_mutating_provider_action: false,
      next: "resume Phase 2D immediately against the refreshed frozen chain",
    }, null, 2));
    return 0;
  } catch (error: any) {
    console.error(String(error?.message ?? error));
    return 1;
  }
}

void main().then((code) => { process.exitCode = code; });
