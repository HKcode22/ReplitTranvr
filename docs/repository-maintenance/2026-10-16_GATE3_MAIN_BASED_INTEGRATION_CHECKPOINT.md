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
4. Reconcile PR37 qualification documents and prospective four-anchor proposal/Plan additions separately before any science-contract change.
5. Independently establish Replit published workspace/source parity, direct published callback+source custody and real account statuses through owner-executed safe Shell/read-only preflight; no Replit AI Agent permitted by root `AGENTS.md`.
6. Keep draft code separate from `main` pending owner reviewed scope, successful exact-head tests and conscious release decision. A GitHub merge does not publish Replit.

**No live SQL migration, provider GET/LIST, CREATE, DELETE, paid canary, callback POST, bucket mutation, Replit publish, or branch deletion was executed as part of this GitHub source integration.**
