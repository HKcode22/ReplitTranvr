/**
 * Provision/reconcile the dedicated least-privilege V3.9 clean-schema runtime role.
 *
 * IMPORTANT: Replit development and production databases are separate. This
 * script refuses generic DATABASE_URL so a workspace cannot accidentally prove
 * prerequisite P against the development DB while travnr.com uses production.
 *
 * Rerun rule: once the runtime role already exists, do NOT rotate/ALTER it on
 * every Phase-2A retry. Reuse the previously generated V39_DATABASE_RUNTIME_URL
 * from the ignored .env, verify the role/grants live, and continue. This makes
 * Phase-2A idempotent and avoids managed-Postgres ALTER ROLE permission traps.
 */
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const ROLE = "travnr_v39_runtime";
const ENV_PATH = join(process.cwd(), ".env");
const OWNER_ENV = "V39_PRODUCTION_DATABASE_OWNER_URL";
const TARGET_CONFIRM_ENV = "V39_DATABASE_TARGET_CONFIRM";
const RUNTIME_ENV = "V39_DATABASE_RUNTIME_URL";

function escapeIdent(s: string): string { return `"${s.replace(/"/g, `""`)}"`; }
function escapeLiteral(s: string): string { return s.replace(/'/g, `''`); }
function upsertEnvVar(src: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(src)) return src.replace(re, () => line);
  return src.endsWith("\n") || src.length === 0 ? `${src}${line}\n` : `${src}\n${line}\n`;
}
function envValue(src: string, key: string): string {
  const match = src.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "";
}
function readEnvText(): string {
  try { return readFileSync(ENV_PATH, "utf8"); } catch { return ""; }
}
function safeDbLabel(url: string): string {
  const parsed = new URL(url);
  return `${parsed.hostname}/${parsed.pathname.replace(/^\//, "") || "<database>"}`;
}
function sameDatabaseTarget(a: string, b: string): boolean {
  const ua = new URL(a);
  const ub = new URL(b);
  return ua.hostname === ub.hostname && ua.port === ub.port && ua.pathname === ub.pathname;
}

async function verifyRoleAndGrants(owner: Pool): Promise<{ cleanTableCount: number }> {
  const attr = await owner.query("SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles WHERE rolname=$1", [ROLE]);
  const a = attr.rows[0];
  if (!a) throw new Error(`runtime role missing:${ROLE}`);
  if (a.rolsuper || a.rolcreatedb || a.rolcreaterole || !a.rolcanlogin) {
    throw new Error("runtime role attribute verification failed");
  }

  const grants = await owner.query(
    `SELECT table_schema AS s, table_name AS t,
            string_agg(DISTINCT privilege_type,',' ORDER BY privilege_type) AS p
       FROM information_schema.role_table_grants
      WHERE grantee=$1
      GROUP BY 1,2 ORDER BY 1,2`,
    [ROLE],
  );
  const allowed = new Set(["SELECT", "INSERT", "UPDATE", "DELETE"]);
  if (!grants.rows.length) throw new Error("runtime role has no clean table grants");
  for (const row of grants.rows) {
    if (row.s !== "clean") throw new Error(`grant outside clean schema: ${row.s}.${row.t}`);
    for (const privilege of String(row.p).split(",")) {
      if (!allowed.has(privilege)) throw new Error(`excess privilege ${privilege}@${row.s}.${row.t}`);
    }
  }
  return { cleanTableCount: grants.rows.length };
}

async function verifyRuntimeConnection(runtimeUrl: string, dbName: string): Promise<void> {
  const parsed = new URL(runtimeUrl);
  if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) throw new Error(`${RUNTIME_ENV} must be a PostgreSQL URL`);
  if (decodeURIComponent(parsed.username) !== ROLE) throw new Error(`${RUNTIME_ENV} username must be ${ROLE}`);
  const runtime = new Pool({ connectionString: runtimeUrl });
  try {
    const who = await runtime.query("SELECT current_user AS u,current_database() AS db");
    if (who.rows[0]?.u !== ROLE || who.rows[0]?.db !== dbName) {
      throw new Error("runtime connection role/database mismatch");
    }
    await runtime.query("SELECT 1 FROM clean.retention_tombstone LIMIT 1");
  } finally {
    await runtime.end().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  if (String(process.env[TARGET_CONFIRM_ENV] ?? "").trim().toLowerCase() !== "production") {
    throw new Error(`${TARGET_CONFIRM_ENV}=production is required; refusing ambiguous development/production target`);
  }

  const ownerUrl = String(process.env[OWNER_ENV] ?? "").trim();
  if (!ownerUrl) {
    throw new Error(`${OWNER_ENV} is required; copy the PRODUCTION database owner connection, never the workspace development DATABASE_URL`);
  }
  const parsedOwner = new URL(ownerUrl);
  if (!/^postgres(?:ql)?:$/.test(parsedOwner.protocol)) throw new Error(`${OWNER_ENV} must be a PostgreSQL URL`);

  const owner = new Pool({ connectionString: ownerUrl });
  try {
    const meta = await owner.query("SELECT current_database() AS db, current_user AS owner_role, inet_server_addr()::text AS server_addr");
    const dbName = String(meta.rows[0]?.db ?? "");
    const ownerRole = String(meta.rows[0]?.owner_role ?? "");
    if (!dbName || !ownerRole) throw new Error("unable to resolve production database/owner role");
    if (ownerRole === ROLE) throw new Error("owner connection is already the runtime role; an owner/migration connection is required");

    const existing = await owner.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [ROLE]);
    let runtimeUrl = "";

    if (existing.rowCount === 0) {
      const password = randomBytes(32).toString("base64url");
      await owner.query(`CREATE ROLE ${escapeIdent(ROLE)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${escapeLiteral(password)}'`);
      console.log(`role created: ${ROLE}`);

      // First-time provisioning only. Do not repeat this destructive grant
      // reconciliation on ordinary retries once the role has already passed.
      const oldGrants = await owner.query(
        `SELECT DISTINCT table_schema, table_name FROM information_schema.role_table_grants WHERE grantee=$1`,
        [ROLE],
      );
      for (const row of oldGrants.rows) {
        await owner.query(`REVOKE ALL PRIVILEGES ON TABLE ${escapeIdent(String(row.table_schema))}.${escapeIdent(String(row.table_name))} FROM ${escapeIdent(ROLE)}`);
      }

      await owner.query(`GRANT CONNECT ON DATABASE ${escapeIdent(dbName)} TO ${escapeIdent(ROLE)}`);
      await owner.query(`GRANT USAGE ON SCHEMA clean TO ${escapeIdent(ROLE)}`);
      await owner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA clean TO ${escapeIdent(ROLE)}`);
      await owner.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA clean TO ${escapeIdent(ROLE)}`);
      await owner.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${escapeIdent(ownerRole)} IN SCHEMA clean GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${escapeIdent(ROLE)}`);
      await owner.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${escapeIdent(ownerRole)} IN SCHEMA clean GRANT USAGE, SELECT ON SEQUENCES TO ${escapeIdent(ROLE)}`);

      const u = new URL(ownerUrl);
      u.username = ROLE;
      u.password = password;
      if (!u.searchParams.get("sslmode")) u.searchParams.set("sslmode", "verify-full");
      runtimeUrl = u.toString();
    } else {
      const envText = readEnvText();
      runtimeUrl = String(process.env[RUNTIME_ENV] ?? "").trim() || envValue(envText, RUNTIME_ENV);
      if (!runtimeUrl) {
        throw new Error(
          `BLOCKED:${ROLE} already exists but ${RUNTIME_ENV} is missing. ` +
          "Refusing to ALTER/rotate the existing production role during a retry. Restore the runtime URL created by the first successful provisioning pass.",
        );
      }
      if (!sameDatabaseTarget(ownerUrl, runtimeUrl)) {
        throw new Error(`BLOCKED:${RUNTIME_ENV} points to a different database target than ${OWNER_ENV}`);
      }
      console.log(`role exists: ${ROLE}; reusing previously generated runtime credential (no ALTER ROLE)`);
    }

    const { cleanTableCount } = await verifyRoleAndGrants(owner);
    await verifyRuntimeConnection(runtimeUrl, dbName);

    const tomb = await owner.query("SELECT to_regclass('clean.retention_tombstone') AS c");
    const evidence = {
      verified: true,
      verifiedDate: new Date().toISOString().slice(0, 10),
      tls: /sslmode=/i.test(runtimeUrl),
      role: ROLE,
      grants: ["CLEAN_SCHEMA_DML", "CLEAN_SEQUENCE_USAGE"],
      auditLogging: tomb.rows[0]?.c === "clean.retention_tombstone",
      target: "production",
      databaseName: dbName,
    };

    let env = readEnvText();
    env = upsertEnvVar(env, RUNTIME_ENV, runtimeUrl);
    env = upsertEnvVar(env, "V39_DB_ROLE_EVIDENCE", `'${JSON.stringify(evidence)}'`);
    writeFileSync(ENV_PATH, env, { mode: 0o600 });

    console.log(`provision result=PASS target=production db=${safeDbLabel(ownerUrl)} role=${ROLE} clean_tables=${cleanTableCount}`);
    console.log("runtime credential preserved in ignored .env; copy it to the published deployment secret V39_DATABASE_RUNTIME_URL before live P/Gate1/smoke");
  } finally {
    await owner.end().catch(() => undefined);
  }
}

main().catch((e) => { console.error(`provision FAILED: ${e?.message ?? e}`); process.exit(1); });
