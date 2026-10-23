# October 22, 2026 — Exact YSSY P25 probe19 31/32 administrative closeout WRITE CANDIDATE

**NOT AUTHORIZED FOR APPLY YET. User's consent in the preceding session covered deletion of 58 expired objects, not these SQL changes.** This write candidate extends [draft review PR97](https://github.com/HKcode22/ReplitTranvr/pull/97), retaining a standalone read-only reviewer and its zero-blocker receipt. Source is separate, not deployed or merged.

**Verified source read-only receipt:** `READY_FOR_EXACT_ADMIN_REVIEW_NOT_APPROVED`, `blockers=[]`, binding SHA256 `11912761b15f327530b64f17964ee757f65717cec9f5c1050f15bd9fc5a052dc`, strict provider active billable 0, source tombstones 58, deletion-run count 1 and 58 rows, historical `failed/DELIVERY_GAP` with external231/internal229/gap2; no DB writes/provider mutations.

**Proposed EXACT transaction (requires a NEW explicit separate approval):**
- `P25_ADMIN31_32_APPROVED=YES` and an operator-supplied `--apply --expected-binding <sha256>`. No GitHub Actions, and do not run without human authorization.
- Strict provider LIST (free, fail closed); DB identity `neondb/neondb_owner`, `SERIALIZABLE` transaction, budget advisory lock, `FOR UPDATE` on incident31+32 and exact budget, `FOR SHARE` on failed probe and reconciliation evidence. Require the original read-only witness to recompute `eligibleForReview=true` and the exact **unchanged** SHA-256 binding *inside the transaction*.
- Conditional update exactly **one** `clean.adb_probe_budget_day` from OPEN/cap500 to CLOSED, and exactly **two** `clean.adb_incident_stop` rows IDs31/32 from resolved=false to resolved=true, annotating each with receipt SHA and classification `YSSY_P25_FAILED_PROBE_EXPIRED_SOURCE_ADMIN_CLOSED`. Any count mismatch fails and rolls back.
- Explicitly never UPDATE probe19 or reconciliation evidence or provider content references. In-transaction recheck requires `failed/DELIVERY_GAP`, original `231/229/gap2`; all original deletion tombstones must be in place before starting.
- This is **administrative closure of the already-failed historical collection**, not certification of delivery completeness or mathematical acceptance. No fake `runtimeCleanupVerified=true` flag; source cleanup and historic uncertainty remain represented.
- No AeroDataBox paid calls, provider CREATE/DELETE, raw blobs, Replit AI Agent or deployments.

**Limitations:** Runtime strict LIST is a point-in-time account read, not a distributed provider-side transaction; independent post-commit readback of provider LIST, exact budget, both incidents and immutable scientific data remains mandatory. A SQL commit outcome can be ambiguous during a connection loss; do not auto-retry. Only collaborating writers heed the advisory key; this is a case-specific once-only manual operator. New TypeScript, negative/fault tests and exact-head GitHub CI must pass before any APPLY invocation.

**After this administrative closure:** still require the distinct user-authorized, independently supervised small live Alert Gate4 certification, and Gate3 prepaid/Gate05 scientific target reviews before Phase3 can actually be signed closed.
