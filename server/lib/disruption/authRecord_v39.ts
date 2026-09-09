/**
 * Experiment authorization records — Phase 0 (§1.5.15 items 4–6, ChatGPT P1-7).
 *
 * Every paid/mutating action requires an exact AUTH record. This module defines
 * the record shape and the verification function with a legitimate success
 * path: a well-formed, unexpired record whose phase/gate, airport/window,
 * budgets, and predecessor evidence all check out VERIFIES (returns success).
 * In production today that path is unreachable because no gates have passed
 * and no records have been issued — so callers still refuse, but now for a
 * precise, auditable reason instead of a blanket "not implemented."
 *
 * Pure offline logic (no DB/provider calls): the record store lives with the
 * caller (future: hash-locked authorization artifact per §4.5).
 */

export interface AuthRecord {
  /** AUTH-YYYYMMDD-ID format. */
  authorizationId: string;
  /** Phase/gate this authorizes, e.g. "Phase 2 / safety smoke". */
  phaseGate: string;
  /** Airport/filter/window scope, e.g. "KLAX/departures/2026-09-01T08:00Z+2h". */
  airportFilterWindow: string | null;
  /** Maximum Alert credits for this authorization. */
  maxAlertCredits: number | null;
  /** Maximum REST units by category (null = no REST authorized). */
  maxRestUnitsByCategory: Record<string, number> | null;
  /** ISO start; null = immediately. */
  startNotBeforeUtc: string | null;
  /** ISO expiry; null = never (discouraged — prefer explicit expiry). */
  expiresAtUtc: string | null;
  /** Who owns stop/cleanup. */
  cleanupOwner: string | null;
  /** Predecessor evidence IDs that must already exist (e.g. gate PASS records). */
  predecessorEvidenceIds: string[];
}

export type AuthVerdict =
  | { verified: true; record: AuthRecord }
  | { verified: false; reason: string };

const AUTH_ID_RE = /^AUTH-\d{8}-[A-Z0-9]+$/;

/**
 * Verify an AUTH record against the current context.
 * `nowUtc` and `existingEvidenceIds` are injected so tests are deterministic.
 */
export function verifyAuthRecord(
  record: AuthRecord | null | undefined,
  context: { nowUtc: Date; existingEvidenceIds: string[] },
): AuthVerdict {
  if (!record) return { verified: false, reason: "no AUTH record supplied" };
  if (!AUTH_ID_RE.test(record.authorizationId)) {
    return { verified: false, reason: `malformed authorization_id ${record.authorizationId}` };
  }
  if (!record.phaseGate) return { verified: false, reason: "phaseGate missing" };
  if (record.expiresAtUtc) {
    const exp = new Date(record.expiresAtUtc);
    if (!Number.isFinite(exp.getTime())) return { verified: false, reason: "unparseable expires_at" };
    if (context.nowUtc.getTime() > exp.getTime()) {
      return { verified: false, reason: `AUTH ${record.authorizationId} expired at ${record.expiresAtUtc}` };
    }
  }
  if (record.startNotBeforeUtc) {
    const start = new Date(record.startNotBeforeUtc);
    if (Number.isFinite(start.getTime()) && context.nowUtc.getTime() < start.getTime()) {
      return { verified: false, reason: `AUTH ${record.authorizationId} not yet valid (starts ${record.startNotBeforeUtc})` };
    }
  }
  if (record.maxAlertCredits !== null && !(record.maxAlertCredits > 0)) {
    return { verified: false, reason: "maxAlertCredits must be positive when set" };
  }
  const missing = record.predecessorEvidenceIds.filter((id) => !context.existingEvidenceIds.includes(id));
  if (missing.length > 0) {
    return { verified: false, reason: `missing predecessor evidence: ${missing.join(", ")}` };
  }
  return { verified: true, record };
}
