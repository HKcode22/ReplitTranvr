/**
 * V3.9-f.8 AeroDataBox collection controller.
 *
 * Binding authority: SEPmd/V3.9_DataCollectPlan_f.8.md §§0–21.
 * Phase-6 execution consumes a persistent hash-bound authorization and a
 * hash-frozen calendar/sampling template. It NEVER redraws regions at runtime,
 * never treats a manual PHASE6_READY environment variable as authority, and
 * never substitutes another airport when a frozen cell/anchor fails.
 */
import { createHash } from "crypto";
import { pool } from "../../db";
import { reconcileSpend, runSettlement, type SettlementConfig } from "./settlement_v3";
import {
  getBalance,
  createSubscription,
  deleteSubscription,
  checkAirportFeeds,
  listFeedAirports,
  type FeedService,
  type SubscriptionSubjectType,
} from "./aerodataboxLimiter_v3";
import { AIRPORT_TIERS, type AirportTier } from "./adbAirportCatalog_v3";
import {
  chooseAirportsForRunDay,
  type FrozenRunDaySamplingPlan,
  type FrameSamplingCandidate,
  type AirportSamplingState,
  type SamplingDecision,
  type SamplingSelection,
  type SlotId,
} from "./phase6SamplingDecision_v39";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = Number(raw);
  return raw && Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/** Explicit opt-in parser. Invalid/missing values are OFF. */
export function parseAutoCollect(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") return false;
  const lower = String(raw).toLowerCase().trim();
  if (["1", "true", "on", "yes"].includes(lower)) return true;
  if (["0", "false", "off", "no"].includes(lower)) return false;
  console.warn(`[adb-controller] ADB_AUTO_COLLECT invalid value "${raw}" — treating as OFF`);
  return false;
}

/**
 * Compatibility/config diagnostics only. Paid admission does NOT use these
 * fallback values for MEASURE→FREEZE quantities; it loads them from the
 * persistent Phase-6 authorization/calendar record.
 */
export const COLLECTOR_CONFIG = {
  windowHours: envInt("ADB_WINDOW_HOURS", 4),
  batchBudget: envInt("ADB_BATCH_BUDGET", 1900),
  reserveCredits: envInt("ADB_RESERVE_CREDITS", 1000),
  minBatchCredits: envInt("ADB_MIN_BATCH_CREDITS", 300),
  reconcileTolerance: 0,
  tierMix: { HUB: 1, MID: 2, REGIONAL: 1 } as Record<AirportTier, number>,
  dailyCreditCap: envInt("ADB_DAILY_CREDIT_CAP", 1900),
  softStopMargin: envInt("ADB_DAILY_SOFT_STOP_MARGIN", 0),
  anchorEnabled: true,
  anchorPool: [] as string[],
  rotatingUtcStart: false,
  utcStartCycle: [] as number[],
  rememberRecentBatches: 0,
  autoCollect: parseAutoCollect(process.env.ADB_AUTO_COLLECT),
  autoCooldownMinutes: 0,
  autoStartHourUtc: 0,
  autoEndHourUtc: 24,
  watchdogSeconds: Math.max(60, envInt("ADB_WATCHDOG_SECONDS", 60)),
  alertGapMinutes: envInt("ADB_ALERT_GAP_MIN", 90),
  alertMinBalance: envInt("ADB_ALERT_MIN_BALANCE", 0),
  alertCooldownMinutes: envInt("ADB_ALERT_COOLDOWN_MIN", 30),
  alertWebhookUrl: process.env.ADB_ALERT_WEBHOOK_URL || null,
} as const;

/**
 * Legacy synchronous compatibility indicator only. TRUE here is NEVER
 * sufficient authorization. startBatch() always verifies the persistent DB
 * authorization. This intentionally prevents PHASE6_READY=true from being a
 * bypass.
 */
export function isPhase6Ready(): boolean {
  return parseAutoCollect(process.env.ADB_AUTO_COLLECT) &&
    parseAutoCollect(process.env.V39_PHASE6_PROCESS_ARMED);
}

export function budgetDayIdForBatch(runDayIndex: number): string {
  return `run_day_${runDayIndex}`;
}

export interface CollectionBatch {
  batchId: string;
  batchSeq: number;
  randomSeed: number;
  status: "STARTING" | "ACTIVE" | "BLOCKED" | "CLOSED" | "FAILED";
  startedAt: Date;
  endedAt: Date | null;
  windowStart: Date;
  windowEnd: Date;
  creditBudget: number;
  tierMix: Record<string, number>;
  airports: string[];
  stopReason: string | null;
  runDayIndex?: number | null;
  budgetDayId?: string | null;
  calendarHash?: string | null;
  configHash?: string | null;
  phase6AuthorizationId?: string | null;
  samplingStateHash?: string | null;
}

export interface CreatedSub {
  icao: string;
  tier: AirportTier | null;
  subscriptionId: string;
}
export interface SkippedAirport {
  icao: string;
  reason: "no_coverage" | "create_failed" | "unknown";
}
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

/** Legacy selector input kept so stale callers compile. It is not executable. */
export interface EligibleFrameCandidate {
  icao: string;
  tier: AirportTier;
  trafficPrior: number;
  region: string;
}

/**
 * Retired unsafe selector. Its signature lacks the frozen slot→region sequence,
 * pair replay template and per-airport adaptive state, so executing it would
 * violate V3.9-f.8. Production uses chooseAirportsForRunDay().
 */
export function selectFrameCandidates(
  _rows: EligibleFrameCandidate[],
  _seed: number,
  _tierMix: Record<AirportTier, number>,
  _recentlyUsed: ReadonlySet<string> = new Set(),
  _opts: { miValue?: number; coverageBoostFor?: (icao: string) => number } = {},
): never {
  throw new Error("REFUSED_LEGACY_SELECTOR: use the hash-frozen phase6SamplingDecision_v39 owner");
}

