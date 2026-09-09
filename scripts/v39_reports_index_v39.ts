/**
 * v39:reports:index — evidence reference/hash index (§1.5.15).
 * Read-only: scans SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md for evidence IDs
 * (RUN-/GATE-/AUTH-/ISS-/DEC-) and prints the index. Exit 0 on success.
 */
import { readFileSync } from "fs";
import { join } from "path";

function main(): void {
  const p = join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md");
  let text: string;
  try {
    text = readFileSync(p, "utf8");
  } catch {
    console.error("REPORTS-INDEX: cannot read SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md");
    process.exit(1);
  }
  const ids = Array.from(
    new Set(Array.from(text.matchAll(/\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g)).map((m) => m[1])),
  ).sort();
  console.log("REPORTS-INDEX");
  console.log(`  evidence_records=${ids.length}`);
  for (const id of ids) console.log(`    - ${id}`);
  console.log("RESULT: index complete (read-only, exit 0)");
}

main();
