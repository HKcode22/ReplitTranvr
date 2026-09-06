// ============================================================
// V3.9 credit canary (V3_CollectionStrategy2.md §44.3 gate 3,
// CGTAnalaysis8 §3/§4). A tiny, controlled live test that
// reconciles the THREE credit quantities BEFORE meaningful spend:
//
//   C_external = balance_before - balance_after      (authoritative)
//   C_internal = notification_items (adb_ingest_events) — with
//               maxDeliveryRetries=0 each item costs exactly 1 credit
//   rows       = unique rows stored / inserted / updated
//
//   PASS  when |C_external - C_internal| <= tolerance AND failures = 0
//   FAIL  otherwise (exit 1) — do NOT start the 60k run.
//
// Requires the live server (webhook ingress reachable at
// defaultWebhookUrl) + AERODATABOX_API_KEY + DATABASE_URL.
//
//   npm run canary
//   ADB_CANARY_WAIT_MS=120000 ADB_CANARY_ICAO=KLAX npm run canary
// ============================================================

import { pool } from "../server/db";
import {
  getBalance,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
} from "../server/lib/disruption/aerodataboxLimiter_v3";

const ICAO = (process.env.ADB_CANARY_ICAO || "KLAX").toUpperCase();
const WAIT_MS = Number(process.env.ADB_CANARY_WAIT_MS || 120_000);
const TOLERANCE = Number(process.env.ADB_CANARY_TOLERANCE || 3);
const SETTLE_MS = Number(process.env.ADB_CANARY_SETTLE_MS || 5_000);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  console.log("V3.9 credit canary — one tiny controlled batch (maxDeliveryRetries=0)\n");

  const b1 = await getBalance();
  if (!b1) {
    console.error("FAIL — no balance available (AERODATABOX_API_KEY set? balance refilled?).");
    await pool.end();
    process.exit(1);
  }
  const balanceBefore = b1.creditsRemaining;
  console.log(`balance_before          : ${balanceBefore}`);

  // ---- R1 exclusivity (plan §11.2 step 1, §15 R1): before the canary's own
  // subscription is created, assert the account has NO foreign ACTIVE
  // subscription capable of billable delivery. The canary's own sub is the
  // only billable one allowed to exist during the run. Inactive/historical
  // records cannot bill → not contamination. ----
  const existing = await listSubscriptions();
  const foreignActive = existing.filter(
    (s) => s.isActive && s.id !== sub?.id && s.billingType !== "LifetimeBased",
  );
  console.log(`existing subscriptions : ${existing.length} (foreign ACTIVE billable: ${foreignActive.length})`);
  if (foreignActive.length > 0) {
    console.error(
      `FAIL — ${foreignActive.length} foreign ACTIVE billable subscription(s) present: ` +
        foreignActive.map((s) => `${s.id} (${s.subject?.type ?? "?"}:${s.subject?.id ?? "?"})`).join(", ") +
        `. Delete/disable them (or the batch-start orphan cleanup) before the canary. Exclusivity is a hard gate 3 requirement (§11.2, §15 R1).`,
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
  console.log(`settling ${SETTLE_MS / 1000}s for in-flight deliveries...`);
  await sleep(SETTLE_MS);

  const b2 = await getBalance();
  const balanceAfter = b2?.creditsRemaining ?? null;
  const cExternal = balanceAfter === null ? null : balanceBefore - balanceAfter;
  console.log(`balance_after           : ${balanceAfter}`);
  console.log(`C_external (balance Δ)  : ${cExternal}`);

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

  const mismatch = cExternal === null || Math.abs(cExternal - cInternal) > TOLERANCE;
  const failuresOk = Number(a.failures) === 0;
  const pass = !mismatch && failuresOk;

  console.log(`tolerance               : ${TOLERANCE}`);
  console.log(`result                  : ${pass ? "PASS" : "FAIL"}`);
  if (pass) {
    console.log("Canary reconciles C_external = C_internal — §44.3 gates 3+4 green. The 60k run may start.");
  } else {
    console.log(
      mismatch
        ? `Investigate the balance/item gap before the 60k run (see V3_CollectionStrategy2.md §44.3 / §13).`
        : `Delivery failures observed — PAUSE and inspect the webhook path (gate 10).`,
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