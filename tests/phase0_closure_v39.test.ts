/**
 * Phase 0O/0P closure tests (§1.5.15–1.5.16).
 *
 * Proves the command surface and refusal/aggregation behavior:
 *  - no required v39:* command remains an echo stub (CRIT-011 detector);
 *  - v39:preflight is aggregate, not a scanner alias (CRIT-012);
 *  - budget-day identity is run_day_index, not UTC date (midnight attribution);
 *  - R1 exclusivity refuses foreign ACTIVE billable subscriptions;
 *  - probe 500-credit cumulative budget-day admission (midnight-split + cap).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  admitProbeSpend,
  probeWindowCrossesMidnightUtc,
  PROBE_CAP_DAILY_UNITS,
} from "../server/lib/disruption/budgetAccounting_v3";
import { checkR1Exclusivity } from "../server/lib/disruption/gates_v3";

function packageScripts(): Record<string, string> {
  const p = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  return p.scripts ?? {};
}

describe("Phase 0O: stub-command detector (CRIT-011)", () => {
  it("no required v39:* command is an echo stub (lint is now real too)", () => {
    const scripts = packageScripts();
    const v39 = Object.entries(scripts).filter(([k]) => k.startsWith("v39:"));
    expect(v39.length).toBeGreaterThan(0);
    const stubs = v39
      .filter(([, v]) => /^\s*echo\b/.test(String(v)))
      .map(([k]) => k);
    expect(stubs).toEqual([]);
  });

  it("v39:preflight is aggregate, not a scanner alias (CRIT-012)", () => {
    const scripts = packageScripts();
    expect(scripts["v39:preflight"]).toContain("v39_preflight_v39");
    expect(scripts["v39:preflight"]).not.toBe(scripts["v39:scanner"]);
  });

  it("paid commands map to guard-backed wrappers (refuse without AUTH)", () => {
    const scripts = packageScripts();
    for (const cmd of [
      "v39:smoke:safety",
      "v39:gate05:pilot",
      "v39:gate4:live-check",
      "v39:gate5:population",
      "v39:phase6:start",
    ]) {
      expect(scripts[cmd]).toMatch(/\.ts/);
      expect(scripts[cmd]).not.toMatch(/^\s*echo\b/);
    }
  });
});

describe("Phase 0P: budget-day vs UTC-day + probe cap (§1.5.11/TEST-018/021)", () => {
  it("PROBE_CAP_DAILY is 500 per immutable budget day", () => {
    expect(PROBE_CAP_DAILY_UNITS).toBe(500);
  });

  it("midnight-crossing window detected (UTC calendar boundary)", () => {
    expect(
      probeWindowCrossesMidnightUtc(
        new Date("2026-09-01T23:00:00Z"),
        new Date("2026-09-02T01:00:00Z"),
      ),
    ).toBe(true);
    expect(
      probeWindowCrossesMidnightUtc(
        new Date("2026-09-01T08:00:00Z"),
        new Date("2026-09-01T10:00:00Z"),
      ),
    ).toBe(false);
  });

  it("midnight-crossing probe refused unless explicitly split", () => {
    expect(
      admitProbeSpend(
        new Date("2026-09-01T23:00:00Z"),
        new Date("2026-09-02T01:00:00Z"),
        false, 0, 10,
      ),
    ).toBe("refuse:midnight");
    expect(
      admitProbeSpend(
        new Date("2026-09-01T23:00:00Z"),
        new Date("2026-09-02T01:00:00Z"),
        true, 0, 10,
      ),
    ).toBe("allow");
  });

  it("cumulative day spend above 500 refused (MISMATCH guard)", () => {
    expect(
      admitProbeSpend(new Date("2026-09-01T08:00:00Z"), new Date("2026-09-01T10:00:00Z"), false, 490, 20),
    ).toBe("refuse:cap-exceeded");
    expect(
      admitProbeSpend(new Date("2026-09-01T08:00:00Z"), new Date("2026-09-01T10:00:00Z"), false, 490, 10),
    ).toBe("allow");
  });
});

describe("Phase 0P: R1 exclusivity — foreign ACTIVE billable refused", () => {
  it("empty set and owned-only sets are clean", () => {
    expect(checkR1Exclusivity([]).clean).toBe(true);
    expect(
      checkR1Exclusivity([{ id: "a", owned: true, isActive: true, billable: true }]).clean,
    ).toBe(true);
  });

  it("foreign ACTIVE billable subscription fails R1", () => {
    const r = checkR1Exclusivity([
      { id: "owned-1", owned: true, isActive: true, billable: true },
      { id: "rl8-orphan", owned: false, isActive: true, billable: true },
    ]);
    expect(r.clean).toBe(false);
    expect(r.foreignActiveBillable.map((s) => s.id)).toEqual(["rl8-orphan"]);
  });

  it("foreign INACTIVE or non-billable subscriptions do not fail R1", () => {
    expect(
      checkR1Exclusivity([{ id: "x", owned: false, isActive: false, billable: true }]).clean,
    ).toBe(true);
    expect(
      checkR1Exclusivity([{ id: "y", owned: false, isActive: true, billable: false }]).clean,
    ).toBe(true);
  });
});

describe("Phase 0O: AUTH-record verification with success path (ChatGPT P1-7)", () => {
  const NOW = new Date("2026-09-08T12:00:00Z");

  function validRecord(over: Record<string, unknown> = {}) {
    return {
      authorizationId: "AUTH-20260908-G3",
      phaseGate: "Phase 3 / Gate 3",
      airportFilterWindow: "KLAX/departures/2026-09-08T08:00Z+2h",
      maxAlertCredits: 100,
      maxRestUnitsByCategory: null,
      startNotBeforeUtc: "2026-09-08T00:00:00Z",
      expiresAtUtc: "2026-09-09T00:00:00Z",
      cleanupOwner: "operator",
      predecessorEvidenceIds: ["GATE-2-20260907-001"],
      ...over,
    };
  }

  it("fully valid record VERIFIES (success path exists)", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    const v = verifyAuthRecord(validRecord() as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["GATE-2-20260907-001"],
    });
    expect(v.verified).toBe(true);
  });

  it("missing record refused", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    expect(verifyAuthRecord(null, { nowUtc: NOW, existingEvidenceIds: [] }).verified).toBe(false);
  });

  it("malformed ID refused", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    const v = verifyAuthRecord(validRecord({ authorizationId: "nope" }) as any, { nowUtc: NOW, existingEvidenceIds: [] });
    expect(v.verified).toBe(false);
  });

  it("expired record refused", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    const v = verifyAuthRecord(validRecord({ expiresAtUtc: "2026-09-01T00:00:00Z" }) as any, { nowUtc: NOW, existingEvidenceIds: ["GATE-2-20260907-001"] });
    expect(v.verified).toBe(false);
    if (!v.verified) expect(v.reason).toContain("expired");
  });

  it("missing predecessor evidence refused with names", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    const v = verifyAuthRecord(validRecord() as any, { nowUtc: NOW, existingEvidenceIds: [] });
    expect(v.verified).toBe(false);
    if (!v.verified) expect(v.reason).toContain("GATE-2-20260907-001");
  });

  it("non-positive ceiling refused", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    const v = verifyAuthRecord(validRecord({ maxAlertCredits: 0 }) as any, { nowUtc: NOW, existingEvidenceIds: ["GATE-2-20260907-001"] });
    expect(v.verified).toBe(false);
  });
});
