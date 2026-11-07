/**
 * Offline Phase5 FIDS acquisition-grid/budget arithmetic review.
 * Invocation (file already prepared and approved locally):
 *   npx tsx scripts/v39_phase5_fids_freeze_grid_check_v39.ts /path/to/frozen-source-grid.json
 *
 * No real flight/source rows or secrets are emitted. Does not CREATE
 * auth/freeze, dispatch GitHub Actions, call providers or access a database.
 */
import { readFileSync, statSync } from "node:fs";
import { evaluateP5FidsGrid, type P5FidsGridInput } from
  "../server/lib/disruption/phase5FidsFreezeGridAdmission_v39";

try {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) throw Error("EXPECTED_ONE_LOCAL_FREEZE_INPUT_FILE");
  if (/^(https?:|git:|s3:|gs:)/i.test(file)) throw Error("REFUSED_NETWORK_INPUT");
  const stat = statSync(file);
  if (!stat.isFile() || stat.size > 15_000_000) throw Error("REFUSED_FILE_SIZE_OR_TYPE");
  const plan = JSON.parse(readFileSync(file, "utf8")) as P5FidsGridInput;
  const result = evaluateP5FidsGrid(plan);
  console.log(JSON.stringify({
    schema: "v39.phase5.fids-freeze-grid-audit.v1",
    ...result,
    byDay: result.byDay,
    providerCalls: 0, databaseWrites: 0, githubDispatches: 0,
    freezeApproved: false, phase6Authorized: false,
    note: "Source at runtime must still be genuinely observed and persisted before cutoff; rights and deployed receiver are separately checked.",
  }));
} catch (error) {
  // The user input might contain private identifiers. Never log exception
  // messages that can embed local file names or entire JSON Contents.
  console.error("HOLD_PHASE5_FIDS_GRID_INCOMPLETE_OR_INVALID");
  process.exitCode = 2;
}
