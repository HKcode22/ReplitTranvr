import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  loadMigrationFilesV39,
  planPendingMigrationsV39,
} from "../server/lib/disruption/schemaMigration_v39";

const filename = "V0063__phase2g_cleanup_journal_v39.sql";
const sql = readFileSync(
  `migrations/current/${filename}`,
  "utf8",
);

describe("Phase2G durable cleanup journal migration", () => {
  it("is a logged, metadata-only journal", () => {
    expect(sql).toContain(
      "CREATE TABLE clean.phase2g_cleanup_journal_v39",
    );
    expect(sql).not.toContain("CREATE UNLOGGED TABLE");
    expect(sql).toContain("session_id UUID PRIMARY KEY");
    expect(sql).toContain("request_sha256 TEXT NOT NULL");
    expect(sql).toContain("expected_live_blobs INTEGER NOT NULL");

    expect(sql).not.toMatch(
      /provider_subscription_id|raw_body|flight_number|aircraft_reg/i,
    );
  });

  it("requires a verified deletion state and immutable identity", () => {
    expect(sql).toContain("state IN ('STARTED', 'VERIFIED')");
    expect(sql).toContain("deleted_blobs = expected_live_blobs");
    expect(sql).toContain("deleted_runtime_rows >= 1");
    expect(sql).toContain(
      "verified Phase2G cleanup journal is immutable",
    );
    expect(sql).toContain(
      "Phase2G cleanup journal identity is immutable",
    );
    expect(sql).toContain("BEFORE INSERT OR UPDATE OR DELETE");
  });

  it("is recognized as V0063 after the existing B0062 baseline", async () => {
    const files = await loadMigrationFilesV39();
    const baseline = files.find(
      x => x.kind === "BASELINE" && x.version === 62,
    );

    expect(baseline).toBeDefined();

    const pending = planPendingMigrationsV39(files, [{
      version: 62,
      kind: "BASELINE",
      file: baseline!.file,
      checksumSha256: baseline!.checksumSha256,
    }]);

    // New source-custody V0064 follows journal V0063; both are planned
    // without applying either to a live scientific database here.
    expect(pending.map(x => x.file)).toEqual([filename, "V0064__phase2g_prepaid_source_pending_intent_v39.sql"]);
    expect(pending.map(x => x.version)).toEqual([63,64]);
    expect(pending.every(x => x.kind === "VERSIONED")).toBe(true);
  });
});
