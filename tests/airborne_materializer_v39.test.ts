import { describe, it, expect } from "vitest";
import { materializeAirborne } from "../server/lib/disruption/airborneMaterializer_v39";

function rawRow(over: Record<string, unknown> = {}) {
  return {
    id: 1, flight_instance_id: "LEG1", flight_number: "123", carrier_iata: "UA",
    event_timestamp: new Date("2026-09-01T12:00:00Z"), loc_reported_utc: new Date("2026-09-01T12:00:00Z"),
    provider_published_utc: new Date("2026-09-01T12:00:00Z"), available_at: new Date("2026-09-01T12:00:01Z"),
    received_timestamp_utc: new Date("2026-09-01T12:00:02Z"), latitude: 33.94, longitude: -118.4,
    altitude_ft: 1000, ground_speed_kt: 300, true_track_deg: 90, vsi_fpm: 10, on_ground: false,
    flight_phase: "airborne_cruise", source_latency_seconds: 1, payload_sha256: "a".repeat(64), ...over,
  };
}

function fakeDb(initialRaw: any[], eligible = true) {
  const clean: any[] = [];
  const quarantine: any[] = [];
  const trajectories: any[] = [];
  const snapshots: any[] = [];
  let rawPageServed = false;
  return {
    clean, quarantine, trajectories, snapshots,
    query: async (text: string, params: unknown[] = []) => {
      if (/FROM clean\.raw_airborne_events ra\s+LEFT JOIN/.test(text)) {
        if (rawPageServed) return { rows: [], rowCount: 0 };
        rawPageServed = true;
        return { rows: initialRaw, rowCount: initialRaw.length };
      }
      if (/INSERT INTO clean\.airborne_quarantine/.test(text)) {
        quarantine.push({ raw_event_id: params[0], reason: params[2] }); return { rows: [], rowCount: 1 };
      }
      if (/INSERT INTO clean\.clean_airborne_points/.test(text)) {
        const source = initialRaw.find((r) => r.id === params[0]);
        clean.push({
          raw_event_id: params[0], flight_instance_id: params[2], event_timestamp: params[3],
          available_at: params[5], lat: params[7], lon: params[8], alt: params[9], phase: params[14],
          flight_number: source?.flight_number, carrier_iata: source?.carrier_iata,
          provider_published_utc: source?.provider_published_utc, received_timestamp_utc: source?.received_timestamp_utc,
          ground_speed_kt: source?.ground_speed_kt, true_track_deg: source?.true_track_deg, vsi_fpm: source?.vsi_fpm,
          on_ground: source?.on_ground,
        });
        return { rows: [], rowCount: 1 };
      }
      if (/SELECT DISTINCT flight_instance_id/.test(text)) {
        const ids = [...new Set(clean.map((c) => c.flight_instance_id))];
        return { rows: ids.map((flight_instance_id) => ({ flight_instance_id })), rowCount: ids.length };
      }
      if (/FROM clean\.clean_airborne_points cap\s+JOIN clean\.raw_airborne_events/.test(text)) {
        const rows = clean.filter((c) => c.flight_instance_id === params[0]).map((c) => ({
          raw_event_id: c.raw_event_id, t: c.event_timestamp, available_at: c.available_at, lat: c.lat, lon: c.lon, alt: c.alt,
          phase: c.phase, flight_number: c.flight_number, carrier_iata: c.carrier_iata,
          provider_published_utc: c.provider_published_utc, received_timestamp_utc: c.received_timestamp_utc,
          ground_speed_kt: c.ground_speed_kt, true_track_deg: c.true_track_deg, vsi_fpm: c.vsi_fpm, on_ground: c.on_ground,
        }));
        return { rows, rowCount: rows.length };
      }
      if (/FROM clean\.airborne_eligibility_evidence/.test(text)) return { rows: eligible ? [{ ok: 1 }] : [], rowCount: eligible ? 1 : 0 };
      if (/INSERT INTO clean\.flight_trajectory/.test(text)) { trajectories.push(params); return { rows: [], rowCount: 1 }; }
      if (/INSERT INTO clean\.flight_airborne_snapshots/.test(text)) { snapshots.push(params); return { rows: [], rowCount: 1 }; }
      return { rows: [], rowCount: 0 };
    },
  };
}
const CONFIG = { minUsablePoints: 1, completenessThresholdPct: null, configHash: "frozen-config-hash" };

describe("V3.9 AIRBORNE materializer", () => {
  it("uses canonical identity and independently verified eligibility", async () => {
    const db = fakeDb([rawRow()], true);
    const r = await materializeAirborne(null, db, CONFIG);
    expect(r.cleanWritten).toBe(1);
    expect(r.flightInstanceIds).toBe(1);
    expect(r.trajectories).toBe(1);
    expect(r.snapshots).toBe(1);
    expect(db.clean[0].flight_instance_id).toBe("LEG1");
  });

  it("a webhook point alone cannot define the AIRBORNE denominator", async () => {
    const db = fakeDb([rawRow()], false);
    const r = await materializeAirborne(null, db, CONFIG);
    expect(r.cleanWritten).toBe(1);
    expect(r.snapshots).toBe(0);
  });

  it("blocks snapshots until cadence/completeness config is frozen", async () => {
    const db = fakeDb([rawRow()], true);
    const r = await materializeAirborne(null, db, null);
    expect(r.trajectories).toBe(1);
    expect(r.snapshots).toBe(0);
  });

  it("durably quarantines impossible and unjoinable points", async () => {
    const db = fakeDb([rawRow({ id: 2, latitude: 95 }), rawRow({ id: 3, flight_instance_id: null })]);
    const r = await materializeAirborne(null, db, CONFIG);
    expect(r.cleanWritten).toBe(0);
    expect(r.quarantined).toBe(2);
    expect(db.quarantine.map((x) => x.reason)).toEqual(expect.arrayContaining(["IMPOSSIBLE_LATITUDE", "UNJOINABLE_IDENTITY"]));
  });

  it("builds each snapshot only from the prefix available by its cutoff", async () => {
    const db = fakeDb([
      rawRow({ id: 1, event_timestamp: new Date("2026-09-01T12:00:00Z"), available_at: new Date("2026-09-01T12:00:01Z") }),
      rawRow({ id: 2, event_timestamp: new Date("2026-09-01T12:10:00Z"), available_at: new Date("2026-09-01T12:10:01Z") }),
    ], true);
    const r = await materializeAirborne(null, db, CONFIG);
    expect(r.snapshots).toBe(2);
    // prediction_cutoff_utc is parameter 6; first row must use first availability, not a later now().
    expect((db.snapshots[0][6] as Date).toISOString()).toBe("2026-09-01T12:00:01.000Z");
    expect((db.snapshots[1][6] as Date).toISOString()).toBe("2026-09-01T12:10:01.000Z");
    // prefix hashes differ because the later snapshot may see the second point.
    expect(db.snapshots[0][18]).not.toBe(db.snapshots[1][18]);
  });
});
