import { randomUUID } from "crypto";

// ============================================================
// v3 — AeroDataBox Flight Alert subscription manager.
// The ONLY module allowed to make outbound calls to
// aerodatabox.p.rapidapi.com for the Flight Alert API.
//
// Replaces polling with PUSH subscriptions (credit-based billing,
// transition ended 2026-04-04 — no ?useCredits=true needed).
//
// Costs:
//   - create / get / list / delete subscription  : FREE
//   - get balance                                : FREE
//   - refill balance                             : variable (1 API unit per credit)
//   - per notification delivered                 : 1 credit per flight item
//   - delivery retry (maxDeliveryRetries, 0-2)   : 1 credit per flight item
//
// All calls go through a serial queue (MIN_INTERVAL_MS) so RapidAPI
// never sees concurrent bursts (HTTP 429). To be safe against
// per-second limits (ULTRA), every call also RE-TRIES on 429 with
// exponential backoff (RATE_LIMIT_BACKOFF_MS × attempt) so a burst of
// batch creates doesn't silently drop airports.
//
// See MDplan/V3_WebhookExtractionPlan.md §8 Phase 1.
// ============================================================

const BASE_URL = "https://aerodatabox.p.rapidapi.com";
const MIN_INTERVAL_MS = Number(process.env.ADB_API_MIN_INTERVAL_MS) > 0
  ? Number(process.env.ADB_API_MIN_INTERVAL_MS)
  : 1000;
const RATE_LIMIT_BACKOFF_MS = 1500;
const RATE_LIMIT_MAX_RETRIES = 3;

export type FidsRestCategory = "fids_base" | "fids_split" | "fids_retry" | "validation" | "outcome";
export const FIDS_REST_UNITS_PER_ATTEMPT = 2;

export interface FidsAttemptBudgetOwner {
  reserve(category: FidsRestCategory, units: number, attemptNumber: number): Promise<string>;
}

let lastStartedAt = 0;
let chain: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttledFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const slot = chain.then(async () => {
    const wait = Math.max(0, lastStartedAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastStartedAt = Date.now();
  });
  chain = slot.catch(() => {});
  return slot.then(async () => {
    let resp = await fetch(input, init);
    let attempt = 0;
    while (resp.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
      const backoff = RATE_LIMIT_BACKOFF_MS * (attempt + 1);
      console.warn(`[adb-v3] rate-limited (429) — retrying in ${backoff}ms (attempt ${attempt + 1}/${RATE_LIMIT_MAX_RETRIES})`);
      await sleep(backoff);
      lastStartedAt = Date.now();
      resp = await fetch(input, init);
      attempt++;
    }
    return resp;
  });
}

function apiKey(): string | null {
  return process.env.AERODATABOX_API_KEY || null;
}

/**
 * AeroDataBox sometimes answers 200 with an EMPTY body (e.g. the balance endpoint
 * before a first refill creates the balance record). `resp.json()` would throw on
 * that; return null instead so callers can explain the state.
 */
