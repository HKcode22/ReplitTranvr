/**
 * Data dictionary — V3.9-f.9 §66 / Sep1_1 §66
 *
 * Exact alignment with the real schema. Every first-class table involved in
 * the data pipeline, with every column documented.
 *
 * Sep1_1 §66 corrections:
 *  - Bring into exact alignment with real schema
 *  - Document every first-class table
 *  - For each column: name, type, nullable, PK/FK, semantic meaning,
 *    producer, consumer, immutability, timestamp semantics, source
 *  - Do not document a table/column that does not exist as IMPLEMENTED
 */

export interface ColumnDoc {
  name: string;
  type: string;
  nullable: boolean;
  pk?: boolean;
  fk?: string;
  semanticMeaning: string;
  producer: string;
  consumer: string;
  immutability: "immutable" | "mutable" | "append-only";
  timestampSemantics?: string;
  source: string;
}

export interface TableDoc {
  schema: string;
  name: string;
  description: string;
  columns: ColumnDoc[];
  constraints: string[];
  indexes: string[];
  producer: string;
  consumer: string;
  immutability: "immutable" | "mutable" | "append-only";
}

// ---------------------------------------------------------------------------
// Core pipeline tables
// ---------------------------------------------------------------------------

export const DATA_DICTIONARY: TableDoc[] = [
  {
    schema: "clean",
    name: "raw_delivery",
    description: "HTTP delivery envelope — one row per webhook HTTP delivery. Immutable after persist.",
    columns: [
      { name: "id", type: "BIGSERIAL", nullable: false, pk: true, semanticMeaning: "Auto-increment primary key", producer: "rawIngress_v3.ts", consumer: "rawIngress_v3.ts", immutability: "immutable", source: "migration 0025" },
      { name: "delivery_id", type: "TEXT", nullable: false, semanticMeaning: "SHA-256(method|path|timestamp|body_hash) or provider delivery ID", producer: "rawIngress_v3.ts", consumer: "rawIngress_v3.ts", immutability: "immutable", source: "migration 0025" },
      { name: "subscription_id", type: "TEXT", nullable: true, semanticMeaning: "AeroDataBox subscription ID", producer: "rawIngress_v3.ts", consumer: "adb_ingest_events", immutability: "immutable", source: "migration 0025" },
      { name: "batch_id", type: "TEXT", nullable: true, semanticMeaning: "Collection batch ID", producer: "rawIngress_v3.ts", consumer: "batch queries", immutability: "immutable", source: "migration 0025" },
      { name: "raw_body", type: "JSONB", nullable: false, semanticMeaning: "Entire HTTP body", producer: "rawIngress_v3.ts", consumer: "audit/recovery", immutability: "immutable", source: "migration 0025" },
      { name: "raw_body_sha256", type: "TEXT", nullable: false, semanticMeaning: "SHA-256 of raw body for dedup/provenance", producer: "rawIngress_v3.ts", consumer: "dedup", immutability: "immutable", source: "migration 0025" },
      { name: "provider_published_utc", type: "TIMESTAMPTZ", nullable: true, semanticMeaning: "When provider generated the notification", producer: "rawIngress_v3.ts", consumer: "timestamp taxonomy", immutability: "immutable", timestampSemantics: "provider_published_utc", source: "migration 0025" },
      { name: "received_at_utc", type: "TIMESTAMPTZ", nullable: false, semanticMeaning: "When WE received the notification", producer: "rawIngress_v3.ts", consumer: "timestamp taxonomy", immutability: "immutable", timestampSemantics: "received_at_utc", source: "migration 0025" },
      { name: "processing_outcome", type: "TEXT", nullable: true, semanticMeaning: "success|partial|validation_error|db_error|timeout", producer: "rawIngress_v3.ts", consumer: "diagnostics", immutability: "mutable", timestampSemantics: "processed_at_utc", source: "migration 0025" },
      { name: "notification_items", type: "INTEGER", nullable: false, semanticMeaning: "Number of flight items in this delivery", producer: "rawIngress_v3.ts", consumer: "reconciliation", immutability: "mutable", source: "migration 0025" },
    ],
    constraints: ["UNIQUE (delivery_id)"],
    indexes: ["idx_rd_subscription (subscription_id, received_at_utc DESC)", "idx_rd_batch (batch_id, received_at_utc DESC)", "idx_rd_sha256 (raw_body_sha256)"],
    producer: "rawIngress_v3.ts",
    consumer: "rawIngress_v3.ts, audit",
    immutability: "immutable",
  },
  {
    schema: "clean",
    name: "raw_delivery_item",
    description: "Individual flight items from a delivery. Immutable.",
    columns: [
      { name: "id", type: "BIGSERIAL", nullable: false, pk: true, semanticMeaning: "Auto-increment primary key", producer: "rawIngress_v3.ts", consumer: "rawIngress_v3.ts", immutability: "immutable", source: "migration 0025" },
      { name: "delivery_id", type: "TEXT", nullable: false, semanticMeaning: "References raw_delivery.delivery_id", producer: "rawIngress_v3.ts", consumer: "rawIngress_v3.ts", immutability: "immutable", fk: "raw_delivery.delivery_id", source: "migration 0025" },
      { name: "item_index", type: "INTEGER", nullable: false, semanticMeaning: "0-based index within the delivery's flights[]", producer: "rawIngress_v3.ts", consumer: "rawIngress_v3.ts", immutability: "immutable", source: "migration 0025" },
      { name: "flight_number", type: "TEXT", nullable: true, semanticMeaning: "Flight number (e.g. UA123)", producer: "rawIngress_v3.ts", consumer: "queries", immutability: "immutable", source: "migration 0025" },
      { name: "raw_item", type: "JSONB", nullable: false, semanticMeaning: "The individual flight object", producer: "rawIngress_v3.ts", consumer: "audit/recovery", immutability: "immutable", source: "migration 0025" },
      { name: "raw_item_sha256", type: "TEXT", nullable: false, semanticMeaning: "SHA-256 of this specific item", producer: "rawIngress_v3.ts", consumer: "dedup", immutability: "immutable", source: "migration 0025" },
      { name: "parsing_outcome", type: "TEXT", nullable: true, semanticMeaning: "success|partial|skipped_no_number|skipped_cargo|skipped_private", producer: "rawIngress_v3.ts", consumer: "diagnostics", immutability: "immutable", source: "migration 0025" },
      { name: "canonical_flight_instance_id", type: "TEXT", nullable: true, semanticMeaning: "Deduped canonical ID", producer: "rawIngress_v3.ts", consumer: "flight_instance queries", immutability: "immutable", source: "migration 0025" },
    ],
    constraints: ["UNIQUE (delivery_id, item_index)"],
    indexes: ["idx_rdi_flight (flight_number, carrier_iata, last_updated_utc)", "idx_rdi_canonical (canonical_flight_instance_id)", "idx_rdi_delivery (delivery_id)"],
    producer: "rawIngress_v3.ts",
    consumer: "rawIngress_v3.ts, audit",
    immutability: "immutable",
  },
  {
    schema: "clean",
    name: "historical_feature_store",
    description: "Bitemporal as-of feature store. Append-only. One row per (entity_type, entity_id, feature_name, valid_from).",
    columns: [
      { name: "id", type: "BIGSERIAL", nullable: false, pk: true, semanticMeaning: "Auto-increment primary key", producer: "historicalFeatureStore_v3.ts", consumer: "historicalFeatureStore_v3.ts", immutability: "append-only", source: "migration 0024" },
      { name: "entity_type", type: "TEXT", nullable: false, semanticMeaning: "airport|route|carrier_airport|tail|od|weather", producer: "historicalFeatureStore_v3.ts", consumer: "as-of queries", immutability: "append-only", source: "migration 0024" },
      { name: "entity_id", type: "TEXT", nullable: false, semanticMeaning: "Entity identifier (e.g. airport ICAO)", producer: "historicalFeatureStore_v3.ts", consumer: "as-of queries", immutability: "append-only", source: "migration 0024" },
      { name: "feature_name", type: "TEXT", nullable: false, semanticMeaning: "Feature name (e.g. otp_15m_rate)", producer: "historicalFeatureStore_v3.ts", consumer: "as-of queries", immutability: "append-only", source: "migration 0024" },
      { name: "feature_value", type: "DOUBLE PRECISION", nullable: true, semanticMeaning: "Feature value (nullable: missing features stay NULL, never 0)", producer: "historicalFeatureStore_v3.ts", consumer: "snapshot builders", immutability: "append-only", source: "migration 0024" },
      { name: "information_available_at", type: "TIMESTAMPTZ", nullable: false, semanticMeaning: "When our system could first build features from this source (ETL lag)", producer: "historicalFeatureStore_v3.ts", consumer: "as-of queries", immutability: "append-only", timestampSemantics: "available_at", source: "migration 0024" },
      { name: "valid_from", type: "TIMESTAMPTZ", nullable: false, semanticMeaning: "When this feature value became true in the world", producer: "historicalFeatureStore_v3.ts", consumer: "as-of queries", immutability: "append-only", timestampSemantics: "valid_from", source: "migration 0024" },
      { name: "valid_to", type: "TIMESTAMPTZ", nullable: true, semanticMeaning: "When this feature value stopped being true (NULL = still valid)", producer: "historicalFeatureStore_v3.ts", consumer: "as-of queries", immutability: "append-only", timestampSemantics: "valid_to", source: "migration 0024" },
    ],
    constraints: ["UNIQUE (entity_type, entity_id, feature_name, valid_from)"],
    indexes: ["idx_hfs_lookup (entity_type, entity_id, feature_name, information_available_at, valid_from DESC)", "idx_hfs_validity (entity_type, entity_id, valid_from, valid_to)"],
    producer: "bootstrap backfill, provider FIDS history",
    consumer: "snapshot builders, evaluation",
    immutability: "append-only",
  },
  {
    schema: "clean",
    name: "historical_readiness",
    description: "Tracks history_ready_at per entity type/id.",
    columns: [
      { name: "id", type: "BIGSERIAL", nullable: false, pk: true, semanticMeaning: "Auto-increment primary key", producer: "historicalFeatureStore_v3.ts", consumer: "historicalFeatureStore_v3.ts", immutability: "mutable", source: "migration 0024" },
      { name: "entity_type", type: "TEXT", nullable: false, semanticMeaning: "Entity type", producer: "historicalFeatureStore_v3.ts", consumer: "readiness checks", immutability: "mutable", source: "migration 0024" },
      { name: "entity_id", type: "TEXT", nullable: false, semanticMeaning: "Entity identifier", producer: "historicalFeatureStore_v3.ts", consumer: "readiness checks", immutability: "mutable", source: "migration 0024" },
      { name: "history_ready_at", type: "TIMESTAMPTZ", nullable: false, semanticMeaning: "Earliest cutoff where features are available", producer: "historicalFeatureStore_v3.ts", consumer: "readiness checks", immutability: "mutable", timestampSemantics: "history_ready_at", source: "migration 0024" },
      { name: "verified", type: "BOOLEAN", nullable: false, semanticMeaning: "Whether readiness has been verified", producer: "historicalFeatureStore_v3.ts", consumer: "readiness checks", immutability: "mutable", source: "migration 0024" },
    ],
    constraints: ["UNIQUE (entity_type, entity_id)"],
    indexes: ["idx_hr_readiness (entity_type, entity_id, history_ready_at)"],
    producer: "bootstrap verification",
    consumer: "readiness checks",
    immutability: "mutable",
  },
  {
    schema: "clean",
    name: "flight_population",
    description: "Provider-observation prediction population. One row per (flight, cutoff).",
    columns: [
      { name: "id", type: "BIGSERIAL", nullable: false, pk: true, semanticMeaning: "Auto-increment primary key", producer: "fidsCensus_v3.ts", consumer: "population queries", immutability: "append-only", source: "migration 0019" },
      { name: "batch_id", type: "TEXT", nullable: true, semanticMeaning: "Collection batch ID", producer: "fidsCensus_v3.ts", consumer: "batch queries", immutability: "append-only", source: "migration 0019" },
      { name: "source_airport_icao", type: "TEXT", nullable: false, semanticMeaning: "ICAO code of airport where FIDS was queried", producer: "fidsCensus_v3.ts", consumer: "population queries", immutability: "append-only", source: "migration 0019" },
      { name: "cutoff_utc", type: "TIMESTAMPTZ", nullable: false, semanticMeaning: "Prediction cutoff time", producer: "fidsCensus_v3.ts", consumer: "population queries", immutability: "append-only", timestampSemantics: "cutoff", source: "migration 0019" },
      { name: "flight_number", type: "TEXT", nullable: false, semanticMeaning: "Flight number", producer: "fidsCensus_v3.ts", consumer: "population queries", immutability: "append-only", source: "migration 0019" },
      { name: "carrier_iata", type: "TEXT", nullable: true, semanticMeaning: "Carrier IATA code", producer: "fidsCensus_v3.ts", consumer: "population queries", immutability: "append-only", source: "migration 0019" },
    ],
    constraints: ["UNIQUE (source_airport_icao, cutoff_utc, flight_number, carrier_iata, provider_record_key)"],
    indexes: ["idx_flight_population_window (batch_id, cutoff_utc)", "idx_flight_population_airport (source_airport_icao, cutoff_utc)"],
    producer: "fidsCensus_v3.ts",
    consumer: "population queries, Gate 5 funnel",
    immutability: "append-only",
  },
];

/**
 * Get a table doc by name.
 */
export function getTableDoc(name: string): TableDoc | undefined {
  return DATA_DICTIONARY.find(t => t.name === name);
}

/**
 * Get all tables for a schema.
 */
export function getSchemaTables(schema: string): TableDoc[] {
  return DATA_DICTIONARY.filter(t => t.schema === schema);
}
