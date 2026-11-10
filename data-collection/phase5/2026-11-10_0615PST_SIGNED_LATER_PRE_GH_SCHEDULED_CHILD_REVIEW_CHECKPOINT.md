# Phase 5 — Actual scheduled T−6h / T−90m signed PRE GitHub child, default OFF

**Nov 10 2026 Pacific / technical design review checkpoint.** PR pending CI+independent merge; no live paid collection or production PRE writes in creating this branch. [Issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416). Continue only from verified GitHub main and approved checkpoint.

## What actually changed

Reuses the existing every-10-minutes schedule `.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml`. Adds a **separate default-OFF** scheduled job `separately-authorized-native-later-pre-gh-child`; no second cron and no newly installed production roles, grants or migrations.

- `server/lib/disruption/phase5LaterPreGithubChildDecision_v39.ts`: signed exact-frozen packet SHA, future-main code SHA, separate Phase5 FREEZE, source Contents rights and Phase6 GO; pure proof against actual PG16 restricted PRE readback. Requires one original bound from real FIDS source query, one confirmed native operating member with matching native scheduled-T, source-time chronology and nonexpired Contents; one validated durable T−24h witness+external receipt **or** distinctly signed version 2 standalone later-only amendment with explicitly absent T−24h. No false backfill. Checks committed PRE already exists, source pending, T24 pending, cutoff missed, and within 90-to-15-minute dispatch lead. Plans GitHub no-replay with bounded exact run-name history. No provider or DB writes.
- `scripts/v39_phase5_later_pre_github_child_dispatcher_v39.ts`: main/cron-only default-off controller; only dedicated `phase5_p30_pre_login_20261107` (via existing SET ROLE) sees PostgreSQL `REPEATABLE READ READ ONLY`. Reuses existing source original/member SQL and T24 durable witness JOIN (no new schema). It verifies actual PostgreSQL clock and records, uses GitHub read-only child run history; only after verified readiness and zero previous attempts can request one `workflow_dispatch` of the **existing manual** `phase5-one-signed-witnessed-later-pre-main-manual.yml` child. Parent has no AeroDataBox credential, REST review/reserve passwords, writable production database role, or Alert.
- `.github/workflows/phase5-one-signed-witnessed-later-pre-main-manual.yml`: run-name now deterministically `P5 LATER PRE <signed-frozen-path>` to detect previously attempted child; existing child remains signed main manual worker with its prior Stage14 serializable PRE and independent T24 or opt-in standalone fallback. Do not modify its independent signing requirements or cutoff.
- `tests/phase5_later_pre_github_child_dispatcher_v39.test.ts`: signed-mismatch, auth/GO, source & member actual-time, T24 witness, honest standalone missingness, off-window and GitHub replay/ambiguous history. CI only, no real role or provider.
- Phase5 README/new-chat handoff and this checkpoint updated. No special external services, no AirDataBox reevaluation, no repeated paid FIDS pilot, no auto adoption of Amendment E.

## Important boundaries; do not overclaim

1. **This connects one independently signed future flight+horizon at a time** under GH variable `P5_LATER_PRE_FROZEN_PACKET_FILE` and exact signed SHA; it is not yet a multi-flight/multi-day signed **registry dispatcher**. Distinct T−6h and T−90m packets need independent signed future configuration, not interchangeable file paths. Full rolling 31-day and 96 source batches/day remains release deliverable C and a future integration to avoid globally rotating manual variables.
2. The existing Stage14 writer alone checks source/member and commits at its own cutoff; GH ACK alone is not actual persisted PRE. GH runner with DB read-only evidence can reject/delay/censor but cannot claim real provider Contents rights or externally certify physical flight identity. Production source original and signed packet are prerequisites and are **not yet independently issued for Phase6**.
3. If a previously queued/completed/failed GitHub run is found for the same frozen packet, do **not retry**. If run-history total exceeds 100 or has legacy unidentifiable titles in the review window, HOLD; neither GH nor this parent silently creates paid authorization. The Stage14 SERIALIZABLE writer remains DB-level safety.
4. Signed v2 standalone later PRE is default disabled; must independently approve exact amendment SHA and preserve `HONEST_T24_UNOBSERVED_NOT_BACKFILLED`. Do not silently call the conditional FIDS service tier an actual operated flight or real wheels-off.
5. Existing GitHub cron jobs remain inert until approved repo variables + independent signed release secrets are deliberately configured in the *future*. No new production SQL grants, paid GET, Alert, STOP, POST/receiver operation or physical reservation occurred in this PR.

## Remaining scientifically minimum Phase 5 release A/B/C/D

- **A:** independent first-cycle traveler-disruption target/evidence tier and documented lawful use/retention/expiry; reuse Phase4 conditional schedule proxy as proxy only. Do not wait for a provider email to do unrelated work.
- **B:** multi-flight future frozen signed packet generation and exact SOURCE→T24→T6/T90→POST and receiver/Alert STOP orchestration with observable missingness, audit rows and no-replay. This PR closes only *one* later PRE scheduled dispatch code gap, pending exact-head CI+merge.
- **C:** physical 31 parent-day prospective plan with 26/3/2 rotating sampling, five crossover pairs, 21 truly prospective adaptive slots, up to 96 day source batches, actual seven UTC REST category charge caps and separate Alert credits; independently signed, flexible contingency/censor logic.
- **D:** independent read-only Phase5 FREEZE PASS/HOLD and separately signed Phase6 paid GO. Do not require perfect 3/3 PRE or all physical outcomes before a legitimate limited Phase5 freeze; don't invent outcomes. Release HOLD until the evidence above is complete.

## Latest separately verified V0083 milestone

[GH main-only read-only #42831851454](https://github.com/HKcode22/ReplitTranvr/actions/runs/42831851454) confirmed two production restricted REST REVIEW and RESERVE PostgreSQL login ACLs, no provider or SQL writes. Permanent docs PR #550 merged main `0b6616f95814e438d0743927c243b81ca4a1d72b`, 5/5 green tests. Do not rerun the V0083 one-time commissioner.