function sha(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function stableSeedInt(seed: string): number {
  return Math.max(1, parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 7), 16));
}
function asDate(value: unknown): Date {
  const d = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(d.getTime())) throw new Error(`invalid persisted timestamp: ${String(value)}`);
  return d;
}
function mapBatch(r: any): CollectionBatch {
  return {
    batchId: r.batch_id,
    batchSeq: Number(r.batch_seq),
    randomSeed: Number(r.random_seed),
    status: r.status,
    startedAt: asDate(r.started_at),
    endedAt: r.ended_at ? asDate(r.ended_at) : null,
    windowStart: asDate(r.window_start),
    windowEnd: asDate(r.window_end),
    creditBudget: Number(r.credit_budget),
    tierMix: typeof r.tier_mix === "string" ? JSON.parse(r.tier_mix) : (r.tier_mix ?? {}),
    airports: Array.isArray(r.airports) ? r.airports : [],
    stopReason: r.stop_reason ?? null,
    runDayIndex: r.run_day_index == null ? null : Number(r.run_day_index),
    budgetDayId: r.budget_day_id ?? null,
    calendarHash: r.calendar_hash ?? null,
    configHash: r.config_hash ?? null,
    phase6AuthorizationId: r.phase6_authorization_id ?? null,
    samplingStateHash: r.sampling_state_hash ?? null,
  };
}

async function recordAdmission(input: {
  runDayIndex: number | null;
  authorizationId: string | null;
  manifestSha256: string | null;
  calendarHash: string | null;
  configHash: string | null;
  outcome: "ADMITTED" | "REFUSED";
  reason: string;
  stateHash?: string | null;
  providerMutationsStarted?: boolean;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO clean.adb_phase6_admission_attempt
       (run_day_index, authorization_id, manifest_sha256, calendar_hash, config_hash,
        outcome, reason, state_hash, provider_mutations_started)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [input.runDayIndex, input.authorizationId, input.manifestSha256, input.calendarHash,
       input.configHash, input.outcome, input.reason.slice(0, 1000), input.stateHash ?? null,
       input.providerMutationsStarted ?? false],
    );
  } catch (error) {
    // Admission audit failure itself must fail closed for a paid start.
    if (input.outcome === "ADMITTED") throw error;
  }
}

interface Phase6Authorization {
  authorizationId: string;
  manifestSha256: string;
  calendarHash: string;
  configHash: string;
  codeSha: string;
  schemaVersion: string;
  phase6StartDate: string;
  alertCapPerParentDay: number;
  unsettledBurstMarginCredits: number;
  protectedAlertFloor: number;
}

async function loadPhase6Authorization(): Promise<Phase6Authorization> {
  if (!COLLECTOR_CONFIG.autoCollect) throw new Error("REFUSED_AUTO_COLLECT_OFF: ADB_AUTO_COLLECT is not explicitly enabled");
  const r = await pool.query(
    `SELECT authorization_id, manifest_sha256, calendar_hash, config_hash,
            code_sha, schema_version, phase6_start_date::text,
            alert_cap_per_parent_day, unsettled_burst_margin_credits,
            protected_alert_floor
       FROM clean.adb_phase6_authorization
      WHERE singleton_key=true AND enabled=true AND revoked_at_utc IS NULL`,
  );
  if (r.rowCount !== 1) throw new Error("REFUSED_PHASE6_AUTH: no unique enabled persistent Phase-6 authorization");
  const x = r.rows[0];
  const auth: Phase6Authorization = {
    authorizationId: String(x.authorization_id),
    manifestSha256: String(x.manifest_sha256),
    calendarHash: String(x.calendar_hash),
    configHash: String(x.config_hash),
    codeSha: String(x.code_sha),
    schemaVersion: String(x.schema_version),
    phase6StartDate: String(x.phase6_start_date),
    alertCapPerParentDay: Number(x.alert_cap_per_parent_day),
    unsettledBurstMarginCredits: Number(x.unsettled_burst_margin_credits),
    protectedAlertFloor: Number(x.protected_alert_floor),
  };
  for (const [name, value] of [["manifest", auth.manifestSha256], ["calendar", auth.calendarHash], ["config", auth.configHash]] as const) {
    if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`REFUSED_PHASE6_AUTH: invalid ${name} hash`);
  }
  if (!(auth.alertCapPerParentDay > 0) || auth.protectedAlertFloor < 1000 || auth.unsettledBurstMarginCredits < 0) {
    throw new Error("REFUSED_PHASE6_AUTH: invalid frozen Alert budget values");
  }
  return auth;
}

async function assertIncidentClear(): Promise<void> {
  const r = await pool.query(
    `SELECT cause, occurred_at_utc FROM clean.adb_incident_stop
      WHERE resolved=false ORDER BY occurred_at_utc DESC LIMIT 1`,
  );
  if (r.rowCount) throw new Error(`REFUSED_INCIDENT_STOP: ${r.rows[0].cause} at ${r.rows[0].occurred_at_utc}`);
}

