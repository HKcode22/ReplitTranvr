// ============================================================
// V3.9 two-stage anchor probe (plan §9, §17 step 12; DD-M §23).
// The anchor pool KLAX·EGLL·WSSS·SBGR·OMDB is PROVISIONAL until a
// standardized measurement proves it. This script runs the probe:
//
//   Stage 1 — shortlist across regions, ONE 2h live probe each at a
//             matched time-class/weekday-class, recording per airport:
//               unique_flights_per_credit, tail_chain_links_per_credit,
//               stability, station capacity (rows/h).
//             WSSS and OMAA are re-probed the same way as calibration
//             baselines (§9). Probes never cross in real time (sequential).
//   Stage 2 — top ~5-6 by stage-1 yield get a longer confirmation probe.
//   Score   — fill the FROZEN formulas (§9 step 4-5):
//               yield_score   = 1/3 std(uf/credit) + 1/3 std(chain/credit)
//                               + 1/3 std(stability)   (vs WSSS baseline)
//               anchor_score  = 40% exogenous traffic + 20% geo diversity
//                             + 20% carrier/intl diversity
//                             + 20% standardized observed yield
//             Station/API capacity is a separate PASS/FAIL feasibility GATE,
//             NOT a yield component (capacity never trades off vs science).
//
// FROZEN PRE-PROBE: the formulas above and the exogenous reference table
// below are decided in code BEFORE any probe runs; observed data never
// re-weights the formula (only fills it in, §9 step 4).
//
// BUDGET: all probe spend is hard-capped inside the 1,900/day budget. The
// script refuses to start a probe if balance < reserve or the daily cap
// would be exceeded.
//
// Requires the LIVE server (webhook ingress reachable at defaultWebhookUrl)
// + AERODATABOX_API_KEY + DATABASE_URL. Same operational contract as the
// canary.
//
//   npm run anchor-probe -- --stage 1 [--icao KLAX] [--hours 2]
//   npm run anchor-probe -- --stage 2 [--hours 4]
//   npm run anchor-probe -- --score
//   npm run anchor-probe -- --status
//   npm run anchor-probe -- --cleanup            delete orphaned probe subs (R1)
//   npm run anchor-probe -- --cleanup --force    also delete untracked ACTIVE credit subs
//   npm run anchor-probe -- --check-webhook      print webhook URL + reachability probe
// ============================================================

import { pool } from "../server/db";
import {
  getBalance,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  defaultWebhookUrl,
  checkAirportFeeds,
} from "../server/lib/disruption/aerodataboxLimiter_v3";
import { creditsUsedTodayUtc } from "../server/lib/disruption/adbCollectionController_v3";

// ---------------------------------------------------------------------------
// FROZEN PARAMETERS (decided pre-probe, §9) — do not tune on outcomes.
// ---------------------------------------------------------------------------

/** Stage-1 probe window hours (2 h standardized, §9 step 4). */
const STAGE1_HOURS = Number(process.env.ADB_PROBE_STAGE1_HOURS || 2);
/** Stage-2 confirmation probe window hours. */
const STAGE2_HOURS = Number(process.env.ADB_PROBE_STAGE2_HOURS || 4);
/** Feasibility gate: minimum measured station capacity (rows/h) to be eligible. */
const CAPACITY_GATE_ROWS_PER_HOUR = Number(process.env.ADB_PROBE_CAPACITY_GATE || 60);
/** Probe spend cap per UTC day (inside the 1,900/day collection budget, §9). */
const PROBE_DAILY_CAP = Number(process.env.ADB_PROBE_DAILY_CAP || 500);

// Frozen anchor-score weights (§9 step 5, our documented R&D choice):
const W_EXOGENOUS = 0.4;
const W_GEO = 0.2;
const W_CARRIER = 0.2;
const W_YIELD = 0.2;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Clamp to [0,1]. */
function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

// ---------------------------------------------------------------------------
// FROZEN SHORTLIST + EXOGENOUS REFERENCE (plan §9 step 2, DD-M §23a).
// Published reference values (~OAG/ACI 2023-24, rounded) — frozen pre-probe.
// Our own collection NEVER feeds the exogenous components (no feedback loop).
// ---------------------------------------------------------------------------

