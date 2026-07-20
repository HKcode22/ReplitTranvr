import { and, eq, lte, ne } from "drizzle-orm";
import { db } from "../../db";
import { agencyAccounts, monitoredFlights } from "@shared/schema";
import { aerodataboxFetch } from "./aerodataboxLimiter";
import { hashAgencyPassword } from "../agencyAuth";

const SEED_AIRPORTS = ["DFW", "ORD", "ATL", "JFK", "LAX", "BOS"] as const;

// Four time-of-day buckets so the scoring engine sees flights across all
// hour-of-day ranges, exercising every time-of-day signal bucket.
const TIME_BUCKETS = [
  { label: "morning",   from: "06:00", to: "10:59", take: 3 },
  { label: "midday",    from: "11:00", to: "14:59", take: 3 },
  { label: "afternoon", from: "15:00", to: "18:59", take: 3 },
  { label: "evening",   from: "19:00", to: "23:59", take: 3 },
] as const;

let seederHandle: NodeJS.Timeout | null = null;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ORIGINAL (no retry — kept as comment for reference):
// async function fetchWindow(...): Promise<any[]> {
//   ... makes 1 API call, returns [] on any failure ...
// }
// REPLACED WITH: single-call + specific error logging (zero extra API cost).
// No retry loop — if a bucket fails, it fails once to avoid burning quota.
async function fetchWindow(
  airport: string,
  date: string,
  fromTime: string,
  toTime: string,
  apiKey: string,
): Promise<any[]> {
  const url =
    `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${encodeURIComponent(airport)}` +
    `/${date}T${fromTime}/${date}T${toTime}` +
    `?direction=Departure&withLeg=true&withCancelled=false&withCodeshared=false&withCargo=false&withPrivate=false`;
  try {
    const resp = await aerodataboxFetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
      },
    });
    if (!resp.ok) {
      if (resp.status === 429) {
        console.warn(`[seeder] HTTP 429 (rate limited) for ${airport} ${fromTime}-${toTime} — skipped to save quota`);
      } else if (resp.status === 401 || resp.status === 403) {
        console.warn(`[seeder] HTTP ${resp.status} (auth error) for ${airport} ${fromTime}-${toTime} — API key may be invalid`);
      } else {
        console.warn(`[seeder] HTTP ${resp.status} for ${airport} ${fromTime}-${toTime}`);
      }
      return [];
    }
    const raw: any = await resp.json();
    if (!raw) return [];
    if (raw.departures && Array.isArray(raw.departures)) return raw.departures;
    if (Array.isArray(raw)) return raw;
    return [];
  } catch (err: any) {
    console.warn(`[seeder] fetch failed ${airport} ${fromTime}-${toTime}: ${err?.message || err}`);
    return [];
  }
}

function extractFlight(
  raw: any,
  originIata: string,
): { flightNumber: string; carrierIata: string; destinationIata: string; departureTime: string | null } | null {
  const rawNum = String(raw.number || raw.iata || raw.flightNumber || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (!rawNum) return null;

  const carrierMatch = rawNum.match(/^([A-Z]{2,3})\d/);
  if (!carrierMatch) return null;
  const carrierIata = carrierMatch[1];

  const destIata = String(raw.arrival?.airport?.iata || "").toUpperCase();
  if (!destIata || destIata === originIata) return null;

  const rawTime =
    raw.departure?.scheduledTime?.local ||
    raw.departure?.scheduledTime?.utc ||
    null;
  let departureTime: string | null = null;
  if (rawTime) {
    const m = String(rawTime).match(/(\d{2}:\d{2})/);
    if (m) departureTime = m[1];
  }

  return { flightNumber: rawNum, carrierIata, destinationIata: destIata, departureTime };
}

// Pick `n` items evenly spaced across `arr` rather than just the first `n`.
function selectSpread<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.floor(i * step + step / 2)]);
  }
  return out;
}

