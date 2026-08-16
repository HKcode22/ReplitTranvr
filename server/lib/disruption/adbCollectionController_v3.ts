// ============================================================
// v3 — Tier-rotating AeroDataBox collection controller.
// See MDplan/V3_CollectionStrategy.md for the full rationale.
//
// WHY THIS EXISTS:
//   Airport subscriptions capture the WHOLE airport (they cannot filter
//   to "a few flights"). So the only levers over sampling are:
//     WHICH airports, in which tier mix, FOR HOW LONG, under what budget.
//   This module rotates a small set of airports through short windows,
//   interleaving tiers over time (so "hub" never becomes confounded with
//   "Tuesday evening"), enforces credit budgets, auto-stops when a window
//   elapses or a budget is hit, and records the sampling metadata for
//   every captured flight (see migration 0012).
//
// COSTS (all FREE except notifications themselves):
//   create/get/list/delete subscription : 0 credits
//   checkAirportFeeds (coverage)        : 0 credits
//   get balance                         : 0 credits
//   notification deliveries             : 1 credit per flight item
//
// The watchdog (startCollectionWatchdog) only reads the DB and calls
// free delete endpoints — it can NEVER burn credits on its own.
// ============================================================

import { randomInt } from "crypto";
import { pool } from "../../db";
import {
  getBalance,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  checkAirportFeeds,
  listFeedAirports,
  type FeedService,
  type SubscriptionSubjectType,
} from "./aerodataboxLimiter_v3";
import {
  AIRPORT_CATALOG,
  AIRPORT_TIERS,
  allCatalogAirports,
  type AirportTier,
} from "./adbAirportCatalog_v3";

// ---------------------------------------------------------------------------
// Configuration (env-overridable)
// ---------------------------------------------------------------------------

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = Number(raw);
  return raw && Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function envTierMix(): Record<AirportTier, number> {
  const fallback: Record<AirportTier, number> = { HUB: 1, MID: 2, REGIONAL: 1 };
  const raw = process.env.ADB_TIER_MIX;
  if (!raw) return fallback;
  try {
    const parsed: Record<string, number> = JSON.parse(raw);
    const out = { ...fallback };
    for (const tier of AIRPORT_TIERS) {
      const v = Number(parsed[tier]);
      if (Number.isFinite(v) && v >= 0) out[tier] = Math.floor(v);
    }
    return out;
  } catch {
    return fallback;
  }
}

