// @ts-nocheck
// ============================================================================
// PRESERVED FROM server2 (v2 risk/monitor/polling pipeline) - NOT ACTIVE.
// DISABLED 2026-08-06: API usage tracker for the polling pipeline, SHUT DOWN.
// Reference copy only - do NOT wire this file in. (server2-only file.)
// ============================================================================
interface ApiCallRecord {
  service: string;
  endpoint: string;
  timestamp: Date;
  status: number;
  durationMs: number;
  flightId?: number;
}

interface ServiceCounter {
  count: number;
  lastCall: Date;
  errors: number;
  totalDurationMs: number;
}

const KNOWN_SERVICES = [
  "aerodatabox",
  "aviationweather",
  "faa_nas",
  "sendgrid",
  "serpapi",
  "anthropic",
  "bland_ai",
  "expedia",
  "ratehawk",
  "hotelbeds",
  "duffel",
  "stripe",
] as const;

type ServiceName = (typeof KNOWN_SERVICES)[number] | "unknown";

const ESTIMATED_COST_PER_CALL: Record<string, number> = {
  aerodatabox: 0.0015,
  sendgrid: 0.0025,
  serpapi: 0.01,
  anthropic: 0.003,
  bland_ai: 0.05,
  aviationweather: 0,
  faa_nas: 0,
};

class ApiCallTracker {
  private records: ApiCallRecord[] = [];
  private counters: Map<string, ServiceCounter> = new Map();
  private sessionStart: Date = new Date();
  private readonly MAX_RECORDS = 200000;

  record(
    service: string,
    endpoint: string,
    status: number,
    durationMs: number,
    flightId?: number,
  ): void {
    if (this.records.length > this.MAX_RECORDS) {
      this.records = this.records.slice(-this.MAX_RECORDS / 2);
    }

    this.records.push({ service, endpoint, timestamp: new Date(), status, durationMs, flightId });

    const key = `${service}:${endpoint}`;
    const existing = this.counters.get(key);
    if (existing) {
      existing.count++;
      existing.lastCall = new Date();
      if (status >= 400) existing.errors++;
      existing.totalDurationMs += durationMs;
    } else {
      this.counters.set(key, {
        count: 1,
        lastCall: new Date(),
        errors: status >= 400 ? 1 : 0,
        totalDurationMs: durationMs,
      });
    }
  }

  getSummary() {
    const byService: Record<string, { count: number; errors: number; avgDurationMs: number }> = {};
    const byEndpoint: Record<string, ServiceCounter> = {};

    for (const [key, counter] of this.counters) {
      const [service] = key.split(":");
      if (!byService[service]) {
        byService[service] = { count: 0, errors: 0, avgDurationMs: 0 };
      }
      byService[service].count += counter.count;
      byService[service].errors += counter.errors;
      byService[service].avgDurationMs = Math.round(
        byService[service].avgDurationMs * (byService[service].count - counter.count) /
          byService[service].count +
          counter.totalDurationMs / byService[service].count,
      );
      byEndpoint[key] = counter;
    }

    const totalCost = this.estimateCost();

    return {
      sessionStart: this.sessionStart.toISOString(),
      uptimeHours: ((Date.now() - this.sessionStart.getTime()) / 3600000).toFixed(1),
      totalCalls: this.records.length,
      byService,
      byEndpoint,
      estimatedCostUSD: totalCost,
      recentErrors: this.records.filter(r => r.status >= 400).slice(-20).reverse(),
    };
  }

  getPerFlightStats(flightId: number) {
    const flightCalls = this.records.filter(r => r.flightId === flightId);
    const byService: Record<string, number> = {};
    for (const call of flightCalls) {
      byService[call.service] = (byService[call.service] || 0) + 1;
    }
    return {
      flightId,
      totalCalls: flightCalls.length,
      byService,
      firstCall: flightCalls[0]?.timestamp,
      lastCall: flightCalls[flightCalls.length - 1]?.timestamp,
    };
  }

  getAeroDataBoxUsage() {
    const aerodataboxCalls = this.records.filter(r => r.service === "aerodatabox");
    const byEndpoint: Record<string, number> = {};
    let totalDuration = 0;
    for (const call of aerodataboxCalls) {
      const short = call.endpoint.split("?")[0];
      byEndpoint[short] = (byEndpoint[short] || 0) + 1;
      totalDuration += call.durationMs;
    }
    return {
      totalCalls: aerodataboxCalls.length,
      byEndpoint,
      avgDurationMs: aerodataboxCalls.length
        ? Math.round(totalDuration / aerodataboxCalls.length)
        : 0,
      errors: aerodataboxCalls.filter(c => c.status >= 400).length,
      estimatedCost: (aerodataboxCalls.length * (ESTIMATED_COST_PER_CALL.aerodatabox || 0)).toFixed(4),
    };
  }

  estimateCost(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, counter] of this.counters) {
      const [service] = key.split(":");
      const rate = ESTIMATED_COST_PER_CALL[service] || 0;
      if (rate > 0) {
        result[service] = `$${(counter.count * rate).toFixed(2)}`;
      }
    }
    result["total"] = `$${Object.entries(this.counters)
      .reduce((sum, [key, counter]) => {
        const [service] = key.split(":");
        return sum + counter.count * (ESTIMATED_COST_PER_CALL[service] || 0);
      }, 0)
      .toFixed(2)}`;
    return result;
  }

  getRatePerMinute(): Record<string, number> {
    const uptimeMinutes = (Date.now() - this.sessionStart.getTime()) / 60000;
    if (uptimeMinutes < 1) return {};
    const byService: Record<string, number> = {};
    for (const [key, counter] of this.counters) {
      const [service] = key.split(":");
      byService[service] = Math.round((counter.count / uptimeMinutes) * 100) / 100;
    }
    return byService;
  }

  reset(): void {
    this.records = [];
    this.counters.clear();
    this.sessionStart = new Date();
  }
}

export const apiTracker = new ApiCallTracker();

export function wrapWithTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  service: string,
  endpoint: string,
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      apiTracker.record(service, endpoint, 200, duration);
      return result;
    } catch (err: any) {
      const duration = Date.now() - start;
      apiTracker.record(service, endpoint, err?.status || 500, duration);
      throw err;
    }
  }) as T;
}