async function openIncident(cause: string, detail: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_incident_stop(cause, occurred_at_utc, detail, resolved)
     VALUES ($1,now(),$2,false)`,
    [cause, JSON.stringify(detail)],
  );
}

interface FrozenCalendarRow {
  runDayIndex: number;
  budgetDayId: string;
  calendarHash: string;
  configHash: string;
  frameHash: string;
  scheduledStartUtc: Date;
  activeDurationMinutes: number;
  windowShape: "4h" | "2x2h" | "up-to-6h";
  evaluationPartition: string;
  crossoverGroupId: string | null;
  crossoverPeriod: number | null;
  pairRole: string | null;
  drawType: "NEW_TEMPLATE" | "PAIR_REPLAY";
  slotRegions: Record<SlotId, string>;
  anchorIcao: string;
  pairAirportSet: any;
  frozenDrawSeed: string;
}

async function nextFrozenCalendarDay(auth: Phase6Authorization): Promise<FrozenCalendarRow> {
  const r = await pool.query(
    `SELECT c.*
       FROM clean.adb_phase6_calendar_day c
       LEFT JOIN clean.adb_collection_batches b ON b.run_day_index=c.run_day_index
      WHERE b.run_day_index IS NULL
      ORDER BY c.run_day_index ASC
      LIMIT 1`,
  );
  if (r.rowCount !== 1) throw new Error("REFUSED_CALENDAR: no unused frozen run day remains");
  const x = r.rows[0];
  if (String(x.calendar_hash) !== auth.calendarHash || String(x.config_hash) !== auth.configHash) {
    throw new Error("REFUSED_CALENDAR_HASH: run-day artifact does not match authorized hashes");
  }
  if (!x.scheduled_start_utc || !x.active_duration_minutes || !x.frame_hash) {
    throw new Error("REFUSED_CALENDAR_INCOMPLETE: final FREEZE must populate scheduled_start_utc, active_duration_minutes and frame_hash");
  }
  const shape = String(x.window_shape) as FrozenCalendarRow["windowShape"];
  const duration = Number(x.active_duration_minutes);
  if (shape === "4h" && duration !== 240) throw new Error("REFUSED_CALENDAR_DURATION: 4h day must freeze 240 active minutes");
  if (shape === "2x2h" && duration !== 240) throw new Error("REFUSED_CALENDAR_DURATION: 2x2h day must freeze 240 active minutes");
  if (shape === "up-to-6h" && (!(duration > 0) || duration > 360)) throw new Error("REFUSED_CALENDAR_DURATION: up-to-6h duration must be 1..360 minutes");
  return {
    runDayIndex: Number(x.run_day_index),
    budgetDayId: String(x.budget_day_id),
    calendarHash: String(x.calendar_hash),
    configHash: String(x.config_hash),
    frameHash: String(x.frame_hash),
    scheduledStartUtc: asDate(x.scheduled_start_utc),
    activeDurationMinutes: duration,
    windowShape: shape,
    evaluationPartition: String(x.evaluation_partition),
    crossoverGroupId: x.crossover_group_id ?? null,
    crossoverPeriod: x.crossover_period == null ? null : Number(x.crossover_period),
    pairRole: x.pair_role ?? null,
    drawType: String(x.draw_type) as FrozenCalendarRow["drawType"],
    slotRegions: x.slot_regions,
    anchorIcao: String(x.anchor_icao),
    pairAirportSet: x.pair_airport_set ?? null,
    frozenDrawSeed: String(x.frozen_draw_seed),
  };
}

async function loadFrameAndAdaptiveState(frameHash: string): Promise<{
  frame: FrameSamplingCandidate[];
  states: AirportSamplingState[];
}> {
  const reg = await pool.query(
    `SELECT active_frame_version, frame_hash FROM clean.adb_sampling_frame_registry WHERE registry_key='ACTIVE'`,
  );
  if (reg.rowCount !== 1 || String(reg.rows[0].frame_hash ?? "") !== frameHash) {
    throw new Error("REFUSED_FRAME_HASH: active DB sampling frame does not match frozen calendar frame_hash");
  }
  const rows = await pool.query(
    `SELECT f.icao,f.tier,f.region,f.traffic_prior,f.in_frame,f.pre_eligible,f.post_eligible,f.exclusion_reason,
            s.ema_yield,s.m_i,s.zero_yield_state,s.consecutive_zero_yield,s.first_zero_yield_date,
            s.last_successful_phase6_observation_at,s.last_direct_observation_at,s.last_selected_at,
            s.provider_failure,s.coverage_failed,s.state_version
       FROM clean.adb_sampling_frame f
       LEFT JOIN clean.adb_airport_sampling_state s ON s.icao=f.icao
      WHERE f.frame_version=$1`,
    [reg.rows[0].active_frame_version],
  );
  const frame: FrameSamplingCandidate[] = [];
  const states: AirportSamplingState[] = [];
  for (const r of rows.rows) {
    if (!["HUB", "MID", "REGIONAL"].includes(String(r.tier))) continue;
    frame.push({
      icao: String(r.icao), tier: r.tier, region: r.region == null ? "UNMAPPED" : String(r.region),
      trafficPrior: Number(r.traffic_prior), tierPrior: Number(r.traffic_prior),
      inFrame: r.in_frame === true, preEligible: r.pre_eligible === true,
      postEligible: r.post_eligible === true, exclusionReason: r.exclusion_reason ?? null,
    });
    states.push({
      icao: String(r.icao), emaYield: r.ema_yield == null ? null : Number(r.ema_yield),
      mi: r.m_i == null ? 1 : Number(r.m_i), zeroYieldState: r.zero_yield_state ?? "normal",
      consecutiveZeroYield: Number(r.consecutive_zero_yield ?? 0),
      firstZeroYieldDate: r.first_zero_yield_date?.toISOString?.().slice(0, 10) ?? r.first_zero_yield_date ?? null,
      lastSuccessfulPhase6ObservationAt: r.last_successful_phase6_observation_at?.toISOString?.() ?? r.last_successful_phase6_observation_at ?? null,
      lastDirectObservationAt: r.last_direct_observation_at?.toISOString?.() ?? r.last_direct_observation_at ?? null,
      lastSelectedAt: r.last_selected_at?.toISOString?.() ?? r.last_selected_at ?? null,
      providerFailure: r.provider_failure === true, coverageFailed: r.coverage_failed === true,
      stateVersion: Number(r.state_version ?? 0),
    });
  }
  if (!frame.length) throw new Error("REFUSED_FRAME_EMPTY: no frozen-frame candidates loaded");
  return { frame, states };
}

function toSamplingPlan(day: FrozenCalendarRow): FrozenRunDaySamplingPlan {
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

async function persistSamplingDecision(day: FrozenCalendarRow, decision: SamplingDecision): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const s of decision.selections) {
      await client.query(
        `INSERT INTO clean.adb_sampling_draw
         (run_day_index,slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,
          adaptive_state_hash,probability_vector,airport_layer_design_probability)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
        [day.runDayIndex,s.slotId,s.targetRegion,s.drawType,s.icao,day.frozenDrawSeed,
         s.adaptiveStateHash,s.probabilityVector ? JSON.stringify(s.probabilityVector) : null,
         s.slotId === "REGIONAL" ? s.designProbability : null],
      );
      await client.query(
        `INSERT INTO clean.adb_airport_sampling_state(icao,last_selected_at,last_selected_run_day)
         VALUES($1,$2,$3)
         ON CONFLICT(icao) DO UPDATE SET last_selected_at=EXCLUDED.last_selected_at,
           last_selected_run_day=EXCLUDED.last_selected_run_day,updated_at_utc=now()`,
        [s.icao, day.scheduledStartUtc, day.runDayIndex],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function segmentTemplates(day: FrozenCalendarRow): Array<{ index: number; kind: "ACTIVE" | "GAP"; start: Date; end: Date }> {
  const start = day.scheduledStartUtc.getTime();
  if (day.windowShape === "2x2h") {
    return [
      { index: 1, kind: "ACTIVE", start: new Date(start), end: new Date(start + 120 * 60_000) },
      { index: 2, kind: "GAP", start: new Date(start + 120 * 60_000), end: new Date(start + 180 * 60_000) },
      { index: 3, kind: "ACTIVE", start: new Date(start + 180 * 60_000), end: new Date(start + 300 * 60_000) },
    ];
  }
  return [{ index: 1, kind: "ACTIVE", start: new Date(start), end: new Date(start + day.activeDurationMinutes * 60_000) }];
}

async function assertBudgetHeadroom(auth: Phase6Authorization): Promise<number> {
  const balance = await getBalance();
  if (!balance) throw new Error("REFUSED_BALANCE_UNKNOWN: cannot verify Alert-credit headroom");
  const required = auth.protectedAlertFloor + auth.alertCapPerParentDay + auth.unsettledBurstMarginCredits;
  if (balance.creditsRemaining < required) {
    throw new Error(`REFUSED_ALERT_HEADROOM: balance=${balance.creditsRemaining} required>=${required}`);
  }
  return balance.creditsRemaining;
}

function tierForSlot(slot: SlotId): AirportTier {
  return slot === "HUB" ? "HUB" : slot === "REGIONAL" ? "REGIONAL" : "MID";
}

async function verifyAllSelectedCoverage(selections: SamplingSelection[]): Promise<void> {
  // FREE/read-only checks happen before the first provider mutation. Unknown is
  // a refusal; there is no fallback/substitution to another airport.
  for (const s of selections) {
    const feed = await checkAirportFeeds(s.icao).catch(() => null);
    if (!feed) throw new Error(`REFUSED_COVERAGE_UNKNOWN: frozen ${s.slotId} airport ${s.icao}`);
  }
}

async function createSubscriptionsForSegment(
  batchId: string,
  segmentId: string,
  selections: SamplingSelection[],
): Promise<CreatedSub[]> {
  const created: CreatedSub[] = [];
  try {
    for (const s of selections) {
      const sub = await createSubscription("FlightByAirportIcao" as SubscriptionSubjectType, s.icao, { maxDeliveryRetries: 0 });
      if (!sub?.id) throw new Error(`CREATE_FAILED:${s.slotId}:${s.icao}`);
      const tier = tierForSlot(s.slotId);
      await pool.query(
        `INSERT INTO clean.adb_collection_subs
         (subscription_id,batch_id,icao,tier,is_randomized,airport_layer_design_probability,
          planned_share,sampling_weight,segment_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8)`,
        [sub.id,batchId,s.icao,tier,s.slotId === "REGIONAL",
         s.slotId === "REGIONAL" ? s.designProbability : null,
         s.slotId === "REGIONAL" ? null : 1,
         segmentId],
      );
      created.push({ icao: s.icao, tier, subscriptionId: sub.id });
    }
    return created;
  } catch (error) {
    let cleanupFailed = false;
    for (const c of created) {
      const deleted = await deleteSubscription(c.subscriptionId).catch(() => false);
      if (deleted) await pool.query("UPDATE clean.adb_collection_subs SET ended_at=now() WHERE subscription_id=$1", [c.subscriptionId]);
      else cleanupFailed = true;
    }
    if (cleanupFailed) await openIncident("deletion", { batchId, segmentId, reason: "rollback-after-create-failure" });
    throw error;
  }
}

async function loadSelections(runDayIndex: number): Promise<SamplingSelection[]> {
  const r = await pool.query(
    `SELECT slot_id,target_region,draw_type,selected_icao,adaptive_state_hash,
            probability_vector,airport_layer_design_probability
       FROM clean.adb_sampling_draw WHERE run_day_index=$1 ORDER BY
       CASE slot_id WHEN 'HUB' THEN 1 WHEN 'MID_A' THEN 2 WHEN 'MID_B' THEN 3 ELSE 4 END`,
    [runDayIndex],
  );
  if (r.rowCount !== 4) throw new Error(`REFUSED_SAMPLING_DRAW: run_day ${runDayIndex} must have exactly four frozen selections`);
  return r.rows.map((x: any) => ({
    slotId: x.slot_id,
    icao: x.selected_icao,
    targetRegion: x.target_region,
    isRandomized: x.slot_id === "REGIONAL",
    designProbability: x.slot_id === "REGIONAL" ? Number(x.airport_layer_design_probability) : null,
    plannedShare: x.slot_id === "REGIONAL" ? null : 1,
    adaptiveStateHash: x.adaptive_state_hash ?? null,
    probabilityVector: x.probability_vector ?? null,
    drawType: x.draw_type,
  }));
}

async function activateSegment(batch: CollectionBatch, segmentId: string): Promise<CreatedSub[]> {
  await assertIncidentClear();
  const auth = await loadPhase6Authorization();
  if (auth.authorizationId !== batch.phase6AuthorizationId || auth.calendarHash !== batch.calendarHash || auth.configHash !== batch.configHash) {
    throw new Error("REFUSED_AUTH_CHANGED: active parent no longer matches Phase-6 authorization");
  }
  await assertBudgetHeadroom(auth);
  const selections = await loadSelections(batch.runDayIndex!);
  await verifyAllSelectedCoverage(selections);
  const created = await createSubscriptionsForSegment(batch.batchId, segmentId, selections);
  await pool.query(
    `UPDATE clean.adb_collection_segments SET status='ACTIVE',started_at_utc=now() WHERE segment_id=$1 AND segment_kind='ACTIVE'`,
    [segmentId],
  );
  return created;
}

export interface StartBatchResult {
  batch: CollectionBatch;
  created: CreatedSub[];
  skipped: SkippedAirport[];
}

export async function getActiveBatch(): Promise<CollectionBatch | null> {
  const r = await pool.query(
    `SELECT * FROM clean.adb_collection_batches
      WHERE status IN ('STARTING','ACTIVE','BLOCKED') ORDER BY run_day_index DESC NULLS LAST,batch_seq DESC LIMIT 1`,
  );
  return r.rowCount ? mapBatch(r.rows[0]) : null;
}

export async function startBatch(): Promise<StartBatchResult> {
  let auth: Phase6Authorization | null = null;
  let day: FrozenCalendarRow | null = null;
  try {
    if (await getActiveBatch()) throw new Error("REFUSED_ACTIVE_PARENT: an existing parent batch is not closed");
    await assertIncidentClear();
    auth = await loadPhase6Authorization();
    day = await nextFrozenCalendarDay(auth);
    if (day.budgetDayId !== budgetDayIdForBatch(day.runDayIndex)) throw new Error("REFUSED_BUDGET_DAY_ID: calendar budget day is inconsistent");

    const prior = await getLastBudgetDay();
    if (prior.status === "active" || prior.status === "closed_unsettled") {
      throw new Error(`REFUSED_PRIOR_BUDGET_DAY: ${prior.budgetDayId} is ${prior.status}`);
    }
    const openingBalance = await assertBudgetHeadroom(auth);
    const { frame, states } = await loadFrameAndAdaptiveState(day.frameHash);
    const decision = chooseAirportsForRunDay(toSamplingPlan(day), frame, states);
    if (decision.selections.length !== 4 || new Set(decision.selections.map((s) => s.icao)).size !== 4) {
      throw new Error("REFUSED_SAMPLING_DECISION: exactly four distinct frozen slots are required");
    }

    // Validate all free coverage before the first paid/provider mutation.
    await verifyAllSelectedCoverage(decision.selections);
    await persistSamplingDecision(day, decision);

    const segments = segmentTemplates(day);
    const parentEnd = segments[segments.length - 1].end;
    const batchId = `P6D${String(day.runDayIndex).padStart(2, "0")}`;
    const seedInt = stableSeedInt(day.frozenDrawSeed);
    const airports = decision.selections.map((s) => s.icao);
    const tierMix = { HUB: 1, MID: 2, REGIONAL: 1 };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO clean.adb_collection_batches
         (batch_id,batch_seq,random_seed,status,window_start,window_end,credit_budget,tier_mix,airports,
          window_shape,anchor_icao,sampling_strategy,balance_before,run_day_index,budget_day_id,
          calendar_hash,config_hash,experiment_day_id,crossover_group_id,crossover_period,pair_role,
          evaluation_partition,phase6_authorization_id,sampling_state_hash)
         VALUES($1,$2,$3,'STARTING',$4,$5,$6,$7::jsonb,$8::text[],$9,$10,'frozen_v39',$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [batchId,day.runDayIndex,seedInt,day.scheduledStartUtc,parentEnd,auth.alertCapPerParentDay,
         JSON.stringify(tierMix),airports,day.windowShape,day.anchorIcao,openingBalance,day.runDayIndex,
         day.budgetDayId,day.calendarHash,day.configHash,`experiment_day_${day.runDayIndex}`,
         day.crossoverGroupId,day.crossoverPeriod,day.pairRole,day.evaluationPartition,
         auth.authorizationId,decision.stateHash],
      );
      for (const seg of segments) {
        await client.query(
          `INSERT INTO clean.adb_collection_segments
           (segment_id,batch_id,run_day_index,segment_index,segment_kind,status,segment_start_utc,segment_end_utc)
           VALUES($1,$2,$3,$4,$5,'PLANNED',$6,$7)`,
          [`${batchId}-S${seg.index}`,batchId,day.runDayIndex,seg.index,seg.kind,seg.start,seg.end],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }

    await recordAdmission({
      runDayIndex: day.runDayIndex, authorizationId: auth.authorizationId,
      manifestSha256: auth.manifestSha256, calendarHash: day.calendarHash,
      configHash: day.configHash, outcome: "ADMITTED", reason: "frozen parent admitted",
      stateHash: decision.stateHash, providerMutationsStarted: false,
    });

    const batch = (await getActiveBatch())!;
    const firstActive = segments.find((s) => s.kind === "ACTIVE")!;
    const created = await activateSegment(batch, `${batchId}-S${firstActive.index}`);
    await pool.query("UPDATE clean.adb_collection_batches SET status='ACTIVE' WHERE batch_id=$1", [batchId]);
    await pool.query(
      `UPDATE clean.adb_phase6_admission_attempt SET provider_mutations_started=true
        WHERE admission_id=(SELECT max(admission_id) FROM clean.adb_phase6_admission_attempt WHERE run_day_index=$1 AND outcome='ADMITTED')`,
      [day.runDayIndex],
    );
    return { batch: (await getActiveBatch())!, created, skipped: [] };
  } catch (error: any) {
    const message = error?.message ?? String(error);
    await recordAdmission({
      runDayIndex: day?.runDayIndex ?? null, authorizationId: auth?.authorizationId ?? null,
      manifestSha256: auth?.manifestSha256 ?? null, calendarHash: day?.calendarHash ?? auth?.calendarHash ?? null,
      configHash: day?.configHash ?? auth?.configHash ?? null, outcome: "REFUSED", reason: message,
    }).catch(() => {});
    throw error;
  }
}

interface SegmentSettlementResult {
  settled: boolean;
  spend: number | null;
  internal: number;
  mismatch: boolean;
}
async function settleSegment(batch: CollectionBatch, segmentId: string, reason: string): Promise<SegmentSettlementResult> {
  const subs = await pool.query(
    `SELECT subscription_id FROM clean.adb_collection_subs WHERE batch_id=$1 AND segment_id=$2 AND ended_at IS NULL`,
    [batch.batchId, segmentId],
  );
  const failedDeletes: string[] = [];
  for (const row of subs.rows) {
    const ok = await deleteSubscription(row.subscription_id).catch(() => false);
    if (!ok) failedDeletes.push(row.subscription_id);
    else await pool.query("UPDATE clean.adb_collection_subs SET ended_at=now() WHERE subscription_id=$1", [row.subscription_id]);
  }
  if (failedDeletes.length) {
    await openIncident("deletion", { batchId: batch.batchId, segmentId, failedDeletes });
    await pool.query("UPDATE clean.adb_collection_segments SET status='FAILED',stop_reason=$2,ended_at_utc=now() WHERE segment_id=$1", [segmentId,"provider-delete-failure"]);
    await pool.query("UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason='provider-delete-failure' WHERE batch_id=$1", [batch.batchId]);
    return { settled: false, spend: null, internal: 0, mismatch: true };
  }

  const before = await pool.query("SELECT balance_before FROM clean.adb_collection_segments WHERE segment_id=$1", [segmentId]);
  let balanceBefore = before.rows[0]?.balance_before == null ? null : Number(before.rows[0].balance_before);
  if (balanceBefore === null) {
    const parent = await pool.query("SELECT balance_before FROM clean.adb_collection_batches WHERE batch_id=$1", [batch.batchId]);
    balanceBefore = parent.rows[0]?.balance_before == null ? null : Number(parent.rows[0].balance_before);
  }
  const cfg: SettlementConfig = {
    initialWaitSeconds: envInt("ADB_SETTLE_INITIAL_WAIT_S", 30),
    pollIntervalSeconds: Math.max(1, envInt("ADB_SETTLE_POLL_S", 10)),
    stableReadCount: 3,
    timeoutSeconds: Math.max(30, envInt("ADB_SETTLE_TIMEOUT_S", 600)),
  };
  const settlement = await runSettlement(cfg, async () => (await getBalance())?.creditsRemaining ?? null);
  const after = settlement.status === "settled" ? settlement.stableBalance : null;
  const exposure = await pool.query(
    `SELECT COALESCE(sum(CASE WHEN rd.adb_cost_credits IS NOT NULL THEN rd.adb_cost_credits ELSE rd.notification_items END),0)::numeric AS n
       FROM clean.raw_delivery rd
       JOIN clean.adb_collection_subs s ON s.subscription_id=rd.subscription_id
      WHERE s.batch_id=$1 AND s.segment_id=$2`,
    [batch.batchId, segmentId],
  );
  const internal = Number(exposure.rows[0]?.n ?? 0);
  const spend = balanceBefore !== null && after !== null ? balanceBefore - after : null;
  const rec = spend !== null ? reconcileSpend({ cExternal: spend, cInternal: internal, tolerance: 0 }) : { match: false };
  const mismatch = spend === null || !rec.match;
  await pool.query(
    `UPDATE clean.adb_collection_segments
        SET status=$2,ended_at_utc=now(),balance_stable_after=$3,settled_alert_spend=$4,
            notification_items_internal=$5,reconciliation_status=$6,stop_reason=$7
      WHERE segment_id=$1`,
    [segmentId,mismatch ? "FAILED" : "CLOSED",after,spend,internal,mismatch ? "MISMATCH" : "PASS",reason],
  );
  if (mismatch) {
    await openIncident("reconciliation", { batchId: batch.batchId, segmentId, spend, internal, settlementStatus: settlement.status });
    await pool.query("UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason='reconciliation' WHERE batch_id=$1", [batch.batchId]);
  }
  return { settled: !mismatch, spend, internal, mismatch };
}

async function finalizeParentIfDone(batch: CollectionBatch, reason: string): Promise<CollectionBatch> {
  const seg = await pool.query(
    `SELECT segment_kind,status,settled_alert_spend,notification_items_internal FROM clean.adb_collection_segments WHERE batch_id=$1 ORDER BY segment_index`,
    [batch.batchId],
  );
  if (seg.rows.some((r: any) => r.segment_kind === "ACTIVE" && r.status !== "CLOSED")) return (await getActiveBatch()) ?? batch;
  const totalSpend = seg.rows.reduce((n: number, r: any) => n + Number(r.settled_alert_spend ?? 0), 0);
  const totalInternal = seg.rows.reduce((n: number, r: any) => n + Number(r.notification_items_internal ?? 0), 0);
  const lastBalance = await pool.query(
    `SELECT balance_stable_after FROM clean.adb_collection_segments WHERE batch_id=$1 AND balance_stable_after IS NOT NULL ORDER BY segment_index DESC LIMIT 1`,
    [batch.batchId],
  );
  await pool.query(
    `UPDATE clean.adb_collection_batches SET status='CLOSED',ended_at=now(),stop_reason=$2,
      balance_after=$3,credits_consumed_actual=$4,credits_consumed_internal=$5,
      notification_items_received=$5,reconciliation_status='PASS'
      WHERE batch_id=$1`,
    [batch.batchId,reason,lastBalance.rows[0]?.balance_stable_after ?? null,totalSpend,totalInternal],
  );
  const r = await pool.query("SELECT * FROM clean.adb_collection_batches WHERE batch_id=$1", [batch.batchId]);
  return mapBatch(r.rows[0]);
}

/** Safety stop: closes current segment/subscriptions and cancels future segments. */
export async function stopBatch(reason: string): Promise<CollectionBatch | null> {
  const batch = await getActiveBatch();
  if (!batch) return null;
  const open = await pool.query(
    `SELECT segment_id FROM clean.adb_collection_segments WHERE batch_id=$1 AND segment_kind='ACTIVE' AND status='ACTIVE' ORDER BY segment_index`,
    [batch.batchId],
  );
  for (const s of open.rows) {
    const settled = await settleSegment(batch, s.segment_id, reason);
    if (!settled.settled) return (await getActiveBatch()) ?? batch;
  }
  await pool.query(
    `UPDATE clean.adb_collection_segments SET status='CLOSED',ended_at_utc=now(),stop_reason=$2
      WHERE batch_id=$1 AND status='PLANNED'`,
    [batch.batchId, `cancelled-by-${reason}`],
  );
  return await finalizeParentIfDone(batch, reason);
}

/** Local delivered-attempt exposure only; never the external billing truth. */
export async function actualBatchSpend(batchId: string): Promise<number> {
  const r = await pool.query(
    `SELECT COALESCE(sum(CASE WHEN adb_cost_credits IS NOT NULL THEN adb_cost_credits ELSE notification_items END),0)::numeric AS n
       FROM clean.raw_delivery WHERE batch_id=$1`,
    [batchId],
  );
  return Number(r.rows[0]?.n ?? 0);
}

export async function creditsUsedTodayUtc(): Promise<number> {
  const r = await pool.query(
    `SELECT COALESCE(sum(CASE WHEN adb_cost_credits IS NOT NULL THEN adb_cost_credits ELSE notification_items END),0)::numeric AS n
       FROM clean.raw_delivery WHERE received_at_utc>=date_trunc('day',now())`,
  );
  return Number(r.rows[0]?.n ?? 0);
}

export interface BudgetDayState {
  budgetDayId: string | null;
  batchSeq: number | null;
  status: "none" | "active" | "closed_settled" | "closed_unsettled";
  settledSpend: number | null;
}
export async function getLastBudgetDay(): Promise<BudgetDayState> {
  const r = await pool.query(
    `SELECT batch_seq,budget_day_id,status,reconciliation_status,credits_consumed_actual
       FROM clean.adb_collection_batches ORDER BY run_day_index DESC NULLS LAST,batch_seq DESC LIMIT 1`,
  );
  if (!r.rowCount) return { budgetDayId: null, batchSeq: null, status: "none", settledSpend: null };
  const x = r.rows[0];
  const open = ["STARTING","ACTIVE","BLOCKED"].includes(String(x.status));
  const settled = x.status === "CLOSED" && x.reconciliation_status === "PASS" && x.credits_consumed_actual != null;
  return {
    budgetDayId: x.budget_day_id ?? (x.batch_seq ? budgetDayIdForBatch(Number(x.batch_seq)) : null),
    batchSeq: Number(x.batch_seq),
    status: open ? "active" : settled ? "closed_settled" : "closed_unsettled",
    settledSpend: x.credits_consumed_actual == null ? null : Number(x.credits_consumed_actual),
  };
}
export async function creditsUsedByBudgetDaySeq(batchSeq: number): Promise<number> {
  const r = await pool.query(
    `SELECT credits_consumed_actual,reconciliation_status FROM clean.adb_collection_batches WHERE batch_seq=$1`,
    [batchSeq],
  );
  if (r.rowCount !== 1 || r.rows[0].reconciliation_status !== "PASS" || r.rows[0].credits_consumed_actual == null) {
    throw new Error(`UNSETTLED_BUDGET_DAY: batch_seq=${batchSeq}`);
  }
  return Number(r.rows[0].credits_consumed_actual);
}
export async function deliveryFailuresForBatch(batchId: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int n FROM clean.adb_ingest_events WHERE batch_id=$1 AND delivery_failure`, [batchId]);
  return Number(r.rows[0]?.n ?? 0);
}
export async function deliveryFailuresToday(): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int n FROM clean.adb_ingest_events WHERE received_at>=date_trunc('day',now()) AND delivery_failure`);
  return Number(r.rows[0]?.n ?? 0);
}
export async function estimateBatchCredits(batchId: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int n FROM clean.flight_data_pre_post WHERE sampling_batch_id=$1`, [batchId]);
  return Number(r.rows[0]?.n ?? 0);
}

export async function lookupSubscriptionMeta(subscriptionId: string): Promise<SamplingMeta | null> {
  const r = await pool.query(
    `SELECT s.batch_id,s.tier,s.is_randomized,s.airport_layer_design_probability,s.planned_share,s.sampling_weight,
            b.random_seed,b.window_start,b.window_end
       FROM clean.adb_collection_subs s JOIN clean.adb_collection_batches b ON b.batch_id=s.batch_id
      WHERE s.subscription_id=$1`,
    [subscriptionId],
  );
  if (!r.rowCount) return null;
  const x = r.rows[0];
  return {
    batchId: x.batch_id, tier: x.tier ?? null, isRandomized: x.is_randomized ?? null,
    airportLayerDesignProbability: x.airport_layer_design_probability == null ? null : Number(x.airport_layer_design_probability),
    plannedShare: x.planned_share == null ? null : Number(x.planned_share), samplingWeight: null,
    randomSeed: x.random_seed == null ? null : String(x.random_seed),
    windowStart: x.window_start ? asDate(x.window_start) : null,
    windowEnd: x.window_end ? asDate(x.window_end) : null,
  };
}

export async function writeManifest(): Promise<void> {
  throw new Error("REFUSED_LEGACY_MANIFEST: use manifest_v3.ts hash/evidence owner");
}
export async function readManifest(): Promise<Record<string, unknown> | null> { return null; }

export interface CollectionStatus {
  balance: any;
  active: CollectionBatch | null;
  activeBatchCredits: number | null;
  remaining: number;
  availableAboveReserve: number;
  autoCollect: boolean;
  lastReceivedAt: Date | null;
  gapMinutes: number | null;
}
export async function getCollectionStatus(): Promise<CollectionStatus> {
  const [balance, active, last] = await Promise.all([
    getBalance(), getActiveBatch(), pool.query(`SELECT max(received_at_utc) t FROM clean.raw_delivery`),
  ]);
  const lastReceivedAt = last.rows[0]?.t ? asDate(last.rows[0].t) : null;
  return {
    balance, active, activeBatchCredits: active ? await actualBatchSpend(active.batchId) : null,
    remaining: balance?.creditsRemaining ?? 0,
    availableAboveReserve: Math.max(0, (balance?.creditsRemaining ?? 0) - 1000),
    autoCollect: COLLECTOR_CONFIG.autoCollect,
    lastReceivedAt,
    gapMinutes: lastReceivedAt ? (Date.now() - lastReceivedAt.getTime()) / 60_000 : null,
  };
}

export interface Diagnostics { [key: string]: unknown }
export async function getDiagnostics(): Promise<Diagnostics> {
  const [batches, raw, incidents, draws] = await Promise.all([
    pool.query(`SELECT count(*)::int n FROM clean.adb_collection_batches`),
    pool.query(`SELECT count(*)::int n FROM clean.raw_delivery`),
    pool.query(`SELECT count(*)::int n FROM clean.adb_incident_stop WHERE resolved=false`),
    pool.query(`SELECT count(*)::int n FROM clean.adb_sampling_draw`),
  ]);
  return { batches: Number(batches.rows[0]?.n ?? 0), rawDeliveries: Number(raw.rows[0]?.n ?? 0), openIncidents: Number(incidents.rows[0]?.n ?? 0), samplingDraws: Number(draws.rows[0]?.n ?? 0) };
}

export async function flagBatchRows(batchId: string, reason: string): Promise<number> {
  const r = await pool.query(
    `UPDATE clean.flight_data_pre_post SET flagged_at=now(),flag_reason=$2
      WHERE sampling_batch_id=$1 AND flagged_at IS NULL`, [batchId, reason],
  );
  return r.rowCount ?? 0;
}

export interface AirportCoverage {
  fetchedAt: string;
  feeds: Record<FeedService, string[]>;
  all: string[];
  byTier: Record<string, number>;
  worldScheduledCommercial: number;
  error: string | null;
}
export function computeAirportCoverage(feeds: Partial<Record<FeedService, string[]>>): Omit<AirportCoverage, "fetchedAt" | "error" | "worldScheduledCommercial"> {
  const services: FeedService[] = ["FlightSchedules", "FlightLiveUpdates", "AdsbUpdates"];
  const normalized = Object.fromEntries(services.map((s) => [s, Array.from(new Set((feeds[s] ?? []).map((x) => x.toUpperCase()))).sort()])) as Record<FeedService, string[]>;
  const all = Array.from(new Set(services.flatMap((s) => normalized[s]))).sort();
  const byTier: Record<string, number> = {};
  return { feeds: normalized, all, byTier };
}
let coverageCache: { at: number; data: AirportCoverage } | null = null;
export async function getAirportCoverage(force = false): Promise<AirportCoverage | null> {
  const ttlMs = envInt("V39_COVERAGE_CACHE_TTL_SECONDS", 0) * 1000;
  if (!force && ttlMs > 0 && coverageCache && Date.now() - coverageCache.at < ttlMs) return coverageCache.data;
  try {
    const services: FeedService[] = ["FlightSchedules", "FlightLiveUpdates", "AdsbUpdates"];
    const pairs = await Promise.all(services.map(async (s) => [s, await listFeedAirports(s)] as const));
    if (pairs.some(([, rows]) => !rows)) return null;
    const base = computeAirportCoverage(Object.fromEntries(pairs) as Record<FeedService, string[]>);
    const data: AirportCoverage = { ...base, fetchedAt: new Date().toISOString(), worldScheduledCommercial: base.feeds.FlightSchedules.length, error: null };
    if (ttlMs > 0) coverageCache = { at: Date.now(), data };
    return data;
  } catch { return null; }
}

let watchdogStarted = false;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;

async function watchdogTick(): Promise<void> {
  const batch = await getActiveBatch();
  if (!batch) {
    // Pre-Phase6 / not authorized: zero provider mutation. Only attempt a new
    // parent if explicit auto opt-in exists; startBatch then performs the DB
    // authorization/hash checks before any provider call.
    if (!COLLECTOR_CONFIG.autoCollect) return;
    try { await startBatch(); } catch { return; }
    return;
  }
  if (batch.status === "BLOCKED") return;
  const open = await pool.query(
    `SELECT * FROM clean.adb_collection_segments WHERE batch_id=$1 ORDER BY segment_index`,
    [batch.batchId],
  );
  const now = new Date();
  const active = open.rows.find((r: any) => r.segment_kind === "ACTIVE" && r.status === "ACTIVE");
  if (active) {
    const auth = await loadPhase6Authorization().catch(() => null);
    if (!auth) { await stopBatch("authorization_lost"); return; }
    const balance = await getBalance();
    const parent = await pool.query("SELECT balance_before FROM clean.adb_collection_batches WHERE batch_id=$1", [batch.batchId]);
    const externalSoFar = balance && parent.rows[0]?.balance_before != null ? Number(parent.rows[0].balance_before) - balance.creditsRemaining : null;
    const softThreshold = auth.alertCapPerParentDay - auth.unsettledBurstMarginCredits;
    if (externalSoFar !== null && externalSoFar >= softThreshold) { await stopBatch("soft_stop"); return; }
    if (now >= asDate(active.segment_end_utc)) {
      const settled = await settleSegment(batch, active.segment_id, "scheduled_segment_end");
      if (!settled.settled) return;
    } else return;
  }

  // Close elapsed gaps without provider calls, then activate the next exact
  // frozen segment/airport set when its scheduled start arrives.
  for (const s of open.rows) {
    if (s.segment_kind === "GAP" && s.status === "PLANNED" && now >= asDate(s.segment_end_utc)) {
      await pool.query("UPDATE clean.adb_collection_segments SET status='CLOSED',started_at_utc=segment_start_utc,ended_at_utc=segment_end_utc WHERE segment_id=$1", [s.segment_id]);
    }
  }
  const refreshed = await pool.query(`SELECT * FROM clean.adb_collection_segments WHERE batch_id=$1 ORDER BY segment_index`, [batch.batchId]);
  const next = refreshed.rows.find((r: any) => r.segment_kind === "ACTIVE" && r.status === "PLANNED" && now >= asDate(r.segment_start_utc));
  if (next) {
    try {
      const bal = await getBalance();
      await pool.query("UPDATE clean.adb_collection_segments SET balance_before=$2 WHERE segment_id=$1", [next.segment_id, bal?.creditsRemaining ?? null]);
      await activateSegment(batch, next.segment_id);
    } catch (error: any) {
      await openIncident("segment_activation", { batchId: batch.batchId, segmentId: next.segment_id, error: error?.message ?? String(error) });
      await pool.query("UPDATE clean.adb_collection_batches SET status='BLOCKED',stop_reason='segment_activation' WHERE batch_id=$1", [batch.batchId]);
    }
    return;
  }
  const done = refreshed.rows.every((r: any) => r.status === "CLOSED");
  if (done) await finalizeParentIfDone(batch, "scheduled_complete");
}

export function startCollectionWatchdog(): void {
  if (watchdogStarted) return;
  watchdogStarted = true;
  watchdogTimer = setInterval(() => void watchdogTick().catch((e) => console.error("[adb-controller] watchdog:", e?.message ?? e)), COLLECTOR_CONFIG.watchdogSeconds * 1000);
  watchdogTimer.unref?.();
}
