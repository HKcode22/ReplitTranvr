> **2026-10-16 integration follow-up:** The main-first preview imports 47 exact scientific documents and 73 other additive files, reconciles 10 current-main code paths, and preserves the original main Plan/Log/Ledger. Further inspected three *active* ledger reads that still attempted removed `SEPmd/` paths and one manual-workflow AUTH path restriction. These are now corrected to `data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md` and `data-collection/authorizations/*.json` on the draft branch, along with affected mock tests, YAML safety assertions and a new regression test. Confirm CI on the **new exact head**; previous checks certify only the earlier candidate. All historical signed original path *data* and the 460-source custody manifest remain unchanged. No paid or production operation was performed.

# Phase 3 Gate 3 — main-based scientific and engineering integration (Oct 16, 2026 PDT)

**Draft working branch only.** Not merged, not deployed, not paid. Source of additive Gate 3 changes: [original PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) at exact source Git SHA `318e2c3b8223bfc417757dbe571883aecdbca589`; baseline approved organized `main` `ebdfbbf19d7d52121f0c9b3317ac1da2ad290524`.

## Why this effort is needed
The old 264-commit PR #36 predates Wave B/C/D physical migration and GitHub currently reports its head **not mergeable** with `main`. Direct merging would risk reintroducing `SEPmd/` science roots, losing the current pinned Plan/Log/P25 ledger, and discarding protected reader/path fixes. This is a new constrained, *main-first* integration: preserve current authoritative content and forward-port actual Gate3 code as a source-reviewed draft.

## Proposed operation
- Copy **47 new original PR36 scientific documents** as unchanged Git blobs to appropriate `data-collection/phase2g/` (17) and `data-collection/phase3/` (30) destinations. Never recreate a tracked `SEPmd/` science root.
- Import **73 additional source/test/workflow/migration files** as identical original PR36 Git blobs, subject to later focused review; count includes one manually triggered read-only workflow, additive `V0065` SQL source, server modules, scripts and tests. Importing the SQL file into a draft does **not** apply it to any production DB.
- Reapply **10 PR36 source/test additions** using their narrow GitHub diff hunks *onto current main file contents*; all ten dry-ran without mismatches against main, retaining current path-reader safeguards including `server/routes_v3.ts`. Do not blindly overwrite whole source files.
- Original `SEPmd/V3.9_DataCollectPlan_f.8.md` and `SEPmd/V3.9_IMPLEMENTATION_LOG.md` PR36 proposals **NOT copied to authoritative files**. Keep the 2026-10-16 main originals unchanged until explicit scientific-methodology reconciliation; original signed ledger stays byte-identical.
- Preserve all **460** historic original scientific/evidence entries: 108 original source files + 352 machine receipt artifacts, with exactly one separately recorded 0-byte second hop. Preserve all 32 historical AUTH JSONs, privacy protections, runtime callback guards, immutable YSSY original evidence and archive snapshots.

[Source-to-destination 47-row SHA/byte manifest](manifests/2026-10-16_GATE3_PR36_SOURCE_PATH_REVIEW.csv).

## Oct 16 follow-up — PR #37 administrative science predecessor reconciliation (DRAFT)

- Exact source PR #37 head `9ed8b673d508f023e650042fd30eb40c6dfcf7df` contains **11 historical records**: 5 match PR #54 originals by full Git blob SHA and 6 are distinct previously unported originals (3 Markdown + 3 JSON). All six are copied byte-for-byte under `data-collection/phase2g/` in the draft; the originals' embedded old-path strings are not silently rewritten. [Immutable 11-row two-branch map](manifests/2026-10-16_PHASE2G_PR37_QUALIFIED_CLOSEOUT_CUSTODY.csv).
- The qualified pilot was **explicitly approved by the project owner on Oct 14**, but only as a *qualified/early exploratory Phase2 closeout*. Original strict five-anchor Gate2 remains `NOT_PASSED` and YSSY 231/229 remains `FAILED/DELIVERY_GAP`. This owner approval never authorized the new Gate3 paid canary, migration, deployment or deleting scientific evidence.
- The shared prepaid runner now checks the unreleased Gate3 source-level paid seal **before DB prearmed-session review**, preserving the seal `false` and all Phase2 code paths. Updated negative/source-order regression and PR37 exact-blob plus decision-permission regression checks were added.
- These are draft changes only. Validate all four no-provider CI jobs on the **new exact head** and preserve main SHA `ebdfbbf19d7d52121f0c9b3317ac1da2ad290524` unchanged.

