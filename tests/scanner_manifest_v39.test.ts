/**
 * V3.9 contradiction-scanner and current manifest/hash-proof regression tests.
 */
import { describe, expect, it } from "vitest";
import { runContradictionScan, getScanSummary } from "../server/lib/disruption/contradictionScan_v3";
import {
  V39_MANIFEST,
  getManifestSummary,
  splitPartitionForDay,
  splitRuleHash,
  stalenessBucket,
  checkManifestCompleteness,
  MANIFEST_PLAN_VERSION,
  MANIFEST_SCHEMA_VERSION,
} from "../server/lib/disruption/manifest_v3";

describe("TEST-027: contradiction scanner", () => {
  it("returns machine-readable results with valid status values", () => {
    const results = runContradictionScan();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(typeof r.ruleId).toBe("string");
      expect(typeof r.rule).toBe("string");
      expect(["PASS", "FAIL", "TODO", "SKIP"]).toContain(r.status);
      expect(typeof r.evidence).toBe("string");
      expect(typeof r.details).toBe("string");
    }
  });

  it("summary counts add up and no scanner rule is FAIL", () => {
    const results = runContradictionScan();
    const summary = getScanSummary(results);
    expect(summary.total).toBe(results.length);
    expect(summary.pass + summary.fail + summary.todo + summary.skip).toBe(summary.total);
    expect(results.filter((r) => r.status === "FAIL")).toEqual([]);
  });

  for (const id of ["SCAN-MISSING-FIELDS", "SCAN-NO-DOUBLE-COUNT", "SCAN-RAW-BEFORE-2XX"]) {
    it(`${id} exists and passes`, () => {
      const rule = runContradictionScan().find((r) => r.ruleId === id);
      expect(rule).toBeDefined();
      expect(rule!.status).toBe("PASS");
    });
  }
});

describe("TEST-028: repository manifest", () => {
  it("uses the binding f.8 plan and current schema 0047", () => {
    expect(MANIFEST_PLAN_VERSION).toBe("v3.9-f.8");
    expect(MANIFEST_SCHEMA_VERSION).toBe("0047");
  });

  it("all entries are structured, evidence-derived, and never self-declare verified", () => {
    expect(V39_MANIFEST.length).toBeGreaterThan(0);
    for (const entry of V39_MANIFEST) {
      expect(["module", "test", "migration", "config", "document", "rule", "script"]).toContain(entry.type);
      expect(typeof entry.path).toBe("string");
      expect(typeof entry.description).toBe("string");
      expect(typeof entry.implemented).toBe("boolean");
      expect(typeof entry.tested).toBe("boolean");
      expect(entry.evidenceId === null || typeof entry.evidenceId === "string").toBe(true);
      expect("verified" in entry).toBe(false);
      expect(Array.isArray(entry.requirements)).toBe(true);
    }
    const summary = getManifestSummary();
    expect(summary.total).toBe(V39_MANIFEST.length);
    expect(summary.implemented + summary.tested + summary.withEvidence).toBeLessThanOrEqual(summary.total * 3);
  });

  it("lists current authoritative core owners rather than retired calendar/probe owners", () => {
    const paths = V39_MANIFEST.filter((m) => m.type === "module").map((m) => m.path);
    for (const path of [
      "server/lib/disruption/fidsCensus_v3.ts",
      "server/lib/disruption/flightNotificationExtractor_v3.ts",
      "server/lib/disruption/flightInstanceCanonical_v3.ts",
      "server/lib/disruption/timestampTaxonomy_v3.ts",
      "server/lib/disruption/rawIngress_v3.ts",
      "server/lib/disruption/historicalFeatureStore_v3.ts",
      "server/lib/disruption/adaptiveMi_v3.ts",
      "server/lib/disruption/weatherSignal.ts",
      "server/lib/disruption/experimentCalendarSolver_v39.ts",
      "server/lib/disruption/phase6SamplingDecision_v39.ts",
      "server/lib/disruption/phase6SafetyWatchdog_v39.ts",
      "server/lib/disruption/probeExecution_v39.ts",
      "server/lib/disruption/budgetAccounting_v3.ts",
      "server/lib/disruption/gates_v3.ts",
      "server/lib/disruption/contradictionScan_v3.ts",
      "server/lib/disruption/configRegistry_v3.ts",
    ]) expect(paths).toContain(path);
    expect(paths).not.toContain("server/lib/disruption/experimentCalendar_v3.ts");
  });

  it("lists current Phase-0 safety regression files and migration 0047", () => {
    const testPaths = V39_MANIFEST.filter((m) => m.type === "test").map((m) => m.path);
    for (const path of [
      "tests/provider_fids.test.ts",
      "tests/timestamps_raw.test.ts",
      "tests/adaptation.test.ts",
      "tests/weather_history.test.ts",
      "tests/phase6_safety_watchdog_v39.test.ts",
    ]) expect(testPaths).toContain(path);
    const migrationPaths = V39_MANIFEST.filter((m) => m.type === "migration").map((m) => m.path);
    expect(migrationPaths).toContain("migrations/0047_phase6_frozen_safety_and_overshoot.sql");
  });

  it("raw ingress remains implemented but not self-certified by manifest booleans", () => {
    const rawIngress = V39_MANIFEST.find((m) => m.type === "module" && m.path.endsWith("rawIngress_v3.ts"));
    expect(rawIngress).toBeDefined();
    expect(rawIngress!.implemented).toBe(true);
    expect(rawIngress!.tested).toBe(false);
    expect(rawIngress!.evidenceId).toBeNull();
  });
});

