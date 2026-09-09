import { readFileSync } from "fs";
import { evaluateGate05, type Gate05Measurement } from "../server/lib/disruption/gates_v3";

export function runGate05Owner(argv = process.argv.slice(2)): number {
  const index = argv.indexOf("--measurements-file");
  if (index < 0 || !argv[index + 1]) throw new Error("--measurements-file is required");
  const measurements = JSON.parse(readFileSync(argv[index + 1], "utf8")) as Gate05Measurement;
  const verdict = evaluateGate05(measurements);
  console.log(JSON.stringify({ schema: "v39.gate05-evidence.v1", status: verdict.passed ? "PASS" : "FAIL", ...verdict }));
  return verdict.passed ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { process.exitCode = runGate05Owner(); } catch (error: any) {
    console.error(JSON.stringify({ schema: "v39.gate05-evidence.v1", status: "FAIL", error: error?.message ?? String(error) }));
    process.exitCode = 1;
  }
}
