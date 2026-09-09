/**
 * V3.9-f.8 production collection controller.
 *
 * This replaces the legacy runtime selector while preserving the public API
 * used by routes_v3.ts. It consumes the hash-frozen Phase-6 calendar, uses the
 * frozen slot→region sequence, exact crossover replay, persisted adaptive
 * state, explicit parent/segment/gap lifecycle, and settled balance accounting.
 * No paid/provider mutation occurs unless PHASE6_READY and the frozen runtime
 * authorization/config are present.
 */
import { createHash } from "crypto";
import { pool } from "../../db";
import {
  checkAirportFeeds,
  createSubscription,
  deleteSubscription,
  getBalance,
  listFeedAirports,
  listSubscriptions,
  type FeedService,
} from "./aerodataboxLimiter_v3";
import { AIRPORT_CATALOG, tierForIcao } from "./adbAirportCatalog_v3";
import {
  chooseAirportsForRunDay,
  type AirportSamplingState,
  type FrameSamplingCandidate,
  type FrozenRunDaySamplingPlan,
  type SamplingDecision,
  type SamplingSelection,
} from "./phase6SamplingDecision_v39";
import { externalSpend, reconcileSpend, runSettlement, type SettlementConfig } from "./settlement_v3";

export type AirportTier = "HUB" | "MID" | "REGIONAL";

export function parseAutoCollect(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "on", "yes"].includes(v)) return true;
  if (["0", "false", "off", "no"].includes(v)) return false;
  return false;
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/** Display/diagnostic values only. Production admission uses FrozenRuntimeConfig. */
export const COLLECTOR_CONFIG = {
  windowHours: 4,
  batchBudget: 1900,
  reserveCredits: 1000,
  minBatchCredits: 300,
  dailyCreditCap: 1900,
  softStopMargin: envInt("ADB_DAILY_SOFT_STOP_MARGIN", 50),
  watchdogSeconds: envInt("ADB_WATCHDOG_SECONDS", 60) || 60,
  tierMix: { HUB: 1, MID: 2, REGIONAL: 1 } as Record<AirportTier, number>,
  autoCollect: parseAutoCollect(process.env.ADB_AUTO_COLLECT),
};

export function isPhase6Ready(): boolean {
  const v = String(process.env.PHASE6_READY ?? "").trim().toLowerCase();
  return ["1", "true", "on", "yes"].includes(v);
}

export function budgetDayIdForBatch(batchSeq: number): string { return `run_day_${batchSeq}`; }

export interface CollectionBatch {
  batchId: string;
  batchSeq: number;
  randomSeed: number;
  status: "ACTIVE" | "CLOSED";
  startedAt: Date;
  endedAt: Date | null;
  windowStart: Date;
  windowEnd: Date;
  creditBudget: number;
  tierMix: Record<string, number>;
  airports: string[];
  stopReason: string | null;
}
export interface CreatedSub { icao: string; tier: AirportTier | null; subscriptionId: string; }
export interface SkippedAirport { icao: string; reason: "no_coverage" | "create_failed" | "unknown"; }
export interface SamplingMeta {
  batchId: string | null;
  tier: string | null;
  isRandomized: boolean | null;
  airportLayerDesignProbability: number | null;
  plannedShare: number | null;
  samplingWeight: number | null;
  randomSeed: string | null;
  windowStart: Date | null;
  windowEnd: Date | null;
}
export interface CandidatePools {
  candidates: Record<AirportTier, string[]>;
  poolSizes: Record<AirportTier, number>;
  regionalP: Map<string, number>;
}
export interface EligibleFrameCandidate { icao: string; tier: AirportTier; trafficPrior: number; region: string; }
export interface StartBatchResult { batch: CollectionBatch; created: CreatedSub[]; skipped: SkippedAirport[]; }

interface FrozenRuntimeConfig {
  version: string;
  hardCapCredits: 1900;
  protectedAlertFloor: number;
  endingAlertMarginCredits: number;
  unsettledBurstMarginCredits: number;
  phase6AlertSpendCeiling: number;
  softStopMarginCredits: number;
  productionReconcileTolerance: number;
  startGraceSeconds: number;
  authorizationRecordHash: string;
  settlement: SettlementConfig;
}
interface CalendarDayRow {
  run_day_index: number;
  budget_day_id: string;
  calendar_hash: string;
  config_hash: string;
  date_utc: string;
  utc_slot: string;
  time_class: string;
  window_shape: "4h" | "2x2h" | "up-to-6h";
  evaluation_partition: string;
  crossover_group_id: string | null;
  crossover_period: 1 | 2 | null;
  pair_role: "control" | "alternative" | null;
  draw_type: "NEW_TEMPLATE" | "PAIR_REPLAY";
  slot_regions: any;
  anchor_icao: string;
  pair_airport_set: any | null;
  frozen_draw_seed: string;
}
interface SegmentRow {
  segment_id: string; batch_id: string; segment_index: number; segment_kind: "ACTIVE" | "GAP";
  status: "PLANNED" | "ACTIVE" | "CLOSED" | "FAILED";
  segment_start_utc: Date; segment_end_utc: Date; balance_before: number | null;
}

