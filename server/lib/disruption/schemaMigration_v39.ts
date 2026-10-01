import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Pool, PoolClient } from "pg";

export type MigrationKindV39 = "BASELINE" | "VERSIONED";

export interface MigrationFileV39 {
  file: string;
  fullPath: string;
  version: number;
  kind: MigrationKindV39;
  checksumSha256: string;
  sql: string;
}

export interface AppliedMigrationV39 {
  version: number;
  kind: MigrationKindV39;
  file: string;
  checksumSha256: string;
}

const FILE_RE = /^([BV])(\d{4,})__(.+)\.sql$/;
const LOCK_CLASS_ID = 39001;
const LOCK_OBJECT_ID = 62001;

export function sha256TextV39(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function parseMigrationFilenameV39(file: string): {
  kind: MigrationKindV39;
  version: number;
} {
  const m = FILE_RE.exec(file);
  if (!m) {
    throw new Error(
      `Invalid V3.9 migration filename "${file}". Expected B####__name.sql or V####__name.sql`,
    );
  }
  return {
    kind: m[1] === "B" ? "BASELINE" : "VERSIONED",
    version: Number(m[2]),
  };
}

export function chooseBaselineV39(files: readonly MigrationFileV39[]): MigrationFileV39 | null {
  const baselines = files
    .filter((m) => m.kind === "BASELINE")
    .sort((a, b) => b.version - a.version);
  return baselines[0] ?? null;
}

export function assertUniqueMigrationVersionsV39(files: readonly MigrationFileV39[]): void {
  const seen = new Map<string, string>();
  for (const m of files) {
    const key = `${m.kind}:${m.version}`;
    const prior = seen.get(key);
    if (prior) {
      throw new Error(`Duplicate ${m.kind} migration version ${m.version}: ${prior} and ${m.file}`);
    }
    seen.set(key, m.file);
  }
}

export function assertAppliedChecksumsV39(
  available: readonly MigrationFileV39[],
  applied: readonly AppliedMigrationV39[],
): void {
  const byIdentity = new Map(
    available.map((m) => [`${m.kind}:${m.version}`, m] as const),
  );
  for (const row of applied) {
    const current = byIdentity.get(`${row.kind}:${row.version}`);
    if (!current) continue;
    if (current.checksumSha256 !== row.checksumSha256) {
      throw new Error(
        `MIGRATION_CHECKSUM_DRIFT: ${row.kind} ${row.version} ${row.file} ` +
        `recorded=${row.checksumSha256} current=${current.checksumSha256}`,
      );
    }
  }
}

export function planPendingMigrationsV39(
  files: readonly MigrationFileV39[],
  applied: readonly AppliedMigrationV39[],
): MigrationFileV39[] {
  assertUniqueMigrationVersionsV39(files);
  assertAppliedChecksumsV39(files, applied);

  const appliedKeys = new Set(applied.map((m) => `${m.kind}:${m.version}`));
  const appliedBaseline = applied
    .filter((m) => m.kind === "BASELINE")
    .sort((a, b) => b.version - a.version)[0] ?? null;

  const pending: MigrationFileV39[] = [];
  if (!appliedBaseline) {
    const baseline = chooseBaselineV39(files);
    if (baseline && !appliedKeys.has(`BASELINE:${baseline.version}`)) pending.push(baseline);
  }

  const effectiveBaselineVersion =
    appliedBaseline?.version ?? pending.find((m) => m.kind === "BASELINE")?.version ?? 0;

  for (const m of files.filter((x) => x.kind === "VERSIONED").sort((a, b) => a.version - b.version)) {
    if (m.version <= effectiveBaselineVersion) continue;
    if (appliedKeys.has(`VERSIONED:${m.version}`)) continue;
    pending.push(m);
  }
  return pending;
}

async function readSqlDirectoryV39(
  dir: string,
  expectedKind: MigrationKindV39,
): Promise<MigrationFileV39[]> {
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const out: MigrationFileV39[] = [];
  for (const file of names.filter((x) => x.endsWith(".sql")).sort()) {
    const parsed = parseMigrationFilenameV39(file);
    if (parsed.kind !== expectedKind) {
      throw new Error(`Migration kind/path mismatch: ${file} is ${parsed.kind} but lives in ${dir}`);
    }
    const fullPath = path.join(dir, file);
    const sql = await fs.readFile(fullPath, "utf8");
    out.push({
      file,
      fullPath,
      version: parsed.version,
      kind: parsed.kind,
      checksumSha256: sha256TextV39(sql),
      sql,
    });
  }
  return out;
}

export async function loadMigrationFilesV39(
  root = path.resolve(process.cwd(), "migrations"),
): Promise<MigrationFileV39[]> {
  const [baseline, current] = await Promise.all([
    readSqlDirectoryV39(path.join(root, "baseline"), "BASELINE"),
    readSqlDirectoryV39(path.join(root, "current"), "VERSIONED"),
  ]);
  const all = [...baseline, ...current];
  assertUniqueMigrationVersionsV39(all);
  return all;
}

async function ensureHistorySurfaceV39(client: PoolClient): Promise<void> {
  await client.query("CREATE SCHEMA IF NOT EXISTS v39_meta");
  await client.query(`
    CREATE TABLE IF NOT EXISTS v39_meta.schema_migration_history (
      version INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN (\'BASELINE\',\'VERSIONED\')),
      file TEXT NOT NULL,
      checksum_sha256 TEXT NOT NULL CHECK (checksum_sha256 ~ \'^[0-9a-f]{64}$\'),
      source_sha TEXT,
      execution_id TEXT NOT NULL,
      applied_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (kind, version)
    )
  `);
}

async function readAppliedV39(client: PoolClient): Promise<AppliedMigrationV39[]> {
  const q = await client.query(`
    SELECT version, kind, file, checksum_sha256
    FROM v39_meta.schema_migration_history
    ORDER BY version, kind
  `);
  return q.rows.map((r: any) => ({
    version: Number(r.version),
    kind: String(r.kind) as MigrationKindV39,
    file: String(r.file),
    checksumSha256: String(r.checksum_sha256),
  }));
}

export interface RunSchemaMigrationsOptionsV39 {
  sourceSha?: string | null;
  executionId: string;
  migrationsRoot?: string;
  dryRun?: boolean;
}

export async function runSchemaMigrationsV39(
  migrationPool: Pool,
  options: RunSchemaMigrationsOptionsV39,
): Promise<{ applied: string[]; pending: string[]; dryRun: boolean }> {
  const files = await loadMigrationFilesV39(options.migrationsRoot);
  const client = await migrationPool.connect();
  let lockHeld = false;
  try {
    await client.query("SELECT pg_advisory_lock($1,$2)", [LOCK_CLASS_ID, LOCK_OBJECT_ID]);
    lockHeld = true;
    let appliedRows: AppliedMigrationV39[] = [];

    if (options.dryRun) {
      const exists = await client.query(
        "SELECT to_regclass('v39_meta.schema_migration_history') AS relation",
      );
      if (exists.rows[0]?.relation) {
        appliedRows = await readAppliedV39(client);
      }
      const pending = planPendingMigrationsV39(files, appliedRows);
      return { applied: [], pending: pending.map((m) => m.file), dryRun: true };
    }

    await ensureHistorySurfaceV39(client);
    appliedRows = await readAppliedV39(client);
    const pending = planPendingMigrationsV39(files, appliedRows);
    const applied: string[] = [];
    for (const migration of pending) {
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO v39_meta.schema_migration_history
             (version,kind,file,checksum_sha256,source_sha,execution_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            migration.version,
            migration.kind,
            migration.file,
            migration.checksumSha256,
            options.sourceSha ?? null,
            options.executionId,
          ],
        );
        await client.query("COMMIT");
        applied.push(migration.file);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    }
    return { applied, pending: [], dryRun: false };
  } finally {
    if (lockHeld) {
      await client.query("SELECT pg_advisory_unlock($1,$2)", [LOCK_CLASS_ID, LOCK_OBJECT_ID]).catch(() => undefined);
    }
    client.release();
  }
}