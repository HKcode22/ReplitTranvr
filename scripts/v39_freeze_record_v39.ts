/**
 * v39:reference:freeze + v39:preprobe:freeze — freeze records (§1.5.15).
 * Both refuse until their frozen inputs exist: Gate-1 coverage artifact,
 * licensed traffic/region sources, final frame hash (reference); plus the
 * 12-candidate shortlist, replacements, normalization, and probe protocol
 * (preprobe). Exit 0 only with complete frozen inputs + written artifact hash.
 */
import { existsSync } from "fs";
import { join } from "path";

const mode = process.argv[2] === "preprobe" ? "preprobe" : "reference";

function main(): void {
  const root = process.cwd();
  const missing: string[] = [];
  // Gate-1 coverage artifact does not exist yet (Gate 1 is BLOCKED).
  if (!existsSync(join(root, "artifacts", "gate1-coverage.json"))) {
    missing.push("Gate-1 coverage artifact (artifacts/gate1-coverage.json)");
  }
  // Licensed traffic/region sources are not frozen (Phase 2C not started).
  missing.push("licensed 12-month traffic source + hash (Phase 2C)");
  missing.push("country→macro-region mapping + hash (Phase 2C)");
  if (mode === "preprobe") {
    // Final frame + shortlist depend on the reference freeze above.
    missing.push("final frame hash (Phase 2D)");
    missing.push("12 dual-eligible HUB shortlist + ordered replacements (Phase 2E)");
    missing.push("frozen normalization caps + probe protocol (Phase 2E)");
  }
  console.log(`${mode === "preprobe" ? "PREPROBE-FREEZE" : "REFERENCE-FREEZE"}`);
  for (const m of missing) console.log(`  [BLOCKED] ${m}`);
  console.log(`RESULT: BLOCKED (${missing.length} frozen inputs missing) — refusing to write freeze record`);
  process.exit(1);
}

main();