interface Candidate {
  icao: string;
  region: string;
  /** published scheduled commercial flights / year (exogenous) */
  exogFlightsPerYear: number;
  /** published route-network / destination diversity index 0-1 (exogenous) */
  exogGeo: number;
  /** published international + carrier-mix diversity index 0-1 (exogenous) */
  exogCarrier: number;
  isCalibration?: boolean;
}

const SHORTLIST: readonly Candidate[] = [
  // North America
  { icao: "KLAX", region: "North America", exogFlightsPerYear: 540_000, exogGeo: 0.9, exogCarrier: 0.8 },
  { icao: "KORD", region: "North America", exogFlightsPerYear: 600_000, exogGeo: 0.85, exogCarrier: 0.7 },
  // Europe
  { icao: "EGLL", region: "Europe", exogFlightsPerYear: 475_000, exogGeo: 0.95, exogCarrier: 0.95 },
  { icao: "EDDF", region: "Europe", exogFlightsPerYear: 458_000, exogGeo: 0.9, exogCarrier: 0.85 },
  { icao: "LFPG", region: "Europe", exogFlightsPerYear: 420_000, exogGeo: 0.9, exogCarrier: 0.85 },
  // Asia-Pacific
  { icao: "WSSS", region: "Asia-Pacific", exogFlightsPerYear: 330_000, exogGeo: 0.9, exogCarrier: 0.9, isCalibration: true },
  { icao: "VHHH", region: "Asia-Pacific", exogFlightsPerYear: 230_000, exogGeo: 0.85, exogCarrier: 0.8 },
  { icao: "RJTT", region: "Asia-Pacific", exogFlightsPerYear: 330_000, exogGeo: 0.8, exogCarrier: 0.7 },
  // Gulf / Africa
  { icao: "OMDB", region: "Gulf/Africa", exogFlightsPerYear: 230_000, exogGeo: 0.8, exogCarrier: 0.9 },
  { icao: "OMAA", region: "Gulf/Africa", exogFlightsPerYear: 110_000, exogGeo: 0.7, exogCarrier: 0.7, isCalibration: true },
  // South America
  { icao: "SBGR", region: "South America", exogFlightsPerYear: 250_000, exogGeo: 0.7, exogCarrier: 0.6 },
  // Oceania
  { icao: "YSSY", region: "Oceania", exogFlightsPerYear: 240_000, exogGeo: 0.75, exogCarrier: 0.7 },
];

// Frozen normalization: exogenous traffic standardized by the shortlist max.
const MAX_EXOG_FLAIGHTS = Math.max(...SHORTLIST.map((c) => c.exogFlightsPerYear));

