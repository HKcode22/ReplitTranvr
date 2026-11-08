/**
 * V3.9 Phase5 early adaptive airport draw (DB-only; never a source/Alert API).
 *
 * No scheduled entrypoint, no automatic dispatch, no provider calls, and NO
 * Phase6 live GO. A separately signed/approved GitHub-only owner must call this
 * after the Phase5 FREEZE, and then a separate GitHub FIDS owner must collect
 * genuine raw originals and certify actual per-flight PRE cutoffs.
 *
 * A single SERIALIZABLE transaction records all four exact selections plus
 * their one DB-selected timestamp and updates history for the 24h washout.
 * Existing rows return replay-verified, not a second draw. Missing/partial,
 * malformed or stale rows always fail closed. No "on conflict do nothing" on
 * draw rows to conceal a competing owner.
 */
import type { Pool, PoolClient } from "pg";
import { createHash } from "node:crypto";
import {
  chooseAirportsForRunDay,
  type AirportSamplingState,
  type FrameSamplingCandidate,
  type FrozenRunDaySamplingPlan,
  type SamplingDecision,
} from "./phase6SamplingDecision_v39";
import {
  verifyPreparedDailyDraw,
  type PreparedDayForReadback,
  type PreparedDrawRow,
} from "./phase5EarlyPreselectionReadback_v39";

const SHA = /^[0-9a-f]{64}$/;
const MIN_LEAD_MS = 24 * 3_600_000 + 45 * 60_000;
const MAX_LEAD_MS = 72 * 3_600_000;
const SLOTS = ["HUB", "MID_A", "MID_B", "REGIONAL"] as const;

export interface EarlyDrawOwnerPins {
  runDayIndex: number;
  expectedManifestSha256: string;
  expectedCalendarHash: string;
  expectedConfigHash: string;
  expectedFrameHash: string;
  /** Operator/reviewer approved this exact signed release; no default true. */
  phase5FreezeApproved: true;
  /** Caller must have a dedicated least-privilege GH-only database role. */
  githubOnlyApproved: true;
}
export interface EarlyDrawOutcome {
  status: "EARLY_DRAW_COMMITTED" | "EARLY_DRAW_IDEMPOTENT_READBACK";
  runDayIndex: number;
  selectedAtUtc: string;
  selectedAirportCount: 4;
  drawSha256: string;
  frozenCalendarHash: string;
  /** Deliberately remains false until original FIDS source/PRE audited. */
  flightLevelPreVerified: false;
  flightAlertSubscriptionsCreated: 0;
  providerCalls: 0;
}

function refuse(reason: string): never {throw Error("REFUSED_PHASE5_EARLY_DRAW_" + reason);}
function validHash(v: unknown): v is string {return typeof v === "string" && SHA.test(v);}
function at(v: unknown, label: string): Date {
  const date = v instanceof Date ? v : new Date(String(v));
  if (!Number.isFinite(date.getTime())) refuse(label + "_CLOCK");
  return date;
}
function iso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return at(v, "STATE").toISOString();
}
export function validateEarlyDrawWindow(now: Date, serviceWindowStartUtc: Date): void {
  const advance = serviceWindowStartUtc.getTime() - now.getTime();
  if (!Number.isFinite(advance) || advance <= MIN_LEAD_MS)
    refuse("LATE_FOR_T24_SOURCE");
  if (advance > MAX_LEAD_MS) refuse("PRESELECTION_TOO_EARLY");
}
function checkPins(p: EarlyDrawOwnerPins): void {
  if (p.phase5FreezeApproved !== true || p.githubOnlyApproved !== true)
    refuse("NOT_APPROVED_FOR_EARLY_DB_WRITE");
  if (!Number.isInteger(p.runDayIndex) || p.runDayIndex < 1 || p.runDayIndex > 31)
    refuse("INVALID_RUN_DAY");
  if (![p.expectedManifestSha256,p.expectedCalendarHash,
        p.expectedConfigHash,p.expectedFrameHash].every(validHash))
    refuse("INCOMPLETE_RELEASE_PINS");
}

