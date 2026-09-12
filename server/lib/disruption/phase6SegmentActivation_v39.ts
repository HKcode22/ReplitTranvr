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

async function loadSelections(runDayIndex: number): Promise<FrozenSelection[]> {
  const r = await pool.query(
    `SELECT slot_id,selected_icao,airport_layer_design_probability
       FROM clean.adb_sampling_draw
      WHERE run_day_index=$1
      ORDER BY CASE slot_id WHEN 'HUB' THEN 1 WHEN 'MID_A' THEN 2 WHEN 'MID_B' THEN 3 ELSE 4 END`,
    [runDayIndex],
  );
  if (r.rowCount !== 4) throw new Error(`REFUSED_SAMPLING_DRAW: run_day ${runDayIndex} has ${r.rowCount}/4 frozen slots`);
  const rows = r.rows.map((x: any) => ({
    slotId: String(x.slot_id) as FrozenSelection["slotId"],
    icao: String(x.selected_icao).toUpperCase(),
    probability: x.airport_layer_design_probability == null ? null : Number(x.airport_layer_design_probability),
  }));
  const expected = ["HUB", "MID_A", "MID_B", "REGIONAL"];
  if (rows.some((x, i) => x.slotId !== expected[i]) || new Set(rows.map((x) => x.icao)).size !== 4) {
    throw new Error("REFUSED_SAMPLING_DRAW: frozen child activation requires four distinct canonical slots");
  }
  const regional = rows.find((x) => x.slotId === "REGIONAL")!;
  if (!(regional.probability !== null && regional.probability > 0 && regional.probability <= 1)) {
    throw new Error("REFUSED_SAMPLING_DRAW: REGIONAL design probability is missing/invalid");
  }
  return rows;
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
  const selections = await loadSelections(input.runDayIndex);
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
      const sub = await createSubscription("FlightByAirportIcao", s.icao, { maxDeliveryRetries: 0 });
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
