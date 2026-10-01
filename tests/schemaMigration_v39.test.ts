import { describe, expect, it } from "vitest";
import {
  assertAppliedChecksumsV39,
  executableSqlFromMigrationFileV39,
  parseMigrationFilenameV39,
  requiresBaselineAdoptionV39,
  planPendingMigrationsV39,
  sha256TextV39,
  type AppliedMigrationV39,
  type MigrationFileV39,
} from "../server/lib/disruption/schemaMigration_v39";

function m(file: string, sql: string): MigrationFileV39 {
  const parsed = parseMigrationFilenameV39(file);
  return { file, fullPath: file, ...parsed, sql, checksumSha256: sha256TextV39(sql) };
}

describe("V3.9 durable schema migration planner", () => {
  it("parses baseline and versioned filenames", () => {
    expect(parseMigrationFilenameV39("B0062__baseline.sql")).toEqual({ kind: "BASELINE", version: 62 });
    expect(parseMigrationFilenameV39("V0063__next.sql")).toEqual({ kind: "VERSIONED", version: 63 });
  });

  it("new database uses newest baseline then only newer versioned migrations", () => {
    const files = [
      m("B0057__old.sql", "old"),
      m("B0062__current.sql", "current"),
      m("V0061__legacy.sql", "legacy"),
      m("V0063__next.sql", "next"),
      m("V0064__later.sql", "later"),
    ];
    expect(planPendingMigrationsV39(files, []).map((x) => x.file)).toEqual([
      "B0062__current.sql",
      "V0063__next.sql",
      "V0064__later.sql",
    ]);
  });

  it("existing adopted baseline never replays baseline or older versions", () => {
    const baseline = m("B0062__current.sql", "current");
    const files = [baseline, m("V0063__next.sql", "next")];
    const applied: AppliedMigrationV39[] = [{
      version: 62, kind: "BASELINE", file: baseline.file, checksumSha256: baseline.checksumSha256,
    }];
    expect(planPendingMigrationsV39(files, applied).map((x) => x.file)).toEqual(["V0063__next.sql"]);
  });

  it("an already current database becomes a no-op on restart", () => {
    const baseline = m("B0062__current.sql", "current");
    const next = m("V0063__next.sql", "next");
    const applied: AppliedMigrationV39[] = [
      { version: 62, kind: "BASELINE", file: baseline.file, checksumSha256: baseline.checksumSha256 },
      { version: 63, kind: "VERSIONED", file: next.file, checksumSha256: next.checksumSha256 },
    ];
    expect(planPendingMigrationsV39([baseline, next], applied)).toEqual([]);
  });

  it("fails closed when an applied migration checksum changes", () => {
    const file = m("V0063__next.sql", "SELECT 1");
    expect(() => assertAppliedChecksumsV39([file], [{
      version: 63, kind: "VERSIONED", file: file.file, checksumSha256: "0".repeat(64),
    }])).toThrow(/MIGRATION_CHECKSUM_DRIFT/);
  });

  it("requires adoption for any non-empty project DB without migration history", () => {
    expect(requiresBaselineAdoptionV39(false, true, 0)).toBe(true);
    expect(requiresBaselineAdoptionV39(false, false, 1)).toBe(true);
    expect(requiresBaselineAdoptionV39(false, true, 25)).toBe(true);
  });

  it("allows baseline creation only for an actually empty project DB", () => {
    expect(requiresBaselineAdoptionV39(false, false, 0)).toBe(false);
  });

  it("does not require adoption once durable migration history exists", () => {
    expect(requiresBaselineAdoptionV39(true, true, 25)).toBe(false);
  });

  it("strips known pg_dump psql control lines without changing SQL content", () => {
    const raw = [
      "\\restrict abc123",
      "CREATE TABLE clean.example(id integer);",
      "\\unrestrict abc123",
      "",
    ].join("\n");
    expect(executableSqlFromMigrationFileV39(raw)).toBe(
      "CREATE TABLE clean.example(id integer);\n",
    );
  });

  it("refuses unknown psql meta commands", () => {
    expect(() =>
      executableSqlFromMigrationFileV39("\\connect otherdb\nSELECT 1;"),
    ).toThrow(/UNSUPPORTED_PSQL_META_COMMAND/);
  });

  it("rejects invalid filenames instead of silently executing them", () => {
    expect(() => parseMigrationFilenameV39("0063_old_style.sql")).toThrow(/Invalid V3.9 migration filename/);
  });
});