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
    expect(verdict.failures).toContain("classification-required:prepost-flattened-webhook-fields");
    expect(verdict.failures).toContain("classification-required:fids-population-provider-values");
    expect(verdict.failures).toContain("classification-required:raw-airborne-observations");
    expect(verdict.failures).toContain("derived-work-proof-required:pre-snapshot-feature-vector");
  });

  it("explicitly includes the known raw JSON fields and their flattened copies as separate scopes", () => {
    const byId = new Map(PROVIDER_CONTENT_COLUMN_GROUPS.map((g) => [g.id, g]));
    expect(byId.get("prepost-raw-json")?.disposition).toBe("expiry-covered");
    expect(byId.get("prepost-flattened-webhook-fields")?.columns).toContain("dep_scheduled_utc");
    expect(byId.get("prepost-flattened-webhook-fields")?.columns).toContain("loc_lat");
    expect(byId.get("fids-response-payload")?.retentionClass).toBe("live_fids_cache");
    expect(byId.get("fids-population-provider-values")?.retentionClass).toBe("live_fids_cache");
  });
});
