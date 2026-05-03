// Hotels Phase 5 — Admin-issued booking approval tokens.
//
// A booking attempt against the hotels module requires (among other
// guardrails) a single-use, short-lived, hotel-option-scoped approval
// token issued by an admin via POST /api/admin/hotels/booking-approval.
//
// This module is intentionally in-memory only for Phase 5. Persisting
// tokens (so they survive a server restart) is a follow-up task — see
// `replit.md` Phase 5 notes. The tradeoff is acceptable here because:
//   * tokens have a 30-minute TTL,
//   * losing them on restart only blocks the next booking attempt
//     (admin re-issues), it never causes a charge,
//   * admin volume in Phase 5 is single-digit per day.
//
// Security properties:
//   * `consumeBookingApprovalToken` deletes the token on the FIRST
//     lookup, regardless of whether the lookup succeeds — replays of a
//     wrong-option or expired token are still burned, so an attacker
//     can't fish the same token against multiple option ids.
//   * Tokens carry a `maxTotalUsd` so the booking endpoint can verify
//     the per-attempt cap matches what the admin approved at issuance
//     time, even if the env var changes between issuance and use.
//   * Random 32-byte hex (256 bits of entropy) — not guessable.

import { randomBytes } from "crypto";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface BookingApprovalRecord {
  token: string;
  hotelOptionId: number;
  maxTotalUsd: number;
  expiresAt: number; // epoch ms
  issuedByUserId: string;
  issuedAt: number;
}

const approvals = new Map<string, BookingApprovalRecord>();

// Best-effort sweep of expired entries on every issue/consume so the map
// can't grow unbounded under load. O(n) but n is tiny in Phase 5.
function sweepExpired(now: number): void {
  // forEach avoids the downlevel-iteration TS flag — the build target
  // doesn't enable for-of on Maps.
  const expired: string[] = [];
  approvals.forEach((rec, token) => {
    if (rec.expiresAt < now) expired.push(token);
  });
  for (const t of expired) approvals.delete(t);
}

export function issueBookingApprovalToken(args: {
  hotelOptionId: number;
  maxTotalUsd: number;
  issuedByUserId: string;
}): BookingApprovalRecord {
  const now = Date.now();
  sweepExpired(now);
  const rec: BookingApprovalRecord = {
    token: randomBytes(32).toString("hex"),
    hotelOptionId: args.hotelOptionId,
    maxTotalUsd: args.maxTotalUsd,
    issuedByUserId: args.issuedByUserId,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };
  approvals.set(rec.token, rec);
  return rec;
}

export type ConsumeFailure = "missing" | "expired" | "wrong_option";

export function consumeBookingApprovalToken(
  token: string,
  hotelOptionId: number,
): { ok: true; record: BookingApprovalRecord } | { ok: false; reason: ConsumeFailure } {
  if (!token || typeof token !== "string") return { ok: false, reason: "missing" };
  const now = Date.now();
  sweepExpired(now);
  const rec = approvals.get(token);
  if (!rec) return { ok: false, reason: "missing" };
  // Burn the token on first lookup — regardless of validity outcome — so
  // a leaked token cannot be replayed against different option ids.
  approvals.delete(token);
  if (rec.expiresAt < now) return { ok: false, reason: "expired" };
  if (rec.hotelOptionId !== hotelOptionId) return { ok: false, reason: "wrong_option" };
  return { ok: true, record: rec };
}

// Test/debug helper — not exported via routes. Lets unit tests reset
// state between cases without restarting the process.
export function _clearAllApprovalsForTest(): void {
  approvals.clear();
}
