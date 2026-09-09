/**
 * v39:phase6:status — read-only run state (§1.5.15).
 * Local-only by default: reports the fail-closed auto-collect resolution and
 * static safety posture. Makes NO provider/account calls (external reads
 * require an explicit AUTH, which this command never accepts).
 * Exit 0 always (informational).
 */
import { parseAutoCollect } from "../server/lib/disruption/adbCollectionController_v3";

function main(): void {
  const raw = process.env.ADB_AUTO_COLLECT;
  const resolved = parseAutoCollect(raw);
  console.log("PHASE6-STATUS (local-only, no provider calls)");
  console.log(`  adb_auto_collect_env=${raw ?? "<unset>"}`);
  console.log(`  auto_collect_resolved=${resolved ? "ON" : "OFF"}`);
  console.log(`  phase6_possible=${resolved ? "see AUTH + manifest gates" : "NO (collection OFF)"}`);
  console.log("RESULT: status reported (read-only, exit 0)");
}

main();
