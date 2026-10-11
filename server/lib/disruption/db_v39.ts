import { Pool } from "pg";

let runtimePool: Pool | null = null;

function requireV39RuntimeUrl(): string {
  const url = String(process.env.V39_DATABASE_RUNTIME_URL ?? "").trim();
  if (!url) {
    throw new Error("V39_DATABASE_RUNTIME_URL_REQUIRED: V3.9 clean-schema runtime DB is not configured");
  }
  return url;
}

/**
 * EXPERIMENTAL ONLY: changing PostgreSQL pool acquisition timeout can
 * turn delayed deliveries into immediate non-2xx failures when provider
 * retries are disabled. A 2026-10-10 real-Postgres burst fixture showed
 * both failure modes. Keep DEFAULT=0 (original deployment behavior) until
 * independent durable frontdoor + prospective science approval are proven.
 *
 * This is a feature-gated candidate, NOT a standalone reliability fix.
 */
export function v39PoolConnectionTimeoutMillis(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const enabled =
    env.V39_CALLBACK_ONLY_RUNTIME === "1" &&
    env.V39_CALLBACK_DB_ACQUIRE_TIMEOUT_APPROVED === "1";
  return enabled ? 4000 : 0;
}

export function getV39Pool(): Pool {
  if (!runtimePool) {
    runtimePool = new Pool({
      connectionString: requireV39RuntimeUrl(),
      connectionTimeoutMillis: v39PoolConnectionTimeoutMillis(),
    });
  }
  return runtimePool;
}

/**
 * Lazy proxy so importing a V3.9 module does not crash the ordinary Travnr app
 * when V3.9 is intentionally unconfigured. The first V3.9 DB operation fails
 * closed unless V39_DATABASE_RUNTIME_URL is present.
 */
export const v39Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const active = getV39Pool() as any;
    const value = active[prop as any];
    return typeof value === "function" ? value.bind(active) : value;
  },
});
