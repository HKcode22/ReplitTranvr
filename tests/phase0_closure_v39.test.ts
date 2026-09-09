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
import { operationArgs, runAuthorizedOwner } from "../scripts/v39_wrapper_runtime_v39";

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

  it("removes AUTH control options and values before probe/canary owner forwarding", () => {
    expect(operationArgs([
      "--auth", "AUTH-20260908-G3",
      "--auth-file", "/tmp/auth.json",
      "--evidence-id", "GATE-3-20260908-001",
      "--duration", "60",
    ])).toEqual(["--duration", "60"]);
  });

  it("runs the concrete owner only after mocked authorization and emits PASS evidence", () => {
    const events: string[] = [];
    const output: string[] = [];
    const code = runAuthorizedOwner(
      "v39:gate05:pilot",
      "Phase 3 / Gate 0.5",
      "scripts/v39_gate05_owner_v39.ts",
      ["--auth", "AUTH-20260908-G05", "--auth-file", "/tmp/auth.json", "--measurements-file", "/tmp/m.json"],
      {
        authorize: (() => { events.push("AUTH"); return {} as any; }) as any,
        spawn: ((...args: any[]) => { events.push(`OWNER:${args[1].join(" ")}`); return { status: 0, error: undefined }; }) as any,
        write: (line) => output.push(line),
      },
    );
    expect(events[0]).toBe("AUTH");
    expect(events[1]).toContain("OWNER:");
    expect(events[1]).not.toContain("--auth-file");
    expect(code).toBe(0);
    expect(JSON.parse(output[0]).status).toBe("PASS");
  });

  it("never invokes an owner when mocked authorization refuses", () => {
    let ownerCalls = 0;
    expect(() => runAuthorizedOwner("v39:phase6:start", "Phase 6", "owner.ts", [], {
      authorize: (() => { throw new Error("REFUSED"); }) as any,
      spawn: (() => { ownerCalls++; return { status: 0 }; }) as any,
      write: () => undefined,
    })).toThrow("REFUSED");
    expect(ownerCalls).toBe(0);
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
      expectedPhaseGate: "Phase 3 / Gate 3",
    });
    expect(v.verified).toBe(true);
  });

  it("AUTH for a different gate is refused", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    const v = verifyAuthRecord(validRecord() as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["GATE-2-20260907-001"],
      expectedPhaseGate: "Phase 4 / Gate 4",
    });
    expect(v.verified).toBe(false);
    if (!v.verified) expect(v.reason).toContain("phaseGate mismatch");
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

