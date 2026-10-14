/**
 * Read-only source compatibility inventory for Phase3 Gate3.
 *
 * No Replit HTTP, provider API, environment secrets, SQL, blobs or paid calls.
 * Uses repository source only and never gives paid permission.
 */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {reviewGate3SourceCompatibilityV39, type Gate3SourceSnapshotV39}
  from "../server/lib/disruption/gate3SourceCompatibilityReview_v39";

const files: Readonly<Record<keyof Gate3SourceSnapshotV39,string>> = {
  callbackOnly: "server/phase2gCallbackOnly.ts",
  registeredRoutes: "server/routes_v3.ts",
  prepaidRuntime: "server/lib/disruption/prepaidProbeRuntime_v39.ts",
  legacyCanary: "scripts/credit_canary.ts",
  legacyWrapper: "scripts/v39_gate3_canary_v39.ts",
  legacyReadiness: "server/lib/disruption/gate3CanaryReceiverReadiness_v39.ts",
  baselineSessionSchema: "migrations/baseline/B0062__v39_schema_baseline_20261001.sql",
};
export function runGate3SourceReviewReadonlyV39(
  args: readonly string[] = process.argv.slice(2),
  root: string = process.cwd(),
): number {
  if (args.length !== 1 || args[0] !== "--read-only") {
    throw Error("GATE3_SOURCE_REVIEW_EXACT_READ_ONLY_FLAG_REQUIRED");
  }
  const source = Object.fromEntries(
    Object.entries(files).map(([key, path]) =>
      [key, readFileSync(join(root,path), "utf8")]),
  ) as Gate3SourceSnapshotV39;
  const verdict = reviewGate3SourceCompatibilityV39(source);
  console.log(JSON.stringify({
    ...verdict, inspection: "LOCAL_GIT_SOURCE_ONLY",
    publishedRouteHTTPTested: false,
    independentProviderBalanceRead: false,
    paidCanaryAllowed: false,
  }, null, 2));
  return verdict.status === "BLOCKED_SOURCE_CONTRACT" ? 2 : 0;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try {process.exitCode=runGate3SourceReviewReadonlyV39();}
  catch {console.error("GATE3_SOURCE_REVIEW_REFUSED_OR_UNAVAILABLE");process.exitCode=2;}
}