function sha(v: unknown): string { return createHash("sha256").update(JSON.stringify(v)).digest("hex"); }
function seedInt(seed: string): number { return Math.max(1, parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) & 0x7fffffff); }
async function readMeta(key: string): Promise<string | null> {
  const r = await pool.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1", [key]);
  return r.rowCount ? String(r.rows[0].value) : null;
}
async function writeIncident(cause: "authentication" | "raw-persistence" | "reconciliation" | "deletion", detail: unknown): Promise<void> {
  await pool.query("INSERT INTO clean.adb_incident_stop(cause,detail) VALUES($1,$2::jsonb)", [cause, JSON.stringify(detail)]);
}
async function assertNoOpenIncident(): Promise<void> {
  const r = await pool.query("SELECT cause FROM clean.adb_incident_stop WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1");
  if (r.rowCount) throw new Error(`REFUSE_INCIDENT_STOP:${r.rows[0].cause}`);
}
function validateRuntimeConfig(raw: unknown, expectedHash: string): FrozenRuntimeConfig {
  if (!raw || typeof raw !== "object") throw new Error("REFUSED_RUNTIME_CONFIG: missing frozen runtime config");
  const c = raw as FrozenRuntimeConfig;
  if (sha(c) !== expectedHash) throw new Error("REFUSED_RUNTIME_CONFIG: config hash mismatch");
  if (c.hardCapCredits !== 1900 || c.protectedAlertFloor < 1000 || c.endingAlertMarginCredits < 0 || c.unsettledBurstMarginCredits < 0 || c.phase6AlertSpendCeiling <= 0 || c.softStopMarginCredits < 0 || c.softStopMarginCredits >= 1900 || c.productionReconcileTolerance < 0 || c.startGraceSeconds < 0) throw new Error("REFUSED_RUNTIME_CONFIG: invalid frozen safety values");
  if (!/^[0-9a-f]{64}$/i.test(c.authorizationRecordHash)) throw new Error("REFUSED_RUNTIME_CONFIG: authorization hash missing");
  if (!c.settlement || c.settlement.stableReadCount < 3 || c.settlement.timeoutSeconds <= 0 || c.settlement.pollIntervalSeconds < 0 || c.settlement.initialWaitSeconds < 0) throw new Error("REFUSED_RUNTIME_CONFIG: settlement config invalid");
  return c;
}
async function loadRuntimeConfig(expectedHash: string): Promise<FrozenRuntimeConfig> {
  const raw = await readMeta("v39_phase6_runtime_config");
  if (!raw) throw new Error("REFUSED_RUNTIME_CONFIG: v39_phase6_runtime_config missing");
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new Error("REFUSED_RUNTIME_CONFIG: invalid JSON"); }
  return validateRuntimeConfig(parsed, expectedHash);
}
function requireAutomationAuthorization(config: FrozenRuntimeConfig): void {
  const supplied = String(process.env.V39_AUTOMATION_AUTH_HASH ?? "").trim().toLowerCase();
  if (supplied !== config.authorizationRecordHash.toLowerCase()) throw new Error("REFUSED_AUTOMATION_AUTH: exact frozen authorization hash not present");
}

function mapBatch(r: any): CollectionBatch {
  return {
    batchId: String(r.batch_id), batchSeq: Number(r.batch_seq), randomSeed: Number(r.random_seed),
    status: r.status === "CLOSED" ? "CLOSED" : "ACTIVE", startedAt: new Date(r.started_at),
    endedAt: r.ended_at ? new Date(r.ended_at) : null, windowStart: new Date(r.window_start), windowEnd: new Date(r.window_end),
    creditBudget: Number(r.credit_budget), tierMix: r.tier_mix ?? {}, airports: r.airports ?? [], stopReason: r.stop_reason ?? null,
  };
}
export async function getActiveBatch(): Promise<CollectionBatch | null> {
  const r = await pool.query("SELECT * FROM clean.adb_collection_batches WHERE status='ACTIVE' ORDER BY batch_seq DESC LIMIT 1");
  return r.rowCount ? mapBatch(r.rows[0]) : null;
}

function dayStart(row: CalendarDayRow): Date {
  const d = String(row.date_utc).slice(0, 10); const clock = row.utc_slot.length === 5 ? `${row.utc_slot}:00` : row.utc_slot;
  const x = new Date(`${d}T${clock}Z`); if (!Number.isFinite(x.getTime())) throw new Error("REFUSED_CALENDAR: invalid date/slot"); return x;
}
function segmentPlan(row: CalendarDayRow): Array<{ id: string; index: number; kind: "ACTIVE" | "GAP"; start: Date; end: Date }> {
  const s = dayStart(row); const at = (h: number) => new Date(s.getTime() + h * 3_600_000);
  const prefix = `D${row.run_day_index}`;
  if (row.window_shape === "4h") return [{ id: `${prefix}-S1`, index: 1, kind: "ACTIVE", start: s, end: at(4) }];
  if (row.window_shape === "up-to-6h") return [{ id: `${prefix}-S1`, index: 1, kind: "ACTIVE", start: s, end: at(6) }];
  return [
    { id: `${prefix}-S1`, index: 1, kind: "ACTIVE", start: s, end: at(2) },
    { id: `${prefix}-GAP`, index: 2, kind: "GAP", start: at(2), end: at(3) },
    { id: `${prefix}-S2`, index: 3, kind: "ACTIVE", start: at(3), end: at(5) },
  ];
}
async function nextCalendarDay(): Promise<CalendarDayRow> {
  const r = await pool.query(`SELECT d.* FROM clean.adb_phase6_calendar_day d
    LEFT JOIN clean.adb_collection_batches b ON b.run_day_index=d.run_day_index
    WHERE b.run_day_index IS NULL ORDER BY d.run_day_index LIMIT 1`);
  if (!r.rowCount) throw new Error("REFUSED_CALENDAR: no unconsumed frozen run day");
  return r.rows[0] as CalendarDayRow;
}
async function assertR1Exclusive(): Promise<void> {
  const provider = await listSubscriptions();
  const owned = await pool.query("SELECT subscription_id FROM clean.adb_collection_subs WHERE ended_at IS NULL");
  const ids = new Set(owned.rows.map((r: any) => String(r.subscription_id)));
  const foreign = provider.filter(s => s.isActive && s.billingType !== "LifetimeBased" && !ids.has(String(s.id)));
  if (foreign.length) throw new Error(`REFUSED_R1_FOREIGN_ACTIVE:${foreign.map(x => x.id).join(",")}`);
}

