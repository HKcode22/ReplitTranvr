# Branch retention and exact-SHA audit — October 15, 2026 (PDT)

**Read-only audit:** compared **67** tracked branch heads (including main) against exact `main=b4f147750662e9636a354aa271d373352d0069be`, with no errors. This does **not** check operational dependencies or authorize deletion.

[All 67 refs with exact SHA, ahead/behind, related PR, and disposition (CSV)](2026-10-15_BRANCH_RETENTION_AUDIT.csv) · [Wave C4 integrated organization](https://github.com/HKcode22/ReplitTranvr/pull/52) · [Maintenance Issue #47](https://github.com/HKcode22/ReplitTranvr/issues/47)

| Group | Branches | Recommendation |
|---|---:|---|
| `main` | 1 | Do not delete |
| `archive/` recovery references | 7 | Protect; branch names are mutable, not offline backups |
| Heads of open pull requests | 15 | Keep through explicit PR resolution |
| Non-open-PR refs with unique ahead commits | 11 | Hold, investigate commits and runtime uses |
| Non-open-PR refs with zero ahead commits | 33 | **Candidates for future review only** |
| Unknown compares | 0 | Hold and refresh comparison |

**All rows include exact checked branch SHA** so later reviews can detect changes. `ahead=0` is a commit-reachability fact, **not proof that deleting a ref is operationally safe**.

## Zero-ahead candidate review (not approved for deletion)

- `baseline-retirement-prep-20261001` — 0 ahead / 294 behind; PR #16 closed merged
- `p2g13-evidence-artifacts-20260928` — 0 ahead / 444 behind; PR #13 closed merged
- `p2g17-mmun-recovery-20261001` — 0 ahead / 282 behind; PR #18 closed merged
- `phase2g-0061-boot-wiring-20260927` — 0 ahead / 440 behind; PR #11 closed merged
- `phase2g-delivery-gap-schema-fix-20260930` — 0 ahead / 361 behind; no PR listed
- `phase2g-documentation-20260923` — 0 ahead / 580 behind; no PR listed
- `phase2g-migration-baseline-hardening-20261001` — 0 ahead / 360 behind; no PR listed
- `phase2g-mmun-identity-fix-20260925` — 0 ahead / 480 behind; no PR listed
- `phase2g-p25-20261012-2000pdt-science` — 0 ahead / 63 behind; PR #34 closed merged
- `phase2g-p25-20261012-integrated-release-review` — 0 ahead / 51 behind; PR #35 closed merged
- `phase2g-p25-prospective-science-approval-review-20261011` — 0 ahead / 67 behind; PR #32 closed merged
- `phase2g-p25-reviewed-published-20261011` — 0 ahead / 72 behind; no PR listed
- `phase2g-replit-watch-sideeffect-doc-20260928` — 0 ahead / 407 behind; PR #14 closed merged
- `phase2g-runtime-survival-hardening-20260917` — 0 ahead / 853 behind; PR #3 closed merged
- `phase2g-scientific-observability-20260927` — 0 ahead / 415 behind; PR #12 closed merged
- `phase2g-signed-cleanup-main-integration-20261008` — 0 ahead / 219 behind; PR #25 closed merged
- `phase2g-v2-recovery-rebased-20260926` — 0 ahead / 452 behind; PR #10 closed merged
- `phase2g-wednesday-readiness-20260923` — 0 ahead / 584 behind; PR #7 closed merged
- `phase2g-yssy-callback-deploy-config-hotfix-20261011` — 0 ahead / 74 behind; PR #30 closed merged
- `phase2g-yssy-p25-minimal-release-20261011` — 0 ahead / 81 behind; PR #29 closed merged
- `repo-oct04-waveb-root-reference-packages-20261015` — 0 ahead / 24 behind; PR #42 closed merged
- `repo-oct04-waveb-safe-structural-20261015` — 0 ahead / 26 behind; PR #41 closed merged
- `repo-reorganization-20261004` — 0 ahead / 251 behind; no PR listed
- `repo-reorganization-gate3-review-20261015` — 0 ahead / 30 behind; PR #39 closed merged
- `repo-wavea-postmerge-homepage-and-waveb-gate-20261015` — 0 ahead / 28 behind; PR #40 closed merged
- `repo-waveb-gate3-record-reconciliation-20261015` — 0 ahead / 17 behind; PR #45 closed merged
- `repo-waveb-migration-collision-gate-20261015` — 0 ahead / 22 behind; PR #43 closed merged
- `repo-waveb-p25-ledger-preservation-regression-20261015` — 0 ahead / 20 behind; PR #44 closed merged
- `repo-waveb-physical-relocation-candidate-20261015` — 0 ahead / 2 behind; PR #46 closed merged
- `retire-legacy-root-migrations-20261001` — 0 ahead / 293 behind; PR #17 closed merged
- `scratch` — 0 ahead / 1147 behind; no PR listed
- `v39-p-phase2-closure-audit-20260911` — 0 ahead / 1004 behind; PR #2 closed merged
- `v39-phase0-final-repair` — 0 ahead / 1314 behind; no PR listed

## Branches requiring extra caution

- `phase2g-hk84164-callback` — 5 ahead, 219 behind, no PR listed
- `phase2g-p25-gh-120m-synthetic-20261012` — 2 ahead, 52 behind, no PR listed
- `phase2g-p25-public-runtime-readonly-20261012` — 1 ahead, 52 behind, no PR listed
- `repo-wavec3-asset-classification-20261015` — 1 ahead, 0 behind, PR #51 closed
- `trash` — 2 ahead, 1436 behind, no PR listed

Open PR and snapshot branches are excluded from these two review lists regardless of their ahead count. The 2026-10-15 public Replit deployment's actual source binding and CI/release references have **not been read or established** for any potentially obsolete ref.

## Conditions before any later deletion

1. Exact named branches plus SHA and proposed reason reviewed by owner; never use a wildcard.
2. Confirm relevant open and historical PRs, CI/release references, published Replit source and local workspace branch dependencies, and archival source custody.
3. Require a separate deliberate deletion instruction; no automatic deletion from this document.
4. Keep all unique-commit branches, `archive/` snapshots and `main` unless a separate exceptional recovery-backed plan is approved.

Deleting a branch or file from HEAD does not automatically remove historical Git objects or reclaim GitHub Actions artifact space. No Git rewrites, releases, provider calls or workflow-run deletions were performed. Refresh ahead/behind whenever `main` changes.
