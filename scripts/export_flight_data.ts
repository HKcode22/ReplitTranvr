// ============================================================
// Export clean.flight_data_pre_post to a CSV with received_at
// FIRST so you can immediately see new data landing (no sliding
// to the right-hand columns). last_updated_utc is the FLIGHT's
// last change from AeroDataBox — it can look stale even though
// the row was just written. received_at is the DB insert time.
//
// Usage (Replit Shell):
//   npm run export
//   # or: npx tsx scripts/export_flight_data.ts
//
// Writes flight_data_pre_post<N>.csv (auto-increments the N),
// ordered by received_at ascending, newest rows at the bottom.
// ============================================================

import { writeFileSync } from "fs";
import { pool } from "../server/db";

// Explicit column order — received_at FIRST, then id, then the rest.
const COLUMNS = [
  "received_at",
  "id",
  "flight_number",
  "carrier_iata",
  "carrier_icao",
  "carrier_name",
  "call_sign",
  "is_cargo",
  "status",
  "status_code",
  "codeshare_status",
  "last_updated_utc",
  "gcd_km",
  "dep_airport_icao",
  "dep_airport_iata",
  "dep_airport_name",
  "dep_airport_short_name",
  "dep_airport_municipality",
  "dep_airport_country_code",
  "dep_airport_lat",
  "dep_airport_lon",
  "dep_airport_timezone",
  "dep_scheduled_utc",
  "dep_scheduled_local",
  "dep_revised_utc",
  "dep_runway_utc",
  "dep_terminal",
  "dep_checkin_desk",
  "dep_gate",
  "dep_runway",
  "dep_quality",
  "arr_airport_icao",
  "arr_airport_iata",
  "arr_airport_name",
  "arr_airport_short_name",
  "arr_airport_municipality",
  "arr_airport_country_code",
  "arr_airport_lat",
  "arr_airport_lon",
  "arr_airport_timezone",
  "arr_scheduled_utc",
  "arr_scheduled_local",
  "arr_revised_utc",
  "arr_runway_utc",
  "arr_terminal",
  "arr_gate",
  "arr_baggage_belt",
  "arr_runway",
  "arr_quality",
  "aircraft_reg",
  "aircraft_mode_s",
  "aircraft_model",
  "loc_lat",
  "loc_lon",
  "loc_altitude_ft",
  "loc_pressure_altitude_ft",
  "loc_pressure_hpa",
  "loc_ground_speed_kt",
  "loc_true_track_deg",
  "loc_vsi_fpm",
  "loc_reported_utc",
  "data_stage",
  "has_live_location",
  "subscription_id",
  "subscription_is_active",
  "subscription_billing_type",
  "subscription_activate_before_utc",
  "subscription_expires_on_utc",
  "subscription_created_on_utc",
  "subject_type",
  "subject_id",
  "subscriber_type",
  "subscriber_id",
  "subscription_notices",
  "credits_remaining",
  "balance_last_refilled_utc",
  "balance_last_deducted_utc",
  "sampling_batch_id",
  "airport_tier",
  "sampling_probability",
  "sampling_weight",
  "random_seed",
  "collection_window_start",
  "collection_window_end",
  "payload_json",
  "dedup_key",
];

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

async function main(): Promise<void> {
  const res = await pool.query(
    `SELECT ${COLUMNS.join(", ")} FROM clean.flight_data_pre_post ORDER BY received_at ASC, id ASC`,
  );
  const rows = res.rows as Array<Record<string, unknown>>;

  // Next versioned filename: flight_data_pre_post.csv, ...2, ...3, ...
  let n = 1;
  let file = "flight_data_pre_post.csv";
  while (true) {
    const path = n === 1 ? file : `flight_data_pre_post${n}.csv`;
    try {
      const fs = await import("fs");
      fs.accessSync(path);
      n++;
    } catch {
      file = path;
      break;
    }
  }

  const lines = [COLUMNS.map(csvCell).join(",")];
  for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(r[c])).join(","));
  writeFileSync(file, lines.join("\n") + "\n");

  const latest = rows.length ? String(rows[rows.length - 1].received_at) : "-";
  const first = rows.length ? String(rows[0].received_at) : "-";
  console.log(`[export] wrote ${file}`);
  console.log(`[export] rows=${rows.length}`);
  console.log(`[export] received_at range: ${first}  →  ${latest}`);
  console.log(`[export] (received_at is column 1 — check the last row's value to see the newest data.)`);
  await pool.end();
}

main().catch((err) => {
  console.error("[export] FAILED:", err?.message || err);
  process.exit(1);
});
