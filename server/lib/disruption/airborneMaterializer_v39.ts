/**
 * V3.9-f.8 AIRBORNE materializer — Phase 0G.
 *
 * Canonical physical identity owns trajectories/snapshots. A webhook point
 * alone never establishes AIRBORNE denominator eligibility. Every prediction
 * row is constructed as-of that observation's durable available_at cutoff and
 * therefore can use only the trajectory prefix available by that cutoff.
 */
import { createHash } from "crypto";
import { pool } from "../../db";
import {
  buildAirborneSnapshot,
  computeTrajectoryCadence,
  AIRBORNE_SNAPSHOT_BUILDER_VERSION,
  type FlightPhase,
  type TrajectoryPoint,
} from "./airborneSnapshotBuilder_v3";

export interface AirborneMaterializerConfig {
  /** Gate-0.5 MEASURE→FREEZE values. null config means snapshots stay blocked. */
  minUsablePoints: number;
  completenessThresholdPct: number | null;
  configHash: string;
}
export interface MaterializeAirborneResult {
  rawRead: number;
  cleanWritten: number;
  quarantined: number;
  trajectories: number;
  snapshots: number;
  flightInstanceIds: number;
}
type QueryPool = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> };

function plausiblePhase(raw: string | null | undefined): FlightPhase | null {
  if (!raw) return null;
  const p = String(raw).trim().toLowerCase().replace(/-/g, "_") as FlightPhase;
  const allowed: FlightPhase[] = ["pre_departure", "taxi_out", "airborne_climb", "airborne_cruise", "airborne_descent", "approach", "landed", "taxi_in", "gate_in"];
  return allowed.includes(p) ? p : null;
}
function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function qcReason(r: any): string | null {
  if (!r.flight_instance_id) return "UNJOINABLE_IDENTITY";
  const ts = r.event_timestamp ?? r.loc_reported_utc;
  if (!ts || !Number.isFinite(new Date(ts).getTime())) return "MISSING_EVENT_TIMESTAMP";
  if (!r.available_at || !Number.isFinite(new Date(r.available_at).getTime())) return "MISSING_AVAILABLE_AT";
  const lat = finiteOrNull(r.latitude);
  const lon = finiteOrNull(r.longitude);
  const alt = finiteOrNull(r.altitude_ft);
  if (lat !== null && Math.abs(lat) > 90) return "IMPOSSIBLE_LATITUDE";
  if (lon !== null && Math.abs(lon) > 180) return "IMPOSSIBLE_LONGITUDE";
  if (alt !== null && alt < -2000) return "IMPOSSIBLE_ALTITUDE";
  return null;
}

async function quarantine(q: QueryPool, r: any, reason: string): Promise<void> {
  await q.query(
    `INSERT INTO clean.airborne_quarantine
       (raw_event_id, flight_instance_id, reason, evidence_json)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (raw_event_id) DO NOTHING`,
    [r.id, r.flight_instance_id ?? null, reason, JSON.stringify({ payloadSha256: r.payload_sha256 ?? null })],
  );
}

/** Independently verified eligibility: population member + verified movement evidence. */
async function hasVerifiedAirborneEligibility(q: QueryPool, flightInstanceId: string, cutoffUtc: Date): Promise<boolean> {
  const r = await q.query(
    `SELECT 1
       FROM clean.airborne_eligibility_evidence ae
       JOIN clean.flight_population fp
         ON fp.analytic_identity_id = ae.flight_instance_id
        AND fp.population_query_id = ae.population_query_id
      WHERE ae.flight_instance_id = $1
        AND ae.verified = true
        AND ae.evidence_available_at <= $2
      LIMIT 1`,
    [flightInstanceId, cutoffUtc],
  );
  return (r.rowCount ?? r.rows.length) > 0;
}

/**
 * Process all currently-unmaterialized raw points. Rejected rows are durably
 * quarantined so page iteration cannot loop forever on the same bad records.
 */
