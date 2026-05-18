export interface NasStatusResult {
  hasGroundStop: boolean;
  hasGroundDelay: boolean;
  avgDelayMinutes: number;
  programs: string[];
}

interface CacheEntry {
  result: NasStatusResult;
  fetchedAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5_000;
const NAS_URL = "https://nasstatus.faa.gov/api/airport-conditions";

const cache = new Map<string, CacheEntry>();

function defaultResult(): NasStatusResult {
  return {
    hasGroundStop: false,
    hasGroundDelay: false,
    avgDelayMinutes: 0,
    programs: [],
  };
}

function parseDelayMinutes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string") {
    const m = value.match(/-?\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (Number.isFinite(n)) return Math.max(0, n);
    }
  }
  return 0;
}

function flattenEntries(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidateKeys = [
      "airportConditions",
      "airport_conditions",
      "airports",
      "conditions",
      "entries",
      "data",
      "results",
    ];
    for (const key of candidateKeys) {
      const v = obj[key];
      if (Array.isArray(v)) return v;
    }
    const collected: any[] = [];
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) collected.push(...v);
    }
    if (collected.length > 0) return collected;
  }
  return [];
}

function entryAirportCode(entry: any): string {
  if (!entry || typeof entry !== "object") return "";
  const candidates = [
    entry.airport,
    entry.airportCode,
    entry.iata,
    entry.iataCode,
    entry.code,
    entry.location,
    entry.facility,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim().toUpperCase();
  }
  return "";
}

function entryType(entry: any): string {
  if (!entry || typeof entry !== "object") return "";
  const candidates = [
    entry.type,
    entry.programType,
    entry.program,
    entry.category,
    entry.eventType,
    entry.name,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return "";
}

function entryAvgDelay(entry: any): number {
  if (!entry || typeof entry !== "object") return 0;
  const candidates = [
    entry.avgDelay,
    entry.averageDelay,
    entry.avg_delay,
    entry.delay,
    entry.delayMinutes,
    entry.delay_minutes,
  ];
  for (const c of candidates) {
    const n = parseDelayMinutes(c);
    if (n > 0) return n;
  }
  return 0;
}

export async function getNasStatus(iataCode: string): Promise<NasStatusResult> {
  const code = (iataCode || "").trim().toUpperCase();
  if (!code) return defaultResult();

  const cached = cache.get(code);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`[nasStatus] cache hit ${code}`);
    return cached.result;
  }

  console.log(`[nasStatus] fetching ${code}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(NAS_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Travnr-Disruption-Monitor/1.0",
      },
      signal: controller.signal,
    });
    if (!resp.ok) {
      console.warn(`[nasStatus] HTTP ${resp.status} for ${code}`);
      const result = defaultResult();
      cache.set(code, { result, fetchedAt: now });
      return result;
    }
    const payload: unknown = await resp.json().catch(() => null);
    const entries = flattenEntries(payload);

    const result = defaultResult();
    for (const entry of entries) {
      const airport = entryAirportCode(entry);
      if (airport !== code) continue;
      const type = entryType(entry);
      const typeUpper = type.toUpperCase();
      const delay = entryAvgDelay(entry);
      if (type) result.programs.push(type);
      if (typeUpper.includes("GROUND STOP")) {
        result.hasGroundStop = true;
      }
      if (
        typeUpper.includes("GROUND DELAY") ||
        typeUpper.includes("GDP") ||
        typeUpper.includes("AIRSPACE FLOW") ||
        typeUpper.includes("AFP")
      ) {
        result.hasGroundDelay = true;
      }
      if (delay > result.avgDelayMinutes) {
        result.avgDelayMinutes = delay;
      }
    }

    console.log(
      `[nasStatus] ${code} groundStop=${result.hasGroundStop} groundDelay=${result.hasGroundDelay} avgDelay=${result.avgDelayMinutes} programs=${JSON.stringify(result.programs)}`,
    );

    cache.set(code, { result, fetchedAt: now });
    return result;
  } catch (err: any) {
    console.warn(`[nasStatus] fetch failed for ${code}:`, err?.message || err);
    const result = defaultResult();
    cache.set(code, { result, fetchedAt: now });
    return result;
  } finally {
    clearTimeout(timer);
  }
}
