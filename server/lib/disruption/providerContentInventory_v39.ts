import type { HardRetentionClass } from "./retentionDeployment_v39";

export type ProviderContentDisposition =
  | "expiry-covered"
  | "derived-work-proof-required"
  | "classification-required";

export interface ProviderContentColumnGroup {
  id: string;
  table: string;
  columns: readonly string[];
  retentionClass: HardRetentionClass | "derived_work_candidate";
  disposition: ProviderContentDisposition;
  owner: string;
  note: string;
}

/**
 * Column-scope inventory for AeroDataBox-bearing data.
 *
 * Conservative rules:
 * - copying, flattening, cleaning, sorting, joining or renaming a provider value
 *   does NOT make it a Derived Work;
 * - a hash/encoded project ID is not assumed safe merely because plaintext is
 *   absent; non-reconstructability must be demonstrated for the actual domain;
 * - mixed tables remain raw/provider-bearing at table level until the copied
 *   provider columns are expired or the exact retained output qualifies for a
 *   separately proven Derived-Work class;
 * - nonexistent/logical tables are forbidden from this inventory.
 */
export const PROVIDER_CONTENT_COLUMN_GROUPS: readonly ProviderContentColumnGroup[] = Object.freeze([
  {
    id: "raw-delivery-envelope",
    table: "clean.raw_delivery",
    columns: ["raw_body", "http_request_headers", "http_response_body", "http_path", "error_message"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Raw HTTP/provider envelope is nulled under the raw clock and protected by one-way expiry guards.",
  },
  {
    id: "raw-delivery-extracted-provider-facts",
    table: "clean.raw_delivery",
    columns: [
      "subscription_id", "provider_published_utc", "adb_delivery_id", "adb_cost_credits",
      "notification_id", "provider_notification_generated_utc", "delivery_attempt_seq_no",
      "delivery_attempt_utc", "delivery_attempt_cost_credits",
    ],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Provider subscription/delivery/notification/attempt/cost facts are cleared with the raw envelope rather than retained as indefinite audit metadata.",
  },
  {
    id: "raw-delivery-item",
    table: "clean.raw_delivery_item",
    columns: ["raw_item"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Raw webhook item body is nulled under the raw clock.",
  },
  {
    id: "raw-delivery-item-extracted-provider-facts",
    table: "clean.raw_delivery_item",
    columns: [
      "flight_number", "carrier_iata", "carrier_icao", "status", "status_code",
      "last_updated_utc", "departure_scheduled_utc", "arrival_scheduled_utc",
    ],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Indexable copies extracted from raw_item are cleared together with raw_item.",
  },
  {
    id: "processing-attempt-provider-bearing-errors",
    table: "clean.processing_attempt",
    columns: ["validation_errors", "parse_errors", "storage_errors", "error_message"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Potential payload/provider fragments in parser/storage diagnostics are cleared; non-content counters/timing remain project audit metadata.",
  },
  {
    id: "ingest-envelope-provider-scope",
    table: "clean.adb_ingest_events",
    columns: ["raw_payload", "http_metadata", "error", "provider_published_utc", "subscription_id", "credits_remaining"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Raw envelope plus provider publication/subscription/account-balance values are cleared under migration 0050; project batch/count metadata remains.",
  },
  {
    id: "webhook-flight-identity-provider-values",
    table: "clean.webhook_flight_identity",
    columns: [
      "provider_identity_alias", "provider_flight_id", "provider_record_key", "callsign",
      "operating_carrier", "operating_flight_number", "origin_icao", "original_destination_icao",
      "initial_service_date", "initial_scheduled_gate_out_utc",
    ],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Alias/source identity and initial schedule facts are direct or reversible provider-derived values.",
  },
  {
    id: "canonical-flight-instance-id-encoding",
    table: "clean.webhook_flight_identity",
    columns: ["flight_instance_id"],
    retentionClass: "derived_work_candidate",
    disposition: "derived-work-proof-required",
    owner: "UNVERIFIED",
    note: "Current flight_instance_id is leg:<8 hex chars>, a 32-bit SHA-256 prefix of a structured leg identity. It is project-generated but must not be called non-reconstructable without a domain/inversion analysis; the same ID propagates downstream.",
  },
  {
    id: "webhook-schedule-version-provider-values",
    table: "clean.webhook_flight_schedule_version",
    columns: ["observed_scheduled_gate_out_utc", "current_service_date", "provider_identity_alias", "provider_record_key", "callsign"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Append-only schedule-version rows contain copied schedule/identity evidence and require a bounded expiry owner or another valid classification.",
  },
  {
    id: "webhook-resolution-provider-derived-values",
    table: "clean.webhook_identity_resolution",
    columns: ["flight_instance_id", "initial_service_date"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Resolution status/reason/hash can be project audit metadata, but the propagated encoded leg ID and copied initial service date remain unresolved.",
  },
  {
    id: "prepost-provider-row",
    table: "clean.flight_data_pre_post",
    columns: ["*entire-provider-bearing-row*"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Migration 0010 flattened the webhook. The owner tombstones then hard-deletes the stale convenience row instead of treating normalization as a Derived Work.",
  },
  {
    id: "fids-response-payload",
    table: "clean.fids_query_response",
    columns: ["raw_payload"],
    retentionClass: "live_fids_cache",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Raw FIDS response payload is on the independent FIDS clock (24h maximum under owner-provided account evidence).",
  },
  {
    id: "fids-population-provider-values",
    table: "clean.flight_population",
    columns: [
      "flight_number", "carrier_iata", "carrier_icao", "call_sign", "dep_airport_icao", "dep_airport_iata",
      "arr_airport_icao", "arr_airport_iata", "dep_scheduled_utc", "arr_scheduled_utc", "provider_record_key",
      "coverage_state", "from_local", "to_local", "airport_iana_timezone", "scope_classification",
      "codeshare_resolution_status", "fids_retrieval_utc", "provider_api_version",
    ],
    retentionClass: "live_fids_cache",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Provider-observable FIDS/schedule values are copied outside raw_payload and cannot inherit a longer lifetime merely by being normalized.",
  },
  {
    id: "semantic-event-copied-provider-values",
    table: "clean.flight_events",
    columns: [
      "subscription_id", "flight_number", "carrier_iata", "carrier_icao", "call_sign", "aircraft_reg", "aircraft_mode_s", "aircraft_model",
      "event_timestamp", "provider_published_utc", "status", "scheduled_gate_out", "actual_gate_out", "scheduled_wheels_off", "actual_wheels_off",
      "scheduled_wheels_on", "actual_wheels_on", "scheduled_gate_in", "actual_gate_in", "loc_lat", "loc_lon", "loc_altitude_ft", "loc_pressure_altitude_ft",
      "loc_pressure_hpa", "loc_ground_speed_kt", "loc_true_track_deg", "loc_vsi_fpm", "loc_reported_utc", "eta_provider",
    ],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Event log mixes project ETL/provenance with copied provider facts; copied values remain provider Contents.",
  },
  {
    id: "raw-airborne-observations",
    table: "clean.raw_airborne_events",
    columns: [
      "subscription_id", "flight_number", "carrier_iata", "carrier_icao", "call_sign", "aircraft_reg", "aircraft_mode_s", "aircraft_model", "icao24",
      "event_timestamp", "loc_reported_utc", "provider_published_utc", "scheduled_gate_out", "actual_gate_out", "scheduled_wheels_off", "actual_wheels_off",
      "scheduled_wheels_on", "actual_wheels_on", "scheduled_gate_in", "actual_gate_in", "latitude", "longitude", "altitude_ft", "pressure_altitude_ft", "pressure_hpa",
      "ground_speed_kt", "true_track_deg", "vsi_fpm", "on_ground", "flight_phase", "eta_provider",
    ],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Migration 0020 explicitly defines this as raw per-observation provider data.",
  },
  {
    id: "clean-airborne-copied-values",
    table: "clean.clean_airborne_points",
    columns: ["event_timestamp", "provider_published_utc", "latitude", "longitude", "altitude_ft", "ground_speed_kt", "true_track_deg", "vsi_fpm", "on_ground", "flight_phase"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Removing impossible points/sorting does not make the surviving exact source values non-reconstructable.",
  },
  {
    id: "trajectory-mixed-provider-values",
    table: "clean.flight_trajectory",
    columns: ["flight_instance_id", "flight_number", "carrier_iata", "first_point_utc", "last_point_utc", "actual_wheels_off", "actual_wheels_on"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Trajectory aggregates may qualify separately later, but copied identity/milestones and the proof-required encoded leg ID remain mixed in the table.",
  },
  {
    id: "airborne-snapshot-copied-values",
    table: "clean.flight_airborne_snapshots",
    columns: [
      "flight_instance_id", "flight_number", "carrier_iata", "airline", "aircraft_type", "callsign", "icao24", "registration", "event_timestamp", "provider_published_utc",
      "origin", "destination", "current_operational_destination", "scheduled_departure", "scheduled_arrival", "scheduled_gate_out", "actual_gate_out",
      "scheduled_wheels_off", "actual_wheels_off", "scheduled_wheels_on", "actual_wheels_on", "scheduled_gate_in", "actual_gate_in", "latitude", "longitude",
      "altitude", "ground_speed", "heading", "vertical_rate", "on_ground", "flight_phase", "eta_provider",
    ],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Prediction snapshot contains exact copied provider state in addition to derived/project fields.",
  },
  {
    id: "collection-batch-provider-account-values",
    table: "clean.adb_collection_batches",
    columns: ["balance_before", "balance_after", "credits_consumed_actual"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Provider balance observations originate from the provider/account API and cannot be called indefinite project metadata without a separate basis or expiry owner.",
  },
  {
    id: "anchor-probe-provider-account-values",
    table: "clean.adb_anchor_probe",
    columns: ["subscription_id", "balance_before", "balance_after"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Probe metrics are project analytics, but provider subscription identity and provider balance readings are mixed into the same row.",
  },
  {
    id: "pre-snapshot-feature-vector",
    table: "clean.flight_snapshots",
    columns: ["flight_instance_id", "schedule_version", "features_json", "provenance_json"],
    retentionClass: "derived_work_candidate",
    disposition: "derived-work-proof-required",
    owner: "UNVERIFIED",
    note: "365-day treatment is permitted only after the exact feature/provenance representation, encoded IDs and schedule-version values are shown non-trivial and non-reconstructable.",
  },
  {
    id: "outcome-evidence",
    table: "clean.flight_outcomes",
    columns: ["flight_instance_id", "flight_operational_state", "reference_arrival_utc", "evidence_json"],
    retentionClass: "derived_work_candidate",
    disposition: "derived-work-proof-required",
    owner: "UNVERIFIED",
    note: "Label values may be derived, but identity/reference/evidence fields must be audited for copied or invertibly encoded provider values before 365-day retention.",
  },
]);

export interface ProviderContentInventoryVerdict {
  pass: boolean;
  failures: string[];
  coveredGroupCount: number;
  unresolvedGroupCount: number;
}

export function verifyProviderContentInventory(
  groups: readonly ProviderContentColumnGroup[] = PROVIDER_CONTENT_COLUMN_GROUPS,
): ProviderContentInventoryVerdict {
  const failures: string[] = [];
  const ids = new Set<string>();
  let coveredGroupCount = 0;
  let unresolvedGroupCount = 0;

  for (const group of groups) {
    if (!group.id || ids.has(group.id)) failures.push(`inventory-id-invalid-or-duplicate:${group.id}`);
    ids.add(group.id);
    if (!group.table.startsWith("clean.")) failures.push(`inventory-table-invalid:${group.id}`);
    if (!group.columns.length) failures.push(`inventory-columns-empty:${group.id}`);
    if (group.disposition === "expiry-covered") {
      coveredGroupCount += 1;
      if (group.owner === "UNVERIFIED") failures.push(`covered-without-owner:${group.id}`);
      if (group.retentionClass === "derived_work_candidate") failures.push(`derived-marked-expiry-covered:${group.id}`);
    } else {
      unresolvedGroupCount += 1;
      failures.push(`${group.disposition}:${group.id}`);
    }
  }

  return {
    pass: failures.length === 0,
    failures: [...new Set(failures)].sort(),
    coveredGroupCount,
    unresolvedGroupCount,
  };
}
