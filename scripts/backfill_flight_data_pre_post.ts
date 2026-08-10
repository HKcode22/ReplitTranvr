// ============================================================
// Backfill: repair already-collected flight_data_pre_post rows.
//
// On 2026-08-10 the extractor dropped 4 field groups to NULL because the
// REAL AeroDataBox payload differs from the docs:
//   - status / codeshareStatus are NUMERIC codes (not strings)
//   - greatCircleDistance keys are CAPITALIZED (Km, Mile, ...)
//   - quality[] holds NUMERIC codes
//   - subject.type is null (broke the tier fallback)
// The extractor is now fixed (flightNotificationExtractor_v3.ts). This
// script re-runs the FIXED extractor over every stored row's payload_json
// and updates the flattened columns in place — no re-pay, no re-collection.
//
// Run on Replit (has the DB):
//   npx tsx scripts/backfill_flight_data_pre_post.ts
//
// It is idempotent: re-running repairs rows that are still null.
// ============================================================

import { pool } from "../server/db";
import { extractFlightNotification, type SamplingMeta } from "../server/lib/disruption/flightNotificationExtractor_v3";
import { tierForIcao } from "../server/lib/disruption/adbAirportCatalog_v3";

async function main() {
  const res = await pool.query(
    `SELECT id, payload_json, subject_id, received_at
       FROM clean.flight_data_pre_post
      WHERE status IS NULL
         OR gcd_km IS NULL
         OR codeshare_status IS NULL
         OR airport_tier IS NULL
      ORDER BY id`,
  );
  console.log(`Rows to repair: ${res.rowCount}`);

  let fixed = 0;
  let skipped = 0;

  for (const row of res.rows) {
    let raw = row.payload_json;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        skipped++;
        continue;
      }
    }
    if (!raw || typeof raw !== "object") {
      skipped++;
      continue;
    }

    // Derive the tier from the subscribed airport (subject_id), like the fixed
    // webhook fallback does. Fall back to the departure airport ICAO.
    const subjId = row.subject_id;
    const tier = (typeof subjId === "string" && /^[A-Za-z]{4}$/.test(subjId))
      ? tierForIcao(subjId)
      : null;

    const sampling: SamplingMeta = {
      batchId: null,
      tier,
      samplingProbability: null,
      samplingWeight: null,
      randomSeed: null,
      windowStart: null,
      windowEnd: null,
    };

    const out = extractFlightNotification(raw, {
      receivedAt: row.received_at ? new Date(row.received_at) : new Date(),
      index: 0,
      sampling,
    });
    if (!out) {
      skipped++;
      continue;
    }

    await pool.query(
      `UPDATE clean.flight_data_pre_post SET
         status = $2, status_code = $3, codeshare_status = $4,
         gcd_m = $5, gcd_km = $6, gcd_mile = $7, gcd_nm = $8, gcd_ft = $9,
         dep_quality = $10, arr_quality = $11,
         data_stage = $12, has_live_location = $13,
         airport_tier = COALESCE(airport_tier, $14),
         payload_json_flat = $15
       WHERE id = $1`,
      [
        row.id,
        out.status,
        out.statusCode,
        out.codeshareStatus,
        out.gcdM,
        out.gcdKm,
        out.gcdMile,
        out.gcdNm,
        out.gcdFt,
        out.depQuality ? JSON.stringify(out.depQuality) : null,
        out.arrQuality ? JSON.stringify(out.arrQuality) : null,
        out.dataStage,
        out.hasLiveLocation,
        sampling.tier,
        out.payloadJsonFlat ? JSON.stringify(out.payloadJsonFlat) : null,
      ],
    );
    fixed++;
  }

  console.log(`Done: fixed=${fixed} skipped=${skipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Backfill failed:", err?.message || err);
  process.exit(1);
});