async function loadFrameAndStates(): Promise<{ frame: FrameSamplingCandidate[]; states: AirportSamplingState[] }> {
  const r = await pool.query(`SELECT f.icao,f.tier,f.region,f.traffic_prior,f.in_frame,f.pre_eligible,f.post_eligible,
      NULL::text AS exclusion_reason,
      s.ema_yield,s.m_i,s.zero_yield_state,s.consecutive_zero_yield,s.first_zero_yield_date::text,
      s.last_successful_phase6_observation_at,s.last_direct_observation_at,s.last_selected_at,
      s.provider_failure,s.coverage_failed,s.state_version
    FROM clean.adb_sampling_frame f
    LEFT JOIN clean.adb_airport_sampling_state s USING(icao)
    WHERE f.in_frame=true AND f.pre_eligible=true AND f.post_eligible=true AND f.region<>'UNMAPPED'`);
  const frame: FrameSamplingCandidate[] = r.rows.map((x: any) => ({
    icao: String(x.icao), tier: x.tier as AirportTier, region: String(x.region), trafficPrior: Number(x.traffic_prior), tierPrior: Number(x.traffic_prior),
    inFrame: x.in_frame === true, preEligible: x.pre_eligible === true, postEligible: x.post_eligible === true, exclusionReason: null,
  }));
  for (const c of frame) if (!(c.trafficPrior > 0) || !Number.isFinite(c.trafficPrior)) throw new Error(`REFUSED_FRAME_PRIOR:${c.icao}`);
  const states: AirportSamplingState[] = r.rows.filter((x: any) => x.m_i != null).map((x: any) => ({
    icao: String(x.icao), emaYield: x.ema_yield == null ? null : Number(x.ema_yield), mi: Number(x.m_i), zeroYieldState: x.zero_yield_state,
    consecutiveZeroYield: Number(x.consecutive_zero_yield ?? 0), firstZeroYieldDate: x.first_zero_yield_date ?? null,
    lastSuccessfulPhase6ObservationAt: x.last_successful_phase6_observation_at ? new Date(x.last_successful_phase6_observation_at).toISOString() : null,
    lastDirectObservationAt: x.last_direct_observation_at ? new Date(x.last_direct_observation_at).toISOString() : null,
    lastSelectedAt: x.last_selected_at ? new Date(x.last_selected_at).toISOString() : null,
    providerFailure: x.provider_failure === true, coverageFailed: x.coverage_failed === true, stateVersion: Number(x.state_version ?? 0),
  }));
  return { frame, states };
}
function planFromRow(row: CalendarDayRow): FrozenRunDaySamplingPlan {
  return {
    runDayIndex: Number(row.run_day_index), calendarHash: row.calendar_hash, configHash: row.config_hash,
    windowStartUtc: dayStart(row), drawType: row.draw_type, slotRegions: row.slot_regions,
    anchorIcao: row.anchor_icao, pairAirportSet: row.pair_airport_set, frozenDrawSeed: row.frozen_draw_seed,
  };
}
async function loadOrFreezeDecision(row: CalendarDayRow): Promise<SamplingDecision> {
  const existing = await pool.query("SELECT * FROM clean.adb_sampling_draw WHERE run_day_index=$1 ORDER BY slot_id", [row.run_day_index]);
  if (existing.rowCount === 4) {
    const selections: SamplingSelection[] = existing.rows.map((x: any) => ({
      slotId: x.slot_id, icao: x.selected_icao, targetRegion: x.target_region, isRandomized: x.slot_id === "REGIONAL",
      designProbability: x.airport_layer_design_probability == null ? null : Number(x.airport_layer_design_probability),
      plannedShare: x.slot_id === "REGIONAL" ? null : 1, adaptiveStateHash: x.adaptive_state_hash ?? null,
      probabilityVector: x.probability_vector ?? null, drawType: x.draw_type,
    }));
    return { selections, stateHash: sha(selections) };
  }
  if (existing.rowCount !== 0) throw new Error("REFUSED_SAMPLING_DRAW: partial persisted decision");
  const { frame, states } = await loadFrameAndStates();
  const decision = chooseAirportsForRunDay(planFromRow(row), frame, states);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const s of decision.selections) {
      await client.query(`INSERT INTO clean.adb_sampling_draw
        (run_day_index,slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,adaptive_state_hash,probability_vector,airport_layer_design_probability)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`, [row.run_day_index, s.slotId, s.targetRegion, s.drawType, s.icao, row.frozen_draw_seed, s.adaptiveStateHash, s.probabilityVector ? JSON.stringify(s.probabilityVector) : null, s.designProbability]);
    }
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK").catch(() => undefined); throw e; } finally { client.release(); }
  return decision;
}

async function markSelected(decision: SamplingDecision, runDayIndex: number, at: Date): Promise<void> {
  for (const s of decision.selections) await pool.query(`INSERT INTO clean.adb_airport_sampling_state(icao,last_selected_at,last_selected_run_day)
    VALUES($1,$2,$3) ON CONFLICT(icao) DO UPDATE SET last_selected_at=EXCLUDED.last_selected_at,last_selected_run_day=EXCLUDED.last_selected_run_day,updated_at_utc=now()`, [s.icao, at, runDayIndex]);
}
function tierForSlot(slot: string): AirportTier { return slot === "HUB" ? "HUB" : slot === "REGIONAL" ? "REGIONAL" : "MID"; }
async function createSegmentSubscriptions(batchId: string, segmentId: string, decision: SamplingDecision): Promise<CreatedSub[]> {
  for (const s of decision.selections) {
    const health = await checkAirportFeeds(s.icao);
    if (!health) throw new Error(`REFUSED_COVERAGE:${s.icao}`);
  }
  const created: CreatedSub[] = [];
  try {
    for (const s of decision.selections) {
      const sub = await createSubscription("FlightByAirportIcao", s.icao, { maxDeliveryRetries: 0 });
      if (!sub) throw new Error(`CREATE_FAILED:${s.icao}`);
      await pool.query(`INSERT INTO clean.adb_collection_subs
        (subscription_id,batch_id,segment_id,icao,tier,is_randomized,airport_layer_design_probability,planned_share,sampling_weight)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,NULL)`, [sub.id, batchId, segmentId, s.icao, tierForSlot(s.slotId), s.isRandomized, s.designProbability, s.plannedShare]);
      created.push({ icao: s.icao, tier: tierForSlot(s.slotId), subscriptionId: sub.id });
    }
    return created;
  } catch (error) {
    let deletionFailed = false;
    for (const c of created) {
      if (await deleteSubscription(c.subscriptionId)) await pool.query("UPDATE clean.adb_collection_subs SET ended_at=now() WHERE subscription_id=$1", [c.subscriptionId]);
      else deletionFailed = true;
    }
    if (deletionFailed) await writeIncident("deletion", { batchId, segmentId, reason: "create rollback delete failed" });
    throw error;
  }
}

