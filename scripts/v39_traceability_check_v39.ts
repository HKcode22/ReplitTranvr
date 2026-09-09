/**
 * v39:traceability:check — requirement/code reverse-count check (§1.5.15).
 * Thin wrapper over requirementMatrix_v3.ts (the production owner).
 * Exit 0 only when orphan implementations AND stale requirements are both zero.
 */
import { validateMatrixCompleteness } from "../server/lib/disruption/requirementMatrix_v3";

function main(): void {
  const r = validateMatrixCompleteness();
  console.log("TRACEABILITY-CHECK");
  console.log(`  orphan_implementations=${r.orphanImplementations.length}`);
  for (const o of r.orphanImplementations.slice(0, 10)) console.log(`    - ${o}`);
  console.log(`  stale_requirements=${r.staleRequirements.length}`);
  for (const s of r.staleRequirements.slice(0, 10)) console.log(`    - ${s}`);
  if (!r.complete) {
    console.log("RESULT: BLOCKED — requirement/code reverse counts nonzero");
    process.exit(1);
  }
  console.log("RESULT: PASS — requirement/code reverse counts exact zero");
}

main();
