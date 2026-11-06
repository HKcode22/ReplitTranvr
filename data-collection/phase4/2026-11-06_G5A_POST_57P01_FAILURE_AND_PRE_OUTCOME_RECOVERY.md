# November 6 G5A WSSS POST 57P01 failure, controlled recovery and scientific risk register

**Created Fri Nov 6, 2026 PST, ~06:00. Status: production repair merged, replacement POST dispatch pending real GitHub+DB checks; Gate 5 scientific PASS = FALSE.** This is a time-stamped *operational checkpoint*, not a release claim. The documentation branch/PR #409 remains separate and must not be merged during collection.

## A. PRE operational proof — distinguish from scientific proof

Historical live PRE source execution main SHA: `66ff4908cbd63a19668485c935da49fc18652654`. Frozen manifest bytes SHA256: `02865331b9137c2ffb4d7e2b0a8c2a6016d0838051fd04f09a44c6f02e238667`.

| Horizon | Github owner job | Real original-bound observations reported | New cutoff-safe PRE reported | Independent evidence |
|---|---|---:|---:|---|
| T−24h | [#42022373703](https://github.com/HKcode22/ReplitTranvr/actions/runs/42022373703) | 3/3 | 12 | Owner read-only DB checked 12 stored ontime, no late and valid frozen anchors |
| T−6h | [#42159915594](https://github.com/HKcode22/ReplitTranvr/actions/runs/42159915594) | 3/3 | 12 | Owner read-only DB checked 12 ontime and no late; final GH log 12 new PRE |
| T−90m | [#42193627043](https://github.com/HKcode22/ReplitTranvr/actions/runs/42193627043) | 3/3 | 12 | At 04:44 PST independently 2/2 due PRE valid, 0 missing; final 05:30 GH log 12 newly written; final DB recheck still pending |

There were `9` PRE physical source requests = three horizons × three slots, `18` project units reserved if all attempts were one unit-2 calls. Each source had 48 normalized records and 12 source-qualified keys. These do **not** represent 48 certified operated flights. The 12 flight-identity candidates × 3 horizons = **36 PRE candidate snapshots** if all final independent database checks confirm on-time identical frozen T. "12/12" is a specific operational denominator, not a statistical guarantee of generalizability.

## B. POST failure: exact evidence and what failed

- [Failed POST GitHub Actions run #42227608751](https://github.com/HKcode22/ReplitTranvr/actions/runs/42227608751) began ~**05:42 PST**, failed **05:43:47 PST** under original main SHA `66ff4908...`.
- Node.js printed an unhandled `pg.Client` **'error' event** with PostgreSQL SQLSTATE `57P01` and message "terminating connection due to administrator command". This is consistent with a backend shutdown/restart, not proof of a faulty SQL query or invalid PRE data.
- The original POST program held a single DB client idle during `waitUntil(POSTS[0])` with no explicit `error` event listener or idle heartbeat. The real first POST physical GET was hard-coded for **07:40 PST**, nearly two hours **after** the crash. Given the reviewed code's ordering, this failed run did not reach its POST attempt-reservation/provider-GET loop.
- Temporal evidence alone isn't the final money/custody audit: before any replacement POST run, require independent **read-only** `adb_rest_attempt_ledger` check for `G5A_NOV06_1400Z_<frozen sha prefix>` + category `g5a_post_schedule_fids`, expecting **0**, with internal reserved budget **18/24**. Do not interpret a missing provider receipt as refunded billing.
- Do **not** repeat any T24/T6/T90 PRE; immutable historical evidence remains intact. No backdating or paid source replays.

## C. Narrow repaired implementation

- [PR #410](https://github.com/HKcode22/ReplitTranvr/pull/410) was merged from isolated fix branch `fix/g5a-nov06-post-57p01-idle-guard` at **~05:54 PST**. New production main SHA: `b05cc2afb2f10eace38a0ce6576a44a6f7289a34`. This is a documented *pre-POST-outcome infrastructure-only amendment* after the successful PRE owners; it is **not** a silent revision of those existing source results.
- New code blob: `scripts/v39_phase4_gate5_g5a_nov06_1400z_prospective_post_schedule_observation.ts` = `7ec3cef93a689678b7df45d53ea2e50646bb110c`; workflow blob `d51c746c18f60fe75e753262238616ac84b58384`; unchanged frozen grid blob `e08a1d19e684f58c63b654e72e6f4f5039832def`.
- The POST client now subscribes to PostgreSQL `error` and `end`, sanitizes SQLSTATE, and performs **read-only database clock probes every ≤15s while waiting**, with up to three bounded re-connect attempts under the identical restricted credentials for idle-session loss. No replay/retry of any ambiguous effectful POST slot reservation, provider GET, raw original insert or label/aggregate write. This is protection against **idle termination**, **not zero outage risk** if the backend fails during effectful work.
- PR targeted POST offline CI completed **18/18 tests, three files**, including a test emitting a real synthetic EventEmitter `57P01` without unhandled process crash. New main push-triggered offline CI also succeeded. These are regression tests, not live-provider certification.
- docs course stays on [draft PR #409](https://github.com/HKcode22/ReplitTranvr/pull/409), unmerged; no further source-owner main changes.

## D. Approved, fail-closed replacement POST prearm only

User should run a single reviewed Replit shell command (issued in live chat on Nov 6), with guards: current time before Fri **07:05 PST** (allow runner admission margin), exact amended main+blob pins; original failed POST #42227608751 as **the sole** past reviewed POST dispatch; T24/T6/T90 GH runs all completed/success; in one `REPEATABLE READ READ ONLY` DB transaction verify (1) three owner-original bindings each, (2) 12 ontime distinct PRE per horizon, (3) 12 common same-T G5A flight identity keys, (4) zero `g5a_post_schedule_fids` prior reservation rows, (5) reserved 18/24 budget. If any HOLD, no new dispatch, diagnose actual data. If all true, use `gh workflow run phase4-gate5-g5a-nov06-1400z-wsss-real-post.yml --ref main` **once**, not direct Replit AeroDataBox access.

After dispatch, verify real GitHub `post-source` job ACTIVE and actual `started_at` before **07:25 PST**; provider source slots Fri **07:40/08:10/08:40 PST**, POST aggregate after **09:01 PST**, independent read-only audits Fri **09:12/09:18/09:24/09:30 PST**. GitHub backups at 06:40–07:22 are best-effort and must not create a second paid source owner.

## E. Scientific/mathematical risk register (NO zero-risk claims)

| Concern | What evidence supports | What remains uncertain |
|---|---|---|
| Technical timeliness | GH source owners have verified start times; source-original and PRE cutoff snapshots are persisted; ontime counts checked at several points | Final independent multi-horizon join, exact availability/commit timing across all 36 rows |
| Population denominator | 12 currently qualified G5A operating identity keys and 48 normalized observations/source | Provider-native IDs versus **conditional composite** identities, duplicate marketing codeshares, ambiguous scope, physical operating-leg completeness |
| Outcome semantics | Current POST is designed to measure change in provider-reported **scheduled-departure timestamp** by W=T+2h | **NOT actual takeoff/wheels-off**, nor ADS-B coverage; limited ability to infer passenger disruption |
| Missing outcomes | Dedicated UNKNOWN categories; missing data not classified negative | Informative missingness, differential coverage by flight/time, survivorship/selection bias |
| Source-use rights | V0077 original binding and 23h code-based source-use clocks, frozen PRE extracted on-time | Independent provider-specific legal retention permissions; prior raw original expiry cannot be bypassed by keeping a hash |
| Cost | Source project budget is capped at 24 internal reserved API units | Actual paid provider billing and receipts require independent comparison |
| Statistical inference | Real prospective timestamped 12-flight cohort is a demonstrable small validation example | A single one-hour airport cohort is not representative of all airports/airlines/seasons; n=12 provides **no** zero-error assurance or calibrated ML guarantee |
| Infrastructure | POST 57P01 idle-crash root cause, patched and regression-tested | Non-idle outages, lost network after reservations, provider changes, GH scheduling delays |

**Acceptance:** preserve evidence even when incomplete. Report **operational collection** separately from **scientific inference**. Never state `scientificGate5Passed=true`, `phase5FreezeAuthorized=true`, lawful rights, native wheels-off, or unbiased measured model outcomes without independently established grounds. Plan f.8 v3.9 and existing implementation log remain binding; only a new prospective written protocol can change scope, never retrospective reinterpretation.
