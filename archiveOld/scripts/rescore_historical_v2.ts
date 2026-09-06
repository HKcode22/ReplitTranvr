// @ts-nocheck
// ============================================================================
// PRESERVED FROM server2 (v2 risk/monitor/polling pipeline) - NOT ACTIVE.
// DISABLED 2026-08-06: historical v2 rescoring script SHUT DOWN. Do NOT run.
// Reference copy only. (server2-only file.)
// ============================================================================
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { getFlightStatus } from "../lib/disruption/flightStatus";
import { getAirportWeather } from "../lib/disruption/weatherSignal";
import { getNasStatus } from "../lib/disruption/nasStatus";
import { getCarrierHealth } from "../lib/disruption/carrierHealth";
import { scoreFlightRisk } from "../lib/disruption/riskScorer";
import { writeScoreToV2, updateFlightInV2 } from "../lib/disruption/v2Writer";

interface FlightToRescore {
  id: number;
  flight_number: string;
  carrier_iata: string;
  departure_date: string;
  departure_time: string | null;
  origin_iata: string;
  destination_iata: string;
  is_test: boolean;
  agency_id: number;
}

async function getFlightsWithoutRealDelay(): Promise<FlightToRescore[]> {
  const result = await db.execute<FlightToRescore[]>(sql`
    SELECT DISTINCT ON (mf.id)
      mf.id,
      mf.flight_number,
      mf.carrier_iata,
      mf.departure_date,
      mf.departure_time,
      mf.origin_iata,
      mf.destination_iata,
      mf.is_test,
      mf.agency_id
    FROM clean.monitored_flights_v2 mf
    JOIN clean.risk_score_history_v2 rsh ON rsh.monitored_flight_id = mf.id
    WHERE rsh.actual_delay_minutes IS NULL OR rsh.actual_delay_minutes = 0
    ORDER BY mf.id, rsh.scored_at DESC
  `);
  return result.rows as any;
}

async function getFlightsWithActualStatus(): Promise<FlightToRescore[]> {
  const result = await db.execute<FlightToRescore[]>(sql`
    SELECT DISTINCT ON (mf.id)
      mf.id,
      mf.flight_number,
      mf.carrier_iata,
      mf.departure_date,
      mf.departure_time,
      mf.origin_iata,
      mf.destination_iata,
      mf.is_test,
      mf.agency_id
    FROM clean.monitored_flights_v2 mf
    WHERE mf.status = 'archived'
       OR mf.resolved_status IS NOT NULL
    ORDER BY mf.id
  `);
  return result.rows as any;
}

async function rescoreFlight(flight: FlightToRescore): Promise<void> {
  const flightInput = {
    flightNumber: flight.flight_number,
    carrierIata: flight.carrier_iata,
    departureDate: flight.departure_date,
    departureTime: flight.departure_time || null,
    originIata: flight.origin_iata,
    destinationIata: flight.destination_iata,
    forceRefreshNas: true,
  };

  try {
    const risk = await scoreFlightRisk(flightInput);

    if (!risk.flightStatus) {
      console.warn(`[rescore] SKIP ${flight.flight_number} ${flight.departure_date} — no flight status from API (likely rate limited)`);
      return;
    }

    const flightForWriter = {
      id: flight.id,
      flightNumber: flight.flight_number,
      carrierIata: flight.carrier_iata,
      departureDate: flight.departure_date,
      departureTime: flight.departure_time || null,
      originIata: flight.origin_iata,
      destinationIata: flight.destination_iata,
      isTest: flight.is_test,
      agencyId: flight.agency_id,
    };

    await writeScoreToV2(flightForWriter, risk, new Date());

    if (risk.flightStatus) {
      await updateFlightInV2(
        { id: flight.id, flightNumber: flight.flight_number },
        {
          riskScore: risk.score,
          riskTier: risk.tier,
          lastCheckedAt: new Date(),
          departureTime: risk.flightStatus.departureTime ?? flight.departure_time ?? null,
          tailNumber: risk.flightStatus.tailNumber ?? null,
          equipmentType: risk.flightStatus.equipmentType ?? null,
        },
      );
    }
  } catch (err: any) {
    console.warn(`[rescore] FAILED ${flight.flight_number}: ${err?.message || err}`);
  }
}

// Simple inline concurrency limiter — no external deps needed
async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      const item = items[i];
      if (i % 50 === 0 || i === items.length - 1) {
        console.log(`[rescore] progress: ${i + 1}/${items.length}`);
      }
      results[i] = await fn(item, i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const mode = process.argv[2] || "archived-only";
  const concurrency = parseInt(process.env.RESCORE_CONCURRENCY || "5", 10);

  let flights: FlightToRescore[];
  if (mode === "all") {
    flights = await getFlightsWithoutRealDelay();
    console.log(`[rescore] Found ${flights.length} flights to rescore (all-zero-delay, concurrency=${concurrency})`);
  } else {
    flights = await getFlightsWithActualStatus();
    console.log(`[rescore] Found ${flights.length} archived/resolved flights to rescore (concurrency=${concurrency})`);
  }

  await mapConcurrent(flights, (f) => rescoreFlight(f), concurrency);

  console.log("[rescore] Done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[rescore] Fatal:", err);
  process.exit(1);
});
