/**
 * AIRBORNE production materializer tests (0G / gptP0analyze4 #8).
 * Offline fake pool; no DB/provider.
 */
import { describe, it, expect } from "vitest";
import { materializeAirborne } from "../server/lib/disruption/airborneMaterializer_v39";

/** In-memory tables driven by a routing fake pool. */
function fakeDb(initialRaw: unknown[]) {
  const clean: any[] = [];
  const trajectories: any[] = [];
  const snapshots: any[] = [];
  const routes: Record<string, (params: unknown[]) => { rows: any[]; rowCount: number | null }> = {
    readRaw: () => ({ rows: initialRaw, rowCount: initialRaw.length }),
    flights: () => {
      const counts = new Map<string, number>();
      for (const c of clean) counts.set(c.flight_instance_id, (counts.get(c.flight_instance_id) ?? 0) + 1);
      return { rows: Array.from(counts).map(([flight_instance_id, n]) => ({ flight_instance_id, n })), rowCount: counts.size };
    },
    points: (p) => ({ rows: clean.filter((c) => c.flight_instance_id === p[0]), rowCount: 0 }),
    info: (p) => ({ rows: clean.filter((c) => c.flight_instance_id === p[0]).slice(0, 1), rowCount: 0 }),
  };
  return {
    clean,
    query: async (text: string, params: unknown[] = []) => {
      if (/FROM clean\.raw_airborne_events/.test(text)) return routes.readRaw(params);
      if (/GROUP BY flight_instance_id/.test(text)) return routes.flights();
      if (/SELECT event_timestamp AS t/.test(text)) return routes.points(params);
      if (/LIMIT 1/.test(text)) return routes.info(params);
      if (/INSERT INTO clean\.clean_airborne_points/.test(text)) {
        clean.push({
          flight_instance_id: params[2], event_timestamp: params[3], latitude: params[7], qc_flag: params[15],
        });
        return { rows: [], rowCount: 1 };
      }
      if (/INSERT INTO clean\.flight_trajectory/.test(text)) { trajectories.push(params); return { rows: [], rowCount: 1 }; }
      if (/INSERT INTO clean\.flight_airborne_snapshots/.test(text)) { snapshots.push(params); return { rows: [], rowCount: 1 }; }
      return { rows: [], rowCount: 0 };
    },
    snapshots,
    trajectories,
  };
}

function rawRow(over: Record<string, unknown> = {}) {
  return {
    id: 1, flight_instance_id: "UA123_KLAX_KSFO_20260901_ab12cd34",
    flight_number: "123", carrier_iata: "UA", event_timestamp: new Date("2026-09-01T12:00:00Z"),
    loc_reported_utc: new Date("2026-09-01T12:00:00Z"), provider_published_utc: null,
    available_at: new Date("2026-09-01T12:00:01Z"), received_timestamp_utc: new Date("2026-09-01T12:00:02Z"),
    latitude: 33.94, longitude: -118.4, altitude_ft: 1000, ground_speed_kt: 300,
    true_track_deg: 90, vsi_fpm: 10, on_ground: false, flight_phase: "airborne_cruise",
    source_latency_seconds: 1, payload_sha256: null, batch_id: null, subscription_id: null, ingest_event_id: null,
    ...over,
  };
}

describe("materializeAirborne (0G)", () => {
  it("writes clean points keyed by canonical flight_instance_id and builds trajectory+snapshots", async () => {
    const db = fakeDb([rawRow()]);
    const result = await materializeAirborne(null, db);
    expect(result.rawRead).toBe(1);
    expect(result.cleanWritten).toBe(1);
    expect(result.cleanSkipped).toBe(0);
    expect(result.flightInstanceIds).toBe(1);
    expect(result.trajectories).toBe(1);
    expect(result.snapshots).toBeGreaterThanOrEqual(1);
    // canonical identity preserved through the chain, never just flight_key
    expect(db.clean[0].flight_instance_id).toBe("UA123_KLAX_KSFO_20260901_ab12cd34");
  });

  it("quarantines points with impossible coordinates (QC flag), no trajectory", async () => {
    const db = fakeDb([rawRow({ id: 2, latitude: 95, longitude: -118.4 })]);
    const result = await materializeAirborne(null, db);
    // impossible point is skipped from clean → no trajectory/snapshot
    expect(result.cleanWritten).toBe(0);
    expect(result.cleanSkipped).toBe(1);
    expect(result.flightInstanceIds).toBe(0);
    expect(result.trajectories).toBe(0);
    expect(result.snapshots).toBe(0);
  });

  it("raw rows without a canonical identity produce no trajectory or snapshot", async () => {
    // A null-instance point is inserted but the trajectory/snapshot stages
    // guard empty point sets, so nothing is produced downstream.
    const db = fakeDb([rawRow({ id: 3, flight_instance_id: null })]);
    const result = await materializeAirborne(null, db);
    expect(result.rawRead).toBe(1);
    expect(result.trajectories).toBe(0);
    expect(result.snapshots).toBe(0);
  });
});