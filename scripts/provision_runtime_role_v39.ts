/**
 * Provision/reconcile the dedicated least-privilege V3.9 clean-schema runtime role.
 *
 * IMPORTANT: Replit development and production databases are separate. This
 * script refuses generic DATABASE_URL so a workspace cannot accidentally prove
 * prerequisite P against the development DB while travnr.com uses production.
 *
 * Normal rerun rule: reuse the previously generated V39_DATABASE_RUNTIME_URL
 * and verify the role/grants live. If that credential is genuinely lost, an
 * explicit recovery flag may create a versioned replacement runtime role,
 * revoke clean-schema grants/default grants from older V3.9 runtime roles, and
 * verify the replacement by logging in as it. This avoids unsafe ALTER ROLE or
 * DROP ROLE operations on managed Postgres.
 */
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const BASE_ROLE = "travnr_v39_runtime";
const ROLE_PREFIX = "travnr_v39_runtime";
const ENV_PATH = join(process.cwd(), ".env");
const OWNER_ENV = "V39_PRODUCTION_DATABASE_OWNER_URL";
const TARGET_CONFIRM_ENV = "V39_DATABASE_TARGET_CONFIRM";
const RUNTIME_ENV = "V39_DATABASE_RUNTIME_URL";
const RECOVERY_APPROVAL_ENV = "V39_RUNTIME_ROLE_RECOVERY_APPROVED";

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
function isAllowedRuntimeRoleName(role: string): boolean {
  return /^travnr_v39_runtime(?:_recovery\d+)?$/.test(role);
}

async function roleExists(owner: Pool, role: string): Promise<boolean> {
  const result = await owner.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [role]);
  return Boolean(result.rowCount);
}

async function createRuntimeRole(owner: Pool, role: string, password: string): Promise<void> {
  await owner.query(
    `CREATE ROLE ${escapeIdent(role)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '${escapeLiteral(password)}'`,
  );
}

async function grantRuntimeAccess(owner: Pool, ownerRole: string, dbName: string, role: string): Promise<void> {
  await owner.query(`GRANT CONNECT ON DATABASE ${escapeIdent(dbName)} TO ${escapeIdent(role)}`);
  await owner.query(`GRANT USAGE ON SCHEMA clean TO ${escapeIdent(role)}`);
  await owner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA clean TO ${escapeIdent(role)}`);
  await owner.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA clean TO ${escapeIdent(role)}`);
  await owner.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${escapeIdent(ownerRole)} IN SCHEMA clean GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${escapeIdent(role)}`);
  await owner.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${escapeIdent(ownerRole)} IN SCHEMA clean GRANT USAGE, SELECT ON SEQUENCES TO ${escapeIdent(role)}`);
}

async function revokeRuntimeAccess(owner: Pool, ownerRole: string, dbName: string, role: string): Promise<void> {
  await owner.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${escapeIdent(ownerRole)} IN SCHEMA clean REVOKE ALL PRIVILEGES ON TABLES FROM ${escapeIdent(role)}`);
  await owner.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${escapeIdent(ownerRole)} IN SCHEMA clean REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${escapeIdent(role)}`);
  await owner.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA clean FROM ${escapeIdent(role)}`);
  await owner.query(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA clean FROM ${escapeIdent(role)}`);
  await owner.query(`REVOKE ALL PRIVILEGES ON SCHEMA clean FROM ${escapeIdent(role)}`);
  await owner.query(`REVOKE CONNECT ON DATABASE ${escapeIdent(dbName)} FROM ${escapeIdent(role)}`);
}

async function listExistingV39RuntimeRoles(owner: Pool): Promise<string[]> {
  const result = await owner.query(
    `SELECT rolname
       FROM pg_roles
      WHERE rolname=$1 OR rolname ~ '^travnr_v39_runtime_recovery[0-9]+$'
      ORDER BY rolname`,
    [BASE_ROLE],
  );
  return result.rows.map((r) => String(r.rolname));
}

