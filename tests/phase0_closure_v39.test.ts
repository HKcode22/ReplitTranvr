/**
 * V3.9 Phase 0O/0P closure/anti-bypass regression tests.
 * These are offline tests only; they never contact AeroDataBox.
 */
import { describe, expect, it } from "vitest";
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
  return JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")).scripts ?? {};
}
function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Phase 0O: executable command surface", () => {
  it("no required v39:* command is an echo stub", () => {
    const scripts = packageScripts();
    const v39 = Object.entries(scripts).filter(([k]) => k.startsWith("v39:"));
    expect(v39.length).toBeGreaterThan(0);
    expect(v39.filter(([, v]) => /^\s*echo\b/.test(String(v))).map(([k]) => k)).toEqual([]);
  });

  it("v39:preflight is aggregate, not a scanner alias", () => {
    const scripts = packageScripts();
    expect(scripts["v39:preflight"]).toContain("v39_preflight_v39");
    expect(scripts["v39:preflight"]).not.toBe(scripts["v39:scanner"]);
  });

  it("paid commands route through TypeScript guard-backed wrappers", () => {
    const scripts = packageScripts();
    for (const cmd of [
      "v39:smoke:safety",
      "v39:probe:stage1",
      "v39:probe:stage2",
      "v39:gate3:canary",
      "v39:gate05:pilot",
      "v39:gate4:live-check",
      "v39:gate5:population",
      "v39:phase6:start",
    ]) {
      expect(scripts[cmd]).toMatch(/\.ts/);
      expect(scripts[cmd]).not.toMatch(/^\s*echo\b/);
    }
  });

  it("operationArgs strips AUTH controls from operation args only", () => {
    expect(operationArgs([
      "--auth", "AUTH-20260908-G3",
      "--auth-file", "/tmp/auth.json",
      "--evidence-id", "GATE-3-20260908-001",
      "--duration", "60",
    ])).toEqual(["--duration", "60"]);
  });

  it("wrapper verifies first, then reattaches exact AUTH id/file for owner verification", () => {
    const events: string[] = [];
    const output: string[] = [];
    let ownerArgs: string[] = [];
    const code = runAuthorizedOwner(
      "v39:gate05:pilot",
      "Phase 3 / Gate 0.5",
      "scripts/v39_gate05_owner_v39.ts",
      [
        "--auth", "AUTH-20260908-G05",
        "--auth-file", "/tmp/auth.json",
        "--evidence-id", "GATE-3-20260908-001",
        "--measurements-file", "/tmp/m.json",
      ],
      {
        authorize: (() => {
          events.push("AUTH");
          return { authId: "AUTH-20260908-G05" } as any;
        }) as any,
        spawn: ((...args: any[]) => {
          ownerArgs = args[1];
          events.push("OWNER");
          return { status: 0, error: undefined };
        }) as any,
        write: (line) => output.push(line),
      },
    );
    expect(events).toEqual(["AUTH", "OWNER"]);
    expect(ownerArgs).toContain("--auth");
    expect(ownerArgs).toContain("AUTH-20260908-G05");
    expect(ownerArgs).toContain("--auth-file");
    expect(ownerArgs).toContain("/tmp/auth.json");
    expect(ownerArgs).toContain("--measurements-file");
    expect(code).toBe(0);
    expect(JSON.parse(output[0]).status).toBe("PASS");
  });

  it("never invokes owner when front-door authorization refuses", () => {
    let ownerCalls = 0;
    expect(() => runAuthorizedOwner(
      "v39:phase6:start",
      "Phase 6 (separate authorization)",
      "owner.ts",
      ["--auth", "AUTH-20260908-P6", "--auth-file", "/tmp/auth.json"],
      {
        authorize: (() => { throw new Error("REFUSED"); }) as any,
        spawn: (() => { ownerCalls += 1; return { status: 0 }; }) as any,
        write: () => undefined,
      },
    )).toThrow("REFUSED");
    expect(ownerCalls).toBe(0);
  });

  it("environment-only V39_VERIFIED_AUTH is not an owner authorization path", async () => {
    const guard = source("scripts/v39_paid_guard_v39.ts");
    expect(guard).not.toMatch(/env\.V39_VERIFIED_AUTH/);
    const { resolveOwnerAuthorization } = await import("../scripts/v39_paid_guard_v39");
    expect(() => resolveOwnerAuthorization(
      "Phase 3 / Gate 3",
      [],
      { V39_VERIFIED_AUTH: "AUTH-20260908-G3" } as any,
    )).toThrow(/--auth.*--auth-file/);
  });

  it("current Stage-1/Stage-2 owners never delegate to legacy anchor_probe.ts", () => {
    for (const path of [
      "scripts/v39_probe_stage1_v39.ts",
      "scripts/v39_probe_stage1_owner_v39.ts",
      "scripts/v39_probe_stage2_owner_v39.ts",
    ]) {
      expect(source(path)).not.toContain("anchor_probe.ts");
      expect(source(path)).not.toContain("V39_VERIFIED_AUTH");
    }
  });

  it("production boot registry includes the current schema through 0046", () => {
    const db = source("server/db.ts");
    for (const file of [
      "0037_phase6_sampling_decision_state.sql",
      "0038_phase6_parent_segment_lifecycle.sql",
      "0039_phase6_authorization_and_admission.sql",
      "0040_phase6_calendar_execution_fields.sql",
      "0041_phase6_start_admission_tolerance.sql",
      "0042_webhook_identity_resolution_ledger.sql",
      "0043_phase6_start_time_guard.sql",
      "0044_webhook_attempt_provenance.sql",
      "0045_incident_stop_persistence_cause.sql",
      "0046_subscription_create_uncertainty_stop.sql",
    ]) expect(db).toContain(file);
  });
});