async function activeSegment(batchId: string): Promise<SegmentRow | null> {
  const r = await pool.query("SELECT * FROM clean.adb_collection_segments WHERE batch_id=$1 AND status='ACTIVE' ORDER BY segment_index LIMIT 1", [batchId]);
  return r.rowCount ? { ...r.rows[0], segment_start_utc: new Date(r.rows[0].segment_start_utc), segment_end_utc: new Date(r.rows[0].segment_end_utc), balance_before: r.rows[0].balance_before == null ? null : Number(r.rows[0].balance_before) } : null;
}
async function nextPlannedSegment(batchId: string): Promise<SegmentRow | null> {
  const r = await pool.query("SELECT * FROM clean.adb_collection_segments WHERE batch_id=$1 AND status='PLANNED' ORDER BY segment_index LIMIT 1", [batchId]);
  return r.rowCount ? { ...r.rows[0], segment_start_utc: new Date(r.rows[0].segment_start_utc), segment_end_utc: new Date(r.rows[0].segment_end_utc), balance_before: null } : null;
}
async function segmentInternalItems(segmentId: string): Promise<number> {
  const r = await pool.query(`SELECT COALESCE(sum(e.notification_items),0)::bigint AS n
    FROM clean.adb_ingest_events e JOIN clean.adb_collection_subs s ON s.subscription_id=e.subscription_id
    WHERE s.segment_id=$1`, [segmentId]);
  return Number(r.rows[0]?.n ?? 0);
}
async function settleAndCloseActiveSegment(batch: CollectionBatch, seg: SegmentRow, reason: string, config: FrozenRuntimeConfig): Promise<number> {
  const subs = await pool.query("SELECT subscription_id FROM clean.adb_collection_subs WHERE segment_id=$1 AND ended_at IS NULL", [seg.segment_id]);
  let deletionFailure = false;
  for (const r of subs.rows) {
    const id = String(r.subscription_id);
    if (await deleteSubscription(id)) await pool.query("UPDATE clean.adb_collection_subs SET ended_at=now() WHERE subscription_id=$1", [id]);
    else deletionFailure = true;
  }
  if (deletionFailure) {
    await writeIncident("deletion", { batchId: batch.batchId, segmentId: seg.segment_id });
    await pool.query("UPDATE clean.adb_collection_segments SET status='FAILED',stop_reason=$2 WHERE segment_id=$1", [seg.segment_id, "delete_failed"]);
    throw new Error("INCIDENT_STOP: provider subscription deletion failed");
  }
  const settlement = await runSettlement(config.settlement, async () => (await getBalance())?.creditsRemaining ?? null);
  if (settlement.status !== "settled") {
    await writeIncident("reconciliation", { batchId: batch.batchId, segmentId: seg.segment_id, settlement });
    await pool.query("UPDATE clean.adb_collection_segments SET status='FAILED',stop_reason=$2 WHERE segment_id=$1", [seg.segment_id, "settlement_unresolved"]);
    throw new Error("INCIDENT_STOP: settlement unresolved");
  }
  const before = seg.balance_before;
  if (before === null) throw new Error("INCIDENT_STOP: segment balance_before missing");
  const ext = externalSpend(before, settlement.stableBalance);
  if (ext < 0) {
    await writeIncident("reconciliation", { batchId: batch.batchId, segmentId: seg.segment_id, before, after: settlement.stableBalance, reason: "balance increased during segment" });
    throw new Error("INCIDENT_STOP: unrelated balance movement/refill detected");
  }
  const internal = await segmentInternalItems(seg.segment_id);
  const rec = reconcileSpend({ cExternal: ext, cInternal: internal, tolerance: config.productionReconcileTolerance });
  if (!rec.match) {
    await writeIncident("reconciliation", { batchId: batch.batchId, segmentId: seg.segment_id, ext, internal, tolerance: config.productionReconcileTolerance });
    throw new Error("INCIDENT_STOP: segment reconciliation mismatch");
  }
  await pool.query(`UPDATE clean.adb_collection_segments SET status='CLOSED',ended_at_utc=now(),stop_reason=$2,
    balance_stable_after=$3,settled_alert_spend=$4,notification_items_internal=$5,reconciliation_status='MATCH' WHERE segment_id=$1`, [seg.segment_id, reason, settlement.stableBalance, ext, internal]);
  return settlement.stableBalance;
}
async function closeParent(batch: CollectionBatch, reason: string, stableBalance: number, config: FrozenRuntimeConfig): Promise<void> {
  const r = await pool.query("SELECT balance_before FROM clean.adb_collection_batches WHERE batch_id=$1", [batch.batchId]);
  const before = r.rowCount && r.rows[0].balance_before != null ? Number(r.rows[0].balance_before) : null;
  if (before === null) { await writeIncident("reconciliation", { batchId: batch.batchId, reason: "parent balance_before missing" }); throw new Error("INCIDENT_STOP: parent balance missing"); }
  const ext = externalSpend(before, stableBalance);
  const internalR = await pool.query("SELECT COALESCE(sum(notification_items),0)::bigint AS n FROM clean.adb_ingest_events WHERE batch_id=$1", [batch.batchId]);
  const internal = Number(internalR.rows[0]?.n ?? 0);
  const rec = reconcileSpend({ cExternal: ext, cInternal: internal, tolerance: config.productionReconcileTolerance });
  if (!rec.match || ext > 1900) {
    await writeIncident("reconciliation", { batchId: batch.batchId, ext, internal, hardCap: 1900, rec });
    throw new Error("INCIDENT_STOP: parent reconciliation/hard-cap mismatch");
  }
  await pool.query(`UPDATE clean.adb_collection_batches SET status='CLOSED',ended_at=now(),stop_reason=$2,balance_after=$3,
    credits_consumed_actual=$4,credits_consumed_internal=$5,notification_items_received=$5,reconciliation_status='MATCH',reconcile_acked=true WHERE batch_id=$1`, [batch.batchId, reason, stableBalance, ext, internal]);
}