function envList(name: string, fallback: string): string[] {
  const raw = process.env[name];
  return (raw ?? fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const COLLECTOR_CONFIG = {
  windowHours: envInt("ADB_WINDOW_HOURS", 4),
  batchBudget: envInt("ADB_BATCH_BUDGET", 1900),
  reserveCredits: envInt("ADB_RESERVE_CREDITS", 1000),
  /** don't start a batch unless it can run at least this many credits */
  minBatchCredits: envInt("ADB_MIN_BATCH_CREDITS", 300),
  /** V3.9: max |balance_delta − notification_items| a batch may show before
   *  its reconciliation is marked MISMATCH (§44-B). Non-zero because a
   *  delivery can still be in-flight at stop() and race the balance read. */
  reconcileTolerance: envInt("ADB_RECONCILE_TOLERANCE", 3),
  tierMix: envTierMix(),

  // ---- V3.3 daily credit cap (60,000 / 31 ≈ 1,900/day; 0 disables) ----
  /** hard cap on credits spent per UTC day. 1,900/day ≈ one full 4 h batch,
   *  pacing the 60k over a month. Enforced in startBatchInner (hard floor)
   *  and checked in the watchdog before it even attempts a start. */
  dailyCreditCap: process.env.ADB_DAILY_CREDIT_CAP === "0" ? 0 : envInt("ADB_DAILY_CREDIT_CAP", 1900),

  // ---- V3.9 R2: SOFT_STOP margin (plan §3.3, §45.5-R2) ----
  /** The watchdog stops the ACTIVE batch when today's actual spend reaches
   *  `dailyCreditCap − softStopMargin`, BEFORE the async accounting race can
   *  overshoot the hard cap. Tuned from the canary's worst un-settled burst
   *  (default 50 → batch stops when today's spend ≥ 1,850). */
  softStopMargin: envInt("ADB_DAILY_SOFT_STOP_MARGIN", 50),

  // ---- V3.3 rotating anchor pool + one-rotating-window-per-day ----
  /** rotating anchors (one/day, no-repeat-until-all, drives the HUB slot).
   *  Disable with ADB_ANCHOR_ENABLED=0 or an empty ADB_ANCHOR_POOL. */
  anchorEnabled: process.env.ADB_ANCHOR_ENABLED !== "0",
  anchorPool: envList("ADB_ANCHOR_POOL", "KLAX,EGLL,WSSS,SBGR,OMDB").map((s) => s.toUpperCase()),
  /** rotate the daily window's UTC start hour through a cycle (default
   *  00/04/08/12/16/20). Disable with ADB_ROTATING_UTC_START=0 → the watchdog
   *  auto-starts whenever it wakes up (legacy behavior). */
  rotatingUtcStart: process.env.ADB_ROTATING_UTC_START !== "0",
  utcStartCycle: ((): number[] => {
    const hours = envList("ADB_UTC_START_CYCLE", "0,4,8,12,16,20")
      .map((h) => Number(h))
      .filter((h) => Number.isInteger(h) && h >= 0 && h < 24)
      .sort((a, b) => a - b);
    return hours.length ? hours : [0];
  })(),
  /** airports to remember so consecutive batches don't repeat the same ones */
  rememberRecentBatches: 2,

  // ---- auto-rotation (hands-off overnight runs) ----
  /** ADB_AUTO_COLLECT=0 disables; default ON — the watchdog rotates batches itself. */
  autoCollect: process.env.ADB_AUTO_COLLECT !== "0",
  /** gap between a batch closing and the next one auto-starting (min) */
  autoCooldownMinutes: envInt("ADB_AUTO_COOLDOWN_MIN", 15),
  /** only auto-start between these UTC hours (inclusive start, exclusive end). 0-24 = all day. */
  autoStartHourUtc: envInt("ADB_AUTO_START_HOUR", 0),
  autoEndHourUtc: envInt("ADB_AUTO_END_HOUR", 24),
  /** watchdog tick interval (s) */
  watchdogSeconds: envInt("ADB_WATCHDOG_SECONDS", 60),

  // ---- self-monitoring alerts (no manual checking needed) ----
  /** alert if no row has been stored for this many minutes */
  alertGapMinutes: envInt("ADB_ALERT_GAP_MIN", 90),
  /** alert if the balance drops below this (e.g. refill soon) */
  alertMinBalance: envInt("ADB_ALERT_MIN_BALANCE", 2000),
  /** minimum minutes between repeated ALERT lines for the same problem */
  alertCooldownMinutes: envInt("ADB_ALERT_COOLDOWN_MIN", 30),
  /** optional Slack incoming-webhook URL — POSTs a message on problems */
  alertWebhookUrl: process.env.ADB_ALERT_WEBHOOK_URL || null,
} as const;

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

export interface CreatedSub {
  icao: string;
  tier: AirportTier | null;
  subscriptionId: string;
}

export interface SkippedAirport {
  icao: string;
  reason: "no_coverage" | "create_failed" | "unknown";
}

/** Sampling metadata stamped onto captured rows (matches extractor). */
export interface SamplingMeta {
  batchId: string | null;
  tier: string | null;
  samplingProbability: number | null;
  samplingWeight: number | null;
  randomSeed: string | null;
  windowStart: Date | null;
  windowEnd: Date | null;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Deterministic PRNG (mulberry32) so a batch is reproducible from its seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(list: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toInt(x: unknown): number | null {
  return typeof x === "number" ? x : x === null || x === undefined ? null : Number(x);
}
function toStr(x: unknown): string | null {
  return typeof x === "string" ? x : x === null || x === undefined ? null : String(x);
}

/** Count airports per tier for a batch's airport list (log/status clarity). */
function countTiers(icaos: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of icaos) {
    for (const tier of AIRPORT_TIERS) {
      if (AIRPORT_CATALOG[tier].includes(c)) {
        out[tier] = (out[tier] ?? 0) + 1;
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Meta key/value (rotation state)
// ---------------------------------------------------------------------------

async function readMeta(key: string): Promise<string | null> {
  const res = await pool.query("SELECT value FROM clean.adb_collection_meta WHERE key = $1", [key]);
  return res.rowCount ? res.rows[0].value : null;
}

async function writeMeta(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO clean.adb_collection_meta (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value],
  );
}

// ---------------------------------------------------------------------------
// V3.9 R6 — crossover template freeze (§8, §8.1, §24/§31)
// The run's template/crossover design is frozen BEFORE treatment: an admin
// writes `run_template` (JSON) into adb_collection_meta at freeze time. The
// scheduler then REFUSES to start a batch that violates it. Treatment never
// depends on any post-freeze observation. Declared shape:
//   { "crossover": [
//       { "block": 1, "day": "2026-08-20", "window_shape": "2x2h", "tier_mix": {"HUB":1,"MID":2,"REGIONAL":1} },
//       { "block": 2, "day": "2026-08-21", "window_shape": "6h",  "tier_mix": {"HUB":1,"MID":2,"REGIONAL":1} }
//   ]}
// ---------------------------------------------------------------------------

interface RunTemplateEntry {
  block: number;
  day?: string;
  window_shape?: string;
  tier_mix?: Record<string, number>;
}

async function readRunTemplate(): Promise<{ crossover: RunTemplateEntry[] } | null> {
  const raw = await readMeta("run_template");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.crossover) ? parsed : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// V3.9 R7 — versioned run manifest (plan §15 R7, §17 Phase 5, §45.5-R7)
// Written into adb_collection_meta at batch start and re-readable by
// `npm run health` / diagnostics. Frozen at freeze time; each run records its
// frame, scheduler seed, anchor seed, catalog version, config, and account
// state so the run is reproducible and auditable.
// ---------------------------------------------------------------------------

export async function writeManifest(): Promise<void> {
  const manifest = {
    written_at_utc: new Date().toISOString(),
    frame_version: "V3.9-f.6",
    config: {
      window_hours: COLLECTOR_CONFIG.windowHours,
      batch_budget: COLLECTOR_CONFIG.batchBudget,
      daily_credit_cap: COLLECTOR_CONFIG.dailyCreditCap,
      soft_stop_margin: COLLECTOR_CONFIG.softStopMargin,
      reserve_credits: COLLECTOR_CONFIG.reserveCredits,
      min_batch_credits: COLLECTOR_CONFIG.minBatchCredits,
      reconcile_tolerance: COLLECTOR_CONFIG.reconcileTolerance,
      tier_mix: COLLECTOR_CONFIG.tierMix,
      anchor_enabled: COLLECTOR_CONFIG.anchorEnabled,
      anchor_pool: COLLECTOR_CONFIG.anchorPool,
      utc_start_cycle: COLLECTOR_CONFIG.utcStartCycle,
      // V3.9-f.6 (§3.2): spendable envelope 57,900 = 58,900 refill − 1,000 floor
      spendable_experimental_envelope: 57_900,
      max_delivery_retries: 0,
    },
    scheduler: {
      batch_seq: (await readMeta("batch_seq")) ?? "0",
      last_anchor: (await readMeta("last_anchor")) ?? null,
      crossover_block_done: (await readMeta("crossover_block_done")) ?? null,
      run_template: (await readMeta("run_template")) ?? null,
    },
    account: {
      plan: process.env.ADB_PLAN ?? "VERIFY_AT_GATE_0",
      monthly_units: process.env.ADB_MONTHLY_UNITS ?? "VERIFY_AT_GATE_0",
      refill_conversion: "1 API unit = 1 credit",
    },
  };
  await writeMeta("manifest", JSON.stringify(manifest, null, 2));
}

export async function readManifest(): Promise<Record<string, unknown> | null> {
  const raw = await readMeta("manifest");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** R6 guard — returns an error string when the batch must be REFUSED, else null.
 *  Enforces the §8.1 scheduler REFUSE contracts for experiment days. */
async function checkTemplateFreeze(
  seq: number,
  windowShape: string,
  tierMix: Record<AirportTier, number>,
): Promise<string | null> {
  const tmpl = await readRunTemplate();
  if (!tmpl || tmpl.crossover.length === 0) return null; // no crossover declared → not an experiment day

  const todayKey = new Date().toISOString().slice(0, 10);
  const entries = tmpl.crossover;
  const blockForToday = entries.find((e) => !e.day || e.day === todayKey);
  if (!blockForToday) {
    // Every crossover-capable day must declare its block. Days without a
    // declared block are not experiment days → run the normal shape is fine.
    return null;
  }
  const declaredShape = blockForToday.window_shape ?? `${COLLECTOR_CONFIG.windowHours}h`;
  if (windowShape !== declaredShape) {
    return `template/experiment mismatch on ${todayKey}: batch shape ${windowShape} ≠ declared ${declaredShape} (block ${blockForToday.block}) — REFUSED (§8.1)`;
  }
  if (blockForToday.tier_mix) {
    for (const tier of AIRPORT_TIERS) {
      const declared = Number(blockForToday.tier_mix[tier] ?? 0);
      if ((tierMix[tier] ?? 0) !== declared) {
        return `template/experiment mismatch on ${todayKey}: tier ${tier}=${tierMix[tier]} ≠ declared ${declared} (block ${blockForToday.block}) — REFUSED (§8.1)`;
      }
    }
  }
  // Crossover period-2 without its period-1 → REFUSED (no half-completed
  // crossover analyzed as if complete). Period-1 is the first block that names
  // a shape other than the default, or explicitly block 1.
  const period1 = entries.find((e) => e.block === 1);
  if (blockForToday.block > 1 && period1) {
    const p1Done = await readMeta("crossover_block_done");
    if (p1Done !== String(period1.block)) {
      return `crossover period-${blockForToday.block} without completed period-1 (block ${period1.block}) — REFUSED (§8.1)`;
    }
  }
  return null;
}

// --------------------------- V3.3 daily-cap helpers ---------------------------

/** Credits consumed since the start of the UTC day = notification items
 *  delivered today (V3.9 three-quantity accounting, §13/§44-A/B). With
 *  maxDeliveryRetries=0 every notification item costs exactly 1 credit, so the
 *  adb_ingest_events ledger is the per-day internal basis (C_internal). The
 *  authoritative external number is the balance delta at batch stop / canary. */
export async function creditsUsedTodayUtc(): Promise<number> {
  const res = await pool.query(
    `SELECT COALESCE(sum(notification_items), 0)::int AS n
       FROM clean.adb_ingest_events
      WHERE received_at >= date_trunc('day', now())`,
  );
  return res.rowCount ? res.rows[0].n : 0;
}

/** V3.9: credits the active batch has actually consumed so far = notification
 *  items attributed to it (internal basis). Falls back to the row count for
 *  legacy batches created before the events ledger existed. */
export async function actualBatchSpend(batchId: string): Promise<number> {
  const res = await pool.query(
    `SELECT COALESCE(sum(notification_items), 0)::int AS n
       FROM clean.adb_ingest_events
      WHERE batch_id = $1`,
    [batchId],
  );
  const items = res.rowCount ? res.rows[0].n : 0;
  return items > 0 ? items : estimateBatchCredits(batchId);
}

/** V3.9: delivery failures for a batch (webhook handler errors → §44-C gate). */
export async function deliveryFailuresForBatch(batchId: string): Promise<number> {
  const res = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_ingest_events
      WHERE batch_id = $1 AND delivery_failure`,
    [batchId],
  );
  return res.rowCount ? res.rows[0].n : 0;
}

/** V3.9: delivery failures today (any subscription) — fired into the watchdog
 *  heartbeat alert + the hard-pause gate (§27.1 gate 10). */
export async function deliveryFailuresToday(): Promise<number> {
  const res = await pool.query(
    `SELECT count(*)::int AS n FROM clean.adb_ingest_events
      WHERE received_at >= date_trunc('day', now()) AND delivery_failure`,
  );
  return res.rowCount ? res.rows[0].n : 0;
}

/** Scheduled UTC start of the daily window for batch `seq`: cycle[seq % len].
 *  Returns the NEXT occurrence (today if still ahead, else tomorrow). Null
 *  when the rotating-start schedule is disabled. */
function plannedWindowStartUtc(seq: number): Date | null {
  const cycle = COLLECTOR_CONFIG.utcStartCycle;
  if (!COLLECTOR_CONFIG.rotatingUtcStart || cycle.length === 0) return null;
  const hour = cycle[seq % cycle.length];
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0));
  if (start.getTime() <= now.getTime()) start.setUTCDate(start.getUTCDate() + 1);
  return start;
}

// ------------------------- V3.3 rotating-anchor pool -------------------------

async function readAnchorState(): Promise<{ pool: string[]; next: number }> {
  const raw = await readMeta("anchor_rotation");
  const parsed: { pool?: string[]; next?: number } | null = raw ? JSON.parse(raw) : null;
  const pool = Array.isArray(parsed?.pool) && parsed!.pool!.length ? parsed!.pool! : [...COLLECTOR_CONFIG.anchorPool];
  return { pool, next: Number.isInteger(parsed?.next) ? parsed!.next! : 0 };
}

/** Current anchor pick (no state change) — used to bias the HUB slot. */
async function peekAnchorIcao(): Promise<string | null> {
  if (!COLLECTOR_CONFIG.anchorEnabled || COLLECTOR_CONFIG.anchorPool.length === 0) return null;
  const s = await readAnchorState();
  return s.pool.length ? s.pool[s.next % s.pool.length] : null;
}

/** Advance the rotation pointer — call only after the anchor was actually
 *  subscribed, so a transient coverage/create failure doesn't consume a slot. */
async function advanceAnchor(): Promise<void> {
  const s = await readAnchorState();
  s.next = (s.next + 1) % s.pool.length;
  await writeMeta("anchor_rotation", JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// Batch lifecycle
// ---------------------------------------------------------------------------

export async function getActiveBatch(): Promise<CollectionBatch | null> {
  const res = await pool.query(
    "SELECT * FROM clean.adb_collection_batches WHERE status = 'ACTIVE' ORDER BY batch_seq DESC LIMIT 1",
  );
  if (!res.rowCount) return null;
  return mapBatch(res.rows[0]);
}

function mapBatch(r: any): CollectionBatch {
  return {
    batchId: r.batch_id,
    batchSeq: r.batch_seq,
    randomSeed: r.random_seed,
    status: r.status,
    startedAt: new Date(r.started_at),
    endedAt: r.ended_at ? new Date(r.ended_at) : null,
    windowStart: new Date(r.window_start),
    windowEnd: new Date(r.window_end),
    creditBudget: Number(r.credit_budget),
    tierMix: r.tier_mix ?? {},
    airports: r.airports ?? [],
    stopReason: r.stop_reason ?? null,
  };
}

/**
 * Pick this batch's airport candidates: one seeded shuffle per tier. The
 * returned list is ordered FRESH-first (airports not used in the last N
 * batches), then recently-used ones as fallback. startBatchInner walks this
 * list per tier and keeps trying until it has filled the tier's slots — so a
 * rate-limited / no-coverage airport is replaced by another airport IN THE
 * SAME TIER, and the daily HUB/MID/REGIONAL mixture survives individual
 * failures (no "hub one day, regional another" drift).
 */
async function pickAirportCandidates(seed: number): Promise<Record<AirportTier, string[]>> {
  const recentRaw = await readMeta("recent_batches");
  const recent: string[][] = recentRaw ? JSON.parse(recentRaw) : [];
  const recentlyUsed = new Set<string>(recent.flat());

  const candidates = {} as Record<AirportTier, string[]>;
  for (const tier of AIRPORT_TIERS) {
    const slots = COLLECTOR_CONFIG.tierMix[tier] ?? 0;
    if (slots <= 0) {
      candidates[tier] = [];
      continue;
    }
    const poolList = seededShuffle(AIRPORT_CATALOG[tier], seed);
    const fresh = poolList.filter((a) => !recentlyUsed.has(a));
    const fallback = poolList.filter((a) => recentlyUsed.has(a));
    candidates[tier] = [...fresh, ...fallback];
  }
  return candidates;
}

export interface StartBatchResult {
  batch: CollectionBatch;
  created: CreatedSub[];
  skipped: SkippedAirport[];
}

export async function startBatch(): Promise<StartBatchResult> {
  const active = await getActiveBatch();
  if (active) {
    throw new Error(`Batch ${active.batchId} is still active — stop it first (POST /api/v1/collection/stop).`);
  }

  creatingBatch = true;
  try {
    return await startBatchInner();
  } finally {
    creatingBatch = false;
  }
}

async function startBatchInner(): Promise<StartBatchResult> {
  const balance = await getBalance();
  if (!balance) {
    throw new Error("No alert-credit balance yet — refill first (POST /api/v1/subscriptions/balance/refill).");
  }
  // Adaptive budget: spend whatever is above the reserve, capped by the batch
  // budget. With e.g. 3,105 credits, reserve 1,000 and budget 3,000 this runs
  // a 2,105-credit batch right now instead of demanding 4,000+5,000 and
  // never collecting. minBatchCredits keeps the batch worth starting.
  const available = Math.max(0, balance.creditsRemaining - COLLECTOR_CONFIG.reserveCredits);
  let effectiveBudget = Math.min(COLLECTOR_CONFIG.batchBudget, available);
  // V3.3 daily cap: a batch may never push today's UTC spend past the cap.
  let dailyRemaining = effectiveBudget;
  if (COLLECTOR_CONFIG.dailyCreditCap > 0) {
    const usedToday = await creditsUsedTodayUtc();
    dailyRemaining = Math.max(0, COLLECTOR_CONFIG.dailyCreditCap - usedToday);
    effectiveBudget = Math.min(effectiveBudget, dailyRemaining);
  }
  if (effectiveBudget < COLLECTOR_CONFIG.minBatchCredits) {
    const capActive = COLLECTOR_CONFIG.dailyCreditCap > 0;
    const why = capActive && dailyRemaining < COLLECTOR_CONFIG.minBatchCredits
      ? `daily cap ${COLLECTOR_CONFIG.dailyCreditCap} reached — only ${dailyRemaining} credits left today`
      : `${balance.creditsRemaining} remaining, need reserve ${COLLECTOR_CONFIG.reserveCredits} + min batch ${COLLECTOR_CONFIG.minBatchCredits} (budget cap ${COLLECTOR_CONFIG.batchBudget})`;
    throw new Error(
      `Credits too low for a batch: ${why}.${capActive && dailyRemaining < COLLECTOR_CONFIG.minBatchCredits ? " Wait for the next UTC day." : " Refill first."}`,
    );
  }

  const seqRaw = await readMeta("batch_seq");
  const seq = (seqRaw ? parseInt(seqRaw, 10) : 0) + 1;
  const seed = randomInt(1, 2 ** 31 - 1);
  const batchId = `B${String(seq).padStart(4, "0")}`;

  const tierMix = { ...COLLECTOR_CONFIG.tierMix };
  // V3.3 anchor: the day's anchor airport is forced into the HUB slot (first
  // candidate tried). If it fails coverage/create, the regular HUB fallback
  // still fills the slot; the anchor pointer only advances on success.
  const anchor = await peekAnchorIcao();
  const candidates = await pickAirportCandidates(seed);
  if (anchor && candidates.HUB.includes(anchor)) {
    candidates.HUB = [anchor, ...candidates.HUB.filter((a) => a !== anchor)];
  }
  console.log(
    `[adb-collector] CREDIT-PLAN batch=${batchId} balance=${balance.creditsRemaining} reserve=${COLLECTOR_CONFIG.reserveCredits} → effectiveBudget=${effectiveBudget} dailyRemaining=${dailyRemaining} tierMix=${JSON.stringify(tierMix)}${anchor ? ` anchor=${anchor}` : ""}`,
  );

  const now = new Date();
  // V3.3 rotating UTC start: use the scheduled slot when the watchdog is in it
  // (≤5 min early), otherwise (manual start) the window begins now.
  const planned = plannedWindowStartUtc(seq);
  const windowStart = planned && planned.getTime() - now.getTime() <= 5 * 60_000 ? planned : now;
  const windowEnd = new Date(windowStart.getTime() + COLLECTOR_CONFIG.windowHours * 3600_000);

  // V3.9 R6 (§8.1): REFUSE a batch that violates the frozen crossover
  // template (declared window_shape / tier_mix / period ordering).
  const windowShape = `${COLLECTOR_CONFIG.windowHours}h`;
  const freezeErr = await checkTemplateFreeze(seq, windowShape, tierMix);
  if (freezeErr) {
    throw new Error(`[adb-collector] R6 REFUSED: ${freezeErr}`);
  }

  const created: CreatedSub[] = [];
  const skipped: SkippedAirport[] = [];
  const airports: string[] = [];

  // Fill each tier's slots, trying fallback airports in the SAME tier until the
  // slot is filled or candidates are exhausted. This keeps the per-batch
  // HUB/MID/REGIONAL mixture even when individual creates are rate-limited
  // (429) or the airport has no coverage.
  for (const tier of AIRPORT_TIERS) {
    const slots = tierMix[tier] ?? 0;
    if (slots <= 0) continue;
    const pool = candidates[tier] ?? [];
    let filled = 0;
    for (const icao of pool) {
      if (filled >= slots) break;

      let feed: Awaited<ReturnType<typeof checkAirportFeeds>> = null;
      try {
        feed = await checkAirportFeeds(icao);
      } catch {
        feed = null;
      }
      if (!feed) {
        skipped.push({ icao, reason: "no_coverage" });
        console.log(`[adb-collector] batch ${batchId} ${tier} ${icao} SKIP no_coverage`);
        continue;
      }

      const sub = await createSubscription("FlightByAirportIcao" as SubscriptionSubjectType, icao, {
        // V3.9 (§13, §44-C): zero retries so row↔credit identity is exact, the
        // balance delta reconciles against notification_items, and a transient
        // delivery failure PAUSES the run (gate 10) instead of silently
        // spending credits twice on the same item without a new row.
        maxDeliveryRetries: 0,
      });
      if (!sub?.id) {
        skipped.push({ icao, reason: "create_failed" });
        console.warn(`[adb-collector] batch ${batchId} ${tier} ${icao} SKIP create_failed — trying next ${tier} airport`);
        continue;
      }

      created.push({ icao, tier, subscriptionId: sub.id });
      airports.push(icao);
      filled++;
      console.log(`[adb-collector] batch ${batchId} ${tier} ${icao} SUBSCRIBED (${filled}/${slots} slots) sub=${sub.id}`);
    }
    if (filled < slots) {
      console.warn(`[adb-collector] batch ${batchId} only filled ${filled}/${slots} ${tier} slots (skipped=${skipped.length})`);
    }
  }

  await pool.query(
    `INSERT INTO clean.adb_collection_batches
       (batch_id, batch_seq, random_seed, status, window_start, window_end,
        credit_budget, tier_mix, airports, stop_reason, window_shape, anchor_icao,
        sampling_strategy, balance_before)
     VALUES ($1, $2, $3, 'ACTIVE', $4, $5, $6, $7::jsonb, $8::text[], NULL, $9, $10,
        $11, $12)`,
    [
      batchId,
      seq,
      seed,
      windowStart,
      windowEnd,
      effectiveBudget,
      JSON.stringify(tierMix),
      airports,
      windowShape,
      anchor ?? null,
      anchor ? "anchor" : "rotating",
      // V3.9: authoritative balance at batch start (source of truth for the
      // stop-time reconciliation credits_consumed_actual = before − after).
      balance.creditsRemaining,
    ],
  );

  if (anchor && created.some((c) => c.icao === anchor)) {
    await advanceAnchor();
    await writeMeta("last_anchor", anchor);
  }

  for (const c of created) {
    const tierKey = (c.tier ?? "") as AirportTier;
    const slots = tierKey ? tierMix[tierKey] ?? 0 : 0;
    const catalogLen = c.tier ? AIRPORT_CATALOG[c.tier].length : 1;
    // Selection probability for an airport of this tier in this batch.
    // Within a selected airport it's a census (all flights), so the flight's
    // selection probability == the airport's selection probability.
    const p = slots > 0 && catalogLen > 0 ? Math.min(1, slots / catalogLen) : 1;
    // Plan §8/§20: sampling_weight is NULL by default — NO auto 1/p (1/p ≠
    // valid flight-level inclusion probability). The design probability p is
    // recorded for diagnostics only; it is never converted into a weight.
    await pool.query(
      `INSERT INTO clean.adb_collection_subs
         (subscription_id, batch_id, icao, tier, sampling_probability, sampling_weight)
       VALUES ($1, $2, $3, $4, $5, NULL)`,
      [c.subscriptionId, batchId, c.icao, c.tier, p],
    );
  }

  // Remember ONLY the airports actually subscribed (not the skipped ones), so
  // the next batch rotates to genuinely-fresh airports.
  const recentRaw = await readMeta("recent_batches");
  const recent: string[][] = recentRaw ? JSON.parse(recentRaw) : [];
  const nextRecent = [...recent, airports].slice(-COLLECTOR_CONFIG.rememberRecentBatches);
  await writeMeta("recent_batches", JSON.stringify(nextRecent));

  await writeMeta("batch_seq", String(seq));

  // V3.9 R7 (§15, §17 Phase 5): stamp the versioned manifest so the run is
  // reproducible and `npm run health` can show it.
  await writeManifest();

  const batch = (await getActiveBatch())!;
  return { batch, created, skipped };
}

export async function stopBatch(reason: string): Promise<CollectionBatch | null> {
  const active = await getActiveBatch();
  if (!active) return null;

  const res = await pool.query(
    "SELECT subscription_id FROM clean.adb_collection_subs WHERE batch_id = $1 AND ended_at IS NULL",
    [active.batchId],
  );
  for (const row of res.rows) {
    try {
      await deleteSubscription(row.subscription_id);
    } catch {
      // keep going — delete is free but failure shouldn't block closing the batch
    }
    await pool.query(
      "UPDATE clean.adb_collection_subs SET ended_at = now() WHERE subscription_id = $1",
      [row.subscription_id],
    );
  }

  // ---- V3.9 three-quantity reconciliation (§13, §44-A/B) ----
  // C_external = balance_before − balance_after (authoritative);
  // C_internal = notification_items ledger. |C_external − C_internal| ≤ tol → PASS.
  const beforeRes = await pool.query(
    "SELECT balance_before FROM clean.adb_collection_batches WHERE batch_id = $1",
    [active.batchId],
  );
  const balanceBefore: number | null =
    beforeRes.rowCount && beforeRes.rows[0].balance_before != null ? Number(beforeRes.rows[0].balance_before) : null;
  const balanceAfter = await getBalance();
  const aggRes = await pool.query(
    `SELECT COALESCE(sum(notification_items), 0)::int AS items,
            COALESCE(sum(rows_stored), 0)::int AS stored,
            COALESCE(sum(rows_inserted), 0)::int AS inserted,
            COALESCE(sum(rows_updated), 0)::int AS updated,
            COALESCE(count(*) FILTER (WHERE delivery_failure), 0)::int AS failures
       FROM clean.adb_ingest_events WHERE batch_id = $1`,
    [active.batchId],
  );
  const agg = aggRes.rows[0] ?? { items: 0, stored: 0, inserted: 0, updated: 0, failures: 0 };
  const internal = Number(agg.items) ?? 0;
  const actual =
    balanceBefore !== null && balanceAfter?.creditsRemaining != null
      ? balanceBefore - balanceAfter.creditsRemaining
      : null;
  const mismatch =
    actual !== null && internal !== null ? Math.abs(actual - internal) > COLLECTOR_CONFIG.reconcileTolerance : false;
  const reconcileStatus =
    actual === null ? null : mismatch ? "MISMATCH" : "PASS";
  if (mismatch) {
    console.error(
      `[adb-collector] ⚠ RECONCILE MISMATCH batch=${active.batchId} ` +
        `C_external=${actual} C_internal=${internal} tolerance=${COLLECTOR_CONFIG.reconcileTolerance} ` +
        `(stored=${agg.stored} inserted=${agg.inserted} updated=${agg.updated} failures=${agg.failures})`,
    );
  } else {
    console.log(
      `[adb-collector] batch ${active.batchId} CLOSED reconcile=${reconcileStatus} ` +
        `C_external=${actual} C_internal=${internal} items=${agg.items} stored=${agg.stored} ` +
        `inserted=${agg.inserted} updated=${agg.updated} failures=${agg.failures}`,
    );
  }

  // V3.9 R6 (§8.1): record which crossover block (if any) this batch belonged
  // to, so a period-2 without its period-1 is refused on the next start.
  const tmpl = await readRunTemplate();
  if (tmpl && tmpl.crossover.length > 0) {
    const todayKey = new Date().toISOString().slice(0, 10);
    const blockToday = tmpl.crossover.find((e) => !e.day || e.day === todayKey);
    if (blockToday && reason !== "delivery_failure" && reason !== "soft_stop") {
      await writeMeta("crossover_block_done", String(blockToday.block));
      console.log(`[adb-collector] crossover block ${blockToday.block} recorded done (batch ${active.batchId})`);
    }
  }

  await pool.query(
    `UPDATE clean.adb_collection_batches
        SET status = 'CLOSED', ended_at = now(), stop_reason = $1,
            balance_after = $3, credits_consumed_actual = $4,
            credits_consumed_internal = $5, notification_items_received = $6,
            rows_stored = $7, rows_inserted = $8, rows_updated = $9,
            delivery_failures = $10, reconciliation_status = $11
      WHERE batch_id = $2`,
    [
      reason,
      active.batchId,
      balanceAfter?.creditsRemaining ?? null,
      actual,
      internal,
      Number(agg.items) ?? 0,
      Number(agg.stored) ?? 0,
      Number(agg.inserted) ?? 0,
      Number(agg.updated) ?? 0,
      Number(agg.failures) ?? 0,
      reconcileStatus,
    ],
  );

  const after = await getActiveBatch();
  void after;
  return { ...active, status: "CLOSED", endedAt: new Date(), stopReason: reason };
}

// ---------------------------------------------------------------------------
// Lookups / budget / diagnostics
// ---------------------------------------------------------------------------

export async function lookupSubscriptionMeta(subscriptionId: string): Promise<SamplingMeta | null> {
  const res = await pool.query(
    `SELECT s.batch_id, s.icao, s.tier, s.sampling_probability, s.sampling_weight,
            b.random_seed, b.window_start, b.window_end
     FROM clean.adb_collection_subs s
     JOIN clean.adb_collection_batches b ON b.batch_id = s.batch_id
     WHERE s.subscription_id = $1`,
    [subscriptionId],
  );
  if (!res.rowCount) return null;
  const r = res.rows[0];
  const p = toInt(r.sampling_probability);
  return {
    batchId: toStr(r.batch_id),
    tier: toStr(r.tier),
    samplingProbability: p,
    samplingWeight: toInt(r.sampling_weight),
    randomSeed: toStr(r.random_seed),
    windowStart: r.window_start ? new Date(r.window_start) : null,
    windowEnd: r.window_end ? new Date(r.window_end) : null,
  };
}

/** Rows attributed to a batch (NOT credits — V3.9: credits are notification
 *  items via actualBatchSpend, rows are a legacy/best-effort fallback). */
export async function estimateBatchCredits(batchId: string): Promise<number> {
  const res = await pool.query(
    "SELECT count(*)::int AS n FROM clean.flight_data_pre_post WHERE sampling_batch_id = $1",
    [batchId],
  );
  return res.rowCount ? res.rows[0].n : 0;
}

export interface CollectionStatus {
  balance: number | null;
  reserveCredits: number;
  batchBudget: number;
  minBatchCredits: number;
  windowHours: number;
  tierMix: Record<string, number>;
  /** V3.3: hard cap on credits per UTC day (0 = disabled). */
  dailyCreditCap: number;
  /** notification items delivered today (V3.9 C_internal basis; maxDeliveryRetries=0 ⇒ each item = 1 credit) — null when the query fails */
  creditsUsedToday: number | null;
  /** dailyCreditCap − creditsUsedToday (≥0; null when cap disabled) */
  dailyRemaining: number | null;
  /** V3.9: webhook delivery failures today — must stay 0 (gate 10: >0 → pause) */
  deliveryFailuresToday: number | null;
  /** V3.3 current anchor pick for this batch (or null when disabled) */
  currentAnchor: string | null;
  activeBatch: CollectionBatch | null;
  activeBatchCredits: number | null;
  canStart: boolean;
  reason: string | null;
  /** how many credits to refill to be able to run a FULL-budget batch
   *  (batchBudget + reserve). 0 when balance already covers it. */
  refillRecommended: number;
  /** when the last flight_data_pre_post row was stored (data-flow health) */
  lastReceivedAt: Date | null;
  /** minutes since lastReceivedAt (null when no rows yet) — a large value = data gap */
  gapMinutes: number | null;
}
export async function getCollectionStatus(): Promise<CollectionStatus> {
  const balance = await getBalance();
  const active = await getActiveBatch();
  const activeBatchCredits = active ? await estimateBatchCredits(active.batchId) : null;
  const remaining = balance?.creditsRemaining ?? 0;
  const available = Math.max(0, remaining - COLLECTOR_CONFIG.reserveCredits);
  const effectiveBudget = Math.min(COLLECTOR_CONFIG.batchBudget, available);
  const canStart = !active && effectiveBudget >= COLLECTOR_CONFIG.minBatchCredits;
  const refillRecommended = Math.max(0, COLLECTOR_CONFIG.batchBudget + COLLECTOR_CONFIG.reserveCredits - remaining);

  // V3.3 daily cap + current anchor (best-effort; status never fails on these).
  let creditsUsedToday: number | null = null;
  let currentAnchor: string | null = null;
  let deliveryFailuresTodayCount: number | null = null;
  try {
    creditsUsedToday = await creditsUsedTodayUtc();
  } catch {
    creditsUsedToday = null;
  }
  try {
    currentAnchor = await peekAnchorIcao();
  } catch {
    currentAnchor = null;
  }
  try {
    deliveryFailuresTodayCount = await deliveryFailuresToday();
  } catch {
    deliveryFailuresTodayCount = null;
  }

  // Data-flow health: how long since the last row landed.
  let lastReceivedAt: Date | null = null;
  try {
    const r = await pool.query("SELECT max(received_at)::timestamptz AS last FROM clean.flight_data_pre_post");
    if (r.rowCount && r.rows[0].last) lastReceivedAt = new Date(r.rows[0].last);
  } catch {
    // status must not fail on a stats query
  }

  return {
    balance: balance?.creditsRemaining ?? null,
    reserveCredits: COLLECTOR_CONFIG.reserveCredits,
    batchBudget: effectiveBudget,
    minBatchCredits: COLLECTOR_CONFIG.minBatchCredits,
    windowHours: COLLECTOR_CONFIG.windowHours,
    tierMix: COLLECTOR_CONFIG.tierMix,
    dailyCreditCap: COLLECTOR_CONFIG.dailyCreditCap,
    creditsUsedToday,
    dailyRemaining:
      creditsUsedToday !== null && COLLECTOR_CONFIG.dailyCreditCap > 0
        ? Math.max(0, COLLECTOR_CONFIG.dailyCreditCap - creditsUsedToday)
        : null,
    currentAnchor,
    deliveryFailuresToday: deliveryFailuresTodayCount,
    activeBatch: active,
    activeBatchCredits,
    canStart,
    reason: active
      ? "A batch is active — stop it first."
      : canStart
        ? null
        : balance === null
          ? "No balance yet — refill first."
          : `Insufficient credits (${remaining} < reserve ${COLLECTOR_CONFIG.reserveCredits} + min batch ${COLLECTOR_CONFIG.minBatchCredits}).`,
    refillRecommended,
    lastReceivedAt,
    gapMinutes: lastReceivedAt ? Math.max(0, Math.round((Date.now() - lastReceivedAt.getTime()) / 60_000)) : null,
  };
}

// ---------------------------------------------------------------------------
// Diagnostics (coverage / bias report against what we collected)
// ---------------------------------------------------------------------------

export interface Diagnostics {
  totals: Record<string, number>;
  byTier: Array<{ airport_tier: string | null; rows: number; share: number }>;
  byDepartureHour: Array<{ hour: number | null; rows: number }>;
  byDelayBucket: Array<{ bucket: string; rows: number }>;
  byStatus: Array<{ status: string | null; rows: number }>;
  batches: Array<{
    batch_id: string;
    status: string;
    started_at: string;
    ended_at: string | null;
    credit_budget: number;
    airports: string[];
    rows: number;
    window_shape: string | null;
    anchor_icao: string | null;
    sampling_strategy: string | null;
  }>;
  totalEstimatedCredits: number;
  /** data-flow health: last row received + gap (minutes) since it */
  lastReceivedAt: Date | null;
  gapMinutes: number | null;
  /** Optional airport-coverage summary (may be null if the free call fails). */
  coverage?: Pick<AirportCoverage,
    | "fetchedAt"
    | "universeCount"
    | "catalogCount"
    | "catalogInUniverse"
    | "catalogMissingFromUniverse"
    | "byTier"
    | "worldScheduledCommercial"
    | "error"> | null;
}

export async function getDiagnostics(): Promise<Diagnostics> {
  const [totalRes, tierRes, hourRes, delayRes, statusRes, batchesRes, creditsRes] = await Promise.all([
    pool.query(
      `SELECT
         count(*)::int AS rows,
         count(DISTINCT flight_number)::int AS distinct_flight_numbers,
         count(DISTINCT (flight_number, dep_scheduled_utc))::int AS distinct_flight_instances,
         count(DISTINCT dep_airport_icao)::int AS dep_airports,
         count(DISTINCT arr_airport_icao)::int AS arr_airports,
         count(DISTINCT carrier_iata)::int AS airlines,
         count(DISTINCT aircraft_reg)::int AS aircraft,
         count(DISTINCT (dep_airport_icao, arr_airport_icao))::int AS routes,
         count(*) FILTER (WHERE status = 'Canceled')::int AS cancelled
       FROM clean.flight_data_pre_post`,
    ),
    pool.query(
      `SELECT airport_tier, count(*)::int AS rows
       FROM clean.flight_data_pre_post GROUP BY airport_tier ORDER BY airport_tier`,
    ),
    pool.query(
      `SELECT EXTRACT(hour FROM dep_scheduled_utc)::int AS hour, count(*)::int AS rows
       FROM clean.flight_data_pre_post GROUP BY 1 ORDER BY 1`,
    ),
    pool.query(
      `SELECT
         CASE
           WHEN dep_runway_utc IS NULL OR dep_scheduled_utc IS NULL THEN 'unknown'
           WHEN EXTRACT(epoch FROM (dep_runway_utc - dep_scheduled_utc)) / 60 < 15 THEN '<15min'
           WHEN EXTRACT(epoch FROM (dep_runway_utc - dep_scheduled_utc)) / 60 < 60 THEN '15-60min'
           WHEN EXTRACT(epoch FROM (dep_runway_utc - dep_scheduled_utc)) / 60 < 180 THEN '60-180min'
           ELSE '>180min'
         END AS bucket, count(*)::int AS rows
       FROM clean.flight_data_pre_post GROUP BY 1 ORDER BY 1`,
    ),
    pool.query(
      `SELECT status, count(*)::int AS rows FROM clean.flight_data_pre_post GROUP BY status ORDER BY 2 DESC`,
    ),
    pool.query(
      `SELECT b.batch_id, b.status, b.started_at, b.ended_at, b.credit_budget, b.airports,
              b.window_shape, b.anchor_icao, b.sampling_strategy
       FROM clean.adb_collection_batches b ORDER BY b.batch_seq`,
    ),
    pool.query(
      `SELECT count(*)::int AS n FROM clean.flight_data_pre_post WHERE sampling_batch_id IS NOT NULL`,
    ),
  ]);

  const totals = totalRes.rows[0] ?? {};
  const totalRows = totals.rows ?? 0;

  const byTier = tierRes.rows.map((r: any) => ({
    airport_tier: r.airport_tier,
    rows: r.rows,
    share: totalRows > 0 ? Number((r.rows / totalRows).toFixed(4)) : 0,
  }));
  const byDepartureHour = hourRes.rows.map((r: any) => ({ hour: r.hour, rows: r.rows }));
  const byDelayBucket = delayRes.rows.map((r: any) => ({ bucket: r.bucket, rows: r.rows }));
  const byStatus = statusRes.rows.map((r: any) => ({ status: r.status, rows: r.rows }));

  const batches = await Promise.all(
    batchesRes.rows.map(async (b: any) => {
      const rowsRes = await pool.query(
        "SELECT count(*)::int AS n FROM clean.flight_data_pre_post WHERE sampling_batch_id = $1",
        [b.batch_id],
      );
      return {
        batch_id: b.batch_id,
        status: b.status,
        started_at: b.started_at,
        ended_at: b.ended_at,
        credit_budget: Number(b.credit_budget),
        airports: b.airports ?? [],
        rows: rowsRes.rowCount ? rowsRes.rows[0].n : 0,
        window_shape: b.window_shape ?? null,
        anchor_icao: b.anchor_icao ?? null,
        sampling_strategy: b.sampling_strategy ?? null,
      };
    }),
  );

  // Best-effort coverage summary (free call, cached 12h — never fails the report).
  let coverageSummary: Diagnostics["coverage"] = null;
  try {
    const cov = await getAirportCoverage();
    if (cov) {
      coverageSummary = {
        fetchedAt: cov.fetchedAt,
        universeCount: cov.universeCount,
        catalogCount: cov.catalogCount,
        catalogInUniverse: cov.catalogInUniverse,
        catalogMissingFromUniverse: cov.catalogMissingFromUniverse,
        byTier: cov.byTier,
        worldScheduledCommercial: cov.worldScheduledCommercial,
        error: cov.error,
      };
    }
  } catch {
    coverageSummary = null;
  }

  // Data-flow health: last row + gap minutes (also surfaces in /status).
  let lastReceivedAt: Date | null = null;
  try {
    const r = await pool.query("SELECT max(received_at)::timestamptz AS last FROM clean.flight_data_pre_post");
    if (r.rowCount && r.rows[0].last) lastReceivedAt = new Date(r.rows[0].last);
  } catch {
    // diagnostics must not fail on a stats query
  }

  return {
    totals,
    byTier,
    byDepartureHour,
    byDelayBucket,
    byStatus,
    batches,
    totalEstimatedCredits: creditsRes.rowCount ? creditsRes.rows[0].n : 0,
    lastReceivedAt,
    gapMinutes: lastReceivedAt ? Math.max(0, Math.round((Date.now() - lastReceivedAt.getTime()) / 60_000)) : null,
    coverage: coverageSummary,
  };
}

// ---------------------------------------------------------------------------
// Watchdog — the fully-automatic collection loop.
//   1. Auto-STOP an active batch when its window elapses or its credit budget
//      is reached.
//   2. Auto-START the next batch when nothing is active (after a cooldown),
//      if auto-rotation is enabled (ADB_AUTO_COLLECT, default ON). This makes
//      overnight/day-long collection hands-off: subscribe → collect →
//      unsubscribe → rotate → repeat.
//   3. Clean up ORPHAN subscriptions — webhook subs that are NOT part of the
//      active batch (e.g. a manually-created KJFK sub from before the batch
//      system). Keeping them would keep charging credits forever.
// Reads the DB + calls free endpoints only (delete/create/list are 0 credits);
// it can never spend alert credits on its own — startBatch() enforces the
// budget + reserve check.
// ---------------------------------------------------------------------------

let watchdogStarted = false;
/** True while startBatch() is mid-flight (subs created before the batch row).
 *  The watchdog must not treat those half-created subs as orphans. */
let creatingBatch = false;

/** Delete any AeroDataBox webhook sub that is not part of the active batch. */
async function cleanupOrphanSubscriptions(): Promise<number> {
  if (creatingBatch) return 0;
  const subs = await listSubscriptions();
  if (subs.length === 0) return 0;

  const active = await getActiveBatch();
  const keep = new Set<string>();
  if (active) {
    const res = await pool.query(
      "SELECT subscription_id FROM clean.adb_collection_subs WHERE batch_id = $1",
      [active.batchId],
    );
    for (const r of res.rows) keep.add(String(r.subscription_id));
  }

  let removed = 0;
  for (const s of subs) {
    if (keep.has(s.id)) continue;
    const ok = await deleteSubscription(s.id);
    if (ok) {
      removed++;
      console.log(`[adb-collector] removed orphan subscription ${s.id}`);
    }
  }
  return removed;
}

/** V3.9 R5 (§45.5-R5, migration 0018): mark every row captured by a
 *  delivery-failure-stopped batch as flagged (audit column) so affected
 *  observations are queryable after a forced stop. */
export async function flagBatchRows(batchId: string, reason: string): Promise<number> {
  const res = await pool.query(
    `UPDATE clean.flight_data_pre_post
        SET flagged_at = now(), flag_reason = $2
      WHERE sampling_batch_id = $1 AND flagged_at IS NULL`,
    [batchId, reason],
  );
  return res.rowCount ?? 0;
}

/** V3.9 R5: a batch stopped for delivery_failure / budget overshoot must be
 *  acknowledged reconciled (`reconcile_acked`) before the watchdog may
 *  auto-start the next batch. Set via startBatch() callers or a manual
 *  reconcile step; auto-resume refuses while the flag is unset. */
async function lastStopRequiresReconcile(): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM clean.adb_collection_batches
      WHERE stop_reason IN ('delivery_failure', 'soft_stop')
        AND reconcile_acked = false
      ORDER BY started_at DESC LIMIT 1`,
  );
  return (res.rowCount ?? 0) > 0;
}

/** Auto-start the next batch if: enabled, nothing active, we're inside the
 *  batch's scheduled rotating UTC slot, today's daily cap isn't spent, the
 *  cooldown has elapsed, and credits suffice (startBatch enforces the latter
 *  and throws). V3.3: with ADB_ROTATING_UTC_START the watchdog auto-starts
 *  only within the one 4 h window scheduled at cycle[seq % len], so we get
 *  exactly one window per day at a rotating UTC hour. */
async function maybeAutoStartNextBatch(): Promise<void> {
  if (!COLLECTOR_CONFIG.autoCollect) return;
  if (await getActiveBatch()) return;

  // V3.9 R5 (§45.5-R5): never silently resume after a delivery-failure or
  // soft-stop batch — require an explicit reconcile acknowledgement first.
  if (await lastStopRequiresReconcile()) {
    console.warn(
      `[adb-collector] auto-start BLOCKED — a prior batch was stopped by ` +
        `delivery_failure / soft_stop and is not reconcile_acked yet. ` +
        `Reconcile it (flag rows, inspect logs) before the run may continue (§45.5-R5).`,
    );
    return;
  }

  const nowHour = new Date().getUTCHours();
  if (nowHour < COLLECTOR_CONFIG.autoStartHourUtc || nowHour >= COLLECTOR_CONFIG.autoEndHourUtc) {
    return;
  }

  // Rotating UTC slot: only auto-start inside the NEXT batch's scheduled
  // window. A missed slot means waiting for the next cycle hour (one/day).
  const seqRaw = await readMeta("batch_seq");
  const nextSeq = (seqRaw ? parseInt(seqRaw, 10) : 0) + 1;
  const planned = plannedWindowStartUtc(nextSeq);
  if (planned) {
    const nowMs = Date.now();
    const plannedMs = planned.getTime();
    const windowMs = COLLECTOR_CONFIG.windowHours * 3600_000;
    if (nowMs < plannedMs || nowMs - plannedMs > windowMs) return;
  }

  // One auto-started batch per UTC day (manual starts unaffected) — keeps the
  // "1 × 4 h/day" cadence even on low-yield days that don't spend the cap.
  const lastStartDay = await readMeta("auto_start_day");
  const todayKey = new Date().toISOString().slice(0, 10);
  if (lastStartDay === todayKey) return;

  // Daily credit cap: don't even call startBatch when today's quota is gone.
  if (COLLECTOR_CONFIG.dailyCreditCap > 0) {
    try {
      const used = await creditsUsedTodayUtc();
      const remaining = COLLECTOR_CONFIG.dailyCreditCap - used;
      if (remaining < COLLECTOR_CONFIG.minBatchCredits) {
        console.log(
          `[adb-collector] daily cap reached (${used}/${COLLECTOR_CONFIG.dailyCreditCap} credits today, ${remaining} left) — waiting for the next UTC day`,
        );
        return;
      }
    } catch {
      // non-fatal — startBatch enforces the cap anyway (hard floor)
    }
  }

  // Cooldown since the last batch CLOSED (any reason).
  const lastClosed = await pool.query(
    "SELECT ended_at FROM clean.adb_collection_batches WHERE status = 'CLOSED' ORDER BY batch_seq DESC LIMIT 1",
  );
  if (lastClosed.rowCount && lastClosed.rows[0].ended_at) {
    const mins = (Date.now() - new Date(lastClosed.rows[0].ended_at).getTime()) / 60_000;
    if (mins < COLLECTOR_CONFIG.autoCooldownMinutes) return;
  }

  try {
    const result = await startBatch();
    await writeMeta("auto_start_day", todayKey);
    const tierCounts = countTiers(result.batch.airports);
    console.log(
      `[adb-collector] AUTO-STARTED batch ${result.batch.batchId} airports=${result.batch.airports.join(",")} ` +
        `tiers=${JSON.stringify(tierCounts)} created=${result.created.length} skipped=${result.skipped.length} budget=${result.batch.creditBudget}`,
    );
  } catch (err: any) {
    // startBatch throws on credits-too-low / already-active — normal, not fatal.
    console.warn(`[adb-collector] auto-start skipped: ${err?.message || err}`);
  }
}

export function startCollectionWatchdog(): void {
  if (watchdogStarted) return;
  watchdogStarted = true;
  let tickCount = 0;
  let lastAlertAt = 0;
  let lastAlertReason = "";
  const timer = setInterval(async () => {
    try {
      tickCount++;

      // 0) Low-frequency heartbeat: balance + data-flow gap so a stalled
      //    collection (or a credit dry-run) is visible in the logs without
      //    polling the API. Logs once per HEARTBEAT_TICKS (default every 10
      //    ticks ≈ 10 min at the default 60 s watchdog).
      if (tickCount % 10 === 0) {
        const status = await getCollectionStatus();
        // Today's row count (UTC day) + per-tier breakdown of the active batch,
        // so a glance shows collection is growing and the mixture is holding.
        let rowsToday = "?";
        let batchTiers = "";
        try {
          const t = await pool.query(
            "SELECT count(*)::int AS n FROM clean.flight_data_pre_post WHERE received_at >= date_trunc('day', now())",
          );
          rowsToday = String(t.rowCount ? t.rows[0].n : 0);
        } catch {
          // non-fatal
        }
        if (status.activeBatch) {
          try {
            const tr = await pool.query(
              "SELECT airport_tier AS tier, count(*)::int AS n FROM clean.flight_data_pre_post WHERE sampling_batch_id = $1 GROUP BY airport_tier",
              [status.activeBatch.batchId],
            );
            batchTiers =
              " tiers=" +
              Object.entries(
                Object.fromEntries(tr.rows.map((r) => [r.tier, r.n])),
              )
                .map(([k, v]) => `${k}:${v}`)
                .join(",");
          } catch {
            // non-fatal
          }
        }
        console.log(
          `[adb-collector] heartbeat balance=${status.balance} rowsToday=${rowsToday} gap=${status.gapMinutes}min canStart=${status.canStart}${status.refillRecommended > 0 ? ` refillToFullBudget=${status.refillRecommended}` : ""}${status.activeBatch ? ` active=${status.activeBatch.batchId} rows=${status.activeBatchCredits}${batchTiers}` : ""}${status.reason ? ` reason=${status.reason}` : ""}`,
        );

        // ---- self-monitoring alert (no manual checking needed) ----
        // Raise an ALERT line (+ optional Slack POST) when data has stalled
        // or credits are about to run out. Cooldown prevents spam; it fires
        // again every alertCooldownMinutes until the problem clears.
        let alertReason: string | null = null;
        if (status.deliveryFailuresToday !== null && status.deliveryFailuresToday > 0) {
          // V3.9 gate 10: failures = lost deliveries (retries=0). Highest priority.
          alertReason = `delivery failures today (${status.deliveryFailuresToday}) — run should be paused`;
        } else if (status.gapMinutes !== null && status.gapMinutes > COLLECTOR_CONFIG.alertGapMinutes) {
          alertReason = `data gap: no row for ${status.gapMinutes}min (> ${COLLECTOR_CONFIG.alertGapMinutes}min)`;
        } else if (status.balance !== null && status.balance < COLLECTOR_CONFIG.alertMinBalance) {
          alertReason = `balance low (${status.balance} < ${COLLECTOR_CONFIG.alertMinBalance})`;
        }
        if (alertReason && Date.now() - lastAlertAt > COLLECTOR_CONFIG.alertCooldownMinutes * 60_000) {
          lastAlertAt = Date.now();
          lastAlertReason = alertReason;
          const msg = `[adb-collector] ⚠ ALERT ${alertReason}${status.refillRecommended > 0 ? ` — refill ${status.refillRecommended}+ credits` : ""}${status.activeBatch ? ` (active=${status.activeBatch.batchId})` : ""}. Check logs/collector.log or run: npm run health`;
          console.warn(msg);
          if (COLLECTOR_CONFIG.alertWebhookUrl) {
            try {
              await fetch(COLLECTOR_CONFIG.alertWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: `Travnr ⚠ ${alertReason}${status.refillRecommended > 0 ? ` — refill ${status.refillRecommended}+ credits` : ""}` }),
              });
            } catch (e: any) {
              console.error("[adb-collector] alert webhook failed:", e?.message || e);
            }
          }
        } else if (!alertReason && lastAlertReason) {
          lastAlertReason = "";
          console.log(`[adb-collector] ALERT CLEARED — collection healthy again`);
        }
      }

      // 1) Auto-stop an active batch that outlived its window / budget.
      const active = await getActiveBatch();
      if (active) {
        if (Date.now() > active.windowEnd.getTime()) {
          console.warn(`[adb-collector] window elapsed for ${active.batchId} — stopping`);
          await stopBatch("window_elapsed");
          return;
        }
        const used = await actualBatchSpend(active.batchId);
        if (used >= active.creditBudget) {
          console.warn(`[adb-collector] ${active.batchId} reached budget (${used} ≥ ${active.creditBudget}) — stopping`);
          await stopBatch("budget_reached");
          return;
        }
        // V3.9 R2 (§3.3, §45.5-R2): SOFT_STOP margin — stop the active batch
        // when today's ACTUAL spend reaches `dailyCreditCap − softStopMargin`,
        // so an asynchronous accounting burst cannot overshoot the hard cap.
        // HARD_CAP remains dailyCreditCap; any overshoot is flagged MISMATCH
        // in the batch reconciliation.
        if (COLLECTOR_CONFIG.dailyCreditCap > 0) {
          const usedToday = await creditsUsedTodayUtc();
          const softStop = COLLECTOR_CONFIG.dailyCreditCap - COLLECTOR_CONFIG.softStopMargin;
          if (usedToday >= softStop) {
            console.warn(
              `[adb-collector] ${active.batchId} SOFT_STOP — today's actual spend ${usedToday} ≥ ${softStop} (cap ${COLLECTOR_CONFIG.dailyCreditCap} − margin ${COLLECTOR_CONFIG.softStopMargin}) — stopping`,
            );
            await stopBatch("soft_stop");
            return;
          }
        }
        // V3.9 gate 10 (§27.1, §44-C): any delivery failure in the batch →
        // PAUSE the run. maxDeliveryRetries=0 means a failed delivery is LOST,
        // so continuing would silently bias the data toward whatever delivered.
        const batchFailures = await deliveryFailuresForBatch(active.batchId);
        if (batchFailures > 0) {
          console.error(
            `[adb-collector] ⚠ delivery failures (${batchFailures}) in ${active.batchId} — PAUSING run (gate 10). ` +
              `Inspect logs before restarting: a maxDeliveryRetries=0 delivery that fails is lost.`,
          );
          // R5 (§45.5-R5, migration 0018): flag the affected rows so they are
          // queryable, and require an explicit reconcile_ack before the
          // watchdog may auto-resume a batch.
          await flagBatchRows(active.batchId, "delivery_failure");
          await stopBatch("delivery_failure");
          return;
        }
        return; // batch healthy — nothing else to do this tick
      }

      // 2) Nothing active → clean stray subs + maybe rotate to the next batch.
      await cleanupOrphanSubscriptions();
      await maybeAutoStartNextBatch();
    } catch (err: any) {
      console.warn("[adb-collector] watchdog error:", err?.message || err);
    }
  }, COLLECTOR_CONFIG.watchdogSeconds * 1000);
  timer.unref?.();
  console.log(
    `[adb-collector] watchdog started (window=${COLLECTOR_CONFIG.windowHours}h, budget=${COLLECTOR_CONFIG.batchBudget} credits/batch, dailyCap=${COLLECTOR_CONFIG.dailyCreditCap}, softStop=${COLLECTOR_CONFIG.softStopMargin} margin, reserve=${COLLECTOR_CONFIG.reserveCredits}, minBatch=${COLLECTOR_CONFIG.minBatchCredits}, tierMix=${JSON.stringify(COLLECTOR_CONFIG.tierMix)}, anchor=${COLLECTOR_CONFIG.anchorEnabled ? COLLECTOR_CONFIG.anchorPool.join("|") : "off"}, utcCycle=${COLLECTOR_CONFIG.rotatingUtcStart ? COLLECTOR_CONFIG.utcStartCycle.join(",") : "off"}, autoCollect=${COLLECTOR_CONFIG.autoCollect})`,
  );
}

// ---------------------------------------------------------------------------
// Airport coverage analysis — "how much of the world can we touch?"
//
// AeroDataBox's FREE `GET /health/services/feeds/{service}/airports` returns
// the ICAO of every airport it supports per feed. Comparing that universe
// against our catalog tells us (a) how many airports are even collectable,
// and (b) how much of it our tier-rotating samples can draw from. All calls
// are free; results are cached in memory for COVERAGE_CACHE_MS to avoid
// hammering the API. See MDplan/V3_CollectionStrategy.md §10.
// ---------------------------------------------------------------------------

const COVERAGE_CACHE_MS = 12 * 60 * 60 * 1000; // 12h
let coverageCache: { at: number; data: AirportCoverage } | null = null;

export interface AirportCoverage {
  fetchedAt: string | null;
  /** Airports AeroDataBox supports per feed service (free enumeration). */
  universe: Record<FeedService, string[]>;
  /** Union of all three feeds (the true collectable universe). */
  universeUnion: string[];
  universeCount: number;
  /** Our catalog: how many unique airports, and how many are in the universe. */
  catalogCount: number;
  catalogInUniverse: number;
  catalogMissingFromUniverse: string[];
  /** Sanity: how many universe airports are NOT in our catalog (we could add). */
  universeNotInCatalog: string[];
  /** Per-tier breakdown of our catalog against the universe. */
  byTier: Array<{ tier: AirportTier; total: number; inUniverse: number }>;
  /** ~500 airports carry >90% of world passenger traffic (ATAG). */
  worldScheduledCommercial: number;
  error: string | null;
}

/** Exported for tests: build a coverage report from given data (no API calls). */
export function computeAirportCoverage(
  feeds: Partial<Record<FeedService, string[]>>,
): Omit<AirportCoverage, "fetchedAt" | "error" | "worldScheduledCommercial"> {
  const services: FeedService[] = ["FlightSchedules", "FlightLiveUpdates", "AdsbUpdates"];
  const universe: Record<FeedService, string[]> = {
    FlightSchedules: [],
    FlightLiveUpdates: [],
    AdsbUpdates: [],
  };
  const unionSet = new Set<string>();
  for (const s of services) {
    const list = (feeds[s] ?? []).map((c) => c.toUpperCase()).filter(Boolean);
    universe[s] = Array.from(new Set(list));
    for (const c of list) unionSet.add(c);
  }
  const universeUnion = Array.from(unionSet).sort();

  const catalog = allCatalogAirports().map((c) => c.toUpperCase());
  const catalogSet = new Set(catalog);
  const catalogInUniverse = Array.from(catalogSet).filter((c) => unionSet.has(c));
  const catalogMissingFromUniverse = Array.from(catalogSet).filter((c) => !unionSet.has(c)).sort();
  const universeNotInCatalog = universeUnion.filter((c) => !catalogSet.has(c));

  const byTier: Array<{ tier: AirportTier; total: number; inUniverse: number }> =
    AIRPORT_TIERS.map((t) => {
      const tierList = AIRPORT_CATALOG[t].map((c) => c.toUpperCase());
      return {
        tier: t,
        total: tierList.length,
        inUniverse: tierList.filter((c) => unionSet.has(c)).length,
      };
    });

  return {
    universe,
    universeUnion,
    universeCount: universeUnion.length,
    catalogCount: catalogSet.size,
    catalogInUniverse: catalogInUniverse.length,
    catalogMissingFromUniverse,
    universeNotInCatalog,
    byTier,
  };
}

/** Fresh coverage report — free API calls, cached 12h. Null on error. */
export async function getAirportCoverage(force = false): Promise<AirportCoverage | null> {
  if (!force && coverageCache && Date.now() - coverageCache.at < COVERAGE_CACHE_MS) {
    return coverageCache.data;
  }
  try {
    const services: FeedService[] = ["FlightSchedules", "FlightLiveUpdates", "AdsbUpdates"];
    const feeds: Partial<Record<FeedService, string[]>> = {};
    for (const s of services) {
      const list = await listFeedAirports(s);
      if (list) feeds[s] = list;
    }
    const base = computeAirportCoverage(feeds);
    const data: AirportCoverage = {
      ...base,
      fetchedAt: new Date().toISOString(),
      worldScheduledCommercial: 4072, // ATAG 2023
      error: Object.values(feeds).length === 0 ? "All feed enumerations failed — check AERODATABOX_API_KEY" : null,
    };
    coverageCache = { at: Date.now(), data };
    return data;
  } catch (err: any) {
    console.error("[adb-collector] getAirportCoverage error:", err?.message || err);
    return null;
  }
}