function asDay(row: any): PreparedDayForReadback {
  return {
    runDayIndex: Number(row.run_day_index),
    scheduledStartUtc: at(row.scheduled_start_utc, "DAY_START"),
    frozenDrawSeed: String(row.frozen_draw_seed),
    drawType: row.draw_type,
    anchorIcao: String(row.anchor_icao),
    slotRegions: row.slot_regions,
    pairAirportSet: row.pair_airport_set,
    calendarHash: String(row.calendar_hash),
    configHash: String(row.config_hash),
    frameHash: String(row.frame_hash),
  };
}
function toSamplingPlan(day: PreparedDayForReadback): FrozenRunDaySamplingPlan {
  return {
    runDayIndex: day.runDayIndex,
    calendarHash: day.calendarHash,
    configHash: day.configHash,
    windowStartUtc: day.scheduledStartUtc,
    drawType: day.drawType,
    slotRegions: day.slotRegions,
    anchorIcao: day.anchorIcao,
    pairAirportSet: day.pairAirportSet,
    frozenDrawSeed: day.frozenDrawSeed,
  };
}
function mapSamplingRows(rows: any[]): {
  frame: FrameSamplingCandidate[];
  states: AirportSamplingState[];
} {
  const frame: FrameSamplingCandidate[] = [];
  const states: AirportSamplingState[] = [];
  for (const r of rows) {
    if (!["HUB","MID","REGIONAL"].includes(String(r.tier))) continue;
    frame.push({
      icao: String(r.icao), tier: r.tier, region: r.region ?? "UNMAPPED",
      trafficPrior: Number(r.traffic_prior), tierPrior: Number(r.traffic_prior),
      inFrame: r.in_frame === true, preEligible: r.pre_eligible === true,
      postEligible: r.post_eligible === true, exclusionReason: r.exclusion_reason ?? null,
    });
    states.push({
      icao:String(r.icao), emaYield:r.ema_yield == null ? null : Number(r.ema_yield),
      mi:r.m_i == null ? 1 : Number(r.m_i),
      zeroYieldState:r.zero_yield_state ?? "normal",
      consecutiveZeroYield:Number(r.consecutive_zero_yield ?? 0),
      firstZeroYieldDate: r.first_zero_yield_date == null ? null :
        (r.first_zero_yield_date instanceof Date
          ? r.first_zero_yield_date.toISOString().slice(0,10)
          : String(r.first_zero_yield_date).slice(0,10)),
      lastSuccessfulPhase6ObservationAt:iso(r.last_successful_phase6_observation_at),
      lastDirectObservationAt:iso(r.last_direct_observation_at),
      lastSelectedAt:iso(r.last_selected_at),
      // Looked up from the SAME frozen calendar's prior treatment END.
      // Never infer a 24h washout solely from an earlier window START.
      lastWindowEndUtc:iso(r.last_window_end_utc),
      providerFailure:r.provider_failure === true,
      coverageFailed:r.coverage_failed === true,
      stateVersion:Number(r.state_version ?? 0),
    });
  }
  if (!frame.length) refuse("EMPTY_FROZEN_FRAME");
  return {frame,states};
}
function toStoredRows(
  decision: SamplingDecision, day: PreparedDayForReadback, selectedAt: Date,
): PreparedDrawRow[] {
  return decision.selections.map(s=>({
    slot_id:s.slotId,target_region:s.targetRegion,draw_type:s.drawType,
    selected_icao:s.icao,frozen_draw_seed:day.frozenDrawSeed,
    selected_at_utc:selectedAt,
    adaptive_state_hash:s.adaptiveStateHash,
    probability_vector:s.probabilityVector,
    airport_layer_design_probability:s.designProbability,
  }));
}
function safeOutput(
  day: PreparedDayForReadback,
  rows: PreparedDrawRow[],
  status: EarlyDrawOutcome["status"],
): EarlyDrawOutcome {
  const verified = verifyPreparedDailyDraw(day,rows);
  return {
    status,runDayIndex:day.runDayIndex,
    selectedAtUtc:verified.selectedAtUtc,
    selectedAirportCount:4,drawSha256:verified.stateHash,
    frozenCalendarHash:day.calendarHash,flightLevelPreVerified:false,
    flightAlertSubscriptionsCreated:0,providerCalls:0,
  };
}

