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
  checkAirportFeeds,
  listFeedAirports,
  type FeedService,
  type SubscriptionSubjectType,
} from "./aerodataboxLimiter_v3";
import {
  AIRPORT_CATALOG,
  AIRPORT_TIERS,
  tierForIcao,
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
  const fallback: Record<AirportTier, number> = { HUB: 1, MID: 2, REGIONAL: 2 };
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

export const COLLECTOR_CONFIG = {
  windowHours: envInt("ADB_WINDOW_HOURS", 4),
  batchBudget: envInt("ADB_BATCH_BUDGET", 4000),
  reserveCredits: envInt("ADB_RESERVE_CREDITS", 5000),
  tierMix: envTierMix(),
  /** airports to remember so consecutive batches don't repeat the same ones */
  rememberRecentBatches: 2,
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
 * Pick the next batch's airports: one seeded shuffle per tier, rotating so
 * recent batches don't repeat airports, interleaving tiers every window.
 */
async function pickAirports(seq: number, seed: number): Promise<Record<AirportTier, string[]>> {
  const recentRaw = await readMeta("recent_batches");
  const recent: string[][] = recentRaw ? JSON.parse(recentRaw) : [];
  const recentlyUsed = new Set<string>(recent.flat());

  const chosen = {} as Record<AirportTier, string[]>;
  for (const tier of AIRPORT_TIERS) {
    const slots = COLLECTOR_CONFIG.tierMix[tier] ?? 0;
    if (slots <= 0) continue;
    const poolList = seededShuffle(AIRPORT_CATALOG[tier], seed);
    const fresh = poolList.filter((a) => !recentlyUsed.has(a));
    const source = fresh.length >= slots ? fresh : poolList;
    chosen[tier] = source.slice(0, slots);
  }

  // Remember the last N batches so the next one rotates to fresh airports.
  const batchAirports = Object.values(chosen).flat();
  const nextRecent = [...recent, batchAirports].slice(-COLLECTOR_CONFIG.rememberRecentBatches);
  await writeMeta("recent_batches", JSON.stringify(nextRecent));
  return chosen;
}

export interface StartBatchResult {
  batch: CollectionBatch;
  created: CreatedSub[];
  skipped: SkippedAirport[];
}

export async function startBatch(): Promise<StartBatchResult> {
  const active = await getActiveBatch();
  if (active) {
    throw new Error(`Batch ${active.batchId} is still active — stop it first (POST /api/v1/subscriptions/collection/stop).`);
  }

  const balance = await getBalance();
  if (!balance) {
    throw new Error("No alert-credit balance yet — refill first (POST /api/v1/subscriptions/balance/refill).");
  }
  const needed = COLLECTOR_CONFIG.batchBudget + COLLECTOR_CONFIG.reserveCredits;
  if (balance.creditsRemaining < needed) {
    throw new Error(
      `Credits too low for a batch: ${balance.creditsRemaining} remaining, need ${needed} (budget ${COLLECTOR_CONFIG.batchBudget} + reserve ${COLLECTOR_CONFIG.reserveCredits}). Refill first.`,
    );
  }

  const seqRaw = await readMeta("batch_seq");
  const seq = (seqRaw ? parseInt(seqRaw, 10) : 0) + 1;
  const seed = randomInt(1, 2 ** 31 - 1);
  const batchId = `B${String(seq).padStart(4, "0")}`;

  const chosen = await pickAirports(seq, seed);
  const airports = Object.values(chosen).flat();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + COLLECTOR_CONFIG.windowHours * 3600_000);
  const tierMix = { ...COLLECTOR_CONFIG.tierMix };

  const created: CreatedSub[] = [];
  const skipped: SkippedAirport[] = [];

  for (const icao of airports) {
    const tier = tierForIcao(icao);
    try {
      const feed = await checkAirportFeeds(icao);
      if (!feed) {
        skipped.push({ icao, reason: "no_coverage" });
        continue;
      }
    } catch {
      skipped.push({ icao, reason: "no_coverage" });
      continue;
    }

    const sub = await createSubscription("FlightByAirportIcao" as SubscriptionSubjectType, icao, {
      maxDeliveryRetries: 2,
    });
    if (!sub?.id) {
      skipped.push({ icao, reason: "create_failed" });
      continue;
    }
    created.push({ icao, tier, subscriptionId: sub.id });
  }

  await pool.query(
    `INSERT INTO clean.adb_collection_batches
       (batch_id, batch_seq, random_seed, status, window_start, window_end,
        credit_budget, tier_mix, airports)
     VALUES ($1, $2, $3, 'ACTIVE', $4, $5, $6, $7::jsonb, $8::text[])`,
    [batchId, seq, seed, now, windowEnd, COLLECTOR_CONFIG.batchBudget, JSON.stringify(tierMix), airports],
  );

  for (const c of created) {
    const tierKey = (c.tier ?? "") as AirportTier;
    const slots = tierKey ? tierMix[tierKey] ?? 0 : 0;
    const catalogLen = c.tier ? AIRPORT_CATALOG[c.tier].length : 1;
    // Selection probability for an airport of this tier in this batch.
    // Within a selected airport it's a census (all flights), so the flight's
    // selection probability == the airport's selection probability.
    const p = slots > 0 && catalogLen > 0 ? Math.min(1, slots / catalogLen) : 1;
    await pool.query(
      `INSERT INTO clean.adb_collection_subs
         (subscription_id, batch_id, icao, tier, sampling_probability, sampling_weight)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [c.subscriptionId, batchId, c.icao, c.tier, p, p > 0 ? 1 / p : 1],
    );
  }

  await writeMeta("batch_seq", String(seq));

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

  await pool.query(
    "UPDATE clean.adb_collection_batches SET status = 'CLOSED', ended_at = now(), stop_reason = $1 WHERE batch_id = $2",
    [reason, active.batchId],
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

/** Approximate credits used by a batch = rows stored (1 flight item ≈ 1 credit). */
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
  windowHours: number;
  tierMix: Record<string, number>;
  activeBatch: CollectionBatch | null;
  activeBatchCredits: number | null;
  canStart: boolean;
  reason: string | null;
}

export async function getCollectionStatus(): Promise<CollectionStatus> {
  const balance = await getBalance();
  const active = await getActiveBatch();
  const activeBatchCredits = active ? await estimateBatchCredits(active.batchId) : null;
  const remaining = balance?.creditsRemaining ?? 0;
  const needed = COLLECTOR_CONFIG.batchBudget + COLLECTOR_CONFIG.reserveCredits;
  const canStart = !active && remaining >= needed;
  return {
    balance: balance?.creditsRemaining ?? null,
    reserveCredits: COLLECTOR_CONFIG.reserveCredits,
    batchBudget: COLLECTOR_CONFIG.batchBudget,
    windowHours: COLLECTOR_CONFIG.windowHours,
    tierMix: COLLECTOR_CONFIG.tierMix,
    activeBatch: active,
    activeBatchCredits,
    canStart,
    reason: active
      ? "A batch is active — stop it first."
      : canStart
        ? null
        : balance === null
          ? "No balance yet — refill first."
          : `Insufficient credits (${remaining} < ${needed}).`,
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
  }>;
  totalEstimatedCredits: number;
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
      `SELECT b.batch_id, b.status, b.started_at, b.ended_at, b.credit_budget, b.airports
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

  return {
    totals,
    byTier,
    byDepartureHour,
    byDelayBucket,
    byStatus,
    batches,
    totalEstimatedCredits: creditsRes.rowCount ? creditsRes.rows[0].n : 0,
    coverage: coverageSummary,
  };
}

// ---------------------------------------------------------------------------
// Watchdog — auto-stop an active batch when its window elapses or its
// credit budget is reached. Reads the DB + calls free delete endpoints
// only; it can never spend credits on its own.
// ---------------------------------------------------------------------------

let watchdogStarted = false;

export function startCollectionWatchdog(): void {
  if (watchdogStarted) return;
  watchdogStarted = true;
  const timer = setInterval(async () => {
    try {
      const active = await getActiveBatch();
      if (!active) return;
      if (Date.now() > active.windowEnd.getTime()) {
        console.warn(`[adb-collector] window elapsed for ${active.batchId} — stopping`);
        await stopBatch("window_elapsed");
        return;
      }
      const used = await estimateBatchCredits(active.batchId);
      if (used >= active.creditBudget) {
        console.warn(`[adb-collector] ${active.batchId} reached budget (${used} ≥ ${active.creditBudget}) — stopping`);
        await stopBatch("budget_reached");
      }
    } catch (err: any) {
      console.warn("[adb-collector] watchdog error:", err?.message || err);
    }
  }, 60_000);
  timer.unref?.();
  console.log(
    `[adb-collector] watchdog started (window=${COLLECTOR_CONFIG.windowHours}h, budget=${COLLECTOR_CONFIG.batchBudget} credits/batch, reserve=${COLLECTOR_CONFIG.reserveCredits}, tierMix=${JSON.stringify(COLLECTOR_CONFIG.tierMix)})`,
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
