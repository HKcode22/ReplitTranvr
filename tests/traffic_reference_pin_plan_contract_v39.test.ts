import { describe, expect, it } from "vitest";
import {
  loadFrozenTrafficReferenceV39,
  V39_PINNED_TRAFFIC_REFERENCE_SHA256,
  V39_PINNED_TRAFFIC_REFERENCE_WORKFLOW_RUN_ID,
} from "../server/lib/disruption/pinnedTrafficReference_v39";
import { verifyTrafficReferencePlanContractV39 } from "../server/lib/disruption/trafficReferencePlanContract_v39";
import {
  verifyTrafficReferenceFreshnessV39,
  V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS,
} from "../server/lib/disruption/trafficReferenceFreshness_v39";

describe("V3.9 pinned traffic reference and binding Plan contract", () => {
  it("reconstructs the exact validated MrAirspace frozen artifact from the repository pin", () => {
    const loaded = loadFrozenTrafficReferenceV39(process.cwd());
    expect(loaded.pinnedRepositoryArtifact).toBe(true);
    expect(loaded.artifactSha256).toBe(V39_PINNED_TRAFFIC_REFERENCE_SHA256);
    expect(V39_PINNED_TRAFFIC_REFERENCE_WORKFLOW_RUN_ID).toBe("34732924481");
    expect(loaded.traffic.status).toBe("READY_FROZEN_REFERENCE");
    expect(loaded.traffic.airports).toHaveLength(2295);
    expect(loaded.traffic.tier_hash).toBe("18cd871421220e72cd96044ae790fc95bdae1d69b9f9e43ac35566fd786eb7dc");
    expect(loaded.traffic.hub_cut_metric).toBe(64152);
    expect(loaded.traffic.airports.find((row) => row.icao === "WSSS")?.tier).toBe("HUB");
    expect(loaded.traffic.airports.find((row) => row.icao === "OMAA")?.tier).toBe("HUB");
  });

  it("does not allow an evidence artifact to relax the binding Plan 30-day freshness maximum", () => {
    const { traffic } = loadFrozenTrafficReferenceV39(process.cwd());
    expect(V39_BINDING_TRAFFIC_REFERENCE_MAX_AGE_DAYS).toBe(30);
    const verdict = verifyTrafficReferenceFreshnessV39(traffic, new Date("2026-09-13T00:00:00Z"));
    expect(verdict.pass).toBe(false);
    expect(verdict.allowedMaxAgeDays).toBe(30);
    expect(verdict.referenceEndAgeCalendarDays).toBe(75);
    expect(verdict.failures).toContain("reference-artifact-attempts-plan-relaxation:92d>30d");
    expect(verdict.failures).toContain("reference-period-too-stale:75d>max30d");
  });

  it("keeps the ADS-B candidate blocked because the current frame uses it for §4.5 scheduled-route balancing variables", () => {
    const { traffic } = loadFrozenTrafficReferenceV39(process.cwd());
    expect(traffic.reference_semantics).toBe("observed_commercial_movements");
    const verdict = verifyTrafficReferencePlanContractV39(traffic, new Date("2026-09-13T00:00:00Z"));
    expect(verdict.pass).toBe(false);
    expect(verdict.failures).toContain("balancing-reference-not-scheduled:observed_commercial_movements");
    expect(verdict.failures.some((failure) => failure.includes("reference-period-too-stale:75d>max30d"))).toBe(true);
  });
});
