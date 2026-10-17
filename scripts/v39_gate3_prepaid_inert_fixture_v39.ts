/**
 * OFFLINE ONLY. Do not import paid owners, provider limiters, DB pools, or
 * public callback servers here. A passing fixture is NEVER a live Gate3 PASS.
 *
 * Usage: node --import tsx scripts/v39_gate3_prepaid_inert_fixture_v39.ts
 *          --fixture-file /path/to/synthetic.json
 */
import {readFileSync} from "node:fs";
import {
  evaluateGate3PrepaidOfflineFixtureV39,
  type Gate3OfflineFixtureV39,
} from "../server/lib/disruption/gate3PrepaidCanaryOfflineContract_v39";

export function runGate3PrepaidInertFixtureV39(
  args: readonly string[] = process.argv.slice(2),
): number {
  if (args.length !== 2 || args[0] !== "--fixture-file" ||
      typeof args[1] !== "string" || args[1].trim() === "") {
    throw new Error("GATE3_OFFLINE_REQUIRES_EXACT_FIXTURE_FILE_FLAG");
  }
  const input: unknown = JSON.parse(readFileSync(args[1], "utf8"));
  const verdict = evaluateGate3PrepaidOfflineFixtureV39(
    input as Gate3OfflineFixtureV39,
  );
  console.log(JSON.stringify({
    ...verdict,
    evidenceKind: "SYNTHETIC_OFFLINE_ONLY",
    publishedReceiverValidatedByThisCommand: false,
    actualProviderBalanceReadByThisCommand: false,
    actualPostToPublishedReceiverByThisCommand: false,
    productionSideEffects: false,
  }, null, 2));
  return verdict.status === "OFFLINE_FIXTURE_PASS" ? 0 : 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = runGate3PrepaidInertFixtureV39();
  } catch {
    console.error("GATE3_OFFLINE_FIXTURE_INVALID_OR_UNAVAILABLE");
    process.exitCode = 2;
  }
}
