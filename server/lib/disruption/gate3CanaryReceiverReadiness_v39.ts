/**
 * Strict NO-GO for legacy Gate3 canary until a reviewed, frozen owner
 * is bound to an actually available, durable published receiver endpoint.
 * Environment flags must never override this bound safety decision.
 */
export function refuseLegacyGate3CanaryReceiverV39(): never {
  throw new Error(
    "REFUSED:GATE3_LEGACY_CANARY_RECEIVER_INCOMPATIBLE_WITH_PUBLISHED_PREPAID_ONLY_RUNTIME"
  );
}
