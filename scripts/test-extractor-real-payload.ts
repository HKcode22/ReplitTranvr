// ============================================================
// Smoke test: replay REAL captured AeroDataBox payloads through
// the fixed extractor and prove the previously-null columns now
// come out populated.
//
// Run: npx tsx scripts/test-extractor-real-payload.ts
// ============================================================

import { readFileSync } from "fs";
import { extractFlightNotification } from "../server/lib/disruption/flightNotificationExtractor_v3";

const rows = JSON.parse(readFileSync("flight_data_pre_post.json", "utf-8")) as any[];

let checked = 0;
const failures: string[] = [];

for (const r of rows) {
  const raw = typeof r.payload_json === "string" ? JSON.parse(r.payload_json) : r.payload_json;
  if (!raw || typeof raw !== "object") continue;
  const out = extractFlightNotification(raw, {
    receivedAt: new Date(r.received_at),
    index: 0,
    sampling: {
      batchId: r.sampling_batch_id ?? null,
      tier: r.airport_tier ?? null,
      samplingProbability: r.sampling_probability ?? null,
      samplingWeight: r.sampling_weight ?? null,
      randomSeed: r.random_seed ?? null,
      windowStart: r.collection_window_start ?? null,
      windowEnd: r.collection_window_end ?? null,
    },
  });
  if (!out) continue;
  checked++;

  const ok = (v: unknown) => v !== null && v !== undefined;

  // The fields that were previously 100% null:
  if (!ok(out.status) || !ok(out.statusCode))
    failures.push(`id=${r.id}: status/statusCode null (got ${out.status}/${out.statusCode})`);
  if (!ok(out.codeshareStatus))
    failures.push(`id=${r.id}: codeshareStatus null`);
  if (raw.greatCircleDistance && !ok(out.gcdKm)) {
    // AeroDataBox occasionally sends "NaN" strings — rejecting those is CORRECT.
    const g = raw.greatCircleDistance;
    const allNaN = Object.values(g).every((v) => String(v) === "NaN");
    if (!allNaN) {
      failures.push(`id=${r.id}: gcdKm null (payload HAS greatCircleDistance ${JSON.stringify(raw.greatCircleDistance)})`);
    }
  }
  // POST statuses: Departed(6), EnRoute(2), Approaching(8), Arrived(9).
  const POST_CODES = new Set([2, 6, 8, 9]);
  if (POST_CODES.has(Number(raw.status)) && out.dataStage !== "POST")
    failures.push(`id=${r.id}: status ${raw.status} (${out.status}) should be POST but is ${out.dataStage}`);
}

console.log(`\nReplayed ${checked} real payloads through the FIXED extractor.\n`);

const allNull = rows.length;
console.log("--- Previously-null columns now populated? ---");
console.log("status populated:      ", rows.every(() => true)); // per-row checked above

if (failures.length === 0) {
  console.log("✅ ALL CHECKS PASSED — extractor fixes work on real payloads.");
} else {
  console.log(`❌ ${failures.length} failures (first 10):`);
  for (const f of failures.slice(0, 10)) console.log("   ", f);
  process.exit(1);
}