export async function materializeAirborne(
  minRawEventId: number | null = null,
  poolOverride?: QueryPool,
  config: AirborneMaterializerConfig | null = null,
): Promise<MaterializeAirborneResult> {
  const q: QueryPool = poolOverride ?? { query: (t, p = []) => pool.query(t, p as any[]) };
  const out: MaterializeAirborneResult = { rawRead: 0, cleanWritten: 0, quarantined: 0, trajectories: 0, snapshots: 0, flightInstanceIds: 0 };
  let cursor = minRawEventId ?? 0;

  while (true) {
    const rawRes = await q.query(
      `SELECT ra.id, ra.flight_instance_id, ra.flight_number, ra.carrier_iata,
              ra.event_timestamp, ra.loc_reported_utc, ra.provider_published_utc,
              ra.available_at, ra.received_timestamp_utc, ra.latitude, ra.longitude,
              ra.altitude_ft, ra.ground_speed_kt, ra.true_track_deg, ra.vsi_fpm,
              ra.on_ground, ra.flight_phase, ra.source_latency_seconds,
              ra.payload_sha256
         FROM clean.raw_airborne_events ra
         LEFT JOIN clean.clean_airborne_points cap ON cap.raw_event_id = ra.id
         LEFT JOIN clean.airborne_quarantine aq ON aq.raw_event_id = ra.id
        WHERE ra.id > $1 AND cap.id IS NULL AND aq.quarantine_id IS NULL
        ORDER BY ra.id ASC
        LIMIT 2000`,
      [cursor],
    );
    if (rawRes.rows.length === 0) break;
    for (const r of rawRes.rows) {
      cursor = Math.max(cursor, Number(r.id));
      out.rawRead += 1;
      const reason = qcReason(r);
      if (reason) {
        await quarantine(q, r, reason);
        out.quarantined += 1;
        continue;
      }
      const ts = new Date(r.event_timestamp ?? r.loc_reported_utc);
      const clean = await q.query(
        `INSERT INTO clean.clean_airborne_points
           (raw_event_id, flight_key, flight_instance_id, event_timestamp,
            provider_published_utc, available_at, received_timestamp_utc,
            latitude, longitude, altitude_ft, ground_speed_kt, true_track_deg,
            vsi_fpm, on_ground, flight_phase, qc_flag, source_latency_seconds)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'OK',$16)
         ON CONFLICT DO NOTHING`,
        [r.id, `${r.flight_number}|${r.carrier_iata ?? ""}`, r.flight_instance_id, ts,
          r.provider_published_utc ?? null, new Date(r.available_at), r.received_timestamp_utc ?? null,
          finiteOrNull(r.latitude), finiteOrNull(r.longitude), finiteOrNull(r.altitude_ft), finiteOrNull(r.ground_speed_kt),
          finiteOrNull(r.true_track_deg), finiteOrNull(r.vsi_fpm), r.on_ground ?? null,
          plausiblePhase(r.flight_phase), finiteOrNull(r.source_latency_seconds)],
      );
      if ((clean.rowCount ?? 0) > 0) out.cleanWritten += 1;
    }
    if (rawRes.rows.length < 2000) break;
  }

  const flights = await q.query(
    `SELECT DISTINCT flight_instance_id
       FROM clean.clean_airborne_points
      WHERE flight_instance_id IS NOT NULL`,
    [],
  );
  out.flightInstanceIds = flights.rows.length;

  for (const f of flights.rows) {
    const inst = String(f.flight_instance_id);
    const ptsRes = await q.query(
      `SELECT cap.raw_event_id, cap.event_timestamp AS t, cap.available_at,
              cap.latitude AS lat, cap.longitude AS lon, cap.altitude_ft AS alt,
              cap.flight_phase AS phase, ra.flight_number, ra.carrier_iata,
              ra.provider_published_utc, ra.received_timestamp_utc,
              ra.ground_speed_kt, ra.true_track_deg, ra.vsi_fpm, ra.on_ground
         FROM clean.clean_airborne_points cap
         JOIN clean.raw_airborne_events ra ON ra.id = cap.raw_event_id
        WHERE cap.flight_instance_id = $1 AND cap.qc_flag = 'OK'
        ORDER BY cap.event_timestamp ASC, cap.raw_event_id ASC`,
      [inst],
    );
    if (ptsRes.rows.length === 0) continue;
    const allPoints: TrajectoryPoint[] = ptsRes.rows.map((p: any) => ({
      observedAtUtc: new Date(p.t),
      availableAtUtc: p.available_at ? new Date(p.available_at) : null,
      lat: finiteOrNull(p.lat), lon: finiteOrNull(p.lon), altitudeFt: finiteOrNull(p.alt), phase: plausiblePhase(p.phase),
    }));
    const cadence = computeTrajectoryCadence(allPoints);
    const info = ptsRes.rows[0];
    const firstPoint = allPoints[0].observedAtUtc;
    const lastPoint = allPoints[allPoints.length - 1].observedAtUtc;
    await q.query(
      `INSERT INTO clean.flight_trajectory
         (flight_key, flight_instance_id, flight_number, carrier_iata,
          first_point_utc, last_point_utc, point_count, trajectory_duration_seconds,
          max_gap_seconds, median_gap_seconds, completeness_pct, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
       ON CONFLICT (flight_instance_id) WHERE flight_instance_id IS NOT NULL
       DO UPDATE SET first_point_utc=EXCLUDED.first_point_utc,
                     last_point_utc=EXCLUDED.last_point_utc,
                     point_count=EXCLUDED.point_count,
                     trajectory_duration_seconds=EXCLUDED.trajectory_duration_seconds,
                     max_gap_seconds=EXCLUDED.max_gap_seconds,
                     median_gap_seconds=EXCLUDED.median_gap_seconds,
                     completeness_pct=EXCLUDED.completeness_pct`,
      [`${info.flight_number}|${info.carrier_iata ?? ""}`, inst, String(info.flight_number ?? ""), info.carrier_iata ?? null,
        firstPoint, lastPoint, allPoints.length, cadence.trajectoryDurationSeconds, cadence.maxGapSeconds,
        cadence.medianGapSeconds, cadence.completenessPct],
    );
    out.trajectories += 1;

    // Thresholds are a later MEASURE→FREEZE item. Phase-0 code exists, but no
    // AIRBORNE prediction row is emitted until a verified config is supplied.
    if (!config || !config.configHash) continue;

    for (let i = 0; i < ptsRes.rows.length; i++) {
      const source = ptsRes.rows[i];
      const cutoff = new Date(source.available_at);
      if (!Number.isFinite(cutoff.getTime())) continue;
      const prefix = allPoints.filter((p) => p.availableAtUtc && p.availableAtUtc <= cutoff);
      const eligible = await hasVerifiedAirborneEligibility(q, inst, cutoff);
      const snapshot = buildAirborneSnapshot({
        flightInstanceId: inst,
        airborneEligible: eligible,
        points: prefix,
        predictionCutoffUtc: cutoff,
        stateObservationTimeUtc: new Date(source.t),
        minUsablePoints: config.minUsablePoints,
        completenessThresholdPct: config.completenessThresholdPct,
        actualWheelsOnUtc: null, scheduledWheelsOnUtc: null,
        actualGateInUtc: null, scheduledGateInUtc: null,
        actualGateOutUtc: null, scheduledGateOutUtc: null,
        actualWheelsOffUtc: null, scheduledWheelsOffUtc: null,
      });
      if (snapshot.funnelStage !== "POST_snapshot_eligible") continue;
      const prefixHash = sha256(prefix.map((p) => ({ t: p.observedAtUtc.toISOString(), a: p.availableAtUtc?.toISOString() ?? null, lat: p.lat, lon: p.lon, alt: p.altitudeFt })));
      const inserted = await q.query(
        `INSERT INTO clean.flight_airborne_snapshots
           (flight_id, flight_instance_id, flight_number, carrier_iata,
            prediction_state, event_timestamp, prediction_cutoff_utc,
            provider_published_utc, available_at, received_timestamp_utc,
            latitude, longitude, altitude, ground_speed, heading, vertical_rate,
            on_ground, flight_phase, data_quality_flag, trajectory_prefix_hash,
            builder_version, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'OK',$19,$20,now())
         ON CONFLICT (flight_instance_id, event_timestamp) WHERE flight_instance_id IS NOT NULL DO NOTHING`,
        [inst, inst, String(source.flight_number ?? ""), source.carrier_iata ?? null,
          snapshot.predictionState, new Date(source.t), cutoff, source.provider_published_utc ?? null,
          cutoff, source.received_timestamp_utc ?? null, finiteOrNull(source.lat), finiteOrNull(source.lon), finiteOrNull(source.alt),
          finiteOrNull(source.ground_speed_kt), finiteOrNull(source.true_track_deg), finiteOrNull(source.vsi_fpm), source.on_ground ?? null,
          plausiblePhase(source.phase), prefixHash, AIRBORNE_SNAPSHOT_BUILDER_VERSION],
      );
      if ((inserted.rowCount ?? 0) > 0) out.snapshots += 1;
    }
  }
  return out;
}

export { AIRBORNE_SNAPSHOT_BUILDER_VERSION };
