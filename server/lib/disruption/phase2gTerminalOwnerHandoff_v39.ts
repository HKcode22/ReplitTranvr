/**
 * P25 incident31 remediation candidate: avoid a false "isolation lost"
 * recovery when GitHub owner has already deleted the ONE owned subscription
 * at the scheduled terminal boundary, while SQL is not yet moved to settling.
 *
 * PURE DECISION ONLY. Never authorizes a new subscription, credit exposure,
 * deletion, runtime cleanup, historical result override or Stage2 promotion.
 * Strictly bounded by the existing GitHub safety watchdog cleanup grace.
 */
export type TerminalOwnerHandoffDecisionV39 =
  | "WAIT_BOUNDED_TERMINAL_OWNER_CLEANUP"
  | "RECOVER_ISOLATION_LOST";

export type TerminalOwnerHandoffInputV39 = Readonly<{
  probeStatus: string;
  expectedSubscriptionId: string | null;
  activeBillableSubscriptionIds: readonly string[];
  scheduledWindowEndMs: number;
  observedNowMs: number;
  cleanupGraceMs: number;
}>;

export function classifyPhase2gTerminalOwnerZeroSubscriptionV39(
  input: TerminalOwnerHandoffInputV39,
): TerminalOwnerHandoffDecisionV39 {
  if (input.probeStatus !== "probing" ||
      !input.expectedSubscriptionId ||
      typeof input.expectedSubscriptionId !== "string" ||
      !input.expectedSubscriptionId.trim() ||
      input.activeBillableSubscriptionIds.length !== 0 ||
      !Number.isSafeInteger(input.scheduledWindowEndMs) ||
      !Number.isSafeInteger(input.observedNowMs) ||
      !Number.isSafeInteger(input.cleanupGraceMs) ||
      input.cleanupGraceMs < 1 ||
      input.cleanupGraceMs > 300_000 ||
      input.scheduledWindowEndMs < 0 ||
      input.observedNowMs < input.scheduledWindowEndMs ||
      input.observedNowMs >=
        input.scheduledWindowEndMs + input.cleanupGraceMs) {
    return "RECOVER_ISOLATION_LOST";
  }
  return "WAIT_BOUNDED_TERMINAL_OWNER_CLEANUP";
}