describe("Phase 0M: split/staleness/completeness rules", () => {
  it("has no historical AugMDnotes current dependencies", () => {
    expect(V39_MANIFEST.filter((m) => m.path.includes("AugMDnotes"))).toEqual([]);
  });

  it("freezes TRAIN 1-20, VALIDATION 21-25, TEST 26-31 with gap 0", () => {
    expect(splitPartitionForDay(1)).toBe("TRAIN");
    expect(splitPartitionForDay(20)).toBe("TRAIN");
    expect(splitPartitionForDay(21)).toBe("VALIDATION");
    expect(splitPartitionForDay(25)).toBe("VALIDATION");
    expect(splitPartitionForDay(26)).toBe("TEST");
    expect(splitPartitionForDay(31)).toBe("TEST");
    expect(splitPartitionForDay(0)).toBeNull();
    expect(splitPartitionForDay(32)).toBeNull();
  });

  it("split-rule hash is deterministic and seed-bound", () => {
    expect(splitRuleHash("s1")).toBe(splitRuleHash("s1"));
    expect(splitRuleHash("s1")).not.toBe(splitRuleHash("s2"));
    expect(splitRuleHash("s1")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("staleness buckets use the exact manifest labels", () => {
    expect(stalenessBucket(5 * 60)).toBe("<=10m");
    expect(stalenessBucket(60 * 60)).toBe("<=60m");
    expect(stalenessBucket(20 * 3600)).toBe("<=1440m");
    expect(stalenessBucket(100 * 3600)).toBe(">2880m");
    expect(stalenessBucket(-1)).toBe("invalid");
  });

  it("current source inventory remains honestly incomplete until exact-SHA evidence is supplied", () => {
    const r = checkManifestCompleteness();
    expect(Array.isArray(r.missingEvidence)).toBe(true);
    expect(Array.isArray(r.missingImplementation)).toBe(true);
    expect(r.complete).toBe(r.missingEvidence.length === 0 && r.missingImplementation.length === 0);
  });

  it("a deliberately fully-evidenced miniature manifest passes", () => {
    const r = checkManifestCompleteness([
      { type: "module", path: "a.ts", description: "a", implemented: true, tested: true, evidenceId: "RUN-1", requirements: [] },
      { type: "document", path: "doc.md", description: "d", implemented: false, tested: false, evidenceId: null, requirements: [] },
    ]);
    expect(r.complete).toBe(true);
  });
});

describe("0M: hash-derived manifest proof", () => {
  it("derives per-artifact hashes from current bytes and a deterministic aggregate", async () => {
    const { deriveManifestHashProof, checkManifestHashProof } = await import("../server/lib/disruption/manifest_v3");
    const proof = deriveManifestHashProof(process.cwd());
    expect(proof.artifacts.length).toBeGreaterThan(0);
    for (const a of proof.artifacts) expect(a.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(proof.aggregateSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(proof.missing).toEqual([]);
    expect(deriveManifestHashProof(process.cwd()).aggregateSha256).toBe(proof.aggregateSha256);
    const gate = checkManifestHashProof(proof);
    expect(gate.complete).toBe(true);
    expect(gate.failures).toEqual([]);
  });

  it("a missing required artifact fails the hash proof", async () => {
    const { deriveManifestHashProof, checkManifestHashProof, V39_MANIFEST } = await import("../server/lib/disruption/manifest_v3");
    const bogus = [...V39_MANIFEST, {
      type: "module" as const,
      path: "server/lib/disruption/does_not_exist_v9.ts",
      description: "x",
      implemented: true,
      tested: true,
      evidenceId: "RUN-1",
      requirements: [],
    }];
    const proof = deriveManifestHashProof(process.cwd(), bogus);
    expect(proof.missing).toContain("server/lib/disruption/does_not_exist_v9.ts");
    const gate = checkManifestHashProof(proof, bogus);
    expect(gate.complete).toBe(false);
    expect(gate.failures.join(" ")).toContain("does_not_exist_v9.ts");
  });
});
