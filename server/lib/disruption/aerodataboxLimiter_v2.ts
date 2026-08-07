// @ts-nocheck
// ============================================================================
// PRESERVED FROM server2 (v2 risk/monitor/polling pipeline) - NOT ACTIVE.
// DISABLED 2026-08-06: polling pipeline SHUT DOWN; moving to webhooks.
// Reference copy only - do NOT wire this file in.
// Diff against server/lib/disruption/aerodataboxLimiter.ts (original).
// ============================================================================
// Serial queue for AeroDataBox calls. RapidAPI plans on AeroDataBox throw
// HTTP 429 when several requests land at once (which happens when the
// dashboard rescores N flights in parallel, or the monitor cycle iterates).
// Every callsite that hits aerodatabox.p.rapidapi.com goes through here so
// the minimum spacing applies across the whole process, not per route.
//
// Also acts as apiCallTracker: every call is logged with endpoint, units,
// and status so we have visibility into AeroDataBox API costs.

const MIN_INTERVAL_MS = parseInt(process.env.AERO_MIN_INTERVAL_MS || "1000", 10);

let lastStartedAt = 0;
let chain: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== apiCallTracker — Track AeroDataBox API usage =====

export interface ApiCallEntry {
  endpoint: string;
  units: number;
  timestamp: number;
  status: number;
}

const callLog: ApiCallEntry[] = [];
const MAX_LOG_SIZE = 100_000;

function categorizeEndpoint(url: string): { endpoint: string; units: number } {
  if (url.includes('/history/recent')) {
    return { endpoint: 'historical-otp', units: 6 };
  }
  if (url.includes('/flights/number/')) {
    return { endpoint: 'flight-by-number', units: 3 };
  }
  if (url.includes('/flights/airports/iata/')) {
    return { endpoint: 'airport-departures', units: 3 };
  }
  return { endpoint: 'unknown', units: 3 };
}

function recordCall(url: string, status: number): void {
  const { endpoint, units } = categorizeEndpoint(url);
  callLog.push({ endpoint, units, timestamp: Date.now(), status });
  if (callLog.length > MAX_LOG_SIZE) callLog.splice(0, callLog.length - MAX_LOG_SIZE);
}

export function getApiStats(): {
  total: number;
  byEndpoint: Record<string, { calls: number; units: number }>;
  recent: ApiCallEntry[];
} {
  const byEndpoint: Record<string, { calls: number; units: number }> = {};
  let total = 0;
  for (const entry of callLog) {
    total += entry.units;
    const key = entry.endpoint;
    if (!byEndpoint[key]) byEndpoint[key] = { calls: 0, units: 0 };
    byEndpoint[key].calls += 1;
    byEndpoint[key].units += entry.units;
  }
  return { total, byEndpoint, recent: callLog.slice(-50) };
}

// ===== Rate-limited fetch =====

export function aerodataboxFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const slot = chain.then(async () => {
    const wait = Math.max(0, lastStartedAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastStartedAt = Date.now();
  });
  chain = slot.catch(() => {});
  return slot.then(async () => {
    const resp = await fetch(input, init);
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    recordCall(urlStr, resp.status);
    return resp;
  });
}
