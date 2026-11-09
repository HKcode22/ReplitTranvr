# Phase 5 — signed one-GET source now cross-checks live V0079 source queue (no paid run)

**Nov 9, 2026 — engineering checkpoint; release remains HOLD.**

## Exact integration and why it matters

PR #528 already installed an OFF-by-default scheduled read-only SOURCE-role observer of actual V0079 prepared query metadata, with V0080 prearms, V0079 physical reservations, original binding and PostgreSQL primary DB clock. The existing **main-only manual** paid single-GET worker already had signed packet SHA, code SHA, SOURCE role, provider range and hard one-attempt V0079/V0080 guards, but it had not consumed that queue. A signed JSON packet cannot prove that the saved query is still PREPARED, unreserved or inside its valid future window.

This change attaches the **existing** `auditP5UpcomingSourceQueue()` to the **existing** `scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts`, after signed release admission but **before** V0080 durable prearm. No new DB permission, migration, source service, external provider, clock scheduler or CI billing is added.

### Verified preflight design (code is a release-gated candidate, not a paid experiment)

1. The existing exact signed raw bytes and one-GET release guard still run first. The worker opens only its already-commissioned, scoped SOURCE login and reads V0079/V0080 source metadata in `REPEATABLE READ READ ONLY` with genuine PostgreSQL `clock_timestamp()`.
2. The selected signed one-GET query digest must appear **exactly once** among current prepared queue rows and have `DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH` status, meaning 15–105 minutes before signed dispatch at this read. The saved `query_key`, run-day index, slot, horizon, ICAO, immutable early-draw SHA and planned dispatch UTC must all match the signed selected acquisition. Any already reserved/prearmed/original-bound, STOPPED, expired, wrong or missing query is **HOLD**, never a fallback to a newly selected airport or historical retry.
3. Only after that fresh check does the existing V0080 actual-run prearm + database-clock wait proceed. Immediately before V0079 physical reservation, check the **actual database clock again** against the saved `hard_latest_dispatch_utc` — if elapsed, abort **before spending**. All existing V0079 serializable one-attempt/one-original controls and downstream provider logic remain authoritative; a queue status is **never** source-use permission.
4. The scheduled queue observer remains **OFF** and does **not dispatch** this worker. The paid workflow remains **main-only manual** with its independent source-use/freeze/code/JSON/role/price/review gates. The PR and CI have **zero provider credentials or paid calls**, and make no live production DB writes.

### Changed technical files

- `server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39.ts`: retain actual saved query key and early draw SHA in queue metadata; `requireP5SignedOneGetInActualDueQueue()` validates exact signed acquisition against primary DB queue; `requireP5PaidGetBeforeHardLatest()` checks post-wait hard deadline.
- `scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts`: calls the queue preflight before V0080 prearm and independently checks DB clock after wait before the paid physical reservation.
- `tests/phase5_source_upcoming_due_queue_readonly_v39.test.ts`: positive exact source match, changed signed query/airport/slot/horizon/day/early SHA/time, STOPPED/reserved/prearmed/too-close and just-at/after-hard-latest refusals.
- `.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml`: offline CI path now runs when one-GET source owner script changes; no paid execution is added.

### Evidence / boundaries for next session

At creation the branch is **engineering review**, not yet independently validated or merged. Inspect its exact PR head SHA, executable GitHub Actions checks, and postmerge main safety run before claiming completion. Existing #528 postmerge PG16 and full offline-safety are green. Never infer this change is a full unattended dispatcher, a completed POST/STOP owner, an actual 31-day calendar or source/retention approval.

The actual remaining Phase 5 deliverables stay the same: independently adopt one first-cycle target and lawful source-use/expiry protocol; freeze the real future 31-parent calendar and physical seven-category UTC budgets without pre-drawing 21 adaptive days; assemble fully unattended **authorized** source→three PRE horizons + independent T24 witness→POST/receiver/STOP and unbiased missingness; independent scientific FREEZE, followed by separate Phase6 paid GO.

**No historic Phase2–4 paid pilot, V0079–V0083 install, real provider request or Replit Shell action in this change. Scientific FREEZE HOLD / Phase6 paid GO NO.**
