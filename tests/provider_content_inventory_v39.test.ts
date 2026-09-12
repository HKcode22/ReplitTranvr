import { describe, expect, it } from "vitest";
import {
  PROVIDER_CONTENT_COLUMN_GROUPS,
  verifyProviderContentInventory,
} from "../server/lib/disruption/providerContentInventory_v39";

describe("V3.9 provider-content column inventory", () => {
  it("keeps P blocked only on still-unresolved downstream identity/airborne/Derived-Work scopes", () => {
    const verdict = verifyProviderContentInventory();
    expect(verdict.pass).toBe(false);
    expect(verdict.coveredGroupCount).toBeGreaterThanOrEqual(15);
    expect(verdict.unresolvedGroupCount).toBeGreaterThan(0);

    for (const coveredId of [
      "raw-delivery-item-canonical-id-encoding",
      "webhook-flight-identity-provider-values",
      "webhook-schedule-version-provider-values",
      "webhook-resolution-provider-derived-values",
      "fids-population-provider-values",
      "collection-batch-provider-account-values",
      "anchor-probe-provider-account-values",
    ]) {
      expect(verdict.failures.some((failure) => failure.endsWith(`:${coveredId}`))).toBe(false);
    }

    expect(verdict.failures).toContain("derived-work-proof-required:downstream-canonical-flight-instance-id-encoding");
    expect(verdict.failures).toContain("classification-required:semantic-event-copied-provider-values");
    expect(verdict.failures).toContain("classification-required:raw-airborne-observations");
    expect(verdict.failures).toContain("classification-required:clean-airborne-copied-values");
    expect(verdict.failures).toContain("classification-required:airborne-eligibility-provider-evidence");
    expect(verdict.failures).toContain("classification-required:airborne-quarantine-provider-evidence");
    expect(verdict.failures).toContain("derived-work-proof-required:pre-snapshot-feature-vector");
    expect(verdict.failures).toContain("derived-work-proof-required:outcome-evidence");
  });

  it("covers provider-native notification, identity, FIDS, account and subscription fields with explicit owners", () => {
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

    expect(byId.get("raw-delivery-item-canonical-id-encoding")?.owner).toBe("retentionExpiry_v39");
    expect(byId.get("webhook-flight-identity-provider-values")?.owner).toBe("providerIdentityExpiry_v39");
    expect(byId.get("webhook-schedule-version-provider-values")?.owner).toBe("providerIdentityExpiry_v39");
    expect(byId.get("webhook-resolution-provider-derived-values")?.owner).toBe("providerIdentityExpiry_v39");

    const fidsRaw = byId.get("fids-response-payload")!;
    expect(fidsRaw.retentionClass).toBe("live_fids_cache");
    expect(fidsRaw.disposition).toBe("expiry-covered");
    expect(fidsRaw.columns).toEqual(expect.arrayContaining(["raw_payload", "response_hash"]));

    const fidsPopulation = byId.get("fids-population-provider-values")!;
    expect(fidsPopulation.retentionClass).toBe("live_fids_cache");
    expect(fidsPopulation.disposition).toBe("expiry-covered");
    expect(fidsPopulation.owner).toBe("retentionExpiry_v39+0053");
    expect(fidsPopulation.columns).toEqual(expect.arrayContaining([
      "population_query_id",
      "response_hash",
      "canonical_flight_instance_id",
      "analytic_identity_id",
    ]));

    const batch = byId.get("collection-batch-provider-account-values")!;
    expect(batch.disposition).toBe("expiry-covered");
    expect(batch.owner).toBe("providerAccountExpiry_v39");

    const probe = byId.get("anchor-probe-provider-account-values")!;
    expect(probe.disposition).toBe("expiry-covered");
    expect(probe.owner).toBe("providerAccountExpiry_v39");

    const covered = PROVIDER_CONTENT_COLUMN_GROUPS.filter((g) => g.disposition === "expiry-covered");
    expect(covered.every((g) => g.owner !== "UNVERIFIED")).toBe(true);
  });

  it("moves the short-hash blocker to surviving downstream research storage", () => {
    expect(PROVIDER_CONTENT_COLUMN_GROUPS.some((g) => g.table === "clean.flight_state")).toBe(false);

    const rawItemCanonical = PROVIDER_CONTENT_COLUMN_GROUPS.find((g) => g.id === "raw-delivery-item-canonical-id-encoding");
    expect(rawItemCanonical?.retentionClass).toBe("raw_provider_content");
    expect(rawItemCanonical?.disposition).toBe("expiry-covered");

    const downstreamCanonical = PROVIDER_CONTENT_COLUMN_GROUPS.find((g) => g.id === "downstream-canonical-flight-instance-id-encoding");
    expect(downstreamCanonical?.table).toBe("clean.flight_events");
    expect(downstreamCanonical?.columns).toContain("flight_instance_id");
    expect(downstreamCanonical?.retentionClass).toBe("derived_work_candidate");
    expect(downstreamCanonical?.disposition).toBe("derived-work-proof-required");
  });

  it("does not classify copied provider values as derived work just because they are normalized", () => {
    const rawGroups = PROVIDER_CONTENT_COLUMN_GROUPS.filter((g) => g.retentionClass !== "derived_work_candidate");
    for (const group of rawGroups) {
      expect(group.retentionClass === "raw_provider_content" || group.retentionClass === "live_fids_cache").toBe(true);
    }
    const derivedCandidates = PROVIDER_CONTENT_COLUMN_GROUPS.filter((g) => g.retentionClass === "derived_work_candidate");
    expect(derivedCandidates.map((g) => g.id)).toEqual(expect.arrayContaining([
      "downstream-canonical-flight-instance-id-encoding",
      "pre-snapshot-feature-vector",
      "outcome-evidence",
    ]));
    expect(derivedCandidates.every((g) => g.disposition === "derived-work-proof-required")).toBe(true);
  });
});