function candidateByIcao(icao: string): Candidate | undefined {
  return SHORTLIST.find((c) => c.icao.toUpperCase() === icao.toUpperCase());
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

interface ProbeRow {
  probe_id: number;
  stage: number;
  icao: string;
  region: string;
  window_start: Date;
  window_end: Date;
  window_hours: number;
  subscription_id: string | null;
  balance_before: number | null;
  balance_after: number | null;
  credits_spent: number | null;
  rows_delivered: number | null;
  unique_flights: number | null;
  tail_chain_links: number | null;
  rows_per_hour: number | null;
  unique_flights_per_credit: number | null;
  tail_chain_links_per_credit: number | null;
  stability: number | null;
  status: string;
}

async function hasStageProbe(icao: string, stage: number): Promise<boolean> {
  const res = await pool.query(
    "SELECT 1 FROM clean.adb_anchor_probe WHERE icao = $1 AND stage = $2 AND status = 'completed' LIMIT 1",
    [icao.toUpperCase(), stage],
  );
  return (res.rowCount ?? 0) > 0;
}

async function readProbes(): Promise<ProbeRow[]> {
  const res = await pool.query("SELECT * FROM clean.adb_anchor_probe ORDER BY icao, stage, window_start");
  return res.rows.map((r) => ({
    probe_id: Number(r.probe_id),
    stage: Number(r.stage),
    icao: String(r.icao),
    region: String(r.region),
    window_start: new Date(r.window_start),
    window_end: new Date(r.window_end),
    window_hours: Number(r.window_hours),
    subscription_id: r.subscription_id as string | null,
    balance_before: r.balance_before === null ? null : Number(r.balance_before),
    balance_after: r.balance_after === null ? null : Number(r.balance_after),
    credits_spent: r.credits_spent === null ? null : Number(r.credits_spent),
    rows_delivered: r.rows_delivered === null ? null : Number(r.rows_delivered),
    unique_flights: r.unique_flights === null ? null : Number(r.unique_flights),
    tail_chain_links: r.tail_chain_links === null ? null : Number(r.tail_chain_links),
    rows_per_hour: r.rows_per_hour === null ? null : Number(r.rows_per_hour),
    unique_flights_per_credit: r.unique_flights_per_credit === null ? null : Number(r.unique_flights_per_credit),
    tail_chain_links_per_credit: r.tail_chain_links_per_credit === null ? null : Number(r.tail_chain_links_per_credit),
    stability: r.stability === null ? null : Number(r.stability),
    status: String(r.status),
  }));
}

// ---------------------------------------------------------------------------
// Budget guards
// ---------------------------------------------------------------------------

async function checkBudget(): Promise<{ ok: boolean; reason?: string }> {
  const bal = await getBalance();
  if (!bal) return { ok: false, reason: "no balance (AERODATABOX_API_KEY set?)" };
  const reserve = Number(process.env.ADB_PROBE_RESERVE || 1000);
  if (bal.creditsRemaining < reserve) {
    return { ok: false, reason: `balance ${bal.creditsRemaining} < reserve ${reserve}` };
  }
  const usedToday = await creditsUsedTodayUtc();
  if (usedToday + PROBE_DAILY_CAP > Number(process.env.ADB_DAILY_CREDIT_CAP || 1900)) {
    return { ok: false, reason: `probe budget would push daily spend past the cap (today ${usedToday})` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// R1 exclusivity (plan §11.2 step 1, §15 R1) — before ANY probe subscription
// is created, the account must have no foreign ACTIVE billable subscription.
// An orphaned probe sub left over from an interrupted run is exactly such a
// foreign billable sub and would break balance-delta accounting. Lifetime-based
// subscriptions cannot bill per delivery → not contamination.
// ---------------------------------------------------------------------------

async function foreignActiveBillable(): Promise<
  { id: string; subject?: string; billingType?: string }[]
> {
  const subs = await listSubscriptions();
  return subs
    .filter((s) => s.isActive && s.billingType !== "LifetimeBased")
    .map((s) => ({
      id: s.id,
      subject: s.subject?.type ? `${s.subject.type}:${s.subject.id ?? "?"}` : "?",
      billingType: s.billingType,
    }));
}

async function assertExclusivity(): Promise<{ ok: boolean; reason?: string }> {
  const foreign = await foreignActiveBillable();
  if (foreign.length > 0) {
    return {
      ok: false,
      reason:
        `${foreign.length} foreign ACTIVE billable subscription(s) present: ` +
        foreign.map((f) => `${f.id} (${f.subject})`).join(", ") +
        `. Run: npm run anchor-probe -- --cleanup  (R1 exclusivity, §11.2/§15).`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The probe itself (one airport, one window)
// ---------------------------------------------------------------------------

async function runSingleProbe(candidate: Candidate, stage: number, hours: number): Promise<void> {
  const icao = candidate.icao;
  console.log(`\n=== PROBE ${icao} (stage ${stage}, ${hours}h window, ${candidate.region}) ===`);

  if (await hasStageProbe(icao, stage)) {
    console.log(`  already probed (stage ${stage}) — skipping.`);
    return;
  }

  const budget = await checkBudget();
  if (!budget.ok) {
    console.log(`  SKIPPED — ${budget.reason}`);
    return;
  }

  // R1 exclusivity: no foreign ACTIVE billable subscription may exist while we
  // probe (plan §11.2/§15). Also catches orphaned subs from interrupted runs.
  const exclusivity = await assertExclusivity();
  if (!exclusivity.ok) {
    console.log(`  SKIPPED — ${exclusivity.reason}`);
    return;
  }

  // Free feed check (plan §9 step 3): confirm the airport is in the feeds.
  const feeds = await checkAirportFeeds(icao);
  console.log(`  feed membership check: ${feeds ? "covered" : "no feed data returned (may still work, proceeding)"}`);

  const balBefore = await getBalance();
  const balanceBefore = balBefore?.creditsRemaining ?? null;
  console.log(`  balance_before: ${balanceBefore}`);

  const sub = await createSubscription("FlightByAirportIcao", icao, { maxDeliveryRetries: 0 });
  if (!sub?.id) {
    console.log(`  FAILED — could not subscribe to ${icao}.`);
    return;
  }
  console.log(`  subscription: ${sub.id}  isActive=${sub.isActive ?? "?"}  activateBeforeUtc=${sub.activateBeforeUtc ?? "n/a"}`);
  const windowStart = new Date();

  // Mark this probe 'probing' NOW so an interrupted run leaves a visible,
  // cleanable record (status 'probing' → --cleanup deletes the sub and marks it
  // 'abandoned'). The UNIQUE(icao, stage, window_start) row is the same row the
  // final INSERT flips to 'completed'.
  await pool.query(
    `INSERT INTO clean.adb_anchor_probe
       (stage, icao, region, window_start, window_end, window_hours,
        subscription_id, balance_before, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'probing')
     ON CONFLICT (icao, stage, window_start) DO NOTHING`,
    [stage, icao, candidate.region, windowStart, windowStart, 0, sub.id, balanceBefore],
  );

  console.log(`  probing ${hours}h — deliveries must reach the live webhook...`);

  // Poll every 60s so the process stays responsive; hard-stop at window end.
  const windowMs = hours * 3600 * 1000;
  const deadline = Date.now() + windowMs;
  while (Date.now() < deadline) {
    await sleep(Math.min(60_000, Math.max(1000, deadline - Date.now())));
  }
  const windowEnd = new Date();

  const delOk = await deleteSubscription(sub.id);
  console.log(`  subscription deleted: ${delOk ? "yes" : "NO (clean up manually)"}`);
  await sleep(10_000); // settle in-flight deliveries

  const balAfter = await getBalance();
  const balanceAfter = balAfter?.creditsRemaining ?? null;
  const creditsSpent =
    balanceBefore !== null && balanceAfter !== null ? Math.max(0, balanceBefore - balanceAfter) : null;
  console.log(`  balance_after: ${balanceAfter}  credits_spent: ${creditsSpent}`);

  // Count what was delivered for THIS subscription within the window.
  const countRes = await pool.query(
    `SELECT count(*)::int AS rows,
            count(DISTINCT flight_number)::int AS unique_flights,
            count(DISTINCT aircraft_reg)::int AS aircraft
       FROM clean.flight_data_pre_post
      WHERE subscription_id = $1 AND received_at BETWEEN $2 AND $3`,
    [sub.id, windowStart, windowEnd],
  );
  const c = countRes.rows[0] ?? { rows: 0, unique_flights: 0, aircraft: 0 };
  const rowsDelivered = Number(c.rows) ?? 0;
  const uniqueFlights = Number(c.unique_flights) ?? 0;

  // Tail-chain links: for each aircraft reg with n flights in the window,
  // n-1 rotation links connect them (the aircraft-rotation chain).
  const chainRes = await pool.query(
    `SELECT COALESCE(sum(links), 0)::int AS links FROM (
       SELECT count(*) - 1 AS links
         FROM (SELECT DISTINCT flight_number, aircraft_reg
                 FROM clean.flight_data_pre_post
                WHERE subscription_id = $1 AND received_at BETWEEN $2 AND $3
                  AND aircraft_reg IS NOT NULL) f
        GROUP BY aircraft_reg
     ) s`,
    [sub.id, windowStart, windowEnd],
  );
  const tailChainLinks = Number(chainRes.rows[0]?.links ?? 0);

  // Stability: 1/(1+CV) of per-15-min bucket row counts within the window.
  const bucketsRes = await pool.query(
    `SELECT (extract(epoch FROM received_at)::int / 900) AS bucket, count(*)::int AS n
       FROM clean.flight_data_pre_post
      WHERE subscription_id = $1 AND received_at BETWEEN $2 AND $3
      GROUP BY bucket ORDER BY bucket`,
    [sub.id, windowStart, windowEnd],
  );
  const counts = bucketsRes.rows.map((r: any) => Number(r.n));
  let stability: number | null = null;
  if (counts.length > 1) {
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    stability = clamp01(1 / (1 + cv));
  }

  const windowHours = (windowEnd.getTime() - windowStart.getTime()) / 3600_000;
  const rowsPerHour = windowHours > 0 ? rowsDelivered / windowHours : 0;
  const ufPerCredit = creditsSpent && creditsSpent > 0 ? uniqueFlights / creditsSpent : null;
  const chainPerCredit = creditsSpent && creditsSpent > 0 ? tailChainLinks / creditsSpent : null;

  console.log(`  rows_delivered: ${rowsDelivered}  unique_flights: ${uniqueFlights}  chain_links: ${tailChainLinks}`);
  console.log(`  rows_per_hour: ${rowsPerHour.toFixed(1)}  uf/credit: ${ufPerCredit?.toFixed(4) ?? "n/a"}  chain/credit: ${chainPerCredit?.toFixed(4) ?? "n/a"}  stability: ${stability?.toFixed(3) ?? "n/a"}`);

  await pool.query(
    `INSERT INTO clean.adb_anchor_probe
       (stage, icao, region, window_start, window_end, window_hours,
        subscription_id, balance_before, balance_after, credits_spent,
        rows_delivered, unique_flights, tail_chain_links,
        rows_per_hour, unique_flights_per_credit, tail_chain_links_per_credit,
        stability, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'completed')
     ON CONFLICT (icao, stage, window_start) DO UPDATE SET
       window_end = EXCLUDED.window_end,
       window_hours = EXCLUDED.window_hours,
       balance_after = EXCLUDED.balance_after,
       credits_spent = EXCLUDED.credits_spent,
       rows_delivered = EXCLUDED.rows_delivered,
       unique_flights = EXCLUDED.unique_flights,
       tail_chain_links = EXCLUDED.tail_chain_links,
       rows_per_hour = EXCLUDED.rows_per_hour,
       unique_flights_per_credit = EXCLUDED.unique_flights_per_credit,
       tail_chain_links_per_credit = EXCLUDED.tail_chain_links_per_credit,
       stability = EXCLUDED.stability,
       status = 'completed'`,
    [
      stage,
      icao,
      candidate.region,
      windowStart,
      windowEnd,
      windowHours,
      sub.id,
      balanceBefore,
      balanceAfter,
      creditsSpent,
      rowsDelivered,
      uniqueFlights,
      tailChainLinks,
      rowsPerHour,
      ufPerCredit,
      chainPerCredit,
      stability,
    ],
  );
  console.log(`  recorded in clean.adb_anchor_probe.`);
}

// ---------------------------------------------------------------------------
// Scoring (fills the frozen formulas with measured numbers)
// ---------------------------------------------------------------------------

interface Scored {
  icao: string;
  region: string;
  yieldScore: number | null;
  capacityPass: boolean;
  capacityRowsPerHour: number | null;
  anchorScore: number | null;
  stage2?: boolean;
}

function stageAggregate(probes: ProbeRow[], icao: string): ProbeRow[] {
  // Best stage-1 probe per airport (most rows = most representative window).
  return probes.filter((p) => p.icao === icao && p.stage === 1 && p.status === "completed");
}

function computeScores(probes: ProbeRow[]): Scored[] {
  const completed = probes.filter((p) => p.status === "completed");
  const byIcao = new Map<string, ProbeRow>();
  for (const p of completed) {
    if (p.stage !== 1) continue;
    const cur = byIcao.get(p.icao);
    if (!cur || (p.rows_delivered ?? 0) > (cur.rows_delivered ?? 0)) byIcao.set(p.icao, p);
  }
  const stage1Rows = [...byIcao.values()];

  // Calibration baseline = WSSS measured the same way (§9). Fall back to OMAA.
  const wsss = stage1Rows.find((p) => p.icao === "WSSS");
  const baseline = wsss ?? stage1Rows.find((p) => p.icao === "OMAA");
  const hasBaseline = baseline !== undefined;

  const scored: Scored[] = [];
  for (const cand of SHORTLIST) {
    const probe = byIcao.get(cand.icao);
    if (!probe) continue;
    const rowsPerHour = probe.rows_per_hour ?? 0;
    const capacityPass = rowsPerHour >= CAPACITY_GATE_ROWS_PER_HOUR;

    let yieldScore: number | null = null;
    if (hasBaseline && baseline) {
      const refUf = baseline.unique_flights_per_credit;
      const refChain = baseline.tail_chain_links_per_credit;
      const refStab = baseline.stability;
      if (refUf && refChain && refStab !== null && refStab > 0) {
        const ufStd = probe.unique_flights_per_credit !== null ? clamp01(probe.unique_flights_per_credit / refUf) : 0;
        const chainStd = probe.tail_chain_links_per_credit !== null ? clamp01(probe.tail_chain_links_per_credit / refChain) : 0;
        const stabStd = probe.stability !== null ? clamp01(probe.stability / refStab) : 0;
        yieldScore = (ufStd + chainStd + stabStd) / 3;
      }
    }

    const exogTraffic = clamp01(cand.exogFlightsPerYear / MAX_EXOG_FLAIGHTS);
    const anchorScore =
      yieldScore !== null
        ? W_EXOGENOUS * exogTraffic + W_GEO * cand.exogGeo + W_CARRIER * cand.exogCarrier + W_YIELD * yieldScore
        : null;

    const stage2 = probes.some((p) => p.icao === cand.icao && p.stage === 2 && p.status === "completed");

    scored.push({
      icao: cand.icao,
      region: cand.region,
      yieldScore,
      capacityPass,
      capacityRowsPerHour: rowsPerHour,
      anchorScore,
      stage2,
    });
  }
  return scored;
}

// ---------------------------------------------------------------------------
// CLI modes
// ---------------------------------------------------------------------------

/**
 * --cleanup  (plan §11.2 step 1, §15 R1)
 * Deletes probe-owned ORPHAN subscriptions (rows still status='probing' from an
 * interrupted run) and marks them 'abandoned'. With --force, also deletes any
 * other ACTIVE credit-based subscription on the account (only safe pre-run,
 * when autoCollect=false means nothing legitimate is running).
 */
async function runCleanup(force: boolean): Promise<void> {
  console.log("R1 orphan cleanup — searching for probe subscriptions left 'probing'...");

  const probing = await pool.query(
    `SELECT probe_id, icao, stage, subscription_id, window_start
       FROM clean.adb_anchor_probe
      WHERE status = 'probing' ORDER BY window_start`,
  );

  let deleted = 0;
  for (const row of probing.rows) {
    const subId = row.subscription_id as string | null;
    if (!subId) {
      await pool.query(`UPDATE clean.adb_anchor_probe SET status='abandoned' WHERE probe_id=$1`, [row.probe_id]);
      continue;
    }
    const ok = await deleteSubscription(subId);
    console.log(`  ${ok ? "deleted  " : "DELETE FAILED "} sub ${subId} (${row.icao} stage ${row.stage})`);
    if (ok) deleted++;
    await pool.query(
      `UPDATE clean.adb_anchor_probe SET status='abandoned', window_end=now() WHERE probe_id=$1`,
      [row.probe_id],
    );
  }
  console.log(`  probe-owned orphan subs deleted: ${deleted} of ${probing.rows.length}`);

  const foreign = await foreignActiveBillable();
  const untracked = foreign.filter((f) => !probing.rows.some((r: any) => r.subscription_id === f.id));
  if (untracked.length > 0) {
    if (force) {
      let n = 0;
      for (const f of untracked) {
        const ok = await deleteSubscription(f.id);
        console.log(`  ${ok ? "deleted  " : "DELETE FAILED "} untracked ACTIVE credit sub ${f.id} (${f.subject})`);
        if (ok) n++;
      }
      console.log(`  untracked ACTIVE credit subs deleted: ${n} of ${untracked.length}`);
    } else {
      console.log(
        `  ${untracked.length} untracked ACTIVE credit sub(s) NOT touched: ` +
          untracked.map((f) => `${f.id} (${f.subject})`).join(", ") +
          `. Re-run with --force to delete them too.`,
      );
    }
  } else {
    console.log("  no other ACTIVE credit-based subscriptions on the account.");
  }
  console.log("cleanup done.");
}

/** --check-webhook — prints the URL AeroDataBox posts to and probes reachability. */
async function runCheckWebhook(): Promise<void> {
  const url = defaultWebhookUrl();
  console.log("Webhook reachability check (Gate 3/0.5 pre-requisite):\n");
  console.log(`  defaultWebhookUrl() : ${url}`);
  console.log(
    `  REPLIT_DOMAINS       : ${process.env.REPLIT_DOMAINS ? "set" : "NOT set"}  ` +
      `(WEBHOOK_BASE_URL override: ${process.env.WEBHOOK_BASE_URL ? "set" : "no"})`,
  );
  console.log(
    `  AERODATABOX_WEBHOOK_SECRET : ${process.env.AERODATABOX_WEBHOOK_SECRET ? "set (path-suffix active)" : "not set"}`,
  );
  console.log(
    `  live server running  : check a boot line 'serving on port 5000' — the webhook route ` +
      `POST /api/v1/webhooks/aerodatabox(:secret) must be up for deliveries.`,
  );
  console.log("\n  probing URL from the Replit box (GET — the route expects POST, so any");
  console.log("  HTTP status like 404/405 still PROVES the URL is reachable; a network");
  console.log("  error means AeroDataBox cannot reach us either):");
  try {
    const resp = await fetch(url, { method: "GET" });
    console.log(`  → HTTP ${resp.status} — ${resp.ok ? "OK" : "reachable (non-2xx is fine for a POST-only route)"}`);
  } catch (err: any) {
    console.log(`  → NETWORK ERROR: ${err?.message || err} — the URL is NOT reachable.`);
    console.log(`    Fix REPLIT_DOMAINS / WEBHOOK_BASE_URL to a public HTTPS URL first.`);
  }
  console.log(
    "\nNote: the 2026-08-18 rl8 probe created subscriptions but zero deliveries arrived",
    "(balance stayed 2901, rowsToday=0 for hours). Verify this URL is publicly reachable",
    "before re-running stage 1, otherwise probes are wasted windows.",
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const stage1 = args.includes("--stage") && args[args.indexOf("--stage") + 1] === "1";
  const stage2 = args.includes("--stage") && args[args.indexOf("--stage") + 1] === "2";
  const doScore = args.includes("--score");
  const doStatus = args.includes("--status");
  const doCleanup = args.includes("--cleanup");
  const doCheckWebhook = args.includes("--check-webhook");
  const force = args.includes("--force");
  const icaoIdx = args.indexOf("--icao");
  const onlyIcao = icaoIdx >= 0 && args[icaoIdx + 1] ? args[icaoIdx + 1].toUpperCase() : null;
  const hoursIdx = args.indexOf("--hours");
  const hoursOverride = hoursIdx >= 0 && args[hoursIdx + 1] ? Number(args[hoursIdx + 1]) : null;

  console.log("V3.9 two-stage anchor probe (§9, §17 step 12) — pool is provisional until measured.\n");

  if (doCheckWebhook) {
    await runCheckWebhook();
    return;
  }

  if (doCleanup) {
    await runCleanup(force);
    return;
  }

  if (doStatus || (!stage1 && !stage2 && !doScore)) {
    const probes = await readProbes();
    if (probes.length === 0) {
      console.log("No probes recorded yet. Run: npm run anchor-probe -- --stage 1");
    } else {
      console.log("Recorded probes:");
      for (const p of probes) {
        console.log(
          `  stage ${p.stage}  ${p.icao.padEnd(6)} rows/h=${(p.rows_per_hour ?? 0).toFixed(1).padStart(6)}  ` +
            `uf/credit=${(p.unique_flights_per_credit ?? 0).toFixed(3).padStart(6)}  ` +
            `chain/credit=${(p.tail_chain_links_per_credit ?? 0).toFixed(3).padStart(6)}  ` +
            `stability=${(p.stability ?? 0).toFixed(3)}  ${p.status}`,
        );
      }
      if (!doStatus && !stage1 && !stage2) return;
    }
  }

  if (doScore) {
    const probes = await readProbes();
    const scored = computeScores(probes);
    console.log("\n--- FROZEN anchor score (§9) — filled with measured data ---");
    const baseline = scored.find((s) => s.icao === "WSSS") ?? scored.find((s) => s.icao === "OMAA");
    if (!baseline) {
      console.log("No calibration baseline probed yet (WSSS/OMAA). Run stage 1 first.");
    }
    for (const s of scored.sort((a, b) => (b.anchorScore ?? 0) - (a.anchorScore ?? 0))) {
      const gate = s.capacityPass ? "capacity PASS" : `capacity FAIL (${(s.capacityRowsPerHour ?? 0).toFixed(0)} rows/h < ${CAPACITY_GATE_ROWS_PER_HOUR})`;
      console.log(
        `  ${s.icao.padEnd(6)} ${s.region.padEnd(14)} anchor=${(s.anchorScore ?? 0).toFixed(3)}  ` +
          `yield=${(s.yieldScore ?? 0).toFixed(3)}  ${gate}  ${s.stage2 ? "stage2✓" : ""}`,
      );
    }
    const eligible = scored.filter((s) => s.anchorScore !== null && s.capacityPass).sort((a, b) => (b.anchorScore ?? 0) - (a.anchorScore ?? 0));
    console.log("\nProposed lock (top 5 capacity-passing, cross-region):");
    const locked = eligible.slice(0, 5);
    if (locked.length < 5) {
      console.log("  (fewer than 5 eligible yet — run more stage-1 probes / stage 2)");
    }
    locked.forEach((s, i) => console.log(`  ${i + 1}. ${s.icao} (${s.region}) — ${(s.anchorScore ?? 0).toFixed(3)}`));
    return;
  }

  if (stage1 || stage2) {
    const stage = stage1 ? 1 : 2;
    const hours = hoursOverride ?? (stage === 1 ? STAGE1_HOURS : STAGE2_HOURS);

    if (onlyIcao) {
      const cand = candidateByIcao(onlyIcao);
      if (!cand) {
        console.error(`Unknown shortlist ICAO ${onlyIcao}. Shortlist: ${SHORTLIST.map((c) => c.icao).join(", ")}`);
        return;
      }
      if (stage === 2 && !(await hasStageProbe(cand.icao, 1))) {
        console.error(
          `Stage 2 guard: ${cand.icao} has no COMPLETED stage-1 probe yet — run ` +
            `npm run anchor-probe -- --stage 1 --icao ${cand.icao} first (§9: stage 2 confirms stage-1 picks).`,
        );
        return;
      }
      await runSingleProbe(cand, stage, hours);
      return;
    }

    if (stage === 2) {
      const eligibleForStage2: Candidate[] = [];
      for (const cand of SHORTLIST) {
        if (await hasStageProbe(cand.icao, 1)) eligibleForStage2.push(cand);
      }
      if (eligibleForStage2.length === 0) {
        console.error(
          `Stage 2 guard: no candidate has a COMPLETED stage-1 probe yet. ` +
            `Run stage 1 first (npm run anchor-probe -- --stage 1), then re-run stage 2.`,
        );
        return;
      }
      if (eligibleForStage2.length < SHORTLIST.length) {
        console.log(`  stage-2 candidates (have completed stage-1): ${eligibleForStage2.map((c) => c.icao).join(", ")}`);
      }
      for (const cand of eligibleForStage2) {
        if (await hasStageProbe(cand.icao, 2)) {
          console.log(`  ${cand.icao}: stage 2 already probed — skip`);
          continue;
        }
        await runSingleProbe(cand, stage, hours);
      }
      console.log("\nStage 2 complete. Next: npm run anchor-probe -- --score");
      return;
    }

    const budget = await checkBudget();
    if (!budget.ok) {
      console.error(`Refusing to probe: ${budget.reason}`);
      return;
    }
    for (const cand of SHORTLIST) {
      if (await hasStageProbe(cand.icao, stage)) {
        console.log(`  ${cand.icao}: stage ${stage} already probed — skip`);
        continue;
      }
      await runSingleProbe(cand, stage, hours);
    }
    console.log("\nStage 1 complete. Next: npm run anchor-probe -- --stage 2 (or --score).");
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err: any) => {
    console.error("anchor probe failed:", err?.message || err);
    await pool.end();
    process.exit(1);
  });