async function chooseRecoveryRole(owner: Pool): Promise<string> {
  for (let i = 1; i <= 20; i += 1) {
    const candidate = `${ROLE_PREFIX}_recovery${i}`;
    if (!(await roleExists(owner, candidate))) return candidate;
  }
  throw new Error("BLOCKED:no-unused-V3.9-runtime-recovery-role-name-available");
}

async function verifyRoleAndGrants(owner: Pool, role: string): Promise<{ cleanTableCount: number }> {
  const attr = await owner.query("SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles WHERE rolname=$1", [role]);
  const a = attr.rows[0];
  if (!a) throw new Error(`runtime role missing:${role}`);
  if (a.rolsuper || a.rolcreatedb || a.rolcreaterole || !a.rolcanlogin) {
    throw new Error(`runtime role attribute verification failed:${role}`);
  }

  const grants = await owner.query(
    `SELECT table_schema AS s, table_name AS t,
            string_agg(DISTINCT privilege_type,',' ORDER BY privilege_type) AS p
       FROM information_schema.role_table_grants
      WHERE grantee=$1
      GROUP BY 1,2 ORDER BY 1,2`,
    [role],
  );
  const allowed = new Set(["SELECT", "INSERT", "UPDATE", "DELETE"]);
  if (!grants.rows.length) throw new Error(`runtime role has no clean table grants:${role}`);
  for (const row of grants.rows) {
    if (row.s !== "clean") throw new Error(`grant outside clean schema:${row.s}.${row.t}`);
    for (const privilege of String(row.p).split(",")) {
      if (!allowed.has(privilege)) throw new Error(`excess privilege:${privilege}@${row.s}.${row.t}`);
    }
  }
  return { cleanTableCount: grants.rows.length };
}

async function verifyNoOtherRuntimeTableGrants(owner: Pool, activeRole: string): Promise<void> {
  const result = await owner.query(
    `SELECT grantee, count(*)::int AS n
       FROM information_schema.role_table_grants
      WHERE table_schema='clean'
        AND (grantee=$1 OR grantee ~ '^travnr_v39_runtime_recovery[0-9]+$')
        AND grantee<>$2
      GROUP BY grantee
      ORDER BY grantee`,
    [BASE_ROLE, activeRole],
  );
  if (result.rows.length) {
    throw new Error(`stale-runtime-clean-grants-remain:${result.rows.map((r) => `${r.grantee}:${r.n}`).join(",")}`);
  }
}

async function verifyRuntimeConnection(runtimeUrl: string, dbName: string, role: string): Promise<void> {
  const parsed = new URL(runtimeUrl);
  if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) throw new Error(`${RUNTIME_ENV} must be a PostgreSQL URL`);
  if (decodeURIComponent(parsed.username) !== role) throw new Error(`${RUNTIME_ENV} username must be ${role}`);
  const runtime = new Pool({ connectionString: runtimeUrl });
  try {
    const who = await runtime.query("SELECT current_user AS u,current_database() AS db");
    if (who.rows[0]?.u !== role || who.rows[0]?.db !== dbName) {
      throw new Error("runtime connection role/database mismatch");
    }
    await runtime.query("SELECT 1 FROM clean.retention_tombstone LIMIT 1");
  } finally {
    await runtime.end().catch(() => undefined);
  }
}

