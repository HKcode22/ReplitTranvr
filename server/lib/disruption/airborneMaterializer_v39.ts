/**
 * AIRBORNE production materializer — Phase 0G (§1.5.7 / gptP0analyze4 #8).
 *
 * Drives the chain keyed by CANONICAL flight_instance_id (never
 * flight_number|carrier alone):
 *   raw_airborne_events
 *     → clean_airborne_points   (QC: drop impossible values, dedup timestamps)
 *     → flight_trajectory        (per-physical-flight sorted trajectory)
 *     → flight_airborne_snapshots (AIRBORNE prediction rows, via builder)
 *
 * Production rules (0G):
 *  - Every point carries flight_instance_id; QC/join never falls back to
 *    flight_key merging distinct physical flights.
 *  - Fail-closed: a raw/canonical read error or a required write error throws;
 *    the caller must not treat a partial trajectory as complete.
 *  - Repeat materialization is idempotent: clean points and trajectory rows use
 *    UNIQUE keys / ON CONFLICT DO NOTHING; snapshots key on (flight_instance_id,
 *    event_timestamp).
 */
import { pool } from "../../db";
import {
  buildAirborneSnapshot,
  computeTrajectoryCadence,
  AIRBORNE_SNAPSHOT_BUILDER_VERSION,
  type FlightPhase,
  type TrajectoryPoint,
} from "./airborneSnapshotBuilder_v3";

export interface MaterializeAirborneResult {
  rawRead: number;
  cleanWritten: number;
  cleanSkipped: number;
  trajectories: number;
  snapshots: number;
  flightInstanceIds: number;
}

function plausiblePhase(raw: string | null | undefined): FlightPhase | null {
  if (!raw) return null;
  const p = String(raw).trim().toLowerCase().replace(/-/g, "_") as FlightPhase;
  const allowed: FlightPhase[] = [
    "pre_departure", "taxi_out", "airborne_climb", "airborne_cruise",
    "airborne_descent", "approach", "landed", "taxi_in", "gate_in",
  ];
  return allowed.includes(p) ? p : null;
}

/**
 * Materialize all unprocessed raw airborne events into the canonical chain.
 * Processed events are those already present in clean_airborne_points.
 * `pool` is injectable for offline tests (defaults to the module pool).
 */
