# Phase 4 Gate 5 — committed physical FIDS attempt adapter (not paid yet)

**2026-10-31 PDT continuation.** Bind to Plan V3.9-f.8 §§5.1–5.4, 6, 7, 16–17. Dependency: merged PR #306 physical start/cutoff guard and staged, separately reviewed PR #307 V0076 LOGGED PostgreSQL attempt-uniqueness reservation. Neither currently authorizes a future paid scientific run.

## Implemented in this change

- New \`server/lib/disruption/phase4Gate5DbCommittedAttemptAdapter_v39.ts\` is the **Node-side transaction boundary** between the pure guard and V0076 \`clean.reserve_phase4_g5_fids_physical_attempt_v39\`. It does NOT import the actual AeroDataBox client and cannot send a network request.
- It checks same owner+source query+attempt binding, actual source physical start, **fresh free quota evidence** (at most 30 seconds old, nonzero remaining REST request capacity and sufficient remaining units), and current independently budgeted project reserve **before** opening a DB connection.
- It opens an explicitly injected/approved scoped DB client, begins \`SERIALIZABLE READ WRITE\`, sets bounded statement/lock timeouts, calls the V0076 unique reservation function using the exact manifest/owner/query SHA and GitHub run ID, then **COMMITs**. A duplicate, foreign GitHub run, overspending, stale or late source window is refused by V0076, independent of Node preflight.
- **After COMMIT**, the adapter takes a fresh clock reading and reexecutes the exact physical cutoff/budget guard. If GitHub/PostgreSQL delay passed the cutoff, it returns a **nonrefundable HOLD**; it does not refund an ambiguous reservation, cannot fake successful provider contact, and cannot retroactively backfill missing T−6h.
- Offline tests use mock DB clients and prove zero connection on stale quota/forged GitHub run; exactly one SQL reservation and COMMIT in order; ROLLBACK on SQL failure; **no ROLLBACK after successful COMMIT** on a late cutoff; zero network/provider code.
- Live release is explicitly **code-pinned NULL** at \`P4_G5_PAID_MANIFEST_RELEASE_PIN_V39\`; a separate reviewed exact-SHA activation PR must authenticate provider native T, real physical operating-leg identity, actual-only wheels-off, original data retention rights, verified service window, three physically running GitHub prearms, correct DB role grants and full source cost. The library's DB-only return always says \`authorizedProviderDispatch=false\` and \`strictGate5Passed=false\`.

## Not yet implemented

- A true main-only production three-horizon GitHub owner orchestration robust against GitHub cron lateness and six-hour hosted job lifetime, with a real future frozen cohort and separately verified actual owner-start windows. The three PR #306 jobs are rehearsals with simulated time, not real prearms.
- A separately reviewed production application of staged V0076 with an exact restricted role; it is never auto-applied in production by current CI.
- Final AeroDataBox actual physical GET sender integration after this committed-DB boundary. The existing legacy source sender can be reused only after the approved deterministic owner/cutoff/REST reservation is wired with a **fresh final check before the HTTP transport** and its response persisted raw-first. That integration must preserve 6+6 webhook callback policy (separate from at-most-three FIDS attempts), immutable original and output labels.
- Actual source-native selected-T/actual-only departure semantics issue #200 and data-use/backup retention terms issue #300 remain external evidence requirements. A current account free quota of 60k/59,974 units is not a source label or legal license.
- Prospective frozen full-grid flight cohort, true persisted eligible PRE via PR #304, independent callback/flight-outcome audit via PR #305, and scientific Gate5 acceptance issue #293. Phase5/6 remain HOLD.

**No Replit shell needed for this module. Zero paid AeroDataBox calls.** Real paid authorization acknowledged from user; no production paid campaign launched by this code, and the older missed October31 T−6h remains UNOBSERVED.
