// ============================================================
// One-command collection health check.
//
//   npm run health
//
// Queries the DB directly (no server needed) and prints PASS/FAIL
// for: data freshness (gap since last received_at), balance, rows
// today, active batch, and tier mixture. Exit code 0 = healthy,
// 1 = something needs attention. Safe to run any time; use it in
// Replit's Scheduler (or any cron) for fully automated checking:
//
//   Replit → Tools → Scheduler → add job → every 6 h →
//   command: npm run health
// ============================================================

import { pool } from "../server/db";
import { getBalance } from "../server/lib/disruption/aerodataboxLimiter_v3";

function flag(ok: boolean, label: string, detail: string): boolean {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(28)} ${detail}`);
  return ok;
}

async function main(): Promise<void> {
  let healthy = true;

  // 1. Data freshness
  const gapRes = await pool.query(
    "SELECT max(received_at)::timestamptz AS last FROM clean.flight_data_pre_post",
  );
  const last = gapRes.rows[0]?.last ? new Date(gapRes.rows[0].last) : null;
  const gapMin = last ? Math.round((Date.now() - last.getTime()) / 60_000) : null;
  if (!last) {
    healthy = flag(false, "data flow", "no rows at all in clean.flight_data_pre_post");
  } else if (gapMin! > 90) {
    healthy = flag(false, "data flow", `last row ${gapMin} min ago — data has stalled`);
  } else {
    healthy = flag(true, "data flow", `last row ${gapMin} min ago (${last.toISOString()})`);
  }

  // 2. Balance — LIVE from AeroDataBox first (authoritative), fall back to the
  //    latest DB snapshot only if the live call fails (e.g. no API key locally).
  //    reserve + min batch must be covered.
  const reserve = Number(process.env.ADB_RESERVE_CREDITS ?? 1000);
  const minBatch = Number(process.env.ADB_MIN_BATCH_CREDITS ?? 300);
  const lowBal = reserve + minBatch;
  let bal: number | null = null;
  let balSource = "db-snapshot";
  const live = await getBalance();
  if (live && Number.isFinite(live.creditsRemaining)) {
    bal = live.creditsRemaining;
    balSource = "live-api";
  } else {
    const balRes = await pool.query(
      "SELECT credits_remaining FROM clean.flight_data_pre_post ORDER BY received_at DESC LIMIT 1",
    );
    bal = balRes.rows[0]?.credits_remaining ?? null;
  }
  if (bal === null) {
    healthy = flag(false, "balance", "unknown (no rows, live call failed)");
  } else if (bal < lowBal) {
    healthy = flag(false, "balance", `${bal} (${balSource}) — below reserve+min (${lowBal}), refill soon`);
  } else {
    healthy = flag(true, "balance", `${bal} credits (${balSource})`);
  }

  // 3. Rows today + total
  const todayRes = await pool.query(
    "SELECT count(*)::int AS n FROM clean.flight_data_pre_post WHERE received_at >= date_trunc('day', now())",
  );
  const totalRes = await pool.query("SELECT count(*)::int AS n FROM clean.flight_data_pre_post");
  const rowsToday = todayRes.rows[0]?.n ?? 0;
  const rowsTotal = totalRes.rows[0]?.n ?? 0;
  flag(true, "rows today", String(rowsToday));
  flag(true, "rows total", String(rowsTotal));

  // 4. Active batch + its tier mixture.
  //    Gated on SUBSCRIPTIONS, not rows: a REGIONAL-tier airport legitimately
  //    emits ~1–2 rows, so counting rows would false-FAIL a healthy batch.
  //    Rows per tier are shown as an informational second line instead.
  const batchRes = await pool.query(
    "SELECT batch_id, status, started_at, tier_mix FROM clean.adb_collection_batches WHERE status = 'ACTIVE' ORDER BY started_at DESC LIMIT 1",
  );
  if (batchRes.rowCount) {
    const b = batchRes.rows[0];
    const planned = b.tier_mix || {};
    const expected = ["HUB", "MID", "REGIONAL"].filter((t) => (planned[t] ?? 0) > 0);

    const subRes = await pool.query(
      "SELECT tier, count(*)::int AS n FROM clean.adb_collection_subs WHERE batch_id = $1 AND ended_at IS NULL GROUP BY tier",
      [b.batch_id],
    );
    const subs = subRes.rows.map((r) => `${r.tier}:${r.n}`).join(", ") || "none";
    const hasExpected = expected.every((t) => subRes.rows.some((r) => r.tier === t));
    if (!hasExpected) {
      healthy = flag(
        false,
        `active ${b.batch_id}`,
        `subscription mix incomplete — planned ${JSON.stringify(planned)} got ${subs}`,
      );
    } else {
      healthy = flag(true, `active ${b.batch_id}`, `subscriptions ${subs}`);
    }

    // Informational: rows per tier (not a pass/fail signal for REGIONAL).
    const mixRes = await pool.query(
      "SELECT airport_tier AS tier, count(*)::int AS n FROM clean.flight_data_pre_post WHERE sampling_batch_id = $1 GROUP BY airport_tier",
      [b.batch_id],
    );
    const mix = mixRes.rows.map((r) => `${r.tier}:${r.n}`).join(", ") || "no rows yet";
    flag(true, "batch rows (info)", mix);
  } else {
    healthy = flag(false, "active batch", "none running right now (idle)");
  }

  console.log(healthy ? "\nHEALTH: all good — collection is running normally." : "\nHEALTH: ACTION NEEDED — see FAIL lines above. Run: npm run logs:last");
  await pool.end();
  process.exit(healthy ? 0 : 1);
}

main().catch((err) => {
  console.error("health check failed:", err?.message || err);
  process.exit(1);
});
