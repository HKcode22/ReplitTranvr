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
  console.log(`[rescore] ${flight.flight_number} ${flight.departure_date} ${flight.origin_iata}->${flight.destination_iata}`);

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

    console.log(`[rescore] OK ${flight.flight_number} score=${risk.score} tier=${risk.tier} delay=${risk.flightStatus?.delayMinutes ?? "null"}`);
  } catch (err: any) {
    console.warn(`[rescore] FAILED ${flight.flight_number}: ${err?.message || err}`);
  }
}

async function main() {
  const mode = process.argv[2] || "archived-only";

  let flights: FlightToRescore[];
  if (mode === "all") {
    flights = await getFlightsWithoutRealDelay();
    console.log(`[rescore] Found ${flights.length} flights to rescore (all-zero-delay)`);
  } else {
    flights = await getFlightsWithActualStatus();
    console.log(`[rescore] Found ${flights.length} archived/resolved flights to rescore`);
  }

  const delay = parseInt(process.env.RESCORE_DELAY_MS || "2000", 10);

  for (let i = 0; i < flights.length; i++) {
    const f = flights[i];
    console.log(`[rescore] [${i + 1}/${flights.length}] ${f.flight_number} ${f.departure_date}`);
    await rescoreFlight(f);
    if (i < flights.length - 1 && delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  console.log("[rescore] Done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[rescore] Fatal:", err);
  process.exit(1);
});
