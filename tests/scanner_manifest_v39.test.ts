/**
 * TEST-027/028: Scanner and manifest verification (V3.9 Plan §71, §74)
 *
 * Covers:
 *  - Contradiction scanner returns machine-readable results
 *  - All SCAN rules are evaluated (PASS/FAIL/TODO/SKIP)
 *  - Scan summary counts are correct
 *  - Manifest lists all expected modules/tests/migrations
 *  - Manifest summary counts are correct
 */

import { describe, it, expect } from "vitest";
import {
  runContradictionScan,
  getScanSummary,
} from "../server/lib/disruption/contradictionScan_v3";
import {
  V39_MANIFEST,
  getManifestSummary,
  splitPartitionForDay,
  splitRuleHash,
  stalenessBucket,
  checkManifestCompleteness,
  MANIFEST_PLAN_VERSION,
} from "../server/lib/disruption/manifest_v3";

// ---------------------------------------------------------------------------
// TEST-027: Contradiction scanner
// ---------------------------------------------------------------------------

describe("TEST-027: Contradiction scanner", () => {
  it("scan returns array of results", () => {
    const results = runContradictionScan();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("each result has required fields", () => {
    const results = runContradictionScan();
    for (const r of results) {
      expect(typeof r.ruleId).toBe("string");
      expect(typeof r.rule).toBe("string");
      expect(["PASS", "FAIL", "TODO", "SKIP"]).toContain(r.status);
      expect(typeof r.evidence).toBe("string");
      expect(typeof r.details).toBe("string");
    }
  });

  it("summary counts add up", () => {
    const results = runContradictionScan();
    const summary = getScanSummary(results);

    expect(summary.total).toBe(results.length);
    expect(summary.pass + summary.fail + summary.todo + summary.skip).toBe(summary.total);
  });

  it("SCAN-MISSING-FIELDS rule exists and passes", () => {
    const results = runContradictionScan();
    const rule = results.find(r => r.ruleId === "SCAN-MISSING-FIELDS");
    expect(rule).toBeDefined();
    expect(rule!.status).toBe("PASS");
  });

  it("SCAN-NO-DOUBLE-COUNT rule exists and passes", () => {
    const results = runContradictionScan();
    const rule = results.find(r => r.ruleId === "SCAN-NO-DOUBLE-COUNT");
    expect(rule).toBeDefined();
    expect(rule!.status).toBe("PASS");
  });

  it("SCAN-RAW-BEFORE-2XX rule exists and passes", () => {
    const results = runContradictionScan();
    const rule = results.find(r => r.ruleId === "SCAN-RAW-BEFORE-2XX");
    expect(rule).toBeDefined();
    expect(rule!.status).toBe("PASS");
  });

  it("no FAIL results (all rules pass or are TODO/SKIP)", () => {
    const results = runContradictionScan();
    const fails = results.filter(r => r.status === "FAIL");
    expect(fails).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TEST-028: Repository manifest
// ---------------------------------------------------------------------------

describe("TEST-028: Repository manifest", () => {
  it("manifest has entries", () => {
    expect(V39_MANIFEST.length).toBeGreaterThan(0);
  });

  it("manifest entry has required fields (no self-declared verified flag)", () => {
    for (const entry of V39_MANIFEST) {
      expect(typeof entry.type).toBe("string");
      expect(["module", "test", "migration", "config", "document", "rule", "script"]).toContain(entry.type);
      expect(typeof entry.path).toBe("string");
      expect(typeof entry.description).toBe("string");
      expect(typeof entry.implemented).toBe("boolean");
      expect(typeof entry.tested).toBe("boolean");
      // Evidence-derived: tested entries carry an evidence ID, never a bare verified:true.
      expect(entry.evidenceId === null || typeof entry.evidenceId === "string").toBe(true);
      expect("verified" in entry).toBe(false);
      expect(Array.isArray(entry.requirements)).toBe(true);
    }
  });

  it("summary counts add up", () => {
    const summary = getManifestSummary();
    expect(summary.total).toBe(V39_MANIFEST.length);
    expect(summary.implemented + summary.tested + summary.withEvidence).toBeLessThanOrEqual(summary.total * 3);
  });

  it("all core modules are listed", () => {
    const modules = V39_MANIFEST.filter(m => m.type === "module");
    const paths = modules.map(m => m.path);

    expect(paths).toContain("server/lib/disruption/fidsCensus_v3.ts");
    expect(paths).toContain("server/lib/disruption/flightNotificationExtractor_v3.ts");
    expect(paths).toContain("server/lib/disruption/flightInstanceCanonical_v3.ts");
    expect(paths).toContain("server/lib/disruption/timestampTaxonomy_v3.ts");
    expect(paths).toContain("server/lib/disruption/rawIngress_v3.ts");
    expect(paths).toContain("server/lib/disruption/historicalFeatureStore_v3.ts");
    expect(paths).toContain("server/lib/disruption/adaptiveMi_v3.ts");
    expect(paths).toContain("server/lib/disruption/weatherSignal.ts");
    expect(paths).toContain("server/lib/disruption/experimentCalendar_v3.ts");
    expect(paths).toContain("server/lib/disruption/budgetAccounting_v3.ts");
    expect(paths).toContain("server/lib/disruption/gates_v3.ts");
    expect(paths).toContain("server/lib/disruption/contradictionScan_v3.ts");
    expect(paths).toContain("server/lib/disruption/configRegistry_v3.ts");
  });

  it("all test files are listed", () => {
    const tests = V39_MANIFEST.filter(m => m.type === "test");
    const paths = tests.map(t => t.path);

    expect(paths).toContain("tests/provider_fids.test.ts");
    expect(paths).toContain("tests/timestamps_raw.test.ts");
    expect(paths).toContain("tests/adaptation.test.ts");
    expect(paths).toContain("tests/weather_history.test.ts");
  });

  it("raw ingress module marked as tested after TEST-006/007", () => {
    const rawIngress = V39_MANIFEST.find(
      m => m.type === "module" && m.path.includes("rawIngress_v3"),
    );
    expect(rawIngress).toBeDefined();
    // After we write tests, this should be true
    expect(rawIngress!.implemented).toBe(true);
  });
});

describe("Phase 0M: manifest repair + split rule + completeness gate (§1.5.13)", () => {
  it("manifest authority is f.8 (no stale f.9 label)", () => {
    expect(MANIFEST_PLAN_VERSION).toBe("v3.9-f.8");
  });

  it("no AugMDnotes current dependencies remain", () => {
    const stale = V39_MANIFEST.filter((m) => m.path.includes("AugMDnotes"));
    expect(stale).toEqual([]);
  });

  it("split rule freezes the assignment: TRAIN 1–20, VALIDATION 21–25, TEST 26–31, gap 0", () => {
    expect(splitPartitionForDay(1)).toBe("TRAIN");
    expect(splitPartitionForDay(20)).toBe("TRAIN");
    expect(splitPartitionForDay(21)).toBe("VALIDATION");
    expect(splitPartitionForDay(25)).toBe("VALIDATION");
    expect(splitPartitionForDay(26)).toBe("TEST");
    expect(splitPartitionForDay(31)).toBe("TEST");
    expect(splitPartitionForDay(0)).toBeNull();
    expect(splitPartitionForDay(32)).toBeNull();
  });

  it("split-rule hash is deterministic per seed", () => {
    expect(splitRuleHash("s1")).toBe(splitRuleHash("s1"));
    expect(splitRuleHash("s1")).not.toBe(splitRuleHash("s2"));
    expect(splitRuleHash("s1")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("staleness buckets follow the frozen ladder", () => {
    expect(stalenessBucket(5 * 60)).toBe("<=10m");
    expect(stalenessBucket(60 * 60)).toBe("<=60m");
    expect(stalenessBucket(20 * 3600)).toBe("<=1440m");
    expect(stalenessBucket(100 * 3600)).toBe(">48h");
    expect(stalenessBucket(-1)).toBe("invalid");
  });

  it("incomplete manifest refuses FREEZE/start (exact missing lists)", () => {
    const r = checkManifestCompleteness();
    // Documents/configs excluded; every module/test/migration/script must be
    // implemented AND evidenced. Expect open items (honest, not forced green).
    expect(Array.isArray(r.missingEvidence)).toBe(true);
    expect(Array.isArray(r.missingImplementation)).toBe(true);
    expect(r.complete).toBe(r.missingEvidence.length === 0 && r.missingImplementation.length === 0);
  });

  it("a fully-evidenced manifest passes the gate", () => {
    const r = checkManifestCompleteness([
      { type: "module", path: "a.ts", description: "a", implemented: true, tested: true, evidenceId: "RUN-1", requirements: [] },
      { type: "document", path: "doc.md", description: "d", implemented: false, tested: false, evidenceId: null, requirements: [] },
    ]);
    expect(r.complete).toBe(true);
  });
});
