# P06 — production-source duplicate-only storage readback outside PostgreSQL session row lock (default OFF)

**Status: draft PR #27 only — not merged, not deployed, not paid-approved.** Implemented October 11, 2026 UTC on `phase2g-p2g24-github-observer-20261009`. No Replit Shell, deployment, live provider subscription, paid calls, external cloud host, or production SQL writes.

## Root cause and deliberately limited scope

The **actual** `persistPrepaidProbeWebhookV39` in `server/lib/disruption/prepaidProbeRuntime_v39.ts` executes `SELECT clean.prepaid_probe_session_runtime ... FOR UPDATE` and holds that session row lock during App Storage upload/readback for NEW originals, and previously also during remote object-store readback for an EXISTING matching duplicate. This makes concurrent callbacks within the same owner queue behind slow storage. Prior real disposable PostgreSQL16 tests showed 22 distinct synthetic sends with 550ms fake storage I/O could eventually commit all while only 17 earned sender-observed HTTP 200 before a 10-second deadline. **This change does NOT solve that distinct-original bottleneck.**

Our faster two-phase raw-only experiment remains unintegrated because a hash-only PENDING intent cannot reconstruct original bytes lost before upload; original sender ledger / custody / 168h cleanup and crash-ambiguous COMMIT still need solutions. We avoid modifying the new-original path until those are secured.

## Implemented in the actual callback, guarded OFF by default

- The explicitly named operational switch `V39_PREPAID_DUPLICATE_PRELOCK_APPROVED=1` **and** `V39_CALLBACK_ONLY_RUNTIME=1` must both be set. With only one or neither, the existing receiver SQL+storage ordering is unchanged. Operator approval and published-equivalent proof are required before enabling; changing a repo file alone does **not** modify runtime env or published deployment.
- With both switches approved, each incoming canonicalized prepaid request checks for a **previously committed exact delivery** using a lightweight existing UNLOGGED-delivery/LOGGED-source-reference read-only SQL query **outside** the `FOR UPDATE` session-lock transaction.
- A missing, ambiguous, expired, invalid, malformed, mismatched or unavailable original reference causes a **legacy locked-path fallback** rather than a fast ACK. Valid reference requires exact signed *existing internal* delivery/body SHA, opaque object ID, content length, storage contract, source kind, provider source record ID, expected 168h retention and unexpired receipt UTC.
- For an existing candidate, App Storage download + complete SHA-256 and byte-for-byte comparison against the **canonical request representation** runs outside the shared row lock. No original object is uploaded, overwritten or deleted in this read-only precheck; source semantics and historical canonical JSON storage contract remain unchanged.
- Before any duplicate success response, the existing locked transaction again validates owner state, frozen provider subscription, session expiry, original LOGGED metadata and the previously observed source-receipt row. It compares the preflight metadata fields, including unchanged original object path, content SHA/bytes, source record, contract and expiry. Any race/change **fails closed**, never silently accepts stale preflight evidence. Where preflight is absent/failed, the ordinary locked readback still executes and preserves its error accounting.
- **HTTP 200 still requires the session success accounting COMMIT**. New ORIGINAL arrivals still use exactly the unchanged slow upload + readback **under the session lock** and must not 2xx before verified storage and committed physical-flight-v2 SQL. No original sender/first-edge UTC or billable provider item-count is independently authenticated here.

## Real disposable-PostgreSQL integration tests

Added to `tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts`:

1. Exact feature flag fail-closed: both required flags, no hidden default or automatic 6+6 enablement.
2. Insert an original with real V3.9+disposable PostgreSQL first. Enable the opt-in flag, simulate an **800ms duplicate object-store readback**. While the slow download is actually in progress, a second real PostgreSQL connection successfully runs `SELECT session_id ... FOR UPDATE NOWAIT` proving the duplicate is **not** holding the session row lock. After download/locked verification and COMMIT, only one LOGGED blob ref, one UNLOGGED scientific delivery, original single object and correct two success counters remain. No re-upload.
3. Mutate the LOGGED original-ref source record in PostgreSQL **during** a 500ms out-of-lock download. Duplicate must return an error, never 2xx; the original rows/object persist, callback request/failure accounting is correct.
4. All pre-existing actual HTTP route, malformed JSON, stale/missing blob, duplicate conflict, physical-flight-v2, credit, SIGKILL continuity and 10s sender deadline negative tests remain wired into the CI.

This is a limited **real paid receiver source-code improvement**: it may reduce *duplicate readback* head-of-line blocking in environments with frequent provider retries, but has **not** been observed or enabled on the public Replit deployment. It adds an extra read-only DB lookup to every request *when enabled*, including new originals, so operators must evaluate net per-window real traffic, pool contention, latency and billing before activation. If the precheck fails, the ordinary path may download the same original a second time, by design for safe failure accounting. It does not prove actual published Replit cold starts, sender ACK P95/P99, original incoming source census, upstream 260/259 credits, or scientifically full F.8.

**CI:** [GitHub Actions #38120014493](https://github.com/HKcode22/ReplitTranvr/actions/runs/38120014493) on code revision `b84923dc983a42971f0ef9bbb358d8fdb9155add`; must inspect completed jobs before reporting verified success.

## Release disposition and next larger blocker

**Current status: P06 partially improved, NOT closed.** A truly durable independent-original ingress/journal and correctly bounded 168h orphan storage lifecycle remain requirements before moving **NEW** original upload/readback out of the session lock. Source-first (provider original POST), crash-before-upload, crash-after-upload-before-SQL and unknown COMMIT outcomes must all fail without false 2xx or duplicate billable item accounting. Never switch paid active owner to the disposable raw-only two-phase prototype. Avoid authorizing any new Replit usage while operator's prior screenshot reported free allowance 100% used. No new Cloudflare or paid hosting is approved.

See [P01–P20 release ledger](2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [P05 earlier actual prelock deterministic SHA optimization](2026-10-11_P05_P06_REAL_PREPAID_RECEIVER_PRELOCK_SOURCE_PREPARATION.md), [P13 quarantined actual physical-v2 fixture recovery](2026-10-11_P13_ATOMIC_QUARANTINED_REAL_PHYSICAL_V2_FIXTURE_REHYDRATION.md), and [our joint missingness/6+6 decision](../decisions/2026-10-11_YSSY_6PLUS6_SCIENTIFIC_MISSINGNESS_DECISION_RECORD.md).
