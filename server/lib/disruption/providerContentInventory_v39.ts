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
 * Rules:
 * - copying, flattening, cleaning, sorting, joining or renaming a provider value
 *   does NOT make it a Derived Work;
 * - hashes/project run IDs may be retained as project metadata only when they do
 *   not themselves embed recoverable provider plaintext;
 * - a whole mixed table is never declared a Derived Work merely because some
 *   columns are computed;
 * - a group remains BLOCKED until copied source values are expired under the
 *   applicable hard clock or the exact retained output is proven to satisfy the
 *   non-trivial/non-reconstructable Derived-Work basis.
 */
export const PROVIDER_CONTENT_COLUMN_GROUPS: readonly ProviderContentColumnGroup[] = Object.freeze([
  // -------------------------------------------------------------------------
  // HTTP/webhook ingress
  // -------------------------------------------------------------------------
  {
    id: "raw-delivery-envelope",
    table: "clean.raw_delivery",
    columns: ["raw_body", "http_request_headers", "http_response_body", "http_path", "error_message"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Migration 0048/0050 + expiry owner null these content-bearing envelope fields and retain hashes/tombstones.",
  },
  {
    id: "raw-delivery-extracted-provider-facts",
    table: "clean.raw_delivery",
    columns: ["subscription_id", "provider_published_utc", "adb_delivery_id", "adb_cost_credits"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Migration 0050 adds a one-way full-scope expiry marker; the expiry owner clears these fields under the raw clock.",
  },
  {
    id: "raw-delivery-item",
    table: "clean.raw_delivery_item",
    columns: ["raw_item"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Raw webhook flight item body.",
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
    note: "Migration 0050 + expiry owner clear the extracted provider copies together with raw_item under the raw clock.",
  },
  {
    id: "processing-attempt-provider-bearing-errors",
    table: "clean.processing_attempt",
    columns: ["validation_errors", "parse_errors", "storage_errors", "error_message"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Migration 0050 + expiry owner clear provider-bearing parse/storage error details under the raw clock while retaining parser/count/timing audit metadata.",
  },
  {
    id: "ingest-envelope-obvious-content",
    table: "clean.adb_ingest_events",
    columns: ["raw_payload", "http_metadata", "error"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Obvious raw/provider-bearing envelope fields are covered by the expiry owner.",
  },
  {
    id: "ingest-envelope-flattened-provider-facts",
    table: "clean.adb_ingest_events",
    columns: ["provider_published_utc"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Migration 0050 + expiry owner clear the copied provider publication timestamp with the rest of the ingest provider scope.",
  },

  // -------------------------------------------------------------------------
  // Canonical webhook identity and schedule evidence
  // -------------------------------------------------------------------------
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
    note: "Canonical flight_instance_id is project linkage, but this table also retains source identifiers/schedule facts and aliases that encode them.",
  },
  {
    id: "webhook-schedule-version-provider-values",
    table: "clean.webhook_flight_schedule_version",
    columns: [
      "observed_scheduled_gate_out_utc", "current_service_date", "provider_identity_alias",
      "provider_record_key", "callsign",
    ],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Append-only schedule-version evidence is still copied provider schedule/identity content.",
  },
  {
    id: "webhook-resolution-copied-service-date",
    table: "clean.webhook_identity_resolution",
    columns: ["initial_service_date"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Resolution status/hash/project flight_instance_id are audit metadata, but retained initial_service_date is copied source timing data.",
  },

  // -------------------------------------------------------------------------
  // Flattened/latest-state webhook table
  // -------------------------------------------------------------------------
  {
    id: "prepost-raw-json",
    table: "clean.flight_data_pre_post",
    columns: ["payload_json", "subscription_notices"],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "The compatibility/latest-state row is tombstoned and hard-deleted as a whole after the raw TTL, covering these fields and all flattened copies together.",
  },
  {
    id: "prepost-flattened-webhook-fields",
    table: "clean.flight_data_pre_post",
    columns: [
      "flight_number", "carrier_iata", "carrier_icao", "carrier_name", "call_sign", "is_cargo", "status", "status_code", "codeshare_status",
      "notification_summary", "notification_remark", "last_updated_utc",
      "gcd_m", "gcd_km", "gcd_mile", "gcd_nm", "gcd_ft",
      "dep_airport_icao", "dep_airport_iata", "dep_airport_local_code", "dep_airport_name", "dep_airport_short_name", "dep_airport_municipality", "dep_airport_country_code", "dep_airport_lat", "dep_airport_lon", "dep_airport_timezone",
      "dep_scheduled_utc", "dep_scheduled_local", "dep_revised_utc", "dep_predicted_utc", "dep_runway_utc", "dep_terminal", "dep_checkin_desk", "dep_gate", "dep_baggage_belt", "dep_runway", "dep_quality",
      "arr_airport_icao", "arr_airport_iata", "arr_airport_local_code", "arr_airport_name", "arr_airport_short_name", "arr_airport_municipality", "arr_airport_country_code", "arr_airport_lat", "arr_airport_lon", "arr_airport_timezone",
      "arr_scheduled_utc", "arr_scheduled_local", "arr_revised_utc", "arr_predicted_utc", "arr_runway_utc", "arr_terminal", "arr_gate", "arr_baggage_belt", "arr_runway", "arr_quality",
      "flight_plan_flight_rules", "flight_plan_flight_type", "flight_plan_revision_no", "flight_plan_status", "flight_plan_route", "fp_alt_requested_ft", "fp_alt_assigned_ft", "fp_airspeed_requested_kt", "fp_airspeed_assigned_kt", "flight_plan_last_updated_utc",
      "aircraft_reg", "aircraft_mode_s", "aircraft_model", "aircraft_image_url", "aircraft_image_web_url", "aircraft_image_author", "aircraft_image_title", "aircraft_image_description", "aircraft_image_license",
      "loc_lat", "loc_lon", "loc_altitude_ft", "loc_pressure_altitude_ft", "loc_pressure_hpa", "loc_ground_speed_kt", "loc_true_track_deg", "loc_vsi_fpm", "loc_reported_utc",
      "subscription_id", "subscription_is_active", "subscription_billing_type", "subscription_activate_before_utc", "subscription_expires_on_utc", "subscription_created_on_utc", "subject_type", "subject_id", "subscriber_type", "subscriber_id",
      "credits_remaining", "balance_last_refilled_utc", "balance_last_deducted_utc",
    ],
    retentionClass: "raw_provider_content",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Migration 0010 explicitly flattened every webhook field; the audited retention owner therefore hard-deletes the entire stale convenience row instead of misclassifying the copies as Derived Works.",
  },

  // -------------------------------------------------------------------------
  // FIDS population layer
  // -------------------------------------------------------------------------
  {
    id: "fids-response-payload",
    table: "clean.fids_query_response",
    columns: ["raw_payload"],
    retentionClass: "live_fids_cache",
    disposition: "expiry-covered",
    owner: "retentionExpiry_v39",
    note: "Separate FIDS clock; current policy defaults to 24 hours and is independently bounded.",
  },
  {
    id: "fids-population-provider-values",
    table: "clean.flight_population",
    columns: [
      "flight_number", "carrier_iata", "carrier_icao", "call_sign", "dep_airport_icao", "dep_airport_iata", "arr_airport_icao", "arr_airport_iata",
      "dep_scheduled_utc", "arr_scheduled_utc", "provider_record_key", "coverage_state", "from_local", "to_local", "airport_iana_timezone",
      "scope_classification", "codeshare_resolution_status", "fids_retrieval_utc", "provider_api_version",
    ],
    retentionClass: "live_fids_cache",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "These are provider-observable FIDS/schedule values, not merely the raw JSON cache.",
  },

  // -------------------------------------------------------------------------
  // Semantic event / airborne pipeline
  // -------------------------------------------------------------------------
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
    id: "current-state-provider-values",
    table: "clean.flight_state",
    columns: ["*provider-derived-or-copied-columns*"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Current-state convenience layer requires an exact schema/column audit before it can be retained beyond raw limits.",
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
    note: "Migration 0020 explicitly defines this as raw per-observation provider data; it is not covered by the current expiry owner.",
  },
  {
    id: "clean-airborne-copied-values",
    table: "clean.clean_airborne_points",
    columns: ["event_timestamp", "provider_published_utc", "latitude", "longitude", "altitude_ft", "ground_speed_kt", "true_track_deg", "vsi_fpm", "on_ground", "flight_phase"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Cleaning impossible values and sorting does not by itself make copied observations non-reconstructable Derived Works.",
  },
  {
    id: "trajectory-mixed-provider-values",
    table: "clean.flight_trajectory",
    columns: ["flight_number", "carrier_iata", "first_point_utc", "last_point_utc", "actual_wheels_off", "actual_wheels_on"],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Aggregate trajectory statistics may later qualify separately, but copied identity/milestones remain source values.",
  },
  {
    id: "airborne-snapshot-copied-values",
    table: "clean.flight_airborne_snapshots",
    columns: [
      "flight_number", "carrier_iata", "airline", "aircraft_type", "callsign", "icao24", "registration", "event_timestamp", "provider_published_utc",
      "origin", "destination", "current_operational_destination", "scheduled_departure", "scheduled_arrival", "scheduled_gate_out", "actual_gate_out",
      "scheduled_wheels_off", "actual_wheels_off", "scheduled_wheels_on", "actual_wheels_on", "scheduled_gate_in", "actual_gate_in", "latitude", "longitude",
      "altitude", "ground_speed", "heading", "vertical_rate", "on_ground", "flight_phase", "eta_provider",
    ],
    retentionClass: "raw_provider_content",
    disposition: "classification-required",
    owner: "UNVERIFIED",
    note: "Prediction snapshot contains copied provider state in addition to derived/project fields.",
  },

  // -------------------------------------------------------------------------
  // Candidate retained Derived Works — must be proven, never assumed
  // -------------------------------------------------------------------------
  {
    id: "pre-snapshot-feature-vector",
    table: "clean.flight_snapshots",
    columns: ["features_json", "provenance_json"],
    retentionClass: "derived_work_candidate",
    disposition: "derived-work-proof-required",
    owner: "UNVERIFIED",
    note: "365-day treatment is permitted only after the exact feature/provenance output is shown non-trivial and non-reconstructable.",
  },
  {
    id: "outcome-evidence",
    table: "clean.flight_outcomes",
    columns: ["flight_operational_state", "reference_arrival_utc", "evidence_json"],
    retentionClass: "derived_work_candidate",
    disposition: "derived-work-proof-required",
    owner: "UNVERIFIED",
    note: "Label values may be derived, but evidence_json/reference fields must be audited for copied provider values before 365-day retention.",
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