async function readJsonOrNull(resp: Response): Promise<any | null> {
  const text = await resp.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function headers(json = false): Record<string, string> {
  const key = apiKey();
  const h: Record<string, string> = {
    "x-rapidapi-key": key || "",
    "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// ---------------------------------------------------------------------------
// Types (mirror the AeroDataBox FlightNotificationContract subscription block)
// ---------------------------------------------------------------------------

export type SubscriptionSubjectType = "FlightByNumber" | "FlightByAirportIcao";

export interface WebhookSubscription {
  id: string;
  isActive: boolean;
  billingType: "LifetimeBased" | "CreditBased";
  activateBeforeUtc?: string | null;
  expiresOnUtc?: string | null;
  createdOnUtc?: string | null;
  subject?: { type?: string; id?: string | null };
  subscriber?: { type?: string; id?: string | null };
  notices?: string[] | null;
}

export interface SubscriptionBalance {
  creditsRemaining: number;
  lastRefilledUtc?: string | null;
  lastDeductedUtc?: string | null;
}

export interface AirportFeedsHealth {
  icao: string;
  [key: string]: unknown;
}

export type FeedService = "FlightSchedules" | "FlightLiveUpdates" | "AdsbUpdates";

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

/** GET /subscriptions/balance — free. Returns the alert credit balance. */
export async function getBalance(): Promise<SubscriptionBalance | null> {
  try {
    const resp = await throttledFetch(`${BASE_URL}/subscriptions/balance`, { headers: headers() });
    if (!resp.ok) {
      console.warn(`[adb-v3] getBalance ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 300)}`);
      return null;
    }
    const raw: any = await readJsonOrNull(resp);
    if (raw === null) {
      console.warn("[adb-v3] getBalance: AeroDataBox returned an empty 200 (no balance record yet?)");
      return null;
    }
    // Normalize: response may be the balance object directly or wrapped.
    return normalizeBalance(raw?.balance ?? raw);
  } catch (err: any) {
    console.error("[adb-v3] getBalance error:", err?.message || err);
    return null;
  }
}

/** POST /subscriptions/balance/refill — variable rate, 1 API unit per credit. */
export async function refillBalance(credits: number): Promise<SubscriptionBalance | null> {
  try {
    const resp = await throttledFetch(`${BASE_URL}/subscriptions/balance/refill`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ credits: Math.max(1, Math.floor(credits)) }),
    });
    if (!resp.ok) {
      console.warn(`[adb-v3] refillBalance ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 300)}`);
      return null;
    }
    const raw: any = await readJsonOrNull(resp);
    return normalizeBalance(raw?.balance ?? raw);
  } catch (err: any) {
    console.error("[adb-v3] refillBalance error:", err?.message || err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/**
 * Experimental retry guard (§1.5.1 item 4 / CRIT-004).
 * V3.9 experimental collection requires maxDeliveryRetries=0: omitted (or 0)
 * resolves to 0; any requested nonzero value is REFUSED by throwing — never
 * silently stored or clamped. Single owner; routes/tests must import this,
 * never reimplement the rule.
 */
export function resolveExperimentalRetries(requested: number | undefined): number {
  if (requested === undefined) return 0;
  if (requested !== 0) {
    throw new Error(
      `experimental maxDeliveryRetries must be 0, got ${requested} — refusing subscription creation`,
    );
  }
  return 0;
}

/**
 * POST /subscriptions/webhook/{subjectType}/{subjectId} — free.
 * Creates a credit-based push subscription. Notifications POST to `url`.
 * maxDeliveryRetries: 0-2 (default 0). Each retry costs the same as an initial
 * delivery, so keep it low — 2 is the safe max for a reliable endpoint.
 */
export async function createSubscription(
  subjectType: SubscriptionSubjectType,
  subjectId: string,
  opts?: { url?: string; maxDeliveryRetries?: number },
): Promise<WebhookSubscription | null> {
  // Strict experimental rule OUTSIDE try/catch: nonzero retries THROW and must
  // propagate to the caller (never collapse into a null return) — the single
  // owner is resolveExperimentalRetries() (§1.5.1 item 4 / CRIT-004).
  const maxDeliveryRetries = resolveExperimentalRetries(opts?.maxDeliveryRetries);
  try {
    const key = apiKey();
    if (!key) {
      console.warn("[adb-v3] createSubscription skipped — AERODATABOX_API_KEY not set");
      return null;
    }
    // Strict experimental rule resolved above (outside try/catch).
    const targetUrl = opts?.url || defaultWebhookUrl();
    const resp = await throttledFetch(
      `${BASE_URL}/subscriptions/webhook/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectId)}`,
      {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ url: targetUrl, maxDeliveryRetries }),
      },
    );
    const text = await resp.text().catch(() => "");
    if (!resp.ok) {
      console.warn(`[adb-v3] createSubscription ${subjectType}/${subjectId} ${resp.status}: ${text.slice(0, 300)}`);
      return null;
    }
    let raw: any;
    try {
      raw = JSON.parse(text);
    } catch {
      return null;
    }
    return normalizeSubscription(raw?.subscription ?? raw);
  } catch (err: any) {
    console.error("[adb-v3] createSubscription error:", err?.message || err);
    return null;
  }
}

/** GET /subscriptions/webhook — free. Lists all subscriptions for the account. */
export async function listSubscriptions(): Promise<WebhookSubscription[]> {
  try {
    const resp = await throttledFetch(`${BASE_URL}/subscriptions/webhook`, { headers: headers() });
    if (!resp.ok) {
      console.warn(`[adb-v3] listSubscriptions ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 300)}`);
      return [];
    }
    const raw: any = await readJsonOrNull(resp);
    const list = Array.isArray(raw) ? raw : raw?.subscriptions ?? raw?.items ?? [];
    if (!Array.isArray(list)) return [];
    return list
      .map(normalizeSubscription)
      .filter((s): s is WebhookSubscription => s !== null);
  } catch (err: any) {
    console.error("[adb-v3] listSubscriptions error:", err?.message || err);
    return [];
  }
}

/** GET /subscriptions/webhook/{subscriptionId} — free. */
export async function getSubscription(subscriptionId: string): Promise<WebhookSubscription | null> {
  try {
    const resp = await throttledFetch(
      `${BASE_URL}/subscriptions/webhook/${encodeURIComponent(subscriptionId)}`,
      { headers: headers() },
    );
    if (!resp.ok) {
      console.warn(`[adb-v3] getSubscription ${subscriptionId} ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 300)}`);
      return null;
    }
    const raw: any = await readJsonOrNull(resp);
    return normalizeSubscription(raw?.subscription ?? raw);
  } catch (err: any) {
    console.error("[adb-v3] getSubscription error:", err?.message || err);
    return null;
  }
}

/** DELETE /subscriptions/webhook/{subscriptionId} — free. */
export async function deleteSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const resp = await throttledFetch(
      `${BASE_URL}/subscriptions/webhook/${encodeURIComponent(subscriptionId)}`,
      { method: "DELETE", headers: headers() },
    );
    if (resp.status >= 400) {
      console.warn(`[adb-v3] deleteSubscription ${subscriptionId} ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("[adb-v3] deleteSubscription error:", err?.message || err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Coverage check (before subscribing — a flight/airport outside ADS-B/live
// coverage produces few or no alerts)
// ---------------------------------------------------------------------------

/** GET /health/services/airports/{icao}/feeds — free. Live-update coverage. */
export async function checkAirportFeeds(icao: string): Promise<AirportFeedsHealth | null> {
  try {
    const resp = await throttledFetch(
      `${BASE_URL}/health/services/airports/${encodeURIComponent(icao)}/feeds`,
      { headers: headers() },
    );
    if (!resp.ok) return null;
    return await readJsonOrNull(resp);
  } catch (err: any) {
    console.error("[adb-v3] checkAirportFeeds error:", err?.message || err);
    return null;
  }
}

/**
 * GET /health/services/feeds/{service}/airports — FREE.
 * Returns EVERY airport ICAO code that AeroDataBox supports for a given feed
 * service (FlightSchedules / FlightLiveUpdates / AdsbUpdates), as
 * `{ count, items: string[] }`. This is how we enumerate the provider's
 * feed universe per service (the "which airports can we touch" question).
 * NOTE: an airport in one feed is NOT automatically in the others — feed
 * eligibility is recorded per airport in clean.adb_sampling_frame
 * (pre_eligible / post_eligible), never conflated into one union population.
 */
export async function listFeedAirports(service: FeedService): Promise<string[] | null> {
  try {
    const resp = await throttledFetch(
      `${BASE_URL}/health/services/feeds/${encodeURIComponent(service)}/airports`,
      { headers: headers() },
    );
    if (!resp.ok) return null;
    const raw: any = await readJsonOrNull(resp);
    if (!raw || !Array.isArray(raw?.items)) return null;
    const items: string[] = raw.items.filter((x: unknown): x is string => typeof x === "string");
    return items.length > 0 ? items : null;
  } catch (err: any) {
    console.error("[adb-v3] listFeedAirports error:", err?.message || err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// FIDS (Flight Information Display System) — schedule/population census
// V3.9 §5.1-5.4, Sep1_1 §7-9
//
// Endpoint: GET /flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}
// Parameters: direction=Both, withCancelled=true, withCodeshared=true,
//   withCargo=false, withPrivate=false, withLocation=false
// Current public contract pin: Tier 2 / 2 REST API units per attempt (NOT Alert credits).
// ---------------------------------------------------------------------------

export interface FidsAirportResult {
  departures: any[];
  arrivals: any[];
}

/**
 * Durable, atomic REST-budget owner. A category must have a pre-frozen control
 * row; missing or exhausted controls refuse the request rather than borrowing.
 */
export const fidsRestLedger: FidsAttemptBudgetOwner = {
  async reserve(category, units, attemptNumber) {
    const { pool } = await import("../../db");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const control = await client.query(
        `UPDATE clean.adb_rest_budget_control
            SET used_units = used_units + $2, updated_at = now()
          WHERE category = $1 AND enabled = true
            AND used_units + $2 <= cap_units
          RETURNING cycle_id`,
        [category, units],
      );
      if (control.rowCount !== 1) throw new Error(`REST budget unavailable for ${category}`);
      const reservationId = randomUUID();
      await client.query(
        `INSERT INTO clean.adb_rest_attempt_ledger
           (reservation_id, cycle_id, category, units, attempt_number, reserved_at)
         VALUES ($1,$2,$3,$4,$5,now())`,
        [reservationId, control.rows[0].cycle_id, category, units, attemptNumber],
      );
      await client.query("COMMIT");
      return reservationId;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  },
};

export interface FidsFetchOptions {
  direction?: "Departure" | "Arrival" | "Both";
  withLeg?: boolean;
  category?: "fids_base" | "fids_split" | "validation" | "outcome";
  budgetOwner?: FidsAttemptBudgetOwner;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
}

/**
 * GET /flights/airports/icao/{icao}/{fromLocal}/{toLocal} — 2 REST API units at the current pin.
 * Fetches the FIDS population for one airport over a local-time window.
 * Returns the raw departures+arrivals arrays or null on failure.
 */
export async function fetchFidsAirport(
  icao: string,
  fromLocal: string,
  toLocal: string,
  opts?: FidsFetchOptions,
): Promise<FidsAirportResult | null> {
  const direction = opts?.direction ?? "Both";
  // §1.5.3: withLeg=true includes the opposite movement (departure+arrival context).
  const withLeg = opts?.withLeg ?? true;
  const owner = opts?.budgetOwner ?? fidsRestLedger;
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const sleepImpl = opts?.sleepImpl ?? sleep;
  try {
    const params = new URLSearchParams({
      direction,
      withCancelled: "true",
      withCodeshared: "true",
      withCargo: "false",
      withPrivate: "false",
      withLocation: "false",
      withLeg: withLeg ? "true" : "false",
    });
    const url = `${BASE_URL}/flights/airports/icao/${encodeURIComponent(icao)}/${encodeURIComponent(fromLocal)}/${encodeURIComponent(toLocal)}?${params}`;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const category: FidsRestCategory = attempt === 1 ? (opts?.category ?? "fids_base") : "fids_retry";
      // Reservation is deliberately adjacent to and before the physical request.
      await owner.reserve(category, FIDS_REST_UNITS_PER_ATTEMPT, attempt);
      let resp: Response;
      try {
        resp = await fetchImpl(url, { headers: headers(), signal: AbortSignal.timeout(15_000) });
      } catch (error) {
        if (attempt === 3) throw error;
        await sleepImpl(RATE_LIMIT_BACKOFF_MS * attempt);
        continue;
      }
      if (resp.ok) {
        const raw: any = await readJsonOrNull(resp);
        if (!raw || typeof raw !== "object") throw new Error("FIDS response schema invalid");
        return {
          departures: Array.isArray(raw.departures) ? raw.departures : [],
          arrivals: Array.isArray(raw.arrivals) ? raw.arrivals : [],
        };
      }
      const retryable = resp.status === 429 || [500, 502, 503, 504].includes(resp.status);
      if (!retryable || attempt === 3) return null;
      const retryAfter = Number(resp.headers.get("retry-after"));
      await sleepImpl(Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : RATE_LIMIT_BACKOFF_MS * attempt);
    }
    return null;
  } catch (err: any) {
    console.error(`[adb-v3] fetchFidsAirport ${icao} error:`, err?.message || err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * The public webhook URL we point subscriptions at.
 * Resolution order (same as the Stripe webhook in server/index.ts):
 *   1. WEBHOOK_BASE_URL env (explicit override)
 *   2. REPLIT_DOMAINS env → first domain (the actual Replit public URL)
 *   3. fallback https://travnr.com
 * Secret comes from AERODATABOX_WEBHOOK_SECRET (a long random string). If unset,
 * falls back to the secret-less path so local smoke tests still work.
 *
 * IMPORTANT (verified 2026-08-10): AeroDataBox REJECTS webhook URLs without an
 * explicit port — `{"message":"Web-hook URL port is not allowed: -1"}`. We must
 * include `:443` so their URL validator parses a real port.
 */
export function defaultWebhookUrl(): string {
  const secret = process.env.AERODATABOX_WEBHOOK_SECRET;
  let base = process.env.WEBHOOK_BASE_URL;
  if (!base) {
    const replitDomains = process.env.REPLIT_DOMAINS;
    base = replitDomains ? `https://${replitDomains.split(",")[0]}` : "https://travnr.com";
  }
  try {
    const u = new URL(base);
    if (!u.port) {
      base = base.replace(/\/?$/, `:443`);
    }
  } catch {
    // keep base as-is if unparseable
  }
  const path = `/api/v1/webhooks/aerodatabox${secret ? `/${secret}` : ""}`;
  return `${base}${path}`;
}

// ---------------------------------------------------------------------------
// Normalizers (defensive — the API occasionally wraps or omits fields)
// ---------------------------------------------------------------------------

function normalizeSubscription(raw: any): WebhookSubscription | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id,
    isActive: raw.isActive,
    billingType: raw.billingType,
    activateBeforeUtc: raw.activateBeforeUtc ?? null,
    expiresOnUtc: raw.expiresOnUtc ?? null,
    createdOnUtc: raw.createdOnUtc ?? null,
    subject: raw.subject ? { type: raw.subject.type, id: raw.subject.id ?? null } : undefined,
    subscriber: raw.subscriber ? { type: raw.subscriber.type, id: raw.subscriber.id ?? null } : undefined,
    notices: raw.notices ?? null,
  };
}

function normalizeBalance(raw: any): SubscriptionBalance | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    creditsRemaining: Number(raw.creditsRemaining ?? 0),
    lastRefilledUtc: raw.lastRefilledUtc ?? null,
    lastDeductedUtc: raw.lastDeductedUtc ?? null,
  };
}