describe("Phase 0O+: hash-locked AUTH artifacts + owner anti-bypass (round-3 items 5–6)", () => {
  const NOW = new Date("2026-09-08T12:00:00Z");

  function handCraftedRecord() {
    // Well-formed in every verified dimension: format, gate, window,
    // ceilings, and predecessor IDs that REALLY exist in the ledger.
    // Without artifact approval it must still refuse.
    return {
      authorizationId: "AUTH-20260908-G3",
      phaseGate: "Phase 3 / Gate 3",
      airportFilterWindow: "KLAX/departures/2026-09-08T08:00Z+2h",
      maxAlertCredits: 100,
      maxRestUnitsByCategory: null,
      startNotBeforeUtc: "2026-09-08T00:00:00Z",
      expiresAtUtc: "2026-09-09T00:00:00Z",
      cleanupOwner: "operator",
      predecessorEvidenceIds: ["RUN-20260908-005"],
    };
  }

  it("hand-crafted record with real predecessors REFUSES without artifact approval", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    const v = verifyAuthRecord(handCraftedRecord() as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["RUN-20260908-005"],
      expectedPhaseGate: "Phase 3 / Gate 3",
      artifactHash: "c".repeat(64),
      approvedArtifactHashes: [],
    });
    expect(v.verified).toBe(false);
    if (!v.verified) expect(v.reason).toContain("not in approved AUTH artifact set");
  });

  it("approved artifact bytes VERIFY (success path exists and is hash-bound)", async () => {
    const { verifyAuthRecord, sha256HexString } = await import("../server/lib/disruption/authRecord_v39");
    const record = handCraftedRecord();
    const artifactHash = sha256HexString(JSON.stringify(record));
    const v = verifyAuthRecord(record as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["RUN-20260908-005"],
      expectedPhaseGate: "Phase 3 / Gate 3",
      artifactHash,
      approvedArtifactHashes: [artifactHash],
    });
    expect(v.verified).toBe(true);
  });

  it("altered bytes fail the same approval (hash binds exact content)", async () => {
    const { verifyAuthRecord, sha256HexString } = await import("../server/lib/disruption/authRecord_v39");
    const record = handCraftedRecord();
    const approved = sha256HexString(JSON.stringify(record));
    const tampered = { ...record, maxAlertCredits: 999999 };
    const v = verifyAuthRecord(tampered as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["RUN-20260908-005"],
      expectedPhaseGate: "Phase 3 / Gate 3",
      artifactHash: sha256HexString(JSON.stringify(tampered)),
      approvedArtifactHashes: [approved],
    });
    expect(v.verified).toBe(false);
  });

  it("ledger artifact tokens parse; production ledger currently approves none (fail-closed)", async () => {
    const { approvedArtifactHashesFromLedger } = await import("../server/lib/disruption/authRecord_v39");
    expect(approvedArtifactHashesFromLedger("AUTH_ARTIFACT_SHA256:" + "a".repeat(64))).toEqual(["a".repeat(64)]);
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const ledger = readFileSync(join(process.cwd(), "SEPmd", "V3.9_RUN_REPORTS_AND_EVIDENCE.md"), "utf8");
    expect(approvedArtifactHashesFromLedger(ledger)).toEqual([]);
  });

  it("owner authorization accepts wrapper mediation proof", async () => {
    const { resolveOwnerAuthorization } = await import("../scripts/v39_paid_guard_v39");
    expect(
      resolveOwnerAuthorization("Phase 3 / Gate 3", [], { V39_VERIFIED_AUTH: "AUTH-20260908-G3" } as any),
    ).toEqual({ mode: "wrapper-mediated", authId: "AUTH-20260908-G3" });
  });

  it("owner authorization refuses unmediated execution without auth file", async () => {
    const { resolveOwnerAuthorization } = await import("../scripts/v39_paid_guard_v39");
    expect(() => resolveOwnerAuthorization("Phase 3 / Gate 3", [], {} as any)).toThrow("REFUSE");
  });

  it("wrapper propagates mediation proof env to the spawned owner", () => {
    let capturedEnv: Record<string, string | undefined> | undefined;
    runAuthorizedOwner("v39:gate3:canary", "Phase 3 / Gate 3", "scripts/credit_canary.ts", [], {
      authorize: (() => ({ authId: "AUTH-20260908-G3" }) as any) as any,
      spawn: ((...args: any[]) => {
        capturedEnv = args[2]?.env;
        return { status: 0, error: undefined };
      }) as any,
      write: () => undefined,
    });
    expect(capturedEnv?.V39_VERIFIED_AUTH).toBe("AUTH-20260908-G3");
  });

  it("experimental retries are strict: nonzero THROWS (never clamps)", async () => {
    const { resolveExperimentalRetries } = await import("../server/lib/disruption/aerodataboxLimiter_v3");
    expect(resolveExperimentalRetries(undefined)).toBe(0);
    expect(resolveExperimentalRetries(0)).toBe(0);
    expect(() => resolveExperimentalRetries(1)).toThrow("must be 0");
    expect(() => resolveExperimentalRetries(2)).toThrow("must be 0");
  });

  it("createSubscription routes through the strict resolver (no clamp)", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const src = readFileSync(join(process.cwd(), "server/lib/disruption/aerodataboxLimiter_v3.ts"), "utf8");
    const body = src.slice(src.indexOf("export async function createSubscription"));
    expect(body).toContain("resolveExperimentalRetries(");
    expect(body).not.toContain("Math.min(2");
  });
});
