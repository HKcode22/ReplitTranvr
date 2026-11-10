# Phase 5 — bounded signed per-day SOURCE registry using actual V0079 queue

**Checkpoint at authoring: 2026-11-10T09:12:10Z (2026-11-10 01:12:10 PST, America/Los_Angeles).** This file is a permanent, mutable engineering checkpoint; the recorded timestamp describes the status **when written**. Verify exact PR/head/check status separately before considering it merged. No paid collection, production database write, Alert activation or new production secret was executed by this change.

## Verified previous state

- Main `7b17e95408d1ff2a6c48a26e71dcc18a0ee7e367` after [merged PR #540](https://github.com/HKcode22/ReplitTranvr/pull/540); PR exact-head all five executable CI SUCCESS; independent postmerge V3.9 Offline Safety [#42785275890](https://github.com/HKcode22/ReplitTranvr/actions/runs/42785275890) **COMPLETED SUCCESS** on exact main (verified 2026-11-10 after previous session).
- PR #540's one-packet `phase5SignedDueSourceOnePacketHandoff_v39.ts` matches a SHA-pinned frozen source query to an actual restricted SOURCE-role PostgreSQL V0079 due row, with real DB clock, original/prearm/attempt conditions and no paid dispatch.
- Existing scheduled source observer `.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml` is default-OFF and has **one existing 10-minute cron**, not a paid worker; PR #538's future POST and PR #539's REST role-readiness script remain distinct and not proof of live release.

## Motivation / missing connection

The real f.8 day can expose multiple source queries over 4 airports × 3 PRE horizons × 26 ordinary/3 split/2 extended future-day shapes. A single frozen query selected globally through one secret is insufficient for a realistic 31 **ordered parent-day** collection and risks reviewing only one due request while the rest silently disappear. We need small, **per-day signed batch registries**, revised prospectively, that reuse the existing authenticated queue and one-packet proof without needing to pre-sign 31 days or decide the 21 future adaptive airport identities prematurely. This is not a new experimental calendar or a second source collector.

## New code in review — branch phase5/per-day-signed-source-batch-readonly-20261110

1. `server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39.ts`: `reviewP5SignedSourceDayBatchAgainstActualQueue(scan, registryRawBytes, registry, pins, readFrozenBytes)`. Requires immutable SHA256 of the actual registry bytes in `data-collection/phase5/frozen/`, one reviewed manifest/run-day and explicit external release/rights/provider pins. Bounds entries to 1–96 **unique** per-day query digests and paths; forbids registry self-reference, duplicate digest/file, across-day packet, tampered bytes, altered early draw, airport or source identity. Uses PR #540's existing one-packet reviewer for **each** genuine V0079 queue match rather than implementing new temporal/paid rules.
2. `scripts/v39_phase5_github_source_upcoming_queue_readonly_v39.ts`: optionally reads the per-day registry and its listed frozen packets, only when `P5_SOURCE_BATCH_REGISTRY_OBSERVER_ENABLED=true` and external registry SHA/path/day settings are present. It cannot run together with the older single-packet observer mode. It still requires the same signed main, SOURCE-role authenticated PostgreSQL READ ONLY observation. **No GitHub child dispatch or provider HTTP.**
3. Existing `.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml` adds opt-in registry file path, run-day index, SHA secret, PR unit test. The existing 10min schedule remains OFF unless separately enabled with lawful-source and Phase6 GO gates; the new registry option is **not** paid permission.
4. `tests/phase5_signed_per_day_source_batch_readonly_v39.test.ts`: two distinct future airports, one due/one reserved, missed/STOPPED, more than 2h outside queue scan (legitimate early, not false "missing"), expected row absent inside lookahead, changed bytes/day, duplicate digest/path/self reference, wrong airport/early draw/cross-day, and >96 unreviewed entries. Tests use memory-only synthetic JSON, no production secrets, provider Contents or DB writes.

## Meaning of outputs and operational safety

- `dueForIndependentReviewCount` counts **proposals**, not API calls or allocated credits. A future separate paid orchestrator must authenticate release, 7-category physical UTC REST and separate Alert credits, code SHA, immutable packet, actual V0079 prearm+reservation and legal data use before dispatch. The registry neither signs such releases nor assumes that a hash proves lawful Contents retention.
- `alreadyPrearmedReservedCount` prevents replay/double pay. `missedOrLateCount` preserves censored source horizons; `stoppedCount` preserves STOP; `dbMissingHoldCount` records an unexpected absent prepared query and must not silently assign a replacement airport.
- Missing horizons do not equal punctual service. Retain partial cutoff-valid PRE as qualified evidence; keep target-neutral POST until independent target selection. A fully untouched future day may be versioned/replanned prospectively under prelisted recovery rules, rather than treating one missed day as a full scientific invalidation.
- All original amendments **A/B/C/D1/D2/E** remain preserved; E is proposed, not adopted; the first-cycle primary prediction target is still OPEN. Do not declare "actual wheels off" from generic FIDS/POST, or claim fully unattended collection exists.

## Finite remaining Phase5 work after this PR

- **Still required:** genuine signed *future selected days* with corrected 26+3+2 segments, 5 matched pairs and future 21 adaptive draws; physical UTC 7 REST category budgets/independent Alert cap; actual vendor Contents/ML/source rights (#300), live POST V0083 REST LOGIN role and custody audit, one minimum useful target/evidence definition.
- **Software-critical path:** once per-day registry and read-only due reconciliation pass, implement independently authorized, idempotent multi-query **GitHub source child dispatch** with replay safety. Existing manual paid workflow forbids scheduled execution; do not silently weaken it. Connect actual SOURCE→T24 witness→T6/T90→future POST/receiver/Alert STOP, daily counts/missingness and Day1 abort in GitHub Actions. No Cloudflare, Replit AI Agent, source-only paid replay or timed Replit shell dependencies.
- **Release:** independent Phase5 science FREEZE and separately signed paid Phase6 GO before live day collection. Final model training/metrics are Phase7 tasks; require an interpretable dataset, not impossible perfection.

## Exact workflow for future recovery

Read main and issue #416 newest comments, this file, `data-collection/phase5/README.md`, and `2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md`. Verify PR branch, exact reviewed head and all executable PR checks. The production read-only observer must be **SKIPPED on PR**. Only after CI passes merge and verify exact main plus new postmerge V3.9 status. Append subsequent timestamped result to #416 and latest handoff; never overwrite the above initial evidence with a false earlier success.

**At this creation checkpoint: scientific Phase5 FREEZE HOLD; paid Phase6 GO NO.**