function makeRuntimeUrl(ownerUrl: string, role: string, password: string): string {
  const u = new URL(ownerUrl);
  u.username = role;
  u.password = password;
  u.searchParams.set("sslmode", "verify-full");
  return u.toString();
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

    const envText = readEnvText();
    let runtimeUrl = String(process.env[RUNTIME_ENV] ?? "").trim() || envValue(envText, RUNTIME_ENV);
    let runtimeRole = "";

    if (runtimeUrl) {
      if (!sameDatabaseTarget(ownerUrl, runtimeUrl)) {
        throw new Error(`BLOCKED:${RUNTIME_ENV} points to a different database target than ${OWNER_ENV}`);
      }
      runtimeRole = decodeURIComponent(new URL(runtimeUrl).username);
      if (!isAllowedRuntimeRoleName(runtimeRole)) {
        throw new Error(`BLOCKED:${RUNTIME_ENV} username is not an approved V3.9 runtime role`);
      }
      if (ownerRole === runtimeRole) throw new Error("owner connection is already the runtime role; an owner/migration connection is required");
      console.log(`role exists: ${runtimeRole}; reusing previously generated runtime credential (no ALTER ROLE)`);
    } else if (!(await roleExists(owner, BASE_ROLE))) {
      runtimeRole = BASE_ROLE;
      const password = randomBytes(32).toString("base64url");
      await createRuntimeRole(owner, runtimeRole, password);
      await grantRuntimeAccess(owner, ownerRole, dbName, runtimeRole);
      runtimeUrl = makeRuntimeUrl(ownerUrl, runtimeRole, password);
      console.log(`role created: ${runtimeRole}`);
    } else {
      if (String(process.env[RECOVERY_APPROVAL_ENV] ?? "").trim() !== "1") {
        throw new Error(
          `BLOCKED:${BASE_ROLE} exists but ${RUNTIME_ENV} is missing. ` +
          `Set ${RECOVERY_APPROVAL_ENV}=1 to authorize creation of a versioned replacement role and revocation of old V3.9 runtime clean-schema grants.`,
        );
      }

      runtimeRole = await chooseRecoveryRole(owner);
      const password = randomBytes(32).toString("base64url");
      await createRuntimeRole(owner, runtimeRole, password);

      const oldRoles = await listExistingV39RuntimeRoles(owner);
      for (const oldRole of oldRoles) {
        if (oldRole === runtimeRole) continue;
        await revokeRuntimeAccess(owner, ownerRole, dbName, oldRole);
      }

      await grantRuntimeAccess(owner, ownerRole, dbName, runtimeRole);
      runtimeUrl = makeRuntimeUrl(ownerUrl, runtimeRole, password);
      console.log(`runtime credential recovery: created ${runtimeRole}; revoked clean-schema/default grants from ${oldRoles.join(",")}`);
    }

    const { cleanTableCount } = await verifyRoleAndGrants(owner, runtimeRole);
    await verifyNoOtherRuntimeTableGrants(owner, runtimeRole);
    await verifyRuntimeConnection(runtimeUrl, dbName, runtimeRole);

    const tomb = await owner.query("SELECT to_regclass('clean.retention_tombstone') AS c");
    const evidence = {
      verified: true,
      verifiedDate: new Date().toISOString().slice(0, 10),
      tls: /sslmode=/i.test(runtimeUrl),
      role: runtimeRole,
      grants: ["CLEAN_SCHEMA_DML", "CLEAN_SEQUENCE_USAGE"],
      auditLogging: tomb.rows[0]?.c === "clean.retention_tombstone",
      target: "production",
      databaseName: dbName,
    };

    let env = readEnvText();
    env = upsertEnvVar(env, RUNTIME_ENV, runtimeUrl);
    env = upsertEnvVar(env, "V39_DB_ROLE_EVIDENCE", `'${JSON.stringify(evidence)}'`);
    writeFileSync(ENV_PATH, env, { mode: 0o600 });

    console.log(`provision result=PASS target=production db=${safeDbLabel(ownerUrl)} role=${runtimeRole} clean_tables=${cleanTableCount}`);
    console.log("runtime credential preserved in ignored .env; publish V39_DATABASE_RUNTIME_URL before live smoke/probe delivery");
  } finally {
    await owner.end().catch(() => undefined);
  }
}

main().catch((e) => { console.error(`provision FAILED: ${e?.message ?? e}`); process.exit(1); });
