import { randomUUID } from "crypto";
import type { MonitoredFlight } from "@shared/schema";
import { scoreFlightRisk } from "./riskScorer";

export interface AlternativeOption {
  flightNumber: string;
  carrierIata: string;
  carrierName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  price: string;
  riskScore: number;
  riskTier: string;
  selectionToken: string;
  offerData: any;
}

function extractIata(flightNumber: string): string {
  const m = (flightNumber || "").trim().match(/^([A-Z0-9]{2,3})\s+/);
  return m ? m[1] : "";
}

async function searchGoogleFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
}): Promise<any[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    console.warn("[alternatives] SERPAPI_KEY not set — skipping search");
    return [];
  }
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("departure_id", params.origin);
  url.searchParams.set("arrival_id", params.destination);
  url.searchParams.set("outbound_date", params.departureDate);
  url.searchParams.set("type", "2");
  url.searchParams.set("currency", "USD");
  url.searchParams.set("adults", "1");
  url.searchParams.set("travel_class", "1");
  url.searchParams.set("api_key", key);
  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) {
      console.warn(`[alternatives] SerpApi HTTP ${resp.status}`);
      return [];
    }
    const data: any = await resp.json();
    if (data.error) {
      console.warn("[alternatives] SerpApi error:", data.error);
      return [];
    }
    return [...(data.best_flights || []), ...(data.other_flights || [])];
  } catch (err: any) {
    console.warn("[alternatives] SerpApi fetch failed:", err?.message || err);
    return [];
  }
}

export async function findLowRiskAlternatives(
  flight: MonitoredFlight,
  count = 3,
): Promise<AlternativeOption[]> {
  console.log(
    `[alternatives] searching for ${flight.originIata}->${flight.destinationIata} on ${flight.departureDate}`,
  );

  let rawFlights: any[] = [];
  try {
    rawFlights = await searchGoogleFlights({
      origin: flight.originIata,
      destination: flight.destinationIata,
      departureDate: flight.departureDate,
    });
  } catch (err: any) {
    console.warn("[alternatives] search threw:", err?.message || err);
    return [];
  }

  if (!Array.isArray(rawFlights) || rawFlights.length === 0) {
    console.log("[alternatives] no candidates returned");
    return [];
  }

  const candidates = rawFlights.slice(0, 10);
  const scored: AlternativeOption[] = [];

  for (const candidate of candidates) {
    try {
      const legs: any[] = candidate.flights || [];
      if (legs.length === 0) continue;
      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];
      const flightNumberRaw = String(firstLeg.flight_number || "").trim();
      if (!flightNumberRaw) continue;
      const carrierIata = extractIata(flightNumberRaw) || String(firstLeg.airline || "").slice(0, 2).toUpperCase();
      const carrierName = String(firstLeg.airline || carrierIata || "");
      const compactFlightNumber = flightNumberRaw.replace(/\s+/g, "").toUpperCase();
      const departureTime = firstLeg.departure_airport?.time || "";
      const arrivalTime = lastLeg.arrival_airport?.time || "";
      const durationMinutes =
        typeof candidate.total_duration === "number"
          ? candidate.total_duration
          : legs.reduce((sum: number, l: any) => sum + (typeof l.duration === "number" ? l.duration : 0), 0);
      const stops = Math.max(0, legs.length - 1);
      const priceNum = typeof candidate.price === "number" ? candidate.price : 0;
      if (priceNum <= 0) continue;
      const price = `$${priceNum.toLocaleString()}`;

      // Skip identical flight (don't recommend the at-risk flight back).
      if (
        compactFlightNumber.toUpperCase() === flight.flightNumber.toUpperCase().replace(/\s+/g, "")
      ) {
        continue;
      }

      let depTimeOnly: string | null = null;
      const m = departureTime.match(/(\d{1,2}:\d{2})/);
      if (m) depTimeOnly = m[1];

      const result = await scoreFlightRisk({
        flightNumber: compactFlightNumber,
        carrierIata,
        departureDate: flight.departureDate,
        departureTime: depTimeOnly,
        originIata: flight.originIata,
        destinationIata: flight.destinationIata,
      });

      if (result.tier === "red") continue;

      scored.push({
        flightNumber: compactFlightNumber,
        carrierIata,
        carrierName,
        departureTime,
        arrivalTime,
        durationMinutes,
        stops,
        price,
        riskScore: result.score,
        riskTier: result.tier,
        selectionToken: randomUUID(),
        offerData: candidate,
      });
    } catch (err: any) {
      console.warn("[alternatives] candidate scoring failed (non-fatal):", err?.message || err);
    }
  }

  scored.sort((a, b) => a.riskScore - b.riskScore);
  const top = scored.slice(0, count);
  console.log(`[alternatives] returning ${top.length} low-risk options (of ${scored.length} green/amber scored)`);
  return top;
}
