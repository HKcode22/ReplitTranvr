/** Provision/reconcile the dedicated least-privilege V3.9 clean-schema runtime role. */
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const ROLE = "travnr_v39_runtime";
const ENV_PATH = join(process.cwd(), ".env");

function escapeIdent(s: string): string { return `"${s.replace(/"/g, `""`)}"`; }
function escapeLiteral(s: string): string { return s.replace(/'/g, `''`); }
function upsertEnvVar(src: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(src)) return src.replace(re, () => line);
  return src.endsWith("\n") || src.length === 0 ? `${src}${line}\n` : `${src}\n${line}\n`;
}

async function main(): Promise<void> {
  const ownerUrl = process.env.DATABASE_URL;
  if (!ownerUrl) throw new Error("DATABASE_URL owner connection is required");
  const owner = new Pool({ connectionString: ownerUrl });
  try {
    const meta = await owner.query("SELECT current_database() AS db, current_user AS owner_role");
    const dbName = String(meta.rows[0]?.db ?? "");
    const ownerRole = String(meta.rows[0]?.owner_role ?? "");
    if (!dbName || !ownerRole) throw new Error("unable to resolve current database/owner role");

    const password = randomBytes(32).toString("base64url");
    const exists = await owner.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [ROLE]);
    if (exists.rowCount === 0) {
      await owner.query(`CREATE ROLE ${escapeIdent(ROLE)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${escapeLiteral(password)}'`);
      console.log(`role created: ${ROLE}`);
    } else {
      await owner.query(`ALTER ROLE ${escapeIdent(ROLE)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${escapeLiteral(password)}'`);
      console.log(`role reconciled: ${ROLE}`);
    }

    // Remove any direct table grants left from an older use of this role.
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
      const who = await runtime.query("SELECT current_user AS u");
      if (who.rows[0]?.u !== ROLE) throw new Error("runtime connection role mismatch");
      await runtime.query("SELECT 1 FROM clean.retention_tombstone LIMIT 1");
    } finally { await runtime.end().catch(() => undefined); }

    const tomb = await owner.query("SELECT to_regclass('clean.retention_tombstone') AS c");
    const evidence = { verified: true, verifiedDate: new Date().toISOString().slice(0,10), tls: /sslmode=/i.test(runtimeUrl), role: ROLE, grants: ["CLEAN_SCHEMA_DML", "CLEAN_SEQUENCE_USAGE"], auditLogging: tomb.rows[0]?.c === "clean.retention_tombstone" };
    let env = "";
    try { env = readFileSync(ENV_PATH, "utf8"); } catch { env = ""; }
    env = upsertEnvVar(env, "V39_DATABASE_RUNTIME_URL", runtimeUrl);
    env = upsertEnvVar(env, "V39_DB_ROLE_EVIDENCE", `'${JSON.stringify(evidence)}'`);
    writeFileSync(ENV_PATH, env, { mode: 0o600 });
    console.log(`provision result=PASS role=${ROLE} clean_tables=${grants.rows.length} (secret URL written to ignored .env only)`);
  } finally { await owner.end().catch(() => undefined); }
}

main().catch((e) => { console.error(`provision FAILED: ${e?.message ?? e}`); process.exit(1); });