export async function startBatch(): Promise<StartBatchResult> {
  if (!isPhase6Ready()) throw new Error("REFUSED_PHASE6_READY: authorized Phase-6 transition is absent");
  if (await getActiveBatch()) throw new Error("REFUSED_ACTIVE_BATCH: stop active batch first");
  await assertNoOpenIncident();
  await assertR1Exclusive();
  const day = await nextCalendarDay();
  const config = await loadRuntimeConfig(day.config_hash);
  const start = dayStart(day), now = new Date();
  if (now.getTime() < start.getTime() || now.getTime() - start.getTime() > config.startGraceSeconds * 1000) throw new Error(`REFUSED_SCHEDULE: run day ${day.run_day_index} must start inside frozen start grace`);
  const spentR = await pool.query("SELECT COALESCE(sum(credits_consumed_actual),0)::bigint AS n FROM clean.adb_collection_batches WHERE status='CLOSED' AND credits_consumed_actual IS NOT NULL");
  const runSpent = Number(spentR.rows[0]?.n ?? 0);
  if (runSpent >= config.phase6AlertSpendCeiling) throw new Error("REFUSED_RUN_ALERT_CEILING");
  const balance = await getBalance();
  if (!balance) throw new Error("REFUSED_BALANCE: authoritative Alert balance unavailable");
  const protectedRequired = config.protectedAlertFloor + config.endingAlertMarginCredits + config.unsettledBurstMarginCredits;
  if (balance.creditsRemaining - protectedRequired < config.hardCapCredits) throw new Error("REFUSED_BALANCE_TREE: cannot preserve protected Alert reserves plus one hard-cap day");
  const decision = await loadOrFreezeDecision(day);
  const segs = segmentPlan(day);
  const first = segs[0];
  const batchId = `P6D${String(day.run_day_index).padStart(3, "0")}`;
  const airports = decision.selections.map(s => s.icao);
  const randomSeed = seedInt(day.frozen_draw_seed);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO clean.adb_collection_batches
      (batch_id,batch_seq,random_seed,status,started_at,window_start,window_end,credit_budget,tier_mix,airports,window_shape,anchor_icao,sampling_strategy,
       balance_before,run_day_index,budget_day_id,calendar_hash,config_hash,experiment_day_id,crossover_group_id,crossover_period,pair_role,evaluation_partition)
      VALUES($1,$2,$3,'ACTIVE',now(),$4,$5,1900,$6::jsonb,$7,$8,$9,'v39-frozen-cell',$10,$2,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [batchId, day.run_day_index, randomSeed, start, segs[segs.length - 1].end, JSON.stringify(COLLECTOR_CONFIG.tierMix), airports, day.window_shape, day.anchor_icao, balance.creditsRemaining, day.budget_day_id, day.calendar_hash, day.config_hash, `exp_day_${day.run_day_index}`, day.crossover_group_id, day.crossover_period, day.pair_role, day.evaluation_partition]);
    for (const s of segs) await client.query(`INSERT INTO clean.adb_collection_segments(segment_id,batch_id,run_day_index,segment_index,segment_kind,status,segment_start_utc,segment_end_utc)
      VALUES($1,$2,$3,$4,$5,'PLANNED',$6,$7)`, [s.id, batchId, day.run_day_index, s.index, s.kind, s.start, s.end]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK").catch(() => undefined); throw e; } finally { client.release(); }
  await pool.query("UPDATE clean.adb_collection_segments SET status='ACTIVE',started_at_utc=now(),balance_before=$2 WHERE segment_id=$1", [first.id, balance.creditsRemaining]);
  let created: CreatedSub[] = [];
  try {
    created = await createSegmentSubscriptions(batchId, first.id, decision);
    await markSelected(decision, day.run_day_index, now);
  } catch (e: any) {
    await pool.query("UPDATE clean.adb_collection_segments SET status='FAILED',ended_at_utc=now(),stop_reason=$2 WHERE segment_id=$1", [first.id, e?.message ?? "create_failed"]);
    await pool.query("UPDATE clean.adb_collection_batches SET status='CLOSED',ended_at=now(),stop_reason='create_failed',reconciliation_status='UNSETTLED' WHERE batch_id=$1", [batchId]);
    throw e;
  }
  return { batch: (await getActiveBatch())!, created, skipped: [] };
}

export async function stopBatch(reason: string): Promise<CollectionBatch | null> {
  const batch = await getActiveBatch(); if (!batch) return null;
  const dayR = await pool.query("SELECT config_hash FROM clean.adb_phase6_calendar_day WHERE run_day_index=$1", [batch.batchSeq]);
  if (!dayR.rowCount) throw new Error("REFUSED_CALENDAR: active batch has no frozen day");
  const config = await loadRuntimeConfig(dayR.rows[0].config_hash);
  const seg = await activeSegment(batch.batchId);
  if (!seg) throw new Error("INCIDENT_STOP: active parent has no active segment/gap");
  if (seg.segment_kind === "GAP") {
    await pool.query("UPDATE clean.adb_collection_segments SET status='CLOSED',ended_at_utc=now(),stop_reason=$2 WHERE segment_id=$1", [seg.segment_id, reason]);
    const b = await getBalance(); if (!b) throw new Error("INCIDENT_STOP: balance unavailable during gap stop");
    await closeParent(batch, reason, b.creditsRemaining, config);
  } else {
    const stable = await settleAndCloseActiveSegment(batch, seg, reason, config);
    await closeParent(batch, reason, stable, config);
  }
  await pool.query("UPDATE clean.adb_collection_segments SET status='FAILED',ended_at_utc=now(),stop_reason='parent_stopped' WHERE batch_id=$1 AND status='PLANNED'", [batch.batchId]);
  return { ...batch, status: "CLOSED", endedAt: new Date(), stopReason: reason };
}

async function advanceBatch(batch: CollectionBatch): Promise<void> {
  const dayR = await pool.query("SELECT * FROM clean.adb_phase6_calendar_day WHERE run_day_index=$1", [batch.batchSeq]); if (!dayR.rowCount) throw new Error("REFUSED_CALENDAR");
  const day = dayR.rows[0] as CalendarDayRow; const config = await loadRuntimeConfig(day.config_hash);
  let seg = await activeSegment(batch.batchId);
  const now = new Date();
  if (seg) {
    if (now < seg.segment_end_utc) return;
    if (seg.segment_kind === "ACTIVE") {
      const stable = await settleAndCloseActiveSegment(batch, seg, "segment_elapsed", config);
      const next = await nextPlannedSegment(batch.batchId);
      if (!next) { await closeParent(batch, "window_elapsed", stable, config); return; }
      if (next.segment_kind === "GAP") {
        await pool.query("UPDATE clean.adb_collection_segments SET status='ACTIVE',started_at_utc=now() WHERE segment_id=$1", [next.segment_id]);
        return;
      }
    } else {
      await pool.query("UPDATE clean.adb_collection_segments SET status='CLOSED',ended_at_utc=now(),stop_reason='gap_elapsed' WHERE segment_id=$1", [seg.segment_id]);
    }
  }
  seg = await activeSegment(batch.batchId);
  if (seg) return;
  const next = await nextPlannedSegment(batch.batchId);
  if (!next) {
    const b = await getBalance(); if (!b) throw new Error("INCIDENT_STOP: final balance unavailable");
    await closeParent(batch, "window_elapsed", b.creditsRemaining, config); return;
  }
  if (now < next.segment_start_utc) return;
  if (next.segment_kind === "GAP") { await pool.query("UPDATE clean.adb_collection_segments SET status='ACTIVE',started_at_utc=now() WHERE segment_id=$1", [next.segment_id]); return; }
  await assertNoOpenIncident(); await assertR1Exclusive();
  const b = await getBalance(); if (!b) throw new Error("REFUSED_BALANCE: segment restart balance unavailable");
  const decision = await loadOrFreezeDecision(day);
  await pool.query("UPDATE clean.adb_collection_segments SET status='ACTIVE',started_at_utc=now(),balance_before=$2 WHERE segment_id=$1", [next.segment_id, b.creditsRemaining]);
  try { await createSegmentSubscriptions(batch.batchId, next.segment_id, decision); }
  catch (e) { await pool.query("UPDATE clean.adb_collection_segments SET status='FAILED',ended_at_utc=now(),stop_reason='create_failed' WHERE segment_id=$1", [next.segment_id]); throw e; }
}

export async function actualBatchSpend(batchId: string): Promise<number> {
  const r = await pool.query("SELECT balance_before FROM clean.adb_collection_batches WHERE batch_id=$1", [batchId]);
  if (!r.rowCount || r.rows[0].balance_before == null) throw new Error("REFUSED_SPEND: batch balance_before missing");
  const b = await getBalance(); if (!b) throw new Error("REFUSED_SPEND: authoritative current balance unavailable");
  const spent = Number(r.rows[0].balance_before) - b.creditsRemaining;
  if (spent < 0) throw new Error("REFUSED_SPEND: balance increased during active batch");
  return spent;
}
export async function creditsUsedTodayUtc(): Promise<number> {
  const r = await pool.query("SELECT COALESCE(sum(notification_items),0)::bigint AS n FROM clean.adb_ingest_events WHERE received_at>=date_trunc('day',now())"); return Number(r.rows[0]?.n ?? 0);
}
export interface BudgetDayState { budgetDayId: string; batchSeq: number | null; status: "none" | "active" | "closed_settled" | "closed_unsettled"; settledSpend: number | null; }
export async function getLastBudgetDay(): Promise<BudgetDayState> {
  const r = await pool.query("SELECT batch_seq,status,reconciliation_status,credits_consumed_actual FROM clean.adb_collection_batches ORDER BY batch_seq DESC LIMIT 1");
  if (!r.rowCount) return { budgetDayId: "none", batchSeq: null, status: "none", settledSpend: null };
  const x = r.rows[0]; return { budgetDayId: budgetDayIdForBatch(Number(x.batch_seq)), batchSeq: Number(x.batch_seq), status: x.status === "ACTIVE" ? "active" : x.reconciliation_status === "MATCH" ? "closed_settled" : "closed_unsettled", settledSpend: x.credits_consumed_actual == null ? null : Number(x.credits_consumed_actual) };
}
export async function creditsUsedByBudgetDaySeq(batchSeq: number): Promise<number> {
  const r = await pool.query("SELECT credits_consumed_actual FROM clean.adb_collection_batches WHERE batch_seq=$1 AND reconciliation_status='MATCH'", [batchSeq]);
  if (!r.rowCount || r.rows[0].credits_consumed_actual == null) throw new Error("REFUSED_BUDGET_DAY: unsettled/missing spend");
  return Number(r.rows[0].credits_consumed_actual);
}
export async function deliveryFailuresForBatch(batchId: string): Promise<number> { const r = await pool.query("SELECT count(*)::int AS n FROM clean.adb_ingest_events WHERE batch_id=$1 AND delivery_failure", [batchId]); return Number(r.rows[0]?.n ?? 0); }
export async function deliveryFailuresToday(): Promise<number> { const r = await pool.query("SELECT count(*)::int AS n FROM clean.adb_ingest_events WHERE received_at>=date_trunc('day',now()) AND delivery_failure", []); return Number(r.rows[0]?.n ?? 0); }
export async function flagBatchRows(batchId: string, reason: string): Promise<number> { const r = await pool.query("UPDATE clean.flight_data_pre_post SET flagged_at=now(),flag_reason=$2 WHERE sampling_batch_id=$1 AND flagged_at IS NULL", [batchId, reason]); return r.rowCount ?? 0; }

export async function lookupSubscriptionMeta(subscriptionId: string): Promise<SamplingMeta | null> {
  const r = await pool.query(`SELECT s.batch_id,s.tier,s.is_randomized,s.airport_layer_design_probability,s.planned_share,s.sampling_weight,b.random_seed,b.window_start,b.window_end
    FROM clean.adb_collection_subs s JOIN clean.adb_collection_batches b ON b.batch_id=s.batch_id WHERE s.subscription_id=$1`, [subscriptionId]);
  if (!r.rowCount) return null; const x = r.rows[0];
  return { batchId: x.batch_id, tier: x.tier, isRandomized: x.is_randomized === true, airportLayerDesignProbability: x.airport_layer_design_probability == null ? null : Number(x.airport_layer_design_probability), plannedShare: x.planned_share == null ? null : Number(x.planned_share), samplingWeight: x.sampling_weight == null ? null : Number(x.sampling_weight), randomSeed: x.random_seed == null ? null : String(x.random_seed), windowStart: x.window_start ? new Date(x.window_start) : null, windowEnd: x.window_end ? new Date(x.window_end) : null };
}
export async function estimateBatchCredits(batchId: string): Promise<number> { const r = await pool.query("SELECT count(*)::int AS n FROM clean.flight_data_pre_post WHERE sampling_batch_id=$1", [batchId]); return Number(r.rows[0]?.n ?? 0); }

export interface CollectionStatus {
  balance: number | null; reserveCredits: number; batchBudget: number; minBatchCredits: number; windowHours: number; tierMix: Record<string, number>;
  dailyCreditCap: number; creditsUsedToday: number | null; dailyRemaining: number | null; deliveryFailuresToday: number | null; currentAnchor: string | null;
  activeBatch: CollectionBatch | null; activeBatchCredits: number | null; canStart: boolean; reason: string | null; refillRecommended: number; lastReceivedAt: Date | null; gapMinutes: number | null;
}
export async function getCollectionStatus(): Promise<CollectionStatus> {
  const [balance, active] = await Promise.all([getBalance(), getActiveBatch()]);
  let incident = false; try { await assertNoOpenIncident(); } catch { incident = true; }
  let last: Date | null = null; try { const r = await pool.query("SELECT max(received_at)::timestamptz AS last FROM clean.flight_data_pre_post"); if (r.rows[0]?.last) last = new Date(r.rows[0].last); } catch {}
  let failures: number | null = null; try { failures = await deliveryFailuresToday(); } catch {}
  let anchor: string | null = null; try { const d = await nextCalendarDay(); anchor = d.anchor_icao; } catch {}
  const remaining = balance?.creditsRemaining ?? 0;
  const canStart = !active && isPhase6Ready() && !incident;
  return { balance: balance?.creditsRemaining ?? null, reserveCredits: 1000, batchBudget: 1900, minBatchCredits: 1900, windowHours: 4, tierMix: COLLECTOR_CONFIG.tierMix, dailyCreditCap: 1900,
    creditsUsedToday: null, dailyRemaining: null, deliveryFailuresToday: failures, currentAnchor: anchor, activeBatch: active, activeBatchCredits: active ? await estimateBatchCredits(active.batchId) : null,
    canStart, reason: active ? "A batch is active." : !isPhase6Ready() ? "PHASE6_READY is false." : incident ? "Persistent incident stop is open." : null,
    refillRecommended: Math.max(0, 2900 - remaining), lastReceivedAt: last, gapMinutes: last ? Math.max(0, Math.round((Date.now() - last.getTime()) / 60_000)) : null };
}

export interface AirportCoverage {
  fetchedAt: string | null; universe: Record<FeedService, string[]>; universeCount: number; catalogCount: number; catalogInUniverse: number; catalogMissingFromUniverse: string[];
  byTier: Record<string, { catalog: number; inUniverse: number; coveragePct: number }>; worldScheduledCommercial: number; error: string | null;
}
export function computeAirportCoverage(feeds: Partial<Record<FeedService, string[]>>): Omit<AirportCoverage, "fetchedAt" | "error" | "worldScheduledCommercial"> {
  const services: FeedService[] = ["FlightSchedules", "FlightLiveUpdates", "AdsbUpdates"];
  const universe: Record<FeedService, string[]> = { FlightSchedules: feeds.FlightSchedules ?? [], FlightLiveUpdates: feeds.FlightLiveUpdates ?? [], AdsbUpdates: feeds.AdsbUpdates ?? [] };
  const union = new Set(services.flatMap(s => universe[s].map(x => x.toUpperCase()))); const catalog = Object.keys(AIRPORT_CATALOG);
  const byTier: AirportCoverage["byTier"] = {};
  for (const tier of ["HUB", "MID", "REGIONAL"]) { const xs = catalog.filter(x => tierForIcao(x) === tier); const hit = xs.filter(x => union.has(x)).length; byTier[tier] = { catalog: xs.length, inUniverse: hit, coveragePct: xs.length ? hit / xs.length : 0 }; }
  return { universe, universeCount: union.size, catalogCount: catalog.length, catalogInUniverse: catalog.filter(x => union.has(x)).length, catalogMissingFromUniverse: catalog.filter(x => !union.has(x)), byTier };
}
let coverageCache: { at: number; data: AirportCoverage } | null = null;
export async function getAirportCoverage(force = false): Promise<AirportCoverage | null> {
  if (!force && coverageCache && Date.now() - coverageCache.at < 12 * 3_600_000) return coverageCache.data;
  try {
    const [s, l, a] = await Promise.all([listFeedAirports("FlightSchedules"), listFeedAirports("FlightLiveUpdates"), listFeedAirports("AdsbUpdates")]);
    if (!s || !l || !a) return null;
    const core = computeAirportCoverage({ FlightSchedules: s, FlightLiveUpdates: l, AdsbUpdates: a });
    const data: AirportCoverage = { ...core, fetchedAt: new Date().toISOString(), worldScheduledCommercial: 0, error: null };
    coverageCache = { at: Date.now(), data }; return data;
  } catch { return null; }
}
export interface Diagnostics {
  totals: Record<string, number>; byTier: Array<{ airport_tier: string | null; rows: number; share: number }>; byDepartureHour: Array<{ hour: number | null; rows: number }>;
  byDelayBucket: Array<{ bucket: string; rows: number }>; byStatus: Array<{ status: string | null; rows: number }>; batches: any[]; totalEstimatedCredits: number;
  lastReceivedAt: Date | null; gapMinutes: number | null; coverage?: any;
}
export async function getDiagnostics(): Promise<Diagnostics> {
  const [total, tier, status, batches] = await Promise.all([
    pool.query("SELECT count(*)::int AS rows FROM clean.flight_data_pre_post"),
    pool.query("SELECT airport_tier,count(*)::int AS rows FROM clean.flight_data_pre_post GROUP BY airport_tier ORDER BY airport_tier"),
    pool.query("SELECT status,count(*)::int AS rows FROM clean.flight_data_pre_post GROUP BY status ORDER BY 2 DESC"),
    pool.query("SELECT batch_id,status,started_at,ended_at,credit_budget,airports,window_shape,anchor_icao,sampling_strategy,credits_consumed_actual,reconciliation_status FROM clean.adb_collection_batches ORDER BY batch_seq"),
  ]);
  const n = Number(total.rows[0]?.rows ?? 0); let last: Date | null = null; try { const r = await pool.query("SELECT max(received_at)::timestamptz AS last FROM clean.flight_data_pre_post"); if (r.rows[0]?.last) last = new Date(r.rows[0].last); } catch {}
  return { totals: { rows: n }, byTier: tier.rows.map((x: any) => ({ airport_tier: x.airport_tier, rows: Number(x.rows), share: n ? Number(x.rows) / n : 0 })), byDepartureHour: [], byDelayBucket: [], byStatus: status.rows.map((x: any) => ({ status: x.status, rows: Number(x.rows) })), batches: batches.rows, totalEstimatedCredits: n, lastReceivedAt: last, gapMinutes: last ? Math.round((Date.now() - last.getTime()) / 60_000) : null, coverage: await getAirportCoverage() };
}

/** Legacy selector is intentionally disabled: production must consume frozen cells. */
export function selectFrameCandidates(): CandidatePools { throw new Error("REFUSED_LEGACY_SELECTOR: use frozen Phase-6 calendar + chooseAirportsForRunDay"); }
export async function writeManifest(): Promise<void> { throw new Error("REFUSED_LEGACY_MANIFEST: use manifest_v3.ts"); }
export async function readManifest(): Promise<Record<string, unknown> | null> { const raw = await readMeta("manifest"); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } }

