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
// never sees concurrent bursts (HTTP 429).
//
// See MDplan/V3_WebhookExtractionPlan.md §8 Phase 1.
// ============================================================

const BASE_URL = "https://aerodatabox.p.rapidapi.com";
const MIN_INTERVAL_MS = 500;

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
  return slot.then(() => fetch(input, init));
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
        body: JSON.stringify({
          url: targetUrl,
          ...(opts?.maxDeliveryRetries !== undefined
            ? { maxDeliveryRetries: Math.min(2, Math.max(0, opts.maxDeliveryRetries)) }
            : {}),
        }),
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
 * `{ count, items: string[] }`. This is how we enumerate the true collectable
 * universe (the "how many airports can we actually touch" question).
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
