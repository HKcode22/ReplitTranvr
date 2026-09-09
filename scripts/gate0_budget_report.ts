import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { evaluateGate0Accounting, serializeGate0Artifact } from "../server/lib/disruption/gate0Accounting_v39";

export function buildGate0BudgetReport(argv: string[]): ReturnType<typeof evaluateGate0Accounting> {
  const value = (name: string): string | null => {
    const index = argv.indexOf(name);
    return index >= 0 && index + 1 < argv.length ? argv[index + 1] : null;
  };
  const file = value("--account-evidence-file");
  const evidenceId = value("--evidence-id");
  const authorizationId = value("--auth");
  if (!file || !evidenceId || !authorizationId) throw new Error("BLOCKED: --account-evidence-file, --evidence-id, and --auth are required");
  return evaluateGate0Accounting(JSON.parse(readFileSync(file, "utf8")), { evidenceId, authorizationId });
}

export function main(argv = process.argv.slice(2)): number {
  try {
    const artifact = buildGate0BudgetReport(argv);
    process.stdout.write(serializeGate0Artifact(artifact));
    return artifact.status === "PASS" ? 0 : 2;
  } catch (error: any) {
    console.error(String(error?.message ?? error).startsWith("BLOCKED:") ? String(error.message) : "BLOCKED: account evidence could not be evaluated");
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main();
