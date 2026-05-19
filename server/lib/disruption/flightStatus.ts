export interface FlightStatusResult {
  flightNumber: string;
  status: string;
  delayMinutes: number;
  inboundDelayMinutes: number;
  departureTime: string | null;
  cancelled: boolean;
  raw: any;
}

function safeNumber(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeStatus(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "Unknown";
  const s = raw.trim();
  const map: Record<string, string> = {
    Expected: "Scheduled",
    Diverted: "Delayed",
    CanceledUncertain: "Cancelled",
    Canceled: "Cancelled",
    Cancelled: "Cancelled",
    Arrived: "Arrived",
    EnRoute: "EnRoute",
    Departed: "Departed",
    Scheduled: "Scheduled",
    Delayed: "Delayed",
    Unknown: "Unknown",
  };
  return map[s] || s;
}

export async function getFlightStatus(
  flightNumber: string,
  date: string,
): Promise<FlightStatusResult | null> {
  const apiKey = process.env.AERODATABOX_API_KEY;
  if (!apiKey) {
    console.warn("[flightStatus] AERODATABOX_API_KEY not set — skipping flight status lookup");
    return null;
  }

  const normalizedFlight = (flightNumber || "").replace(/\s+/g, "").toUpperCase();
  if (!normalizedFlight) {
    console.warn("[flightStatus] empty flight number — skipping");
    return null;
  }

  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(
    normalizedFlight,
  )}/${encodeURIComponent(date)}`;

  console.log(`[flightStatus] fetching ${normalizedFlight} ${date}`);
  console.log(`[flightStatus] url=${url} apiKeyPresent=${Boolean(apiKey)}`);

  try {
    const resp = await fetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
      },
    });
    if (!resp.ok) {
      console.warn(`[flightStatus] HTTP ${resp.status} for ${normalizedFlight} ${date}`);
      return null;
    }
    const raw: any = await resp.json();
    if (!Array.isArray(raw) || raw.length === 0) {
      console.log(`[flightStatus] empty response for ${normalizedFlight} ${date}`);
      return null;
    }
    const now = Date.now();

    const pickBestFlight = (results: any[]): any => {
      if (!results || results.length === 0) return {};
      if (results.length === 1) return results[0];

      const scored = results.map((f: any) => {
        const dep =
          f.departure?.scheduledTime?.utc ||
          f.departure?.revisedTime?.utc ||
          f.departure?.actualTime?.utc ||
          null;

        const depMs = dep ? new Date(dep).getTime() : null;
        const status = String(f.status || "").toLowerCase();
        const cancelled = status.includes("cancel");

        let score = 0;

        if (depMs !== null) {
          const diffHours = (depMs - now) / 3_600_000;
          if (diffHours > 0) {
            // Future flight — strongly prefer, favour soonest
            score = 1000 - Math.min(diffHours, 48) * 10;
          } else if (diffHours > -3) {
            // Departed within last 3 hours — still relevant (could be en route)
            score = 500 + diffHours * 50;
          } else {
            // Departed more than 3 hours ago — likely a completed earlier leg
            score = 100 + diffHours;
          }
        }

        // Never prefer a cancelled leg over an active one
        if (cancelled) score -= 200;

        return { flight: f, score };
      });

      scored.sort((a: any, b: any) => b.score - a.score);
      return scored[0].flight;
    };

    const flight = pickBestFlight(raw);
    const status = normalizeStatus(flight.status);
    const cancelled = status === "Cancelled" || flight.isCancelled === true;
    const departure = flight.departure || {};
    const departureDelay = safeNumber(
      departure?.delay?.departure ??
        departure?.delay ??
        departure?.runwayDelayMinutes ??
        0,
    );
    const arrival = flight.arrival || {};
    const inboundDelay = safeNumber(
      arrival?.delay?.arrival ??
        arrival?.delay ??
        arrival?.runwayDelayMinutes ??
        0,
    );
    const departureTime: string | null =
      departure?.actualTime?.utc ||
      departure?.actualTime?.local ||
      departure?.scheduledTime?.utc ||
      departure?.scheduledTime?.local ||
      departure?.revisedTime?.utc ||
      null;

    console.log(
      `[flightStatus] ${normalizedFlight} ${date} status=${status} dep_delay=${departureDelay} inbound_delay=${inboundDelay} cancelled=${cancelled}`,
    );

    return {
      flightNumber: normalizedFlight,
      status,
      delayMinutes: departureDelay,
      inboundDelayMinutes: inboundDelay,
      departureTime,
      cancelled,
      raw: flight,
    };
  } catch (err: any) {
    console.warn(
      `[flightStatus] request failed for ${normalizedFlight} ${date}:`,
      err?.message || err,
    );
    return null;
  }
}
