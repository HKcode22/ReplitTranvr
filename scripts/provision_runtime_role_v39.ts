/**
 * Provision/reconcile the dedicated least-privilege V3.9 clean-schema runtime role.
 *
 * IMPORTANT: Replit development and production databases are separate. This
 * script refuses generic DATABASE_URL so a workspace cannot accidentally prove
 * prerequisite P against the development DB while travnr.com uses production.
 */
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const ROLE = "travnr_v39_runtime";
const ENV_PATH = join(process.cwd(), ".env");
const OWNER_ENV = "V39_PRODUCTION_DATABASE_OWNER_URL";
const TARGET_CONFIRM_ENV = "V39_DATABASE_TARGET_CONFIRM";

function escapeIdent(s: string): string { return `"${s.replace(/"/g, `""`)}"`; }
function escapeLiteral(s: string): string { return s.replace(/'/g, `''`); }
function upsertEnvVar(src: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(src)) return src.replace(re, () => line);
  return src.endsWith("\n") || src.length === 0 ? `${src}${line}\n` : `${src}\n${line}\n`;
}
function safeDbLabel(url: string): string {
  const parsed = new URL(url);
  return `${parsed.hostname}/${parsed.pathname.replace(/^\//, "") || "<database>"}`;
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

    const password = randomBytes(32).toString("base64url");
    const exists = await owner.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [ROLE]);
    if (exists.rowCount === 0) {
      await owner.query(`CREATE ROLE ${escapeIdent(ROLE)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${escapeLiteral(password)}'`);
      console.log(`role created: ${ROLE}`);
    } else {
      await owner.query(`ALTER ROLE ${escapeIdent(ROLE)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${escapeLiteral(password)}'`);
      console.log(`role reconciled: ${ROLE}`);
    }

    // Remove direct table grants from any older use before re-granting the
    // exact clean-schema DML contract. No other-schema table privilege remains.
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

    const attr = await owner.query("SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles WHERE rolname=$1", [ROLE]);
    const a = attr.rows[0];
    if (!a || a.rolsuper || a.rolcreatedb || a.rolcreaterole || !a.rolcanlogin) throw new Error("runtime role attribute verification failed");
    const grants = await owner.query(
      `SELECT table_schema AS s, table_name AS t,string_agg(DISTINCT privilege_type,',' ORDER BY privilege_type) AS p FROM information_schema.role_table_grants WHERE grantee=$1 GROUP BY 1,2 ORDER BY 1,2`,
      [ROLE],
    );
    const allowed = new Set(["SELECT", "INSERT", "UPDATE", "DELETE"]);
    if (!grants.rows.length) throw new Error("runtime role has no clean table grants");
    for (const row of grants.rows) {
      if (row.s !== "clean") throw new Error(`grant outside clean schema: ${row.s}.${row.t}`);
      for (const privilege of String(row.p).split(",")) if (!allowed.has(privilege)) throw new Error(`excess privilege ${privilege}@${row.s}.${row.t}`);
    }

    const u = new URL(ownerUrl);
    u.username = ROLE;
    u.password = password;
    if (!u.searchParams.get("sslmode")) u.searchParams.set("sslmode", "require");
    const runtimeUrl = u.toString();
    const runtime = new Pool({ connectionString: runtimeUrl });
    try {
      const who = await runtime.query("SELECT current_user AS u,current_database() AS db");
      if (who.rows[0]?.u !== ROLE || who.rows[0]?.db !== dbName) throw new Error("runtime connection role/database mismatch");
      await runtime.query("SELECT 1 FROM clean.retention_tombstone LIMIT 1");
    } finally { await runtime.end().catch(() => undefined); }

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
    let env = "";
    try { env = readFileSync(ENV_PATH, "utf8"); } catch { env = ""; }
    env = upsertEnvVar(env, "V39_DATABASE_RUNTIME_URL", runtimeUrl);
    env = upsertEnvVar(env, "V39_DB_ROLE_EVIDENCE", `'${JSON.stringify(evidence)}'`);
    writeFileSync(ENV_PATH, env, { mode: 0o600 });
    console.log(`provision result=PASS target=production db=${safeDbLabel(ownerUrl)} role=${ROLE} clean_tables=${grants.rows.length}`);
    console.log("runtime credential written to ignored .env only; copy it to the published deployment secret V39_DATABASE_RUNTIME_URL before live P/Gate1/smoke");
  } finally { await owner.end().catch(() => undefined); }
}

main().catch((e) => { console.error(`provision FAILED: ${e?.message ?? e}`); process.exit(1); });
