import type { QueryResult } from "pg";
import {
  PREPAID_PROBE_METRIC_CONTRACT_V39,
} from "./prepaidProbeMetricContract_v39";

export interface Phase2gScientificQueryClientV39 {
  query(text: string, values?: unknown[]): Promise<QueryResult<any>>;
}

export type Phase2gScientificHealthStatusV39 =
  | "WARMING_UP"
  | "PASS"
  | "PASS_WITH_AMBIGUITY"
  | "CONTRACT_VIOLATION";

export interface Phase2gScientificHealthCountsV39 {
  totalItemRows: number;
  providerFlightIdMissingRows: number;
  callsignMissingRows: number;
  aircraftRegPresentRows: number;
  resolvedRows: number;
  quarantinedRows: number;
  resolvedOperatorRows: number;
  quarantinedOperatorRows: number;
  marketingRows: number;
  ambiguousCodeshareRows: number;
  resolvedPhysicalIds: number;
  provisionalIdentityKeys: number;
  resolvedRowsWithoutPhysicalId: number;
  quarantinedRowsWithPhysicalId: number;
  resolvedRowsNonOperator: number;
  exactLegEligibleRows: number;
  exactLegGroups: number;
  repeatedExactLegGroups: number;
  mixedResolutionExactLegGroups: number;
  exactLegIdentitySplitGroups: number;
  resolvedThenQuarantinedExactLegGroups: number;
  exactLegProvisionalKeyDriftGroups: number;
  lateAircraftEnrichmentPhysicalIds: number;
}

export interface Phase2gScientificHealthV39 {
  schema: "v39.phase2g-scientific-health.v1";
  observed_at_utc: string;
  session_id: string;
  metric_contract_version: string | null;
  expected_metric_contract_version: string;
  status: Phase2gScientificHealthStatusV39;
  hard_violations: string[];
  counts: Phase2gScientificHealthCountsV39;
  provider_call: false;
  provider_mutation: false;
  database_mutation: false;
  outcome_metric_used_for_stop: false;
}

const ZERO_COUNTS: Phase2gScientificHealthCountsV39 = {
  totalItemRows: 0,
  providerFlightIdMissingRows: 0,
  callsignMissingRows: 0,
  aircraftRegPresentRows: 0,
  resolvedRows: 0,
  quarantinedRows: 0,
  resolvedOperatorRows: 0,
  quarantinedOperatorRows: 0,
  marketingRows: 0,
  ambiguousCodeshareRows: 0,
  resolvedPhysicalIds: 0,
  provisionalIdentityKeys: 0,
  resolvedRowsWithoutPhysicalId: 0,
  quarantinedRowsWithPhysicalId: 0,
  resolvedRowsNonOperator: 0,
  exactLegEligibleRows: 0,
  exactLegGroups: 0,
  repeatedExactLegGroups: 0,
  mixedResolutionExactLegGroups: 0,
  exactLegIdentitySplitGroups: 0,
  resolvedThenQuarantinedExactLegGroups: 0,
  exactLegProvisionalKeyDriftGroups: 0,
  lateAircraftEnrichmentPhysicalIds: 0,
};