## Gate status
- **Gate2 historical strict:** NOT PASSED five-anchor confirmatory strict Gate2, with qualified early-pilot research under separate operator exception and review PR37.
- **Gate3 OFFLINE:** draft code under CI and integration review; not yet a live billing or data-ingress certificate.
- **Gate3 PAID:** NO-GO. Old canary incompatible with published session callback; new owner pre-exposure must prove exact published SHA, current provider account/read-only reconciliation, signed session/source custody, actual callback raw-before-2xx and terminal checks with fresh bounded owner AUTH.
- **Gate0.5/Gate4/Gate5:** independent future gates; do not infer their success from these source tests.
- **Phase6:** future independently approved study protocol and 31 budget-day release, not triggered by this branch.

## Remaining work after first integration source draft
1. Run full offline V3.9, no-provider focused, disposable PostgreSQL, and read-only published public-identity jobs on exact candidate SHA. **Do not certify passed until observed.**
2. Inspect all old-root path references in new code and YAML; adapt active readers to `data-collection/` while preserving signed original string identities.
3. Review imported `.github/workflows/phase3-gate3-owner-readonly.yml` as strictly manual `READ_ONLY_GATE3_NO_PROVIDER`. No paid workflow dispatch, cron or provider credentials.
4. PR37's eleven source originals now appear content-identically in this draft with an explicit mapping. Distinguish its approved qualified administrative disposition from earlier proposed pre-approval documents. Prospective four-anchor proposal/Plan additions still require separate science-contract review.
5. Independently establish Replit published workspace/source parity, direct published callback+source custody and real account statuses through owner-executed safe Shell/read-only preflight; no Replit AI Agent permitted by root `AGENTS.md`.
6. Keep draft code separate from `main` pending owner reviewed scope, successful exact-head tests and conscious release decision. A GitHub merge does not publish Replit.

**No live SQL migration, provider GET/LIST, CREATE, DELETE, paid canary, callback POST, bucket mutation, Replit publish, or branch deletion was executed as part of this GitHub source integration.**

## Oct 16 final engineering control — staged V0065, production auto-migration blocked

Review of `server/index.ts` → `applyBootMigrations()` → `runSchemaMigrationsV39(dryRun:false)` confirmed **every file in `migrations/current/` is eligible for automatic production application on a full-app start**. Therefore PR54 now stores the **unchanged original Git blob** `V0065__phase3_gate3_prepaid_canary_owner_v39.sql` in `migrations/staged/`, outside the default loader. No installed migration checksum or raw SQL was altered. Default production boot sees only existing versioned V0063/V0064 (subject to their historical adoption state), not Gate3 V0065. A separate explicit synthetic PostgreSQL16 GitHub CI job step temporarily copies V0065 into the fixture's current directory, runs `scripts/v39_schema_migrate_v39.ts --apply` **only on `localhost:5432/v39_ci`**, and runs the previously skipped Gate3 real-PG constraints test. This controls deployment risk without losing scientific evidence or SQL testability; the file must only return to `migrations/current/` through an independently approved release. Do not confuse CI synthetic migration with production rollout or Gate3 paid authorization.

**User Replit Shell evidence 2026-10-16:** clean local working tree, `release/p25-reviewed-publish-20261012` at local `bb44fc1d122868e20664b2c149406f99bb10cb86`. The GitHub connected repo reports **no commit found for this local SHA** and remote `release/p25-reviewed-publish-20261012` ref is unavailable; local refs/history may be unique. There has been **no checkout, fetch, reset, publish, DB migration, or local file change**; request additional operator *read-only* remote/tracking/history inspection before prescribing any synchronization. The older actual public published runtime still reported `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`. Neither local nor published source matches Gate3 PR54. No production source-parity claim.

## CI ordering correction and observed failed run (Oct16)

The first [source-staged V0065 CI run #38981317025](https://github.com/HKcode22/ReplitTranvr/actions/runs/38981317025) **failed Offline V3.9 tests** because default production-equivalent boot correctly **excluded** V0065, but 9 pre-existing real-PG tests still attempted to insert into absent `clean.phase3_gate3_canary_owner_v39` before the previously appended CI-only migration step. This was a **disposable test fixture ordering failure**, not evidence the production DB was accessed or the new migration was applied automatically. The correction preserves the staged SQL Git blob and the auto-boot exclusion: after initial production-equivalent boot/no-op/Drizzle/schema checks, CI directly runs `psql "$DATABASE_URL" -f migrations/staged/V0065__phase3_gate3_prepaid_canary_owner_v39.sql` against **exact `localhost:5432/v39_ci`** with strict no-provider env checks. Then all existing Gate3 PG tests see the staged test-only tables, while source `migrations/current/` still has only V0063/V0064. An additional focused real-PG test runs at job end; results are only certified upon new exact-head CI completion. Do not substitute CI installation for production migration authorization.
