/**
 * Shared settlement service — Phase 0K (§1.5.11).
 *
 * Plan coverage: §§3, 11, 15 R1–R5.
 *
 * One shared service reused by smoke/probe/canary/controller/gates — never a
 * per-caller short delay/single-read. Consumes frozen:
 *   settlement_initial_wait_seconds, settlement_poll_interval_seconds,
 *   settlement_stable_read_count (minimum 3), settlement_timeout_seconds,
 *   pre_smoke_unsettled_burst_margin_credits.
 *
 * Rule: after stop/deletion, authoritative balance reads must reach at least
 * `stableReadCount` CONSECUTIVE EQUAL reads spanning the stability window.
 * Any change resets the count. Timeout → SETTLEMENT_UNRESOLVED. No later paid
 * run starts until resolved.
 *
 * External spend: C_external = B_before − B_stable.
 * Internal spend: C_internal = Σ notification_items over the immutable owned
 * delivery/item SEND scope (computed by the caller from the raw ledger).
 *
 * Pure offline logic (the balance reader is injected): no DB/provider calls here.
 */

export const SETTLEMENT_MIN_STABLE_READS = 3;

export interface SettlementConfig {
  initialWaitSeconds: number;
  pollIntervalSeconds: number;
  /** Minimum consecutive equal reads (≥3). */
  stableReadCount: number;
  timeoutSeconds: number;
}

export type SettlementOutcome =
  | { status: "settled"; stableBalance: number; readsUsed: number }
  | { status: "unresolved"; reason: "timeout" | "reader_failed"; readsUsed: number };

/**
 * Run the shared settlement procedure against an injected balance reader.
 * `readBalance` returns the authoritative remaining balance or null on failure.
 * `sleep` is injectable so tests run instantly; production passes a real timer.
 * `nowMs` bounds total elapsed time against the frozen timeout.
 */
export async function runSettlement(
  config: SettlementConfig,
  readBalance: () => Promise<number | null>,
  opts?: { sleep?: (ms: number) => Promise<void>; nowMs?: () => number },
): Promise<SettlementOutcome> {
  const stableNeeded = Math.max(SETTLEMENT_MIN_STABLE_READS, Math.floor(config.stableReadCount));
  const sleep = opts?.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const nowMs = opts?.nowMs ?? (() => Date.now());
  const deadlineMs = nowMs() + config.timeoutSeconds * 1000;

  await sleep(config.initialWaitSeconds * 1000);

  let last: number | null = null;
  let equalCount = 0;
  let readsUsed = 0;
  for (;;) {
    if (nowMs() >= deadlineMs) {
      return { status: "unresolved", reason: "timeout", readsUsed };
    }
    let bal: number | null;
    try {
      bal = await readBalance();
    } catch {
      return { status: "unresolved", reason: "reader_failed", readsUsed };
    }
    readsUsed++;
    if (bal === null || !Number.isFinite(bal)) {
      return { status: "unresolved", reason: "reader_failed", readsUsed };
    }
    if (last !== null && bal === last) {
      equalCount++;
    } else {
      equalCount = 1; // any change resets stability
    }
    last = bal;
    if (equalCount >= stableNeeded) {
      return { status: "settled", stableBalance: bal, readsUsed };
    }
    await sleep(config.pollIntervalSeconds * 1000);
  }
}

/** C_external = B_before − B_stable (authoritative settled spend). */
export function externalSpend(balanceBefore: number, balanceStable: number): number {
  return balanceBefore - balanceStable;
}

export interface ReconciliationInput {
  cExternal: number;
  cInternal: number;
  /** Gate 3 uses exact tol=0; production tolerance (if ever frozen) has its own name. */
  tolerance: number;
}

export interface ReconciliationResult {
  match: boolean;
  discrepancy: number;
}

/** Exact reconciliation: |C_external − C_internal| ≤ tolerance. */
export function reconcileSpend(input: ReconciliationInput): ReconciliationResult {
  const discrepancy = input.cExternal - input.cInternal;
  return { match: Math.abs(discrepancy) <= input.tolerance, discrepancy };
}
