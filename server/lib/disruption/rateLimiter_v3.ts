/**
 * Central rate limiter — V3.9-f.9 §46 / Sep1_1 §46
 *
 * Sep1_1 §46 corrections:
 *  - Verify actual account rate limit
 *  - Implement central rate limiter, retry/backoff, retry budget, 429 handling
 *  - REST retries must count toward budget
 *  - Do not let multiple scripts independently bypass the limiter
 *
 * This module provides a global rate limiter that ALL outbound AeroDataBox
 * calls must go through. No script may bypass it.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Minimum interval between requests (ms) */
  minIntervalMs: number;
  /** Maximum retries on 429 */
  maxRetries: number;
  /** Backoff base (ms) — actual backoff = base * attempt */
  backoffBaseMs: number;
  /** Maximum backoff (ms) */
  maxBackoffMs: number;
  /** Retry budget: max retries per UTC day */
  dailyRetryBudget: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  minIntervalMs: 1000,
  maxRetries: 3,
  backoffBaseMs: 1500,
  maxBackoffMs: 30000,
  dailyRetryBudget: 50,
};

// ---------------------------------------------------------------------------
// Global state (singleton)
// ---------------------------------------------------------------------------

let lastRequestTime = 0;
let requestChain: Promise<void> = Promise.resolve();
let dailyRetryCount = 0;
let currentDay = "";

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetDailyRetryCount(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDay) {
    dailyRetryCount = 0;
    currentDay = today;
  }
}

// ---------------------------------------------------------------------------
// Rate-limited fetch
// ---------------------------------------------------------------------------

/**
 * Rate-limited fetch with retry/backoff.
 * ALL outbound AeroDataBox calls MUST use this function.
 * Retries count toward the daily retry budget (§46).
 */
export async function rateLimitedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  config: RateLimitConfig = DEFAULT_CONFIG,
): Promise<Response> {
  // Wait for minimum interval
  const slot = requestChain.then(async () => {
    const wait = Math.max(0, lastRequestTime + config.minIntervalMs - Date.now());
    if (wait > 0) await sleep(wait);
    lastRequestTime = Date.now();
  });
  requestChain = slot.catch(() => {});

  await slot;

  resetDailyRetryCount();

  let resp = await fetch(input, init);
  let attempt = 0;

  while (resp.status === 429 && attempt < config.maxRetries) {
    // Check retry budget
    if (dailyRetryCount >= config.dailyRetryBudget) {
      console.error(`[rate-limiter] daily retry budget exhausted (${dailyRetryCount}/${config.dailyRetryBudget})`);
      break;
    }

    const backoff = Math.min(
      config.backoffBaseMs * (attempt + 1),
      config.maxBackoffMs,
    );
    console.warn(`[rate-limiter] 429 received — retrying in ${backoff}ms (attempt ${attempt + 1}/${config.maxRetries}, daily retries: ${dailyRetryCount + 1}/${config.dailyRetryBudget})`);

    dailyRetryCount++;
    await sleep(backoff);
    lastRequestTime = Date.now();
    resp = await fetch(input, init);
    attempt++;
  }

  return resp;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getRateLimiterStats(): { lastRequestTime: number; dailyRetryCount: number; dailyRetryBudget: number } {
  resetDailyRetryCount();
  return {
    lastRequestTime,
    dailyRetryCount,
    dailyRetryBudget: DEFAULT_CONFIG.dailyRetryBudget,
  };
}
