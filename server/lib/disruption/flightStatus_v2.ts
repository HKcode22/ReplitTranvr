// @ts-nocheck
// ============================================================================
// PRESERVED FROM server2 (v2 risk/monitor/polling pipeline) - NOT ACTIVE.
// DISABLED 2026-08-06: polling pipeline SHUT DOWN; moving to webhooks.
// Reference copy only - do NOT wire this file in.
// Diff against server/lib/disruption/flightStatus.ts (original).
// ============================================================================
import { aerodataboxFetch } from "./aerodataboxLimiter";

export interface FlightStatusResult {
  flightNumber: string;
  status: string;
  delayMinutes: number;
  inboundDelayMinutes: number;
  departureTime: string | null;
  cancelled: boolean;
  tailNumber: string | null;
  equipmentType: string | null;
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

function extractTime(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.utc || val.local || undefined;
  return undefined;
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

function pickBestFlight(
  results: any[],
  originIata?: string,
  destinationIata?: string,
): any {
  if (!results || results.length === 0) return {};

  // Narrow to legs whose origin (and destination, if provided) match the
  // monitored flight. AeroDataBox sometimes returns multiple unrelated legs
  // for the same number (e.g. AA4551 = DCA→JFK regional AND ORD→LGA), and
  // without this filter the scorer can lock onto the wrong leg.
  let pool = results;
  if (originIata) {
    const origUpper = originIata.toUpperCase();
    const destUpper = destinationIata ? destinationIata.toUpperCase() : null;
    const filtered = results.filter((f: any) => {
      const fOrig = String(f.departure?.airport?.iata || "").toUpperCase();
      if (fOrig !== origUpper) return false;
      if (destUpper) {
        const fDest = String(f.arrival?.airport?.iata || "").toUpperCase();
        if (fDest !== destUpper) return false;
      }
      return true;
    });
    if (filtered.length > 0) pool = filtered;
  }

  if (pool.length === 1) return pool[0];

  const now = Date.now();
  const scored = pool.map((f: any) => {
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
}

async function fetchFlightsByNumber(
  flightNumberPath: string,
  date: string,
  apiKey: string,
): Promise<any[] | null> {
  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(
    flightNumberPath,
  )}/${encodeURIComponent(date)}`;
  console.log(`[flightStatus] number lookup "${flightNumberPath}" ${date}`);
  try {
    const resp = await aerodataboxFetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
      },
    });
    if (!resp.ok) {
      console.warn(`[flightStatus] HTTP ${resp.status} for "${flightNumberPath}" ${date}`);
      return null;
    }
    const raw: any = await resp.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return raw;
  } catch (err: any) {
    console.warn(
      `[flightStatus] number lookup failed for "${flightNumberPath}" ${date}:`,
      err?.message || err,
    );
    return null;
  }
}

// FIDS fallback: list all departures from the origin airport on `date` and
// find one whose flight number matches. Useful for codeshare flights that
// the by-number endpoint cannot resolve (e.g., AA4551).
async function fetchFlightFromFids(
  normalizedFlight: string,
  originIata: string,
  date: string,
  apiKey: string,
  destinationIata?: string,
): Promise<any | null> {
  const headers = {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
  };
  const buildUrl = (fromTime: string, toTime: string) =>
    `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${encodeURIComponent(
      originIata,
    )}/${date}T${fromTime}/${date}T${toTime}?direction=Departure&withLeg=true&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false`;
  console.log(`[flightStatus] FIDS fallback ${originIata} ${date} for ${normalizedFlight}`);
  try {
    const [respAm, respPm] = await Promise.all([
      aerodataboxFetch(buildUrl("00:00", "11:59"), { headers }),
      aerodataboxFetch(buildUrl("12:00", "23:59"), { headers }),
    ]);
    const parseDepartures = async (resp: Response): Promise<any[]> => {
      if (!resp.ok) return [];
      try {
        const raw: any = await resp.json();
        if (!raw) return [];
        if (raw.departures && Array.isArray(raw.departures)) return raw.departures;
        if (Array.isArray(raw)) return raw;
        return [];
      } catch {
        return [];
      }
    };
    const [depAm, depPm] = await Promise.all([parseDepartures(respAm), parseDepartures(respPm)]);
    const departures = [...depAm, ...depPm];
    if (departures.length === 0) return null;
    const matches = departures.filter((f: any) => {
      const num = String(f.number || f.iata || f.flightNumber || "")
        .replace(/\s+/g, "")
        .toUpperCase();
      if (num === normalizedFlight) return true;
      // Also check codeshare list, where the operating number may differ
      const codeshares = Array.isArray(f.codeshareStatus?.codeshares)
        ? f.codeshareStatus.codeshares
        : Array.isArray(f.codeshares)
          ? f.codeshares
          : [];
      return codeshares.some(
        (cs: any) =>
          String(cs?.number || cs?.iata || "")
            .replace(/\s+/g, "")
            .toUpperCase() === normalizedFlight,
      );
    });
    if (matches.length === 0) {
      console.log(
        `[flightStatus] FIDS fallback found no match for ${normalizedFlight} among ${departures.length} departures`,
      );
      return null;
    }
    return pickBestFlight(matches, originIata, destinationIata);
  } catch (err: any) {
    console.warn(
      `[flightStatus] FIDS fallback failed for ${normalizedFlight} ${originIata} ${date}:`,
      err?.message || err,
    );
    return null;
  }
}

export async function getFlightStatus(
  flightNumber: string,
  date: string,
  originIata?: string,
  destinationIata?: string,
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

  // Primary: compact form e.g. "AA4551"
  let raw = await fetchFlightsByNumber(normalizedFlight, date, apiKey);

  // Fallback 1: spaced form e.g. "AA 4551" — AeroDataBox sometimes only
  // resolves codeshare flights when the carrier code and number are
  // separated by a space.
  if (!raw || raw.length === 0) {
    const spaced = normalizedFlight.replace(/^([A-Z]{2,3})(\d+)$/, "$1 $2");
    if (spaced !== normalizedFlight) {
      raw = await fetchFlightsByNumber(spaced, date, apiKey);
    }
  }

  let flight: any = null;
  if (raw && raw.length > 0) {
    flight = pickBestFlight(raw, originIata, destinationIata);
  } else if (originIata) {
    // Fallback 2: FIDS departures from the origin airport on this date.
    flight = await fetchFlightFromFids(
      normalizedFlight,
      originIata.toUpperCase(),
      date,
      apiKey,
      destinationIata,
    );
  }

  if (!flight) {
    console.log(`[flightStatus] no result for ${normalizedFlight} ${date}`);
    return null;
  }

  const status = normalizeStatus(flight.status);
  const cancelled = status === "Cancelled" || flight.isCancelled === true;
  const departure = flight.departure || {};
  console.log(`[flightStatus] ${normalizedFlight} dep keys:`, Object.keys(departure).join(","));
  try { console.log(`[flightStatus] ${normalizedFlight} dep RAW:`, JSON.stringify(departure, (_k, v) => typeof v === "object" ? v : v)); } catch {}
  const depRaw = {...departure, actualTime: extractTime(departure?.actualTime), revisedTime: extractTime(departure?.revisedTime), runwayTime: extractTime(departure?.runwayTime), scheduledTime: extractTime(departure?.scheduledTime)};
  console.log(`[flightStatus] ${normalizedFlight} dep extracted:`, JSON.stringify(depRaw));
  let departureDelay = safeNumber(
    departure?.delayMinutes ??
      departure?.delay?.minutes ??
      departure?.delay?.departure ??
      departure?.runwayDelayMinutes ??
      departure?.delay ??
      null,
  );
  const depSched = extractTime(departure?.scheduledTime);
  if ((!departureDelay || departureDelay === 0) && depSched) {
    const scheduled = new Date(depSched).getTime();
    if (!isNaN(scheduled)) {
      const timeFields: { key: string; val: string | undefined }[] = [
        { key: "actualTime", val: extractTime(departure?.actualTime) },
        { key: "revisedTime", val: extractTime(departure?.revisedTime) },
        { key: "runwayTime", val: extractTime(departure?.runwayTime) },
      ];
      for (const { key, val } of timeFields) {
        if (!val) continue;
        const t = new Date(val).getTime();
        if (isNaN(t)) continue;
        const computed = Math.round((t - scheduled) / 60000);
        if (computed > 0) {
          console.log(`[flightStatus] computed delay from ${key}: ${computed}min for ${normalizedFlight}`);
          departureDelay = computed;
          break;
        }
      }
    }
  }
  departureDelay = safeNumber(departureDelay);
  const arrival = flight.arrival || {};
  // ORIGINAL (buggy — checked object before scalar):
  // const inboundDelay = safeNumber(
  //   arrival?.delay?.arrival ??
  //     arrival?.delay ??
  //     arrival?.runwayDelayMinutes ??
  //     0,
  // );
  let inboundDelay = safeNumber(
    arrival?.delayMinutes ??
      arrival?.delay?.minutes ??
      arrival?.delay?.arrival ??
      arrival?.runwayDelayMinutes ??
      arrival?.delay ??
      null,
  );
  const arrSched = extractTime(arrival?.scheduledTime);
  if ((!inboundDelay || inboundDelay === 0) && arrSched) {
    const scheduled = new Date(arrSched).getTime();
    if (!isNaN(scheduled)) {
      const timeFields: { key: string; val: string | undefined }[] = [
        { key: "actualTime", val: extractTime(arrival?.actualTime) },
        { key: "revisedTime", val: extractTime(arrival?.revisedTime) },
        { key: "runwayTime", val: extractTime(arrival?.runwayTime) },
      ];
      for (const { key, val } of timeFields) {
        if (!val) continue;
        const t = new Date(val).getTime();
        if (isNaN(t)) continue;
        const computed = Math.round((t - scheduled) / 60000);
        if (computed > 0) {
          console.log(`[flightStatus] computed inbound delay from ${key}: ${computed}min for ${normalizedFlight}`);
          inboundDelay = computed;
          break;
        }
      }
    }
  }
  inboundDelay = safeNumber(inboundDelay);
  const departureTime: string | null =
    extractTime(departure?.actualTime) ||
    extractTime(departure?.scheduledTime) ||
    extractTime(departure?.revisedTime) ||
    null;

  const tailNumber: string | null = flight.aircraft?.reg ?? null;
  const equipmentType: string | null = flight.aircraft?.model ?? null;

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
    tailNumber,
    equipmentType,
    raw: flight,
  };
}
