import { aerodataboxFetch } from "./aerodataboxLimiter";

export interface HistoricalOtpResult {
  flightNumber: string;
  onTimeRate: number;
  avgDelayMinutes: number;
  sampleSize: number;
  riskPoints: number;
  source: "aerodatabox" | "fallback";
}

interface CacheEntry {
  result: HistoricalOtpResult;
  fetchedAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const cache = new Map<string, CacheEntry>();

function fallbackResult(flightNumber: string): HistoricalOtpResult {
  return {
    flightNumber,
    onTimeRate: 0.75,
    avgDelayMinutes: 10,
    sampleSize: 0,
    riskPoints: 5,
    source: "fallback",
  };
}

function riskPointsFor(onTimeRate: number, sampleSize: number): number {
  if (sampleSize < 3) return 5;
  if (onTimeRate >= 0.85) return 2;
  if (onTimeRate >= 0.7) return 6;
  if (onTimeRate >= 0.55) return 10;
  return 15;
}

function safeNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function extractDelayMinutes(entry: any): number {
  if (!entry || typeof entry !== "object") return 0;
  const dep = entry.departure || {};
  const candidates = [
    dep?.delay?.departure,
    dep?.delay,
    dep?.runwayDelayMinutes,
    entry?.delayMinutes,
  ];
  for (const c of candidates) {
    const n = safeNumber(c);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return 0;
}

function entryIsCancelled(entry: any): boolean {
  if (!entry || typeof entry !== "object") return false;
  if (entry.isCancelled === true) return true;
  const status = typeof entry.status === "string" ? entry.status.toLowerCase() : "";
  return status.includes("cancel");
}

export async function getHistoricalOtp(
  flightNumber: string,
  _departureDate: string,
): Promise<HistoricalOtpResult> {
  const normalized = (flightNumber || "").replace(/\s+/g, "").toUpperCase();
  if (!normalized) {
    console.warn(`[historicalOtp] empty flight number — fallback fired sampleSize=0 onTimeRate=0.750`);
    return fallbackResult(flightNumber);
  }

  const now = Date.now();
  const cached = cache.get(normalized);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    const { source, sampleSize, onTimeRate } = cached.result;
    console.log(
      `[historicalOtp] ${normalized} cache hit — source=${source} sampleSize=${sampleSize} onTimeRate=${onTimeRate.toFixed(3)}`,
    );
    return cached.result;
  }

  const apiKey = process.env.AERODATABOX_API_KEY;
  if (!apiKey) {
    console.warn(
      `[historicalOtp] ${normalized} no API key — fallback fired sampleSize=0 onTimeRate=0.750`,
    );
    const result = fallbackResult(normalized);
    cache.set(normalized, { result, fetchedAt: now });
    return result;
  }

  // AeroDataBox expects IATA flight number, no spaces, uppercase (e.g. "AA123").
  // Carrier code must be IATA (e.g. "AA"), NOT ICAO (e.g. "AAL") — ICAO codes
  // silently return empty results. The /history/recent endpoint covers the past
  // ~14 days; consistently empty responses usually mean wrong carrier-code
  // format, a flight number that AeroDataBox doesn't cover, or the response
  // shape not matching the fields we inspect (flights / data / bare array).
  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(
    normalized,
  )}/history/recent`;

  console.log(`[historicalOtp] ${normalized} fetching url=${url}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const resp = await aerodataboxFetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
      },
      signal: controller.signal,
    });

    console.log(`[historicalOtp] ${normalized} HTTP ${resp.status} ${resp.statusText}`);

    const rawText = await resp.text().catch(() => "");
    console.log(
      `[historicalOtp] ${normalized} raw response (first 500 chars): ${rawText.slice(0, 500)}`,
    );

    if (!resp.ok) {
      console.warn(
        `[historicalOtp] ${normalized} HTTP ${resp.status} error — fallback fired sampleSize=0 onTimeRate=0.750`,
      );
      const result = fallbackResult(normalized);
      cache.set(normalized, { result, fetchedAt: now });
      return result;
    }

    let payload: unknown = null;
    try {
      if (rawText) payload = JSON.parse(rawText);
    } catch {
      console.warn(
        `[historicalOtp] ${normalized} JSON parse failed — fallback fired sampleSize=0 onTimeRate=0.750`,
      );
      const result = fallbackResult(normalized);
      cache.set(normalized, { result, fetchedAt: now });
      return result;
    }

    let entries: any[] = [];
    if (Array.isArray(payload)) {
      entries = payload;
    } else if (payload && typeof payload === "object") {
      const obj = payload as Record<string, unknown>;
      if (Array.isArray(obj.flights)) entries = obj.flights as any[];
      else if (Array.isArray(obj.data)) entries = obj.data as any[];
    }

    const payloadKeys =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? Object.keys(payload as object).join(",")
        : Array.isArray(payload)
          ? "(array)"
          : typeof payload;
    console.log(
      `[historicalOtp] ${normalized} parsed entries=${entries.length} payload_shape=${payloadKeys}`,
    );

    if (entries.length === 0) {
      console.warn(
        `[historicalOtp] ${normalized} empty history — fallback fired sampleSize=0 onTimeRate=0.750` +
          ` (check: IATA vs ICAO carrier code, AeroDataBox coverage, response shape above)`,
      );
      const result = fallbackResult(normalized);
      cache.set(normalized, { result, fetchedAt: now });
      return result;
    }

    let total = 0;
    let onTime = 0;
    let delaySum = 0;
    let delayCount = 0;
    for (const entry of entries) {
      const cancelled = entryIsCancelled(entry);
      const delay = extractDelayMinutes(entry);
      total += 1;
      // On-time = not cancelled AND delay under 15 minutes.
      if (!cancelled && delay < 15) {
        onTime += 1;
      }
      if (delay > 0) {
        delaySum += delay;
        delayCount += 1;
      }
    }

    const sampleSize = total;
    const onTimeRate = sampleSize > 0 ? onTime / sampleSize : 0.75;
    const avgDelayMinutes = delayCount > 0 ? Math.round(delaySum / delayCount) : 0;
    const riskPoints = riskPointsFor(onTimeRate, sampleSize);

    const result: HistoricalOtpResult = {
      flightNumber: normalized,
      onTimeRate,
      avgDelayMinutes,
      sampleSize,
      riskPoints,
      source: "aerodatabox",
    };

    console.log(
      `[historicalOtp] ${normalized} real API response — sampleSize=${sampleSize} onTimeRate=${onTimeRate.toFixed(3)} avgDelay=${avgDelayMinutes} riskPoints=${riskPoints}`,
    );

    cache.set(normalized, { result, fetchedAt: now });
    return result;
  } catch (err: any) {
    console.warn(
      `[historicalOtp] ${normalized} fetch error — fallback fired sampleSize=0 onTimeRate=0.750 error=${err?.message ?? err}`,
    );
    const result = fallbackResult(normalized);
    cache.set(normalized, { result, fetchedAt: now });
    return result;
  } finally {
    clearTimeout(timer);
  }
}
