/**
 * Gate 0 — non-spending account/budget evidence gatherer (plan §16 Gate 0, §3.2)
 *
 * Runs ONLY read-only, FREE AeroDataBox endpoints to record Gate-0 evidence:
 *   - GET /subscriptions/balance            (free)  Alert-credit balance
 *   - GET /subscriptions/webhook            (free)  list existing subscriptions
 *   - GET /health/services/airports/{icao}/feeds (free) live-update coverage probe
 *
 * It does NOT call the FIDS endpoint (1 REST unit/call), does NOT refill, does NOT
 * create/delete subscriptions. This is a READ-ONLY evidence gatherer.
 *
 * The plan (§16 Gate 0) also requires: user-confirmed 60,000-unit plan still
 * active, subscription_channel, billing-cycle dates, remaining/used units,
 * refill conversion/caps. Those come from the RapidAPI usage page + user, which
 * this script records as placeholders for manual confirmation.
 *
 * Usage: AERODATABOX_API_KEY=... npx tsx scripts/gate0_evidence_gather.ts
 */

import {
  getBalance,
  listSubscriptions,
  checkAirportFeeds,
} from "../server/lib/disruption/aerodataboxLimiter_v3";

const PROBE_ICAOS = ["KLAX", "KSFO", "KJFK", "WSSS", "OMAA"];

function divider(): void {
  console.log("  " + "-".repeat(60));
}

async function main(): Promise<void> {
  const key = process.env.AERODATABOX_API_KEY;
  if (!key) {
    console.error("AERODATABOX_API_KEY not set — cannot gather Gate-0 evidence");
    process.exit(1);
  }

  console.log("\n══════════════════════════════════════════════════════");
  console.log("GATE-0 EVIDENCE GATHER (READ-ONLY, NON-SPENDING)");
  console.log("══════════════════════════════════════════════════════\n");
  console.log(`  gathered_at_utc: ${new Date().toISOString()}`);
  divider();

  // 1. Alert-credit balance (free)
  console.log("  [1] GET /subscriptions/balance (free)");
  const balance = await getBalance();
  if (balance) {
    console.log(`      creditsRemaining: ${balance.creditsRemaining}`);
    console.log(`      lastRefilledUtc:  ${balance.lastRefilledUtc ?? "n/a"}`);
    console.log(`      lastDeductedUtc:  ${balance.lastDeductedUtc ?? "n/a"}`);
  } else {
    console.log("      ERROR: balance read failed");
  }
  divider();

  // 2. Existing subscriptions (free, READ-ONLY)
  console.log("  [2] GET /subscriptions/webhook (free)");
  const subs = await listSubscriptions();
  if (subs.length === 0) {
    console.log("      none (no billable subscriptions — R1 exclusivity holds)");
  } else {
    console.log(`      ${subs.length} subscription(s):`);
    for (const s of subs) {
      const subj = s.subject ? `${s.subject.type}/${s.subject.id}` : "?";
      console.log(`        id=${s.id} active=${s.isActive} subject=${subj} expires=${s.expiresOnUtc ?? "n/a"}`);
    }
  }
  divider();

  // 3. Feed coverage probes (free) — for the candidate airports
  console.log("  [3] GET /health/services/airports/{icao}/feeds (free, coverage)");
  for (const icao of PROBE_ICAOS) {
    const feeds = await checkAirportFeeds(icao);
    if (feeds) {
      const keys = Object.keys(feeds).filter((k) => k !== "icao" && k !== "message");
      console.log(`      ${icao}: ${keys.join(", ") || "no feed keys returned"}`);
    } else {
      console.log(`      ${icao}: (no feed health returned)`);
    }
  }
  divider();

  // 4. Placeholders requiring user/RapidAPI-dashboard confirmation
  console.log("  [4] USER/RapidAPI-DASHBOARD CONFIRMATION REQUIRED (plan §16 Gate 0):");
  console.log("      MONTHLY_PLAN_ENTITLEMENT_UNITS = 60000 (USER-CONFIRMED)");
  console.log("      subscription_channel            = VERIFY (RapidAPI / API.Market / direct)");
  console.log("      billing-cycle dates             = VERIFY (RapidAPI usage page)");
  console.log("      remaining/used REST units       = VERIFY (RapidAPI usage page)");
  console.log("      refill conversion/caps          = VERIFY (1 unit = 1 credit; per-refill cap)");
  divider();

  console.log("\n  RESULT: read-only Gate-0 evidence gathered (balances + subscriptions + coverage).");
  console.log("  Gate 0 is NOT PASS until the [4] items are confirmed by the user/RapidAPI page.\n");
}

main().catch((err) => {
  console.error("gate0 evidence gather failed:", err?.message || err);
  process.exit(1);
});