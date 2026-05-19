/**
 * nasStatus.ts
 * Fetches active FAA ground stops and delay programs from the official
 * NAS Status API used by nasstatus.faa.gov
 */

const NAS_API_URL = "https://nasstatus.faa.gov/api/airport-events";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

// Single shared fetch per cycle — all airports share one API call
let sharedCache: { data: any[] | null; fetchedAt: number } = {
  data: null,
  fetchedAt: 0,
};

const defaultResult = (): NasStatusResult => ({
  hasGroundStop: false,
  hasGroundDelay: false,
  avgDelayMinutes: 0,
  programs: [],
});

async function fetchAllAirportEvents(forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  if (!forceRefresh && sharedCache.data && now - sharedCache.fetchedAt < CACHE_TTL_MS) {
    return sharedCache.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(NAS_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Travnr-DisruptionMonitor/1.0",
      },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[nasStatus] HTTP ${resp.status} from airport-events API`);
      return sharedCache.data || [];
    }

    const data: any[] = await resp.json();
    sharedCache = { data, fetchedAt: now };
    console.log(`[nasStatus] fetched airport-events: ${data.length} airports`);
    return data;
  } catch (err: any) {
    console.warn(`[nasStatus] fetch failed: ${err?.message || err}`);
    return sharedCache.data || [];
  }
}

// Per-airport result cache to avoid re-parsing on every call
const airportCache = new Map<string, CacheEntry>();

export async function getNasStatus(
  iataCode: string,
  options?: { forceRefresh?: boolean }
): Promise<NasStatusResult> {
  const code = iataCode.toUpperCase().trim();
  const now = Date.now();
  const forceRefresh = options?.forceRefresh ?? false;

  // Check per-airport cache
  if (!forceRefresh) {
    const cached = airportCache.get(code);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      console.log(`[nasStatus] cache hit ${code}`);
      return cached.result;
    }
  }

  try {
    const data = await fetchAllAirportEvents(forceRefresh);

    // Find this airport in the response
    const entry = data.find(
      (e: any) => (e.airportId || "").toUpperCase() === code
    );

    if (!entry) {
      // No entry = no active programs for this airport
      const result = defaultResult();
      airportCache.set(code, { result, fetchedAt: now });
      return result;
    }

    const hasGroundStop = entry.groundStop !== null && entry.groundStop !== undefined;
    const hasGroundDelay =
      (entry.groundDelay !== null && entry.groundDelay !== undefined) ||
      (entry.arrivalDelay !== null && entry.arrivalDelay !== undefined) ||
      (entry.departureDelay !== null && entry.departureDelay !== undefined);

    const avgDelayMinutes = Number(
      entry.groundDelay?.avgDelay ||
      entry.arrivalDelay?.avgDelay ||
      entry.departureDelay?.avgDelay ||
      0
    );

    const programs: string[] = [];
    if (hasGroundStop) programs.push("Ground Stop");
    if (entry.groundDelay) programs.push("Ground Delay Program");
    if (entry.arrivalDelay) programs.push("Arrival Delay");
    if (entry.departureDelay) programs.push("Departure Delay");
    if (entry.airportClosure) programs.push("Airport Closure");

    const result: NasStatusResult = {
      hasGroundStop,
      hasGroundDelay,
      avgDelayMinutes,
      programs,
    };

    airportCache.set(code, { result, fetchedAt: now });

    if (programs.length > 0) {
      console.log(`[nasStatus] ${code} active programs: ${programs.join(", ")} avgDelay=${avgDelayMinutes}min`);
    }

    return result;
  } catch (err: any) {
    console.warn(`[nasStatus] error processing ${code}: ${err?.message || err}`);
    return defaultResult();
  }
}
