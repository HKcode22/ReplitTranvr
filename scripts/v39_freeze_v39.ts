/**
 * v39:freeze — final manifest writer gate (§1.5.15 / §1.10.5).
 * Refuses unless the manifest is complete (every module/test/migration/script
 * implemented AND evidenced). Passes --evidence-id through to the record.
 * Exit 0 only on a complete manifest; otherwise BLOCKED with missing lists.
 */
import { checkManifestCompleteness } from "../server/lib/disruption/manifest_v3";

function main(): void {
  let evidenceId: string | null = null;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--evidence-id" && i + 1 < argv.length) evidenceId = argv[++i];
  }
  const r = checkManifestCompleteness();
  console.log("FREEZE");
  console.log(`  evidence_id=${evidenceId ?? "<missing>"}`);
  console.log(`  missing_implementation=${r.missingImplementation.length}`);
  for (const m of r.missingImplementation.slice(0, 10)) console.log(`    - ${m}`);
  console.log(`  missing_evidence=${r.missingEvidence.length}`);
  for (const m of r.missingEvidence.slice(0, 10)) console.log(`    - ${m}`);
  if (!r.complete) {
    console.log("RESULT: BLOCKED — incomplete manifest refuses FREEZE/start");
    process.exit(1);
  }
  console.log("RESULT: PASS — manifest complete (FREEZE still requires separate Phase-6 authorization)");
}

main();
