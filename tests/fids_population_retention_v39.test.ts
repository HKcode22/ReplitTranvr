import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("V3.9 FIDS normalized-population retention", () => {
  it("boots migration 0053 and creates a random durable research membership", () => {
    const db = source("server/db.ts");
    const migration = source("migrations/0053_fids_population_research_membership.sql");
    expect(db).toContain('"0053_fids_population_research_membership.sql"');
    expect(migration).toContain("population_member_id UUID NOT NULL DEFAULT gen_random_uuid()");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS clean.population_research_membership");
    expect(migration).not.toContain("flight_number TEXT");
    expect(migration).not.toContain("canonical_flight_instance_id TEXT");
  });

  it("couples normalized FIDS expiry atomically to the existing raw-response expiry", () => {
    const migration = source("migrations/0053_fids_population_research_membership.sql");
    expect(migration).toContain("trg_fids_response_expire_population");
    expect(migration).toContain("expire_fids_population_from_response");
    expect(migration).toContain("flight_population:");
    expect(migration).toContain("fids_provider_scope_v1");
    expect(migration).toContain("fids_population_normalized");
    expect(migration).toContain("parent.expiry_run_id");
    expect(migration).toContain("provider_content_expired_at_utc=NEW.raw_expired_at_utc");
  });

  it("clears direct/reversible provider FIDS values but preserves project sampling context", () => {
    const migration = source("migrations/0053_fids_population_research_membership.sql");
    for (const column of [
      "flight_number=NULL", "carrier_iata=NULL", "carrier_icao=NULL", "call_sign=NULL",
      "dep_airport_icao=NULL", "arr_airport_icao=NULL", "dep_scheduled_utc=NULL",
      "arr_scheduled_utc=NULL", "provider_record_key=NULL", "raw_payload_sha256=NULL",
      "population_query_id=NULL", "from_local=NULL", "to_local=NULL", "airport_iana_timezone=NULL",
      "scope_classification=NULL", "codeshare_resolution_status=NULL", "response_hash=NULL",
      "canonical_flight_instance_id=NULL", "analytic_identity_id=NULL", "provider_api_version=NULL",
    ]) expect(migration).toContain(column);
    expect(migration).not.toContain("batch_id=NULL");
    expect(migration).not.toContain("source_airport_icao=NULL");
    expect(migration).not.toContain("cutoff_utc=NULL");
    expect(migration).not.toContain("population_member_id=NULL");
  });

  it("keeps FIDS append-only except the tombstoned one-way compliance transition", () => {
    const migration = source("migrations/0053_fids_population_research_membership.sql");
    expect(migration).toContain("FIDS observations are append-only except audited provider-content expiry");
    expect(migration).toContain("t.record_id='flight_population:' || OLD.id::text || ':fids_provider_scope_v1'");
    expect(migration).toContain("flight_population_fids_expired_cleared");
  });

  it("links webhook capture, snapshots and outcomes through project-owned membership state", () => {
    const migration = source("migrations/0053_fids_population_research_membership.sql");
    expect(migration).toContain("trg_flight_events_mark_population_captured");
    expect(migration).toContain("observed_via_webhook = true");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS population_member_id UUID REFERENCES clean.population_research_membership");
    expect(migration).toContain("trg_flight_snapshots_population_member");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS clean.population_research_outcome_link");
    expect(migration).toContain("trg_flight_outcomes_population_link");
  });
});
