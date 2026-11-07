/**
 * V3.9-f.8 exact child-segment activation owner.
 *
 * Called only by the long-lived Phase-6 runtime while holding the shared
 * provider-mutation advisory lock. It consumes the already-persisted four-slot
 * sampling draw; it never redraws, substitutes, changes regions, or changes the
 * calendar. R1 and all FREE coverage checks complete before the first CREATE.
 */
import { v39Pool as pool } from "./db_v39";
import {
  checkAirportFeeds,
  createSubscription,
  deleteSubscription,
  getBalance,
  listSubscriptionsStrict,
} from "./aerodataboxLimiter_v3";

import { requireP5P6WebhookDestinationV39 } from "./phase5Phase6WebhookDestinationGuard_v39";
import { verifyPreparedDailyDraw, type PreparedDrawRow } from "./phase5EarlyPreselectionReadback_v39";

export const PHASE6_PROVIDER_MUTATION_LOCK = "v39-phase6-provider-mutation";

interface FrozenSelection {
  slotId: "HUB" | "MID_A" | "MID_B" | "REGIONAL";
  icao: string;
  probability: number | null;
}

function tierForSlot(slot: FrozenSelection["slotId"]): "HUB" | "MID" | "REGIONAL" {
  return slot === "HUB" ? "HUB" : slot === "REGIONAL" ? "REGIONAL" : "MID";
}

