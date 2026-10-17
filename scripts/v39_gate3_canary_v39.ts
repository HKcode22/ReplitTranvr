/**
 * Legacy Gate3 paid CLI: explicit NO-GO (never delegate).
 * The old credit_canary.ts ledger/route is incompatible with the published
 * prepaid-only webhook. A valid AUTH cannot repair that incompatibility.
 * Future provider-capable Gate3 needs a separately reviewed true owner.
 */
import {refuseLegacyGate3CanaryReceiverV39}
  from "../server/lib/disruption/gate3CanaryReceiverReadiness_v39";

try {
  refuseLegacyGate3CanaryReceiverV39();
} catch (error) {
  console.error(error instanceof Error ? error.message : "GATE3_LEGACY_NO_GO");
  process.exitCode=2;
}
