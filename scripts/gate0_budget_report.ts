// ============================================================
// Gate-0 budget-partition report (plan §3.2, §17 Phase 1 step 9).
//
//   npm run gate0
//
// Prints the explicit 60,000-unit partition with the live numbers:
//   - plan + monthly units (from env / manifest; VERIFY at Gate 0)
//   - alert-credit refill (1 unit → 1 credit)
//   - spendable experimental envelope (57,900) vs permanent floor (1,000)
//   - census/REST line (≈1,000 units)
//   - unallocated remainder (100)
//   - realized spend from the adb_ingest_events ledger + Flight Alert
//     balance snapshots, split by spendable-vs-reserve
//   - per-day cap accounting (1,900/day, SOFT_STOP margin)
//
// Safe to run any time; read-only against the DB. Use it at Gate 0 AND at
// every monthly checkpoint to confirm the run-total invariant never exceeds
// the 57,900 spendable envelope.
// ============================================================

import { pool } from "../server/db";
import { getBalance } from "../server/lib/disruption/aerodataboxLimiter_v3";

const SPENDABLE_ENVELOPE = 57_900; // 58,900 refill − 1,000 permanent floor (§3.2)
const REFILL_SIZE = 58_900;
const FLOOR = 1_000; // ADB_RESERVE_CREDITS
const REST_BUDGET = 1_000; // census + anchor probes + diagnostics (§3.2)
const UNALLOCATED = 100;
const TOTAL_MONTHLY = 60_000;
const DAILY_CAP = Number(process.env.ADB_DAILY_CREDIT_CAP ?? 1900);
const SOFT_STOP_MARGIN = Number(process.env.ADB_DAILY_SOFT_STOP_MARGIN ?? 50);
const RESERVE_CREDITS = Number(process.env.ADB_RESERVE_CREDITS ?? 1000);

function row(label: string, value: string): void {
  console.log(`  ${label.padEnd(46)} ${value}`);
}

function divider(): void {
  console.log("  " + "-".repeat(60));
}

async function main(): Promise<void> {
  const plan = process.env.ADB_PLAN ?? "VERIFY_AT_GATE_0";
  const monthlyUnits = process.env.ADB_MONTHLY_UNITS ?? "VERIFY_AT_GATE_0";

  console.log("\n══════════════════════════════════════════════════════");
  console.log("GATE-0 BUDGET-PARTITION REPORT (plan §3.2)");
  console.log("══════════════════════════════════════════════════════\n");

  row("Plan (VERIFY at Gate 0)", plan);
  row("Monthly API units (VERIFY)", String(monthlyUnits));
  row("Refill conversion", "1 API unit → 1 credit");
  divider();

  row("Total monthly entitlement", `${TOTAL_MONTHLY.toLocaleString()} units`);
  row("Alert-credit refill", `${REFILL_SIZE.toLocaleString()} units → ${REFILL_SIZE.toLocaleString()} credits`);
  row("  ├─ Spendable experimental envelope", `${SPENDABLE_ENVELOPE.toLocaleString()} credits  (binding invariant)`);
  row("  └─ Permanent balance floor", `${FLOOR.toLocaleString()} credits  (ADB_RESERVE_CREDITS=${RESERVE_CREDITS})`);
  row("Census + REST budget", `≈${REST_BUDGET.toLocaleString()} units  (FIDS/S1 + probes + diagnostics)`);
  row("Unallocated remainder", `${UNALLOCATED} units  (never used experimentally)`);
  divider();

  // Arithmetic check (§3.2): 57,900 + 1,000 + 1,000 + 100 = 60,000
  const sum = SPENDABLE_ENVELOPE + FLOOR + REST_BUDGET + UNALLOCATED;
  const arithOk = sum === TOTAL_MONTHLY;
  console.log(`  Arithmetic check: ${SPENDABLE_ENVELOPE} + ${FLOOR} + ${REST_BUDGET} + ${UNALLOCATED} = ${sum} ${arithOk ? "✓ (= 60,000)" : "✗ MISMATCH"}`);
  divider();

  // Per-day cap accounting (§3.3): SOFT_STOP = 1900 − margin, HARD_CAP = 1900
  console.log(`  Daily cap: HARD_CAP=${DAILY_CAP}  SOFT_STOP=${DAILY_CAP - SOFT_STOP_MARGIN} (margin ${SOFT_STOP_MARGIN})`);
  console.log(`  Estimated daily reservation: ${DAILY_CAP} − credits_actually_consumed_today`);
  divider();

  // Realized spend from the S2 ledger (adb_ingest_events, 0017/0019)
  let realized = 0;
  try {
    const led = await pool.query(
      "SELECT coalesce(sum(notification_items),0)::int AS n FROM clean.adb_ingest_events",
    );
    realized = led.rows[0]?.n ?? 0;
  } catch (err: any) {
    console.log("  (ledger query failed — table may not exist yet on first boot)");
  }
  row("Realized spend (ledger Σ notification_items)", `${realized.toLocaleString()} credits`);
  row("Remaining spendable", `${Math.max(0, SPENDABLE_ENVELOPE - realized).toLocaleString()} credits`);
  const over = realized > SPENDABLE_ENVELOPE;
  row("Run-total invariant (≤ 57,900)", over ? `VIOLATED (+${(realized - SPENDABLE_ENVELOPE).toLocaleString()})` : "HOLDING");
  divider();

  // Latest Flight-Alert balance — LIVE from AeroDataBox first (authoritative,
  // e.g. right after a refill), fall back to the DB snapshot only if the live
  // call fails. Is the permanent floor intact?
  try {
    let bal: number | null = null;
    let src = "db-snapshot";
    const live = await getBalance();
    if (live && Number.isFinite(live.creditsRemaining)) {
      bal = live.creditsRemaining;
      src = "live-api";
    } else {
      const balRes = await pool.query(
        "SELECT credits_remaining FROM clean.flight_data_pre_post ORDER BY received_at DESC LIMIT 1",
      );
      bal = balRes.rows[0]?.credits_remaining ?? null;
    }
    if (bal !== null) {
      const floorIntact = Number(bal) >= RESERVE_CREDITS;
      row("Latest Flight-Alert balance", `${Number(bal).toLocaleString()} credits (${src})`);
      row(`Permanent floor (${RESERVE_CREDITS}) intact`, floorIntact ? "YES" : "NO — controller must refuse further spend");
    }
  } catch (err: any) {
    console.log("  (balance snapshot unavailable — no rows yet)");
  }

  console.log("\n  NOTE: census spend (FIDS/S1, probes, diagnostics) is tracked on the");
  console.log("  REST line (1,000 units), NEVER against the 57,900 refill envelope (§3.2).\n");
  await pool.end();
}

main().catch((err) => {
  console.error("gate0 report failed:", err?.message || err);
  process.exit(1);
});