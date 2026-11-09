# Phase 5 — real saved-day source PREPARED query → one GitHub FIDS GET draft

**2026-11-09 · Permanent engineering checkpoint.** This is a reuse-first **missing data handoff**, not a new stage, migration, paid experiment, or a release authority. GitHub source of truth remains `main` plus the exact-head CI of this PR.

## The concrete duplication removed

The source pipeline already implements:

1. Actual GitHub early selection of four airports, saved in PostgreSQL using the original B0062 frame (merged #522).
2. Stage7 restricted same-transaction readback of the **actual selected calendar day + four airport rows**; Stage8 builds real local-time FIDS query proposals and their exact UTC charge-day and Amendment C BASE/SPLIT provider-range partition geometry (merged #523).
3. Stage9 restricted PostgreSQL16 serializable atomic `PREPARED` query and matching partition ledgers, already tested with **96 query rows and 96 partition rows in the disposable 2×2h frame**; a reviewed manual GitHub PREPARER exists (merged #524).
4. Existing paid GitHub **one-query** owner `scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts` and main-only manual workflow `.github/workflows/phase5-one-reviewed-prospective-fids-get-main-manual.yml`. It requires a **separately signed JSON template** in `data-collection/phase5/frozen/`, and actual independently approved provider range/rights and scope. It makes one physical GET at most, prearmed with the genuine GitHub run ID by V0080 and reserved/committed via V0079. The workflow is not automatically scheduled and has **not been fired in this change**.

**The gap:** the one-GET owner needed its `P5SourceSingleQueryPlan` fields typed/copied separately, even though Stage7/8 had exactly those saved flight-window and selected-airport fields. Manual re-entry could mix a different ICAO, horizon, query digest, local timezone or split partition while looking superficially valid.

## This bridge

[`phase5PreparedQueryToOneGetDraft_v39.ts`](../../server/lib/disruption/phase5PreparedQueryToOneGetDraft_v39.ts) implements `draftP5OneGetFromActualPreparedSource(stage7, stage8, review)`.

It requires one genuine Stage7 **read-only PostgreSQL snapshot proof**, exact saved four-airport SHA, exact independently reviewed Stage8 day proposal SHA, the exact source-candidate digest and selected per-query `query_digest`. It refuses missing/duplicate query digest, inconsistent original source acquisition, altered airport, slot, horizon, service UTC window, source time, cutoff, planned physical UTC charge date, provider contract, source release/rights hashes, missing full provider-range evidence, or changed BASE/SPLIT category. It then calls the existing **pure Amendment C provider window range verifier**, not another copy of the range algorithm.

The result is one **reproducible unsigned GitHub-source JSON candidate**, using:
- `acquisition` from the actual Stage7 saved source grid, not a guessed future airport;
- `sourcePartition` from Stage8's same exact indexed BASE/SPLIT partition, not a manually selected 4h or split range;
- `day` and `savedEarlyDrawRows` from the genuine Stage7 PostgreSQL repeatable-read transaction;
- exact `queryDigestSha256` from Stage8/V0082, **not the different summary `phase5SourceQueryDigest` helper**;
- `from_local`, `to_local`, provider version, timezone, source rights/release and full FIDS contract SHA from the reviewed prepared query.

**Deliberately fails closed for paid activation:** `independentlyApprovedSourceAndRetention=false` and `githubOnlyOwnerApproved=false` in the *returned* JSON. The result explicitly reports `selectedQueryAlreadyPreparedInProduction=false`, `independentlySignedRawJsonBytes=false`, `sourceContentsAndMlRightsApproved=false`, `phase5ScientificFreezePassed=false`, `phase6PaidGo=false`, `providerCalls=0`, and `databaseWrites=0`. A reviewer must still verify the exact **real Stage9 committed PREPARED row in production**, independently approve code/source license/use and actual physical UTC budgets, pin the exact final packet bytes and source/rights SHA through separately commissioned GitHub secrets before **any** real V0080 prearm/paid GET. A SHA of a self-authored packet does not provide independent approval or a vendor ML license.

## Regression evidence

The pre-existing real disposable B0062+V0079+V0082 PostgreSQL16 test [`phase5_stage9_v0082_atomic_segmented_pg16_v39.test.ts`](../../tests/phase5_stage9_v0082_atomic_segmented_pg16_v39.test.ts) now generates the candidate from **real saved four airport rows** and the actual 96 segmented Stage8 source proposals. It verifies exact `FIDS_BASE_UNITS` and `FIDS_SPLIT_UNITS` category identity and same query/airport/range, false paid/rights flags, zero physical GET or original bindings, and refusals on changing the proposal SHA, saved source candidate SHA or dispatch time. Existing Stage9 test still verifies all 96+96 rows, atomic rollback, restricted permissions, and no replay. Test data are generated in a disposable PostgreSQL16 instance, **not new production flight observations**.

The existing real-PG workflow `.github/workflows/phase5-v0082-atomic-segmented-day-pg16-no-provider.yml` is the exact provenance of this regression. No new GitHub paid run, paid source API credential or SQL migration is needed.

## Real outstanding Phase5 exit work (no repeat loops)

- Choose/approve one scientifically defensible **first-cycle target** prospectively (draft Amendment D provider-reported schedule revision vs stricter actually observed physical departure; conditional scheduled-service identity must not become certified operating aircraft by naming).
- Sign and commit the real future 31-parent-day UTC date/window/treatment seed + actual seven-category **physical UTC REST** and Alert budget. Five already drawn B0062 candidate pairs and 21 future unknown adaptive daily airport sets, rather than inventing all future airport ICAOs.
- Connect the **authenticated** GitHub one-query source runner to an unattended approved per-day source admission after the actual four-airport draw and Stage9 PREPARED commit, then connect genuine V0079 source-original PRE/T24 independent witness/T6/T90/POST/receiver/STOP and first-day missingness/denominator QA. The existing single signed-flight T24 writer (merged #526) is manual and unarmed, not this scheduler.
- Independently certify the usable provider Content purpose/TTL/ML feature handling and real source identity/quality; do not let a provider email delay nonpaid engineering, but do not claim source rights from historical plan quota. One **independent Phase5 scientific FREEZE**, then separate paid Phase6 GO.

**Current: Phase5 independent FREEZE HOLD; Phase6 paid GO NO.** Last actual production inventory 2026-11-09T13:42:38Z had all 16 newly scoped Phase5/6 ledger counts 0 and Phase6 authorization disabled; this is historical as-of evidence, not an updated live count, and does not erase distinct older authentic Phase2/3/4 data.

## New-chat continuity

Read [Phase5 README](README.md), [full assistant handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md), [seven-item remaining work/explanations](2026-11-09_WHAT_THE_FLIGHT_RECORDS_MEAN_AND_PHASE5_EXACT_FINISH_LIST.md), and [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416). Stop inventing Stage-N loops; do not redo historical Phase2/YSSY, Phase3 Alert CREATE/STOP or Phase4 Nov6 WSSS genuine FIDS PRE/POST, reinstall V0079–V0083 or launch unapproved paid FIDS just to prove a code path.
