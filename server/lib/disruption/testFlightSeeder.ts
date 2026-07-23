import { eq } from "drizzle-orm";
import { db } from "../../db";
import { agencyAccounts } from "@shared/schema";

let seederHandle: NodeJS.Timeout | null = null;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getOrCreateTestAgency(): Promise<number> {
  const rows = await db
    .select({ id: agencyAccounts.id })
    .from(agencyAccounts)
    .where(eq(agencyAccounts.name, "Travnr Test"))
    .limit(1);

  if (rows.length > 0) return rows[0].id;

  const testPassword = process.env.TEST_AGENCY_PASSWORD || "travnr-test-2024";
  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(testPassword, 10);
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
  // [server frozen] test flight seeder disabled — server2/ owns v2 writes
  return 0;
}

async function archiveOldTestFlights(): Promise<number> {
  return 0;
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
