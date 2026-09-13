import { describe, expect, it } from "vitest";
import {
  requireTrafficReferenceFreshnessV39,
  verifyTrafficReferenceFreshnessV39,
} from "../server/lib/disruption/trafficReferenceFreshness_v39";
import type { FrozenTrafficReferenceV39 } from "../server/lib/disruption/trafficReference_v39";

function reference(overrides: Partial<FrozenTrafficReferenceV39> = {}): FrozenTrafficReferenceV39 {
  return {
    schema_version: "v3.9-traffic-reference-frozen-1",
    status: "READY_FROZEN_REFERENCE",
    traffic_source_name: "fixture",
    traffic_source_version: "v1",
    traffic_retrieval_date: "2026-09-01",
    reference_period_start: "2025-09-01",
    reference_period_end: "2026-08-31",
    traffic_metric_name: "scheduled_departures",
    traffic_metric_units: "departures_per_frozen_12_month_period",
    reference_semantics: "scheduled_commercial_service",
    hub_cut_metric: 1,
    tier_cut_rule: "fixture",
    raw_reference_sha256: "a".repeat(64),
    tier_hash: "b".repeat(64),
    license_access_basis: "fixture",
    airports: [],
    ...overrides,
  };
}

describe("Phase 2 traffic-reference freeze-window admission", () => {
  it("retains the legacy 30-day rule unless the artifact explicitly freezes another bounded source lag", () => {
    const verdict = verifyTrafficReferenceFreshnessV39(reference(), new Date("2026-09-12T23:59:59Z"));
    expect(verdict.pass).toBe(true);
    expect(verdict.allowedMaxAgeDays).toBe(30);
    expect(verdict.referenceEndAgeCalendarDays).toBe(12);
  });

  it("accepts the exact 30-day legacy boundary and rejects 31 days", () => {
    expect(verifyTrafficReferenceFreshnessV39(reference(), new Date("2026-09-30T12:00:00Z")).pass).toBe(true);
    const stale = verifyTrafficReferenceFreshnessV39(reference(), new Date("2026-10-01T00:00:00Z"));
    expect(stale.pass).toBe(false);
    expect(stale.failures).toContain("reference-period-too-stale:31d>max30d");
  });

  it("permits an explicitly justified OPDI-style 62-day release-lag cap but never beyond it", () => {
    const openData = reference({
      reference_period_start: "2025-08-01",
      reference_period_end: "2026-07-31",
      traffic_retrieval_date: "2026-09-12",
      reference_semantics: "observed_commercial_movements",
      reference_max_age_days: 62,
      reference_freshness_basis: "latest complete monthly OPDI release; documented release cadence roughly every two months",
    });
    const current = verifyTrafficReferenceFreshnessV39(openData, new Date("2026-09-12T12:00:00Z"));
    expect(current.pass).toBe(true);
    expect(current.referenceEndAgeCalendarDays).toBe(43);
    expect(current.allowedMaxAgeDays).toBe(62);

    const tooOld = verifyTrafficReferenceFreshnessV39(openData, new Date("2026-10-02T00:00:00Z"));
    expect(tooOld.pass).toBe(false);
    expect(tooOld.failures).toContain("reference-period-too-stale:63d>max62d");
  });

  it("refuses a custom lag cap without an evidence basis", () => {
    const verdict = verifyTrafficReferenceFreshnessV39(reference({ reference_max_age_days: 62 }), new Date("2026-09-12T00:00:00Z"));
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("reference-freshness-basis-missing");
  });

  it("rejects a reference period ending after freeze and retrieval outside the valid order", () => {
    const futurePeriod = verifyTrafficReferenceFreshnessV39(
      reference({ reference_period_end: "2026-09-13", traffic_retrieval_date: "2026-09-14" }),
      new Date("2026-09-12T12:00:00Z"),
    );
    expect(futurePeriod.pass).toBe(false);
    expect(futurePeriod.failures.some((x) => x.startsWith("reference-period-ends-after-freeze"))).toBe(true);
    expect(futurePeriod.failures).toContain("traffic-retrieval-after-frame-freeze");

    const prematureRetrieval = verifyTrafficReferenceFreshnessV39(
      reference({ traffic_retrieval_date: "2026-08-30" }),
      new Date("2026-09-12T12:00:00Z"),
    );
    expect(prematureRetrieval.pass).toBe(false);
    expect(prematureRetrieval.failures).toContain("traffic-retrieval-before-reference-period-end");
  });

  it("throws fail-closed through the admission helper", () => {
    expect(() => requireTrafficReferenceFreshnessV39(reference(), new Date("2026-10-01T00:00:00Z")))
      .toThrow(/TRAFFIC_REFERENCE_FREEZE_WINDOW_INVALID/);
  });
});
