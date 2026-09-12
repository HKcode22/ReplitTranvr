import { randomUUID } from "crypto";

// ============================================================
// v3 — AeroDataBox Flight Alert subscription manager.
// The ONLY module allowed to make outbound calls to
// aerodatabox.p.rapidapi.com for the Flight Alert API.
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

async function readJsonOrNull(resp: Response): Promise<any | null> {
  const text = await resp.text().catch(() => "");
  if (!text.trim()) return null;
  try { return JSON.parse(text); }
  catch { return null; }
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

/** GET /subscriptions/balance — free. */
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
    return normalizeBalance(raw?.balance ?? raw);
  } catch (err: any) {
    console.error("[adb-v3] getBalance error:", err?.message || err);
    return null;
  }
}

export interface RapidApiQuotaSnapshot {
  observedAtUtc: string;
  apiUnitsLimit: number;
  apiUnitsRemaining: number;
  apiUnitsResetSeconds: number;
  apiUnitsResetAtUtc: string;
  requestsLimit: number;
  requestsRemaining: number;
  requestsResetSeconds: number;
  requestId: string | null;
  rapidApiRegion: string | null;
  rapidApiVersion: string | null;
}

export interface StrictBalanceEvidence {
  balance: SubscriptionBalance;
  quota: RapidApiQuotaSnapshot;
}

function requiredHeaderInteger(resp: Response, name: string, positive = false): number {
  const raw = resp.headers.get(name);
  const value = raw === null ? NaN : Number(raw);
  if (!Number.isInteger(value) || value < 0 || (positive && value <= 0)) {
    throw new Error(`BALANCE_UNAVAILABLE: missing/invalid ${name}`);
  }
  return value;
}

/**
 * Gate-0 balance/quota evidence reader. GET /subscriptions/balance is provider-
 * documented Free Tier, so this captures the marketplace custom-quota headers
 * without consuming API units. Any missing/invalid evidence fails closed.
 */
export async function getBalanceEvidenceStrict(): Promise<StrictBalanceEvidence> {
  if (!apiKey()) throw new Error("BALANCE_UNAVAILABLE: API key is not set");
  let resp: Response;
  try {
    resp = await throttledFetch(`${BASE_URL}/subscriptions/balance`, { headers: headers() });
  } catch {
    throw new Error("BALANCE_UNAVAILABLE: transport failure");
  }
  if (!resp.ok) throw new Error(`BALANCE_UNAVAILABLE: HTTP ${resp.status}`);
  const raw: any = await readJsonOrNull(resp);
  const balance = normalizeBalance(raw?.balance ?? raw);
  if (!balance) throw new Error("BALANCE_UNAVAILABLE: invalid response");

  const dateHeader = resp.headers.get("date");
  if (!dateHeader || !Number.isFinite(Date.parse(dateHeader))) throw new Error("BALANCE_UNAVAILABLE: missing/invalid Date header");
  const observedAtUtc = new Date(Date.parse(dateHeader)).toISOString();
  const apiUnitsLimit = requiredHeaderInteger(resp, "x-ratelimit-api-units-limit", true);
  const apiUnitsRemaining = requiredHeaderInteger(resp, "x-ratelimit-api-units-remaining");
  const apiUnitsResetSeconds = requiredHeaderInteger(resp, "x-ratelimit-api-units-reset");
  const requestsLimit = requiredHeaderInteger(resp, "x-ratelimit-requests-limit", true);
  const requestsRemaining = requiredHeaderInteger(resp, "x-ratelimit-requests-remaining");
  const requestsResetSeconds = requiredHeaderInteger(resp, "x-ratelimit-requests-reset");
  if (apiUnitsRemaining > apiUnitsLimit) throw new Error("BALANCE_UNAVAILABLE: API-unit remaining exceeds limit");
  if (requestsRemaining > requestsLimit) throw new Error("BALANCE_UNAVAILABLE: request remaining exceeds limit");
  const apiUnitsResetAtUtc = new Date(Date.parse(observedAtUtc) + apiUnitsResetSeconds * 1000).toISOString();

  return {
    balance,
    quota: {
      observedAtUtc, apiUnitsLimit, apiUnitsRemaining, apiUnitsResetSeconds, apiUnitsResetAtUtc,
      requestsLimit, requestsRemaining, requestsResetSeconds,
      requestId: resp.headers.get("x-rapidapi-request-id"),
      rapidApiRegion: resp.headers.get("x-rapidapi-region"),
      rapidApiVersion: resp.headers.get("x-rapidapi-version"),
    },
  };
}

