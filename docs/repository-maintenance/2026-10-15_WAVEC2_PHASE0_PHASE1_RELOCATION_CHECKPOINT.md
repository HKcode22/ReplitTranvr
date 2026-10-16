# Wave C2 — scientific Phase 0 + Phase 1 consolidation (2026-10-15, draft)

**Baseline:** `main=b4f147750662e9636a354aa271d373352d0069be`. Branch `repo-wavec2-scientific-phase0-phase1-20261015`. Review-only proposal: **not merged**, not published, no paid/provider/database operation and no old branch/Actions deletion.

## Purpose and boundaries

Scientific Phase 0 historical reviews and Phase 1 Gate 0 checklist were scattered beneath `docs/history/` even though Phases 2/2G/3 live under `data-collection/`. This physically places the originals under `data-collection/phase0/` and `data-collection/phase1/`. The `docs/history/` directory remains for **separate old application/UI, ZIP and V2 diagnostic archives**, not scientific phase materials. Preserve all machine-generated Phase2F/2G evidence, the 32 original AUTH objects, immutable Plan/Log/Ledger and their freezes. The `data-collection/history/zero-byte-audit-stubs` folder is a provenance-preserved 0-byte legacy stub, not duplicated experiment data.

## Byte-identity custody of nine original scientific files

| Old path | Proposed new path | Unchanged Git blob SHA |
|---|---|---|
| `docs/history/phase0/requests/confused.md` | `data-collection/phase0/requests/confused.md` | `c611b806199d84e6777807ff9bbe1ab0e24fe332` |
| `docs/history/phase0/reviews/gptP0analyze.md` | `data-collection/phase0/reviews/gptP0analyze.md` | `58e833c491783901a8f9025ed966a83fe5c67c5e` |
| `docs/history/phase0/reviews/gptP0analyze2.md` | `data-collection/phase0/reviews/gptP0analyze2.md` | `030ca3722ceeac3c7315a45bbf47046478946e56` |
| `docs/history/phase0/reviews/gptP0analyze3.md` | `data-collection/phase0/reviews/gptP0analyze3.md` | `2c65785db085e4a85375821af0419085923592d8` |
| `docs/history/phase0/reviews/gptP0analyze4.md` | `data-collection/phase0/reviews/gptP0analyze4.md` | `ed76774bae16866ca58752da6237f3eb19cde5ff` |
| `docs/history/phase0/reviews/gptP0analyze5.md` | `data-collection/phase0/reviews/gptP0analyze5.md` | `d7a7ee5ea56ed5ad6e33ed0e1b4d92bf97b4f990` |
| `docs/history/phase0/reviews/gptP0analyze6.md` | `data-collection/phase0/reviews/gptP0analyze6.md` | `a825cab9f6186b673f431d71e2e33aec01925356` |
| `docs/history/phase0/reviews/gptP0analyze7.md` | `data-collection/phase0/reviews/gptP0analyze7.md` | `72468606ba162abdbdcefb96a56d2b7480df15c3` |
| `docs/history/phase1/GATE0_INPUT_CHECKLIST.md` | `data-collection/phase1/GATE0_INPUT_CHECKLIST.md` | `560bb06eb155e5d24a5b19c0e176afa422c4deba` |

Two `README.md` navigation pages (Phase 0 reviews and Phase 1) were rewritten intentionally to correct stale references; they are not described as original immutable scientific sources. Five existing navigational indexes have updated links. Original path receipts in older Wave A manifests remain historical records, not promises that the old paths still exist on a future branch.

## Other owner concerns — evidence-based next checks

- **Phase2F/2G hundreds of files:** kept intact under `data-collection/evidence/original-artifacts/phase2f/` (180) and `phase2g/` (150); `data-collection/phase2g/` separately holds dated interpretation, amendments, incidents and runbooks. Distinct content, not duplicate copies.
- **Experiment folder:** independent draft PR #48 moves one offline-only script, same blob `30752e1b05a28912b51d8803656dccf49e78bed2`, into `data-collection/analysis/`. That change is **not** in this independent C2 proposal or main.
- **Attached assets:** 42 mixed objects (18 PNG, 23 TXT, 1 ZIP); `vite.config.ts` maps `@assets` to root `attached_assets`. This requires reference-by-reference app/client/Vite build review before any move to `client/src/assets/images/`. Do not blindly move TXT or ZIP into images.
- **GitHub history:** October 15 inventory recorded 63 branches, of which 33 nonarchive/no-open-PR refs were contained in main, 10 retained unique commits, 12 were PR heads and 7 were archive/snapshot refs. No deletions authorized. The current Actions total observed was 3,288 historical runs: not 3,288 workflow YAML files. There are 13 tracked workflow YAML files under `.github/workflows/`.
- **Red X:** older historical paid owner run #38339669348 genuinely failed (owner and settling steps). Current main Wave B Offline Safety #38829219036 was success. Reconcile by exact run/commit; never mask an original failure.

## Scientific and operator constraints

YSSY P25 original 231 billed / 229 received stays **failed/DELIVERY_GAP**; neither this reorganization nor any missing-data research reclassifies it. Gate3 draft PR #36 is separate. `main` is unchanged. The protected pre-migration snapshot `archive/pre-scientific-directory-migration-20261015` remains intact. Do not trigger paid workflow, Replit Agent or deployment.

## CI and review checklist

- [ ] Full V3.9 Offline Safety, no-provider release and PostgreSQL path readers on exact proposed head.
- [ ] Verify nine original Git blob identities and zero old `docs/history/phase0|phase1` paths in new tree.
- [ ] Verify navigation/relative Markdown targets for touched files.
- [ ] Confirm merge order with Wave C1 PR #48; both are unmerged and neither is automatic.
- [ ] Owner reviews draft before merge or history/branch/asset cleanout.

**Next session starts:** inspect Wave C2 CI, fix only demonstrated test/navigation failures, then perform targeted asset import scan and review named fully-contained branches for possible later deletion **with owner's explicit approval**.
