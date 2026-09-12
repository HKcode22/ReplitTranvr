/**
 * v39:reference:freeze + v39:preprobe:freeze.
 *
 * Admission checker only. It must never return success merely because input
 * files exist. Prerequisite P and Gate 1 must be current/verifiable, the
 * region/traffic inputs must be genuinely frozen, and the real hash-locked
 * freeze-record writer must exist before this command may ever exit 0.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { verifyGate1CoverageArtifact } from "../server/lib/disruption/gate1Coverage_v39";
import { RETENTION_MATRIX_HASH } from "../server/lib/disruption/retentionMatrix_v39";
import { readCurrentPrerequisitePArtifact } from "../server/lib/disruption/prerequisitePArtifact_v39";

const mode = process.argv[2] === "preprobe" ? "preprobe" : "reference";

interface TrafficDecision {
  status?: string;
  decision?: string;
  preferred_source_class?: string;
}

export async function assessFreezeInputs(root = process.cwd(), selectedMode: "reference" | "preprobe" = mode): Promise<{ missing: string[]; ready: string[] }> {
  const missing: string[] = [];
  const ready: string[] = [];

  const prerequisite = readCurrentPrerequisitePArtifact(root, RETENTION_MATRIX_HASH);
  if (!prerequisite.pass) {
    missing.push(`prerequisite P durable PASS artifact (${prerequisite.failures.join(",") || "invalid"})`);
  } else {
    ready.push(`prerequisite P artifact ${prerequisite.artifact?.artifact_sha256.slice(0, 12)}…`);
  }

  const coveragePath = join(root, "artifacts", "gate1-coverage.json");
  if (!existsSync(coveragePath)) {
    missing.push("current Gate-1 coverage PASS artifact (artifacts/gate1-coverage.json)");
  } else {
    try {
      const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));
      const verdict = verifyGate1CoverageArtifact(coverage);
      if (!verdict.pass) {
        missing.push(`current Gate-1 v2 PASS artifact (${verdict.failures.join(",")})`);
      } else {
        ready.push(`Gate-1 current PASS artifact ${String(coverage.artifact_sha256).slice(0, 12)}…`);
      }
    } catch {
      missing.push("readable current Gate-1 v2 PASS artifact");
    }
  }

  try {
    const { REGION_MAPPING_HASH, REGION_MAPPING_VERSION, REGION_MAPPING_RETRIEVAL_DATE, REGION_REVIEWED_ISO_COUNT } = await import("../server/lib/disruption/regionMapping_v39");
    if (REGION_REVIEWED_ISO_COUNT !== 249) throw new Error("ISO review incomplete");
    ready.push(`country→macro-region mapping ${REGION_MAPPING_VERSION} date=${REGION_MAPPING_RETRIEVAL_DATE} hash=${REGION_MAPPING_HASH.slice(0, 12)}…`);
  } catch {
    missing.push("Plan-exact country→macro-region mapping + hash (Phase 2C)");
  }

  const trafficPath = join(root, "artifacts", "traffic-reference-decision.json");
  if (!existsSync(trafficPath)) {
    missing.push("traffic-reference decision/evidence artifact (Phase 2C)");
  } else {
    try {
      const traffic = JSON.parse(readFileSync(trafficPath, "utf8")) as TrafficDecision;
      if (traffic.status !== "READY_FROZEN_REFERENCE") {
        missing.push(`TRAFFIC_REFERENCE=${traffic.status ?? "BLOCKED"}: obtain permitted global 12-month scheduled-route reference before frame rebuild`);
      } else {
        ready.push(`traffic reference: ${traffic.preferred_source_class ?? "frozen permitted source"}`);
      }
    } catch {
      missing.push("valid traffic-reference decision/evidence artifact (Phase 2C)");
    }
  }

  if (selectedMode === "preprobe") {
    missing.push("final frame hash (Phase 2D)");
    missing.push("12 dual-eligible HUB shortlist + ordered replacements (Phase 2E)");
    missing.push("frozen normalization caps + probe protocol (Phase 2E)");
  }

  // Critical fail-closed rule: the previous implementation could exit 0 after
  // only seeing READY inputs even though it never wrote a freeze artifact.
  // Until the writer/schema is implemented, success is impossible by design.
  missing.push(`${selectedMode} hash-locked freeze-record writer/schema not yet implemented`);

  return { missing, ready };
}

async function main(): Promise<void> {
  const result = await assessFreezeInputs(process.cwd(), mode);
  console.log(`${mode === "preprobe" ? "PREPROBE-FREEZE" : "REFERENCE-FREEZE"}`);
  for (const item of result.ready) console.log(`  [READY] ${item}`);
  for (const item of result.missing) console.log(`  [BLOCKED] ${item}`);
  console.log(`RESULT: BLOCKED (${result.missing.length} frozen inputs/writers unresolved) — refusing to write freeze record`);
  process.exitCode = 1;
}

void main();
