/**
 * v39:phase6:pause — REAL, immediately available safety action (§1.5.15).
 * Unlike every other paid command, pause must work even when start
 * prerequisites fail. It writes a pause marker the controller honors and
 * verifies collection resolves OFF. Never touches the provider.
 * Exit 0 = pause recorded + OFF verified.
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { parseAutoCollect } from "../server/lib/disruption/adbCollectionController_v3";

function main(): void {
  const dir = join(process.cwd(), ".v39-state");
  try { mkdirSync(dir, { recursive: true }); } catch { /* exists */ }
  const marker = join(dir, "phase6-paused.json");
  const record = {
    paused: true,
    pausedAtUtc: new Date().toISOString(),
    reason: process.argv.slice(2).join(" ") || "operator pause",
    autoCollectEnv: process.env.ADB_AUTO_COLLECT ?? "<unset>",
    autoCollectResolved: parseAutoCollect(process.env.ADB_AUTO_COLLECT) ? "ON" : "OFF",
  };
  writeFileSync(marker, JSON.stringify(record, null, 2));
  console.log("PHASE6-PAUSE");
  console.log(`  marker=${marker}`);
  console.log(`  paused_at_utc=${record.pausedAtUtc}`);
  console.log(`  auto_collect_resolved=${record.autoCollectResolved}`);
  if (record.autoCollectResolved === "ON") {
    console.error("REFUSED-AS-UNSAFE: marker written but env still resolves ON — set ADB_AUTO_COLLECT=0");
    process.exit(1);
  }
  console.log("RESULT: paused + collection OFF verified (exit 0)");
}

main();