async function getOrCreateTestAgency(): Promise<number> {
  const rows = await db
    .select({ id: agencyAccounts.id })
    .from(agencyAccounts)
    .where(eq(agencyAccounts.name, "Travnr Test"))
    .limit(1);

  if (rows.length > 0) return rows[0].id;

  const testPassword = process.env.TEST_AGENCY_PASSWORD || "travnr-test-2024";
  const hashed = await hashAgencyPassword(testPassword);
  const [created] = await db
    .insert(agencyAccounts)
    .values({
      name: "Travnr Test",
      contactEmail: "test-seeder@travnr.internal",
      contactName: "Test Seeder",
      password: hashed,
    })
    .returning({ id: agencyAccounts.id });

  console.log(`[seeder] created Travnr Test agency id=${created.id}`);
  return created.id;
}

async function seedAirport(
  airport: string,
  date: string,
  testAgencyId: number,
  apiKey: string,
): Promise<number> {
  let inserted = 0;

  for (const bucket of TIME_BUCKETS) {
    const departures = await fetchWindow(airport, date, bucket.from, bucket.to, apiKey);
    const selected = selectSpread(departures, bucket.take);

    for (const raw of selected) {
      const flight = extractFlight(raw, airport);
      if (!flight) continue;

      const existing = await db
        .select({ id: monitoredFlights.id })
        .from(monitoredFlights)
        .where(
          and(
            eq(monitoredFlights.flightNumber, flight.flightNumber),
            eq(monitoredFlights.departureDate, date),
          ),
        )
        .limit(1);

      if (existing.length > 0) continue;

      await db.insert(monitoredFlights).values({
        agencyId: testAgencyId,
        flightNumber: flight.flightNumber,
        carrierIata: flight.carrierIata,
        departureDate: date,
        departureTime: flight.departureTime,
        originIata: airport,
        destinationIata: flight.destinationIata,
        isTest: true,
      });
      inserted++;
    }
  }

  return inserted;
}

async function archiveOldTestFlights(): Promise<number> {
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const archived = await db
    .update(monitoredFlights)
    .set({ status: "archived" })
    .where(
      and(
        eq(monitoredFlights.isTest, true),
        lte(monitoredFlights.departureDate, cutoff),
        ne(monitoredFlights.status, "archived"),
      ),
    )
    .returning({ id: monitoredFlights.id });
  return archived.length;
}

export async function runTestFlightSeeder(): Promise<void> {
  const apiKey = process.env.AERODATABOX_API_KEY;
  if (!apiKey) {
    console.log("[seeder] AERODATABOX_API_KEY not set — skipping test flight seeder");
    return;
  }

  const date = todayIso();
  console.log(`[seeder] starting for ${date}`);

  try {
    const testAgencyId = await getOrCreateTestAgency();

    const counts = await Promise.all(
      SEED_AIRPORTS.map(async (airport) => {
        const n = await seedAirport(airport, date, testAgencyId, apiKey);
        console.log(`[seeder] ${airport}: inserted ${n} flights`);
        return n;
      }),
    );

    const total = counts.reduce((a, b) => a + b, 0);
    console.log(`[seeder] total inserted: ${total}`);

    const archived = await archiveOldTestFlights();
    console.log(`[seeder] archived ${archived} old test flights`);
  } catch (err: any) {
    console.error("[seeder] run failed:", err?.message || err);
  }
}

function scheduleNextRun(): void {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(6, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  const delayMs = next.getTime() - now.getTime();
  console.log(
    `[seeder] next run at ${next.toISOString()} (in ${Math.round(delayMs / 60_000)} min)`,
  );
  seederHandle = setTimeout(() => {
    runTestFlightSeeder().catch((err) => {
      console.error("[seeder] unhandled error:", err?.message || err);
    });
    scheduleNextRun();
  }, delayMs);
}

export function startTestFlightSeeder(): void {
  if (seederHandle) {
    console.log("[seeder] already scheduled — skipping");
    return;
  }
  // Run immediately on startup so today's test flights are always present
  // regardless of when the server last restarted. The dedup check inside
  // runTestFlightSeeder prevents double-inserts.
  runTestFlightSeeder().catch((err) => {
    console.error("[seeder] startup run failed:", err?.message || err);
  });
  scheduleNextRun();
}
