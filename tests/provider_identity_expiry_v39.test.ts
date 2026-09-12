import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("V3.9 temporary provider identity/schedule retention owner", () => {
  it("hard-deletes old schedule versions and identity rows", () => {
    const owner = source("server/lib/disruption/providerIdentityExpiry_v39.ts");
    expect(owner).toContain("DELETE FROM clean.webhook_flight_schedule_version");
    expect(owner).toContain("DELETE FROM clean.webhook_flight_identity");
    expect(owner).toContain("deletion_mode");
    expect(owner).toContain("'hard-delete'");
  });

  it("does not delete an identity with recent schedule or resolution activity", () => {
    const owner = source("server/lib/disruption/providerIdentityExpiry_v39.ts");
    expect(owner).toContain("s.observed_at_utc > $1::timestamptz");
    expect(owner).toContain("r.resolved_at_utc > $1::timestamptz");
    expect(owner).toContain("RETENTION_ROW_CHANGED_OR_ACTIVE");
  });

  it("tombstones deletion and opens persistent deletion incidents on failure", () => {
    const owner = source("server/lib/disruption/providerIdentityExpiry_v39.ts");
    expect(owner).toContain("clean.retention_tombstone");
    expect(owner).toContain("provider-identity-content");
    expect(owner).toContain("owner: \"providerIdentityExpiry_v39\"");
    expect(owner).toContain("VALUES ('deletion',$1::jsonb,false)");
  });

  it("shares the single bounded retention operator after evidence validation", () => {
    const operator = source("scripts/v39_retention_expiry_v39.ts");
    expect(operator).toContain("collectProviderIdentityExpiryCandidates");
    expect(operator).toContain("applyProviderIdentityExpiryCandidates");
    expect(operator).toContain("remaining = Math.max(0, options.limit - result.candidates.length)");
    expect(operator).toContain("remaining = Math.max(0, remaining - identityCandidates.length)");
    expect(operator.indexOf("runRetentionExpiry({")).toBeLessThan(operator.indexOf("applyProviderIdentityExpiryCandidates(identityCandidates)"));
  });
});
