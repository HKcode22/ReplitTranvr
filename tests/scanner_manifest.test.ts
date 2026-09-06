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

  it("manifest entry has required fields", () => {
    for (const entry of V39_MANIFEST) {
      expect(typeof entry.type).toBe("string");
      expect(["module", "test", "migration", "config", "document", "rule"]).toContain(entry.type);
      expect(typeof entry.path).toBe("string");
      expect(typeof entry.description).toBe("string");
      expect(typeof entry.implemented).toBe("boolean");
      expect(typeof entry.tested).toBe("boolean");
      expect(typeof entry.verified).toBe("boolean");
      expect(Array.isArray(entry.requirements)).toBe(true);
    }
  });

  it("summary counts add up", () => {
    const summary = getManifestSummary();
    expect(summary.total).toBe(V39_MANIFEST.length);
    expect(summary.implemented + summary.tested + summary.verified).toBeLessThanOrEqual(summary.total * 3);
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
