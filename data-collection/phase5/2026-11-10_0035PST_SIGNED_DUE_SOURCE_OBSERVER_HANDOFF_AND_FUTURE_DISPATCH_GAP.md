# Phase 5 — exact signed source packet ↔ actual V0079 due-queue handoff

**Checkpoint captured:** 2026-11-10 08:35:12 UTC / 2026-11-10 00:35:12 PST (America/Los_Angeles).
**State at authoring:** REVIEW BRANCH; exact-head CI not yet verified. This is a dated engineering checkpoint, not a claim of Phase 5 FREEZE, a license to use vendor Contents, or paid Phase 6 activation.
**Canonical repo:** HKcode22/ReplitTranvr.
**Verified parent main:** 03155ee1bff480122944530bbf04b58ea0ae90db, PR #539 merged. Its [post-merge V3.9 Offline Safety run #42781718880](https://github.com/HKcode22/ReplitTranvr/actions/runs/42781718880) completed SUCCESS at the live read.
**Working branch:** phase5/signed-due-source-handoff-no-provider-20261110. Later commits/PR/CI/merge status must be checked before using this checkpoint as release evidence.

## Motivation: one remaining real connection; no new source collector

PR #528 installed an off-by-default scheduled GitHub read-only V0079 source due-queue observer. PR #529 connected existing Stage7/8 source-query identity to actual PREPARED V0079 rows and strict one-GET source release. PRs #530 and #531 connected native T24 PRE with independently committed witness and future T6/T90 use. PR #538 implemented one signed future POST V0083 owner; PR #539 added a strictly nonpaid main-only independent REST LOGIN/ACL readiness verifier.

**The runtime gap:** an actual read-only GitHub queue observation reports WHICH future V0079 requests are due, but the unattended 31-day workflow must not treat that queue as authorization or guess the selected frozen source query. For one concrete already-approved source packet, it must check the **raw bytes SHA**, immutable selected flight-day/site/horizon/early-draw SHA and LIVE saved queue row (including real database clock, planned/hard cutoff and existing prearm/reservation/original) before proposing paid work. A queue row could have changed since offline review, and a valid signed JSON file may be not yet due.

## Exact implementation in review

1. **New pure verification module:** server/lib/disruption/phase5SignedDueSourceOnePacketHandoff_v39.ts. Function reviewP5OneSignedPacketAgainstActualDueQueue takes the already authenticated PostgreSQL source queue scan, the bytes of one previously reviewed frozen release JSON, parsed JSON and independently configured pins. It requires a SHA256 of the complete bytes (not a reconstructed string), source manifest/query/release/rights/provider hashes, exact airport, day 1–31, time horizon and one physical two-unit GET. It refuses cross-airport or cross-draw substitution, changed local provider source contract, changed query digest, invalid packet path or weak attempt caps. It reuses existing requireP5SignedOneGetInActualDueQueue on eligible current rows instead of inventing another admission algorithm. This does **not** authenticate legal rights merely because a rights SHA matches.
2. **Real observer hookup:** scripts/v39_phase5_github_source_upcoming_queue_readonly_v39.ts retains its dedicated SOURCE login, actual read-only PostgreSQL transaction and independent release guards. An **optional** P5_SOURCE_SIGNED_PACKET_OBSERVER_ENABLED=true adds a strictly file-path-limited read of one frozen JSON; it prints a bounded signedPacketHandoff classification. When missing/disabled, existing queue observer behavior is preserved. No GitHub child dispatch, source reservation, HTTP or Alert happens in either mode.
3. **Existing schedule wired, not another cron:** .github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml remains the existing 10-minute default-OFF queue observer. It gains optional nonpaid packet path/sha/digest inputs and PR test coverage. Scheduler activation still separately requires approved main SHA, source-use, Phase5 FREEZE and distinct Phase6 GO. The optional packet bridge is not an automatic paid-release toggle.
4. **Regression tests:** tests/phase5_signed_due_source_one_packet_handoff_v39.test.ts uses synthetic date/airport and V0079 metadata. It covers exact due-readiness, outside lookahead, too early, already prearmed/reserved, STOPPED, missed/late censor, missing actual PREPARED row, raw bytes/hash drift, rights/digest tampering, incorrect airport/query/early draw, and >1 paid attempts. Tests do not expose real database credentials or flight Contents and cannot certify production source-use rights.

### Decision labels and operator meaning

