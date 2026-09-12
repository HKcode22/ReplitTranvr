import { describe, expect, it } from "vitest";
import {
  PROVIDER_CONTENT_COLUMN_GROUPS,
  verifyProviderContentInventory,
} from "../server/lib/disruption/providerContentInventory_v39";

describe("V3.9 provider-content column inventory", () => {
  it("keeps P blocked on unresolved identity/FIDS/airborne/accounting/Derived-Work scopes", () => {
    const verdict = verifyProviderContentInventory();
    expect(verdict.pass).toBe(false);
    expect(verdict.coveredGroupCount).toBeGreaterThanOrEqual(8);
    expect(verdict.unresolvedGroupCount).toBeGreaterThan(0);
    expect(verdict.failures).not.toContain("classification-required:raw-delivery-item-extracted-provider-facts");
    expect(verdict.failures).not.toContain("classification-required:prepost-provider-row");
    expect(verdict.failures).toContain("derived-work-proof-required:raw-delivery-item-canonical-id-encoding");
    expect(verdict.failures).toContain("classification-required:webhook-flight-identity-provider-values");
    expect(verdict.failures).toContain("derived-work-proof-required:canonical-flight-instance-id-encoding");
    expect(verdict.failures).toContain("classification-required:webhook-schedule-version-provider-values");
    expect(verdict.failures).toContain("classification-required:fids-population-provider-values");
    expect(verdict.failures).toContain("classification-required:raw-airborne-observations");
    expect(verdict.failures).toContain("classification-required:collection-batch-provider-account-values");
    expect(verdict.failures).toContain("classification-required:anchor-probe-provider-account-values");
    expect(verdict.failures).toContain("derived-work-proof-required:pre-snapshot-feature-vector");
  });

  it("covers provider-native notification, attempt, subscription and account fields in ingress expiry", () => {
    const byId = new Map(PROVIDER_CONTENT_COLUMN_GROUPS.map((g) => [g.id, g]));

    const raw = byId.get("raw-delivery-extracted-provider-facts")!;
    expect(raw.disposition).toBe("expiry-covered");
    expect(raw.columns).toEqual(expect.arrayContaining([
      "provider_published_utc",
      "notification_id",
      "provider_notification_generated_utc",
      "delivery_attempt_seq_no",
      "delivery_attempt_utc",
      "delivery_attempt_cost_credits",
    ]));

    const ingest = byId.get("ingest-envelope-provider-scope")!;
    expect(ingest.disposition).toBe("expiry-covered");
    expect(ingest.columns).toEqual(expect.arrayContaining(["subscription_id", "credits_remaining"]));

    expect(byId.get("raw-delivery-item-extracted-provider-facts")?.disposition).toBe("expiry-covered");
    expect(byId.get("processing-attempt-provider-bearing-errors")?.disposition).toBe("expiry-covered");
    expect(byId.get("prepost-provider-row")?.disposition).toBe("expiry-covered");
    expect(byId.get("fids-response-payload")?.retentionClass).toBe("live_fids_cache");

    const covered = PROVIDER_CONTENT_COLUMN_GROUPS.filter((g) => g.disposition === "expiry-covered");
    expect(covered.every((g) => g.owner !== "UNVERIFIED")).toBe(true);
  });

  it("contains no phantom clean.flight_state and does not bless short canonical leg hashes", () => {
    expect(PROVIDER_CONTENT_COLUMN_GROUPS.some((g) => g.table === "clean.flight_state")).toBe(false);

    const rawItemCanonical = PROVIDER_CONTENT_COLUMN_GROUPS.find((g) => g.id === "raw-delivery-item-canonical-id-encoding");
    expect(rawItemCanonical?.table).toBe("clean.raw_delivery_item");
    expect(rawItemCanonical?.columns).toContain("canonical_flight_instance_id");
    expect(rawItemCanonical?.retentionClass).toBe("derived_work_candidate");
    expect(rawItemCanonical?.disposition).toBe("derived-work-proof-required");

    const canonical = PROVIDER_CONTENT_COLUMN_GROUPS.find((g) => g.id === "canonical-flight-instance-id-encoding");
    expect(canonical?.table).toBe("clean.webhook_flight_identity");
    expect(canonical?.columns).toContain("flight_instance_id");
    expect(canonical?.retentionClass).toBe("derived_work_candidate");
    expect(canonical?.disposition).toBe("derived-work-proof-required");
  });

  it("does not classify copied provider values as derived work just because they are normalized", () => {
    const rawGroups = PROVIDER_CONTENT_COLUMN_GROUPS.filter((g) => g.retentionClass !== "derived_work_candidate");
    for (const group of rawGroups) {
      expect(group.retentionClass === "raw_provider_content" || group.retentionClass === "live_fids_cache").toBe(true);
    }
    const derivedCandidates = PROVIDER_CONTENT_COLUMN_GROUPS.filter((g) => g.retentionClass === "derived_work_candidate");
    expect(derivedCandidates.map((g) => g.id)).toEqual(expect.arrayContaining([
      "raw-delivery-item-canonical-id-encoding",
      "canonical-flight-instance-id-encoding",
      "pre-snapshot-feature-vector",
      "outcome-evidence",
    ]));
    expect(derivedCandidates.every((g) => g.disposition === "derived-work-proof-required")).toBe(true);
  });
});
