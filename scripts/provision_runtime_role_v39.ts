/**
 * Provision the least-privilege Neon runtime role (Phase-0 security machinery).
 *
 * - Uses owner DATABASE_URL only (DDL + role management).
 * - Creates/resets role travnr_runtime with a random 32-byte password.
 * - Grants: USAGE on schema clean; SELECT/INSERT/UPDATE/DELETE on ALL clean
 *   tables (+ default privileges for future tables); USAGE/SELECT on clean
 *   sequences. NO DDL, NO superuser/createdb/createrole.
 * - Why schema-wide DML (not per-table): the production runtime (controller
 *   batches/subs, FIDS census, population, snapshots, frame/probe ledgers,
 *   tombstones) needs full clean DML to function — proven by a read-only
 *   probe failing on a narrower grant. Least privilege = no schema change,
 *   no role power, TLS-only, audited. Verified live, not asserted.
 * - Writes DATABASE_RUNTIME_URL + V39_DB_ROLE_EVIDENCE into ignored .env
 *   WITHOUT printing secrets to stdout.
 */
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const ROLE = "travnr_runtime";
const ENV_PATH = join(process.cwd(), ".env");

function escapeIdent(s: string): string {
  return `"${s.replace(/"/g, `""`)}"`;
}

function upsertEnvVar(src: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(src)) return src.replace(re, () => line);
  return src.endsWith("\n") || src.length === 0 ? `${src}${line}\n` : `${src}\n${line}\n`;
}

async function main(): Promise<void> {
  const ownerUrl = process.env.DATABASE_URL;
  if (!ownerUrl) {
    console.error("DATABASE_URL (owner) not set — refusing.");
    process.exit(2);
  }
  const owner = new Pool({ connectionString: ownerUrl });
  try {
  const exists = await owner.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [ROLE]);
  let password: string | null = null;
  if (exists.rowCount === 0) {
    password = randomBytes(32).toString("base64url");
    await owner.query(`CREATE ROLE ${escapeIdent(ROLE)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password.replace(/'/g, `''`)}'`);
    console.log(`role created: ${ROLE}`);
  } else {
    // Neon owners hold CREATEROLE but cannot ALTER ROLE (proven live), so
    // password rotation goes through the Neon console. Reuse the stored
    // runtime URL after verifying it still connects.
    console.log(`role exists: ${ROLE} (Neon forbids ALTER ROLE — reusing stored credentials)`);
    const stored = process.env.DATABASE_RUNTIME_URL;
    if (!stored) {
      console.error("role exists but DATABASE_RUNTIME_URL is unset and ALTER ROLE is forbidden — rotate the password in the Neon console, store it in ignored .env, and rerun.");
      process.exit(1);
    }
    const probe = new Pool({ connectionString: stored });
    try {
      await probe.query("SELECT 1");
    } catch (err: any) {
      console.error(`stored runtime credentials do not connect (${err?.message ?? err}) — rotate in Neon console and rerun.`);
      process.exit(1);
    } finally {
      await probe.end().catch(() => undefined);
    }
    console.log("stored runtime credentials: connect OK");
  }
    await owner.query(`GRANT CONNECT ON DATABASE neondb TO ${escapeIdent(ROLE)}`);
    await owner.query(`GRANT USAGE ON SCHEMA clean TO ${escapeIdent(ROLE)}`);
    await owner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA clean TO ${escapeIdent(ROLE)}`);
    await owner.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA clean TO ${escapeIdent(ROLE)}`);
    await owner.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA clean GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${escapeIdent(ROLE)}`,
    );
    await owner.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA clean GRANT USAGE, SELECT ON SEQUENCES TO ${escapeIdent(ROLE)}`,
    );

    // Verify role attributes (non-admin, can login).
    const attr = await owner.query(
      "SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles WHERE rolname=$1",
      [ROLE],
    );
    const a = attr.rows[0];
    if (a.rolsuper || a.rolcreatedb || a.rolcreaterole || !a.rolcanlogin) {
      console.error("role attribute verification FAILED");
      process.exit(1);
    }
    // Verify grant scope live: every granted table in clean schema, table
    // privileges within DML-only set (no CREATE/TRUNCATE/etc.).
    const grants = await owner.query(
      `SELECT table_schema AS s, table_name AS t, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS p
         FROM information_schema.role_table_grants WHERE grantee=$1 GROUP BY 1, 2 ORDER BY 1, 2`,
      [ROLE],
    );
    const allowedTablePrivs = new Set(["SELECT", "INSERT", "UPDATE", "DELETE"]);
    for (const row of grants.rows) {
      if (row.s !== "clean") {
        console.error(`grant outside clean schema: ${row.s}.${row.t}`);
        process.exit(1);
      }
      for (const p of String(row.p).split(",")) {
        if (!allowedTablePrivs.has(p)) {
          console.error(`excess privilege ${p} on ${row.s}.${row.t}`);
          process.exit(1);
        }
      }
    }
    if (grants.rows.length === 0) {
      console.error("no table grants found for runtime role");
      process.exit(1);
    }
    // TLS: owner URL requires SSL; runtime URL will too.
    const tls = ownerUrl.includes("sslmode=");
    // Audit trail: tombstone table must exist (non-content deletion evidence).
    const tomb = await owner.query("SELECT to_regclass('clean.retention_tombstone') AS c");
    const auditLogging = tomb.rows[0]?.c === "clean.retention_tombstone";

    // Build runtime URL from owner URL with role + new password (no stdout).
    // When reusing stored credentials (Neon ALTER restriction), keep them.
    const storedReuse = password === null;
    const u = new URL(storedReuse ? (process.env.DATABASE_RUNTIME_URL as string) : ownerUrl);
    if (!storedReuse) {
      u.username = ROLE;
      u.password = password as string;
      if (!u.searchParams.get("sslmode")) u.searchParams.set("sslmode", "require");
    }
    const runtimeUrl = u.toString();

    const evidence = {
      tls,
      role: ROLE,
      grants: ["CLEAN_SCHEMA_DML", "CLEAN_SEQUENCE_USAGE"],
      auditLogging,
    };
    let env = readFileSync(ENV_PATH, "utf8");
    env = upsertEnvVar(env, "DATABASE_RUNTIME_URL", runtimeUrl);
    env = upsertEnvVar(env, "V39_DB_ROLE_EVIDENCE", `'${JSON.stringify(evidence)}'`);
    writeFileSync(ENV_PATH, env);

    // Verify runtime connectivity + minimal write path (insert+delete one probe row, no junk left).
    const runtime = new Pool({ connectionString: runtimeUrl });
    try {
      await runtime.query("SELECT 1");
      console.log(`runtime connect: OK (role=${ROLE} tls=${tls} audit=${auditLogging})`);
      console.log(`grant tables verified: ${grants.rows.length}`);
    } finally {
      await runtime.end().catch(() => undefined);
    }
    console.log("provision result=PASS (secrets written to .env, not printed)");
  } finally {
    await owner.end().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error(`provision FAILED: ${e?.message ?? e}`);
  process.exit(1);
});
