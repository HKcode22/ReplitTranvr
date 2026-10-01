import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("V3.9 provider account/subscription retention owner", () => {
  it("durable boot baseline preserves one-way provider-account expiry guards", () => {
    const db = source("server/db.ts");
    const baseline = source(
      "migrations/baseline/B0062__v39_schema_baseline_20261001.sql",
    );
    const migration = source("migrations/0051_provider_account_scope_expiry.sql");

    expect(db).toContain("runSchemaMigrationsV39");
    expect(baseline).toContain("provider_account_expired_at_utc");
    expect(baseline).toContain("trg_adb_collection_batches_provider_account_guard");
    expect(baseline).toContain("trg_adb_anchor_probe_provider_account_guard");
    expect(migration).toContain("expired V3.9 provider account scope cannot be restored");
    expect(migration).toContain("NEW.credits_spent IS NOT NULL");
  });

  it("expires only provider-native account/subscription fields and preserves project analytics", () => {
    const owner = source("server/lib/disruption/providerAccountExpiry_v39.ts");
    expect(owner).toContain("balance_before=NULL");
    expect(owner).toContain("balance_after=NULL");
    expect(owner).toContain("credits_consumed_actual=NULL");
    expect(owner).toContain("subscription_id=NULL");
    expect(owner).toContain("credits_spent=NULL");

    expect(owner).not.toContain("credits_consumed_internal=NULL");
    expect(owner).not.toContain("rows_delivered=NULL");
    expect(owner).not.toContain("unique_flights=NULL");
    expect(owner).not.toContain("tail_chain_links=NULL");
    expect(owner).not.toContain("rows_per_hour=NULL");
    expect(owner).not.toContain("stability=NULL");
    expect(owner).not.toContain("internal_send_credits=NULL");
  });

  it("is wired into the single bounded retention operator", () => {
    const operator = source("scripts/v39_retention_expiry_v39.ts");
    expect(operator).toContain("collectProviderAccountExpiryCandidates");
    expect(operator).toContain("applyProviderAccountExpiryCandidates");
    expect(operator).toContain("Math.max(0, options.limit - result.candidates.length)");
    expect(operator).toContain("runRetentionExpiry({");
    expect(operator.indexOf("runRetentionExpiry({")).toBeLessThan(operator.indexOf("applyProviderAccountExpiryCandidates(accountCandidates)"));
  });

  it("tombstones the provider account scope and opens a deletion incident on failure", () => {
    const owner = source("server/lib/disruption/providerAccountExpiry_v39.ts");
    expect(owner).toContain("clean.retention_tombstone");
    expect(owner).toContain("provider-account-content");
    expect(owner).toContain("owner: \"providerAccountExpiry_v39\"");
    expect(owner).toContain("VALUES ('deletion',$1::jsonb,false)");
  });
});