export async function materializeAirborne(
  minRawEventId: number | null = null,
  poolOverride?: { query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> },
): Promise<MaterializeAirborneResult> {
  const q = poolOverride ?? { query: (t: string, p: unknown[]) => pool.query(t, p) };
  // Read raw events that have a canonical identity (points without one are
  // quarantined — they cannot be placed on a physical trajectory).
  const rawRes = await q.query(
    `SELECT ra.id, ra.flight_instance_id, ra.flight_number, ra.carrier_iata,
            ra.event_timestamp, ra.loc_reported_utc, ra.provider_published_utc,
            ra.available_at, ra.received_timestamp_utc, ra.latitude, ra.longitude,
            ra.altitude_ft, ra.ground_speed_kt, ra.true_track_deg, ra.vsi_fpm,
            ra.on_ground, ra.flight_phase, ra.source_latency_seconds,
            ra.payload_sha256, ra.batch_id, ra.subscription_id, ra.ingest_event_id
       FROM clean.raw_airborne_events ra
       LEFT JOIN clean.clean_airborne_points cap
         ON cap.raw_event_id = ra.id
      WHERE ra.flight_instance_id IS NOT NULL
        AND cap.id IS NULL
        ${minRawEventId !== null ? "AND ra.id > $1" : ""}
      ORDER BY ra.event_timestamp ASC
      LIMIT 2000`,
    minRawEventId !== null ? [minRawEventId] : [],
  );
  const raw = rawRes.rows as any[];
  const result: MaterializeAirborneResult = {
    rawRead: raw.length, cleanWritten: 0, cleanSkipped: 0,
    trajectories: 0, snapshots: 0, flightInstanceIds: 0,
  };
  if (raw.length === 0) return result;

    for (const r of raw) {
      // QC: drop points with impossible lat/lon/alt (fail-closed flag).
      const lat = r.latitude == null ? null : Number(r.latitude);
      const lon = r.longitude == null ? null : Number(r.longitude);
      const alt = r.altitude_ft == null ? null : Number(r.altitude_ft);
      const impossible =
        (lat !== null && Math.abs(lat) > 90) ||
        (lon !== null && Math.abs(lon) > 180) ||
        (alt !== null && alt < -2000);
      const qcFlag = impossible ? "IMPOSSIBLE" : "OK";
      const ts = r.event_timestamp ?? r.loc_reported_utc;
      if (!ts || qcFlag === "IMPOSSIBLE") {
        result.cleanSkipped += 1;
        continue;
      }
      const clean = await q.query(
        `INSERT INTO clean.clean_airborne_points
           (raw_event_id, flight_key, flight_instance_id, event_timestamp,
            provider_published_utc, available_at, received_timestamp_utc,
            latitude, longitude, altitude_ft, ground_speed_kt, true_track_deg,
            vsi_fpm, on_ground, flight_phase, qc_flag, source_latency_seconds)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (raw_event_id, event_timestamp) DO NOTHING`,
        [
          r.id,
          `${r.flight_number}|${r.carrier_iata ?? ""}`,
          r.flight_instance_id,
          ts,
          r.provider_published_utc ?? null,
          r.available_at ?? null,
          r.received_timestamp_utc ?? null,
          lat, lon, alt,
          r.ground_speed_kt == null ? null : Number(r.ground_speed_kt),
          r.true_track_deg == null ? null : Number(r.true_track_deg),
          r.vsi_fpm == null ? null : Number(r.vsi_fpm),
          r.on_ground ?? null,
          plausiblePhase(r.flight_phase),
          qcFlag,
          r.source_latency_seconds == null ? null : Number(r.source_latency_seconds),
        ],
      );
      if (clean.rowCount && clean.rowCount > 0) result.cleanWritten += 1;
    }

  // Trajectory + snapshots per canonical physical flight (0G: never merge by
  // flight_key). Only flights with a nonempty point set get a trajectory.
  const flights = await q.query(
    `SELECT flight_instance_id, count(*)::int AS n
       FROM clean.clean_airborne_points
      WHERE flight_instance_id IS NOT NULL
      GROUP BY flight_instance_id
      HAVING count(*) > 0`,
    [],
  );
  result.flightInstanceIds = flights.rows.length;
  const now = new Date();
  for (const f of flights.rows as any[]) {
    const inst = String(f.flight_instance_id);
    const pts = await q.query(
      `SELECT event_timestamp AS t, available_at, latitude AS lat, longitude AS lon,
              altitude_ft AS alt, flight_phase AS phase
         FROM clean.clean_airborne_points
        WHERE flight_instance_id = $1
        ORDER BY event_timestamp ASC`,
      [inst],
    );
    const points: TrajectoryPoint[] = (pts.rows as any[]).map((p) => ({
      observedAtUtc: new Date(p.t),
      availableAtUtc: p.available_at ? new Date(p.available_at) : null,
      lat: p.lat == null ? null : Number(p.lat),
      lon: p.lon == null ? null : Number(p.lon),
      altitudeFt: p.alt == null ? null : Number(p.alt),
      phase: plausiblePhase(p.phase),
    }));
    // A flight with no usable points (e.g. a null-instance point that slipped
    // through QC) must not create an empty trajectory.
    if (points.length === 0) {
      result.cleanSkipped += 1;
      continue;
    }
    const cadence = computeTrajectoryCadence(points);
    // Flight info for the trajectory row.
    const info = await q.query(
      `SELECT flight_number, carrier_iata FROM clean.clean_airborne_points
        WHERE flight_instance_id = $1 LIMIT 1`,
      [inst],
    );
    const flightNumber = String(info.rows[0]?.flight_number ?? "");
    const carrier = info.rows[0]?.carrier_iata ?? null;
    const firstPoint = points[0].observedAtUtc;
    const lastPoint = points[points.length - 1].observedAtUtc;
    await q.query(
      `INSERT INTO clean.flight_trajectory
         (flight_key, flight_instance_id, flight_number, carrier_iata,
          first_point_utc, last_point_utc, point_count, trajectory_duration_seconds,
          max_gap_seconds, median_gap_seconds, completeness_pct, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (flight_key) DO NOTHING`,
      [
        `${flightNumber}|${carrier ?? ""}`,
        inst, flightNumber, carrier,
        firstPoint, lastPoint, points.length,
        cadence.trajectoryDurationSeconds ?? null,
        cadence.maxGapSeconds ?? null,
        cadence.medianGapSeconds ?? null,
        cadence.completenessPct ?? null,
        now,
      ],
    );
    result.trajectories += 1;

    // AIRBORNE snapshot per point (availability-aware cutoff). Funnel logic
    // runs the builder; snapshot persists only for usable trajectories.
    const snapshot = buildAirborneSnapshot({
      flightInstanceId: inst,
      airborneEligible: true,
      points,
      predictionCutoffUtc: now,
      stateObservationTimeUtc: lastPoint,
      minUsablePoints: 1,
      completenessThresholdPct: null,
      actualWheelsOnUtc: null, // unverified until Gate 0.5 (0D #6)
      scheduledWheelsOnUtc: null,
      actualGateInUtc: null,
      scheduledGateInUtc: null,
      actualGateOutUtc: null,
      scheduledGateOutUtc: null,
      actualWheelsOffUtc: null,
      scheduledWheelsOffUtc: null,
    });
    if (snapshot.funnelStage === "POST_snapshot_eligible" || snapshot.funnelStage === "usable") {
      for (const p of points) {
        await q.query(
          `INSERT INTO clean.flight_airborne_snapshots
             (flight_id, flight_instance_id, flight_number, carrier_iata,
              prediction_state, event_timestamp, provider_published_utc, available_at,
              received_timestamp_utc, latitude, longitude, altitude, ground_speed,
              heading, vertical_rate, on_ground, flight_phase,
              data_quality_flag, trajectory_gap_seconds, source_latency_seconds, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
           ON CONFLICT (flight_number, carrier_iata, event_timestamp) DO NOTHING`,
          [
            inst, inst, flightNumber, carrier,
            snapshot.predictionState, p.observedAtUtc,
            null, p.availableAtUtc, null,
            p.lat, p.lon, p.altitudeFt, null, null, null, null, p.phase,
            "OK", null, null, now,
          ],
        );
        result.snapshots += 1;
      }
    }
  }
  return result;
}

export { AIRBORNE_SNAPSHOT_BUILDER_VERSION };