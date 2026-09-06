// ============================================================
// Refill Flight-Alert credits (plan §17 Phase 1 step 6–8).
//
//   npm run refill -- 2038
//   npm run refill            ← with no amount: show balance only
//
// Uses the existing AeroDataBox client — requires only
// AERODATABOX_API_KEY (no RapidAPI account login). 1 API unit =
// 1 credit (§3.2). Gate 0: do ONE 1-credit refill first, confirm
// units−1 = credits+1, then refill up to refillToFullBudget.
//
// Safe to run any time; this CALLS THE BILLING ENDPOINT and will
// consume API units, so only run the amount you intend.
// ============================================================

import { getBalance, refillBalance } from "../server/lib/disruption/aerodataboxLimiter_v3";

async function main(): Promise<void> {
  const amount = Number(process.argv[2]);

  if (!Number.isFinite(amount) || amount <= 0) {
    const bal = await getBalance();
    if (!bal) {
      console.log("No balance record yet (empty 200). Refill first with: npm run refill -- <credits>");
      return;
    }
    console.log("Flight-Alert balance (read-only):");
    console.log(`  creditsRemaining : ${bal.creditsRemaining}`);
    console.log(`  lastRefilledUtc  : ${bal.lastRefilledUtc ?? "—"}`);
    console.log(`  lastDeductedUtc  : ${bal.lastDeductedUtc ?? "—"}`);
    console.log("To refill (billing): npm run refill -- <credits>   # 1 unit = 1 credit");
    return;
  }

  console.log(`Refilling ${amount} credit(s) via POST /subscriptions/balance/refill ...`);
  const bal = await refillBalance(amount);
  if (!bal) {
    console.error("FAILED — see the [adb-v3] refillBalance error above (likely billing/account authorization).");
    process.exitCode = 1;
    return;
  }
  console.log("Success. New balance:");
  console.log(`  creditsRemaining : ${bal.creditsRemaining}`);
  console.log(`  lastRefilledUtc  : ${bal.lastRefilledUtc ?? "—"}`);
  console.log(`  lastDeductedUtc  : ${bal.lastDeductedUtc ?? "—"}`);
}

main().catch((err) => {
  console.error("refill_credits error:", err?.message || err);
  process.exitCode = 1;
});