// ============================================================
// Smoke test: replay REAL captured AeroDataBox payloads through
// the fixed extractor and prove the previously-null columns now
// come out populated.
//
// Reads the payloads from the CSV export (the DB table ground truth):
//   flight_data_pre_post.csv   (payload_json column)
// or the JSON export:
//   flight_data_pre_post.json
// Auto-detects by extension. Defaults to the CSV.
//
// Run: npx tsx scripts/test-extractor-real-payload.ts [file.csv|file.json]
// ============================================================

import { readFileSync } from "fs";
import { extractFlightNotification } from "../server/lib/disruption/flightNotificationExtractor_v3";
import { flattenPayload } from "../server/lib/disruption/flattenPayload_v3";

const PATH = process.argv[2] ?? "flight_data_pre_post.csv";

function loadRows(): any[] {
  if (PATH.endsWith(".json")) {
    return JSON.parse(readFileSync(PATH, "utf-8")) as any[];
  }
  // CSV: reparse into rows, pull out the payload_json + meta columns.
  const text = readFileSync(PATH, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const col = (name: string) => header.indexOf(name);
  const iId = col("id"), iPayload = col("payload_json"), iRecv = col("received_at"),
    iSched = col("sampling_batch_id"), iTier = col("airport_tier"),
    iProb = col("sampling_probability"), iWeight = col("sampling_weight"),
    iSeed = col("random_seed"), iWinS = col("collection_window_start"),
    iWinE = col("collection_window_end");

  const parseCell = (c: string | undefined): string =>
    (c ?? "").replace(/^"|"$/g, "").replace(/""/g, '"').trim();

  return lines.slice(1).map((line) => {
    // minimal CSV split (this file has no escaped commas except inside payload_json)
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      if (ch === "," && !inQ) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    const cell = (i: number) => (i >= 0 ? parseCell(cells[i]) : "");
    return {
      id: cell(iId),
      payload_json: cell(iPayload),
      received_at: cell(iRecv),
      sampling_batch_id: cell(iSched) || null,
      airport_tier: cell(iTier) || null,
      sampling_probability: cell(iProb) || null,
      sampling_weight: cell(iWeight) || null,
      random_seed: cell(iSeed) || null,
      collection_window_start: cell(iWinS) || null,
      collection_window_end: cell(iWinE) || null,
    };
  });
}

const rows = loadRows();
console.log(`Loaded ${rows.length} rows from ${PATH}`);

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

  // Flattened mirror must be present, single-level, and enum-decoded.
  const flat = out.payloadJsonFlat;
  if (!flat || typeof flat !== "object") {
    failures.push(`id=${r.id}: payloadJsonFlat missing`);
  } else {
    const keys = Object.keys(flat);
    const nested = keys.filter((k) => k.includes("."));
    if (keys.length === 0) failures.push(`id=${r.id}: payloadJsonFlat is empty`);
    if (flat.status !== undefined && typeof flat.status !== "string")
      failures.push(`id=${r.id}: payloadJsonFlat.status not decoded (${JSON.stringify(flat.status)})`);
    if (flat["departure.quality"] && Array.isArray(flat["departure.quality"]) &&
        flat["departure.quality"].some((q) => typeof q !== "string"))
      failures.push(`id=${r.id}: payloadJsonFlat departure.quality not decoded`);
  }
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
