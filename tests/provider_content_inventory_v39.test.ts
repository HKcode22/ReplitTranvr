import { describe, expect, it } from "vitest";
import {
  PROVIDER_CONTENT_COLUMN_GROUPS,
  verifyProviderContentInventory,
} from "../server/lib/disruption/providerContentInventory_v39";

describe("V3.9 provider-content column inventory", () => {
  it("keeps P blocked while copied provider fields or Derived-Work proof remain unresolved", () => {
    const verdict = verifyProviderContentInventory();
    expect(verdict.pass).toBe(false);
    expect(verdict.coveredGroupCount).toBeGreaterThanOrEqual(4);
    expect(verdict.unresolvedGroupCount).toBeGreaterThan(0);
    expect(verdict.failures).toContain("classification-required:raw-delivery-item-extracted-provider-facts");
    expect(verdict.failures).toContain("classification-required:webhook-flight-identity-provider-values");
    expect(verdict.failures).toContain("classification-required:webhook-schedule-version-provider-values");
    expect(verdict.failures).toContain("classification-required:prepost-flattened-webhook-fields");
    expect(verdict.failures).toContain("classification-required:fids-population-provider-values");
    expect(verdict.failures).toContain("classification-required:raw-airborne-observations");
    expect(verdict.failures).toContain("derived-work-proof-required:pre-snapshot-feature-vector");
  });

  it("explicitly separates raw bodies from extracted/flattened provider copies", () => {
    const byId = new Map(PROVIDER_CONTENT_COLUMN_GROUPS.map((g) => [g.id, g]));

    expect(byId.get("raw-delivery-envelope")?.disposition).toBe("expiry-covered");
    expect(byId.get("raw-delivery-extracted-provider-facts")?.columns).toContain("provider_published_utc");

    expect(byId.get("raw-delivery-item")?.disposition).toBe("expiry-covered");
    expect(byId.get("raw-delivery-item-extracted-provider-facts")?.columns).toContain("departure_scheduled_utc");

    expect(byId.get("prepost-raw-json")?.disposition).toBe("expiry-covered");
    expect(byId.get("prepost-flattened-webhook-fields")?.columns).toContain("dep_scheduled_utc");
    expect(byId.get("prepost-flattened-webhook-fields")?.columns).toContain("loc_lat");

    expect(byId.get("webhook-flight-identity-provider-values")?.columns).toContain("provider_identity_alias");
    expect(byId.get("webhook-schedule-version-provider-values")?.columns).toContain("observed_scheduled_gate_out_utc");

    expect(byId.get("fids-response-payload")?.retentionClass).toBe("live_fids_cache");
    expect(byId.get("fids-population-provider-values")?.retentionClass).toBe("live_fids_cache");
  });

  it("does not classify copied provider values as derived work just because they are normalized", () => {
    const rawGroups = PROVIDER_CONTENT_COLUMN_GROUPS.filter((g) => g.retentionClass !== "derived_work_candidate");
    for (const group of rawGroups) {
      expect(group.retentionClass === "raw_provider_content" || group.retentionClass === "live_fids_cache").toBe(true);
    }
    const derivedCandidates = PROVIDER_CONTENT_COLUMN_GROUPS.filter((g) => g.retentionClass === "derived_work_candidate");
    expect(derivedCandidates.map((g) => g.id)).toEqual(expect.arrayContaining(["pre-snapshot-feature-vector", "outcome-evidence"]));
    expect(derivedCandidates.every((g) => g.disposition === "derived-work-proof-required")).toBe(true);
  });
});