/** Gate/accounting reader: strict balance-only compatibility wrapper. */
export async function getBalanceStrict(): Promise<SubscriptionBalance> {
  return (await getBalanceEvidenceStrict()).balance;
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

export function resolveExperimentalRetries(requested: number | undefined): number {
  if (requested === undefined) return 0;
  if (requested !== 0) {
    throw new Error(`experimental maxDeliveryRetries must be 0, got ${requested} — refusing subscription creation`);
  }
  return 0;
}

export async function createSubscription(
  subjectType: SubscriptionSubjectType,
  subjectId: string,
  opts?: { url?: string; maxDeliveryRetries?: number },
): Promise<WebhookSubscription | null> {
  const maxDeliveryRetries = resolveExperimentalRetries(opts?.maxDeliveryRetries);
  try {
    const key = apiKey();
    if (!key) {
      console.warn("[adb-v3] createSubscription skipped — AERODATABOX_API_KEY not set");
      return null;
    }
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
      // Never print provider response bodies for subscription creation: an
      // error response may echo the secret-bearing webhook target URL.
      console.warn(`[adb-v3] createSubscription ${subjectType}/${subjectId} HTTP ${resp.status} (body redacted)`);
      return null;
    }
    let raw: any;
    try { raw = JSON.parse(text); }
    catch { return null; }
    return normalizeSubscription(raw?.subscription ?? raw);
  } catch (err: any) {
    console.error("[adb-v3] createSubscription error:", err?.message || err);
    return null;
  }
}

/** Diagnostic/UI reader. Legacy callers may prefer an empty array on transport failure. */
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
    return list.map(normalizeSubscription).filter((s): s is WebhookSubscription => s !== null);
  } catch (err: any) {
    console.error("[adb-v3] listSubscriptions error:", err?.message || err);
    return [];
  }
}

/**
 * Safety/R1 reader. Any transport, HTTP, JSON, schema, or malformed-row
 * uncertainty THROWS; it can never be interpreted as an empty account.
 */
export async function listSubscriptionsStrict(): Promise<WebhookSubscription[]> {
  const key = apiKey();
  if (!key) throw new Error("R1_LIST_UNAVAILABLE: AERODATABOX_API_KEY is not set");
  let resp: Response;
  try {
    resp = await throttledFetch(`${BASE_URL}/subscriptions/webhook`, { headers: headers() });
  } catch (error: any) {
    throw new Error(`R1_LIST_UNAVAILABLE: ${error?.message ?? error}`);
  }
  if (resp.status === 204) return [];
  if (!resp.ok) {
    const body = (await resp.text().catch(() => "")).slice(0, 300);
    throw new Error(`R1_LIST_UNAVAILABLE: HTTP ${resp.status} ${body}`);
  }
  const raw: any = await readJsonOrNull(resp);
  if (raw === null) throw new Error("R1_LIST_UNAVAILABLE: empty/invalid JSON response");
  const list = Array.isArray(raw) ? raw : raw?.subscriptions ?? raw?.items;
  if (!Array.isArray(list)) throw new Error("R1_LIST_UNAVAILABLE: subscription array missing");
  const normalized: WebhookSubscription[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = normalizeSubscription(list[i]);
    if (!item || typeof item.id !== "string" || !item.id || typeof item.isActive !== "boolean" ||
        !["LifetimeBased", "CreditBased"].includes(item.billingType)) {
      throw new Error(`R1_LIST_UNAVAILABLE: malformed subscription row index=${i}`);
    }
    normalized.push(item);
  }
  return normalized;
}

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

export interface FidsAirportResult {
  departures: any[];
  arrivals: any[];
}

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

export async function fetchFidsAirport(
  icao: string,
  fromLocal: string,
  toLocal: string,
  opts?: FidsFetchOptions,
): Promise<FidsAirportResult | null> {
  const direction = opts?.direction ?? "Both";
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

export function defaultWebhookUrl(): string {
  const secret = process.env.AERODATABOX_WEBHOOK_SECRET;
  let base = process.env.WEBHOOK_BASE_URL;
  if (!base) {
    const replitDomains = process.env.REPLIT_DOMAINS;
    base = replitDomains ? `https://${replitDomains.split(",")[0]}` : "https://travnr.com";
  }
  try {
    const u = new URL(base);
    if (!u.port) base = base.replace(/\/?$/, `:443`);
  } catch {
    // keep base as-is if unparseable
  }
  const path = `/api/v1/webhooks/aerodatabox${secret ? `/${secret}` : ""}`;
  return `${base}${path}`;
}

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
  const creditsRemaining = Number(raw.creditsRemaining);
  if (!Number.isFinite(creditsRemaining) || creditsRemaining < 0) return null;
  return {
    creditsRemaining,
    lastRefilledUtc: raw.lastRefilledUtc ?? null,
    lastDeductedUtc: raw.lastDeductedUtc ?? null,
  };
}
