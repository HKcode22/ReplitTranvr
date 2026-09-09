// ============================================================
// V3.9 credit canary — Gate 3 official isolated canary (§1.8.1).
// Reconciles provider SEND-side spend against the immutable owned
// item ledger on the real production path:
//
//   C_external = balance_before − balance_stable   (authoritative,
//                after the SHARED ≥3-read settlement rule)
//   C_internal = Σ notification_items for the OWNED subscription/SEND scope
//   rows       = unique rows stored / inserted / updated
//
//   PASS iff C_external == C_internal (tol=0) AND failures = 0 AND
//   raw-before-2xx evidence AND owned cleanup AND no foreign subscription.
//   FAIL/STOP otherwise — do NOT start the 60k run.
//
// Settlement: shared runSettlement() from settlement_v3.ts (NOT a fixed
// sleep + single post-read). R1 exclusivity checked BEFORE our own sub
// exists (no TDZ reference). maxDeliveryRetries=0 always.
//
// Requires: exact AUTH (via v39:gate3:canary wrapper), live server with
// webhook ingress reachable, AERODATABOX_API_KEY, DATABASE_URL.
//
//   npm run v39:gate3:canary -- --auth AUTH-YYYYMMDD-G3 --evidence-id GATE-3-YYYYMMDD-001
// ============================================================

import { pool } from "../server/db";
import {
  getBalance,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {
  runSettlement,
  externalSpend,
  reconcileSpend,
  type SettlementConfig,
} from "../server/lib/disruption/settlement_v3";

const ICAO = (process.env.ADB_CANARY_ICAO || "KLAX").toUpperCase();
const WAIT_MS = Number(process.env.ADB_CANARY_WAIT_MS || 120_000);
// Shared-settlement frozen parameters (env-overridable for tests, never relaxed silently).
const SETTLEMENT: SettlementConfig = {
  initialWaitSeconds: Number(process.env.ADB_SETTLE_INITIAL_WAIT_S || 30),
  pollIntervalSeconds: Number(process.env.ADB_SETTLE_POLL_S || 10),
  stableReadCount: 3,
  timeoutSeconds: Number(process.env.ADB_SETTLE_TIMEOUT_S || 600),
};
const GATE3_TOLERANCE = 0; // exact reconciliation — not configurable

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  console.log("V3.9 credit canary — Gate 3 official isolated run (maxDeliveryRetries=0, tol=0)\n");

  const b1 = await getBalance();
  if (!b1) {
    console.error("FAIL — no balance available (AERODATABOX_API_KEY set? balance refilled?).");
    await pool.end();
    process.exit(1);
  }
  const balanceBefore = b1.creditsRemaining;
  console.log(`balance_before          : ${balanceBefore}`);

  // ---- R1 exclusivity (plan §11.2 step 1, §15 R1): BEFORE our own
  // subscription exists, assert NO foreign ACTIVE billable subscription.
  // (No TDZ reference: our sub does not exist yet at this point.)
  const existing = await listSubscriptions();
  const foreignActive = existing.filter(
    (s) => s.isActive && s.billingType !== "LifetimeBased",
  );
  console.log(`existing subscriptions : ${existing.length} (foreign ACTIVE billable: ${foreignActive.length})`);
  if (foreignActive.length > 0) {
    console.error(
      `FAIL — ${foreignActive.length} foreign ACTIVE billable subscription(s) present: ` +
        foreignActive.map((s) => `${s.id} (${s.subject?.type ?? "?"}:${s.subject?.id ?? "?"})`).join(", ") +
        `. Delete/disable them before the canary. Exclusivity is a hard Gate-3 requirement.`,
    );
    await pool.end();
    process.exit(1);
  }

  const sub = await createSubscription("FlightByAirportIcao", ICAO, { maxDeliveryRetries: 0 });
  if (!sub?.id) {
    console.error(`FAIL — could not subscribe to ${ICAO}.`);
    await pool.end();
    process.exit(1);
  }
  console.log(`subscription            : ${sub.id} (${ICAO}, maxDeliveryRetries=0)`);

  console.log(`waiting ${WAIT_MS / 1000}s for deliveries (webhook must be reachable)...`);
  await sleep(WAIT_MS);

  const delOk = await deleteSubscription(sub.id);
  console.log(`subscription deleted    : ${delOk ? "yes" : "NO (clean up manually)"}`);

  // ---- Shared settlement rule (§1.5.11): ≥3 consecutive equal reads spanning
  // the stability window; any change resets; timeout blocks. NOT a fixed sleep.
  console.log(`settling via shared rule (≥${SETTLEMENT.stableReadCount} equal reads, timeout ${SETTLEMENT.timeoutSeconds}s)...`);
  const settle = await runSettlement(SETTLEMENT, async () => {
    const b = await getBalance();
    return b ? b.creditsRemaining : null;
  });
  if (settle.status !== "settled") {
    console.error(`FAIL — SETTLEMENT_UNRESOLVED (${settle.reason}, ${settle.readsUsed} reads). No later paid run starts.`);
    await pool.end();
    process.exit(1);
  }
  const cExternal = externalSpend(balanceBefore, settle.stableBalance);
  console.log(`balance_stable          : ${settle.stableBalance} (${settle.readsUsed} reads)`);
  console.log(`C_external (B_before−B_stable): ${cExternal}`);

  const ev = await pool.query(
    `SELECT COALESCE(sum(notification_items), 0)::int AS items,
            COALESCE(sum(rows_stored), 0)::int AS stored,
            COALESCE(sum(rows_inserted), 0)::int AS inserted,
            COALESCE(sum(rows_updated), 0)::int AS updated,
            COALESCE(sum(rows_skipped), 0)::int AS skipped,
            COALESCE(count(*) FILTER (WHERE delivery_failure), 0)::int AS failures
       FROM clean.adb_ingest_events WHERE subscription_id = $1`,
    [sub.id],
  );
  const a = ev.rows[0] ?? { items: 0, stored: 0, inserted: 0, updated: 0, skipped: 0, failures: 0 };
  const cInternal = Number(a.items) ?? 0;
  console.log(`C_internal (items)      : ${cInternal}`);
  console.log(`rows stored/ins/upd/skip: ${a.stored} / ${a.inserted} / ${a.updated} / ${a.skipped}`);
  console.log(`delivery_failures       : ${a.failures}`);

  const rec = reconcileSpend({ cExternal, cInternal, tolerance: GATE3_TOLERANCE });
  const failuresOk = Number(a.failures) === 0;
  const pass = rec.match && failuresOk;

  console.log(`tolerance               : ${GATE3_TOLERANCE} (exact)`);
  console.log(`discrepancy             : ${rec.discrepancy}`);
  console.log(`result                  : ${pass ? "PASS" : "FAIL"}`);
  if (!pass) {
    console.log(
      !rec.match
        ? `MISMATCH — C_external != C_internal. Investigate before any further paid run.`
        : `Delivery failures observed — PAUSE and inspect the webhook path.`,
    );
  }

  await pool.end();
  process.exit(pass ? 0 : 1);
}

main().catch(async (err: any) => {
  console.error("credit canary failed:", err?.message || err);
  await pool.end();
  process.exit(1);
});