async function openIncident(cause: "reconciliation" | "deletion" | "persistence", detail: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
     VALUES($1,now(),$2::jsonb,false)`,
    [cause, JSON.stringify(detail)],
  );
}

async function assertNoIncident(): Promise<void> {
  const r = await pool.query(
    `SELECT cause FROM clean.adb_incident_stop WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1`,
  );
  if (r.rowCount) throw new Error(`REFUSED_INCIDENT_STOP: ${r.rows[0].cause}`);
}

async function assertR1Empty(): Promise<void> {
  const subscriptions = await listSubscriptionsStrict();
  const activeBillable = subscriptions.filter((s) => s.isActive && s.billingType !== "LifetimeBased");
  if (activeBillable.length) {
    throw new Error(`REFUSED_R1: ${activeBillable.length} active billable subscription(s) before child activation: ${activeBillable.map((s) => s.id).join(",")}`);
  }
}

async function loadSelections(batchId: string, runDayIndex: number): Promise<FrozenSelection[]> {
  // A child activation is a SECOND paid CREATE boundary: do not trust a bare
  // four-row query after the parent's early-draw/hash admission.
  const meta = await pool.query(
    `SELECT b.sampling_state_hash,b.calendar_hash AS batch_calendar_hash,
            b.config_hash AS batch_config_hash,
            c.scheduled_start_utc,c.frozen_draw_seed,c.draw_type,
            c.anchor_icao,c.slot_regions,c.pair_airport_set,c.calendar_hash,
            c.config_hash,c.frame_hash
       FROM clean.adb_collection_batches b
       JOIN clean.adb_phase6_calendar_day c ON c.run_day_index=b.run_day_index
      WHERE b.batch_id=$1 AND b.run_day_index=$2`,
    [batchId,runDayIndex],
  );
  if (meta.rowCount !== 1) throw new Error("REFUSED_EARLY_DRAW_CHILD_BATCH_CALENDAR_MISSING");
  const day = meta.rows[0];
  if (day.calendar_hash !== day.batch_calendar_hash ||
      day.config_hash !== day.batch_config_hash ||
      !day.sampling_state_hash) {
    throw new Error("REFUSED_EARLY_DRAW_CHILD_HASH_MISMATCH");
  }
  const r = await pool.query(
    `SELECT slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,
            selected_at_utc,adaptive_state_hash,probability_vector,
            airport_layer_design_probability
       FROM clean.adb_sampling_draw
      WHERE run_day_index=$1`,
    [runDayIndex],
  );
  const prepared = verifyPreparedDailyDraw({
    runDayIndex,
    scheduledStartUtc: new Date(day.scheduled_start_utc),
    frozenDrawSeed: String(day.frozen_draw_seed),
    drawType: day.draw_type,
    anchorIcao: String(day.anchor_icao),
    slotRegions: day.slot_regions,
    pairAirportSet: day.pair_airport_set,
    calendarHash: String(day.calendar_hash),
    configHash: String(day.config_hash),
    frameHash: String(day.frame_hash),
  }, r.rows as PreparedDrawRow[]);
  if (prepared.stateHash !== day.sampling_state_hash)
    throw new Error("REFUSED_EARLY_DRAW_CHILD_READBACK_TAMPERED");
  return prepared.selections.map(s=>({
    slotId: s.slotId,
    icao: s.icao,
    probability: s.designProbability,
  }));
}

async function cleanupCreated(created: string[]): Promise<string[]> {
  const failed: string[] = [];
  for (const id of created) {
    const ok = await deleteSubscription(id).catch(() => false);
    if (ok) await pool.query(`UPDATE clean.adb_collection_subs SET ended_at=COALESCE(ended_at,now()) WHERE subscription_id=$1`, [id]).catch(() => undefined);
    else failed.push(id);
  }
  return failed;
}

export interface ActivateFrozenSegmentInput {
  batchId: string;
  runDayIndex: number;
  segmentId: string;
  nowUtc: Date;
}

export interface ActivateFrozenSegmentResult {
  activated: boolean;
  createdCount: number;
  balanceBefore: number;
}

/**
 * Activate exactly one due, PLANNED ACTIVE child segment. Caller must hold
 * PHASE6_PROVIDER_MUTATION_LOCK for the entire call.
 */
export async function activateFrozenPlannedSegment(
  input: ActivateFrozenSegmentInput,
): Promise<ActivateFrozenSegmentResult> {
  // A subscription with no valid private HTTPS callback would be billable but unobservable.
  const callbackUrl = requireP5P6WebhookDestinationV39(process.env);
  await assertNoIncident();

  const segment = await pool.query(
    `SELECT segment_kind,status,segment_start_utc,segment_end_utc
       FROM clean.adb_collection_segments
      WHERE segment_id=$1 AND batch_id=$2 AND run_day_index=$3`,
    [input.segmentId,input.batchId,input.runDayIndex],
  );
  if (segment.rowCount !== 1) throw new Error(`REFUSED_SEGMENT: missing ${input.segmentId}`);
  const seg = segment.rows[0];
  if (seg.segment_kind !== "ACTIVE" || seg.status !== "PLANNED") {
    throw new Error(`REFUSED_SEGMENT_STATE: ${input.segmentId} ${seg.segment_kind}/${seg.status}`);
  }
  const start = new Date(seg.segment_start_utc);
  const end = new Date(seg.segment_end_utc);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || input.nowUtc < start || input.nowUtc >= end) {
    throw new Error(`REFUSED_SEGMENT_TIME: ${input.segmentId} is not inside its frozen activation window`);
  }

  // R1 and free coverage are hard pre-mutation prerequisites.
  await assertR1Empty();
  const selections = await loadSelections(input.batchId,input.runDayIndex);
  for (const s of selections) {
    const coverage = await checkAirportFeeds(s.icao).catch(() => null);
    if (!coverage) throw new Error(`REFUSED_COVERAGE_UNKNOWN: frozen ${s.slotId} ${s.icao}`);
  }
  const balance = await getBalance();
  if (!balance) throw new Error("REFUSED_BALANCE_UNKNOWN: child activation requires authoritative Alert balance");

  // Mark the operational segment ACTIVE immediately before the first CREATE so
  // a process crash after any provider success is visible to the safety owner.
  const marked = await pool.query(
    `UPDATE clean.adb_collection_segments
        SET status='ACTIVE',started_at_utc=now(),balance_before=$2
      WHERE segment_id=$1 AND status='PLANNED' AND segment_kind='ACTIVE'
      RETURNING segment_id`,
    [input.segmentId,balance.creditsRemaining],
  );
  if (marked.rowCount !== 1) throw new Error(`REFUSED_SEGMENT_RACE: ${input.segmentId} was not PLANNED at mutation boundary`);

  const created: string[] = [];
  try {
    for (const s of selections) {
      const sub = await createSubscription("FlightByAirportIcao", s.icao, { url: callbackUrl, maxDeliveryRetries: 0 });
      if (!sub?.id) {
        // Provider outcome is unknown; do not assume no subscription was made.
        throw new Error(`CREATE_OUTCOME_UNKNOWN:${s.slotId}:${s.icao}`);
      }
      created.push(sub.id); // push BEFORE DB insert so DB failure cleanup owns it.
      await pool.query(
        `INSERT INTO clean.adb_collection_subs
           (subscription_id,batch_id,icao,tier,is_randomized,airport_layer_design_probability,
            planned_share,sampling_weight,segment_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8)`,
        [
          sub.id,input.batchId,s.icao,tierForSlot(s.slotId),s.slotId === "REGIONAL",
          s.slotId === "REGIONAL" ? s.probability : null,
          s.slotId === "REGIONAL" ? null : 1,
          input.segmentId,
        ],
      );
    }
    return { activated: true, createdCount: created.length, balanceBefore: balance.creditsRemaining };
  } catch (error: any) {
    const failedDeletes = await cleanupCreated(created);
    await pool.query(
      `UPDATE clean.adb_collection_segments SET status='FAILED',ended_at_utc=now(),stop_reason=$2 WHERE segment_id=$1`,
      [input.segmentId,String(error?.message ?? error).slice(0,500)],
    ).catch(() => undefined);
    await pool.query(
      `UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason='segment_activation_failed' WHERE batch_id=$1`,
      [input.batchId],
    ).catch(() => undefined);
    await openIncident(failedDeletes.length ? "deletion" : "reconciliation", {
      kind: String(error?.message ?? error).startsWith("CREATE_OUTCOME_UNKNOWN:")
        ? "subscription_create_outcome_unknown"
        : "segment_activation_failure",
      batchId: input.batchId,
      runDayIndex: input.runDayIndex,
      segmentId: input.segmentId,
      error: String(error?.message ?? error),
      knownCreatedSubscriptionIds: created,
      failedDeletes,
    });
    throw error;
  }
}
