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
 * A callback must not wait indefinitely for a SQL connection during
 * Replit or PostgreSQL outages. Scoped to the published callback-only
 * process, leaving scientific CLI/GitHub owner pool semantics unchanged.
 *
 * A 4s acquisition timeout is deliberately below the provider's observed
 * ~10s HTTP response envelope. It bounds only pool acquisition, not object
 * storage, transaction, platform cold-start or provider network delivery.
 */
export function v39PoolConnectionTimeoutMillis(
  env: { V39_CALLBACK_ONLY_RUNTIME?: string } = process.env,
): number {
  return env.V39_CALLBACK_ONLY_RUNTIME === "1" ? 4000 : 0;
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
