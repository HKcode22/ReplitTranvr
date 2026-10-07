import { describe, expect, it } from "vitest";
import {
  classifyPhase2gScientificHealthV39,
  readPhase2gScientificHealthV39,
  type Phase2gScientificHealthCountsV39,
} from "../server/lib/disruption/phase2gScientificHealth_v39";

const baseCounts: Phase2gScientificHealthCountsV39 = {
  totalItemRows: 12,
  providerFlightIdMissingRows: 12,
  callsignMissingRows: 3,
  aircraftRegPresentRows: 8,
  resolvedRows: 9,
  quarantinedRows: 3,
  resolvedOperatorRows: 9,
  quarantinedOperatorRows: 1,
  marketingRows: 1,
  ambiguousCodeshareRows: 1,
  resolvedPhysicalIds: 8,
  provisionalIdentityKeys: 9,
  resolvedRowsWithoutPhysicalId: 0,
  quarantinedRowsWithPhysicalId: 0,
  resolvedRowsNonOperator: 0,
  exactLegEligibleRows: 10,
  exactLegGroups: 8,
  repeatedExactLegGroups: 2,
  mixedResolutionExactLegGroups: 0,
  exactLegIdentitySplitGroups: 0,
  resolvedThenQuarantinedExactLegGroups: 0,
  exactLegProvisionalKeyDriftGroups: 0,
  lateAircraftEnrichmentPhysicalIds: 1,
};

describe("Phase2G live scientific-health classification", () => {
  it("accepts healthy v2 observations while exposing ambiguity diagnostically", () => {
    const health = classifyPhase2gScientificHealthV39({
      sessionId: "00000000-0000-4000-8000-000000000001",
      metricContractVersion: "v39-physical-flight-instance-v2",
      counts: baseCounts,
      observedAtUtc: "2026-09-28T11:30:00.000Z",
    });

    expect(health.status).toBe("PASS_WITH_AMBIGUITY");
    expect(health.hard_violations).toEqual([]);
    expect(health.counts.providerFlightIdMissingRows).toBe(12);
    expect(health.outcome_metric_used_for_stop).toBe(false);
  });

  it("does not turn poor yield or ambiguity into an outcome-driven hard stop", () => {
    const health = classifyPhase2gScientificHealthV39({
      sessionId: "00000000-0000-4000-8000-000000000002",
      metricContractVersion: "v39-physical-flight-instance-v2",
      counts: {
        ...baseCounts,
        resolvedRows: 0,
        resolvedOperatorRows: 0,
        resolvedPhysicalIds: 0,
        quarantinedRows: 12,
        quarantinedOperatorRows: 8,
        ambiguousCodeshareRows: 4,
      },
    });

    expect(health.status).toBe("PASS_WITH_AMBIGUITY");
    expect(health.hard_violations).toEqual([]);
    expect(health.outcome_metric_used_for_stop).toBe(false);
  });

  it("fails closed when the live probe is not using the physical-v2 metric contract", () => {
    const health = classifyPhase2gScientificHealthV39({
      sessionId: "00000000-0000-4000-8000-000000000003",
      metricContractVersion: "v39-physical-flight-instance-v1",
      counts: baseCounts,
    });

    expect(health.status).toBe("CONTRACT_VIOLATION");
    expect(health.hard_violations).toContain("metric_contract_mismatch");
  });

  it("detects the P2G13 resolved-then-quarantined exact-leg regression", () => {
    const health = classifyPhase2gScientificHealthV39({
      sessionId: "00000000-0000-4000-8000-000000000004",
      metricContractVersion: "v39-physical-flight-instance-v2",
      counts: {
        ...baseCounts,
        mixedResolutionExactLegGroups: 1,
        resolvedThenQuarantinedExactLegGroups: 1,
      },
    });

    expect(health.status).toBe("CONTRACT_VIOLATION");
    expect(health.hard_violations).toContain(
      "resolved_then_quarantined_exact_leg",
    );
  });

  it("detects one exact scheduled leg splitting into multiple physical IDs", () => {
    const health = classifyPhase2gScientificHealthV39({
      sessionId: "00000000-0000-4000-8000-000000000005",
      metricContractVersion: "v39-physical-flight-instance-v2",
      counts: {
        ...baseCounts,
        exactLegIdentitySplitGroups: 1,
      },
    });

    expect(health.hard_violations).toContain("exact_leg_identity_split");
  });

  it("detects exact-leg provisional identity drift", () => {
    const health = classifyPhase2gScientificHealthV39({
      sessionId: "00000000-0000-4000-8000-000000000006",
      metricContractVersion: "v39-physical-flight-instance-v2",
      counts: {
        ...baseCounts,
        exactLegProvisionalKeyDriftGroups: 1,
      },
    });

    expect(health.hard_violations).toContain(
      "exact_leg_provisional_key_drift",
    );
  });

  it("detects impossible row-level identity shapes", () => {
    const health = classifyPhase2gScientificHealthV39({
      sessionId: "00000000-0000-4000-8000-000000000007",
      metricContractVersion: "v39-physical-flight-instance-v2",
      counts: {
        ...baseCounts,
        resolvedRowsWithoutPhysicalId: 1,
        quarantinedRowsWithPhysicalId: 1,
        resolvedRowsNonOperator: 1,
      },
    });

    expect(health.hard_violations).toEqual(
      expect.arrayContaining([
        "resolved_row_missing_physical_id",
        "quarantined_row_has_physical_id",
        "resolved_row_nonoperator",
      ]),
    );
  });

  it("maps read-only aggregate SQL results into the health contract", async () => {
    const rows = [
      {
        total_item_rows: 20,
        provider_id_missing_rows: 20,
        callsign_missing_rows: 5,
        aircraft_reg_present_rows: 13,
        resolved_rows: 16,
        quarantined_rows: 4,
        resolved_operator_rows: 16,
        quarantined_operator_rows: 2,
        marketing_rows: 1,
        ambiguous_codeshare_rows: 1,
        resolved_physical_ids: 14,
        provisional_identity_keys: 16,
        resolved_rows_without_physical_id: 0,
        quarantined_rows_with_physical_id: 0,
        resolved_rows_nonoperator: 0,
      },
      {
        eligible_rows: 18,
        exact_leg_groups: 14,
        repeated_exact_leg_groups: 4,
        mixed_resolution_groups: 0,
        identity_split_groups: 0,
        resolved_then_quarantined_groups: 0,
        provisional_key_drift_groups: 0,
      },
      {
        late_aircraft_enrichment_physical_ids: 3,
      },
    ];
    let queryIndex = 0;
    const client = {
      query: async () => ({
        rows: [rows[queryIndex++]],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      }),
    };

    const health = await readPhase2gScientificHealthV39(client as any, {
      sessionId: "00000000-0000-4000-8000-000000000008",
      metricContractVersion: "v39-physical-flight-instance-v2",
      windowStartUtc:
        new Date("2026-09-28T10:00:00.000Z"),
      windowEndUtc:
        new Date("2026-09-28T12:00:00.000Z"),
      observedAtUtc: "2026-09-28T12:00:00.000Z",
    });

    expect(queryIndex).toBe(3);
    expect(health.status).toBe("PASS_WITH_AMBIGUITY");
    expect(health.counts.totalItemRows).toBe(20);
    expect(health.counts.resolvedPhysicalIds).toBe(14);
    expect(health.counts.lateAircraftEnrichmentPhysicalIds).toBe(3);
    expect(health.hard_violations).toEqual([]);
  });
});