function finiteInt(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

export function classifyPhase2gScientificHealthV39(input: {
  sessionId: string;
  metricContractVersion: string | null;
  counts: Phase2gScientificHealthCountsV39;
  observedAtUtc?: string;
}): Phase2gScientificHealthV39 {
  const violations: string[] = [];
  const counts = input.counts;

  if (input.metricContractVersion !== PREPAID_PROBE_METRIC_CONTRACT_V39) {
    violations.push("metric_contract_mismatch");
  }
  if (counts.resolvedRowsWithoutPhysicalId > 0) {
    violations.push("resolved_row_missing_physical_id");
  }
  if (counts.quarantinedRowsWithPhysicalId > 0) {
    violations.push("quarantined_row_has_physical_id");
  }
  if (counts.resolvedRowsNonOperator > 0) {
    violations.push("resolved_row_nonoperator");
  }
  if (counts.exactLegIdentitySplitGroups > 0) {
    violations.push("exact_leg_identity_split");
  }
  if (counts.resolvedThenQuarantinedExactLegGroups > 0) {
    violations.push("resolved_then_quarantined_exact_leg");
  }
  if (counts.exactLegProvisionalKeyDriftGroups > 0) {
    violations.push("exact_leg_provisional_key_drift");
  }

  let status: Phase2gScientificHealthStatusV39;
  if (violations.length > 0) {
    status = "CONTRACT_VIOLATION";
  } else if (counts.totalItemRows === 0) {
    status = "WARMING_UP";
  } else if (
    counts.quarantinedOperatorRows > 0 ||
    counts.ambiguousCodeshareRows > 0
  ) {
    status = "PASS_WITH_AMBIGUITY";
  } else {
    status = "PASS";
  }

  return {
    schema: "v39.phase2g-scientific-health.v1",
    observed_at_utc: input.observedAtUtc ?? new Date().toISOString(),
    session_id: input.sessionId,
    metric_contract_version: input.metricContractVersion,
    expected_metric_contract_version: PREPAID_PROBE_METRIC_CONTRACT_V39,
    status,
    hard_violations: violations,
    counts,
    provider_call: false,
    provider_mutation: false,
    database_mutation: false,
    outcome_metric_used_for_stop: false,
  };
}

export async function readPhase2gScientificHealthV39(
  client: Phase2gScientificQueryClientV39,
  input: {
    sessionId: string;
    metricContractVersion: string | null;
    observedAtUtc?: string;
  },
): Promise<Phase2gScientificHealthV39> {
  const summary = await client.query(
    `SELECT
       count(*)::int AS total_item_rows,
       count(*) FILTER (WHERE provider_flight_id IS NULL)::int AS provider_id_missing_rows,
       count(*) FILTER (WHERE callsign IS NULL)::int AS callsign_missing_rows,
       count(*) FILTER (WHERE aircraft_reg IS NOT NULL)::int AS aircraft_reg_present_rows,
       count(*) FILTER (WHERE identity_resolution_status='resolved')::int AS resolved_rows,
       count(*) FILTER (WHERE identity_resolution_status='quarantined')::int AS quarantined_rows,
       count(*) FILTER (
         WHERE identity_resolution_status='resolved'
           AND codeshare_resolution_status='resolved_operator'
       )::int AS resolved_operator_rows,
       count(*) FILTER (
         WHERE identity_resolution_status='quarantined'
           AND codeshare_resolution_status='resolved_operator'
       )::int AS quarantined_operator_rows,
       count(*) FILTER (
         WHERE codeshare_resolution_status='resolved_marketing'
       )::int AS marketing_rows,
       count(*) FILTER (
         WHERE codeshare_resolution_status='ambiguous_unknown'
       )::int AS ambiguous_codeshare_rows,
       count(DISTINCT flight_instance_id) FILTER (
         WHERE identity_resolution_status='resolved'
           AND codeshare_resolution_status='resolved_operator'
           AND flight_instance_id IS NOT NULL
       )::int AS resolved_physical_ids,
       count(DISTINCT provisional_identity_key) FILTER (
         WHERE provisional_identity_key IS NOT NULL
       )::int AS provisional_identity_keys,
       count(*) FILTER (
         WHERE identity_resolution_status='resolved'
           AND flight_instance_id IS NULL
       )::int AS resolved_rows_without_physical_id,
       count(*) FILTER (
         WHERE identity_resolution_status='quarantined'
           AND flight_instance_id IS NOT NULL
       )::int AS quarantined_rows_with_physical_id,
       count(*) FILTER (
         WHERE identity_resolution_status='resolved'
           AND codeshare_resolution_status IS DISTINCT FROM 'resolved_operator'
       )::int AS resolved_rows_nonoperator
     FROM clean.prepaid_probe_item_runtime
     WHERE session_id=$1::uuid`,
    [input.sessionId],
  );

  const exact = await client.query(
    `WITH eligible AS (
       SELECT
         operating_carrier,
         operating_flight_number,
         origin_icao,
         destination_icao,
         initial_service_date,
         scheduled_gate_out_utc,
         received_at_utc,
         identity_resolution_status,
         flight_instance_id,
         provisional_identity_key
       FROM clean.prepaid_probe_item_runtime
       WHERE session_id=$1::uuid
         AND codeshare_resolution_status='resolved_operator'
         AND operating_carrier IS NOT NULL
         AND operating_flight_number IS NOT NULL
         AND origin_icao IS NOT NULL
         AND destination_icao IS NOT NULL
         AND initial_service_date IS NOT NULL
         AND scheduled_gate_out_utc IS NOT NULL
     ),
     grouped AS (
       SELECT
         operating_carrier,
         operating_flight_number,
         origin_icao,
         destination_icao,
         initial_service_date,
         scheduled_gate_out_utc,
         count(*)::int AS row_count,
         count(DISTINCT flight_instance_id) FILTER (
           WHERE flight_instance_id IS NOT NULL
         )::int AS physical_id_count,
         count(DISTINCT provisional_identity_key) FILTER (
           WHERE provisional_identity_key IS NOT NULL
         )::int AS provisional_key_count,
         min(received_at_utc) FILTER (
           WHERE identity_resolution_status='resolved'
         ) AS first_resolved_at,
         max(received_at_utc) FILTER (
           WHERE identity_resolution_status='quarantined'
         ) AS last_quarantined_at,
         bool_or(identity_resolution_status='resolved') AS has_resolved,
         bool_or(identity_resolution_status='quarantined') AS has_quarantined
       FROM eligible
       GROUP BY
         operating_carrier,
         operating_flight_number,
         origin_icao,
         destination_icao,
         initial_service_date,
         scheduled_gate_out_utc
     )
     SELECT
       (SELECT count(*) FROM eligible)::int AS eligible_rows,
       count(*)::int AS exact_leg_groups,
       count(*) FILTER (WHERE row_count > 1)::int AS repeated_exact_leg_groups,
       count(*) FILTER (
         WHERE has_resolved AND has_quarantined
       )::int AS mixed_resolution_groups,
       count(*) FILTER (
         WHERE physical_id_count > 1
       )::int AS identity_split_groups,
       count(*) FILTER (
         WHERE first_resolved_at IS NOT NULL
           AND last_quarantined_at IS NOT NULL
           AND last_quarantined_at > first_resolved_at
       )::int AS resolved_then_quarantined_groups,
       count(*) FILTER (
         WHERE provisional_key_count > 1
       )::int AS provisional_key_drift_groups
     FROM grouped`,
    [input.sessionId],
  );

  const enrichment = await client.query(
    `WITH physical AS (
       SELECT
         flight_instance_id,
         bool_or(aircraft_reg IS NULL) AS saw_missing_aircraft,
         bool_or(aircraft_reg IS NOT NULL) AS saw_present_aircraft
       FROM clean.prepaid_probe_item_runtime
       WHERE session_id=$1::uuid
         AND identity_resolution_status='resolved'
         AND codeshare_resolution_status='resolved_operator'
         AND flight_instance_id IS NOT NULL
       GROUP BY flight_instance_id
     )
     SELECT count(*) FILTER (
       WHERE saw_missing_aircraft AND saw_present_aircraft
     )::int AS late_aircraft_enrichment_physical_ids
     FROM physical`,
    [input.sessionId],
  );

  const s = summary.rows[0] ?? {};
  const e = exact.rows[0] ?? {};
  const a = enrichment.rows[0] ?? {};
  const counts: Phase2gScientificHealthCountsV39 = {
    ...ZERO_COUNTS,
    totalItemRows: finiteInt(s.total_item_rows),
    providerFlightIdMissingRows: finiteInt(s.provider_id_missing_rows),
    callsignMissingRows: finiteInt(s.callsign_missing_rows),
    aircraftRegPresentRows: finiteInt(s.aircraft_reg_present_rows),
    resolvedRows: finiteInt(s.resolved_rows),
    quarantinedRows: finiteInt(s.quarantined_rows),
    resolvedOperatorRows: finiteInt(s.resolved_operator_rows),
    quarantinedOperatorRows: finiteInt(s.quarantined_operator_rows),
    marketingRows: finiteInt(s.marketing_rows),
    ambiguousCodeshareRows: finiteInt(s.ambiguous_codeshare_rows),
    resolvedPhysicalIds: finiteInt(s.resolved_physical_ids),
    provisionalIdentityKeys: finiteInt(s.provisional_identity_keys),
    resolvedRowsWithoutPhysicalId: finiteInt(s.resolved_rows_without_physical_id),
    quarantinedRowsWithPhysicalId: finiteInt(s.quarantined_rows_with_physical_id),
    resolvedRowsNonOperator: finiteInt(s.resolved_rows_nonoperator),
    exactLegEligibleRows: finiteInt(e.eligible_rows),
    exactLegGroups: finiteInt(e.exact_leg_groups),
    repeatedExactLegGroups: finiteInt(e.repeated_exact_leg_groups),
    mixedResolutionExactLegGroups: finiteInt(e.mixed_resolution_groups),
    exactLegIdentitySplitGroups: finiteInt(e.identity_split_groups),
    resolvedThenQuarantinedExactLegGroups: finiteInt(e.resolved_then_quarantined_groups),
    exactLegProvisionalKeyDriftGroups: finiteInt(e.provisional_key_drift_groups),
    lateAircraftEnrichmentPhysicalIds: finiteInt(a.late_aircraft_enrichment_physical_ids),
  };

  return classifyPhase2gScientificHealthV39({
    sessionId: input.sessionId,
    metricContractVersion: input.metricContractVersion,
    counts,
    observedAtUtc: input.observedAtUtc,
  });
}
