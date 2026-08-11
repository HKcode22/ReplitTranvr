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

  // 2. Balance (latest snapshot on any row)
  const balRes = await pool.query(
    "SELECT credits_remaining FROM clean.flight_data_pre_post ORDER BY received_at DESC LIMIT 1",
  );
  const bal = balRes.rows[0]?.credits_remaining ?? null;
  if (bal === null) {
    healthy = flag(false, "balance", "unknown (no rows)");
  } else if (bal < 2000) {
    healthy = flag(false, "balance", `${bal} — low, refill soon`);
  } else {
    healthy = flag(true, "balance", `${bal} credits`);
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

  // 4. Active batch + its tier mixture
  const batchRes = await pool.query(
    "SELECT batch_id, status, started_at FROM clean.adb_collection_batches WHERE status = 'ACTIVE' ORDER BY started_at DESC LIMIT 1",
  );
  if (batchRes.rowCount) {
    const b = batchRes.rows[0];
    const mixRes = await pool.query(
      "SELECT airport_tier AS tier, count(*)::int AS n FROM clean.flight_data_pre_post WHERE sampling_batch_id = $1 GROUP BY airport_tier",
      [b.batch_id],
    );
    const mix = mixRes.rows.map((r) => `${r.tier}:${r.n}`).join(", ") || "no rows yet";
    const hasAllTiers = ["HUB", "MID", "REGIONAL"].every((t) => mixRes.rows.some((r) => r.tier === t));
    if (!hasAllTiers) {
      healthy = flag(false, `active ${b.batch_id}`, `tier mix incomplete — ${mix}`);
    } else {
      healthy = flag(true, `active ${b.batch_id}`, `tiers ${mix}`);
    }
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
