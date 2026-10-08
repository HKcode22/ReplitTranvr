import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Exact-session, short-lived GitHub-issued attestation for Phase-2G raw cleanup.
 * The callback receiver deliberately NEVER calls AeroDataBox or holds its API key.
 * This authorizes cleanup only; it cannot authorize provider account mutations.
 */
export interface Phase2gCleanupAttestationV39 {
  schema: "v39.phase2g-provider-inactive-cleanup-attestation.v1";
  callback_origin: string;
  session_id: string;
  probe_id: number;
  probe_budget_day_id: string;
  icao: string;
  provider_subscription_id: string;
  deletion_run_id: string;
  expected_live_blobs: number;
  active_billable_subscriptions: 0;
  provider_inventory_checked_at_utc: string;
  expires_at_utc: string;
}

const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;
const FIELD_NAMES = [
  "schema", "callback_origin", "session_id", "probe_id", "probe_budget_day_id",
  "icao", "provider_subscription_id", "deletion_run_id", "expected_live_blobs",
  "active_billable_subscriptions", "provider_inventory_checked_at_utc", "expires_at_utc",
].sort();

function isExactHttpsOrigin(value: unknown): value is string {
  if (typeof value !== "string" || !/^https:\/\/[^/]+$/.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.origin === value && parsed.username === "" && parsed.password === "";
  } catch { return false; }
}

/** Strict shape validation avoids alternate interpretations of signed claims. */
export function parsePhase2gCleanupAttestationV39(
  raw: unknown,
  now: Date = new Date(),
): Phase2gCleanupAttestationV39 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CLEANUP_ATTESTATION_BODY_INVALID");
  }
  const value = raw as Record<string, unknown>;
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(FIELD_NAMES)) {
    throw new Error("CLEANUP_ATTESTATION_FIELDS_INVALID");
  }
  if (value.schema !== "v39.phase2g-provider-inactive-cleanup-attestation.v1" ||
      !isExactHttpsOrigin(value.callback_origin) ||
      typeof value.session_id !== "string" || !UUID_V4.test(value.session_id) ||
      !Number.isSafeInteger(value.probe_id) || Number(value.probe_id) <= 0 ||
      typeof value.probe_budget_day_id !== "string" ||
      !/^P2G-S1-\d{8}-\d{1,5}$/.test(value.probe_budget_day_id) ||
      typeof value.icao !== "string" || !/^[A-Z]{4}$/.test(value.icao) ||
      typeof value.provider_subscription_id !== "string" ||
      !/^[A-Za-z0-9_.:\-]{1,200}$/.test(value.provider_subscription_id) ||
      typeof value.deletion_run_id !== "string" ||
      !/^[A-Za-z0-9_.:\-]{8,160}$/.test(value.deletion_run_id) ||
      !Number.isSafeInteger(value.expected_live_blobs) ||
      Number(value.expected_live_blobs) < 0 || Number(value.expected_live_blobs) > 1000 ||
      value.active_billable_subscriptions !== 0 ||
      typeof value.provider_inventory_checked_at_utc !== "string" ||
      typeof value.expires_at_utc !== "string") {
    throw new Error("CLEANUP_ATTESTATION_CONTRACT_INVALID");
  }
  const checkedAt = Date.parse(value.provider_inventory_checked_at_utc as string);
  const expiresAt = Date.parse(value.expires_at_utc as string);
  const nowMs = now.getTime();
  if (!Number.isFinite(checkedAt) || !Number.isFinite(expiresAt) ||
      !Number.isFinite(nowMs) ||
      checkedAt > nowMs + 30_000 ||
      nowMs - checkedAt > 120_000 ||
      expiresAt <= checkedAt ||
      expiresAt > checkedAt + 120_000 ||
      expiresAt <= nowMs) {
    throw new Error("CLEANUP_ATTESTATION_STALE_OR_INVALID_TIME");
  }
  return value as unknown as Phase2gCleanupAttestationV39;
}

const SIGNING_DOMAIN = "v39.phase2g.remote-cleanup.provider-inactive.v1\n";
function signedInput(value: Phase2gCleanupAttestationV39): string {
  return SIGNING_DOMAIN + JSON.stringify({
    schema: value.schema,
    callback_origin: value.callback_origin,
    session_id: value.session_id,
    probe_id: value.probe_id,
    probe_budget_day_id: value.probe_budget_day_id,
    icao: value.icao,
    provider_subscription_id: value.provider_subscription_id,
    deletion_run_id: value.deletion_run_id,
    expected_live_blobs: value.expected_live_blobs,
    active_billable_subscriptions: value.active_billable_subscriptions,
    provider_inventory_checked_at_utc: value.provider_inventory_checked_at_utc,
    expires_at_utc: value.expires_at_utc,
  });
}

function requireSecret(secret: string): void {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("CLEANUP_ATTESTATION_SECRET_NOT_CONFIGURED");
  }
}

/** Only the GitHub-side attester should call the signing function. */
export function signPhase2gCleanupAttestationV39(
  value: Phase2gCleanupAttestationV39,
  secret: string,
  now: Date = new Date(),
): string {
  requireSecret(secret);
  const parsed = parsePhase2gCleanupAttestationV39(value, now);
  return createHmac("sha256", secret).update(signedInput(parsed)).digest("hex");
}

export function verifyPhase2gCleanupAttestationV39(
  body: unknown,
  hexProof: string,
  secret: string,
  exactCallbackOrigin: string,
  now: Date = new Date(),
): Phase2gCleanupAttestationV39 {
  requireSecret(secret);
  if (!isExactHttpsOrigin(exactCallbackOrigin)) {
    throw new Error("CLEANUP_ATTESTATION_ORIGIN_NOT_CONFIGURED");
  }
  const parsed = parsePhase2gCleanupAttestationV39(body, now);
  if (parsed.callback_origin !== exactCallbackOrigin) {
    throw new Error("CLEANUP_ATTESTATION_WRONG_AUDIENCE");
  }
  if (typeof hexProof !== "string" || !SHA256_HEX.test(hexProof)) {
    throw new Error("CLEANUP_ATTESTATION_PROOF_INVALID");
  }
  const expected = createHmac("sha256", secret).update(signedInput(parsed)).digest();
  const received = Buffer.from(hexProof, "hex");
  if (!timingSafeEqual(expected, received)) {
    throw new Error("CLEANUP_ATTESTATION_SIGNATURE_MISMATCH");
  }
  return parsed;
}
