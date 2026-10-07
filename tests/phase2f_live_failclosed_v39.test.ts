import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = () =>
  readFileSync(
    join(process.cwd(), "server/lib/disruption/prepaidProbeWindow_v39.ts"),
    "utf8",
  );

describe("V3.9 Phase-2F live fail-closed invariants", () => {
  it("validates prepaid persistence configuration before provider subscription creation", () => {
    const text = source();
    const preflight = text.indexOf("assertPrepaidProbePersistenceConfigV39();");
    const create = text.indexOf('createSubscription("FlightByAirportIcao"');

    expect(preflight).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(-1);
    expect(preflight).toBeLessThan(create);
  });

  it("never hides provider balance uncertainty or increases behind a zero clamp", () => {
    const text = source();
    const balance = text.indexOf(
      "const balance = await getBalanceWithTransientRetryV39();",
    );
    const refusal = text.indexOf(
      'liveStopReason = "balance_read_failed_after_retries"',
      balance,
    );
    const external = text.indexOf(
      "input.balanceBefore - settle.stableBalance",
      balance,
    );

    expect(balance).toBeGreaterThan(-1);
    expect(refusal).toBeGreaterThan(balance);
    expect(external).toBeGreaterThan(refusal);

    expect(text).not.toContain(
      "Math.max(0, input.balanceBefore - balance.creditsRemaining)",
    );

    expect(text).not.toContain(
      "const externalCredits = Math.max",
    );

    expect(text).toContain(
      "provider_balance_increased_during_probe",
    );

    expect(text).toContain(
      "provider_balance_increased_during_settlement",
    );
  });

  it("keeps deletion after the live watchdog and before settlement", () => {
    const text = source();
    const balanceRefusal = text.indexOf('liveStopReason = "balance_read_failed_after_retries"');
    const deletion = text.indexOf("subscriptionDeleted = await deleteOwnedSubscriptionVerifiedV39(sub.id)");
    const settlement = text.indexOf("const settle = await runSettlement");

    expect(deletion).toBeGreaterThan(balanceRefusal);
    expect(settlement).toBeGreaterThan(deletion);
  });
});