| Status | Meaning | Permissible next step |
| --- | --- | --- |
| SIGNED_QUERY_DUE_FOR_INDEPENDENT_RELEASE_NO_DISPATCH | One signed packet exactly matches an authentic now-due, unreserved source row | Future distinct paid dispatcher may independently verify budget/rights/packet and authorize **one** child run; this function never does so |
| SIGNED_QUERY_NOT_YET_IN_DB_QUEUE_LOOKAHEAD | The one signed request is over two hours ahead, so absent from bounded queue | Continue nonpaid schedule; do not invent an empty-query failure |
| SIGNED_QUERY_TOO_EARLY_FOR_SAFE_DISPATCH | Saved real query exists but greater than 105min before dispatch | Remain idle, continue read-only checks |
| SIGNED_QUERY_ALREADY_PREARMED_OR_RESERVED_NO_REDISPATCH | Paid owner may already have taken control | Do not issue another child run or double-charge |
| SIGNED_QUERY_STOPPED_NO_DISPATCH | Source row STOPPED | No GET; count correctly |
| SIGNED_QUERY_MISSED_OR_TOO_LATE_CENSOR | Valid prearm lead or physical hard deadline lost | Preserve missedness; never create retrospective PRE |
| SIGNED_QUERY_EXPECTED_DB_ROW_MISSING_HOLD | Signed exact request should be visible but is not present | Specific anomaly/HOLD; do not fabricate source row |

### Why this is scientifically and operationally balanced

A missed source slot or a partial valid PRE is **not** grounds to invalidate a whole 31-day experiment. Preserve actual time-correct observations, count missing outcomes honestly, permit versioned prospective calendar replacement of not-yet-touched dates within agreed constraints, and avoid arbitrary additional phase gates. Nonnegotiable minimal controls are no fabricated PRE time, no future-data leakage, correct source identity/evidence tier, actual budget limits and lawful permitted use. The first-cycle prediction target is still deliberately open; no provider schedule revision was secretly adopted. Preserve A, B, C, D1, D2 and proposed E without overwriting their distinct historical interpretations.

## Still NOT completed as of this checkpoint

- Actual release-signed per-query source packet(s), lawful account-specific source Contents/ML retention policy ([issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300)), and true physical UTC seven REST category budgets/independent Alert credits.
- Full **unattended** signed GitHub PAID child dispatch: this PR only links the selected exact frozen packet to the live queue for a future dispatcher. Existing one-paid-source worker still demands a manual workflow_dispatch and one globally pinned query; scalable multiquery 31-day dispatch needs independent review, replay-safe per-query release registry, job concurrency and duplicate suppression.
- Actual POST V0083 dedicated REST LOGIN commissioning/independent source persistence grant readback. PR #539 added readiness auditing code, but no real production credential provisioning or SQL readback was claimed.
- Automatic future-day early four-site draws, prospective 31 ordered parent dates (26 ordinary, 3 split, 2 extended; 5 matched crossover pairs; 21 ordinary adaptive airport identities remain future unknown), T24→witness→T6/T90→future POST/receiver/Alert STOP and Day1 abort/missingness.
- One prospective minimum first-cycle prediction target, permitted outcomes and source evidence definitions; independent scientific FREEZE, then a **separate** paid Phase6 GO. A complete 31-day dataset, perfect actual-label coverage and final model algorithms are Phase6/7 tasks, not Phase5 prerequisites.

## Verification method and recovery instructions

1. Inspect current main, current branch/PR and exact head GitHub Actions. A file on a branch or passing unit tests alone is not a verified merged implementation.
2. Run PR secretless signed-handoff regression and full V3.9 safety, actual disposable PostgreSQL compatibility. The live signed-queue observer must be **SKIPPED on PR**, and source calls/DB mutations must remain zero. Check exact-head SHA; merge only after successful executable CI.
3. After merge, verify main exact commit and postmerge CI; append immutable factual result in issue #416 and the assistant handoff, with UTC/PST timestamps. Do not retrofit this authoring checkpoint to claim a past test result.
4. Future engineering follows one finite path: scalable signed per-query release catalog and actual unattended paid child GitHub dispatch (with hard independent provider rights and budget guards), then T24 witness, later PRE, future POST, receiver/STOP and daily QA. **Reuse** the signed manual child and existing queue; no new timing service, Cloudflare or Replit AI Agent.
5. Do not repeat Phase2G YSSY paid probes, Nov6 WSSS source pilot, V0079–V0083 migrations or historical account quota questions. No Replit Shell action is needed for this read-only review branch.

**At creation:** provider GETs 0, Alerts 0, production DB writes 0, GitHub child paid dispatches 0. Phase5 scientific FREEZE HOLD / paid Phase6 GO NO.
