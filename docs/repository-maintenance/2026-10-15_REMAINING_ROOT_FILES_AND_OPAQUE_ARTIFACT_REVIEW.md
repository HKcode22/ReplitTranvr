# 2026-10-15 — Remaining root files: case-sensitive, historical and opaque-artifact decisions

**Source HEAD:** `9ceb07b44d5f71cb1735990938ceef598051553a`, draft PR39; main still `f5b1347...`, Gate3 PR36 separately `318e2c3...`. [Machine inventory](manifests/2026-10-15_REMAINING_REPO_ROOT_FILE_REVIEW.csv) has every current root tracked file and Git blob SHA/byte size, with provisional KEEP/HOLD/REVIEW.

## Exact verified CI before this new review commit

All four no-provider PR39 checks at `9ceb07b44d5f71cb1735990938ceef598051553a` passed: [V3.9 full offline #38802873885](https://github.com/HKcode22/ReplitTranvr/actions/runs/38802873885), [focused #38802873926](https://github.com/HKcode22/ReplitTranvr/actions/runs/38802873926), [disposable PG #38802873854](https://github.com/HKcode22/ReplitTranvr/actions/runs/38802873854), [public receiver identity #38802873824](https://github.com/HKcode22/ReplitTranvr/actions/runs/38802873824). Exact source CI logs attest 10 preserved archival Git blobs and 12 guardrails; all 71 local targets across nine `data-collection/` indexes resolve. Existing runtime and scientific source files were not moved.

## File disposition (next tranche)

- **Preserve build and production:** `package*.json`, all root toolchain TS configs, `.replit`, `replit.nix`, `AGENTS.md`, `replit.md`, and other runtime/build config.
- **Retain cited historic analysis:** `gptP0analyze4.md` is cited directly in operational code comments (`scripts/anchor_probe.ts`, `server/lib/disruption/experimentCalendar_v3.ts`, `server/lib/disruption/flightDataPrePostStore_v3.ts`) and tests; don't move without reviewed citation transition.
- **Potential small next archive:** `GATE0_INPUT_CHECKLIST.md` contains dated (2026 September) Gate0 evidence and instructions; its status statements are historical, not current Phase3. New exact-root `git grep` CI candidates will include this name; only move once operational path references and old hyperlinks are fully understood.
- **Keep untouched:** 300KB `V3.9_DataCollectPlanCurrent.pdf` has not been inspected to compare complete content, versions, or identity to canonical Markdown. Network GitHub API access for binary payload was not available via the read-only UTF-8 connector; do not assert it is duplicate or obsolete.
- **Keep untouched:** 34,226,449-byte `zipFile.zip` is an opaque compressed archive and has not been inspected. Size and name alone are never deletion grounds; don't download/extract or move until archive provenance, any sensitive contents and untracked dependency checks are established.
- **Keep original science and case conflicts intact:** `SEPmd/` has 108 tracked main files, including two distinct case-colliding historical Phase2G indexes and one ACTIVE shell-only guardrail. It is not yet renamed; neither are 352 main `artifacts/` files.

## Mechanical next steps

1. Verify this commit's read-only CI logs for exact root `GATE0_INPUT_CHECKLIST.md` and `gptP0analyze4.md` operational references, excluding this new inventory/test code itself. Examine hits and any historical document relative links.
2. If verified no live-source consumers, consider a Git exact-blob archive of `GATE0_INPUT_CHECKLIST.md` under `docs/history/phase1/` with an old→new manifest row and a dedicated byte preservation regression.
3. Continue cross-branch `SEPmd` migration dependency and two-casefold READMEs; do not start a paid experiment, change provider account, mutate production, delete raw evidence, or merge drafts because CI is green.

**Scientific hold unchanged:** qualified historical P25 231 billed vs 229 received remains original delivery gap; no Gate3 paid authorization is inferred.