describe("Phase 0P: probe budget-day semantics", () => {
  it("cumulative immutable probe budget-day cap is 500", () => {
    expect(PROBE_CAP_DAILY_UNITS).toBe(500);
  });

  it("detects a UTC-midnight crossing", () => {
    expect(probeWindowCrossesMidnightUtc(
      new Date("2026-09-01T23:00:00Z"),
      new Date("2026-09-02T01:00:00Z"),
    )).toBe(true);
    expect(probeWindowCrossesMidnightUtc(
      new Date("2026-09-01T08:00:00Z"),
      new Date("2026-09-01T10:00:00Z"),
    )).toBe(false);
  });

  it("midnight probe is default-refuse unless an explicit split identity exists", () => {
    expect(admitProbeSpend(
      new Date("2026-09-01T23:00:00Z"), new Date("2026-09-02T01:00:00Z"), false, 0, 10,
    )).toBe("refuse:midnight");
    expect(admitProbeSpend(
      new Date("2026-09-01T23:00:00Z"), new Date("2026-09-02T01:00:00Z"), true, 0, 10,
    )).toBe("allow");
  });

  it("cumulative spend above 500 is refused", () => {
    expect(admitProbeSpend(
      new Date("2026-09-01T08:00:00Z"), new Date("2026-09-01T10:00:00Z"), false, 490, 20,
    )).toBe("refuse:cap-exceeded");
    expect(admitProbeSpend(
      new Date("2026-09-01T08:00:00Z"), new Date("2026-09-01T10:00:00Z"), false, 490, 10,
    )).toBe("allow");
  });

  it("ambiguous provider CREATE outcomes have database incident-stop triggers", () => {
    const migration = source("migrations/0046_subscription_create_uncertainty_stop.sql");
    expect(migration).toContain("subscription_create_outcome_unknown");
    expect(migration).toContain("trg_probe_create_uncertainty_stop");
    expect(migration).toContain("trg_phase6_create_uncertainty_stop");
    expect(migration).toContain("'MISMATCH'");
    expect(migration).toContain("'reconciliation'");
  });
});

