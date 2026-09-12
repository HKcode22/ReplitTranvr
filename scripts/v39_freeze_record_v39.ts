/**
 * v39:reference:freeze + v39:preprobe:freeze.
 *
 * This command is an admission checker, not a data-source chooser. It refuses
 * until Gate-1 evidence, the frozen region mapping and an actually obtained,
 * permitted 12-month traffic/schedule reference are present. It never converts
 * a candidate/provider name into a PASS by itself.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { verifyGate1CoverageArtifact } from "../server/lib/disruption/gate1Coverage_v39";

const mode = process.argv[2] === "preprobe" ? "preprobe" : "reference";

interface TrafficDecision {
  status?: string;
  decision?: string;
  preferred_source_class?: string;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const missing: string[] = [];
  const coveragePath = join(root, "artifacts", "gate1-coverage.json");
  if (!existsSync(coveragePath)) {
    missing.push("fresh Gate-1 PASS evidence (artifacts/gate1-coverage.json)");
  } else {
    try {
      const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));
      if (!verifyGate1CoverageArtifact(coverage)) {
        missing.push("fresh, untampered v3.9-gate1-coverage-2 PASS evidence; retained/sanitized historical Gate-1 evidence is not admissible");
      } else {
        console.log(`  [READY] fresh Gate-1 PASS evidence ${coverage.evidence_id} hash=${coverage.artifact_sha256.slice(0, 12)}…`);
      }
    } catch {
      missing.push("valid fresh Gate-1 PASS evidence (artifacts/gate1-coverage.json)");
    }
  }

  try {
    const { REGION_MAPPING_HASH, REGION_MAPPING_VERSION, REGION_MAPPING_RETRIEVAL_DATE, REGION_REVIEWED_ISO_COUNT } = await import("../server/lib/disruption/regionMapping_v39");
    if (REGION_REVIEWED_ISO_COUNT !== 249) throw new Error("ISO review incomplete");
    console.log(`  [READY] country→macro-region mapping ${REGION_MAPPING_VERSION} date=${REGION_MAPPING_RETRIEVAL_DATE} hash=${REGION_MAPPING_HASH.slice(0, 12)}…`);
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
        console.log(`  [READY] traffic reference: ${traffic.preferred_source_class ?? "frozen permitted source"}`);
      }
    } catch {
      missing.push("valid traffic-reference decision/evidence artifact (Phase 2C)");
    }
  }

  if (mode === "preprobe") {
    missing.push("final frame hash (Phase 2D)");
    missing.push("12 dual-eligible HUB shortlist + ordered replacements (Phase 2E)");
    missing.push("frozen normalization caps + probe protocol (Phase 2E)");
  }

  console.log(`${mode === "preprobe" ? "PREPROBE-FREEZE" : "REFERENCE-FREEZE"}`);
  for (const m of missing) console.log(`  [BLOCKED] ${m}`);
  if (missing.length > 0) {
    console.log(`RESULT: BLOCKED (${missing.length} frozen inputs missing) — refusing to write freeze record`);
    process.exit(1);
  }
  // This branch intentionally remains unreachable until the real writer/schema
  // is supplied with the frozen traffic reference and final frame artifacts.
  console.log("RESULT: READY INPUTS — freeze-record writer not yet invoked");
}

void main();
