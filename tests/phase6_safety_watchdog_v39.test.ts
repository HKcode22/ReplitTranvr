import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  evaluatePhase6Safety,
  PHASE6_DAILY_HARD_CAP,
  PHASE6_MAX_RUN_ALERT_CEILING,
} from "../server/lib/disruption/phase6SafetyWatchdog_v39";

function src(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("V3.9 Phase-6 SEND-aware safety arithmetic", () => {
  it("keeps the binding production hard cap and max run design ceiling", () => {
    expect(PHASE6_DAILY_HARD_CAP).toBe(1900);
    expect(PHASE6_MAX_RUN_ALERT_CEILING).toBe(57900);
  });

  it("passes the Plan Gate-4 scaled 100/10 => soft stop 90 arithmetic", () => {
    const before = evaluatePhase6Safety({
      balanceKnown: true,
      externalSpend: 79,
      internalSpend: 79,
      effectiveDailyCap: 100,
      dailySoftStopMarginCredits: 10,
      unsettledBurstMarginCredits: 10,
      priorRunSettledSpend: 0,
      phase6AlertSpendCeiling: 1000,
    });
    expect(before.dailySoftStop).toBe(90);
    expect(before.daySafetyExposure).toBe(89);
    expect(before.stop).toBe(false);

    const at = evaluatePhase6Safety({
      balanceKnown: true,
      externalSpend: 80,
      internalSpend: 80,
      effectiveDailyCap: 100,
      dailySoftStopMarginCredits: 10,
      unsettledBurstMarginCredits: 10,
      priorRunSettledSpend: 0,
      phase6AlertSpendCeiling: 1000,
    });
    expect(at.dailySoftStop).toBe(90);
    expect(at.daySafetyExposure).toBe(90);
    expect(at.stop).toBe(true);
    expect(at.reason).toBe("daily_soft_stop");
  });

  it("asserts production 1900-50=1850 without treating 50 as a provider law", () => {
    const r = evaluatePhase6Safety({
      balanceKnown: true,
      externalSpend: 1799,
      internalSpend: 1799,
      effectiveDailyCap: 1900,
      dailySoftStopMarginCredits: 50,
      unsettledBurstMarginCredits: 50,
      priorRunSettledSpend: 0,
      phase6AlertSpendCeiling: 57900,
    });
    expect(r.dailySoftStop).toBe(1850);
    expect(r.daySafetyExposure).toBe(1849);
    expect(r.stop).toBe(false);
  });

  it("fails closed when authoritative balance is unavailable", () => {
    const r = evaluatePhase6Safety({
      balanceKnown: false,
      externalSpend: null,
      internalSpend: 12,
      effectiveDailyCap: 1900,
      dailySoftStopMarginCredits: 50,
      unsettledBurstMarginCredits: 10,
      priorRunSettledSpend: 0,
      phase6AlertSpendCeiling: 57900,
    });
    expect(r.stop).toBe(true);
    expect(r.reason).toContain("authoritative_balance");
  });

  it("uses max(external, internal), never the lower received ledger", () => {
    const r = evaluatePhase6Safety({
      balanceKnown: true,
      externalSpend: 1845,
      internalSpend: 1000,
      effectiveDailyCap: 1900,
      dailySoftStopMarginCredits: 50,
      unsettledBurstMarginCredits: 5,
      priorRunSettledSpend: 0,
      phase6AlertSpendCeiling: 57900,
    });
    expect(r.observedSpend).toBe(1845);
    expect(r.daySafetyExposure).toBe(1850);
    expect(r.stop).toBe(true);
  });

  it("stops against the run-total ceiling separately from the daily ceiling", () => {
    const r = evaluatePhase6Safety({
      balanceKnown: true,
      externalSpend: 150,
      internalSpend: 150,
      effectiveDailyCap: 1900,
      dailySoftStopMarginCredits: 50,
      unsettledBurstMarginCredits: 10,
      priorRunSettledSpend: 57740,
      phase6AlertSpendCeiling: 57900,
    });
    expect(r.runSafetyExposure).toBe(57900);
    expect(r.stop).toBe(true);
    expect(r.reason).toBe("run_soft_stop");
  });

  it("hard-cap exceedance outranks soft-stop classification", () => {
    const r = evaluatePhase6Safety({
      balanceKnown: true,
      externalSpend: 1901,
      internalSpend: 1901,
      effectiveDailyCap: 1900,
      dailySoftStopMarginCredits: 50,
      unsettledBurstMarginCredits: 10,
      priorRunSettledSpend: 0,
      phase6AlertSpendCeiling: 57900,
    });
    expect(r.reason).toBe("daily_hard_cap_exceeded");
  });
});

describe("V3.9 Phase-6 production wiring static boundaries", () => {
  it("boot registry reaches 0047 and starts the safety owner only after migrations", () => {
    const db = src("server/db.ts");
    expect(db).toContain("0047_phase6_frozen_safety_and_overshoot.sql");
    expect(db.indexOf("0047_phase6_frozen_safety_and_overshoot.sql"))
      .toBeLessThan(db.indexOf("startPhase6SafetyWatchdog"));
  });

  it("Phase-6 owner requires schema 0047 and a live exact-code watchdog heartbeat", () => {
    const owner = src("scripts/v39_phase6_start_owner_v39.ts");
    expect(owner).toContain('REQUIRED_SCHEMA_VERSION = "0047"');
    expect(owner).toContain("adb_phase6_safety_heartbeat");
    expect(owner).toContain("REFUSED_SAFETY_WATCHDOG");
    expect(owner).toContain("phase6_alert_spend_ceiling");
    expect(owner).toContain("daily_soft_stop_margin_credits");
    expect(owner).toContain("production_reconcile_tolerance_credits");
  });

  it("0047 distinguishes soft margin from unsettled reserve and requires settlement evidence", () => {
    const migration = src("migrations/0047_phase6_frozen_safety_and_overshoot.sql");
    expect(migration).toContain("daily_soft_stop_margin_credits");
    expect(migration).toContain("unsettled_burst_margin_credits");
    expect(migration).toContain("adb_phase6_soft_margin_covers_unsettled");
    expect(migration).toContain("adb_phase6_settlement_evidence");
    expect(migration).toContain("REFUSED_UNEVIDENCED_SETTLEMENT");
    expect(migration).toContain("adb_budget_day_adjustment");
    expect(migration).toContain("hard_cap_overshoot");
  });

  it("safety owner never starts/refills/FIDS/selects airports", () => {
    const safety = src("server/lib/disruption/phase6SafetyWatchdog_v39.ts");
    expect(safety).not.toContain("createSubscription(");
    expect(safety).not.toContain("refillBalance(");
    expect(safety).not.toContain("getAirportFids(");
    expect(safety).not.toContain("chooseAirportsForRunDay(");
    expect(safety).toContain("deleteSubscription(");
    expect(safety).toContain("runSettlement(");
  });
});