describe("Phase 0P: R1 exclusivity", () => {
  it("empty and owned-only sets are clean", () => {
    expect(checkR1Exclusivity([]).clean).toBe(true);
    expect(checkR1Exclusivity([{ id: "a", owned: true, isActive: true, billable: true }]).clean).toBe(true);
  });

  it("foreign ACTIVE billable subscription fails R1", () => {
    const r = checkR1Exclusivity([
      { id: "owned-1", owned: true, isActive: true, billable: true },
      { id: "foreign", owned: false, isActive: true, billable: true },
    ]);
    expect(r.clean).toBe(false);
    expect(r.foreignActiveBillable.map((s) => s.id)).toEqual(["foreign"]);
  });

  it("foreign inactive/non-billable rows do not fail R1", () => {
    expect(checkR1Exclusivity([{ id: "x", owned: false, isActive: false, billable: true }]).clean).toBe(true);
    expect(checkR1Exclusivity([{ id: "y", owned: false, isActive: true, billable: false }]).clean).toBe(true);
  });
});

describe("Phase 0O: AUTH record semantics", () => {
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

  it("valid record verifies and wrong gate/expiry/nonpositive ceiling refuse", async () => {
    const { verifyAuthRecord } = await import("../server/lib/disruption/authRecord_v39");
    expect(verifyAuthRecord(validRecord() as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["GATE-2-20260907-001"],
      expectedPhaseGate: "Phase 3 / Gate 3",
    }).verified).toBe(true);
    expect(verifyAuthRecord(validRecord() as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["GATE-2-20260907-001"],
      expectedPhaseGate: "Phase 4 / Gate 4",
    }).verified).toBe(false);
    expect(verifyAuthRecord(validRecord({ expiresAtUtc: "2026-09-01T00:00:00Z" }) as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["GATE-2-20260907-001"],
    }).verified).toBe(false);
    expect(verifyAuthRecord(validRecord({ maxAlertCredits: 0 }) as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["GATE-2-20260907-001"],
    }).verified).toBe(false);
  });

  it("exact artifact hash approval binds bytes", async () => {
    const { verifyAuthRecord, sha256HexString } = await import("../server/lib/disruption/authRecord_v39");
    const record = validRecord();
    const raw = JSON.stringify(record);
    const approved = sha256HexString(raw);
    expect(verifyAuthRecord(record as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["GATE-2-20260907-001"],
      expectedPhaseGate: "Phase 3 / Gate 3",
      artifactHash: approved,
      approvedArtifactHashes: [approved],
    }).verified).toBe(true);
    const tampered = { ...record, maxAlertCredits: 999999 };
    expect(verifyAuthRecord(tampered as any, {
      nowUtc: NOW,
      existingEvidenceIds: ["GATE-2-20260907-001"],
      expectedPhaseGate: "Phase 3 / Gate 3",
      artifactHash: sha256HexString(JSON.stringify(tampered)),
      approvedArtifactHashes: [approved],
    }).verified).toBe(false);
  });

  it("approved artifact tokens parse without assuming the current ledger has an authorization", async () => {
    const { approvedArtifactHashesFromLedger } = await import("../server/lib/disruption/authRecord_v39");
    expect(approvedArtifactHashesFromLedger("AUTH_ARTIFACT_SHA256:" + "a".repeat(64))).toEqual(["a".repeat(64)]);
  });

  it("experimental delivery retries remain exactly zero", async () => {
    const { resolveExperimentalRetries } = await import("../server/lib/disruption/aerodataboxLimiter_v3");
    expect(resolveExperimentalRetries(undefined)).toBe(0);
    expect(resolveExperimentalRetries(0)).toBe(0);
    expect(() => resolveExperimentalRetries(1)).toThrow("must be 0");
    expect(() => resolveExperimentalRetries(2)).toThrow("must be 0");
  });
});