/** One DB-only early decision; call only from future reviewed GitHub owner. */
export async function commitEarlyPhase5Draw(
  pool: Pick<Pool,"connect">,
  pins: EarlyDrawOwnerPins,
): Promise<EarlyDrawOutcome> {
  checkPins(pins);
  const client: PoolClient = await pool.connect();
  let tx = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    tx=true;
    await client.query("SET LOCAL statement_timeout='12000ms'");
    await client.query("SET LOCAL lock_timeout='3000ms'");
    // Stable per-run-day writer lease even when there are no existing rows.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('v39-p5-early-sampling'),$1)",
      [pins.runDayIndex],
    );
    const auth=await client.query(
      `SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,
              enabled,revoked_at_utc
         FROM clean.adb_phase6_authorization
        WHERE singleton_key=true`,
    );
    if (auth.rowCount!==1 || auth.rows[0].enabled!==true ||
        auth.rows[0].revoked_at_utc !== null ||
        auth.rows[0].manifest_sha256!==pins.expectedManifestSha256 ||
        auth.rows[0].calendar_hash!==pins.expectedCalendarHash ||
        auth.rows[0].config_hash!==pins.expectedConfigHash)
      refuse("NO_FROZEN_ENABLED_AUTHORIZATION");
    const cal=await client.query(
      `SELECT run_day_index,scheduled_start_utc,frozen_draw_seed,draw_type,
              anchor_icao,slot_regions,pair_airport_set,calendar_hash,
              config_hash,frame_hash,date_utc
         FROM clean.adb_phase6_calendar_day
        WHERE run_day_index=$1`,
      [pins.runDayIndex],
    );
    if(cal.rowCount!==1) refuse("CALENDAR_DAY_MISSING");
    const day=asDay(cal.rows[0]);
    if(day.calendarHash!==pins.expectedCalendarHash ||
       day.configHash!==pins.expectedConfigHash ||
       day.frameHash!==pins.expectedFrameHash)
      refuse("CALENDAR_OR_FRAME_UNPINNED");
    if(day.scheduledStartUtc.toISOString().slice(0,10)!==
       at(cal.rows[0].date_utc,"CALENDAR_DATE").toISOString().slice(0,10))
      refuse("CALENDAR_DAY_DATE_MISMATCH");
    const now=at((await client.query("SELECT clock_timestamp() AS at")).rows[0].at,"DB_NOW");
    const existing=await client.query(
      `SELECT slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,
              selected_at_utc,adaptive_state_hash,probability_vector,
              airport_layer_design_probability
         FROM clean.adb_sampling_draw
        WHERE run_day_index=$1
        ORDER BY slot_id FOR UPDATE`,
      [pins.runDayIndex],
    );
    if(existing.rowCount!==0) {
      if(existing.rowCount!==4) refuse("PARTIAL_OR_UNKNOWN_EXISTING_DRAW");
      const result=safeOutput(day,existing.rows as PreparedDrawRow[],
        "EARLY_DRAW_IDEMPOTENT_READBACK");
      await client.query("COMMIT");tx=false;
      return result;
    }
    validateEarlyDrawWindow(now,day.scheduledStartUtc);
    const registry=await client.query(
      `SELECT active_frame_version,frame_hash
         FROM clean.adb_sampling_frame_registry
        WHERE registry_key='ACTIVE'`,
    );
    if(registry.rowCount!==1 || registry.rows[0].frame_hash!==day.frameHash)
      refuse("ACTIVE_FRAME_HASH_MISMATCH");
    // Lock current historical sampling state so concurrent update cannot
    // silently change the probability vector and future washout interpretation.
    await client.query(
      "SELECT icao FROM clean.adb_airport_sampling_state ORDER BY icao FOR UPDATE",
    );
    const candidates=await client.query(
      `SELECT f.icao,f.tier,f.region,f.traffic_prior,f.in_frame,
              f.pre_eligible,f.post_eligible,f.exclusion_reason,
              s.ema_yield,s.m_i,s.zero_yield_state,s.consecutive_zero_yield,
              s.first_zero_yield_date,s.last_successful_phase6_observation_at,
              s.last_direct_observation_at,s.last_selected_at,
              s.provider_failure,s.coverage_failed,s.state_version,
              CASE WHEN prior.calendar_hash=$2
                  AND s.last_selected_at=prior.scheduled_start_utc
                   THEN CASE
                     WHEN prior.window_shape='4h'
                       AND prior.active_duration_minutes=240
                       THEN prior.scheduled_start_utc + interval '4 hours'
                     WHEN prior.window_shape='2x2h'
                       AND prior.active_duration_minutes=240
                       THEN prior.scheduled_start_utc + interval '5 hours'
                     WHEN prior.window_shape='up-to-6h'
                       AND prior.active_duration_minutes BETWEEN 1 AND 360
                       THEN prior.scheduled_start_utc
                          + prior.active_duration_minutes * interval '1 minute'
                     ELSE NULL END
                  ELSE NULL END AS last_window_end_utc
         FROM clean.adb_sampling_frame f
         LEFT JOIN clean.adb_airport_sampling_state s ON s.icao=f.icao
         LEFT JOIN clean.adb_phase6_calendar_day prior
           ON prior.run_day_index=s.last_selected_run_day
        WHERE f.frame_version=$1 ORDER BY f.icao`,
      [registry.rows[0].active_frame_version,day.calendarHash],
    );
    const {frame,states}=mapSamplingRows(candidates.rows);
    const decision=chooseAirportsForRunDay(toSamplingPlan(day),frame,states);
    if(decision.selections.length!==4 ||
       new Set(decision.selections.map(s=>s.icao)).size!==4)
      refuse("INVALID_EARLY_DECISION");
    const preparedRows=toStoredRows(decision,day,now);
    const verified=safeOutput(day,preparedRows,"EARLY_DRAW_COMMITTED");
    // Each row's selected_at_utc is one DB-observed timestamp taken while
    // holding the transaction lease. All four rows + washout state commit atomically.
    for(const s of decision.selections){
      await client.query(
        `INSERT INTO clean.adb_sampling_draw
            (run_day_index,slot_id,target_region,draw_type,selected_icao,
             frozen_draw_seed,adaptive_state_hash,probability_vector,
             airport_layer_design_probability,selected_at_utc)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::timestamptz)`,
        [day.runDayIndex,s.slotId,s.targetRegion,s.drawType,s.icao,
         day.frozenDrawSeed,s.adaptiveStateHash,
         s.probabilityVector?JSON.stringify(s.probabilityVector):null,
         s.designProbability,now],
      );
      await client.query(
        `INSERT INTO clean.adb_airport_sampling_state
               (icao,last_selected_at,last_selected_run_day)
           VALUES ($1,$2,$3)
           ON CONFLICT(icao) DO UPDATE
              SET last_selected_at=EXCLUDED.last_selected_at,
                  last_selected_run_day=EXCLUDED.last_selected_run_day,
                  updated_at_utc=clock_timestamp()`,
        [s.icao,day.scheduledStartUtc,day.runDayIndex],
      );
    }
    const readback=await client.query(
      `SELECT slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,
              selected_at_utc,adaptive_state_hash,probability_vector,
              airport_layer_design_probability
         FROM clean.adb_sampling_draw WHERE run_day_index=$1`,
      [day.runDayIndex],
    );
    const verifiedAgain=safeOutput(day,readback.rows as PreparedDrawRow[],
      "EARLY_DRAW_COMMITTED");
    if (verifiedAgain.drawSha256!==verified.drawSha256)
      refuse("POST_WRITE_READBACK_DIGEST_MISMATCH");
    // PRE source owner must still have time to start and persist before
    // the earliest T-24h cutoff. A delayed DB commit cannot fake selected_at.
    const beforeCommit=at(
      (await client.query("SELECT clock_timestamp() AS at")).rows[0].at,
      "COMMIT_CLOCK",
    );
    validateEarlyDrawWindow(beforeCommit,day.scheduledStartUtc);
    // No "COMMIT" before the 4-row readback AND DB clock are proven.
    await client.query("COMMIT");tx=false;
    return verifiedAgain;
  }catch(e){
    if(tx)await client.query("ROLLBACK").catch(()=>{});
    // Never print candidate probabilities or the release manifest in errors.
    throw e;
  }finally{
    client.release();
  }
}

/**
 * Digest for external provenance checkpointing; only the reviewer-supplied
 * hashes, not flight data, are included.
 */
export function earlyDrawReleasePinsFingerprint(p: EarlyDrawOwnerPins): string {
  checkPins(p);
  return createHash("sha256").update(JSON.stringify({
    day:p.runDayIndex,manifest:p.expectedManifestSha256,
    calendar:p.expectedCalendarHash,config:p.expectedConfigHash,
    frame:p.expectedFrameHash,
  })).digest("hex");
}
