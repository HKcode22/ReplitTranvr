import { sql } from "drizzle-orm";
import { db } from "../../db";

export interface CarrierHealthResult {
  carrierIata: string;
  cancellationRate24h: number;
  avgDelay24h: number;
  sampleSize: number;
  healthScore: number;
  reliable: boolean;
}

interface CacheEntry {
  result: CarrierHealthResult;
  fetchedAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function unknownResult(carrierIata: string): CarrierHealthResult {
  return {
    carrierIata,
    cancellationRate24h: 0,
    avgDelay24h: 0,
    sampleSize: 0,
    healthScore: 3,
    reliable: false,
  };
}

function computeHealthScore(
  sampleSize: number,
  cancellationRate24h: number,
  avgDelay24h: number,
): { healthScore: number; reliable: boolean } {
  if (sampleSize < 3) return { healthScore: 3, reliable: false };
  if (cancellationRate24h > 0.15 || avgDelay24h > 60) {
    return { healthScore: 10, reliable: true };
  }
  if (cancellationRate24h > 0.08 || avgDelay24h > 30) {
    return { healthScore: 7, reliable: true };
  }
  if (cancellationRate24h > 0.03 || avgDelay24h > 15) {
    return { healthScore: 4, reliable: true };
  }
  return { healthScore: 1, reliable: true };
}

export async function getCarrierHealth(carrierIata: string): Promise<CarrierHealthResult> {
  const code = (carrierIata || "").trim().toUpperCase();
  if (!code) return unknownResult(code);

  const now = Date.now();
  const cached = cache.get(code);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`[carrierHealth] cache hit ${code}`);
    return cached.result;
  }

  console.log(`[carrierHealth] computing ${code}`);

  try {
    const since = new Date(now - 24 * 60 * 60 * 1000);
    const rows = await db.execute<{
      actual_cancelled: boolean | null;
      actual_delay_minutes: number | null;
    }[]>(sql`
      SELECT rsh.actual_cancelled, rsh.actual_delay_minutes
      FROM (
        SELECT DISTINCT ON (rsh.monitored_flight_id)
          rsh.actual_cancelled, rsh.actual_delay_minutes,
          mf.carrier_iata
        FROM clean.risk_score_history_v2 rsh
        JOIN clean.monitored_flights_v2 mf ON mf.id = rsh.monitored_flight_id
        WHERE rsh.scored_at >= ${since}
        ORDER BY rsh.monitored_flight_id, rsh.scored_at DESC
      ) rsh
      WHERE UPPER(rsh.carrier_iata) = ${code}
    `);

    const sampleSize = rows.rows.length;
    let cancelledCount = 0;
    let delaySum = 0;
    let delayCount = 0;
    for (const row of rows.rows) {
      if (row.actual_cancelled) cancelledCount += 1;
      const d = typeof row.actual_delay_minutes === "number" ? row.actual_delay_minutes : null;
      if (d != null && d > 0) {
        delaySum += d;
        delayCount += 1;
      }
    }

    const cancellationRate24h = sampleSize > 0 ? cancelledCount / sampleSize : 0;
    const avgDelay24h = delayCount > 0 ? delaySum / delayCount : 0;
    const { healthScore, reliable } = computeHealthScore(
      sampleSize,
      cancellationRate24h,
      avgDelay24h,
    );

    const result: CarrierHealthResult = {
      carrierIata: code,
      cancellationRate24h,
      avgDelay24h,
      sampleSize,
      healthScore,
      reliable,
    };

    console.log(
      `[carrierHealth] ${code} sample=${sampleSize} cancelRate=${cancellationRate24h.toFixed(3)} avgDelay=${avgDelay24h.toFixed(1)} healthScore=${healthScore} reliable=${reliable}`,
    );

    cache.set(code, { result, fetchedAt: now });
    return result;
  } catch (err: any) {
    console.warn(`[carrierHealth] query failed for ${code}:`, err?.message || err);
    const result = unknownResult(code);
    cache.set(code, { result, fetchedAt: now });
    return result;
  }
}