let watchdogStarted = false;
export function startCollectionWatchdog(): void {
  if (watchdogStarted) return; watchdogStarted = true;
  const timer = setInterval(async () => {
    try {
      const active = await getActiveBatch();
      if (active) {
        const failures = await deliveryFailuresForBatch(active.batchId);
        if (failures > 0) { await flagBatchRows(active.batchId, "delivery_failure"); await stopBatch("delivery_failure"); return; }
        const dayR = await pool.query("SELECT config_hash FROM clean.adb_phase6_calendar_day WHERE run_day_index=$1", [active.batchSeq]);
        if (!dayR.rowCount) throw new Error("REFUSED_CALENDAR");
        const config = await loadRuntimeConfig(dayR.rows[0].config_hash);
        const spent = await actualBatchSpend(active.batchId);
        if (spent >= 1900 - config.softStopMarginCredits) { await stopBatch("soft_stop"); return; }
        await advanceBatch(active); return;
      }
      // Pre-Phase6 watchdog is strictly read-only. Auto-start requires both the
      // explicit auto flag and an exact frozen authorization hash.
      if (!COLLECTOR_CONFIG.autoCollect || !isPhase6Ready()) return;
      const day = await nextCalendarDay(); const config = await loadRuntimeConfig(day.config_hash); requireAutomationAuthorization(config);
      const start = dayStart(day), now = Date.now();
      if (now >= start.getTime() && now - start.getTime() <= config.startGraceSeconds * 1000) await startBatch();
    } catch (e: any) { console.warn(`[adb-v39] watchdog: ${e?.message ?? e}`); }
  }, COLLECTOR_CONFIG.watchdogSeconds * 1000);
  timer.unref?.();
}
