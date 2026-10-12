import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const audited=readFileSync(
  "scripts/v39_p2g24_readonly_blob_integrity_audit.ts","utf8"
);
describe("P25 P02/P14 historical 30-object read-only audit isolation",()=>{
  it("pins exact historical probe, session and budget, requires explicit object readback",()=>{
    expect(audited).toContain('const SESSION="6267293e-75a0-42a7-b977-89543f200ebc"');
    expect(audited).toContain('const BUDGET="P2G-S1-20261009-23"');
    expect(audited).toContain("const PROBE=18");
    expect(audited).toContain("const EXPECTED_REFS=30");
    expect(audited).toContain('process.argv.includes("--verify-objects")');
    expect(audited).toContain('process.argv.includes("--verify-item-credit-evidence")');
    expect(audited).toContain("verifyItems&&!verifyObjects");
    expect(audited).toContain('row.reconciliation_status!=="UNRESOLVED"');
  });
  it("uses a read-only transaction and no provider, mutation or early source delete",()=>{
    expect(audited).toContain('client.query("BEGIN TRANSACTION READ ONLY")');
    expect(audited).toContain('client.query("ROLLBACK")');
    expect(audited).toContain("store.downloadBytes(b.object_name)");
    expect(audited).not.toMatch(/\b(?:deleteSubscriptionVerifiedStrict|deleteProviderBlobAtExpiryV39|uploadBytes|getBalance|listSubscriptionsStrict)\s*\(/);
    expect(audited).not.toMatch(/(?:UPDATE|INSERT|DELETE FROM|TRUNCATE|CREATE TABLE|DROP TABLE)\s+clean\./);
    expect(audited).toContain("database_mutations:0");
    expect(audited).toContain("object_storage_mutations:0");
    expect(audited).toContain("provider_calls:0");
  });
  it("does not confuse stored notifications or absent UNLOGGED rows with upstream billing",()=>{
    expect(audited).toContain("summarizePreservedOriginalItemEvidenceV39");
    expect(audited).toContain("summarizeCurrentRuntimeLinksForPreservedSourcesV39");
    expect(audited).toContain("if(verifyItems&&creditEvidence===null)");
    expect(audited).toContain("current_unlogged_runtime_cross_reference");
    expect(audited).not.toContain("paid_yssy_go_authorized:true");
  });
});
