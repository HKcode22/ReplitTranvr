import { createHash } from "node:crypto";
import type {
  Phase2gCleanupAttestationV39,
} from "./phase2gCleanupAttestation_v39";

/**
 * Stable scientific scope: excludes renewed inventory timestamps
 * and attestation expiry. A new HMAC does not authorize a new run.
 */
export function phase2gCleanupScopeHashV39(
  proof: Phase2gCleanupAttestationV39,
): string {
  return createHash("sha256").update(JSON.stringify({
    callback_origin: proof.callback_origin,
    session_id: proof.session_id,
    probe_id: proof.probe_id,
    probe_budget_day_id: proof.probe_budget_day_id,
    icao: proof.icao,
    provider_subscription_id: proof.provider_subscription_id,
    expected_live_blobs: proof.expected_live_blobs,
  })).digest("hex");
}

export function assertPhase2gCleanupJournalMatchV39(
  proof: Phase2gCleanupAttestationV39,
  journal: Record<string, unknown>,
): "STARTED" | "VERIFIED" {
  const state = String(journal.state ?? "");

  if (
    String(journal.session_id ?? "").toLowerCase() !== proof.session_id ||
    Number(journal.probe_id) !== proof.probe_id ||
    String(journal.deletion_run_id) !== proof.deletion_run_id ||
    String(journal.request_sha256) !==
      phase2gCleanupScopeHashV39(proof) ||
    Number(journal.expected_live_blobs) !==
      proof.expected_live_blobs ||
    (state !== "STARTED" && state !== "VERIFIED")
  ) {
    throw new Error("PHASE2G_CLEANUP_REPLAY_SCOPE_CONFLICT");
  }

  if (
    state === "VERIFIED" &&
    (
      !Number.isSafeInteger(Number(journal.deleted_runtime_rows)) ||
      Number(journal.deleted_runtime_rows) < 1 ||
      Number(journal.deleted_blobs) !== proof.expected_live_blobs ||
      !Number.isFinite(Date.parse(String(journal.verified_at_utc ?? "")))
    )
  ) {
    throw new Error("PHASE2G_CLEANUP_REPLAY_RECEIPT_INVALID");
  }

  return state;
}

export function assertPhase2gCleanupBlobCountsV39(
  counts: Record<string, unknown>,
  expected: number,
  completed = false,
): void {
  const total = Number(counts.total);
  const live = Number(counts.live);
  const verified = Number(counts.verified_for_run);

  if (
    ![total, live, verified].every(
      n => Number.isSafeInteger(n) && n >= 0,
    ) ||
    total !== expected ||
    live + verified !== total ||
    (completed && live !== 0)
  ) {
    throw new Error("PHASE2G_CLEANUP_REPLAY_BLOB_SET_MISMATCH");
  }
}

/**
 * Recover a VERIFIED session only with its original subscription
 * identity, supplied from previously preserved trusted evidence.
 * Journal-scope verification occurs separately before provider reads.
 */
export function resolvePhase2gRecoverySubscriptionV39(input: {
  hasRuntime: boolean;
  journalState: string | null;
  runtimeSubscriptionId: string | null;
  probeSubscriptionId: string | null;
  manualRecoverySubscriptionId: string | null;
}): string {
  const runtime = String(input.runtimeSubscriptionId ?? "").trim();
  const probe = String(input.probeSubscriptionId ?? "").trim();
  const manual = String(input.manualRecoverySubscriptionId ?? "").trim();

  const verifiedWithoutRuntime =
    !input.hasRuntime && input.journalState === "VERIFIED";

  if (manual && !verifiedWithoutRuntime) {
    throw new Error("REFUSED:MANUAL_RECOVERY_NOT_VERIFIED");
  }

  if (!input.hasRuntime && !verifiedWithoutRuntime) {
    throw new Error("REFUSED:RECOVERY_RUNTIME_AND_JOURNAL_MISSING");
  }

  if (verifiedWithoutRuntime && !manual) {
    throw new Error("REFUSED:VERIFIED_RECOVERY_SUBSCRIPTION_REQUIRED");
  }

  if (runtime && probe && runtime !== probe) {
    throw new Error("REFUSED:PROVIDER_SUBSCRIPTION_IDENTITY_CONFLICT");
  }

  const resolved = verifiedWithoutRuntime
    ? manual
    : (runtime || probe);

  if (!/^[A-Za-z0-9_.:-]{1,200}$/.test(resolved)) {
    throw new Error("REFUSED:RECOVERY_SUBSCRIPTION_ID_INVALID");
  }

  return resolved;
}
