import { Pool } from "pg";

let runtimePool: Pool | null = null;

function requireV39RuntimeUrl(): string {
  const url = String(process.env.V39_DATABASE_RUNTIME_URL ?? "").trim();
  if (!url) {
    throw new Error("V39_DATABASE_RUNTIME_URL_REQUIRED: V3.9 clean-schema runtime DB is not configured");
  }
  return url;
}

export function getV39Pool(): Pool {
  if (!runtimePool) runtimePool = new Pool({ connectionString: requireV39RuntimeUrl() });
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
